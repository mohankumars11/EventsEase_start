import { OFFERS } from '../data/celebrationOffers'
import { formatINR } from '../utils/format'

/**
 * Every saving in the app, in one shape.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Sambramo has two completely separate offer systems and a customer has no
 * idea they are separate:
 *
 *   `coupons` (migration 019)   Shop codes. Live rows in the database, filtered
 *                               to exactly what `validate_coupon` will accept at
 *                               checkout. Percent or flat, with a minimum and a
 *                               cap. Fetched by usePublicOffers.
 *   `OFFERS` (celebrationOffers) Celebration savings. Declared in code because
 *                               they are promises a coordinator honours on a
 *                               quote rather than arithmetic a checkout does.
 *
 * The home screen showed the first and not the second, so the four biggest
 * savings in the business — the first-booking 10%, the early-bird 7%, the
 * repeat-customer 15% and the ₹1,000 referral — appeared nowhere a customer
 * would find them. Those are the ones attached to the half of the business the
 * revenue comes from.
 *
 * ── They are not the same kind of promise, and the card must say so ───────
 * This is the reason this file normalises rather than concatenates. A shop
 * coupon is self-serve: copy the code, paste it at checkout, the discount is
 * arithmetic and immediate. A celebration offer is not — the code travels with
 * the enquiry and comes off the quote a human sends back. Showing both as
 * identical "COPY CODE" tiles would promise instant money off a wedding and
 * turn a saving into a complaint, which is the exact failure celebrationOffers
 * documents at length.
 *
 * So every offer carries `action`:
 *
 *   'copy'   there is a code and copying it does something right now
 *   'claim'  there is a code and it is quoted against, not deducted
 *   'auto'   it applies itself; there is nothing to copy
 *
 * and the tile renders a different control for each.
 */

/** Palette per offer, by name rather than hex, so tiles stay on-brand. */
const ACCENTS = {
  saffron: { from: '#f59e0b', to: '#b45309', ink: '#3b1f02' },
  emerald: { from: '#1c8560', to: '#0e523c', ink: '#ffffff' },
  plum:    { from: '#7c3aed', to: '#4c1d95', ink: '#ffffff' },
  rose:    { from: '#e879f9', to: '#a21caf', ink: '#ffffff' },
  chilli:  { from: '#e03c2d', to: '#a11f20', ink: '#ffffff' },
}
const ACCENT_ORDER = ['chilli', 'saffron', 'plum', 'emerald', 'rose']

export function accentOf(name) {
  return ACCENTS[name] ?? ACCENTS.chilli
}

/**
 * A shop coupon, as a tile.
 *
 * The condition is on the tile rather than in fine print: "15% off" that turns
 * out to need ₹1,499 is the moment a customer stops believing the next banner.
 */
function fromCoupon(row, i) {
  const percent = row.discount_type === 'percent'
  const headline = percent
    ? `${Number(row.discount_value)}% OFF`
    : `${formatINR(row.discount_value)} OFF`

  const min = Number(row.min_order_amount ?? 0)
  const cap = percent && row.max_discount ? Number(row.max_discount) : null

  return {
    id: `coupon-${row.id}`,
    scope: 'shop',
    scopeLabel: 'Shop',
    headline,
    cap: cap ? `up to ${formatINR(cap)}` : null,
    name: row.description || 'On the shop',
    condition: min > 0 ? `on orders above ${formatINR(min)}` : 'on any order',
    code: row.code,
    action: 'copy',
    // Deterministic rather than random: the same coupon keeps the same colour
    // across renders and reloads, so the grid does not reshuffle its palette
    // every time somebody opens the app.
    accent: ACCENT_ORDER[i % ACCENT_ORDER.length],
    to: '/shop',
  }
}

/** A celebration offer, as a tile. */
function fromCelebration(offer) {
  return {
    id: `celebration-${offer.id}`,
    scope: 'celebration',
    scopeLabel: 'Celebrations',
    headline: offer.headline,
    cap: null,
    name: offer.name,
    condition: offer.blurb,
    code: offer.code ?? null,
    // `automatic` offers have nothing to copy — the bundle saving and the
    // repeat-customer credit apply themselves — and a "COPY" button on one is
    // a control that does nothing.
    action: offer.automatic || !offer.code ? 'auto' : 'claim',
    accent: offer.accent ?? 'plum',
    to: offer.kind === 'referral' ? '/account' : '/plan',
  }
}

/**
 * Everything, celebration savings first.
 *
 * That order is deliberate and it is a business decision rather than a visual
 * one: celebrations are the primary revenue line and their offers are worth
 * thousands of rupees against a shop coupon's tens, so they lead. Within the
 * shop coupons the hook has already sorted by discount value.
 */
export function allOffers(coupons = []) {
  return [
    ...OFFERS.map(fromCelebration),
    ...coupons.map(fromCoupon),
  ]
}
