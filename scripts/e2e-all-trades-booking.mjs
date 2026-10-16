// LIVE booking test for all 34 trades through the NEW route only:
//   partner submits (RLS) → publish (what review does) → customer preview →
//   customer books through api/_lib/anchorBook.js (resolve_booking →
//   book_partner_line with reservations) → api/create-booking-payment.js
//   creates the Razorpay order for the advance (TEST keys; nothing captured).
// Runs against PRODUCTION with test accounts and removes every row it wrote.
//
//   node scripts/check-trade-payloads.mjs   (builds the payload bundle)
//   node --env-file=.env scripts/e2e-all-trades-booking.mjs [trade_id …]
import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { TRADE_CONFIGS, buildTradePayload, suggestPackages, buildCateringPayload } = M
const book = (await import(pathToFileURL(resolve('api/_lib/anchorBook.js')).href)).default
const pay = (await import(pathToFileURL(resolve('api/create-booking-payment.js')).href)).default

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const PARTNER = 'sambramo.partner.test@gmail.com', CUSTOMER = 'mohanpes328a@gmail.com'
const VERIFIED = '4bc9bafd-aded-4212-be57-c26f0f9b5e9b'   // Royal Basava Event Rentals (seeded test vendor)
const only = process.argv.slice(2)

let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); return c }
const cust = (t, fee = 0.08) => Math.round(t / (1 - fee) / 10) * 10

async function sessionFor(email) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const { data } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  return { token: data.session.access_token, user: data.user,
    db: createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } }) }
}
/* Call a Vercel-style handler in-process, exactly as the function runs. */
async function call(handler, body, token) {
  let status = 200, json = null
  const res = { status(s) { status = s; return this }, json(j) { json = j; return this }, setHeader() {}, end() { return this } }
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', origin: 'http://localhost' }
  await handler({ method: 'POST', headers, body, query: {}, url: '/api/x' }, res)
  return { status, json }
}

/* ── Answers a partner would give ───────────────────────────────────── */
function answer(q) {
  switch (q.type) {
    case 'single': return q.options[0].id
    case 'multi': return [q.options[0].id]
    case 'number': return q.min && q.min > 10 ? q.min : Math.min(q.max ?? 50, Math.max(q.min ?? 1, 50))
    case 'money': return 100000
    case 'toggle': return q.id === 'hazardous_excluded'
    case 'url': return 'https://example.com/work'
    case 'dimensions': return { l: '20', w: '15', h: '10', unit: q.unit ?? 'ft' }
    case 'photos': return Array.from({ length: q.min ?? 1 }, (_, i) => ({ kind: 'photo', path: `e2e/${i}.jpg`, caption: 'Work' }))
    case 'time': return '10:00'
    case 'date': return '2026-09-01'
    default: return `E2E ${q.id.replace(/_/g, ' ')} sample`
  }
}
const fill = qs => Object.fromEntries(qs.map(q => [q.id, answer(q)]))
// The rule each archetype is priced by in this test (every other kind stays off).
const RULE = { TIME_PERFORMER: 'hour', PERSONAL_SERVICE: 'per_person', STAFFING: 'per_staff_hour', PER_GUEST_FOOD: 'per_guest',
  TRIP_VEHICLE: 'per_trip', STORAGE_CAPACITY: 'capacity_period', CATALOGUE_PRODUCT: null, RENTAL_INVENTORY: null, VENUE_SPACE: null, PROJECT_QUOTE: 'fixed' }
const BLR = { lat: 12.9716, lng: 77.5946 }, HEBBAL = { lat: 13.0358, lng: 77.5970 }

