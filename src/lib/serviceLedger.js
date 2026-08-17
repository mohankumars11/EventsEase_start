import { STAGE_INDEX, CANCELLED, trackStageOf } from './activity'
import { TIER_BY_ID } from '../data/celebrationTiers'
import { tierServicesFor } from '../data/occasionPackages'
import { SERVICE_BY_ID } from '../data/servicePricing'
import { SERVICE_CATEGORIES } from '../config/sambramo'

/**
 * Every service on one celebration, and how far each one has actually got.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 * The tracker's stepper answers "where is my celebration?" with one word. That
 * is the right answer to the question somebody opens the app with, and it is
 * the wrong answer to the question they have thirty seconds later: a wedding
 * is not one thing, it is eleven things, and "Arranging" says nothing about
 * whether the photographer is booked.
 *
 * So this is the second axis. The celebration has a stage; each SERVICE on it
 * has its own six-step life, and the customer can see all of them at once.
 *
 * ── The rule this file exists to obey ─────────────────────────────────────
 * A green tick is a claim about the real world. Every one of them here traces
 * to a row somebody wrote:
 *
 *   requested   the celebration lists this service          (events / enquiry JSONB)
 *   sourcing    the celebration reached `arranging`          (status, logged by 045)
 *   priced      this line is on the confirmed price          (proposal item / quoted_price)
 *   paid        the settlement is verified received          (event_payments)
 *   confirmed   a master is booked for this                  (event_services / log / status)
 *   delivered   the celebration reached `done`               (status)
 *
 * Nothing is inferred from the passage of time, nothing is inferred from a
 * neighbouring service, and a step with no record behind it stays grey rather
 * than being filled in with something plausible. `lib/celebrationJourney.js`
 * argues this at length and the same rule applies with more force here,
 * because a per-service tick is a much more specific promise than a stage word.
 *
 * ── What is knowable per service, and what is not ─────────────────────────
 * The two doors record different things, and this file does not pretend
 * otherwise:
 *
 *   events      have real `event_services` rows, and `event_proposal_items`
 *               carries `event_service_id` — so "on your confirmed price" is
 *               knowable PER LINE. If a service is not on the proposal, its
 *               `priced` step stays grey, which is the truth: it is not on the
 *               quote.
 *
 *   enquiries   store services as JSONB and carry ONE `quoted_price` over the
 *               whole list. So `priced` is all-or-nothing for them, and it
 *               says so in `note`. Inventing a per-line split of a single
 *               number would be arithmetic nobody agreed to.
 *
 * Per-service CONFIRMATION is the one nobody can currently see in detail:
 * `event_vendor_options` is admin-only under RLS and migration 045's
 * customer-visible sourcing row deliberately carries the trade and nothing
 * else. So `confirmed` ticks on the celebration reaching `confirmed` — an
 * admin-set status whose own stage copy is "Everything is booked for your
 * date" — or on a per-service record where one exists. Never on a guess.
 */

/* ── The six steps ────────────────────────────────────────────────────── */

export const LEDGER_STEPS = [
  {
    key: 'requested',
    label: 'Asked for',
    short: 'Asked',
    emoji: '📝',
    done: 'You asked us to arrange this.',
    waiting: 'Not on this celebration.',
  },
  {
    key: 'sourcing',
    label: 'Sourcing',
    short: 'Sourcing',
    emoji: '🔍',
    done: 'Your coordinator is finding and negotiating this.',
    waiting: 'Starts when a coordinator picks up your request.',
  },
  {
    key: 'priced',
    label: 'On your price',
    short: 'Priced',
    emoji: '🧾',
    done: 'This is on the confirmed price you were sent.',
    waiting: 'Appears once your confirmed price is ready.',
  },
  {
    key: 'paid',
    label: 'Paid for',
    short: 'Paid',
    emoji: '💳',
    done: 'Your payment covers this.',
    waiting: 'Covered by your one payment.',
  },
  {
    key: 'confirmed',
    label: 'Booked',
    short: 'Booked',
    emoji: '🤝',
    done: 'Booked and confirmed for your date.',
    waiting: 'We book this as soon as your payment is in.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    short: 'Done',
    emoji: '🎉',
    done: 'Delivered on the day.',
    waiting: 'On the day itself.',
  },
]

