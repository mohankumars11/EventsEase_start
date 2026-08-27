#!/usr/bin/env node
/**
 * A synthetic Bengaluru partner network, for measuring dispatch.
 *
 *   node scripts/seed-partner-network.mjs --dry-run     # print, write nothing
 *   node scripts/seed-partner-network.mjs               # write to Supabase
 *   node scripts/seed-partner-network.mjs --purge       # remove synthetic rows
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE PARTNERS ARE INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious way to get 400 Bengaluru decorators into a database is to
 * scrape Google Maps or JustDial. It is against both services' terms, and
 * far more seriously: the moment dispatch pushes a booking notification
 * at a business that never signed up, we are processing a real person's
 * contact data with no lawful basis under the DPDP Act 2023.
 *
 * So every row here is invented, and better for the purpose. A scraped
 * network gives you whatever density Google happens to list; a generated
 * one lets the density be SET — which is the entire point, because the
 * number this seed exists to produce is the fill rate, and a fill rate
 * measured against an unknown distribution measures nothing.
 *
 * Every row carries `is_synthetic = true`. `match_partners()` (migration
 * 060) defaults to excluding them, so forgetting the flag fails safe.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DENSITY, NOT COVERAGE
 * ══════════════════════════════════════════════════════════════════════
 *
 * 400 partners spread evenly over Bengaluru would produce a fill rate the
 * real world will never reproduce, and would make the pilot look viable
 * when it is not. Real supply clusters, and a pilot should cluster on
 * purpose.
 *
 * So localities are tiered (see scripts/data/bengaluru-localities.json):
 * tier 1 gets deep supply, tier 3 stays deliberately thin. The fill-rate
 * measurement then shows what a Koramangala booking and an Anekal
 * booking actually look like, which is the difference between "launch in
 * Bengaluru" and "launch in three micro-markets" — and that is a real
 * decision this data should inform rather than obscure.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SATURDAYS ARE SCARCE, BECAUSE THEY ARE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Event demand is not spread across the week. It lands on weekends and on
 * auspicious dates, and supply on those days is genuinely contested. A
 * seed with uniform availability would show a fill rate that only holds
 * on a Wednesday — the one day nobody books a wedding.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadSrc, readEnv, ROOT } from './lib/loadSrc.mjs'

const DRY   = process.argv.includes('--dry-run')
const PURGE = process.argv.includes('--purge')

/**
 * How mature a network to model.
 *
 * ── The mistake this exists to prevent ───────────────────────────────
 * Seeding at full density models the supply Bengaluru HAS, not the
 * supply Sambramo will have. The city holds thousands of decorators; a
 * new platform in month one holds the forty who signed up. A fill rate
 * measured against the former is a number nobody can act on, and it will
 * be flattering.
 *
 * So the seed models a MOMENT in the network's growth, and the useful
 * output is the curve rather than any single figure: what does a booking
 * look like at launch, at month three, at maturity — and therefore how
 * much supply must be signed before instant booking is worth switching
 * on at all.
 *
 *   --scale=launch    ~8%   the forty-odd partners of week one
 *   --scale=early     ~25%  a few months of signups
 *   --scale=growing   ~55%
 *   --scale=mature   100%   what the city actually holds
 */
const SCALES = { launch: 0.08, early: 0.25, growing: 0.55, mature: 1 }
const scaleArg = (process.argv.find(a => a.startsWith('--scale=')) ?? '').split('=')[1]
const SCALE_NAME = scaleArg && scaleArg in SCALES ? scaleArg : 'early'
const SCALE = SCALES[SCALE_NAME]

/* ── Deterministic randomness ──────────────────────────────────────────
 * Seeded, so two runs produce the same network. A fill rate that moves
 * because the seeder rolled different dice is a fill rate you cannot act
 * on — you would never know whether a change helped or the dice did. */
let _s = 20260827
const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = arr => arr[Math.floor(rnd() * arr.length)]
const between = (lo, hi) => lo + rnd() * (hi - lo)
const intBetween = (lo, hi) => Math.floor(between(lo, hi + 1))

/* ── Name parts ────────────────────────────────────────────────────────
 * Assembled rather than listed, so no generated name is a real
 * business's name by anything but coincidence — and a collision is
 * visible as one, because the shapes are obviously templated. */
