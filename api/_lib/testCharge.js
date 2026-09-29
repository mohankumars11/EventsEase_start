/**
 * The ₹1 live-mode smoke test.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS AND WHY IT IS NOT THE MOCK PROVIDER
 * ══════════════════════════════════════════════════════════════════════
 *
 * `api/_lib/payments.js` has a mock provider, and it is the right tool
 * for development: it walks the real webhook path with a real signature,
 * and it cannot run in production by construction.
 *
 * It cannot answer the one question that matters on launch day, which is
 * whether the LIVE Razorpay account, the LIVE keys, the LIVE webhook
 * secret and the deployed function all work together. Nothing short of a
 * real payment answers that, and a real payment at the real card rate is
 * ₹12,400 to find out that the webhook URL had a typo.
 *
 * So: the amount handed to the gateway is overridden to ₹1. Everything
 * else is real — a real order, a real UPI PIN, a real capture, a real
 * signed webhook, real escrow rows, a real line marked paid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DOES NOT TOUCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * `booking_lines.quoted_amount_paise` is never rewritten. The rate card
 * is what the customer was quoted and what the master was offered; a test
 * that edited it would leave a ₹1 job in the history and a master paid a
 * third of a rupee for a birthday.
 *
 * What changes is the amount CHARGED, and the escrow rows that follow it
 * hold what actually arrived. So the ledger still reconciles — sum of
 * HOLDs equals the captured payment — and it reconciles at ₹1, which is
 * the honest record of a ₹1 payment.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT IS LOUD, AND IT IS FOUND BEFORE LAUNCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * Unlike the mock, this CAN run in production — that is the entire point,
 * because production is what needs testing. Which makes leaving it on the
 * expensive mistake: every booking would collect ₹1.
 *
 * Three defences, none of them a comment:
 *
 *   1. It is off unless PAYMENT_TEST_CHARGE_PAISE is explicitly set.
 *   2. Every response says so, and the customer's own pay button says so
 *      — a screen reading "Test payment · ₹1" is not one somebody ships
 *      past by accident.
 *   3. scripts/check-dispatch-invariants.mjs fails while it is set, so
 *      the pre-launch check is what catches it rather than a customer.
 */

/** Paise to actually charge, or null for "charge the real amount". */
export function testChargePaise() {
  const raw = process.env.PAYMENT_TEST_CHARGE_PAISE
  if (!raw) return null

  const n = Number(raw)
  // A malformed value must not silently mean "charge normally" — that is
  // the failure where somebody believes they are testing and is not, and
  // finds out on a real card. Nor may it mean "charge zero".
  if (!Number.isInteger(n) || n < 100) return null
  return n
}

export const isTestCharge = () => testChargePaise() !== null

/**
 * Split a charged total across lines, in integer paise, exactly.
 *
 * The remainder goes to the first lines rather than being dropped, so the
 * parts sum to the whole. Losing a paise here would trip the escrow
 * reconciliation, which is precisely the check this mode exists to
 * exercise.
 *
 * Every share is ≥ 1 paise because the ledger's own CHECK forbids a zero
 * HOLD — which caps a ₹1 test at 100 lines, and a basket is ten.
 */
export function splitCharge(totalPaise, weights) {
  const n = weights.length
  if (!n) return []
  if (totalPaise < n) {
    throw new Error(`cannot split ${totalPaise} paise across ${n} lines: each needs at least 1`)
  }

  const sum = weights.reduce((a, b) => a + b, 0)
  // Floor each share, then hand the remainder out one paise at a time.
  const shares = weights.map(w => Math.max(1, Math.floor((totalPaise * w) / sum)))
  let drift = totalPaise - shares.reduce((a, b) => a + b, 0)

  for (let i = 0; drift > 0; i = (i + 1) % n) { shares[i]++; drift-- }
  for (let i = 0; drift < 0; i = (i + 1) % n) {
    if (shares[i] > 1) { shares[i]--; drift++ }
  }

  return shares
}
