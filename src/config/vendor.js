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
 */
export const AVAILABILITY_STATES = {
  OPEN: {
    label: 'Open',
    short: 'Open',
    // Deliberately quiet. Open is the default for most of the year, and a
    // calendar where 340 days shout is a calendar nobody scans.
    cell:  'bg-white text-gray-700 border-gray-200 hover:border-plum-300',
    dot:   'bg-emerald-500',
  },
  LIMITED: {
    label: 'Partly booked',
    short: 'Partly',
    cell:  'bg-amber-50 text-amber-800 border-amber-300',
    dot:   'bg-amber-500',
  },
  BLOCKED: {
    label: 'Busy',
    short: 'Busy',
    cell:  'bg-rose-50 text-rose-700 border-rose-300 line-through decoration-rose-400',
    dot:   'bg-rose-500',
  },
}

/**
 * Tap order for a calendar cell.
 *
 * Open → Busy → Partly → Open. Busy comes first because it is what a vendor
 * opens the calendar to do — they are marking the Saturday they just got
 * booked for a wedding, and making that two taps instead of one is the
 * difference between a calendar that stays current and one that doesn't.
 */
export const AVAILABILITY_CYCLE = ['OPEN', 'BLOCKED', 'LIMITED']

export function nextAvailabilityState(current) {
  const i = AVAILABILITY_CYCLE.indexOf(current ?? 'OPEN')
  return AVAILABILITY_CYCLE[(i + 1) % AVAILABILITY_CYCLE.length]
}

/** 0 = Sunday, matching JS getDay() and vendors.weekly_days_off. */
export const WEEKDAYS = [
  { id: 0, short: 'S', label: 'Sunday'    },
  { id: 1, short: 'M', label: 'Monday'    },
  { id: 2, short: 'T', label: 'Tuesday'   },
  { id: 3, short: 'W', label: 'Wednesday' },
  { id: 4, short: 'T', label: 'Thursday'  },
  { id: 5, short: 'F', label: 'Friday'    },
  { id: 6, short: 'S', label: 'Saturday'  },
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
