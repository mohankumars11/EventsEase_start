-- ============================================================
-- 070 · point_of() — reject a swapped coordinate, not just an impossible one
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057 FIRST.
-- Small, safe, and re-runnable: one CREATE OR REPLACE, no data touched.
--
-- ── What 057 got right, and what it could not catch ──────────────────
-- 057 introduced `point_of(lat, lng)` so no caller has to write
-- `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` by hand — because PostGIS
-- takes LONGITUDE FIRST while every map API, every phone and every human
-- writes latitude first, and swapping them is the one mistake this
-- codebase was always going to make.
--
-- It guarded with a range check: latitude must be within ±90, longitude
-- within ±180. That catches the obvious case and misses the actual one.
--
--   Bengaluru is 12.9352 N, 77.6245 E.
--   Swap them and you get lat 77.6245, lng 12.9352.
--   77.6245 IS a valid latitude. It is somewhere in the Kara Sea.
--
-- So the swapped point stores cleanly, indexes cleanly, and queries
-- cleanly. It simply matches nothing near Koramangala — a dispatch that
-- silently finds no partners, which reads as a supply problem rather than
-- a coordinate that went in backwards. That is the worst shape a bug can
-- have here, because the symptom points away from the cause.
--
-- ── Why a bounding box is legitimate rather than a hack ──────────────
-- Sambramo operates in India. Not "mostly", not "for now, probably" — the
-- pilot cities are Bengaluru and Mysore (BRAND.pilotCities), the payment
-- rails are UPI and Razorpay, the tax model is GST and the market rates
-- come from Karnataka mandis. A coordinate outside India is not a
-- customer this platform can serve; it is a mistake.
--
-- The box is deliberately generous — the whole country including the
-- islands, not Karnataka — so expansion to Delhi or Mumbai needs no
-- migration. Narrowing it to the pilot cities would make this a
-- correctness check that breaks on the first good business news.
--
--   latitude   6.0 – 38.0   Indira Point to the northern tip of Kashmir
--   longitude 67.0 – 98.5   Gujarat coast to Arunachal
--
-- A swapped Bengaluru pair now fails on the longitude: 12.9352 is not
-- within 67–98.5, so it returns NULL and the caller stores nothing rather
-- than storing a point in the Arctic.
--
-- ── NULL rather than RAISE, still ───────────────────────────────────
-- Unchanged from 057, and for the same reason: `location` is nullable and
-- a partner without one is simply not dispatchable, which is the honest
-- state. An exception here would abort a whole vendor import because one
-- row had a bad pincode lookup.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.point_of(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS extensions.geography
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_lat IS NULL OR p_lng IS NULL THEN NULL
    -- Globally impossible.
    WHEN p_lat NOT BETWEEN -90 AND 90    THEN NULL
    WHEN p_lng NOT BETWEEN -180 AND 180  THEN NULL
    -- Possible somewhere, but not somewhere this business operates —
    -- which for a lat/lng pair is overwhelmingly a swap.
    WHEN p_lat NOT BETWEEN 6.0 AND 38.0  THEN NULL
    WHEN p_lng NOT BETWEEN 67.0 AND 98.5 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
  END
$$;

COMMENT ON FUNCTION public.point_of IS
  'Latitude first, as humans write it. Returns NULL outside India — a lat/lng pair outside the country is a swap, not a customer.';

-- ══════════════════════════════════════════════════════════════════════
-- set_vendor_location — the only way a partner's coordinate is written
-- ══════════════════════════════════════════════════════════════════════
--
-- PostgREST cannot write a `geography` column: there is no JSON
-- representation it will accept, so an UPDATE from the client or from a
-- seed script simply cannot set `vendors.location`. Something server-side
-- has to do it, and this is that thing.
--
-- Which is a happy constraint rather than an obstacle. It means EVERY
-- coordinate in this database goes through `point_of()` above, and
-- therefore through the India bounding box — there is no second path
-- that skips the validation, because there is no second path at all.
--
-- Returns the resolved status rather than void, so a caller learns that
-- a coordinate was REJECTED instead of assuming a silent success. A seed
-- script that writes 221 partners and quietly locates none of them would
-- otherwise report success and produce a network that matches nothing.
CREATE OR REPLACE FUNCTION public.set_vendor_location(
  p_vendor_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_point extensions.geography;
  v_owner UUID;
BEGIN
  IF get_my_role() NOT IN ('admin','event_coordinator') THEN
    -- A partner may set their OWN location and nobody else's.
    SELECT profile_id INTO v_owner FROM vendors WHERE id = p_vendor_id;
    IF v_owner IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
    END IF;
  END IF;

  v_point := public.point_of(p_lat, p_lng);

  IF v_point IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'out_of_range',
      'detail', 'Coordinate is outside India — check whether latitude and longitude are the right way round.');
  END IF;

  UPDATE vendors SET location = v_point WHERE id = p_vendor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_vendor_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vendor_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;

COMMIT;
