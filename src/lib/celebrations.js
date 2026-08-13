import { supabase } from './supabase'
import { EVENT_STATUSES, STATUS_ORDER, EVENT_TYPE_EMOJIS, EVENT_TYPE_GRADIENTS } from '../config/sambramo'
import { EVENT_DATA } from '../data/eventServicesData'

/**
 * Everything a customer has asked us to arrange, from every door, as one list.
 *
 * ── The bug this exists to close ────────────────────────────────────────
 * A celebration request can be raised three ways, and they do not land in the
 * same table:
 *
 *   /plan/custom      six-step wizard      → `events`
 *   /plan/build       celebration builder  → `service_enquiries`
 *   /dashboard/…/cart enquiry cart         → `service_enquiries`
 *
 * "My celebrations" read `events` and nothing else, and the home screen's
 * active rail read `events` and nothing else. So two of the three doors led
 * somewhere the customer could not see afterwards: they built a celebration,
 * got "Sent to a coordinator 🎉", went to the Events tab, and found the empty
 * state telling them to start planning — the request they had just made was
 * sitting in the database the whole time, reachable only at
 * /dashboard/customer/requests, which nothing in the bottom bar links to.
 *
 * The tables stay separate — they are genuinely different shapes, and the
 * coordinator console works them as different queues — but the customer is
 * owed one answer to "what have I asked for?". That is what this module is.
 *
 * ── One vocabulary ──────────────────────────────────────────────────────
 * `events` carries the full 13-stage coordinator workflow; `service_enquiries`
 * carries four states. Both are projected onto the same four things a customer
 * actually wants to know — is it in, is someone on it, does it need me, is it
 * done — so one card component can render either without asking which table it
 * came from.
 */

/** The customer-facing journey. Both sources are mapped onto these. */
export const JOURNEY = [
  { key: 'received',  label: 'Request received' },
  { key: 'working',   label: 'Coordinator working on it' },
  { key: 'yours',     label: 'Ready for you' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'done',      label: 'Celebrated' },
]

const JOURNEY_INDEX = Object.fromEntries(JOURNEY.map((s, i) => [s.key, i]))

/** `events.status` → journey key. */
const EVENT_STAGE = {
  REQUEST_RECEIVED:           'received',
  UNDER_REVIEW:               'working',
  CONTACTING_VENDORS:         'working',
  QUOTES_COLLECTED:           'working',
  PROPOSAL_PREPARED:          'working',
  PROPOSAL_SENT:              'yours',
  CUSTOMER_REVIEW:            'yours',
  CUSTOMER_CHANGES_REQUESTED: 'working',
  APPROVED:                   'confirmed',
  CONFIRMED:                  'confirmed',
  IN_COORDINATION:            'confirmed',
  EVENT_DAY:                  'confirmed',
  COMPLETED:                  'done',
}

/** `service_enquiries.status` → journey key. */
const ENQUIRY_STAGE = {
  open:      'received',
  responded: 'yours',
  closed:    'done',
}

/** What the customer is told, per stage. Deliberately says who is holding it. */
const STAGE_MESSAGE = {
  received:  'We have your request. A coordinator picks it up next.',
  working:   'Your Sambramo coordinator is sourcing and pricing this.',
  yours:     'Your plan is ready to review — this one is waiting on you. 🎉',
  confirmed: 'Confirmed. We are coordinating everything for the day.',
  done:      'What a beautiful celebration. Thank you for celebrating with us.',
  cancelled: 'This request was cancelled. Message us if you want it back.',
}

const CANCELLED = 'cancelled'

function stageOf(kind, status) {
  if (status === 'CANCELLED' || status === 'cancelled') return CANCELLED
  const map = kind === 'event' ? EVENT_STAGE : ENQUIRY_STAGE
  return map[status] ?? 'received'
}

/**
 * How far along, as a percentage.
 *
 * Driven off the five-stage journey rather than off `STATUS_ORDER`, so a
 * builder enquiry and a wizard event at the same real point in the process
 * draw the same bar. A cancelled request draws nothing — a progress bar on a
 * dead request reads as work still happening.
 */
function progressFor(stage) {
  if (stage === CANCELLED) return 0
  const i = JOURNEY_INDEX[stage] ?? 0
  return Math.round(((i + 1) / JOURNEY.length) * 100)
}

