import { PLATE_SPLIT } from './cateringModel'

/**
 * What "a standard setup" actually means, and what it costs.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE HAD TO EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two independent reasons arrived at the same file.
 *
 * ── 1 · The existing decor ladder is wedding-scale, and only that ────
 * `data/decorPackages.js` offers exactly two priceable levels:
 *
 *     Classic Celebration    ₹18,000 + ₹35/guest
 *     Signature Styling      ₹45,000 + ₹60/guest
 *
 * They are correct for what they are — a full styled installation for a
 * function, quoted by a coordinator with a week to plan it. Run a
 * thirty-guest home birthday through them and the quote is ₹19,050,
 * against a real Bengaluru price of four to eight thousand.
 *
 * That is not a bug in decorPackages. An instant decor booking is a
 * DIFFERENT PRODUCT: a balloon arch and a backdrop, delivered and set up
 * in two hours by one person with a van. Pricing it off a wedding ladder
 * would put every short-lead birthday out of reach, and pricing a wedding
 * off this one would underquote a decorator into refusing the job.
 *
 * ── 2 · "Standard setup" has to be checkable ─────────────────────────
 * config/legal.js lists `bait_and_switch` as the highest-risk dark
 * pattern in this product, and the reason is the `discuss` flow: the
 * customer pays for "a standard setup at this scale" and agrees the
 * detail on a call afterwards. If nobody ever wrote down what the
 * standard setup INCLUDES, that phrase means whatever the master decides
 * on the day, and the CCPA guidelines name that exact practice.
 *
 * So every entry here carries `includes` and `excludes` in plain words.
 * The customer sees them before paying, the master sees the same list on
 * the offer, and a dispute has something to be resolved against. One
 * list, three readers, no room for two versions of what was agreed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE THE NUMBERS COME FROM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Researched Bengaluru short-lead rates, and they are ESTIMATES — the
 * same honesty `data/eventServicesData.js` states about its own
 * priceMin/priceMax. There is no public index for what a decorator
 * charges (see data/marketRates.js), so these are a standing rate card
 * reviewed by a human, not a live reading, and `lib/instantPricing.js`
 * says exactly that to the customer rather than implying a feed.
 *
 * Review these against real partner rates before the pilot takes money.
 * A rate card set too low does not fail loudly — masters simply decline
 * every offer, and the fill rate looks like a supply problem when it is
 * a pricing one.
 */

/**
 * Decor, at instant scale.
 *
 * `base` covers the setup itself: materials, transport and the labour to
 * install it. `perGuest` is the table and seating work that genuinely
 * scales with headcount — it is small, because at this scale most of the
 * cost is the arch and the backdrop, not the number of chairs.
 */
export const INSTANT_DECOR = [
  {
    id: 'lite',
    name: 'Balloon & backdrop',
    scan: 'Arch, backdrop, table',          // ≤10 words, per config/instantBooking
    base: 3500,
    perGuest: 20,
    upToGuests: 40,
    setupHours: 2,
    includes: [
      'Balloon arch or garland in your colours',
      'Fabric or paper backdrop behind the cake table',
      'Cake table styling with cloth and a small centrepiece',
      'Setup and takedown on the day',
    ],
    excludes: [
      'Fresh flowers (available as an extra on the call)',
      'Lighting rig or stage platform',
      'Ceiling or full-room work',
    ],
  },
  {
    id: 'standard',
    name: 'Themed setup',
    scan: 'Themed backdrop, entrance, table',
    base: 8500,
    perGuest: 28,
    upToGuests: 120,
    setupHours: 3,
    includes: [
      'Themed backdrop with your chosen colours and a name board',
      'Balloon work at the entrance and around the main table',
      'Entrance arch',
      'Table centrepieces for guest seating',
      'Fresh flowers on the main table',
      'Setup and takedown on the day',
    ],
    excludes: [
      'Stage platform or truss',
      'Full floral installation',
      'Lighting beyond fairy lights',
    ],
  },
  {
    id: 'full',
    name: 'Full function decor',
    scan: 'Stage, florals, entrance, seating',
    base: 22000,
    perGuest: 45,
    upToGuests: 300,
    setupHours: 5,
    includes: [
      'Stage or main-area setup with draping and backdrop',
      'Fresh floral work on the stage and entrance',
      'Entrance arch and pathway styling',
      'Guest table centrepieces throughout',
      'Fairy lighting on the main installation',
      'Setup, supervision through the event, and takedown',
    ],
    excludes: [
      'Mandap or ritual structures — these are pre-book, not instant',
      'LED walls or professional lighting rigs',
      'Multi-day or multi-venue setups',
    ],
  },
]

