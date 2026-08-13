import { returnEligibility, refundBreakdown, REASON_BY_ID } from '../config/policies'

/**
 * The whole life of one order, as a thing you can render.
 *
 * ── The problem ──────────────────────────────────────────────────────────
 * "Complete order lifecycle" was, until migration 039, four words the schema
 * could not support. `orders` carried a `status` and an `updated_at`, so the
 * only two facts available were where an order is now and when it last moved.
 * Everything a person actually wants to know — when it was dispatched, how
 * long it sat in preparation, who confirmed the payment, whether it went
 * through the stages or was jumped straight to delivered — was unrecorded and
 * unrecoverable.
 *
 * `order_events` records every transition. This module turns those rows into
 * a journey: the stages, which have happened, when, how long each took, who
 * did it, and what is supposed to happen next.
 *
 * ── It has to work before the migration is applied ───────────────────────
 * Migrations here run by hand and a deploy does not run them, so `events` may
 * be an empty array on a database that has not caught up. In that case the
 * journey is INFERRED from the order's own columns and every inferred step is
 * flagged `inferred: true`, which the UI renders differently. A reconstructed
 * timeline shown as a recorded one is worse than no timeline at all.
 *
 * ── Three tracks, not one ────────────────────────────────────────────────
 * An order has a fulfilment track (placed → delivered), a payment track
 * (pending → paid), and sometimes an after-sale track (return → refund). They
 * run in parallel and interleaving them into one list is what makes most order
 * timelines unreadable. They are built separately and merged only for the
 * chronological "everything that happened" view.
 */

/* ── The fulfilment stages ─────────────────────────────────────────────── */

export const FULFILMENT_STAGES = [
  {
    id: 'placed',
    label: 'Order placed',
    admin: 'The customer has committed. Nothing has been sourced yet.',
    customer: 'We have your order.',
    next: 'Confirm the payment, then start preparing it.',
    targetHours: 12,
    emoji: '🧾',
  },
  {
    id: 'processing',
    label: 'Being prepared',
    admin: 'With the partner kitchen or supplier.',
    customer: 'Your order is being made.',
    next: 'Hand it to the delivery partner and mark it out for delivery.',
    targetHours: 24,
    emoji: '👩‍🍳',
  },
  {
    id: 'dispatched',
    label: 'Out for delivery',
    admin: 'With the courier. This is where the customer starts asking.',
    customer: 'On its way to you.',
    next: 'Confirm it reached the customer.',
    targetHours: 24,
    emoji: '🛵',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    admin: 'Done. The return window starts now.',
    customer: 'Delivered. Hope it landed well.',
    next: null,
    targetHours: null,
    emoji: '🎉',
  },
]

export const STAGE_BY_ID = Object.fromEntries(FULFILMENT_STAGES.map(s => [s.id, s]))
export const STAGE_ORDER = FULFILMENT_STAGES.map(s => s.id)

/**
 * `cancelled` is deliberately not in the list above. It is not a fifth stage —
 * it is an exit that can happen from two of the four, and modelling it as a
 * stage produces a funnel where cancelled orders appear to have progressed
 * further than live ones.
 */
export const TERMINAL = {
  cancelled: { id: 'cancelled', label: 'Cancelled', emoji: '🚫', customer: 'This order was cancelled.' },
}

/* ── The payment track ─────────────────────────────────────────────────── */

export const PAYMENT_STATES = {
  pending:  { label: 'Awaiting confirmation', emoji: '⏳', tone: 'warning',
              admin: 'The customer says they sent it. Nothing tells us it arrived — direct UPI has no callback, so somebody has to look at the bank.' },
  paid:     { label: 'Payment confirmed',     emoji: '✅', tone: 'good',
              admin: 'Checked against the bank and ticked off by hand.' },
  failed:   { label: 'Payment failed',        emoji: '❌', tone: 'critical',
              admin: 'Never arrived.' },
  refunded: { label: 'Refunded',              emoji: '↩️', tone: 'serious',
              admin: 'Money sent back to the customer.' },
}

