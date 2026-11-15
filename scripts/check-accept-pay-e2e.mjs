#!/usr/bin/env node
/**
 * Request → reply → accept → pay, end to end, through the real API
 * (Mohan, 2026-11-15: "no real accept-and-pay was tested — complete it").
 *
 *   node --env-file=.env scripts/serve-api-local.mjs          # in another terminal
 *   node --env-file=.env scripts/check-accept-pay-e2e.mjs [http://localhost:4000] [--keep]
 *
 * As the demo customer (a minted session, never a password):
 *   1. a price request goes to one SYNTHETIC photographer, through
 *      /api/anchor?op=book exactly as the app sends it (quote: true)
 *   2. the synthetic partner answers it (scripts/synthetic-partner-replies.mjs
 *      writes what api/submit-custom-quote.js writes for a real partner)
 *   3. the customer reads the reply and accepts it — /api/accept-custom-quote
 *      books an ACCEPTED line at the Sambramo price
 *   4. /api/create-booking-payment opens the Razorpay order for that line;
 *      the amount must equal what the line says is due now
 * Then, unless --keep, the line is cancelled through cancel_line (nothing was
 * paid, so nothing moves) and nothing is left holding a synthetic partner.
 *
 * Razorpay runs on a TEST key here, so step 4 creates a test order and no
 * money exists to move. Completing that order needs Razorpay's own checkout
 * (a test card or success@razorpay) — the one step a script cannot tap.
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'

const API = process.argv.slice(2).find(a => a.startsWith('http')) ?? 'http://localhost:4000'
const KEEP = process.argv.includes('--keep')
const url = process.env.VITE_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const EMAIL = 'mohanpes328a@gmail.com'
const TAG = 'synthetic-marketplace-2026-10-22'
let bad = 0
const say = (ok, m) => { if (!ok) bad++; console.log(`  ${ok ? '✓' : '✗'} ${m}`) }
const stop = m => { console.log(`  ✗ ${m}`); process.exit(1) }

/* The customer. */
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
const { data: s, error: se } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
if (se) stop(`sign-in: ${se.message}`)
const token = s.session.access_token
const me = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
const post = async (path, body) => {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => null) }
}

/* One synthetic photographer near Bengaluru. */
const BLR = { lat: 12.9716, lng: 77.5946 }
const { data: syn } = await admin.from('vendors').select('id').eq('is_synthetic', true).eq('verification_note', TAG)
const synIds = new Set((syn ?? []).map(v => v.id))
const { data: list } = await anon.rpc('public_listings', { p_trade: 'Photography', p_lat: BLR.lat, p_lng: BLR.lng, p_limit: 40 })
const { data: svcs } = await admin.from('vendor_services').select('id, vendor_id').in('id', (list ?? []).map(x => x.vendor_service_id))
const pick = (svcs ?? []).find(x => synIds.has(x.vendor_id))
if (!pick) stop('no synthetic photographer is live near Bengaluru')
const name = list.find(x => x.vendor_service_id === pick.id)?.display_name
console.log(`master: ${name} (${pick.id.slice(0, 8)})`)

/* 1 · the price request. */
const date = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10)
const request = { event_date: date, start_time: '18:00', lat: BLR.lat, lng: BLR.lng, guests: 60, hours: 4 }
const sent = await post('/api/anchor?op=book', { vendorServiceId: pick.id, request, note: 'Needs: candid + family portraits · e2e check', venue: { address: 'Indiranagar, Bengaluru', area: 'Indiranagar', city: 'Bengaluru' }, quote: true })
const qid = sent.json?.quoteRequestId
say(!!qid, `price request sent → ${sent.status} ${qid ? `quote ${qid.slice(0, 8)}` : JSON.stringify(sent.json).slice(0, 200)}`)
if (!qid) process.exit(1)

/* 2 · the synthetic master answers. */
const rep = spawnSync(process.execPath, ['--env-file=.env', 'scripts/synthetic-partner-replies.mjs'], { encoding: 'utf8' })
const { data: resp } = await me.from('sambramo_quote_responses').select('id, status, customer_amount_paise').eq('quote_request_id', qid)
const reply = (resp ?? []).find(x => x.status === 'SUBMITTED')
say(!!reply, `the master replied → ${reply ? `₹${Math.round(reply.customer_amount_paise / 100).toLocaleString('en-IN')} (their own figure; the customer sees it at the Sambramo price)` : (rep.stdout || rep.stderr).slice(-200)}`)
if (!reply) process.exit(1)

/* 3 · the customer accepts. */
const acc = await post('/api/accept-custom-quote', { quoteResponseId: reply.id })
const lineId = acc.json?.lineId
say(!!lineId, `accepted → ${acc.status} ${lineId ? `line ${lineId.slice(0, 8)}` : JSON.stringify(acc.json).slice(0, 200)}`)
if (!lineId) process.exit(1)
const { data: line } = await me.from('booking_lines').select('id, status, quoted_amount_paise').eq('id', lineId).single()
say(line?.status === 'accepted', `the line is "${line?.status}" — the customer's bookings show "Accepted · pay to confirm"`)

/* 4 · the payment order. */
const due = await post('/api/create-booking-payment', { lineIds: [lineId], part: 'advance', preview: true })
const order = await post('/api/create-booking-payment', { lineIds: [lineId], part: 'advance' })
const dueNow = (due.json?.lines ?? []).reduce((n, l) => n + Number(l.due || 0), 0)
say(!!order.json?.orderId, `Razorpay order opened → ${order.status} ${order.json?.orderId ?? JSON.stringify(order.json).slice(0, 200)} · key ${String(order.json?.keyId ?? '').slice(0, 9)}…`)
say(order.json?.orderId && (order.json.testCharge ? order.json.testCharge.quotedPaise === dueNow : order.json.amountPaise === dueNow),
  `order amount ₹${Math.round((order.json?.testCharge?.quotedPaise ?? order.json?.amountPaise ?? 0) / 100).toLocaleString('en-IN')} = due now ₹${Math.round(dueNow / 100).toLocaleString('en-IN')}${order.json?.testCharge ? ` (test charge ₹${order.json.testCharge.chargedPaise / 100})` : ''}`)

/* Clean up: nothing was paid, so cancelling moves no money. */
if (!KEEP) {
  const c = await me.rpc('cancel_line', { p_line_id: lineId, p_reason: 'e2e check' })
  say(!c.error && c.data?.ok !== false, `cleaned up — line cancelled (${c.error?.message ?? 'nothing paid, nothing refunded'})`)
}
console.log(bad ? `${bad} problem(s)` : '✓ request → reply → accept → payment order, end to end')
process.exit(bad ? 1 : 0)
