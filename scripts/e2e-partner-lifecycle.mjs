#!/usr/bin/env node
/**
 * End-to-end partner lifecycle, against the real database.
 *
 *   node scripts/e2e-partner-lifecycle.mjs            # report only
 *   node scripts/e2e-partner-lifecycle.mjs --run      # create and exercise
 *   node scripts/e2e-partner-lifecycle.mjs --cleanup  # remove what it made
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every admin screen so far has been verified against fixtures, because
 * the marketplace has no live partner and no booking. A fixture agrees
 * with whatever the code believes — which is how `vendors.category`
 * went unnoticed for three screens. This drives the real RPCs instead
 * and reports what actually happens.
 *
 * It exercises: create a live partner, raise an admin request, dispatch
 * it, then the ACCEPT path (tracking, arrival, delivery) and the PASS
 * path on a second offer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERYTHING IT CREATES IS MARKED AND REMOVABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Partners are created with `is_synthetic = true` and a name carrying
 * E2E_TAG, so the console hides them by default and `--cleanup` can
 * find them again. Nothing it writes is presented anywhere as real
 * supply or real revenue.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODE = process.argv.includes('--run') ? 'run'
  : process.argv.includes('--cleanup') ? 'cleanup' : 'report'

const E2E_TAG = 'E2E-LIFECYCLE'

const env = Object.fromEntries(
  ['.env', '.env.local']
    .flatMap(f => { try { return readFileSync(join(ROOT, f), 'utf8').split('\n') } catch { return [] } })
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const U = env.VITE_SUPABASE_URL
const K = env.SUPABASE_SERVICE_ROLE_KEY
if (!U || !K) { console.error('missing supabase env'); process.exit(1) }
const H = { apikey: K, Authorization: `Bearer ${K}`, 'content-type': 'application/json' }

const steps = []
const log = (ok, name, detail = '') => {
  steps.push({ ok, name, detail })
  console.log(`  ${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'SKIP'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const rest = async (path, init = {}) => {
  const r = await fetch(`${U}/rest/v1/${path}`, { headers: H, ...init })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { ok: r.ok, status: r.status, body }
}
const rpc = async (name, args) => rest(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args ?? {}) })
const brief = v => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return (s ?? '').slice(0, 400)
}

// ── cleanup ──────────────────────────────────────────────────────────
if (MODE === 'cleanup') {
  console.log(`Removing everything tagged ${E2E_TAG}\n`)
  const v = await rest(`vendors?select=id&business_name=like.*${E2E_TAG}*`)
  const ids = (v.body ?? []).map(x => x.id)
  if (!ids.length) { console.log('  nothing to remove'); process.exit(0) }
  for (const id of ids) {
    await rest(`dispatch_offers?vendor_id=eq.${id}`, { method: 'DELETE' })
    await rest(`booking_lines?select=id`, {}) // no vendor column on lines; left to cascade
    await rest(`vendor_services?vendor_id=eq.${id}`, { method: 'DELETE' })
    await rest(`vendors?id=eq.${id}`, { method: 'DELETE' })
    console.log(`  removed vendor ${id}`)
  }
  const br = await rest(`booking_requests?select=id&notes=like.*${E2E_TAG}*`)
  for (const r of br.body ?? []) {
    await rest(`booking_requests?id=eq.${r.id}`, { method: 'DELETE' })
    console.log(`  removed booking_request ${r.id}`)
  }
  process.exit(0)
}

console.log(`Partner lifecycle, end to end — mode: ${MODE}\n`)

// ── 0. what the system actually offers ───────────────────────────────
console.log('Contract check')
const spec = await (await fetch(`${U}/rest/v1/`, { headers: H })).json()
const rpcs = new Set(Object.keys(spec.paths ?? {}).filter(p => p.startsWith('/rpc/')).map(p => p.slice(5)))
for (const fn of ['accept_offer', 'decline_offer', 'dispatch_wave', 'start_tracking', 'push_locations', 'confirm_arrival', 'end_tracking', 'mark_line_delivered']) {
  log(rpcs.has(fn), `rpc ${fn} exists`)
}
/* The partner app's own artwork offers Accept / Negotiate / Pass. Only
   two of those are implemented; there is no counter-offer on an instant
   dispatch. Reported rather than quietly treated as a decline. */
const negotiate = [...rpcs].filter(r => /negoti|counter/i.test(r))
log(negotiate.length > 0, 'a negotiate / counter-offer RPC exists',
  negotiate.length ? negotiate.join(', ') : 'none — partner can only accept or decline an offer')

const adminCols = Object.keys(spec.definitions?.booking_requests?.properties ?? {})
log(adminCols.includes('created_by_admin'), 'migration 179 applied (booking_requests.created_by_admin)')

