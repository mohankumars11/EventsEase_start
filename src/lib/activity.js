import { supabase } from './supabase'
import { fetchCelebrations, stageOf } from './celebrations'

/**
 * Everything a customer has going with us, on one axis.
 *
 * ── The problem this fixes ────────────────────────────────────────────────
 * Three screens, three vocabularies, for one question ("where is my thing?"):
 *
 *   MyOrders     printed `orders.status` raw — the customer read "dispatched"
 *   MyRequests   relabelled the four enquiry statuses its own way
 *   MyEvents     drew a five-stop bar from a third mapping in celebrations.js
 *
 * So a customer with a cake order and a birthday booking was reading two
 * unrelated status languages in one app, neither of which said when anything
 * happened.
 *
 * ── Why this is not a fourth vocabulary ───────────────────────────────────
 * The fix is not another list of stages. It is separating the LINEAR AXIS from
 * the FLAGS, which is the lesson `orderJourney.js:78-86` already writes down
 * about `cancelled`: *"it is not a fifth stage — it is an exit, and modelling
 * it as a stage produces a funnel where cancelled orders appear to have
 * progressed further than live ones."*
 *
 * `celebrations.js`'s `'yours'` has exactly the same defect. "Waiting on you"
 * is a CONDITION, not a position — a plan sent for review has not travelled
 * further than one being sourced, it has stopped. Modelled as a stage it makes
 * the bar jump forward and then back when the customer asks for a change.
 *
 * So: four monotonic stops, and `needsYou` / `cancelled` ride alongside as
 * flags that never move the bar.
 */

/* ── The axis ─────────────────────────────────────────────────────────── */

export const TRACK_STAGES = [
  { key: 'received',  label: 'Received',  emoji: '🧾', customer: 'We have it.' },
  { key: 'arranging', label: 'Arranging', emoji: '🤝', customer: 'We are putting it together.' },
  { key: 'confirmed', label: 'Confirmed', emoji: '✅', customer: 'Locked in.' },
  { key: 'done',      label: 'Done',      emoji: '🎉', customer: 'Complete.' },
]

export const STAGE_INDEX = Object.fromEntries(TRACK_STAGES.map((s, i) => [s.key, i]))
export const CANCELLED = 'cancelled'

/**
 * Why something is waiting on the customer.
 *
 * A reason, not a boolean, for the same purpose `offerAvailability()` returns
 * one: "your plan is ready to approve" is actionable, a red dot is not.
 */
export const NEEDS_YOU = {
  proposal: { reason: 'proposal', label: 'Your plan is ready to approve', cta: 'Review the plan' },
  payment:  { reason: 'payment',  label: 'A payment is due',              cta: 'See what it unlocks' },
  details:  { reason: 'details',  label: 'We need a detail from you',     cta: 'Add it' },
}

/* ── The one mapping table ────────────────────────────────────────────────
 *
 * Nothing else in the app may re-derive these. Three places already did, and
 * disagreed; a fourth private copy is how that happens again.
 */

/** `orders.status` → the axis. */
const ORDER_STAGE = {
  placed:     'received',
  processing: 'arranging',
  dispatched: 'confirmed',
  delivered:  'done',
}

/**
 * `celebrations.js` stage → the axis.
 *
 * `working` and `yours` both land on `arranging`, and that collapse is the
 * point: they are the same distance along, differing only in who is holding
 * it — which is what `needsYou` is for.
 */
const CELEBRATION_STAGE = {
  received:  'received',
  working:   'arranging',
  yours:     'arranging',
  confirmed: 'confirmed',
  done:      'done',
}

/** Which celebration stages are waiting on the customer. */
const CELEBRATION_NEEDS_YOU = { yours: NEEDS_YOU.proposal }

/**
 * A raw celebration status → this file's four-stop axis.
 *
 * The transition log stores what the database stores, so anything reading it
 * needs this composition rather than a private copy of the two maps.
 */
export function trackStageOf(subjectType, rawStatus) {
  const kind = subjectType === 'event' ? 'event' : 'enquiry'
  const five = stageOf(kind, rawStatus)
  return five === CANCELLED ? CANCELLED : (CELEBRATION_STAGE[five] ?? 'received')
}

export function stageOfOrder(status) {
  if (status === 'cancelled') return CANCELLED
  return ORDER_STAGE[status] ?? 'received'
}

export function progressFor(stage) {
  if (stage === CANCELLED) return 0
  const i = STAGE_INDEX[stage] ?? 0
  return Math.round(((i + 1) / TRACK_STAGES.length) * 100)
}

