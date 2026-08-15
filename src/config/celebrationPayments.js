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

export const SCHEDULE_VERSION = '2026-08-15'

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

/* ── The ladder ───────────────────────────────────────────────────────────
 *
 * 25 / 40 / 35, with everything collected before the day.
 *
 * This is the Indian vendor cash-flow curve made visible rather than a number
 * invented to look approachable. Banquet halls take 25–30% to hold a date,
 * caterers bill roughly half a week out and the balance on the day, decorators
 * commonly want 50% before they load a van. The customer's ladder is really
 * their vendors' ladder, which is why each rung can name what it releases.
 *
 * The ₹1,000 hold is CREDITED against the confirmation advance, never added to
 * it — see `creditsPaid`. `celebrationTiers.js:65-79` is emphatic that the hold
 * is not a deposit; it buys a coordinator who stops shopping the date. If it
 * ever starts behaving like a down payment, that comment and this ladder have
 * to change in the same commit.
 */
export const MILESTONES = [
  {
    id: 'hold',
    label: 'Hold your date',
    kind: 'flat',
    amount: LOCK_AMOUNT,
    trigger: { on: 'enquiry_sent' },
    paymentType: 'advance',
    adjustsAgainst: 'confirmation',
    plans: ['full', 'staged'],
    unlocks: ['date_hold'],
    refund: { tiers: [{ daysBefore: 0, pct: 1.00, copy: 'Refunded in full if you decide not to go ahead.' }] },
    customerCopy: 'Your coordinator stops offering your date to anyone else.',
  },

  /* ── The staged ladder ─────────────────────────────────────────────── */
  {
    id: 'confirmation',
    label: 'Confirmation advance',
    share: 0.25,
    trigger: { on: 'proposal_approved' },
    dueWithinHours: 48,
    paymentType: 'advance',
    creditsPaid: ['hold'],
    plans: ['staged'],
    unlocks: ['venue_hold', 'vendor_advances'],
    refund: { tiers: [
      { daysBefore: 21, pct: 1.00, copy: 'Full refund — nothing is committed to a vendor yet.' },
      { daysBefore: 7,  pct: 0.50, copy: 'Half back. The booking advances we placed with your vendors are not returned to us.' },
      { daysBefore: 0,  pct: 0.00, copy: 'Not refundable — every vendor for your date is booked and paid an advance.' },
    ] },
    customerCopy: 'This is what books your masters. Nothing is reserved until it lands.',
  },
  {
    id: 'sourcing',
    label: 'Masters locked',
    share: 0.40,
    trigger: { on: 'days_before_event', days: 7 },
    paymentType: 'partial',
    plans: ['staged'],
    unlocks: ['provisions', 'materials', 'staffing'],
    refund: { tiers: [
      { daysBefore: 7, pct: 1.00, copy: 'Full refund if we have not yet paid it forward.' },
      { daysBefore: 3, pct: 0.30, copy: 'Most vendors bill in full at this point.' },
      { daysBefore: 0, pct: 0.00, copy: 'Not refundable — provisions are bought and staff are rostered.' },
    ] },
    customerCopy: 'This buys the provisions and rosters the people for your day.',
  },
  {
    id: 'balance',
    label: 'Final balance',
    share: 0.35,
    trigger: { on: 'days_before_event', days: 2 },
    paymentType: 'full',
    plans: ['staged'],
    unlocks: ['setup', 'event_day'],
    refund: { tiers: [{ daysBefore: 0, pct: 0.00, copy: 'Not refundable at this point.' }] },
    customerCopy: 'Everything settled before the day, so nobody is chasing money at your celebration.',
  },

  /* ── The one-payment plan ──────────────────────────────────────────── */
  {
    id: 'settle',
    label: 'Pay in full',
    share: 1.00,
    trigger: { on: 'proposal_approved' },
    dueWithinHours: 48,
    paymentType: 'full',
    creditsPaid: ['hold'],
    plans: ['full'],
    unlocks: ['venue_hold', 'vendor_advances', 'provisions', 'materials', 'staffing', 'setup', 'event_day'],
    refund: { tiers: [
      { daysBefore: 21, pct: 1.00, copy: 'Full refund — nothing is committed to a vendor yet.' },
      { daysBefore: 7,  pct: 0.60, copy: 'Vendor booking advances are already placed and are not returned to us.' },
      { daysBefore: 3,  pct: 0.30, copy: 'Most vendors bill in full at this point.' },
      { daysBefore: 0,  pct: 0.00, copy: 'Not refundable — provisions are bought and staff are rostered.' },
    ] },
    customerCopy: 'One payment, everything released at once.',
  },
]

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map(m => [m.id, m]))

