// The scale ladder: how big is this celebration, and what does that cost?
//
// ── Why tiers at all ────────────────────────────────────────────────────
// A package with one flat price is a package that fits one customer. The
// catalogue's "Grand Wedding — ₹8,00,000 to ₹25,00,000" is a range so wide it
// tells a family with 200 guests nothing at all, and it makes the decision
// feel like a negotiation they will lose. Splitting the same job into named
// scales lets someone recognise their own celebration on the page and see a
// number attached to it.
//
// ── The naming rule, which is the whole business strategy ───────────────
// Never name a tier after the customer's wallet.
//
// "Basic / Standard / Premium / Luxury" ranks the buyer, and the person who
// picks the first one has just been told, by your own product, that they
// bought the cheap thing. In this market that is fatal: a Griha Pravesh for
// thirty people is not a lesser event than a six-hundred-guest reception, it
// is a different event, and a family spending ₹40,000 they saved for is
// spending it with exactly as much intent as one spending ₹4,00,000.
//
// So every tier here is named for the SHAPE OF THE GATHERING — who is in the
// room — and every name is something a person would be happy to say out loud.
// "We're doing the Close Circle" is a sentence somebody says proudly. "We're
// doing the Basic" is not. The tiers are ordered by guest count, never
// labelled by budget, and the price is a consequence of the size rather than
// the headline of the tier.
//
// The local name rides alongside the English one rather than replacing it.
// Bengaluru's celebration market is half non-Kannada-speaking; leading in
// Kannada would lock out the customer, and dropping it entirely throws away
// the one thing a national aggregator cannot copy in Mysuru.
//
// ── Both ends of the market are deliberate ──────────────────────────────
// `close_circle` exists so that somebody with ₹10,000 has a real door into
// this app instead of bouncing off a "typical range" that starts at ₹25,000.
// `royal_mysuru` exists so that the family who would otherwise ring a
// wedding planner directly finds a tier that does not look apologetic. A
// ladder missing either end is a ladder that quietly serves only the middle.
//
// `bespoke` is not a tier — it is the honest exit for anything past the top
// rung, where an automatic number would be a guess wearing a price tag.

/**
 * The platform's own fee, charged on top of the sourced cost and shown to the
 * customer as its own line.
 *
 * Stated openly rather than buried in the plate rate. The pitch here is "we
 * negotiate, coordinate and stand behind it"; a fee hidden inside the food
 * price makes that pitch a lie the first time somebody rings a caterer
 * directly and compares. 2% is a launch number chosen to be defensible out
 * loud, not a margin.
 */
export const PLATFORM_FEE_RATE = 0.02

/**
 * What booking the whole celebration saves over booking each piece alone.
 *
 * Real, not theatre: one coordinator visiting one venue once, one delivery
 * window, one negotiation across three vendors. It is applied to the subtotal
 * before the platform fee, so the fee shrinks with it — the discount is not
 * clawed back on the next line.
 */
export const BUNDLE_DISCOUNT_RATE = 0.10

/**
 * What it costs to hold a quote and a date.
 *
 * Small on purpose. This is not a deposit and it is not a down payment on the
 * event — it buys the customer a coordinator who stops shopping the date to
 * anyone else while they confirm, and it buys Sambramo a signal that this
 * enquiry is real. Price it like a booking fee and it starts doing the job of
 * a deposit, which it cannot do: there is no signed supplier behind the
 * estimate yet, so the money would be holding a number nobody has agreed to.
 *
 * It is adjusted against the final invoice, and refundable — both of which are
 * stated on the screen that asks for it, in those words. If either stops being
 * true, that screen has to change in the same commit as this constant.
 */
export const LOCK_AMOUNT = 1000

/**
 * How much a plate costs to put out, relative to the mid-size job the cuisine
 * rates are quoted for (150–350 guests).
 *
 * Small batches genuinely cost more per head — the same cook, the same
 * transport, the same setup time, spread over forty plates instead of four
 * hundred. Charging the bulk rate at forty guests loses money on every small
 * booking, and quoting the small rate at six hundred loses the booking.
 *
 * Expressed as a curve rather than baked into each tier so that a customer who
 * types 148 guests and one who types 152 do not see wildly different plate
 * rates for what is the same event.
 */
