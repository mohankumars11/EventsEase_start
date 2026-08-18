import { KINDS, kindFor } from './productCopy'

/**
 * When this specific thing can actually arrive, and in what window.
 *
 * ── Why a library and not a string on the card ───────────────────────────
 * "Delivery in 2-4 days" and "Same day available" are the two sentences this
 * market prints, and both are claims about the catalogue rather than about
 * the order in front of the customer. The complaint that follows is always
 * the same shape: the badge said same-day, the customer ordered at 7 PM, and
 * the item was a cake that needs four hours in an oven that closed at six.
 *
 * So the promise is computed from three things that are actually true at the
 * moment of asking — what the product is, what time it is now, and what the
 * row itself says (`same_day`, `prep_hours`) — and the same function answers
 * for the card badge, the listing filter, the product page and the cart. One
 * computation means the badge on the tile cannot promise something the slot
 * picker then refuses.
 *
 * ── The two-hour window is the product ───────────────────────────────────
 * Every slot below is two hours wide and named. Nothing in this file can
 * return "some time today", because that is the thing being competed against:
 * a person waiting in for a delivery all day is the review that costs a
 * customer, and it is entirely a scheduling choice rather than a logistics
 * limit.
 */

/** Minutes since local midnight, for a Date. */
const minutesOf = d => d.getHours() * 60 + d.getMinutes()

/** yyyy-mm-dd in LOCAL time — never toISOString, which is a day behind in IST before 05:30. */
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDays = (d, n) => {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  out.setHours(0, 0, 0, 0)
  return out
}

/**
 * The slot board.
 *
 * `from`/`to` are minutes since midnight. `cutoff` is the latest minute an
 * order for that slot can be placed today. `fee` is what the slot would cost
 * on top of the order.
 *
 * ── Every fee is 0, and that is deliberate for launch ────────────────────
 * The premium windows — a 6 AM muhurat run, a midnight cake — genuinely cost
 * more to serve, and the field exists because that is a real business rule
 * somebody will want to switch on.
 *
 * It is off because the cart cannot collect it yet. `ShopCart` computes its
 * delivery fee from `lib/savings` and has no channel through which a
 * per-line slot choice reaches the order total, so a non-zero number here
 * would be printed on the product page and then silently never charged.
 *
 * Of the two ways to be consistent, this is the one that matches what the
 * storefront promises three sections above: the price on the tile is the
 * price. A shop whose whole pitch is "nothing new appears between the basket
 * and the payment screen" cannot be the shop that quotes a delivery
 * surcharge it does not take.
 *
 * ⚠ Before setting any of these non-zero, give ShopCart a way to add the
 * chosen window's charge to the order total. Everything else — the FREE tag,
 * the amber price chip, `slotFee`'s reason strings, the note above the CTA —
 * is already written for a non-zero fee and will light up on its own.
 */
const SLOTS = [
  { id: 'dawn',      label: 'Early morning', from:  6 * 60, to:  8 * 60,  fee: 0, cutoff: 22 * 60 },
  { id: 'morning',   label: 'Morning',       from:  9 * 60, to: 11 * 60,  fee: 0, cutoff:  7 * 60 },
  { id: 'midday',    label: 'Midday',        from: 11 * 60, to: 13 * 60,  fee: 0, cutoff:  9 * 60 },
  { id: 'afternoon', label: 'Afternoon',     from: 14 * 60, to: 16 * 60,  fee: 0, cutoff: 12 * 60 },
  { id: 'evening',   label: 'Evening',       from: 17 * 60, to: 19 * 60,  fee: 0, cutoff: 15 * 60 },
  { id: 'night',     label: 'Late evening',  from: 20 * 60, to: 22 * 60,  fee: 0, cutoff: 18 * 60 },
  { id: 'midnight',  label: 'Midnight',      from: 23 * 60, to: 23 * 60 + 59, fee: 0, cutoff: 19 * 60 },
]

/**
 * Which slots each archetype is even willing to offer, and how long it needs
 * between the order and the handover.
 *
 * `lead` is in minutes and is the floor: a bouquet is conditioned and tied,
 * a cake is baked, a personalised lamp waits on a human approving a preview.
 * `days` is the earliest day offset that can be offered at all — 0 means
 * today is possible, 2 means the maker has not started yet.
 */
const PROFILE = {
  [KINDS.BLOOM]:        { lead: 180,  days: 0, slots: ['morning', 'midday', 'afternoon', 'evening', 'night'] },
  [KINDS.BAKED]:        { lead: 240,  days: 0, slots: ['morning', 'midday', 'afternoon', 'evening', 'night', 'midnight'] },
  [KINDS.CONFECTION]:   { lead: 120,  days: 0, slots: ['morning', 'midday', 'afternoon', 'evening', 'night'] },
  [KINDS.KEEPSAKE]:     { lead: 120,  days: 0, slots: ['morning', 'midday', 'afternoon', 'evening', 'night'] },
  [KINDS.DECOR]:        { lead: 240,  days: 0, slots: ['morning', 'midday', 'afternoon', 'evening'] },
  // Rituals are the one kind that genuinely needs a 6 AM slot, and the one
  // kind for which "we will get there in the evening" is useless: the muhurat
  // does not move.
  [KINDS.RITUAL]:       { lead: 240,  days: 0, slots: ['dawn', 'morning', 'midday', 'afternoon', 'evening'] },
  [KINDS.PLANT]:        { lead: 900,  days: 1, slots: ['morning', 'midday', 'afternoon'] },
  [KINDS.PERSONALISED]: { lead: 1440, days: 2, slots: ['morning', 'midday', 'afternoon', 'evening'] },
  [KINDS.CRAFT]:        { lead: 4320, days: 3, slots: ['morning', 'midday', 'afternoon'] },
}

