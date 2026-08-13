-- ============================================================
-- Migration 043: what gets booked with what.
--
-- The concierge-side twin of migration 042. 042 answers "which products end up
-- in the same basket"; this answers "which services end up in the same
-- celebration". Independent of 037–042 — it reads `service_enquiries` and
-- writes nothing, so it can be applied at any point in any order.
--
-- ── What this is for ────────────────────────────────────────────────────
-- The builder's service step (src/lib/serviceRecommend.js) ranks what to
-- suggest next. Like the shop's ranker it is a hybrid: a hand-authored
-- complement graph carries it while there is no booking history, and this
-- measured signal takes over as enquiries accumulate. Same shrinkage,
-- n/(n+K), so the handover needs no flag and no retraining job.
--
-- The app does NOT wait for this migration. `useServiceRecommendations` calls
-- it, treats any error as an empty result, and the evidence weight then
-- evaluates to zero — every suggestion comes from the prior, exactly as it
-- does on a database with no enquiries in it. Nothing crashes; the
-- suggestions are simply assumed rather than observed.
--
-- ── Why an enquiry counts and an unpaid order does not ──────────────────
-- 042 counts only `payment_status = 'paid'`, because an abandoned basket is
-- not evidence of anything. The equivalent line here is drawn differently, and
-- deliberately: there is no payment on this side of the business at all. A
-- celebration enquiry is submitted by a person who typed a real phone number
-- and asked to be called back about a specific list of services. That is a
-- considered statement of intent at the moment it is made, and it stays
-- evidence even if the coordinator later loses the job on price. So every
-- status counts — 'open', 'responded' and 'closed' alike. A closed enquiry
-- means we did not win it, not that the customer never wanted a photographer
-- and a dhol player at the same wedding.
--
-- ── The one thing that would poison this, and the guard against it ──────
-- The builder pre-ticks `tier.includedServices` the moment a tier is chosen.
-- A customer who never opens the service step still submits that list. If
-- those rows were counted, the recommender would learn its own suggestions
-- back — it would "discover" that photography goes with videography for the
-- excellent reason that we ticked both, and every measurement would confirm
-- the prior it was supposed to correct. That is the standard feedback loop
-- that makes a recommender look like it is working while it learns nothing.
--
-- So the builder now stamps each service line with `details.picked_by`:
-- 'tier' when it is our default sitting untouched, 'customer' when a human
-- has been through the list. Only 'customer' lines are counted below.
--
-- Rows written before that stamp existed have no key at all, and those are
-- counted (the COALESCE defaults to 'customer'). They pre-date the pre-ticking
-- question entirely and dropping them would throw away the only history there
-- is; they are the smaller and older half, and they wash out as real ones
-- arrive.
--
-- ── The privacy floor, which is also the statistics floor ───────────────
-- `HAVING count(DISTINCT ...) >= 2`, for both reasons 042 gives at length.
-- This function is executable by `anon`; a pair appearing in exactly one
-- enquiry IS one identifiable family's celebration plan, and a pair seen once
-- is statistically indistinguishable from coincidence. MIN_PAIR_SUPPORT in
-- src/lib/serviceRecommend.js enforces the same floor client-side, duplicated
-- on purpose so weakening one does not silently weaken the other.
--
-- ── Why the pairs are not conditioned on occasion ───────────────────────
-- "People planning a wedding also booked X" is a stronger claim than "people
-- also booked X", and it is the obvious next version of this function. It is
-- not this version, because conditioning the pairs means conditioning the
-- marginals too — lift needs P(b | occasion), not P(b) — and that splits an
-- already-thin table roughly eighteen ways. The occasion signal is not lost
-- meanwhile: it is the strongest term in the content prior, where
-- OCCASION_ESSENTIALS knows a wedding needs a priest and a birthday does not.
-- Revisit once a single occasion clears a few hundred enquiries on its own.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- Unordered pairs, returned in both directions — the ranker looks a service up
-- as the seed, so emitting each pair twice saves every caller from normalising
-- the order itself. `a_enquiries`/`b_enquiries` are the marginals, which is
-- what turns a co-occurrence count into lift rather than a popularity contest:
-- a priest appears in a great many plans, and without the marginal he would be
-- recommended beside everything.
CREATE OR REPLACE FUNCTION get_service_cobooking_counts()
RETURNS TABLE (
  service_a       TEXT,
  service_b       TEXT,
  pair_enquiries  BIGINT,
  a_enquiries     BIGINT,
  b_enquiries     BIGINT,
  total_enquiries BIGINT
)
LANGUAGE sql
SECURITY DEFINER
-- Pinned so a caller's search_path cannot resolve `service_enquiries` to a
-- table they control. Standard hygiene for SECURITY DEFINER, and it matters
-- more here because this one is granted to anon.
SET search_path = public
AS $$
  WITH chosen AS (
    -- One row per (enquiry, service the customer actually chose).
    --
    -- DISTINCT because a plan can legitimately carry the same service id twice
    -- — two décor lines at different levels — and that is one booking of that
    -- service, not two. Counting it twice would inflate its marginal and drag
    -- its lift below 1 against everything.
    SELECT DISTINCT
      e.id                AS enquiry_id,
      s->>'id'            AS service_id
    FROM service_enquiries e
    CROSS JOIN LATERAL jsonb_array_elements(e.services) s
    WHERE jsonb_typeof(e.services) = 'array'      -- defensive: the column is
                                                  -- JSONB, not JSONB[]; a bad
                                                  -- write would error the whole
                                                  -- function rather than skip
      AND s->>'id' IS NOT NULL
      AND s->>'id' <> ''
      -- The feedback-loop guard. See the header.
      AND COALESCE(s->'details'->>'picked_by', 'customer') = 'customer'
  ),
  -- How many enquiries contain each service at all. The denominator of P(b).
  marginals AS (
    SELECT service_id, count(*)::BIGINT AS n
    FROM chosen
    GROUP BY service_id
  ),
  -- Every plan that contributed a choice. The denominator of the base rate.
  -- Counted over `chosen` rather than over the table so it matches the
  -- population the marginals were computed on; using the table total would
  -- deflate every base rate by the all-defaults enquiries excluded above and
  -- inflate every lift with it.
  plan_total AS (
    SELECT count(DISTINCT enquiry_id)::BIGINT AS n FROM chosen
  ),
  -- `<>` rather than `<` so both directions come back. A plan containing one
  -- service self-joins to nothing, which is correct: a single-service plan
  -- carries no pairing information.
  pairs AS (
    SELECT
      x.service_id AS a,
      y.service_id AS b,
      count(DISTINCT x.enquiry_id)::BIGINT AS n
    FROM chosen x
    JOIN chosen y ON y.enquiry_id = x.enquiry_id AND y.service_id <> x.service_id
    GROUP BY x.service_id, y.service_id
    HAVING count(DISTINCT x.enquiry_id) >= 2       -- the floor; see the header
  )
  SELECT p.a, p.b, p.n, ma.n, mb.n, pt.n
  FROM pairs p
  JOIN marginals ma ON ma.service_id = p.a
  JOIN marginals mb ON mb.service_id = p.b
  CROSS JOIN plan_total pt
  ORDER BY p.n DESC;