/**
 * Catering, at instant scale.
 *
 * Deliberately NOT a second per-plate engine. `utils/quote.perPlateFor`
 * already prices a plate properly — cuisine base rate, dish premiums,
 * batch-size band — and duplicating that here would give the business two
 * answers to "what does a plate cost".
 *
 * What this adds is the SERVICE SHAPE, which per-plate pricing does not
 * express: whether the master is cooking at your home, delivering hot
 * food, or bringing staff to serve it. Those are different jobs at the
 * same per-plate rate, and they are what a cook needs to know before
 * accepting.
 *
 * `pays` names which parts of the plate the customer is billed for, and
 * the share is derived from PLATE_SPLIT by `plateShareForSetup` below —
 * the same mechanism `cateringModel.plateShareFor` uses. No multiplier is
 * written down twice.
 */
export const INSTANT_CATERING = [
  {
    id: 'full_meal',
    name: 'Everything included',
    scan: 'Groceries, cooking, serving',
    pays: ['provisions', 'kitchen', 'service'],
    includes: [
      'All provisions bought by your master',
      'Cooked fresh on the day',
      'Serving staff and buffet setup',
      'Crockery, cutlery and cleanup',
    ],
    excludes: ['Tables and chairs (book Dining setup)', 'Alcohol'],
  },
  {
    id: 'delivered',
    name: 'Delivered hot',
    scan: 'Cooked offsite, delivered hot',
    // Provisions and kitchen, but no serving team. This shape does not
    // exist in SOURCING_MODES and is not an oversight there: a concierge
    // celebration always has somebody serving. A weekday instant order
    // for twenty people frequently does not.
    pays: ['provisions', 'kitchen'],
    includes: [
      'Cooked at the master’s kitchen',
      'Delivered hot in insulated containers',
      'Disposable serving trays',
    ],
    excludes: ['Serving staff', 'Crockery and cutlery', 'Cleanup'],
  },
  {
    id: 'cook_only',
    name: 'Cook at your place',
    scan: 'They cook, you buy groceries',
    // The same split `family_provisions` uses in SOURCING_MODES.
    pays: ['kitchen', 'service'],
    includes: [
      'A cook comes to your kitchen and cooks fresh',
      'You buy the groceries and provisions',
      'Cooking and kitchen cleanup',
    ],
    excludes: ['Groceries', 'Crockery and cutlery'],
  },
]

/**
 * What share of the plate rate an instant catering shape bills.
 *
 * Derived from PLATE_SPLIT rather than written as a number here, exactly
 * as `cateringModel.plateShareFor` does it for the concierge side. Two
 * hardcoded multipliers describing one split would drift the moment
 * somebody re-measured what a plate is made of — and that split is
 * argued for at length in cateringModel.js precisely because it is the
 * number the whole food quote rests on.
 *
 * Returns 1 for an unknown id rather than 0: an id this table has not
 * been taught must never quietly produce a free meal.
 */
export function plateShareForSetup(setupId) {
  const setup = CATERING_BY_ID[setupId]
  if (!setup) return 1
  return setup.pays.reduce((sum, part) => sum + (PLATE_SPLIT[part] ?? 0), 0)
}

/**
 * How long you need them for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DIMENSION THE RATE CARD DOES NOT HAVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `data/servicePricing.js` prices by HEADCOUNT and nothing else. Its
 * SIZE_BANDS discount properly at the low end — thirty guests pays 0.45
 * of the base — and for most services that is the whole story.
 *
 * For time-charged trades it is not, and the gap is large. Photography's
 * base of ₹35,000 assumes a full-day function shoot. At thirty guests
 * that lands on ₹15,750, which is right for a thirty-guest wedding
 * reception (still eight hours of shooting) and roughly double the real
 * Bengaluru price for a two-hour home birthday.
 *
 * Headcount cannot separate those two bookings, because they have the
 * same headcount. Duration is a genuinely independent axis, it is how
 * these trades actually quote, and instant booking is where it bites —
 * short-lead jobs are overwhelmingly short jobs.
 *
 * ── Why this is asked rather than inferred ───────────────────────────
 * It is one tap, it moves the price by two-thirds, and unlike "how
 * elaborate should the decor be?" it is a question the customer can
 * answer instantly and correctly. Those are exactly the questions worth
 * a screen.
 *
 * ── Why it is not applied to everything ──────────────────────────────
 * A cake is a cake whether the party runs two hours or eight. Applying a
 * duration discount to a fixed deliverable would just be a discount, and
 * an unexplainable one.
 */
export const INSTANT_DURATIONS = [
  { id: 'quick', label: 'Up to 2 hours',  scan: '2 hours',      hours: 2,    factor: 0.35 },
  { id: 'half',  label: 'Up to 4 hours',  scan: '4 hours',      hours: 4,    factor: 0.62 },
  { id: 'full',  label: 'The whole event', scan: 'Whole event', hours: null, factor: 1 },
]

