/**
 * Pay for booking lines — the same three checkout paths MatchingBoard uses,
 * as one function the newer booking pages can share.
 *
 * Only line ids and which part (advance | balance) go up; the server reads
 * every amount itself. A successful sheet does NOT mean paid: the Razorpay
 * webhook is the only thing that records money, so callers should show
 * "confirming" and poll the line.
 */
import { supabase } from './supabase'
import { apiUrl } from './api'
import { openRazorpay } from './razorpayCheckout'
import { openRazorpayNative, hasNativeCheckout } from './razorpayNative'
import { IS_NATIVE_APP } from '../components/common/AppBadge'

export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return { 'content-type': 'application/json', ...(data?.session?.access_token ? { Authorization: 'Bearer ' + data.session.access_token } : {}) }
}

/** @returns {Promise<{ok:boolean, error?:string, dismissed?:boolean, external?:boolean}>} */
export async function payLines({ lineIds, part = 'advance', description = 'Your booking' }) {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) return { ok: false, error: 'Please sign in again to pay.' }

  const res = await fetch(apiUrl('/api/create-booking-payment'), {
    method: 'POST', headers: await authHeaders(),
    body: JSON.stringify({ customerId: uid, lineIds, part }),
  })
  const raw = await res.text()
  let body
  try { body = JSON.parse(raw) } catch { return { ok: false, error: `Payment service error (${res.status}).` } }
  if (!res.ok) return { ok: false, error: body.error ?? body.detail ?? 'Could not start the payment.' }

  if (body.provider === 'mock' && body.mockSettleUrl) {
    await fetch(body.mockSettleUrl, { method: 'POST' })
    return { ok: true }
  }
  if (body.provider !== 'razorpay') return { ok: false, error: 'Payments are not switched on yet.' }

  const { data: me } = await supabase.from('profiles').select('full_name, email, phone').eq('id', uid).maybeSingle()
  const customer = { name: me?.full_name, email: me?.email, phone: me?.phone }

  if (hasNativeCheckout()) {
    const r = await openRazorpayNative({ keyId: body.keyId, orderId: body.orderId, amountPaise: body.amountPaise, description, customer, notes: { part } })
    if (r.ok || r.dismissed || !r.unavailable) return r
  }
  if (IS_NATIVE_APP) {
    const q = new URLSearchParams({ order: body.orderId, key: body.keyId, amount: String(body.amountPaise), for: description,
      upi: body.upiEnabled === true ? '1' : body.upiEnabled === false ? '0' : '' })
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: apiUrl(`/pay?${q}`), presentationStyle: 'popover' })
      return { ok: true, external: true }
    } catch { /* fall through to the in-app sheet */ }
  }
  return openRazorpay({ keyId: body.keyId, orderId: body.orderId, amountPaise: body.amountPaise, description, customer, notes: { part }, upiEnabled: body.upiEnabled })
}
