import { LOCK_AMOUNT } from '../data/celebrationTiers'
import { TAX_LABEL } from '../data/taxes'

/**
 * What a celebration costs to commit to. One number, one payment.
 *
 * ── Why this is a config file and not code in a component ────────────────
 * The same three properties that made `config/policies.js` a file rather than
 * a paragraph of JSX apply here, and more sharply, because this one moves
 * five-figure sums:
 *
 *   — a payment term is a promise the business has to honour, and a promise
 *     typed into a card is one nobody can find, review or turn off;
 *   — the customer, the coordinator and the admin console must evaluate the
 *     SAME rules, or two of them are looking at a number the third will not
 *     honour;
 *   — `SCHEDULE_VERSION` is stamped on every agreement, so changing the terms
 *     cannot silently rewrite what a customer already agreed to.
 *
 * ── Why the instalment ladder is gone ────────────────────────────────────
 * This file used to offer four splits — 25%×4, 50%×2, 75%+25%, and all of it —
 * with work released at 25%, 50% and 100% of the money. It now offers one
 * settlement of the confirmed quote, and the reasoning is operational rather
 * than aesthetic:
 *
 *   A part-paid celebration is a celebration with an open question on it.
 *   Every instalment is a due date that can be missed, a reminder somebody has
 *   to send, a reconciliation somebody has to do, and — on the week of a
 *   wedding — a conversation about money nobody wants to have. Four rungs is
 *   four times as many of those, on a booking whose vendors have already been
 *   committed to.
 *
 *   Partial funding creates partially-booked celebrations. The gates were an
 *   honest attempt to model that: 25% booked the masters, 50% bought the
 *   provisions. But it means the business either fronts the unfunded half of
 *   an event that is three days away, or tells a family on the day that their
 *   décor was never ordered. Neither is a position to be in, and there is no
 *   third one.
 *
 *   It made the price ambiguous at the moment it must not be. A customer
 *   reading "₹18,750 due" has to work out what the celebration actually costs.
 *   The one thing this screen owes them is the whole number, once.
 *
 * So: the coordinator confirms a price, the customer pays that price, and
 * everything the money releases is released together. The ₹1,000 date hold
 * survives — see `hold` below — because it is not a part payment of the quote;
 * it is a pre-quote, refundable hold that comes off the one payment.
 *
 * ── The one rule the whole file is built on ──────────────────────────────
 * The amount here is the CONFIRMED QUOTE and nothing else.
 * `utils/quote.js:29-35` refuses to state the estimate to the rupee, because
 * Sambramo has no signed supplier behind the catalogue and a number stated to
 * the rupee implies a rate card that does not exist. Putting a DUE DATE on
 * that number would be strictly worse. So before a confirmed quote exists,
 * `buildSettlement()` returns `basis: 'none'` and the UI shows no rupee
 * figure at all.
 *
 * The ₹1,000 hold is the single exception, and only because it is a flat fee
 * that does not scale with a price nobody has agreed to yet.
 */

export const SCHEDULE_VERSION = '2026-08-17'

/**
 * The one milestone id, kept as `pay-100`.
 *
 * It is stored in `event_payments.milestone_id` (migration 046) and the unique
 * index on `(subject, milestone_id)` is what stops a customer who opens the
 * payment sheet twice creating two rows. Naming it for the cumulative point it
 * reaches is left over from the ladder, and it is kept for exactly one reason:
 * a celebration that already settled `pay-100` under the old four-plan config
 * is still recognised as paid. Renaming it to `settlement` would strand those
 * rows and re-ask people for money they have already sent.
 *
 * `pay-25` / `pay-50` / `pay-75` are no longer issued. Any that exist are read
 * as credit against the settlement — see `creditFrom()`.
 */
export const SETTLEMENT_ID = 'pay-100'

/** Ids the retired ladder could have written. Read, never issued. */
export const LEGACY_MILESTONE_IDS = ['pay-25', 'pay-50', 'pay-75']

/* ── What the money releases ──────────────────────────────────────────────
 *
 * Every line is derived from the services actually in THIS booking. A booking
 * with no catering must never be told a payment buys groceries — that is the
 * same invented-progress failure the tracker exists to avoid, wearing a
 * friendlier face. `needs: '*'` means the line holds for any celebration.
 *
 * The gates are gone with the ladder. One payment releases the lot, which is
 * the point of taking it in one: there is no state in which a celebration is
 * three-quarters arranged.
 */
