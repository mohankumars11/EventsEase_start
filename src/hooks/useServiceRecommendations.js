import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { buildServiceSuggester } from '../lib/serviceRecommend'

/**
 * The co-booking data the service suggester runs on.
 *
 * One source, and it is allowed to be missing:
 *
 *   get_service_cobooking_counts()   what gets booked together (migration 043)
 *
 * Unlike the shop's equivalent there is no catalogue to fetch — the service
 * list is a static file, so the prior half of the ranker needs no network at
 * all and the panel renders on first paint whether this resolves or not.
 *
 * ── Why the failure is silent ───────────────────────────────────────────
 * Migrations here are applied by hand, so code must never assume one has run;
 * that rule has already cost this app a closed funnel once. A missing function
 * throws a 404 from PostgREST, and if that propagated, the builder's service
 * step would show an error where advice should be. Instead it degrades to an
 * empty result, and the suggester is built so that empty input is a *state*,
 * not a failure: the evidence weight n/(n+K) is zero and the hand-authored
 * prior carries the whole ranking, with honest labels to match. The difference
 * between this migration applied and unapplied is whether the suggestions are
 * measured or assumed. Nothing appears or disappears.
 *
 * Cached at module scope: the builder mounts the service step, the review
 * board and the quote panel against the same data, and three identical RPCs
 * on a mid-range phone is three round trips nobody asked for.
 */
let cache = null

export function fetchCobookingData() {
  if (cache) return cache

  cache = supabase
    .rpc('get_service_cobooking_counts')
    .then(({ data, error }) => (error ? [] : (data ?? [])))
    // A failed load must not poison the cache for the rest of the session —
    // the customer may simply have walked into a lift.
    .catch(() => { cache = null; return [] })

  return cache
}

/**
 * The suggester, ready to ask.
 *
 * Note what is NOT returned: a `ready` flag of the kind useRecommender has.
 * The shop rail must wait, because it has nothing to render until the
 * catalogue arrives and an empty rail that fills late pushes the page down
 * under somebody's thumb. This panel has the opposite shape — the prior is
 * local and complete, so it can render immediately and simply get better when
 * the RPC lands. Holding it back would be a spinner over advice we already
 * have.
 */
export function useServiceSuggester() {
  const [cobooking, setCobooking] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchCobookingData().then(rows => { if (!cancelled) setCobooking(rows) })
    return () => { cancelled = true }
  }, [])

  // Rebuilt only when the fetched rows change, never per render: building the
  // adjacency index is a walk over every pair the RPC returned.
  const suggester = useMemo(
    () => buildServiceSuggester({ cobooking: cobooking ?? [] }),
    [cobooking],
  )

  return {
    ...suggester,
    /** True once real enquiries back at least one pairing. Drives the heading. */
    learned: suggester.hasData,
  }
}

/**
 * One panel's worth of suggestions.
 *
 * Options pass straight through to `suggest`; they are documented on that
 * function.
 *
 * `chosenIds` is rebuilt on every toggle, so its array identity changes even
 * when the contents have not. Keying the memo on the sorted ids is what keeps
 * the panel from re-ranking — and visibly re-ordering itself — when an
 * unrelated quantity stepper is tapped. A suggestion that moves while a thumb
 * is travelling toward it is how the wrong service gets added to a quote.
 *
 * `quoteTotal` is deliberately NOT in the dependency list. It changes with
 * every stepper tap and every guest-count digit, and re-ranking on it would
 * reshuffle the panel continuously while somebody types. It is read at
 * ranking time for budget fit, which is a coarse enough term that a slightly
 * stale total cannot change the ordering — the panel re-ranks when the plan's
 * *shape* changes, which is when the advice should change.
 */
export function useServiceSuggestions({
  occasion = null,
  chosenIds = [],
  guestCount = 0,
  quoteTotal = 0,
  limit = 4,
} = {}) {
  const { suggest, learned } = useServiceSuggester()

  const chosenKey = [...chosenIds].sort().join(',')

  const items = useMemo(
    () => suggest({ occasion, chosenIds, guestCount, quoteTotal, limit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suggest, occasion, chosenKey, guestCount, limit],
  )

  return { items, learned }
}
