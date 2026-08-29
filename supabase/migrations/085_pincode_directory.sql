-- ══════════════════════════════════════════════════════════════════════
-- 085 · The pincode directory, and the difference between KNOWN and SERVED
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057 and 070 first.
--
-- Serviceability currently lives in a JavaScript file. `src/config/
-- generatedPincodes.js` carries 88 hand-mapped Bengaluru pincodes, and
-- `lib/eventLocation.js` decides whether we serve an address by asking
-- whether the pincode is IN THAT FILE.
--
-- Two things follow, and both are now blocking.
--
--   1. Opening a new area is a code change, a rebuild and a Play Store
--      release. The file is compiled into the bundle — it ships inside
--      the APK (android/app/src/main/assets/public/assets/). Turning on
--      Whitefield should be a row update, not a deployment.
--
--   2. A pincode we do not serve is INDISTINGUISHABLE from a pincode
--      that does not exist. Both return null. So the customer in Hubli
--      and the customer who fat-fingered six digits get the same
--      sentence, and we learn nothing from either.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THE WHOLE COUNTRY GOES IN, AND ONLY BENGALURU TURNS ON
-- ══════════════════════════════════════════════════════════════════════
--
-- All 19,238 Indian pincodes are loaded. Not because we serve them —
-- because "we have not reached Indore yet" is a different and far more
-- useful answer than "that is not a pincode", and because
-- `components/admin/AreaDemand.jsx` was built to count demand at exactly
-- this grain: "a six-digit pincode is the finest grain a delivery
-- address reliably carries".
--
-- A customer outside the pilot who leaves their pincode is the expansion
-- plan writing itself. Refusing them flat throws that away.
--
-- So the table holds the country and `is_active` holds the business.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE CONSTRAINT THAT MATTERS MOST HERE
-- ══════════════════════════════════════════════════════════════════════
--
--     CHECK (NOT is_active OR location IS NOT NULL)
--
-- A pincode cannot be switched on without a coordinate. This is not
-- bookkeeping — it is the guard against the failure that killed the
-- obvious data source.
--
-- The free GeoNames postal dump (download.geonames.org/export/zip/IN.zip)
-- is the natural place to get coordinates, and it is unusable here. It
-- puts 98 of Bengaluru's 109 pincodes on ONE identical point, 13.2257 N
-- 77.575 E, about thirty kilometres north of the city. Their own readme
-- says lat/lng is "determined with an algorithm" and falls back to "an
-- average lat/lng of neighbouring postal codes".
--
-- Such a point passes every check migration 070 makes. It is inside
-- India, it is not a swapped pair, it stores and indexes cleanly — and
-- every dispatch from Koramangala then measures from a field near
-- Doddaballapur and matches nobody. That is the silent-failure shape 070
-- was written about: the symptom points away from the cause.
--
-- Coordinates therefore come from OpenStreetMap postal-code boundary
-- relations (ODbL, storable with attribution), verified per pincode by
-- `scripts/activate-pincodes.mjs`, which refuses to write a point that
-- lands outside the bounding box of the district it claims. An
-- unverified pincode stays inactive rather than becoming a plausible
-- wrong answer.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- The table
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pincodes (
  pincode      TEXT PRIMARY KEY CHECK (pincode ~ '^[1-9][0-9]{5}$'),

  -- What a human calls this place. The post office name with its
  -- S.O/B.O/H.O suffix stripped — "Koramangala VIII Block S.O" is not a
  -- thing anybody says out loud.
  area         TEXT NOT NULL,
  taluk        TEXT,
  district     TEXT,
  state        TEXT,

  -- The centroid the radius search measures from. NULL is the honest
  -- state for a pincode nobody has verified, and the CHECK below makes
  -- it un-activatable rather than merely unlocated.
  location     extensions.geography(Point, 4326),

  -- ── The business switch ──────────────────────────────────────────
  -- Toggling this opens or closes an area. No deploy, no release.
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ,

  -- Where the row came from, so a bad import can be found and undone
  -- without guessing which rows it touched.
  source       TEXT,
  geo_source   TEXT,

  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Cannot serve what we cannot locate. See the header.
  CONSTRAINT pincode_active_needs_point CHECK (NOT is_active OR location IS NOT NULL)
);

COMMENT ON TABLE public.pincodes IS
  'Every Indian pincode. is_active is the serviceability switch — the whole country is KNOWN, the pilot is SERVED.';
COMMENT ON COLUMN public.pincodes.location IS
  'Locality centroid, good to ~2km. Enough for a radius match, not enough to navigate to. Never from GeoNames — see migration 085 header.';

-- The two queries this table exists to answer.
CREATE INDEX IF NOT EXISTS idx_pincodes_active
  ON public.pincodes (pincode) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_pincodes_location
  ON public.pincodes USING GIST (location) WHERE is_active;

-- Area search, case- and position-insensitive, so "kora" finds
-- Koramangala. pg_trgm ships with Supabase in `extensions`.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_pincodes_area_trgm
  ON public.pincodes USING GIN (lower(area) extensions.gin_trgm_ops) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_pincodes_district
  ON public.pincodes (lower(district));

