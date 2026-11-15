/**
 * What one service, as the customer has just described it, is estimated
 * at — from the masters really listed near the event, nothing invented
 * (Mohan, 2026-11-11: "every preference should be priceable").
 *
 *   estimateFor(tradeId, needs, event, place) → { low, high, n, near, extras, … }
 *
 * For each master who fits what was chosen (lib/needs): their price for
 * THIS ask — hours and guests through lib/quote, the engine's own
 * arithmetic — else their starting price turned into this event's cost
 * (lib/estimate). A headcount (ushers, guards, photographers) multiplies
 * an hourly or per-unit line. Add-ons the customer ticked are priced from
 * the add-on rules of the masters who offer them, at the median; one
 * nobody prices stays "priced by the master" rather than ₹0.
 *
 * The range is the cheapest to the median, the same shape as the plan's
 * estimate (lib/planBudget): a floor and a middle, never a quote.
 */
import { partnersFor } from './market'
import { filterByNeeds } from './needs'
import { quote } from './quote'
import { lineFloor } from './estimate'
import { experienceOf, hoursOf } from './experience'
import { isOther, otherText } from '../ui/choiceTiles'

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const HEADCOUNT = /staff|person|people|item|piece|vehicle|trip|guard|look|hand/

export async function estimateFor(tradeId, needs = {}, event = {}, place = {}) {
  const at = place?.lat ? { lat: Number(place.lat), lng: Number(place.lng) } : {}
  const all = await partnersFor(tradeId, at).catch(() => [])
  const guests = Number(needs.$guests) || Number(event.guests) || null
  const fit = filterByNeeds(all, tradeId, needs, guests).list ?? all
  const hours = hoursOf(needs.$hours) ?? hoursOf(event.hours)
  const qty = Number(needs.$qty) || null
  const ask = { hours, guests, diets: needs.$diet ?? [], experience: experienceOf(tradeId, needs.$tier) }
  const bases = []
  for (const p of fit) {
    const q = quote(p, ask)
    let paise = q?.paise ?? null
    const kind = q?.line?.fromKind ?? p.fromKind
    if (paise == null) paise = lineFloor({ fromPaise: p.fromPaise, fromKind: p.fromKind, fromUnit: p.fromUnit, fromLabel: p.fromLabel, qty: qty ?? undefined }, { guests, hours }).paise
    if (!(paise > 0)) continue
    if (qty && qty > 1 && (kind === 'hour' || kind === 'unit' || HEADCOUNT.test(String(p.fromUnit ?? '')))) paise *= qty
    bases.push(paise)
  }
  const extras = (needs.$extras ?? []).map(id => {
    if (isOther(id)) return { id, label: otherText(id), paise: null, n: 0 }
    const hits = fit.map(p => (p.addons ?? []).find(a => a.id === id)).filter(Boolean)
    const prices = hits.map(a => (a.unit === 'per_hour' && hours ? a.paise * hours : a.paise))
    return { id, label: hits[0]?.label ?? null, paise: prices.length ? median(prices) : null, n: prices.length }
  })
  const add = extras.reduce((s, x) => s + (x.paise ?? 0), 0)
  const out = { n: bases.length, near: all.length, fit: fit.length, extras, guests, hours, qty }
  if (!bases.length) return { ...out, low: null, high: null }
  return { ...out, low: Math.min(...bases) + add, high: median(bases) + add }
}

export const rupees = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')
/** "₹6,000 – ₹14,000", "₹6,000", or null. */
export const rangeText = e => (e?.low == null ? null : e.low === e.high ? rupees(e.low) : `${rupees(e.low)} – ${rupees(e.high)}`)
