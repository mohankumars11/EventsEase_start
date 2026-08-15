import { LOCK_AMOUNT } from '../data/celebrationTiers'
import { TAX_LABEL } from '../data/taxes'

/**
 * What a celebration costs to commit to, and when.
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
 *   — `SCHEDULE_VERSION` is stamped on every agreement, so changing the ladder
 *     cannot silently rewrite what a customer already agreed to.
 *
 * ── These numbers need a business sign-off ───────────────────────────────
 * Same status as the rates in `data/taxes.js` and the offers in
 * `data/celebrationOffers.js`: defensible launch figures, not approved ones.
 * They move real money in both directions.
 *
 * ── The one rule the whole file is built on ──────────────────────────────
 * Percentages here are of the CONFIRMED QUOTE and of nothing else.
 * `utils/quote.js:29-35` refuses to state the estimate to the rupee, because
 * Sambramo has no signed supplier behind the catalogue and a number stated to
 * the rupee implies a rate card that does not exist. Putting a DUE DATE on
 * that number would be strictly worse. So before a confirmed quote exists,
 * `buildSchedule()` returns `basis: 'none'` and the UI shows percentages with
 * no rupee figures at all.
 *
 * The ₹1,000 hold is the single exception, and only because it is a flat fee
 * that does not scale with a price nobody has agreed to yet.
 */

export const SCHEDULE_VERSION = '2026-08-16'

/**
 * A discount for settling in one payment.
 *
 * Legitimate and genuinely tax-efficient: under CGST §15(3)(a) GST is charged
 * on the discounted value when the discount is known at the time of supply and
 * shown on the invoice — so 2% off ₹1,00,000 saves the customer ₹2,000
 * *including* its share of the tax, not ₹2,000 plus tax on top.
 *
 * Shipped at ZERO deliberately. It costs exactly the whole platform fee
 * (`PLATFORM_FEE_RATE`, 2%), so switching it on is a business decision about
 * margin, not an engineering one. It is wired end to end at 0 so that decision
 * is a one-line change rather than a feature.
 */
export const fullPaymentDiscountPct = 0

/* ── The plans ────────────────────────────────────────────────────────────
 *
 * The customer chooses how to split it, and every plan finishes BEFORE the
 * day. Nothing is collected after the celebration.
 *
 * ── Why the id is the cumulative percentage ──────────────────────────────
 * A milestone is `pay-25`, `pay-50`, `pay-75`, `pay-100` — named for the
 * point on the road it reaches, not for its position in a list. That has one
 * property worth the slight awkwardness: the ids OVERLAP between plans.
 *
 * Somebody who chose "Pay in 2", paid the first 50%, and then decides to
 * switch to quarters has already paid `pay-50`; the quarters plan asks for
 * `pay-25` and `pay-50`, sees `pay-50` settled, and only `pay-75` and
 * `pay-100` remain. Nothing is double-charged and nothing is stranded. With
 * positional ids (`instalment-1`) the same switch would have orphaned the
 * payment and asked for money already taken.
 */
export const PAYMENT_PLANS = {
  quarters: {
    id: 'quarters',
    label: 'Pay in 4',
    short: '25% × 4',
    splits: [0.25, 0.25, 0.25, 0.25],
    blurb: 'Four equal payments across the run-up. The gentlest on cash flow.',
    recommended: true,
  },
  halves: {
    id: 'halves',
    label: 'Pay in 2',
    short: '50% × 2',
    splits: [0.50, 0.50],
    blurb: 'Half to book it in, half before the day.',
  },
  most: {
    id: 'most',
    label: '75% now',
    short: '75% + 25%',
    splits: [0.75, 0.25],
    blurb: 'Most of it up front, a small balance before the day.',
  },
  full: {
    id: 'full',
    label: 'Pay in full',
    short: '100%',
    splits: [1.00],
    blurb: 'One payment. Everything released at once.',
  },
}

export const PLAN_LIST = Object.values(PAYMENT_PLANS)

/** Above this, splitting is the sensible default — it is what the ladder is for. */
export const STAGED_DEFAULT_ABOVE = 50000

export function defaultPlanFor(confirmedTotal) {
  return Number(confirmedTotal) > STAGED_DEFAULT_ABOVE ? 'quarters' : 'full'
}