const BATCH_BANDS = [
  { upTo: 30,    multiplier: 1.35, label: 'Small batch — same setup, fewer plates' },
  { upTo: 75,    multiplier: 1.22, label: 'Small batch' },
  { upTo: 150,   multiplier: 1.10, label: 'Standard batch' },
  { upTo: 350,   multiplier: 1.00, label: 'Standard batch' },
  { upTo: 600,   multiplier: 0.92, label: 'Bulk rate' },
  { upTo: 1000,  multiplier: 0.86, label: 'Bulk rate' },
  { upTo: Infinity, multiplier: 0.82, label: 'Large-volume rate' },
]

export function batchBandFor(guestCount) {
  return BATCH_BANDS.find(b => guestCount <= b.upTo) ?? BATCH_BANDS[BATCH_BANDS.length - 1]
}

/**
 * The ladder.
 *
 * `coordinationFee` is the fixed human cost of the tier — site visit, vendor
 * calls, timeline, and someone physically present on the day from `special_day`
 * upward. It does not scale with guests because the work does not: chasing a
 * decorator takes the same afternoon whether the hall seats 80 or 800.
 *
 * `menuAllowance` is how many dishes per course the tier includes. This is the
 * lever that makes the tiers mean something on the plate rather than only on
 * the invoice — a Close Circle menu is four dishes done properly, a Royal
 * Mysuru menu is a full banana-leaf spread.
 *
 * `defaultDecor` names the decor level that comes as standard; the customer can
 * move up or down from it without leaving the tier.
 *
 * `includedServices` is what the tier pre-selects from servicePricing.js, and
 * it is what makes a tier a curated package rather than a label. These are
 * priced into the quote at their normal rate — they are included in the sense
 * that they are already chosen and already counted, not in the sense that they
 * are free. Anything here can be unticked, which is the point: a family with
 * their own photographer should not be paying for ours.
 *
 * The list has to keep matching `highlights` below it. A tier that promises
 * "photography through the main hours" in its highlights and does not carry
 * `photography` here is a tier whose price is missing a photographer.
 *
 * ── The colour fields, and the rule they follow ─────────────────────────
 * `accent` and `badge` were the whole palette: a tinted tile behind the emoji
 * and a pill. Everything else about a rung was the same white rectangle as
 * every other card in the app, which on a lit dark ground read as eight
 * identical slabs — the customer could not tell one scale from another
 * without reading, and a page whose job is to make a ₹4,00,000 celebration
 * feel valuable was showing it on stationery.
 *
 * So each rung now carries its own surface. The rule that keeps eight
 * colours from becoming a paint chart:
 *
 *   `surface` is a wash, not a fill. Every one of them runs from a 50-level
 *   tint at the top-left out to white before it reaches the body copy, so
 *   the text sits on white on all eight cards and the colour identifies the
 *   rung without ever being something a customer reads through.
 *
 *   `spine` is the saturated statement — a 4px bar down the left edge. It is
 *   the only place a tier's colour runs at full strength, which is what lets
 *   the wash stay quiet enough to read on.
 *
 *   `ink` is that colour at text weight, for the one or two labels per card
 *   that name the rung (its local name, its price line). Never body copy.
 *
 * The hues climb the ladder deliberately: fresh greens and ambers at the
 * intimate end, rose and violet through the middle, red-gold and deep
 * indigo-teal at the top. Nothing in the sequence ranks the buyer — the same
 * rule the naming strategy above follows — it just means a family recognises
 * their own rung by its colour before they have read a word of it.
 *
 * ── `description` and `highlights` are the OCCASION-LESS copy ───────────
 * They are what a rung says on the home rail, where the customer has not told
 * us what they are celebrating yet, so they must stay true of any celebration
 * at this size — no mandap, no cake table, no homa. The moment an occasion is
 * known, both fields are replaced by data/occasionTierContent.js, which knows
 * that Royal Mysuru means a marquee and a mandap for a wedding, a marquee and
 * a ritual stage for an upanayanam, and an LED wall and a control desk for a
 * corporate annual day. Keep these lines generic; put the specifics there.
 */
