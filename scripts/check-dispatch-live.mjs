#!/usr/bin/env node
/**
 * Book something, for real, against the deployed API.
 *
 *   node --env-file=.env scripts/check-dispatch-live.mjs
 *   node --env-file=.env scripts/check-dispatch-live.mjs http://localhost:3000
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A deploy went out in which every instant booking failed with a 500.
 * `booking_requests.radius_km` had CHECK (radius_km BETWEEN 1 AND 25)
 * from migration 058; the client had just started asking for 60. The
 * database rejected the insert and the customer got an error on the one
 * button the whole product is built around.
 *
 * What passed while that was true:
 *
 *   check-price-agreement        45/45
 *   check-undefined-components   clean
 *   check-migration-search-path  clean
 *   check-master-sticker         20/20
 *   smoke-routes                 14/14 routes rendered
 *   24 screenshots               all correct
 *
 * Every one of them was honest. None of them writes a row. The smoke
 * test opens /book/instant and confirms it renders, and it does render —
 * the failure is on the far side of an address, a service and a button,
 * and it lives in a CHECK constraint that no amount of reading the
 * front-end would reveal.
 *
 * The lesson is narrow and worth stating plainly: a schema constraint
 * and the code that writes to it can only be checked TOGETHER, by
 * writing. So this writes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DOES, AND WHAT IT LEAVES BEHIND
 * ══════════════════════════════════════════════════════════════════════
 *
 * Signs in as the demo customer, dispatches a two-line booking through
 * the real endpoint, asserts the request and its lines exist and are
 * priced, and then CANCELS both lines through the customer's own
 * `cancel_line()` so the run does not leave a live job sitting in front
 * of partners.
 *
 * It asks for the client's real DEFAULT_RADIUS_KM rather than a safe
 * number, because the safe number is exactly what would have let the bug
 * through.
 *
 * Real partners are notified for the few seconds before the cancel. That
 * is the cost of checking the thing that actually broke, and it is
 * cheaper than the alternative.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSrc, readEnv, ROOT } from './lib/loadSrc.mjs'

const API = process.argv[2] ?? 'https://sambramoh.vercel.app'
const EMAIL = process.env.DISPATCH_CHECK_CUSTOMER ?? 'mohanpes328a@gmail.com'

const url = readEnv('VITE_SUPABASE_URL')
const anonKey = readEnv('VITE_SUPABASE_ANON_KEY')
const admin = createClient(url, readEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const { DEFAULT_RADIUS_KM } = await loadSrc({
  'src/config/instantBooking.js': ['DEFAULT_RADIUS_KM'],
})

const fail = []
const bad = m => { fail.push(m); console.log(`    FAIL ${m}`) }
const ok = m => console.log(`    ok   ${m}`)

console.log(`\n  Live dispatch against ${API}\n`)
console.log(`    asking for ${DEFAULT_RADIUS_KM} km — the client's own default\n`)

// ── A session, the way the app has one ──────────────────────────────
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: EMAIL,
})
if (linkErr) { console.error(`\n  Could not mint a session for ${EMAIL}: ${linkErr.message}\n`); process.exit(1) }

const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const { data: sess, error: otpErr } = await anon.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'email',
})
if (otpErr) { console.error(`\n  ${otpErr.message}\n`); process.exit(1) }

const token = sess.session.access_token
const customerId = sess.session.user.id

// ── The booking ─────────────────────────────────────────────────────
const body = {
  customerId,
  occasionId: 'birthday',
  occasionName: 'Birthday Party',
  eventDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
  guestCount: 30,
  radiusKm: DEFAULT_RADIUS_KM,
  lat: 12.9352, lng: 77.6245,
  addressText: 'Koramangala 5th Block',
  areaLabel: 'Koramangala',
  city: 'Bengaluru',
  lines: [
    { serviceId: 'cake', options: { flavour: 'vanilla', diet: 'regular' } },
    // Decor is the line that is priced from a rate-card row rather than
    // a multiplier, so it also proves setupId survived the trip.
    { serviceId: 'decor', setupId: 'standard', options: { setup: 'standard', material: 'balloons' } },
  ],
}

let out, status
try {
  const res = await fetch(`${API}/api/dispatch-booking`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  status = res.status
  const txt = await res.text()
  try { out = JSON.parse(txt) } catch { out = { error: txt.slice(0, 200) } }
} catch (err) {
  console.error(`\n  Could not reach ${API}: ${err.message}\n`)
  process.exit(1)
}

if (status !== 200 || !out?.requestId) {
  bad(`dispatch returned ${status}: ${JSON.stringify(out).slice(0, 220)}`)
  console.error(`\n  1 FAILURE — a customer pressing "Find my masters" gets this.\n`)
  process.exit(1)
}
ok(`dispatch returned 200 with a request id`)

// ── What it actually wrote ──────────────────────────────────────────
const { data: req } = await admin.from('booking_requests')
  .select('id, radius_km, event_date').eq('id', out.requestId).single()
if (!req) bad('the request id came back but no row exists')
else ok(`request row written, radius_km ${req.radius_km}`)

const { data: lines } = await admin.from('booking_lines')
  .select('id, service_name, trade, status, quoted_amount_paise')
  .eq('request_id', out.requestId)

if ((lines?.length ?? 0) !== body.lines.length) {
  bad(`${lines?.length ?? 0} lines written, expected ${body.lines.length}`)
} else {
  ok(`${lines.length} lines written`)
}

for (const l of lines ?? []) {
  if (!l.quoted_amount_paise || l.quoted_amount_paise <= 0) {
    bad(`${l.service_name} was written with no price`)
  } else if (!l.trade) {
    bad(`${l.service_name} has no trade — dispatch can never match it`)
  } else {
    ok(`${l.service_name}: ${l.trade} · ₹${(l.quoted_amount_paise / 100).toLocaleString('en-IN')}`)
  }
}

const { count: offers } = await admin.from('dispatch_offers')
  .select('id', { count: 'exact', head: true })
  .in('line_id', (lines ?? []).map(l => l.id))
if (!offers) bad('nobody was notified — dispatch wrote no offers')
else ok(`${offers} master(s) notified`)

// ── Put it back ─────────────────────────────────────────────────────
// Through the customer's own cancel, so this leaves the database the way
// a real abandoned booking would rather than by deleting rows.
const asCustomer = createClient(url, anonKey, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
})
let cleaned = 0
for (const l of lines ?? []) {
  const { error } = await asCustomer.rpc('cancel_line', {
    p_line_id: l.id, p_reason: 'check-dispatch-live cleanup',
  })
  if (!error) cleaned++
}
console.log(`\n    (cleaned up ${cleaned}/${lines?.length ?? 0} lines)`)

if (fail.length) {
  console.error(`\n  ${fail.length} FAILURE(S) — instant booking is not working.\n`)
  process.exit(1)
}
console.log('\n  A customer can book. End to end, against the deployed API.\n')
