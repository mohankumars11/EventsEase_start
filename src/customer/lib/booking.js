/**
 * From a plan line to a real booking.
 *
 * Every line carries `fromRef` — exactly what its price was for (a
 * package tier, a menu, a catalogue item, a rate rule) — so the request
 * sent to the engine is the thing the customer saw priced, not a guess.
 * The engine (api/anchor?op=book → resolve_booking) then decides:
 *   INSTANT       a booking line, accepted, ready to pay
 *   QUOTE         a quote request to that partner, pre-filled
 *   NOT_ELIGIBLE  the reasons, in plain English
 * `preview` asks the same question without writing anything and without
 * a login — that is how checkout shows the exact total before payment.
 *
 * Quantities come from what the customer told us (guests, hours) and the
 * line's own unit; the plan lets them change it. The engine re-checks
 * every number against the partner's limits.
 */
import { apiUrl } from '../../lib/api'
import { authHeaders } from '../../lib/payLines'
import { TRADE } from '../data/trades'

const BOOK = '/api/anchor?op=book'

/** A sensible starting quantity for a line priced per unit. */
export function defaultQty(line, event = {}) {
  const g = Number(event.guests) || 50
  const u = String(line.fromUnit ?? '').toLowerCase()
  const name = String(line.fromLabel ?? '').toLowerCase()
  const min = Number(line.fromRef?.minQty) || 1
  let q = 1
  if (/plate|serving/.test(u)) q = g
  else if (/kg/.test(u)) q = Math.ceil(g / 10)
  else if (/chair/.test(name)) q = g
  else if (/table/.test(name)) q = Math.ceil(g / 8)
  else if (/sq ft/.test(u)) q = line.tradeId === 'warehouse_storage' ? 100 : 200
  else if (/piece|item/.test(u) && line.tradeId === 'gifts_favours') q = g
  else if (/piece|item/.test(u) && line.tradeId === 'invitation_printing') q = Math.ceil(g / 3)
  else if (/staff/.test(u) || TRADE[line.tradeId]?.archetype === 'STAFFING') q = Math.max(2, Math.ceil(g / 75))
  return Math.max(min, q)
}

export const qtyOf = (line, event) => line.qty ?? defaultQty(line, event)

/** The engine request for one line. `place` = { lat, lng }. */
export function requestFor(line, event = {}, place = {}) {
  const a = TRADE[line.tradeId]?.archetype
  const ref = line.fromRef ?? {}
  const guests = Math.max(1, Number(event.guests) || 50)
  const hours = Math.max(1, Number(event.hours) || Number(ref.hours) || 4)
  const base = { event_date: event.date, start_time: event.time ?? '10:00', lat: place.lat, lng: place.lng, guests }
  const qty = qtyOf(line, event)

  if (line.tradeId === 'anchor_mc') return { ...base, hours, days: 1, languages: [], addons: [], ...(ref.type === 'package' && ref.key ? { tier: ref.key } : {}) }
  if (line.tradeId === 'catering_food') return { ...base, menu_key: ref.key, adults: guests }

  switch (ref.type) {
    case 'package':
      return { ...base, package: ref.key, hours: ref.hours || hours }
    case 'item': {
      const r = { ...base, hours, items: [{ item_key: ref.key, qty }] }
      if (a === 'RENTAL_INVENTORY') r.end_date = event.date
      if (a === 'TRIP_VEHICLE') Object.assign(r, { pickup: place, dropoff: place, passengers: Math.min(guests, 50) })
      if (a === 'PERSONAL_SERVICE') r.items = [{ item_key: ref.key, qty }]
      return r
    }
    case 'rule': {
      const r = { ...base, hours, rule_kind: ref.key }
      if (a === 'STAFFING') r.staff = qty
      if (a === 'STORAGE_CAPACITY') Object.assign(r, { qty, end_date: event.date })
      if (a === 'TRIP_VEHICLE') Object.assign(r, { pickup: place, dropoff: place, passengers: Math.min(guests, 50), ...(ref.vehicle ? { items: [{ item_key: ref.vehicle }] } : {}) })
      if (a === 'PERSONAL_SERVICE') r.qty = qty
      return r
    }
    default:
      return { ...base, hours }
  }
}

async function call(body, auth) {
  const r = await fetch(apiUrl(BOOK), { method: 'POST', headers: auth ? await authHeaders() : { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null
  try { json = await r.json() } catch { /* not json */ }
  if (!r.ok && !json?.path) throw new Error(json?.error ?? `Booking service error (${r.status})`)
  return json
}

/** What the engine would do, and the exact price — writes nothing. */
export const previewLine = (line, event, place) =>
  call({ vendorServiceId: line.serviceId, request: requestFor(line, event, place), preview: true }, false)

/** Book it (INSTANT → lineId) or send it to the partner (QUOTE → quoteRequestId). */
export const bookLine = (line, event, place, { note, venue } = {}) =>
  call({ vendorServiceId: line.serviceId, request: requestFor(line, event, place), note, venue }, true)

/** Ask a partner for a price: always a quote request, carrying the customer's offer. */
export const sendOffer = (line, event, place, offer, { note, venue } = {}) =>
  call({ vendorServiceId: line.serviceId, request: requestFor(line, event, place), note, venue, negotiate: offer }, true)
