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
// In practice that means every figure below traces to one of exactly four
// mechanisms, and there is deliberately no fifth:
//
//   1. A row in `coupons` — validated by the same `validate_coupon` RPC the
//      cart calls, with the same min-order and cap rules applied here as
//      there. If the row is not live, nothing is shown.
//   2. The delivery-fee waiver — DELIVERY_FEE and FREE_DELIVERY_THRESHOLD
//      from config/shop, plus the first-order condition the cart enforces.
//   3. The bundle discount inside buildQuote — real arithmetic the quote
//      engine already performs, measured here by pricing the same
//      configuration both ways and subtracting.
//   4. The batch band — the bulk plate rate a large headcount genuinely earns,
//      already applied by perPlateFor.
//
// What is NOT in here, and must not be added: a struck-through "was" price.
// `products` has one price column and no MRP, so any anchor would have to be
// invented. MarketProductCard already says this in its header and it stays
// true here — the saving shown is the one somebody will actually receive.
//
// ── Why the celebration saving is measured, not calculated ──────────────
// It would be easy to report `subtotal × 10%` as the bundle saving. It would
// also be wrong, and wrong in our own favour by less than it looks: the
// discount comes off before the platform fee, so the fee shrinks with it, and
// tax is computed on the discounted components. The real saving is therefore
// bigger than the headline rate — and the only reliable way to know it is to
// price the same celebration twice and subtract. That is what
// `celebrationSavings` does.

import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../config/shop'
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
export function couponValue(amount, coupon) {
  const total = Number(amount) || 0
  if (!coupon || total <= 0) return null

  const min = Number(coupon.min_order_amount ?? 0)
  if (total < min) return null

  const uncapped = coupon.discount_type === 'percent'
    ? (total * Number(coupon.discount_value)) / 100
    : Number(coupon.discount_value)

  const ceiling = coupon.discount_type === 'percent' && coupon.max_discount
    ? Number(coupon.max_discount)
    : Infinity

  // Never more than the order itself — the RPC clamps this too, and a coupon
  // that appears to pay you to shop is a support ticket.
  const value = Math.min(uncapped, ceiling, total)

  return {
    coupon,
    code: coupon.code,
    amount: Math.round(value),
    capped: value < uncapped,
    ceiling: Number.isFinite(ceiling) ? ceiling : null,
  }
}

/**
 * The best coupon this amount already qualifies for, as rupees.
 *
 * Compared at real capped value rather than by headline rate, so a "20% off up
 * to ₹150" cannot outrank a flat ₹300 it would never beat. This is the same
 * comparison `bestOfferFor` in hooks/usePublicOffers makes; it returns the
 * coupon and this returns what the coupon is worth.
 */
export function bestCouponValue(amount, coupons = []) {
  let best = null
  for (const c of coupons) {
    const v = couponValue(amount, c)
    if (v && (!best || v.amount > best.amount)) best = v
  }
  return best
}

/**
 * The coupon just out of reach, and how far.
 *
 * This is the single most useful thing this module computes, and the shop had
 * no way to say it. A customer holding ₹1,287 of cake is ₹212 from a code
 * worth ₹400 to them, and nothing on the screen knew that — so the offer
 * strip advertised SAMBRAMO15 to somebody who could not use it, which teaches
 * them to ignore the strip.
 *
 * Only counts an upgrade as worth naming if it beats what they can already
 * claim by `minGain`. Nudging somebody to spend ₹212 to save ₹30 more than
 * they were already saving is a trick, and it is the kind a customer works out
 * exactly once.
 */
export function nextCouponUnlock(amount, coupons = [], { minGain = 50 } = {}) {
  const total = Number(amount) || 0
  if (total <= 0) return null

  const current = bestCouponValue(total, coupons)?.amount ?? 0

  let best = null
  for (const c of coupons) {
    const min = Number(c.min_order_amount ?? 0)
    if (min <= total) continue                     // already qualifies

    const shortfall = Math.round(min - total)
    // Value it at the threshold, which is the cheapest basket that unlocks it
    // — the honest figure to quote, and never an overstatement.
    const at = couponValue(min, c)
    if (!at) continue

    const gain = at.amount - current
    if (gain < minGain) continue
    // Spending more than the coupon returns is not an unlock, it is a
    // suggestion to spend money. Only offered when the gap is smaller than
    // what clearing it is worth.
    if (shortfall > at.amount) continue

    if (!best || shortfall < best.shortfall) {
      best = { coupon: c, code: c.code, shortfall, worth: at.amount, gain, threshold: min }
    }
  }
  return best
}

/**
 * The delivery fee, and whether this basket has earned its way out of it.
 *
 * Mirrors ShopCart exactly, including the part that is easy to get wrong: free
 * delivery is a *first-order* offer, not a standing one. Telling a returning
 * customer they are ₹200 from free delivery they can no longer get is worse
 * than saying nothing, so `eligible` is false for them and `shortfall` is null
 * rather than a number.
 */
export function deliverySavings({ subtotal, isFirstOrder }) {
  const total = Number(subtotal) || 0
  const eligible = isFirstOrder === true

  if (total <= 0) return { fee: 0, waived: false, saved: 0, eligible, shortfall: null }

  const waived = eligible && total >= FREE_DELIVERY_THRESHOLD
  return {
    fee: waived ? 0 : DELIVERY_FEE,
    waived,
    saved: waived ? DELIVERY_FEE : 0,
    eligible,
    // Only a real, closable gap. Null for a returning customer and null once
    // it is already cleared.
    shortfall: eligible && !waived ? Math.round(FREE_DELIVERY_THRESHOLD - total) : null,
  }
}

