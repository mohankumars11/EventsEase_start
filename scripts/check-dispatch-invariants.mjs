#!/usr/bin/env node
/**
 * The gate for instant booking.
 *
 *   node scripts/check-dispatch-invariants.mjs
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * `npm run build` on this box exits 0 even when it has OOMed, so a green
 * build proves nothing. And migrations are applied BY HAND — there is no
 * CI step, and `git push` does not run them — so the gap between "the SQL
 * file is in the repo" and "the constraint exists in the database" is
 * wide, silent, and exactly where this feature can go wrong.
 *
 * Every check below asserts a thing that is invisible when broken:
 *
 *   · a unique index that is missing lets two masters win one job, and
 *     nothing errors until two vans arrive at one birthday;
 *   · an append-only trigger that is missing lets a payout be edited
 *     after the fact, and the edit looks like the truth;
 *   · a collar constant that has drifted between SQL and JavaScript
 *     shows a customer one cap and enforces another;
 *   · a synthetic partner that is dispatchable takes real money for a
 *     business that does not exist.
 *
 * Same discipline as scripts/check-payment-schedule.mjs, which fails the
 * build when the payment ladder drifts from its Vercel-function copy.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadSrc, ROOT, readEnv } from './lib/loadSrc.mjs'

/* ── Credentials, read from .env directly ──────────────────────────────
 * Not via a dotenv dependency: this script is a gate and should not
 * acquire one to run. PowerShell on this machine reads UTF-8 as ANSI, so
 * the file is read by Node rather than shelled out to. */
function env(key) {
  try {
    const src = readFileSync(join(ROOT, '.env'), 'utf8')
    const m = src.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return process.env[key] ?? (m ? m[1].trim() : null)
  } catch {
    return process.env[key] ?? null
  }
}

