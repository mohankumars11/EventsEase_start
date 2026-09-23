#!/usr/bin/env node
/**
 * Does the calendar actually decide who gets offered work?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE QUESTION THE STATIC GUARDS CANNOT ANSWER
 * ══════════════════════════════════════════════════════════════════════
 *
 * check-calendar-range proves the sheet writes what it says. This proves
 * the write CHANGES WHO GETS WORK — which runs through `match_partners`
 * in the database, and no amount of reading React can establish it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SAFE TO RUN AGAINST PRODUCTION
 * ══════════════════════════════════════════════════════════════════════
 *
 * It uses a SYNTHETIC vendor, and `ALLOW_SYNTHETIC_DISPATCH=false` on
 * this deployment: `dispatch-booking` passes `p_allow_synthetic: false`,
 * so a synthetic vendor is invisible to every real booking no matter
 * what its calendar says. This file passes `true` to see it at all.
 *
 * Nothing about a real partner is read or written. Every row this
 * creates is captured before the run and restored after it, including
 * on failure — the restore is in a `finally`.
 *
 * Contrast with check-booking-capture, which writes a real line into the
 * production escrow ledger and cannot pass twice. This one can be run
 * as often as you like.
 *
 *   node scripts/check-dispatch-end-to-end.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

/* A date far enough out that nothing real is booked on it. */
const DATE = (() => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  d.setUTCDate(d.getUTCDate() + 240)
  return d.toISOString().slice(0, 10)
})()

console.log(`\n  Testing against ${DATE}, 240 days out.\n`)

/* ── Find a synthetic partner with a trade and a location ───────────
   Not created: a vendor row drags a profile, listings and services
   behind it, and leaving any of that in production because a script
   failed halfway is worse than not running the test. */
const { data: candidates, error: candErr } = await db
  .from('vendors')
  .select('id, business_name, is_verified, accepting_jobs, location, service_radius_km, max_events_per_day')
  .eq('is_synthetic', true)
  .eq('is_verified', true)
  .eq('accepting_jobs', true)
  .not('location', 'is', null)
  .limit(10)

if (candErr) { console.error('  could not read vendors:', candErr.message); process.exit(1) }

let subject = null
let trade = null
for (const v of candidates ?? []) {
  const { data: svc } = await db
    .from('vendor_services').select('category')
    .eq('vendor_id', v.id).eq('is_active', true).limit(1)
  if (svc?.length) { subject = v; trade = svc[0].category; break }
}

if (!subject) {
  console.error('  No synthetic vendor with an active service and a location. Nothing to test.\n')
  process.exit(1)
}

console.log(`  Subject: ${subject.business_name} · ${trade}\n`)

/* Where they are, so the search is centred on them rather than on a
   guessed point they might be outside. */
const { data: pt } = await db.rpc('why_not_dispatched', {
  p_vendor_id: subject.id, p_trade: trade, p_date: DATE,
})
console.log('  why_not_dispatched says:', JSON.stringify(pt), '\n')

const { data: loc } = await db
  .from('vendors').select('lat, lng').eq('id', subject.id).maybeSingle()

const point = loc?.lat && loc?.lng
  ? `POINT(${loc.lng} ${loc.lat})`
  : 'POINT(77.5946 12.9716)'

const matches = async () => {
  const { data, error } = await db.rpc('match_partners', {
    p_trade: trade,
    p_point: point,
    p_radius_m: 60000,
    p_date: DATE,
    p_allow_synthetic: true,
    p_limit: 200,
    p_exclude: [],
  })
  if (error) throw new Error(error.message)
  return (data ?? []).some(r => r.vendor_id === subject.id)
}

/* ── Snapshot everything this run may touch ─────────────────────── */
const { data: beforeAvail } = await db
  .from('vendor_availability').select('*')
  .eq('vendor_id', subject.id).eq('slot_date', DATE).maybeSingle()

const { data: beforeListing } = await db
  .from('partner_listings').select('id, status')
  .eq('vendor_id', subject.id).eq('trade', trade).maybeSingle()

