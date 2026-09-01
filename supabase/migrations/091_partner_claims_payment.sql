-- ══════════════════════════════════════════════════════════════════════
-- 091 · The partner asks for their money
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 090 first.
--
-- ── Why a claim at all ──────────────────────────────────────────────
--
-- Escrow releases 24 hours after the event when nothing is disputed, and
-- until Razorpay Route is live that release is a human running a
-- transfer against the ledger. Between "the money is owed" and "the
-- money arrived" there was nothing: no record that the partner had asked,
-- nothing for an operator to work from, and nothing for the partner to
-- point at when it was late.
--
-- A claim is that record. It is not a second approval gate on money
-- already earned -- the partner is owed it either way -- it is the
-- request queue, and it exists so both sides can see the same list.
--
-- ── What has to be true before one can be made ──────────────────────
--
-- Enforced here rather than in the app, because the app is one client
-- and this is the only place all of them meet:
--
--   the line is delivered            work actually done
--   24 hours have passed since the event   the dispute window
--   nothing is disputed
--   payout details exist and are verified  somewhere to send it
--   no open claim already                  no double payment
--
-- Deliberately NOT required: a customer review. A partner's money must
-- never depend on whether somebody else could be bothered to leave a
-- rating -- that is their earnings held hostage to another person's
-- inaction. A review is invited on the same screen and changes nothing
-- about the payout.
--
-- Re-runnable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payout_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id       UUID NOT NULL REFERENCES public.booking_lines(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  amount_paise  BIGINT NOT NULL CHECK (amount_paise > 0),

  -- Copied at claim time, not joined. If the partner later changes their
  -- bank account, this row must still say where the money was sent when
  -- the claim was made.
  method        TEXT NOT NULL,
  destination   TEXT NOT NULL,

  status        TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested', 'paid', 'rejected')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at    TIMESTAMPTZ,
  settled_by    UUID REFERENCES public.profiles(id),
  reference     TEXT,
  note          TEXT
);

-- One live claim per line. This is the whole protection against paying
-- twice, and it belongs in an index rather than in a check somebody
-- remembers to write.
CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_one_open_per_line
  ON public.payout_claims (line_id)
  WHERE status IN ('requested', 'paid');

CREATE INDEX IF NOT EXISTS idx_claims_vendor ON public.payout_claims (vendor_id, requested_at DESC);

ALTER TABLE public.payout_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS claims_owner_reads ON public.payout_claims;
CREATE POLICY claims_owner_reads ON public.payout_claims
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════════════
-- Can this line be claimed, and if not, why not?
-- ══════════════════════════════════════════════════════════════════════
--
-- Returns a reason rather than a boolean. "You cannot claim this" with
-- no explanation is the single most infuriating thing a payments screen
-- can say to somebody who is owed money.

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
      'says', 'You can claim 24 hours after the event.',
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

-- ══════════════════════════════════════════════════════════════════════
-- Make the claim
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.claim_payment(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_check  JSONB;
  v_vendor UUID;
  v_id     UUID;
BEGIN
  -- The caller must be the partner who did the work. Checked here and
  -- not taken from the body: a line id is not a secret.
  SELECT o.vendor_id INTO v_vendor
  FROM dispatch_offers o
  JOIN vendors v ON v.id = o.vendor_id
  WHERE o.line_id = p_line_id AND o.status = 'ACCEPTED' AND v.profile_id = auth.uid();

  IF v_vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  v_check := claimable(p_line_id);
  IF NOT (v_check->>'ok')::boolean THEN RETURN v_check; END IF;

  INSERT INTO payout_claims (line_id, vendor_id, amount_paise, method, destination)
  VALUES (
    p_line_id, v_vendor,
    (v_check->>'amount_paise')::bigint,
    v_check->>'method',
    v_check->>'destination'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'claim_id', v_id,
    'amount_paise', (v_check->>'amount_paise')::bigint,
    'destination', v_check->>'destination');
EXCEPTION
  -- The unique index did its job: two taps, one claim.
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed',
      'says', 'You have already claimed this one.');
END $$;

REVOKE ALL ON FUNCTION public.claim_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_payment(UUID) TO authenticated;

COMMIT;
