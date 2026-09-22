-- ══════════════════════════════════════════════════════════════════════
-- 136 · Every movement has a witness
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply this BEFORE 137-141; they all write to it.
--
-- ── What is missing today ───────────────────────────────────────────
--
-- `escrow_ledger` records money MOVING and is append-only, which is
-- right. But nothing records the decisions around it. A claim going from
-- `requested` to `paid` is a raw UPDATE under the operator policy added
-- in 114 -- no trigger, no log, no before-and-after. So:
--
--   * who marked this paid, and when, is unanswerable
--   * an operator can rewrite amount_paise on a settled claim and
--     nothing anywhere would show it had ever been different
--   * a partner asking "why was this rejected" has no record to read
--
-- For a pilot run by one person that was survivable. It stops being
-- survivable the moment a second person can settle a payout, and it is
-- not something that can be backfilled later: the history simply is not
-- there.
--
-- ── Why partners cannot read it ─────────────────────────────────────
--
-- Operators only. A partner's honest history is `payout_claims`,
-- `partner_adjustments` (140) and their own `escrow_ledger` rows, all of
-- which they can already read and all of which are written for them to
-- read. This table carries free-form `before`/`after` JSONB, which means
-- whatever a future writer puts in it -- that is a leak surface with no
-- matching benefit, so it stays shut.
--
-- ── Append-only, and its own function ───────────────────────────────
--
-- The same shape as `escrow_ledger_is_append_only()` (062), deliberately
-- NOT the same function. The hint text names the migration to read, and
-- a shared function would send somebody to the wrong file.
--
-- Re-runnable. Purely additive: nothing reads this table yet.

BEGIN;

CREATE TABLE IF NOT EXISTS public.money_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who. `actor_role` is a SNAPSHOT, not a join: a role can change, and
  -- the question this table answers is what somebody was allowed to do
  -- at the time, not what they are allowed to do now.
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role   TEXT,

  action       TEXT NOT NULL CHECK (action IN (
                 'claim_created', 'claim_settled', 'claim_failed', 'claim_rejected',
                 'batch_opened', 'batch_settled', 'batch_failed',
                 'adjustment_added', 'adjustment_reversed',
                 'escrow_released')),

  subject_type TEXT NOT NULL CHECK (subject_type IN
                 ('claim', 'batch', 'line', 'vendor', 'adjustment')),
  subject_id   UUID NOT NULL,

  -- Denormalised on purpose. A subject can be deleted or a claim can be
  -- cascaded away with its line, and the audit row must still be able to
  -- answer "whose money" and "which booking" without a join to a row
  -- that no longer exists. RESTRICT on line_id is what stops a booking
  -- being deleted out from under its own audit trail.
  vendor_id    UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  line_id      UUID REFERENCES public.booking_lines(id) ON DELETE RESTRICT,

  amount_paise BIGINT,
  before       JSONB,
  after        JSONB,
  reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_money_audit_vendor
  ON public.money_audit (vendor_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_money_audit_subject
  ON public.money_audit (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_money_audit_at
  ON public.money_audit (at DESC);

-- ── Append-only ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.money_audit_is_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'money_audit is append-only: a % would erase the record it exists to keep', TG_OP
    USING HINT = 'Write a new row. See the header of migration 136.';
END $$;

DROP TRIGGER IF EXISTS money_audit_no_update ON public.money_audit;
CREATE TRIGGER money_audit_no_update
  BEFORE UPDATE OR DELETE ON public.money_audit
  FOR EACH ROW EXECUTE FUNCTION public.money_audit_is_append_only();

-- ── The one way rows get in ─────────────────────────────────────────
--
-- SECURITY DEFINER so the RPCs in 137-140 can write without any of them
-- needing an INSERT policy, and so a caller cannot write an audit row
-- claiming to be somebody else: `actor_id` is taken from auth.uid()
-- here, never from an argument.
CREATE OR REPLACE FUNCTION public.write_money_audit(
  p_action       TEXT,
  p_subject_type TEXT,
  p_subject_id   UUID,
  p_vendor_id    UUID    DEFAULT NULL,
  p_line_id      UUID    DEFAULT NULL,
  p_amount_paise BIGINT  DEFAULT NULL,
  p_before       JSONB   DEFAULT NULL,
  p_after        JSONB   DEFAULT NULL,
  p_reason       TEXT    DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.money_audit (
    actor_id, actor_role, action, subject_type, subject_id,
    vendor_id, line_id, amount_paise, before, after, reason)
  VALUES (
    auth.uid(),
    COALESCE(public.get_my_role(), CASE WHEN auth.role() = 'service_role'
                                        THEN 'service_role' ELSE NULL END),
    p_action, p_subject_type, p_subject_id,
    p_vendor_id, p_line_id, p_amount_paise, p_before, p_after, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.write_money_audit(
  TEXT, TEXT, UUID, UUID, UUID, BIGINT, JSONB, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_money_audit(
  TEXT, TEXT, UUID, UUID, UUID, BIGINT, JSONB, JSONB, TEXT) TO authenticated, service_role;

-- ── RLS ─────────────────────────────────────────────────────────────
--
-- Operators read. NOBODY writes through a policy -- the only writer is
-- the SECURITY DEFINER function above, which is what makes "an audit row
-- cannot be forged" true rather than merely intended.
ALTER TABLE public.money_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators read the money audit" ON public.money_audit;
CREATE POLICY "operators read the money audit"
  ON public.money_audit FOR SELECT
  USING (public.caller_is_operator());

COMMIT;