try {
  /* ══════════════════════════════════════════════════════════════ */
  console.log('THE CALENDAR DECIDES\n')

  await db.from('vendor_availability').delete()
    .eq('vendor_id', subject.id).eq('slot_date', DATE)
  ok('with nothing said about the date, they are offered work', await matches(),
     'the weekly rule may be closing this weekday; check weekday_is_open')

  /* OPEN is a WRITTEN row, and it outranks a standing day off. This is
     the distinction the range sheet's fourth button exists for. */
  /* `slots_total: null` is not decoration. An upsert only writes the
     columns it is given, so switching LIMITED -> OPEN without it leaves
     the old cap in place, and `match_partners` reads that cap in
     preference to `max_events_per_day`. A day capped at zero then stays
     capped at zero while displaying as open.

     The first version of this file omitted it and spent a while
     accusing migration 147 of a fault that was its own. Both sheets get
     this right -- AvailabilityRangeSheet:156 and DayDetailSheet:153
     send it explicitly -- and the assertion at the end of this section
     is what keeps them doing so. */
  const setDay = extra => db.from('vendor_availability').upsert(
    { vendor_id: subject.id, slot_date: DATE, slots_total: null, note: null,
      reason: null, reason_detail: null, hours: null, ...extra },
    { onConflict: 'vendor_id,slot_date' })

  await setDay({ status: 'OPEN' })
  ok('marked OPEN, they are offered work', await matches())

  await setDay({ status: 'BLOCKED', reason: 'travel' })
  ok('marked BLOCKED, they are NOT offered work', !(await matches()),
     'blocking a date must stop offers — this is the whole point of the tab')

  await setDay({ status: 'LIMITED', slots_total: 2 })
  ok('marked LIMITED with capacity spare, they are offered work again', await matches())

  /* The UI floors this at 1 (Math.max(1, ...) in both sheets), so a
     partner cannot reach it -- but the column allows it and an operator
     or a script can, so the behaviour is worth pinning down. */
  await setDay({ status: 'LIMITED', slots_total: 0 })
  ok('LIMITED to zero, they are NOT offered work', !(await matches()),
     'a cap of nought is a closed day')

  /* And the trap itself: reopening MUST clear the cap. */
  await setDay({ status: 'OPEN' })
  const { data: reopened } = await db.from('vendor_availability')
    .select('status, slots_total').eq('vendor_id', subject.id)
    .eq('slot_date', DATE).maybeSingle()
  ok('reopening clears the old cap', reopened?.slots_total === null,
     `slots_total is ${reopened?.slots_total} — a day that reads OPEN and dispatches as closed`)
  ok('and they are offered work again', await matches())

  /* ══════════════════════════════════════════════════════════════ */
  console.log('\nAND SO DOES A PAUSED TRADE — MIGRATION 147\n')

  if (!beforeListing) {
    console.log('  · this partner has no partner_listings row for the trade,')
    console.log('    which 147 treats as eligible on purpose. Skipped.')
  } else {
    /* ---- If these two fail, it is a PASTE ORDER problem ------------
       134 and 147 both declare `match_partners` with the same
       signature. 147's body is 134's plus one clause, so whichever was
       pasted LAST wins -- silently, with no error.

       The tell is that `why_not_dispatched` still reports the paused
       listing correctly while the matcher ignores it: 147 creates that
       function and 134 does not touch it, so the diagnostic survives
       even when the matcher has been reverted.

       Fix: re-paste 147. It is re-runnable. */
    await db.from('partner_listings').update({ status: 'paused' }).eq('id', beforeListing.id)
    const pausedWhy = await db.rpc('why_not_dispatched', {
      p_vendor_id: subject.id, p_trade: trade, p_date: DATE,
    })
    ok('a PAUSED listing stops offers', !(await matches()),
       pausedWhy.data?.listing_stopped === 'paused'
         ? 'why_not_dispatched sees the pause but match_partners does not -- 134 was pasted after 147. Re-paste 147.'
         : 'pauseListing() has written this column since 120 and dispatch never read it')

    await db.from('partner_listings').update({ status: 'suspended' }).eq('id', beforeListing.id)
    ok('and so does a SUSPENDED one', !(await matches()))

    await db.from('partner_listings').update({ status: beforeListing.status }).eq('id', beforeListing.id)
    ok(`restored to "${beforeListing.status}", they are offered work again`, await matches(),
       'if this fails the restore did not take — check the row by hand')
  }

  /* ══════════════════════════════════════════════════════════════ */
  console.log('\nTHE OPERATOR CAN ASK WHY\n')

  await setDay({ status: 'BLOCKED', reason: 'travel' })

  const { data: why } = await db.rpc('why_not_dispatched', {
    p_vendor_id: subject.id, p_trade: trade, p_date: DATE,
  })
  ok('why_not_dispatched names the blocked day', why?.day_blocked === true, JSON.stringify(why))
  ok('and still reports them as approved and accepting',
     why?.approved === true && why?.accepting_jobs === true, JSON.stringify(why))
} finally {
  /* ── Put everything back, whatever happened above ─────────────── */
  console.log('\nRESTORING\n')

  await db.from('vendor_availability').delete()
    .eq('vendor_id', subject.id).eq('slot_date', DATE)
  if (beforeAvail) {
    const { id, created_at, updated_at, location, slots_booked, ...row } = beforeAvail
    await db.from('vendor_availability').insert(row)
    console.log(`  ${tick} the partner's original ${DATE} row is back`)
  } else {
    console.log(`  ${tick} no row existed for ${DATE}; none left behind`)
  }

  if (beforeListing) {
    await db.from('partner_listings').update({ status: beforeListing.status }).eq('id', beforeListing.id)
    console.log(`  ${tick} listing back to "${beforeListing.status}"`)
  }

  const { data: leftover } = await db
    .from('vendor_availability').select('status')
    .eq('vendor_id', subject.id).eq('slot_date', DATE).maybeSingle()
  const clean = beforeAvail ? leftover?.status === beforeAvail.status : !leftover
  console.log(`  ${clean ? tick : cross} verified: ${leftover?.status ?? 'no row'}`)
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
