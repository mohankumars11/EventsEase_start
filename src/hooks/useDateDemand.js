import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { indexDemandRows, indexPeakRows, isoOf, addDaysISO } from '../lib/demand'

/**
 * Real per-date demand: how full each day is, and which days the city itself
 * has marked as heavy.
 *
 * Two reads, cached at module scope and shared, because the landing band, the
 * calendar sheet and the wizard summary all want the same window and a fetch
 * per component would mean three round trips for one answer.
 *
 * ── Degrades on purpose ──────────────────────────────────────────────
 *
 * Migrations here are applied by hand in the Supabase SQL editor, and `git
 * push` does not run them. If 035 hasn't been applied yet, `date_demand` and
 * `peak_dates` don't exist and both reads fail — so both resolve to empty
 * rather than throwing, and the calendar falls back to the static signals in
 * data/peakCalendar.js. A customer sees weekends and festivals correctly
 * marked and never sees an error; nothing about the page is broken, it is
 * just less informed. That is what makes this safe to deploy in either order.
 */

const HORIZON_DAYS = 400

let cache = null

export function fetchDateDemand(city) {
  if (cache && cache.city === city) return cache.promise

  const from = isoOf(new Date())
  const to = addDaysISO(from, HORIZON_DAYS)

  const promise = Promise.all([
    supabase
      .rpc('date_demand', { p_from: from, p_to: to, p_city: city ?? null })
      .then(({ data, error }) => (error ? [] : (data ?? []))),
    supabase
      .from('peak_dates')
      .select('peak_date, city, kind, label, note, weight')
      .gte('peak_date', from)
      .lte('peak_date', to)
      .then(({ data, error }) => (error ? [] : (data ?? []))),
  ])
    .then(([demandRows, peakRows]) => ({
      demandByDate: indexDemandRows(demandRows),
      // A row with no city applies everywhere; a row with one applies only there.
      peaks: indexPeakRows(peakRows.filter(r => !r.city || !city || r.city === city)),
      ready: true,
    }))
    // A failed fetch must not poison the cache for the rest of the session.
    .catch(() => {
      cache = null
      return { demandByDate: new Map(), peaks: new Map(), ready: false }
    })

  cache = { city, promise }
  return promise
}

const EMPTY = { demandByDate: new Map(), peaks: new Map(), ready: false }

export function useDateDemand(city) {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    let cancelled = false
    fetchDateDemand(city).then(next => { if (!cancelled) setState(next) })
    return () => { cancelled = true }
  }, [city])

  return state
}
