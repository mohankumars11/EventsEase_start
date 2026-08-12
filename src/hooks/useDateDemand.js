import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { indexInterestRows, isoOf, addDaysISO } from '../lib/demand'

/**
 * How many people have asked about each upcoming date.
 *
 * One read, cached at module scope and shared, because the home plan card,
 * the floating badge and the wizard all want the same window and a fetch per
 * component would mean three round trips for one answer.
 *
 * ── Degrades on purpose ──────────────────────────────────────────────
 *
 * Migrations here are applied by hand in the Supabase SQL editor, and `git
 * push` does not run them. If 036 hasn't been applied, `date_demand` either
 * doesn't exist or returns the old shape, and this resolves to an empty map.
 * Every date then renders plain and available — which is exactly the MVP
 * default anyway, so nothing looks broken and nothing is claimed. That is
 * what makes this safe to deploy in either order.
 */

const HORIZON_DAYS = 400

let cache = null

export function fetchDateInterest(city) {
  if (cache && cache.city === city) return cache.promise

  const from = isoOf(new Date())
  const to = addDaysISO(from, HORIZON_DAYS)

  const promise = supabase
    .rpc('date_demand', { p_from: from, p_to: to, p_city: city ?? null })
    .then(({ data, error }) => ({
      interestByDate: error ? new Map() : indexInterestRows(data ?? []),
      ready: !error,
    }))
    // A failed fetch must not poison the cache for the rest of the session.
    .catch(() => {
      cache = null
      return { interestByDate: new Map(), ready: false }
    })

  cache = { city, promise }
  return promise
}

/** Drop the cache so a fresh read happens — used after an admin edit. */
export function invalidateDateInterest() {
  cache = null
}

const EMPTY = { interestByDate: new Map(), ready: false }

export function useDateInterest(city) {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    let cancelled = false
    fetchDateInterest(city).then(next => { if (!cancelled) setState(next) })
    return () => { cancelled = true }
  }, [city])

  return state
}