const PREFIX = [
  'Sri', 'Sree', 'New', 'Royal', 'Grand', 'Classic', 'Golden', 'Silver',
  'Divine', 'Bliss', 'Elite', 'Prime', 'Star', 'Crown', 'Lotus', 'Vibe',
]
const STEM = [
  'Lakshmi', 'Ganesh', 'Venkateshwara', 'Chamundi', 'Kaveri', 'Nandi',
  'Malnad', 'Mysore', 'Deccan', 'Vrindavan', 'Anugraha', 'Sanjeevini',
  'Meenakshi', 'Basava', 'Hoysala', 'Vijaya', 'Aditya', 'Suvarna',
]
const SUFFIX_FOR_TRADE = {
  'Decoration & Floral':   ['Decorators', 'Decors', 'Events & Decor', 'Flower Decorators'],
  'Catering & Food':       ['Caterers', 'Catering Service', 'Kitchen', 'Food Service'],
  'Cake & Desserts':       ['Bakes', 'Bakery', 'Cake Studio', 'Confectioners'],
  'Photography':           ['Studio', 'Photography', 'Clicks', 'Frames'],
  'Videography':           ['Films', 'Motion Pictures', 'Video Works'],
  'DJ & Music':            ['Sounds', 'DJ Works', 'Audio', 'Beats'],
  'Live Entertainment':    ['Kalavrinda', 'Performers', 'Troupe', 'Arts'],
  'Anchor & MC':           ['Events', 'Hosts', 'Stage Company'],
  'Bridal Makeup & Hair':  ['Makeovers', 'Beauty Studio', 'Salon', 'Bridal Studio'],
  'Mehendi Artist':        ['Mehendi', 'Henna Art', 'Mehendi Studio'],
  'Tent & Furniture':      ['Tent House', 'Furniture', 'Event Rentals', 'Shamiana'],
  'Event Lighting':        ['Lights', 'Illuminations', 'Lighting Works'],
  'Sound & AV':            ['AV Systems', 'Sound Systems', 'Audio Visual'],
  'Invitation & Printing': ['Printers', 'Print House', 'Cards & Prints'],
  'Transportation':        ['Travels', 'Transport', 'Cabs'],
  'Security Services':     ['Security', 'Protection Services'],
  'Venue':                 ['Convention Hall', 'Banquets', 'Kalyana Mantapa', 'Gardens'],
}

/**
 * How many partners per trade, per tier-1 locality.
 *
 * Roughly mirrors how the real trade is distributed: decorators and cooks
 * are everywhere, mehendi artists and dhol troupes are not, and venues
 * are few and fixed. Getting this ordering wrong would make the fill rate
 * optimistic for exactly the services that are hardest to fill.
 */
const DENSITY = {
  'Decoration & Floral':   6,
  'Catering & Food':       5,
  'Cake & Desserts':       4,
  'Photography':           4,
  'Tent & Furniture':      3,
  'DJ & Music':            3,
  'Videography':           2,
  'Bridal Makeup & Hair':  2,
  'Event Lighting':        2,
  'Mehendi Artist':        2,
  'Live Entertainment':    2,
  'Sound & AV':            1,
  'Anchor & MC':           1,
  'Invitation & Printing': 1,
  'Transportation':        1,
  'Security Services':     1,
  'Venue':                 1,
}

/** Tier 1 gets full density, tier 2 about half, tier 3 barely any. */
const TIER_WEIGHT = { 1: 1, 2: 0.45, 3: 0.15 }

function jitter(lat, lng) {
  // ±~1.2 km, so partners sit around a locality rather than on its exact
  // centroid — which would make every distance in a locality identical
  // and the rating/distance sort meaningless.
  return {
    lat: lat + between(-0.011, 0.011),
    lng: lng + between(-0.011, 0.011),
  }
}

/**
 * Ratings, skewed high and capped.
 *
 * Real marketplace ratings cluster at 4.2–4.9 — a 2.0 partner is
 * delisted long before they accumulate reviews. A uniform 1–5 spread
 * would make `ORDER BY rating DESC` in match_partners() sort on noise
 * that does not exist in production.
 */
const rating = () => Math.round(between(4.0, 4.9) * 10) / 10

function buildNetwork(localities) {
  const partners = []

  for (const loc of localities) {
    const weight = TIER_WEIGHT[loc.tier] ?? 0.15

    for (const [trade, perLocality] of Object.entries(DENSITY)) {
      // Fractional counts are resolved probabilistically rather than
      // rounded, or every trade with `perLocality * weight * SCALE < 0.5`
      // would vanish entirely at launch scale — and "no mehendi artists
      // exist" is a very different finding from "there is one".
      const exact = perLocality * weight * SCALE
      const count = Math.floor(exact) + (rnd() < (exact % 1) ? 1 : 0)
      for (let i = 0; i < count; i++) {
        const at = jitter(loc.lat, loc.lng)
        const suffixes = SUFFIX_FOR_TRADE[trade] ?? ['Services']
        partners.push({
          business_name: `${pick(PREFIX)} ${pick(STEM)} ${pick(suffixes)}`,
          trade,
          category: trade,
          city: 'Bengaluru',
          area: loc.name,
          market: loc.market,
          tier: loc.tier,
          lat: at.lat,
          lng: at.lng,
          // A partner who will not cross town is the common case, and it
          // is the constraint that makes a radius search meaningful.
          service_radius_km: pick([5, 8, 10, 10, 12, 15, 20]),
          rating_avg: rating(),
          is_verified: true,
          is_synthetic: true,
        })
      }
    }
  }
  return partners
}

