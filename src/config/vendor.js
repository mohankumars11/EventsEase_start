/**
 * Vendor-side vocabulary.
 *
 * Kept out of config/sambramo.js because that file is customer-facing brand
 * copy and this is operational: units of sale, review states, plan tiers.
 * Mixing them is how "Free plan" ends up hardcoded in a component while the
 * database says `pro` — which is exactly the bug this file exists to retire.
 */

/**
 * The trades a partner can sign up as.
 *
 * Deliberately not SERVICE_CATEGORIES from config/sambramo.js: that list is how
 * a *customer* shops ("Food", "Decoration"), and this is what a *business*
 * calls itself ("Catering & Food", "Mehendi Artist"). One list forced to serve
 * both would make a mehendi artist register as "Personal".
 *
 * It lives here rather than inside VendorOnboarding because the starter
 * suggestions on the price-list screen are keyed by these exact strings — with
 * the list in one file and the keys in another, renaming "Cake & Desserts"
 * silently drops a baker back to the generic starters and nothing fails loudly.
 */
export const VENDOR_CATEGORIES = [
  'Catering & Food',
  'Photography',
  'Videography',
  'Decoration & Floral',
  'Venue',
  'DJ & Music',
  'Live Entertainment',
  'Bridal Makeup & Hair',
  'Wedding Planning',
  'Tent & Furniture',
  'Invitation & Printing',
  'Transportation',
  'Event Lighting',
  'Cake & Desserts',
  'Mehendi Artist',
  'Anchor & MC',
  'Sound & AV',
  'Valet Parking',
  'Security Services',
  /* ── Added when the catalogue was made fully dispatchable ────────
     Each one is a genuinely separate business in Bengaluru, not a
     sub-speciality of a trade already on this list. A bar supplier
     holds a licence a caterer does not; a generator hire firm owns
     trucks; a purohit is not an entertainer. Folding any of them into
     a neighbouring trade would broadcast their jobs to people who
     cannot do them, which is how partners learn to ignore alerts. */
  'Bar & Beverages',
  'Guest Services',
  'Power & Cooling',
  'Safety & Facilities',
  'Priest & Rituals',
  'Gifts & Favours',
  'Other',
]

/**
 * What a price buys.
 *
 * A bare number on a price list is unusable to whoever has to quote from it:
 * ₹400 is a great per-plate rate and an absurd per-event one. `suffix` is what
 * renders beside the money, and `quantityLabel` is what the vendor is asked to
 * put a minimum on — "Minimum plates" reads like a real question in a way that
 * "Minimum quantity" never does.
 */
export const SERVICE_UNITS = [
  { id: 'per event',  suffix: '/event',   quantityLabel: 'Minimum bookings' },
  { id: 'per plate',  suffix: '/plate',   quantityLabel: 'Minimum plates'   },
  { id: 'per person', suffix: '/person',  quantityLabel: 'Minimum guests'   },
  { id: 'per hour',   suffix: '/hour',    quantityLabel: 'Minimum hours'    },
  { id: 'per day',    suffix: '/day',     quantityLabel: 'Minimum days'     },
  { id: 'per piece',  suffix: '/piece',   quantityLabel: 'Minimum pieces'   },
  { id: 'per kg',     suffix: '/kg',      quantityLabel: 'Minimum kg'       },
  { id: 'per set',    suffix: '/set',     quantityLabel: 'Minimum sets'     },
]

export const UNIT_BY_ID = Object.fromEntries(SERVICE_UNITS.map(u => [u.id, u]))

/** Indian-format money without the paise a price list never needs. */
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/**
 * One list item as a coordinator reads it: "₹450/plate · min 100 plates".
 * A missing price is "Quote on request" rather than a blank or a zero —
 * both of those get read as free.
 */
export function describeService({ price, unit, min_quantity }) {
  const money = formatPrice(price)
  const u     = UNIT_BY_ID[unit] ?? UNIT_BY_ID['per event']
  const head  = money ? `${money}${u.suffix}` : 'Quote on request'
  if (!min_quantity || min_quantity <= 1) return head
  return `${head} · min ${min_quantity}${u.suffix.replace('/', ' ')}`
}