/* ── Normalising ──────────────────────────────────────────────────────── */

/**
 * One shape for both halves of the business, so `TrackHub` renders a list
 * rather than two lists that happen to be adjacent.
 */
function fromCelebration(c) {
  const stage = c.stage === CANCELLED ? CANCELLED : (CELEBRATION_STAGE[c.stage] ?? 'received')
  return {
    key: c.key,
    kind: 'celebration',
    subject: c.kind,                 // 'event' | 'enquiry' — which table it lives in
    id: c.id,
    title: c.title,
    emoji: c.emoji,
    gradient: c.gradient,
    reference: c.reference,
    at: c.raisedAt,
    stage,
    stageIndex: stage === CANCELLED ? -1 : STAGE_INDEX[stage],
    progress: progressFor(stage),
    needsYou: stage === CANCELLED ? null : (CELEBRATION_NEEDS_YOU[c.stage] ?? null),
    cancelled: stage === CANCELLED,
    live: stage !== 'done' && stage !== CANCELLED,
    message: c.message,
    eventDate: c.eventDate,
    city: c.city,
    guestCount: c.guestCount,
    amount: c.quoted ?? null,
    estimate: c.estimate ?? null,
    lockStatus: c.lockStatus ?? null,
    href: `/track/${c.kind}/${c.id}`,
    raw: c.raw,
  }
}

function fromOrder(o) {
  const stage = stageOfOrder(o.status)
  const itemCount = (o.order_items ?? []).length
  const lead = o.order_items?.[0]
  return {
    key: `order:${o.id}`,
    kind: 'order',
    subject: 'order',
    id: o.id,
    title: itemCount > 1
      ? `${lead?.product_name ?? 'Your order'} + ${itemCount - 1} more`
      : (lead?.product_name ?? 'Your order'),
    emoji: lead?.emoji ?? '🛍️',
    reference: `#${String(o.id).slice(0, 8).toUpperCase()}`,
    at: o.created_at,
    stage,
    stageIndex: stage === CANCELLED ? -1 : STAGE_INDEX[stage],
    progress: progressFor(stage),
    // An order awaiting payment confirmation is OUR backlog, not the
    // customer's task — see the badge note in BottomNav. Nothing on an order
    // needs them until a return is in play, which lives on its own screen.
    needsYou: null,
    cancelled: stage === CANCELLED,
    live: stage !== 'done' && stage !== CANCELLED,
    message: null,
    eventDate: o.address?.neededOn ?? null,
    amount: o.total ?? null,
    paymentStatus: o.payment_status ?? null,
    itemCount,
    href: `/track/order/${o.id}`,
    raw: o,
  }
}

/* ── Fetching ─────────────────────────────────────────────────────────── */

/**
 * Everything, newest first, with per-source failures named.
 *
 * ── Why errors are collected rather than thrown ───────────────────────────
 * `fetchCelebrations` already established this contract and the reason is
 * worth repeating: "you have nothing here" is the most damaging thing this
 * screen can say untruthfully. If the orders query fails, a customer with a
 * live celebration must still see it, and must be told the other half did not
 * load — not shown an empty state that quietly means "we broke".
 *
 * Adding orders adds a third way to say it wrongly, so the same contract
 * covers all three.
 */
export async function fetchActivity(userId) {
  if (!userId) return { items: [], errors: [] }

  const [celebrationResult, orderResult] = await Promise.all([
    fetchCelebrations(userId),
    supabase
      .from('orders')
      .select('id, status, payment_status, total, address, created_at, updated_at, cancellation_reason, order_items(id, product_name, emoji, quantity)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const errors = [...(celebrationResult.errors ?? [])]
  if (orderResult.error) errors.push({ source: 'orders', error: orderResult.error })

  const items = [
    ...(celebrationResult.celebrations ?? []).map(fromCelebration),
    ...(orderResult.data ?? []).map(fromOrder),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return { items, errors }
}

/* ── Reading a list ───────────────────────────────────────────────────── */

export const isLive     = i => i.live
export const needsYou   = i => Boolean(i.needsYou)
export const isPast     = i => !i.live
export const celebrations = list => list.filter(i => i.kind === 'celebration')
export const orders       = list => list.filter(i => i.kind === 'order')

/** The number on the tab. Needs-you only — see BottomNav for why. */
export function needsYouCount(list) {
  return list.filter(needsYou).length
}
