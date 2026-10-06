-- ============================================================
-- 078 · When the two columns disagree, the source of truth wins
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 077 FIRST.
-- One CREATE OR REPLACE. No data touched.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE BUG 077 SHIPPED WITH
-- ══════════════════════════════════════════════════════════════════════
--
-- Setting both columns in one statement produced the wrong answer:
--
--   UPDATE vendors
--      SET verification_status = 'approved',
--          status              = 'PENDING_REVIEW';
--
--   → verification_status = 'draft'      ← not what was asked for
--
-- 077 carried a branch meant to honour a LEGACY caller that moved only
-- `status`, by translating it up into `verification_status`. It fired
-- like this:
--
--   IF NEW.status IS DISTINCT FROM OLD.status
--      AND NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status
--
-- and the second half is the mistake. Postgres cannot tell "the caller
-- did not send this column" from "the caller sent the value it already
-- had" — in a trigger, NEW is fully populated either way. So an UPDATE
-- that set `verification_status = 'approved'` on a row that was ALREADY
-- approved looked identical to one that never mentioned it, the legacy
-- branch took over, and `PENDING_REVIEW` silently overwrote the
-- approval.
--
-- On a table that decides who receives real bookings, "silently
-- overwrote the approval" is not a rounding error.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE BRANCH CAN SIMPLY GO
-- ══════════════════════════════════════════════════════════════════════
--
-- It existed for a caller that does not exist. Every writer of
-- `vendors.status` in this codebase is a signup path:
--
--   context/AuthContext.jsx           status: 'PENDING_REVIEW'
--   pages/onboarding/VendorOnboarding status: 'PENDING_REVIEW'
--
-- Both on INSERT, both writing the value that `verification_status`
-- already defaults to ('draft' → PENDING_REVIEW). Nothing anywhere sets
-- it to APPROVED. So the branch protected a path nobody walks, at the
-- cost of an ambiguity on the path everybody walks.
--
-- Removing it makes the rule one sentence, which is what a rule about
-- who gets paid should be:
--
--   verification_status is the truth.
--   is_verified and status are derived from it, always, on every write.
--
-- A legacy caller writing only `status` now has it corrected to match
-- `verification_status` rather than the other way round. For the two
-- signup paths above that is a no-op, and for anything else it is the
-- safe direction: a stray write cannot promote anybody.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_vendor_verification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- One rule, no branch, no ambiguity. `verification_status` is the only
  -- input; the other two are output.
  --
  -- Deliberately NOT trying to detect which columns the caller "meant"
  -- to set. That detection is not possible in a trigger, and 077 proved
  -- what happens when you attempt it anyway.
  NEW.is_verified := (NEW.verification_status = 'approved');

  NEW.status := CASE NEW.verification_status
    WHEN 'approved'  THEN 'APPROVED'
    WHEN 'rejected'  THEN 'REJECTED'
    WHEN 'suspended' THEN 'SUSPENDED'
    ELSE 'PENDING_REVIEW'
  END;

  RETURN NEW;
END;
$$;

-- The trigger itself is unchanged — 077 created it BEFORE INSERT OR
-- UPDATE and that is still right. Only the body needed fixing.

-- ── Check, as three statements ───────────────────────────────────────
--
--   -- the source of truth drives the others
--   UPDATE vendors SET verification_status='suspended' WHERE id='<id>';
--   -- → suspended | SUSPENDED | is_verified = false
--
--   -- a conflicting pair resolves to the source of truth, not the legacy column
--   UPDATE vendors SET verification_status='approved', status='PENDING_REVIEW'
--    WHERE id='<id>';
--   -- → approved | APPROVED | is_verified = true      ← 077 gave 'draft'
--
--   -- a stray legacy write cannot promote anybody
--   UPDATE vendors SET status='APPROVED' WHERE id='<id>';
--   -- → whatever verification_status already said, unchanged

COMMIT;
