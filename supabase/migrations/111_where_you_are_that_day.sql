-- ════════════════════════════════════════════════════════════════════
-- 111 · Where a partner will be on a given day
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 021 and 057.
--
-- ══════════════════════════════════════════════════════════════════════
-- "I AM IN MYSORE THAT WEEKEND" IS CURRENTLY INEXPRESSIBLE
-- ══════════════════════════════════════════════════════════════════════
--
-- A partner has exactly one location: `vendors.location`, set once, plus
-- a `service_radius_km`. `match_partners` measures every job against that
-- one point forever.
--
-- So a decorator who is in Mysore for a three-day wedding is still being
-- offered Bengaluru jobs on those days, and their only options are to
-- block the dates — losing the Mysore work they could take — or to
-- accept and travel, or to decline and look unreliable. All three are
-- worse than being able to say where they are.
--
-- `vendor_availability` already has a row per partner per day and a
-- `note` field, but the note is documented as private to the partner and
-- nothing parses it. A place name in free text is not a place.
--
-- ── The geography column is derived, never written ──────────────────
-- PostgREST cannot write a geography, so a client that sets lat/lng
-- would leave `location` NULL and the day would silently never match.
-- The same trap `vendors` fell into twice and `venues` solved with a
-- trigger — copied here rather than invented.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.vendor_availability
  ADD COLUMN IF NOT EXISTS area_label TEXT,
  ADD COLUMN IF NOT EXISTS lat        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location   extensions.geography(Point,4326);

COMMENT ON COLUMN public.vendor_availability.area_label IS
  'Where the partner will be that day, in the name a person uses. Null means their usual base — the overwhelming majority of days, which is why this is nullable rather than defaulted.';

-- Lat and lng are the writable truth; location is computed from them.
CREATE OR REPLACE FUNCTION public.vendor_availability_point()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    NEW.location := NULL;
  ELSE
    -- point_of carries the India bounding-box guard and the lng/lat swap
    -- check from 057. Not reimplemented: a second copy of that guard is
    -- a second place for a partner to end up in the Bay of Bengal.
    NEW.location := public.point_of(NEW.lat, NEW.lng);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vendor_availability_point ON public.vendor_availability;
CREATE TRIGGER vendor_availability_point
  BEFORE INSERT OR UPDATE OF lat, lng ON public.vendor_availability
  FOR EACH ROW EXECUTE FUNCTION public.vendor_availability_point();

CREATE INDEX IF NOT EXISTS vendor_availability_where
  ON public.vendor_availability USING GIST (location)
  WHERE location IS NOT NULL;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS DELIBERATELY DOES NOT DO
-- ══════════════════════════════════════════════════════════════════════
--
-- It does not change `match_partners`. Dispatch still measures every job
-- from `vendors.location`, so a day with a location set is captured and
-- not yet acted on.
--
-- That is on purpose. `match_partners` has been redefined four times and
-- migration 101 rebased it on 060 rather than 086, which put
-- `v.service_radius_km` back as a hard filter and returned the ordering
-- to rating-first — both things 086 removed deliberately, and neither
-- change was announced. Teaching that function about a second location
-- before settling which version is intended would compound a regression
-- nobody has looked at yet.
--
-- So: capture now, dispatch in its own migration, once the 101/086
-- question has an answer.
--
-- ── Check it ────────────────────────────────────────────────────────
--   SELECT slot_date, status, area_label, lat, lng,
--          ST_AsText(location::geometry) AS point
--     FROM public.vendor_availability
--    WHERE area_label IS NOT NULL
--    ORDER BY slot_date;
