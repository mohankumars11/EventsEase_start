import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { openRazorpay } from '../lib/razorpayCheckout'

/**
 * The payment sheet, opened in the phone's real browser.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE APP SENDS PAYMENT OUT OF ITSELF
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay's JS checkout offers UPI in Chrome and does not offer it in an
 * Android WebView. Measured, not assumed: the identical order, the same
 * account, the same code — UPI first in Chrome, where a real rupee
 * cleared; cards, netbanking and wallets only in the APK.
 *
 * Declaring `<queries>` in the manifest was necessary and not sufficient.
 * The remaining difference is checkout.js itself, which will not commit
 * to a UPI app-switch it cannot guarantee it can return from. That is
 * Razorpay's call to make and it is a reasonable one — a WebView really
 * can lose the thread when another app takes the foreground.
 *
 * The two ways out are a native SDK, which is a plugin and a rewrite of
 * this path, or handing the payment to the browser that already works.
 * This is the second, and it costs one page.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT TRAVELS IN THE URL, AND WHY IT IS SAFE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `order`, `key` and `amount` — every one of which Razorpay hands to the
 * browser anyway to render a sheet at all. No session, no token, nothing
 * signed. A stranger who guessed all three could pay somebody else's
 * booking, which is not an attack anybody runs.
 *
 * The amount is Razorpay's, not ours: the ORDER fixes it server-side, and
 * `amount` here only lets the sheet draw a figure before it fetches the
 * order. A tampered URL changes the number on this page and not one paisa
 * of what is charged.
 *
 * ── How the app finds out ───────────────────────────────────────────
 * It does not ask this page. `api/razorpay-webhook` is the only witness
 * that money moved, exactly as it was before, and the matching board
 * already polls `booking_lines` every couple of seconds. The customer
 * comes back to a screen that has already turned green on its own.
 *
 * So this page never reports success to anything. It says what happened,
 * and it says to go back.
 */
export default function PayBridge() {
  const [params] = useSearchParams()
  const order = params.get('order')
  const key = params.get('key')
  const amountPaise = Number(params.get('amount') ?? 0)
  const label = params.get('for') ?? 'Your masters'
  const upi = params.get('upi')

  const [state, setState] = useState('opening')
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    if (!order || !key) { setState('bad-link'); return }

    openRazorpay({
      keyId: key,
      orderId: order,
      amountPaise,
      description: label,
      // Passed through from the server's answer rather than re-derived:
      // this page has no session and could not ask.
      upiEnabled: upi === '1' ? true : upi === '0' ? false : null,
      onDismiss: () => setState('dismissed'),
    }).then(r => {
      setState(r.ok ? 'done' : r.dismissed ? 'dismissed' : 'failed')
    }).catch(() => setState('failed'))
  }, [order, key, amountPaise, label, upi])

  const said = {
    opening:    ['Opening the payment page…', 'One moment.'],
    done:       ['Payment received', 'Go back to the Sambramo app — your booking updates on its own.'],
    dismissed:  ['Payment cancelled', 'Nothing has been charged. Go back to the app and try again when you are ready.'],
    failed:     ['That did not go through', 'Nothing has been charged. Go back to the app and try again.'],
    'bad-link': ['This link is incomplete', 'Start the payment again from the app.'],
  }[state]

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="type-overline text-saffron-700">Sambramo</p>
      <h1 className="mt-2 font-serif text-[26px] font-extrabold leading-tight tracking-tight text-ink">
        {said[0]}
      </h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{said[1]}</p>

      {state === 'opening' && (
        <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-ink/[0.08]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-saffron-400" />
        </div>
      )}

      {/* No "return to app" button. A deep link back needs a scheme the
          two apps do not share, and a button that might not work on the
          screen after somebody has paid is worse than a sentence telling
          them what they already know how to do. */}
    </div>
  )
}
