/**
 * Live matching: one master per service, picked by Sambramo while the
 * customer watches (Mohan, 2026-11-01: "we should not be a vendor
 * directory").
 *
 * For each service in the plan:
 *   1. every live master in that trade near the event (lib/market)
 *   2. only those who meet what the customer said (lib/needs) and whose
 *      priced options cover the guests and hours (lib/quote)
 *   3. ranked on rating, reviews, distance and instant booking (rank)
 *   4. FAIRNESS: the three best fits share the work. Which of them is
 *      asked first rotates with the request, so the same master does not
 *      win every job for the same kind of event.
 *   5. each candidate is put to the booking engine as a PREVIEW (nothing
 *      written): the first one free on the date at an exact price is the
 *      match; the next two, never more than a quarter dearer, are the
 *      backups the request hops to if the match declines or lets it lapse.
 *
 * Nothing is broadcast. The request still goes to one master at a time
 * (migration 197); this only decides who, in front of the customer.
 */
import { partnersFor, rank } from './market'
import { filterByNeeds } from './needs'
import { asLine, withQuotes } from './quote'
import { previewLine } from './booking'

/** The line shape PlanContext.add() builds, without touching the plan. */
export const lineOf = (p, occasionId, addons = []) => ({
  key: `${occasionId ?? 'solo'}:${p.tradeId}`, occasionId, tradeId: p.tradeId, serviceId: p.serviceId, name: p.name, area: p.area,
  cover: p.cover, fromPaise: p.fromPaise, fromKind: p.fromKind, fromUnit: p.fromUnit, fromLabel: p.fromLabel,
  fromRef: p.fromRef ?? null, qty: null, hours: p.askHours ?? null, guests: p.askGuests ?? null, addons, instant: p.instant, advancePct: p.advancePct,
  rating: p.rating, reviews: p.reviews, distanceKm: p.distanceKm, quoteHours: p.quoteHours,
})

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const durationHours = value => {
  const direct = Number(value)
  if (Number.isFinite(direct) && direct > 0) return direct
  const parsed = Number(String(value ?? '').match(/\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/* The top three rotate; everyone below keeps their place. */
function fair(list, seed) {
  if (list.length < 2) return list
  const top = list.slice(0, 3)
  const k = hash(seed) % top.length
  return [...top.slice(k), ...top.slice(0, k), ...list.slice(3)]
}

/**
 * Match one service. `onPool(n)` fires once the masters near the event
 * are known, so the screen can count them while the previews run.
 */
export async function matchTrade(tradeId, { occasionId, event, place, needs = {}, seed = '', skip = [], priority = 'balanced', onPool } = {}) {
  const at = place?.lat ? { lat: place.lat, lng: place.lng } : {}
  const all = await partnersFor(tradeId, at).catch(() => [])
  onPool?.(all.length)
  const fit = filterByNeeds(all, tradeId, needs, event.guests).list ?? all
  const ask = { hours: durationHours(needs.$hours) || durationHours(event.hours), guests: Number(needs.$guests) || Number(event.guests) || null, diets: needs.$diet ?? [] }
  const quoted = withQuotes(fit, ask) ?? fit
  const pool = fair(rank(quoted, { priority }).filter(p => (p.fromRef || p.quote) && !skip.includes(p.serviceId)), `${seed}|${tradeId}`)
  /* A menu card the customer chose (lib/menus) is that caterer's own menu:
     ask them first, for exactly that menu; the rest stay as backups. */
  const menu = needs.$menu
  if (menu?.serviceId && !skip.includes(menu.serviceId)) {
    const i = pool.findIndex(p => p.serviceId === menu.serviceId)
    const p = i >= 0 ? pool.splice(i, 1)[0] : all.find(x => x.serviceId === menu.serviceId)
    if (p) pool.unshift({ ...p, quote: null, fromRef: { type: 'menu', key: menu.key, minQty: menu.minGuests ?? 1 }, fromKind: 'plate', fromUnit: 'per plate', fromLabel: menu.name, askGuests: Number(event.guests) || null })
  }

  let first = null, asked = null
  const backups = []
  for (const p of pool.slice(0, 7)) {
    if (first && backups.length >= 2) break
    const line = lineOf(asLine(p), occasionId, addonKeysFor(tradeId, needs.$extras ?? []))
    const r = await previewLine(line, event, place).catch(() => null)
    if (r?.path === 'INSTANT') {
      if (!first) first = { line, partner: p, q: r }
      else if (Number(r.customer_paise) <= Number(first.q.customer_paise) * 1.25) backups.push({ ...line, chosenBy: 'sambramo', customer_paise: r.customer_paise })
    } else if (r?.path === 'QUOTE' && !asked) asked = { line, partner: p, q: r }
  }
  return { tradeId, near: all.length, fit: pool.length, match: first ?? asked, backups, pool }
}

/**
 * Every master who can take this service for this event, best first —
 * capability, area and the customer's needs (diet, service style, where
 * the food is cooked) — without pricing anyone. The Menu Studio sends its
 * menu to the top of this list; the server re-checks each one's calendar
 * as the request lands (anchorBook), so a busy master never receives it.
 */
export async function poolFor(tradeId, { event, place, needs = {}, seed = '' } = {}) {
  const at = place?.lat ? { lat: place.lat, lng: place.lng } : {}
  const all = await partnersFor(tradeId, at).catch(() => [])
  const f = filterByNeeds(all, tradeId, needs, event?.guests)
  /* exact: false — nobody meets everything; these are the closest, and
     `missing` says what they lack, so the screen can say so first. */
  return { near: all.length, exact: f.exact, missing: [...new Set((f.list ?? []).flatMap(p => p.missing ?? []))], pool: fair(rank(f.list ?? all), `${seed}|${tradeId}`) }
}

/**
 * Price one named master for the same request (the Swap sheet). Null when
 * they cannot take it.
 */
export async function priceOne(p, { occasionId, event, place }) {
  const line = lineOf(asLine(p), occasionId)
  const r = await previewLine(line, event, place).catch(() => null)
  return r && ['INSTANT', 'QUOTE'].includes(r.path) ? { line, partner: p, q: r } : null
}

/** Run `jobs` (functions returning promises) a few at a time. */
export async function some(jobs, width = 3) {
  const out = new Array(jobs.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, async () => {
    while (i < jobs.length) { const k = i++; out[k] = await jobs[k]() }
  }))
  return out
}
