import { CUISINES, CUISINE_BY_ID, COURSES, dishesFor } from './cuisineMenus'
import { ALL_DISH_GROUPS } from './cateringDishes'

/**
 * The catering funnel — what each answer removes from the next screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A FUNNEL AND NOT A CHECKLIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * A giant list of every veg, non-veg, South Indian, North Indian and
 * Continental dish at once does two things, both bad:
 *
 *   THE CHECK ALL TRAP  Partners tick everything, believing more options
 *                       means more business. They are then booked for a
 *                       dish they cannot cook and fail on the day — and
 *                       that failure is Sambramo's reputation, not
 *                       theirs.
 *
 *   ONBOARDING FATIGUE  A pure-vegetarian Brahmin cook scrolls past
 *                       pages of Chilli Chicken and Mutton Biryani
 *                       looking for Bisi Bele Bath, and closes the app.
 *
 * So each answer removes what cannot apply before the next screen is
 * drawn. By the time a caterer reaches the checkboxes, the only dishes in
 * front of them are ones their own answers say they cook.
 *
 * ── No cap on cuisines ──────────────────────────────────────────────
 * A Bengaluru caterer running South Indian, North Indian and Chinese
 * counters at one wedding is ordinary, and a limit would make the honest
 * ones misrepresent themselves. The funnel already solves what a cap was
 * reaching for: a pure-veg kitchen never sees Mughlai at all, so there is
 * nothing to over-tick.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHARED LIBRARIES ARE SHOWN ONCE, NOT PER CUISINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first cut of this appended the whole 256-dish regional non-veg
 * library to EVERY cuisine screen. A caterer who picked three cuisines
 * met the same 256 dishes three times — which is precisely the
 * bombarding the funnel was built to end, reintroduced by the fix for
 * it.
 *
 * So there are two kinds of screen:
 *
 *   PER CUISINE   only that cuisine's own dishes. Bengali shows Shorshe
 *                 Ilish under its own heading; Karnataka does not.
 *   SHARED        the deep libraries, once each, at the end — the S S
 *                 vegetarian card and the regional non-veg list.
 */

/* ══════════════════════════════════════════════════════════════════════
   SLIDE 1 · THE DIETARY GATEKEEPER
   ══════════════════════════════════════════════════════════════════════

   One choice, and it gates everything downstream. It replaces two
   questions that used to be asked separately — "veg, non-veg or both?"
   and "is your kitchen pure vegetarian?" — which were always the same
   question wearing two hats.

   Phrased as a KITCHEN, not a preference, because that is what it is: the
   physical arrangement decides what can be cooked, and a family who
   specified pure-veg and got a shared kitchen has a complaint no refund
   settles. */
export const KITCHEN_TYPES = [
  {
    id: 'pure_veg',
    label: 'Pure vegetarian kitchen',
    scan: 'No meat, fish or egg is cooked here',
  },
  {
    id: 'both',
    label: 'Separate veg and non-veg kitchens',
    scan: 'Both, cooked apart, with separate vessels',
  },
  {
    id: 'pure_nonveg',
    label: 'Non-veg specialist / nati kitchen',
    scan: 'Country chicken, mutton, fish',
  },
]

/** What this kitchen may be shown. */
export const dietOf = kitchen =>
  kitchen === 'pure_veg' ? 'veg'
    : kitchen === 'pure_nonveg' ? 'nonveg'
      : 'both'

/* ══════════════════════════════════════════════════════════════════════
   SLIDE 2 · THE CUISINE LOCK
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Which cuisines this kitchen can honestly claim.
 *
 * Worked out from `hasNonVeg` and the per-dish `veg` flag that
 * data/cuisineMenus.js already carries, so nothing is hardcoded and a new
 * cuisine is filtered correctly the day it is added.
 */
export function cuisinesFor(kitchen) {
  const diet = dietOf(kitchen)
  if (diet === 'both') return CUISINES

  return CUISINES.filter(c => {
    const all = Object.values(c.courses ?? {}).flat()
    return diet === 'veg'
      ? all.some(d => d.veg !== false)
      /* A non-veg-only kitchen has no use for Jain & Satvik. Showing it
         and then rendering zero dishes is the dead end the funnel exists
         to remove. */
      : c.hasNonVeg === true && all.some(d => d.veg === false)
  })
}

