// The packages, per occasion — derived from the tier ladder rather than typed
// out a second time.
//
// ── What this replaces ──────────────────────────────────────────────────
// EVENT_DATA used to carry two or three hand-written packages per occasion:
// "Essential Birthday ₹25,000–₹50,000", "Grand Celebration ₹75,000–₹1,50,000",
// "Royal Grand Party ₹2,00,000–₹10,00,000", plus a gift hamper. Four problems,
// and they compounded:
//
//   · The names ranked the buyer. "Essential" is the cheap one and everybody
//     reading it knows so — the exact failure celebrationTiers.js was written
//     to avoid, still shipping on the page a customer actually lands on.
//   · The ranges were invented and could not move. ₹75,000–₹1,50,000 is the
//     same number whether you have forty guests or four hundred, so it answers
//     nobody's question and is wrong for almost everybody.
//   · They contradicted the rest of the app. The home screen, the plan hub and
//     the builder had all moved to the eight scales; only the occasion page
//     was still selling the old three.
//   · The hampers were a shop product wearing a package's clothes, attached to
//     a celebration enquiry that has no checkout.
//
// So there are no hand-written packages any more. An occasion's packages ARE
// the celebration tiers, priced through the same buildQuote() the builder uses,
// with this occasion's own cuisine, this occasion's own services and this
// occasion's default decor. Close Circle for a naming ceremony books a purohit
// and a leaf meal; Close Circle for a birthday books a cake and a balloon
// backdrop. Same rung, same price logic, different celebration.
//
// ── Every number here is an estimate ────────────────────────────────────
// Same standing caveat as the rest of the catalogue: pre-launch, no signed
// supplier, ranges rather than quotes. buildQuote returns a ±5% band and the
// UI shows the band, never the midpoint.

import { CELEBRATION_TIERS, BESPOKE_TIER, TIER_BY_ID } from './celebrationTiers'
import { CUISINE_BY_ID, defaultMenu } from './cuisineMenus'
import { DECOR_LEVEL_BY_ID } from './decorPackages'
import { SERVICE_BY_ID } from './servicePricing'
import { EVENT_DATA } from './eventServicesData'
import { tierContentFor } from './occasionTierContent'
import { buildQuote } from '../utils/quote'

/**
 * What makes a tier *this* occasion rather than a generic one.
 *
 * `cuisine` is the spread a coordinator would propose first if you said
 * nothing — the honest default, not the expensive one. `vegOnly` follows the
 * occasion rather than the market: a naming ceremony and a griha pravesh are
 * vegetarian events in this region, a reception usually is not, and defaulting
 * a ritual meal to mixed is the kind of mistake a family notices immediately.
 *
 * `essentials` are services every tier of this occasion carries no matter what
 * the tier's own generic list says — a housewarming without a purohit is not a
 * housewarming. They are priced into the estimate like anything else.
 *
 * `signature` is the three things somebody planning this occasion is actually
 * picturing. They ride on every tier card so the ladder never reads as the
 * same eight cards with the occasion's name pasted on top.
 */
