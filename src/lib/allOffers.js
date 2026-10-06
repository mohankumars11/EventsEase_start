import { OFFERS } from '../data/celebrationOffers'

/**
 * Every saving in the app, in one shape.
 *
 * ── Why this still exists with one system ─────────────────────────────────
 * There were two offer systems and a customer had no idea they were separate:
 * `coupons` (migration 019) held self-serve shop codes in the database, and
 * `OFFERS` (celebrationOffers) held celebration savings declared in code,
 * because they are promises a coordinator honours on a quote rather than
 * arithmetic a checkout does.
 *
 * The shop went, and its coupons with it. What is left is the half that was
 * always worth more — the first-booking 10%, the early-bird 7%, the
 * repeat-customer 15% and the ₹1,000 referral — and this module is kept
 * rather than inlined because the normalising it does is still load-bearing.
 *
 * ── The `action` a tile renders ───────────────────────────────────────────
 * A celebration offer is not self-serve: the code travels with the enquiry and
 * comes off the quote a human sends back. Rendering it as a "COPY CODE" tile
 * would promise instant money off a wedding and turn a saving into a
 * complaint, which is the failure celebrationOffers documents at length.
 *
 *   'claim'  there is a code and it is quoted against, not deducted
 *   'auto'   it applies itself; there is nothing to copy
 */

/** Palette per offer, by name rather than hex, so tiles stay on-brand. */
const ACCENTS = {
  saffron: { from: '#f59e0b', to: '#b45309', ink: '#3b1f02' },
  emerald: { from: '#1c8560', to: '#0e523c', ink: '#ffffff' },
  plum:    { from: '#7c3aed', to: '#4c1d95', ink: '#ffffff' },
  rose:    { from: '#e879f9', to: '#a21caf', ink: '#ffffff' },
  chilli:  { from: '#e03c2d', to: '#a11f20', ink: '#ffffff' },
}

export function accentOf(name) {
  return ACCENTS[name] ?? ACCENTS.chilli
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

/** Every celebration saving, as tiles. */
export function allOffers() {
  return OFFERS.map(fromCelebration)
}
