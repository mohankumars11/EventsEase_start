/**
 * How a bank destination is allowed to appear on a screen or a document.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A MODULE AND NOT A .slice(-4)
 * ══════════════════════════════════════════════════════════════════════
 *
 * It was a `.slice(-4)` — twice, in two components, written slightly
 * differently, so the same account read "Account ending 1234" on one
 * card and "••1234" two cards down. Once a payment slip exists the same
 * number has to appear on a PDF as well, and three spellings of a bank
 * account on three surfaces is how somebody concludes they are looking
 * at two different accounts.
 *
 * Migration 091 already settled the wording: `claim_payment()` snapshots
 * `'Account ending ' || right(account_number, 4)` into
 * `payout_claims.destination`. This file says the same sentence for the
 * live row, so a claim made last month and the bank panel above it
 * agree.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT MUST NEVER LEAVE PayoutDetails.jsx
 * ══════════════════════════════════════════════════════════════════════
 *
 * The full account number, the IFSC, the account holder's name and the
 * PAN. None of them is needed to recognise your own account, and a
 * payment slip is a file that gets forwarded, printed and photographed.
 * `check-money-masking.mjs` asserts those four strings appear nowhere in
 * src/ outside the form that collects them and this file.
 *
 * The PAN is the sharpest of the four: it is an identity document
 * number, it never changes, and the only thing the earnings screen
 * needs to know about it is whether one is on file at all — which is a
 * boolean, and is all `hasPan` ever is.
 */

/** Last four digits of an account number, or null if there is no number. */
export function last4(accountNumber) {
  const digits = String(accountNumber ?? '').replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : null
}

/**
 * A UPI id with the handle blunted but the bank left readable.
 *
 * `ravikumar@okhdfcbank` -> `rav••••@okhdfcbank`
 *
 * The PSP stays whole on purpose: it is not a secret, and it is the part
 * that tells a partner which app the money lands in. Masking it would
 * remove the only useful half.
 */
export function maskUpi(upiId) {
  const raw = String(upiId ?? '').trim()
  if (!raw.includes('@')) return raw ? `${raw.slice(0, 3)}••••` : ''
  const [handle, psp] = raw.split('@')
  const head = handle.slice(0, 3)
  return `${head}${'•'.repeat(Math.max(3, handle.length - head.length))}@${psp}`
}

/**
 * The one sentence naming where money goes.
 *
 * @param payout a vendor_payout_details row
 * @returns {string} safe to render anywhere, including a PDF
 */
export function destinationOf(payout) {
  if (!payout) return 'No account yet'
  if (payout.method === 'upi' && payout.upi_id) return maskUpi(payout.upi_id)
  const four = last4(payout.account_number)
  return four ? `Account ending ${four}` : 'Bank account'
}

/**
 * The shorter form, for a chip or a table cell where the sentence above
 * would wrap. Still never the whole number.
 */
export function destinationShort(payout) {
  if (!payout) return '—'
  if (payout.method === 'upi' && payout.upi_id) return maskUpi(payout.upi_id)
  const four = last4(payout.account_number)
  return four ? `••${four}` : 'Bank'
}

/**
 * Is this destination one money can actually be sent to?
 *
 * Present is not the same as verified — migration 090's trigger clears
 * `verified_at` whenever the destination changes, precisely so that
 * editing an account cannot quietly re-point a verified payout.
 */
export function payoutReady(payout) {
  return !!payout && !!payout.verified_at
}
