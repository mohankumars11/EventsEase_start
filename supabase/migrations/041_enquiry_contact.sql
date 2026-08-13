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

-- The part of the day the customer asked for. `start_time` already exists and
-- is derived from this, but a clock time cannot be read back as "evening" —
-- and "evening" is what decides which vendors can even be asked.
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS time_slot TEXT;

ALTER TABLE service_enquiries DROP CONSTRAINT IF EXISTS service_enquiries_time_slot_check;
ALTER TABLE service_enquiries ADD CONSTRAINT service_enquiries_time_slot_check
  CHECK (time_slot IS NULL OR time_slot IN ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY'));

-- Lift what the cart and the builder have already been writing into `location`.
-- Both shapes are read: the flat one both writers use, and a nested `contact`
-- object, so a future writer that prefers the tidier shape is covered too.
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
  time_slot = COALESCE(time_slot, NULLIF(UPPER(location->>'slot'), ''))
WHERE location IS NOT NULL
  AND (contact_name IS NULL OR contact_phone IS NULL OR contact_email IS NULL OR time_slot IS NULL);

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