/* ── The two plans ────────────────────────────────────────────────────── */

export const PAYMENT_PLANS = {
  staged: {
    id: 'staged',
    label: 'Pay in stages',
    blurb: 'Four payments, spread across the run-up. Each one releases the next piece of work.',
    recommended: true,
  },
  full: {
    id: 'full',
    label: 'Pay in full',
    blurb: 'One payment on approval. Everything is released at once.',
    recommended: false,
  },
}

/** Above this, staged is the default — it is what the ladder exists for. */
export const STAGED_DEFAULT_ABOVE = 50000

export function defaultPlanFor(confirmedTotal) {
  return Number(confirmedTotal) > STAGED_DEFAULT_ABOVE ? 'staged' : 'full'
}

export function milestonesForPlan(plan) {
  return MILESTONES.filter(m => m.plans.includes(plan))
}

/* ── What the money unlocks ───────────────────────────────────────────────
 *
 * A percentage is an ask. "This releases your cooks and buys the provisions"
 * is a reason, and it is the difference between a customer paying blind and a
 * customer who knows what their money just started.
 *
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

/**
 * The lines one milestone releases, for one booking.
 *
 * @param milestone         a row from MILESTONES
 * @param bookedServiceIds  service ids on this celebration, from
 *                          `service_enquiries.services[].id` or `event_services`
 */
export function unlocksFor(milestone, bookedServiceIds = []) {
  const ids = new Set(bookedServiceIds)
  const count = ids.size

  return (milestone.unlocks ?? [])
    .map(key => {
      const rule = UNLOCK_RULES[key]
      if (!rule) return null
      const applies = rule.needs === '*' || rule.needs.some(n => ids.has(n))
      if (!applies) return null
      return { key, line: rule.line({ count }) }
    })
    .filter(Boolean)
}

/* ── Building a schedule ──────────────────────────────────────────────── */

const round = n => Math.round(n)

function dueDateFor(milestone, { eventDate, approvedAt }) {
  const t = milestone.trigger
  if (t.on === 'proposal_approved') {
    if (!approvedAt) return null
    return new Date(new Date(approvedAt).getTime() + (milestone.dueWithinHours ?? 48) * 3600000)
  }
  if (t.on === 'days_before_event') {
    if (!eventDate) return null
    return new Date(new Date(eventDate).getTime() - t.days * 86400000)
  }
  return null
}

/**
 * The ladder, priced, for one celebration.
 *
 * ── `basis` is the honesty switch ─────────────────────────────────────────
 * `'confirmed'` — a coordinator has priced this and the customer has a real
 *                 number. Rupee amounts are shown.
 * `'none'`      — no confirmed quote yet. Percentages only. The caller must
 *                 not fall back to the estimate range; see the file header.
 *
 * @param confirmedTotal  TAX-INCLUSIVE confirmed total. From
 *                        `event_proposals.total_amount` (APPROVED) or
 *                        `service_enquiries.quoted_price`. Never `quote.range`.
 * @param taxTotal        the GST inside that total, if known, so each rung can
 *                        show its share. Null hides the per-rung tax line
 *                        rather than guessing at it.
 * @param payments        rows from `event_payments`, matched on `milestone_id`
 */