const RELEASE_RULES = {
  date_hold:       { needs: '*',
                     line: () => 'Your date is held while you decide' },
  venue_hold:      { needs: ['venue', 'tent'],
                     line: () => 'Your venue is confirmed for the date' },
  vendor_advances: { needs: '*',
                     line: ({ count }) => count > 1
                       ? `Booking advances placed with all ${count} masters`
                       : 'The booking advance is placed with your master' },
  provisions:      { needs: ['catering', 'cooks', 'menu', 'cake', 'live_counters', 'bar', 'welcome_drinks', 'ice_cream'],
                     line: () => 'Provisions bought and your cooks confirmed' },
  materials:       { needs: ['decor', 'floral', 'stage', 'balloon_arch', 'mandap', 'lighting', 'candle_setup', 'memory_wall'],
                     line: () => 'Décor materials ordered and the setup crew booked' },
  staffing:        { needs: ['photography', 'videography', 'dj', 'live_music', 'priest', 'pooja', 'emcee', 'bouncers', 'hospitality', 'makeup', 'mehendi', 'valet', 'nanny'],
                     line: () => 'Crew rostered for your date' },
  setup:           { needs: '*',
                     line: () => 'Setup slot confirmed with the venue' },
  event_day:       { needs: '*',
                     line: () => 'Your coordinator is on the ground from the morning' },
}

/** Everything the single settlement releases, in the order it happens. */
export const RELEASE_KEYS = [
  'venue_hold', 'vendor_advances', 'provisions', 'materials', 'staffing',
  'setup', 'event_day',
]

/** The lines one set of release keys covers, for one booking. */
export function unlocksFor(keys = [], bookedServiceIds = []) {
  const ids = new Set(bookedServiceIds)
  const count = ids.size
  return keys
    .map(key => {
      const rule = RELEASE_RULES[key]
      if (!rule) return null
      const applies = rule.needs === '*' || rule.needs.some(n => ids.has(n))
      return applies ? { key, line: rule.line({ count }) } : null
    })
    .filter(Boolean)
}

/* ── Refunds, by how close to the day you cancel ──────────────────────────
 *
 * Unchanged by the move to one payment: what we can give back depends on when
 * we paid the vendors, not on how the money arrived.
 */
export const REFUND_TIERS = [
  { daysBefore: 21, pct: 1.00, copy: 'Full refund — nothing is committed to a vendor yet.' },
  { daysBefore: 7,  pct: 0.50, copy: 'Half back. The booking advances placed with your vendors are not returned to us.' },
  { daysBefore: 3,  pct: 0.30, copy: 'Most vendors bill in full at this point.' },
  { daysBefore: 0,  pct: 0.00, copy: 'Not refundable — provisions are bought and staff are rostered.' },
]

/* ── Building the settlement ──────────────────────────────────────────── */

const round = n => Math.round(n)

/**
 * When the one payment is due.
 *
 * 48 hours after the customer approves the plan — a decision made is a
 * decision worth acting on while it is fresh — and never later than two days
 * before the day, because nobody should be chasing money at somebody's
 * wedding. A celebration booked inside that window is simply payable now,
 * which is the truth rather than a softened version of it.
 */
function dueDate({ eventDate, approvedAt }) {
  if (!approvedAt) return null
  const soon = new Date(approvedAt).getTime() + 48 * 3600000
  if (!eventDate) return new Date(soon)
  const latest = new Date(eventDate).getTime() - 2 * 86400000
  return new Date(Math.min(soon, latest))
}

/**
 * Money already received against this celebration, from any milestone id.
 *
 * Reads the retired ladder's rows as well as the hold, for one reason: a
 * celebration that paid `pay-25` before this change must not be asked for the
 * full quote again. Anything verified is credit.
 */
function creditFrom(payments = []) {
  let holdPayment = null
  let ladderPaid = 0
  let settlement = null

  for (const p of payments) {
    if (!p) continue
    if (p.milestone_id === 'hold') { holdPayment = p; continue }
    if (p.milestone_id === SETTLEMENT_ID) { settlement = p; continue }
    if (LEGACY_MILESTONE_IDS.includes(p.milestone_id) && isSettled(p)) {
      ladderPaid += Number(p.amount ?? 0)
    }
  }

  return { holdPayment, ladderPaid, settlement }
}

