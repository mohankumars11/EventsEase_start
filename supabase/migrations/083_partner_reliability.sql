-- ══════════════════════════════════════════════════════════════════════
-- 083 · Pulling out has consequences, and the customer is not dropped
-- ══════════════════════════════════════════════════════════════════════
--
-- Migration 081 let a master cancel a job they had accepted. It did two
-- things badly.
--
--   1. It refunded the customer and stopped. The customer was left with
--      their money back and no photographer, four days before a
--      birthday, by a platform that had told them the date was blocked.
--      Getting money back is not the service they bought.
--
--   2. It cost the master nothing but a stored reason. A reason nobody
--      acts on is not a deterrent, and dropping a paid Saturday for a
--      better offer is a rational thing to do when it is free.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAPPENS NOW
-- ══════════════════════════════════════════════════════════════════════
--
-- The line goes back into dispatch. The money stays held, the customer
-- is told Sambramo is finding a replacement, and only if nobody can be
-- found does it become a refund. That is the difference between a
-- marketplace and a directory: the platform owns the outcome.
--
-- And the master gets a strike. Three in ninety days suspends the
-- account — stated to them before they confirm, never after.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY STRIKES ARE COUNTED AND NOT STORED
-- ══════════════════════════════════════════════════════════════════════
--
-- A counter column has to be incremented, decremented, back-dated when a
-- cancellation is forgiven, and reset when the window rolls. Every one
-- of those is a chance for a master to be suspended by an arithmetic
-- mistake, and there is no way to audit a number that has been mutated
-- for a year.
--
-- The cancellations themselves are already recorded on `booking_lines`.
-- Counting them is one query, always agrees with the evidence, and an
-- operator forgiving one is a single UPDATE that the count then
-- reflects on its own.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- Set when a cancellation is excused — a hospital admission, a genuine
-- platform fault. Excused rows stop counting, and nothing has to be
-- recalculated.
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS cancellation_excused BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Ninety days, and three strikes. Both here rather than in the function
-- body so a policy change is one legible edit with a sign-off.
CREATE OR REPLACE FUNCTION public.strike_window_days() RETURNS INT LANGUAGE SQL IMMUTABLE AS $$ SELECT 90 $$;
CREATE OR REPLACE FUNCTION public.strike_limit()       RETURNS INT LANGUAGE SQL IMMUTABLE AS $$ SELECT 3  $$;

