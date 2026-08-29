#!/usr/bin/env node
/**
 * Give pincodes a verified coordinate, then switch them on.
 *
 *   node scripts/activate-pincodes.mjs --prefix=560 --dry-run
 *   node scripts/activate-pincodes.mjs --prefix=560
 *   node scripts/activate-pincodes.mjs --district=Bengaluru
 *   node scripts/activate-pincodes.mjs --prefix=560 --regeocode
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS IS THE SCRIPT THAT OPENS A CITY
 * ══════════════════════════════════════════════════════════════════════
 *
 * `load-pincode-directory.mjs` puts the whole country in the table with
 * no coordinates and `is_active = FALSE`. Nothing is served until this
 * runs, and migration 085 enforces that with a CHECK rather than trusting
 * anybody to remember it.
 *
 * Running it for Whitefield later is the entire deployment. No rebuild,
 * no APK, no store review.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE COORDINATE IS NOT TAKEN ON TRUST
 * ══════════════════════════════════════════════════════════════════════
 *
 * A wrong pincode centroid is the worst bug this codebase can produce,
 * and migration 070 already explains why: it is inside India, it is not a
 * swapped pair, it stores and indexes cleanly, and it silently matches
 * nobody. The screen says "still looking" and means it literally.
 *
 * The free GeoNames dump fails exactly this way — 98 of Bengaluru's 109
 * pincodes on one point thirty kilometres north of the city. So every
 * coordinate here has to earn its place through three checks, and a
 * pincode that fails any of them stays INACTIVE rather than becoming a
 * plausible wrong answer:
 *
 *   1. OSM must return an actual postal-code BOUNDARY for it, not a
 *      nearby place that happens to mention the number. `postal_code`
 *      relations are drawn polygons; a `place` hit is a guess.
 *
 *   2. The result's own address must name the state we expect. This is
 *      what catches 560034 resolving to a Koramangala in another state.
 *
 *   3. Where this repo already holds a hand-verified locality centroid
 *      (scripts/data/bengaluru-localities.json, checked against real
 *      geodesic distances), the two must agree within 6 km. That file is
 *      the closest thing to ground truth we have, and disagreement means
 *      one of them is wrong — which is a thing to look at, not to
 *      average away.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE REQUEST PER SECOND, BECAUSE THAT IS THE DEAL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nominatim is donated infrastructure with a published limit of one
 * request per second and a requirement to identify yourself. 109
 * Bengaluru pincodes is under two minutes. Geocoding all 19,238 would be
 * five and a half hours of hammering somebody's server for coordinates
 * we cannot dispatch to anyway — so this only ever geocodes what is
 * being activated, and refuses to run without a filter.
 *
 * Results are cached to scripts/data/pincode-geocode-cache.json, so a
 * re-run after a network failure costs nothing.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readEnv, ROOT } from './lib/loadSrc.mjs'

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const REGEOCODE = argv.includes('--regeocode')
const arg = k => (argv.find(a => a.startsWith(`--${k}=`)) ?? '').split('=').slice(1).join('=')

const PREFIX = arg('prefix')
const DISTRICT = arg('district')
const EXPECT_STATE = arg('state') || 'Karnataka'

if (!PREFIX && !DISTRICT) {
  console.error(`
  Refusing to run without a filter.

    --prefix=560            every pincode starting 560
    --district=Bengaluru    every pincode in that district
    --state=Karnataka       what the OSM result must say (default Karnataka)

  Add --dry-run to see what it would do.
`)
  process.exit(1)
}

const url = readEnv('VITE_SUPABASE_URL')
const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !serviceKey) {
  console.error('\n  VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

/* ── Ground truth, where we have it ──────────────────────────────────── */
const localities = JSON.parse(
  readFileSync(join(ROOT, 'scripts/data/bengaluru-localities.json'), 'utf8')).localities

/** Metres between two lat/lng pairs. Haversine — good to a few metres. */
function metresBetween(aLat, aLng, bLat, bLng) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}

/** The hand-verified centroid for an area name, if this repo has one. */
function groundTruthFor(area = '') {
  const hay = area.toLowerCase().replace(/\s+/g, '')
  let best = null
  for (const l of localities) {
    const needle = l.name.toLowerCase().replace(/\s+/g, '')
    if (hay.includes(needle) && (!best || l.name.length > best.name.length)) best = l
  }
  return best
}

/* ── Geocode cache ───────────────────────────────────────────────────── */
const CACHE_PATH = join(ROOT, 'scripts/data/pincode-geocode-cache.json')
const cache = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  : {}

const saveCache = () => writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1))

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * Ask OSM for the postal-code boundary of one pincode.
 *
 * Returns the raw result or null. Verification is the caller's job so
 * that a rejection can say WHICH check failed.
 */
