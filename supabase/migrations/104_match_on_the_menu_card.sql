-- ══════════════════════════════════════════════════════════════════════
-- 104 · Match the caterer who can actually cook the card
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
-- Depends on 098 (specs JSONB + GIN) and 101 (review_status).
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT match_partners COULD NOT ASK
-- ══════════════════════════════════════════════════════════════════════
--
-- It matches on trade, distance, availability, rating and review status.
-- Every one of those is about the BUSINESS. None of them is about the
-- food, so a customer who built a Chettinad menu card and a caterer who
-- cooks only Udupi were a match as long as both said "Catering & Food"
-- and the distance worked.
--
-- The customer then discovered the mismatch on a phone call, or worse,
-- did not. That is the coordinator call this platform exists to remove.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THIS IS A SEPARATE FUNCTION AND NOT A NEW ARGUMENT
-- ══════════════════════════════════════════════════════════════════════
--
-- match_partners has seven parameters and eleven call sites. Adding an
-- eighth with a default would silently change the behaviour of every one
-- of them the day somebody passed it, and PostgREST resolves overloads
-- by argument NAMES — a caller that spells one wrong gets a different
-- function with no error.
--
-- So: match_partners keeps doing exactly what it does, and this wraps it.
-- A caller that cares about the food asks this one. Dispatch for every
-- other trade is untouched.
--
-- ══════════════════════════════════════════════════════════════════════
-- COVERAGE, NOT A SUPERSET TEST
-- ══════════════════════════════════════════════════════════════════════
--
-- "Cooks every dish on the card" is the right question and the wrong
-- filter. A caterer who cooks 15 of 16 can do the wedding; a card with
-- one unusual sweet would return nobody at all, and an empty result
-- reads as "no caterers in Bengaluru" rather than "one dish is the
-- problem".
--
-- So this returns a RATIO and the dishes that are missing, and lets the
-- caller decide. p_min_ratio defaults to 1.0 — nothing is loosened by
-- accident, and a caller that wants near misses has to say so.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE DIET RULE IS NOT PART OF THE RATIO
-- ══════════════════════════════════════════════════════════════════════
--
-- A pure-veg kitchen is never returned for a card carrying meat, at any
-- coverage. It is a hard exclusion rather than a low score, because no
-- percentage should ever be able to outrank it. The same rule is in
-- lib/menuMatch.js and the two must not drift — see the note at the end.

BEGIN;

-- ── Which dish ids has this vendor claimed, across all their rows ────
-- A caterer can hold several vendor_services rows; the dishes they cook
-- is the union, not whichever row happened to be read first.
CREATE OR REPLACE FUNCTION public.vendor_dish_ids(p_vendor UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT d), '{}')
  FROM vendor_services s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(s.specs -> 'dish_ids') = 'array'
         THEN s.specs -> 'dish_ids'
         ELSE '[]'::jsonb END) AS d
  WHERE s.vendor_id = p_vendor
    AND s.is_active = TRUE
    AND s.review_status = 'live';
$$;

COMMENT ON FUNCTION public.vendor_dish_ids IS
  'Every SBM- dish id this vendor claims, unioned across their live rows. Empty array when they have claimed none — which is not the same as cooking nothing, only as not having said.';

