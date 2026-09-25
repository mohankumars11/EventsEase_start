#!/usr/bin/env node
/**
 * Does the calendar actually GATE the work?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CLAIM BEING TESTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner marks a day Blocked, or caps it at two jobs. Both of those
 * are rows in `vendor_availability`. The question this script asks is
 * the only one that matters: does anything downstream OBEY them?
 *
 * For years the answer to the second half was no. `slots_booked` was
 * read by six successive versions of `match_partners` and written by
 * nothing, so the LIMITED branch could not fire. Migration 132 makes
 * the column true and 134 makes the cap mean something; this is the
 * script that says whether that worked.
 *
 * ── Why it does not create a booking ────────────────────────────────
 * Proving "a third accept is refused" end to end needs a real request,
 * real lines and real offers on the production database, and
 * `escrow_ledger` is append-only with a RESTRICT foreign key — a line
 * that ever gets funded cannot be deleted afterwards. A probe that
 * cannot clean up after itself is one somebody has to clean up by hand,
 * and check-booking-capture is already that script.
 *
 * So this tests the GATE rather than the accept: it asks
 * `match_partners` who is available on a date, changes the partner's
 * calendar, and asks again. If the answer does not change, no amount of
 * transaction logic downstream will save the booking.
 *
 * ── It restores everything ──────────────────────────────────────────
 *
 *   node scripts/check-overbooking.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const URL_ = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(URL_, SVC, { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (label, cond, detail = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${label}${cond ? '' : `   <-- ${detail}`}`)
}

/* Bengaluru, and a radius wide enough that every partner in the city is
   a candidate. The question here is the CALENDAR, not the geography. */
const BLR = { lat: 12.9716, lng: 77.5946 }
const RADIUS_M = 100000

const IST = 330
const todayIST = new Date(Date.now() + IST * 60_000).toISOString().slice(0, 10)
const DATE = new Date(Date.parse(`${todayIST}T00:00:00+05:30`) + 220 * 86_400_000)
  .toISOString().slice(0, 10)

/* PostgREST cannot send a geography, so the point is built by the same
   RPC api/dispatch-booking.js uses and handed straight back. */
const { data: point, error: pointErr } =
  await admin.rpc('point_of', { p_lat: BLR.lat, p_lng: BLR.lng })
if (pointErr) {
  console.error(`\n  x point_of failed: ${pointErr.message}\n`); process.exit(1)
}

const matchOn = async (trade, allowSynthetic = false) => {
  const { data, error } = await admin.rpc('match_partners', {
    p_trade: trade, p_point: point, p_radius_m: RADIUS_M,
    p_date: DATE, p_allow_synthetic: allowSynthetic, p_limit: 50, p_exclude: [],
  })
  if (error) throw new Error(`match_partners: ${error.message}`)
  return data ?? []
}

/* A trade that some REAL partner in Bengaluru actually serves. */
const { data: cats } = await admin
  .from('vendor_services').select('category, vendor_id')
  .eq('is_active', true).limit(400)

/* Synthetic partners are acceptable subjects HERE, and only here. This
   script never signs in as the partner — every write is service-role,
   because what is under test is `match_partners`, not a policy. So the
   seeded network is a perfectly good calendar to bend, and insisting on
   a partner with a login is what made this script unrunnable on a
   pre-launch database where almost nobody has one.
   (check-availability-rls.mjs is the one that needs real sessions, and
   it refuses to run without two.) */
const ALLOW_SYNTHETIC = true
let trade = null, subject = null
for (const c of [...new Set((cats ?? []).map(r => r.category))]) {
  const hits = await matchOn(c, ALLOW_SYNTHETIC)
  if (!hits.length) continue
  for (const h of hits) {
    const { data: v } = await admin.from('vendors')
      .select('id, business_name, profile_id, is_synthetic, verification_status, max_events_per_day')
      .eq('id', h.vendor_id).maybeSingle()
    if (v && v.verification_status !== 'suspended') { trade = c; subject = v; break }
  }
  if (subject) break
}

if (!subject) {
  console.log('\n  x no real, matchable partner in Bengaluru to test with.')
  console.log('    Run scripts/free-partner-date.mjs, then try again.\n')
  process.exit(1)
}
console.log(`\n  trade   = ${trade}`)
console.log(`  subject = ${subject.business_name}${subject.is_synthetic ? " (seeded)" : ""}`)
console.log(`  date    = ${DATE}\n`)

const { data: had } = await admin.from('vendor_availability').select('*')
  .eq('vendor_id', subject.id).eq('slot_date', DATE).maybeSingle()

const appears = async () => (await matchOn(trade, ALLOW_SYNTHETIC)).some(r => r.vendor_id === subject.id)