export const CELEBRATION_TIERS = [
  {
    id: 'close_circle',
    name: 'Close Circle',
    localName: 'Aptaru',
    emoji: '🤍',
    tagline: 'The people who would have come anyway',
    description:
      'Home, terrace or a small hall. Everything cooked fresh, set up before your guests arrive, cleared after they leave.',
    guests: { min: 10, max: 30, typical: 25 },
    coordinationFee: 1500,
    defaultDecor: 'home_touch',
    includedServices: ['dining', 'cleanup'],
    coordination: 'A coordinator on WhatsApp, from booking to the day itself',
    onSiteManager: false,
    menuAllowance: { welcome: 1, starters: 2, mains: 2, curries: 2, accompaniments: 3, sweets: 1, counters: 0 },
    highlights: [
      'Cooked and served at your home or hall',
      'Simple, well-finished decor at the entrance and the main table',
      'One coordinator you can message any time',
    ],
    accent: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    surface: 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-200/80',
    spine: 'bg-gradient-to-b from-emerald-400 to-teal-500',
    ink: 'text-emerald-700',
  },
  {
    id: 'house_full',
    name: 'House Full',
    localName: 'Manetumba',
    emoji: '💛',
    tagline: 'Everyone who matters, and the house is full',
    description:
      'The clubhouse or a small hall, a proper buffet, and a setup that photographs well without taking over the room.',
    guests: { min: 30, max: 75, typical: 60 },
    coordinationFee: 3500,
    defaultDecor: 'classic',
    includedServices: ['dining', 'cleanup', 'cake'],
    coordination: 'A coordinator on WhatsApp, plus a call the evening before',
    onSiteManager: false,
    menuAllowance: { welcome: 1, starters: 3, mains: 3, curries: 3, accompaniments: 4, sweets: 2, counters: 0 },
    highlights: [
      'Buffet counters with serving staff',
      'Entrance, stage backdrop and table styling',
      'Crockery, seating and clearing included',
    ],
    accent: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    surface: 'bg-gradient-to-br from-amber-50 via-white to-white border-amber-200/80',
    spine: 'bg-gradient-to-b from-amber-400 to-orange-500',
    ink: 'text-amber-700',
  },
  {
    id: 'full_celebration',
    name: 'The Full Celebration',
    localName: 'Sambrama',
    emoji: '🧡',
    tagline: 'The one most families book',
    description:
      'A hall, a real stage, a menu with choices on it, and photographs you will actually print. The middle of the ladder, and the middle for a reason.',
    guests: { min: 75, max: 150, typical: 120 },
    coordinationFee: 7500,
    defaultDecor: 'signature',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'dj'],
    popular: true,
    coordination: 'A named coordinator, venue visit included, reachable on call',
    onSiteManager: false,
    menuAllowance: { welcome: 2, starters: 4, mains: 3, curries: 4, accompaniments: 5, sweets: 2, counters: 1 },
    highlights: [
      'Styled stage, entrance arch and guest tables',
      'Live counter of your choice',
      'Photography through the main hours',
      'Venue visit before the day',
    ],
    accent: 'border-saffron-300 bg-saffron-50 ring-2 ring-saffron-200',
    badge: 'bg-saffron-500 text-white',
    // The one rung allowed a richer wash than the rest: it is the most-booked
    // scale and the page should look like it knows that.
    surface: 'bg-gradient-to-br from-saffron-100 via-amber-50 to-white border-saffron-300',
    spine: 'bg-gradient-to-b from-saffron-500 to-amber-600',
    ink: 'text-amber-700',
  },
  {
    id: 'special_day',
    name: 'Special Day',
    localName: 'Vishesha',
    emoji: '❤️',
    tagline: 'A day the whole family travels for',
    description:
      'Full hall, full menu, someone from Sambramo standing in the room all day so that nobody in your family has to be the one chasing the decorator.',
    guests: { min: 150, max: 300, typical: 220 },
    coordinationFee: 15000,
    defaultDecor: 'signature',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'videography', 'dj'],
    coordination: 'A named coordinator plus an on-site manager for the full day',
    onSiteManager: true,
    menuAllowance: { welcome: 2, starters: 5, mains: 4, curries: 5, accompaniments: 6, sweets: 3, counters: 2 },
    highlights: [
      'On-site manager from setup to clearing',
      'Two live counters',
      'Photography and video coverage',
      'Guest seating, lighting and sound',
    ],
    accent: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    surface: 'bg-gradient-to-br from-rose-50 via-white to-white border-rose-200/80',
    spine: 'bg-gradient-to-b from-rose-400 to-pink-500',
    ink: 'text-rose-700',
  },
  {
    id: 'grand',
    name: 'Grand',
    localName: 'Vaibhava',
    emoji: '💜',
    tagline: 'The one people talk about afterwards',
    description:
      'A production. Staged lighting, a designed backdrop, multiple counters, and a crew that arrives the night before.',
    guests: { min: 300, max: 600, typical: 450 },
    coordinationFee: 30000,
    defaultDecor: 'grand_stage',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'videography', 'dj', 'emcee', 'transport', 'bouncers'],
    coordination: 'A coordinator, an on-site manager and a setup crew from the night before',
    onSiteManager: true,
    menuAllowance: { welcome: 3, starters: 6, mains: 5, curries: 6, accompaniments: 8, sweets: 4, counters: 3 },
    highlights: [
      'Designed stage with lighting and truss',
      'Three live counters and a dessert station',
      'Full photo and cinematic video team',
      'Guest transport and parking coordination',
    ],
    accent: 'border-purple-200 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    surface: 'bg-gradient-to-br from-plum-50 via-white to-white border-plum-200/80',
    spine: 'bg-gradient-to-b from-plum-500 to-berry-500',
    ink: 'text-plum-700',
  },
  {
    id: 'royal_mysuru',
    name: 'Royal Mysuru',
    localName: 'Arasu Vaibhava',
    emoji: '👑',
    tagline: 'Palace-city scale, done properly',
    description:
      'The full traditional spread on banana leaf, a marquee, and a team large enough that six hundred guests are seated and served without a queue forming.',
    guests: { min: 600, max: 1200, typical: 800 },
    coordinationFee: 60000,
    defaultDecor: 'royal_marquee',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'videography', 'dj', 'emcee', 'transport', 'bouncers', 'live_music', 'makeup'],
    coordination: 'A dedicated team: lead coordinator, floor managers, and a crew on site for three days',
    onSiteManager: true,
    menuAllowance: { welcome: 4, starters: 8, mains: 6, curries: 8, accompaniments: 10, sweets: 5, counters: 4 },
    highlights: [
      'Marquee, stage and full floral installation',
      'Banana-leaf service with a serving team per section',
      'Four or more live counters',
      'Multi-camera video, drone and same-day edit',
      'Guest hospitality desk and transport',
    ],
    accent: 'border-red-200 bg-gradient-to-br from-red-50 to-amber-50',
    badge: 'bg-gradient-to-r from-red-500 to-amber-500 text-white',
    surface: 'bg-gradient-to-br from-red-50 via-amber-50/60 to-white border-red-200/80',
    spine: 'bg-gradient-to-b from-red-500 to-amber-500',
    ink: 'text-red-700',
  },
  /**
   * The two largest scales.
   *
   * Named deliberately without religious or dynastic reference. "Royal
   * Mysuru / Arasu Vaibhava" above is a place and its palace tradition, which
   * reads as heritage rather than faith and is fine; but a ladder that keeps
   * climbing on royal or devotional imagery starts to exclude the customer
   * who does not see themselves in it. These two are secular and purely
   * descriptive: a great assembly, and a sea of people. Both are ordinary
   * Kannada, which is the register the rest of the ladder already speaks
   * (Aptaru, Manetumba, Nimma Kanasu).
   */
  {
    id: 'maha_samavesha',
    name: 'The Grand Assembly',
    localName: 'Maha Samavesha',
    emoji: '🎪',
    tagline: 'A whole community, seated and served',
    description:
      'Convention scale. Multiple serving lines running at once, a marquee big enough that nobody eats standing, and a crew sized so two thousand people are through dinner without a queue forming.',
    guests: { min: 1200, max: 2000, typical: 1600 },
    coordinationFee: 100000,
    defaultDecor: 'royal_marquee',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'videography', 'dj', 'emcee', 'transport', 'bouncers', 'live_music', 'makeup'],
    coordination: 'A lead coordinator, section managers and a standing crew on site for the full setup, event and teardown',
    onSiteManager: true,
    menuAllowance: { welcome: 5, starters: 9, mains: 7, curries: 9, accompaniments: 12, sweets: 6, counters: 5 },
    highlights: [
      'Multiple parallel serving lines, so no queue forms',
      'Marquee, stage and full floral installation',
      'Five or more live counters',
      'Crowd flow, parking and guest hospitality planned in advance',
      'Multi-camera video with a same-day edit',
    ],
    accent: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50',
    badge: 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white',
    surface: 'bg-gradient-to-br from-indigo-50 via-sky-50/60 to-white border-indigo-200/80',
    spine: 'bg-gradient-to-b from-indigo-500 to-sky-500',
    ink: 'text-indigo-700',
  },
  {
    id: 'jana_sagara',
    name: 'Sea of People',
    localName: 'Jana Sagara',
    emoji: '🌊',
    tagline: 'The scale where logistics is the event',
    description:
      'Past a certain size the food is the easy part. This is a planned operation: staggered seating, its own water and power, a medical point, and a control desk that knows where every one of your guests is meant to be.',
    // Finite on purpose. tierForGuests() walks this list and hands anything
    // past the last band to BESPOKE_TIER, which carries no price — an
    // open-ended `max: null` here would break that comparison and silently
    // price a 10,000-guest event off a 3,500-guest tier.
    guests: { min: 2000, max: 3500, typical: 2600 },
    coordinationFee: 160000,
    defaultDecor: 'royal_marquee',
    includedServices: ['dining', 'cleanup', 'cake', 'photography', 'videography', 'dj', 'emcee', 'transport', 'bouncers', 'live_music', 'makeup'],
    coordination: 'A full operations team: event director, section leads, a control desk and crew across every shift',
    onSiteManager: true,
    menuAllowance: { welcome: 6, starters: 10, mains: 8, curries: 10, accompaniments: 14, sweets: 7, counters: 6 },
    highlights: [
      'Staggered seating in batches, so nobody waits standing',
      'Independent water, power backup and a medical point',
      'Six or more live counters with dedicated replenishment',
      'Parking, crowd marshals and a control desk on site',
      'Full photo and video crew with drone coverage',
    ],
    accent: 'border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50',
    badge: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white',
    surface: 'bg-gradient-to-br from-teal-50 via-cyan-50/60 to-white border-teal-200/80',
    spine: 'bg-gradient-to-b from-teal-500 to-cyan-600',
    ink: 'text-teal-700',
  },
]

