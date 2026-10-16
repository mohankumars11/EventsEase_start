// LIVE test of the partner entry route, as a brand-new partner, through RLS:
//   sign-up → stage says /partner/setup (the service selector) → vendor row
//   → pick Catering & Food + Bar & Beverages (one container each, never two)
//   → Bar left as a synced draft → Catering submitted → its version is
//   UNDER_REVIEW and readable by its owner (the Jobs confirmation reads it)
//   → a broken submission is refused and changes nothing → the account
//   enters the operator queue via submit_for_review() (idempotent) → stage
//   now says Jobs → statuses stay independent per trade → payout details
//   saved once are "saved", not "active", and are not re-asked per trade.
// Then, against the verified seeded vendor, the server's instant-booking
// gate: a Razorpay account that is merely created must NOT allow instant
// booking; only route_status 'activated' does (migration 20261010_15).
// A temporary login is created and everything it wrote is removed.
//
//   node scripts/check-trade-payloads.mjs        (builds the payload bundle)
//   node --env-file=.env scripts/e2e-partner-entry-live.mjs
import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const M = await import(pathToFileURL(resolve('node_modules/.cache/trade-payloads.mjs')).href)
const { CONFIG_BY_ID, buildCateringPayload } = M
const { partnerStage, routeForStage } = await import(pathToFileURL(resolve('src/lib/partnerStage.js')).href)
const { payoutStatus, identityStatus } = await import(pathToFileURL(resolve('src/lib/partnerAccountStatus.js')).href)
const book = (await import(pathToFileURL(resolve('api/_lib/anchorBook.js')).href)).default

const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })      // used to verify login links (it ends up signed in)
const nobody = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })   // stays anonymous
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
async function stageOf(db, uid) {
  const { data: vendor } = await db.from('vendors').select('*').eq('profile_id', uid).maybeSingle()
  const { data: services } = vendor ? await db.from('vendor_services').select('id, category, name, review_status, is_active').eq('vendor_id', vendor.id) : { data: [] }
  return { vendor, services: services ?? [], route: routeForStage(partnerStage({ vendor, services: services ?? [] })) }
}

