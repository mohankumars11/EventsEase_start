-- ============================================================
-- Migration 035: Time-of-day slot and date flexibility
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- ── What this file used to contain, and why it doesn't ──────────────
--
-- The first version of this migration also created peak_dates,
-- intake_capacity and a date_demand() that returned capacity and vendor
-- pressure. That whole model was replaced by 036: every date is available,
-- and the only thing a date says is how many people have asked about it.
--
-- Its date_demand() is what made this file fail with
--
--   42P13: cannot change return type of existing function
--
-- once 036 had already defined the current one. CREATE OR REPLACE cannot
-- change a function's OUT parameters, so the old definition could never sit
-- on top of the new. Rather than drop and recreate a function this file no
-- longer owns, the obsolete parts are gone: 036 is the single definition of
-- date_demand(), and this file is now only the columns the wizard writes.
--
-- If an earlier run already created peak_dates and intake_capacity, they are
-- harmless leftovers — nothing reads them. Drop them if you want the schema
-- tidy:
--   DROP TABLE IF EXISTS peak_dates, intake_capacity;
-- ============================================================


-- ── Time-of-day slot and date flexibility ────────────────────────────
--
-- events.start_time / end_time (004) are free TIME columns that only two of
-- three write paths ever populated, so "morning or evening?" was never a
-- question the data could answer. time_slot is the bucket the customer
-- actually picks; start_time/end_time stay as the derived precise values so
-- nothing downstream that already reads them has to change.
--
-- Both request tables get the same columns even though only `events` is
-- wired today. They have drifted apart once already (start_time landed on
-- service_enquiries seven migrations later than on events) and a coordinator
-- reading two tables with different shapes is how that drift turns into a
-- missed booking.

ALTER TABLE events ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS date_window_days SMALLINT;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS date_window_days SMALLINT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS end_time TIME;
-- events.flexible_date already exists (004:15) and had never been written.
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS flexible_date BOOLEAN DEFAULT FALSE;

DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT events_time_slot_known
    CHECK (time_slot IS NULL OR time_slot IN ('MORNING','AFTERNOON','EVENING','FULL_DAY'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE service_enquiries ADD CONSTRAINT service_enquiries_time_slot_known
    CHECK (time_slot IS NULL OR time_slot IN ('MORNING','AFTERNOON','EVENING','FULL_DAY'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_date stays NULLABLE on purpose. The requirement is enforced in the
-- wizard, not the schema: a NOT NULL would fail against the existing rows
-- that predate this feature, and would also close the anonymous-event path
-- migration 007 deliberately opened.

-- events(event_date) is already indexed (004:186); its sibling never was,
-- and 036's date_demand() groups by it on both tables.
CREATE INDEX IF NOT EXISTS idx_service_enquiries_event_date
  ON service_enquiries (event_date);