/* ── What the money unlocks ───────────────────────────────────────────────
 *
 * ── Why gates are keyed on cumulative percentage, not on an instalment ───
 * The work a payment releases depends on HOW MUCH of the celebration is
 * funded, not on which instalment happened to carry it. A customer who pays
 * 75% in one go has funded the vendor advances and the provisions just as
 * surely as one who got there in three steps, and telling them otherwise
 * would be an arbitrary penalty for paying more, sooner.
 *
 * Keying on the total paid also means the gates survive a change of plan
 * without any reconciliation: they are a property of the celebration, not of
 * the schedule that happens to be attached to it.
 */
export const UNLOCK_GATES = [
  { atPct: 0.25, keys: ['venue_hold', 'vendor_advances'],
    label: 'Your masters are booked' },
  { atPct: 0.50, keys: ['provisions', 'materials', 'staffing'],
    label: 'Provisions and crew are secured' },
  { atPct: 1.00, keys: ['setup', 'event_day'],
    label: 'The day itself is fully funded' },
]

/**
 * Every line is derived from the services actually in THIS booking. A booking
 * with no catering must never be told a payment buys groceries — that is the
 * same invented-progress failure the tracker exists to avoid, wearing a
 * friendlier face. `needs: '*'` means the line holds for any celebration.
 */
