-- ============================================================
-- 067 · Vendor verification — the CEO's gate, enforced by the database
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057–066 FIRST.
--
-- ── This UPGRADES the guard from 066 ─────────────────────────────────
-- 066 shipped a minimal `guard_vendor_self_verify()` that only pins
-- `is_verified` and `is_featured`, because those were the only trust
-- columns that existed and it had to stand alone.
--
-- This migration adds `verification_status`, `is_synthetic` and the
-- review workflow, so the guard is replaced (CREATE OR REPLACE) with a
-- version that knows about them and additionally allows the one
-- transition a partner IS entitled to make: draft → submitted.
--
-- Applying 066 and then 067 is correct. Applying 067 without 066 is also
-- correct. Applying 066 after 067 would DOWNGRADE the guard and reopen
-- the verification_status hole — so do not.
--
-- ── The gate already half-exists, and the half that is missing matters ──
-- `vendors.is_verified` has been there since migration 001, and
-- `match_partners()` (060) already refuses to dispatch to a partner
-- without it. So the mechanism works.
--
-- What has never existed is a LOCK on who may set it. The live policy,
-- as replaced by migration 027, is:
--
--     CREATE POLICY "Vendor can update own record"
--       ON vendors FOR UPDATE
--       USING      (profile_id = auth.uid())
--       WITH CHECK (profile_id = auth.uid());
--
-- 027 added the WITH CHECK to stop a partner reassigning their row to
-- another profile, and it does that correctly. But it is still FOR
-- UPDATE across EVERY COLUMN, `is_verified` included. A partner can mark
-- themselves verified with a single PATCH and walk into the dispatch
-- pool. Nothing in the app offers that button — but RLS is the security
-- boundary, not the UI, and a REST client does not need a button.
--
-- This is live today. It has been harmless only because `is_verified`
-- decided whether a badge rendered. It is not harmless now that it
-- decides who receives real bookings and real money.
--
-- That was survivable while `is_verified` only decided whether a badge
-- rendered. It is not survivable now that it decides who receives real
-- bookings and real money.
--
-- ── Two ways a partner gets listed, one way they go live ─────────────
-- The CEO can create a listing directly — most of the pilot supply will
-- be signed up in person, not through a form — or a partner can sign
-- themselves up. Either way the row lands unverified and invisible, and
-- exactly one action makes it dispatchable: a named human approving it.
--
-- ── Why an audit table and not just a timestamp ──────────────────────
-- "Who approved this decorator, and on what basis?" becomes a real
-- question the first time an approved partner does something bad. A
-- `verified_at` column answers when and not who, and is destroyed by the
-- next change. Same reasoning as `order_events` (039) and
-- `celebration_events` (045): a trigger-written log rather than a column
-- that forgets.
-- ============================================================

BEGIN;

-- ── Where a listing came from ────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS listed_by TEXT NOT NULL DEFAULT 'self_signup'
  CHECK (listed_by IN ('self_signup','admin_upload','import'));

-- ── The review state, which is richer than a boolean ─────────────────
-- `is_verified` stays as the single thing dispatch reads, so nothing that
-- already queries it has to change. This column is what the CEO's queue
-- is built on: a rejected partner and a partner who has not applied are
-- both `is_verified = false` and need completely different screens.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (verification_status IN ('draft','submitted','approved','rejected','suspended'));

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Existing verified rows predate all of this. Bring them into the new
-- vocabulary rather than leaving them in a state the queue cannot show.
UPDATE vendors SET verification_status = 'approved'
 WHERE is_verified = TRUE AND verification_status = 'draft';

-- ── The two must agree, always ───────────────────────────────────────
-- `is_verified` is what dispatch reads; `verification_status` is what the
-- console shows. Two fields describing one fact will eventually disagree,
-- and the disagreement would be invisible until a suspended partner kept
-- receiving jobs.
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_verification_agrees;
ALTER TABLE vendors ADD CONSTRAINT vendors_verification_agrees
  CHECK (is_verified = (verification_status = 'approved'));

CREATE INDEX IF NOT EXISTS idx_vendors_review_queue
  ON vendors (submitted_at) WHERE verification_status = 'submitted';