/**
 * Past the top rung.
 *
 * Kept out of CELEBRATION_TIERS on purpose: it has no price fields, and code
 * that maps over the ladder to compute a quote must never encounter a row it
 * cannot price. Shown at the end of the picker as the honest alternative to
 * inventing a number for a 2,000-guest reception.
 */
export const BESPOKE_TIER = {
  id: 'bespoke',
  name: 'Beyond This',
  localName: 'Nimma Kanasu',
  emoji: '✨',
  tagline: 'More than 3,500 guests, or nothing on this page fits',
  description:
    'Multi-day weddings, corporate flagships, anything with its own logistics. We will not put an automatic number on this — a coordinator builds it with you and you see every line before you agree to any of it.',
  // Tracks the top of CELEBRATION_TIERS. Was 1,200 when Royal Mysuru was the
  // last rung; the ladder now prices to 3,500, so the honest exit starts
  // above that.
  guests: { min: 3500, max: null },
  accent: 'border-plum-200 bg-plum-50',
  badge: 'bg-plum-100 text-plum-700',
  surface: 'bg-gradient-to-br from-plum-50 via-white to-white border-plum-200/80',
  spine: 'bg-gradient-to-b from-plum-600 to-berry-600',
  ink: 'text-plum-700',
}

export const TIER_BY_ID = Object.fromEntries(CELEBRATION_TIERS.map(t => [t.id, t]))

