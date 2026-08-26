/**
 * What the venue already provides — and therefore what we must stop asking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS CLOSES
 * ══════════════════════════════════════════════════════════════════════
 *
 * A customer chose "Resort, farmhouse or hotel" and was then asked who was
 * buying the groceries. A resort has a kitchen, a licence and a food-and-
 * beverage manager, and it will not let an outside cook through the door.
 * The question is not merely irrelevant there; answering it produces an
 * estimate for provisions nobody will ever buy.
 *
 * The same failure ran through half the flow. A banquet hall has chairs,
 * tables, a generator, a car park and a cleaning crew, and the flow went on
 * to offer all four as though the customer were standing in an empty field.
 * Every one of those is the app not remembering an answer it already has.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A CAPABILITY TABLE RATHER THAN MORE `showIf`
 * ══════════════════════════════════════════════════════════════════════
 *
 * A chapter could gate itself with `showIf: ctx => ctx.venueKind !== 'venue_resort'`,
 * and that is what a one-off fix looks like. It does not survive: there are
 * sixteen venue answers across twenty-five occasions, the list grows, and
 * every new venue would need every dependent chapter edited to know about it.
 * Within two changes the rules disagree.
 *
 * So the VENUE declares what it has, once, and every dependent question reads
 * the same declaration. Adding a venue is one row here; adding a dependent
 * question is one `showIf` that names a capability rather than a venue.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THREE-STATE CATERING RULE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   'outside'  you bring your own caterer. The groceries question applies in
 *              full — this is a home, a kalyana mantapa, a lawn, a plot.
 *   'inhouse'  the venue's own kitchen cooks, full stop. No outside cook, no
 *              provisions of ours. The groceries question is removed and the
 *              menu screen is reframed: you are choosing from their kitchen.
 *   'either'   genuinely varies, and the honest thing is to ask. A banquet
 *              hall is sometimes per-plate with their kitchen and sometimes
 *              hall-hire with yours, and guessing wrong costs the customer
 *              either way.
 *   'unknown'  they told us it is already booked and we do not know which.
 *              Also asked.
 *
 * `either` and `unknown` both resolve to a real answer through one extra
 * question rather than through an assumption. That question is worth its
 * screen: it is the difference between a quote that includes the food and one
 * that does not.
 */

/**
 * `true` means the venue supplies it and we must not sell it.
 * `false` means it does not and the question stands.
 * `'partial'` means it has some and a large function still needs ours — the
 * question stays but is asked with that fact in it.
 */
