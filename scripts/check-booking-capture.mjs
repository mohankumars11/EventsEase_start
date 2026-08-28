#!/usr/bin/env node
/**
 * Prove that paying for a booking actually records the money.
 *
 *   node scripts/check-booking-capture.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS TESTING, AND WHY IT COULD NOT BE TESTED BY CLICKING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The instant-booking payment path has three parts and the middle one is
 * invisible from the app:
 *
 *   1. create-booking-payment opens a Razorpay order   — visible, a sheet opens
 *   2. Razorpay captures and calls the webhook         — INVISIBLE
 *   3. the webhook writes escrow holds and marks paid  — visible, eventually
 *
 * Step 2 failing looks exactly like step 2 succeeding, from the customer's
 * side, for about a minute. Then the booking is simply never confirmed.
 * That was the live state of this code until today: the webhook had no
 * branch for booking lines at all, found no `event_payments` row, and
 * answered `{ ignored: true }` to a real captured payment.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT USES A REAL ORDER AND A REAL SIGNATURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The order is created through the actual Razorpay API with the actual
 * keys, so the notes this depends on are proved to survive the round trip
 * — which is the one assumption `bookingCapture.js` rests on.
 *
 * The webhook payload is signed with the real HMAC and the real secret,
 * so the signature check runs for real rather than being skipped. What is
 * simulated is only Razorpay's decision to call us, which is the one part
 * that cannot be provoked without paying.
 *
 * Nothing is charged. An order that is never paid expires on its own.
 *
 * ── Against the deployed function ────────────────────────────────────
 *   node scripts/check-booking-capture.mjs --live
 *
 * POSTs the signed payload to https://sambramoh.vercel.app instead of
 * calling the handler in this process. That is a different question and
 * the more important one: it proves the DEPLOYED code, the production
 * RAZORPAY_WEBHOOK_SECRET and the production Supabase credentials agree
 * with each other. A local pass and a live failure is the normal shape
 * of a webhook bug.
 */
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { readEnv } from './lib/loadSrc.mjs'

for (const k of ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
                 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
  if (!process.env[k]) process.env[k] = readEnv(k) ?? ''
  if (!process.env[k]) { console.error(`\n  ${k} is not set.\n`); process.exit(1) }
}

// Imported AFTER the env is populated: both modules read process.env at
// module scope, so importing first would capture empty strings.
const { default: webhook } = await import('../api/razorpay-webhook.js')
const { createOrder } = await import('../api/_lib/payments.js')

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const fail = []
const ok   = m => console.log(`    ok   ${m}`)
const bad  = m => { fail.push(m); console.log(`    FAIL ${m}`) }

/* ── A line to fund ──────────────────────────────────────────────────
 * An accepted line that no money has been recorded against. Not created
 * here: a synthetic line would not prove the shapes the real dispatcher
 * writes, and this check exists to catch a mismatch between them. */
console.log('\n  Booking capture\n')

const { data: candidates } = await db
  .from('booking_lines')
  .select('id, status, service_name, quoted_amount_paise, request_id')
  .eq('status', 'accepted')
  .limit(20)

if (!candidates?.length) {
  console.log('    No accepted line to test with. Run a dispatch and accept one first:')
  console.log('      node scripts/demo-scenario.mjs\n')
  process.exit(0)
}

const { data: alreadyFunded } = await db
  .from('escrow_ledger').select('line_id').in('line_id', candidates.map(c => c.id))
const funded = new Set((alreadyFunded ?? []).map(r => r.line_id))
const line = candidates.find(c => !funded.has(c.id))

if (!line) {
  console.log('    Every accepted line already has money against it. Nothing to test.\n')
  process.exit(0)
}

const { data: request } = await db
  .from('booking_requests').select('customer_id, event_date, area_label')
  .eq('id', line.request_id).single()

console.log(`    line: ${line.service_name} · ₹${(line.quoted_amount_paise / 100).toFixed(0)}\n`)