-- ══════════════════════════════════════════════════════════════════════
-- RLS: the active list is public, the rest is not
-- ══════════════════════════════════════════════════════════════════════
--
-- Where we operate is on the website. Where we are ABOUT to operate is
-- not — the full table with its activation timestamps is a competitor's
-- expansion map, and it costs nothing to keep it behind the RPCs below.
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads served pincodes" ON public.pincodes;
CREATE POLICY "Anyone reads served pincodes"
  ON public.pincodes FOR SELECT
  USING (is_active);

DROP POLICY IF EXISTS "Admins read the whole directory" ON public.pincodes;
CREATE POLICY "Admins read the whole directory"
  ON public.pincodes FOR SELECT
  USING (get_my_role() IN ('admin', 'event_coordinator'));

-- ══════════════════════════════════════════════════════════════════════
-- lookup_pincode — the one function the booking flow calls
-- ══════════════════════════════════════════════════════════════════════
--
-- Returns THREE outcomes, not two, because they need three different
-- sentences on screen:
--
--   served      dispatch can run — here is the point
--   not_served  a real place, we have not reached it — capture it
--   unknown     six digits that are not a pincode — it is a typo
--
-- The old code could only say "no". Telling somebody in Jayanagar that
-- their pincode does not exist is a different kind of wrong from telling
-- them we are not there yet, and only one of those is true.
--
-- SECURITY DEFINER so it can see inactive rows to tell them apart, while
-- returning only the columns above — never the activation timestamp.
--
-- anon can call it: the booking flow asks WHERE before it asks who, and
-- that ordering is deliberate (WhereStep's header: telling somebody
-- "not in our area" after they have built a basket is the worst possible
-- moment to say it).
CREATE OR REPLACE FUNCTION public.lookup_pincode(p_pincode TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'pincode',  p.pincode,
       'area',     p.area,
       'district', p.district,
       'state',    p.state,
       'status',   CASE WHEN p.is_active THEN 'served' ELSE 'not_served' END,
       'lat',      CASE WHEN p.is_active THEN ST_Y(p.location::geometry) END,
       'lng',      CASE WHEN p.is_active THEN ST_X(p.location::geometry) END)
     FROM pincodes p
     WHERE p.pincode = p_pincode),
    jsonb_build_object('pincode', p_pincode, 'status', 'unknown'));
$fn$;

