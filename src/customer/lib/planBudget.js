/**
 * What a plan is estimated at — from live prices, or not at all.
 *
 * The number on the plan screen is read from the masters who are actually
 * listed near this event: for each chosen service we take every eligible
 * master's starting price, turn it into what THIS event would cost
 * (lib/estimate.lineFloor — a caterer's ₹913 is per plate, not per event),
 * and report the range between the cheapest and the median. Nothing is
 * invented: a service with no priced master contributes nothing to the
 * range and is counted as "on request" instead.
 *
 * This is deliberately a FLOOR and a MIDDLE, not a quote. The exact
 * amount comes from the offer board, where a master's own package is
 * priced against the real guest count and hours, and from checkout,
 * which asks the engine. Every surface that shows this says "estimated".
 *
 * Why the median and not the highest: one ₹4,00,000 photographer in a
 * list of forty would make a ₹60,000 birthday read as a wedding.
 */
import { partnersFor } from './market'
import { lineFloor } from './estimate'

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

/**
 * @param tradeIds  the services currently in the plan
 * @param event     { guests, hours } — what turns a unit price into a total
 * @param at        { lat, lng } the event's location
 * @returns { low, high, priced, open } in paise, or low/high null if nothing is priced
 */
export async function planEstimate(tradeIds, event = {}, at = {}) {
  const trades = [...new Set(tradeIds)].filter(Boolean)
  if (!trades.length) return { low: null, high: null, priced: 0, open: 0 }

  const per = await Promise.all(trades.map(async t => {
    let list = []
    try { list = await partnersFor(t, at.lat ? { lat: at.lat, lng: at.lng } : {}) } catch { return null }
    const floors = list
      .map(p => lineFloor({ fromPaise: p.fromPaise, fromKind: p.fromKind, fromUnit: p.fromUnit, fromLabel: p.fromLabel, ref: p.fromRef }, event).paise)
      .filter(n => Number.isFinite(n) && n > 0)
    if (!floors.length) return null
    return { low: Math.min(...floors), mid: median(floors) }
  }))

  const priced = per.filter(Boolean)
  if (!priced.length) return { low: null, high: null, priced: 0, open: trades.length }
  return {
    low: priced.reduce((s, x) => s + x.low, 0),
    high: priced.reduce((s, x) => s + x.mid, 0),
    priced: priced.length,
    open: trades.length - priced.length,
  }
}

/** The budget band the customer picked, as paise, for comparing against. */
export const BUDGET_PAISE = {
  lt50k: [0, 50_00_000], '50k-1l': [50_00_000, 1_00_00_000], '1l-1.5l': [1_00_00_000, 1_50_00_000],
  '1.5l-3l': [1_50_00_000, 3_00_00_000], '3l-5l': [3_00_00_000, 5_00_00_000], '5l+': [5_00_00_000, null], '5l-10l': [5_00_00_000, 10_00_00_000], '10l-20l': [10_00_00_000, 20_00_00_000], '20l-40l': [20_00_00_000, 40_00_00_000], '40l+': [40_00_00_000, null],
}

/**
 * Is the estimate inside what they said they'd spend? Returns null when
 * either side is unknown — we never warn on a guess.
 */
export function againstBudget(estimate, budgetKey) {
  const band = BUDGET_PAISE[budgetKey]
  if (!band || estimate?.low == null) return null
  const [, ceiling] = band
  if (ceiling == null) return { over: false }
  return { over: estimate.low > ceiling, ceiling }
}
