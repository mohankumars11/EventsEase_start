#!/usr/bin/env node
/**
 * Load the All-India Pincode Directory from data.gov.in into `pincodes`.
 *
 *   node scripts/load-pincode-directory.mjs --dry-run
 *   node scripts/load-pincode-directory.mjs                 # all India
 *   node scripts/load-pincode-directory.mjs --state=Karnataka
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `scripts/refresh-pincodes.mjs` did the same fetch and wrote a
 * JavaScript file, `src/config/generatedPincodes.js`, which is compiled
 * into the bundle and shipped inside the APK. Opening an area was
 * therefore a rebuild and a store release.
 *
 * This writes rows instead. Migration 085 has the reasoning; the short
 * version is that the whole country is loaded and `is_active` decides
 * what we actually serve.
 *
 * The old script stays for now — it still produces the offline bootstrap
 * that `lib/pincodeDirectory.js` falls back to when the database is
 * unreachable mid-booking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS WRITES THE TABLE DIRECTLY AND NOT THROUGH upsert_pincode()
 * ══════════════════════════════════════════════════════════════════════
 *
 * 19,238 single-row RPC calls is 19,238 round trips — the exact cost
 * migration 084 was written to remove from dispatch, and there is no
 * reason to reintroduce it here.
 *
 * PostgREST CAN write every column of this table except `location`,
 * because `location` is a geography and geography has no JSON form. So a
 * batched upsert of the text columns is both legal and fast, and the
 * coordinate still has exactly one way in — `set_pincode_point()`, which
 * runs `point_of()`, which enforces the India bounding box.
 *
 * The property migration 085 depends on is preserved: no coordinate
 * reaches this table without passing 070's check.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE ROW PER PINCODE, FROM MANY POST OFFICES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The directory is a list of POST OFFICES, not pincodes — about 157,000
 * of them sharing 19,238 codes. 560034 alone carries "Koramangala I
 * Block S.O", "St. John's Medical College S.O", "Agara B.O" and more.
 *
 * We keep one, and which one matters for the UI: the customer is going
 * to read it in an autocomplete row. A Head Office name is the name of
 * the place; a Branch Office is frequently a single building. So the
 * ranking is H.O → S.O → B.O, and within a tie the shortest name wins,
 * because "Koramangala" beats "Koramangala VIII Block".
 */
import { createClient } from '@supabase/supabase-js'
import { readEnv } from './lib/loadSrc.mjs'

const DRY = process.argv.includes('--dry-run')
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) ?? '').split('=').slice(1).join('=')
const stateArg = arg('state') || undefined

/** The All-India Pincode Directory resource id on data.gov.in. */
const RESOURCE = '6176ee09-3d56-4a3b-8115-21841576b2f6'
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE}`
const SOURCE = 'data.gov.in/All-India-Pincode-Directory'

const apiKey = readEnv('DATA_GOV_IN_API_KEY')
const url = readEnv('VITE_SUPABASE_URL')
const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')

if (!apiKey) {
  console.error(`
  DATA_GOV_IN_API_KEY is not set.

    1. Register free at https://data.gov.in  (Sign Up, any email)
    2. Sign in, open the profile menu, choose  My Account
    3. The API key is on that page under  API Key  — one long hex string
    4. Add it to .env:   DATA_GOV_IN_API_KEY=<key>
    5. node scripts/load-pincode-directory.mjs --dry-run

  The key is free, has no expiry, and is the same one
  scripts/refresh-market-rates.mjs already asks for.
