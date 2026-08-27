/**
 * The cancellation, return and refund policy — written once, shown everywhere.
 *
 * ── Why this is a config file and not copy in a component ────────────────
 * A returns policy that lives in JSX is a returns policy that says one thing
 * on the order page, a different thing in the return dialog, and nothing at
 * all on the admin screen where the decision is actually made. That was the
 * state before this file: the customer picked from five hard-coded reason
 * strings in MyOrders.jsx, agreed to nothing, and an admin saw "Damaged" with
 * no idea what window it fell in or what had been promised.
 *
 * So the rules are data. The customer sees them before agreeing, the agreement
 * is recorded with a VERSION, and the admin screen evaluates the same rules to
 * say "this is inside the window" or "this is a perishable, day-of only".
 *
 * ── Versioning is the point ──────────────────────────────────────────────
 * `POLICY_VERSION` is stored on every return request
 * (`return_requests.policy_version`, migration 039). Without it, editing this
 * file silently rewrites what every past customer agreed to — which is both
 * useless in a dispute and the kind of thing that is not allowed to be
 * accidental. Bump it whenever a RULE changes; leave it alone for a typo.
 *
 * ── These are pre-launch terms ───────────────────────────────────────────
 * Sambramo has no signed supplier (see PROJECT_SUMMARY). The windows below are
 * deliberately generous and deliberately simple, because the alternative — a
 * tight policy nobody has the operational capacity to enforce — is worse than
 * a generous one that is honoured. Re-check these against real vendor terms
 * before anyone is held to them.
 */

// Bumped for the Heritage & Crafts rule below (migration 048) — a new category
// window and a new condition are rule changes, which is exactly what this
// field exists to date-stamp. Past return requests keep '2026-08-13', so what
// each customer actually agreed to stays recoverable.
export const POLICY_VERSION = '2026-08-17'

/* ── Categories behave differently, and pretending otherwise is the bug ── */

/**
 * A cake is not a photo frame.
 *
 * `windowHours` is measured from DELIVERY. Perishables get same-day only,
 * because a return window on a fresh cream cake is a promise about a thing
 * that no longer exists. Everything else gets a real window.
 *
 * `condition` is what has to be true for the return to be accepted, and it is
 * shown to the customer BEFORE they file — not produced afterwards as a reason
 * to refuse.
 */
export const CATEGORY_RULES = {
  'Cakes': {
    windowHours: 24,
    perishable: true,
    condition: 'Report on the day of delivery, with a photograph. We cannot take a cake back, so a quality problem is refunded or remade rather than returned.',
    label: 'Same day, with a photo',
  },
  'Flowers': {
    windowHours: 24,
    perishable: true,
    condition: 'Report on the day of delivery, with a photograph. Fresh flowers are not collected back.',
    label: 'Same day, with a photo',
  },
  'Pooja & Essentials': {
    windowHours: 48,
    perishable: false,
    condition: 'Unused and in its original packaging. Consumables (oil, camphor, kumkum) can only be returned unopened.',
    label: '2 days, unopened',
  },
  'Party Essentials': {
    windowHours: 72,
    perishable: false,
    condition: 'Unused and in its original packaging. Inflated balloons and opened party kits cannot be returned.',
    label: '3 days, unused',
  },
  'Gifts': {
    windowHours: 168,
    perishable: false,
    condition: 'Unused, with tags and original packaging. Personalised or engraved items can only be returned if they arrived damaged or wrong.',
    label: '7 days, unused',
  },
  /**
   * Heritage & Crafts (migration 048) gets its own rule rather than falling to
   * DEFAULT_RULE, and the window is the longest in the shop for two reasons
   * that are both about how handloom is actually bought.
   *
   * Handloom is bought by eye. Two sarees off the same loom differ, and every
   * listing carries a "Representative image" badge saying so — which means the
   * first time a customer sees the piece they are buying is when it is in their
   * hands. A three-day window on a ₹28,000 saree somebody is deciding about
   * with their family is a policy designed to expire before the decision.
   *
   * And a commission cannot come back at all. It was woven, carved or cast for
   * one buyer to one specification, so there is no second customer for it — the
   * condition says that in the same breath as the window, rather than letting
   * somebody discover it after paying a 12-week deposit.
   */
  'Heritage & Crafts': {
    windowHours: 240,
    perishable: false,
    condition:
      'Unused, with tags, and the fall unstitched. Handloom varies piece to piece and a slub or a small irregularity in the weave is the weave, not a defect — but if it is not what was described, it goes back. Commissioned pieces cannot be returned unless they arrive damaged or differ from the approved drawing.',
    label: '10 days, unused',
  },
}

