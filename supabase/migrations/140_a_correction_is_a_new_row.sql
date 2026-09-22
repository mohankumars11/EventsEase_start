-- ══════════════════════════════════════════════════════════════════════
-- 140 · A correction is a new row
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 136-139 first.
--
-- ── What is missing today ───────────────────────────────────────────
--
-- Nothing anywhere in the schema can say "we owe this partner Rs 500
-- that no customer paid". No bonus, no incentive, no reimbursement for a
-- job they drove to that was cancelled on arrival, no correction when a
-- figure was wrong, no recovery when one was wrong the other way.
--
-- `EarningsSummary.jsx` refused to render the reference design's
-- "Incentives" row for exactly this reason, and was right to: a row
-- that always reads Rs 0 is a promise, and one that reads a number
-- nothing backs is invented money. This gives those rows a column, so
-- they can come back as facts.
--
-- ── Signed, not a direction column ──────────────────────────────────
--
-- One BIGINT that can be negative. A `direction` beside a magnitude is
-- two facts that can disagree, and a sum over them needs a CASE that
-- somebody will eventually get backwards. 062 made this call for the
-- ledger; the same reasoning applies.
--
-- ── Adjustments NEVER touch escrow_ledger ───────────────────────────
--
-- This is the important decision in the file.
--
-- Escrow is per-line, customer-funded, and solvency-bound: a constraint
-- trigger forbids any line's balance going negative. A bonus is
-- platform-to-partner money that NO CUSTOMER EVER PAID IN, so writing it
-- there would either trip that trigger or, worse, quietly spend a
-- different customer's hold.
--
-- It is also why an adjustment is never folded into a job's four-part
-- split. `check-earnings-math.mjs` asserts customer = commission +
-- share on every job; an adjustment inside that split breaks the
-- identity on real data, and the screen stops adding up.
--
-- So: separate ledger, separate line on screen, separate line on the
-- payment slip, below the net.
--
-- ── Cancellations do NOT belong here ────────────────────────────────
--
-- 081 already writes PENALTY_PARTNER into escrow_ledger when a customer
-- cancels late, and that row IS the partner's compensation record. The
-- view in 141 projects it. Recording it again as an adjustment would
-- pay it twice on screen.
--
-- Re-runnable. Invisible until an operator grants something.

BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_adjustments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- NULL means account-level: a monthly bonus, a recovery spread across
  -- no particular job. RESTRICT when it IS attached, because a booking
  -- must not be deletable out from under money owed against it.
  line_id    UUID REFERENCES public.booking_lines(id) ON DELETE RESTRICT,

  kind       TEXT NOT NULL CHECK (kind IN (
               'bonus', 'incentive', 'reimbursement',
               'penalty', 'correction', 'recovery')),

  amount_paise BIGINT NOT NULL CHECK (amount_paise <> 0),

  -- NOT NULL, and this is not bureaucracy. An adjustment a partner
  -- cannot read an explanation for is worse than no adjustment: it is
  -- an unexplained change to their money, which is the single fastest
  -- way to lose somebody's trust in a payments product.
  reason     TEXT NOT NULL CHECK (length(trim(reason)) > 3),

  -- IST, because every other date boundary in this product is.
  effective_on DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),

  reverses_id      UUID REFERENCES public.partner_adjustments(id),
  settled_claim_id UUID REFERENCES public.payout_claims(id),

  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_vendor
  ON public.partner_adjustments (vendor_id, effective_on DESC);
CREATE INDEX IF NOT EXISTS idx_adjustments_line
  ON public.partner_adjustments (line_id) WHERE line_id IS NOT NULL;
-- One reversal per adjustment. Reversing twice would credit twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_adjustment_one_reversal
  ON public.partner_adjustments (reverses_id) WHERE reverses_id IS NOT NULL;

