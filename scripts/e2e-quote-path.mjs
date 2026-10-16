// LIVE test of the custom-quote path for the trades that always quote
// (End-to-End Event Logistics, Transportation), through the NEW route:
//   customer books → QUOTE (pre-filled request) → partner prices it
//   (api/submit-custom-quote) → customer accepts (api/accept-custom-quote →
//   book_accepted_quote) → Razorpay order for the advance.
// A temporary partner login is linked to the verified seeded test vendor for
// the run; every row, the link and the login are removed at the end.
//
//   node scripts/check-trade-payloads.mjs
//   node --env-file=.env scripts/e2e-quote-path.mjs
import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { CONFIG_BY_ID, buildTradePayload } = M
const h = async p => (await import(pathToFileURL(resolve(p)).href)).default
const [book, submitQuote, acceptQuote, pay] = await Promise.all(['api/_lib/anchorBook.js', 'api/submit-custom-quote.js', 'api/accept-custom-quote.js', 'api/create-booking-payment.js'].map(h))

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const VERIFIED = '4bc9bafd-aded-4212-be57-c26f0f9b5e9b'
let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); return c }

async function sessionFor(email) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const { data } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  return { token: data.session.access_token, user: data.user,
    db: createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } }) }
}
async function call(handler, body, token) {
  let status = 200, json = null
  const res = { status(s) { status = s; return this }, json(j) { json = j; return this }, setHeader() {}, end() { return this } }
  await handler({ method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', origin: 'http://localhost' }, body, query: {}, url: '/api/x' }, res)
  return { status, json }
}

const fill = q => ({ single: q.options?.[0]?.id, multi: [q.options?.[0]?.id], number: Math.max(q.min ?? 1, Math.min(q.max ?? 50, 50)), money: 100000,
  toggle: true, textarea: `E2E ${q.id}`, text: `E2E ${q.id}`, photos: [{ kind: 'photo', path: 'e2e.jpg', caption: 'x' }] }[q.type] ?? `E2E ${q.id}`)

const email = `e2e.partner.${Date.now()}@example.com`
const made = { user: null, linked: false, services: [], requests: [], quotes: [], lines: [] }
try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (ue) throw ue
  made.user = u.user.id
  const { error: le } = await admin.from('vendors').update({ profile_id: made.user }).eq('id', VERIFIED).is('profile_id', null)
  if (!ok('temporary partner login linked to the verified test vendor', !le, le?.message)) throw new Error('link failed')
  made.linked = true
  const partner = await sessionFor(email)
  const customer = await sessionFor('mohanpes328a@gmail.com')

  let n = 0
  for (const tid of ['end_to_end_event_logistics', 'transportation']) {
    const c = CONFIG_BY_ID[tid]; n++
    const date = `2026-12-${String(20 + n).padStart(2, '0')}`
    console.log(`\n── ${c.name}`)
    const { data: svc, error: se } = await partner.db.from('vendor_services')
      .insert({ vendor_id: VERIFIED, name: `E2E ${c.name}`, category: c.name, price: 1000, unit: 'per booking', specs: { e2e: true } }).select('id').single()
    if (!ok('partner creates the service', !se, se?.message)) continue
    made.services.push(svc.id)
    const answers = Object.fromEntries([...c.screens.flatMap(s => s.questions), ...(c.pricing.fields ?? []), ...(c.resources.fields ?? [])].map(q => [q.id, fill(q)]))
    if (c.redirects) answers.service_type = c.screens[0].questions[0].options.find(o => !(o.id in c.redirects)).id
    const a = { basics: { display_name: `E2E ${c.name}`, bio: 'x'.repeat(50), legal_name: 'E2E' }, location: {}, answers, catalogue: [],
      rules: { quote: { on: true } }, packages: [], addons: {}, availability: { min_notice_days: 0, horizon_months: 12, travel_model: 'customer_arranged' },
      booking: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 24 } }
    const { error: sub } = await partner.db.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: buildTradePayload(c, a) })
    if (!ok('Custom-Quote-only listing is accepted', !sub, sub?.message)) continue
    await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString() }).eq('vendor_service_id', svc.id)

    const req = { event_date: date, start_time: '09:00', guests: 120, lat: 12.9716, lng: 77.5946, pickup: { lat: 12.9716, lng: 77.5946 }, dropoff: { lat: 13.0358, lng: 77.597 } }
    const b = await call(book, { vendorServiceId: svc.id, request: req, venue: { address: 'E2E', area: 'MG Road', city: 'Bengaluru' }, note: 'E2E quote' }, customer.token)
    if (b.json?.bookingRequestId) made.requests.push(b.json.bookingRequestId)
    if (!ok(`customer request becomes a QUOTE (${(b.json?.reasons ?? []).join(', ')})`, b.status === 200 && b.json?.path === 'QUOTE' && b.json?.quoteRequestId, b.json)) continue
    made.quotes.push(b.json.quoteRequestId)

    const lines = c.quoteTemplate.slice(0, 3).map((d, i) => ({ description: d, quantity: 1, unit: 'item', unit_take_home_paise: [3000000, 500000, 200000][i] }))
    const take = lines.reduce((t, l) => t + l.unit_take_home_paise, 0)
    const sq = await call(submitQuote, { quoteRequestId: b.json.quoteRequestId, lines }, partner.token)
    ok(`partner prices it from the ${c.name} template (₹${take / 100} take-home)`, sq.status === 200 && sq.json?.responseId, sq.json)
    ok('customer price = take-home at the trade fee (8%)', sq.json?.customerAmountPaise === Math.round(take / 0.92), sq.json)
    if (!sq.json?.responseId) continue

    const ac = await call(acceptQuote, { quoteResponseId: sq.json.responseId }, customer.token)
    if (ac.json?.lineId) made.lines.push(ac.json.lineId)
    if (!ok('customer accepts → booked under the partner lock', ac.status === 200 && ac.json?.lineId, ac.json)) continue
    const o = await call(pay, { lineIds: [ac.json.lineId] }, customer.token)
    const quoted = Math.round(take / 0.92), advance = Math.round(quoted * 0.3 / 10) * 10
    ok(`Razorpay order ${o.json?.orderId ?? ''} for the 30% advance ₹${((o.json?.amountPaise ?? 0) / 100).toLocaleString('en-IN')} of ₹${(quoted / 100).toLocaleString('en-IN')}`,
      o.status === 200 && !!o.json?.orderId && o.json.amountPaise === advance, o.json)
    const { data: ln } = await admin.from('booking_lines').select('trade').eq('id', ac.json.lineId).single()
    ok(`line recorded under the trade name (${ln?.trade})`, ln?.trade === c.name, ln)
  }
} finally {
  const lineIds = [...made.lines]
  if (made.requests.length) {
    const { data } = await admin.from('booking_lines').select('id').in('request_id', made.requests)
    for (const l of data ?? []) if (!lineIds.includes(l.id)) lineIds.push(l.id)
  }
  if (lineIds.length) {
    await admin.from('sambramo_resource_reservations').delete().in('booking_line_id', lineIds)
    await admin.from('booking_lines').update({ accepted_offer_id: null }).in('id', lineIds)
    await admin.from('dispatch_offers').delete().in('line_id', lineIds)
  }
  if (made.quotes.length) {
    await admin.from('sambramo_quote_line_items').delete().in('quote_request_id', made.quotes)
    await admin.from('sambramo_quote_responses').delete().in('quote_request_id', made.quotes)
  }
  if (lineIds.length) await admin.from('booking_lines').delete().in('id', lineIds)
  if (made.quotes.length) await admin.from('sambramo_quote_requests').delete().in('id', made.quotes)
  if (made.requests.length) await admin.from('booking_requests').delete().in('id', made.requests)
  if (made.services.length) {
    await admin.from('sambramo_booking_decisions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_listing_versions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_resources').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_partner_price_books').delete().in('vendor_service_id', made.services)
    const { error } = await admin.from('vendor_services').delete().in('id', made.services)
    if (error) console.log('service cleanup:', error.message)
  }
  if (made.linked) await admin.from('vendors').update({ profile_id: null }).eq('id', VERIFIED).eq('profile_id', made.user)
  if (made.user) await admin.auth.admin.deleteUser(made.user)
  const { data: v } = await admin.from('vendors').select('profile_id').eq('id', VERIFIED).single()
  console.log(`\ncleanup: ${made.services.length} services, ${made.quotes.length} quotes, ${lineIds.length} lines; vendor unlinked: ${v.profile_id === null ? 'yes' : v.profile_id}; temp login deleted: ${made.user ? 'yes' : 'n/a'}`)
  console.log(`e2e-quote-path: ${ran - bad}/${ran} passed`)
}
