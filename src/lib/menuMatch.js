import { DISH_BY_ID } from '../data/dishRegistry'
import { CUISINES, dishesFor } from '../data/cuisineMenus'

/**
 * id → name, across the WHOLE catalogue.
 *
 * DISH_BY_ID alone covers the 144 hand-written registry dishes. The other
 * 771 ids are generated from cuisineMenus, and looking a gap up in the
 * registry only made describeGap() read:
 *
 *     Does not list SBM-TN-CU-502
 *
 * to a coordinator on the phone to a caterer. The id exists so machines
 * can match; a person must never be shown one.
 */
const NAME_BY_ID = (() => {
  const map = new Map()
  for (const c of CUISINES) {
    for (const courseId of Object.keys(c.courses ?? {})) {
      for (const d of dishesFor(c, courseId)) {
        if (d.sbmId && !map.has(d.sbmId)) map.set(d.sbmId, d.name)
      }
    }
  }
  /* The registry wins where both have the dish — its names are the
     curated ones, with the region already in them. */
  for (const d of Object.values(DISH_BY_ID)) map.set(d.id, d.name)
  return map
})()

/** The readable name for any dish id, and never the id itself if avoidable. */
export const dishName = id => NAME_BY_ID.get(id) ?? DISH_BY_ID[id]?.name ?? id

/**
 * id → 'veg' | 'nonveg', across the WHOLE catalogue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS TO STOP, WHICH IT DID NOT STOP THE FIRST TIME
 * ══════════════════════════════════════════════════════════════════════
 *
 * dietAllows() looked diet up in DISH_BY_ID, which holds the 144
 * hand-written registry dishes and none of the 771 generated ones. For a
 * card built from cuisineMenus — which is every card a customer can
 * actually build — every lookup missed, `wanted` came back empty, and
 * "does this card contain meat" answered NO for a card of nothing but
 * mutton.
 *
 * A pure-veg kitchen was therefore allowed to match a non-veg card. That
 * is the one failure a refund does not settle, and it was live for the
 * length of one commit.
 *
 * Worse, the guard covering it passed. It built its test card out of
 * registry dishes, which are exactly the ids that DID resolve. A check
 * that only exercises the easy half of a lookup proves the wrong thing.
 * check-dish-registry now builds its card from cuisineMenus.
 *
 * `veg: false` on a cuisineMenus dish is the same fact as diet 'nonveg'
 * on a registry one; they are two spellings of one flag and this is
 * where they are reconciled.
 */
const DIET_BY_ID = (() => {
  const map = new Map()
  for (const c of CUISINES) {
    for (const courseId of Object.keys(c.courses ?? {})) {
      for (const d of dishesFor(c, courseId)) {
        if (d.sbmId && !map.has(d.sbmId)) map.set(d.sbmId, d.veg === false ? 'nonveg' : 'veg')
      }
    }
  }
  for (const d of Object.values(DISH_BY_ID)) map.set(d.id, d.diet)
  return map
})()

/**
 * The diet of one dish, or null when the id is unknown.
 *
 * Null is not "vegetarian". An unknown id is an unanswered question, and
 * dietAllows treats it as a reason to refuse rather than a reason to
 * proceed — see there.
 */
export const dishDiet = id => DIET_BY_ID.get(id) ?? null

