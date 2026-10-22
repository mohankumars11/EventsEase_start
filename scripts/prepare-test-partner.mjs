#!/usr/bin/env node
/**
 * Make one REAL partner account bookable for an end-to-end test from the
 * customer app — acting as the operator, through the operator's own paths.
 *
 *   node --env-file=.env scripts/prepare-test-partner.mjs <partner email>
 *   node --env-file=.env scripts/prepare-test-partner.mjs <partner email> --undo
 *
 * Signs in as the admin account (minted session; the guards on vendors,
 * listing review and KYC only yield to an operator, and that is the point)
 * and:
 *   1. verifies the partner (is_verified / approved / accepting jobs)
 *   2. approves every listing version UNDER_REVIEW via
 *      review_sambramo_listing_version — the console's own RPC
 *   3. gives them an ACTIVATED test payout account (fake acc_test_… id) so
 *      instant booking is allowed — Razorpay TEST keys only
 *   4. records the licence documents a regulated trade needs as accepted
 *      (storage_path test/…), so those trades can book instantly too
 * Everything it changes is written to scripts/data/test-partner-<id>.json
 * first; --undo puts it back.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const [email, ...rest] = process.argv.slice(2)
const UNDO = rest.includes('--undo')
if (!email) { console.error('usage: prepare-test-partner.mjs <partner email> [--undo]'); process.exit(2) }
const ADMIN_EMAIL = 'mohanaec038@gmail.com'
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const svc = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const { data: link } = await svc.auth.admin.generateLink({ type: 'magiclink', email: ADMIN_EMAIL })
const { data: s } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const op = createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } })

const { data: users } = await svc.auth.admin.listUsers({ perPage: 1000 })
const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
if (!user) { console.error(`no account for ${email}`); process.exit(1) }
const { data: vendor } = await svc.from('vendors').select('*').eq('profile_id', user.id).single()
const FILE = `scripts/data/test-partner-${vendor.id}.json`
const LIC = { 'Mini Truck / Pickup': ['RC', 'INSURANCE', 'DL'], 'Medium / Large Goods Vehicle': ['RC', 'INSURANCE', 'DL'], 'Passenger Transport': ['RC', 'INSURANCE', 'DL'],
  'Catering & Food': ['FSSAI'], 'Beverages, Ice Cream & Cold Storage': ['FSSAI'], 'Power & Cooling': ['ELECTRICAL'], 'Security Services': ['PSARA'], 'Valet Parking': ['DL'], Venue: ['PROPERTY'] }

if (UNDO) {
  if (!existsSync(FILE)) { console.error(`nothing recorded at ${FILE}`); process.exit(1) }
  const was = JSON.parse(readFileSync(FILE, 'utf8'))
  await op.from('vendors').update(was.vendor).eq('id', vendor.id)
  if (was.payoutCreated) await svc.from('partner_payout_accounts').delete().eq('vendor_id', vendor.id)
  if (was.docs?.length) await svc.from('vendor_documents').delete().in('id', was.docs)
  for (const v of was.approved ?? []) await svc.from('sambramo_listing_versions').update({ status: 'UNDER_REVIEW', published_at: null }).eq('id', v)
  console.log(`restored ${vendor.business_name}`); process.exit(0)
}

const record = { vendor: { is_verified: vendor.is_verified, verification_status: vendor.verification_status, status: vendor.status, accepting_jobs: vendor.accepting_jobs }, approved: [], docs: [], payoutCreated: false }
writeFileSync(FILE, JSON.stringify(record, null, 1))
console.log(`── ${vendor.business_name} (${email})`)

const { error: ve } = await op.from('vendors').update({ is_verified: true, verification_status: 'approved', status: 'APPROVED', accepting_jobs: true,
  verified_at: new Date().toISOString(), verification_note: 'Approved for the customer-app end-to-end test (scripts/prepare-test-partner.mjs)' }).eq('id', vendor.id)
const { data: after } = await svc.from('vendors').select('is_verified, verification_status').eq('id', vendor.id).single()
console.log(`  verified: ${after.is_verified} / ${after.verification_status}${ve ? `  (${ve.message})` : ''}`)

const { data: services } = await svc.from('vendor_services').select('id, category, sambramo_listing_versions(id, status)').eq('vendor_id', vendor.id)
for (const sv of services ?? []) {
  for (const v of sv.sambramo_listing_versions ?? []) {
    if (v.status !== 'UNDER_REVIEW') continue
    const { data, error } = await op.rpc('review_sambramo_listing_version', { p_version_id: v.id, p_decision: 'approve', p_note: 'Approved for the end-to-end test' })
    if (!error) record.approved.push(v.id)
    console.log(`  ${sv.category}: ${error ? `NOT approved — ${error.message}` : `LIVE ${JSON.stringify(data).slice(0, 80)}`}`)
  }
  for (const d of LIC[sv.category] ?? []) {
    const req = `VER-TRADE-${d}`
    const { data: have } = await svc.from('vendor_documents').select('id').eq('vendor_id', vendor.id).eq('requirement_id', req).eq('status', 'accepted').maybeSingle()
    if (have) continue
    const { data: ins, error } = await svc.from('vendor_documents').insert({ vendor_id: vendor.id, kind: 'other', requirement_id: req, trade: sv.category,
      storage_path: `test/${req}.pdf`, status: 'accepted', reviewed_at: new Date().toISOString() }).select('id').single()
    if (!error) record.docs.push(ins.id)
  }
}

const { data: pa } = await svc.from('partner_payout_accounts').select('id, route_status').eq('vendor_id', vendor.id).maybeSingle()
if (!pa) {
  const { error } = await svc.from('partner_payout_accounts').insert({ vendor_id: vendor.id, kyc_status: 'verified', kyc_verified_at: new Date().toISOString(),
    route_account_id: `acc_test_${vendor.id.replace(/-/g, '').slice(0, 14)}`, route_status: 'activated', route_updated_at: new Date().toISOString() })
  record.payoutCreated = !error
  console.log(`  payout: ${error ? error.message : 'test account activated'}`)
} else console.log(`  payout: already ${pa.route_status ?? 'present'} (left as it is)`)
writeFileSync(FILE, JSON.stringify(record, null, 1))

const { data: live } = await svc.from('vendor_services').select('category, sambramo_listing_versions!inner(status)').eq('vendor_id', vendor.id).eq('sambramo_listing_versions.status', 'LIVE')
console.log(`\n  now LIVE: ${(live ?? []).map(x => x.category).join(', ') || 'nothing'}`)
console.log(`  undo with: node --env-file=.env scripts/prepare-test-partner.mjs ${email} --undo`)