/**
 * Availability, weighted so weekends are contested.
 *
 * Rows are written only for days a partner is BLOCKED or LIMITED —
 * `vendor_availability` (021) records exceptions, not a full calendar,
 * and match_partners() treats a missing row as available.
 */
function buildAvailability(partners, days = 90) {
  const rows = []
  const today = new Date()

  for (const [idx, p] of partners.entries()) {
    for (let d = 1; d <= days; d++) {
      const date = new Date(today.getTime() + d * 86400000)
      const dow = date.getDay()          // 0 Sun … 6 Sat
      const weekend = dow === 0 || dow === 6

      // A weekend is booked out far more often than a Tuesday. These are
      // the numbers that decide whether the fill rate is honest.
      const blockChance = weekend ? 0.42 : 0.08
      if (rnd() < blockChance) {
        rows.push({
          _partnerIdx: idx,
          slot_date: date.toISOString().slice(0, 10),
          status: 'BLOCKED',
          note: 'Seeded — already booked',
        })
      }
    }
  }
  return rows
}

/* ── Report ────────────────────────────────────────────────────────── */
function report(partners, availability, tradeServices) {
  const byTrade = {}, byTier = {}, byMarket = {}
  for (const p of partners) {
    byTrade[p.trade] = (byTrade[p.trade] ?? 0) + 1
    byTier[p.tier]   = (byTier[p.tier]   ?? 0) + 1
    byMarket[p.market] = (byMarket[p.market] ?? 0) + 1
  }

  console.log(`\n  ${partners.length} partners across ${Object.keys(byMarket).length} markets\n`)

  console.log('  By trade')
  for (const [t, n] of Object.entries(byTrade).sort((a, b) => b[1] - a[1])) {
    const services = (tradeServices[t] ?? []).length
    console.log(`    ${t.padEnd(24)} ${String(n).padStart(4)}   covers ${services} service${services === 1 ? '' : 's'}`)
  }

  console.log('\n  By tier (density, not coverage)')
  for (const [t, n] of Object.entries(byTier).sort()) {
    console.log(`    tier ${t}  ${String(n).padStart(4)}  ${'█'.repeat(Math.round(n / 8))}`)
  }

  console.log('\n  By market')
  for (const [m, n] of Object.entries(byMarket).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${m.padEnd(14)} ${String(n).padStart(4)}`)
  }

  const blocked = availability.length
  const slots = partners.length * 90
  console.log(`\n  Availability: ${blocked} blocked days of ${slots} (${(blocked / slots * 100).toFixed(1)}%)`)
  const weekendBlocks = availability.filter(a => {
    const d = new Date(a.slot_date).getDay()
    return d === 0 || d === 6
  }).length
  console.log(`    of which weekend: ${weekendBlocks} (${(weekendBlocks / blocked * 100).toFixed(0)}%)`)
}

/* ── Main ──────────────────────────────────────────────────────────── */
const { localities } = JSON.parse(
  readFileSync(join(ROOT, 'scripts/data/bengaluru-localities.json'), 'utf8'),
)

const M = await loadSrc({
  'src/config/vendor.js':      ['SERVICES_FOR_TRADE'],
  'src/lib/instantPricing.js': ['priceLine'],
})

const partners = buildNetwork(localities)
const availability = buildAvailability(partners)

report(partners, availability, M.SERVICES_FOR_TRADE)

if (DRY) {
  console.log('\n  --dry-run: nothing written.\n')
  console.log('  Sample rows:')
  for (const p of partners.slice(0, 5)) {
    console.log(`    ${p.business_name.padEnd(38)} ${p.area.padEnd(18)} ${p.service_radius_km}km  ★${p.rating_avg}`)
  }
  console.log()
  process.exit(0)
}

const url = readEnv('VITE_SUPABASE_URL')
const key = readEnv('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('\n  Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  console.error('  They are in .env — load it, or run with --dry-run to see the network without writing.\n')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

if (PURGE) {
  const { error, count } = await db.from('vendors').delete({ count: 'exact' }).eq('is_synthetic', true)
  if (error) { console.error('  purge failed:', error.message); process.exit(1) }
  console.log(`\n  Purged ${count} synthetic partners.\n`)
  process.exit(0)
}

/* ══════════════════════════════════════════════════════════════════════
   Writing
   ══════════════════════════════════════════════════════════════════════
   Chunked, because 200-plus rows in one insert is one timeout away from a
   half-seeded network — and a half-seeded network produces a fill rate
   that is wrong in a way nothing announces. */
const CHUNK = 100
const chunks = a => Array.from({ length: Math.ceil(a.length / CHUNK) },
  (_, i) => a.slice(i * CHUNK, i * CHUNK + CHUNK))

console.log('\n  Writing…')

/* 1 · Partners.
 * `profile_id` is deliberately absent. Migration 071 makes it nullable
 * for synthetic rows precisely so a seeded business has no account
 * anybody can sign in as. */
const vendorRows = partners.map(p => ({
  business_name:       p.business_name,
  category:            p.category,
  city:                p.city,
  area:                p.area,
  service_radius_km:   p.service_radius_km,
  rating_avg:          p.rating_avg,
  is_verified:         true,
  verification_status: 'approved',
  verified_at:         new Date().toISOString(),
  is_synthetic:        true,
  listed_by:           'import',
  description:         `Seeded ${p.trade.toLowerCase()} partner in ${p.area}.`,
}))

const inserted = []
for (const [i, batch] of chunks(vendorRows).entries()) {
  const { data, error } = await db.from('vendors').insert(batch).select('id')
  if (error) { console.error(`\n  partners batch ${i + 1} failed: ${error.message}`); process.exit(1) }
  inserted.push(...data)
  process.stdout.write(`\r    partners      ${inserted.length}/${vendorRows.length}`)
}
console.log()

/* 2 · Location.
 * PostgREST cannot write a geography column, so this goes through
 * set_vendor_location() — which routes through point_of() and therefore
 * through the India bounding box. There is no path that skips it. */
let located = 0, rejected = 0
for (const [i, row] of inserted.entries()) {
  const p = partners[i]
  const { data, error } = await db.rpc('set_vendor_location', {
    p_vendor_id: row.id, p_lat: p.lat, p_lng: p.lng,
  })
  if (error) { console.error(`\n  location rpc failed: ${error.message}`); process.exit(1) }
  if (data?.ok) located++
  else { rejected++; if (rejected <= 3) console.log(`\n    rejected ${p.area}: ${data?.detail ?? data?.reason}`) }
  if (located % 25 === 0) process.stdout.write(`\r    located       ${located}/${inserted.length}`)
}
console.log(`\r    located       ${located}/${inserted.length}${rejected ? ` (${rejected} REJECTED)` : ''}`)

// A partner with no location is invisible to match_partners(). Silence
// here would produce an empty network that looks like a supply problem.
if (rejected) { console.error(`\n  ${rejected} coordinate(s) rejected — the network is incomplete.\n`); process.exit(1) }

/* 3 · Price lists.
 * Not decoration: match_partners() joins on vendor_services.category, so
 * a partner with no rows here is undispatchable. */
const serviceRows = []
for (const [i, row] of inserted.entries()) {
  const p = partners[i]
  for (const serviceId of (M.SERVICES_FOR_TRADE[p.trade] ?? [])) {
    const line = M.priceLine({ serviceId, guestCount: 80 })
    serviceRows.push({
      vendor_id: row.id,
      name: line?.serviceName ?? serviceId,
      category: p.trade,
      // The partner's OWN catalogue price, and never what instant
      // dispatch charges — lib/instantPricing.js does not read this
      // column. Seeded near the platform rate so the concierge side has
      // something plausible to source from.
      price: line ? Math.round(line.rupees * between(0.85, 1.2)) : null,
      unit: 'per event',
      is_active: true,
    })
  }
}
let svc = 0
for (const [i, batch] of chunks(serviceRows).entries()) {
  const { error } = await db.from('vendor_services').insert(batch)
  if (error) { console.error(`\n  services batch ${i + 1} failed: ${error.message}`); process.exit(1) }
  svc += batch.length
  process.stdout.write(`\r    price lines   ${svc}/${serviceRows.length}`)
}
console.log()

/* 4 · Blocked days. Weekends are contested; a uniform calendar would give
 * a fill rate that only holds on a Wednesday. */
const availRows = availability.map(a => ({
  vendor_id: inserted[a._partnerIdx].id,
  slot_date: a.slot_date,
  status:    a.status,
  note:      a.note,
}))
let days = 0
for (const batch of chunks(availRows)) {
  const { error } = await db.from('vendor_availability').insert(batch)
  if (error) { console.error(`\n  availability failed: ${error.message}`); process.exit(1) }
  days += batch.length
  process.stdout.write(`\r    blocked days  ${days}/${availRows.length}`)
}
console.log()

console.log(`\n  Seeded ${inserted.length} partners · ${serviceRows.length} price lines · ${availRows.length} blocked days`)
console.log(`  Scale "${SCALE_NAME}". Purge with --purge before reseeding at a different scale.\n`)
