// Real payment provider — Razorpay. Implements the same intent as
// PaymentProvider.js (order -> pay -> verify) but shaped around how
// Razorpay's own Checkout widget actually works (a hosted modal that
// natively offers UPI intent for PhonePe/Google Pay/Paytm/BHIM/etc,
// UPI ID entry, QR, cards and netbanking — no per-app integration
// needed). All verification happens server-side in /api; this module
// never marks a payment successful on its own.

export const IS_CONFIGURED = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID)

let scriptPromise = null
function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = resolve
      script.onerror = () => reject(new Error('Could not load the payment widget. Check your connection and try again.'))
      document.body.appendChild(script)
    })
  }
  return scriptPromise
}

/** Open the Razorpay checkout modal. Resolves with the raw success payload; never resolves on failure/dismiss. */
export function openCheckout({ razorpayOrderId, amount, currency, keyId, name, email, contact, orderLabel }) {
  return loadCheckoutScript().then(() => new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency,
      name: 'Sambramo',
      description: orderLabel || 'Sambramo order',
      prefill: { name, email, contact },
      theme: { color: '#7c3aed' },
      // All UPI apps (PhonePe, Google Pay, Paytm, BHIM, ...), cards and
      // netbanking are offered automatically — no per-method config needed.
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('DISMISSED')) },
    })
    rzp.on('payment.failed', (response) => reject(new Error(response?.error?.description || 'Payment failed')))
    rzp.open()
  }))
}