async function geocode(pin) {
  if (cache[pin] && !REGEOCODE) return cache[pin]

  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('postalcode', pin)
  u.searchParams.set('country', 'India')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('addressdetails', '1')
  u.searchParams.set('limit', '1')

  const res = await fetch(u, {
    headers: {
      // Nominatim requires a real identifier. An anonymous flood is what
      // gets an IP blocked, and being blocked mid-launch is not a risk
      // worth the two lines it costs to avoid.
      'User-Agent': 'Sambramo/1.0 (pincode activation; mohanpes328@gmail.com)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  })

  await sleep(1100)                       // the published limit, honoured

  if (!res.ok) return null
  const hit = (await res.json())[0] ?? null
  cache[pin] = hit
  return hit
}

/** Three checks. Returns { ok, lat, lng } or { ok: false, why }. */
function verify(pin, area, hit) {
  if (!hit) return { ok: false, why: 'no OSM result' }

  const isBoundary =
    hit.type === 'postal_code' || hit.addresstype === 'postcode' || hit.class === 'boundary'
  if (!isBoundary) return { ok: false, why: `not a postcode boundary (${hit.class}/${hit.type})` }

  const label = `${hit.display_name ?? ''} ${JSON.stringify(hit.address ?? {})}`.toLowerCase()
  if (!label.includes(EXPECT_STATE.toLowerCase())) {
    return { ok: false, why: `result is not in ${EXPECT_STATE}` }
  }

  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, why: 'no coordinate' }

  const truth = groundTruthFor(area)
  if (truth) {
    const d = metresBetween(lat, lng, truth.lat, truth.lng)
    if (d > 6000) {
      return { ok: false, why: `${(d / 1000).toFixed(1)} km from verified ${truth.name}` }
    }
  }

  return { ok: true, lat, lng, checkedAgainst: truth?.name ?? null }
}

/* ── Which rows ──────────────────────────────────────────────────────────
 *
 * From here down the work lives in `main()` rather than at module top
 * level, so an early exit can `return`.
 *
 * `process.exit()` from top-level await while the Supabase client still
 * holds an open socket aborts the Node process on Windows with
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" — a libuv
 * crash printed AFTER the message explaining what to fix, which makes a
 * handled, explained condition look like the script fell over. */
async function main() {
  let q = db.from('pincodes').select('pincode, area, district, state, location, is_active')
  if (PREFIX) q = q.like('pincode', `${PREFIX}%`)
  if (DISTRICT) q = q.ilike('district', `%${DISTRICT}%`)

  const { data: targets, error } = await q.order('pincode')

  if (error) {
    console.error(`\n  Could not read pincodes: ${error.message}`)
    // PostgREST reports a missing table as "Could not find the table
    // 'public.pincodes' in the schema cache", which reads like a caching
    // glitch and is in fact the migration never having been pasted.
    if (/does not exist|schema cache|could not find the table/i.test(error.message)) {
      console.error(`
  Migration 085 has not been applied. Paste
  supabase/migrations/085_pincode_directory.sql into Supabase → SQL
  Editor, then run scripts/load-pincode-directory.mjs before this.
`)
    }
    process.exitCode = 1
    return
  }

  if (!targets?.length) {
    console.error(`\n  No pincodes matched. Has load-pincode-directory.mjs run?\n`)
    process.exitCode = 1
    return
  }

  const todo = REGEOCODE ? targets : targets.filter(t => !t.location || !t.is_active)

  console.log(`
    ${targets.length} pincodes matched${PREFIX ? ` (prefix ${PREFIX})` : ''}${DISTRICT ? ` (district ~ ${DISTRICT})` : ''}
    ${targets.length - todo.length} already located and active
    ${todo.length} to geocode — about ${Math.ceil((todo.length * 1.1) / 60)} min at 1 req/s
  `)

  if (!todo.length) { console.log('  Nothing to do.\n'); return }

  /* ── Run ─────────────────────────────────────────────────────────────── */
  const activated = []
  const rejected = []

  for (const [i, row] of todo.entries()) {
    process.stdout.write(`\r  ${i + 1}/${todo.length}  ${row.pincode}          `)

    let hit = null
    try {
      hit = await geocode(row.pincode)
    } catch (e) {
      rejected.push({ ...row, why: `lookup failed: ${e.message}` })
      continue
    }

    const v = verify(row.pincode, row.area ?? '', hit)
    if (!v.ok) { rejected.push({ ...row, why: v.why }); continue }

    if (DRY) {
      activated.push({ ...row, lat: v.lat, lng: v.lng, checkedAgainst: v.checkedAgainst })
      continue
    }

    const { data: out, error: wErr } = await db.rpc('set_pincode_point', {
      p_pincode: row.pincode,
      p_lat: v.lat,
      p_lng: v.lng,
      p_geo_source: 'openstreetmap/nominatim postal_code relation',
      p_activate: true,
    })

    if (wErr || out?.ok === false) {
      rejected.push({ ...row, why: wErr?.message ?? out?.reason ?? 'write refused' })
    } else {
      activated.push({ ...row, lat: v.lat, lng: v.lng, checkedAgainst: v.checkedAgainst })
    }
  }

  saveCache()

  console.log(`\n\n  ${activated.length} ${DRY ? 'would be activated' : 'activated'}`)
  for (const a of activated.slice(0, 12)) {
    const flag = a.checkedAgainst ? `  ✓ matches verified ${a.checkedAgainst}` : ''
    console.log(`   ${a.pincode}  ${String(a.area).padEnd(24)} ${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}${flag}`)
  }
  if (activated.length > 12) console.log(`   … and ${activated.length - 12} more`)

  if (rejected.length) {
    console.log(`\n  ${rejected.length} left INACTIVE — each needs a look, not a workaround:`)
    for (const r of rejected.slice(0, 20)) {
      console.log(`   ${r.pincode}  ${String(r.area ?? '').padEnd(24)} ${r.why}`)
    }
    if (rejected.length > 20) console.log(`   … and ${rejected.length - 20} more`)
    console.log(`
    A rejected pincode is not a bug in this script. It is the third check
    in the header doing its job: better an area we visibly do not serve
    than one we serve at the wrong coordinate.

    To place one by hand, once you have a coordinate you trust:
      select set_pincode_point('560037', 12.9698, 77.7500, 'manual', true);
  `)
  }

  if (DRY) console.log('\n  --dry-run: nothing written.\n')
}

main()
