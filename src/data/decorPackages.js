// Decoration: the level, the look, and the extras.
//
// ── Three questions, not one ────────────────────────────────────────────
// "Theme Decoration — ₹5,000 to ₹60,000" collapses three separate decisions
// into one unanswerable range. They are actually independent, and a customer
// answers them in this order:
//
//   1. HOW MUCH decor — one styled corner, or a marquee. This is the money.
//   2. WHAT IT LOOKS LIKE — the palette and the flowers. Usually free, and it
//      is the question people most want to be asked, because decor is bought
//      to match something: an invite, a saree, a cake.
//   3. WHAT ELSE — the extras a decorator would otherwise have to ring about.
//
// Splitting them means the price moves only on question 1, so a customer can
// play with the look without watching the number jump — which is exactly the
// behaviour that builds enough confidence to book.
//
// ── Why decor is fixed cost plus a small per-guest tail ─────────────────
// A stage is a stage whether eighty people or eight hundred look at it, so the
// bulk of decor does not scale with the guest list. But table centrepieces,
// chair covers and aisle flowers do, one per table of ten, and pretending
// otherwise underquotes every large event by a predictable amount. Hence
// `fixedCost` (the installation) plus `perGuestTouch` (the table work).
//
// Estimates for Bengaluru and Mysore, pre-launch, no signed decorator behind
// them yet. Re-check against real rate cards before treating any of it as a
// commitment.

export const DECOR_LEVELS = [
  {
    id: 'none',
    name: 'No decor needed',
    emoji: '🚫',
    tagline: 'We are handling the decoration ourselves',
    fixedCost: 0,
    perGuestTouch: 0,
    inclusions: [],
    hidden: true, // offered in the single-service funnel, not on the tier ladder
  },
  {
    id: 'home_touch',
    name: 'Home Touch',
    emoji: '🌿',
    tagline: 'The entrance, the cake table, and the corner everyone photographs',
    description:
      'Enough to make a home or a small hall look like something is happening, set up before guests arrive and cleared after.',
    fixedCost: 4500,
    perGuestTouch: 15,
    setupHours: 3,
    inclusions: [
      'Entrance arch or door drape',
      'Balloon or floral backdrop (about 8 ft)',
      'Cake or pooja table styling',
      'Fairy lights through the main room',
      'Setup and clearing by our team',
    ],
  },
  {
    id: 'classic',
    name: 'Classic Celebration',
    emoji: '🎀',
    tagline: 'A real stage, styled tables, and the room lit properly',
    description:
      'The standard hall setup — a backdrop that photographs well, table arrangements, and enough lighting that the photos are not orange.',
    fixedCost: 18000,
    perGuestTouch: 35,
    setupHours: 5,
    inclusions: [
      'Stage backdrop with draping and floral panel',
      'Entrance arch and welcome board',
      'Table centrepieces across guest tables',
      'Pathway and stage lighting',
      'Chair covers and table linen',
      'Setup and clearing by our team',
    ],
  },
  {
    id: 'signature',
    name: 'Signature Styling',
    emoji: '✨',
    tagline: 'Designed, not assembled — a look built for your event',
    description:
      'A designer draws the setup before anything is ordered, and the palette runs through the stage, the tables, the entrance and the photo corner.',
    fixedCost: 45000,
    perGuestTouch: 60,
    setupHours: 8,
    popular: true,
    inclusions: [
      'Designed stage with layered draping and fresh florals',
      'Entrance installation and welcome signage',
      'Photo corner / selfie installation',
      'Full table styling with runners and centrepieces',
      'Ambient uplighting and stage wash',
      'Ceiling drapes or hanging florals',
      'Designer visit before the day, setup and clearing',
    ],
  },
  {
    id: 'grand_stage',
    name: 'Grand Stage',
    emoji: '🎪',
    tagline: 'A production — truss, lighting design and floral installation',
    description:
      'Built the night before by a crew. Structural stage, programmed lighting, and floral work heavy enough to read from the back of a large hall.',
    fixedCost: 110000,
    perGuestTouch: 95,
    setupHours: 16,
    inclusions: [
      'Structural stage with truss and designed backdrop',
      'Programmed lighting with wash, spots and effects',
      'Large-scale floral installation, fresh flowers',
      'Entrance foyer styling and pathway decor',
      'Full table and seating styling',
      'LED screen or projection backdrop',
      'Overnight setup crew, on-site supervisor, full clearing',
    ],
  },
  {
    id: 'royal_marquee',
    name: 'Royal Marquee',
    emoji: '👑',
    tagline: 'Mandap, marquee and floral work at palace-city scale',
    description:
      'For the celebration where the decor is the venue. Marquee, mandap, imported and local florals, and a crew on site across three days.',
    fixedCost: 250000,
    perGuestTouch: 150,
    setupHours: 40,
    inclusions: [
      'Marquee or pandal with full draping',
      'Traditional or contemporary mandap, fully floral',
      'Imported and seasonal flower installations',
      'Designed lighting across venue, stage and grounds',
      'Entrance, foyer, pathway and seating styling',
      'Photo installations and family portrait corner',
      'Three-day crew, dedicated on-site design supervisor',
    ],
  },
]

