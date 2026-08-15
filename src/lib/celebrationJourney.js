import { TRACK_STAGES, STAGE_INDEX, CANCELLED } from './activity'

/**
 * The whole life of one celebration, as a thing you can render.
 *
 * ── The gap this fills, and the one it cannot ─────────────────────────────
 * `lib/orderJourney.js` does this for shop orders and does it well, because
 * migration 039 gave `orders` a trigger-written transition log. The concierge
 * side has no equivalent: `events` carries only `created_at` and `updated_at`
 * — and `updated_at` is destroyed by the next edit, including a priority
 * change — while `service_enquiries` has no `updated_at` at all.
 *
 * So for a celebration, today, three things are knowable and no more:
 *
 *   1. when the request arrived            (created_at)
 *   2. what stage it is in right now       (status)
 *   3. every moment that left its OWN row  — a proposal, a change request, a
 *      quote, a lock claim, a payment
 *
 * When each intermediate stage was ENTERED is not knowable. This module
 * therefore does what `orderJourney` does about the same problem: it infers
 * what it can, flags every inference, and leaves the rest blank rather than
 * inventing it. `recorded: false` drives one banner at the top instead of a
 * caveat on every row.
 *
 * ── Why it takes `log` and mostly ignores it ──────────────────────────────
 * Migration 045 adds `celebration_events`, the trigger-written log that closes
 * the gap. It is applied by hand and a deploy does not run it, so this must
 * work perfectly with `log = []` — that is precisely what makes the tracker
 * shippable before the SQL is run. When the log arrives, the same code starts
 * producing real timestamps and the banner disappears on its own.
 *
 * ── What it will NOT do ───────────────────────────────────────────────────
 * It will not show "we are sourcing your cook" until something records that.
 * `event_vendor_options` and `event_tasks` are admin-only under RLS, so before
 * 045 there is no customer-readable source for it, and a tracker that says it
 * anyway is inventing progress on the one screen whose entire job is being
 * believed.
 */

/* ── What the customer is told at each stop ───────────────────────────────
 *
 * Deliberately says who is holding it. A customer reading "Arranging" wants to
 * know whether the ball is with us or with them, and that is the single most
 * common reason somebody messages a coordinator.
 */
/**
 * `upcoming` exists because a completion sentence cannot be reused for a stage
 * that has not happened. The stepper's generic fallback renders unreached
 * stages as "Not yet — <copy>", which turned the last stop into "Not yet —
 * thank you for celebrating with us." Each stage therefore states its future
 * tense itself.
 */
const STAGE_COPY = {
  received:  {
    title: 'We have your request',
    customer: 'A coordinator picks this up and starts sourcing.',
    upcoming: 'Once you send it, a coordinator picks it up.',
    next: 'We come back with real names and real prices.',
  },
  arranging: {
    title: 'Arranging your celebration',
    customer: 'Your coordinator is sourcing masters, negotiating and pricing this.',
    upcoming: 'Your coordinator will source the masters and price this.',
    next: 'You get one plan, with one number, to approve.',
  },
  confirmed: {
    title: 'Confirmed',
    customer: 'Everything is booked for your date.',
    upcoming: 'Once you approve the plan, everything is booked for your date.',
    next: 'We coordinate the day itself.',
  },
  done: {
    title: 'Celebrated',
    customer: 'Thank you for celebrating with us.',
    upcoming: 'The day itself, and then it is over to you to enjoy it.',
    next: null,
  },
}

export const CANCELLED_STAGE = {
  id: CANCELLED,
  label: 'Cancelled',
  emoji: '🚫',
  customer: 'This request was cancelled. Message us if you want it back.',
}

/* ── Building it ──────────────────────────────────────────────────────── */

/**
 * @param item            a normalised row from `lib/activity.js` (kind 'celebration')
 * @param log             rows from `celebration_events` (migration 045). Empty
 *                        until it is applied — everything degrades.
 * @param proposals       rows from `event_proposals` for this subject
 * @param payments        rows from `event_payments` for this subject
 * @param changeRequests  rows from `event_change_requests` for this subject
 */
