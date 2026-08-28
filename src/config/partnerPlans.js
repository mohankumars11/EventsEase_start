/**
 * What a master gets, and what they would pay for more of it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERYTHING IS FREE RIGHT NOW, AND THE LADDER IS STILL SHOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * `LAUNCH_OFFER` is true, so every master onboards on the top tier at no
 * cost. The paid tiers are still listed, priced, and described.
 *
 * That is deliberate. A master who joins on "free" and later discovers
 * there was always a paid tier feels sold to. A master who joins knowing
 * the ladder exists, and is told plainly that they are on the top of it
 * for free while we build the network, is being given something — and
 * they can see exactly what it is worth.
 *
 * It also stops us promising a launch price we cannot hold. The numbers
 * below are what these tiers will cost; nobody is being charged them yet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A TIER ACTUALLY BUYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old ladder sold "priority in coordinator search" and "5 enquiries a
 * month", which described a business that no longer exists — there is no
 * coordinator search on the instant side and enquiries are not the unit
 * of anything.
 *
 * On a dispatch marketplace the only thing worth selling is ACCESS TO
 * WORK, and there is exactly one honest lever for that: which wave a
 * master is offered a job in.
 *
 *   wave 1   the nearest five, inside the customer's own radius
 *   wave 2   ten kilometres, if nobody in wave 1 answered
 *   wave 3   fifteen kilometres
 *
 * Being in wave 1 is worth real money, because most jobs never reach wave
 * 2. That is a genuine advantage a master can feel, and it costs the
 * customer nothing — the job still goes to whoever accepts first.
 *
 * ── What is deliberately NOT for sale ────────────────────────────────
 *
 *   · The customer's price. A paid tier must never make a booking dearer.
 *   · Position in the match order. `match_partners` sorts by rating then
 *     distance, and a paid master jumping a better-rated one would make
 *     the rating meaningless — which is the one signal a customer has.
 *   · The commission rate. Discounting it for paying masters means the
 *     customer's money buys different things depending on who accepts.
 *
 * Selling any of those would be selling the customer's interests, and a
 * marketplace that does it once cannot credibly claim neutrality again.
 */

/** While true, every approved master is on `pro` and pays nothing. */
export const LAUNCH_OFFER = true

export const LAUNCH_NOTE =
  'Free while we build the network in Bengaluru. You are on the top plan, ' +
  'at no cost, and we will tell you well before that changes.'

export const PARTNER_PLANS = [
  {
    id: 'free',
    label: 'Starter',
    priceMonthly: 0,
    price: 'Free',
    lede: 'Everything you need to take your first jobs.',
    /** Which dispatch wave this tier is eligible for. */
    firstWave: 2,
    photoLimit: 3,
    features: [
      { text: 'Jobs from 10 km around you', included: true },
      { text: 'Accept and manage bookings', included: true },
      { text: 'Up to 3 photos of your work', included: true },
      { text: 'Paid 24 hours after every event', included: true },
      { text: 'First look at nearby jobs', included: false },
      { text: 'Instant alerts on your phone', included: false },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    priceMonthly: 499,
    price: '₹499 a month',
    popular: true,
    lede: 'See the jobs nearest you before anyone else.',
    firstWave: 1,
    photoLimit: 15,
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'FIRST LOOK — jobs within 5 km come to you first', included: true, emphasis: true },
      { text: 'Instant alerts on your phone', included: true },
      { text: 'Up to 15 photos', included: true },
      { text: 'Your work shown to customers before they book', included: true },
      { text: 'Earnings and demand reports', included: false },
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 999,
    price: '₹999 a month',
    lede: 'For a business that lives on this work.',
    firstWave: 1,
    photoLimit: null,
    features: [
      { text: 'Everything in Growth', included: true },
      { text: 'Unlimited photos', included: true },
      { text: 'Verified badge on your profile', included: true },
      { text: 'Earnings and demand reports', included: true },
      { text: 'See which weekends are filling up', included: true },
      { text: 'Priority support', included: true },
    ],
  },
]

export const PLAN_BY_ID = Object.fromEntries(PARTNER_PLANS.map(p => [p.id, p]))

/** The tier a master is effectively on, honouring the launch offer. */
export function effectiveTier(subscribedTier) {
  return LAUNCH_OFFER ? 'pro' : (subscribedTier ?? 'free')
}

/**
 * The earliest wave this master may be offered a job in.
 *
 * Read by the dispatcher. During the launch offer everybody is wave 1,
 * which is also the honest state of a network this small: excluding
 * anybody from the first wave when there are barely enough masters to
 * fill it would be selling an advantage that does not exist.
 */
export function firstWaveFor(subscribedTier) {
  return PLAN_BY_ID[effectiveTier(subscribedTier)]?.firstWave ?? 2
}

/** How many photos this master may upload. `null` means no limit. */
export function photoLimitFor(subscribedTier) {
  return PLAN_BY_ID[effectiveTier(subscribedTier)]?.photoLimit ?? 3
}