// Can this caterer cook this menu card?
//
// ══════════════════════════════════════════════════════════════════════
// THE QUESTION DISPATCH IS ACTUALLY ASKING
// ══════════════════════════════════════════════════════════════════════
//
// A customer builds a menu card — a set of dishes. Matching a caterer to
// it is set arithmetic and nothing cleverer: does the caterer's claimed
// set contain the customer's set.
//
// It only works on ids. Matching on names finds one of the three
// caterers who all cook Arachuvitta Sambar and spell it differently, and
// gives no sign that it dropped the other two. See dishRegistry.js.
//
// ══════════════════════════════════════════════════════════════════════
// WHY NEAR MISSES ARE NOT SILENTLY DISCARDED
// ══════════════════════════════════════════════════════════════════════
//
// A strict superset test is correct and, on its own, useless: a caterer
// who cooks 15 of a 16-dish card is a caterer who can do the wedding,
// and a card with one unusual sweet on it would return nobody at all.
//
// So this returns a coverage report rather than a boolean, and NAMES THE
// GAP. A coordinator can then do what a coordinator does — ring the
// caterer and ask whether they will make the sixteenth, or offer the
// customer a swap. What must never happen is the near miss vanishing
// with no record that it was close, because then the empty result looks
// like "no caterers in Bengaluru" instead of "one dish is the problem".
//
// ══════════════════════════════════════════════════════════════════════
// A VEG CARD MUST NEVER MATCH ON A NON-VEG DISH
// ══════════════════════════════════════════════════════════════════════
//
// Diet is checked separately from coverage and it is absolute. A pure-veg
// customer whose card is fully covered by a caterer who cooks it in a
// shared kitchen is not a match at any coverage, and no percentage
// outranks that. It is the one failure a refund does not settle.

/** Full coverage, in the strict sense. Kept because it reads clearly. */
export const covers = (caterer, card) =>
  card.every(id => caterer.includes(id))

/**
 * How well one caterer covers one card.
 *
 * Returns:
 *   have      ids they claim and the card wants
 *   missing   ids the card wants and they have not claimed
 *   ratio     0..1
 *   complete  true only when nothing is missing
 */
export function coverage(caterDishIds = [], cardDishIds = []) {
  const claimed = new Set(cardDishIds.filter(id => caterDishIds.includes(id)))
  const missing = cardDishIds.filter(id => !claimed.has(id))

  return {
    have: [...claimed],
    missing,
    ratio: cardDishIds.length ? claimed.size / cardDishIds.length : 1,
    complete: missing.length === 0,
  }
}

/**
 * Is this kitchen allowed to serve this card at all?
 *
 * `kitchen` is the funnel's own answer: 'pure_veg' | 'pure_nonveg' | 'both'.
 * Separate from coverage on purpose — a hard no, never a low score.
 */
export function dietAllows(kitchen, cardDishIds = []) {
  const diets = cardDishIds.map(dishDiet)

  /* An id we cannot resolve is an unanswered question, and the safe
     answer to "is there meat on this card" is never "no". A dish added
     without regenerating ids would otherwise open a pure-veg kitchen to
     a card nobody has checked. */
  if (diets.some(d => d === null)) return false

  const hasNonVeg = diets.includes('nonveg')
  const hasVeg = diets.includes('veg')

  if (kitchen === 'pure_veg') return !hasNonVeg
  /* A non-veg-only kitchen genuinely cannot serve a card that is all
     vegetarian dishes — there is nothing on it they cook. */
  if (kitchen === 'pure_nonveg') return !hasVeg || hasNonVeg
  return true
}

/**
 * Rank caterers against a card.
 *
 * `caterers` are rows carrying at least { id, dishIds, kitchen }. Anything
 * else on them is passed through untouched, so a caller can hand in the
 * whole vendor_services row and get it back with the report attached.
 *
 * Sorted by coverage, then by how few dishes are missing. Not by rating
 * or distance — those belong to match_partners(), which knows about
 * geography and availability. This function answers one question and
 * leaves the rest of the ranking to the thing that already does it.
 */
export function rankForCard(caterers = [], cardDishIds = [], { minRatio = 0.6 } = {}) {
  return caterers
    .map(c => ({ ...c, ...coverage(c.dishIds ?? [], cardDishIds) }))
    /* Diet first and absolutely. */
    .filter(c => dietAllows(c.kitchen, cardDishIds))
    .filter(c => c.ratio >= minRatio)
    .sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length)
}

/** The gap, in words a coordinator can read out loud. */
export function describeGap(report) {
  if (report.complete) return 'Cooks everything on this card'
  const names = report.missing.map(dishName).slice(0, 3)
  const rest = report.missing.length - names.length
  return `Does not list ${names.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`
}
