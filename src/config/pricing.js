/**
 * How a price behaves between the day it is quoted and the day it is paid.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROBLEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * A family books a wedding in March for the following October. Seven
 * months of onion, tomato and cooking-oil prices sit between the quote and
 * the meal. Quoting March's number and honouring it in October means the
 * business eats every rupee of that drift; quoting a number that floats
 * freely means the family cannot plan, and will not commit.
 *
 * Both of those are real failures and the honest answer is neither.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT ACTUALLY MOVES — measured, not assumed
 * ══════════════════════════════════════════════════════════════════════
 *
 * data/marketRates.js already establishes this and its reasoning is not
 * repeated here. The short version:
 *
 *   provisions   ~58% of a plate.  MOVES, HARD — seasonal swings of
 *                15–40% on onion and tomato are ordinary. And it is the
 *                one component with a real public daily feed: Agmarknet
 *                mandi prices on data.gov.in.
 *
 *   kitchen      Wage-linked. Drifts annually, not daily.
 *   service      Wage-linked. Same.
 *   decor        Flowers do move, sharply, around festivals — but there
 *                is no open feed, so any number we printed would be
 *                invented.
 *
 *   photography, DJ, furniture, lighting, venue rent
 *                Effectively flat over a year. A photographer's day rate
 *                is not a commodity.
 *
 * So on a ₹4,00,000 wedding with ₹2,00,000 of catering, roughly
 * ₹1,16,000 — about 29% of the total — is genuinely exposed. The other
 * 71% is not, and repricing it would be inventing movement we cannot
 * evidence. That is the line this file draws.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT REPRICE DAILY, WHICH IS THE OBVIOUS THING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Because a quote that changes every time the customer opens the app is
 * not a quote. It is a ticker, and nobody signs a wedding contract
 * against a ticker. The customer's rational response to a number that
 * moved twice while they were deciding is to stop believing any of it and
 * ring the caterer their cousin used.
 *
 * Daily refresh of the INDEX is right and is what
 * scripts/refresh-market-rates.mjs does. Daily restatement of a CUSTOMER'S
 * AGREED PRICE is not. The index moves continuously; the customer's
 * number moves at three announced moments and never silently.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DESIGN: locked core, collared float, three checkpoints
 * ══════════════════════════════════════════════════════════════════════
 */

import { COMPONENTS } from '../data/marketRates'

/** Bump when any rule below changes. Stamped onto every quote. */
export const PRICING_VERSION = '2026.08-collar-v1'

/**
 * Instant bookings do not float. At all.
 *
 * The customer pays the full amount into escrow at the moment of booking
 * (migration 062 holds it against the line), so there is no later moment
 * at which a different number could be charged — the money is already
 * held. Repricing after payment would be a post-purchase price change,
 * which is exactly what the CCPA's 2023 dark-pattern guidelines prohibit.
 *
 * The exposure being given up is small: 1–3% of commodity drift over a
 * week or a month, well inside margin, against the entire trust
 * proposition of "the price you see is the price you pay."
 */
export const INSTANT_HORIZON_DAYS = 30

/**
 * How far out a quote has to be before floating is worth the complexity.
 *
 * Under 30 days the drift does not repay the explanation it costs. Over
 * 90 days it is the single largest uncertainty in the quote and hiding it
 * would be the dishonest choice.
 */
export const FLOAT_MIN_DAYS = 30

/**
 * The collar. This is the product, not a technicality.
 *
 * An unbounded "your price may change" is unsellable to a family planning
 * a wedding — it converts a decision into an open-ended risk, and they
 * will take the fixed quote from anyone who offers one.
 *
 * A BOUNDED float is better than a fixed price, and this is the part
 * worth understanding: the customer keeps the downside and is protected
 * on the upside. If mandi rates fall, they pay less. If they rise beyond
 * the cap, Sambramo absorbs the difference.
 *
 * That is a real promise costing real money in a bad season, and it is
 * the reason a family chooses a platform over the caterer their cousin
 * used. Commodity-exposed catering contracts have worked this way for
 * decades; nothing here is novel except saying it in an app.
 *
 * `cap` is deliberately tighter than `floor`: being charged 8% more than
 * you planned is a much worse experience than being charged 15% less is a
 * good one, and the asymmetry should favour the customer.
 */