export const OCCASION_PROFILES = {
  birthday: {
    cuisine: 'multi_cuisine',
    vegOnly: false,
    essentials: ['cake'],
    signature: ['The cake and the cutting moment', 'A backdrop worth photographing', 'Music, games and the room lit for it'],
    promise: 'Cake, decor, food and photographs — one team, one price, and you are a guest at your own party.',
  },
  first_birthday: {
    cuisine: 'karnataka',
    vegOnly: true,
    essentials: ['cake', 'photography'],
    signature: ['A themed backdrop built around the baby', 'Food the grandparents will eat happily', 'Someone photographing the whole hour'],
    promise: 'The one birthday nobody remembers and everybody photographs — so the photographs had better be good.',
  },
  baby_shower: {
    cuisine: 'karnataka',
    vegOnly: true,
    essentials: ['photography'],
    signature: ['A soft, floral setup for the mother-to-be', 'A traditional spread with the sweets she has been asking for', 'Photographs of the whole family together'],
    promise: 'Gentle, warm and completely arranged — the only person with nothing to do is the one it is for.',
  },
  seemantham: {
    cuisine: 'tamil',
    vegOnly: true,
    essentials: ['priest', 'pooja', 'photography'],
    signature: ['The rituals performed properly, in order', 'Bangles, flowers and the traditional gifts', 'A leaf meal for the family'],
    promise: 'The rite kept exactly as your family keeps it, with the arranging taken off your hands.',
  },
  naming_ceremony: {
    cuisine: 'udupi',
    vegOnly: true,
    essentials: ['priest', 'pooja'],
    signature: ['A purohit who performs the namakarana properly', 'A cradle and floral setup for the ceremony', 'A full leaf meal after the rite'],
    promise: 'Every ritual item, the purohit and the meal — arranged so the family can simply be present.',
  },
  thread_ceremony: {
    cuisine: 'mysuru_royal',
    vegOnly: true,
    essentials: ['priest', 'pooja'],
    signature: ['The homa and the full vaidika sequence', 'A traditional pandal and floral setup', 'Banana-leaf service for the extended family'],
    promise: 'An Upanayanam run to the letter, with the logistics handled by somebody who is not in the family.',
  },
  housewarming: {
    cuisine: 'karnataka',
    vegOnly: true,
    essentials: ['priest', 'pooja', 'cleanup'],
    signature: ['Ganahoma and the milk-boiling, timed to the muhurat', 'Rangoli, toran and the entrance done properly', 'A full meal in a house with no kitchen set up yet'],
    promise: 'You move into a house that is already blessed, already decorated and already cleaned up after.',
  },
  anniversary: {
    cuisine: 'continental',
    vegOnly: false,
    essentials: ['cake', 'photography'],
    signature: ['A setup built for two people or two hundred', 'The cake, the toast and the first song', 'Photographs you will actually frame'],
    promise: 'From a candlelit table for two to a hall full of everyone who was at the wedding.',
  },
  engagement: {
    cuisine: 'north_indian',
    vegOnly: false,
    essentials: ['photography'],
    signature: ['A stage built for the ring exchange', 'A styled entrance and family seating', 'Coverage of both families, not just the couple'],
    promise: 'The first event both families attend together — arranged so neither side has to run it.',
  },
  sangeet: {
    cuisine: 'north_indian',
    vegOnly: false,
    // Mehendi is half the occasion's own name, so it rides on every tier
    // rather than appearing only where a generic rung happens to include it.
    essentials: ['dj', 'photography', 'mehendi'],
    signature: ['A real dance floor with lights and sound', 'Mehendi artists working through the evening', 'Performances rehearsed rather than improvised'],
    promise: 'The night before the vows, with a floor that fills and a running order somebody else is holding.',
  },
  wedding: {
    cuisine: 'mysuru_royal',
    vegOnly: true,
    essentials: ['priest', 'pooja', 'photography', 'videography'],
    signature: ['Mandap, muhurat and every ritual in its place', 'A banana-leaf spread served without a queue', 'Photography and film across the whole day'],
    promise: 'One coordinator holding the entire day, so your family attends the wedding instead of running it.',
  },
  get_together: {
    cuisine: 'indo_chinese',
    vegOnly: false,
    essentials: [],
    signature: ['Food that arrives hot and keeps coming', 'Music at a volume people can still talk over', 'Nothing left to clear up afterwards'],
    promise: 'Somebody else does the cooking, the setting up and the clearing — you just invite people.',
  },
  retirement: {
    cuisine: 'karnataka',
    vegOnly: false,
    essentials: ['memory_wall', 'photography', 'av_setup'],
    signature: ['A tribute wall of the years', 'A stage for the speeches and the felicitation', 'A meal the colleagues and the family both enjoy'],
    promise: 'A send-off that says something, without a colleague having to organise it in their own time.',
  },
  graduation: {
    cuisine: 'chaat_street',
    vegOnly: false,
    essentials: ['photography'],
    signature: ['A photo wall for the cap and the certificate', 'Food the friends will actually eat', 'Music and a floor for the evening'],
    promise: 'The celebration the family plans and the friends turn up for — both, in one evening.',
  },
  corporate_event: {
    cuisine: 'multi_cuisine',
    vegOnly: false,
    essentials: ['av_setup', 'photography'],
    signature: ['Stage, screens and mics tested before the room fills', 'A spread that suits every diet in the office', 'Registration, signage and someone running the clock'],
    promise: 'Run to a schedule, invoiced with GST, and nobody from your team spending the day on logistics.',
  },
}