/* ── 1 · A real order, carrying the line id in its notes ─────────── */
const CHARGE = 100   // ₹1, the same amount PAYMENT_TEST_CHARGE_PAISE names
const order = await createOrder({
  amountPaise: CHARGE,
  receipt: `sbtest_${Date.now()}`.slice(0, 40),
  notes: {
    kind: 'booking_lines',
    customerId: request.customer_id,
    lineIds: line.id,
    eventDate: request.event_date,
    area: request.area_label ?? '',
    lines: '1',
    quotedPaise: String(line.quoted_amount_paise),
    testCharge: 'true',
  },
})

if (!order.ok) { bad(`order not created — ${order.error}`); process.exit(1) }
ok(`order created (${order.id})`)

/* ── 2 · The webhook, signed the way Razorpay signs it ───────────── */
const paymentId = `pay_TEST${crypto.randomBytes(6).toString('hex')}`
const body = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: order.id, amount: CHARGE, status: 'captured' } } },
})
const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(Buffer.from(body, 'utf8')).digest('hex')

const LIVE = process.argv.includes('--live')
const LIVE_URL = process.env.LIVE_URL ?? 'https://sambramoh.vercel.app'

/** Vercel's req/res, reduced to what the handler touches. */
function invokeLocal(raw, sig) {
  let status = 0, payload = null
  const req = {
    method: 'POST',
    headers: { 'x-razorpay-signature': sig },
    on(ev, cb) {
      if (ev === 'data') cb(Buffer.from(raw, 'utf8'))
      if (ev === 'end') cb()
      return req
    },
  }
  const res = {
    status(c) { status = c; return res },
    json(b) { payload = b; return res },
  }
  return webhook(req, res).then(() => ({ status, payload }))
}

async function invokeLive(raw, sig) {
  const r = await fetch(`${LIVE_URL}/api/razorpay-webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig },
    body: raw,
  })
  const text = await r.text()
  let payload; try { payload = JSON.parse(text) } catch { payload = text.slice(0, 200) }
  return { status: r.status, payload }
}

const invoke = LIVE ? invokeLive : invokeLocal
if (LIVE) console.log(`    (against ${LIVE_URL})
`)

/* The signature check itself, before anything that depends on it. A
   handler that accepted a bad signature would make every check below
   meaningless. */
const forged = await invoke(body, crypto.randomBytes(32).toString('hex'))
if (forged.status === 400) ok('a forged signature is rejected')
else bad(`a forged signature returned ${forged.status} — the webhook is open`)

const real = await invoke(body, signature)
if (real.status === 200) ok(`webhook accepted (${JSON.stringify(real.payload)})`)
else bad(`webhook returned ${real.status} — ${JSON.stringify(real.payload)}`)

/* ── 3 · What it should have written ─────────────────────────────── */
const { data: holds } = await db
  .from('escrow_ledger').select('*').eq('line_id', line.id).eq('kind', 'HOLD')

if (holds?.length === 1) ok(`one HOLD row of ${holds[0].amount_paise} paise`)
else bad(`expected 1 HOLD row, found ${holds?.length ?? 0}`)

if (holds?.[0]?.amount_paise === CHARGE) {
  ok('the hold is what was captured, not what was quoted')
} else if (holds?.length) {
  bad(`hold is ${holds[0].amount_paise} paise but ${CHARGE} was captured — escrow would not reconcile`)
}

const { data: after } = await db
  .from('booking_lines').select('status, paid_at').eq('id', line.id).single()
if (after?.status === 'paid') ok('the line is marked paid')
else bad(`the line is still '${after?.status}'`)
if (after?.paid_at) ok('paid_at is stamped')

/* ── 4 · The retry, which Razorpay will certainly send ───────────── */
const again = await invoke(body, signature)
const { data: holds2 } = await db
  .from('escrow_ledger').select('id').eq('line_id', line.id).eq('kind', 'HOLD')
if (again.status === 200 && holds2?.length === 1) ok('a redelivery is a no-op, not a second hold')
else bad(`redelivery produced ${holds2?.length} holds (status ${again.status})`)

console.log('\n' + '─'.repeat(60))
if (fail.length) {
  console.log(`\n  ${fail.length} FAILURE(S) — a paid booking would not be recorded.\n`)
  process.exit(1)
}
console.log('\n  Payment capture works end to end.\n')