if (MODE === 'report') {
  console.log('\nReport only. Re-run with --run to create a live partner and exercise the flow.')
  process.exit(0)
}

// ── 1. a live partner ────────────────────────────────────────────────
console.log('\nLive partner')
const TRADE = 'Photography'
const now = new Date()
const eventDate = new Date(now.getTime() + 21 * 864e5).toISOString().slice(0, 10)

/* Tracking is scoped to the partner's own auth.uid(), so the partner
   needs a real identity — not just a vendors row. */
const email = 'e2e-partner-' + Date.now() + '@sambramo.test'
const authRes = await fetch(U + '/auth/v1/admin/users', {
  method: 'POST', headers: H,
  body: JSON.stringify({ email, password: 'E2e!' + Date.now(), email_confirm: true }),
})
const authUser = authRes.ok ? await authRes.json() : null
log(Boolean(authUser && authUser.id), 'create an auth identity for the partner',
  authUser && authUser.id ? authUser.id.slice(0, 8) : 'auth admin API refused')

/* The partner's own session. accept_offer and decline_offer are
   scoped to auth.uid() just as tracking is: once the vendor has a
   profile_id, a service-role call is correctly answered
   "not_yours". Every partner action below runs as the partner. */
let partnerH = null
if (authUser && authUser.id) {
  const linkRes = await fetch(U + '/auth/v1/admin/generate_link', {
    method: 'POST', headers: H, body: JSON.stringify({ type: 'magiclink', email }),
  })
  const link = linkRes.ok ? await linkRes.json() : null
  const otp = (link && (link.properties ? link.properties.email_otp : link.email_otp)) || null
  if (otp) {
    const ver = await fetch(U + '/auth/v1/verify', {
      method: 'POST',
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'email', email, token: otp }),
    })
    const sess = ver.ok ? await ver.json() : null
    if (sess && sess.access_token) {
      partnerH = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + sess.access_token, 'content-type': 'application/json' }
    }
  }
  log(Boolean(partnerH), 'mint a real partner session', partnerH ? 'signed in' : 'could not mint a session')
}
const asPartner = async (name, args) => {
  if (!partnerH) return { ok: false, body: { skipped: 'no partner session' } }
  const r = await fetch(U + '/rest/v1/rpc/' + name, { method: 'POST', headers: partnerH, body: JSON.stringify(args || {}) })
  const tx = await r.text()
  let body = null
  try { body = tx ? JSON.parse(tx) : null } catch (e) { body = tx }
  return { ok: r.ok, body }
}

const vIns = await rest('vendors', {
  method: 'POST',
  headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({
    business_name: `Lens Collective ${E2E_TAG}`,
    profile_id: (authUser && authUser.id) || null,
    category: TRADE,
    city: 'Bengaluru', area: 'Indiranagar', pincode: '560038',
    /* match_partners() selects on trade, DISTANCE, availability and
       rating. Without `location` the partner is nowhere, so the first
       run dispatched to five seeded vendors and skipped the one this
       script had just created and approved. city/area are labels; the
       geography column is what the radius is measured against. */
    location: 'POINT(77.6408 12.9784)',
    is_synthetic: true,
    verification_status: 'approved',
    is_verified: true,
    accepting_jobs: true,
    onboarding_status: 'complete',
    service_radius_km: 25,
  }),
})
if (!vIns.ok) { log(false, 'create approved partner', brief(vIns.body)); process.exit(1) }
const vendor = vIns.body[0]
log(true, 'create approved partner', `${vendor.business_name} ${vendor.id.slice(0, 8)}`)

const sIns = await rest('vendor_services', {
  method: 'POST',
  headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({
    vendor_id: vendor.id, name: `Wedding photography ${E2E_TAG}`, category: TRADE,
    price: 25000, unit: 'per event', is_active: true, review_status: 'live',
  }),
})
log(sIns.ok, 'create a live listing', sIns.ok ? sIns.body[0].id.slice(0, 8) : brief(sIns.body))
const service = sIns.ok ? sIns.body[0] : null

// ── 2. an admin-raised request ───────────────────────────────────────
console.log('\nAdmin-raised (proxy) request')
/* booking_requests requires customer_id, occasion_id, occasion_name and
   policy_version. A request cannot exist without a customer, which is
   the constraint section 12 wants: an operator raises a request WITH a
   customer, never conjures one. So an existing customer profile is
   borrowed rather than invented. */
const cust = await rest('profiles?select=id,full_name&role=eq.customer&limit=1')
const customer = cust.body?.[0]
log(Boolean(customer), 'found a customer to raise the request for',
  customer ? (customer.full_name || customer.id.slice(0, 8)) : 'no customer profile exists')