/** Anything not listed above. Never crash on a category we have not met yet. */
export const DEFAULT_RULE = {
  windowHours: 72,
  perishable: false,
  condition: 'Unused and in its original packaging.',
  label: '3 days, unused',
}

export function ruleForCategory(category) {
  return CATEGORY_RULES[category] ?? DEFAULT_RULE
}

/* ── Cancellation ──────────────────────────────────────────────────────── */

/**
 * Free until it is being made. After that, somebody has bought flour.
 *
 * These mirror `enforce_order_self_update()` (migration 013), which is what
 * actually enforces it: a customer's own UPDATE may only take an order from
 * `placed` or `processing` to `cancelled`. The wording here has to keep
 * matching that trigger — if the two disagree, the page offers a button that
 * the database refuses, which is the worst of both.
 */
export const CANCELLATION = {
  freeUntil: ['placed'],
  chargeableAt: ['processing'],
  blockedAt: ['dispatched', 'delivered'],
  summary: 'Cancel free of charge until we start preparing your order.',
  lines: [
    'Before we start preparing it — cancel yourself, refunded in full.',
    'While it is being prepared — cancel yourself; if a partner has already begun, we may keep the cost of materials and will tell you the exact amount before we refund.',
    'Once it is out for delivery — it can no longer be cancelled. Refuse it at the door or raise a return instead.',
  ],
}

export function cancellationState(orderStatus) {
  if (CANCELLATION.freeUntil.includes(orderStatus))    return { allowed: true,  free: true }
  if (CANCELLATION.chargeableAt.includes(orderStatus)) return { allowed: true,  free: false }
  return { allowed: false, free: false }
}

/* ── Return reasons ────────────────────────────────────────────────────── */

/**
 * More than one can be true at once, which is why the customer picks a SET.
 *
 * "Damaged AND late" is an ordinary complaint and the old single-select forced
 * it into one bucket, which is how a delivery problem gets filed as a product
 * problem and nobody ever finds the pattern.
 *
 * `fault` marks whose problem it is. It is not shown to the customer — it
 * drives the admin's default refund decision (ours ⇒ refund in full including
 * delivery; theirs ⇒ refund the goods only) and the analytics that separate
 * "our packaging is bad" from "they changed their mind".
 */
export const RETURN_REASONS = [
  { id: 'damaged',    label: 'Arrived damaged',            fault: 'ours',  evidence: true,  refundDelivery: true },
  { id: 'wrong_item', label: 'Wrong item sent',            fault: 'ours',  evidence: true,  refundDelivery: true },
  { id: 'not_as_described', label: 'Not what was shown',   fault: 'ours',  evidence: true,  refundDelivery: true },
  { id: 'quality',    label: 'Quality was poor',           fault: 'ours',  evidence: true,  refundDelivery: true },
  { id: 'late',       label: 'Arrived too late to use',    fault: 'ours',  evidence: false, refundDelivery: true },
  { id: 'incomplete', label: 'Something was missing',      fault: 'ours',  evidence: true,  refundDelivery: true },
  { id: 'changed_mind', label: 'No longer needed',         fault: 'theirs', evidence: false, refundDelivery: false },
  { id: 'ordered_wrong', label: 'I ordered the wrong thing', fault: 'theirs', evidence: false, refundDelivery: false },
  { id: 'other',      label: 'Something else',             fault: 'unknown', evidence: false, refundDelivery: false },
]

