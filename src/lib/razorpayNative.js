import { registerPlugin } from '@capacitor/core'

/**
 * Razorpay's Android sheet, from JavaScript.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THERE ARE TWO CHECKOUTS IN THIS CODEBASE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `razorpayCheckout.js` opens Razorpay's JS sheet. It is the right thing
 * on the web and it took a real rupee by UPI this morning.
 *
 * It cannot do UPI in the app. checkout.js will not commit to an
 * app-switch it cannot guarantee returning from, and inside an Android
 * WebView that caution is correct — the customer leaves for PhonePe and
 * a WebView has no reliable way to be told what happened. So it offers
 * cards and netbanking and stays silent about UPI.
 *
 * The native SDK owns the switch: it starts the UPI app as a real
 * activity and receives the result through the activity lifecycle. That
 * is the whole difference, and it is why every Indian app you would
 * compare this to ships the SDK rather than a WebView sheet.
 *
 * ── The shape is deliberately identical ─────────────────────────────
 * Same arguments in, same `{ ok, dismissed, error, … }` out as
 * `openRazorpay`. The caller picks a path and stops thinking about it;
 * nothing downstream — not the webhook, not the board — can tell which
 * sheet took the money.
 */
const Native = registerPlugin('RazorpayNative')

/** Is the native sheet actually in this build? */
export function hasNativeCheckout() {
  return typeof window !== 'undefined'
    && !!window.Capacitor
    // Registered by MainActivity. Absent on the web, and absent in an
    // older APK that predates it — which is why this is checked rather
    // than inferred from "are we in the app".
    && !!window.Capacitor?.Plugins?.RazorpayNative
}

/**
 * @returns {{ok:true, paymentId, orderId, signature} | {ok:false, error, dismissed?}}
 */
export async function openRazorpayNative({
  keyId, orderId, amountPaise,
  description = 'Your masters',
  customer = {},
  notes = {},
  theme = '#0E8C86',
}) {
  try {
    const res = await Native.open({
      keyId,
      /* Razorpay's own option names, passed through as they are.
       *
       * `currency` and `amount` are required even with an order id: the
       * SDK draws the sheet before it fetches the order, exactly as the
       * JS one does. The ORDER remains what fixes the real amount. */
      options: {
        name: 'Sambramo',
        description,
        order_id: orderId,
        currency: 'INR',
        amount: amountPaise,
        theme: { color: theme },
        prefill: {
          name: customer.name || '',
          email: customer.email || '',
          contact: customer.phone || '',
        },
        notes,
        retry: { enabled: true, max_count: 3 },
      },
    })

    if (res?.ok) {
      return {
        ok: true,
        paymentId: res.razorpay_payment_id,
        orderId: res.razorpay_order_id ?? orderId,
        signature: res.razorpay_signature,
      }
    }

    return {
      ok: false,
      dismissed: !!res?.dismissed,
      error: res?.error ?? 'Payment did not go through',
    }
  } catch (err) {
    /* The plugin is missing, or it rejected before opening. Reported as
       a normal failure so the caller can fall back rather than crash on
       the screen where somebody is trying to pay. */
    return {
      ok: false,
      error: err?.message ?? 'Could not open the payment sheet',
      unavailable: true,
    }
  }
}
