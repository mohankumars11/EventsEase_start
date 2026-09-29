-- ══════════════════════════════════════════════════════════════════════
-- 092 · The same rule, said forward
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 091 first.
--
-- `claimable()` answered a partner with "You can claim 24 hours after the
-- event." True, and it reads as a penalty for having finished the work —
-- a delay imposed on somebody who is owed money and has done everything
-- asked of them.
--
-- The same fact, stated as the condition it actually is: the money is
-- released once the event is completed successfully and nothing is
-- disputed. That is what the escrow rule has always been. The window is
-- what makes it verifiable, not what makes it slow.
--
-- ── Nothing about the mechanism changes ─────────────────────────────
--
-- Still 24 hours, still measured from the event date, still blocked by an
-- open dispute. Considered and rejected: releasing the moment a partner
-- marks a job delivered. That window is the only period in which a
-- customer can say "nobody came" before the money has gone, and without
-- it the platform's only recourse is clawback from somebody who already
-- has the cash. The exact duration is stated in the partner terms, under
-- Payment and holding, where a partner checking a date can find it.
--
-- Re-runnable.

BEGIN;

CREATE OR REPLACE FUNCTION public.claimable(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_line   booking_lines%ROWTYPE;
  v_req    booking_requests%ROWTYPE;
  v_vendor UUID;
  v_pay    vendor_payout_details%ROWTYPE;
  v_open   INT;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_line'); END IF;

  SELECT * INTO v_req FROM booking_requests WHERE id = v_line.request_id;

  SELECT o.vendor_id INTO v_vendor
  FROM dispatch_offers o WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED';
  IF v_vendor IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_yours'); END IF;

  IF v_line.delivered_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_delivered',
      'says', 'Mark the job done first.');
  END IF;

  IF v_req.event_date IS NOT NULL AND now() < (v_req.event_date + INTERVAL '1 day') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_soon',
      'says', 'Your money is released once the event is completed successfully.',
      'at', (v_req.event_date + INTERVAL '1 day'));
  END IF;

  IF v_line.status = 'disputed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disputed',
      'says', 'This job has a problem open on it. We will be in touch.');
  END IF;

  SELECT * INTO v_pay FROM vendor_payout_details WHERE vendor_id = v_vendor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_payout_details',
      'says', 'Add where your money should go.');
  END IF;
  IF v_pay.verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unverified',
      'says', 'We are still checking your payout details.');
  END IF;

  SELECT count(*) INTO v_open FROM payout_claims
  WHERE line_id = p_line_id AND status IN ('requested', 'paid');
  IF v_open > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed',
      'says', 'You have already claimed this one.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'amount_paise', COALESCE(v_line.partner_amount_paise, 0),
    'method', v_pay.method,
    'destination', COALESCE(v_pay.upi_id, 'Account ending ' || right(v_pay.account_number, 4))
  );
END $$;

REVOKE ALL ON FUNCTION public.claimable(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claimable(UUID) TO authenticated, service_role;

COMMIT;
