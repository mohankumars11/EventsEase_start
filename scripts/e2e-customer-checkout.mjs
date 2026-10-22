#!/usr/bin/env node
/**
 * The customer app's booking path, against the LIVE engine.
 *
 *   node --env-file=.env scripts/e2e-customer-checkout.mjs            # previews only — writes nothing
 *   node --env-file=.env scripts/e2e-customer-checkout.mjs --book     # + book one instant line, open its Razorpay TEST order
 *   node --env-file=.env scripts/e2e-customer-checkout.mjs --offer    # + send one offer, read it back as the customer
 *
 * Uses the app's OWN modules (src/customer/lib/market.js and booking.js,
 * bundled with esbuild) so what is tested is what ships: the partner
 * ranking, the "from" reference behind each price, and the request each
 * archetype sends. The API handlers run in-process, as Vercel runs them.
 * --book / --offer remove every row they write (nothing is ever captured,
 * so no escrow row exists to block the cleanup).
 */
import { build } from 'esbuild'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BOOK = process.argv.includes('--book'), OFFER = process.argv.includes('--offer')
const OUT = join(ROOT, 'node_modules/.cache/customer-booking.mjs')
mkdirSync(dirname(OUT), { recursive: true })
await build({
  stdin: { contents: `export * from './src/customer/lib/market.js'; export * from './src/customer/lib/booking.js'; export * from './src/customer/lib/estimate.js'; export { OCCASION } from './src/customer/data/occasions.js'`, resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', jsx: 'automatic',
  loader: { '.png': 'empty', '.svg': 'empty', '.css': 'empty' }, external: ['@supabase/supabase-js', '@capacitor/*'],
  define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY }) },
})
const C = await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)
const book = (await import(pathToFileURL(join(ROOT, 'api/_lib/anchorBook.js')).href)).default
const pay = (await import(pathToFileURL(join(ROOT, 'api/create-booking-payment.js')).href)).default
const accept = (await import(pathToFileURL(join(ROOT, 'api/accept-custom-quote.js')).href)).default
const confirm = (await import(pathToFileURL(join(ROOT, 'api/_lib/confirmPayment.js')).href)).default
const { answerOpen } = await import(pathToFileURL(join(ROOT, 'scripts/synthetic-partner-replies.mjs')).href)

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CUSTOMER = 'mohanpes328a@gmail.com'
let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d).slice(0, 300)}`}`); return c }
async function call(handler, body, token) {
  let status = 200, json = null
  const res = { status(s) { status = s; return this }, json(j) { json = j; return this }, setHeader() {}, end() { return this } }
  await handler({ method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json', origin: 'http://localhost' }, body, query: {}, url: '/api/x' }, res)
  return { status, json }
}

/* A real plan: the wedding reception's essentials, the best partner for each, as the app picks them. */
const occ = C.OCCASION['wedding-reception']
const date = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
const event = { occasionId: occ.id, date, time: '19:00', hours: 4, guests: 300 }
const place = { area: 'Koramangala', lat: 12.9352, lng: 77.6245, address: 'E2E test, 5th Block' }
console.log(`\n── Plan: ${occ.name}, ${date} 7 PM, 300 guests, Koramangala`)
const lines = []
for (const t of [...occ.must, 'videography', 'dj_music']) {
  const list = C.rank(await C.partnersFor(t, { lat: place.lat, lng: place.lng }))
  if (!ok(`${t}: live partners found (${list.length})`, list.length > 0)) continue
  const p = list[0]
  ok(`${t}: price carries what it is for (${p.fromKind}${p.fromRef?.key ? ` ${p.fromRef.key}` : ''})`, !!p.fromRef?.type, p)
  lines.push({ key: `${occ.id}:${t}`, occasionId: occ.id, tradeId: t, serviceId: p.serviceId, name: p.name, fromPaise: p.fromPaise, fromKind: p.fromKind,
    fromUnit: p.fromUnit, fromLabel: p.fromLabel, fromRef: p.fromRef, qty: null, instant: p.instant })
}

console.log('\n── Engine previews (what checkout shows before payment)')
const previews = {}
for (const l of lines) {
  const r = (await call(book, { vendorServiceId: l.serviceId, request: C.requestFor(l, event, place), preview: true })).json ?? {}
  previews[l.key] = r
  const floor = C.lineFloor(l, event).paise
  ok(`${l.tradeId}: ${r.path}${r.customer_paise ? ` ₹${Math.round(r.customer_paise / 100).toLocaleString('en-IN')}` : ''}${r.reasons_text?.length ? ` (${r.reasons_text.join(' ')})` : ''}${floor ? ` · plan showed ₹${Math.round(floor / 100).toLocaleString('en-IN')}` : ''}`,
    ['INSTANT', 'QUOTE'].includes(r.path), r)
}

const created = { lines: [], requests: [], quotes: [] }
let token = null
if (BOOK || OFFER) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: CUSTOMER })
  const { data: s } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  token = s.session.access_token
  var customerDb = createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
}
try {
  if (BOOK) {
    console.log('\n── Book one instant line, then open its payment')
    const l = lines.find(x => previews[x.key]?.path === 'INSTANT')
    if (ok('an instant line exists to book', !!l)) {
      const venue = { address: place.address, area: place.area, city: 'Bengaluru' }
      const r = (await call(book, { vendorServiceId: l.serviceId, request: C.requestFor(l, event, place), venue, note: 'E2E customer checkout — removed automatically' }, token)).json ?? {}
      if (r.lineId) created.lines.push(r.lineId)
      if (r.bookingRequestId) created.requests.push(r.bookingRequestId)
      ok(`${l.tradeId} booked: accepted line ${String(r.lineId).slice(0, 8)}`, !!r.lineId, r)
      const { data: mine } = await customerDb.from('booking_lines').select('id, status, quoted_amount_paise').eq('id', r.lineId).maybeSingle()
      ok('the customer reads it under RLS (what Plans → Booked shows)', mine?.status === 'accepted', mine)
      /* partner_jobs scopes itself to auth.uid(), so the service role sees
         nothing through it. Its join is what decides: an ACCEPTED offer
         to the partner who owns the service (migration 141:90-96). */
      const { data: svcRow } = await admin.from('vendor_services').select('vendor_id').eq('id', l.serviceId).single()
      const { data: offerRow } = await admin.from('dispatch_offers').select('id, status, vendor_id').eq('line_id', r.lineId).eq('status', 'ACCEPTED').maybeSingle()
      ok("it is on the partner's Jobs list (an ACCEPTED offer to the service's own partner)", offerRow?.vendor_id === svcRow?.vendor_id, offerRow ?? 'no accepted offer')
      const o = (await call(pay, { lineIds: [r.lineId], part: 'advance' }, token)).json ?? {}
      ok(`Razorpay order opened for ₹${Math.round((o.amountPaise ?? 0) / 100).toLocaleString('en-IN')} (${o.provider})${o.testCharge ? ' · TEST CHARGE' : ''}`, !!o.orderId, o)
      if (o.orderId) {
        const crypto = await import('node:crypto')
        const forged = (await call(confirm, { orderId: o.orderId, paymentId: 'pay_e2eForged', signature: 'f'.repeat(64) }, token))
        ok('confirm-payment refuses a forged signature', forged.status === 400, forged)
        const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${o.orderId}|pay_e2eNoSuchPayment`).digest('hex')
        const unknown = (await call(confirm, { orderId: o.orderId, paymentId: 'pay_e2eNoSuchPayment', signature: sig }, token))
        ok('a valid signature is checked against Razorpay itself (no such payment → refused)', unknown.status === 502, unknown)
      }
    }
  }
  if (OFFER) {
    console.log('\n── Send an offer (negotiation)')
    const l = lines.find(x => x.tradeId === 'photography') ?? lines[0]
    const listed = previews[l.key]?.customer_paise ?? l.fromPaise
    const offer = { offer_paise: Math.round(listed * 0.9 / 100) * 100, reasons: ['Weekday event', 'Booking several services'], message: 'E2E offer — removed automatically' }
    const r = (await call(book, { vendorServiceId: l.serviceId, request: C.requestFor(l, event, place), negotiate: offer, venue: { address: place.address, area: place.area, city: 'Bengaluru' } }, token)).json ?? {}
    if (r.quoteRequestId) created.quotes.push(r.quoteRequestId)
    if (r.bookingRequestId) created.requests.push(r.bookingRequestId)
    ok('an instant listing still becomes a quote request when the customer negotiates', !!r.quoteRequestId && !r.lineId, r)
    const { data: q } = await admin.from('sambramo_quote_requests').select('state, canonical_demand').eq('id', r.quoteRequestId).maybeSingle()
    ok(`the partner reads the offer first: "${q?.canonical_demand?.summary?.slice(0, 90)}…"`, /Customer offers/.test(q?.canonical_demand?.summary ?? ''), q)
    const { data: seen, error } = await customerDb.from('sambramo_quote_requests').select('id, state').eq('id', r.quoteRequestId).maybeSingle()
    ok('the customer reads their own quote request under RLS', seen?.id === r.quoteRequestId, error?.message ?? seen)

    console.log('\n── The partner replies, the customer accepts and pays')
    const n = await answerOpen({ only: r.quoteRequestId, log: () => {} })
    ok('the (synthetic) partner answered the offer', n === 1)
    const { data: resp, error: re } = await customerDb.from('sambramo_quote_responses').select('id, status, customer_amount_paise, notes').eq('quote_request_id', r.quoteRequestId).maybeSingle()
    ok(`the customer sees their quote: ₹${Math.round((resp?.customer_amount_paise ?? 0) / 100).toLocaleString('en-IN')} — "${resp?.notes ?? ''}"`, resp?.status === 'SUBMITTED', re?.message ?? resp)
    if (resp) {
      const a = (await call(accept, { quoteResponseId: resp.id }, token))
      if (a.json?.lineId) created.lines.push(a.json.lineId)
      ok('accepting books it: an accepted line at the quoted price', !!a.json?.lineId && a.json.amountPaise === resp.customer_amount_paise, a.json)
      if (a.json?.lineId) {
        const o = (await call(pay, { lineIds: [a.json.lineId], part: 'advance' }, token)).json ?? {}
        ok(`Razorpay order opened for the accepted quote (₹${Math.round((o.amountPaise ?? 0) / 100).toLocaleString('en-IN')})`, !!o.orderId, o)
      }
    }
  }
} finally {
  if (created.lines.length) {
    await admin.from('sambramo_booking_decisions').delete().in('booking_line_id', created.lines)
    await admin.from('sambramo_resource_reservations').delete().in('booking_line_id', created.lines)
    await admin.from('booking_lines').update({ accepted_offer_id: null }).in('id', created.lines)
    await admin.from('dispatch_offers').delete().in('line_id', created.lines)
    const { error } = await admin.from('booking_lines').delete().in('id', created.lines)
    if (error) console.log(`  ! line cleanup: ${error.message}`)
  }
  if (created.quotes.length) {
    await admin.from('sambramo_quote_responses').delete().in('quote_request_id', created.quotes)
    await admin.from('sambramo_quote_line_items').delete().in('quote_request_id', created.quotes)
    await admin.from('sambramo_booking_decisions').delete().in('quote_request_id', created.quotes)
    await admin.from('sambramo_quote_requests').delete().in('id', created.quotes)
  }
  if (created.requests.length) {
    const { error } = await admin.from('booking_requests').delete().in('id', created.requests)
    if (error) console.log(`  ! request cleanup: ${error.message}`)
  }
}
console.log(`\ncustomer checkout: ${ran - bad}/${ran} passed${created.lines.length + created.quotes.length ? ' · test rows removed' : ''}`)
process.exit(bad ? 1 : 0)
