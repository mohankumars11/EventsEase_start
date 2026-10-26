/**
 * The marketplace, read for a customer: who is live for a trade, and one
 * partner's full listing.
 *
 * Everything here comes from what partners published in the partner app
 * and an operator approved — the same rows the partner's own "customer
 * preview" renders. Two engines answer: Anchor & MC predates the shared
 * engine and keeps its own RPCs (anchor_public_listings / _listing); the
 * other 33 trades use public_listings / listing_public. A card needs more
 * than the list RPC returns (a cover photograph, whether it books
 * instantly, the review count), so the LIVE listing versions are read
 * once per list in a single query — anon can read LIVE versions, and
 * nothing private lives in `profile` or `booking_rules`.
 *
 * Nothing is invented: a partner with no photographs gets no stock image,
 * a rating of 0 is "New", and a missing price stays missing.
 */
import { supabase } from '../../lib/supabase'
import { TRADE } from '../data/trades'
import { pickFacets } from './needs'

const BLR = { lat: 12.9716, lng: 77.5946 }
const lists = new Map()
const details = new Map()

const num = v => (v == null || v === '' ? null : Number(v))

/* A rate rule's kind → what the price is per, and how the plan multiplies it. */
const RULE_KIND = {
  hour: ['hour', 'per hour'], session: ['once', 'per session'], event: ['once', 'per event'], half_day: ['once', 'half day'],
  full_day: ['once', 'per day'], multi_day: ['once', 'per day'], per_person: ['once', 'per person'], per_unit: ['unit', 'per unit'],
  per_guest: ['plate', 'per plate'], per_staff_hour: ['hour', 'per staff hour'], per_staff_shift: ['once', 'per staff shift'],
  per_staff_day: ['once', 'per staff day'], per_trip: ['once', 'per trip'], per_km: ['unit', 'per km'], vehicle_hour: ['hour', 'per hour'],
  vehicle_day: ['once', 'per day'], rental: ['unit', 'per item'], space: ['once', 'per slot'], capacity_period: ['unit', 'per sq ft'],
  fixed: ['once', 'fixed'], catalogue: ['unit', 'per item'], percentage: ['unit', 'of budget'],
}
/* A catalogue line's own unit, as the partner chose it in onboarding. */
const ONCE = new Set(['slot', 'space', 'package', 'event', 'booking', 'ceremony', 'act', 'look', 'person', 'session', 'setup', 'cake',
  'dessert table', 'design', 'hamper', 'set', 'box', 'day', 'staff per shift', 'staff per day'])
const HOURLY = new Set(['hour', 'staff per hour'])
const norm = u => String(u ?? '').toLowerCase().replace(/^per[_ ]/, '').replace(/_/g, ' ').trim()
/* A venue's catalogue lines are its spaces, booked a slot at a time. */
const unitLabel = (u, tradeId) => (tradeId === 'venue' ? 'per slot' : `per ${norm(u) || 'item'}`)
const unitKind = (u, tradeId) => (tradeId === 'venue' || ONCE.has(norm(u)) ? 'once' : HOURLY.has(norm(u)) ? 'hour' : 'unit')

function shape(row, version, tradeId) {
  const p = version?.profile ?? {}
  const b = version?.booking_rules ?? {}
  const gallery = (Array.isArray(p.gallery) ? p.gallery : []).map(g => (typeof g === 'string' ? { url: g } : g)).filter(g => g?.url)
  const rating = num(row.rating)
  return {
    serviceId: row.vendor_service_id,
    tradeId,
    name: row.display_name ?? row.stage_name ?? p.display_name ?? 'Partner',
    tagline: row.tagline ?? p.tagline ?? null,
    area: row.city ?? null,
    rating: rating && rating > 0 ? rating : null,
    reviews: num(p.review_count),
    fromPaise: num(row.from_paise),
    distanceKm: num(row.distance_km),
    avatar: row.avatar_url ?? p.avatar_url ?? null,
    cover: p.cover_url ?? gallery[0]?.url ?? row.avatar_url ?? null,
    gallery,
    instant: b.instant === true || b.instant === 'true',
    advancePct: num(b.advance_pct),
    cancellation: b.cancellation ?? null,
    noticeDays: num(b.min_notice_days),
    quoteHours: num(b.quote_hours),
    years: num(p.years),
    languages: Array.isArray(row.languages) ? row.languages.map(l => l?.name ?? l).filter(Boolean) : [],
  }
}