/**
 * The review states from migration 005, with the copy a vendor should read.
 *
 * `tone` drives the banner colour; `blocking` says whether the vendor is
 * currently invisible to customers, which decides whether the dashboard leads
 * with the status or with the work.
 */
export const VENDOR_STATUS = {
  PENDING_REVIEW: {
    label: 'Under review',
    tone:  'amber',
    blocking: true,
    headline: 'Your profile is with our team',
    detail:   'We review every partner by hand, usually within 24–48 hours. You can build your list and set your availability now — both go live the moment you are approved.',
  },
  APPROVED: {
    label: 'Live',
    tone:  'green',
    blocking: false,
    headline: 'You are live on Sambramo',
    detail:   'Our coordinators can now put you in front of customers. Keep your list and your calendar current and you will be matched more often.',
  },
  REJECTED: {
    label: 'Not approved',
    tone:  'rose',
    blocking: true,
    headline: 'We could not approve this profile yet',
    detail:   'This is usually something small and fixable. Talk to us and we will tell you exactly what is missing.',
  },
  SUSPENDED: {
    label: 'Paused',
    tone:  'gray',
    blocking: true,
    headline: 'Your listing is paused',
    detail:   'Your profile is hidden from customers for now. Your list and calendar are safe — nothing has been deleted.',
  },
}

/**
 * Availability states, vendor-facing.
 *
 * The wording matters more than it looks. The database says BLOCKED; a vendor
 * reading their own calendar thinks "I'm busy that day", not "I am blocked".
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY STATE CARRIES ITS OWN CONSEQUENCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `label` is the noun on the legend. `verb` is what the partner is choosing
 * to DO when they tap it, and `consequence` is what happens to them after
 * they do — "we will send you jobs", "we will not". A picker built out of
 * nouns alone ("Open · Partly booked · Busy") asks somebody to translate
 * three database words into an outcome, and the partner most likely to get
 * that wrong is the one this app is built for.
 *
 * `cell` is the calendar square, `chip` the big button in the day sheet.
 */
export const AVAILABILITY_STATES = {
  OPEN: {
    label: 'Open',
    short: 'Open',
    verb:  'Open — send me jobs',
    consequence: 'You can be booked on this day.',
    // Deliberately quiet. Open is the default for most of the year, and a
    // calendar where 340 days shout is a calendar nobody scans.
    cell:  'bg-white text-gray-700 border-gray-200 hover:border-plum-300',
    dot:   'bg-emerald-500',
    swatch: 'bg-white ring-1 ring-inset ring-gray-300',
    chip:  'border-emerald-500 bg-emerald-50 text-emerald-900',
    chipIcon: 'bg-emerald-600 text-white',
  },
  LIMITED: {
    label: 'Partly booked',
    short: 'Partly',
    verb:  'Partly booked — a few slots left',
    consequence: 'You can still be booked, up to the number of jobs you set.',
    cell:  'bg-amber-50 text-amber-800 border-amber-300',
    dot:   'bg-amber-500',
    swatch: 'bg-amber-300',
    chip:  'border-amber-500 bg-amber-50 text-amber-900',
    chipIcon: 'bg-amber-500 text-white',
  },
  BLOCKED: {
    label: 'Busy',
    short: 'Busy',
    verb:  'Busy — do not send me jobs',
    consequence: 'You will not be offered anything on this day.',
    cell:  'bg-rose-50 text-rose-700 border-rose-300 line-through decoration-rose-400',
    dot:   'bg-rose-500',
    swatch: 'bg-rose-400',
    chip:  'border-rose-500 bg-rose-50 text-rose-900',
    chipIcon: 'bg-rose-600 text-white',
  },
}

/** The order the three read in, from most available to least. */
export const AVAILABILITY_ORDER = ['OPEN', 'LIMITED', 'BLOCKED']

/**
 * Tap order for a calendar cell.
 *
 * Open → Busy → Partly → Open. Busy comes first because it is what a vendor
 * opens the calendar to do — they are marking the Saturday they just got
 * booked for a wedding, and making that two taps instead of one is the
 * difference between a calendar that stays current and one that doesn't.
 *
 * KEPT, BUT NO LONGER WIRED TO THE GRID. Tapping a square now opens a picker
 * that names all three states and says what each one costs, because a cycle
 * is only discoverable to somebody who already knows it is a cycle — and
 * "partly booked" was unreachable in practice: nobody taps a Saturday twice
 * to find out what happens. This stays for any surface that wants a one-tap
 * toggle in a tight space.
 */
