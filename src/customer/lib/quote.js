/**
 * Your price, before you book — from what you told us.
 *
 * "How many hours?" and "How many guests?" are the two answers that turn
 * a master's rate into a bill. Each master's own priced options (read once
 * per list in lib/market.js → `offers`) are tried against those answers
 * the way the booking engine prices them (resolve_booking):
 *
 *   hourly rate      rate × max(hours, their minimum) — only up to their maximum
 *   package          its price, if it covers the hours asked
 *   session / day    its price, if its included hours cover the hours asked
 *   per plate        rate × max(guests, their minimum)
 *   per guest rule   the same
 *
 * The cheapest option that fully covers the ask is the quote, and it
 * carries the exact `fromRef` the engine is then asked for — so the price
 * on the card is the price at checkout (checkout still confirms it).
 *
 * A master who cannot do what was asked (6 hours max, asked for 8) has no
 * quote and is not shown for it. A master with no priced options at all
 * stays "Price on request".
 */
import { rupees } from './format'

const HOURLY = new Set(['hour'])
const COVERS = new Set(['session', 'event', 'half_day', 'full_day', 'fixed'])
const DEFAULT_COVER = { half_day: 4, full_day: 8 }

/** Which quantity questions this list of masters can actually price. */
export function asksFor(tradeId, list) {
  const offers = (list ?? []).flatMap(p => p.offers ?? [])
  return {
    hours: offers.some(o => (o.type === 'rule' && HOURLY.has(o.key)) || (o.type === 'package' && o.hours)),
    guests: tradeId === 'catering_food' || offers.some(o => o.type === 'plate' || (o.type === 'rule' && o.key === 'per_guest')),
  }
}

/** The customer's answers for one service: their own, else the event's. */
export function askOf(picks = {}, event = {}) {
  return { hours: Number(picks.$hours) || null, guests: Number(picks.$guests) || Number(event.guests) || null, diets: picks.$diet ?? [] }
}
const dietOk = (want, d) => !want?.length || !d || want.some(w => w === d || (w === 'non_veg' && d === 'mixed') || (w === 'mixed' && d === 'non_veg'))

/** One master's price for the ask, or null when nothing they offer covers it. */
export function quote(p, ask = {}) {
  const h = Number(ask.hours) || null, g = Number(ask.guests) || null
  if (!h && !g) return null
  const c = []
  for (const o of p.offers ?? []) {
    if (o.type === 'package') {
      if (h && o.hours && o.hours < h) continue
      if (!h && !o.hours) continue
      c.push({ paise: o.paise, note: o.hours ? `${o.label ?? 'Package'} · ${o.hours} h` : `${o.label ?? 'Package'}`, o, hours: o.hours ?? h, line: { fromKind: 'package', fromUnit: 'package' } })
    } else if (o.type === 'plate' || (o.type === 'rule' && o.key === 'per_guest')) {
      if (!g || !dietOk(ask.diets, o.diet)) continue
      const n = Math.max(g, o.minQty || 1)
      c.push({ paise: o.paise * n, note: `${n.toLocaleString('en-IN')} plates × ${rupees(o.paise)}`, o, guests: n, line: { fromKind: 'plate', fromUnit: 'per plate' } })
    } else if (o.type === 'rule' && HOURLY.has(o.key)) {
      if (!h || (o.maxHours && h > o.maxHours)) continue
      const n = Math.max(h, o.minHours || o.minQty || 0)
      c.push({ paise: o.paise * n, note: `${n} h × ${rupees(o.paise)}/h`, o, hours: n, line: { fromKind: 'hour', fromUnit: 'per hour' } })
    } else if (o.type === 'rule' && COVERS.has(o.key)) {
      const cover = o.includedHours ?? DEFAULT_COVER[o.key] ?? 0
      if (!h || cover < h) continue
      c.push({ paise: o.paise, note: `${o.key.replace('_', ' ')} · up to ${cover} h`, o, hours: h, line: { fromKind: 'once', fromUnit: `per ${o.key.replace('_', ' ')}` } })
    }
  }
  if (!c.length) return null
  const best = c.reduce((a, b) => (b.paise < a.paise ? b : a))
  return {
    paise: best.paise, note: best.note, hours: best.hours ?? null, guests: best.guests ?? null,
    line: { ...best.line, fromPaise: best.o.paise, fromLabel: best.o.label ?? null, fromRef: best.o.ref },
  }
}

/** A list with each master's quote; masters who are priced but cannot cover the ask drop out. */
export function withQuotes(list, ask) {
  if (!list) return list
  if (!ask?.hours && !ask?.guests) return list
  return list.flatMap(p => {
    const q = quote(p, ask)
    if (q) return [{ ...p, quote: q }]
    return (p.offers ?? []).length ? [] : [p]
  })
}

/** What goes into the plan when a quoted master is added. */
export const asLine = p => (p.quote ? { ...p, ...p.quote.line, askHours: p.quote.hours, askGuests: p.quote.guests } : p)

/** "₹6,000 – ₹14,000" across a list of quotes. */
export function priceRange(list) {
  const v = (list ?? []).map(p => p.quote?.paise).filter(Boolean)
  if (!v.length) return null
  const lo = Math.min(...v), hi = Math.max(...v)
  return { lo, hi, n: v.length, text: lo === hi ? rupees(lo) : `${rupees(lo)} – ${rupees(hi)}` }
}
