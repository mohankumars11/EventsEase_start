#!/usr/bin/env node
/**
 * Did 119, 120 and 121 actually take?
 *
 * The three are applied by hand in the SQL editor, so "I ran them" and
 * "they are there" are different claims — a file pasted with a stray
 * line above it aborts at the first error and leaves everything before
 * it committed. This asks the database.
 *
 * Read through PostgREST's own schema description rather than by
 * selecting rows: an empty table returns no keys, and "no columns"
 * would be indistinguishable from "no rows".
 *
 *   node scripts/check-migrations-119-121.mjs
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const URL_ = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_ANON_KEY
if (!URL_ || !KEY) { console.log('\n  x no Supabase credentials in .env\n'); process.exit(1) }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY }

const spec = await (await fetch(`${URL_}/rest/v1/`, { headers: H })).json()
const defs = spec?.definitions ?? spec?.components?.schemas ?? {}
const colsOf = t => (defs[t]?.properties ? new Set(Object.keys(defs[t].properties)) : null)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0
const ok = (label, cond, detail = '') => {
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `  — ${detail}`}`)
}

async function count(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
  })
  if (!r.ok) return null
  const cr = r.headers.get('content-range') ?? ''
  const n = Number(cr.split('/')[1])
  return Number.isFinite(n) ? n : null
}

console.log('\n119 · setup can be left and come back to\n')
const vendors = colsOf('vendors')
ok('vendors.onboarding_status', !!vendors?.has('onboarding_status'), 'column missing')
ok('vendors.current_onboarding_step', !!vendors?.has('current_onboarding_step'), 'column missing')
ok('vendors.completed_steps', !!vendors?.has('completed_steps'), 'column missing')

console.log('\n120 · one partner, one trade, one listing\n')
const listings = colsOf('partner_listings')
ok('partner_listings exists', !!listings, 'table missing — the whole file aborted')
if (listings) {
  for (const c of ['vendor_id', 'trade', 'trade_id', 'status', 'review_note', 'submitted_at']) {
    ok(`partner_listings.${c}`, listings.has(c), 'column missing')
  }
}
const services = colsOf('vendor_services')
ok('vendor_services.listing_id', !!services?.has('listing_id'), 'the offerings have nothing to hang off')

console.log('\n121 · a city we are not in yet\n')
const interest = colsOf('partner_market_interest')
ok('partner_market_interest exists', !!interest, 'table missing')
if (interest) {
  for (const c of ['interest_code', 'requested_city', 'trades', 'detected_city', 'status']) {
    ok(`partner_market_interest.${c}`, interest.has(c), 'column missing')
  }
}
ok('market_interest_by_city view exists', !!colsOf('market_interest_by_city'),
   'the admin console falls back to aggregating raw rows')

/* ══════════════════════════════════════════════════════════════════════
   THE BACKFILL, WHICH IS THE PART THAT CAN SILENTLY DO NOTHING
   ══════════════════════════════════════════════════════════════════════

   A table can exist and be empty. 120 creates one container per
   (vendor, category) that already has offerings and links every
   offering to it — and if that INSERT matched nothing, every existing
   partner's My Services would be built from the orphan path instead of
   from the rule, with no error anywhere.

   So: are there containers, is anything unlinked, and does any
   container disagree with the offerings inside it. */
console.log('\nTHE BACKFILL\n')

const containers = await count('partner_listings?select=id')
const linked     = await count('vendor_services?select=id&listing_id=not.is.null')
const unlinked   = await count('vendor_services?select=id&listing_id=is.null&category=not.is.null')

ok(`${containers ?? '?'} trade containers exist`, (containers ?? 0) > 0,
   'the INSERT matched nothing — every partner falls back to grouping')
console.log(`  · ${linked ?? '?'} offerings linked to their trade`)

/* Unlinked is not automatically wrong. 120 deliberately skips a row
   whose category is not a known trade — the "videpgraphy" typo in
   partnerCatalogue.js's own docblock is exactly that — because
   inventing a container for a typo makes the typo permanent. */
if ((unlinked ?? 0) > 0) {
  const r = await fetch(
    `${URL_}/rest/v1/vendor_services?select=category&listing_id=is.null&category=not.is.null&limit=200`,
    { headers: H })
  const rows = r.ok ? await r.json() : []
  const cats = [...new Set(rows.map(x => x.category))]
  console.log(`  · ${unlinked} offering(s) unlinked, in ${cats.length} categor${cats.length === 1 ? 'y' : 'ies'}:`)
  cats.forEach(c => console.log(`      "${c}"`))
  console.log('    Expected only for categories the catalogue does not know (typos).')
  console.log('    Anything here that IS a real trade name is a backfill miss worth chasing.')
} else {
  console.log('  · every offering with a known trade is linked')
}

/* The status ladder, read back. A container saying 'draft' with live
   offerings under it would mean 120's sync trigger is not firing. */
const live = await count('partner_listings?select=id&status=eq.live')
const draft = await count('partner_listings?select=id&status=eq.draft')
const review = await count('partner_listings?select=id&status=eq.under_review')
const action = await count('partner_listings?select=id&status=eq.requires_action')
console.log(`  · live ${live ?? 0} · under review ${review ?? 0} · requires action ${action ?? 0} · draft ${draft ?? 0}`)

console.log(bad ? `\n${cross} ${bad} check(s) failed\n` : `\n${tick} all three migrations are in\n`)
process.exit(bad ? 1 : 0)