export const REASON_BY_ID = Object.fromEntries(RETURN_REASONS.map(r => [r.id, r]))

/** Reasons where a photograph makes the decision instantly, rather than after three messages. */
export function needsEvidence(reasonIds = []) {
  return reasonIds.some(id => REASON_BY_ID[id]?.evidence)
}

/** Whose fault the set of reasons points at. Any "ours" wins — we do not argue the customer down. */
export function faultOf(reasonIds = []) {
  if (reasonIds.some(id => REASON_BY_ID[id]?.fault === 'ours')) return 'ours'
  if (reasonIds.every(id => REASON_BY_ID[id]?.fault === 'theirs')) return 'theirs'
  return 'unknown'
}

/* ── Refunds ───────────────────────────────────────────────────────────── */

/**
 * How the money goes back, and how long that honestly takes.
 *
 * `original` is listed but marked unavailable: payments arrive by direct UPI
 * deep link with no gateway (PROJECT_SUMMARY § Payments), so there is no
 * transaction to reverse. Saying "refunded to your original payment method" —
 * the sentence every checkout says by reflex — would be a lie here. The money
 * goes back as a fresh UPI transfer, by hand, and the customer is told that.
 */
export const REFUND_METHODS = [
  { id: 'upi',          label: 'UPI transfer',      available: true,  eta: '2–3 working days', note: 'Sent to the UPI ID or number the customer gives us.' },
  { id: 'bank',         label: 'Bank transfer',     available: true,  eta: '3–5 working days', note: 'For anyone without UPI. Needs account number and IFSC.' },
  { id: 'store_credit', label: 'Sambramo credit',   available: true,  eta: 'Immediate',        note: 'A coupon for the full amount, no expiry. Only if the customer chooses it.' },
  { id: 'original',     label: 'Original payment',  available: false, eta: '—',                note: 'Not possible: UPI deep links have no gateway to reverse.' },
]

export const REFUND_METHOD_BY_ID = Object.fromEntries(REFUND_METHODS.map(m => [m.id, m]))

/**
 * What we owe back.
 *
 * The delivery fee is refunded when the fault is ours and kept when it is not
 * — the courier was paid either way, and the customer who changed their mind
 * is the one who caused that. Stated in the terms rather than discovered at
 * refund time.
 */
export function refundBreakdown(order, reasonIds = []) {
  const goods = Number(order?.subtotal ?? 0)
  const delivery = Number(order?.delivery_fee ?? 0)
  const discount = Number(order?.discount ?? 0)
  const fault = faultOf(reasonIds)
  const refundDelivery = fault === 'ours'
  // The discount came off the goods, so it comes off the refund too —
  // otherwise a coupon turns a return into a small profit.
  const goodsRefund = Math.max(0, goods - discount)
  return {
    goods: goodsRefund,
    delivery: refundDelivery ? delivery : 0,
    deliveryWithheld: refundDelivery ? 0 : delivery,
    total: goodsRefund + (refundDelivery ? delivery : 0),
    fault,
    reason: refundDelivery
      ? 'Delivery is refunded too, because the problem was ours.'
      : 'The delivery fee is not refunded — the courier was paid to make the trip.',
  }
}

/* ── Eligibility ───────────────────────────────────────────────────────── */

/**
 * Can this order be returned right now, and if not, why?
 *
 * Returns a verdict rather than a boolean so both surfaces can use it: the
 * customer page to explain, the admin screen to show whether an accepted
 * return was inside policy or a goodwill exception. Goodwill exceptions are
 * fine — but they should be visibly exceptions.
 */