export function buildSchedule({
  confirmedTotal = null,
  taxTotal = null,
  eventDate = null,
  approvedAt = null,
  plan = 'staged',
  payments = [],
  services = [],
  now = new Date(),
} = {}) {
  const chosen = PAYMENT_PLANS[plan] ? plan : 'staged'
  const rungs = milestonesForPlan(chosen)
  const priced = Number.isFinite(Number(confirmedTotal)) && Number(confirmedTotal) > 0

  const discount = priced && chosen === 'full'
    ? round(Number(confirmedTotal) * fullPaymentDiscountPct)
    : 0
  const totalPayable = priced ? Number(confirmedTotal) - discount : null

  // Shares are rounded, and the LAST share-based rung absorbs the remainder so
  // the ladder sums to the total exactly. Four rounded percentages of an odd
  // number do not otherwise add up, and a schedule that is ₹1 short of the
  // bill is the kind of thing a customer notices and nobody can explain.
  const shareRungs = rungs.filter(m => m.kind !== 'flat')
  const holdAmount = rungs.some(m => m.kind === 'flat') ? LOCK_AMOUNT : 0

  let allocated = 0
  const amounts = {}
  shareRungs.forEach((m, i) => {
    if (!priced) { amounts[m.id] = null; return }
    // Everything the hold already covered comes off the rung that credits it.
    const gross = i === shareRungs.length - 1
      ? totalPayable - allocated
      : round(totalPayable * m.share)
    allocated += gross
    const credit = (m.creditsPaid ?? []).includes('hold') ? holdAmount : 0
    amounts[m.id] = Math.max(0, gross - credit)
  })

  const paidBy = {}
  for (const p of payments) {
    if (p?.milestone_id) paidBy[p.milestone_id] = p
  }

  const rows = rungs.map(m => {
    const payment = paidBy[m.id] ?? null
    const amount = m.kind === 'flat' ? m.amount : amounts[m.id]
    const dueAt = dueDateFor(m, { eventDate, approvedAt })

    return {
      id: m.id,
      label: m.label,
      share: m.share ?? null,
      kind: m.kind ?? 'share',
      amount,
      // Pro-rated from the confirmed total's own tax, never recomputed. Each
      // rung carries its slice of the SAME tax — see `gstNote` below.
      gst: priced && taxTotal != null && m.kind !== 'flat'
        ? round(Number(taxTotal) * m.share)
        : null,
      dueAt,
      overdue: Boolean(dueAt && dueAt < now && !isSettled(payment)),
      customerCopy: m.customerCopy,
      unlocks: unlocksFor(m, services),
      refund: m.refund,
      creditsHold: (m.creditsPaid ?? []).includes('hold'),
      payment,
      status: paymentStatusOf(payment),
      // The gate. A CLAIM unlocks nothing — see `isSettled`.
      unlocked: isSettled(payment),
    }
  })

  const paidTotal = rows.reduce((sum, r) => sum + (isSettled(r.payment) ? (r.amount ?? 0) : 0), 0)

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
    rows,
    paidTotal: priced ? paidTotal : null,
    outstanding: priced ? Math.max(0, totalPayable - paidTotal) : null,
  }
}

/**
 * Has this milestone's money actually arrived?
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
 * asserts that both plans produce the same total and the same total tax,
 * rather than leaving this as a comment somebody can quietly falsify.
 */
export const GST_NOTE = {
  headline: 'Paying in stages costs you nothing extra.',
  body: 'The total is the same, and so is the GST inside it — instalments just move part of it earlier. What changes is when the money leaves your account, and what each payment sets in motion.',
  // Carried through from data/taxes.js, which says it louder: the rate mix
  // depends on registration, principal-vs-agent treatment and ITC, none of
  // which is settled. Every figure derived here inherits that caveat.
  estimated: `${TAX_LABEL} — confirmed on your final invoice.`,
}

/**
 * Documents this schedule obliges the business to issue.
 *
 * Stated here because nothing in the app generates either one yet, and a
 * staged plan without them is not compliant. A gap named in the config is a
 * gap somebody can find; a gap in nobody's head is one discovered by an
 * accountant a year later.
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
 *
 * This lives here rather than in policies.js because it is a function OF the
 * ladder above: the refund tiers are per-milestone, so splitting them from the
 * milestones would be two files that have to agree.
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
 * Returns a verdict per milestone rather than one number, mirroring
 * `policies.refundBreakdown()`'s contract — the customer is owed the reasoning,
 * not just the total, and a coordinator has to be able to read it out loud.
 */
export function refundForCancellation({ schedule, eventDate, now = new Date() }) {
  const daysOut = eventDate
    ? Math.floor((new Date(eventDate) - now) / 86400000)
    : null

  const lines = (schedule?.rows ?? [])
    .filter(r => isSettled(r.payment))
    .map(r => {
      // Tiers are ordered furthest-out first; the first one the customer is
      // still ahead of is the one that applies. With no date we cannot know
      // how close we are, so the most generous tier stands — the customer is
      // not charged for our missing data.
      const tiers = r.refund?.tiers ?? []
      const tier = daysOut == null
        ? tiers[0]
        : tiers.find(t => daysOut >= t.daysBefore) ?? tiers[tiers.length - 1]
      const pct = tier?.pct ?? 0
      return {
        id: r.id,
        label: r.label,
        paid: r.amount ?? 0,
        refund: round((r.amount ?? 0) * pct),
        pct,
        reason: tier?.copy ?? null,
      }
    })

  return {
    daysOut,
    lines,
    total: lines.reduce((sum, l) => sum + l.refund, 0),
    paid: lines.reduce((sum, l) => sum + l.paid, 0),
    version: SCHEDULE_VERSION,
  }
}