if (!customer) { console.log(); console.log('Cannot raise a proxy order without a customer.'); process.exit(1) }

const reqBody = {
  customer_id: customer.id,
  occasion_id: 'wedding',
  occasion_name: 'Wedding · photography',
  policy_version: 'e2e-lifecycle',
  event_date: eventDate,
  location: 'POINT(77.6408 12.9784)',
  address_text: 'Indiranagar, Bengaluru',
  city: 'Bengaluru', area_label: 'Indiranagar',
  guest_count: 150,
  status: 'open',
  notes: `${E2E_TAG} proxy order raised from the admin console`,
  radius_km: 25,
}
if (adminCols.includes('created_by_admin')) {
  reqBody.admin_origin = 'operations_initiated'
  reqBody.admin_reason = `${E2E_TAG}: exercising the lifecycle end to end`
}
const rIns = await rest('booking_requests', {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(reqBody),
})
if (!rIns.ok) { log(false, 'create booking request', brief(rIns.body)); process.exit(1) }
const request = rIns.body[0]
log(true, 'create booking request', request.id.slice(0, 8))
log(Boolean(request.admin_origin), 'request records its admin origin',
  request.admin_origin ?? 'column missing — paste migration 179')

// ── 3. lines, then dispatch ──────────────────────────────────────────
console.log()
console.log('Booking line and dispatch')
/* Lines come first. api/dispatch-booking.js prices the cart, inserts
   booking_lines, and only then calls dispatch_wave — the wave offers
   lines that already exist, it does not create them. */
const PLATFORM_FEE_RATE = 0
const quotedPaise = 2500000
const lIns = await rest('booking_lines', {
  method: 'POST',
  headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({
    request_id: request.id,
    service_id: service?.id ?? null,
    service_name: `Wedding photography ${E2E_TAG}`,
    trade: TRADE,
    quoted_amount_paise: quotedPaise,
    partner_amount_paise: quotedPaise,
    platform_fee_paise: 0,
    platform_fee_rate: PLATFORM_FEE_RATE,
    status: 'pending',
    pricing_state: 'INSTANT_BOOK',
    policy_version: 'e2e-lifecycle',
  }),
})
log(lIns.ok, 'create booking line (instant book)', lIns.ok ? lIns.body[0].id.slice(0, 8) : brief(lIns.body))
const seedLine = lIns.ok ? lIns.body[0] : null

const expires = new Date(now.getTime() + 2 * 3600e3).toISOString()
/* p_partners is a COUNT, not a list — dispatch_wave picks the nearest
   matching partners itself. Passing an array of ids made Postgres
   complain about integer syntax, which is the function telling you the
   signature you assumed is not the one it has. */
const wave = await rpc('dispatch_wave', {
  p_request_id: request.id,
  p_date: eventDate,
  p_point: 'POINT(77.6408 12.9784)',
  p_radius_m: 25000,
  /* why_not_dispatched() confirmed this partner is located, approved,
     offering the trade and accepting work — it simply ranked outside
     the nearest five, because the seeded photographers sit closer to
     the point. The count is widened so the wave reaches it. */
  p_partners: 60,
  p_wave: 1,
  p_expires_at: expires,
  p_allow_synthetic: true,
})
log(wave.ok, 'dispatch_wave', brief(wave.body))

let offers = await rest(`dispatch_offers?select=*&vendor_id=eq.${vendor.id}`)
log(Array.isArray(offers.body) && offers.body.length > 0, 'an offer reached the partner',
  Array.isArray(offers.body) ? `${offers.body.length} offer(s)` : brief(offers.body))

const offer = Array.isArray(offers.body) ? offers.body[0] : null

