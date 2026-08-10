-- ============================================================
-- Migration 027: one partner profile per account, enforced.
--
-- `VendorOnboarding` and the vendor branch of `signUp` both write the
-- partner row with
--
--     .upsert(payload, { onConflict: 'profile_id' })
--
-- which PostgREST turns into `INSERT ... ON CONFLICT (profile_id) DO
-- UPDATE`. Postgres will only accept that clause if a unique index covers
-- exactly the conflict target, and `vendors.profile_id` has been a plain
-- nullable-free FK since migration 001 with no unique index on it. So every
-- such write — insert or update, first submission or a later edit — fails
-- with
--
--     there is no unique or exclusion constraint matching the ON CONFLICT
--     specification
--
-- and the partner sees "Submit for review" bounce with that message. The
-- error is not about the data; the statement never gets as far as looking
-- at a row.
--
-- One vendor row per profile is the assumption the whole vendor side is
-- already built on: onboarding hydrates with `.eq('profile_id', user.id)
-- .maybeSingle()`, and the RLS policies scope catalog, availability and
-- enquiries through `vendor_id IN (SELECT id FROM vendors WHERE profile_id
-- = auth.uid())` — a second row for the same profile would silently widen
-- every one of those. Writing the assumption down as a constraint is what
-- makes the upsert legal and the subqueries honest at the same time.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Refuse to run against duplicates rather than pick a winner ────
--
-- Deleting the "extra" row is not a safe automatic call: vendor_photos,
-- vendor_services, vendor_availability and the enquiry/order history all
-- reference vendors(id) ON DELETE CASCADE, so dropping the wrong duplicate
-- takes a partner's catalog and booking history with it. Since both writers
-- of this table have been failing on the missing constraint, duplicates
-- should not exist in practice — but if they do, stop and say which
-- profiles need a human decision instead of guessing.
DO $$
DECLARE
  dupes TEXT;
BEGIN
  SELECT string_agg(profile_id::text, ', ')
    INTO dupes
    FROM (
      SELECT profile_id
        FROM vendors
       GROUP BY profile_id
      HAVING count(*) > 1
    ) d;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'vendors has more than one row for profile_id(s): %. Merge them by hand '
      '(keep the row referenced by vendor_services / vendor_availability / '
      'enquiries, move anything worth keeping onto it, delete the rest), then '
      're-run this migration.', dupes;
  END IF;
END $$;

-- ── 2. The constraint the upsert has always needed ───────────────────
--
-- A named UNIQUE constraint rather than a bare unique index: PostgREST
-- resolves `onConflict` against either, but a constraint shows up in the
-- table definition where the next person reading the schema will see it.
-- The IF NOT EXISTS dance keeps the file re-runnable — plain ADD CONSTRAINT
-- has no such clause.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'vendors'::regclass
       AND conname  = 'vendors_profile_id_key'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- ── 3. Let the upsert's UPDATE branch through RLS ────────────────────
--
-- `ON CONFLICT DO UPDATE` needs both INSERT and UPDATE permission on the
-- row. Migration 001 gave vendors an UPDATE policy with USING only; an
-- UPDATE policy without WITH CHECK falls back to USING for the new row, so
-- this is already correct — but state it explicitly so a partner cannot
-- reassign their row to another profile_id on the way through.
DROP POLICY IF EXISTS "Vendor can update own record" ON vendors;
CREATE POLICY "Vendor can update own record"
  ON vendors FOR UPDATE
  USING      (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

COMMIT;