`)
  process.exit(1)
}

if (!DRY && (!url || !serviceKey)) {
  console.error('\n  VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to write.\n')
  process.exit(1)
}

/* ── Which post office name to show ──────────────────────────────────── */
const RANK = { 'head office': 0, 'sub office': 1, 'branch office': 2 }

function rankOf(officeType = '') {
  // The dots are load-bearing. The feed sends "S.O", "B.O", "H.O" — and
  // "S.O".toLowerCase() is "s.o", which does not start with "so". Without
  // stripping them every office ranked as a branch office, the H.O → S.O
  // → B.O preference below silently did nothing, and the area name fell
  // through to whichever happened to be shortest.
  const t = String(officeType).toLowerCase().replace(/[^a-z]/g, '')
  if (t.startsWith('ho') || t.startsWith('gpo') || t.includes('head')) return 0
  if (t.startsWith('so') || t.includes('sub')) return 1
  return 2
}

/** "Koramangala VIII Block S.O" → "Koramangala VIII Block". */
function cleanName(raw = '') {
  return String(raw)
    .replace(/\s*\((.*?)\)\s*$/, '')          // trailing "(Bangalore)"
    .replace(/\s+(S\.?O|B\.?O|H\.?O|G\.?P\.?O)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ── Fetch, paging until exhausted ─────────────────────────────────────
 *
 * data.gov.in rate-limits, and it does not warn first — a full-India run
 * took 60 pages and then 429ed, which lost every one of the 60,000
 * offices already read because nothing had been written yet.
 *
 * So three things, all learned the hard way:
 *
 *   · a 429 is WAITED OUT, not fatal. It is the server asking for a
 *     pause, and the correct response to "slow down" is to slow down.
 *   · a small gap between pages, so we are a well-behaved client rather
 *     than one that only backs off after being told to.
 *   · `--from=<offset>` to resume, and the offset to resume from is
 *     printed on any unrecoverable failure. 156 pages is too many to
 *     start over for the sake of the last one.
 */
const LIMIT = 1000
const PAGE_GAP_MS = 250
const MAX_ATTEMPTS = 6

const FLUSH_EVERY = 15                     // pages between durable writes
const CHUNK = 500                          // rows per upsert request

const byPin = new Map()
const dirty = new Set()
let fetched = 0
let pages = 0
let written = 0
let offset = Number(arg('from')) || 0

const sleep = ms => new Promise(r => setTimeout(r, ms))

const db = DRY ? null : createClient(url, serviceKey, { auth: { persistSession: false } })

/** Send every pincode whose best name has changed since the last flush. */
async function flush() {
  if (!dirty.size) return

  const rows = [...dirty]
    .map(pin => { const { _rank, ...keep } = byPin.get(pin); return keep })

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error } = await db.from('pincodes').upsert(slice, { onConflict: 'pincode' })

    if (error) {
      console.error(`\n\n  Upsert failed: ${error.message}`)
      // PostgREST does not say "does not exist" for a missing table — it
      // says "Could not find the table 'public.pincodes' in the schema
      // cache", which reads like a caching glitch and is in fact the
      // migration simply never having been pasted.
      if (/does not exist|schema cache|could not find the table/i.test(error.message)) {
        console.error(`
  Migration 085 has not been applied. Paste
  supabase/migrations/085_pincode_directory.sql into
  Supabase → SQL Editor, then run this again.