function listingFor(c) {
  const qs = [...c.screens.flatMap(s => s.questions), ...(c.pricing.fields ?? []), ...(c.resources.fields ?? [])]
  const answers = fill(qs)
  if (c.redirects && answers.service_type in c.redirects) answers.service_type = c.screens[0].questions[0].options.find(o => !(o.id in c.redirects)).id
  // Money fields that would only distort a pricing check stay empty.
  for (const k of ['min_charge', 'min_fare', 'min_engagement', 'min_booking_fee', 'deposit']) delete answers[k]
  for (const q of qs) if (q.type === 'money' && !q.required) delete answers[q.id]
  const item = c.catalogue ? fill(c.catalogue.fields) : null
  if (item) {
    for (const k of ['min_order', 'min_qty', 'min_billable_guests', 'min_staff', 'lead_days']) if (k in item) item[k] = k === 'lead_days' ? 0 : 1
    if ('max_staff' in item) item.max_staff = 20
    if ('capacity' in item) item.capacity = 500
    if ('seats' in item) item.seats = 20
  }
  const kind = RULE[c.archetype] && c.pricing.kinds.includes(RULE[c.archetype]) ? RULE[c.archetype] : null
  const rules = kind ? { [kind]: { on: true, amount_paise: 200000, min_qty: 1, max_qty: 500, hours: 4, included_qty: 10 } } : {}
  const a = {
    basics: { display_name: `E2E ${c.name}`, bio: 'End-to-end test listing — removed automatically.'.padEnd(60, '.'), legal_name: 'E2E Test' },
    location: {}, answers, rules, packages: [], addons: {},
    catalogue: item ? [{ item_key: `${c.catalogue.key}_e2e`, answers: item }] : [],
    availability: { min_notice_days: 0, horizon_months: 12, travel_model: 'customer_arranged' },
    booking: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4 },
  }
  if (c.tiers && c.pricing.packages) a.packages = suggestPackages(c, a, { signature_uplift: 1.75, vip_factor: 2 })
  return a
}

