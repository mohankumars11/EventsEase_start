// Direct UPI payment — no gateway, no fees, no signup. Generates a
// standard UPI deep link + QR code straight to Sambramo's own UPI ID.
//
// Honest trade-off, stated once here so every caller understands it:
// a raw UPI request has no callback or webhook — there is no way for
// this app to know a payment actually succeeded. The order is created
// as payment_status='pending' and stays that way until an admin
// checks their UPI app/bank statement and marks it paid by hand in
// the admin dashboard (AdminDashboard.jsx -> Support -> Shop Orders).
// This is the necessary cost of skipping a payment gateway — see
// razorpayProvider.js for the alternative with real verification.
import QRCode from 'qrcode'

export const UPI_ID = import.meta.env.VITE_UPI_ID || ''
export const UPI_PAYEE_NAME = import.meta.env.VITE_UPI_PAYEE_NAME || 'Sambramo'
export const IS_CONFIGURED = Boolean(UPI_ID)

function upiParams({ amount, note, txnRef }) {
  return new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_PAYEE_NAME,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: note || 'Sambramo order',
    tr: txnRef,
  })
}

/** Standard UPI deep link — opens whichever UPI app the phone has set as default, or a chooser (BHIM and others honor this scheme). */
export function buildUpiUri(opts) {
  return `upi://pay?${upiParams(opts).toString()}`
}

/**
 * App-specific deep links. The generic `upi://` scheme is meant to open
 * any UPI app, but on many Android/iOS setups it silently no-ops or opens
 * the wrong app instead of showing a chooser — so we also link directly
 * into each app's own registered URI scheme (same pa/pn/am/tr params,
 * just a different scheme+host per app) to guarantee it opens Google Pay,
 * PhonePe, or Paytm specifically when the user taps that button.
 */
export function buildAppUpiLinks(opts) {
  const qs = upiParams(opts).toString()
  return {
    upi: `upi://pay?${qs}`,
    gpay: `tez://upi/pay?${qs}`,
    phonepe: `phonepe://pay?${qs}`,
    paytm: `paytmmp://pay?${qs}`,
  }
}

/** Renders the generic UPI link as a scannable QR (for desktop, where none of the app deep links can open an app). */
export function generateQrDataUrl(upiUri) {
  return QRCode.toDataURL(upiUri, { width: 280, margin: 1, color: { dark: '#3b0764', light: '#ffffff' } })
}