-- ── The matching itself ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_partners_for_menu(
  p_trade       TEXT,
  p_point       extensions.geography,
  p_radius_m    INTEGER,
  p_date        DATE,
  p_dish_ids    TEXT[],
  p_veg_only    BOOLEAN DEFAULT FALSE,
  p_min_ratio   NUMERIC DEFAULT 1.0,
  p_allow_synthetic BOOLEAN DEFAULT FALSE,
  p_limit       INTEGER DEFAULT 5,
  p_exclude     UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  vendor_id     UUID,
  distance_m    INTEGER,
  rating        NUMERIC,
  covered       INTEGER,
  wanted        INTEGER,
  ratio         NUMERIC,
  missing       TEXT[]
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  WITH base AS (
    -- Everything 101 already decides: trade, distance, availability,
    -- rating, review status. Not restated here, so the two can never
    -- disagree about who is dispatchable.
    SELECT m.vendor_id, m.distance_m, m.rating
    FROM public.match_partners(
      p_trade, p_point, p_radius_m, p_date,
      p_allow_synthetic,
      -- A wide net BEFORE the food filter. Taking the top 5 by rating and
      -- then asking which cook the card would throw away the caterer who
      -- cooks all sixteen dishes and is rated sixth.
      GREATEST(p_limit * 20, 100),
      p_exclude) m
  ),
  scored AS (
    SELECT
      b.vendor_id, b.distance_m, b.rating,
      public.vendor_dish_ids(b.vendor_id) AS claimed
    FROM base b
  )
  SELECT
    s.vendor_id,
    s.distance_m,
    s.rating,
    cardinality(ARRAY(SELECT unnest(p_dish_ids) INTERSECT SELECT unnest(s.claimed)))::INTEGER,
    cardinality(p_dish_ids)::INTEGER,
    CASE WHEN cardinality(p_dish_ids) = 0 THEN 1.0
         ELSE ROUND(
           cardinality(ARRAY(SELECT unnest(p_dish_ids) INTERSECT SELECT unnest(s.claimed)))::NUMERIC
           / cardinality(p_dish_ids), 3)
    END,
    ARRAY(SELECT unnest(p_dish_ids) EXCEPT SELECT unnest(s.claimed))
  FROM scored s
  WHERE
    -- ── The diet rule, and it is absolute ──────────────────────────
    -- A veg-only card must never reach a kitchen that is not veg-only,
    -- and no coverage figure can overrule it.
    (NOT p_veg_only OR EXISTS (
      SELECT 1 FROM vendor_services vs
      WHERE vs.vendor_id = s.vendor_id
        AND vs.is_active = TRUE
        AND vs.review_status = 'live'
        AND vs.specs ->> 'kitchen_type' = 'pure_veg'
    ))
    AND (
      cardinality(p_dish_ids) = 0
      OR cardinality(ARRAY(SELECT unnest(p_dish_ids) INTERSECT SELECT unnest(s.claimed)))::NUMERIC
         / cardinality(p_dish_ids) >= p_min_ratio
    )
  ORDER BY 6 DESC, s.rating DESC, s.distance_m ASC
  LIMIT GREATEST(p_limit, 1);
$$;

COMMENT ON FUNCTION public.match_partners_for_menu IS
  'match_partners, then filtered by how much of a menu card the vendor actually cooks. p_min_ratio 1.0 means every dish. Returns the missing ids so a near miss can be explained rather than disappearing.';

-- The GIN index from 098 covers specs; this is the containment path.
CREATE INDEX IF NOT EXISTS idx_vendor_services_dish_ids
  ON public.vendor_services USING GIN ((specs -> 'dish_ids'))
  WHERE is_active = TRUE;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   -- nobody has claimed dishes yet, so this is empty and that is correct
--   SELECT * FROM public.match_partners_for_menu(
--     'Catering & Food',
--     ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography,
--     25000, CURRENT_DATE + 7,
--     ARRAY['SBM-KA-RA-131','SBM-KA-MC-129'],
--     FALSE, 1.0);
--
--   -- with p_min_ratio 0 it returns everyone dispatchable, each with the
--   -- dishes they are missing — the honest way to see why a card matches
--   -- nobody before blaming the radius
--   SELECT vendor_id, ratio, missing FROM public.match_partners_for_menu(
--     'Catering & Food',
--     ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography,
--     25000, CURRENT_DATE + 7,
--     ARRAY['SBM-KA-RA-131','SBM-KA-MC-129'],
--     FALSE, 0);
--
--   -- what one vendor claims
--   SELECT public.vendor_dish_ids('<vendor uuid>');
--
-- ══════════════════════════════════════════════════════════════════════
-- TWO COPIES OF ONE RULE
-- ══════════════════════════════════════════════════════════════════════
--
-- The diet exclusion is written here in SQL and in lib/menuMatch.js in
-- JavaScript, because dispatch runs in the database and the customer's
-- browser needs to show coverage before anything is dispatched.
--
-- That is a duplication and it is the dangerous kind: the two can drift
-- without either one failing. Whoever changes one must change the other,
-- and scripts/check-dish-registry.mjs asserts the JavaScript side so at
-- least half of it is held down by something other than memory.