/**
 * Everything a shop basket saves, as one stack of named lines.
 *
 * Returns lines rather than a single figure because "you saved ₹449" with no
 * breakdown is a claim, and a claim about money is exactly the thing people
 * check. Each line names its own mechanism, and the sum is the headline.
 *
 * `appliedCoupon` is the one the customer has actually applied at checkout
 * (the RPC's response). When present it is used verbatim — the server's figure
 * always wins over ours, so the two can never disagree on screen. When absent
 * we show the best one available as *claimable*, clearly separated from what
 * has already been earned.
 */
export function basketSavings({
  subtotal,
  coupons = [],
  isFirstOrder,
  appliedCoupon = null,
}) {
  const total = Number(subtotal) || 0
  const delivery = deliverySavings({ subtotal: total, isFirstOrder })

  const earned = []
  if (delivery.waived) {
    earned.push({
      key: 'delivery',
      label: 'Free delivery',
      detail: 'First order over ' + inr(FREE_DELIVERY_THRESHOLD),
      amount: delivery.saved,
    })
  }
  if (appliedCoupon?.discount_amount > 0) {
    earned.push({
      key: 'coupon',
      label: appliedCoupon.code,
      detail: 'Coupon applied',
      amount: Math.round(Number(appliedCoupon.discount_amount)),
    })
  }

  // What they could still take, in the order they can take it. A claimable
  // saving is never added to the earned total — that conflation is how a
  // "you saved ₹700" badge ends up over a bill that saved ₹250.
  const claimable = []
  if (!appliedCoupon) {
    const best = bestCouponValue(total, coupons)
    if (best) {
      claimable.push({
        key: 'coupon',
        label: `Use ${best.code}`,
        detail: best.capped
          ? `${best.coupon.discount_value}% off, capped at ${inr(best.ceiling)}`
          : 'Applies at checkout',
        amount: best.amount,
        code: best.code,
      })
    }
  }

  const unlock = nextCouponUnlock(total, coupons)
  const saved = earned.reduce((sum, l) => sum + l.amount, 0)

  return {
    subtotal: total,
    delivery,
    earned,
    claimable,
    /** The saving already banked — the only figure a "you saved" badge may use. */
    saved,
    /** Banked plus one tap away, for a "worth up to" line that says so. */
    potential: saved + claimable.reduce((sum, l) => sum + l.amount, 0),
    /** The nearest threshold worth crossing, or null. Drives the nudge copy. */
    unlock,
    /** The single most useful thing to tell them right now. */
    nudge: buildNudge({ delivery, unlock, claimable }),
  }
}

/**
 * One sentence, chosen by which action is worth the most to the customer.
 *
 * Deliberately one and not three. A basket page with a delivery nudge, a
 * coupon nudge and an unlock nudge stacked on it has told the customer to do
 * three things, which reliably produces none of them.
 *
 * Ordered by what they get back per rupee asked, not by what we would prefer
 * they do: an unclaimed coupon costs them nothing and comes first.
 */
function buildNudge({ delivery, unlock, claimable }) {
  if (claimable.length > 0) {
    const c = claimable[0]
    return {
      kind: 'claim',
      tone: 'ready',
      amount: c.amount,
      code: c.code,
      text: `Use ${c.code} at checkout and take ${inr(c.amount)} off.`,
    }
  }
  // Free delivery first when both are open: it is almost always the smaller
  // gap, and a customer who clears it often clears the coupon on the way.
  if (delivery.shortfall != null && delivery.shortfall > 0
      && (!unlock || delivery.shortfall <= unlock.shortfall)) {
    return {
      kind: 'delivery',
      tone: 'near',
      amount: DELIVERY_FEE,
      shortfall: delivery.shortfall,
      text: `Add ${inr(delivery.shortfall)} more and delivery is free — ${inr(DELIVERY_FEE)} saved.`,
    }
  }
  if (unlock) {
    return {
      kind: 'unlock',
      tone: 'near',
      amount: unlock.worth,
      shortfall: unlock.shortfall,
      code: unlock.code,
      text: `${inr(unlock.shortfall)} more unlocks ${unlock.code} — ${inr(unlock.worth)} off.`,
    }
  }
  return null
}

/**
 * What booking the whole celebration saves over booking the same pieces
 * one at a time.
 *
 * Measured rather than calculated, for the reason in this file's header: the
 * bundle discount comes off before the platform fee and before tax is applied
 * to the components, so the true saving exceeds the headline 10%. Pricing the
 * identical configuration in both modes and subtracting is the only way to
 * state that correctly, and it stays correct if the rates or the order of
 * operations in buildQuote ever change.
 *
 * `config` is exactly what the builder passes to buildQuote. Returns null when
 * the configuration cannot be priced or when no bundle is in play, so a
 * caller can render nothing rather than "you saved ₹0".
 *
 * ── `active`, and why the mode is not simply forced ─────────────────────
 * The same figure answers two different questions depending on which door the
 * customer picked. On the whole-celebration door it is money they are getting;
 * on the single-service door it is money they would get by switching. Both are
 * worth showing and they are emphatically not the same sentence — printing
 * "you saved ₹18,400" to somebody who chose to book one service would be
 * claiming a discount they are not receiving.
 *
 * So the mode is read rather than overridden, and `active` says which sentence
 * the caller is allowed to write. A caller that ignores it and prints "saved"
 * either way has reintroduced exactly the dishonesty this module exists to
 * prevent.
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
