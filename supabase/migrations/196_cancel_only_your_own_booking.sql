-- 196 — Only a booking's own customer can cancel it (SECURITY, 2026-10-28)
--
-- APPLY BY HAND in Supabase -> SQL Editor, as soon as possible. Needs 195.
--
-- Found while testing 195 live: a signed-out (anon) caller could run
-- cancel_line() on ANY booking line by its id, and it cancelled it. Two
-- reasons, both inherited from 081:
--
--   1. EXECUTE was granted to authenticated, but Supabase also gives anon
--      EXECUTE on every new function, and nothing revoked it.
--   2. The guard `v_owner <> auth.uid() AND get_my_role() NOT IN (...)` is
--      NULL for a caller with no session (auth.uid() and get_my_role() are
--      both NULL), and an IF on NULL is skipped — so the check never fired.
--
-- cancellation_quote() had the same exposure for reading (what a line
-- holds, by id). partner_cancel_line (083) was already closed to anon.
--
-- This re-creates both functions exactly as 195 has them, with: a session
-- required; the role check COALESCEd so it can never go NULL; the quote
-- answering only the customer, the accepted master, or staff; cancel_line
-- stopping on a refused quote; and EXECUTE revoked from anon and PUBLIC.
--
-- Rollback: re-run 195.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancellation_quote(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line          booking_lines%ROWTYPE;
  v_event         DATE;
  v_held          BIGINT;
  v_hours         NUMERIC;
  v_refund        INT;
  v_rung          TEXT;
  v_list          BIGINT;
  v_saved         BIGINT;
  v_owed          BIGINT;
  v_refund_paise  BIGINT;
  v_kept          BIGINT;
  v_partner       BIGINT;
  v_owner         UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in'); END IF;
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT r.event_date, r.customer_id INTO v_event, v_owner FROM booking_requests r WHERE r.id = v_line.request_id;

  -- Only the customer, the master who accepted it, or staff may see what a line holds.
  IF v_owner IS DISTINCT FROM auth.uid()
     AND COALESCE(get_my_role(), '') NOT IN ('admin', 'event_coordinator')
     AND NOT EXISTS (SELECT 1 FROM dispatch_offers o JOIN vendors v ON v.id = o.vendor_id
                      WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED' AND v.profile_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_held
    FROM escrow_ledger WHERE line_id = p_line_id;

  -- Hours to the START of the event day, in IST — the clock both sides read.
  v_hours := EXTRACT(EPOCH FROM (
    (v_event::timestamp AT TIME ZONE 'Asia/Kolkata') - now()
  )) / 3600.0;

  IF v_line.status IN ('pending', 'dispatching') THEN
    v_rung := 'before_accept'; v_refund := 100;
  ELSIF v_line.paid_at IS NOT NULL AND v_line.paid_at > now() - interval '15 minutes' AND v_hours >= 72 THEN
    v_rung := 'grace_15min';   v_refund := 100;
  ELSIF v_hours < 0 THEN
    v_rung := 'after_start';   v_refund := 0;
  ELSIF v_hours >= 360 THEN
    v_rung := 'over_15d';      v_refund := 50;
  ELSIF v_hours >= 168 THEN
    v_rung := 'days_7_15';     v_refund := 25;
  ELSIF v_hours >= 48 THEN
    v_rung := 'under_7d';      v_refund := 0;
  ELSE
    v_rung := 'within_48h';    v_refund := 0;
  END IF;

  -- Integer paise; the three parts always sum to exactly what was held.
  v_refund_paise := (v_held * v_refund) / 100;
  v_kept := v_held - v_refund_paise;

  -- The master's share of what is kept, at the line's own split.
  v_list := COALESCE(NULLIF(v_line.pricing_snapshot->>'list_paise', '')::BIGINT, v_line.quoted_amount_paise::BIGINT, 0);
  SELECT COALESCE(SUM(discount_paise), 0) INTO v_saved FROM booking_line_discounts WHERE line_id = p_line_id;
  v_owed := GREATEST(1, v_list - v_saved);
  v_partner := LEAST(v_kept, (v_kept * COALESCE(v_line.partner_amount_paise::BIGINT, v_owed)) / v_owed);

  RETURN jsonb_build_object(
    'ok', true,
    'policy', '2026-10-28',
    'rung', v_rung,
    'status', v_line.status,
    'held_paise', v_held,
    'refund_pct', v_refund,
    'partner_pct', 100 - v_refund,          -- share KEPT, as 081 reported it
    'refund_paise', v_refund_paise,
    'kept_paise', v_kept,
    'partner_paise', v_partner,
    'platform_paise', v_kept - v_partner,
    'hours_to_event', ROUND(v_hours, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancellation_quote(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancellation_quote(UUID) TO authenticated;

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
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in'); END IF;
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT r.customer_id INTO v_owner FROM booking_requests r WHERE r.id = v_line.request_id;

  -- COALESCE: get_my_role() is NULL for a caller with no profile, and
  -- `NULL NOT IN (...)` is NULL — which made this whole guard NULL, i.e.
  -- skipped (the hole 081 had, found 2026-10-28).
  IF v_owner IS DISTINCT FROM auth.uid() AND COALESCE(get_my_role(), '') NOT IN ('admin', 'event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  IF v_line.status IN ('cancelled', 'settled') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_line.status);
  END IF;

  -- Work that has been done cannot be un-booked: past `delivered` it is a
  -- dispute (064), with a human in it, not a ladder.
  IF v_line.status IN ('delivered', 'disputed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late', 'status', v_line.status,
      'scan', 'This one is already done — raise a complaint instead');
  END IF;

  v_q := cancellation_quote(p_line_id);
  IF NOT COALESCE((v_q->>'ok')::BOOLEAN, false) THEN RETURN v_q; END IF;

  -- The money before the status, as 081: a ledger row with a stale status
  -- is recoverable; a cancelled line with no refund recorded is not.
  IF (v_q->>'held_paise')::BIGINT > 0 THEN
    IF (v_q->>'refund_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'REFUND_CUSTOMER', -((v_q->>'refund_paise')::BIGINT), 'customer', 'ManualPayout',
              format('Cancelled by customer (%s, %s%% back, policy %s)', v_q->>'rung', v_q->>'refund_pct', v_q->>'policy'));
    END IF;
    IF (v_q->>'partner_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'PENALTY_PARTNER', -((v_q->>'partner_paise')::BIGINT), 'partner', 'ManualPayout',
              format('Customer cancelled (%s) — the master''s share of what is kept', v_q->>'rung'));
    END IF;
    IF (v_q->>'platform_paise')::BIGINT > 0 THEN
      INSERT INTO escrow_ledger (line_id, kind, amount_paise, counterparty, adapter, note)
      VALUES (p_line_id, 'RELEASE_PLATFORM', -((v_q->>'platform_paise')::BIGINT), 'platform', 'ManualPayout',
              format('Customer cancelled (%s) — Sambramo''s share of what is kept', v_q->>'rung'));
    END IF;
  END IF;

  UPDATE booking_lines
     SET status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = 'customer',
         cancellation_reason = p_reason,
         expires_at = NULL
   WHERE id = p_line_id;

  -- Release the master's date: their ACCEPTED offer is what match_partners reads as busy.
  UPDATE dispatch_offers SET status = 'LOST'
   WHERE line_id = p_line_id AND status = 'ACCEPTED';

  RETURN jsonb_build_object('ok', true, 'rung', v_q->>'rung',
    'refunded_paise', (v_q->>'refund_paise')::BIGINT,
    'to_partner_paise', (v_q->>'partner_paise')::BIGINT,
    'to_platform_paise', (v_q->>'platform_paise')::BIGINT);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_line(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_line(UUID, TEXT) TO authenticated;

COMMIT;