export const AVAILABILITY_CYCLE = ['OPEN', 'BLOCKED', 'LIMITED']

export function nextAvailabilityState(current) {
  const i = AVAILABILITY_CYCLE.indexOf(current ?? 'OPEN')
  return AVAILABILITY_CYCLE[(i + 1) % AVAILABILITY_CYCLE.length]
}

/**
 * How far ahead a partner is asked to answer for.
 *
 * Six months, because that is how far ahead this market books the events that
 * pay best: a wedding date is fixed at the engagement and the muhurtham is
 * often set a season in advance, so the Saturday somebody is enquiring about
 * today is routinely in February. A calendar that only knows about the next
 * four weeks is silent on exactly the bookings worth the most.
 */
export const CALENDAR_HORIZON_MONTHS = 6

/** 0 = Sunday, matching JS getDay() and vendors.weekly_days_off. */
export const WEEKDAYS = [
  { id: 0, short: 'S', label: 'Sunday',    abbr: 'Sun' },
  { id: 1, short: 'M', label: 'Monday',    abbr: 'Mon' },
  { id: 2, short: 'T', label: 'Tuesday',   abbr: 'Tue' },
  { id: 3, short: 'W', label: 'Wednesday', abbr: 'Wed' },
  { id: 4, short: 'T', label: 'Thursday',  abbr: 'Thu' },
  { id: 5, short: 'F', label: 'Friday',    abbr: 'Fri' },
  { id: 6, short: 'S', label: 'Saturday',  abbr: 'Sat' },
]

/** Month names, long and short. One list, so the two can never drift. */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Plan tiers, keyed by the values `vendors.subscription_plan` actually allows
 * ('free' | 'growth' | 'pro' — see migration 001). The old dashboard listed
 * these as display strings with no link to the column, so it showed every
 * vendor "Free plan" and offered a paying one an upgrade they already had.
 */
export const VENDOR_PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: '₹0/mo',
    features: ['Listed in coordinator search', 'Up to 3 photos', '5 enquiries a month'],
  },
  {
    id: 'growth',
    label: 'Growth',
    price: '₹499/mo',
    popular: true,
    features: ['Priority in coordinator search', 'Up to 15 photos', 'Unlimited enquiries', 'Featured badge'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '₹999/mo',
    features: ['Top of coordinator search', 'Unlimited photos', 'Unlimited enquiries', 'Featured + verified badge', 'Performance analytics'],
  },
]

/** Local YYYY-MM-DD. `toISOString()` would shift IST dates back a day. */
export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ══════════════════════════════════════════════════════════════════════
   WHICH TRADE DOES THIS SERVICE GO TO?
   ══════════════════════════════════════════════════════════════════════

   Instant dispatch matches on TRADE, not on the customer's word for what
   they want. The two are genuinely different vocabularies and the note at
   the top of VENDOR_CATEGORIES already says why: a customer shops for
   "Theme decoration" and "Floral decoration" as two choices; both are one
   business, "Decoration & Floral", and dispatching on the customer's word
   would find nobody at all.

   Written as a map rather than a field on each service, because the
   service catalogue lives in data/servicePricing.js and data/
   eventServicesData.js — the concierge's authority — and adding a
   dispatch-only field to it would make instant booking's needs leak into
   quotes that have nothing to do with dispatch.

   Anything absent here is NOT INSTANT-DISPATCHABLE, and that is the safe
   default: an unmapped service falls to pre-book rather than being
   broadcast to a trade somebody guessed at.