/** The default profile for an occasion the table above has not been taught yet. */
const FALLBACK_PROFILE = {
  cuisine: 'karnataka',
  vegOnly: true,
  essentials: [],
  signature: ['A setup built around the occasion', 'A full meal for everyone invited', 'One coordinator answerable for all of it'],
  promise: 'Every part of it arranged by one team, with a price you approve before anything is booked.',
}

export function profileFor(eventId) {
  return OCCASION_PROFILES[eventId] ?? FALLBACK_PROFILE
}

/**
 * Which services a tier books for this occasion.
 *
 * The tier's own list is generic — `dj`, `photography`, `transport`. Filtering
 * it against what the occasion actually offers is what stops a naming ceremony
 * from being quoted a DJ, and the profile's `essentials` are what stop a
 * housewarming from being quoted without a purohit.
 *
 * Both sides are checked against SERVICE_BY_ID because only services in
 * servicePricing.js can be priced; anything else would be added to the list and
 * silently contribute ₹0.
 */
export function tierServicesFor(eventId, tier) {
  const event = EVENT_DATA[eventId]
  const offered = new Set((event?.services ?? []).map(s => s.id))
  const profile = profileFor(eventId)

  const ids = new Set()
  for (const id of tier.includedServices ?? []) {
    if (SERVICE_BY_ID[id] && (offered.has(id) || id === 'dining' || id === 'cleanup')) ids.add(id)
  }
  for (const id of profile.essentials) {
    if (SERVICE_BY_ID[id]) ids.add(id)
  }
  return [...ids]
}

/**
 * One priced rung, for one occasion.
 *
 * Priced twice, because the customer asks two different questions at this
 * card and one number cannot answer both:
 *
 *   `from`   at the rung's SMALLEST guest count — "can I start here at all"
 *   `range`  at its TYPICAL guest count — "what would mine actually cost"
 *
 * Both are labelled as such on the card. A single figure pretending to be both
 * is how a customer ends up feeling misled by arithmetic that was honest.
 *
 * ── Why not tierEconomics ───────────────────────────────────────────────
 * utils/tierEconomics.js already computes a floor per tier, and the home
 * screen's tier rail uses it. It is deliberately occasion-agnostic: cheapest
 * cuisine in the catalogue, no services at all, because that rail sells the
 * ladder itself rather than any one celebration.
 *
 * Using it here made every one of the fifteen occasions read "Starting at
 * ₹11,500" — identical on the home grid, identical on every occasion page, and
 * sorted meaninglessly, because a number that ignores the occasion cannot
 * distinguish a wedding from a get-together. The floor here is computed the
 * same way as the typical price, with this occasion's own cuisine, decor and
 * services, so a griha pravesh floor genuinely includes the purohit.
 *
 * The fee share is computed against this occasion's typical total for the same
 * reason, and against the typical rather than the floor because that is the
 * fair denominator — see the long note in tierEconomics.js, which this follows.
 */
function quoteAt(eventId, tier, guests) {
  const profile = profileFor(eventId)
  const cuisine = CUISINE_BY_ID[profile.cuisine] ?? CUISINE_BY_ID.karnataka
  const vegOnly = profile.vegOnly || !cuisine.hasNonVeg

  return buildQuote({
    tierId: tier.id,
    guestCount: guests,
    cuisineId: cuisine.id,
    vegOnly,
    menu: defaultMenu(cuisine, tier.menuAllowance, { vegOnly }),
    decorLevelId: tier.defaultDecor,
    themeId: 'traditional_red_gold',
    addonIds: [],
    serviceIds: tierServicesFor(eventId, tier),
    mode: 'full',
  })
}

function priceTier(eventId, tier) {
  const profile = profileFor(eventId)
  const cuisine = CUISINE_BY_ID[profile.cuisine] ?? CUISINE_BY_ID.karnataka
  const vegOnly = profile.vegOnly || !cuisine.hasNonVeg
  const typicalGuests = tier.guests.typical ?? tier.guests.min

  const quote = quoteAt(eventId, tier, typicalGuests)
  const floor = quoteAt(eventId, tier, tier.guests.min)
  const serviceIds = tierServicesFor(eventId, tier)

  return {
    ...tier,
    // The rung's generic words, replaced by this occasion's. `description` and
    // `highlights` on the tier itself describe a wedding-shaped event, because
    // that is the only celebration one generic sentence can describe; spread
    // after ...tier so the occasion's copy wins on every surface that renders a
    // priced tier. See occasionTierContent.js.
    ...tierContentFor(eventId, tier, serviceIds),
    eventId,
    cuisine,
    vegOnly,
    decor: DECOR_LEVEL_BY_ID[tier.defaultDecor] ?? null,
    services: serviceIds.map(id => SERVICE_BY_ID[id]).filter(Boolean),
    quote,
    typicalGuests,
    /** The cheapest real booking at this rung, for this occasion. */
    from: floor?.range.low ?? null,
    /** What this occasion typically costs at this rung, as a band. */
    range: quote?.range ?? null,
    perGuest: quote?.perGuest ?? null,
    // Rounded to a whole percent — "5.4%" reads as an accountant's number and
    // invites arithmetic; "5%" reads as a policy.
    coordinationPct: quote?.total
      ? Math.max(1, Math.round((tier.coordinationFee / quote.total) * 100))
      : null,
  }
}

