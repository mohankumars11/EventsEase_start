import { PLATFORM_FEE_RATE } from './instantBooking'

/**
 * Offers, and the one rule that keeps them honest.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DISCOUNT COMES OUT OF SAMBRAMO, NEVER OUT OF THE MASTER
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the whole design and everything else follows from it.
 *
 * The obvious way to run "₹300 off" is to quote the master ₹300 less.
 * It costs the platform nothing, it is what a lot of marketplaces
 * quietly do, and it is how you lose supply: a master who works a
 * Saturday and is paid less than the rate they accepted does not answer
 * the next notification. Supply is the thing this business cannot buy
 * back once it is gone.
 *
 * So `partner_amount_paise` is untouched by every offer here. The
 * customer pays less, the master is paid exactly what they accepted, and
 * the difference comes off Sambramo's commission.
 *
 * ── Which caps every offer at the margin ────────────────────────────
 * The platform fee is 8%. On a ₹12,400 decor line that is ₹992, so a
 * ₹300 discount leaves ₹692. A ₹1,500 discount would mean paying the
 * master ₹508 out of pocket to do the booking at all.
 *
 * `applyOffer` caps at the margin for exactly that reason. An offer that
 * would cost more than it earns is capped, not honoured — and the cap is
 * arithmetic in one place rather than a judgement made per campaign.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING HERE INVENTS SCARCITY
 * ══════════════════════════════════════════════════════════════════════
 *
 * `config/legal.js` names thirteen dark patterns from the CCPA 2023
 * guidelines. Three of them live exactly where offers do:
 *
 *   false_urgency    a countdown on an offer that does not expire
 *   fake_scarcity    "only 3 left" when there is no limit
 *   basket_sneaking  a discount that quietly needs something added
 *
 * So an `endsAt` here is a real date the offer really stops on, a
 * `minSpendPaise` is stated on the card before it is claimed, and no
 * offer is ever revealed only after a customer has committed.
 *
 * ── Pre-launch honesty ───────────────────────────────────────────────
 * These are funded by Sambramo, which currently has no revenue. They are
 * a customer-acquisition cost with a number attached, and `LAUNCH_BUDGET`
 * is what it is allowed to total. Not decoration — the admin console
 * reads it.
 */

/** What the whole launch campaign may cost, in rupees. */
export const LAUNCH_BUDGET = 50_000

export const OFFERS = [
  {
    id: 'first_booking_300',
    // What the card shouts. Short enough to read at arm's length.
    headline: 'Flat ₹300 off',
    // What it actually means, before it is claimed.
    scan: 'On your first booking with Sambramo',
    kind: 'flat',
    valuePaise: 30_000,
    // ₹8,000, not ₹2,000. The platform earns 8%, so a ₹2,000 basket
    // yields ₹160 of margin and a "flat ₹300 off" headline would be
    // capped to ₹160 every single time — a promise the arithmetic
    // cannot keep. At ₹8,000 the margin is ₹640 and the ₹300 is real.
    minSpendPaise: 800_000,
    firstBookingOnly: true,
    endsAt: '2026-12-31',
    tone: 'saffron',
  },
  {
    id: 'four_services_8',
    headline: '4% off',
    // 4, not 8. The platform fee IS 8%, so an 8% discount hands over the
    // entire margin and the booking earns nothing — the discount would
    // be capped to the margin and Sambramo would work for free. Half the
    // margin is a real offer that still leaves a business.
    scan: 'When you book four or more masters together',
    kind: 'percent',
    percent: 4,
    maxPaise: 200_000,               // ₹2,000 ceiling, stated
    minLines: 4,
    endsAt: '2026-12-31',
    tone: 'forest',
    // The commercial reason, kept next to the offer so a future reader
    // knows what it was FOR: a four-line basket is the only shape where
    // one dispatch earns enough to cover acquiring the customer at all.
    why: 'A full basket is the only booking whose margin covers its own CAC.',
  },
  {
    id: 'weekday_5',
    headline: '3% off weekdays',
    scan: 'Monday to Thursday events',
    kind: 'percent',
    percent: 3,
    maxPaise: 150_000,
    weekdaysOnly: true,
    endsAt: '2026-12-31',
    tone: 'plum',
    why: 'Supply idles Monday to Thursday and is oversubscribed on Saturdays. This moves demand into the trough rather than buying more of the peak.',
  },
]

const byId = Object.fromEntries(OFFERS.map(o => [o.id, o]))

/**
 * Which offers this basket genuinely qualifies for.
 *
 * Returns them ALL, best first, rather than silently picking one. The
 * customer sees what they have and what they nearly have — an offer they
 * are ₹300 short of is worth showing as exactly that, and hiding it
 * would be the sneaking pattern in reverse.
 */
export function offersFor({ subtotalPaise = 0, lineCount = 0, eventDate = null, isFirstBooking = false, now = new Date() }) {
  const day = eventDate ? new Date(eventDate + 'T00:00:00').getDay() : null

  return OFFERS
    .map(o => {
      const live = !o.endsAt || new Date(o.endsAt) >= now
      const reasons = []

      if (!live) reasons.push('ended')
      if (o.firstBookingOnly && !isFirstBooking) reasons.push('not your first booking')
      if (o.minSpendPaise && subtotalPaise < o.minSpendPaise) {
        reasons.push(`add ₹${Math.round((o.minSpendPaise - subtotalPaise) / 100).toLocaleString('en-IN')} more`)
      }
      if (o.minLines && lineCount < o.minLines) {
        reasons.push(`add ${o.minLines - lineCount} more service${o.minLines - lineCount === 1 ? '' : 's'}`)
      }
      if (o.weekdaysOnly && day !== null && (day === 0 || day === 6)) reasons.push('weekdays only')

      return {
        ...o,
        eligible: reasons.length === 0,
        // The single most useful string on the card when it does NOT
        // apply: what would make it apply.
        blockedBy: reasons[0] ?? null,
        discountPaise: reasons.length === 0 ? rawDiscount(o, subtotalPaise) : 0,
      }
    })
    .sort((a, b) => (b.eligible - a.eligible) || (b.discountPaise - a.discountPaise))
}

function rawDiscount(offer, subtotalPaise) {
  if (offer.kind === 'flat') return Math.min(offer.valuePaise, subtotalPaise)
  const pct = Math.round(subtotalPaise * (offer.percent / 100))
  return Math.min(pct, offer.maxPaise ?? pct)
}

/**
 * What the customer actually saves, after the margin cap.
 *
 * ── The cap is not a technicality ────────────────────────────────────
 * Sambramo earns PLATFORM_FEE_RATE of the basket. A discount larger than
 * that means paying the masters out of pocket for the privilege of the
 * booking. That is a decision somebody can take deliberately for a
 * campaign; it must never happen because an offer was written without
 * anybody doing the arithmetic.
 *
 * When it binds, `capped` says so — the admin console shows it, because
 * an offer that is permanently capped is an offer whose headline is a
 * number no customer will ever get.
 */
export function applyOffer(offerId, subtotalPaise) {
  const offer = byId[offerId]
  if (!offer) return { discountPaise: 0, capped: false }

  const wanted = rawDiscount(offer, subtotalPaise)
  const margin = Math.floor(subtotalPaise * PLATFORM_FEE_RATE)
  const given = Math.min(wanted, margin)

  return {
    offerId,
    discountPaise: given,
    capped: given < wanted,
    marginPaise: margin,
    // Stated for the ledger. The master is paid in full and this is what
    // Sambramo gave up to make that true.
    fundedBy: 'platform',
  }
}

export const offerById = id => byId[id] ?? null