/**
 * Which tier a guest count lands in.
 *
 * The bands are contiguous and the last one is open-ended, so a number typed
 * into the guest field always resolves to something — including counts below
 * the smallest tier, which land on Close Circle rather than nothing.
 */
export function tierForGuests(guestCount) {
  if (!guestCount || guestCount < 1) return null
  if (guestCount > CELEBRATION_TIERS[CELEBRATION_TIERS.length - 1].guests.max) return BESPOKE_TIER
  return CELEBRATION_TIERS.find(t => guestCount <= t.guests.max) ?? CELEBRATION_TIERS[0]
}

/**
 * The two doors, kept as data because three surfaces describe them.
 *
 * `individual` is the trust-builder: one service, self-serve, no bundle
 * discount and no dedicated coordinator, with a floor under it so that an
 * hour of coordination is never spent on a ₹3,000 booking. `full` is the
 * business.
 */
export const BOOKING_MODES = {
  individual: {
    id: 'individual',
    name: 'Just one thing',
    emoji: '🧩',
    blurb: 'Book only the piece you need — catering, decor, photography — and handle the rest yourself.',
    bundleDiscount: 0,
    dedicatedCoordinator: false,
    minimums: {
      catering: { label: 'Catering', min: 20, unit: 'plates' },
      decor: { label: 'Decor', min: 5000, unit: 'rupees' },
      photography: { label: 'Photography', min: 8000, unit: 'rupees' },
    },
  },
  full: {
    id: 'full',
    name: 'The whole celebration',
    emoji: '👑',
    blurb: 'Food, decor, photography and the day itself — one coordinator, one price, one person to call.',
    bundleDiscount: BUNDLE_DISCOUNT_RATE,
    dedicatedCoordinator: true,
    minimums: {},
  },
}