export const LEDGER_STEP_KEYS = LEDGER_STEPS.map(s => s.key)

/* ── Reading the services off a celebration ───────────────────────────── */

/**
 * Both doors, one shape.
 *
 * `service_enquiries.services` is JSONB written by the builder and by the
 * enquiry cart — the two agree on `{ id, name, emoji, qty, unit_price }`, so
 * one reader covers both. `event_services` is a real table with different
 * column names, hence the mapping rather than a shared type.
 */
function fromEnquiryServices(list = []) {
  return list.filter(Boolean).map((s, i) => ({
    key: `svc:${s.id ?? i}`,
    id: s.id ?? null,
    name: s.name ?? titleise(s.id) ?? 'Service',
    emoji: s.emoji ?? emojiFor(s.id),
    quantity: s.qty ?? 1,
    // The customer's own configuration, where they made one — a cuisine, a
    // décor level, a chosen pack. It is the difference between "Catering" and
    // "Catering — South Indian, pure veg, 180 plates".
    detail: s.chosen ?? null,
    // Never `unit_price` as a price: these are ESTIMATE figures written at
    // enquiry time, and the confirmed price is one number over the whole list.
    // Showing them beside a confirmed total is how a customer ends up doing
    // arithmetic that does not reconcile.
    price: null,
    source: 'enquiry',
  }))
}

function fromEventServices(rows = []) {
  return rows.filter(Boolean).map(r => ({
    key: `es:${r.id}`,
    id: normaliseId(r.service_category) ?? normaliseId(r.service_name),
    rowId: r.id,
    name: prettyName(r.service_name),
    emoji: emojiFor(r.service_category, r.service_name),
    quantity: r.quantity ?? 1,
    detail: r.description ?? null,
    price: null,
    status: r.status ?? null,
    source: 'event',
  }))
}

/**
 * A package the customer chose, expanded into the services it contains.
 *
 * This is the case the whole feature was asked for: somebody picks the
 * complete package for a wedding and expects to see every service inside it
 * tracked, not one line saying "Complete package". The builder already writes
 * the expanded list into `services`, so this only fires when it did not — a
 * package added from the catalogue cart, or an older row.
 *
 * `tierServicesFor` is the same function the builder and the quote engine use,
 * so the expansion cannot disagree with what was actually priced.
 */
function fromPackage(pkg, eventId) {
  const tier = TIER_BY_ID[pkg?.id]
  if (!tier || !eventId) return []
  let ids = []
  try { ids = tierServicesFor(eventId, tier) } catch { return [] }
  return ids.map(id => ({
    key: `pkg:${pkg.id}:${id}`,
    id,
    name: SERVICE_BY_ID[id]?.name ?? titleise(id),
    emoji: emojiFor(id),
    quantity: 1,
    detail: null,
    price: null,
    source: 'package',
  }))
}

const normaliseId = v => (v ? String(v).trim().toLowerCase().replace(/[\s-]+/g, '_') : null)
const titleise = v => (v ? String(v).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null)
/**
 * The wizard's own vocabulary, mapped to a glyph.
 *
 * `PlanningWizard` writes DISPLAY NAMES into `event_services` — 'Balloon
 * decoration', 'Live counters', 'Priest' — not catalogue ids, and says so at
 * its own call site. So `SERVICE_BY_ID` misses most of them, and the first
 * version of this file rendered a bullet beside two thirds of a wedding.
 *
 * `SERVICE_CATEGORIES` is the list those names came from and it carries an
 * emoji per group, which is the correct fallback: the shelf's glyph, not a
 * guess at the service's own.
 */
const WIZARD_EMOJI = Object.fromEntries(
  SERVICE_CATEGORIES.flatMap(c => c.services.map(name => [normaliseId(name), c.emoji])),
)

/** Anything with no glyph anywhere. A celebration, rather than a bullet. */
const FALLBACK_EMOJI = '🎊'

function emojiFor(...candidates) {
  for (const c of candidates) {
    const id = normaliseId(c)
    if (!id) continue
    if (SERVICE_BY_ID[id]?.emoji) return SERVICE_BY_ID[id].emoji
    if (WIZARD_EMOJI[id]) return WIZARD_EMOJI[id]
  }
  return FALLBACK_EMOJI
}

