-- ============================================================
-- Migration 041: a name and a number on every enquiry.
--
-- Independent of 039 and 040 — it touches only `service_enquiries` and can be
-- applied before or after either of them.
--
-- `service_enquiries` has carried `customer_id` and nothing else a person
-- could act on. Sambramo's whole promise is that a coordinator calls you back,
-- and the two flows that write to this table were leaving them to join to
-- `profiles` and hope — where a Google-OAuth profile carries no phone at all.
--
-- The app does NOT wait for this migration. Both writers put the contact into
-- `location` (JSONB) and at the top of `notes`, which exist today, and they
-- keep doing so after this is applied:
--
--   · /plan/build          CelebrationBuilder → ContactBlock (new)
--   · /dashboard/…/cart    Cart → BookingSheet (already did)
--
-- So this is a promotion of data that is already being captured, not a
-- prerequisite for capturing it. Nothing breaks while it is unapplied; the
-- columns just read NULL and the JSONB stays the source. `events` needs none
-- of this — it has had customer_name / customer_phone / customer_email since
-- the wizard was written.
--
-- ── Why the backfill disables a trigger, and why that is not a shortcut ──
-- The first cut of this migration failed here:
--
--   ERROR: P0001: You can only cancel a request that has not been responded
--   to yet.  CONTEXT: PL/pgSQL function enforce_enquiry_self_update() line 32
--
-- That is migration 034's trigger doing exactly its job. It opens with
-- `IF get_my_role() IN ('admin','event_coordinator') THEN RETURN NEW`, and in
-- the SQL Editor there is no JWT, so `get_my_role()` is NULL and the statement
-- is judged as if a customer had sent it. It then permits precisely two
-- shapes — claim a price lock, or cancel an untouched request — and RAISEs on
-- everything else. A column backfill is neither, so it raises on the first row.
--
-- The trigger is right and is deliberately left alone. Widening it to wave
-- through callers with no JWT would hand that same exemption to anything
-- holding the service-role key, which is a permanent hole punched for a
-- one-off UPDATE. Disabling the named trigger for the duration of that single
-- statement is narrower, is visible in the file, and cannot outlive the
-- transaction: if any part of this migration fails, the ENABLE rolls back with
-- everything else and the trigger is still armed.
--
-- Requires table ownership (the SQL Editor runs as `postgres`, which owns it).
-- The trigger is named explicitly rather than using DISABLE TRIGGER ALL, which
-- would also take down foreign-key triggers and does need superuser.
--
-- ── time_slot is NOT added here ─────────────────────────────────────────
-- Migration 035 already added `service_enquiries.time_slot` and already
-- constrained it to the same four values, as `service_enquiries_time_slot_known`.
-- The first cut of this file added a second constraint saying the same thing
-- under a different name. Only the backfill belongs here.
--
-- ── Backfill ────────────────────────────────────────────────────────────
-- Every row already in the table gets its contact lifted out of `location`,
-- including the ones the cart wrote months ago. Re-running is harmless: the
-- UPDATE only touches rows where the column is still NULL.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS contact_name  TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- ── The backfill, past the self-update rule ───────────────────────────
-- Guarded on the trigger actually existing: ALTER TABLE … DISABLE TRIGGER
-- errors on a name that is not there, and a database that never got 013/034
-- should still be able to run this file.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_enforce_enquiry_self_update'
      AND tgrelid = 'service_enquiries'::regclass
  ) THEN
    ALTER TABLE service_enquiries DISABLE TRIGGER trg_enforce_enquiry_self_update;
  END IF;
END $$;

-- Lift what the cart and the builder have already been writing into `location`.
-- Both shapes are read: the flat one both writers use, and a nested `contact`
-- object, so a future writer that prefers the tidier shape is covered too.
--
-- `time_slot` is only taken when the stored value is one of the four the
-- constraint from 035 allows. The cart stores lowercase ids ('full_day'), so
-- UPPER is needed; anything else is left NULL rather than smuggled past a
-- CHECK that would abort the whole migration on one malformed row.
UPDATE service_enquiries
SET
  contact_name = COALESCE(
    contact_name,
    NULLIF(location->>'name', ''),
    NULLIF(location->'contact'->>'name', '')
  ),
  contact_phone = COALESCE(
    contact_phone,
    NULLIF(location->>'phone', ''),
    NULLIF(location->'contact'->>'phone', '')
  ),
  contact_email = COALESCE(
    contact_email,
    NULLIF(location->>'email', ''),
    NULLIF(location->'contact'->>'email', '')
  ),
  time_slot = COALESCE(
    time_slot,
    CASE
      WHEN UPPER(location->>'slot') IN ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY')
      THEN UPPER(location->>'slot')
    END
  )
WHERE location IS NOT NULL
  AND (contact_name IS NULL OR contact_phone IS NULL OR contact_email IS NULL OR time_slot IS NULL);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_enforce_enquiry_self_update'
      AND tgrelid = 'service_enquiries'::regclass
  ) THEN
    ALTER TABLE service_enquiries ENABLE TRIGGER trg_enforce_enquiry_self_update;
  END IF;
END $$;

-- The queue a coordinator actually works: everything still open, with a number
-- on it, oldest first. Partial so it stays small as closed requests pile up.
CREATE INDEX IF NOT EXISTS idx_enquiries_open_contactable
  ON service_enquiries (created_at)
  WHERE status = 'open' AND contact_phone IS NOT NULL;

-- The one worth alerting on: an open request nobody can ring. After this
-- migration and the app change that accompanies it, no NEW row should ever
-- land here — so a non-empty result is a regression, not a backlog.
CREATE INDEX IF NOT EXISTS idx_enquiries_open_unreachable
  ON service_enquiries (created_at)
  WHERE status = 'open' AND contact_phone IS NULL;

COMMIT;

-- ── Check it landed ─────────────────────────────────────────────────────
-- Run separately, after the COMMIT above. Expect the three columns to exist,
-- and `unreachable_open` to be the count of OLD open requests raised before
-- today's app change — new ones can no longer be created.
--
--   SELECT
--     count(*)                                          AS total,
--     count(*) FILTER (WHERE contact_phone IS NOT NULL) AS with_phone,
--     count(*) FILTER (WHERE status = 'open'
--                        AND contact_phone IS NULL)     AS unreachable_open
--   FROM service_enquiries;