/**
 * The settlement, priced, for one celebration.
 *
 * `basis` is the honesty switch:
 *   'confirmed' — a coordinator has priced this. The rupee amount is shown.
 *   'none'      — no confirmed quote yet. No rupee figure at all. The caller
 *                 must not fall back to the estimate range; see the header.
 *
 * @param confirmedTotal  TAX-INCLUSIVE confirmed total, from
 *                        `event_proposals.total_amount` (APPROVED) or
 *                        `service_enquiries.quoted_price`. Never `quote.range`.
 * @param taxTotal        the GST inside that total, if known.
 * @param payments        rows from `event_payments`, matched on `milestone_id`
 * @param services        service ids on this booking, for the release lines
 */
export function buildSettlement({
  confirmedTotal = null,
  taxTotal = null,
  eventDate = null,
  approvedAt = null,
  payments = [],
  services = [],
  now = new Date(),
} = {}) {
  const priced = Number.isFinite(Number(confirmedTotal)) && Number(confirmedTotal) > 0
  const total = priced ? Number(confirmedTotal) : null

  const { holdPayment, ladderPaid, settlement: settlementPayment } = creditFrom(payments)
  const holdSettled = isSettled(holdPayment)
  const holdCredit = holdSettled ? LOCK_AMOUNT : 0
  // Everything already received that comes off the one payment.
  const credit = holdCredit + ladderPaid

  // Never below zero: a celebration whose old instalments already covered the
  // quote owes nothing, and a negative "amount due" is not a refund — refunds
  // are `refundForCancellation`'s job and go through a human.
  const amount = priced ? Math.max(0, total - credit) : null
  const settled = isSettled(settlementPayment) || (priced && amount === 0)

  const due = dueDate({ eventDate, approvedAt })

  const releases = unlocksFor(RELEASE_KEYS, services)

  return {
    basis: priced ? 'confirmed' : 'none',
    version: SCHEDULE_VERSION,
    confirmedTotal: total,
    taxTotal: priced ? taxTotal : null,
    taxLabel: TAX_LABEL,

    /** The ₹1,000 pre-quote hold. Not a part payment — credit against the one. */
    hold: {
      amount: LOCK_AMOUNT,
      payment: holdPayment,
      settled: holdSettled,
      status: paymentStatusOf(holdPayment),
      lines: unlocksFor(['date_hold'], services),
    },

    /** Anything the retired instalment ladder collected, as credit. */
    legacyPaid: ladderPaid,
    credit,

    /** The one payment. */
    settlement: {
      id: SETTLEMENT_ID,
      label: 'Your payment',
      amount,
      gst: priced && taxTotal != null ? Number(taxTotal) : null,
      dueAt: due,
      overdue: Boolean(due && due < now && !settled),
      creditsHold: holdSettled,
      creditsLadder: ladderPaid > 0,
      payment: settlementPayment,
      status: settled ? 'paid' : paymentStatusOf(settlementPayment),
      settled,
    },

    /** What the payment releases. Released together, or not at all. */
    releases,
    released: settled,

    paid: priced ? (settled ? total : credit) : null,
    outstanding: priced ? (settled ? 0 : amount) : null,
    settled,
  }
}

/**
 * Has this money actually arrived?
 *
 * `CUSTOMER_CLAIMED_PAID` is deliberately NOT settled. A claim is a sentence
 * somebody typed; direct UPI has no callback, so until a gateway signature or
 * a human bank check says otherwise it is unverified. If a claim released the
 * work it funds, the release would mean nothing — and the first customer who
 * discovered that would stop believing every other thing this tracker says.
 */
export function isSettled(payment) {
  return payment?.status === 'ADMIN_VERIFIED' || payment?.status === 'GATEWAY_VERIFIED'
}

export function paymentStatusOf(payment) {
  if (!payment) return 'due'
  if (isSettled(payment)) return 'paid'
  if (payment.status === 'CUSTOMER_CLAIMED_PAID') return 'checking'
  if (payment.status === 'REFUNDED') return 'refunded'
  if (payment.status === 'CANCELLED') return 'cancelled'
  return 'due'
}

/* ── The sentence that does the persuading ────────────────────────────────
 *
 * The old note existed to kill the assumption that instalments carry a
 * surcharge. With one payment that argument is moot, and the thing worth
 * saying instead is what the number IS: the whole cost of the celebration,
 * GST inside it, nothing after the day, nothing to remember.
 *
 * `scripts/check-payment-schedule.mjs` asserts the arithmetic behind every
 * clause here rather than leaving it as a comment somebody can quietly
 * falsify.
 */