export function returnEligibility(order, now = new Date()) {
  if (!order) return { eligible: false, code: 'no_order', message: 'Order not found.' }

  if (order.status === 'cancelled') {
    return { eligible: false, code: 'cancelled', message: 'This order was cancelled, so there is nothing to return.' }
  }
  if (order.status !== 'delivered') {
    return {
      eligible: false, code: 'not_delivered',
      message: 'A return can be raised once the order has been delivered. Before that, cancel it instead.',
    }
  }

  // The window runs from delivery. `delivered_at` does not exist as a column;
  // the delivery event in `order_events` is the real answer and is passed in
  // when available, falling back to updated_at.
  const deliveredAt = new Date(order.delivered_at ?? order.updated_at ?? order.created_at)
  const hoursSince = (now - deliveredAt) / 3600000

  // The window is the LONGEST of the categories in the basket. A mixed order
  // of a cake and a photo frame gets the frame's seven days for the frame —
  // refusing the whole order at 24 hours because a cake was in it would be
  // policy by accident.
  const categories = [...new Set((order.order_items ?? []).map(i => i.category).filter(Boolean))]
  const rules = categories.length ? categories.map(ruleForCategory) : [DEFAULT_RULE]
  const windowHours = Math.max(...rules.map(r => r.windowHours))

  if (hoursSince > windowHours) {
    return {
      eligible: false, code: 'window_closed', windowHours, hoursSince,
      message: `The return window for this order closed ${describeWindow(windowHours)} after delivery. Message us anyway — if something is genuinely wrong we will look at it.`,
    }
  }

  return {
    eligible: true,
    windowHours,
    hoursSince,
    hoursLeft: Math.max(0, Math.round(windowHours - hoursSince)),
    rules: categories.map(c => ({ category: c, ...ruleForCategory(c) })),
    message: `You have ${describeWindow(Math.max(0, windowHours - hoursSince))} left to raise a return on this order.`,
  }
}

export function describeWindow(hours) {
  const h = Math.round(hours)
  if (h < 1) return 'less than an hour'
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'}`
}

/* ── The terms themselves ──────────────────────────────────────────────── */

/**
 * What the customer ticks. Short enough to actually be read, which is the
 * only version of terms that means anything — six screens of legalese behind
 * a checkbox is consent in form and not in fact.
 */
export const RETURN_TERMS = {
  version: POLICY_VERSION,
  heading: 'Before you raise a return',
  points: [
    'Tell us everything that went wrong — you can tick more than one reason, and it helps us find the pattern.',
    'For anything damaged, wrong or poor quality, a photograph gets it settled the same day. Without one we may have to ask.',
    'Perishables (cakes, flowers) are not collected back. If there is a problem we refund or remake — we do not ask you to return a cake.',
    'Anything else should be unused and in its original packaging.',
    'If the problem was ours, you get the delivery fee back too. If you simply changed your mind, you do not — the courier still made the trip.',
    'Refunds go out as a fresh UPI or bank transfer within 2–5 working days of us approving the return. We cannot reverse the original payment, because a UPI deep link has no gateway behind it.',
    'We will tell you the exact amount before we send it.',
  ],
  confirm: 'I have read the return terms and everything above is accurate.',
}

export const CANCELLATION_TERMS = {
  version: POLICY_VERSION,
  heading: 'Cancelling this order',
  points: CANCELLATION.lines,
  confirm: 'I understand and want to cancel this order.',
}