-- ══════════════════════════════════════════════════════════════════════
-- search_areas — one box that takes a name OR six digits
-- ══════════════════════════════════════════════════════════════════════
--
-- Porter and Swiggy both make the customer know which field they are in:
-- a place search here, a pincode box there. Nobody thinks that way about
-- their own address. They think "HSR" or they think "560102" and either
-- should work in the same box.
--
-- Digits match on prefix, letters on substring. Active rows only — an
-- autocomplete that suggests a place we cannot serve is the nonsense
-- option failure: it reads as an app that does not know what it sells.
CREATE OR REPLACE FUNCTION public.search_areas(p_query TEXT, p_limit INT DEFAULT 8)
RETURNS TABLE (pincode TEXT, area TEXT, district TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
  WITH q AS (SELECT btrim(COALESCE(p_query, '')) AS raw)
  SELECT p.pincode, p.area, p.district,
         ST_Y(p.location::geometry), ST_X(p.location::geometry)
    FROM pincodes p, q
   WHERE p.is_active
     AND length(q.raw) >= 2
     AND (
       CASE WHEN q.raw ~ '^[0-9]+$'
            THEN p.pincode LIKE q.raw || '%'
            ELSE lower(p.area) LIKE '%' || lower(q.raw) || '%'
              OR lower(COALESCE(p.taluk, '')) LIKE '%' || lower(q.raw) || '%'
       END
     )
   ORDER BY
     -- A prefix match is what the customer meant; a mid-string match is
     -- the system being helpful. Rank them in that order.
     (lower(p.area) LIKE lower(q.raw) || '%') DESC,
     length(p.area),
     p.pincode
   LIMIT GREATEST(LEAST(p_limit, 20), 1);
$fn$;

-- ══════════════════════════════════════════════════════════════════════
-- nearest_served_pincode — GPS, resolved against our own data
-- ══════════════════════════════════════════════════════════════════════
--
-- "Use my current location" needs a coordinate turned into an area.
-- The obvious way is a reverse-geocoding API, and it is the wrong way
-- three times over: it puts a third party on the critical path of the
-- booking flow, it sends a customer's exact GPS position to that third
-- party, and it is rate-limited precisely when a Saturday goes well.
--
-- We already hold a verified centroid for every served pincode. The
-- nearest one IS the answer, computed on a GIST index in under a
-- millisecond, with nothing leaving the database.
--
-- The 25 km guard is the difference between "you are in Bengaluru" and
-- "you are in Chennai and the nearest thing we serve is 300 km away" —
-- without it, every customer in India resolves to some Bengaluru
-- pincode and dispatch runs against a point they never chose.
CREATE OR REPLACE FUNCTION public.nearest_served_pincode(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_point extensions.geography;
  v_row   RECORD;
BEGIN
  -- Reuses the India bounding box from migration 070, so a swapped
  -- lat/lng pair is rejected here exactly as it is everywhere else.
  v_point := public.point_of(p_lat, p_lng);
  IF v_point IS NULL THEN
    RETURN jsonb_build_object('status', 'off_map');
  END IF;

  SELECT p.pincode, p.area, p.district,
         ST_Y(p.location::geometry) AS lat,
         ST_X(p.location::geometry) AS lng,
         ST_Distance(p.location, v_point)::INT AS distance_m
    INTO v_row
    FROM pincodes p
   WHERE p.is_active
   ORDER BY p.location OPERATOR(extensions.<->) v_point
   LIMIT 1;

  IF v_row IS NULL OR v_row.distance_m > 25000 THEN
    RETURN jsonb_build_object('status', 'not_served');
  END IF;

  RETURN jsonb_build_object(
    'status', 'served',
    'pincode', v_row.pincode, 'area', v_row.area, 'district', v_row.district,
    'lat', v_row.lat, 'lng', v_row.lng, 'distanceM', v_row.distance_m);
END;
$fn$;

-- ══════════════════════════════════════════════════════════════════════
-- Writing: service_role only, and one way in
-- ══════════════════════════════════════════════════════════════════════
--
-- PostgREST cannot write a `geography` column — the same fact migration
-- 070 turned to advantage for vendors. So the loader goes through this,
-- which means every coordinate in this table passes `point_of()` and
-- therefore the India box. There is no second path, because there is no
-- second path at all.
CREATE OR REPLACE FUNCTION public.upsert_pincode(
  p_pincode  TEXT,
  p_area     TEXT,
  p_taluk    TEXT,
  p_district TEXT,
  p_state    TEXT,
  p_source   TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  IF p_pincode !~ '^[1-9][0-9]{5}$' THEN
    RETURN FALSE;
  END IF;

  INSERT INTO pincodes (pincode, area, taluk, district, state, source, updated_at)
  VALUES (p_pincode,
          COALESCE(NULLIF(btrim(COALESCE(p_area, '')), ''), p_pincode),
          NULLIF(btrim(COALESCE(p_taluk, '')), ''),
          NULLIF(btrim(COALESCE(p_district, '')), ''),
          NULLIF(btrim(COALESCE(p_state, '')), ''),
          p_source, now())
  ON CONFLICT (pincode) DO UPDATE
    SET area     = EXCLUDED.area,
        taluk    = COALESCE(EXCLUDED.taluk, pincodes.taluk),
        district = COALESCE(EXCLUDED.district, pincodes.district),
        state    = COALESCE(EXCLUDED.state, pincodes.state),
        source   = COALESCE(EXCLUDED.source, pincodes.source),
        updated_at = now();

  RETURN TRUE;
END;
$fn$;

-- Set the point and open the area in one call, so a pincode is never
-- momentarily active with a stale coordinate.
CREATE OR REPLACE FUNCTION public.set_pincode_point(
  p_pincode    TEXT,
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_geo_source TEXT DEFAULT NULL,
  p_activate   BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_point extensions.geography;
BEGIN
  v_point := public.point_of(p_lat, p_lng);

  IF v_point IS NULL THEN
    -- Deliberately NOT an exception: a 19,000-row geocoding run must not
    -- abort because one lookup came back with a swapped pair.
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range',
                              'pincode', p_pincode, 'lat', p_lat, 'lng', p_lng);
  END IF;

  UPDATE pincodes
     SET location     = v_point,
         geo_source   = COALESCE(p_geo_source, geo_source),
         is_active    = is_active OR p_activate,
         activated_at = CASE WHEN p_activate AND activated_at IS NULL
                             THEN now() ELSE activated_at END,
         updated_at   = now()
   WHERE pincode = p_pincode;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_pincode', 'pincode', p_pincode);
  END IF;

  RETURN jsonb_build_object('ok', true, 'pincode', p_pincode, 'activated', p_activate);
END;
$fn$;

-- Close an area. Separate from `set_pincode_point` because turning
-- somewhere OFF is a decision somebody should have to type on purpose.
CREATE OR REPLACE FUNCTION public.deactivate_pincodes(p_pincodes TEXT[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_n INT;
BEGIN
  UPDATE pincodes SET is_active = FALSE, updated_at = now()
   WHERE pincode = ANY(p_pincodes) AND is_active;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$fn$;

-- ══════════════════════════════════════════════════════════════════════
-- Grants
-- ══════════════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION public.lookup_pincode(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pincode(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_areas(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_areas(TEXT, INT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.nearest_served_pincode(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearest_served_pincode(DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_pincode(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_pincode(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.set_pincode_point(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_pincode_point(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.deactivate_pincodes(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_pincodes(TEXT[]) TO service_role;

COMMIT;
