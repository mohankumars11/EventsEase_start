-- ══════════════════════════════════════════════════════════════════════
-- 081 · Cancelling a line, from either side
-- ══════════════════════════════════════════════════════════════════════
--
-- Neither side could cancel anything. A customer who booked a decorator
-- by mistake had no way out of the app; a master who broke their van had
-- no way to tell anybody except by not turning up.
--
-- ── The ladder is duplicated here, and that is deliberate ────────────
-- `src/config/policies.js` holds CANCELLATION_LADDER for the browser, so
-- a customer can be SHOWN what a cancellation costs before they confirm
-- it. This function decides what actually happens.
--
-- Two copies of one rule is a real risk and the alternative is worse:
-- computing the refund in JavaScript and posting the number would let a
-- client name its own refund. The browser's copy is for a sentence; this
-- copy is for the money. `scripts/check-dispatch-invariants.mjs` asserts
-- they agree — the same treatment migration 063 gives the price collar,
-- for the same reason.
--
--   before any master accepted     100%   nothing to the partner
--   accepted, > 48h to the event    90%   10% to the partner
--   accepted, 12–48h                75%   25%
--   accepted, < 12h                 50%   50%
--   after the event started          0%  100%
--
-- The deduction goes TO THE PARTNER, never to the platform. A master who
-- cleared a Saturday has lost the day, not a commission.
--
-- Re-runnable, like every migration in this series.

