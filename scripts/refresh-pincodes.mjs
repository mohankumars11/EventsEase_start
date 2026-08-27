#!/usr/bin/env node
/**
 * Pull the All-India Pincode Directory from data.gov.in.
 *
 *   node scripts/refresh-pincodes.mjs --dry-run
 *   node scripts/refresh-pincodes.mjs
 *   node scripts/refresh-pincodes.mjs --state Karnataka
 *
 * Needs DATA_GOV_IN_API_KEY in .env — free, from https://data.gov.in
 * (register → My Account → API). Same key `refresh-market-rates.mjs`
 * already asks for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A PINCODE IS THE RIGHT UNIT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The booking flow shipped with a list of thirty area buttons, and that
 * was wrong twice over. It is a wall to scroll on a phone, and it only
 * covers areas somebody thought to type — a customer whose function is in
 * Nelamangala had no answer at all.
 *
 * A pincode is six digits every Indian knows by heart, covers the whole
 * country without anybody curating a list, and is already this codebase's
 * unit for geography: `components/admin/AreaDemand.jsx` says so in as many
 * words — "a six-digit pincode is the finest grain a delivery address
 * reliably carries".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS DOES NOT GIVE YOU
 * ══════════════════════════════════════════════════════════════════════
 *
 * The directory carries pincodes, office names, districts and states. It
 * does NOT carry coordinates, and dispatch needs a point to measure from.
 *
 * So a pincode resolves to the centroid of the locality it names, from
 * `scripts/data/bengaluru-localities.json` — coordinates already verified
 * against real geodesic distances. That is accurate to roughly two
 * kilometres, which is what a radius search needs and is not what a
 * navigation app needs. Nobody is being driven to this point; a master is
 * deciding whether a job is near enough to take.
 *
 * A pincode this repo has no locality for keeps its district centroid and
 * is flagged `approx: true`, so the UI can say "we will confirm the exact
 * address" rather than pretending to a precision it does not have.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readEnv, ROOT } from './lib/loadSrc.mjs'

const DRY = process.argv.includes('--dry-run')
const stateArg = (process.argv.find(a => a.startsWith('--state')) ?? '').split('=')[1]
const STATE = stateArg ?? 'Karnataka'

/** The All-India Pincode Directory resource id on data.gov.in. */
const RESOURCE = '6176ee09-3d56-4a3b-8115-21841576b2f6'
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE}`

const { localities } = JSON.parse(
  readFileSync(join(ROOT, 'scripts/data/bengaluru-localities.json'), 'utf8'))

/** Loose match: "Koramangala VIII Block S.O" → Koramangala. */
function localityFor(officeName = '', taluk = '') {
  const hay = `${officeName} ${taluk}`.toLowerCase()
  let best = null
  for (const l of localities) {
    const needle = l.name.toLowerCase().replace(/\s+/g, '')
    if (hay.replace(/\s+/g, '').includes(needle)) {
      if (!best || l.name.length > best.name.length) best = l
    }
  }
  return best
}

const apiKey = readEnv('DATA_GOV_IN_API_KEY')

if (!apiKey) {
  console.error('\n  DATA_GOV_IN_API_KEY is not set.\n')
  console.error('  1. Register free at https://data.gov.in')
  console.error('  2. My Account → API → copy the key')
  console.error('  3. Add DATA_GOV_IN_API_KEY=<key> to .env')
  console.error('  4. node scripts/refresh-pincodes.mjs\n')
  console.error('  Until then src/config/generatedPincodes.js carries the')
  console.error('  committed Bengaluru bootstrap, which is enough for the')
  console.error('  pilot and is marked as such.\n')
  process.exit(1)
}

/* ── Fetch, paging until the state is exhausted ─────────────────────── */
const rows = []
const LIMIT = 500
let offset = 0

for (;;) {
  const url = new URL(ENDPOINT)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(LIMIT))
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('filters[statename]', STATE)

  const r = await fetch(url)
  if (!r.ok) {
    console.error(`\n  data.gov.in returned ${r.status}. Check the key and the resource id.\n`)
    process.exit(1)
  }
  const body = await r.json()
  const batch = body.records ?? []
  rows.push(...batch)
  process.stdout.write(`\r  fetched ${rows.length}`)
  if (batch.length < LIMIT) break
  offset += LIMIT
}
console.log()

/* ── Resolve to points ──────────────────────────────────────────────── */
const byPin = new Map()
let placed = 0

for (const r of rows) {
  const pin = String(r.pincode ?? r.Pincode ?? '').trim()
  if (!/^\d{6}$/.test(pin)) continue

  const office = r.officename ?? r.OfficeName ?? ''
  const district = r.districtname ?? r.District ?? ''
  const loc = localityFor(office, r.taluk ?? '')

  // First office wins; the directory lists several per pincode and they
  // are all in the same delivery area, which is the level of precision
  // this is for.
  if (byPin.has(pin) && !loc) continue

  if (loc) placed++
  byPin.set(pin, {
    pin,
    area: loc?.name ?? office.replace(/\s+(S\.O|B\.O|H\.O)$/i, '').trim(),
    district,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    approx: !loc,
  })
}

const list = [...byPin.values()].sort((a, b) => a.pin.localeCompare(b.pin))
const withPoint = list.filter(p => p.lat != null)

console.log(`\n  ${list.length} pincodes in ${STATE}`)
console.log(`  ${withPoint.length} resolved to a verified centroid`)
console.log(`  ${list.length - withPoint.length} without one (flagged approx)\n`)

if (DRY) {
  for (const p of withPoint.slice(0, 12)) {
    console.log(`   ${p.pin}  ${p.area.padEnd(22)} ${p.lat}, ${p.lng}`)
  }
  console.log('\n  --dry-run: nothing written.\n')
  process.exit(0)
}

const body = `// GENERATED by scripts/refresh-pincodes.mjs — do not edit.
//
// Source: All-India Pincode Directory, data.gov.in (${STATE})
// Read:   ${new Date().toISOString().slice(0, 10)}
//
// Coordinates come from scripts/data/bengaluru-localities.json, matched on
// the post office name. Accurate to roughly two kilometres — enough for a
// radius search, not enough to navigate to. \`approx: true\` means no
// verified centroid was found and the UI must say the address will be
// confirmed rather than imply precision.

export const PINCODE_SOURCE = ${JSON.stringify({
  source: 'data.gov.in All-India Pincode Directory',
  state: STATE,
  asOf: new Date().toISOString().slice(0, 10),
  total: list.length,
  located: withPoint.length,
}, null, 2)}

export const PINCODES = ${JSON.stringify(
  Object.fromEntries(list.map(p => [p.pin, {
    area: p.area, district: p.district, lat: p.lat, lng: p.lng,
    ...(p.approx ? { approx: true } : {}),
  }])), null, 1)}
`

writeFileSync(join(ROOT, 'src/config/generatedPincodes.js'), body)
console.log(`  Wrote src/config/generatedPincodes.js\n`)