export const VENUE_CAPABILITIES = {
  /* ── Somebody's own place ─────────────────────────────────────────── */
  own_venue: {
    catering: 'outside',
    furniture: false, power: false, parking: 'partial', washrooms: true,
    cleanup: false, cooling: false,
    label: 'your own place',
  },
  new_home: {
    catering: 'outside',
    furniture: false, power: false, parking: 'partial', washrooms: true,
    cleanup: false, cooling: false,
    label: 'the new house',
  },

  /* ── Hired halls ──────────────────────────────────────────────────── */
  venue_community: {
    // A kalyana mantapa is usually the ONLY kind of hall that lets you bring
    // your own caterer, and that is most of the reason families book one.
    catering: 'outside',
    furniture: true, power: 'partial', parking: true, washrooms: true,
    cleanup: 'partial', cooling: false,
    label: 'the mantapa',
  },
  venue_banquet: {
    catering: 'either',
    furniture: true, power: true, parking: true, washrooms: true,
    cleanup: true, cooling: true,
    label: 'the banquet hall',
  },
  venue_resort: {
    catering: 'inhouse',
    furniture: true, power: true, parking: true, washrooms: true,
    cleanup: true, cooling: true,
    label: 'the resort',
  },
  venue_lawn: {
    // A lawn is a field with grass cut. Everything comes with us.
    catering: 'outside',
    furniture: false, power: false, parking: 'partial', washrooms: false,
    cleanup: false, cooling: false,
    label: 'the lawn',
  },
  hall_nearby: {
    catering: 'either',
    furniture: true, power: true, parking: true, washrooms: true,
    cleanup: true, cooling: 'partial',
    label: 'the hall',
  },

  /* ── Already booked, so we know nothing ───────────────────────────── */
  booked_venue: {
    catering: 'unknown',
    furniture: 'unknown', power: 'unknown', parking: 'unknown',
    washrooms: 'unknown', cleanup: 'unknown', cooling: 'unknown',
    label: 'your venue',
  },

  /* ── Places that are not halls at all ─────────────────────────────── */
  temple: {
    // A temple kitchen may cook the prasada and will not cook your lunch.
    catering: 'outside',
    furniture: 'partial', power: true, parking: 'partial', washrooms: 'partial',
    cleanup: 'partial', cooling: false,
    label: 'the temple',
  },
  pilgrimage: {
    catering: 'outside',
    furniture: 'partial', power: true, parking: 'partial', washrooms: true,
    cleanup: true, cooling: false,
    label: 'the temple',
  },
  office: {
    catering: 'either',
    furniture: true, power: true, parking: 'partial', washrooms: true,
    cleanup: true, cooling: true,
    label: 'your office',
  },
  workplace: {
    catering: 'outside',
    furniture: false, power: true, parking: true, washrooms: 'partial',
    cleanup: false, cooling: false,
    label: 'the yard',
  },
  showroom: {
    // Forty minutes in a delivery bay. Nothing is served and nothing is set up.
    catering: 'inhouse',
    furniture: true, power: true, parking: true, washrooms: true,
    cleanup: true, cooling: true,
    label: 'the showroom',
  },
  the_premises: {
    catering: 'outside',
    furniture: false, power: 'partial', parking: false, washrooms: 'partial',
    cleanup: false, cooling: false,
    label: 'the shop',
  },
  the_site: {
    // A bare plot. It has nothing, and that is the whole planning problem.
    catering: 'outside',
    furniture: false, power: false, parking: false, washrooms: false,
    cleanup: false, cooling: false,
    label: 'the site',
  },
  home_after: {
    catering: 'outside',
    furniture: false, power: false, parking: 'partial', washrooms: true,
    cleanup: false, cooling: false,
    label: 'the house',
  },
}

/** Never undefined: an unmapped venue behaves as one that provides nothing. */
const FALLBACK = {
  catering: 'outside',
  furniture: false, power: false, parking: false,
  washrooms: false, cleanup: false, cooling: false,
  label: 'your venue',
}

export function capabilitiesFor(venueId) {
  return VENUE_CAPABILITIES[venueId] ?? FALLBACK
}

/**
 * Does the customer still need to be sold this?
 *
 * `true` for anything the venue does not fully provide, which deliberately
 * INCLUDES `'partial'` and `'unknown'`: a hall with forty parking spaces and
 * three hundred guests still needs marshals, and a venue we know nothing
 * about cannot be assumed to have anything. Suppressing a question we are
 * unsure about is how a function ends up without washrooms.
 */
export function stillNeeded(venueId, capability) {
  return capabilitiesFor(venueId)[capability] !== true
}

/**
 * Who is cooking, after the customer has answered any follow-up.
 *
 * `outsideCatering` is the answer to "does your venue allow an outside
 * caterer" and is only ever set for an `either`/`unknown` venue. Until it is
 * answered this returns the raw state, and the flow asks.
 */
export function cateringModeFor(venueId, outsideCatering) {
  const declared = capabilitiesFor(venueId).catering
  if (declared === 'outside' || declared === 'inhouse') return declared
  if (outsideCatering === true) return 'outside'
  if (outsideCatering === false) return 'inhouse'
  return declared            // 'either' or 'unknown' — still to be asked
}

/** Is the follow-up question owed for this venue? */
export function needsCateringQuestion(venueId, outsideCatering) {
  const resolved = cateringModeFor(venueId, outsideCatering)
  return resolved === 'either' || resolved === 'unknown'
}
