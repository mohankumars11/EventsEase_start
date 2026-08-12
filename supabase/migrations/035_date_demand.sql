-- ============================================================
-- Migration 035: Event date demand, intake capacity, waitlist
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Adds the data behind the customer-facing date calendar:
--   1. time-of-day slot + flexibility on both request tables
--   2. peak_dates      — admin-marked muhurtham / festival pressure
--   3. intake_capacity — the real per-date ceiling, and the waitlist
--   4. date_demand()   — one aggregate call the calendar reads
--
-- APPLY THIS BEFORE PUSHING THE CODE THAT READS IT. `git push` does not
-- run migrations, and shipping against a missing table has closed a funnel
-- here before. The client degrades if date_demand() is absent, but the
-- wizard's INSERT needs the new columns.
--
-- Re-runnable: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS, and
-- every CREATE POLICY is paired with DROP POLICY IF EXISTS — CREATE POLICY
-- has no IF NOT EXISTS, and a half-applied run otherwise strands every
-- retry on 42710.
-- ============================================================


-- ── 1. Time-of-day slot and date flexibility ─────────────────────────
--
-- events.start_time / end_time (004) are free TIME columns that only two of
-- three write paths ever populated, so "morning or evening?" was never a
-- question the data could answer. time_slot is the bucket the customer
-- actually picks; start_time/end_time stay as the derived precise values so
-- nothing downstream that already reads them has to change.
--
-- Both request tables get the same columns even though only `events` is
-- wired this round. They have drifted apart once already (start_time landed
-- on service_enquiries seven migrations later than on events) and a
-- coordinator reading two tables with different shapes is how that drift
-- turns into a missed booking.

ALTER TABLE events ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS date_window_days SMALLINT;

ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS date_window_days SMALLINT;
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS end_time TIME;
-- events.flexible_date already exists (004:15) and has never been written.
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


-- ── 2. Intake status — accepted, or waiting for a slot ───────────────
--
-- A waitlisted enquiry is a real lead we intend to serve, not a rejection.
-- It is stored exactly like any other so a coordinator can promote it by
-- flipping one column, and it is excluded from the capacity count below —
-- otherwise the waitlist would consume the very slots it is queueing for.

ALTER TABLE events ADD COLUMN IF NOT EXISTS intake_status TEXT NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE service_enquiries ADD COLUMN IF NOT EXISTS intake_status TEXT NOT NULL DEFAULT 'ACCEPTED';

DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT events_intake_status_known
    CHECK (intake_status IN ('ACCEPTED','WAITLIST'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE service_enquiries ADD CONSTRAINT service_enquiries_intake_status_known
    CHECK (intake_status IN ('ACCEPTED','WAITLIST'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- events(event_date) is already indexed (004:186); its sibling never was.
CREATE INDEX IF NOT EXISTS idx_service_enquiries_event_date
  ON service_enquiries (event_date);


-- ── 3. peak_dates — the admin-marked calendar signal ─────────────────
--
-- On a muhurtham date every decorator, caterer and purohit in the city is
-- genuinely booked out. That is a true and useful thing to tell a customer,
-- and it is the one demand signal that works on day one with no booking
-- history at all.
--
-- `source` is NOT NULL by design. It records which panchang or almanac each
-- claim came from, so "22 Nov is a muhurtham" can always be traced back to
-- something real rather than to somebody's guess. A date nobody can source
-- does not belong in this table.

CREATE TABLE IF NOT EXISTS peak_dates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peak_date   DATE NOT NULL,
  -- NULL city = applies to every pilot city.
  city        TEXT,
  kind        TEXT NOT NULL
              CHECK (kind IN ('MUHURTHAM','FESTIVAL','LONG_WEEKEND','SEASON','OTHER')),
  label       TEXT NOT NULL,          -- 'Shubha muhurtham'
  note        TEXT,                   -- the customer-facing sentence
  -- 1 mild · 2 notable · 3 the city is full. Feeds the tone score directly.
  weight      SMALLINT NOT NULL DEFAULT 2 CHECK (weight BETWEEN 1 AND 3),
  source      TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT peak_dates_one_per_city_day UNIQUE (peak_date, city)
);

CREATE INDEX IF NOT EXISTS idx_peak_dates_by_date ON peak_dates (peak_date);

-- No seed rows. Auspicious dates are not something to invent — a wrong one
-- is both a false claim and embarrassing in front of exactly the customers
-- who would notice. Seed from a published panchang via the admin screen,
-- which records the source. Until then the calendar runs on festivals,
-- weekends, season windows and live vendor capacity.


-- ── 4. intake_capacity — how many we can actually serve in a day ─────
--
-- The honest scarcity mechanism, and the one that protects the business.
-- Past some number of celebrations on a single date, vendors cannot be
-- sourced and *every* customer on that date gets a worse event.
--
-- Flat count: any event type counts as 1. Default 12 for the pilot — raise
-- it toward 20 from the admin screen once real volume shows the approved
-- vendor bench can take it. It is a setting precisely so revisiting it
-- needs no migration.

CREATE TABLE IF NOT EXISTS intake_capacity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL city = the fallback for any city without its own row.
  city         TEXT UNIQUE,
  max_per_date SMALLINT NOT NULL DEFAULT 12 CHECK (max_per_date > 0),
  updated_by   UUID REFERENCES profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO intake_capacity (city, max_per_date)
VALUES ('Bengaluru', 12), ('Mysore', 12)
ON CONFLICT (city) DO NOTHING;


-- ── 5. updated_at triggers (update_updated_at() is from migration 005) ──

DROP TRIGGER IF EXISTS trg_peak_dates_updated_at ON peak_dates;
CREATE TRIGGER trg_peak_dates_updated_at
  BEFORE UPDATE ON peak_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_intake_capacity_updated_at ON intake_capacity;
CREATE TRIGGER trg_intake_capacity_updated_at
  BEFORE UPDATE ON intake_capacity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 6. RLS ───────────────────────────────────────────────────────────
--
-- Both tables are world-readable: they hold no personal data, and the
-- landing page reads them signed-out. Writes are coordinator-only, using
-- get_my_role() (migration 006) rather than a bare EXISTS against profiles,
-- which would reintroduce the recursion 006 exists to remove.

ALTER TABLE peak_dates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_capacity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reads_peak_dates" ON peak_dates;
CREATE POLICY "public_reads_peak_dates" ON peak_dates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins_manage_peak_dates" ON peak_dates;
CREATE POLICY "admins_manage_peak_dates" ON peak_dates FOR ALL
  USING      (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));

DROP POLICY IF EXISTS "public_reads_intake_capacity" ON intake_capacity;
CREATE POLICY "public_reads_intake_capacity" ON intake_capacity FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins_manage_intake_capacity" ON intake_capacity;
CREATE POLICY "admins_manage_intake_capacity" ON intake_capacity FOR ALL
  USING      (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));


-- ── 7. date_demand() — the one call the calendar makes ───────────────
--
-- SECURITY DEFINER for the same reason as get_product_order_counts (019):
-- RLS on events and service_enquiries scopes SELECT to the caller's own
-- rows, so a plain view here would report every customer a calendar full of
-- nothing but their own enquiries.
--
-- Only aggregates cross the boundary. No customer row, no vendor identity,
-- nothing that says *who* — just how many, which is the only thing the
-- calendar needs and the only thing it is safe to hand an anonymous caller.
--
-- Waitlisted rows are excluded from `consumed`, as are cancelled events and
-- closed enquiries. Counting a cancelled event against a date would hold a
-- slot nobody is using.

CREATE OR REPLACE FUNCTION date_demand(
  p_from DATE,
  p_to   DATE,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE(
  d                   DATE,
  consumed            INT,
  capacity            INT,
  vendors_total       INT,
  vendors_constrained INT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  WITH span AS (
    -- Clamp: never before today, and at most ~13 months out, so a bad
    -- client range can't ask Postgres to build a series of 10,000 days.
    SELECT greatest(p_from, current_date)                       AS lo,
           least(p_to, greatest(p_from, current_date) + 400)    AS hi
  ),
  days AS (
    SELECT generate_series(lo, hi, '1 day'::interval)::date AS d FROM span
  ),
  cap AS (
    -- City row wins; the NULL-city row is the fallback; 12 if neither
    -- exists. LIMIT 1 on both because Postgres allows repeated NULLs
    -- through a UNIQUE column, and a scalar subquery returning two rows
    -- would take the whole calendar down with it.
    SELECT COALESCE(
      (SELECT max_per_date FROM intake_capacity
        WHERE p_city IS NOT NULL AND city = p_city LIMIT 1),
      (SELECT max_per_date FROM intake_capacity WHERE city IS NULL LIMIT 1),
      12
    )::int AS max_per_date
  ),
  ev AS (
    SELECT e.event_date AS d, COUNT(*)::int AS n
    FROM events e, span
    WHERE e.event_date BETWEEN span.lo AND span.hi
      AND e.intake_status = 'ACCEPTED'
      AND e.status <> 'CANCELLED'
      AND (p_city IS NULL OR e.city = p_city)
    GROUP BY e.event_date
  ),
  se AS (
    SELECT s.event_date AS d, COUNT(*)::int AS n
    FROM service_enquiries s, span
    WHERE s.event_date BETWEEN span.lo AND span.hi
      AND s.intake_status = 'ACCEPTED'
      AND s.status <> 'closed'
      AND (p_city IS NULL
           OR COALESCE(s.location->>'city', 'Bengaluru') = p_city)
    GROUP BY s.event_date
  ),
  vt AS (
    SELECT COUNT(*)::int AS n FROM vendors
    WHERE status = 'APPROVED' AND COALESCE(accepting_bookings, TRUE)
  ),
  vc AS (
    -- Approved partners who have marked themselves busy or reduced that
    -- day. This is the supply half of the signal and it is entirely real.
    SELECT va.slot_date AS d, COUNT(DISTINCT va.vendor_id)::int AS n
    FROM vendor_availability va
    JOIN vendors v ON v.id = va.vendor_id
    CROSS JOIN span
    WHERE va.slot_date BETWEEN span.lo AND span.hi
      AND va.status IN ('BLOCKED','LIMITED')
      AND v.status = 'APPROVED'
    GROUP BY va.slot_date
  )
  SELECT days.d,
         (COALESCE(ev.n, 0) + COALESCE(se.n, 0))::int,
         cap.max_per_date,
         vt.n,
         COALESCE(vc.n, 0)::int
  FROM days
  CROSS JOIN cap
  CROSS JOIN vt
  LEFT JOIN ev ON ev.d = days.d
  LEFT JOIN se ON se.d = days.d
  LEFT JOIN vc ON vc.d = days.d
  ORDER BY days.d;
$$;

GRANT EXECUTE ON FUNCTION date_demand(DATE, DATE, TEXT) TO anon, authenticated;