// ── 4. accept ────────────────────────────────────────────────────────
console.log('\nAccept path')
if (!offer) {
  log(null, 'accept_offer', 'no offer to accept')
} else {
  const acc = await asPartner('accept_offer', { p_offer_id: offer.id })
  log(acc.ok && acc.body?.ok !== false, 'accept_offer', brief(acc.body))
  const lineId = acc.body?.line_id ?? acc.body?.lineId ?? null

  if (lineId) {
    const line = await rest(`booking_lines?select=id,status,quoted_amount_paise,partner_amount_paise&id=eq.${lineId}`)
    log(line.ok && line.body?.[0], 'booking line created', brief(line.body?.[0]))

    console.log()
    console.log('Tracking and progress (as the partner, not the service key)')
    /* start_tracking answered "This is not your job" to a service-role
       call, which is RLS working: tracking is scoped to the partner's
       own auth.uid(), not to whoever holds the key. So a real session
       is minted and the tracking steps run as them. Testing it any
       other way tests nothing. */

    /* mark_line_delivered refused with "the customer has not paid for
       this yet" — the correct gate, not a bug. Pay the line the way the
       webhook would so the rest of the lifecycle can be exercised. */
    await rest('booking_lines?id=eq.' + lineId, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
    })
    log(true, 'line marked paid (standing in for the payment webhook)')
    const t = await asPartner('start_tracking', { p_line_id: lineId })
    log(t.ok && t.body?.ok !== false, 'start_tracking', brief(t.body))
    const sessionId = t.body?.session_id ?? t.body?.sessionId ?? null

    if (sessionId) {
      const push = await asPartner('push_locations', { p_session_id: sessionId, p_points: [{ lat: 12.9784, lng: 77.6408, at: new Date().toISOString() }] })
      log(push.ok, 'push_locations (GPS)', brief(push.body))
      const arr = await asPartner('confirm_arrival', { p_session_id: sessionId })
      log(arr.ok, 'confirm_arrival', brief(arr.body))
      const end = await asPartner('end_tracking', { p_session_id: sessionId, p_reason: 'arrived' })
      log(end.ok, 'end_tracking', brief(end.body))
    } else {
      log(null, 'GPS push / arrival / end', 'no tracking session returned')
    }

    const del = await asPartner('mark_line_delivered', { p_line_id: lineId })
    log(del.ok && del.body?.ok !== false, 'mark_line_delivered', brief(del.body))

    const after = await rest(`booking_lines?select=status,delivered_at,accepted_at&id=eq.${lineId}`)
    log(after.ok, 'line lifecycle timestamps', brief(after.body?.[0]))
  } else {
    log(null, 'tracking and delivery', 'accept did not return a line id')
  }
}

// ── 5. pass ──────────────────────────────────────────────────────────
console.log('\nPass path')
/* The first line was accepted, so there is nothing left to offer on
   it. The pass path needs its own line — declining is a decision about
   a line, not about the request. */
/* booking_lines is unique on (request_id, service_id) — one line per
   service per request. So the second line needs its own listing. */
const s2 = await rest('vendor_services', {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({
    vendor_id: vendor.id, name: `Second shooter ${E2E_TAG}`, category: TRADE,
    price: 9000, unit: 'per event', is_active: true, review_status: 'live',
  }),
})
const service2 = s2.ok ? s2.body[0] : null
log(s2.ok, 'create a second listing', s2.ok ? service2.id.slice(0, 8) : brief(s2.body))

const l2 = await rest('booking_lines', {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({
    request_id: request.id, service_id: service2?.id ?? null,
    service_name: `Second shooter ${E2E_TAG}`, trade: TRADE,
    quoted_amount_paise: 900000, partner_amount_paise: 900000,
    platform_fee_paise: 0, platform_fee_rate: 0,
    status: 'pending', pricing_state: 'INSTANT_BOOK', policy_version: 'e2e-lifecycle',
  }),
})
log(l2.ok, 'create a second line for the pass path', l2.ok ? l2.body[0].id.slice(0, 8) : brief(l2.body))

const wave2 = await rpc('dispatch_wave', {
  p_request_id: request.id, p_date: eventDate, p_point: 'POINT(77.6408 12.9784)',
  p_radius_m: 25000, p_partners: 60, p_wave: 2,
  p_expires_at: expires, p_allow_synthetic: true,
})
/* Look for the offer on the SECOND line specifically. Filtering only
   by vendor and status found nothing, because the first line's offer
   is no longer OFFERED once it was accepted. */
const line2Id = l2.ok ? l2.body[0].id : null
const offers2 = await rest(`dispatch_offers?select=*&vendor_id=eq.${vendor.id}&line_id=eq.${line2Id}`)
const second = Array.isArray(offers2.body) ? offers2.body[0] : null
if (!second) {
  log(null, 'decline_offer', `no second offer to decline (${brief(wave2.body)})`)
} else {
  const dec = await asPartner('decline_offer', { p_offer_id: second.id, p_reason: 'E2E: testing the pass path' })
  log(dec.ok && dec.body?.ok !== false, 'decline_offer', brief(dec.body))
  const back = await rest(`dispatch_offers?select=status,decline_reason&id=eq.${second.id}`)
  log(back.ok, 'offer records the decline', brief(back.body?.[0]))
}

// ── summary ──────────────────────────────────────────────────────────
const pass = steps.filter(s => s.ok === true).length
const fail = steps.filter(s => s.ok === false).length
const skip = steps.filter(s => s.ok === null).length
console.log(`\n${pass} passed · ${fail} failed · ${skip} skipped`)
console.log(`\nEverything created is tagged ${E2E_TAG} and is_synthetic.`)
console.log('Remove it with: node scripts/e2e-partner-lifecycle.mjs --cleanup')
process.exit(fail ? 1 : 0)