const caterer = {
  _schema: 2,
  basics: { display_name: 'E2E Entry Caterers', bio: 'Entry-route test listing — removed automatically after the run.', legal_name: 'E2E Entry' },
  location: { lat: 12.925, lng: 77.5938, source: 'manual', confirmed: true, formatted_address: 'Jayanagar, Bengaluru', city: 'Bengaluru', state: 'Karnataka', postal_code: '560011' },
  cuisines: ['ka_udupi'],
  answers: { services: ['Wedding catering'], prep_location: 'At both locations', service_styles: ['Buffet'], service_area: '50',
    max_guests: 300, guests_per_day: 300, events_per_day: 1, staff: 10, min_billable_guests: 50, child_policy: 'same',
    fssai: { type: 'state_licence', number: '11219999000123', expiry: '2027-03-31', premises: 'E2E', responsible: 'E2E' },
    declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
  dishes: [{ item_key: 'd1', name: 'Bisi Bele Bath', category_id: 'rc_flavoured', diet: 'veg', serving: { qty: 200, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true }],
  menus: [{ menu_key: 'm1', name: 'E2E Lunch', diet: 'veg', min_guests: 50, max_guests: 300, price_model: 'per_person', price_paise: 40000, status: 'active',
    items: [{ dish_key: 'd1', course_group: 'rice_biryani', included: true }] }],
  counters: [], packages: [], extras: [],
  availability: { min_notice_days: 0, horizon_months: 12, menu_freeze_days: 0, guest_confirm_days: 0, travel_model: 'customer_arranged' },
  booking: { instant: true, advance_pct: 30, cancellation: 'flexible', custom_quotes: true, quote_hours: 4 },
}

const email = `e2e.entry.${Date.now()}@example.com`
const made = { user: null, vendor: null, services: [], payoutRow: false, gate: null, docs: [], restore: {} }
try {
  console.log('\n── A new partner signs up')
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: 'vendor', full_name: 'E2E Entry' } })
  if (ue) throw ue
  made.user = u.user.id
  await admin.from('profiles').update({ role: 'vendor' }).eq('id', made.user)   // what the partner surface does at sign-up
  const p = await sessionFor(email)

  let s = await stageOf(p.db, made.user)
  ok(`no vendor row → lands on ${s.route} (the service selector)`, !s.vendor && s.route === '/partner/setup', s.route)

  // ensureVendorRow, exactly as the selector calls it (RLS, partner's own token).
  const { error: ve } = await p.db.from('vendors').upsert({ profile_id: made.user, business_name: 'E2E Entry', verification_status: 'draft' }, { onConflict: 'profile_id', ignoreDuplicates: true })
  const { data: v } = await p.db.from('vendors').select('id, verification_status').eq('profile_id', made.user).maybeSingle()
  made.vendor = v?.id
  ok('the selector creates the partner row through RLS', !ve && !!v?.id, ve?.message)
  s = await stageOf(p.db, made.user)
  ok(`vendor row but no services → still the selector (${s.route})`, s.route === '/partner/setup', s.route)

  console.log('\n── Picks Catering & Food and Bar & Beverages (Continue tapped twice)')
  let le = null
  for (let i = 0; i < 2; i++) for (const trade of ['Catering & Food', 'Bar & Beverages']) {
    const { error } = await p.db.from('partner_listings').upsert({ vendor_id: v.id, trade }, { onConflict: 'vendor_id,trade', ignoreDuplicates: false })
    le = le ?? error
  }
  const { data: conts } = await p.db.from('partner_listings').select('trade').eq('vendor_id', v.id)
  ok(`one container per trade, never two (${(conts ?? []).map(c => c.trade).join(', ')})`, (conts ?? []).length === 2, le?.message ?? conts)

  const draftKey = `${v.id}:${CONFIG_BY_ID.bar_beverages.id}`
  const { error: de } = await p.db.from('sambramo_listing_drafts').upsert({ vendor_id: v.id, draft_key: draftKey, trade_id: 'bar_beverages', data: { answers: { basics: { display_name: 'E2E Bar' } }, step: 'screen:service' }, schema_version: 1 }, { onConflict: 'vendor_id,draft_key' })
  const { data: dr } = await p.db.from('sambramo_listing_drafts').select('data').eq('vendor_id', v.id).eq('draft_key', draftKey).maybeSingle()
  ok('Bar & Beverages left as a draft, synced, resumes at its saved step', !de && dr?.data?.step === 'screen:service', de?.message ?? dr)
  const { data: anonDraft } = await nobody.from('sambramo_listing_drafts').select('vendor_id').eq('vendor_id', v.id)
  ok('nobody else can read that draft', (anonDraft ?? []).length === 0)

  console.log('\n── Submits Catering & Food')
  const { data: svc, error: se } = await p.db.from('vendor_services').insert({ vendor_id: v.id, name: 'E2E Catering', category: 'Catering & Food', price: 435, unit: 'per booking', specs: { e2e: true } }).select('id').single()
  if (svc) made.services.push(svc.id)
  const { data: sub, error: sube } = await p.db.rpc('submit_listing_version', { p_vendor_service_id: svc?.id, p_payload: buildCateringPayload(CONFIG_BY_ID.catering_food, caterer) })
  ok('the server accepts the submission', !se && !sube && sub?.ok && !!sub?.version_id, se?.message ?? sube?.message ?? sub)
  const { data: ver } = await p.db.from('sambramo_listing_versions').select('status, vendor_service_id').eq('id', sub?.version_id).maybeSingle()
  ok(`the Jobs confirmation can read its real status: ${ver?.status}`, ver?.status === 'UNDER_REVIEW' && ver?.vendor_service_id === svc?.id, ver)

  console.log('\n── A failed submission changes nothing')
  const { data: bsvc } = await p.db.from('vendor_services').insert({ vendor_id: v.id, name: 'E2E Bar', category: 'Bar & Beverages', price: 1, unit: 'per booking', specs: { e2e: true } }).select('id').single()
  if (bsvc) made.services.push(bsvc.id)
  const { data: bv0 } = await p.db.from('vendors').select('verification_status').eq('id', v.id).single()
  const { error: badErr } = await p.db.rpc('submit_listing_version', { p_vendor_service_id: bsvc?.id, p_payload: { trade_id: 'bar_beverages', schema_version: 2, answers: {}, rules: [], catalogue: [], packages: [], addons: [], resources: [] } })
  const { count: bv } = await admin.from('sambramo_listing_versions').select('id', { count: 'exact', head: true }).eq('vendor_service_id', bsvc?.id)
  const { data: bv1 } = await p.db.from('vendors').select('verification_status').eq('id', v.id).single()
  ok(`refused with a reason ("${(badErr?.message ?? '').slice(0, 70)}…")`, !!badErr)
  ok('no version written for it, account status untouched', bv === 0 && bv0.verification_status === bv1.verification_status, { bv, bv0, bv1 })
  // The client never shows success or leaves the flow here; remove the half-made row like the flow's retry would reuse it.
  await admin.from('vendor_services').delete().eq('id', bsvc?.id); made.services = made.services.filter(x => x !== bsvc?.id)

  console.log('\n── After the successful submit: account review, then Jobs')
  const { data: r1, error: r1e } = await p.db.rpc('submit_for_review')
  const { data: r2 } = await p.db.rpc('submit_for_review')
  const { data: v2 } = await p.db.from('vendors').select('verification_status, review_due_at').eq('id', v.id).single()
  ok(`account queued for an operator (${v2.verification_status}, due ${v2.review_due_at?.slice(0, 16)})`, !r1e && r1?.ok && v2.verification_status === 'submitted' && !!v2.review_due_at, r1e?.message ?? r1)
  ok('calling it again keeps the same clock (idempotent)', r2?.ok && r2?.replayed === true && r2?.review_due_at === r1?.review_due_at, r2)
  ok('a partner cannot approve themselves', v2.verification_status !== 'approved')
  s = await stageOf(p.db, made.user)
  ok(`with a submitted listing, login lands on Jobs (${s.route})`, s.route === '/dashboard/vendor', s.route)

  console.log('\n── Each trade keeps its own state')
  const { data: svcs } = await p.db.from('vendor_services').select('category, review_status').eq('vendor_id', v.id)
  const { data: draftStill } = await p.db.from('sambramo_listing_drafts').select('draft_key').eq('vendor_id', v.id)
  ok(`Catering & Food submitted, Bar & Beverages still a draft (${(svcs ?? []).map(x => `${x.category}=${x.review_status}`).join(', ')})`,
    (svcs ?? []).length === 1 && svcs[0].category === 'Catering & Food' && (draftStill ?? []).length === 1, { svcs, draftStill })

  console.log('\n── Payout: saved once, shared, and not "active" until Razorpay says so')
  const { error: pe } = await p.db.from('vendor_payout_details').upsert({ vendor_id: v.id, method: 'bank', account_name: 'Ravi Kumar', account_number: '123456789012', ifsc: 'HDFC0001234' }, { onConflict: 'vendor_id' })
  made.payoutRow = !pe
  const { data: pd } = await p.db.from('vendor_payout_details').select('method, verified_at').eq('vendor_id', v.id).maybeSingle()
  ok('bank details saved once for the account', !pe && pd?.method === 'bank', pe?.message ?? pe?.details)
  ok(`the app calls that "${payoutStatus(pd, null)}", not active`, payoutStatus(pd, null) === 'details_saved')
  const { count: rows } = await admin.from('vendor_payout_details').select('vendor_id', { count: 'exact', head: true }).eq('vendor_id', v.id)
  ok('one payout record per partner, whatever the number of trades', rows === 1, rows)
  const { data: anonPay } = await nobody.from('vendor_payout_details').select('vendor_id').eq('vendor_id', v.id)
  ok('no one else can read the bank details', (anonPay ?? []).length === 0)
  ok('identity: nothing uploaded → not started; a trade licence never counts', identityStatus({ is_verified: false }, { 'VER-TRADE-FSSAI': 'accepted' }) === 'not_started')

  console.log('\n── The server\'s instant-booking gate (verified seeded vendor)')
  const { data: had } = await admin.from('partner_payout_accounts').select('id').eq('vendor_id', VERIFIED).maybeSingle()
  if (had) ok('test vendor already has a payout account — gate test skipped', true)
  else {
    const { data: cfg } = await admin.from('sambramo_pricing_config').select('require_payout_for_instant').single()
    const { data: pol } = await admin.from('sambramo_trade_pricing_policy').select('trade_id, require_payout_for_instant').eq('trade_id', 'catering_food').maybeSingle()
    made.restore = { cfg: cfg.require_payout_for_instant, pol: pol?.require_payout_for_instant }
    await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: true }).eq('id', true)
    await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: true }).eq('trade_id', 'catering_food')
    const tmp = `e2e.gate.${Date.now()}@example.com`
    const { data: gu } = await admin.auth.admin.createUser({ email: tmp, email_confirm: true })
    made.gate = gu.user.id
    await admin.from('vendors').update({ profile_id: made.gate }).eq('id', VERIFIED).is('profile_id', null)
    const g = await sessionFor(tmp)
    const { data: gs } = await g.db.from('vendor_services').insert({ vendor_id: VERIFIED, name: 'E2E Gate', category: 'Catering & Food', price: 435, unit: 'per booking', specs: { e2e: true } }).select('id').single()
    made.services.push(gs.id)
    await g.db.rpc('submit_listing_version', { p_vendor_service_id: gs.id, p_payload: buildCateringPayload(CONFIG_BY_ID.catering_food, caterer) })
    await admin.from('sambramo_listing_versions').update({ status: 'LIVE', published_at: new Date().toISOString() }).eq('vendor_service_id', gs.id)
    const { data: fd } = await admin.from('vendor_documents').select('id').eq('vendor_id', VERIFIED).eq('requirement_id', 'VER-TRADE-FSSAI').eq('status', 'accepted')
    if (!(fd ?? []).length) {
      const { data: d } = await admin.from('vendor_documents').insert({ vendor_id: VERIFIED, kind: 'other', requirement_id: 'VER-TRADE-FSSAI', trade: 'Catering & Food', storage_path: 'e2e/fssai.pdf', status: 'accepted', reviewed_at: new Date().toISOString() }).select('id').single()
      made.docs.push(d.id)
    }
    const req = { event_date: '2026-12-20', start_time: '12:00', lat: 12.9716, lng: 77.5946, menu_key: 'm1', adults: 80 }
    const preview = async () => (await call(book, { vendorServiceId: gs.id, request: req, preview: true }, g.token)).json ?? {}
    const a0 = await preview()
    ok(`no payout account → ${a0.path} (${(a0.reasons ?? []).join(', ')})`, a0.path === 'QUOTE' && a0.reasons?.includes('partner_payout_not_active'), a0)
    await admin.from('partner_payout_accounts').insert({ vendor_id: VERIFIED, route_account_id: 'acc_e2e_gate', route_status: 'created' })
    const a1 = await preview()
    ok(`Razorpay account CREATED (not activated) → ${a1.path} (${(a1.reasons ?? []).join(', ')})`, a1.path === 'QUOTE' && a1.reasons?.includes('partner_payout_not_active'), a1)
    await admin.from('partner_payout_accounts').update({ route_status: 'activated' }).eq('vendor_id', VERIFIED)
    const a2 = await preview()
    ok(`Razorpay says ACTIVATED → ${a2.path}`, a2.path === 'INSTANT', a2)
  }
} finally {
  if (made.services.length) {
    await admin.from('sambramo_booking_decisions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_trade_packages').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_listing_versions').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_resources').delete().in('vendor_service_id', made.services)
    await admin.from('sambramo_partner_price_books').delete().in('vendor_service_id', made.services)
    await admin.from('vendor_services').delete().in('id', made.services)
  }
  if (made.gate) {
    await admin.from('partner_payout_accounts').delete().eq('vendor_id', VERIFIED).eq('route_account_id', 'acc_e2e_gate')
    await admin.from('vendors').update({ profile_id: null }).eq('id', VERIFIED).eq('profile_id', made.gate)
    await admin.auth.admin.deleteUser(made.gate)
  }
  if (made.docs.length) await admin.from('vendor_documents').delete().in('id', made.docs)
  if ('cfg' in made.restore) {
    await admin.from('sambramo_pricing_config').update({ require_payout_for_instant: made.restore.cfg }).eq('id', true)
    if (made.restore.pol !== undefined) await admin.from('sambramo_trade_pricing_policy').update({ require_payout_for_instant: made.restore.pol }).eq('trade_id', 'catering_food')
  }
  if (made.vendor) {
    await admin.from('sambramo_listing_drafts').delete().eq('vendor_id', made.vendor)
    await admin.from('partner_listings').delete().eq('vendor_id', made.vendor)
    await admin.from('vendor_payout_details').delete().eq('vendor_id', made.vendor)
    const { error } = await admin.from('vendors').delete().eq('id', made.vendor)
    if (error) console.log('vendor cleanup:', error.message)
  }
  if (made.user) await admin.auth.admin.deleteUser(made.user)
  const { data: vv } = await admin.from('vendors').select('profile_id').eq('id', VERIFIED).single()
  console.log(`\ncleanup: temp partner + vendor removed, ${made.services.length} services, seeded vendor unlinked: ${vv.profile_id === null ? 'yes' : vv.profile_id}, payout gate restored: ${'cfg' in made.restore ? 'yes' : 'not changed'}`)
  console.log(`e2e-partner-entry-live: ${ran - bad}/${ran} passed`)
}
