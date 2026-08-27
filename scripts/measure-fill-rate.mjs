#!/usr/bin/env node
/**
 * Can this network actually fill a booking?
 *
 *   node scripts/measure-fill-rate.mjs
 *   node scripts/measure-fill-rate.mjs --runs=2000 --verbose
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS MEASURES, AND WHAT IT DELIBERATELY DOES NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * It measures REACHABILITY: for a real point, a real date and a real
 * trade, does `match_partners()` return anybody at all.
 *
 * It does NOT measure acceptance. Whether a master taps ACCEPT depends on
 * whether the fee is worth their Saturday, and no synthetic network can
 * answer that — the seeded partners have no opinion about money.
 *
 *   true fill rate  =  reachability  ×  accept rate
 *
 * So every number printed below is a CEILING. Real fill will be lower,
 * by however much masters decline. That matters because the temptation
 * is to read a 90% here as "we are fine" — it means "the supply exists;
 * whether it says yes is the next question, and the rate card decides
 * it".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE ALL-LINES NUMBER IS THE ONE THAT DECIDES
 * ══════════════════════════════════════════════════════════════════════
 *
 * A customer asking for five services does not experience five
 * independent outcomes. They experience one: did my birthday get sorted.
 * And independent probabilities compound viciously —
 *
 *   90% per line  →  59% of five-line baskets complete
 *   80% per line  →  33%
 *   70% per line  →  17%
 *
 * A per-line rate that looks healthy can sit on top of a product that
 * fails two customers in three. That is the number to argue about.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadSrc, readEnv, ROOT } from './lib/loadSrc.mjs'

const RUNS = Number((process.argv.find(a => a.startsWith('--runs=')) ?? '').split('=')[1]) || 600
const VERBOSE = process.argv.includes('--verbose')

const db = createClient(readEnv('VITE_SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } })

const M = await loadSrc({
  'src/config/vendor.js':        ['tradeFor'],
  'src/config/instantBooking.js': ['WAVES', 'DEFAULT_RADIUS_KM', 'MAX_RADIUS_KM'],
})

/* Deterministic, so a change in the rate card or the seed is the only
 * thing that can move these numbers. */
let _s = 7717
const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = a => a[Math.floor(rnd() * a.length)]

/* ── The baskets people actually book ─────────────────────────────────
 * Not a random draw from 34 services: real baskets cluster, and a
 * uniform sample would over-weight the rare trades and make the product
 * look worse than it is. These are the shapes the occasion catalogue
 * implies. */
const BASKETS = [
  { occasion: 'Birthday at home',   services: ['decor', 'cake', 'photography'] },
  { occasion: 'Birthday, bigger',   services: ['decor', 'cake', 'photography', 'dj', 'catering'] },
  { occasion: 'Naming ceremony',    services: ['decor', 'catering', 'photography', 'priest'] },
  { occasion: 'Housewarming',       services: ['decor', 'catering', 'priest', 'cake'] },
  { occasion: 'Anniversary',        services: ['decor', 'cake', 'photography', 'live_music'] },
  { occasion: 'Engagement',         services: ['decor', 'catering', 'photography', 'videography', 'makeup', 'dj'] },
  { occasion: 'Mehendi evening',    services: ['mehendi', 'decor', 'photography', 'dj'] },
  { occasion: 'Reception',          services: ['venue', 'decor', 'catering', 'photography', 'videography', 'dj', 'makeup'] },
]

const { localities: LOCS } = JSON.parse(
  readFileSync(join(ROOT, 'scripts/data/bengaluru-localities.json'), 'utf8'))

/** The next N dates, tagged weekend or weekday. */
function dates(n = 60) {
  const out = []
  for (let i = 3; i < n; i++) {
    const d = new Date(Date.now() + i * 86400000)
    const dow = d.getDay()
    out.push({ iso: d.toISOString().slice(0, 10), weekend: dow === 0 || dow === 6 })
  }
  return out
}
const DATES = dates()

/**
 * One line, dispatched through the real wave ladder.
 *
 * Waves matter to the measurement: a line that fails at 5 km and
 * succeeds at 10 km is a FILL, just a slower one. Measuring only the
 * first wave would understate the product; ignoring waves entirely would
 * overstate how fast it feels.
 */
async function fillLine({ trade, point, radiusKm, date }) {
  for (const wave of M.WAVES) {
    const radius = Math.min(radiusKm * wave.radiusMultiplier, M.MAX_RADIUS_KM)
    const { data, error } = await db.rpc('match_partners', {
      p_trade: trade, p_point: point, p_radius_m: Math.round(radius * 1000),
      p_date: date, p_allow_synthetic: true, p_limit: wave.partners, p_exclude: [],
    })
    if (error) throw new Error(`match_partners: ${error.message}`)
    if (data?.length) return { filled: true, wave: wave.wave, reached: data.length }
  }
  return { filled: false, wave: null, reached: 0 }
}

/* ── Run ───────────────────────────────────────────────────────────── */
console.log(`\n  Measuring ${RUNS} bookings against the seeded network…\n`)

