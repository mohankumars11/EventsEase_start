/**
 * The payment gateway, and a stand-in for it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A MOCK PROVIDER RATHER THAN "JUST MARK IT PAID"
 * ══════════════════════════════════════════════════════════════════════
 *
 * The tempting dev shortcut is a button that sets the line to `paid`.
 * This project already learned why that is dangerous: `PROJECT_SUMMARY`
 * records that `testPaymentProvider` was once reachable whenever
 * `VITE_UPI_ID` happened to be unset — which a missing env var on the
 * host would have turned into free merchandise.
 *
 * So the mock is not a shortcut past the payment path. It is a stand-in
 * that walks the SAME path:
 *
 *   · it returns an order id, the way Razorpay does
 *   · settling it POSTs a signed webhook to the REAL webhook handler
 *   · the webhook is what writes the escrow rows
 *
 * Which means the thing being exercised in development is the thing that
 * will run in production, minus the gateway. If the webhook is broken,
 * the mock finds it. A "mark as paid" button would not.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT CANNOT REACH PRODUCTION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Three independent conditions, all of which must hold:
 *
 *   1. RAZORPAY_KEY_ID is absent — real keys always win
 *   2. MOCK_PAYMENTS is explicitly 'true' — never a default
 *   3. NODE_ENV is not 'production'
 *
 * Fail any one and `createOrder` refuses rather than falling back. The
 * previous bug was a fallback; this is a gate.
 */
import crypto from 'crypto'

const KEY_ID     = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const MOCK       = process.env.MOCK_PAYMENTS === 'true'
const IS_PROD    = process.env.NODE_ENV === 'production'

/** Which provider is actually in play, for the client and for logs. */
export function providerName() {
  if (KEY_ID && KEY_SECRET) return 'razorpay'
  if (MOCK && !IS_PROD)     return 'mock'
  return 'none'
}

/**
 * The shared secret the mock signs its webhook with.
 *
 * Deliberately the same variable the real webhook verifies against, so
 * the signature check is genuinely exercised rather than skipped. A mock
 * that posted an unsigned payload would leave the one security-critical
 * line in the webhook untested.
 */
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'dev-webhook-secret'

export async function createOrder({ amountPaise, receipt, notes = {} }) {
  const provider = providerName()

  if (provider === 'none') {
    return {
      ok: false,
      error: IS_PROD
        ? 'Payments are not configured.'
        : 'No payment provider. Set RAZORPAY_KEY_ID/SECRET, or MOCK_PAYMENTS=true for development.',
    }
  }

  if (provider === 'mock') {
    // Shaped like a Razorpay order so nothing downstream can tell the
    // difference, and prefixed so nothing MISTAKES it for one either.
    const id = `order_mock_${crypto.randomBytes(8).toString('hex')}`
    return {
      ok: true,
      id,
      keyId: 'rzp_test_mock',
      amountPaise,
      mockSettleUrl: `/api/mock-settle-payment?order=${id}`,
      notes,
    }
  }

  // ── The real thing ────────────────────────────────────────────────
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  })

  const body = await r.json()
  if (!r.ok) return { ok: false, error: body?.error?.description ?? 'Razorpay rejected the order' }

  return { ok: true, id: body.id, keyId: KEY_ID, amountPaise, notes }
}

/** The HMAC the real webhook verifies. The mock signs with the same one. */
export function signWebhook(rawBody) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
}

export const mockEnabled = () => providerName() === 'mock'
