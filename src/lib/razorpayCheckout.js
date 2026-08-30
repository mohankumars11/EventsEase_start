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
 * UPI IS PREFERRED, NEVER IMPOSED
 * ══════════════════════════════════════════════════════════════════════
 *
 * This has been wrong in both directions, and the lesson is the same
 * both times: it guessed.
 *
 * First it hard-coded `config.display.blocks.upi` with
 * `sequence: ['block.upi']` to put UPI first for zero MDR. A forced
 * block names a method the ACCOUNT must have live, and on an account
 * without it Razorpay renders a block it cannot fill. The symptom was
 * exact: the contact field stopped taking ten digits and pressing pay
 * did nothing at all.
 *
 * So the block was removed outright — and on a live account that DOES
 * have UPI, Razorpay then filled the sheet with cards and wallets and
 * left UPI out of it. In India. On the method that costs Sambramo
 * nothing in MDR and is how most people actually pay.
 *
 * Neither state was a bug in Razorpay. Both were this file assuming
 * something it could have asked.
 *
 * `enabledMethods()` asks — /v1/methods, keyed by the public key id the
 * browser already holds, which is the same call checkout.js makes. UPI
 * goes first only when the account reports it live, and
 * `show_default_blocks: true` keeps every other enabled method in the
 * sheet underneath it.
 *
 * The probe fails OPEN. Any error, any timeout, and the config is
 * omitted and the sheet opens exactly as it did before. A payment screen
 * must never fail to open because a preference could not be checked.
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

/* What this Razorpay ACCOUNT can actually take, asked at run time.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ASK INSTEAD OF ASSUMING
 * ══════════════════════════════════════════════════════════════════════
 *
 * A forced UPI block names a method the account must have live. Force it
 * on an account without UPI and Razorpay renders a block it cannot fill:
 * the sheet half-opens, the contact field stops taking ten digits, and
 * pressing pay does nothing. That happened, which is why the block was
 * removed entirely -- and removing it is why UPI then stopped appearing
 * on an account that DOES have UPI live.
 *
 * Both states were wrong because both guessed. This asks.
 *
 *  takes only key_id, which is public by design -- the
 * browser already receives it to open the sheet at all. It is what
 * checkout.js itself calls.
 *
 * Fails OPEN: any error, any timeout, and this returns null, the config
 * is omitted, and the sheet behaves exactly as it did before. A payment
 * screen must never fail to open because a preference could not be
 * checked. */
let methodsCache = null
async function enabledMethods(keyId) {
  if (methodsCache?.key === keyId) return methodsCache.value
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 2500)
    const url = "https://api.razorpay.com/v1/methods?key_id=" + encodeURIComponent(keyId)
    const res = await fetch(url, { signal: ctl.signal })
    clearTimeout(t)
    const value = res.ok ? await res.json() : null
    methodsCache = { key: keyId, value }
    return value
  } catch {
    return null
  }
}

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

    /* UPI first, but only on an account that has UPI live.
     *
     * Verified against the live account before this was written:
     * /v1/methods reports upi true, card true, 45 banks, four wallets.
     * With no display config Razorpay put card and wallets in the sheet
     * and left UPI out of it — on the one market where UPI is how people
     * actually pay, and the one method that costs Sambramo nothing in
     * MDR.
     *
     * `show_default_blocks: true` is what makes this a preference rather
     * than an imposition: UPI is placed first and every other enabled
     * method still renders underneath it, so somebody without a UPI app
     * loses nothing.
     *
     * And the whole thing is skipped when the probe says UPI is not
     * live, which is the state that broke the sheet the first time this
     * was attempted — a forced block Razorpay could not fill. */
    const methods = await enabledMethods(keyId)
    const upiFirst = methods?.upi === true

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

      /* Omitted entirely when the probe could not confirm UPI. A payment
         sheet that will not open is infinitely worse than one that opens
         with the methods in Razorpay own order. */
      ...(upiFirst ? {
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay by UPI', instruments: [{ method: 'upi' }] },
            },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: true },
          },
        },
      } : {}),

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
