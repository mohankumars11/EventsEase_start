// Everything that is not food and not décor, priced properly.
//
// ── The bug this fixes ──────────────────────────────────────────────────
// The catalogue's service list carries strings like "₹250 – ₹800/plate",
// "₹1,500 – ₹3,000/person", "₹50 – ₹200/seat" — the unit lives inside the
// price text. Nothing can compute with that, which is why SHOW_SERVICE_PRICES
// is false in config/sambramo.js and why every service card in the app reads
// "Custom quote": somebody scanning a list reads the first number as the price
// of the whole job, and that is a worse impression than showing nothing.
//
// So the unit is its own field here. A service is `fixed` (one price for the
// job), `per_guest` (grows one-for-one with the headcount) or `per_unit` (a
// countable thing — guards, hours, artists) with a rule for how many. That is
// the whole difference between a quote engine and a price list.
//
// ── Why fixed prices still move with guest count ────────────────────────
// A photographer at a 600-guest wedding is not the same booking as a
// photographer at a 40-guest naming ceremony: it is two shooters, more hours
// and more deliverables. So `scales: true` multiplies the base by the size
// factor below. Services where that is not true — a priest performs the same
// rite for thirty people or three hundred — carry `scales: false` and stay
// flat, which is the honest answer and also the cheap one.
//
// Bengaluru and Mysore market estimates, pre-launch, no signed vendor behind
// any of them. Same standing caveat as every other rate in this app: re-check
// against real vendor rate cards before anybody is held to one.

/**
 * How a fixed-price service grows with the size of the event.
 *
 * Banded rather than continuous so that 149 guests and 151 guests do not
 * produce two visibly different photography quotes for what is the same job.
 * Baseline is the 151–350 band, which is where the `base` figures are quoted.
 */
const SIZE_BANDS = [
  { upTo: 30, factor: 0.45 },
  { upTo: 75, factor: 0.60 },
  { upTo: 150, factor: 0.80 },
  { upTo: 350, factor: 1.00 },
  { upTo: 600, factor: 1.35 },
  { upTo: 1000, factor: 1.75 },
  { upTo: Infinity, factor: 2.20 },
]

export function sizeFactor(guestCount) {
  return (SIZE_BANDS.find(b => (guestCount || 0) <= b.upTo) ?? SIZE_BANDS[SIZE_BANDS.length - 1]).factor
}

/**
 * The services a customer can add, grouped the way they are shopped for
 * rather than the way they are supplied.
 *
 * Deliberately absent, because they are already priced elsewhere and billing
 * for them twice is the fastest way to lose trust in the whole number:
 *
 *   catering, cooks, menu, welcome drinks   → the Food step (cuisineMenus.js)
 *   décor, stage, floral, balloon arch,
 *   mandap, lighting                        → the Décor step (decorPackages.js)
 *
 * `qtyFor` on a per_unit service answers "how many of these does an event this
 * size need" so the customer never has to work out how many guards 400 guests
 * take. They can still override it.
 */