const slotById = id => SLOTS.find(s => s.id === id)

/** "9 – 11 AM" for a slot, in the compressed form a chip has room for. */
export function slotWindowLabel(slot) {
  const fmt = mins => {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const h = h24 % 12 === 0 ? 12 : h24 % 12
    const suffix = h24 < 12 ? 'AM' : 'PM'
    return m ? `${h}.${String(m).padStart(2, '0')} ${suffix}` : `${h} ${suffix}`
  }
  return `${fmt(slot.from)} – ${fmt(slot.to)}`
}

/** The short "by 10 AM" form the listing badge prints. */
function byLabel(slot) {
  const h24 = Math.floor(slot.to / 60)
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h} ${h24 < 12 ? 'AM' : 'PM'}`
}

/**
 * Every day/slot combination this product can actually be delivered in,
 * for the next `horizon` days.
 *
 * A slot is offered on a day when BOTH of these hold: enough of its lead time
 * fits before the window opens, and the order is in before that slot's own
 * cutoff on that day. Today is filtered hard; future days only have to clear
 * the lead time.
 */
export function deliveryPlan(product, { now = new Date(), horizon = 10 } = {}) {
  const kind = kindFor(product)
  const base = PROFILE[kind] ?? PROFILE[KINDS.KEEPSAKE]

  // A row that has been marked not-same-day, or given an explicit prep time,
  // overrides the archetype. The row is the more specific statement.
  const prepMins = Number(product?.prep_hours) > 0 ? Number(product.prep_hours) * 60 : 0
  const lead = Math.max(base.lead, prepMins)
  const minDay = product?.same_day === false ? Math.max(1, base.days) : base.days

  const nowMins = minutesOf(now)
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  const days = []
  for (let offset = 0; offset <= horizon; offset++) {
    if (offset < minDay) continue
    const date = addDays(today, offset)

    const slots = base.slots
      .map(slotById)
      .filter(Boolean)
      .filter(slot => {
        // Minutes from `now` until this slot's window opens on this day.
        const untilOpen = offset * 1440 + slot.from - nowMins
        if (untilOpen < lead) return false
        // The cutoff only constrains same-day orders; a slot booked for
        // Thursday does not care what o'clock it is on Tuesday.
        if (offset === 0 && nowMins > slot.cutoff) return false
        return true
      })
      .map(slot => ({
        id: slot.id,
        label: slot.label,
        window: slotWindowLabel(slot),
        fee: slot.fee,
        free: slot.fee === 0,
        by: byLabel(slot),
      }))

    if (slots.length) days.push({ iso: isoDate(date), date, offset, slots })
  }

  return { kind, lead, days }
}

/** Day label in the words the picker uses — "Today", "Tomorrow", then a date. */
export function dayLabel(date, offset) {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-IN', { weekday: 'short' })
}

/** "19 Aug" — the second line under the day label. */
export function dayDate(date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * One line stating the soonest this product can be in someone's hands.
 *
 * This is what the listing card and the product page print above the slot
 * picker. It is deliberately a sentence about a real slot on a real day
 * rather than a badge: "Same Day" tells a customer at 7 PM nothing they can
 * act on, and "Earliest today, 5 – 7 PM" tells them everything.
 */
export function earliestPromise(product, now = new Date()) {
  const plan = deliveryPlan(product, { now, horizon: 12 })
  const first = plan.days[0]
  if (!first) return { text: 'Ask us for a date', sameDay: false, slot: null, day: null }

  const slot = first.slots[0]
  const when = first.offset === 0 ? 'today' : first.offset === 1 ? 'tomorrow' : dayDate(first.date)

  return {
    sameDay: first.offset === 0,
    day: first,
    slot,
    // "today by 11 AM" reads faster on a tile than the full window, and the
    // full window is one tap away on the page itself.
    short: `${when} by ${slot.by}`,
    text: `Earliest ${when}, ${slot.window}`,
  }
}

/** Does this product still have a same-day slot left, right now? */
export function canDeliverToday(product, now = new Date()) {
  return earliestPromise(product, now).sameDay
}

/**
 * The delivery fee for a chosen slot, and the honest reason for it.
 *
 * Returned as a reason string rather than a bare number because an unexplained
 * line on a bill is the single most-cited complaint about checkout in this
 * category — the "convenience charge" that appears between the cart and the
 * payment screen. Ours is named on the slot chip before it is ever charged.
 */
export function slotFee(slotId) {
  const slot = slotById(slotId)
  if (!slot || slot.fee === 0) return { fee: 0, reason: 'No charge for this window.' }
  if (slot.id === 'midnight') return { fee: slot.fee, reason: 'Midnight delivery — a rider held back for the 11 PM run.' }
  if (slot.id === 'dawn') return { fee: slot.fee, reason: 'Pre-dawn dispatch, for muhurat timings.' }
  return { fee: slot.fee, reason: 'Peak evening window.' }
}

/**
 * The chosen date and window, as one line a human can act on.
 *
 * This ends up in `order_items.customization`, which is TEXT and whose reader
 * is whoever is packing the box — so it is written for them, not for a
 * parser: a weekday they can check against a calendar, a date, and the window
 * in the same words the customer was shown. Returns null when nothing has
 * been chosen, so callers can join it away.
 */
export function describeSlotChoice({ date, slot } = {}) {
  if (!date) return null
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null

  const when = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const s = SLOTS.find(x => x.id === slot)
  return s
    ? `Deliver ${when}, ${s.label} (${slotWindowLabel(s)})`
    : `Deliver ${when}`
}

export { SLOTS }