/* ══════════════════════════════════════════════════════════════════════
   INSTANT BOOKINGS CANCEL DIFFERENTLY, BECAUSE A PERSON IS WAITING
   ══════════════════════════════════════════════════════════════════════

   Everything above is about a PARCEL. Cancelling one costs us packing
   materials and a courier trip, which is why the ladder there is about
   how far along the box is.

   An instant booking is a PERSON who cleared a day. A decorator who
   accepted your Saturday turned down other work for it, and at twelve
   hours' notice they cannot fill it again. The cost of a late
   cancellation is not materials — it is that partner's entire trading
   day, and it lands on them, not on us.

   So the money follows the harm: the deduction goes TO THE PARTNER, not
   to Sambramo. A platform that kept a cancellation fee would be charging
   a customer for the privilege of wasting somebody's Saturday and then
   pocketing it. `escrow_ledger.PENALTY_PARTNER` (migration 062) is a
   separate movement kind from `RELEASE_PLATFORM` precisely so the two can
   never be quietly conflated in a report.

   ── Why it tightens rather than staying at 10% ───────────────────────
   10% is the right number the day after booking and an insult twelve
   hours out. The partner's loss is not linear in time — it is close to
   zero while they can still refill the day, and total once they cannot.
   A flat rate has to pick one, and whichever it picks is wrong for the
   other end. This is standard banquet and events trade practice in India
   and is what a partner will recognise as fair.

   ── Free until somebody accepts ──────────────────────────────────────
   The first rung is 100% back, and it matters more than it looks: it is
   what makes "book instantly" safe to tap. Before a partner accepts,
   nobody has cleared anything and there is no harm to compensate.
*/
export const CANCELLATION_LADDER = {
  version: POLICY_VERSION,

  /**
   * Ordered most-generous first; the first rung whose condition holds
   * wins. `hoursBefore: null` means "regardless of the date" — it is the
   * pre-acceptance rung, and it is about state, not time.
   */
  rungs: [
    {
      id: 'before_accept',
      hoursBefore: null,
      requiresAccepted: false,
      refundPct: 100,
      partnerPct: 0,
      scan: 'Full refund',
      why: 'No master has accepted yet, so nobody has cleared their day.',
    },
    {
      id: 'over_48h',
      hoursBefore: 48,
      requiresAccepted: true,
      refundPct: 90,
      partnerPct: 10,
      scan: '10% goes to your master',
      why: 'They can still fill the day, but they turned work down for you.',
    },
    {
      id: 'within_48h',
      hoursBefore: 12,
      requiresAccepted: true,
      refundPct: 75,
      partnerPct: 25,
      scan: '25% goes to your master',
      why: 'Two days out, most of the good work for that day is already taken.',
    },
    {
      id: 'within_12h',
      hoursBefore: 0,
      requiresAccepted: true,
      refundPct: 50,
      partnerPct: 50,
      scan: 'Half goes to your master',
      why: 'They have almost certainly bought materials and cannot refill the day.',
    },
    {
      id: 'after_start',
      hoursBefore: -1,
      requiresAccepted: true,
      refundPct: 0,
      partnerPct: 100,
      scan: 'No refund',
      why: 'The day has started. If something went wrong, raise an issue instead.',
    },
  ],
}

/**
 * Which rung applies, for ONE line.
 *
 * Per line and never per booking: dropping the dhol troupe you never
 * really wanted must not be scored against the decorator you booked a
 * week earlier. Each line carries its own `accepted_at` and its own
 * `policy_version` (migration 059) for exactly this.
 */
export function instantCancellationRung({ eventDate, accepted, now = new Date() }) {
  const ladder = CANCELLATION_LADDER.rungs

  if (!accepted) return ladder.find(r => r.id === 'before_accept')

  const when = eventDate instanceof Date ? eventDate : new Date(eventDate)
  if (Number.isNaN(when.getTime())) {
    // An unparseable date must not silently become "no refund". Fall to
    // the most generous accepted rung and let a human look at it.
    return ladder.find(r => r.id === 'over_48h')
  }

  const hoursOut = (when.getTime() - now.getTime()) / 3_600_000
  if (hoursOut < 0) return ladder.find(r => r.id === 'after_start')

  return (
    ladder.find(r => r.requiresAccepted && r.hoursBefore >= 0 && hoursOut >= r.hoursBefore)
    ?? ladder.find(r => r.id === 'within_12h')
  )
}