-- ══════════════════════════════════════════════════════════════════════
-- THE LOCK
-- ══════════════════════════════════════════════════════════════════════
-- Migration 001's policy stays (a partner must be able to edit their own
-- name, description and radius), and this trigger removes the three
-- columns they must never write. A BEFORE UPDATE trigger is the right
-- shape because RLS grants or denies a whole row — it cannot express
-- "every column except these".
CREATE OR REPLACE FUNCTION public.guard_vendor_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() IN ('admin','event_coordinator') THEN
    RETURN NEW;
  END IF;

  -- A partner may move draft → submitted, and nothing else. Applying is
  -- theirs; approving is not.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (OLD.verification_status IN ('draft','rejected')
            AND NEW.verification_status = 'submitted') THEN
      RAISE EXCEPTION
        'verification_status % is set by review, not by the partner', NEW.verification_status
        USING HINT = 'A partner may submit for review. Only an admin approves.';
    END IF;
    NEW.submitted_at := now();
  END IF;

  -- Silently restored rather than raising: these are not fields a partner
  -- is ever shown, so an attempt to write them is a client doing
  -- something it should not, and the correct response is for it to have
  -- no effect.
  NEW.is_verified := OLD.is_verified;
  NEW.verified_by := OLD.verified_by;
  NEW.verified_at := OLD.verified_at;
  NEW.is_featured := OLD.is_featured;
  NEW.is_synthetic := OLD.is_synthetic;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_self_verify_guard ON vendors;
CREATE TRIGGER vendors_self_verify_guard
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_self_verify();

-- ══════════════════════════════════════════════════════════════════════
-- The audit log
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vendor_verification_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  from_value TEXT,
  to_value   TEXT NOT NULL,
  actor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_verification_events_vendor
  ON vendor_verification_events (vendor_id, created_at DESC);

-- Written by a trigger, never by the app. Verification is changed from
-- the console, from this migration's backfill and eventually from a bulk
-- import, and an app-side log is one forgotten call away from a history
-- with holes in it. 039 and 045 both reached the same conclusion.
CREATE OR REPLACE FUNCTION public.log_vendor_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO vendor_verification_events
      (vendor_id, from_value, to_value, actor_id, actor_role, note)
    VALUES
      (NEW.id, OLD.verification_status, NEW.verification_status,
       auth.uid(), get_my_role(), NEW.verification_note);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_verification_log ON vendors;
CREATE TRIGGER vendors_verification_log
  AFTER UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_vendor_verification();

ALTER TABLE vendor_verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners read own verification history" ON vendor_verification_events;
CREATE POLICY "partners read own verification history"
  ON vendor_verification_events FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "admins read verification history" ON vendor_verification_events;
CREATE POLICY "admins read verification history"
  ON vendor_verification_events FOR SELECT
  USING (get_my_role() IN ('admin','event_coordinator'));

-- ══════════════════════════════════════════════════════════════════════
-- approve_vendor / reject_vendor — the CEO's two buttons
-- ══════════════════════════════════════════════════════════════════════
-- One call each, so the console cannot approve a partner and forget to
-- flip `is_verified`, which is the field that actually decides whether
-- they receive work.
CREATE OR REPLACE FUNCTION public.set_vendor_verification(
  p_vendor_id UUID,
  p_status    TEXT,
  p_note      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin','event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  IF p_status NOT IN ('approved','rejected','suspended','submitted','draft') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_status');
  END IF;

  UPDATE vendors
     SET verification_status = p_status,
         is_verified         = (p_status = 'approved'),
         verification_note   = p_note,
         verified_by         = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE verified_by END,
         verified_at         = CASE WHEN p_status = 'approved' THEN now()      ELSE verified_at END
   WHERE id = p_vendor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Suspending a partner does NOT touch work they have already accepted.
  -- Those lines are paid for and a family is expecting somebody; pulling
  -- them would turn a supply decision into a customer's ruined Saturday.
  -- They stop receiving NEW offers, which match_partners() enforces on
  -- the next dispatch by reading is_verified.
  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vendor_verification(UUID, TEXT, TEXT) TO authenticated;

COMMIT;