*/
export const TRADE_FOR_SERVICE = {
  /* ── Everything below the first block was added in stage 3 ────────
     Until then 26 services in the catalogue had a price and no trade:
     quotable, and matchable by nobody. A partner who listed one got a
     row dispatch could never see, was never offered a job, and was
     never told why -- the same failure as the "videpgraphy" row, but
     built deliberately rather than typed by accident. */
  decor:          'Decoration & Floral',
  floral:         'Decoration & Floral',
  stage:          'Decoration & Floral',
  mandap:         'Decoration & Floral',
  vehicle_decor:  'Decoration & Floral',
  balloon:        'Decoration & Floral',

  catering:       'Catering & Food',
  cooks:          'Catering & Food',
  welcome_drinks: 'Catering & Food',
  ice_cream:      'Catering & Food',
  sweets:         'Catering & Food',

  cake:           'Cake & Desserts',

  photography:    'Photography',
  photobooth:     'Photography',
  videography:    'Videography',

  dj:             'DJ & Music',
  live_music:     'Live Entertainment',
  drum:           'Live Entertainment',
  entertainment:  'Live Entertainment',
  choreography:   'Live Entertainment',
  kids_play:      'Live Entertainment',
  emcee:          'Anchor & MC',

  makeup:         'Bridal Makeup & Hair',
  bridal_wear:    'Bridal Makeup & Hair',
  mehendi:        'Mehendi Artist',

  dining:         'Tent & Furniture',
  tent:           'Tent & Furniture',
  cleanup:        'Tent & Furniture',

  lighting:       'Event Lighting',
  av_setup:       'Sound & AV',

  invitations:    'Invitation & Printing',
  transport:      'Transportation',
  bouncers:       'Security Services',
  venue:          'Venue',
  /* ── Stage 3 ─────────────────────────────────────────────────────── */

  // Catering: a live counter is its own supplier, wheeled in and run by
  // its own staff, and is routinely booked without the main caterer.
  live_counters:  'Catering & Food',
  // Same trade as 'catering', which it overlaps. Mapping it here rather
  // than leaving it unmatchable means the worst case is a customer
  // booking two catering lines -- never a job sent to somebody who
  // cannot cook it.
  menu:           'Catering & Food',
  hospitality:    'Guest Services',
  nanny:          'Guest Services',

  // Drinks. A bar supplier holds a licence and carries stock; a caterer
  // generally does neither, which is why this is not 'Catering & Food'.
  bar:            'Bar & Beverages',

  // Performers. 'drum' already covered dhol; nadaswaram and shehnai are a
  // different tradition with different players, and a wedding that wants
  // one will not accept the other.
  folk:           'Live Entertainment',
  nadaswaram:     'Live Entertainment',
  bhajan:         'Live Entertainment',
  baraat:         'Live Entertainment',

  // Media. Both are separately bookable from a photographer: a drone
  // operator and a streaming crew arrive with their own kit and often
  // their own licence.
  livestream:     'Videography',
  drone:          'Videography',
  memory_wall:    'Decoration & Floral',
  // Overlaps 'balloon'; same trade, same reasoning as 'menu' above.
  balloon_arch:   'Decoration & Floral',

  // Site infrastructure. Hired by the day, delivered on a truck.
  power:          'Power & Cooling',
  cooling:        'Power & Cooling',
  washrooms:      'Safety & Facilities',
  medical:        'Safety & Facilities',

  // Vehicles and the ground.
  wedding_car:    'Transportation',
  vehicle_care:   'Transportation',
  valet:          'Valet Parking',

  // Print.
  signage:        'Invitation & Printing',

  // Ritual. A purohit is not an entertainer and must not be sent an
  // entertainer's jobs -- the single clearest case for a trade of its own.
  priest:         'Priest & Rituals',
  pooja:          'Priest & Rituals',

  // Gifts.
  return_gifts:   'Gifts & Favours',
  gifting:        'Gifts & Favours',

  // Effects and one-off setups.
  fireworks:      'Event Lighting',
  candle_setup:   'Decoration & Floral',
  inauguration:   'Decoration & Floral',
}

/** Dispatchable if we know which trade to ask. Nothing else qualifies. */
export function tradeFor(serviceId) {
  return TRADE_FOR_SERVICE[serviceId] ?? null
}

/** Every service a given trade can be dispatched for. Used by the seeder. */
export const SERVICES_FOR_TRADE = Object.entries(TRADE_FOR_SERVICE)
  .reduce((acc, [service, trade]) => {
    (acc[trade] ??= []).push(service)
    return acc
  }, {})