`)
      }
      process.exit(1)
    }
  }

  written += rows.length
  dirty.clear()
}

/** One page, with backoff on the failures that are worth retrying. */
async function fetchPage(at) {
  const u = new URL(ENDPOINT)
  u.searchParams.set('api-key', apiKey)
  u.searchParams.set('format', 'json')
  u.searchParams.set('limit', String(LIMIT))
  u.searchParams.set('offset', String(at))
  // The feed stores state names in caps — "KARNATAKA", not "Karnataka" —
  // and the filter is an exact match, so `--state=Karnataka` would
  // otherwise page through nothing and report a clean, wrong zero.
  if (stateArg) u.searchParams.set('filters[statename]', stateArg.toUpperCase())

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res
    try {
      res = await fetch(u, { signal: AbortSignal.timeout(60_000) })
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) return { fatal: `no response: ${e.message}` }
      await sleep(2000 * attempt)
      continue
    }

    if (res.ok) return { records: (await res.json()).records ?? [] }

    // The key is wrong. No amount of waiting fixes that.
    if (res.status === 401 || res.status === 403) {
      return { fatal: `${res.status} — check DATA_GOV_IN_API_KEY in .env` }
    }

    // Rate limited, or the far end wobbled. Both are worth waiting out.
    if (res.status === 429 || res.status >= 500) {
      if (attempt === MAX_ATTEMPTS) return { fatal: `${res.status} after ${MAX_ATTEMPTS} attempts` }
      const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * attempt
      process.stdout.write(`\r  ${res.status} at offset ${at} — waiting ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})   `)
      await sleep(wait)
      continue
    }

    return { fatal: `${res.status} ${res.statusText} — resource ${RESOURCE}` }
  }
  return { fatal: 'exhausted attempts' }
}

for (;;) {
  const page = await fetchPage(offset)

  if (page.fatal) {
    console.error(`\n\n  data.gov.in: ${page.fatal}`)
    console.error(`\n  Resume from where it stopped:`)
    console.error(`    node scripts/load-pincode-directory.mjs --from=${offset}\n`)
    process.exit(1)
  }

  const batch = page.records

  for (const r of batch) {
    const pin = String(r.pincode ?? r.Pincode ?? '').trim()
    if (!/^[1-9][0-9]{5}$/.test(pin)) continue

    const name = cleanName(r.officename ?? r.OfficeName ?? '')
    if (!name) continue

    const cand = {
      pincode: pin,
      area: name,
      taluk: (r.taluk ?? r.Taluk ?? '').trim() || null,
      district: (r.districtname ?? r.district ?? r.District ?? '').trim() || null,
      state: (r.statename ?? r.state ?? r.StateName ?? '').trim() || null,
      source: SOURCE,
      _rank: rankOf(r.officetype ?? r.OfficeType ?? ''),
    }

    const held = byPin.get(pin)
    if (!held) { byPin.set(pin, cand); dirty.add(pin); continue }

    // Better office class wins; on a tie the shorter, more general name.
    if (cand._rank < held._rank ||
       (cand._rank === held._rank && cand.area.length < held.area.length)) {
      // Keep whichever district/taluk we already had if this row lacks one.
      cand.district ??= held.district
      cand.taluk ??= held.taluk
      cand.state ??= held.state
      byPin.set(pin, cand)
      dirty.add(pin)
    }
  }

  fetched += batch.length
  pages++
  process.stdout.write(`\r  fetched ${fetched} offices → ${byPin.size} pincodes${written ? ` · ${written} written` : ''}   `)

  /* Flush periodically so the run is DURABLE.
   *
   * The first full-India attempt read 60,000 offices, hit a 429, and lost
   * all of it — because nothing was written until the very end. Now a
   * failure costs at most the last few pages, and `--from` resumes
   * against a table that already holds everything before it.
   *
   * Only the pincodes whose best name actually CHANGED are re-sent, and
   * because the map is never cleared, a later page that finds a better
   * office name still overwrites the earlier guess. The run converges on
   * the same answer it would have reached writing once at the end. */
  if (!DRY && pages % FLUSH_EVERY === 0) await flush()

  if (batch.length < LIMIT) break
  offset += LIMIT
  await sleep(PAGE_GAP_MS)
}

if (!DRY) await flush()

console.log('\n')

const rows = [...byPin.values()].sort((a, b) => a.pincode.localeCompare(b.pincode))
const states = new Set(rows.map(r => r.state).filter(Boolean))
const blr = rows.filter(r => /^56[012]/.test(r.pincode))

console.log(`  ${rows.length} pincodes across ${states.size} states/UTs`)
console.log(`  ${blr.length} in the 560/561/562 range (Bengaluru + rural)\n`)

if (DRY) {
  for (const r of blr.slice(0, 10)) {
    console.log(`   ${r.pincode}  ${String(r.area).padEnd(26)} ${r.district ?? ''}`)
  }
  console.log('\n  --dry-run: nothing written.\n')
  process.exit(0)
}

console.log(`
  ${written} pincodes written. All inactive — no coordinates yet, and
  migration 085 refuses to activate a pincode without one.

  Next:  node scripts/activate-pincodes.mjs --prefix=560 --dry-run
`)
