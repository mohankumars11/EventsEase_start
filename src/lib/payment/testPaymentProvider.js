// TEST-MODE payment provider — simulates success/failure locally.
// No real gateway, no server, no cost. See PaymentProvider.js for
// the interface this implements; swap this file for a real gateway
// integration later without touching any call sites.

export const IS_TEST_MODE = true

export async function createOrder({ amount, receipt }) {
  await new Promise(r => setTimeout(r, 300))
  return { orderId: `test_order_${Date.now()}` }
}

// outcome: 'success' | 'failure' — chosen by the user in the TEST PAYMENT UI
export async function initiatePayment({ orderId, method, outcome }) {
  await new Promise(r => setTimeout(r, 900))
  if (outcome === 'failure') {
    return { status: 'failed', paymentRef: null }
  }
  return { status: 'success', paymentRef: `test_pay_${method}_${Date.now()}` }
}

export async function verifyPayment({ paymentRef }) {
  // Real gateways verify a signature server-side here. In test mode,
  // any non-null paymentRef from initiatePayment() above is "verified".
  return { verified: Boolean(paymentRef) }
}
