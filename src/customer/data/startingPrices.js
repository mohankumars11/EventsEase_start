/**
 * "From ₹X" — the floor under every occasion.
 *
 * ── What this number means ───────────────────────────────────────────
 * The LOWEST all-in price a real customer in Bengaluru or Mysuru can
 * actually book this occasion for, at the smallest honest scale, at the
 * list price they will be charged (partner price + our margin — see the
 * list-pricing model). It is a floor, not an estimate and not an
 * average: the card promises "from", so the number has to be a price
 * somebody can really pay, or the card is lying.
 *
 * ── Where the numbers come from (2026-11-09) ─────────────────────────
 * Market survey of what Bengaluru vendors publish as their own starting
 * prices, cross-checked across listing sites:
 *
 *   simple balloon / home decor      ₹999      (several vendors' floor)
 *   standard home birthday package   ₹1,499
 *   kids' theme decoration           ₹2,499
 *   first birthday / milestone       ₹3,499
 *   catering, budget veg             ₹150–250 per plate
 *   catering, small-vendor veg       ₹250–300 per plate
 *   South Indian meals               ₹200–500 per plate
 *
 * So ₹999 is the true entry point for a personal celebration and ₹200
 * is the true per-plate floor. Both are used below.
 *
 * ── Why hand-set and not computed ────────────────────────────────────
 * Computing a floor from the catalogue gives the cheapest package we
 * happen to hold today, which moves every time a partner edits a rate
 * and reads as a precise number the customer will then expect. Mohan's
 * call (2026-11-09): research the market, set the band by hand, keep it
 * round and keep it honest. Revisit when the marketplace is live and
 * real booking data replaces the survey.
 */

/**
 * The per-plate floor — computed, never typed.
 *
 * A caterer's card used to show a configured plate (₹815 and up): the
 * price of a dear cuisine, with premium dishes ticked, at a small-batch
 * multiplier. That is a true number and a terrible headline — nobody
 * opens an app to be quoted the most expensive version of a thing.
 *
 * So the headline is the FLOOR, and the floor is asked of the same
 * engine that will later quote the real plate:
 *
 *   cheapest cuisine basePlate × the best batch multiplier
 *
 * Nothing here is hand-set, so the number tracks the catalogue. Add a
 * cheaper cuisine and the floor drops by itself; retire one and it
 * rises. The same rule tierEconomics.js already uses for a tier: quote
 * the cheapest configuration a customer could really book, not a
 * configuration nobody would.
 */
import { CUISINES } from '../../data/cuisineMenus'
import { batchBandFor } from '../../data/celebrationTiers'

/* The band a large order lands in — the best multiplier on offer. */
const BEST_BAND_GUESTS = 2000

/** The cheapest plate the catering engine can produce today, in rupees. */
export function perPlateFloor() {
  const bases = CUISINES.map(c => c.basePlate).filter(Boolean)
  if (!bases.length) return null
  return Math.round(Math.min(...bases) * (batchBandFor(BEST_BAND_GUESTS)?.multiplier ?? 1))
}

/** The plate price at a normal party, where most customers actually land. */
export function perPlateTypical(guests = 200) {
  const bases = CUISINES.map(c => c.basePlate).filter(Boolean)
  if (!bases.length) return null
  return Math.round(Math.min(...bases) * (batchBandFor(guests)?.multiplier ?? 1))
}

/** "from ₹312 per plate" — what a catering card shows instead of a quote. */
export function plateLabel() {
  const n = perPlateFloor()
  return n ? `from ${formatFloor(n)} per plate` : null
}

/** The floor for a category, when its occasion has no number of its own. */
const CATEGORY_FLOOR = {
  life: 999, wedding: 4999, festivals: 1299, school: 2999, college: 4999,
  corporate: 7999, nightlife: 3999, public: 9999, sport: 4999, food: 999,
  retail: 4999, property: 2999, community: 2999, industry: 9999,
  themed: 2499, outdoor: 3999, online: 1999, special: 1499,
}

/**
 * Occasions whose real floor is nowhere near their category's.
 * A naming ceremony at home and a destination wedding are both
 * "weddings & ceremonies"; one costs a thousand, the other a lakh.
 */
const OCCASION_FLOOR = {
  /* Personal celebrations — the decor market's own ladder. */
  'birthday-party': 999, 'friends-get-together': 1299, 'private-dinner-party': 1999,
  'kids-birthday-party': 2499, 'childrens-theme-party': 2499, 'teen-birthday-party': 1999,
  'first-birthday': 3499, 'milestone-birthday': 3499, 'surprise-birthday-party': 1999,
  'pet-birthday-party': 1499, 'baby-shower': 2999, 'gender-reveal-party': 2499,
  'naming-ceremony': 2499, 'cradle-ceremony': 2499, 'rice-feeding-ceremony': 2499,
  'housewarming-ceremony': 2999, 'wedding-anniversary': 1999, 'marriage-proposal': 2999,
  'silver-jubilee-anniversary': 7999, 'golden-jubilee-anniversary': 9999,
  'retirement-party': 3999, 'farewell-party': 2499, 'family-reunion': 2999,
  'memorial-gathering': 2999, 'celebration-of-life': 2999, 'bridal-shower': 3999,
  'bachelor-party': 3999, 'bachelorette-party': 3999, 'graduation-celebration': 2999,
  'valentines-day-celebration': 1499,

  /* Weddings — the ceremonies, smallest honest scale. */
  'roka-ceremony': 4999, 'pre-engagement-celebration': 4999,
  'haldi-ceremony': 3999, 'mehendi-ceremony': 4999, 'sangeet-night': 9999,
  'engagement-ceremony': 7999, 'cocktail-party': 4999, 'jaimala-ceremony': 4999,
  'baraat-procession': 7999, 'bridal-entry': 4999, 'intimate-wedding': 14999,
  'wedding-ceremony': 24999, 'muhurtham-ceremony': 24999, 'wedding-reception': 18999,
  'post-wedding-celebration': 7999, 'destination-wedding': 99999,
  'pellikuthuru-ceremony': 3999, 'pellikoduku-ceremony': 3999,
  'griha-pravesh-after-wedding': 2999,

  /* Festivals — a home pooja is the floor, a pandal is not. */
  'ganesh-chaturthi': 1299, 'diwali-celebration': 1999, 'holi-festival': 2499,
  'navratri-celebration': 4999, 'durga-puja': 9999, 'christmas-celebration': 1999,
  'new-year-celebration': 2999, 'eid-celebration': 1999, 'onam-celebration': 1999,
}

/** The floor for one occasion, in whole rupees. */
export function startingPriceFor(occasionId, categoryId) {
  return OCCASION_FLOOR[occasionId] ?? CATEGORY_FLOOR[categoryId] ?? 1499
}

/** "₹2,499" — Indian digit grouping, no decimals, never rounded away. */
export function formatFloor(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/** "from ₹2,499" — what a card shows. */
export function fromLabel(occasionId, categoryId) {
  return 'from ' + formatFloor(startingPriceFor(occasionId, categoryId))
}

/** The bare figure for a price tag — the card prints "Starts at" over it. */
export function priceTag(occasionId, categoryId) {
  return formatFloor(startingPriceFor(occasionId, categoryId))
}
