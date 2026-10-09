/**
 * Set up (or refresh) a partner's Razorpay Route account.
 *
 *   POST /api/anchor?op=route-setup           { action?: 'setup' | 'status' }
 *
 * Idempotent: each step runs only if the previous run did not finish it,
 * so "Retry" after a Razorpay error continues rather than duplicating.
 *   1. linked account   2. stakeholder (PAN)   3. Route product
 *   4. settlement bank (Route settles to a bank account, not UPI)
 *   5. read activation status back
 * The partner's bank details come from vendor_payout_details (the existing
 * Bank step); nothing sensitive is accepted from the client here.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './cors.js'
import { authenticatedUser } from './auth.js'
import {
  createLinkedAccount, createStakeholder, requestRouteProduct, setSettlementBank,
  fetchRouteProduct, routeStatusOf, routeConfigured,
} from './razorpayRoute.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })
  if (!routeConfigured()) return res.status(503).json({ error: 'Payouts are not switched on yet.' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Sign in again.' })
  const action = req.body?.action === 'status' ? 'status' : 'setup'

  const { data: vendor } = await db.from('vendors')
    .select('id, business_name, formatted_address, area, city, state, pincode').eq('profile_id', authn.user.id).maybeSingle()
  if (!vendor) return res.status(404).json({ error: 'Partner account not found.' })

  let { data: acct } = await db.from('partner_payout_accounts').select('*').eq('vendor_id', vendor.id).maybeSingle()
  const save = async patch => {
    const row = { ...patch, route_updated_at: new Date().toISOString() }
    if (acct?.id) {
      const { data } = await db.from('partner_payout_accounts').update(row).eq('id', acct.id).select('*').single()
      acct = data ?? { ...acct, ...row }
    } else {
      const { data } = await db.from('partner_payout_accounts').insert({ vendor_id: vendor.id, ...row }).select('*').single()
      acct = data
    }
  }
  const status = () => ({
    route_status: acct?.route_status ?? null, route_account_id: acct?.route_account_id ?? null,
    requirements: acct?.route_requirements ?? null, bank_last4: acct?.account_last4 ?? null, bank_name: acct?.bank_name ?? null,
  })

  if (action === 'status' || (acct?.route_account_id && acct?.route_product_id && acct?.route_status === 'activated')) {
    if (acct?.route_account_id && acct?.route_product_id) {
      const p = await fetchRouteProduct(acct.route_account_id, acct.route_product_id)
      if (p.ok) await save({ route_status: routeStatusOf(p.data), route_requirements: p.data.requirements ?? null })
    }
    return res.status(200).json({ ok: true, ...status() })
  }

  const [{ data: details }, { data: priv }, { data: profile }] = await Promise.all([
    db.from('vendor_payout_details').select('method, account_name, account_number, ifsc, pan').eq('vendor_id', vendor.id).maybeSingle(),
    db.from('sambramo_partner_private').select('legal_name').eq('vendor_id', vendor.id).maybeSingle(),
    db.from('profiles').select('full_name, email, phone').eq('id', authn.user.id).maybeSingle(),
  ])
  if (!details || details.method !== 'bank' || !details.account_number || !details.ifsc) {
    return res.status(409).json({ error: 'Add a bank account (not UPI) in Bank & payments first. Razorpay pays out to a bank account.', step: 'bank' })
  }
  if (!details.pan) return res.status(409).json({ error: 'Add your PAN in Bank & payments first.', step: 'pan' })
  const email = authn.user.email ?? profile?.email
  const phone = String(profile?.phone ?? '').replace(/\D/g, '').slice(-10)
  if (!email || phone.length !== 10) return res.status(409).json({ error: 'Add your email and 10-digit phone number to your profile first.', step: 'contact' })
  if (!vendor.pincode || !vendor.city) return res.status(409).json({ error: 'Confirm your location first.', step: 'location' })

  const legalName = priv?.legal_name || details.account_name || profile?.full_name || vendor.business_name

  if (!acct?.route_account_id) {
    const r = await createLinkedAccount({
      email, phone, referenceId: vendor.id.replace(/-/g, ''), legalName, contactName: legalName,
      address: { street1: (vendor.formatted_address || vendor.area || vendor.city).slice(0, 100), city: vendor.city,
        state: (vendor.state || 'Karnataka').toUpperCase(), postal_code: vendor.pincode },
    })
    if (!r.ok) return res.status(502).json({ error: r.error, step: 'account' })
    await save({ route_account_id: r.data.id, route_status: 'created', pan_number: details.pan,
      account_holder: details.account_name, ifsc: details.ifsc, account_last4: String(details.account_number).slice(-4) })
  }
  if (!acct.route_stakeholder_id) {
    const r = await createStakeholder(acct.route_account_id, { name: legalName, email, pan: details.pan })
    if (!r.ok) return res.status(502).json({ error: r.error, step: 'stakeholder', ...status() })
    await save({ route_stakeholder_id: r.data.id })
  }
  if (!acct.route_product_id) {
    const r = await requestRouteProduct(acct.route_account_id)
    if (!r.ok) return res.status(502).json({ error: r.error, step: 'product', ...status() })
    await save({ route_product_id: r.data.id, route_status: routeStatusOf(r.data) })
  }
  const b = await setSettlementBank(acct.route_account_id, acct.route_product_id,
    { accountNumber: details.account_number, ifsc: details.ifsc, beneficiary: details.account_name || legalName })
  if (!b.ok) return res.status(502).json({ error: b.error, step: 'bank', ...status() })
  await save({ route_status: routeStatusOf(b.data), route_requirements: b.data.requirements ?? null })

  return res.status(200).json({ ok: true, ...status() })
}