export const COLLAR = {
  /** Most the floating part may ever rise, whatever the market does. */
  cap: 0.08,
  /** Most it may fall — below this the saving is still passed on in full. */
  floor: 0.15,
}

/**
 * When a floating quote is restated. Three moments, all announced.
 *
 * Not continuous, and not a surprise on the invoice. Each checkpoint
 * sends a notification that says WHICH component moved and BY HOW MUCH —
 * "tur dal and tomato are up this fortnight, your food estimate moves
 * from ₹2,00,000 to ₹2,06,400" — because a price change with a reason is
 * a market, and a price change without one is a platform helping itself.
 */
export const CHECKPOINTS = [
  {
    id: 'quoted',
    at: null,
    label: 'Your estimate',
    copy: 'What today’s rates give. The parts that do not move are locked from here.',
  },
  {
    id: 'revision',
    daysBefore: 30,
    label: 'One month before',
    copy: 'We re-check the market once, a month out, and tell you if the food estimate moved.',
  },
  {
    id: 'final',
    daysBefore: 7,
    label: 'Final price',
    copy: 'Confirmed a week before. This is the number you pay — it does not move again.',
  },
]

/**
 * Which cost components float and which are locked at quote time.
 *
 * Derived from `COMPONENTS.tracked` in data/marketRates.js rather than
 * listed again here, so a component gaining a real feed starts floating
 * by editing ONE file. Two hand-maintained lists would eventually
 * disagree about whether flowers are tracked, and the disagreement would
 * show up as a price nobody could explain.
 */
export const FLOATING_COMPONENTS = Object.entries(COMPONENTS)
  .filter(([, meta]) => meta.tracked)
  .map(([key]) => key)

export const LOCKED_COMPONENTS = Object.entries(COMPONENTS)
  .filter(([, meta]) => !meta.tracked)
  .map(([key]) => key)

/** Days between an event and now. Negative once the date has passed. */
export function daysUntil(eventDate) {
  if (!eventDate) return null
  const then = eventDate instanceof Date ? eventDate : new Date(eventDate)
  if (Number.isNaN(then.getTime())) return null
  return Math.ceil((then.getTime() - Date.now()) / 86_400_000)
}

/**
 * Does this booking float, and if so what is the customer promised?
 *
 * One function, so the quote screen, the receipt, the tracker and the
 * pre-book journey cannot describe the same booking differently. A
 * customer who reads "locked" on one screen and "estimate" on the next
 * has been told the app does not know what it sold them.
 */
export function priceBehaviour(eventDate, { bucket = 'instant' } = {}) {
  const days = daysUntil(eventDate)

  if (bucket === 'instant' || days === null || days <= FLOAT_MIN_DAYS) {
    return {
      floats: false,
      days,
      headline: 'This price is locked.',
      detail: 'What you see is what you pay. It does not change between now and the day.',
    }
  }

  return {
    floats: true,
    days,
    lockedComponents: LOCKED_COMPONENTS,
    floatingComponents: FLOATING_COMPONENTS,
    cap: COLLAR.cap,
    floor: COLLAR.floor,
    checkpoints: CHECKPOINTS,
    headline: `Locked, except the food — and that is capped at +${Math.round(COLLAR.cap * 100)}%.`,
    detail:
      `Decoration, photography, furniture and every other line are fixed from today. ` +
      `Only groceries move with the market, and never more than ` +
      `${Math.round(COLLAR.cap * 100)}% above today’s estimate — if rates fall, you pay less. ` +
      `We re-check a month before and confirm the final number a week before the day.`,
  }
}

/**
 * Apply the collar to a floating component's multiplier.
 *
 * Clamped BOTH ways and at the boundary, so no path through the quote
 * engine can produce a number outside what the customer was promised —
 * including a bug in the index refresh, which is exactly the case a
 * promise has to survive.
 */
export function collar(multiplier) {
  const m = Number(multiplier)
  if (!Number.isFinite(m) || m <= 0) return 1
  return Math.min(1 + COLLAR.cap, Math.max(1 - COLLAR.floor, m))
}
