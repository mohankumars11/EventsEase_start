import { istDayStart } from './istTime'

/**
 * Where one job's money actually is — one word, decided in one place.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A MODULE AND NOT A useMemo
 * ══════════════════════════════════════════════════════════════════════
 *
 * The Earnings screen derived five buckets inline, the Jobs screen had
 * its own idea of "delivered", and `claimable()` in the database had a
 * third. That is how one job came to read "Ready to claim" on one screen
 * and "Delivered" on another — two ladders, same row.
 *
 * So the ladder is written once, here, and migration 141's
 * `partner_earnings.payout_state` is a CASE that returns the SAME nine
 * words in the SAME order. `check-payout-states.mjs` parses the SQL and
 * asserts the two sets match, because two ladders drift, and this one
 * decides whether somebody is told their money is available.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ORDER IS THE DESIGN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Terminal facts first, then the money's position, then time. A job that
 * was cancelled is cancelled even if it was once ready; a claim that was
 * paid is paid even if the line was never marked settled. Reordering
 * these arms changes what a partner is told, so the order is asserted by
 * the guard rather than left to whoever edits next.
 *
 *   cancelled  the job is off. Nothing is owed from it.
 *   disputed   somebody has opened a problem. Money is frozen.
 *   paid       a claim settled. The only state that means money moved.
 *   failed     a payout was attempted and bounced. Re-claimable.
 *   rejected   a claim was refused. Not re-claimable without help.
 *   claimed    asked for, not yet sent.
 *   ready      delivered, past the window, nobody objected. Owed now.
 *   held       paid by the customer, held until the job is done.
 *   unfunded   accepted, customer has not paid. Zero claim on it.
 *
 * ── `failed` and `rejected` are not the same word ────────────────────
 * A failed payout is OUR problem — a bounced transfer, a wrong IFSC —
 * and `uq_claim_one_open_per_line` is partial on ('requested','paid'),
 * so a failed claim frees the line and the partner may simply ask again.
 * A rejected claim is a refusal, and asking again will not help. Showing
 * one retry affordance for both would send a partner round a loop.
 */

const DAY = 86_400_000

export const PAYOUT_STATES = [
  'cancelled', 'disputed', 'paid', 'failed',
  'rejected', 'claimed', 'ready', 'held', 'unfunded',
]

/**
 * @param row   a partner_jobs row (Phase 1) or a partner_earnings row
 *              (Phase 5). The view's columns win where present.
 * @param claim the matching payout_claims row, when read separately.
 */
export function payoutState(row, claim = null, now = Date.now()) {
  if (!row) return 'unfunded'

  const status = row.payout_state ?? null
  /* Once migration 141 is applied the database has already decided.
     Trusting it here is what keeps the screen and the RPC in step —
     and it is why this function must not "improve" on the answer. */
  if (status && PAYOUT_STATES.includes(status)) return status

  const lineStatus = row.line_status ?? row.status ?? null
  const claimStatus = row.claim_status ?? claim?.status ?? null
  const dispute = row.dispute_status ?? null

  if (lineStatus === 'cancelled' || lineStatus === 'expired') return 'cancelled'
  if (lineStatus === 'disputed' || (dispute && dispute !== 'resolved' && dispute !== 'withdrawn')) {
    return 'disputed'
  }

  /* A settled CLAIM is the thing that actually happens. `status ===
     'settled'` on the line was the old test and nothing wrote that
     value, so the Paid bucket was structurally always empty. Migration
     139 finally writes it, and both are accepted. */
  if (claimStatus === 'paid' || lineStatus === 'settled') return 'paid'
  if (claimStatus === 'failed') return 'failed'
  if (claimStatus === 'rejected') return 'rejected'
  if (claimStatus === 'requested') return 'claimed'

  /* is_funded comes from an escrow HOLD — the real fact. `paid_at` was
     the proxy this screen used before the view carried it. */
  if (!row.is_funded && !row.paid_at) return 'unfunded'

  return isReady(row, now) ? 'ready' : 'held'
}

/**
 * Delivered, and more than 24 hours past the event day.
 *
 * The 24 hours run from MIDNIGHT IST on the event date, matching
 * `claimable()`'s `event_date + INTERVAL '1 day'` exactly. Using the
 * device's midnight instead moved real money a day early or a day late
 * for any phone not set to IST.
 */
export function isReady(row, now = Date.now()) {
  if (!row?.delivered_at) return false
  const at = claimableAt(row)
  return Number.isFinite(at) ? now > at : false
}

/** The instant this job's money unlocks, or NaN if it has no date. */
export function claimableAt(row) {
  if (row?.claimable_at) {
    const t = Date.parse(row.claimable_at)
    if (Number.isFinite(t)) return t
  }
  const day = istDayStart(row?.event_date)
  return Number.isFinite(day) ? day + DAY : NaN
}

/** Is this state one the partner can act on by asking again? */
export function isRetryable(state) {
  return state === 'failed'
}

/** Money the partner may ask for right now. */
export function isClaimable(state) {
  return state === 'ready'
}

/**
 * The words on screen.
 *
 * `note` is the second line, and it exists because every one of these
 * words is ambiguous on its own — "held" in particular reads as a
 * problem when it is the opposite: proof the money already exists.
 */
export const STATE_LABEL = {
  cancelled: { label: 'Cancelled',    note: 'This job was called off.' },
  disputed:  { label: 'On hold',      note: 'A problem is open on this job. We will be in touch.' },
  paid:      { label: 'Paid',         note: 'Sent to your account.' },
  failed:    { label: 'Payout failed', note: 'The transfer did not go through. You can ask again.' },
  rejected:  { label: 'Not approved', note: 'This claim was refused. Contact us if that looks wrong.' },
  claimed:   { label: 'Asked for',    note: 'Payouts are sent by hand, usually within 2 working days.' },
  ready:     { label: 'Ready',        note: 'Yours now — ask for it whenever you like.' },
  held:      { label: 'Held for you', note: 'The customer has paid. It is held until the job is done.' },
  unfunded:  { label: 'Not yours yet', note: 'The customer has not paid for this one yet.' },
}

/**
 * Tone, from the tokens the partner app already uses.
 *
 * Saffron is attention and never selection; forest is money that is
 * good news; ink is neutral. Nothing here is red: a failed payout is a
 * thing to redo, not an alarm, and a cancelled job is simply over.
 */
export const STATE_TONE = {
  cancelled: 'ink',
  disputed:  'saffron',
  paid:      'forest',
  failed:    'saffron',
  rejected:  'ink',
  claimed:   'ink',
  ready:     'forest',
  held:      'ink',
  unfunded:  'ink',
}

/** States whose money the partner will eventually receive. */
export const OWED_STATES = ['held', 'ready', 'claimed', 'failed']

/** States whose money has already arrived. */
export const SETTLED_STATES = ['paid']
