-- ══════════════════════════════════════════════════════════════════════
-- 097 · The seed could not write a single row
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 094 first.
-- Re-runnable.
--
-- ── What happened ───────────────────────────────────────────────────
--
-- 094 guarded `osm_id` with a PARTIAL unique index:
--
--   CREATE UNIQUE INDEX uq_venues_osm ON venues (osm_id)
--     WHERE osm_id IS NOT NULL;
--
-- and the seeder upserts with ON CONFLICT (osm_id). Postgres will not
-- infer a partial index from a bare column list -- the predicate has to
-- be restated in the statement, and PostgREST has no way to send one. So
-- every chunk came back with:
--
--   there is no unique or exclusion constraint matching the
--   ON CONFLICT specification
--
-- 273 venues fetched, parsed, classified and skipped. The script reported
-- it, which is the only reason this was a five-minute problem rather than
-- a silently empty venue table.
--
-- ── Why it was partial, and why that reasoning was wrong ────────────
--
-- The comment in 094 said a plain UNIQUE "would allow exactly one" row
-- with a NULL osm_id, so partner-added venues would collide with each
-- other. That is simply not how Postgres works: NULL is not equal to
-- NULL, so a UNIQUE constraint permits any number of NULLs. The partial
-- predicate was defending against a problem that does not exist, and in
-- doing so broke the one operation the index was created to support.
--
-- A real constraint, not an index, because ON CONFLICT infers from
-- constraints cleanly and this is a rule about the data rather than a
-- performance decision.

BEGIN;

-- The index and a same-named constraint cannot coexist, and which of the
-- two exists depends on whether 094 or an earlier run of this file went
-- first. Drop both spellings before creating.
DROP INDEX IF EXISTS public.uq_venues_osm;
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS uq_venues_osm;

ALTER TABLE public.venues
  ADD CONSTRAINT uq_venues_osm UNIQUE (osm_id);

COMMENT ON CONSTRAINT uq_venues_osm ON public.venues IS
  'Re-running the OSM seed must not duplicate Bengaluru. NOT partial: ON CONFLICT cannot infer a partial index, and NULLs are distinct anyway, so every partner-added venue is unaffected.';

COMMIT;
