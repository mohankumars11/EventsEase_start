import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { buildRecommender } from '../lib/recommend'

/**
 * The data the recommender runs on, fetched once per page load and shared.
 *
 * Three sources, and every one of them is allowed to be missing:
 *
 *   products                   the pool to recommend from
 *   get_copurchase_counts()    what actually gets bought together (migration 042)
 *   get_product_order_counts() how often each thing sells (migration 019)
 *
 * ── Why the failures are silent, and why that is right here ─────────────
 * Migrations in this project are applied by hand, so code must not assume one
 * has run — that rule has already cost this app a closed funnel once. A
 * missing `get_copurchase_counts` throws a 404 from PostgREST, and if that
 * propagated, a product page would show an error where a rail should be.
 *
 * Instead each fetch degrades to an empty result, and the ranker is built so
 * that empty inputs are a *state*, not a failure: with no co-purchase rows the
 * evidence weight n/(n+K) is zero and the content prior carries the whole
 * ranking. The rail still renders, with honest labels — "goes with this"
 * rather than "customers also bought", because `alsoBought` can only be true
 * when real orders back it.
 *
 * So the difference between this migration applied and unapplied is that the
 * suggestions are measured rather than assumed. Nothing appears or disappears.
 *
 * Cached at module scope for the same reason usePublicOffers is: a product
 * page, its rail and the cart would otherwise each issue the same three
 * queries.
 */
let cache = null

export function fetchRecommenderData() {
  if (cache) return cache

  cache = Promise.all([
    // The pool. A deliberately narrow column list — this is the whole
    // catalogue on a phone, and `select('*')` would drag every description
    // and image field into a payload that only needs to rank.
    //
    // No `is_active` filter in the query itself: that column only exists
    // after migration 037, and naming it in a select against a database
    // without it fails the whole request. The ranker skips
    // `is_active === false`, which is correct before and after 037 — the
    // same shape ShopPicksRail uses, for the same reason.
    supabase
      .from('products')
      .select('id, name, category, occasion, price, emoji, image_url, image_alt, description')
      .order('created_at', { ascending: false })
      .limit(400)
      .then(({ data, error }) => (error ? [] : (data ?? []))),

    supabase.rpc('get_copurchase_counts')
      .then(({ data, error }) => (error ? [] : (data ?? [])))
      .catch(() => []),

    supabase.rpc('get_product_order_counts')
      .then(({ data, error }) => {
        if (error || !data) return {}
        const map = {}
        data.forEach(r => { map[r.product_id] = Number(r.total_ordered) || 0 })
        return map
      })
      .catch(() => ({})),
  ])
    .then(([products, copurchase, orderCounts]) => ({ products, copurchase, orderCounts }))
    // A failed load must not poison the cache for the rest of the session —
    // the customer may simply have walked into a lift.
    .catch(() => { cache = null; return { products: [], copurchase: [], orderCounts: {} } })

  return cache
}

/**
 * The recommender, ready to ask.
 *
 * Returns `ready: false` until the catalogue has landed so a caller can hold
 * the space rather than render an empty rail and then push the page down when
 * it fills — layout shift under a customer's thumb is how a wrong item gets
 * added to a cart.
 */
export function useRecommender() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchRecommenderData().then(d => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [])

  // Rebuilt only when the fetched data changes, never per render: building the
  // adjacency index is a walk over every pair the RPC returned.
  const recommender = useMemo(
    () => buildRecommender(data ?? { products: [], copurchase: [], orderCounts: {} }),
    [data],
  )

  return {
    ...recommender,
    ready: !!data,
    products: data?.products ?? [],
    orderCounts: data?.orderCounts ?? {},
    /** True once real orders back at least one pairing. Drives the heading. */
    learned: recommender.hasData,
  }
}

/**
 * One rail's worth of recommendations.
 *
 * The options are passed straight through to `recommend`; they are listed on
 * that function. `cart` is the shop cart's product lines, which the ranker
 * both excludes from results and uses as seeds when there is no single
 * product being viewed.
 */
export function useRecommendations({
  seed = null,
  cart = [],
  intent = 'complete',
  occasion = null,
  budgetGap = null,
  limit = 8,
} = {}) {
  const { recommend, ready, learned, orderCounts } = useRecommender()

  // Cart lines are rebuilt on every dispatch, so the array identity changes
  // constantly even when its contents have not. Keying the memo on the ids
  // keeps a rail from re-ranking — and visibly re-ordering itself — every
  // time an unrelated quantity stepper is tapped.
  const cartKey = cart.map(l => (l.product ?? l)?.id).filter(Boolean).sort().join(',')

  const items = useMemo(() => {
    if (!ready) return []
    return recommend({ seed, cart, intent, occasion, budgetGap, limit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, recommend, seed?.id, cartKey, intent, occasion, budgetGap, limit])

  return { items, ready, learned, orderCounts }
}