const UNLOCK_RULES = {
  date_hold:       { needs: '*',
                     line: () => 'Your date is held while you decide' },
  venue_hold:      { needs: ['venue', 'tent'],
                     line: () => 'Your venue is held for the date' },
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

/** The lines one set of unlock keys releases, for one booking. */
export function unlocksFor(keys = [], bookedServiceIds = []) {
  const ids = new Set(bookedServiceIds)
  const count = ids.size
  return keys
    .map(key => {
      const rule = UNLOCK_RULES[key]
      if (!rule) return null
      const applies = rule.needs === '*' || rule.needs.some(n => ids.has(n))
      return applies ? { key, line: rule.line({ count }) } : null
    })
    .filter(Boolean)
}

/* ── Refunds, by how close to the day you cancel ──────────────────────────
 *
 * One ladder for every plan, because what we can give back depends on when we
 * paid the vendors — not on which instalment the money arrived in.
 */
export const REFUND_TIERS = [
  { daysBefore: 21, pct: 1.00, copy: 'Full refund — nothing is committed to a vendor yet.' },
  { daysBefore: 7,  pct: 0.50, copy: 'Half back. The booking advances placed with your vendors are not returned to us.' },
  { daysBefore: 3,  pct: 0.30, copy: 'Most vendors bill in full at this point.' },
  { daysBefore: 0,  pct: 0.00, copy: 'Not refundable — provisions are bought and staff are rostered.' },
]

/* ── Building a schedule ──────────────────────────────────────────────── */

const round = n => Math.round(n)
const pctId = pct => `pay-${Math.round(pct * 100)}`

/**
 * When each instalment is due.
 *
 * The first lands 48h after approval — a decision made is a decision worth
 * acting on while it is fresh. The last lands 2 days before the day, because
 * nobody should be chasing money at somebody's wedding. Anything between is
 * spread evenly across that window.
 */
function dueDates({ count, eventDate, approvedAt }) {
  if (!approvedAt) return Array(count).fill(null)
  const first = new Date(approvedAt).getTime() + 48 * 3600000
  if (count === 1) return [new Date(first)]

  const last = eventDate
    ? new Date(eventDate).getTime() - 2 * 86400000
    : first + (count - 1) * 14 * 86400000     // no date yet: fortnightly
  // A date too close for the spread collapses to "all due now", which is the
  // truth — a celebration booked five days out is simply payable immediately.
  if (last <= first) return Array(count).fill(new Date(first))

  const step = (last - first) / (count - 1)
  return Array.from({ length: count }, (_, i) => new Date(first + step * i))
}

/**
 * The ladder, priced, for one celebration.
 *
 * `basis` is the honesty switch:
 *   'confirmed' — a coordinator has priced this. Rupee amounts are shown.
 *   'none'      — no confirmed quote yet. Percentages only. The caller must
 *                 not fall back to the estimate range; see the file header.
 *
 * @param confirmedTotal  TAX-INCLUSIVE confirmed total, from
 *                        `event_proposals.total_amount` (APPROVED) or
 *                        `service_enquiries.quoted_price`. Never `quote.range`.
 * @param taxTotal        the GST inside that total, if known, so each rung can
 *                        show its share.
 * @param payments        rows from `event_payments`, matched on `milestone_id`
 */
export function buildSchedule({
  confirmedTotal = null,
  taxTotal = null,
  eventDate = null,
  approvedAt = null,
  plan = 'quarters',
  payments = [],
  services = [],
  now = new Date(),
} = {}) {
  const chosen = PAYMENT_PLANS[plan] ? plan : 'quarters'
  const splits = PAYMENT_PLANS[chosen].splits
  const priced = Number.isFinite(Number(confirmedTotal)) && Number(confirmedTotal) > 0

  const discount = priced && chosen === 'full'
    ? round(Number(confirmedTotal) * fullPaymentDiscountPct)
    : 0
  const totalPayable = priced ? Number(confirmedTotal) - discount : null

  const paidBy = {}
  for (const p of payments) if (p?.milestone_id) paidBy[p.milestone_id] = p

  const holdPayment = paidBy.hold ?? null
  const holdSettled = isSettled(holdPayment)
  const holdCredit = holdSettled ? LOCK_AMOUNT : 0

  const dates = dueDates({ count: splits.length, eventDate, approvedAt })

  // Rounded shares, with the LAST instalment absorbing the remainder so the
  // ladder sums to the bill exactly. Four rounded quarters of an odd number
  // do not add up, and a schedule ₹1 short is the kind of thing a customer
  // notices and nobody can explain.
  let cumulative = 0
  let allocated = 0
  let taxAllocated = 0
  const rows = splits.map((share, i) => {
    cumulative += share
    const id = pctId(cumulative)
    const last = i === splits.length - 1

    let amount = null
    if (priced) {
      const gross = last ? totalPayable - allocated : round(totalPayable * share)
      allocated += gross
      // The ₹1,000 hold comes off the FIRST instalment, once and only once.
      amount = Math.max(0, gross - (i === 0 ? holdCredit : 0))
    }

    // The tax split needs the same last-absorbs-the-remainder rule as the
    // amount, and for the same reason: four rounded quarters of ₹3,850 come
    // to ₹3,852. Two rupees is nothing, but it makes the page contradict the
    // sentence beneath it — "the GST inside it is the same" — which is the
    // one claim on this screen that has to survive being checked.
    let gst = null
    if (priced && taxTotal != null) {
      gst = last ? Number(taxTotal) - taxAllocated : round(Number(taxTotal) * share)
      taxAllocated += gst
    }

    const payment = paidBy[id] ?? null
    const dueAt = dates[i]

    return {
      id,
      n: i + 1,
      of: splits.length,
      label: splits.length === 1 ? 'Pay in full' : `Payment ${i + 1} of ${splits.length}`,
      share,
      cumulative,
      amount,
      gst,
      dueAt,
      overdue: Boolean(dueAt && dueAt < now && !isSettled(payment)),
      creditsHold: i === 0 && holdSettled,
      payment,
      status: paymentStatusOf(payment),
      settled: isSettled(payment),
    }
  })

  // How far along the money is — the number the gates key off.
  const paidPct = rows.filter(r => r.settled).reduce((s, r) => s + r.share, 0)
  const paidTotal = priced
    ? rows.reduce((s, r) => s + (r.settled ? (r.amount ?? 0) : 0), 0) + holdCredit
    : null

  const gates = UNLOCK_GATES.map(g => ({
    ...g,
    // A hair of tolerance: four rounded quarters can land at 0.9999999.
    open: paidPct >= g.atPct - 1e-9,
    lines: unlocksFor(g.keys, services),
  })).filter(g => g.lines.length > 0)

  return {
    basis: priced ? 'confirmed' : 'none',
    plan: chosen,
    planLabel: PAYMENT_PLANS[chosen].label,
    version: SCHEDULE_VERSION,
    confirmedTotal: priced ? Number(confirmedTotal) : null,
    discount,
    totalPayable,
    taxTotal: priced ? taxTotal : null,
    taxLabel: TAX_LABEL,
    hold: {
      amount: LOCK_AMOUNT,
      payment: holdPayment,
      settled: holdSettled,
      status: paymentStatusOf(holdPayment),
      lines: unlocksFor(['date_hold'], services),
    },
    rows,
    gates,
    paidPct,
    paidTotal,
    outstanding: priced ? Math.max(0, totalPayable - paidTotal) : null,
    allSettled: rows.every(r => r.settled),
  }
}

/**
 * Has this money actually arrived?
 *
 * `CUSTOMER_CLAIMED_PAID` is deliberately NOT settled. A claim is a sentence
 * somebody typed; direct UPI has no callback, so until a gateway signature or
 * a human bank check says otherwise it is unverified. If a claim unlocked the
 * work it funds, the lock would mean nothing — and the first customer who
 * discovered that would stop believing every other thing this tracker says.
 */
export function isSettled(payment) {
  return payment?.status === 'ADMIN_VERIFIED' || payment?.status === 'GATEWAY_VERIFIED'
}

function paymentStatusOf(payment) {
  if (!payment) return 'due'
  if (isSettled(payment)) return 'paid'
  if (payment.status === 'CUSTOMER_CLAIMED_PAID') return 'checking'
  if (payment.status === 'REFUNDED') return 'refunded'
  if (payment.status === 'CANCELLED') return 'cancelled'
  return 'due'
}

/* ── The sentence that has to stay true ───────────────────────────────────
 *
 * Under CGST §13(2) the time of supply for services is the earlier of invoice
 * or payment received, so GST is due on each advance. It is a PORTION OF THE
 * SAME TAX COLLECTED EARLIER — not an additional tax, and not a surcharge for
 * choosing instalments.
 *
 * Most people in this market assume the opposite, because instalments usually
 * do carry a charge. Saying plainly that ours do not is worth more than any
 * badge on the page — which is why `scripts/check-payment-schedule.mjs`
 * asserts that every plan produces the same total and the same total tax,
 * rather than leaving this as a comment somebody can quietly falsify.
 */
export const GST_NOTE = {
  headline: 'Splitting it costs you nothing extra.',
  body: 'Whichever plan you pick the total is the same, and so is the GST inside it — instalments just move part of it earlier. What changes is when the money leaves your account, and what each payment sets in motion.',
  estimated: `${TAX_LABEL} — confirmed on your final invoice.`,
}

/**
 * Documents this schedule obliges the business to issue.
 *
 * Stated here because nothing in the app generates either one yet, and a
 * staged plan without them is not compliant. A gap named in the config is a
 * gap somebody can find; a gap in nobody's head is one an accountant finds a
 * year later.
 */
export const REQUIRED_DOCUMENTS = {
  staged: [
    'A receipt voucher for every advance received (CGST Rule 50).',
    'A tax invoice at completion, adjusting the advances already taken (§31(3)(d)).',
  ],
  full: ['A tax invoice for the payment.'],
}

/* ── Cancelling a celebration ─────────────────────────────────────────────
 *
 * `config/policies.js` is entirely shop-order shaped — its `CANCELLATION`
 * ladder keys off `orders.status` and `refundBreakdown()` reads
 * `order.subtotal`. None of it can answer what happens to a ₹25,000 advance on
 * a celebration cancelled three weeks out, and taking that advance without an
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
 * Returns a verdict per instalment rather than one number, mirroring
 * `policies.refundBreakdown()`'s contract — the customer is owed the
 * reasoning, not just the total, and a coordinator has to be able to read it
 * out loud.
 */
export function refundForCancellation({ schedule, eventDate, now = new Date() }) {
  const daysOut = eventDate
    ? Math.floor((new Date(eventDate) - now) / 86400000)
    : null

  // Tiers run furthest-out first; the first one the customer is still ahead of
  // applies. With no date we cannot know how close we are, so the most
  // generous tier stands — the customer is not charged for our missing data.
  const tier = daysOut == null
    ? REFUND_TIERS[0]
    : REFUND_TIERS.find(t => daysOut >= t.daysBefore) ?? REFUND_TIERS[REFUND_TIERS.length - 1]

  const lines = (schedule?.rows ?? [])
    .filter(r => r.settled)
    .map(r => ({
      id: r.id,
      label: r.label,
      paid: r.amount ?? 0,
      refund: round((r.amount ?? 0) * tier.pct),
      pct: tier.pct,
      reason: tier.copy,
    }))

  // The hold is refundable in full until a plan is approved, and is credited
  // against the first instalment after that — so it is only refunded here
  // when it has not yet been absorbed.
  if (schedule?.hold?.settled && !schedule.rows.some(r => r.creditsHold && r.settled)) {
    lines.unshift({
      id: 'hold', label: 'Hold your date',
      paid: schedule.hold.amount, refund: schedule.hold.amount, pct: 1,
      reason: 'Refunded in full — you had not approved a plan yet.',
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