$$;

-- No LIMIT, unlike 042. That cap exists because the product catalogue is
-- open-ended and its pair space grows with it. The service catalogue is a
-- fixed list of about thirty ids in src/data/servicePricing.js, so this
-- function cannot return more than ~870 rows however many enquiries arrive —
-- a bounded payload by construction rather than by truncation.

GRANT EXECUTE ON FUNCTION get_service_cobooking_counts TO anon, authenticated;

-- No index. The function unnests every enquiry's `services` array, so it is a
-- sequential scan by nature and no index on `service_enquiries` would be used
-- by it. Adding a GIN index on the JSONB to look busy would cost write time on
-- the enquiry insert — the one path in this app that must never get slower —
-- and buy nothing. Revisit if this table ever reaches a scale where the scan
-- shows up, at which point the answer is a materialised view refreshed
-- nightly, not an index.

COMMIT;

-- ── Check it landed ─────────────────────────────────────────────────────
-- Run separately, after the COMMIT above.
--
-- An empty result is the CORRECT result until two customers have been through
-- the service step and picked an overlapping pair. It is not a failed
-- migration, and the builder is unaffected either way — the suggestions fall
-- back to the content prior.
--
--   SELECT count(*) AS pairs_learned FROM get_service_cobooking_counts();
--
--   SELECT
--     service_a AS booked,
--     service_b AS with_it,
--     pair_enquiries,
--     round((pair_enquiries::numeric / a_enquiries) /
--           (b_enquiries::numeric / total_enquiries), 2) AS lift
--   FROM get_service_cobooking_counts()
--   ORDER BY lift DESC
--   LIMIT 20;
--
-- To see how much of the table is currently excluded as our own defaults —
-- if this ratio stays near 1.0, customers are not opening the service step
-- and that is a UX finding, not a data problem:
--
--   SELECT
--     count(*) FILTER (WHERE s->'details'->>'picked_by' = 'customer') AS customer_picked,
--     count(*) FILTER (WHERE s->'details'->>'picked_by' = 'tier')     AS tier_default,
--     count(*) FILTER (WHERE s->'details'->>'picked_by' IS NULL)      AS unstamped
--   FROM service_enquiries e
--   CROSS JOIN LATERAL jsonb_array_elements(e.services) s;