BEGIN;

ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS cancelled_at     TIMESTAMPTZ;
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS cancelled_by     TEXT
  CHECK (cancelled_by IN ('customer', 'partner', 'admin'));
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ══════════════════════════════════════════════════════════════════════
-- What would cancelling cost? Asked before it is done.
-- ══════════════════════════════════════════════════════════════════════
--
-- Read-only, and the customer's screen calls it to fill in the sentence
-- "you get ₹11,160 back". Sharing one implementation with the function
-- that MOVES the money is the only way those two numbers cannot drift.
CREATE OR REPLACE FUNCTION public.cancellation_quote(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line     booking_lines%ROWTYPE;
  v_event    DATE;
  v_held     BIGINT;
  v_hours    NUMERIC;
  v_refund   INT;
  v_partner  INT;
  v_rung     TEXT;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT r.event_date INTO v_event FROM booking_requests r WHERE r.id = v_line.request_id;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_held
    FROM escrow_ledger WHERE line_id = p_line_id;

  -- Hours between now and the START of the event day, in IST, because
  -- that is the clock the customer and the master are both reading.
  v_hours := EXTRACT(EPOCH FROM (
    (v_event::timestamp AT TIME ZONE 'Asia/Kolkata') - now()
  )) / 3600.0;

  IF v_line.status IN ('pending', 'dispatching') THEN
    v_rung := 'before_accept'; v_refund := 100; v_partner := 0;
  ELSIF v_hours < 0 THEN
    v_rung := 'after_start';   v_refund := 0;   v_partner := 100;
  ELSIF v_hours >= 48 THEN
    v_rung := 'over_48h';      v_refund := 90;  v_partner := 10;
  ELSIF v_hours >= 12 THEN
    v_rung := 'within_48h';    v_refund := 75;  v_partner := 25;
  ELSE
    v_rung := 'within_12h';    v_refund := 50;  v_partner := 50;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rung', v_rung,
    'status', v_line.status,
    'held_paise', v_held,
    'refund_pct', v_refund,
    'partner_pct', v_partner,
    -- Integer paise, and the partner gets the remainder so the two
    -- always sum to exactly what was held. A rounding error here is
    -- money that exists in no account.
    'refund_paise', (v_held * v_refund) / 100,
    'partner_paise', v_held - ((v_held * v_refund) / 100),
    'hours_to_event', ROUND(v_hours, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancellation_quote(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- cancel_line — the customer's exit
-- ══════════════════════════════════════════════════════════════════════
--
-- Per line, never per booking. Dropping the dhol you never really wanted
-- must not penalise you against the decorator you booked a week earlier,
-- and the ladder is read against THIS line's own state.
CREATE OR REPLACE FUNCTION public.cancel_line(p_line_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line  booking_lines%ROWTYPE;
  v_owner UUID;
  v_q     JSONB;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT r.customer_id INTO v_owner FROM booking_requests r WHERE r.id = v_line.request_id;

  IF v_owner <> auth.uid() AND get_my_role() NOT IN ('admin', 'event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_line.status IN ('cancelled', 'settled') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_line.status);
  END IF;

  -- Work that has been done cannot be un-booked. Past `delivered` this
  -- is a DISPUTE (migration 064), which has a human in it, not a ladder.
  IF v_line.status IN ('delivered', 'disputed') THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'too_late', 'status', v_line.status,
      'scan', 'This one is already done — raise a complaint instead'
    );
  END IF;

  v_q := cancellation_quote(p_line_id);

  -- ── The money, before the status ──────────────────────────────────
  -- Same ordering rule as the capture path: a ledger row with a stale
  -- status is recoverable and visible; a cancelled line with no refund
  -- recorded is indistinguishable from theft.
  IF (v_q->>'held_paise')::BIGINT > 0 THEN
    IF (v_q->>'refund_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'REFUND_CUSTOMER',
              -((v_q->>'refund_paise')::BIGINT), 'customer', 'ManualPayout',
              format('Cancelled by customer (%s, %s%% back)', v_q->>'rung', v_q->>'refund_pct'));
    END IF;

    -- The deduction goes to the MASTER, not to Sambramo. They cleared
    -- the day; the platform did not lose anything that needs covering.
    IF (v_q->>'partner_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'PENALTY_PARTNER',
              -((v_q->>'partner_paise')::BIGINT), 'partner', 'ManualPayout',
              format('Customer cancelled %s before the event', v_q->>'rung'));
    END IF;
  END IF;

  UPDATE booking_lines
     SET status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = 'customer',
         cancellation_reason = p_reason,
         expires_at = NULL
   WHERE id = p_line_id;

  -- The master is released for that date. Their ACCEPTED offer is what
  -- `match_partners` reads to decide they are busy, so leaving it would
  -- keep them out of dispatch for a job that no longer exists.
  UPDATE dispatch_offers SET status = 'LOST'
   WHERE line_id = p_line_id AND status = 'ACCEPTED';

  RETURN jsonb_build_object('ok', true, 'refunded_paise', (v_q->>'refund_paise')::BIGINT,
                            'to_partner_paise', (v_q->>'partner_paise')::BIGINT, 'rung', v_q->>'rung');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_line(UUID, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- partner_cancel_line — the master's exit, and it costs them
-- ══════════════════════════════════════════════════════════════════════
--
-- ── Why a reason is mandatory ────────────────────────────────────────
-- A master dropping a paid booking is the single most damaging thing
-- that can happen to a customer in this product: they discover it when
-- nobody arrives. A one-tap cancel with no friction makes it the easy
-- option on a morning when a better job came along.
--
-- The reason is required, stored, and it is what an operator reads when
-- deciding whether this master keeps getting dispatched. That is the
-- deterrent — not a fee, which a master would simply price in.
--
-- ── The customer is made whole. Always. ─────────────────────────────
-- No ladder. The customer did nothing wrong, and a partial refund for
-- somebody else's cancellation is how a marketplace loses a customer for
-- good.
CREATE OR REPLACE FUNCTION public.partner_cancel_line(p_line_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line   booking_lines%ROWTYPE;
  v_owns   BOOLEAN;
  v_held   BIGINT;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'reason_required',
      'scan', 'Tell the customer why — at least a sentence'
    );
  END IF;

  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM dispatch_offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED' AND v.profile_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns AND get_my_role() NOT IN ('admin', 'event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_line.status IN ('cancelled', 'delivered', 'settled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late', 'status', v_line.status);
  END IF;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_held
    FROM escrow_ledger WHERE line_id = p_line_id;

  IF v_held > 0 THEN
    INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
    VALUES (p_line_id, 'REFUND_CUSTOMER', -v_held, 'customer', 'ManualPayout',
            format('Master cancelled: %s', left(p_reason, 200)));
  END IF;

  UPDATE booking_lines
     SET status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = 'partner',
         cancellation_reason = p_reason,
         expires_at = NULL
   WHERE id = p_line_id;

  UPDATE dispatch_offers SET status = 'LOST'
   WHERE line_id = p_line_id AND status = 'ACCEPTED';

  RETURN jsonb_build_object('ok', true, 'refunded_paise', v_held);
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_cancel_line(UUID, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- A master's history, and being able to clear it
-- ══════════════════════════════════════════════════════════════════════
--
-- Passed, lost and expired offers are the master's own record of what
-- they were shown. Kept, because "why am I not getting jobs" is answered
-- by it — a master who has passed on nine of ten offers is not a
-- matching bug.
--
-- ── Hidden, not deleted ─────────────────────────────────────────────
-- `dispatch_offers` is the audit trail behind first-accept-wins. Letting
-- a partner DELETE rows from it would let them erase the evidence of an
-- offer they lost a dispute over.
--
-- So clearing history sets a timestamp on the master's own view of it.
-- Their screen empties, and the record survives.
ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.clear_offer_history(p_vendor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns BOOLEAN;
  v_n    INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vendors WHERE id = p_vendor_id AND profile_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns AND get_my_role() NOT IN ('admin', 'event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  -- Only what is finished. An OFFERED row is a live job and clearing
  -- history must never take one off the screen.
  UPDATE dispatch_offers
     SET hidden_at = now()
   WHERE vendor_id = p_vendor_id
     AND status IN ('DECLINED', 'LOST', 'EXPIRED')
     AND hidden_at IS NULL;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'hidden', v_n);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_offer_history(UUID) TO authenticated;

-- The history feed itself. Same boundary reasoning as `partner_jobs`
-- and `partner_offer_feed`: scoped in its own WHERE clause because a
-- partner has no policy on booking_requests.
DROP VIEW IF EXISTS partner_offer_history;

CREATE VIEW partner_offer_history
WITH (security_invoker = off) AS
SELECT
  o.id AS offer_id, o.vendor_id, o.status, o.wave, o.distance_m,
  o.partner_amount_paise, o.offered_at, o.responded_at,
  l.service_name, l.trade,
  r.event_date, r.area_label, r.occasion_name
FROM dispatch_offers o
JOIN booking_lines    l ON l.id = o.line_id
JOIN booking_requests r ON r.id = l.request_id
JOIN vendors          v ON v.id = o.vendor_id
WHERE o.status IN ('DECLINED', 'LOST', 'EXPIRED')
  AND o.hidden_at IS NULL
  AND (v.profile_id = auth.uid() OR get_my_role() IN ('admin', 'event_coordinator'));

REVOKE ALL ON partner_offer_history FROM PUBLIC, anon;
GRANT SELECT ON partner_offer_history TO authenticated;

COMMIT;