/**
 * What to call a service row.
 *
 * `event_services.service_name` is whatever the wizard's checkbox said — real
 * display text a customer chose — so it is used as written. Only a value that
 * looks like an id (`balloon_arch`, `live-counters`) is sent to the catalogue
 * for a nicer name.
 *
 * The reverse rule was worse: it silently renamed the customer's 'Priest' to
 * 'Priest / purohit'. Small, but this screen's whole job is being recognised
 * as an accurate record of what somebody asked for.
 */
function prettyName(v) {
  if (!v) return 'Service'
  const raw = String(v).trim()
  const looksLikeId = /^[a-z0-9]+([_-][a-z0-9]+)*$/.test(raw)
  if (!looksLikeId) return raw
  return SERVICE_BY_ID[normaliseId(raw)]?.name ?? titleise(raw) ?? 'Service'
}

/* ── Building the ledger ──────────────────────────────────────────────── */

/**
 * @param item          normalised celebration from `lib/activity.js`
 * @param eventServices rows from `event_services` (events only; [] otherwise)
 * @param proposal      the SENT/APPROVED `event_proposals` row, if any
 * @param proposalItems rows from `event_proposal_items` for that proposal
 * @param settlement    the object from `buildSettlement()`, if priced
 * @param log           customer-visible rows from `celebration_events`
 */