/** Title-case an id like `baby-shower` when we have nothing better. */
function humanise(id) {
  if (!id) return 'Celebration'
  return String(id).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Contact details, wherever this request happened to put them.
 *
 * `events` has real columns. `service_enquiries` has none, so the cart writes
 * them into `location` (JSONB) and the builder does the same — see migration
 * 041 for the columns that supersede this, and note that reading both keeps
 * every request already in the table legible.
 */
function contactOf(row, kind) {
  if (kind === 'event') {
    return {
      name:  row.customer_name  ?? null,
      phone: row.customer_phone ?? null,
      email: row.customer_email ?? null,
    }
  }
  const loc = row.location ?? {}
  return {
    name:  row.contact_name  ?? loc.name  ?? loc.contact?.name  ?? null,
    phone: row.contact_phone ?? loc.phone ?? loc.contact?.phone ?? null,
    email: row.contact_email ?? loc.email ?? loc.contact?.email ?? null,
  }
}

/** A short human reference. Both tables get one so support can be quoted it. */
function referenceOf(row, kind) {
  if (kind === 'event' && row.event_code) return row.event_code
  return `${kind === 'event' ? 'EV' : 'SR'}-${String(row.id).slice(0, 8).toUpperCase()}`
}

/** Normalise one `events` row. */
function fromEvent(row) {
  const stage = stageOf('event', row.status)
  return {
    key:        `event:${row.id}`,
    id:         row.id,
    kind:       'event',
    source:     'Planning wizard',
    title:      humanise(row.event_type),
    emoji:      EVENT_TYPE_EMOJIS[row.event_type] ?? '🎉',
    gradient:   EVENT_TYPE_GRADIENTS[row.event_type] ?? 'from-indigo-500 to-purple-600',
    reference:  referenceOf(row, 'event'),
    raisedAt:   row.created_at,
    eventDate:  row.event_date ?? null,
    timeSlot:   row.time_slot ?? row.start_time ?? null,
    city:       row.city ?? null,
    guestCount: row.guest_count ?? null,
    budget:     row.budget_text ?? null,
    stage,
    stageLabel: stage === CANCELLED
      ? 'Cancelled'
      : EVENT_STATUSES[row.status]?.label ?? JOURNEY[JOURNEY_INDEX[stage]]?.label,
    message:    STAGE_MESSAGE[stage],
    progress:   progressFor(stage),
    estimate:   null,
    quoted:     null,
    lockStatus: row.lock_payment_status ?? 'none',
    lockAmount: row.lock_payment_amount ?? null,
    contact:    contactOf(row, 'event'),
    lineCount:  null,
    href:       '/dashboard/customer/events',
    raw:        row,
  }
}

/** Normalise one `service_enquiries` row. */
function fromEnquiry(row) {
  const stage = stageOf('enquiry', row.status)
  const pkg = (row.packages ?? [])[0]
  const services = row.services ?? []
  const eventMeta = EVENT_DATA[row.event_id]
  return {
    key:        `enquiry:${row.id}`,
    id:         row.id,
    kind:       'enquiry',
    source:     pkg ? 'Celebration builder' : 'Services cart',
    title:      row.event_name || eventMeta?.name || 'Celebration',
    emoji:      eventMeta?.emoji ?? '🎊',
    gradient:   EVENT_TYPE_GRADIENTS[row.event_id] ?? 'from-plum-500 to-saffron-500',
    reference:  referenceOf(row, 'enquiry'),
    raisedAt:   row.created_at,
    eventDate:  row.event_date ?? null,
    timeSlot:   row.start_time ?? row.location?.slot ?? null,
    city:       row.location?.city ?? null,
    guestCount: row.guest_count ?? null,
    budget:     null,
    stage,
    stageLabel: stage === CANCELLED
      ? 'Cancelled'
      : JOURNEY[JOURNEY_INDEX[stage]]?.label,
    message:    STAGE_MESSAGE[stage],
    progress:   progressFor(stage),
    estimate:   pkg && pkg.price_min
      ? { low: pkg.price_min, high: pkg.price_max ?? pkg.price_min }
      : null,
    quoted:     row.quoted_price ?? null,
    lockStatus: row.lock_payment_status ?? 'none',
    lockAmount: row.lock_payment_amount ?? null,
    contact:    contactOf(row, 'enquiry'),
    lineCount:  services.length + (row.packages ?? []).length,
    cancelReason: row.cancellation_reason ?? null,
    href:       '/dashboard/customer/requests',
    raw:        row,
  }
}

/** Live, in the sense the customer means: not finished and not cancelled. */
export function isLive(c) {
  return c.stage !== 'done' && c.stage !== CANCELLED
}

/** Waiting on the customer, which is the only thing worth interrupting for. */
export function needsYou(c) {
  return c.stage === 'yours'
}

/**
 * Fetch every celebration this customer has raised, newest first.
 *
 * Both queries run in parallel and neither is allowed to sink the other: a
 * `service_enquiries` outage should not blank out the wizard's events, and vice
 * versa. Errors come back named so the page can say which half is missing
 * rather than showing an empty list as though nothing was ever requested —
 * "you have no celebrations" is the single most damaging thing this screen can
 * say untruthfully.
 */
export async function fetchCelebrations(userId) {
  if (!userId) return { celebrations: [], errors: [] }

  const [eventsRes, enquiriesRes] = await Promise.all([
    supabase.from('events').select('*')
      .eq('customer_id', userId).order('created_at', { ascending: false }),
    supabase.from('service_enquiries').select('*')
      .eq('customer_id', userId).order('created_at', { ascending: false }),
  ])

  const errors = []
  if (eventsRes.error)    errors.push({ source: 'events', error: eventsRes.error })
  if (enquiriesRes.error) errors.push({ source: 'requests', error: enquiriesRes.error })

  const celebrations = [
    ...(eventsRes.data ?? []).map(fromEvent),
    ...(enquiriesRes.data ?? []).map(fromEnquiry),
  ].sort((a, b) => new Date(b.raisedAt ?? 0) - new Date(a.raisedAt ?? 0))

  return { celebrations, errors }
}

export { STATUS_ORDER }
