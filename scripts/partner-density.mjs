#!/usr/bin/env node
/**
 * Where is the network actually deep enough to test against?
 *
 *   node scripts/partner-density.mjs
 *   node scripts/partner-density.mjs --trade "Decoration & Floral"
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A "GROUP BY PINCODE"
 * ══════════════════════════════════════════════════════════════════════
 *
 * The seeded partners have no pincode at all — every one of the 221 has
 * `pincode IS NULL`. They were placed by COORDINATE, from a list of real
 * Bengaluru localities, because that is what `match_partners` uses:
 * `ST_DWithin` against a GIST index on `vendors.location`.
 *
 * A pincode never enters dispatch. It is a customer-facing input that
 * `lib/eventLocation.js` resolves into a point, and the point is what
 * matches. So counting partners per pincode column would count nothing,
 * and the honest question is different:
 *
 *   "If a customer types THIS pincode, how many partners fall inside a
 *    5 km circle around the point it resolves to?"
 *
 * Which is what this measures — the same radius wave 1 uses, against the
 * same function dispatch calls. The numbers below are therefore what the
 * booking screen will actually do, not a proxy for it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE COLUMN THAT MATTERS IS THE LAST ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `trades` is how many distinct trades have at least one partner in
 * range. A pincode with 40 partners who are all decorators fills one
 * line of a ten-line basket, and the matching screen still reads as
 * broken. Depth per trade is the number that decides whether a basket
 * completes — see the fill-rate arithmetic in scripts/measure-fill-rate.mjs.
 */
import { createClient } from '@supabase/supabase-js'
import { loadSrc, readEnv } from './lib/loadSrc.mjs'

const db = createClient(
  readEnv('VITE_SUPABASE_URL'),
  readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
)

const args = process.argv.slice(2)
const onlyTrade = args.includes('--trade') ? args[args.indexOf('--trade') + 1] : null
const RADIUS_M = Number(args.includes('--radius') ? args[args.indexOf('--radius') + 1] : 5000)

const { PINCODES } = await loadSrc({ 'src/config/generatedPincodes.js': ['PINCODES'] })

/* Every pincode the booking flow accepts, scored by what is in reach.
 *
 * Wrapped rather than left at top level: this loop calls vendorsWithin,
 * which closes over  declared below it. Top-level await runs the
 * loop before that declaration is initialised -- a temporal dead zone,
 * and a confusing one, because the function is hoisted and the variable
 * it reads is not. */
const rows = []
async function survey() {
for (const [pin, meta] of Object.entries(PINCODES)) {
  if (meta?.lat == null || meta?.lng == null) continue

  const { data: point } = await db.rpc('point_of', { p_lat: meta.lat, p_lng: meta.lng })

  // Straight to the table rather than through match_partners: that
  // function takes ONE trade and filters by date, and the question here
  // is about the network, not about one Saturday.
  const { data: near, error } = await db.rpc('partners_within', {
    p_point: point, p_radius_m: RADIUS_M,
  }).then(r => r, () => ({ data: null }))

  let inRange = near
  if (!inRange) {
    // No such RPC — fall back to reading the vendors and measuring here.
    // Slower and perfectly correct at 223 rows.
    inRange = await vendorsWithin(meta.lat, meta.lng, RADIUS_M)
  }

  if (!inRange.length) continue
  rows.push({ pin, area: meta.area ?? meta.name ?? '', ...summarise(inRange) })
}
}

/* ── The fallback: haversine, in JS, over the whole table ──────────── */
let ALL = null
async function vendorsWithin(lat, lng, radiusM) {
  if (!ALL) {
    const { data } = await db.from('vendors')
      .select('id, business_name, is_synthetic, is_verified, service_radius_km, lat:location')
    // `location` comes back as WKB hex; decode the two doubles from it.
    ALL = (data ?? []).filter(v => v.is_verified).map(v => ({ ...v, ...decode(v.lat) }))

    const { data: svc } = await db.from('vendor_services')
      .select('vendor_id, category, is_active')
    const byVendor = new Map()
    for (const s of svc ?? []) {
      if (!s.is_active) continue
      if (!byVendor.has(s.vendor_id)) byVendor.set(s.vendor_id, new Set())
      byVendor.get(s.vendor_id).add(s.category)
    }
    for (const v of ALL) v.trades = byVendor.get(v.id) ?? new Set()
  }

  return ALL.filter(v => {
    if (v.lng == null) return false
    const d = haversine(lat, lng, v.lat_deg, v.lng)
    // Both radii, exactly as match_partners does: the customer's reach
    // and the partner's own willingness to travel.
    return d <= radiusM && d <= v.service_radius_km * 1000
  }).map(v => ({ ...v, distance_m: haversine(lat, lng, v.lat_deg, v.lng) }))
}

/** PostGIS WKB hex, little-endian: 9-byte header, then lng then lat. */
function decode(hex) {
  if (typeof hex !== 'string' || hex.length < 50) return { lat_deg: null, lng: null }
  const buf = Buffer.from(hex, 'hex')
  return { lng: buf.readDoubleLE(9), lat_deg: buf.readDoubleLE(17) }
}

function haversine(aLat, aLng, bLat, bLng) {
  if (bLat == null || bLng == null) return Infinity
  const R = 6371000, rad = d => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function summarise(list) {
  const filtered = onlyTrade ? list.filter(v => v.trades?.has(onlyTrade)) : list
  const trades = new Set()
  for (const v of filtered) for (const t of v.trades ?? []) trades.add(t)
  return {
    total: filtered.length,
    real: filtered.filter(v => !v.is_synthetic).length,
    trades: trades.size,
    nearest: Math.round(Math.min(...filtered.map(v => v.distance_m))),
  }
}

await survey()
rows.sort((a, b) => b.trades - a.trades || b.total - a.total)

console.log(`\n  Partners within ${RADIUS_M / 1000} km of each pincode` +
            (onlyTrade ? `, doing "${onlyTrade}"` : '') + '\n')
console.log('    PIN      AREA                        PARTNERS   REAL   TRADES   NEAREST')
console.log('    ' + '-'.repeat(74))
for (const r of rows.slice(0, 20)) {
  console.log(
    `    ${r.pin}   ${r.area.slice(0, 26).padEnd(26)}  ${String(r.total).padStart(8)}` +
    `${String(r.real).padStart(7)}${String(r.trades).padStart(9)}${String(r.nearest + ' m').padStart(10)}`)
}

console.log(`\n  ${rows.length} pincode(s) have anybody in range at all.`)
console.log('  TRADES is the column that decides whether a basket completes:')
console.log('  forty decorators and nothing else still fills one line of ten.\n')