-- ══════════════════════════════════════════════════════════════════════
-- partner_standing — what the master is told BEFORE they confirm
-- ══════════════════════════════════════════════════════════════════════
--
-- Called by the cancel sheet. Somebody about to drop a job must know
-- what it costs them while they can still change their mind. Telling
-- them afterwards is a penalty they had no chance to avoid, and that is
-- the `hidden_costs` pattern config/legal.js names — it applies to
-- partners exactly as it does to customers.
CREATE OR REPLACE FUNCTION public.partner_standing(p_vendor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strikes INT;
  v_limit   INT := strike_limit();
  v_susp    TIMESTAMPTZ;
BEGIN
  SELECT suspended_at INTO v_susp FROM vendors WHERE id = p_vendor_id;

  -- Only cancellations of jobs the customer had PAID for. Pulling out
  -- of an unfunded acceptance costs the customer nothing and must not
  -- count against a master — most of those are the customer's own
  -- abandoned booking.
  SELECT COUNT(*) INTO v_strikes
  FROM booking_lines l
  JOIN dispatch_offers o ON o.line_id = l.id AND o.vendor_id = p_vendor_id
  WHERE l.cancelled_by = 'partner'
    AND l.cancellation_excused = FALSE
    AND l.cancelled_at > now() - (strike_window_days() || ' days')::interval
    AND EXISTS (SELECT 1 FROM escrow_ledger e WHERE e.line_id = l.id AND e.kind = 'HOLD');

  RETURN jsonb_build_object(
    'ok', true,
    'strikes', v_strikes,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_strikes, 0),
    'window_days', strike_window_days(),
    'suspended', v_susp IS NOT NULL,
    -- The sentence the sheet shows. Written here so both the warning and
    -- the enforcement read from one place and cannot disagree.
    'warning', CASE
      WHEN v_susp IS NOT NULL THEN 'Your account is suspended.'
      WHEN v_strikes = 0 THEN
        'Cancelling a paid job counts against you. ' || v_limit ||
        ' in ' || strike_window_days() || ' days suspends your account.'
      WHEN v_strikes + 1 >= v_limit THEN
        'This will be cancellation ' || (v_strikes + 1) || ' of ' || v_limit ||
        '. Your account will be SUSPENDED and you will stop receiving jobs.'
      ELSE
        'This will be cancellation ' || (v_strikes + 1) || ' of ' || v_limit ||
        ' in ' || strike_window_days() || ' days. At ' || v_limit ||
        ', your account is suspended.'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_standing(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- partner_cancel_line — hand the job back, and count it
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.partner_cancel_line(p_line_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line     booking_lines%ROWTYPE;
  v_vendor   UUID;
  v_owns     BOOLEAN;
  v_held     BIGINT;
  v_paid     BOOLEAN;
  v_standing JSONB;
  v_strikes  INT;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'reason_required',
      'scan', 'Tell the customer why — at least a sentence'
    );
  END IF;

  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT o.vendor_id INTO v_vendor
    FROM dispatch_offers o JOIN vendors v ON v.id = o.vendor_id
   WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED'
     AND (v.profile_id = auth.uid() OR get_my_role() IN ('admin','event_coordinator'))
   LIMIT 1;

  IF v_vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_line.status IN ('cancelled', 'delivered', 'settled', 'expired') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late', 'status', v_line.status);
  END IF;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_held FROM escrow_ledger WHERE line_id = p_line_id;
  v_paid := v_held > 0;

  -- ── Release the master ────────────────────────────────────────────
  UPDATE dispatch_offers
     SET status = 'LOST', responded_at = now()
   WHERE line_id = p_line_id AND status = 'ACCEPTED';

  -- ── The job goes back to Sambramo, not back to the customer ───────
  --
  -- The line returns to dispatch and keeps its money. The customer is
  -- not handed a refund and a problem four days before a birthday --
  -- they are told a replacement is being found, which is the service
  -- they actually bought.
  --
  -- Refunding is what happens if nobody can be found; that is the
  -- standing-line path (069) and the cancellation ladder, not this one.
  UPDATE booking_lines
     SET status = 'dispatching',
         dispatch_mode = 'standing',
         standing_since = now(),
         stand_until = GREATEST(
           now(),
           (SELECT (r.event_date::timestamp AT TIME ZONE 'Asia/Kolkata') - interval '1 day'
              FROM booking_requests r WHERE r.id = v_line.request_id)
         ),
         accepted_at = NULL,
         expires_at = NULL,
         -- Kept ON the line: the next master must not inherit a note
         -- about why the last one left.
         cancellation_reason = p_reason,
         cancelled_by = 'partner',
         cancelled_at = now()
   WHERE id = p_line_id;

  -- ── The strike, and only for a job that was funded ────────────────
  IF v_paid THEN
    v_standing := partner_standing(v_vendor);
    v_strikes  := (v_standing->>'strikes')::INT;

    IF v_strikes >= strike_limit() THEN
      UPDATE vendors
         SET is_verified = FALSE,
             suspended_at = now(),
             suspended_reason = format(
               '%s cancellations of paid jobs in %s days',
               v_strikes, strike_window_days())
       WHERE id = v_vendor;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'was_paid', v_paid,
    'redispatched', true,
    'strikes', COALESCE(v_strikes, 0),
    'suspended', COALESCE(v_strikes, 0) >= strike_limit(),
    'scan', CASE
      WHEN COALESCE(v_strikes, 0) >= strike_limit()
        THEN 'Your account has been suspended. Contact Sambramo.'
      WHEN v_paid
        THEN 'The customer has been told and we are finding a replacement.'
      ELSE 'Released. The job has gone back out to other masters.'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.partner_cancel_line(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_cancel_line(UUID, TEXT) TO authenticated;

-- A suspended partner cannot be matched: `is_verified` is set FALSE
-- above, which match_partners already requires. Stated here so the
-- connection is not something a reader has to rediscover.

COMMIT;
