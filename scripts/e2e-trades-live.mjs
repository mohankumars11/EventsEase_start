// Live end-to-end test of the 34-trade engine, as the demo partner, against the
// PRODUCTION database. It writes three test listings and deletes them all in its
// finally block (price books before services — a live guard blocks the reverse).
//   node scripts/check-trade-payloads.mjs && node --env-file=.env scripts/e2e-trades-live.mjs
import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { CONFIG_BY_ID, buildTradePayload } = M
const URL_ = process.env.VITE_SUPABASE_URL
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const EMAIL = 'sambramo.partner.test@gmail.com'

let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`) }
const cust = t => Math.round(t / 0.92 / 10) * 10

const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
if (le) throw le
const { data: sess, error: se } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
if (se) throw se
const partner = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } } })
const { data: vendor } = await admin.from('vendors').select('id, is_verified, accepting_jobs').eq('profile_id', sess.user.id).single()
const created = []
const restore = { is_verified: vendor.is_verified, accepting_jobs: vendor.accepting_jobs }

const base = { location: {}, packages: [], addons: {}, availability: { min_notice_days: 0, horizon_months: 12, travel_model: 'customer_arranged' },
  booking: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4 } }
const SAMPLES = {
  photography: { ...base, basics: { display_name: 'E2E Lens', bio: 'x'.repeat(50), legal_name: 'E2E Test' },
    answers: { specialties: ['candid'], events: ['weddings'], years: 5, portfolio: [{ kind: 'photo', path: 'a', caption: 'c' }, 1, 2, 3, 4, 5].map(() => ({ kind: 'photo', path: 'a', caption: 'c' })),
      formats: ['online_gallery'], service_radius_km: 50, overtime_per_hour: 300000, team: 2, events_per_day: 2 },
    catalogue: [{ item_key: 'cov_full', answers: { coverage: 'full_day', hours: 8, photographers: 2, edited_images: 500, retouch: 'standard', album: 'none', delivery_days: 30, price: 6000000 } }],
    rules: { hour: { on: true, amount_paise: 500000, min_qty: 2, max_qty: 12 } },
    packages: [{ key: 'ESSENTIAL', name: 'Essential', take_home_paise: 1000000, generated_take_home_paise: 1000000, hours: 2 },
      { key: 'SIGNATURE', name: 'Signature', take_home_paise: 1750000, generated_take_home_paise: 1750000, hours: 4 },
      { key: 'VIP', name: 'VIP', take_home_paise: 2000000, generated_take_home_paise: 2000000, hours: 4 }] },
  event_equipment_rental: { ...base, basics: { display_name: 'E2E Rentals', bio: 'y'.repeat(50), legal_name: 'E2E Test' },
    answers: { equipment_types: ['tables_chairs'], min_period: '1_day', handover: ['we_deliver_and_collect'], damage_policy: 'Charged at replacement value.', cleaning_fee: 50000 },
    catalogue: [{ item_key: 'chair', answers: { name: 'Chiavari chair', total_qty: 100, condition: 'good', rate: 5000, rate_period: 'day' } }],
    rules: {} },
  mini_truck_pickup: { ...base, basics: { display_name: 'E2E Trucks', bio: 'z'.repeat(50), legal_name: 'E2E Test' },
    answers: { service_radius_km: 60, loads: ['furniture'], helpers: true, notice: '1_hour', min_fare: 80000, waiting_per_hour: 20000, tolls: 'included', drivers: 2 },
    catalogue: [{ item_key: 'ace', answers: { category: 'tata_ace_7_ft', payload_kg: 750, load_dimensions: { l: 7, w: 5, h: 5 }, body: 'open', count: 2, registration: 'KA01AB1234' } }],
    rules: { per_trip: { on: true, amount_paise: 60000, included_qty: 10 }, per_km: { on: false } } },
}
// per-km beyond the included 10 km, declared as a charge
SAMPLES.mini_truck_pickup.answers.per_km_beyond = 2500

try {
  for (const [tid, a] of Object.entries(SAMPLES)) {
    const c = CONFIG_BY_ID[tid]
    console.log(`\n── ${c.name}`)
    const { data: svc, error: e1 } = await partner.from('vendor_services')
      .insert({ vendor_id: vendor.id, name: `E2E ${c.name}`, category: c.name, price: 1000, unit: 'per booking', specs: { e2e: true } }).select('id').single()
    ok('partner can create the service row (RLS)', !e1, e1?.message)
    if (e1) continue
    created.push(svc.id)
    const payload = buildTradePayload(c, a)
    const { data: r, error: e2 } = await partner.rpc('submit_listing_version', { p_vendor_service_id: svc.id, p_payload: payload })
    ok('submit_listing_version accepts the app payload', !e2 && r?.ok, e2?.message)
    if (e2) continue
    const { data: lv } = await admin.from('sambramo_listing_versions').select('*').eq('id', r.version_id).single()
    ok('version is UNDER_REVIEW with trade_id', lv.status === 'UNDER_REVIEW' && lv.trade_id === tid, { status: lv.status, trade_id: lv.trade_id })
    const { data: rules } = await admin.from('sambramo_rate_rules').select('*').eq('listing_version_id', lv.id)
    ok('every rule priced at round10(take / 0.92)', rules.every(x => x.customer_paise === cust(x.take_home_paise)), rules.map(x => [x.take_home_paise, x.customer_paise]))
    const { data: items } = await admin.from('sambramo_catalogue_items').select('*').eq('listing_version_id', lv.id)
    ok('catalogue items written', items.length === a.catalogue.length, items.length)
    ok('no registration number in public attributes', items.every(i => !('registration' in i.attributes)))
    const { data: res } = await admin.from('sambramo_resources').select('*').eq('vendor_service_id', svc.id)
    ok('resources written', res.length > 0, res.length)
    if (tid === 'mini_truck_pickup') ok('registration kept private on the resource', res.some(x => x.private_ref?.registration === 'KA01AB1234'))
    const { data: rd, error: e3 } = await partner.rpc('listing_readiness', { p_vendor_service_id: svc.id })
    ok('listing_readiness answers for the partner', !e3 && rd?.state, e3?.message)
    ok('…and says pricing is under review', rd?.items?.find(i => i.id === 'pricing')?.status === 'pending', rd?.items?.find(i => i.id === 'pricing'))
    const { data: pre } = await anon.rpc('resolve_booking', { p_vendor_service_id: svc.id, p_req: { event_date: '2026-12-12' } })
    ok('an unpublished listing is not bookable', pre?.path === 'NOT_ELIGIBLE' && pre.reasons.includes('relist_required'), pre)
  }

  // Publish all three (test-only: the operator RPC needs an admin session), let the engine price them.
  // The demo partner cannot be verified from a script (a guard trigger, rightly,
  // stops it), so the pricing half runs on a verified seeded test vendor.
  const VERIFIED = '4bc9bafd-aded-4212-be57-c26f0f9b5e9b'   // Royal Basava Event Rentals (test network)
  const mv = await admin.from('vendor_services').update({ vendor_id: VERIFIED }).in('id', created).select('id')
  console.log('moved to verified vendor:', mv.error?.message ?? mv.data.length)
  await admin.from('sambramo_resources').update({ vendor_id: VERIFIED }).in('vendor_service_id', created)
  const pubr = await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString() })
    .in('vendor_service_id', created).eq('status', 'UNDER_REVIEW').select('id')
  console.log('published:', pubr.error?.message ?? pubr.data.length)
  // What review_sambramo_listing_version does to a version's packages on approval.
  await admin.from('sambramo_trade_packages').update({ status: 'LIVE' }).in('listing_version_id', pubr.data.map(v => v.id))
  const [photo, rental, truck] = created
  const rb = async (_n, args) => { const r = await anon.rpc('resolve_booking', args); if (r.error) console.log('    resolve error:', r.error.message); return r }
  const day = '2026-12-12'

  console.log('\n── resolve_booking')
  let x = (await rb(0, { p_vendor_service_id: photo, p_req: { event_date: day, start_time: '10:00', hours: 3 } })).data
  ok('Photography 3 h → hourly rule 3 × ₹5,000', x?.lines?.[0]?.take_home_paise === 1500000, x)
  ok('…customer total = round10(take / 0.92)', x?.customer_paise === cust(x?.take_home_paise), x?.customer_paise)
  x = (await rb(0, { p_vendor_service_id: photo, p_req: { event_date: day, start_time: '10:00', hours: 10, items: [{ item_key: 'cov_full' }] } })).data
  ok('Photography full-day package 8 h + 2 h overtime', x?.lines?.[0]?.take_home_paise === 6000000 && x.lines.some(l => l.kind === 'extra_hours' && l.take_home_paise === 600000), x?.lines)
  ok('…and reserves a photographer', (x?.reservations ?? []).length === 1, x?.reservations)
  x = (await rb(0, { p_vendor_service_id: photo, p_req: { event_date: day, hours: 2, package: 'SIGNATURE' } })).data
  ok('Signature package priced from the partner’s own package', x?.lines?.[0]?.take_home_paise === 1750000, x?.lines)

  x = (await rb(0, { p_vendor_service_id: rental, p_req: { event_date: day, end_date: '2026-12-13', items: [{ item_key: 'chair', qty: 50 }] } })).data
  ok('Rental 50 chairs × 2 days × ₹50 + cleaning fee ₹500 (declared charge)', x?.take_home_paise === 50 * 2 * 5000 + 50000 && x.lines.some(l => l.kind === 'fee'), x?.lines)
  x = (await rb(0, { p_vendor_service_id: rental, p_req: { event_date: day, items: [{ item_key: 'chair', qty: 150 }] } })).data
  ok('Rental above stock → custom quote, never over-booked', x?.path === 'QUOTE' && x.reasons.includes('over_stock_chair'), x?.reasons)

  x = (await rb(0, { p_vendor_service_id: truck, p_req: { event_date: day, start_time: '09:00', items: [{ item_key: 'ace' }],
    pickup: { lat: 12.9716, lng: 77.5946 }, dropoff: { lat: 13.0358, lng: 77.5970 } } })).data
  const km = x?.distance_km
  ok('Mini truck: distance by the fixed policy (straight line × 1.25)', km > 8 && km < 10, km)
  ok('…fare ₹600 within 10 km, no per-km line', x?.lines?.[0]?.take_home_paise === 60000 && !x.lines.some(l => l.kind === 'distance'), x?.lines)
  ok('…minimum fare ₹800 tops it up', x?.take_home_paise === 80000 && x.lines.some(l => l.kind === 'minimum'), x?.lines)
  ok('…reserves the vehicle and a driver', (x?.reservations ?? []).length === 2, x?.reservations)
  x = (await rb(0, { p_vendor_service_id: truck, p_req: { event_date: day, items: [{ item_key: 'ace' }], weight_kg: 2000,
    pickup: { lat: 12.9716, lng: 77.5946 }, dropoff: { lat: 13.0358, lng: 77.5970 } } })).data
  ok('Overweight load → quote, not auto-booked', x?.path === 'QUOTE' && x.reasons.includes('over_payload'), x?.reasons)

  const pub = (await anon.rpc('listing_public', { p_vendor_service_id: truck })).data
  ok('listing_public never exposes the registration', !JSON.stringify(pub).includes('KA01AB1234'))
  const list = (await anon.rpc('public_listings', { p_trade: 'event_equipment_rental' })).data
  ok('public_listings shows the live rental with a from-price', (list ?? []).some(l => l.vendor_service_id === rental && l.from_paise === cust(5000)), list)
} finally {
  // Undo everything, in dependency order.
  if (created.length) {
    const { data: vs } = await admin.from('sambramo_listing_versions').select('id').in('vendor_service_id', created)
    const ids = (vs ?? []).map(v => v.id)
    if (ids.length) {
      await admin.from('sambramo_trade_packages').delete().in('listing_version_id', ids)
      await admin.from('sambramo_listing_versions').delete().in('id', ids)
    }
    await admin.from('sambramo_trade_packages').delete().in('vendor_service_id', created)
    await admin.from('sambramo_resources').delete().in('vendor_service_id', created)
    await admin.from('sambramo_partner_price_books').delete().in('vendor_service_id', created)
    const { error } = await admin.from('vendor_services').delete().in('id', created)
    console.log(`\ncleanup: ${created.length} services removed${error ? ` — ${error.message}` : ''}`)
  }
  await admin.from('vendors').update(restore).eq('id', vendor.id)
  const { data: after } = await admin.from('vendors').select('is_verified, accepting_jobs').eq('id', vendor.id).single()
  console.log('vendor restored:', JSON.stringify(after) === JSON.stringify(restore) ? 'yes' : JSON.stringify(after))
  console.log(`\ne2e-trades: ${ran - bad}/${ran} passed`)
}