const points = new Map()
async function pointFor(loc) {
  if (!points.has(loc.name)) {
    const { data } = await db.rpc('point_of', { p_lat: loc.lat, p_lng: loc.lng })
    points.set(loc.name, data)
  }
  return points.get(loc.name)
}

const stat = () => ({ lines: 0, filled: 0, baskets: 0, complete: 0 })
const overall = stat()
const byTier = {}, byMarket = {}, byTrade = {}, byDay = { weekend: stat(), weekday: stat() }
const byWave = { 1: 0, 2: 0, 3: 0 }

for (let i = 0; i < RUNS; i++) {
  const loc = pick(LOCS)
  const basket = pick(BASKETS)
  const date = pick(DATES)
  const point = await pointFor(loc)
  const radiusKm = M.DEFAULT_RADIUS_KM

  const tierKey = `tier ${loc.tier}`
  byTier[tierKey]    ??= stat()
  byMarket[loc.market] ??= stat()
  const dayKey = date.weekend ? 'weekend' : 'weekday'

  let allFilled = true
  for (const serviceId of basket.services) {
    const trade = M.tradeFor(serviceId)
    if (!trade) continue

    const r = await fillLine({ trade, point, radiusKm, date: date.iso })

    byTrade[trade] ??= { lines: 0, filled: 0 }
    byTrade[trade].lines++
    for (const b of [overall, byTier[tierKey], byMarket[loc.market], byDay[dayKey]]) b.lines++

    if (r.filled) {
      byTrade[trade].filled++
      byWave[r.wave]++
      for (const b of [overall, byTier[tierKey], byMarket[loc.market], byDay[dayKey]]) b.filled++
    } else {
      allFilled = false
      if (VERBOSE) console.log(`    miss  ${trade.padEnd(22)} ${loc.name.padEnd(18)} ${date.iso}`)
    }
  }

  for (const b of [overall, byTier[tierKey], byMarket[loc.market], byDay[dayKey]]) {
    b.baskets++
    if (allFilled) b.complete++
  }

  if ((i + 1) % 50 === 0) process.stdout.write(`\r    ${i + 1}/${RUNS}`)
}
console.log('\r' + ' '.repeat(20))

/* ── Report ────────────────────────────────────────────────────────── */
const pct = (a, b) => b === 0 ? '  —  ' : (a / b * 100).toFixed(1).padStart(5) + '%'
const bar = (a, b) => b === 0 ? '' : '█'.repeat(Math.round(a / b * 24))

console.log('  ── Overall ' + '─'.repeat(52))
console.log(`     per-line reachability   ${pct(overall.filled, overall.lines)}   (${overall.filled}/${overall.lines})`)
console.log(`     complete baskets        ${pct(overall.complete, overall.baskets)}   (${overall.complete}/${overall.baskets})`)

console.log('\n  ── By trade ' + '─'.repeat(51))
for (const [t, s] of Object.entries(byTrade).sort((a, b) => a[1].filled / a[1].lines - b[1].filled / b[1].lines)) {
  const flag = s.filled / s.lines < 0.5 ? '  ← SUPPLY GAP' : ''
  console.log(`     ${t.padEnd(22)} ${pct(s.filled, s.lines)} ${bar(s.filled, s.lines).padEnd(24)}${flag}`)
}

console.log('\n  ── By locality tier ' + '─'.repeat(43))
for (const [k, s] of Object.entries(byTier).sort()) {
  console.log(`     ${k.padEnd(22)} ${pct(s.filled, s.lines)}   baskets ${pct(s.complete, s.baskets)}`)
}

console.log('\n  ── Weekend vs weekday ' + '─'.repeat(41))
for (const [k, s] of Object.entries(byDay)) {
  console.log(`     ${k.padEnd(22)} ${pct(s.filled, s.lines)}   baskets ${pct(s.complete, s.baskets)}`)
}

console.log('\n  ── How far we had to go ' + '─'.repeat(38))
const totalWaves = byWave[1] + byWave[2] + byWave[3]
for (const w of [1, 2, 3]) {
  const km = M.DEFAULT_RADIUS_KM * (M.WAVES[w - 1]?.radiusMultiplier ?? 1)
  console.log(`     wave ${w} (${String(km).padStart(2)} km)         ${pct(byWave[w], totalWaves)}`)
}

/* ── The verdict ───────────────────────────────────────────────────── */
const perLine = overall.filled / overall.lines
const weekendLine = byDay.weekend.filled / byDay.weekend.lines
console.log('\n  ' + '═'.repeat(62))
console.log('\n  These are CEILINGS. True fill = reachability × accept rate,')
console.log('  and no synthetic partner has an opinion about money.\n')

const gaps = Object.entries(byTrade).filter(([, s]) => s.filled / s.lines < 0.5).map(([t]) => t)
if (gaps.length) {
  console.log(`  ${gaps.length} trade(s) below 50% — recruit here first:`)
  for (const g of gaps) console.log(`     · ${g}`)
  console.log()
}

if (weekendLine >= 0.9) {
  console.log('  ✓ Weekend per-line reachability clears 90%.')
} else {
  console.log(`  ✗ Weekend per-line reachability is ${(weekendLine * 100).toFixed(1)}%, under the 90% gate.`)
  console.log('    The answer is supply acquisition, not more code.')
}
console.log()
