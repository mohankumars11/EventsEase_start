import { supabase } from './supabase'
import { openCheckout } from './payment/razorpayProvider'
import { SETTLEMENT_ID, SCHEDULE_VERSION } from '../config/celebrationPayments'

/**
 * Pay for one celebration, in full, from wherever the button was pressed.
 *
 * ── The gap this closes ───────────────────────────────────────────────────
 * `PaymentLadder` used to POST to `/api/create-milestone-payment`, get a real
 * Razorpay order back, and then do this:
 *
 *     window.dispatchEvent(new CustomEvent('sambramo:milestone-payment', …))
 *
 * Nothing in the codebase listened for that event. So the whole path — the
 * endpoint, the parked PENDING row, the webhook — existed and the button did
 * not open a checkout. A customer pressed "Pay ₹40,000", something briefly
 * said "Opening…", and then nothing happened at all. It is the sort of thing
 * that is invisible in review because every piece is present.
 *
 * ── Why the button lives in a lib and not in the panel ────────────────────
 * The payment is now offered in two places on the same screen: beside the
 * confirmed total on the plan itself (where somebody is looking at the number
 * they are agreeing to), and in the settlement panel below it. Two components,
 * one payment, and it must be impossible for them to disagree about what is
 * being charged or to open two Razorpay orders between them.
 *
 * ── What this function is NOT allowed to do ───────────────────────────────
 * It cannot mark a payment received. The browser's success callback is not a
 * witness — somebody who pays and closes the tab, or loses signal in a lift,
 * leaves a captured payment this code never sees. `api/razorpay-webhook.js` is
 * the only thing that writes `GATEWAY_VERIFIED`, and it is retried by Razorpay
 * until it succeeds.
 *
 * The best this can honestly do after a successful checkout is record the
 * CLAIM — exactly the one transition migration 046's trigger permits a
 * customer — so the screen can say "we are checking it" instead of looking
 * like nothing happened while the webhook lands.
 */

/** What came back, in the caller's vocabulary. */
export const PAYMENT_RESULT = {
  claimed: 'claimed',       // paid at the gateway; awaiting the webhook
  dismissed: 'dismissed',   // the customer closed the sheet
}

/**
 * Open the checkout for one celebration's single settlement.
 *
 * @param subjectType 'event' | 'enquiry'
 * @param subjectId   the celebration's id
 * @param contact     { name, email, phone } to prefill, all optional
 * @param label       what the sheet calls this payment
 * @returns { result, paymentId? }
 * @throws Error with a message written for a customer to read
 */
export async function openCelebrationPayment({ subjectType, subjectId, contact = {}, label }) {
  if (!subjectId) throw new Error('There is nothing to pay for yet.')

  // ── 1 · Ask the server what is owed ──────────────────────────────────
  // The amount is deliberately NOT sent. The endpoint recomputes it from the
  // confirmed quote, less the ₹1,000 hold and anything the retired instalment
  // ladder collected. A client that could name its own amount could name ₹1.
  let res
  try {
    res = await fetch('/api/create-milestone-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectType,
        subjectId,
        milestoneId: SETTLEMENT_ID,
        scheduleVersion: SCHEDULE_VERSION,
      }),
    })
  } catch {
    throw new Error('Could not reach the payment service. Please check your connection and try again.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // The gateway not being configured is the expected state pre-launch and
    // says so, rather than looking broken. Every other error the endpoint
    // returns is already written for a customer.
    throw new Error(data?.error ?? 'Could not open a payment just now.')
  }

  // ── 2 · Open the sheet ───────────────────────────────────────────────
  let success
  try {
    success = await openCheckout({
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount * 100,
      currency: data.currency ?? 'INR',
      keyId: data.keyId,
      name: contact.name,
      email: contact.email,
      contact: contact.phone,
      orderLabel: label ?? 'Your Sambramo celebration',
    })
  } catch (err) {
    if (err?.message === 'DISMISSED') return { result: PAYMENT_RESULT.dismissed }
    throw new Error(err?.message || 'The payment did not go through. Nothing has been charged.')
  }

  // ── 3 · Record the claim, best-effort ────────────────────────────────
  // PENDING → CUSTOMER_CLAIMED_PAID is the only edit a customer may make to a
  // payment row (migration 046's `enforce_payment_self_update`). It is wrapped
  // and swallowed on purpose: if the webhook has already landed the row is
  // GATEWAY_VERIFIED, the trigger refuses this update, and that refusal is the
  // system working. The customer's money is recorded either way — this only
  // decides whether the screen says "checking" or "received" in the seconds
  // between the two.
  try {
    const column = subjectType === 'event' ? 'event_id' : 'enquiry_id'
    await supabase
      .from('event_payments')
      .update({ status: 'CUSTOMER_CLAIMED_PAID', claimed_at: new Date().toISOString() })
      .eq(column, subjectId)
      .eq('milestone_id', SETTLEMENT_ID)
      .eq('status', 'PENDING')
  } catch {
    /* the webhook is the record of truth; see the note above */
  }

  return { result: PAYMENT_RESULT.claimed, paymentId: success?.razorpay_payment_id ?? null }
}
