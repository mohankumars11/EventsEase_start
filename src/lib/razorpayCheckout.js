/**
 * Open the Razorpay checkout.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SCRIPT IS LOADED ON DEMAND, NOT IN THE ENTRY BUNDLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay ships as a script tag from their CDN, and almost every visitor
 * never reaches a checkout. Putting it in `index.html` would make every
 * customer download a payment SDK to look at an occasion grid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS FUNCTION IS NOT ALLOWED TO DECIDE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Whether the money arrived.
 *
 * The success callback fires in a browser that can be closed, throttled,
 * or lose signal between the bank's confirmation and this code running.
 * Somebody who pays and immediately shuts the tab leaves a CAPTURED
 * payment this app never hears about — they have been charged and the
 * booking still says unpaid.
 *
 * `api/razorpay-webhook.js` is the only witness. Razorpay retries it until
 * it 2xxs, so the record becomes correct regardless of what the browser
 * did. This function reports that a checkout was COMPLETED, which is a
 * claim about a dialog, not about a bank.
 *
 * The distinction is the same one migrations 034 and 046 spent paragraphs
 * on: `claimed` is what somebody pressed, `verified` is what a signature
 * proved.
 */

const SDK = 'https://checkout.razorpay.com/v1/checkout.js'

let loading = null

function loadSdk() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (loading) return loading

  loading = new Promise(resolve => {
    const s = document.createElement('script')
    s.src = SDK
    s.async = true
    s.onload = () => resolve(true)
    // A blocked CDN, an ad blocker, no network. Not an exception — a
    // customer who cannot reach Razorpay needs a sentence, not a crash.
    s.onerror = () => { loading = null; resolve(false) }
    document.head.appendChild(s)
  })

  return loading
}

/**
 * @returns {{ok:true, paymentId, orderId, signature} | {ok:false, error}}
 *
 * `ok: true` means the checkout closed successfully. It does NOT mean the
 * booking is paid — see the header.
 */
export function openRazorpay({ keyId, orderId, amountPaise, description = 'Your masters', prefill = {}, onDismiss }) {
  return new Promise(async resolve => {
    const ready = await loadSdk()
    if (!ready) {
      return resolve({ ok: false, error: 'Could not reach the payment page. Check your connection and try again.' })
    }

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount: amountPaise,
      currency: 'INR',

      name: 'Sambramo',
      description,

      // UPI first. It carries zero MDR in India by statute, so it is the
      // one collection route that costs the business nothing per
      // transaction — the same reasoning api/create-milestone-payment.js
      // gives for restricting method there.
      config: {
        display: {
          blocks: {
            upi: { name: 'Pay by UPI', instruments: [{ method: 'upi' }] },
          },
          sequence: ['block.upi'],
          preferences: { show_default_blocks: true },
        },
      },

      prefill,
      theme: { color: '#1B5C73' },

      handler(response) {
        resolve({
          ok: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        })
      },

      modal: {
        // Somebody who closes the sheet has not failed at anything. No
        // error, no retry nag — the button is still there.
        ondismiss() {
          onDismiss?.()
          resolve({ ok: false, error: null, dismissed: true })
        },
        escape: true,
        backdropclose: false,
      },
    })

    // A card declined, a UPI request timed out. Razorpay's own sheet has
    // already told them; this only has to stop the app claiming success.
    rzp.on('payment.failed', response => {
      resolve({
        ok: false,
        error: response?.error?.description ?? 'That payment did not go through.',
      })
    })

    rzp.open()
  })
}
