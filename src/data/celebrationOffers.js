// What a customer can actually save, and how they earn the next one.
//
// ── Why these live in one file ──────────────────────────────────────────
// An offer is a promise the company has to honour. Typed into a card in JSX
// it becomes a promise nobody can find, nobody reviews and nobody can turn
// off — and the first time marketing changes "15%" to "10%" there are three
// screens still saying the old number. Everything a customer is told they
// will save is declared here, once, and every surface reads it.
//
// ── The honesty rule these are built around ─────────────────────────────
// None of this is a self-applying discount, and no card in the app pretends
// it is. The quote engine (utils/quote.js) prices the celebration; it does
// NOT subtract coupons, because Sambramo is human-assisted — a coordinator
// confirms vendor availability and sends a final figure to approve, and that
// is the document where a discount is real.
//
// So an "applied" offer here means exactly one thing: the code travels with
// the enquiry, in the note the coordinator reads, and comes off the
// confirmed quote. That is stated on the card in those words. The
// alternative — showing a struck-through total the backend has never heard
// of — is the single fastest way to turn a saving into a complaint.
//
// The one genuine exception is `bundle`, which IS arithmetic: the 10%
// whole-celebration saving is applied by buildQuote before the platform fee
// and is visible in the breakdown. It is listed here so the offers rail can
// show the customer a saving they have already earned rather than only ones
// they have to claim, but it carries `automatic: true` and has no code.
//
// ── These numbers need a business sign-off ──────────────────────────────
// Same status as the rates in data/taxes.js: they are defensible launch
// figures, not approved ones. `referral` in particular moves real money in
// both directions and should not go live on my say-so.

/**
 * What holding a date costs, re-exported for the offers copy so the rail and
 * the payment step cannot disagree about the number.
 */
export { LOCK_AMOUNT } from './celebrationTiers'

/** Book 60+ days ahead and the early-bird applies. */
export const EARLY_BIRD_DAYS = 60

export const OFFERS = [
  {
    id: 'first_booking',
    code: 'SAMBRAMO10',
    kind: 'coupon',
    emoji: '🎁',
    name: 'First celebration with us',
    headline: '10% off',
    blurb: 'Your first booking, on the confirmed quote. Nothing to do but say yes.',
    terms: 'One per customer. Applied to the coordination and décor components, not to per-plate catering.',
    accent: 'saffron',
  },
  {
    id: 'early_bird',
    code: 'EARLY60',
    kind: 'coupon',
    emoji: '🌅',
    name: 'Booked early',
    headline: '7% off',
    blurb: `Set a date ${EARLY_BIRD_DAYS}+ days out and vendors quote us better. We pass it on.`,
    terms: `Needs a date at least ${EARLY_BIRD_DAYS} days ahead on the enquiry. Not combinable with the first-booking offer.`,
    accent: 'emerald',
    // Shown as claimable only when the chosen date actually qualifies —
    // dangling an offer somebody cannot take is worse than not offering it.
    requiresDateDaysOut: EARLY_BIRD_DAYS,
  },
  {
    id: 'next_celebration',
    code: 'AGAIN15',
    kind: 'credit',
    emoji: '🔁',
    name: 'Book this, earn your next',
    headline: '15% off next time',
    // Customer-first, then the reason. The previous line opened on the
    // company's own logic ("Weddings have four functions; families come
    // back"), which is a true and rather good sentence — it just is not the
    // first thing the person reading it wants to know.
    blurb: 'The day this celebration is delivered, your next one starts at 15% off. A wedding is four functions — most families are back within the year.',
    terms: 'Issued after this event is delivered. Valid 12 months. One celebration, not one service.',
    accent: 'plum',
    automatic: true,
  },
  {
    id: 'referral',
    code: null,
    kind: 'referral',
    emoji: '🤝',
    name: 'Refer and earn',
    headline: '₹1,000 each',
    blurb: 'Send a friend who books. They get ₹1,000 off, you get ₹1,000 back — on your bill or by transfer.',
    terms: 'Credited once their event is delivered. No cap on how many friends.',
    accent: 'rose',
  },
]

export const OFFER_BY_ID = Object.fromEntries(OFFERS.map(o => [o.id, o]))

/** The ones a customer claims by tapping, as opposed to earning or being given. */
export const CLAIMABLE_OFFERS = OFFERS.filter(o => o.kind === 'coupon')

/**
 * Is this offer takeable with the configuration on screen right now?
 *
 * Returns a reason rather than false so the card can say *why* — "add a date
 * 60 days out" is actionable, a greyed-out card is not.
 */
export function offerAvailability(offer, { eventDate } = {}) {
  if (!offer.requiresDateDaysOut) return { ok: true }
  if (!eventDate) {
    return { ok: false, reason: 'Add your date on the review step to claim this.' }
  }
  const days = Math.round((new Date(eventDate) - new Date()) / 86_400_000)
  if (days < offer.requiresDateDaysOut) {
    return {
      ok: false,
      reason: `Your date is ${days} day${days === 1 ? '' : 's'} out — this needs ${offer.requiresDateDaysOut}+.`,
    }
  }
  return { ok: true }
}

/**
 * The line that goes into the coordinator's note.
 *
 * This is the entire mechanism by which a claimed coupon becomes a real
 * discount, so it is written for a person reading a phone at 8am and it says
 * what they have to do.
 */
export function offerToNote(offer) {
  if (!offer) return ''
  return [
    '',
    'OFFER CLAIMED BY CUSTOMER',
    `  ${offer.name} — ${offer.headline}${offer.code ? ` (code ${offer.code})` : ''}`,
    `  ${offer.terms}`,
    '  → Apply this to the confirmed quote before sending it back.',
  ].join('\n')
}