export const PAYMENT_NOTE = {
  headline: 'One payment, and it is done.',
  body: 'The number your coordinator confirms is the whole cost of your celebration — GST included, no instalments to keep track of, no balance collected after the day. Paying it releases every part of the arrangement at once.',
  estimated: `${TAX_LABEL} — confirmed on your invoice.`,
}

/**
 * Documents this settlement obliges the business to issue.
 *
 * One payment means one document, which is the other quiet win of dropping the
 * ladder: staged collection required a receipt voucher per advance (CGST Rule
 * 50) and then a tax invoice adjusting them all at completion (§31(3)(d)), and
 * nothing in this app generated either. A single payment against a confirmed
 * quote needs one tax invoice. Stated here because a gap named in the config
 * is a gap somebody can find.
 */
export const REQUIRED_DOCUMENTS = {
  full: ['A tax invoice for the payment.'],
}

/* ── Cancelling a celebration ─────────────────────────────────────────────
 *
 * `config/policies.js` is entirely shop-order shaped — its `CANCELLATION`
 * ladder keys off `orders.status` and `refundBreakdown()` reads
 * `order.subtotal`. None of it can answer what happens to a ₹25,000 payment on
 * a celebration cancelled three weeks out, and taking that money without an
 * answer is not acceptable.
 */
export const CELEBRATION_CANCELLATION_TERMS = {
  version: SCHEDULE_VERSION,
  summary: 'What you get back depends on how close to the day you cancel, because that is when we have already paid your vendors.',
  points: [
    'The ₹1,000 hold is refunded in full, at any point before you approve a plan.',
    'Cancel more than 21 days before the day and everything you have paid comes back.',
    'Inside 21 days we have placed booking advances with your vendors, and those are not returned to us — so part of what you have paid cannot come back.',
    'Inside 3 days the provisions are bought and the people are rostered.',
    'We tell you the exact figure before we refund anything. You never find out at the bank.',
    'Refunds go out as a fresh UPI or bank transfer within 2–5 working days.',
  ],
}

/**
 * What comes back if this celebration is cancelled now.
 *
 * Returns a line per payment received rather than one number, mirroring
 * `policies.refundBreakdown()`'s contract — the customer is owed the
 * reasoning, not just the total, and a coordinator has to be able to read it
 * out loud.
 */
export function refundForCancellation({ settlement, eventDate, now = new Date() }) {
  const daysOut = eventDate
    ? Math.floor((new Date(eventDate) - now) / 86400000)
    : null

  // Tiers run furthest-out first; the first one the customer is still ahead of
  // applies. With no date we cannot know how close we are, so the most
  // generous tier stands — the customer is not charged for our missing data.
  const tier = daysOut == null
    ? REFUND_TIERS[0]
    : REFUND_TIERS.find(t => daysOut >= t.daysBefore) ?? REFUND_TIERS[REFUND_TIERS.length - 1]

  const lines = []

  // The hold is refundable in full until a plan is approved, and is credited
  // against the payment after that — so it is only refunded on its own terms
  // while the settlement is still outstanding.
  if (settlement?.hold?.settled && !settlement.settled) {
    lines.push({
      id: 'hold', label: 'Hold your date',
      paid: settlement.hold.amount, refund: settlement.hold.amount, pct: 1,
      reason: 'Refunded in full — you had not approved a plan yet.',
    })
  }

  if (settlement?.settled) {
    const paid = settlement.confirmedTotal ?? 0
    lines.push({
      id: SETTLEMENT_ID,
      label: 'Your payment',
      paid,
      refund: round(paid * tier.pct),
      pct: tier.pct,
      reason: tier.copy,
    })
  } else if (settlement?.legacyPaid > 0) {
    // A celebration part-paid under the retired ladder, cancelled before it
    // settled. The money is real and is owed the same ladder.
    lines.push({
      id: 'legacy',
      label: 'Paid so far',
      paid: settlement.legacyPaid,
      refund: round(settlement.legacyPaid * tier.pct),
      pct: tier.pct,
      reason: tier.copy,
    })
  }

  return {
    daysOut,
    lines,
    total: lines.reduce((s, l) => s + l.refund, 0),
    paid: lines.reduce((s, l) => s + l.paid, 0),
    version: SCHEDULE_VERSION,
  }
}
