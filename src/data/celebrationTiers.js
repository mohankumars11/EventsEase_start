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
      'Simple, well-finished decor at the entrance and cake table',
      'One coordinator you can message any time',
    ],
    accent: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
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
      'Marquee, mandap and full floral installation',
      'Banana-leaf service with a serving team per section',
      'Four or more live counters',
      'Multi-camera video, drone and same-day edit',
      'Guest hospitality desk and transport',
    ],
    accent: 'border-red-200 bg-gradient-to-br from-red-50 to-amber-50',
    badge: 'bg-gradient-to-r from-red-500 to-amber-500 text-white',
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
  tagline: 'More than 1,200 guests, or nothing on this page fits',
  description:
    'Multi-day weddings, corporate flagships, anything with its own logistics. We will not put an automatic number on this — a coordinator builds it with you and you see every line before you agree to any of it.',
  guests: { min: 1200, max: null },
  accent: 'border-plum-200 bg-plum-50',
  badge: 'bg-plum-100 text-plum-700',
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