-- ── Append-only, with one write-once exception ──────────────────────
--
-- A correction is `reverses_id` plus a new opposite row. History is
-- never edited.
--
-- The exception: `settled_claim_id` may go NULL -> value exactly once,
-- so an adjustment that was carried by a payout can point at it without
-- a join table. It is a monotonic stamp, and the trigger is what makes
-- "exactly once" true rather than intended.
CREATE OR REPLACE FUNCTION public.partner_adjustments_are_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'partner_adjustments is append-only: reverse it instead of deleting it'
      USING HINT = 'Use reverse_partner_adjustment(). See migration 140.';
  END IF;

  IF OLD.settled_claim_id IS NULL AND NEW.settled_claim_id IS NOT NULL
     AND NEW.id           IS NOT DISTINCT FROM OLD.id
     AND NEW.vendor_id    IS NOT DISTINCT FROM OLD.vendor_id
     AND NEW.line_id      IS NOT DISTINCT FROM OLD.line_id
     AND NEW.kind         IS NOT DISTINCT FROM OLD.kind
     AND NEW.amount_paise IS NOT DISTINCT FROM OLD.amount_paise
     AND NEW.reason       IS NOT DISTINCT FROM OLD.reason
     AND NEW.effective_on IS NOT DISTINCT FROM OLD.effective_on
     AND NEW.reverses_id  IS NOT DISTINCT FROM OLD.reverses_id
     AND NEW.created_at   IS NOT DISTINCT FROM OLD.created_at THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'partner_adjustments is append-only: only settled_claim_id may be stamped, once'
    USING HINT = 'A correction is a new row with reverses_id set. See migration 140.';
END $$;

DROP TRIGGER IF EXISTS partner_adjustments_no_rewrite ON public.partner_adjustments;
CREATE TRIGGER partner_adjustments_no_rewrite
  BEFORE UPDATE OR DELETE ON public.partner_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.partner_adjustments_are_append_only();

-- ══════════════════════════════════════════════════════════════════════
-- Writing one
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_partner_adjustment(
  p_vendor_id    UUID,
  p_kind         TEXT,
  p_amount_paise BIGINT,
  p_reason       TEXT,
  p_line_id      UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  -- A penalty or recovery must be negative and a bonus positive, or the
  -- word on the partner's screen says the opposite of the arithmetic.
  IF p_kind IN ('penalty', 'recovery') AND p_amount_paise > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_sign',
      'says', 'A penalty or recovery is negative.');
  END IF;
  IF p_kind IN ('bonus', 'incentive', 'reimbursement') AND p_amount_paise < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_sign',
      'says', 'A bonus, incentive or reimbursement is positive.');
  END IF;

  INSERT INTO public.partner_adjustments (
    vendor_id, line_id, kind, amount_paise, reason, created_by)
  VALUES (p_vendor_id, p_line_id, p_kind, p_amount_paise, p_reason, auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.write_money_audit(
    'adjustment_added', 'adjustment', v_id, p_vendor_id, p_line_id,
    p_amount_paise, NULL, jsonb_build_object('kind', p_kind), p_reason);

  RETURN jsonb_build_object('ok', true, 'adjustment_id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.reverse_partner_adjustment(
  p_id     UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old public.partner_adjustments%ROWTYPE;
  v_id  UUID;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  SELECT * INTO v_old FROM public.partner_adjustments WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_adjustment');
  END IF;

  -- An adjustment already carried by a payout cannot be reversed by
  -- cancelling it -- the money went. That is a NEW recovery, with its
  -- own reason, so the partner can see both halves.
  IF v_old.settled_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid',
      'says', 'This was already paid out. Add a recovery instead.');
  END IF;

  INSERT INTO public.partner_adjustments (
    vendor_id, line_id, kind, amount_paise, reason, reverses_id, created_by)
  VALUES (v_old.vendor_id, v_old.line_id, 'correction',
          -v_old.amount_paise, p_reason, v_old.id, auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.write_money_audit(
    'adjustment_reversed', 'adjustment', v_id, v_old.vendor_id, v_old.line_id,
    -v_old.amount_paise,
    jsonb_build_object('reverses', v_old.id, 'was', v_old.amount_paise),
    NULL, p_reason);

  RETURN jsonb_build_object('ok', true, 'adjustment_id', v_id);
END $$;

REVOKE ALL ON FUNCTION public.add_partner_adjustment(UUID, TEXT, BIGINT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_partner_adjustment(UUID, TEXT, BIGINT, TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reverse_partner_adjustment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_partner_adjustment(UUID, TEXT) TO authenticated, service_role;

-- ── RLS ─────────────────────────────────────────────────────────────
--
-- The partner READS these -- unlike money_audit, this table exists to
-- be read by them. No write policy for anyone: the two functions above
-- are the only way in.
ALTER TABLE public.partner_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adjustment owner reads" ON public.partner_adjustments;
CREATE POLICY "adjustment owner reads"
  ON public.partner_adjustments FOR SELECT
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.profile_id = auth.uid()));

DROP POLICY IF EXISTS "operators read adjustments" ON public.partner_adjustments;
CREATE POLICY "operators read adjustments"
  ON public.partner_adjustments FOR SELECT
  USING (public.caller_is_operator());

COMMIT;
