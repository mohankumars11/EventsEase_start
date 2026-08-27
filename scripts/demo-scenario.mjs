#!/usr/bin/env node
/**
 * Build a complete, inspectable instant booking — both sides of it.
 *
 *   node scripts/demo-scenario.mjs                 # fresh booking, nobody accepted
 *   node scripts/demo-scenario.mjs --accept 2      # two masters accept
 *   node scripts/demo-scenario.mjs --race          # five accept at once, one wins
 *   node scripts/demo-scenario.mjs --clean         # remove previous demo bookings
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS RATHER THAN CLICKING THROUGH
 * ══════════════════════════════════════════════════════════════════════
 *
 * The interesting states of this feature are the ones that are hard to
 * reach by hand and impossible to hold still:
 *
 *   · three of five masters accepted, two still hunting
 *   · a line with nobody to ask, standing rather than expiring
 *   · five masters tapping ACCEPT inside the same millisecond
 *
 * The last one cannot be produced by a person at all. So the scenario is
 * built server-side, deterministically, and then LOOKED AT through the
 * real screens — which is the only way to know the UI renders the state
 * rather than the happy path somebody remembered to test.
 *
 * ── It also mints a session ──────────────────────────────────────────
 * Both screens are behind RLS, correctly: the matching board reads
 * `booking_lines` as the customer, the offer inbox reads
 * `partner_offer_feed` as the master. Neither renders for an anonymous
 * browser, and that is the policies working.
 *
 * So this generates a real magic-link session for the demo customer and
 * writes it where supabase-js looks for one. No test account is created
 * and no password is invented.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { readEnv, ROOT } from './lib/loadSrc.mjs'

const arg = n => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? null : (process.argv[i + 1] ?? true)
}
const ACCEPT = Number(arg('accept') ?? 0)
const RACE   = process.argv.includes('--race')
const CLEAN  = process.argv.includes('--clean')

const SUPA_URL = readEnv('VITE_SUPABASE_URL')
const SVC_KEY  = readEnv('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = readEnv('VITE_SUPABASE_ANON_KEY')

const admin = createClient(SUPA_URL, SVC_KEY, { auth: { persistSession: false } })

const inr = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')
const line = (n = 66) => console.log('  ' + '─'.repeat(n))

/* ── Clean ─────────────────────────────────────────────────────────── */
if (CLEAN) {
  const { data } = await admin.from('booking_requests').select('id').ilike('area_label', '%Koramangala%')
  for (const r of data ?? []) await admin.from('booking_requests').delete().eq('id', r.id)
  console.log(`\n  Removed ${data?.length ?? 0} demo booking(s).\n`)
  process.exit(0)
}

/* ── 1 · Who is booking ────────────────────────────────────────────── */
const { data: profiles } = await admin
  .from('profiles').select('id, email, full_name').eq('role', 'customer').limit(1)

const customer = profiles?.[0]
if (!customer) {
  console.error('\n  No customer profile in the database. Sign up once in the app first.\n')
  process.exit(1)
}

/* ── 2 · The booking ───────────────────────────────────────────────── */
const saturday = (() => {
  const d = new Date()
  do { d.setDate(d.getDate() + 1) } while (d.getDay() !== 6)
  return d.toISOString().slice(0, 10)
})()

console.log(`\n  Booking a birthday for ${customer.email ?? customer.id.slice(0, 8)}`)
console.log(`  Saturday ${saturday} · Koramangala 5th Block · 30 guests\n`)

const res = await fetch('http://localhost:5173/api/dispatch-booking', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    customerId: customer.id,
    occasionId: 'birthday',
    occasionName: 'Birthday',
    eventDate: saturday,
    guestCount: 30,
    radiusKm: 5,
    lat: 12.9352,
    lng: 77.6245,
    addressText: 'Flat 402, 18th Main, 5th Block, Koramangala',
    areaLabel: 'Koramangala 5th Block',
    lines: [
      // A `discuss` service with a note that contains a phone number, so
      // the scrubber is exercised on the path a real customer would use.
      { serviceId: 'decor', note: 'Blue and silver, dinosaur theme. Call me on 98765 43210' },
      { serviceId: 'cake' },
      { serviceId: 'photography', durationId: 'quick' },
      { serviceId: 'dj', durationId: 'quick' },
      // Deliberately included: at launch supply this is the trade that
      // has nobody, so it demonstrates a STANDING line rather than an
      // expired one.
      { serviceId: 'mehendi', durationId: 'quick' },
    ],
  }),
}).catch(e => ({ ok: false, _err: e.message }))

if (res._err) {
  console.error(`  Dev server not reachable — is \`npm run dev\` running?  (${res._err})\n`)
  process.exit(1)
}

const booking = await res.json()
if (!res.ok) { console.error('  dispatch failed:', booking.error, '\n'); process.exit(1) }

console.log(`  → ${booking.notified} masters notified · ${booking.standing} line(s) standing`)