export const SERVICE_GROUPS = [
  {
    id: 'core',
    label: 'The basics',
    hint: 'Most celebrations need these',
    services: [
      { id: 'venue', name: 'Venue booking', emoji: '🏛️', unit: 'fixed', base: 60000, scales: true,
        desc: 'Banquet hall, garden, rooftop or lawn', note: 'Skip this if you have your own venue or are at home' },
      { id: 'dining', name: 'Seating & dining setup', emoji: '🪑', unit: 'per_guest', base: 120,
        desc: 'Tables, chairs, linen, crockery and cutlery' },
      { id: 'cake', name: 'Celebration cake', emoji: '🎂', unit: 'fixed', base: 3500, scales: true,
        desc: 'Designer or theme cake, cut on the day' },
      { id: 'cleanup', name: 'Venue cleanup', emoji: '🧹', unit: 'fixed', base: 6000, scales: true,
        desc: 'Full clearing and waste removal after everyone leaves' },
    ],
  },
  {
    id: 'memories',
    label: 'Photos & video',
    hint: 'The part you still have in twenty years',
    services: [
      { id: 'photography', name: 'Photography', emoji: '📸', unit: 'fixed', base: 25000, scales: true,
        desc: 'Candid and portrait coverage, edited album' },
      { id: 'videography', name: 'Videography', emoji: '🎬', unit: 'fixed', base: 35000, scales: true,
        desc: 'Cinematic 4K film, highlights reel' },
      { id: 'photobooth', name: 'Photo booth', emoji: '🤳', unit: 'fixed', base: 12000, scales: false,
        desc: 'Props and instant prints your guests take home' },
      { id: 'memory_wall', name: 'Memory wall / tribute', emoji: '🖼️', unit: 'fixed', base: 8000, scales: false,
        desc: 'Printed photo wall or life-story display' },
    ],
  },
  {
    id: 'entertainment',
    label: 'Music & entertainment',
    hint: 'What keeps the room going',
    services: [
      { id: 'dj', name: 'DJ & sound system', emoji: '🎵', unit: 'fixed', base: 18000, scales: true,
        desc: 'Console, PA, sub-woofers and an operator' },
      { id: 'live_music', name: 'Live band or classical', emoji: '🎸', unit: 'fixed', base: 45000, scales: false,
        desc: 'Live band, classical ensemble, Bollywood or folk' },
      { id: 'drum', name: 'Dhol / nadaswaram / percussion', emoji: '🥁', unit: 'fixed', base: 8000, scales: false,
        desc: 'Traditional welcome for the entrance or procession' },
      { id: 'emcee', name: 'Emcee / anchor', emoji: '🎙️', unit: 'fixed', base: 12000, scales: false,
        desc: 'Bilingual host to run the programme' },
      { id: 'entertainment', name: 'Performers', emoji: '💃', unit: 'fixed', base: 25000, scales: false,
        desc: 'Dancers, magicians, folk artists' },
      { id: 'choreography', name: 'Family dance choreography', emoji: '🕺', unit: 'fixed', base: 20000, scales: false,
        desc: 'Rehearsals and routines for the sangeet' },
      { id: 'kids_play', name: 'Kids play zone', emoji: '🎠', unit: 'fixed', base: 15000, scales: true,
        desc: 'Bouncy castle, games and a supervisor' },
      { id: 'fireworks', name: 'Fireworks / cold pyro', emoji: '🎆', unit: 'fixed', base: 20000, scales: false,
        desc: 'Sparklers, sky lanterns or indoor-safe cold pyro' },
    ],
  },
  {
    id: 'ritual',
    label: 'Rituals & tradition',
    hint: 'Booked most for poojas, weddings and namakarana',
    services: [
      { id: 'priest', name: 'Priest / purohit', emoji: '🙏', unit: 'fixed', base: 6000, scales: false,
        desc: 'Experienced purohit for the rite, in your language' },
      { id: 'pooja', name: 'Pooja samagri & setup', emoji: '🪔', unit: 'fixed', base: 5000, scales: false,
        desc: 'Every item on the list, arranged before the muhurat' },
      { id: 'mehendi', name: 'Mehendi artists', emoji: '🪷', unit: 'fixed', base: 8000, scales: true,
        desc: 'Bridal and guest mehendi' },
    ],
  },
  {
    id: 'people',
    label: 'Looking after people',
    hint: 'The things guests notice when they are missing',
    services: [
      { id: 'makeup', name: 'Makeup & hair styling', emoji: '💄', unit: 'fixed', base: 12000, scales: false,
        desc: 'Professional artist for the family' },
      { id: 'bridal_wear', name: 'Bridal / groom styling', emoji: '👰', unit: 'fixed', base: 25000, scales: false,
        desc: 'Makeup, draping and a styling team on the day' },
      { id: 'transport', name: 'Guest transport', emoji: '🚌', unit: 'fixed', base: 15000, scales: true,
        desc: 'Bus and cab coordination for out-of-town guests' },
      { id: 'bouncers', name: 'Security & crowd management', emoji: '🛡️', unit: 'per_unit', base: 2200,
        unitLabel: 'guard', qtyFor: g => Math.max(2, Math.ceil((g || 0) / 100)),
        desc: 'Trained guards at the entrance and the gift table' },
      { id: 'av_setup', name: 'AV & presentation setup', emoji: '🖥️', unit: 'fixed', base: 18000, scales: true,
        desc: 'Projector, screens and mics for speeches' },
      { id: 'tent', name: 'Tent / pandal / shamiana', emoji: '⛺', unit: 'fixed', base: 25000, scales: true,
        desc: 'Covered structure for an outdoor or home event' },
    ],
  },
  {
    id: 'takeaway',
    label: 'What guests take home',
    hint: 'Priced per guest, so it moves with your headcount',
    services: [
      { id: 'return_gifts', name: 'Return gifts', emoji: '🎁', unit: 'per_guest', base: 150,
        desc: 'Packed and labelled, one per guest' },
      { id: 'gifting', name: 'Premium gift hampers', emoji: '🎀', unit: 'per_guest', base: 350,
        desc: 'Curated hampers for close family or corporate guests' },
      { id: 'invitations', name: 'Invitations & printing', emoji: '💌', unit: 'per_guest', base: 25,
        desc: 'Digital and printed cards, menu cards, signage' },
      { id: 'ice_cream', name: 'Dessert / ice cream counter', emoji: '🍦', unit: 'per_guest', base: 60,
        desc: 'Live counter, separate from the meal' },
      { id: 'candle_setup', name: 'Candle & romantic setup', emoji: '🕯️', unit: 'fixed', base: 8000, scales: false,
        desc: 'Candle pathway, floating flowers, fairy lights' },
    ],
  },
]

export const ALL_SERVICES = SERVICE_GROUPS.flatMap(g => g.services)
export const SERVICE_BY_ID = Object.fromEntries(ALL_SERVICES.map(s => [s.id, s]))

/** How many units of a per_unit service an event this size needs. */
export function defaultQty(service, guestCount) {
  if (service?.unit !== 'per_unit') return 1
  return service.qtyFor ? service.qtyFor(guestCount) : 1
}

/**
 * What one service costs at this size.
 *
 * Rounded to ₹10 so a quote never shows ₹24,847 — a number that precise is a
 * claim of precision this data cannot support, and it reads as a machine
 * output rather than a price somebody stands behind.
 */
export function serviceCost(service, guestCount, qty) {
  if (!service) return 0
  const round10 = n => Math.round(n / 10) * 10
  if (service.unit === 'per_guest') return round10(service.base * (guestCount || 0))
  if (service.unit === 'per_unit') return round10(service.base * (qty ?? defaultQty(service, guestCount)))
  return round10(service.base * (service.scales ? sizeFactor(guestCount) : 1))
}

/** Human-readable "₹120 per guest" / "₹2,200 per guard" / "one-off". */
export function serviceUnitLabel(service) {
  if (service?.unit === 'per_guest') return 'per guest'
  if (service?.unit === 'per_unit') return `per ${service.unitLabel ?? 'unit'}`
  return service?.scales ? 'for the event, scaled to your size' : 'for the event'
}