export function buildServiceLedger({
  item,
  eventServices = [],
  proposal = null,
  proposalItems = [],
  settlement = null,
  log = [],
} = {}) {
  if (!item) return null

  const raw = item.raw ?? {}
  const cancelled = item.cancelled
  const stageIndex = cancelled ? -1 : (STAGE_INDEX[item.stage] ?? 0)

  /* ── 1 · What is on this celebration ─────────────────────────────── */
  const packages = Array.isArray(raw.packages) ? raw.packages.filter(Boolean) : []

  let services = item.subject === 'event'
    ? fromEventServices(eventServices)
    : fromEnquiryServices(raw.services)

  // A package with nothing expanded under it is the one case worth filling in,
  // and it is filled in from the same function that priced it — never invented.
  if (services.length === 0 && packages.length > 0) {
    services = packages.flatMap(p => fromPackage(p, raw.event_id))
  }

  /* ── 2 · The signals, read once ──────────────────────────────────── */

  // Which services made it onto the confirmed price. Events only: the join
  // column exists there and nowhere else.
  const pricedRowIds = new Set(
    proposalItems
      .filter(li => proposal && li.proposal_id === proposal.id && li.event_service_id)
      .map(li => li.event_service_id),
  )
  const proposalIsConfirmed = Boolean(proposal && (proposal.status === 'SENT' || proposal.status === 'APPROVED'))

  // Enquiries carry one confirmed number over the whole list, so `priced` is
  // all-or-nothing and the UI says so.
  const enquiryPriced = item.subject !== 'event' && Number(raw.quoted_price) > 0

  const paid = Boolean(settlement?.settled)

  // Per-service confirmation, where a record exists. `event_services.status`
  // has a default of 'REQUIRED' and is only meaningful once something moves
  // it, so anything else counts and 'REQUIRED' does not.
  const confirmedRowIds = new Set(
    eventServices
      .filter(r => r.status && String(r.status).toUpperCase() !== 'REQUIRED')
      .map(r => r.id),
  )

  // Migration 045's sourcing rows name the TRADE and nothing else — no vendor,
  // no amount, by design. Matching one to a service is therefore a match on
  // that single word, and a non-match leaves the step grey rather than
  // guessing which service a confirmation belonged to.
  const confirmedTrades = new Set(
    log
      .filter(e => e.kind === 'sourcing' && e.to_value === 'selected' && e.customer_copy)
      .map(e => tradeFromCopy(e.customer_copy))
      .filter(Boolean),
  )

  // The whole celebration being `confirmed` is an admin-set status whose own
  // customer copy is "Everything is booked for your date". That is a real
  // statement about every line, so it ticks them all.
  const allConfirmed = !cancelled && stageIndex >= STAGE_INDEX.confirmed
  const allDelivered = !cancelled && stageIndex >= STAGE_INDEX.done

  // When each stage was entered, from the log that recorded it. Null before
  // migration 045 is applied, and null is rendered as no timestamp rather than
  // as today's date — the same rule `celebrationJourney` follows.
  const stageAt = key => log.find(
    e => e.kind === 'status' && e.to_value && trackStageOf(item.subject, e.to_value) === key,
  )?.created_at ?? null

  /* ── 3 · Six steps per service ───────────────────────────────────── */
  const rows = services.map(svc => {
    const onQuote = item.subject === 'event'
      ? (proposalIsConfirmed && pricedRowIds.has(svc.rowId))
      : enquiryPriced

    const bookedByRow = svc.rowId ? confirmedRowIds.has(svc.rowId) : false
    const bookedByTrade = svc.id ? confirmedTrades.has(svc.id) : false

    const reached = {
      requested: true,
      sourcing:  !cancelled && stageIndex >= STAGE_INDEX.arranging,
      priced:    !cancelled && onQuote,
      paid:      !cancelled && paid,
      confirmed: !cancelled && (bookedByRow || bookedByTrade || allConfirmed),
      delivered: allDelivered,
    }

    const at = {
      requested: item.at ?? null,
      sourcing:  stageAt('arranging'),
      priced:    onQuote ? (proposal?.updated_at ?? raw.quoted_at ?? null) : null,
      paid:      paid ? (settlement?.settlement?.payment?.paid_at ?? null) : null,
      confirmed: reached.confirmed ? stageAt('confirmed') : null,
      delivered: reached.delivered ? stageAt('done') : null,
    }

    const steps = LEDGER_STEPS.map(step => ({
      ...step,
      reached: reached[step.key],
      at: at[step.key] ?? null,
    }))

    // The furthest step actually reached. Not a count — a service can be
    // `paid` without being `priced` on an enquiry whose quote arrived as one
    // number, and reporting "4 of 6" would imply an order these steps do not
    // strictly have.
    const lastReached = [...steps].reverse().find(s => s.reached) ?? null
    const doneCount = steps.filter(s => s.reached).length

    return {
      ...svc,
      steps,
      reachedCount: doneCount,
      total: LEDGER_STEPS.length,
      current: lastReached?.key ?? null,
      currentLabel: cancelled ? 'Cancelled' : (lastReached?.label ?? 'Asked for'),
      complete: reached.delivered,
      cancelled,
    }
  })

  /* ── 4 · What the customer is owed as a caveat ───────────────────── */
  const notes = []
  if (item.subject !== 'event' && rows.length > 0) {
    notes.push(
      'Your confirmed price covers this list as one number, so every line moves to “on your price” together.',
    )
  }
  if (rows.length > 0 && !allConfirmed && confirmedTrades.size === 0 && confirmedRowIds.size === 0) {
    notes.push(
      'We tick each line as your coordinator books it. Anything not ticked yet is not booked yet — we do not mark work done in advance.',
    )
  }

  return {
    services: rows,
    packages,
    notes,
    // For the headline: how many lines are fully delivered, and how many are
    // booked. Two numbers, because "3 of 11 done" on the morning of a wedding
    // reads as a disaster when in fact all eleven are booked.
    counts: {
      total: rows.length,
      booked: rows.filter(r => r.steps.find(s => s.key === 'confirmed')?.reached).length,
      delivered: rows.filter(r => r.complete).length,
    },
    cancelled,
  }
}

/**
 * The trade out of migration 045's sourcing sentence.
 *
 * The trigger builds it as `'Your ' || v_trade || ' is confirmed for your
 * celebration.'`, so this is the inverse of one specific INSERT rather than
 * general parsing. If that sentence changes, this returns null and the step
 * stays grey — which is the correct failure: a missed tick is a service that
 * looks less arranged than it is, and a wrong tick is a lie.
 */
function tradeFromCopy(copy) {
  const m = /^Your\s+(.+?)\s+is confirmed for your celebration\.?$/i.exec(String(copy).trim())
  return m ? normaliseId(m[1]) : null
}

export { CANCELLED }