/* ── The after-sale track ──────────────────────────────────────────────── */

export const RETURN_STATES = {
  requested:      { label: 'Return requested', emoji: '📮', tone: 'warning',  next: 'Approve it or reject it with a reason.' },
  approved:       { label: 'Return approved',  emoji: '👍', tone: 'good',     next: 'Send the money and record the reference.' },
  rejected:       { label: 'Return rejected',  emoji: '🚫', tone: 'critical', next: null },
  refund_pending: { label: 'Refund sent',      emoji: '💸', tone: 'warning',  next: 'Confirm the customer received it.' },
  refunded:       { label: 'Refund complete',  emoji: '✅', tone: 'good',     next: null },
}

/* ── Building the journey ──────────────────────────────────────────────── */

/**
 * @param order    a row from `orders`, with `order_items` nested
 * @param events   rows from `order_events` for this order (may be empty)
 * @param returns  rows from `return_requests` for this order (may be empty)
 */
export function buildJourney(order, events = [], returns = [], now = new Date()) {
  if (!order) return null

  const mine = events
    .filter(e => e.order_id === order.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const statusEvents  = mine.filter(e => e.kind === 'status')
  const paymentEvents = mine.filter(e => e.kind === 'payment')
  const hasLog = mine.length > 0

  const cancelled = order.status === 'cancelled'
  const reachedIndex = cancelled ? -1 : STAGE_ORDER.indexOf(order.status)

  /* ── Fulfilment ─────────────────────────────────────────────────── */
  const stages = FULFILMENT_STAGES.map((stage, i) => {
    const evt = statusEvents.find(e => e.to_value === stage.id)
    const reached = evt ? true : (!cancelled && i <= reachedIndex)

    // With no log, only two timestamps are knowable: the order was placed at
    // created_at, and it arrived at its CURRENT stage at updated_at. Anything
    // in between is a guess and is left blank rather than invented.
    let at = evt?.created_at ?? null
    let inferred = false
    if (!at && reached) {
      if (stage.id === 'placed') { at = order.created_at; inferred = hasLog ? false : true }
      else if (i === reachedIndex) { at = order.updated_at; inferred = true }
      else { inferred = true }
    }

    return {
      ...stage,
      reached,
      current: !cancelled && stage.id === order.status,
      at,
      inferred: reached ? (inferred || Boolean(evt?.note?.startsWith('Reconstructed'))) : false,
      actorRole: evt?.actor_role ?? null,
      note: evt?.note && !evt.note.startsWith('Reconstructed') ? evt.note : null,
    }
  })

  // How long each completed stage actually took. Only computable between two
  // recorded timestamps — a gap with an inferred end is not a duration.
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i], to = stages[i + 1]
    if (from.at && to.at && !from.inferred && !to.inferred) {
      from.durationHours = Math.max(0, (new Date(to.at) - new Date(from.at)) / 3600000)
    }
  }

  const currentStage = stages.find(s => s.current) ?? null
  // Clamped at zero: a timestamp ahead of `now` (clock skew, or a backfilled
  // row written after the fact) would otherwise produce a negative age, which
  // renders as nonsense and also makes `overdue` silently false.
  const ageInStage = Math.max(0, currentStage?.at
    ? (now - new Date(currentStage.at)) / 3600000
    : (now - new Date(order.updated_at ?? order.created_at)) / 3600000)
  const overdue = Boolean(
    currentStage?.targetHours && ageInStage > currentStage.targetHours,
  )

  /* ── Payment ────────────────────────────────────────────────────── */
  const paidEvent = paymentEvents.find(e => e.to_value === 'paid')
  const payment = {
    status: order.payment_status,
    ...(PAYMENT_STATES[order.payment_status] ?? { label: order.payment_status, emoji: '•', tone: 'warning' }),
    at: paidEvent?.created_at ?? null,
    inferred: !paidEvent && order.payment_status !== 'pending',
    // Hours the money has been unconfirmed. This is the number that decides
    // whether to chase, and it was not available anywhere before.
    waitingHours: order.payment_status === 'pending'
      ? (now - new Date(order.created_at)) / 3600000
      : null,
    actorRole: paidEvent?.actor_role ?? null,
  }

  /* ── After-sale ─────────────────────────────────────────────────── */
  const myReturns = returns
    .filter(r => r.order_id === order.id)
    .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
  const activeReturn = myReturns[0] ?? null

  const deliveredAt = stages.find(s => s.id === 'delivered')?.at ?? null
  const eligibility = returnEligibility({ ...order, delivered_at: deliveredAt }, now)

  /* ── Everything, in order ───────────────────────────────────────── */
  const timeline = buildTimeline({ order, stages, paymentEvents, myReturns, cancelled })

  return {
    order,
    stages,
    currentStage,
    cancelled,
    cancelledAt: cancelled ? (statusEvents.find(e => e.to_value === 'cancelled')?.created_at ?? order.cancelled_at) : null,
    cancellationReason: order.cancellation_reason ?? null,
    ageInStage,
    overdue,
    payment,
    returns: myReturns,
    activeReturn,
    eligibility,
    deliveredAt,
    timeline,
    // False when the log is missing entirely — the UI says so once, at the
    // top, instead of putting a caveat on every row.
    recorded: hasLog,
    // What the operator should do next, in one sentence. Payment first: an
    // unpaid order that is already out for delivery is the expensive mistake.
    nextAction: nextAction({ order, currentStage, payment, activeReturn }),
  }
}

