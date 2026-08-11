import { CELEBRATION_TIERS, PLATFORM_FEE_RATE, batchBandFor } from '../data/celebrationTiers'
import { CUISINES } from '../data/cuisineMenus'
import { DECOR_LEVEL_BY_ID, decorStretch } from '../data/decorPackages'

/**
 * What a tier actually costs, and what share of that is our fee.
 *
 * Two things this exists to fix, both about the same number.
 *
 * ── 1. The cards showed a coordination fee in rupees ───────────────────
 * "Coordination ₹1,60,000" is a true number presented in the way most likely
 * to lose the customer. Read cold, with no total beside it, it is the largest
 * figure on the card and it is attached to the least tangible thing we sell —
 * so the biggest number on screen is the one for "admin". People do not price
 * a celebration that way; they price it per head and then ask what the planner
 * takes.
 *
 * As a percentage the same fee is a far better argument. Full-service wedding
 * planners in India charge 10–15% of total budget, and day-of coordination
 * under 5% (velvetknot.in, partycruisersindia.com, panigrahana.com, 2026
 * guides). Sambramo's flat fees work out at 7–9% of a typical celebration at
 * every rung — under the market at all eight, and completely invisible while
 * the same number was written as a lakh and a half.
 *
 * ── Which denominator, and why it matters ──────────────────────────────
 * The ratio is computed at the tier's *typical* guest count, not its minimum.
 * That is the fair reading and it was worth getting right: a fixed fee over
 * the smallest possible total is the ratio's worst case, and computing it
 * that way put Close Circle at 13% — inside the very market band we claim to
 * beat. The fee has not changed; only an arbitrary choice of denominator had
 * made it look worse than it is.
 *
 * The floor price below still uses the minimum, because "from" is a question
 * about the cheapest real booking. Each number uses the denominator that
 * answers its own question, and neither is picked to flatter.
 *
 * Nothing about what is charged changes here. `coordinationFee` stays the
 * quote's real line item and buildQuote still adds it as rupees. This module
 * only computes the ratio so a marketing surface can state it honestly.
 *
 * ── 2. Nothing told you where a tier starts ────────────────────────────
 * A card saying "30–75 guests" with no money on it cannot answer "can I
 * afford this", which is the only question that matters at that moment. The
 * floor below is a real one, computed from the same constants the builder
 * uses — the cheapest cuisine at the tier's own batch band, the tier's own
 * default decor stretched to its own smallest guest count, plus coordination
 * and the platform fee.
 *
 * It is deliberately a *floor*, described as "from", and it is genuinely
 * reachable: it is what the cheapest real configuration of this tier costs.
 * That is the opposite of the usual "starting at" number, which is reachable
 * only by a configuration nobody would book.
 */

/** The cheapest per-plate base across all cuisines — the honest floor for catering. */
const CHEAPEST_BASE_PLATE = Math.min(...CUISINES.map(c => c.basePlate).filter(Boolean))

/** The cheapest real total for this tier at a given headcount. */
function totalAt(tier, guests) {
  const band = batchBandFor(guests)

  // Catering at the cheapest cuisine, no premium dishes, no extras.
  const catering = Math.round(CHEAPEST_BASE_PLATE * band.multiplier) * guests

  // The tier's own default decor, stretched the way decorCostFor stretches it.
  const level = DECOR_LEVEL_BY_ID[tier.defaultDecor]
  const decor = level
    ? Math.round(level.fixedCost * decorStretch(level, guests)) + level.perGuestTouch * guests
    : 0

  const subtotal = catering + decor + tier.coordinationFee
  return subtotal + Math.round(subtotal * PLATFORM_FEE_RATE)
}

/**
 * The floor price, the per-guest figure, and the fee's share.
 *
 * `from` is rounded to ₹500: this is an indicative floor and quoting it to the
 * rupee implies a precision the estimate does not have. The builder is where
 * an exact number comes from.
 */
export function tierEconomics(tier) {
  if (!tier?.guests?.min || !tier.coordinationFee) return null

  const floor = totalAt(tier, tier.guests.min)
  // The typical celebration at this tier — the fair denominator for "what
  // share of this is your fee". See the note above on why it is not the floor.
  const typical = totalAt(tier, tier.guests.typical ?? tier.guests.min)

  return {
    from: Math.round(floor / 500) * 500,
    perGuest: Math.round(floor / tier.guests.min),
    // Rounded to a whole percent — "5.4%" reads as an accountant's number and
    // invites arithmetic; "5%" reads as a policy.
    coordinationPct: Math.max(1, Math.round((tier.coordinationFee / typical) * 100)),
  }
}

/** Precomputed for every tier, so a card renders without doing this per paint. */
export const TIER_ECONOMICS = Object.fromEntries(
  CELEBRATION_TIERS.map(t => [t.id, tierEconomics(t)])
)

/**
 * The market band we undercut, kept here so the claim and the comparison can
 * never drift apart on different screens.
 *
 * Sourced from 2026 Indian wedding-planner pricing guides, which agree on
 * 10–15% for full service. Stated as a range because that is what the sources
 * say; picking the top of it to flatter ourselves would be the same dishonesty
 * as a struck-through price.
 */
export const MARKET_PLANNER_FEE = { min: 10, max: 15 }

/** The best (lowest) coordination share across the ladder — for a headline claim. */
export const BEST_COORDINATION_PCT = Math.min(
  ...Object.values(TIER_ECONOMICS).filter(Boolean).map(e => e.coordinationPct)
)

/**
 * Two real photographs per tier, chosen for scale rather than for occasion.
 *
 * The tier cards carried an emoji and nothing else, which is the one place on
 * the home screen where a customer is being asked to picture the size of their
 * own event — exactly what a photograph does and a 🎪 does not.
 *
 * The decor library is keyed by occasion, so these are picked by what the room
 * actually looks like at that headcount: an intimate table for Close Circle, a
 * full hall for Grand, a mandap and marquee at the top. A wedding mandap over
 * "Close Circle" would sell the wrong thing to the person who wants thirty
 * people on a terrace.
 *
 * Two rather than four: these cards are 210px in a rail that is already
 * moving, and a second frame is enough to say "there is more of this" without
 * two motions competing.
 */
export const TIER_PHOTO_KEYS = {
  close_circle:      ['get_together/lounge', 'anniversary/candle-dinner'],
  house_full:        ['birthday/full-party', 'get_together/terrace'],
  full_celebration:  ['engagement/full-engagement', 'birthday/theme-room'],
  special_day:       ['engagement/ring-stage', 'sangeet/full-sangeet'],
  grand:             ['wedding/reception-stage', 'sangeet/dance-floor'],
  royal_mysuru:      ['wedding/mandap', 'wedding/full-wedding'],
  maha_samavesha:    ['wedding/full-wedding', 'corporate_event/full-corporate'],
  jana_sagara:       ['wedding/entrance', 'corporate_event/stage-branding'],
}