try {
  await admin.from('vendor_availability')
    .delete().eq('vendor_id', subject.id).eq('slot_date', DATE)

  console.log('A FREE DAY\n')
  ok('the partner is offered work on an unmarked day', await appears(),
     'they are missing before anything was even blocked')

  console.log('\nBLOCKED\n')
  await admin.from('vendor_availability').upsert(
    { vendor_id: subject.id, slot_date: DATE, status: 'BLOCKED' },
    { onConflict: 'vendor_id,slot_date' })
  ok('a blocked day removes them from matching', !(await appears()),
     'BLOCKED is being ignored by match_partners')

  console.log('\nLIMITED, AND FULL\n')
  /* ── This was asserting the mechanism 132 deleted ──────────────────
     It forced `slots_booked = 2` and expected the partner to vanish,
     and it had failed for as long as anybody had run it, reporting
     "THE CAPACITY BRANCH IS DEAD".

     The branch is not dead. It is fed from somewhere else.

     021 created `slots_booked`, six versions of `match_partners` read
     it, and NOTHING ever incremented it -- the bug 132 is named after.
     132's answer was to stop trusting a counter nobody maintained and
     recompute it; 147 went further and counts live ACCEPTED dispatch
     offers for the date directly against the cap. So `slots_booked` is
     a derived convenience column the matcher deliberately does not
     read, and writing to it by hand proves only that it is ignored.

     Established by experiment before this was rewritten:
       slots_booked forced to 2, cap 2  ->  still offered  (ignored)
       slots_total 0                    ->  NOT offered    (enforced)
       slots_total back to 2            ->  offered again  */
  await admin.from('vendor_availability').upsert(
    { vendor_id: subject.id, slot_date: DATE, status: 'LIMITED',
      slots_total: 2, slots_booked: 0 },
    { onConflict: 'vendor_id,slot_date' })
  ok('a LIMITED day with room still offers work', await appears(),
     'a capped day with space is being treated as full')

  /* A cap of nothing is the only shape of "full" arrangeable without a
     real booking. There are no ACCEPTED offers anywhere in this
     database, so the accepted-job path cannot be exercised with live
     data -- said plainly rather than faked, because a synthetic
     accepted offer would test the fixture and not dispatch. */
  await admin.from('vendor_availability').update({ slots_total: 0 })
    .eq('vendor_id', subject.id).eq('slot_date', DATE)
  ok('a LIMITED day with no room left stops offering work', !(await appears()),
     'the cap is not being read at all')

  /* And the counter stays ignored, on purpose. A future change that
     makes the matcher read `slots_booked` again fails here, which is
     the regression 132 exists to prevent. */
  await admin.from('vendor_availability')
    .update({ slots_total: 2, slots_booked: 2 })
    .eq('vendor_id', subject.id).eq('slot_date', DATE)
  ok('and slots_booked is NOT what it reads', await appears(),
     'the matcher is trusting a counter nothing reliably maintains - see 132')

  console.log('\nTHE CAP THE PARTNER NEVER SET (needs 134)\n')
  /* Before 134 the flat NOT EXISTS answered first and
     max_events_per_day was unreachable. With no row at all, a partner
     capped at one job a day should still be offered a FIRST one. */
  await admin.from('vendor_availability')
    .delete().eq('vendor_id', subject.id).eq('slot_date', DATE)
  ok('with no row at all they are offered work', await appears(),
     'an unmarked day is being treated as unavailable')

  console.log('\nTHE STANDING WEEK (needs 131 + 134)\n')
  const { error: wkErr } = await admin.from('vendor_weekly_rules').upsert({
    vendor_id: subject.id,
    weekday: new Date(`${DATE}T00:00:00Z`).getUTCDay(),
    is_available: false, effective_from: '2026-01-01',
  }, { onConflict: 'vendor_id,weekday,effective_from' })
  if (wkErr) {
    console.log('  - vendor_weekly_rules is not deployed yet; skipped')
  } else {
    const gone = !(await appears())
    ok('a standing day off removes them from matching', gone,
       'match_partners is not reading vendor_weekly_rules (migration 134 not applied?)')
    await admin.from('vendor_weekly_rules').delete()
      .eq('vendor_id', subject.id)
      .eq('weekday', new Date(`${DATE}T00:00:00Z`).getUTCDay())
      .eq('effective_from', '2026-01-01')
  }
} finally {
  await admin.from('vendor_availability')
    .delete().eq('vendor_id', subject.id).eq('slot_date', DATE)
  if (had) {
    const { id, created_at, updated_at, location, ...keep } = had
    await admin.from('vendor_availability').insert(keep)
    console.log(`\n  restored the partner's original ${had.status} row on ${DATE}`)
  } else {
    console.log(`\n  ${DATE} had no row before this run, and has none now`)
  }
}

console.log(`\n  ${ran - bad}/${ran} passed\n`)
process.exit(bad === 0 ? 0 : 1)