function buildTimeline({ order, stages, paymentEvents, myReturns, cancelled }) {
  const rows = []

  for (const s of stages) {
    if (!s.reached || !s.at) continue
    rows.push({
      id: `stage:${s.id}`, track: 'fulfilment', at: s.at, emoji: s.emoji,
      title: s.label, detail: s.note, inferred: s.inferred, actorRole: s.actorRole,
    })
  }

  if (cancelled) {
    rows.push({
      id: 'stage:cancelled', track: 'fulfilment',
      at: order.cancelled_at ?? order.updated_at, emoji: TERMINAL.cancelled.emoji,
      title: TERMINAL.cancelled.label, detail: order.cancellation_reason, inferred: !order.cancelled_at,
    })
  }

  for (const e of paymentEvents) {
    const meta = PAYMENT_STATES[e.to_value] ?? { label: e.to_value, emoji: '•' }
    rows.push({
      id: `pay:${e.id}`, track: 'payment', at: e.created_at, emoji: meta.emoji,
      title: meta.label, actorRole: e.actor_role,
      inferred: Boolean(e.note?.startsWith('Reconstructed')),
    })
  }

  for (const r of myReturns) {
    rows.push({
      id: `ret:${r.id}`, track: 'return', at: r.requested_at, emoji: '📮',
      title: 'Return requested',
      detail: describeReasons(r),
    })
    if (r.refund_initiated_at) {
      rows.push({
        id: `ref:${r.id}`, track: 'return', at: r.refund_initiated_at, emoji: '💸',
        title: 'Refund sent',
        detail: [r.refund_amount ? `₹${r.refund_amount}` : null, r.refund_ref].filter(Boolean).join(' · '),
      })
    }
    if (r.refund_completed_at) {
      rows.push({
        id: `refdone:${r.id}`, track: 'return', at: r.refund_completed_at, emoji: '✅',
        title: 'Refund confirmed received',
      })
    } else if (r.resolved_at && r.status === 'rejected') {
      rows.push({
        id: `refrej:${r.id}`, track: 'return', at: r.resolved_at, emoji: '🚫',
        title: 'Return rejected', detail: r.admin_notes,
      })
    }
  }

  return rows.filter(r => r.at).sort((a, b) => new Date(a.at) - new Date(b.at))
}