/** Live partners for one trade, nearest first when a location is known. */
export function partnersFor(tradeId, { lat = BLR.lat, lng = BLR.lng, limit = 40 } = {}) {
  const key = `${tradeId}|${lat.toFixed(3)}|${lng.toFixed(3)}`
  if (lists.has(key)) return lists.get(key)
  const t = TRADE[tradeId]
  const job = (async () => {
    if (!t) return []
    const args = { p_trade: t.name, p_lat: lat, p_lng: lng, p_limit: limit }
    const { data, error } = await supabase.rpc(tradeId === 'anchor_mc' ? 'anchor_public_listings' : 'public_listings', args)
    if (error) throw error
    const rows = data ?? []
    if (!rows.length) return []
    const { data: versions } = await supabase.from('sambramo_listing_versions')
      .select('id, vendor_service_id, profile, booking_rules, answers').eq('status', 'LIVE')
      .in('vendor_service_id', rows.map(r => r.vendor_service_id))
    const byId = Object.fromEntries((versions ?? []).map(v => [v.vendor_service_id, v]))
    /* What "from" is a price OF. public_listings returns the minimum across
       packages, catalogue lines and rate rules, which for a photographer is
       their HOURLY rate — shown bare, it reads as the price of the day. So
       the parts are read once per list (all LIVE, all anon-readable) and the
       card shows the figure a customer planning an event can use: the
       cheapest package, else the cheapest menu per plate, else the cheapest
       catalogue line in its own unit, else the rate in its own unit. */
    const vids = (versions ?? []).map(v => v.id)
    const [pk, mn, ct, rr] = vids.length ? await Promise.all([
      supabase.from('sambramo_trade_packages').select('listing_version_id, name, trade_inputs, commercial_inputs').eq('status', 'LIVE').in('listing_version_id', vids),
      tradeId === 'catering_food' ? supabase.from('sambramo_catering_menus').select('listing_version_id, menu_key, name, customer_paise, min_guests, diet, cuisine_ids').eq('status', 'active').in('listing_version_id', vids) : { data: [] },
      supabase.from('sambramo_catalogue_items').select('listing_version_id, item_key, name, unit, customer_paise, min_qty').eq('active', true).in('listing_version_id', vids),
      supabase.from('sambramo_rate_rules').select('listing_version_id, rule_kind, customer_paise').in('listing_version_id', vids),
    ]) : [{}, {}, {}, {}]
    const best = {}
    const offer = (vid, rank, paise, kind, unit, label = null, ref = null) => {
      const n = Number(paise)
      if (!(n > 0)) return
      const cur = best[vid]
      if (!cur || rank < cur.rank || (rank === cur.rank && n < cur.paise)) best[vid] = { rank, paise: n, kind, unit, label, ref }
    }
    for (const x of pk.data ?? []) offer(x.listing_version_id, 0, x.trade_inputs?.customer_paise, 'package', 'package', x.name, { type: 'package', key: x.commercial_inputs?.tier ?? null, hours: Number(x.trade_inputs?.duration_hours) || null })
    for (const x of mn.data ?? []) offer(x.listing_version_id, 1, x.customer_paise, 'plate', 'per plate', x.name, { type: 'menu', key: x.menu_key, minQty: x.min_guests })
    /* A vehicle is priced by the trip but booked as a vehicle: remember the first one,
       priced or not, so the request can name it (the engine asks "choose a vehicle"). */
    const firstItem = {}
    for (const x of ct.data ?? []) if (!firstItem[x.listing_version_id]) firstItem[x.listing_version_id] = x.item_key
    for (const x of ct.data ?? []) offer(x.listing_version_id, 2, x.customer_paise, unitKind(x.unit, tradeId), unitLabel(x.unit, tradeId), x.name, { type: 'item', key: x.item_key, minQty: Number(x.min_qty) || 1 })
    for (const x of rr.data ?? []) offer(x.listing_version_id, 3, x.customer_paise, RULE_KIND[x.rule_kind]?.[0] ?? 'unit', RULE_KIND[x.rule_kind]?.[1] ?? 'onwards', null, { type: 'rule', key: x.rule_kind })
    return rows.map(r => {
      const v = byId[r.vendor_service_id]
      const p = shape(r, v, tradeId)
      const b = v && best[v.id]
      if (b) Object.assign(p, { fromPaise: b.paise, fromKind: b.kind, fromUnit: b.unit, fromLabel: b.label, fromRef: b.ref })
      else Object.assign(p, { fromKind: 'unit', fromUnit: 'onwards', fromLabel: null, fromRef: null })
      if (TRADE[tradeId]?.archetype === 'TRIP_VEHICLE' && v && firstItem[v.id]) p.fromRef = { ...(p.fromRef ?? { type: 'rule', key: null }), vehicle: firstItem[v.id] }
      /* What the master told us in onboarding, for matching a customer's
         requirements (lib/needs.js). Only the keys a requirement reads are
         kept — never licence numbers or declarations. */
      const menus = (mn.data ?? []).filter(m => m.listing_version_id === v?.id)
      p.facets = { ...pickFacets(tradeId, v?.answers), diets: [...new Set(menus.map(m => m.diet).filter(Boolean))],
        cuisines: [...new Set([...(v?.answers?.cuisines ?? []), ...menus.flatMap(m => m.cuisine_ids ?? [])])] }
      return p
    })
  })()
  lists.set(key, job)
  job.catch(() => lists.delete(key))
  return job
}

