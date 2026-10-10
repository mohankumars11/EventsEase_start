/**
 * Any trade's answers → the payload submit_listing_version reads
 * (migration 20261010_08), and the stage list the shared flow walks.
 *
 * Amounts go out as take-home paise (or customer paise when the partner
 * chose to enter what the customer pays); the server computes the other
 * side with the trade's fee. Nothing here decides a customer price.
 */
import { RULE_KINDS } from '../../../data/trades/schema'
import { holds, chargesFrom, complianceFor } from '../../../data/trades'

/* ── Stages ─────────────────────────────────────────────────────────── */

export function stagesFor(config) {
  const s = [
    { id: 'basics', label: 'About your service', short: 'About' },
    { id: 'location', label: 'Your location', short: 'Location' },
    ...config.screens.map((x, i) => ({ id: `screen:${x.id}`, label: x.title, short: config.screens.length > 1 ? `Details ${i + 1}` : 'Details' })),
  ]
  if (config.catalogue) s.push({ id: 'catalogue', label: config.catalogue.title, short: 'Your list' })
  s.push({ id: 'pricing', label: 'How you charge', short: 'Pricing' })
  if (config.pricing.packages && config.tiers) s.push({ id: 'packages', label: config.pricing.packages.label, short: 'Packages' })
  if (config.addons.length) s.push({ id: 'extras', label: 'Extras & add-ons', short: 'Extras' })
  s.push({ id: 'resources', label: config.resources.title ?? 'What you can supply', short: 'Capacity' })
  s.push({ id: 'availability', label: 'Availability & travel', short: 'Calendar' })
  if (config.compliance.conditional.length) s.push({ id: 'compliance', label: 'Licences & documents', short: 'Licences' })
  s.push({ id: 'booking', label: 'Booking & cancellation', short: 'Rules' })
  s.push({ id: 'payout', label: 'Identity & bank details', short: 'ID & Bank' })
  s.push({ id: 'review', label: 'Review & submit', short: 'Submit' })
  return s
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

/* ── Catalogue items: name, price, stock, limits from the trade's own fields ── */

const PRICE_IDS = ['price', 'unit_price', 'rate', 'base_rate', 'fee', 'per_piece']
const STOCK_IDS = ['total_qty', 'stock', 'quantity', 'qty_available', 'count']
const MIN_IDS = ['min_order', 'min_qty', 'min_billable_guests', 'min_staff']
const NAME_PICKS = ['service', 'ceremony', 'coverage', 'category', 'group', 'type', 'role', 'product_type']

const optLabel = (field, id) => field?.options?.find(o => o.id === id)?.label ?? id

export function itemName(cat, ans = {}) {
  if (ans.name) return ans.name
  for (const id of NAME_PICKS) {
    const f = cat.fields.find(x => x.id === id)
    if (f && ans[id]) return ans[id] === 'other' ? (ans[`${id}_other`] || 'Other') : optLabel(f, ans[id])
  }
  return ans.model ?? ans.sku ?? ''
}
export const itemPricePaise = (cat, ans = {}) => {
  const id = PRICE_IDS.find(k => cat.fields.some(f => f.id === k && f.type === 'money'))
  return id ? Number(ans[id]) || 0 : 0
}
const firstNum = (ans, ids) => { for (const k of ids) if (Number(ans[k]) > 0) return Number(ans[k]); return null }

function itemOut(config, it, i) {
  const cat = config.catalogue, ans = it.answers ?? {}
  const unitField = ['price_unit', 'rate_period', 'unit', 'rate_unit'].find(k => ans[k])
  const unit = unitField ? optLabel(cat.fields.find(f => f.id === unitField), ans[unitField]).toLowerCase() : 'item'
  const price = itemPricePaise(cat, ans)
  // Standard keys the server reads, beside every answer the trade asked.
  const attributes = {
    ...ans,
    minutes: Number(ans.duration_minutes ?? ans.minutes) || undefined,
    hours: Number(ans.hours ?? ans.included_hours) || undefined,
    included_hours: Number(ans.included_hours) || undefined,
    capacity: Number(ans.capacity ?? ans.guest_capacity ?? ans.servings) || undefined,
    max_guests: Number(ans.guest_capacity ?? ans.capacity) || undefined,
    seats: Number(ans.seats) || undefined,
    payload_kg: Number(ans.payload_kg) || undefined,
    rate_period: ans.rate_period ? optLabel(cat.fields.find(f => f.id === 'rate_period'), ans.rate_period).toLowerCase() : undefined,
    rate_unit: ans.rate_unit ? optLabel(cat.fields.find(f => f.id === 'rate_unit'), ans.rate_unit).toLowerCase().replace(/^per\s+/, '') : undefined,
    price_unit: unitField ? unit : undefined,
  }
  for (const k of Object.keys(attributes)) if (attributes[k] === undefined) delete attributes[k]
  delete attributes.registration       // private: never stored with the public item
  return {
    collection: cat.key, item_key: it.item_key, name: itemName(cat, ans) || `${cap(cat.noun)} ${i + 1}`,
    category: ans.category ?? ans.group ?? ans.type ?? ans.meal_category ?? null,
    unit: unit.replace(/^per\s+/, ''),
    take_home_paise: price || null, quote_only: !price, price_mode: 'target_net',
    min_qty: firstNum(ans, MIN_IDS) ?? 1, max_qty: Number(ans.max_staff) || null,
    stock_qty: firstNum(ans, STOCK_IDS), lead_days: Number(ans.lead_days) || 0,
    qty_bands: [], attributes, media: (ans.photos ?? []).filter(x => x.kind !== 'testimonial'),
  }
}

/* ── Resources: the real staff / vehicles / stock / spaces / capacity ── */

/* Where each trade's "how much can you do at once" lives in its answers.
   kind, key, label, quantity (from answers), unit, buffer (minutes). */
const STAFF = (qty, label, buffer) => ({ kind: 'staff', key: 'staff', label, qty, unit: 'person', buffer })
const RESOURCE_SOURCES = {
  bar_beverages: a => [{ kind: 'capacity', key: 'guests', label: 'Guests you can serve', qty: (Number(a.max_guests_per_event) || 0) * (Number(a.events_per_day) || 1), unit: 'guest' }],
  bridal_makeup_hair: a => [STAFF(a.artists, 'Artists', a.buffer_minutes)],
  cake_desserts: a => [{ kind: 'production', key: 'production', label: 'Orders per day', qty: a.capacity_per_day, unit: 'unit_per_day' }],
  catering_food: a => [{ kind: 'capacity', key: 'guests', label: 'Guests per day', qty: a.guests_per_day, unit: 'guest' }],
  dj_music: a => [STAFF(1, 'You', a.travel_buffer_minutes)],
  decoration_floral: a => [{ kind: 'project', key: 'projects', label: 'Setups at once', qty: a.concurrent_setups, unit: 'project' }],
  end_to_end_event_logistics: a => [{ kind: 'project', key: 'projects', label: 'Crews', qty: a.crews, unit: 'project' }],
  gifts_favours: a => [{ kind: 'production', key: 'production', label: 'Units per day', qty: a.units_per_day, unit: 'unit_per_day' }],
  guest_services: a => [STAFF(a.staff_pool, 'Staff pool', a.turnaround_minutes)],
  invitation_printing: a => [{ kind: 'production', key: 'production', label: 'Pieces per day', qty: a.pieces_per_day, unit: 'unit_per_day' }],
  live_entertainment: a => [STAFF(1, 'Your act', a.travel_buffer_minutes)],
  loading_unloading_crew: a => [STAFF(a.workers, 'Workers')],
  mehendi_artist: a => [STAFF(a.artists, 'Artists')],
  photography: a => [STAFF(a.team, 'Photographers', a.travel_buffer_minutes)],
  priest_rituals: a => [STAFF(1, 'You', a.prep_minutes)],
  safety_facilities: a => [STAFF(a.staff, 'Staff')],
  security_services: a => [STAFF(a.guards, 'Guards')],
  transportation: a => [{ kind: 'vehicle', key: 'fleet', label: 'Vehicles you can arrange', qty: a.vehicles, unit: 'vehicle' }],
  trousseau_gift_packing: a => [{ kind: 'production', key: 'production', label: 'Sets per day', qty: a.sets_per_day, unit: 'unit_per_day' }],
  valet_parking: a => [STAFF(a.valets, 'Valets')],
  videography: a => [STAFF(a.crew, 'Videographers', a.travel_buffer_minutes)],
  warehouse_storage: (a, rules) => [{ kind: 'capacity', key: 'capacity', label: 'Storage capacity',
    qty: /pallet/i.test(rules?.capacity_period?.label ?? '') ? a.pallet_positions : a.available_sqft,
    unit: /pallet/i.test(rules?.capacity_period?.label ?? '') ? 'pallet' : 'sqft' }],
  wedding_planning: a => [{ kind: 'project', key: 'projects', label: 'Weddings at once', qty: a.concurrent, unit: 'project' }],
}

export function resourcesFor(config, a) {
  const ans = a.answers ?? {}
  const out = (RESOURCE_SOURCES[config.id]?.(ans, a.rules) ?? []).map(r => ({
    kind: r.kind, resource_key: r.key, label: r.label, quantity: Number(r.qty) || 0, unit: r.unit ?? 'unit',
    buffer_minutes: Number(r.buffer) || 0, attributes: {}, private_ref: {},
  }))
  // Catalogue-backed resources: each rental item, vehicle and space is its own stock.
  const items = a.catalogue ?? []
  const m = config.resources.model
  if (m === 'items') for (const it of items) {
    const qty = firstNum(it.answers ?? {}, STOCK_IDS)
    if (qty) out.push({ kind: 'equipment', resource_key: it.item_key, label: itemName(config.catalogue, it.answers), quantity: qty, unit: 'item', buffer_minutes: 0, attributes: {}, private_ref: {} })
  }
  if (m === 'vehicles') {
    for (const it of items) out.push({ kind: 'vehicle', resource_key: it.item_key, label: itemName(config.catalogue, it.answers),
      quantity: Number(it.answers?.count) || 1, unit: 'vehicle', buffer_minutes: Number(ans.turnaround_minutes) || 0,
      attributes: {}, private_ref: it.answers?.registration ? { registration: it.answers.registration } : {} })
    if (Number(ans.drivers) > 0) out.push({ kind: 'staff', resource_key: 'drivers', label: 'Drivers', quantity: Number(ans.drivers), unit: 'person',
      buffer_minutes: Number(ans.turnaround_minutes) || 0, attributes: {}, private_ref: {} })
  }
  if (m === 'spaces') for (const it of items) out.push({ kind: 'space', resource_key: it.item_key, label: itemName(config.catalogue, it.answers),
    quantity: 1, unit: 'space', buffer_minutes: 0, attributes: {}, private_ref: {} })
  return out.filter(r => r.quantity > 0)
}

/* ── Pricing rules ──────────────────────────────────────────────────── */

export const enabledKinds = rules => Object.entries(rules ?? {}).filter(([, r]) => r?.on).map(([k]) => k)

export function ruleDone(kind, r) {
  if (!r?.on) return true
  if (kind === 'quote') return true
  if (!(Number(r.amount_paise) > 0)) return false
  if (kind === 'percentage') return !!r.base && String(r.policy ?? '').trim().length >= 20
  if (r.min_qty != null && r.max_qty != null && Number(r.max_qty) < Number(r.min_qty)) return false
  return true
}
export const pricingDone = (config, a) => {
  const kinds = enabledKinds(a.rules)
  const catPriced = (a.catalogue ?? []).some(it => itemPricePaise(config.catalogue ?? { fields: [] }, it.answers) > 0)
  return (kinds.length > 0 || catPriced) && kinds.every(k => ruleDone(k, a.rules[k]))
}

function rulesOut(rules) {
  return enabledKinds(rules).map(kind => {
    const r = rules[kind]
    if (kind === 'quote') return { kind }
    const amount = Math.round(Number(r.amount_paise) || 0)
    return {
      kind, label: r.label || null, unit: RULE_KINDS[kind]?.unit ?? null, price_mode: r.price_mode ?? 'target_net',
      ...(r.price_mode === 'customer' ? { customer_paise: amount } : { take_home_paise: amount }),
      min_qty: r.min_qty ?? null, max_qty: r.max_qty ?? null, included_qty: r.included_qty ?? null,
      hours: r.hours ?? null, min_hours: kind === 'hour' ? r.min_qty ?? null : null, max_hours: kind === 'hour' ? r.max_qty ?? null : null,
      bands: (r.bands ?? []).filter(b => Number(b.take_home_paise) > 0),
      multi_day: kind === 'multi_day' ? { max_days: r.max_days ?? 3, consecutive_discount_pct: r.discount ?? 0 } : undefined,
      meta: kind === 'percentage' ? { base: r.base, policy: r.policy } : {},
    }
  })
}

/* ── Packages (tier trades) ─────────────────────────────────────────── */

/** Essential / Signature / VIP suggested from the partner's own base rate. */
export function suggestPackages(config, a, policy) {
  const rules = a.rules ?? {}
  const preferred = ['hour', 'session', 'event', 'per_person', 'per_guest', 'full_day', 'half_day']
  const priced = Object.keys(rules).filter(k => rules[k]?.on && Number(rules[k].amount_paise) > 0)
  let basis = preferred.find(k => priced.includes(k)) ?? priced.find(k => k !== 'quote')
  let r = basis ? rules[basis] : null
  // Priced only item by item (per hand, per act…): start from the cheapest item.
  if (!r && config.catalogue) {
    const cheapest = (a.catalogue ?? []).map(it => itemPricePaise(config.catalogue, it.answers)).filter(x => x > 0).sort((x, y) => x - y)[0]
    if (cheapest) { basis = 'item'; r = { amount_paise: cheapest, hours: 4 } }
  }
  if (!r) return []
  const hours = Number(r.min_qty ?? r.hours) || (basis === 'hour' ? 2 : 4)
  const unitQty = basis === 'hour' ? hours : basis === 'per_person' || basis === 'per_guest' ? Number(r.min_qty) || 1 : 1
  const essential = Math.round(Number(r.amount_paise) * unitQty)
  const up = Number(policy?.signature_uplift) || 1.75
  const vip = Number(policy?.vip_factor) || 2
  return [
    { key: 'ESSENTIAL', name: 'Essential', take_home_paise: essential, generated_take_home_paise: essential, hours },
    { key: 'SIGNATURE', name: 'Signature', badge: 'Most popular', take_home_paise: Math.round(essential * up), generated_take_home_paise: Math.round(essential * up), hours: hours * 2 },
    { key: 'VIP', name: 'VIP', take_home_paise: Math.round(essential * vip), generated_take_home_paise: Math.round(essential * vip), hours: hours * 2 },
  ]
}

/* ── The whole payload ──────────────────────────────────────────────── */

export function buildTradePayload(config, a) {
  const ans = a.answers ?? {}, av = a.availability ?? {}, b = a.booking ?? {}, loc = a.location ?? {}
  const { legal_name, work, ...basics } = a.basics ?? {} // eslint-disable-line no-unused-vars
  // Hidden questions never travel; private ones never reach the public profile.
  const visible = Object.fromEntries(Object.entries(ans).filter(([k]) => {
    const q = [...config.screens.flatMap(s => s.questions), ...(config.pricing.fields ?? []), ...(config.resources.fields ?? [])].find(x => x.id === k)
    return !q || holds(q.showWhen, ans)
  }))
  const offered = Object.entries(a.addons ?? {}).filter(([, x]) => x?.on)
  const charges = chargesFrom(config, visible)
  return {
    trade_id: config.id,
    schema_version: config.schemaVersion,
    legal_name,
    profile: { ...basics, events: visible.events ?? visible.event_types ?? [] },
    answers: visible,
    rules: rulesOut(a.rules),
    catalogue: config.catalogue ? (a.catalogue ?? []).map((it, i) => itemOut(config, it, i)) : [],
    packages: config.tiers && config.pricing.packages ? (a.packages ?? []) : [],
    addons: offered.map(([id, x]) => ({
      addon_id: id, label: config.addons.find(d => d.id === id)?.label ?? id,
      unit: config.addons.find(d => d.id === id)?.unit ?? 'per_event',
      take_home_paise: Math.round(Number(x.take_home_paise) || 0), notice_days: x.notice_days ?? 0,
      included_in: (a.packages ?? []).filter(p => (p.inclusions ?? []).includes(id)).map(p => p.key),
    })),
    resources: resourcesFor(config, a),
    booking_rules: {
      instant: b.instant !== false, advance_pct: b.advance_pct, cancellation: b.cancellation,
      custom_quotes: b.custom_quotes !== false || enabledKinds(a.rules).includes('quote'), quote_hours: b.quote_hours,
      min_notice_days: av.min_notice_days, horizon_months: av.horizon_months,
      min_staff: Number(ans.min_staff ?? ans.min_crew ?? ans.min_valets) || undefined,
      charges,
      compliance: complianceFor(config, visible).map(c => c.doc),
    },
    travel_rules: {
      scope: loc.travel_scope, model: av.travel_model, flat_take_home_paise: Math.round(Number(av.travel_fee_paise) || 0) || null,
      per_km_take_home_paise: Math.round(Number(av.travel_per_km_paise) || 0) || null,
    },
    location: {
      lat: loc.lat, lng: loc.lng, formatted_address: loc.formatted_address, state: loc.state, city: loc.city,
      locality: loc.locality, postal_code: loc.postal_code, source: loc.source, confirmed: !!loc.confirmed, travel_scope: loc.travel_scope,
    },
  }
}
