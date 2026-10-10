// LIVE test of Catering & Food on the new engine (migrations 20261010_12–14):
//   partner submits menus / counters / package / extras through RLS →
//   publish → resolve_catering prices every case → real bookings under the
//   vendor lock → Razorpay order for the advance (TEST keys, nothing captured)
//   → a price change leaves the booked snapshot alone → a quote with a
//   discount line is accepted and its advance charged.
// A temporary partner login is linked to the verified seeded test vendor for
// the run; every row, the link, the FSSAI test document and the login are
// removed at the end, and the payout gate is restored.
//
//   node scripts/check-trade-payloads.mjs        (builds the payload bundle)
//   node --env-file=.env scripts/e2e-catering-live.mjs
import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { CONFIG_BY_ID, buildCateringPayload, cateringDone, CATERING_STAGES } = M
const h = async p => (await import(pathToFileURL(resolve(p)).href)).default
const [book, submitQuote, acceptQuote, pay] = await Promise.all(['api/_lib/anchorBook.js', 'api/submit-custom-quote.js', 'api/accept-custom-quote.js', 'api/create-booking-payment.js'].map(h))

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const VERIFIED = '4bc9bafd-aded-4212-be57-c26f0f9b5e9b'
let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); return c }
const rs = p => `₹${(p / 100).toLocaleString('en-IN')}`
const sleep = ms => new Promise(r => setTimeout(r, ms))

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