/**
 * The full ladder for one occasion, priced.
 *
 * Memoised because pricing eight tiers means eight full buildQuote() passes
 * over a menu, a decor level and a service list — cheap once, wasteful on every
 * render of a page that re-renders on every tab and guest-count change.
 */
const LADDER_CACHE = new Map()

export function tiersForOccasion(eventId) {
  if (LADDER_CACHE.has(eventId)) return LADDER_CACHE.get(eventId)
  const ladder = CELEBRATION_TIERS.map(tier => priceTier(eventId, tier))
  LADDER_CACHE.set(eventId, ladder)
  return ladder
}

/** One rung, priced for this occasion. */
export function tierForOccasion(eventId, tierId) {
  return tiersForOccasion(eventId).find(t => t.id === tierId) ?? null
}

/**
 * One rung, priced at the headcount the customer actually typed.
 *
 * tiersForOccasion() prices every rung twice — at its floor and at its typical
 * headcount — because a card in a ladder has to answer "can I start here" and
 * "what would mine cost" without knowing anything about the reader. The moment
 * the reader tells us they have 340 guests, both of those become the wrong
 * number: the typical for Special Day is 220, and quoting 220 to somebody who
 * said 340 is quoting a different event.
 *
 * So this is the same pricing pass, at an arbitrary count. It is what lets the
 * occasion page's header move when the guest field moves — before this existed,
 * "Starting at ₹26,750" was the same figure whether you were planning for
 * twenty people or two thousand, which is the definition of a static page.
 *
 * Not memoised on purpose. The ladder cache above exists because eight rungs
 * are priced on every render of a page that re-renders constantly; this is one
 * rung, called from a useMemo keyed on (occasion, tier, guests), and a module
 * cache keyed on a free-typed integer is an unbounded map for no gain.
 */
export function quoteForOccasion(eventId, tierId, guests) {
  const tier = TIER_BY_ID[tierId]
  const count = Number(guests) || 0
  if (!tier || count < 1) return null
  return quoteAt(eventId, tier, count)
}

/** The honest exit past the top rung — no price, on purpose. */
export { BESPOKE_TIER, TIER_BY_ID }

/**
 * The cheapest real booking for an occasion.
 *
 * This is what "Starting at ₹X" means on the home screen's occasion cards and
 * on the plan hub, and it now means the same thing everywhere: the floor of the
 * smallest rung, computed rather than written down.
 */
export function entryPriceFor(eventId) {
  const values = tiersForOccasion(eventId).map(t => t.from).filter(Number.isFinite)
  return values.length ? Math.min(...values) : null
}

/** How many bookable scales an occasion offers. The same eight for all of them. */
export const PACKAGE_COUNT = CELEBRATION_TIERS.length

/**
 * A tier, shaped like the cart's `pkg`.
 *
 * The cart, the enquiry payload and the admin console all speak the old package
 * shape — `{ id, name, price_min, price_max, includes }` — and rewriting that
 * contract is a much larger change than this one. So a tier is translated at
 * the boundary rather than the boundary being rebuilt, and the price fields
 * carry the real quoted band instead of an invented range.
 */
export function tierAsPackage(priced) {
  return {
    id: priced.id,
    name: priced.name,
    emoji: priced.emoji,
    tagline: priced.tagline,
    localName: priced.localName,
    price_min: priced.range?.low ?? priced.from ?? null,
    price_max: priced.range?.high ?? null,
    guests: priced.guests,
    typicalGuests: priced.typicalGuests,
    includes: priced.services.map(s => s.id),
  }
}