export const DECOR_LEVEL_BY_ID = Object.fromEntries(DECOR_LEVELS.map(d => [d.id, d]))
/** The ladder as shown on the tier flow — `none` only exists for single-service bookings. */
export const VISIBLE_DECOR_LEVELS = DECOR_LEVELS.filter(d => !d.hidden)

/**
 * The look.
 *
 * Almost all of these are free, deliberately. Colour is not a cost driver at
 * this scale — the decorator buys roses either way — and charging for it turns
 * the most enjoyable question in the flow into a paywall. The three that carry
 * a premium carry it because the flowers genuinely cost more or have to be
 * flown in.
 *
 * Named the way an invitation names a colour, not the way a paint chart does.
 * Same rule as the party-decor customiser, and for the same reason: nobody
 * asks a decorator for "#F7CAC9".
 */
export const DECOR_THEMES = [
  { id: 'traditional_red_gold', name: 'Traditional red & gold', delta: 0, note: 'Marigold, roses, brass and mango leaf' },
  { id: 'pastel', name: 'Pastel — blush, mint and cream', delta: 0 },
  { id: 'white_gold', name: 'White & gold', delta: 0, note: 'Reads formal; photographs cleanest' },
  { id: 'mysuru_royal', name: 'Mysuru royal — purple, gold and ivory', delta: 12000, note: 'Palace palette, heavier drape work' },
  { id: 'marigold_temple', name: 'Marigold & temple traditional', delta: 0, note: 'For poojas, griha pravesh and namakarana' },
  { id: 'rose_gold', name: 'Blush & rose gold', delta: 0 },
  { id: 'tropical_green', name: 'Tropical green & white', delta: 0, note: 'Palm, monstera and orchids' },
  { id: 'royal_blue_silver', name: 'Royal blue & silver', delta: 0 },
  { id: 'earthy_boho', name: 'Earthy boho — pampas and jute', delta: 6000, note: 'Dried florals are imported and priced per stem' },
  { id: 'rainbow_kids', name: 'Bright rainbow — for the kids', delta: 0 },
  { id: 'monochrome', name: 'Monochrome — black, white and one accent', delta: 0, note: 'Corporate events and milestone birthdays' },
  { id: 'imported_florals', name: 'Imported florals — orchids, lilies, tulips', delta: 35000, note: 'Priced on the day\'s auction rate; we confirm before ordering' },
  { id: 'match_my_invite', name: 'Match my invite — I will send a photo', delta: 0, note: 'Send it on WhatsApp and the designer works from it' },
]

/**
 * Extras.
 *
 * Every one of these is something a decorator would otherwise phone about
 * three days before the event, which is the worst moment to be making a
 * spending decision. Asked here instead, at a point where the customer is
 * comparing rather than committing.
 */
export const DECOR_ADDONS = [
  { id: 'photo_booth', name: 'Photo booth with props and instant prints', price: 12000 },
  { id: 'neon_sign', name: 'Custom neon light-up sign', price: 8500, note: 'Yours to keep' },
  { id: 'flower_shower', name: 'Flower shower / petal cannons at the entrance', price: 6500 },
  { id: 'cold_pyro', name: 'Cold pyro for the cake cutting or entry', price: 15000, note: 'Indoor-safe, no smoke' },
  { id: 'led_wall', name: 'LED video wall behind the stage', price: 45000 },
  { id: 'fog_low', name: 'Low-lying fog for the first dance or entry', price: 9000 },
  { id: 'car_decor', name: 'Car decoration for the couple or the family', price: 5500 },
  { id: 'rangoli', name: 'Hand-drawn rangoli at the entrance', price: 3500, note: 'Drawn on the morning by an artist' },
  { id: 'mango_toran', name: 'Fresh mango leaf toran across doorways', price: 2800 },
  { id: 'seating_signage', name: 'Printed seating chart and table signage', price: 4500 },
  { id: 'kids_corner', name: 'Decorated kids corner with soft play', price: 18000 },
  { id: 'valet_welcome', name: 'Decorated welcome desk with attendants', price: 11000 },
  { id: 'drone_lights', name: 'Overhead light canopy across the dining area', price: 32000 },
  { id: 'floral_jewellery', name: 'Fresh floral jewellery for the family', price: 7500, note: 'Mehendi, seemantham and haldi ceremonies' },
]

/**
 * How the decor level scales when the hall is much bigger than the level was
 * drawn for.
 *
 * A Classic setup in a 600-guest hall is not a Classic setup — the same stage
 * looks lost, and a decorator will quote more drape to fill the room. Rather
 * than block the combination, the quote carries a stretch factor and the UI
 * says plainly that a bigger level would fit better. Blocking would be worse:
 * a family choosing a modest setup for a large wedding is usually doing it on
 * purpose, and telling them they may not is how you lose the booking.
 */
export function decorStretch(level, guestCount) {
  const drawnFor = { home_touch: 40, classic: 120, signature: 250, grand_stage: 600, royal_marquee: 1200 }[level?.id]
  if (!drawnFor || !guestCount || guestCount <= drawnFor) return 1
  // Half of the overshoot, capped — the venue gets bigger but the stage does
  // not have to grow one-for-one with it.
  return Math.min(1 + ((guestCount - drawnFor) / drawnFor) * 0.5, 1.9)
}
