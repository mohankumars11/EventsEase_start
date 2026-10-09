/**
 * Razorpay Route — linked accounts for partners, and transfers from a
 * captured customer payment into them.
 *
 * Server only: it uses the key secret. Every function returns
 * { ok, data } or { ok:false, error, status } and never throws, so a
 * Razorpay outage can never break the webhook that records the money.
 *
 * Route must be enabled on the Razorpay account (Dashboard → Route) or
 * every call here returns Razorpay's own "feature not enabled" error,
 * which is passed through verbatim.
 *
 * Business category for a partner account: individuals providing event
 * services. Razorpay's accepted values change; override with
 * RAZORPAY_ROUTE_CATEGORY / RAZORPAY_ROUTE_SUBCATEGORY if it rejects these.
 */
const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const CATEGORY = process.env.RAZORPAY_ROUTE_CATEGORY || 'others'
const SUBCATEGORY = process.env.RAZORPAY_ROUTE_SUBCATEGORY || 'others'

export const routeConfigured = () => !!(KEY_ID && KEY_SECRET)

async function call(method, path, body) {
  if (!routeConfigured()) return { ok: false, error: 'Razorpay keys are not configured.', status: 503 }
  try {
    const r = await fetch(`https://api.razorpay.com${path}`, {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await r.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    if (!r.ok) return { ok: false, status: r.status, error: data?.error?.description ?? `Razorpay ${r.status}`, data }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, status: 0, error: e?.message ?? 'Network error talking to Razorpay.' }
  }
}

/** Create the partner's Route linked account. */
export function createLinkedAccount({ email, phone, referenceId, legalName, contactName, address }) {
  return call('POST', '/v2/accounts', {
    email, phone, type: 'route', reference_id: String(referenceId).slice(0, 20),
    legal_business_name: legalName, business_type: 'individual', contact_name: contactName,
    profile: {
      category: CATEGORY, subcategory: SUBCATEGORY,
      addresses: { registered: {
        street1: address.street1, street2: address.street2 || address.street1,
        city: address.city, state: address.state, postal_code: String(address.postal_code), country: 'IN',
      } },
    },
  })
}

export const createStakeholder = (accountId, { name, email, pan }) =>
  call('POST', `/v2/accounts/${accountId}/stakeholders`, { name, email, kyc: pan ? { pan } : undefined })

export const requestRouteProduct = accountId =>
  call('POST', `/v2/accounts/${accountId}/products`, { product_name: 'route', tnc_accepted: true })

export const setSettlementBank = (accountId, productId, { accountNumber, ifsc, beneficiary }) =>
  call('PATCH', `/v2/accounts/${accountId}/products/${productId}`, {
    settlements: { account_number: accountNumber, ifsc_code: ifsc, beneficiary_name: beneficiary },
    tnc_accepted: true,
  })

export const fetchRouteProduct = (accountId, productId) =>
  call('GET', `/v2/accounts/${accountId}/products/${productId}`)

/** Move part of a captured payment to a linked account, held until released. */
export const transferFromPayment = (paymentId, { account, amountPaise, notes = {} }) =>
  call('POST', `/v1/payments/${paymentId}/transfers`, {
    transfers: [{ account, amount: amountPaise, currency: 'INR', on_hold: 1, notes }],
  })

export const releaseTransfer = transferId => call('PATCH', `/v1/transfers/${transferId}`, { on_hold: 0 })

export const reverseTransfer = (transferId, amountPaise) =>
  call('POST', `/v1/transfers/${transferId}/reversals`, amountPaise ? { amount: amountPaise } : {})

/** Razorpay product activation_status → our route_status. */
export function routeStatusOf(product) {
  const s = product?.activation_status
  return {
    activated: 'activated', needs_clarification: 'needs_clarification', under_review: 'under_review',
    suspended: 'suspended', rejected: 'rejected', requested: 'under_review',
  }[s] ?? 'created'
}
