-- ============================================================
-- Migration 042: what gets bought with what.
--
-- Independent of 037–041. It reads `order_items` and `orders` and writes
-- nothing, so it can be applied at any point in any order.
--
-- ── What this is for ────────────────────────────────────────────────────
-- The shop recommends products beside other products (src/lib/recommend.js).
-- That ranker is a hybrid: a hand-authored complement graph carries it while
-- the catalogue has no purchase history, and a measured co-purchase signal
-- takes over as orders accumulate. This function is the measured half.
--
-- The app does NOT wait for this migration. `useRecommendations` calls it,
-- treats any error as an empty result, and the ranker's evidence weight
-- n/(n+K) then evaluates to zero — so every rail renders from the content
-- prior alone, exactly as it does on a database with no orders in it. Nothing
-- crashes and nothing is missing; the recommendations are simply assumed
-- rather than observed. Applying this is what turns them into observations.
--
-- ── Why a SECURITY DEFINER function and not a view ──────────────────────
-- Same reason `get_product_order_counts` in migration 019 is one. RLS on
-- `order_items` scopes SELECT to the owning customer, so a plain view would
-- silently compute each customer's co-purchases *with themselves* — a
-- recommender trained on one basket, presented as if it were the shop's.
-- That is worse than no data, because it looks like data.
--
-- ── The privacy floor, which is also the statistics floor ───────────────
-- `HAVING count(DISTINCT o.id) >= 2` is doing two jobs at once and both are
-- load-bearing.
--
-- Privacy: this function is executable by `anon`. A pair that appears in
-- exactly one order IS one identifiable person's basket, and returning it
-- would let anybody with the anon key enumerate what individual customers
-- bought together. Requiring two distinct orders means no returned row can be
-- attributed to a single customer's purchase.
--
-- Statistics: a pair seen once is indistinguishable from coincidence. The
-- ranker computes lift from these counts, and lift on a single observation is
-- both enormous and meaningless — precisely the number most likely to put a
-- nonsense pairing at the top of a rail.
--
-- MIN_PAIR_SUPPORT in src/lib/recommend.js is the same floor, enforced again
-- client-side. Deliberately duplicated: the SQL protects the data, the JS
-- protects the ranking, and either one being changed alone should not silently
-- weaken the other.
--
-- ── Only paid orders count ──────────────────────────────────────────────
-- `payment_status = 'paid'`, not merely placed. Direct UPI has no gateway
-- callback (see PROJECT_SUMMARY → Payments), so orders sit 'pending' until an
-- admin confirms receipt, and an abandoned or never-paid basket is not
-- evidence of anything. This is the same distinction lib/analytics draws
-- between demand and revenue, applied to the same table for the same reason.
--
-- Safe to re-run. Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- Unordered pairs, returned in both directions.
--
-- The ranker asks "given A, what else?" so it needs to look A up as the seed;
-- emitting each pair twice costs nothing at this catalogue size and saves
-- every caller from having to normalise the order themselves. `a_orders` and
-- `b_orders` are the marginals — how often each product appears at all —
-- which is what turns a raw co-occurrence count into lift rather than a
-- popularity contest.
CREATE OR REPLACE FUNCTION get_copurchase_counts()
RETURNS TABLE (
  product_a    UUID,
  product_b    UUID,
  pair_orders  BIGINT,
  a_orders     BIGINT,
  b_orders     BIGINT,
  total_orders BIGINT
)
LANGUAGE sql
SECURITY DEFINER
-- Pinned so a caller's search_path cannot resolve `orders` to something they
-- control. Standard hygiene for any SECURITY DEFINER function; it matters more
-- here because this one is granted to anon.
SET search_path = public
AS $$
  WITH paid AS (
    SELECT DISTINCT oi.order_id, oi.product_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id IS NOT NULL
      AND o.payment_status = 'paid'
  ),
  -- How many paid orders contain each product. The denominator of P(b).
  marginals AS (
    SELECT product_id, count(*)::BIGINT AS n_orders
    FROM paid
    GROUP BY product_id
  ),
  -- Every basket's worth of paid orders. The denominator of the base rate.
  basket_total AS (
    SELECT count(DISTINCT order_id)::BIGINT AS n FROM paid
  ),
  -- The join is on the order, `<>` rather than `<` so both directions come
  -- back. An order containing one product self-joins to nothing, which is
  -- correct: a single-item basket carries no pairing information.
  pairs AS (
    SELECT x.product_id AS a, y.product_id AS b, count(DISTINCT x.order_id)::BIGINT AS n
    FROM paid x
    JOIN paid y ON y.order_id = x.order_id AND y.product_id <> x.product_id
    GROUP BY x.product_id, y.product_id
    HAVING count(DISTINCT x.order_id) >= 2      -- the floor; see the header
  )
  SELECT
    p.a, p.b, p.n,
    ma.n_orders,
    mb.n_orders,
    bt.n
  FROM pairs p
  JOIN marginals ma ON ma.product_id = p.a
  JOIN marginals mb ON mb.product_id = p.b
  CROSS JOIN basket_total bt
  ORDER BY p.n DESC
  LIMIT 2000;                                    -- see the note below
$$;

-- The cap exists because this is fetched on the storefront's first paint and
-- shipped to a phone. 2,000 rows is far more than a ~150-product catalogue can
-- produce above the support floor, and ordering by strength before truncating
-- means that if the catalogue ever does outgrow it, what survives is the
-- strongest evidence rather than an arbitrary slice.

GRANT EXECUTE ON FUNCTION get_copurchase_counts TO anon, authenticated;

-- The join above walks order_items by order_id, which migration 009 already
-- indexes. This one covers the product side, which the marginals and the
-- DISTINCT both scan.
CREATE INDEX IF NOT EXISTS idx_order_items_product_order
  ON order_items (product_id, order_id)
  WHERE product_id IS NOT NULL;

-- Paid orders are the only ones this function reads, and the filter runs
-- before every aggregate in it.
CREATE INDEX IF NOT EXISTS idx_orders_paid
  ON orders (id)
  WHERE payment_status = 'paid';

COMMIT;

-- ── Check it landed ─────────────────────────────────────────────────────
-- Run separately, after the COMMIT above.
--
-- An empty result is the CORRECT result on a shop that has not yet had two
-- paid multi-item orders sharing a pair. It is not a failed migration, and
-- the storefront is unaffected either way — the rails fall back to the content
-- prior. Re-run it after the first busy week to watch the shop start learning.
--
--   SELECT count(*) AS pairs_learned FROM get_copurchase_counts();
--
--   SELECT
--     (SELECT name FROM products WHERE id = product_a) AS bought,
--     (SELECT name FROM products WHERE id = product_b) AS with_it,
--     pair_orders,
--     round((pair_orders::numeric / a_orders) /
--           (b_orders::numeric / total_orders), 2) AS lift
--   FROM get_copurchase_counts()
--   ORDER BY lift DESC
--   LIMIT 20;
