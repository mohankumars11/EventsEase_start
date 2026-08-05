// TEST-MODE payment provider — simulates success/failure locally.
// No real gateway, no server, no cost. See PaymentProvider.js for
// the interface this implements; swap this file for a real gateway
// integration later without touching any call sites.
//
// ─────────────────────────────────────────────────────────────────
// SAFETY: this provider marks orders `payment_status: 'paid'` on a
// button press, with no money involved. It was previously reachable
// in any build where `VITE_UPI_ID` happened to be unset — which is
// the single most likely deployment mistake there is. A missing env
// var on the hosting platform would have put a working "Simulate
// Success" button in front of real customers and shipped real goods
// for free, with the orders indistinguishable from genuine ones in
// the admin console.
//
// It is now hard-disabled outside a development build. `import.meta.env.DEV`
// is inlined by Vite at build time, so in a production bundle these
// guards are constant-folded and the simulate path cannot execute at
// all, regardless of how the environment is configured.
// ─────────────────────────────────────────────────────────────────

export const IS_TEST_MODE = import.meta.env.DEV

function assertDev() {
  if (!import.meta.env.DEV) {
    throw new Error(
      'Test payment provider is disabled in production builds. ' +
      'Configure VITE_UPI_ID (or a real gateway) to accept payments.'
    )
  }
}

export async function createOrder({ amount, receipt }) {
  assertDev()
  await new Promise(r => setTimeout(r, 300))
  return { orderId: `test_order_${Date.now()}` }
}

// outcome: 'success' | 'failure' — chosen by the user in the TEST PAYMENT UI
export async function initiatePayment({ orderId, method, outcome }) {
  assertDev()
  await new Promise(r => setTimeout(r, 900))
  if (outcome === 'failure') {
    return { status: 'failed', paymentRef: null }
  }
  return { status: 'success', paymentRef: `test_pay_${method}_${Date.now()}` }
}

export async function verifyPayment({ paymentRef }) {
  assertDev()
  // Real gateways verify a signature server-side here. In test mode,
  // any non-null paymentRef from initiatePayment() above is "verified".
  return { verified: Boolean(paymentRef) }
}