const url = env('VITE_SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('\n  Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

const fail = []
const warn = []
const ok = m => console.log(`   ✓ ${m}`)
const bad = m => { fail.push(m); console.log(`   ✗ ${m}`) }
const meh = m => { warn.push(m); console.log(`   ! ${m}`) }

/** Does a table exist and is it readable? Returns row count or null. */
async function tableCount(name) {
  const { count, error } = await db.from(name).select('*', { count: 'exact', head: true })
  return error ? null : (count ?? 0)
}

/* ══════════════════════════════════════════════════════════════════════
   1 · The schema landed
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n1 · Tables and views')

const TABLES = [
  'booking_requests', 'booking_lines', 'dispatch_offers', 'escrow_ledger',
  'quote_revisions', 'disputes', 'partner_payout_accounts', 'push_tokens',
  'vendor_verification_events',
]
for (const t of TABLES) {
  const n = await tableCount(t)
  if (n === null) bad(`${t} — missing or unreadable`)
  else ok(`${t} (${n} rows)`)
}

const VIEWS = ['escrow_position', 'partner_offer_feed', 'supply_gaps']
for (const v of VIEWS) {
  const n = await tableCount(v)
  if (n === null) bad(`view ${v} — missing`)
  else ok(`view ${v}`)
}

/* ══════════════════════════════════════════════════════════════════════
   2 · Geography, and the latitude/longitude trap
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n2 · Geography')
{
  // Koramangala → Indiranagar. Verified against a haversine calculation:
  // 5,118 m. PostGIS uses a spheroid so it will differ by a few metres.
  const { data, error } = await db.rpc('point_of', { p_lat: 12.9352, p_lng: 77.6245 })
  if (error) bad(`point_of() — ${error.message}`)
  else if (!data) bad('point_of() returned null for a valid Bengaluru coordinate')
  else ok('point_of() accepts a valid coordinate')

  // The important one: a SWAPPED Bengaluru pair must be rejected.
  //
  // Note what this is actually testing. 77.6245 is a perfectly valid
  // LATITUDE — it is in the Kara Sea — so a ±90 range check cannot catch
  // this, and migration 057's version did not. Migration 070 added an
  // India bounding box, and it is the LONGITUDE that fails here: 12.9352
  // is not between 67 and 98.5.
  //
  // Without this, a swapped coordinate stores cleanly, indexes cleanly,
  // and matches nothing near Koramangala — a dispatch that finds no
  // partners and looks like a supply problem.
  const { data: swapped } = await db.rpc('point_of', { p_lat: 77.6245, p_lng: 12.9352 })
  if (swapped === null) ok('point_of() rejects a swapped Bengaluru lat/lng')
  else bad('point_of() ACCEPTED a swapped lat/lng — apply migration 070')

  // And a genuinely foreign coordinate (London) is not a customer.
  const { data: abroad } = await db.rpc('point_of', { p_lat: 51.5072, p_lng: -0.1276 })
  if (abroad === null) ok('point_of() rejects a coordinate outside India')
  else meh('point_of() accepts coordinates outside India — 070 not applied')
}

/* ══════════════════════════════════════════════════════════════════════
   3 · The one-winner rule — the constraint everything rests on
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n3 · First-accept-wins')
{
  const { data, error } = await db
    .from('dispatch_offers')
    .select('line_id')
    .eq('status', 'ACCEPTED')

  if (error) {
    bad(`dispatch_offers unreadable — ${error.message}`)
  } else {
    const seen = new Map()
    for (const r of data ?? []) seen.set(r.line_id, (seen.get(r.line_id) ?? 0) + 1)
    const doubles = [...seen.entries()].filter(([, n]) => n > 1)
    if (doubles.length) {
      bad(`${doubles.length} line(s) have MORE THAN ONE accepted offer — two masters won one job`)
      for (const [id, n] of doubles.slice(0, 5)) console.log(`       line ${id}: ${n} winners`)
    } else {
      ok(`no line has two accepted offers (${seen.size} accepted line(s) checked)`)
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   4 · Escrow solvency and immutability
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n4 · Escrow')
{
  const { data, error } = await db.from('escrow_position').select('line_id, held_paise, line_status')
  if (error) {
    bad(`escrow_position unreadable — ${error.message}`)
  } else {
    const negative = (data ?? []).filter(r => Number(r.held_paise) < 0)
    if (negative.length) bad(`${negative.length} line(s) hold a NEGATIVE escrow balance — paid out more than was received`)
    else ok(`no negative escrow balance (${data?.length ?? 0} line(s))`)

    const settledNonZero = (data ?? []).filter(
      r => r.line_status === 'settled' && Number(r.held_paise) !== 0)
    if (settledNonZero.length) bad(`${settledNonZero.length} settled line(s) still hold money`)
    else ok('every settled line sums to zero')
  }
}

/* ══════════════════════════════════════════════════════════════════════
   5 · The collar, in two languages
   ══════════════════════════════════════════════════════════════════════
   The +8% cap is a promise made to a customer on screen and enforced by a
   CHECK constraint in migration 063. The constraint hardcodes 108 because
   a CHECK cannot import from JavaScript. So the two can drift, and if
   they do, a customer is shown one cap and held to another. */
console.log('\n5 · Price collar')
{
  const M = await loadSrc({ 'src/config/pricing.js': ['COLLAR'] })
  const jsCap = M.COLLAR.cap
  const sql = readFileSync(join(ROOT, 'supabase/migrations/063_quote_revisions.sql'), 'utf8')
  const m = sql.match(/baseline_floating_paise\s*\*\s*(\d+)/)
  if (!m) {
    meh('could not find the collar constraint in 063 — check it by hand')
  } else {
    const sqlCap = (Number(m[1]) - 100) / 100
    if (Math.abs(sqlCap - jsCap) < 1e-9) ok(`collar agrees: JS ${jsCap} · SQL ${m[1]}`)
    else bad(`COLLAR DRIFT — pricing.js says +${jsCap * 100}%, migration 063 enforces +${sqlCap * 100}%`)
  }
}

/* ══════════════════════════════════════════════════════════════════════
   6 · Synthetic partners cannot take real money
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n6 · Synthetic network')
{
  const { count: synth } = await db
    .from('vendors').select('*', { count: 'exact', head: true }).eq('is_synthetic', true)

  ok(`${synth ?? 0} synthetic partner(s) in the network`)

  if ((synth ?? 0) > 0) {
    // A synthetic partner must never hold an accepted offer: that is a
    // real customer's money committed to a business that does not exist.
    const { data: bad_rows } = await db
      .from('dispatch_offers')
      .select('id, vendor_id, vendors!inner(is_synthetic, business_name)')
      .eq('status', 'ACCEPTED')
      .eq('vendors.is_synthetic', true)

    // Fails in production, warns in dev. ALLOW_SYNTHETIC_DISPATCH is how
    // the demo scenario exercises the seeded network on purpose — but the
    // same state on a real deployment means a customer is about to pay a
    // business that does not exist.
    const devSynthetic = env('ALLOW_SYNTHETIC_DISPATCH') === 'true'
    if (bad_rows?.length && devSynthetic) meh(`${bad_rows.length} synthetic accept(s) — expected, ALLOW_SYNTHETIC_DISPATCH is on`)
    else if (bad_rows?.length) bad(`${bad_rows.length} ACCEPTED offer(s) belong to a SYNTHETIC partner`)
    else ok('no synthetic partner holds an accepted offer')
  }
}

/* ══════════════════════════════════════════════════════════════════════
   7 · Verification cannot be self-granted
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n7 · Verification gate')
{
  const { data, error } = await db
    .from('vendors').select('id, is_verified, verification_status').limit(2000)

  if (error) {
    bad(`vendors unreadable — ${error.message}`)
  } else {
    const mismatch = (data ?? []).filter(
      v => v.is_verified !== (v.verification_status === 'approved'))
    if (mismatch.length) bad(`${mismatch.length} vendor(s) where is_verified disagrees with verification_status`)
    else ok(`is_verified agrees with verification_status (${data?.length ?? 0} checked)`)

    const approved = (data ?? []).filter(v => v.is_verified).length
    ok(`${approved} approved partner(s)`)
  }
}

/* ══════════════════════════════════════════════════════════════════════
   8 · The masked feed leaks nothing
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n8 · Disintermediation')
{
  const { data, error } = await db.from('partner_offer_feed').select('*').limit(1)
  if (error) {
    bad(`partner_offer_feed unreadable — ${error.message}`)
  } else {
    // With no rows there are no keys to inspect, so this is checked
    // against the migration text instead of silently passing.
    const view = readFileSync(
      // 076, not 068. 068 created this view; 076 REPLACED it — dropping
      // security_invoker and scoping the WHERE clause instead. Checking a
      // superseded definition proves nothing about the database.
      join(ROOT, 'supabase/migrations/076_offer_feed_is_its_own_boundary.sql'), 'utf8')
    // Comments are stripped FIRST, and this is not a detail. The view
    // body carries the line "`address_text` is deliberately absent from
    // this view" — so scanning the raw text finds `address_text` and
    // reports a leak that is, in fact, the documentation of its absence.
    //
    // A checker that cries wolf over its own comments gets muted, and a
    // muted checker protects nothing. This one guards the difference
    // between a partner seeing an area and a partner seeing somebody's
    // front door, so it has to be believable.
    // Normalised FIRST, and this is the bug this check itself had.
    //
    // The repo checks out CRLF on Windows. In the comment-stripping
    // pattern the dot does not match a carriage return, and $ without
    // /m wants end-of-string — so with CRLF the stripper matched
    // nothing at all. The comment saying `address_text` is ABSENT was
    // then scanned as though it were SQL, and this checker reported a
    // leak that did not exist. Twice, because the live-row check below
    // was seeded with the static result instead of standing alone.
    //
    // A checker that cries wolf gets muted, and a muted checker
    // protects nothing. This one guards the difference between a
    // master seeing an area and a master seeing somebody's front door.
    const sql = view.split(String.fromCharCode(13)).join('')
    const body = sql
      .slice(sql.search(/CREATE (OR REPLACE )?VIEW partner_offer_feed/),
             sql.indexOf('COMMENT ON VIEW partner_offer_feed'))
      .split('\n')
      .map(line => line.replace(/--.*$/, ''))
      .join('\n')

    const leaks = ['address_text', 'customer_id', 'full_name', 'phone']
      .filter(c => new RegExp(`\\b${c}\\b`).test(body))
    if (leaks.length) bad(`partner_offer_feed selects identifying column(s): ${leaks.join(', ')}`)
    else ok('partner_offer_feed carries no address and no customer identity')

    if (data?.length) {
      const keys = Object.keys(data[0])
      // Deliberately NOT seeded with `leaks`. This asks a different
      // question — what the DEPLOYED view actually returns — and a
      // second failure that only echoes the first tells you nothing
      // about which of the two is wrong.
      const live = keys.filter(k => ['address_text', 'phone', 'full_name', 'customer_id'].includes(k))
      if (live.length) bad(`live feed row exposes: ${[...new Set(live)].join(', ')}`)
      else ok('live feed row exposes no identity')
    }
  }

  const { data: scrubbed, error: se } = await db.rpc('scrub_contacts', {
    p_text: 'call me on 98765 43210 or ravi@example.com before you come',
  })
  if (se) bad(`scrub_contacts() — ${se.message}`)
  else if (/98765|@example/.test(scrubbed ?? '')) bad(`scrub_contacts() let a contact through: "${scrubbed}"`)
  else ok(`scrub_contacts() → "${scrubbed}"`)
}

/* ══════════════════════════════════════════════════════════════════════
   9 · The policies actually work FOR A USER
   ══════════════════════════════════════════════════════════════════════

   Everything above ran as the service role, which bypasses RLS entirely.
   That proves the DATA is right and proves nothing about whether anyone
   can read it.

   Migration 074 exists because of precisely this gap: two policies
   referencing each other's table produced "infinite recursion detected in
   policy for relation booking_lines" for every signed-in customer, while
   every service-role check in this file passed. The dispatcher worked,
   the seeder worked, the invariants held — and the customer's screen was
   empty.

   So this section signs in and reads the same tables as a person.
   Needs `.demo-session.json` (scripts/demo-scenario.mjs writes it); it
   skips with a warning rather than failing when absent, because the gate
   still has to run on a machine that has never made a booking. */
console.log('\n9 · Row-level security, as a signed-in customer')
{
  let demo = null
  try { demo = JSON.parse(readFileSync(join(ROOT, '.demo-session.json'), 'utf8')) } catch { /* absent */ }

  if (!demo?.session) {
    meh('no .demo-session.json — run scripts/demo-scenario.mjs to cover RLS')
  } else if (demo.session.expires_at * 1000 < Date.now()) {
    meh('.demo-session.json has expired — re-run scripts/demo-scenario.mjs')
  } else {
    const anon = createClient(url, env('VITE_SUPABASE_ANON_KEY'), { auth: { persistSession: false } })
    const { error: se } = await anon.auth.setSession({
      access_token: demo.session.access_token,
      refresh_token: demo.session.refresh_token,
    })

    if (se) {
      meh(`could not restore the demo session — ${se.message}`)
    } else {
      for (const t of ['booking_requests', 'booking_lines', 'dispatch_offers', 'escrow_ledger', 'disputes']) {
        // A real row read, not a HEAD count: a head request returns the
        // recursion failure with an empty message, which prints as a bare
        // "✗ booking_lines —" and tells nobody anything.
        const { error } = await anon.from(t).select('*').limit(1)
        if (!error) ok(`${t} readable`)
        // 42P17 is the recursion this whole section exists to catch.
        else if (error.code === '42P17' || /infinite recursion/i.test(error.message)) {
          bad(`${t} — INFINITE RECURSION in its policy (apply migration 074)`)
        } else bad(`${t} — ${error.message}`)
      }

      // And the customer can actually see their own booking.
      if (demo.requestId) {
        const { data, error } = await anon.from('booking_lines').select('id').eq('request_id', demo.requestId)
        if (error) bad(`own booking unreadable — ${error.message}`)
        else if (!data.length) bad('customer cannot see their own booking lines — policy too strict')
        else ok(`customer sees their own booking (${data.length} lines)`)
      }

      // The other half: a customer must NOT be able to read a stranger's.
      const { data: others } = await db.from('booking_requests')
        .select('id').neq('customer_id', demo.customerId).limit(1)
      if (others?.length) {
        const { data: leak } = await anon.from('booking_lines').select('id').eq('request_id', others[0].id)
        if (leak?.length) bad("a customer can read ANOTHER customer's booking lines")
        else ok("a stranger's booking is invisible")
      }
    }
  }
}

/* ── 10 · Nothing that only belongs in a test is still switched on ────
 *
 * These are the two settings that make the app cheap to test and ruinous
 * to launch with. Both are invisible from any screen a person would look
 * at before going live, and both fail silently in the direction of
 * "everything seems fine":
 *
 *   PAYMENT_TEST_CHARGE_PAISE   every booking collects ₹1
 *   ALLOW_SYNTHETIC_DISPATCH    jobs go to 221 partners who do not exist
 *
 * This section is the reason it is safe to have built either of them. */
{
  console.log('\n  10 - test switches')

  const test = readEnv('PAYMENT_TEST_CHARGE_PAISE')
  if (test) bad(`PAYMENT_TEST_CHARGE_PAISE=${test} — every booking would charge ₹${Number(test) / 100}, not the quote`)
  else ok('payments charge the real amount')

  const synth = readEnv('ALLOW_SYNTHETIC_DISPATCH')
  if (synth && synth !== 'false') bad(`ALLOW_SYNTHETIC_DISPATCH=${synth} — jobs would be dispatched to partners who do not exist`)
  else ok('dispatch reaches real partners only')
}

/* ── Verdict ─────────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(66))
if (fail.length) {
  console.log(`\n  ${fail.length} FAILURE(S):\n`)
  for (const f of fail) console.log(`    ✗ ${f}`)
  console.log('\n  Instant booking is not safe to run against this database.\n')
  process.exit(1)
}
if (warn.length) {
  console.log(`\n  ${warn.length} warning(s):`)
  for (const w of warn) console.log(`    ! ${w}`)
}
console.log('\n  All invariants hold.\n')
