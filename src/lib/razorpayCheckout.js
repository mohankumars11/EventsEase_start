/**
 * Open the Razorpay checkout, wearing Sambramo's clothes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SCRIPT IS LOADED ON DEMAND, NOT IN THE ENTRY BUNDLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay ships as a script tag from their CDN, and almost every
 * visitor never reaches a checkout. Putting it in `index.html` would
 * make every customer download a payment SDK to look at an occasion
 * grid.
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
 * `api/razorpay-webhook.js` is the only witness. Razorpay retries it
 * until it 2xxs, so the record becomes correct regardless of what the
 * browser did. This function reports that a checkout was COMPLETED,
 * which is a claim about a dialog, not about a bank.
 *
 * The distinction is the one migrations 034 and 046 spent paragraphs on:
 * `claimed` is what somebody pressed, `verified` is what a signature
 * proved.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE FORCED UPI BLOCK WAS REMOVED
 * ══════════════════════════════════════════════════════════════════════
 *
 * This used to pass `config.display.blocks.upi` with
 * `sequence: ['block.upi']`, to put UPI first for zero MDR. Right
 * intent, and it broke the sheet.
 *
 * A forced block names a method the ACCOUNT must have enabled. On an
 * account where that method is not live — which is every account in
 * test mode, and any account mid-activation — Razorpay renders a block
 * it cannot fill. The reported symptom was exact: the phone field would
 * not take ten digits, and pressing pay did nothing at all.
 *
 * Razorpay already surfaces UPI first for Indian customers on its own.
 * The zero-MDR preference is not worth a checkout that cannot open, so
 * it is a preference now and not a constraint.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PREFILL IS NOT A CONVENIENCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * With no `prefill.contact`, Razorpay opens on its own contact form, and
 * that form is the first thing standing between a customer and paying.
 * Every field on it is one this app already knows: the customer is
 * signed in, and `profiles` holds their name, email and phone.
 *
 * Passing them skips that screen entirely and lands on the payment
 * methods — and removes the field that was reported as broken.
 */

const SDK = 'https://checkout.razorpay.com/v1/checkout.js'

/** Sambramo's own mark, for the top of the sheet. Absolute by necessity. */
const LOGO = typeof window !== 'undefined' ? `${window.location.origin}/icon-512.png` : ''

/** The brand's deep aqua. The sheet's buttons and accents take this. */
const THEME = '#1B5C73'

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
 * Razorpay wants ten digits, or +91 and ten digits. Anything else and it
 * silently rejects the prefill and shows an empty field — which is what
 * "it will not accept my phone number" looked like from the outside.
 */
function normalisePhone(raw) {
  if (!raw) return undefined
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return digits
  // 91XXXXXXXXXX, +91XXXXXXXXXX, 091XXXXXXXXXX all reduce to the last ten.
  if (digits.length > 10) return digits.slice(-10)
  return undefined      // too short to be real; let Razorpay ask
}

/**
 * @returns {{ok:true, paymentId, orderId, signature} | {ok:false, error, dismissed?}}
 *
 * `ok: true` means the checkout closed successfully. It does NOT mean
 * the booking is paid — see the header.
 */
export function openRazorpay({
  keyId, orderId, amountPaise,
  description = 'Your masters',
  customer = {},
  notes = {},
  onDismiss,
}) {
  return new Promise(async resolve => {
    const ready = await loadSdk()
    if (!ready) {
      return resolve({ ok: false, error: 'Could not reach the payment page. Check your connection and try again.' })
    }

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      // The order already fixes the amount server-side. This is passed
      // only so the sheet can render a figure before it fetches the order.
      amount: amountPaise,
      currency: 'INR',

      /* ── The brand, not the gateway ─────────────────────────────
         `name` is the large text at the top of the sheet and `image` is
         the mark beside it. Left unset, a customer's last screen before
         parting with twenty thousand rupees is branded Razorpay — a
         company they have no relationship with — so the moment of
         highest doubt is the exact moment the brand disappears. */
      name: 'Sambramo',
      image: LOGO,
      description,
      theme: { color: THEME, backdrop_color: '#0F3D4C' },

      // Skips Razorpay's contact form. See the header.
      prefill: {
        name: customer.name || undefined,
        email: customer.email || undefined,
        contact: normalisePhone(customer.phone),
      },

      // Carried into the Razorpay dashboard, so a payment can be traced
      // to a booking without a database query.
      notes,

      // A declined card should offer another method rather than closing
      // the sheet and making somebody start over.
      retry: { enabled: true, max_count: 3 },

      // Nothing is faster than a card the customer has already used.
      remember_customer: true,

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
        // Asks before closing mid-payment, which is the one place an
        // accidental tap costs the most.
        confirm_close: true,
      },
    })

    /* A declined card, a timed-out UPI request, a method the account
       does not have enabled. Razorpay's own sheet has usually said so;
       this exists so the app never claims success when it failed, and so
       the REASON survives into our own error line. */
    rzp.on('payment.failed', response => {
      const e = response?.error ?? {}
      resolve({
        ok: false,
        error: e.description || 'That payment did not go through.',
        // `reason: 'payment_method_not_enabled'` is the one that means
        // the account is at fault, not the customer.
        detail: [e.reason, e.step, e.source].filter(Boolean).join(' · ') || null,
      })
    })

    rzp.open()
  })
}