export const DURATION_BY_ID = Object.fromEntries(INSTANT_DURATIONS.map(d => [d.id, d]))

/**
 * The trades that charge by time.
 *
 * A Set rather than a flag on each service, because the flag would have
 * to be added to `servicePricing.js` — the concierge's authority, whose
 * quotes must not change because instant booking needed a dimension.
 */
export const DURATION_PRICED = new Set([
  'photography', 'videography', 'dj', 'live_music', 'emcee', 'entertainment',
  'drum', 'photobooth', 'kids_play', 'choreography', 'makeup', 'mehendi',
  'av_setup', 'bouncers',
])

/**
 * What to open the duration picker on.
 *
 * Small gatherings are short ones far more often than not, so the
 * default follows headcount — but it is only a default, and the customer
 * changes it with one tap.
 */
export function defaultDurationFor(guestCount = 40) {
  if (guestCount <= 40) return 'quick'
  if (guestCount <= 150) return 'half'
  return 'full'
}

export const DECOR_BY_ID    = Object.fromEntries(INSTANT_DECOR.map(d => [d.id, d]))
export const CATERING_BY_ID = Object.fromEntries(INSTANT_CATERING.map(c => [c.id, c]))

/**
 * Which decor setup fits this many guests.
 *
 * Picked for the customer rather than asked, because "how elaborate?" is
 * a question somebody booking a decorator for tomorrow cannot usefully
 * answer and headcount is one they already know. They can still change
 * it — this only decides what the screen opens on.
 */
export function decorSetupFor(guestCount = 40) {
  return INSTANT_DECOR.find(d => guestCount <= d.upToGuests) ?? INSTANT_DECOR[INSTANT_DECOR.length - 1]
}

/** Rupees for one decor setup at this headcount. Rounded to ₹10, as everywhere. */
export function decorSetupCost(setup, guestCount = 40) {
  if (!setup) return 0
  return Math.round((setup.base + setup.perGuest * (guestCount || 0)) / 10) * 10
}

/**
 * The two lists a customer must see before paying, and the master must
 * see on the offer.
 *
 * Returned as one object so a screen cannot render `includes` and forget
 * `excludes` — which would be the bait-and-switch pattern arriving
 * through the back door of a partial render.
 */
export function setupSpec(kind, id) {
  const item = kind === 'decor' ? DECOR_BY_ID[id] : CATERING_BY_ID[id]
  if (!item) return null
  return {
    name: item.name,
    scan: item.scan,
    includes: item.includes,
    excludes: item.excludes,
    setupHours: item.setupHours ?? null,
  }
}

/* ══════════════════════════════════════════════════════════════════════
   WHICH SERVICES NEED THE MASTER'S CALL
   ══════════════════════════════════════════════════════════════════════

   `standard` — the booking flow can specify it completely. Quantity or
                duration is the whole spec, and there is nothing left to
                agree. A dhol troupe for two hours is a dhol troupe for
                two hours.

   `discuss`  — bookable instantly at a stated price for a stated
                standard setup, with the DETAIL agreed on the master's
                first call. Colours, theme, the exact dishes.

   The distinction exists because forcing a decoration booking to specify
   everything up front turns "instant" into twenty screens of homework —
   and because pretending a decoration order needs no conversation is how
   two people arrive at a venue with different pictures in their heads.

   ── This is the highest-risk list in the product ─────────────────────
   config/legal.js names `bait_and_switch` as the dark pattern this
   product is most likely to commit, and every instance of it would come
   from a service on THIS list. The mitigation is not a disclaimer: it is
   that each `discuss` service has a concrete `includes` / `excludes`
   list above, shown to the customer before they pay and to the master on
   the offer. Adding a service here without a spec to go with it is how
   that protection quietly stops working.
*/
export const DISCUSS_SERVICES = new Set([
  'decor', 'floral', 'stage', 'mandap',      // what it looks like
  'catering', 'cooks', 'menu',               // what is cooked
  'cake',                                    // the design on it
  'mehendi',                                 // the pattern
  'makeup', 'bridal_wear',                   // the look
  'photography', 'videography',              // the style and the shot list
  'priest', 'pooja',                         // which rituals, which tradition
])

/** Cannot be dispatched instantly at all — routes to pre-book. */
export const QUOTE_ONLY_SERVICES = new Set([
  'venue',        // availability is a contract, not a calendar tap
  'tent',         // surveyed on site before anybody can price it
  'live_music',   // a band's availability is negotiated, not matched
])

/** The three-way classification, as one call. */
export function specModeFor(serviceId) {
  if (QUOTE_ONLY_SERVICES.has(serviceId)) return 'quote'
  if (DISCUSS_SERVICES.has(serviceId))    return 'discuss'
  return 'standard'
}
