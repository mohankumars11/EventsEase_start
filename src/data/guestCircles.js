// The four circles — how big is this gathering, in the words a family uses.
//
// ── Why four, when celebrationTiers.js has eight ────────────────────────
// The eight-rung ladder is right as a PRICING model: batch economics genuinely
// change between 30 plates and 3,000, and a coordinator's work genuinely
// changes between a terrace lunch and a marquee. It is wrong as a QUESTION.
// Somebody who has just tapped "Birthday" and been asked how many people are
// coming does not want to read eight cards and work out whether 160 guests is
// "The Full Celebration" or "Special Day" — two names that, read cold on a
// phone, describe the same event. Eight near-synonyms is not a choice, it is a
// comprehension test, and the honest answer to a comprehension test on a
// planning screen is to close the app.
//
// So the customer is asked one question with four answers, each of which is a
// kind of gathering anybody can recognise on sight:
//
//   Close Circle       the people who would have come anyway
//   Family & Friends   the function everybody expects you to have
//   Full House         every seat taken
//   Grand              the one people talk about for years
//
// ── The eight rungs did not go anywhere ─────────────────────────────────
// They are still what prices the event. A circle resolves to a pricing tier
// from the ACTUAL headcount (see `pricingTierFor`), so a 60-guest "Family &
// Friends" and a 145-guest one are priced on their own numbers rather than
// both being charged at the middle of a band. The customer answers one
// question; the quote engine still sees the rung it needs.
//
// ── The naming rule, unchanged ──────────────────────────────────────────
// Never name a circle after the customer's wallet. Every name here is the
// SHAPE OF THE GATHERING, and every one is a sentence somebody would say out
// loud with pride. "We're doing the Close Circle" is such a sentence. "We're
// doing the Basic" is not — and a family spending savings on thirty guests is
// spending with exactly as much intent as one spending on eight hundred.
//
// ── No prices here, and that is the point ───────────────────────────────
// This is the second screen of the journey. Any number shown before the
// customer has told us what they want is a number we invented for them, and
// in this market a five-figure estimate that early does not read as
// transparency — it reads as being quoted at, by a stranger, before hello.
// A circle changes what is SUGGESTED further down (how many dishes, which
// décor level, whether there is a built stage at all); it never shows a
// rupee. The estimate arrives once, at the end, assembled from things the
// customer actually chose.

import { TIER_BY_ID, tierForGuests } from './celebrationTiers'

/**
 * The four.
 *
 * `guests.min/max` is the band the circle covers; `typical` is what the
 * headcount snaps to when somebody picks a circle before typing a number.
 *
 * `tiers` lists the pricing rungs this circle spans, cheapest first. It is
 * both the map `pricingTierFor` uses and the honest record of which rungs
 * were folded together, so anybody changing the ladder can see at a glance
 * what the customer-facing question would start doing differently.
 *
 * `menuAllowance` is stated here rather than inherited from the resolved
 * tier, because it is the one tier property the customer actually experiences
 * on the plate — it should follow the circle they chose, not the rung an
 * arithmetic band dropped them in. Everything else (coordination fee, décor
 * stretch, batch rate) still comes from the tier.
 *
 * `surface` / `spine` / `ink` follow the tier palette's rule: the wash reaches
 * white before the body copy, the spine is the only place the colour runs at
 * full strength, and `ink` is for a label — never a paragraph.
 */