function nextAction({ order, currentStage, payment, activeReturn }) {
  if (activeReturn && activeReturn.status === 'requested') {
    return { urgency: 'high', text: 'A return is waiting on your decision.' }
  }
  if (activeReturn && activeReturn.status === 'approved') {
    return { urgency: 'high', text: 'Return approved — send the refund and record the reference.' }
  }
  if (activeReturn && activeReturn.status === 'refund_pending') {
    return { urgency: 'normal', text: 'Refund sent. Confirm the customer received it.' }
  }
  if (order.status === 'cancelled') {
    return { urgency: 'none', text: order.payment_status === 'paid' ? 'Cancelled after payment — a refund is owed.' : 'Cancelled. Nothing to do.' }
  }
  if (payment.status === 'pending') {
    // Deliberately ranked above the fulfilment step: sending goods out
    // against an unconfirmed payment is how a shop gives stock away.
    return {
      urgency: order.status === 'placed' ? 'high' : 'critical',
      text: order.status === 'placed'
        ? 'Check the bank and confirm this payment.'
        : `This is already ${STAGE_BY_ID[order.status]?.label.toLowerCase()} and the payment is still unconfirmed.`,
    }
  }
  if (currentStage?.next) return { urgency: 'normal', text: currentStage.next }
  return { urgency: 'none', text: 'Nothing outstanding.' }
}

/** Human-readable reason list from a return row, old shape or new. */
export function describeReasons(r) {
  const ids = r?.reasons?.length ? r.reasons : null
  if (ids) return ids.map(id => REASON_BY_ID[id]?.label ?? id).join(' · ')
  return r?.reason ?? '—'
}

/** What we owe on this return, using the policy rules. */
export function returnRefund(order, returnRow) {
  return refundBreakdown(order, returnRow?.reasons ?? [])
}

/* ── Aggregates over many orders ───────────────────────────────────────── */

/**
 * Median hours spent in each stage, across every order that has passed
 * through it with two RECORDED timestamps.
 *
 * Median rather than mean: one order that sat over a festival weekend would
 * drag a mean into uselessness. Inferred durations are excluded entirely —
 * an average built partly from guesses is a guess with a decimal point.
 */
export function stageDurations(orders = [], events = []) {
  const byOrder = new Map()
  for (const e of events) {
    if (e.kind !== 'status') continue
    if (!byOrder.has(e.order_id)) byOrder.set(e.order_id, [])
    byOrder.get(e.order_id).push(e)
  }

  const buckets = Object.fromEntries(STAGE_ORDER.map(id => [id, []]))

  for (const o of orders) {
    const list = (byOrder.get(o.id) ?? [])
      .filter(e => !e.note?.startsWith('Reconstructed'))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    for (let i = 0; i < list.length - 1; i++) {
      const from = list[i].to_value
      if (!buckets[from]) continue
      const hours = (new Date(list[i + 1].created_at) - new Date(list[i].created_at)) / 3600000
      if (hours >= 0) buckets[from].push(hours)
    }
  }

  return FULFILMENT_STAGES.filter(s => s.id !== 'delivered').map(s => {
    const v = buckets[s.id].sort((a, b) => a - b)
    return {
      id: s.id,
      label: s.label,
      samples: v.length,
      medianHours: v.length ? v[Math.floor(v.length / 2)] : null,
      targetHours: s.targetHours,
      overTarget: v.length ? v[Math.floor(v.length / 2)] > s.targetHours : false,
    }
  })
}

export function formatDuration(hours) {
  if (hours == null || !Number.isFinite(hours)) return '—'
  // A negative duration is always a data problem, never a fact: a backfilled
  // row timestamped after the transition it describes, a clock skew between
  // the browser and Postgres, or a seeded event in the future. Rendering
  // "-3059 min" makes the screen look broken; clamping tells the truth
  // ("no time has passed") without inventing one.
  if (hours <= 0) return 'just now'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${Math.round(hours)} hr`
  return `${Math.round(hours / 24)} days`
}
