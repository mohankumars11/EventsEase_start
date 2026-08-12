-- ============================================================
-- Migration 036: Date enquiry interest, admin-driven
-- Run this in: Supabase Dashboard → SQL Editor, AFTER 035.
--
-- Replaces the demand model 035 shipped with. That version scored every
-- date automatically from festivals, weekends, seasons and vendor
-- availability, and the result was a calendar where nearly every day
-- showed as busy — which is a calendar nobody believes. It also let vendor
-- availability drive what a customer saw.
--
-- The MVP model is simpler and entirely admin-driven:
--
--   * Every date is available. Nothing is ever blocked, capped or refused.
--   * The only thing a date can say is how many people have asked about it.
--   * That number is real: enquiries submitted through the site, plus
--     enquiries the team logged from WhatsApp, calls and Instagram.
--
-- 035's peak_dates and intake_capacity tables are left in place but are no
-- longer read by the app. They are empty in practice; drop them by hand if
-- you want the schema tidy.
--
-- Re-runnable. CREATE POLICY has no IF NOT EXISTS, so each is paired with
-- DROP POLICY IF EXISTS.
-- ============================================================


-- ── 1. Enquiries the team took off-platform ──────────────────────────
--
-- Most early enquiries for a concierge arrive by WhatsApp or a phone call,
-- not through a web form. Those are real people asking about real dates, so
-- they belong in the number a customer sees — but only if we can say where
-- they came from.
--
-- `note` is NOT NULL for the same reason peak_dates.source was: it is the
-- audit trail. "4 enquiries" with "2 WhatsApp, 2 calls from the Jayanagar
-- flyer" behind it is a fact. "4" on its own is a number somebody typed,
-- and a number nobody can trace is exactly the false-urgency pattern the
-- CCPA dark-pattern guidelines name.

CREATE TABLE IF NOT EXISTS date_enquiry_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_date  DATE NOT NULL,
  -- NULL city = counts for every pilot city.
  city          TEXT,
  -- How many real conversations. Not a score, not a multiplier.
  logged_count  SMALLINT NOT NULL CHECK (logged_count > 0 AND logged_count <= 500),
  note          TEXT NOT NULL,
  logged_by     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Deliberately no UNIQUE (enquiry_date, city): this is a log, not a state
-- table. "3 more came in today" is a second row, and date_demand() sums
-- them. A unique constraint would also not have worked as intended —
-- Postgres treats repeated NULLs as distinct, so the all-cities rows would
-- have slipped past it anyway.

CREATE INDEX IF NOT EXISTS idx_date_enquiry_log_by_date
  ON date_enquiry_log (enquiry_date);

DROP TRIGGER IF EXISTS trg_date_enquiry_log_updated_at ON date_enquiry_log;
CREATE TRIGGER trg_date_enquiry_log_updated_at
  BEFORE UPDATE ON date_enquiry_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. RLS ───────────────────────────────────────────────────────────
-- World-readable: no personal data, and the home screen reads it
-- signed-out. Writes are coordinator-only via get_my_role() (migration
-- 006) rather than a bare EXISTS against profiles, which would reintroduce
-- the recursion 006 removed.

ALTER TABLE date_enquiry_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reads_date_enquiry_log" ON date_enquiry_log;
CREATE POLICY "public_reads_date_enquiry_log" ON date_enquiry_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins_manage_date_enquiry_log" ON date_enquiry_log;
CREATE POLICY "admins_manage_date_enquiry_log" ON date_enquiry_log FOR ALL
  USING      (get_my_role() IN ('admin', 'event_coordinator'))
  WITH CHECK (get_my_role() IN ('admin', 'event_coordinator'));


-- ── 3. date_demand() — replaced ──────────────────────────────────────
--
-- Same name so nothing else has to change, but the shape is different: no
-- capacity, no vendor pressure. Two counts and their sum, per date.
--
-- SECURITY DEFINER for the reason get_product_order_counts (019) documents:
-- RLS on events and service_enquiries scopes SELECT to the caller's own
-- rows, so a plain view would show every customer a calendar containing
-- nothing but their own enquiries.
--
-- Only aggregates cross the boundary — never who.

DROP FUNCTION IF EXISTS date_demand(DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION date_demand(
  p_from DATE,
  p_to   DATE,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE(
  d             DATE,
  site_count    INT,
  logged_count  INT,
  total_count   INT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  WITH span AS (
    -- Clamp: never before today, at most ~13 months out, so a bad client
    -- range can't ask Postgres to build a series of 10,000 days.
    SELECT greatest(p_from, current_date)                    AS lo,
           least(p_to, greatest(p_from, current_date) + 400) AS hi
  ),
  days AS (
    SELECT generate_series(lo, hi, '1 day'::interval)::date AS d FROM span
  ),
  ev AS (
    SELECT e.event_date AS d, COUNT(*)::int AS n
    FROM events e, span
    WHERE e.event_date BETWEEN span.lo AND span.hi
      AND e.status <> 'CANCELLED'
      AND (p_city IS NULL OR e.city = p_city)
    GROUP BY e.event_date
  ),
  se AS (
    SELECT s.event_date AS d, COUNT(*)::int AS n
    FROM service_enquiries s, span
    WHERE s.event_date BETWEEN span.lo AND span.hi
      AND s.status <> 'closed'
      AND (p_city IS NULL
           OR COALESCE(s.location->>'city', 'Bengaluru') = p_city)
    GROUP BY s.event_date
  ),
  lg AS (
    -- A row with no city counts everywhere; a row with one counts only there.
    SELECT l.enquiry_date AS d, SUM(l.logged_count)::int AS n
    FROM date_enquiry_log l, span
    WHERE l.enquiry_date BETWEEN span.lo AND span.hi
      AND (p_city IS NULL OR l.city IS NULL OR l.city = p_city)
    GROUP BY l.enquiry_date
  )
  SELECT days.d,
         (COALESCE(ev.n, 0) + COALESCE(se.n, 0))::int AS site_count,
         COALESCE(lg.n, 0)::int                        AS logged_count,
         (COALESCE(ev.n, 0) + COALESCE(se.n, 0) + COALESCE(lg.n, 0))::int AS total_count
  FROM days
  LEFT JOIN ev ON ev.d = days.d
  LEFT JOIN se ON se.d = days.d
  LEFT JOIN lg ON lg.d = days.d
  ORDER BY days.d;
$$;

GRANT EXECUTE ON FUNCTION date_demand(DATE, DATE, TEXT) TO anon, authenticated;