/* ── 3 · Masters answer ────────────────────────────────────────────── */
const { data: lines } = await admin
  .from('booking_lines').select('*').eq('request_id', booking.requestId).order('created_at')

if (RACE) {
  const target = lines[0]
  const { data: offers } = await admin
    .from('dispatch_offers').select('id').eq('line_id', target.id).eq('status', 'OFFERED')

  console.log(`\n  RACE · ${offers.length} masters tapping ACCEPT on "${target.service_name}" at once`)
  const t = Date.now()
  const out = await Promise.all(offers.map(o => admin.rpc('accept_offer', { p_offer_id: o.id })))
  const winners = out.filter(r => r.data?.ok).length
  console.log(`  → ${winners} winner in ${Date.now() - t}ms · ${out.length - winners} told it went to somebody else`)
  console.log(`  → ${winners === 1 ? '✓ the unique index held' : '*** TWO MASTERS WON ONE JOB ***'}`)
}

if (ACCEPT > 0) {
  let done = 0
  for (const l of lines) {
    if (done >= ACCEPT) break
    const { data: offers } = await admin
      .from('dispatch_offers').select('id').eq('line_id', l.id).eq('status', 'OFFERED').limit(1)
    if (!offers?.length) continue
    const { data } = await admin.rpc('accept_offer', { p_offer_id: offers[0].id })
    if (data?.ok) done++
  }
  console.log(`\n  ${done} master(s) accepted`)
}

/* ── 4 · What each side now sees ───────────────────────────────────── */
const { data: final } = await admin
  .from('booking_lines').select('*').eq('request_id', booking.requestId).order('created_at')

console.log('\n  ══ CUSTOMER SEES ' + '═'.repeat(48))
let payable = 0
for (const l of final) {
  const { data: offs } = await admin
    .from('dispatch_offers').select('status, vendor_id, distance_m').eq('line_id', l.id)
  const won = offs.find(o => o.status === 'ACCEPTED')
  let who = `${offs.filter(o => o.status === 'OFFERED').length} notified`
  if (l.dispatch_mode === 'standing') who = 'still looking — nobody free nearby'
  if (won) {
    const { data: v } = await admin.from('vendors').select('business_name, rating_avg').eq('id', won.vendor_id).single()
    who = `${v.business_name} ★${v.rating_avg} · ${(won.distance_m / 1000).toFixed(1)} km`
    payable += l.quoted_amount_paise
  }
  console.log(`   ${won ? '✓' : '○'} ${l.service_name.padEnd(20)} ${inr(l.quoted_amount_paise).padStart(9)}  ${who}`)
}
const acc = final.filter(l => l.status === 'accepted').length
line()
console.log(`   ${acc} of ${final.length} masters accepted        Pay for ${acc} · ${inr(payable)}`)

/* What a master receives — through the masked view, not the tables. */
const { data: feed } = await admin
  .from('partner_offer_feed').select('*')
  .in('line_id', final.map(l => l.id)).eq('status', 'OFFERED').limit(1)

if (feed?.length) {
  const o = feed[0]
  const { PLATFORM_FEE_RATE } = await import('../src/config/instantBooking.js').catch(() => ({}))
  console.log('\n  ══ A MASTER SEES ' + '═'.repeat(48))
  console.log(`   ${o.service_name} · ${new Date(o.event_date).toDateString()}`)
  console.log(`   ${o.area_label} · ${(o.distance_m / 1000).toFixed(1)} km · ~${o.guest_count} guests`)
  if (o.customer_note) console.log(`   note: "${o.customer_note}"`)
  console.log(`   earns ${inr(o.partner_amount_paise)} before tax · expires ${new Date(o.expires_at).toLocaleTimeString()}`)
  console.log(`   identity columns present: ${['address_text','customer_id','phone','full_name'].filter(k => k in o).join(', ') || 'none ✓'}`)
}

/* ── 5 · A session, so the guarded screens actually render ─────────── */
if (customer.email) {
  const { data: link, error: le } = await admin.auth.admin.generateLink({
    type: 'magiclink', email: customer.email,
  })
  if (le) {
    console.log(`\n  (could not mint a session: ${le.message})`)
  } else {
    const anon = createClient(SUPA_URL, ANON_KEY, { auth: { persistSession: false } })
    const { data: s, error: ve } = await anon.auth.verifyOtp({
      token_hash: link.properties.hashed_token, type: 'magiclink',
    })
    if (ve) {
      console.log(`\n  (could not verify: ${ve.message})`)
    } else {
      const ref = SUPA_URL.match(/https:\/\/([a-z0-9]+)\./)[1]
      writeFileSync(join(ROOT, '.demo-session.json'), JSON.stringify({
        storageKey: `sb-${ref}-auth-token`,
        session: s.session,
        requestId: booking.requestId,
        customerId: customer.id,
      }, null, 2))
      console.log('\n  Session written to .demo-session.json (gitignored)')
    }
  }
}

console.log(`\n  Booking id: ${booking.requestId}`)
console.log(`  Open:       http://localhost:5173/book/instant\n`)
