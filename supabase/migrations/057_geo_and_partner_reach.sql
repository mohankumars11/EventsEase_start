-- ============================================================
-- 057 · Geography — where a partner is, and how far they travel
--
-- APPLY BY HAND in Supabase → SQL Editor, BEFORE deploying code that
-- depends on it. `git push` does not run migrations.
-- Re-runnable: every CREATE POLICY is preceded by DROP POLICY IF EXISTS
-- (CREATE POLICY has no IF NOT EXISTS, and a half-applied run otherwise
-- strands every retry on 42710).
--
-- ── Why ──────────────────────────────────────────────────────────────
-- This is the gap that blocks the entire instant-booking bucket. After
-- 56 migrations there is not one latitude anywhere in this schema.
-- `vendors` knows `city` and `area` — two free-text columns — and that is
-- the whole of what the database understands about where anybody is.
--
-- Free text cannot answer the only question dispatch ever asks: "who can
-- reach Koramangala 5th Block on the 26th?" `area = 'Koramangala'` misses
-- the decorator in Ejipura who is nine hundred metres away, and matches
-- the one in Koramangala 8th Block who is four kilometres away and does
-- not travel. Both failures are invisible — the query returns rows, they
-- are simply the wrong rows.
--
-- ── Why PostGIS rather than storing two numeric columns ──────────────
-- Because the alternative is computing haversine in JavaScript, which
-- means SELECTing every partner in the city into a serverless function
-- and sorting them there. That is correct at 400 partners and a
-- catastrophe at 40,000 — it is a full table scan per booking, per line.
--
-- A GIST index over `geography(Point,4326)` makes `ST_DWithin` an index
-- lookup instead. The matching function in 060 is one round trip that
-- stays fast as the network grows, which is the entire reason the
-- matching lives in Postgres and not in `api/`.
--
-- `geography` rather than `geometry` deliberately: geography measures in
-- metres on a spheroid, so "within 5000" means five kilometres on the
-- ground. `geometry` in 4326 measures in DEGREES, and a radius expressed
-- in degrees is a different real distance in Bengaluru than in Delhi.
-- That bug does not announce itself; it just quietly mis-scopes every
-- search as the business moves north.
--
-- ── `is_synthetic` is a safety catch, not a test flag ────────────────
-- Milestone 1 seeds ~400 invented Bengaluru partners so the dispatch
-- engine can be measured before a single real partner signs. Those rows
-- live in the same table as real ones, and the failure mode — a real
-- customer paying real money to book "Ramesh Decorators", which does not
-- exist — is the single worst outcome this feature can produce.
--
-- So the flag is on the row, the matching function filters on it, and
-- `scripts/check-dispatch-invariants.mjs` asserts a production build
-- cannot dispatch to one. Three independent guards, because one of them
-- will eventually be forgotten.
-- ============================================================

BEGIN;

-- Supabase installs extensions into `extensions`, not `public`. Naming the
-- schema explicitly matters: functions later in this series declare
-- `SET search_path = public, extensions` and would not resolve the
-- geography type without it.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ── Where a partner is, and how far they will go ─────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location extensions.geography(Point,4326);

-- Nullable on purpose. Every existing partner row predates this column and
-- has no coordinate; a NOT NULL with a default would have to invent one,
-- and an invented coordinate is worse than a missing one because it
-- matches. A partner with no location is simply not dispatchable, which is
-- the honest state until somebody pins them.
COMMENT ON COLUMN vendors.location IS
  'Partner base. NULL = not dispatchable; match_partners() skips them.';

-- The radius is the PARTNER's, not the customer's. A customer asking for
-- someone within 10 km and a decorator who will not cross the Outer Ring
-- Road are two different constraints, and dispatch has to satisfy both.
-- 10 km is the default because it is roughly a Bengaluru sub-region and
-- the number a partner is most likely to accept without editing it.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 10;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_service_radius_sane;
ALTER TABLE vendors ADD CONSTRAINT vendors_service_radius_sane
  CHECK (service_radius_km BETWEEN 1 AND 100);

-- ── The seeded network, flagged at the row ───────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vendors.is_synthetic IS
  'Seeded test partner, not a real business. Never dispatchable in production.';

-- ── Where the celebration is ─────────────────────────────────────────
-- The customer's end of the same question. `customer_addresses` (049) has
-- line1/city/pincode and no coordinate, so "within 5 km of MY address"
-- was unanswerable from the address the customer already saved.
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS location extensions.geography(Point,4326);

-- ── Indexes ──────────────────────────────────────────────────────────
-- GIST, not btree. A btree on a geography column is accepted and is
-- useless: it can order points but cannot answer "within N metres of",
-- so every ST_DWithin would fall back to a sequential scan while the
-- query plan still showed an index on the column.
CREATE INDEX IF NOT EXISTS idx_vendors_location
  ON vendors USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_location
  ON customer_addresses USING GIST (location);

-- Dispatch always filters verified-and-real before it filters distance,
-- and both are cheap discriminators on a table that will be mostly
-- neither. Partial, so the index stays small as the synthetic network
-- grows.
CREATE INDEX IF NOT EXISTS idx_vendors_dispatchable
  ON vendors (city, is_verified)
  WHERE location IS NOT NULL AND is_verified = TRUE AND is_synthetic = FALSE;

-- ── Setting a location without writing PostGIS at every call site ────
-- `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` is easy to get
-- wrong in exactly one way, and it is always the same way: PostGIS takes
-- LONGITUDE FIRST, and every mapping API, every phone geolocation call
-- and every human writes latitude first. Swapping them puts Bengaluru in
-- Somalia, and the query still runs.
--
-- So no caller writes that expression. They call this, whose argument
-- names say which is which.
CREATE OR REPLACE FUNCTION public.point_of(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS extensions.geography
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_lat IS NULL OR p_lng IS NULL THEN NULL
    -- Reject the swap rather than storing it. Latitude is bounded at ±90;
    -- a "latitude" of 77.59 is Bengaluru's longitude and nothing else.
    WHEN p_lat NOT BETWEEN -90 AND 90   THEN NULL
    WHEN p_lng NOT BETWEEN -180 AND 180 THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
  END
$$;

COMMENT ON FUNCTION public.point_of IS
  'Latitude first, as humans write it. Returns NULL on out-of-range rather than storing a swapped point.';

COMMIT;
