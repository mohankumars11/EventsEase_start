// What this actually saves you, in rupees.
//
// ── The problem this exists to fix ──────────────────────────────────────
// Every saving in the app was stated as a rate. "10% off", "15% off next
// time", "free delivery over ₹999", "booked together (10%)". A rate is not a
// number a person can act on: nobody walks around knowing what 10% of their
// basket is, and the customer who would have added one more item to clear a
// threshold never finds out they were ₹212 away from it. The rate is the
// mechanism; the rupee is the argument.
//
// So every surface that used to print a percentage asks this module for a
// figure instead, and this module is the only place the arithmetic happens.
//
// ── The rule every number in here obeys ─────────────────────────────────
// A saving is only stated if something in the system will actually honour it.
// That is not a style preference, it is the constraint that keeps the app out
// of the one failure mode that costs a young brand its customers: advertising
// a discount the checkout then refuses.
//
// In practice that means every figure below traces to one of exactly two
// mechanisms, and there is deliberately no third:
//
//   1. The bundle discount inside buildQuote — real arithmetic the quote
//      engine already performs, measured here by pricing the same
//      configuration both ways and subtracting.
//   2. The batch band — the bulk plate rate a large headcount genuinely earns,
//      already applied by perPlateFor.
//
// There were two more, and both were the shop's: a live row in `coupons`
// validated by `validate_coupon`, and the delivery-fee waiver over ₹999. The
// storefront is gone and so are they.
//
// What is NOT in here, and must not be added: a struck-through "was" price.
// Nothing in the quote engine carries an MRP, so any anchor would have to be
// invented — the saving shown is the one somebody will actually receive.
//
// ── Why the celebration saving is measured, not calculated ──────────────
// It would be easy to report `subtotal × 10%` as the bundle saving. It would
// also be wrong, and wrong in our own favour by less than it looks: the
// discount comes off before the platform fee, so the fee shrinks with it, and
// tax is computed on the discounted components. The real saving is therefore
// bigger than the headline rate — and the only reliable way to know it is to
// price the same celebration twice and subtract. That is what
// `celebrationSavings` does.

import { buildQuote } from '../utils/quote'
import { batchBandFor } from '../data/celebrationTiers'
import { SERVICE_BY_ID, serviceCost, defaultQty } from '../data/servicePricing'

/**
 * What one coupon is worth against a given amount, or null if it does not
 * apply.
 *
 * The cap and the minimum are applied in the same order `validate_coupon`
 * applies them (migration 019), because this figure and the one the customer
 * sees after tapping Apply have to be the same figure. `capped` is returned
 * so a surface can explain a percent coupon that hit its ceiling rather than
 * leaving the customer to work out why 15% of ₹4,000 came to ₹400.
 */
export function celebrationSavings(config) {
  const bundled = buildQuote({ ...config, mode: 'full' })
  if (!bundled?.bundle?.applied) return null

  // The same celebration with every component identical and the bundle rate
  // off. `individual` is the mode that carries no bundle discount; nothing
  // else about the quote changes with it.
  const separately = buildQuote({ ...config, mode: 'individual' })
  if (!separately) return null

  const total = separately.total - bundled.total
  if (total <= 0) return null

  return {
    /**
     * Is the customer actually receiving this right now?
     *
     * True on the whole-celebration door — say "you are saving". False on the
     * single-service door — say "you would save by booking it together", and
     * never the other word.
     */
    active: config.mode !== 'individual',
    /** The whole saving, including the fee and tax that shrink with it. */
    total: Math.round(total),
    /** The discount line itself, as the quote breakdown shows it. */
    headline: bundled.bundle.amount,
    /** What the fee and tax add on top — the part a percentage never shows. */
    knockOn: Math.round(total - bundled.bundle.amount),
    rate: bundled.bundle.rate,
    /** What they would have paid piece by piece. Not an invented anchor: it is
     *  the same engine pricing the same configuration under the other mode. */
    separately: separately.total,
    withBundle: bundled.total,
    perGuest: bundled.guests ? Math.round(total / bundled.guests) : 0,
  }
}

/**
 * What a large headcount earns on the plate rate.
 *
 * Not a discount and not presented as one — it is the bulk economics the
 * batch bands already apply, and a family at 600 guests genuinely pays less
 * per plate than one at 40. Worth stating because it is money the customer
 * saves without doing anything, and because the alternative reading of the
 * same table ("small events cost more per head") is the one they will reach
 * unaided.
 *
 * Returns null below the standard band, where the multiplier is 1.00 or above
 * — there is nothing to celebrate at 120 guests and inventing something there
 * would make the real figure at 600 less believable.
 */
export function batchSavings({ guestCount, perPlate, band }) {
  const guests = Number(guestCount) || 0
  const rate = Number(perPlate) || 0
  if (guests < 1 || rate <= 0) return null

  const actual = band ?? batchBandFor(guests)
  if (!actual || actual.multiplier >= 1) return null

  // Back out the pre-multiplier plate cost from the rate the quote actually
  // used, so this cannot drift from perPlateFor's own arithmetic.
  const standardPlate = Math.round(rate / actual.multiplier)
  const perPlateSaved = standardPlate - rate
  if (perPlateSaved <= 0) return null

  return {
    label: actual.label,
    perPlate: perPlateSaved,
    standardPlate,
    total: Math.round(perPlateSaved * guests),
  }
}

/**
 * What the tier has already chosen and priced for you.
 *
 * Explicitly NOT a saving, and the wording every caller uses has to keep that
 * straight: `includedServices` are priced into the quote at their normal rate.
 * They are included in the sense of already selected and already counted, and
 * celebrationTiers.js says so in those words.
 *
 * It is still worth a number. "Special Day" pre-selecting six services reads
 * as a label until you see that those six come to ₹1,40,000 of work somebody
 * would otherwise be ringing six vendors about — which is the actual argument
 * for a tier over a list.
 */
export function tierInclusions(tier, guestCount) {
  if (!tier?.includedServices?.length) return null
  const guests = Number(guestCount) || tier.guests?.typical || tier.guests?.min || 0

  const services = tier.includedServices
    .map(id => SERVICE_BY_ID[id])
    .filter(Boolean)
    .map(s => ({ service: s, amount: serviceCost(s, guests, defaultQty(s, guests)) }))

  if (!services.length) return null

  return {
    count: services.length,
    services,
    /** Priced in, not free. Never label this "saved". */
    value: services.reduce((sum, s) => sum + s.amount, 0),
    guests,
  }
}

/** Local ₹ formatter — this module is imported by non-React code too. */
function inr(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}
