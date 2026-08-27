-- ============================================================
-- 077 · Three columns, one fact. Make them agree, permanently.
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 067 and 075 FIRST.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE MESS I MADE
-- ══════════════════════════════════════════════════════════════════════
--
-- "Is this partner approved?" now has three answers:
--
--   vendors.is_verified          migration 001 · what DISPATCH reads
--   vendors.status               migration 005 · what the ADMIN reads
--   vendors.verification_status  migration 067 · what I added
--
-- 067 added the third and tied it to the first with a CHECK, which was
-- half the job. It never looked at `status`, and the seeded network went
-- in as:
--
--   221 synthetic | is_verified=true | verification_status=approved
--                 | status=PENDING_REVIEW
--
-- So dispatch considered them approved and the Command Center reported
-- "221 partners awaiting review · Nobody can be sourced from an
-- unapproved vendor" — about partners it was, at that moment, sourcing
-- from. Both screens were reading a real column. They were reading
-- different ones.
--
-- The header of 067 says, in as many words: "Two fields describing one
-- fact will eventually disagree, and the disagreement would be invisible
-- until a suspended partner kept receiving jobs." That was right, and I
-- then wrote a third field without checking for the second.
--
-- ── Why not just delete one ──────────────────────────────────────────
-- Tempting, and it would be a bigger change than it looks. `is_verified`
-- is read by `match_partners()`, by RLS, and by the customer-facing badge;
-- `status` is read across the admin console; `verification_status` is
-- what the review queue is built on and is the only one that can express
-- "rejected" as distinct from "never applied".
--
-- Dropping any of them means finding every reader, and a missed reader
-- fails silently — which is the failure mode this migration exists to
-- close, not to re-open. So all three stay and the DATABASE keeps them in
-- step, rather than three writers remembering to.
--
-- ── The rule ─────────────────────────────────────────────────────────
--   verification_status   is the source of truth (richest vocabulary)
--   is_verified           = (verification_status = 'approved')
--   status                = the legacy spelling of the same thing
--
-- A trigger derives the other two on every write, so a caller that sets
-- only one cannot leave the row inconsistent — including a caller that
-- does not know the other two exist.
-- ============================================================

BEGIN;

-- ── 1 · Reconcile what is already there ──────────────────────────────
UPDATE vendors
   SET status = CASE verification_status
                  WHEN 'approved'  THEN 'APPROVED'
                  WHEN 'rejected'  THEN 'REJECTED'
                  WHEN 'suspended' THEN 'SUSPENDED'
                  ELSE 'PENDING_REVIEW'
                END
 WHERE status IS DISTINCT FROM CASE verification_status
                  WHEN 'approved'  THEN 'APPROVED'
                  WHEN 'rejected'  THEN 'REJECTED'
                  WHEN 'suspended' THEN 'SUSPENDED'
                  ELSE 'PENDING_REVIEW'
                END;

-- ── 2 · Keep them in step, by construction ───────────────────────────
-- BEFORE, so the derived values are written rather than corrected after
-- the fact — an AFTER trigger would need a second UPDATE and would
-- re-fire itself.
CREATE OR REPLACE FUNCTION public.sync_vendor_verification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- A caller that moved the LEGACY column (an older admin screen, a
  -- direct SQL fix) is honoured by translating it up into the source of
  -- truth first. Otherwise the derivation below would quietly undo them.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
    NEW.verification_status := CASE NEW.status
      WHEN 'APPROVED'  THEN 'approved'
      WHEN 'REJECTED'  THEN 'rejected'
      WHEN 'SUSPENDED' THEN 'suspended'
      ELSE 'draft'
    END;
  END IF;

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

-- Runs AFTER the self-verify guard alphabetically ("sync" > "self"), so
-- the guard's pinning happens first and this derives from the pinned
-- value rather than from what a partner tried to send.
DROP TRIGGER IF EXISTS vendors_sync_verification ON vendors;
CREATE TRIGGER vendors_sync_verification
  BEFORE INSERT OR UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_verification_columns();

-- ── 3 · And prove it, rather than trusting the trigger ───────────────
-- The CHECK from 067 covered two of the three. This covers the third, so
-- a future path that somehow bypasses the trigger still cannot commit a
-- row where the admin console and dispatch disagree.
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_agrees;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_agrees
  CHECK (status = CASE verification_status
    WHEN 'approved'  THEN 'APPROVED'
    WHEN 'rejected'  THEN 'REJECTED'
    WHEN 'suspended' THEN 'SUSPENDED'
    ELSE 'PENDING_REVIEW'
  END);

-- ── Check ────────────────────────────────────────────────────────────
--   SELECT is_verified, verification_status, status, count(*)
--     FROM vendors GROUP BY 1,2,3 ORDER BY 4 DESC;
--
-- Every row must read either
--   true  | approved | APPROVED
-- or a matching unapproved triple. Anything else means a writer found a
-- path around both the trigger and the constraint, which should not be
-- possible.

COMMIT;