export function buildCelebrationJourney(
  item,
  { log = [], proposals = [], payments = [], changeRequests = [], now = new Date() } = {},
) {
  if (!item) return null

  const row = item.raw ?? {}
  const cancelled = item.cancelled
  const reachedIndex = cancelled ? -1 : (STAGE_INDEX[item.stage] ?? 0)

  const mine = [...log].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const hasLog = mine.length > 0

  /* ── The axis ───────────────────────────────────────────────────── */
  const stages = TRACK_STAGES.map((stage, i) => {
    const evt = mine.find(e => e.kind === 'status' && e.to_value === stage.key)
    const reached = evt ? true : (!cancelled && i <= reachedIndex)

    // Without the log only two timestamps exist: the request arrived at
    // created_at, and it reached its CURRENT stage at updated_at — and
    // enquiries do not even have that. Everything between is a guess, and is
    // left blank rather than filled with a plausible-looking date.
    let at = evt?.created_at ?? null
    let inferred = false
    if (!at && reached) {
      if (stage.key === 'received') {
        // `created_at` is a real timestamp whether or not the log exists, so
        // this stop is never approximate.
        at = item.at
        inferred = false
      } else if (i === reachedIndex) {
        at = row.updated_at ?? null          // null for enquiries: no such column
        inferred = true
      } else {
        inferred = true
      }
    }

    const copy = STAGE_COPY[stage.key] ?? {}
    return {
      ...stage,
      id: stage.key,
      ...copy,
      reached,
      current: !cancelled && stage.key === item.stage,
      at,
      inferred: reached ? (inferred || Boolean(evt?.note?.startsWith('Reconstructed'))) : false,
      note: evt?.customer_copy ?? null,
    }
  })

  /* ── What actually left a record ─────────────────────────────────
   *
   * These are the rows this tracker can stand behind today. Each one is a
   * moment that wrote itself somewhere, so each one carries a real time.
   */
  const timeline = []
  const push = (at, emoji, title, detail, opts = {}) => {
    if (!at) return
    timeline.push({ id: `${title}-${at}`, at, emoji, title, detail, ...opts })
  }

  push(item.at, '🧾', 'Request received',
    `${item.title}${item.guestCount ? ` · ${item.guestCount} guests` : ''}`)

  if (row.quoted_at) {
    push(row.quoted_at, '🧮', 'Your coordinator priced this',
      row.quoted_price ? 'A confirmed quote is on your request.' : null)
  }

  for (const p of proposals) {
    push(p.created_at, '📋', 'Your plan was prepared', null)
    if (p.status === 'SENT' || p.status === 'APPROVED') {
      // `updated_at` is the only stamp a proposal carries for its send, and it
      // is overwritten by any later edit — so it is marked approximate.
      push(p.updated_at, '📤', 'Your plan was sent to you',
        'Ready for you to approve.', { inferred: true })
    }
  }

  for (const c of changeRequests) {
    push(c.created_at, '✏️', 'You asked for a change', c.description ?? null)
    push(c.resolved_at, '✅', 'We answered your change', null)
  }

  if (row.lock_claimed_at) {
    push(row.lock_claimed_at, '🔒', 'You told us the hold was paid',
      'We are matching it against the bank.')
  }
  if (row.lock_confirmed_at) {
    push(row.lock_confirmed_at, '✅', 'Your hold is confirmed',
      'Your date is held. It comes off your final invoice.')
  }

  for (const p of payments) {
    const verified = p.status === 'ADMIN_VERIFIED' || p.status === 'GATEWAY_VERIFIED'
    push(p.created_at, verified ? '💰' : '⏳',
      verified ? 'Payment received' : 'Payment recorded',
      p.milestone_id ? null : (p.notes ?? null))
  }

  timeline.sort((a, b) => new Date(a.at) - new Date(b.at))

  /* ── Money ──────────────────────────────────────────────────────── */
  const settled = payments.filter(p => p.status === 'ADMIN_VERIFIED' || p.status === 'GATEWAY_VERIFIED')
  const payment = {
    // The confirmed number, if a coordinator has produced one. Never the
    // estimate — see config/celebrationPayments.js.
    confirmedTotal: row.quoted_price
      ?? proposals.find(p => p.status === 'APPROVED')?.total_amount
      ?? null,
    paid: settled.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
    lockStatus: row.lock_payment_status ?? 'none',
    records: payments,
  }

  const currentStage = stages.find(s => s.current) ?? null

  return {
    item,
    stages,
    currentStage,
    cancelled,
    cancelledAt: cancelled ? (row.cancelled_at ?? null) : null,
    cancellationReason: row.cancellation_reason ?? null,
    timeline,
    payment,
    proposals,
    // False until migration 045 is applied. The UI says so once, at the top.
    recorded: hasLog,
    nextAction: nextAction({ item, currentStage }),
  }
}

/**
 * The one sentence at the top: what happens next, and who is holding it.
 *
 * Needs-you first. A plan sitting unapproved is the only state where the
 * customer can move this forward, and burying it under a progress note is how
 * a booking stalls for a week on nobody's desk.
 */
function nextAction({ item, currentStage }) {
  if (item.cancelled) return { urgency: 'none', text: 'This request was cancelled.' }
  if (item.needsYou) return { urgency: 'you', text: item.needsYou.label, cta: item.needsYou.cta }
  if (currentStage?.next) return { urgency: 'us', text: currentStage.next }
  return { urgency: 'none', text: null }
}

/**
 * The banner shown until the log exists.
 *
 * Written as a statement of what this screen knows, not as "coming soon" — a
 * customer is owed the current truth, not a promise about a future release.
 */
export const NO_LOG_NOTE =
  'We record the moment your request arrives, and every time your plan or your payments move. ' +
  'Step-by-step updates from your coordinator — decorator confirmed, caterer confirmed — appear here as they happen.'