/** Cuisines grouped by their own `region`, in the order they appear. */
export function cuisinesByRegion(list) {
  const out = []
  for (const c of list) {
    let g = out.find(x => x.region === c.region)
    if (!g) { g = { region: c.region, items: [] }; out.push(g) }
    g.items.push(c)
  }
  return out
}

/* ══════════════════════════════════════════════════════════════════════
   SLIDE 3 · THE FOCUSED GRID, ONE CUISINE AT A TIME
   ══════════════════════════════════════════════════════════════════════ */

/**
 * One cuisine's OWN courses, filtered by the kitchen.
 *
 * Nothing shared is mixed in here. A caterer looking at the Bengali
 * screen sees Bengali food, and the deep libraries arrive on their own
 * screens afterwards.
 */
export function coursesForCuisine(cuisineId, kitchen) {
  const diet = dietOf(kitchen)
  const cuisine = CUISINE_BY_ID[cuisineId]
  if (!cuisine) return []

  const out = []
  for (const course of COURSES) {
    const label = course.label ?? course.name ?? course.id

    if (diet !== 'nonveg') {
      const veg = dishesFor(cuisine, course.id, { vegOnly: true })
      if (veg.length) {
        out.push({ id: `${cuisineId}:${course.id}`, label, dishes: veg.map(d => d.name) })
      }
    }

    if (diet !== 'veg') {
      const nv = dishesFor(cuisine, course.id, { vegOnly: false }).filter(d => d.veg === false)
      if (nv.length) {
        out.push({
          id: `${cuisineId}:${course.id}:nv`,
          label: `${label} — non-veg`,
          dishes: nv.map(d => d.name),
          nonVeg: true,
        })
      }
    }
  }
  return out
}

/* ══════════════════════════════════════════════════════════════════════
   THE SHARED LIBRARIES · SHOWN ONCE, AT THE END
   ══════════════════════════════════════════════════════════════════════ */

/* The South Indian cuisines the S S Caterers card actually covers. */
const SS_CUISINES = new Set([
  'karnataka', 'mysuru_royal', 'udupi', 'tamil', 'andhra', 'kerala',
])

/** Does the S S vegetarian library apply to anything they picked? */
export const wantsSouthIndianLibrary = (cuisineIds = [], kitchen) =>
  dietOf(kitchen) !== 'nonveg' && cuisineIds.some(id => SS_CUISINES.has(id))

/**
 * The S S Caterers vegetarian card — 584 dishes, 27 groups.
 *
 * 61 palyas, 41 sambars, 45 kootus, 44 payasas, transcribed from a real
 * Bengaluru caterer. It is far deeper on South Indian than any generic
 * list, which is why it is here at all, and it is shown ONCE rather than
 * repeated under every South Indian cuisine.
 */
export function southIndianLibrary() {
  return ALL_DISH_GROUPS
    .filter(g => !g.id.startsWith('nv_') && g.items.length)
    .map(g => ({ id: `ss:${g.id}`, label: g.label, scan: g.scan, dishes: g.items }))
}

/** Does the regional non-veg library apply? */
export const wantsNonVegLibrary = kitchen => dietOf(kitchen) !== 'veg'

/**
 * Non-veg, region by region — 256 dishes, 15 groups.
 *
 * Nati, tandoor, coastal fish, Kodava pandi, Bengali fish, offal. It is
 * national rather than tied to one cuisine, so it is one screen, once.
 */
export function nonVegLibrary() {
  return ALL_DISH_GROUPS
    .filter(g => g.id.startsWith('nv_') && g.items.length)
    .map(g => ({ id: `ss:${g.id}`, label: g.label, scan: g.scan, dishes: g.items, nonVeg: true }))
}

/** Every dish a partner could be shown, for a count they can check. */
export function totalOffered(cuisineIds = [], kitchen) {
  const n = a => a.reduce((x, g) => x + g.dishes.length, 0)
  let t = 0
  for (const id of cuisineIds) t += n(coursesForCuisine(id, kitchen))
  if (wantsSouthIndianLibrary(cuisineIds, kitchen)) t += n(southIndianLibrary())
  if (wantsNonVegLibrary(kitchen)) t += n(nonVegLibrary())
  return t
}