export const GUEST_CIRCLES = [
  {
    id: 'close',
    name: 'Close Circle',
    localName: 'Aptaru',
    emoji: '🤍',
    tagline: 'The people who would have come anyway',
    description:
      'Home, the terrace, or the small hall down the road. Everything cooked fresh, set out before they arrive, cleared after they leave.',
    reads: 'Parents, siblings, a few cousins, the neighbours you actually like.',
    guests: { min: 10, max: 50, typical: 30 },
    tiers: ['close_circle', 'house_full'],
    venueHint: 'Usually at home, or an apartment clubhouse',
    defaultDecor: 'home_touch',
    menuAllowance: { welcome: 1, starters: 2, mains: 3, curries: 2, accompaniments: 3, sweets: 1, counters: 0 },
    surface: 'bg-gradient-to-br from-emerald-50 via-white to-white',
    spine: 'bg-gradient-to-b from-emerald-400 to-teal-500',
    ink: 'text-emerald-700',
  },
  {
    id: 'family',
    name: 'Family & Friends',
    localName: 'Bandhu Balaga',
    emoji: '🧡',
    tagline: 'The function everybody expects you to have',
    description:
      'A proper hall, a full spread, and a stage to stand on for the photographs. The size most celebrations in this city actually are.',
    reads: 'Both sides of the family, the office, the old school group.',
    guests: { min: 50, max: 150, typical: 110 },
    tiers: ['house_full', 'full_celebration'],
    venueHint: 'A community hall, a small kalyana mantapa, a mid-size banquet',
    defaultDecor: 'classic',
    menuAllowance: { welcome: 2, starters: 3, mains: 4, curries: 3, accompaniments: 4, sweets: 2, counters: 1 },
    surface: 'bg-gradient-to-br from-amber-50 via-white to-white',
    spine: 'bg-gradient-to-b from-amber-400 to-orange-500',
    ink: 'text-amber-700',
  },
  {
    id: 'full_house',
    name: 'Full House',
    localName: 'Manetumba',
    emoji: '💜',
    tagline: 'Every seat taken, and a queue at the buffet',
    description:
      'A real kalyana mantapa or banquet hall, a built stage, live counters, and somebody from Sambramo physically there all day.',
    reads: 'The whole extended family, the whole street, the whole department.',
    guests: { min: 150, max: 400, typical: 250 },
    tiers: ['full_celebration', 'special_day', 'grand'],
    venueHint: 'A kalyana mantapa or a banquet hall with its own parking',
    defaultDecor: 'signature',
    menuAllowance: { welcome: 2, starters: 5, mains: 5, curries: 4, accompaniments: 6, sweets: 3, counters: 2 },
    surface: 'bg-gradient-to-br from-fuchsia-50 via-white to-white',
    spine: 'bg-gradient-to-b from-fuchsia-400 to-purple-500',
    ink: 'text-fuchsia-700',
  },
  {
    id: 'grand',
    name: 'Grand',
    localName: 'Vaibhava',
    emoji: '👑',
    tagline: 'The one people talk about for years',
    description:
      'Marquee or convention centre, a designed stage, more than one kitchen, and a crew on site from the night before. Planned like a production, because it is one.',
    reads: 'Everybody. The village, the business, the whole circle.',
    guests: { min: 400, max: 3500, typical: 700 },
    tiers: ['grand', 'royal_mysuru', 'maha_samavesha', 'jana_sagara'],
    venueHint: 'A convention centre, a palace ground, or a marquee on your own land',
    defaultDecor: 'grand_stage',
    menuAllowance: { welcome: 3, starters: 6, mains: 6, curries: 5, accompaniments: 8, sweets: 4, counters: 3 },
    surface: 'bg-gradient-to-br from-rose-50 via-white to-white',
    spine: 'bg-gradient-to-b from-rose-400 to-red-500',
    ink: 'text-rose-700',
  },
]

export const CIRCLE_BY_ID = Object.fromEntries(GUEST_CIRCLES.map(c => [c.id, c]))

/** The largest headcount the ladder will price without a human in the loop. */
export const MAX_PRICEABLE_GUESTS = 3500

/**
 * Which circle a headcount falls into.
 *
 * Bands are inclusive at the top so the round numbers people actually type —
 * 50, 150, 400 — land in the SMALLER circle. Somebody who says "about 150"
 * means the hall function they have been to a hundred times, not the marquee,
 * and bumping them a circle up would suggest a built stage and a live-counter
 * crew they never asked for.
 */
export function circleForGuests(guestCount) {
  const n = Number(guestCount) || 0
  return GUEST_CIRCLES.find(c => n <= c.guests.max) ?? GUEST_CIRCLES[GUEST_CIRCLES.length - 1]
}

/**
 * The pricing rung for this circle at this headcount.
 *
 * Resolved from the real number first — that is what stops a 60-guest and a
 * 145-guest "Family & Friends" being quoted the same plate rate — and clamped
 * into the circle's own rungs only when the two disagree. They can disagree
 * legitimately: somebody may pick "Full House" and then type 120 because they
 * expect the hall to fill on the day, and the circle they deliberately chose
 * is the better statement of what they want built.
 */
export function pricingTierFor(circleId, guestCount) {
  const circle = CIRCLE_BY_ID[circleId]
  const natural = tierForGuests(guestCount)
  if (!circle) return natural ?? TIER_BY_ID.full_celebration
  if (natural && circle.tiers.includes(natural.id)) return natural

  // Outside the circle's band. Which end to clamp to depends on which way the
  // headcount ran: a Close Circle customer expecting 400 gets the circle's top
  // rung, not its bottom one.
  const overshot = (Number(guestCount) || 0) > circle.guests.max
  const id = overshot ? circle.tiers[circle.tiers.length - 1] : circle.tiers[0]
  return TIER_BY_ID[id] ?? TIER_BY_ID.full_celebration
}

/**
 * The dish allowance to build the menu against.
 *
 * The circle's, not the resolved tier's — see the note on `menuAllowance`
 * above. Somebody who chose "Full House" and typed 160 should be offered a
 * Full House spread, not the four dishes the arithmetic rung beneath it
 * happens to include.
 */
export function allowanceFor(circleId) {
  return CIRCLE_BY_ID[circleId]?.menuAllowance ?? CIRCLE_BY_ID.family.menuAllowance
}

/** Total dishes a circle includes, for "a spread of N dishes" copy. */
export function dishCountFor(circleId) {
  return Object.values(allowanceFor(circleId)).reduce((sum, n) => sum + n, 0)
}