/**
 * Order a list the way a customer would want it, and say why the top of
 * each order is there. The reasons are facts from the rows ("Closest",
 * "Top rated"), never marketing.
 */
export function rank(partners, { budgetPaise = null } = {}) {
  if (!partners?.length) return []
  const score = p => (p.rating ?? 4.2) * 22 + Math.min(p.reviews ?? 0, 400) / 40 + (p.instant ? 8 : 0)
    - (p.distanceKm ?? 8) * 1.2 - (budgetPaise && p.fromPaise > budgetPaise ? 25 : 0)
  const sorted = [...partners].sort((a, b) => score(b) - score(a))
  const tag = (pick, label) => { const p = pick(); if (p && !p.reason) p.reason = label }
  const out = sorted.map(p => ({ ...p, reason: null }))
  out[0].reason = 'Best match'
  tag(() => [...out].filter(p => p.distanceKm != null).sort((a, b) => a.distanceKm - b.distanceKm)[0], 'Closest')
  tag(() => [...out].filter(p => p.rating).sort((a, b) => b.rating - a.rating || (b.reviews ?? 0) - (a.reviews ?? 0))[0], 'Top rated')
  tag(() => [...out].filter(p => p.fromPaise).sort((a, b) => a.fromPaise - b.fromPaise)[0], 'Best price')
  return out
}

export const SORTS = {
  best: { label: 'Best match', fn: list => rank(list) },
  near: { label: 'Nearest', fn: list => [...list].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)) },
  rated: { label: 'Top rated', fn: list => [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)) },
  price: { label: 'Price: low to high', fn: list => [...list].sort((a, b) => (a.fromPaise ?? 9e15) - (b.fromPaise ?? 9e15)) },
}

/**
 * One partner's full listing, in the shape the shared storefront reads.
 * `media` is the partner's own gallery — the same frames the partner sees
 * in their preview, in the same order.
 */
export function partnerDetail(serviceId, tradeId) {
  const key = serviceId
  if (details.has(key)) return details.get(key)
  const job = (async () => {
    const anchor = tradeId === 'anchor_mc'
    const { data, error } = await supabase.rpc(anchor ? 'anchor_public_listing' : 'listing_public', { p_vendor_service_id: serviceId })
    if (error) throw error
    if (!data) return null
    const { data: v } = await supabase.from('sambramo_listing_versions').select('profile, booking_rules')
      .eq('vendor_service_id', serviceId).eq('status', 'LIVE').maybeSingle()
    const gallery = (v?.profile?.gallery ?? []).map(g => (typeof g === 'string' ? { url: g } : g)).filter(g => g?.url)
    const media = gallery.map((g, i) => ({ id: `${serviceId}-${i}`, kind: 'photo', url: g.url, caption: null, review_status: 'live' }))
    return { anchor, listing: data, media, profile: v?.profile ?? {}, booking: v?.booking_rules ?? {} }
  })()
  details.set(key, job)
  job.catch(() => details.delete(key))
  return job
}