/* Catering has its own flow: dishes → a menu → capacity (see e2e-catering-live for every case). */
const CATERER = {
  basics: { display_name: 'E2E Catering & Food', bio: 'End-to-end test listing — removed automatically.', legal_name: 'E2E Test' },
  location: {}, cuisines: ['ka_udupi', 'sp_pure_veg'],
  answers: { services: ['Wedding catering'], prep_location: 'At both locations', service_styles: ['Buffet'], service_area: '50',
    max_guests: 500, guests_per_day: 500, events_per_day: 2, staff: 20, min_billable_guests: 50, child_policy: 'same',
    fssai: { type: 'state_licence', number: '11219999000123', expiry: '2027-03-31', premises: 'E2E kitchen', responsible: 'E2E' },
    declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
  dishes: [{ item_key: 'd1', name: 'Bisi Bele Bath', category_id: 'rc_flavoured', diet: 'veg', serving: { qty: 200, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true }],
  menus: [{ menu_key: 'm1', name: 'E2E Lunch', diet: 'veg', min_guests: 50, max_guests: 500, price_model: 'per_person', price_paise: 40000, status: 'active',
    items: [{ dish_key: 'd1', course_group: 'rice_biryani', included: true }] }],
  counters: [], packages: [], extras: [],
  availability: { min_notice_days: 0, horizon_months: 12, menu_freeze_days: 0, guest_confirm_days: 0, travel_model: 'customer_arranged' },
  booking: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4 },
}

function requestFor(c, a, date) {
  if (c.customFlow === 'catering') return { event_date: date, start_time: '12:00', lat: BLR.lat, lng: BLR.lng, menu_key: 'm1', adults: 80 }
  const key = a.catalogue[0]?.item_key
  const r = { event_date: date, start_time: '10:00', lat: BLR.lat, lng: BLR.lng }
  switch (c.archetype) {
    // Priced by the hour, or per package / ceremony / act from the catalogue (what the customer page asks).
    case 'TIME_PERFORMER': {
      if (c.pricing.kinds.includes('hour')) return { ...r, hours: 3 }
      // As TradeBook sends it: the picked item's own duration.
      const it = a.catalogue[0].answers
      return { ...r, hours: Number(it.hours) || Math.round((Number(it.minutes) / 60) * 100) / 100, items: [{ item_key: key }] }
    }
    case 'PERSONAL_SERVICE': return { ...r, hours: 6, items: [{ item_key: key, qty: 2 }] }
    case 'STAFFING': return { ...r, hours: 4, staff: 2 }
    case 'PER_GUEST_FOOD': return { ...r, guests: 50, items: key ? [{ item_key: key }] : [] }
    case 'CATALOGUE_PRODUCT': return { ...r, items: [{ item_key: key, qty: 5 }] }
    case 'RENTAL_INVENTORY': return { ...r, end_date: date, items: [{ item_key: key, qty: 2 }] }
    case 'TRIP_VEHICLE': return { ...r, items: key ? [{ item_key: key }] : [], pickup: BLR, dropoff: HEBBAL, passengers: 2 }
    case 'VENUE_SPACE': return { ...r, hours: 4, guests: 50, items: [{ item_key: key }] }
    case 'STORAGE_CAPACITY': return { ...r, qty: 5, end_date: date }
    default: return { ...r, guests: 50, items: key ? [{ item_key: key }] : [] }
  }
}

/* What the engine MUST say instead of INSTANT, by design (the spec):
   licences not yet verified, coordination / custom-scope trades. */
const designedQuote = (c, reasons) => reasons.every(x => x.startsWith('licence_pending_') || ['route_needs_quote', 'custom_scope'].includes(x))

const created = { services: [], requests: [], quotes: [], docs: [] }
const restore = {}
const partner = await sessionFor(PARTNER), customer = await sessionFor(CUSTOMER)
const { data: demoVendor } = await admin.from('vendors').select('id').eq('profile_id', partner.user.id).single()
const summary = []

try {
  // Instant booking normally needs the partner's Razorpay Route account; the
  // test vendor has none, so the gate is lifted for the run and restored after.
  const { data: cfg } = await admin.from('sambramo_pricing_config').select('require_payout_for_instant').single()
  restore.cfg = cfg.require_payout_for_instant
  const { data: pol } = await admin.from('sambramo_trade_pricing_policy').select('trade_id, require_payout_for_instant')
  restore.policy = pol
  await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: false }).eq('id', true)
  await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: false }).neq('trade_id', '')

  let i = 0
  for (const c of TRADE_CONFIGS) {
    if (only.length && !only.includes(c.id)) continue
    i++
    const date = new Date(Date.UTC(2026, 11, 1 + i)).toISOString().slice(0, 10)
    console.log(`\n── ${c.order}. ${c.name}  (${c.archetype}, ${date})`)

    // 1. Partner creates the service and submits it through RLS.
    const { data: svc, error: e1 } = await partner.db.from('vendor_services')
      .insert({ vendor_id: demoVendor.id, name: `E2E ${c.name}`, category: c.name, price: 1000, unit: 'per booking', specs: { e2e: true } }).select('id').single()
    if (!ok('partner creates the service', !e1, e1?.message)) continue
    created.services.push(svc.id)

    let a = null, submitErr
    if (c.legacyFlow) {
      const { error } = await partner.db.rpc('submit_anchor_listing_version', { p_vendor_service_id: svc.id, p_payload: {
        legal_name: 'E2E Test', profile: { stage_name: 'E2E Anchor', events: ['wedding'], languages: [{ name: 'English', level: 'fluent' }], max_audience: 500 },
        models: { hour: { take_home_paise: 500000, min_hours: 2, max_hours: 8, hours: 2, extra_hour_take_home_paise: 600000 }, full_day: { take_home_paise: 2500000, hours: 8 } },
        addons: [], overrides: {},
        booking_rules: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4, min_notice_days: 0, horizon_months: 12, max_consecutive_hours: 8 },
        travel_rules: { model: 'customer_arranged' }, location: {} } })
      submitErr = error
    } else {
      a = c.customFlow === 'catering' ? CATERER : listingFor(c)
      const payload = c.customFlow === 'catering' ? buildCateringPayload(c, a) : buildTradePayload(c, a)
      const { error } = await partner.db.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: payload })
      submitErr = error
    }
    if (!ok('submit is accepted', !submitErr, submitErr?.message)) continue

    // 2. Publish exactly as review_sambramo_listing_version does on approval.
    await admin.from('vendor_services').update({ vendor_id: VERIFIED }).eq('id', svc.id)
    await admin.from('sambramo_resources').update({ vendor_id: VERIFIED }).eq('vendor_service_id', svc.id)
    const { data: lv } = await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString(),
      price_locked_until: new Date(Date.now() + 15 * 864e5).toISOString() }).eq('vendor_service_id', svc.id).eq('status', 'UNDER_REVIEW').select('id').single()
    await admin.from('sambramo_trade_packages').update({ status: 'LIVE' }).eq('listing_version_id', lv.id)

    // 3. Customer preview, then the real booking, through the new route.
    const req = c.legacyFlow ? { event_date: date, start_time: '18:00', hours: 3, guests: 100, lat: BLR.lat, lng: BLR.lng } : requestFor(c, a, date)
    const attempt = async label => {
      const p = (await call(book, { vendorServiceId: svc.id, request: req, preview: true }, customer.token)).json ?? {}
      const instantOk = p.path === 'INSTANT'
      const quoteOk = p.path === 'QUOTE' && designedQuote(c, p.reasons ?? [])
      ok(`${label}engine decides ${p.path}${p.reasons?.length ? ` (${p.reasons.join(', ')})` : ''}`, instantOk || quoteOk, p.reasons_text ?? p.error ?? p)
      if (instantOk) ok(`total ₹${(p.customer_paise / 100).toLocaleString('en-IN')} = lines + 8% fee, advance 30%`,
        p.customer_paise === cust(p.take_home_paise) && p.advance_paise === Math.round(p.customer_paise * 0.3 / 10) * 10, p)
      const r = await call(book, { vendorServiceId: svc.id, request: req, venue: { address: 'E2E venue', area: 'MG Road', city: 'Bengaluru' }, note: 'E2E' }, customer.token)
      if (r.json?.bookingRequestId) created.requests.push(r.json.bookingRequestId)
      if (r.json?.quoteRequestId) created.quotes.push(r.json.quoteRequestId)
      if (instantOk) {
        if (!ok('booked: line ACCEPTED for this partner', r.status === 200 && r.json?.lineId, r.json)) return { p, booked: false }
        const { data: line } = await admin.from('booking_lines').select('status, trade, quoted_amount_paise').eq('id', r.json.lineId).single()
        ok('line carries the trade and the server price', line.status === 'accepted' && line.trade === c.name && line.quoted_amount_paise === p.customer_paise, line)
        const { count } = await admin.from('sambramo_resource_reservations').select('id', { count: 'exact', head: true }).eq('booking_line_id', r.json.lineId)
        if ((p.reservations ?? []).length) ok(`${count} reservation(s) held atomically`, count === p.reservations.length, count)
        await new Promise(r => setTimeout(r, 1500))   // Razorpay test mode rate-limits bursts of orders
        const o = await call(pay, { lineIds: [r.json.lineId] }, customer.token)
        ok(`Razorpay order ${o.json?.orderId ?? ''} for the advance ₹${((o.json?.amountPaise ?? 0) / 100).toLocaleString('en-IN')}`,
          o.status === 200 && o.json?.orderId && o.json.amountPaise === p.advance_paise, o.json)
        return { p, booked: o.status === 200 }
      }
      if (quoteOk) ok('quote request sent to the partner, pre-filled', r.status === 200 && r.json?.quoteRequestId, r.json)
      return { p, booked: false, quoted: quoteOk }
    }
    const first = await attempt('')
    if (first.booked) { summary.push([c.name, 'INSTANT · booked · order created']); continue }
    if (!first.quoted) { summary.push([c.name, `FAILED: ${(first.p.reasons ?? [first.p.error]).join(', ')}`]); continue }
    // Licence-gated: once the licences are accepted the same listing must book instantly.
    const docs = [...new Set((first.p.reasons ?? []).filter(x => x.startsWith('licence_pending_')).map(x => 'VER-TRADE-' + x.slice(16).toUpperCase()))]
    if (!docs.length) { summary.push([c.name, `QUOTE by design (${first.p.reasons.join(', ')})`]); continue }
    const { data: have } = await admin.from('vendor_documents').select('requirement_id').eq('vendor_id', VERIFIED).in('requirement_id', docs)
    const add = docs.filter(d => !(have ?? []).some(h => h.requirement_id === d))
    if (add.length) {
      const { data: ins, error: de } = await admin.from('vendor_documents').insert(add.map(d => ({ vendor_id: VERIFIED, kind: 'other', requirement_id: d,
        trade: c.name, storage_path: `e2e/${d}.pdf`, status: 'accepted', reviewed_at: new Date().toISOString() }))).select('id')
      if (!ok(`licences accepted for the test (${add.join(', ')})`, !de, de?.message)) { summary.push([c.name, 'QUOTE (could not stage licences)']); continue }
      created.docs.push(...ins.map(x => x.id))
    }
    const second = await attempt('with licences accepted: ')
    summary.push([c.name, second.booked ? `QUOTE until licensed → INSTANT once ${docs.map(d => d.slice(10).toLowerCase()).join('+')} accepted · order created`
      : `QUOTE by design (${(second.p.reasons ?? []).join(', ')})`])
  }
} finally {
  // Undo, in dependency order. Nothing was captured, so no escrow rows exist.
  const reqs = created.requests, svcs = created.services
  if (reqs.length) {
    const { data: lines } = await admin.from('booking_lines').select('id').in('request_id', reqs)
    const lineIds = (lines ?? []).map(l => l.id)
    if (lineIds.length) {
      await admin.from('sambramo_resource_reservations').delete().in('booking_line_id', lineIds)
      await admin.from('booking_lines').update({ accepted_offer_id: null }).in('id', lineIds)
      await admin.from('dispatch_offers').delete().in('line_id', lineIds)
      await admin.from('booking_lines').delete().in('id', lineIds)
    }
  }
  if (created.docs.length) await admin.from('vendor_documents').delete().in('id', created.docs)
  if (created.quotes.length) {
    await admin.from('sambramo_quote_line_items').delete().in('quote_request_id', created.quotes)
    await admin.from('sambramo_quote_requests').delete().in('id', created.quotes)
  }
  if (reqs.length) await admin.from('booking_requests').delete().in('id', reqs)
  if (svcs.length) {
    await admin.from('sambramo_booking_decisions').delete().in('vendor_service_id', svcs)
    const { data: vs } = await admin.from('sambramo_listing_versions').select('id').in('vendor_service_id', svcs)
    const ids = (vs ?? []).map(v => v.id)
    if (ids.length) {
      await admin.from('sambramo_trade_packages').delete().in('listing_version_id', ids)
      await admin.from('sambramo_listing_versions').delete().in('id', ids)
    }
    await admin.from('sambramo_trade_packages').delete().in('vendor_service_id', svcs)
    await admin.from('sambramo_resources').delete().in('vendor_service_id', svcs)
    await admin.from('sambramo_partner_price_books').delete().in('vendor_service_id', svcs)
    const { error } = await admin.from('vendor_services').delete().in('id', svcs)
    console.log(`\ncleanup: ${svcs.length} services, ${reqs.length} booking requests, ${created.quotes.length} quotes${error ? ` — ${error.message}` : ''}`)
  }
  if ('cfg' in restore) await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: restore.cfg }).eq('id', true)
  for (const p of restore.policy ?? []) await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: p.require_payout_for_instant }).eq('trade_id', p.trade_id)
  console.log('payout gate restored:', 'cfg' in restore ? 'yes' : 'not changed')
  console.log('\n══ Summary')
  for (const [n, s] of summary) console.log(`  ${n.padEnd(30)} ${s}`)
  console.log(`\ne2e-all-trades-booking: ${ran - bad}/${ran} passed`)
}