/* ── The caterer (take-home paise) ──────────────────────────────────── */
const P = 100
function caterer(m1Price = 520 * P) {
  return {
    _schema: 2,
    basics: { display_name: 'E2E Annapoorna Caterers', bio: 'End-to-end catering test listing — removed automatically after the run.', legal_name: 'E2E Catering' },
    location: { lat: 12.925, lng: 77.5938, source: 'manual', confirmed: true, formatted_address: 'Jayanagar, Bengaluru', city: 'Bengaluru', state: 'Karnataka', postal_code: '560011' },
    cuisines: ['ka_udupi', 'ka_traditional', 'sp_pure_veg', 'sp_jain'],
    answers: { services: ['Wedding catering'], prep_location: 'At both locations', service_styles: ['Buffet', 'Live cooking'], service_area: '50',
      max_guests: 1200, guests_per_day: 1200, events_per_day: 2, staff: 45, service_hours: 4, min_billable_guests: 150, child_policy: 'per_menu',
      fssai: { type: 'state_licence', number: '11219999000123', expiry: '2027-03-31', premises: 'E2E kitchen', responsible: 'E2E Cook' },
      declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
    dishes: [
      { item_key: 'menu_lx1', name: 'Badam Alva', category_id: 'ds_halwa', diet: 'veg', serving: { qty: 100, unit: 'g' }, allergens: ['Nuts (tree nuts)'], menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd2', name: 'Bisi Bele Bath', category_id: 'rc_flavoured', diet: 'veg', serving: { qty: 200, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd3', name: 'Kosambari', category_id: 'ac_kosambari', diet: 'veg', serving: { qty: 60, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd5', name: 'Holige', category_id: 'ds_holige', diet: 'veg', serving: { qty: 1, unit: 'piece' }, allergens: ['Gluten / wheat'], menu_eligible: true, standalone: { on: true, unit: 'per_piece', price_paise: 35 * P, min_qty: 50 }, active: true },
      { item_key: 'd6', name: 'Masala Dosa', category_id: 'bf_dosa', diet: 'veg', serving: { qty: 1, unit: 'piece' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd7', name: 'Jalebi', category_id: 'ds_halwa', diet: 'veg', serving: { qty: 2, unit: 'piece' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
    ],
    menus: [
      { menu_key: 'm1', name: 'Udupi Wedding Lunch', diet: 'veg', min_guests: 150, max_guests: 1200, price_model: 'per_person', price_paise: m1Price, child_price_paise: 300 * P, status: 'active',
        items: [{ dish_key: 'd3', course_group: 'salads', included: true }, { dish_key: 'd2', course_group: 'rice_biryani', included: true },
          { dish_key: 'd5', course_group: 'desserts', included: true }, { dish_key: 'menu_lx1', course_group: 'desserts', included: false, required: false, extra_paise: 40 * P }] },
      { menu_key: 'm2', name: 'Corporate Lunch Box', diet: 'veg', min_guests: 50, price_model: 'fixed', price_paise: 30000 * P, fixed_scope: { guests: 100, hours: 2 }, extra_guest_paise: 280 * P, status: 'active',
        items: [{ dish_key: 'd2', course_group: 'rice_biryani', included: true }] },
      { menu_key: 'm3', name: 'Royal Banquet (on request)', diet: 'veg', min_guests: 200, price_model: 'quote', status: 'active',
        items: [{ dish_key: 'd2', course_group: 'rice_biryani', included: true }, { dish_key: 'menu_lx1', course_group: 'desserts', included: true }] },
    ],
    counters: [
      { counter_key: 'c1', name: 'Live Dosa Counter', counter_type: 'Dosa Counter', dish_keys: ['d6'], price_model: 'per_event', price_paise: 9000 * P, duration_hours: 3, included_servings: 250,
        extra_serving_paise: 35 * P, extra_hour_paise: 2500 * P, chefs: 2, available_qty: 2, status: 'active' },
      { counter_key: 'c2', name: 'Jalebi Counter', counter_type: 'Sweet Counter', dish_keys: ['d7'], price_model: 'per_hour', price_paise: 3000 * P, duration_hours: 2, available_qty: 1, status: 'active' },
      { counter_key: 'c3', name: 'Holige Counter', counter_type: 'Sweet Counter', dish_keys: ['d5'], price_model: 'per_serving', price_paise: 60 * P, available_qty: 1, status: 'active' },
    ],
    packages: [{ key: 'pkg_classic', name: 'Classic Udupi Wedding', tier: 'SIGNATURE', menu_keys: ['m1'], counter_keys: ['c1'], included_addons: ['crockery'],
      guest_min: 300, guest_max: 800, hours: 5, staff: 20, price_model: 'per_guest', price_paise: 650 * P, status: 'active' }],
    extras: [{ id: 'extra_staff', label: 'Additional serving staff', unit: 'per_staff_hour', on: true, take_home_paise: 250 * P },
      { id: 'crockery', label: 'Crockery and cutlery', unit: 'per_guest', on: true, take_home_paise: 25 * P }],
    availability: { min_notice_days: 0, horizon_months: 12, menu_freeze_days: 5, guest_confirm_days: 3, travel_buffer_minutes: 0, travel_model: 'per_km', travel_per_km_paise: 25 * P },
    booking: { instant: true, advance_pct: 30, cancellation: 'moderate', custom_quotes: true, quote_hours: 12 },
  }
}

const BLR = { lat: 12.9716, lng: 77.5946 }
const day = n => `2026-12-${String(n).padStart(2, '0')}`
const email = `e2e.caterer.${Date.now()}@example.com`
const made = { user: null, linked: false, services: [], requests: [], quotes: [], lines: [], docs: [] }
const restore = {}
const summary = []

try {
  const c = CONFIG_BY_ID.catering_food
  const a = caterer()
  ok('the test caterer completes all 13 stages', CATERING_STAGES.every(st => cateringDone(a).has(st.id)), CATERING_STAGES.filter(st => !cateringDone(a).has(st.id)).map(s => s.id))

  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (ue) throw ue
  made.user = u.user.id
  const { error: le } = await admin.from('vendors').update({ profile_id: made.user }).eq('id', VERIFIED).is('profile_id', null)
  if (!ok('temporary partner login linked to the verified test vendor', !le, le?.message)) throw new Error('link failed')
  made.linked = true
  const partner = await sessionFor(email)
  const customer = await sessionFor('mohanpes328a@gmail.com')

  const { data: cfg } = await admin.from('sambramo_pricing_config').select('require_payout_for_instant').single()
  restore.cfg = cfg.require_payout_for_instant
  const { data: pol } = await admin.from('sambramo_trade_pricing_policy').select('trade_id, require_payout_for_instant')
  restore.policy = pol
  await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: false }).eq('id', true)
  await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: false }).neq('trade_id', '')

  /* 1. Submit through RLS */
  console.log('\n── Partner submits (RLS)')
  const { data: svc, error: se } = await partner.db.from('vendor_services')
    .insert({ vendor_id: VERIFIED, name: 'E2E Catering & Food', category: c.name, price: 1000, unit: 'per guest', specs: { e2e: true } }).select('id').single()
  if (!ok('partner creates the service', !se, se?.message)) throw new Error('no service')
  made.services.push(svc.id)
  const { error: sub } = await partner.db.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: buildCateringPayload(c, a) })
  if (!ok('submit_listing_version accepts menus, counters, package and extras', !sub, sub?.message)) throw new Error('submit failed')
  const { data: lv } = await admin.from('sambramo_listing_versions').select('id, status').eq('vendor_service_id', svc.id).single()
  const counts = {}
  for (const t of ['sambramo_catering_menus', 'sambramo_catering_menu_items', 'sambramo_live_counters', 'sambramo_catalogue_items', 'sambramo_addon_rules'])
    counts[t] = (await admin.from(t).select('id', { count: 'exact', head: true }).eq('listing_version_id', lv.id)).count
  const { data: ctrIds } = await admin.from('sambramo_live_counters').select('id').eq('listing_version_id', lv.id)
  counts.sambramo_live_counter_items = (await admin.from('sambramo_live_counter_items').select('dish_key', { count: 'exact', head: true }).in('counter_id', (ctrIds ?? []).map(x => x.id))).count
  ok(`written: ${counts.sambramo_catering_menus} menus, ${counts.sambramo_catering_menu_items} menu items, ${counts.sambramo_live_counters} counters (${counts.sambramo_live_counter_items} dishes), ${counts.sambramo_catalogue_items} dishes, ${counts.sambramo_addon_rules} extras`,
    counts.sambramo_catering_menus === 3 && counts.sambramo_catering_menu_items === 7 && counts.sambramo_live_counters === 3 && counts.sambramo_live_counter_items === 3
      && counts.sambramo_catalogue_items === 6 && counts.sambramo_addon_rules === 2, counts)
  const { data: menuRow } = await admin.from('sambramo_catering_menus').select('take_home_paise, customer_paise').eq('listing_version_id', lv.id).eq('menu_key', 'm1').single()
  ok(`server computed the customer price (${rs(menuRow.take_home_paise)} → ${rs(menuRow.customer_paise)} per guest)`, menuRow.customer_paise === Math.round(menuRow.take_home_paise / 0.92 / 10) * 10, menuRow)
  const { data: res } = await admin.from('sambramo_resources').select('resource_key, quantity').eq('vendor_service_id', svc.id)
  ok(`capacity resources: ${(res ?? []).map(r => `${r.resource_key}=${r.quantity}`).join(', ')}`, ['guests', 'events', 'staff', 'c1', 'c2', 'c3'].every(k => (res ?? []).some(r => r.resource_key === k)), res)

  // Publish exactly as approval does.
  await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString(), price_locked_until: new Date(Date.now() + 15 * 864e5).toISOString() }).eq('id', lv.id)
  await admin.from('sambramo_trade_packages').update({ status: 'LIVE' }).eq('listing_version_id', lv.id)

  const preview = async request => (await call(book, { vendorServiceId: svc.id, request, preview: true }, customer.token)).json ?? {}
  const base = (n, extra = {}) => ({ event_date: day(n), start_time: '12:00', ...BLR, ...extra })
  const take = p => (p.lines ?? []).reduce((t, l) => t + Number(l.take_home_paise), 0)

  /* 2. FSSAI gate */
  console.log('\n── Food safety gate')
  const { data: had } = await admin.from('vendor_documents').select('id').eq('vendor_id', VERIFIED).eq('requirement_id', 'VER-TRADE-FSSAI').eq('status', 'accepted')
  if (!(had ?? []).length) {
    const p0 = await preview(base(1, { menu_key: 'm1', adults: 200 }))
    ok(`FSSAI not yet accepted → ${p0.path} (${(p0.reasons ?? []).join(', ')})`, p0.path === 'QUOTE' && (p0.reasons ?? []).join() === 'licence_pending_fssai', p0)
    const { data: ins, error: de } = await admin.from('vendor_documents').insert({ vendor_id: VERIFIED, kind: 'other', requirement_id: 'VER-TRADE-FSSAI', trade: c.name,
      storage_path: 'e2e/fssai.pdf', status: 'accepted', reviewed_at: new Date().toISOString() }).select('id').single()
    if (!ok('FSSAI accepted by review (test document)', !de, de?.message)) throw new Error('fssai')
    made.docs.push(ins.id)
  } else ok('FSSAI already accepted for this vendor (gate test skipped)', true)
  const p1 = await preview(base(1, { menu_key: 'm1', adults: 200 }))
  ok(`FSSAI accepted → ${p1.path}`, p1.path === 'INSTANT', p1.reasons_text ?? p1)

  /* 3. Pricing cases */
  console.log('\n── Pricing (every amount from saved rows)')
  const cases = [
    ['per-person menu, 100 adults → billed for the minimum 150', base(2, { menu_key: 'm1', adults: 100 }), 520 * P * 150, 'INSTANT'],
    ['per-person menu, 200 adults + 20 children at the child price', base(2, { menu_key: 'm1', adults: 200, children: 20 }), 520 * P * 200 + 300 * P * 20, 'INSTANT'],
    ['optional extra-cost dish (Badam Alva) only when asked for', base(2, { menu_key: 'm1', adults: 200, menu_extras: ['menu_lx1'] }), 520 * P * 200 + 40 * P * 200, 'INSTANT'],
    ['fixed menu, 130 guests → fixed + 30 extra guests', base(2, { menu_key: 'm2', adults: 130 }), 30000 * P + 280 * P * 30, 'INSTANT'],
    ['dosa counter per event, 4 h, 300 servings → + 1 h + 50 servings', base(2, { menu_key: 'm1', adults: 200, counters: [{ key: 'c1', qty: 1, hours: 4, servings: 300 }] }),
      520 * P * 200 + 9000 * P + 2500 * P + 35 * P * 50, 'INSTANT'],
    ['jalebi counter per hour, asked 1 h → minimum 2 h', base(2, { menu_key: 'm1', adults: 200, counters: [{ key: 'c2', qty: 1, hours: 1 }] }), 520 * P * 200 + 3000 * P * 2, 'INSTANT'],
    ['holige counter per serving × 120', base(2, { menu_key: 'm1', adults: 200, counters: [{ key: 'c3', servings: 120 }] }), 520 * P * 200 + 60 * P * 120, 'INSTANT'],
    ['extras: 3 staff × 4 h, crockery per guest', base(2, { menu_key: 'm1', adults: 200, hours: 4, addons: [{ id: 'extra_staff', qty: 3, hours: 4 }, 'crockery'] }),
      520 * P * 200 + 250 * P * 12 + 25 * P * 200, 'INSTANT'],
    ['package: menu, dosa counter and crockery included at ₹0 (no double charge)', base(3, { package: 'pkg_classic', adults: 400, counters: [{ key: 'c1' }], addons: ['crockery'] }), 650 * P * 400, 'INSTANT'],
    ['dish on its own: 100 Holige', base(2, { adults: 100, items: [{ item_key: 'd5', qty: 100 }] }), 35 * P * 100, 'INSTANT'],
    ['Jain request on a pure-veg menu from a Jain-declared caterer', base(2, { menu_key: 'm1', adults: 200, dietary: ['jain'] }), 520 * P * 200, 'INSTANT'],
  ]
  for (const [label, req, expect, path] of cases) {
    const p = await preview(req)
    const cust = Math.round(expect / (1 - p.platform_fee_rate) / 10) * 10
    ok(`${label}: ${rs(expect)} take-home → ${rs(p.customer_paise ?? 0)}`, p.path === path && p.take_home_paise === expect && take(p) === expect
      && p.customer_paise === cust && p.advance_paise === Math.round(cust * 0.3 / 10) * 10, { path: p.path, reasons: p.reasons, take: p.take_home_paise, lines: (p.lines ?? []).map(l => `${l.description}=${l.take_home_paise}`) })
  }
  const pk = await preview(base(3, { package: 'pkg_classic', adults: 400, counters: [{ key: 'c1' }], addons: ['crockery'] }))
  ok('package lines show the menu, counter and crockery as included', ['menu', 'counter', 'addon'].every(k => pk.lines?.some(l => l.kind === k && Number(l.take_home_paise) === 0)), pk.lines)

  console.log('\n── What must become a quote')
  const quotes = [
    ['1,300 guests (above the menu maximum)', base(2, { menu_key: 'm1', adults: 1300 }), 'over_menu_capacity'],
    ['a menu priced on request', base(2, { menu_key: 'm3', adults: 250 }), 'menu_needs_quote'],
    ['a vegan request the caterer has not declared', base(2, { menu_key: 'm1', adults: 200, dietary: ['vegan'] }), 'dietary_vegan'],
    ['50 Holige on a 50-piece minimum is fine; 10 is below it', base(2, { adults: 100, items: [{ item_key: 'd5', qty: 10 }] }), 'below_minimum_d5'],
    ['inside the 5-day menu freeze', { ...base(1), event_date: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), menu_key: 'm1', adults: 200 }, 'inside_menu_freeze'],
  ]
  for (const [label, req, reason] of quotes) {
    const p = await preview(req)
    ok(`${label} → ${p.path} (${(p.reasons ?? []).join(', ')})`, p.path === 'QUOTE' && (p.reasons ?? []).includes(reason), p)
  }

  /* 4. A real booking, its reservations and its Razorpay order */
  console.log('\n── Book & pay')
  const reqA = base(10, { menu_key: 'm1', adults: 200, counters: [{ key: 'c1', qty: 1 }] })
  const pA = await preview(reqA)
  const bA = await call(book, { vendorServiceId: svc.id, request: reqA, venue: { address: 'E2E venue', area: 'Jayanagar', city: 'Bengaluru' }, note: 'E2E catering' }, customer.token)
  if (bA.json?.bookingRequestId) made.requests.push(bA.json.bookingRequestId)
  ok(`booked: line accepted (${rs(pA.customer_paise)})`, bA.status === 200 && !!bA.json?.lineId, bA.json)
  const { data: lineA } = await admin.from('booking_lines').select('status, trade, quoted_amount_paise, paid_at, pricing_snapshot').eq('id', bA.json.lineId).single()
  ok('line carries the trade and the server price', lineA.trade === c.name && lineA.quoted_amount_paise === pA.customer_paise, lineA)
  const { count: nres } = await admin.from('sambramo_resource_reservations').select('id', { count: 'exact', head: true }).eq('booking_line_id', bA.json.lineId)
  ok(`${nres} reservations held (guests, event slot, dosa counter)`, nres === pA.reservations.length && nres >= 3, { nres, want: pA.reservations })
  await sleep(1500)
  const oA = await call(pay, { lineIds: [bA.json.lineId] }, customer.token)
  ok(`Razorpay order ${oA.json?.orderId ?? ''} = 30% advance ${rs(oA.json?.amountPaise ?? 0)}`, oA.status === 200 && !!oA.json?.orderId && oA.json.amountPaise === pA.advance_paise, oA.json)
  const { data: lineA2 } = await admin.from('booking_lines').select('status, paid_at').eq('id', bA.json.lineId).single()
  ok(`no payment made → line stays unpaid (status ${lineA2.status}, paid_at empty)`, !lineA2.paid_at && !['paid', 'confirmed'].includes(lineA2.status), lineA2)

  /* 5. Two customers racing for the last capacity */
  console.log('\n── Capacity edge: two bookings of 700 guests, 1,200 a day')
  const race = base(12, { menu_key: 'm1', adults: 700 })
  const both = await Promise.all([1, 2].map(() => call(book, { vendorServiceId: svc.id, request: race, venue: { address: 'E2E', area: 'Jayanagar', city: 'Bengaluru' }, note: 'E2E race' }, customer.token)))
  for (const r of both) { if (r.json?.bookingRequestId) made.requests.push(r.json.bookingRequestId); if (r.json?.quoteRequestId) made.quotes.push(r.json.quoteRequestId) }
  const won = both.filter(r => r.json?.lineId)
  ok(`exactly one books instantly (${both.map(r => r.json?.lineId ? 'BOOKED' : `${r.json?.path ?? ''} ${(r.json?.reasons ?? []).join(',')} ${r.json?.error ?? ''}`.trim()).join(' / ')})`, won.length === 1, both.map(r => r.json))
  const pAfter = await preview(race)
  ok(`after it, the same request is a ${pAfter.path} (${(pAfter.reasons ?? []).join(', ')})`, pAfter.path === 'QUOTE' && pAfter.reasons.includes('over_capacity'), pAfter)

  /* 6. A price change after booking leaves the booked snapshot alone */
  console.log('\n── Price change after booking')
  // The 15-day price protection has passed (simulated), so new prices may be submitted.
  await admin.from('sambramo_listing_versions').update({ price_locked_until: new Date(Date.now() - 864e5).toISOString() }).eq('id', lv.id)
  const { error: sub2 } = await partner.db.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: buildCateringPayload(c, caterer(600 * P)) })
  ok('partner submits version 2 at ₹600 take-home per guest', !sub2, sub2?.message)
  const { data: v2 } = await admin.from('sambramo_listing_versions').select('id').eq('vendor_service_id', svc.id).eq('status', 'UNDER_REVIEW').single()
  if (!v2) throw new Error('version 2 not created')
  await admin.from('sambramo_trade_packages').update({ status: 'ARCHIVED' }).eq('listing_version_id', lv.id)
  await admin.from('sambramo_listing_versions').update({ status: 'ARCHIVED' }).eq('id', lv.id)
  await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString() }).eq('id', v2.id)
  await admin.from('sambramo_trade_packages').update({ status: 'LIVE' }).eq('listing_version_id', v2.id)
  const pNew = await preview(base(14, { menu_key: 'm1', adults: 200 }))
  ok(`new bookings price at version 2 (${rs(pNew.take_home_paise ?? 0)} take-home for 200)`, pNew.take_home_paise === 600 * P * 200 && pNew.listing_version_id === v2.id, pNew)
  const { data: lineA3 } = await admin.from('booking_lines').select('quoted_amount_paise, pricing_snapshot').eq('id', bA.json.lineId).single()
  ok(`the earlier booking keeps ${rs(lineA.quoted_amount_paise)} and its snapshot`, lineA3.quoted_amount_paise === lineA.quoted_amount_paise && JSON.stringify(lineA3.pricing_snapshot) === JSON.stringify(lineA.pricing_snapshot), lineA3)
  const { data: oldMenu } = await admin.from('sambramo_catering_menus').select('take_home_paise').eq('listing_version_id', lv.id).eq('menu_key', 'm1').single()
  ok('version 1 menu row is unchanged (₹520)', oldMenu?.take_home_paise === 520 * P, oldMenu)

  /* 7. Custom quote with a discount line, accepted, advance charged */
  console.log('\n── Custom quote with a discount')
  const bq = await call(book, { vendorServiceId: svc.id, request: base(16, { menu_key: 'm3', adults: 250 }), venue: { address: 'E2E', area: 'Jayanagar', city: 'Bengaluru' }, note: 'E2E banquet' }, customer.token)
  if (bq.json?.bookingRequestId) made.requests.push(bq.json.bookingRequestId)
  if (bq.json?.quoteRequestId) made.quotes.push(bq.json.quoteRequestId)
  ok(`banquet on request → quote request to the partner (${(bq.json?.reasons ?? []).join(', ')})`, bq.status === 200 && bq.json?.path === 'QUOTE' && !!bq.json?.quoteRequestId, bq.json)
  if (bq.json?.quoteRequestId) {
    const lines = [{ description: 'Royal Banquet per guest', quantity: 250, unit: 'guest', unit_take_home_paise: 800 * P },
      { description: 'Live dosa counter', quantity: 1, unit: 'counter', unit_take_home_paise: 9000 * P },
      { description: 'Loyalty discount', quantity: 1, unit: 'item', unit_take_home_paise: 10000 * P, is_discount: true }]
    const net = 800 * P * 250 + 9000 * P - 10000 * P
    const sq = await call(submitQuote, { quoteRequestId: bq.json.quoteRequestId, lines }, partner.token)
    ok(`partner quotes ${rs(net)} take-home after a ${rs(10000 * P)} discount`, sq.status === 200 && !!sq.json?.responseId, sq.json)
    const { data: qr } = await admin.from('sambramo_quote_responses').select('partner_amount_paise, customer_amount_paise').eq('id', sq.json?.responseId).single()
    ok(`discount subtracted on the server (partner ${rs(qr?.partner_amount_paise ?? 0)}, customer ${rs(qr?.customer_amount_paise ?? 0)})`,
      qr?.partner_amount_paise === net && qr?.customer_amount_paise === Math.round(net / 0.92), qr)
    const { data: dl } = await admin.from('sambramo_quote_line_items').select('is_discount').eq('quote_request_id', bq.json.quoteRequestId).eq('is_discount', true)
    ok('discount line stored as a discount', (dl ?? []).length === 1, dl)
    const ac = await call(acceptQuote, { quoteResponseId: sq.json?.responseId }, customer.token)
    if (ac.json?.lineId) made.lines.push(ac.json.lineId)
    ok('customer accepts → booked under the partner lock', ac.status === 200 && !!ac.json?.lineId, ac.json)
    if (ac.json?.lineId) {
      await sleep(1500)
      const o = await call(pay, { lineIds: [ac.json.lineId] }, customer.token)
      const adv = Math.round(qr.customer_amount_paise * 0.3 / 10) * 10
      ok(`Razorpay order ${o.json?.orderId ?? ''} = 30% advance ${rs(o.json?.amountPaise ?? 0)} of ${rs(qr.customer_amount_paise)}`, o.status === 200 && o.json?.amountPaise === adv, o.json)
    }
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
  if (made.docs.length) await admin.from('vendor_documents').delete().in('id', made.docs)
  if (made.services.length) {
    await admin.from('sambramo_booking_decisions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_trade_packages').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_listing_versions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_resources').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_partner_price_books').delete().in('vendor_service_id', made.services)
    const { error } = await admin.from('vendor_services').delete().in('id', made.services)
    if (error) console.log('service cleanup:', error.message)
  }
  if (made.linked) await admin.from('vendors').update({ profile_id: null }).eq('id', VERIFIED).eq('profile_id', made.user)
  if (made.user) await admin.auth.admin.deleteUser(made.user)
  if ('cfg' in restore) await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: restore.cfg }).eq('id', true)
  for (const p of restore.policy ?? []) await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: p.require_payout_for_instant }).eq('trade_id', p.trade_id)
  const { data: v } = await admin.from('vendors').select('profile_id').eq('id', VERIFIED).single()
  console.log(`\ncleanup: ${made.services.length} services, ${made.requests.length} requests, ${made.quotes.length} quotes, ${lineIds.length} lines, ${made.docs.length} test documents; vendor unlinked: ${v.profile_id === null ? 'yes' : v.profile_id}; payout gate restored: ${'cfg' in restore ? 'yes' : 'not changed'}`)
  console.log(`e2e-catering-live: ${ran - bad}/${ran} passed`)
}
