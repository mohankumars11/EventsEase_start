// The décor catalogue — every setup we install, priced, on the occasion's own page.
//
// ── What this replaced, and why ───────────────────────────────────────────
// The occasion page used to carry four décor "samples" in a 2×2 grid. Tapping
// one opened a photograph, and the only way forward from that photograph was a
// button that navigated to /plan — a different page, a different mental model,
// and a wizard the customer had not asked for. Somebody who tapped a picture
// of a candlelight dinner because they wanted to know what a candlelight
// dinner costs was answered with a form about their guest count.
//
// So the four samples stop being teasers and this file becomes the thing they
// were teasing: the whole décor list for the occasion, priced, filterable and
// selectable where it stands. Nothing navigates. See components/event/
// DecorCatalog.jsx, which renders it.
//
// ── Why the prices here are shown when SHOW_SERVICE_PRICES is false ───────
// That flag is not a blanket "no numbers" policy and reading it as one is what
// left this page silent. Its own comment says exactly what it is about: the
// per-service priceHint strings are UNIT-BEARING — "₹250 – ₹800/plate",
// "₹50 – ₹200/seat" — and somebody scanning a list reads the first figure as
// the price of the whole job. That is a misreading risk specific to per-head
// pricing, and it does not exist here.
//
// Every number in this file is one absolute rupee figure for one installed
// setup, at a stated standard size, with the size printed beside it. There is
// no unit to drop and no per-head multiplier hiding behind it. "₹2,999, table
// for two, at your home" cannot be misread the way "₹250/plate" can.
//
// It is also the number the customer is actually shopping for. Décor is the
// one part of a celebration people buy the way they buy a product — a fixed
// installation, a fixed look, a fixed morning's work — and every competitor in
// this market prices it openly on a card. A page that shows the photograph and
// hides the figure loses to the one that shows both, and it loses at the exact
// moment the customer was ready.
//
// ── Where the numbers come from ───────────────────────────────────────────
// Market research across the Indian décor-at-home sector, August 2026 —
// BalloonDekor, Giftlaya, 7Eventzz, Jusst4You, Skyrixe, Floriwish and
// PartyOne's published catalogue prices, WedMeGood and Velvet Knot's decorator
// cost guides for the wedding-scale entries, and Tivoli's pre-wedding function
// cost guide for haldi/mehendi/sangeet. Cross-checked so that no figure here
// sits below what the cheapest national operator publishes for the same
// physical setup.
//
// They are INDICATIVE STARTING PRICES for a standard-size setup in a pilot
// city, and every surface that shows one says so. `price` is what the setup
// costs at the size described in `where`; `priceTo` is the same setup built at
// the top of its range — bigger wall, fresher flowers, longer install. The UI
// leads with `price` and states it as "from", because that is the honest read
// of a band whose floor is a real, deliverable configuration.
//
// A quote still confirms it. What changed is that the customer now walks into
// that conversation knowing the number, which is the only version of it that
// respects them.
//
// ── The rule this file inherits ───────────────────────────────────────────
// Photographs are licensed stock of the style, never Sambramo's own work —
// Sambramo is pre-launch and has delivered none. Same as decorSamples.js, same
// badge, same words, no exceptions. See scripts/resolve-decor-catalog.mjs.

import { EVENT_DATA } from './eventServicesData'
import { GENERATED_CATALOG_PHOTOS } from '../config/generatedDecorCatalog'
import { formatINR } from '../utils/format'

/* ═══════════════════════════════════════════════════════════
   Categories — how décor is actually shopped for
═══════════════════════════════════════════════════════════ */

/**
 * Twelve groups, ordered by how early somebody decides on them.
 *
 * Not the `category` field from eventServicesData (Decor / Lighting / …) —
 * that groups by which vendor supplies it, which is our problem, not the
 * customer's. Somebody planning an anniversary thinks "do I want the room done
 * or the terrace done", never "do I want the Decor category or the Lighting
 * category".
 */
export const DECOR_CATEGORIES = [
  { id: 'room',     name: 'Room & home setups',   emoji: '🏠', blurb: 'Done inside your own home, usually while you keep them out of it.' },
  { id: 'romantic', name: 'Candlelight & private', emoji: '🕯️', blurb: 'A table for two, laid somewhere that is only yours for the evening.' },
  { id: 'balloon',  name: 'Balloon décor',        emoji: '🎈', blurb: 'Arches, garlands, ceilings and columns — the fastest room-changer there is.' },
  { id: 'backdrop', name: 'Backdrops & arches',   emoji: '🖼️', blurb: 'The wall everyone photographs. Where the cake goes, where the family stands.' },
  { id: 'floral',   name: 'Fresh flower décor',   emoji: '🌸', blurb: 'Marigold, rose, jasmine, orchid — cut that morning, installed the same day.' },
  { id: 'entrance', name: 'Entrance & welcome',   emoji: '🚪', blurb: 'The first six seconds. Torans, gates, name boards, walkways.' },
  { id: 'stage',    name: 'Stages & mandaps',     emoji: '🎪', blurb: 'A raised, lit platform built for the ceremony and for the camera.' },
  { id: 'lighting', name: 'Lights & ambience',    emoji: '💡', blurb: 'What makes a room look expensive after sunset for the least money.' },
  { id: 'photo',    name: 'Photo & memory corners', emoji: '📸', blurb: 'Somewhere for guests to queue, pose and hand you the evening back.' },
  { id: 'ritual',   name: 'Ritual & pooja setups', emoji: '🪔', blurb: 'Laid out the way the purohit will want it, with the samagri counted.' },
  { id: 'table',    name: 'Cake & table styling', emoji: '🍰', blurb: 'The one table that ends up in forty photographs.' },
  { id: 'extras',   name: 'Surprise add-ons',     emoji: '✨', blurb: 'The small theatrical things. Individually cheap, disproportionately remembered.' },
]

/* ═══════════════════════════════════════════════════════════
   The catalogue
═══════════════════════════════════════════════════════════ */

/**
 * One entry per installable setup.
 *
 * `occasions` is a list rather than the file being keyed by occasion, because
 * a fresh-rose photo wall is the same install at an anniversary, an engagement
 * and a reception, and three copies of it is three chances for the price to
 * drift. About a third of these serve more than one occasion.
 *
 *   price    ₹, absolute, for the setup at the size named in `where`
 *   priceTo  ₹, the same setup at the top of its range. null = fixed scope.
 *   includes what physically arrives and gets installed
 *   setup    how long our team is in your space before it is ready
 *   where    the standard size the price is quoted at — printed beside it
 *   query    for scripts/resolve-decor-catalog.mjs. Never shown.
 *   popular  OUR RECOMMENDATION, from the market research above — the setups
 *            the Indian décor sector sells most of at this occasion. It is
 *            explicitly NOT a measurement of Sambramo's own orders, because
 *            Sambramo is pre-launch and has none, and every surface that
 *            renders it must therefore say "our pick" and never "most booked".
 *            The day there is real order history, this flag gets computed from
 *            it and the wording can change with it.
 */
export const DECOR_CATALOG = [

  /* ══════════════════════════════════════════════════════════════════
     ANNIVERSARY — the deepest set in the catalogue.
     Anniversaries are the one occasion people buy décor for on its own,
     with no catering and no venue attached, so the list has to stand up
     as a shop rather than as a sampler.
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'anniv-room-classic',
    name: 'Romantic Room Décor',
    emoji: '❤️',
    category: 'room',
    occasions: ['anniversary'],
    price: 1999, priceTo: 2899,
    blurb: 'The one most people book. A heart of balloons on the wall, petals across the bed and floor, and their years in foil.',
    includes: [
      'Balloon heart or arch on one wall (approx. 100 balloons)',
      '“HAPPY ANNIVERSARY” foil letters',
      'Fresh rose-petal spread on bed and floor',
      'Warm fairy-light curtain behind the wall',
      'Tea lights in glass holders',
    ],
    setup: '60–90 min', where: 'One bedroom wall, at home',
    popular: true,
    query: 'balloon heart wall bedroom rose petals surprise decoration',
  },
  {
    id: 'anniv-room-red',
    name: 'Red & White Home Celebration',
    emoji: '🌹',
    category: 'room',
    occasions: ['anniversary'],
    price: 2399, priceTo: 3499,
    blurb: 'The living-room version — red and white throughout, sized for the family who will walk in behind them.',
    includes: [
      'Red and white balloon garland across the main wall',
      'Ceiling balloon drop with ribbon tails',
      'Photo-frame corner with their wedding picture',
      'Rose petals and candle path to the door',
    ],
    setup: '90 min', where: 'Living room, up to 12 people',
    query: 'red white balloon decoration living room anniversary celebration',
  },
  {
    id: 'anniv-bedroom-luxe',
    name: 'Luxury Bedroom Setup',
    emoji: '🛏️',
    category: 'room',
    occasions: ['anniversary'],
    price: 3999, priceTo: 5499,
    blurb: 'Every surface dressed. This is the one people book when they have flown someone in.',
    includes: [
      'Full-wall balloon and drape backdrop',
      'Bed art in fresh petals — heart, initials or the year',
      '150+ tea lights and pillar candles, safely held',
      'Fairy-light canopy over the bed',
      'Champagne or mocktail table for two',
    ],
    setup: '2 hrs', where: 'One bedroom, dressed end to end',
    query: 'luxury romantic bedroom candles petals decoration hotel suite',
  },
  {
    id: 'anniv-canopy-bed',
    name: 'Bed Canopy Setup',
    emoji: '👑',
    category: 'room',
    occasions: ['anniversary', 'engagement'],
    price: 3699, priceTo: 4999,
    blurb: 'A draped canopy over the bed, lit from inside. It changes the room more than anything else at this price.',
    includes: [
      'Four-post fabric canopy, sheer white or blush',
      'Warm string lights woven through the drape',
      'Petal work on the bed',
      'Two floor-standing candle clusters',
    ],
    setup: '2 hrs', where: 'Standard double bed',
    query: 'bed canopy drape romantic decoration string lights bedroom',
  },
  {
    id: 'anniv-ceiling-balloons',
    name: 'Ceiling Balloon Room',
    emoji: '🎈',
    category: 'balloon',
    occasions: ['anniversary', 'birthday', 'get_together'],
    price: 4599, priceTo: 6299,
    blurb: 'Two hundred balloons on the ceiling with ribbons to head height. Walking into it is the moment.',
    includes: [
      '200 helium balloons, ceiling-filled, ribbon tails',
      'Colour matched to your theme (metallic, pastel or chrome)',
      'Foil number or name balloons',
      'Floor balloon clusters at the corners',
    ],
    setup: '2 hrs', where: 'One room up to 200 sq ft',
    query: 'colorful balloons filling ceiling room ribbons indoor',
  },

  {
    id: 'anniv-candlelight-home',
    name: 'Candlelight Dinner at Home',
    emoji: '🕯️',
    category: 'romantic',
    occasions: ['anniversary', 'engagement'],
    price: 2999, priceTo: 4199,
    blurb: 'A table for two, laid properly, in your own dining room. Cutlery, linen, candles, flowers — you supply only the food.',
    includes: [
      'Table for two with linen, runner and full place settings',
      'Candle centrepiece and 40+ tea lights around the room',
      'Fresh flower vase arrangement',
      'Rose-petal pathway to the table',
      'Bluetooth speaker with a playlist, if you want one',
    ],
    setup: '75 min', where: 'Your dining or living room',
    popular: true,
    query: 'romantic candlelight dinner table for two setup home candles',
  },
  {
    id: 'anniv-candlelight-terrace',
    name: 'Terrace Candlelight Dinner',
    emoji: '🌙',
    category: 'romantic',
    occasions: ['anniversary', 'engagement'],
    price: 4499, priceTo: 6499,
    blurb: 'The same dinner, on your own terrace, under a string-light canopy. Weather-checked the morning of.',
    includes: [
      'Terrace canopy of warm string lights on poles',
      'Dressed table for two with linen and place settings',
      'Lantern and candle perimeter (60+ lights)',
      'Fresh flower centrepiece and petal path',
      'Two lounge chairs and a side table',
    ],
    setup: '2–3 hrs', where: 'Terrace or balcony, 150 sq ft+',
    popular: true,
    query: 'terrace rooftop candlelight dinner string lights table two evening',
  },
  {
    id: 'anniv-cabana',
    name: 'Private Cabana Dinner',
    emoji: '⛺',
    category: 'romantic',
    occasions: ['anniversary', 'engagement'],
    price: 5799, priceTo: 8499,
    blurb: 'A draped cabana built for the evening — the version that looks like a resort and is standing in your own garden.',
    includes: [
      'Free-standing draped cabana with sheer curtains',
      'Low seating with cushions and rugs',
      'Fresh floral entrance and interior work',
      'Warm uplighting and 80+ candles',
      'Dressed dining table for two inside',
    ],
    setup: '3–4 hrs', where: 'Garden, terrace or lawn',
    query: 'romantic cabana tent drape dinner garden decoration lights',
  },
  {
    id: 'anniv-poolside',
    name: 'Poolside or Garden Dinner',
    emoji: '🏊',
    category: 'romantic',
    occasions: ['anniversary'],
    price: 6499, priceTo: 9999,
    blurb: 'Floating candles, a lit walkway and a table set at the water. Booked at your villa, resort or farmhouse.',
    includes: [
      'Floating candles and flower heads on the water',
      'Lantern-lit approach path',
      'Dressed table for two with linen and settings',
      'Perimeter of standing torches or lanterns',
      'Floral arch behind the table',
    ],
    setup: '3 hrs', where: 'Poolside or lawn at your venue',
    query: 'poolside romantic dinner floating candles lanterns evening garden',
  },
  {
    id: 'anniv-candle-path',
    name: 'Candle Path & Rose Heart',
    emoji: '💗',
    category: 'romantic',
    occasions: ['anniversary', 'engagement'],
    price: 1799, priceTo: 2499,
    blurb: 'The cheapest thing here that still makes somebody stop in a doorway. Candles from the door, a heart of petals at the end.',
    includes: [
      'Candle pathway from the entrance (60+ tea lights)',
      'Large rose-petal heart with their initials',
      'Petal scatter through the route',
      'Two standing candle clusters',
    ],
    setup: '45 min', where: 'Hallway and one room',
    query: 'lit candles floor pathway romantic night indoor glow',
  },

  {
    id: 'anniv-arch-backdrop',
    name: 'Anniversary Arch Backdrop',
    emoji: '🎊',
    category: 'backdrop',
    occasions: ['anniversary', 'half_saree', 'farewell'],
    price: 2499, priceTo: 3699,
    blurb: 'A balloon arch over a clean panel with your years on it. Where the cake gets cut and the photograph gets taken.',
    includes: [
      'Free-standing arch frame with organic balloon garland',
      'Printed or foil “Happy Nth Anniversary” panel',
      'Fairy-light wash across the backdrop',
      'Cake table pulled in and styled underneath',
    ],
    setup: '90 min', where: 'One wall or free-standing, 8 ft',
    query: 'balloon arch backdrop anniversary cake table decoration',
  },
  {
    id: 'anniv-backdrop-premium',
    name: 'Premium Anniversary Backdrop',
    emoji: '💫',
    category: 'backdrop',
    occasions: ['anniversary'],
    price: 6499, priceTo: 9499,
    blurb: 'A round or arched panel, dense balloon work, neon signage and real lighting. The one that photographs like a venue.',
    includes: [
      'Circular or arched hard panel, 8–10 ft',
      'Dense double-stuffed balloon work in your palette',
      'Custom neon or marquee sign (your names or the year)',
      'Two uplights and a fairy-light wash',
      'Styled plinths and cake table',
    ],
    setup: '3 hrs', where: 'Hall or large living room',
    query: 'circular backdrop panel balloons neon sign anniversary premium decoration',
  },
  {
    id: 'anniv-rose-canopy',
    name: 'Rose Canopy Backdrop',
    emoji: '🌺',
    category: 'floral',
    occasions: ['anniversary', 'engagement', 'wedding', 'reception'],
    price: 8499, priceTo: 14999,
    blurb: 'Fresh roses on a canopy frame with seating under it. Not artificial — cut that morning, and it shows.',
    includes: [
      'Canopy frame dressed in fresh roses and greens',
      'Draped fabric fall on both sides',
      'Two seats or a bench, dressed to match',
      'Warm spot lighting for photographs',
      'Petal work on the floor',
    ],
    setup: '4 hrs', where: 'Hall, lawn or large terrace',
    query: 'fresh rose flower canopy backdrop seating wedding decoration',
  },
  {
    id: 'anniv-flower-wall',
    name: 'Fresh Flower Photo Wall',
    emoji: '🌷',
    category: 'floral',
    occasions: ['anniversary', 'engagement', 'wedding', 'sangeet', 'reception', 'haldi', 'half_saree'],
    price: 7499, priceTo: 16999,
    blurb: 'An 8×8 wall of real flowers. Guests queue at it — that is what you are buying, and it is worth the number.',
    includes: [
      '8 ft × 8 ft frame packed with fresh blooms',
      'Rose, carnation, orchid or mixed — your choice of palette',
      'Optional name or monogram in contrasting flowers',
      'Two uplights so it reads after dark',
    ],
    setup: '4–5 hrs', where: 'Free-standing, indoor or outdoor',
    query: 'fresh flower wall backdrop roses photo booth wedding decoration',
  },
  {
    id: 'anniv-ring-decor',
    name: 'Floral Ring Décor',
    emoji: '💍',
    category: 'floral',
    occasions: ['anniversary', 'engagement'],
    price: 6799, priceTo: 9499,
    blurb: 'A circular flower-and-balloon ring, free-standing, lit from behind. The most photographed shape in Indian décor right now.',
    includes: [
      '6–8 ft free-standing ring frame',
      'Dense fresh floral or balloon dressing',
      'Backlit or fairy-lit interior',
      'Petal and drape work at the base',
    ],
    setup: '3 hrs', where: 'Free-standing, 10 ft clearance',
    query: 'circular ring flower backdrop free standing decoration lights engagement',
  },

  {
    id: 'anniv-photo-string',
    name: '“Our Years” Photo String',
    emoji: '🖼️',
    category: 'photo',
    occasions: ['anniversary', 'farewell'],
    price: 1499, priceTo: 2299,
    blurb: 'Send us the photographs. We print them and hang them in order, one per year, with lights along the line.',
    includes: [
      'Up to 40 photographs printed on matte card',
      'Hung on warm-light strings with wooden clips',
      'Year tags along the run',
      'Wall or corner installation',
    ],
    setup: '60 min', where: 'One wall or corner, up to 12 ft',
    popular: true,
    query: 'hanging photo string clips fairy lights wall display memories',
  },
  {
    id: 'anniv-memory-wall',
    name: 'Memory Wall & Timeline',
    emoji: '📜',
    category: 'photo',
    occasions: ['anniversary', 'retirement', 'graduation', 'farewell'],
    price: 4999, priceTo: 8499,
    blurb: 'The whole story, printed and mounted as one display — the wedding, the children, the houses, the trips.',
    includes: [
      'Designed timeline printed on foam board panels',
      'Up to 60 photographs, restored and colour-corrected',
      'Mounted frames and a captioned run',
      'Spot lighting across the display',
      'Yours to keep afterwards',
    ],
    setup: '3 hrs', where: 'A 10–14 ft wall',
    query: 'photo memory wall timeline display frames event tribute',
  },
  {
    id: 'anniv-photobooth',
    name: 'Photo Booth Corner & Props',
    emoji: '📷',
    category: 'photo',
    occasions: ['anniversary', 'birthday', 'engagement', 'get_together', 'graduation', 'corporate_event', 'reception', 'haldi', 'half_saree', 'farewell'],
    price: 5499, priceTo: 8999,
    blurb: 'A dressed corner, real lighting and props people actually pick up — plus instant prints they take home.',
    includes: [
      'Styled backdrop with drape or sequin panel',
      'Softbox lighting so phone photos come out',
      'Prop box — signs, frames, hats, glasses',
      'Instant printer with 100 prints',
      'An attendant for 3 hrs',
    ],
    setup: '2 hrs', where: 'A 6×8 ft corner',
    query: 'photo booth backdrop props instant prints party corner setup',
  },

  {
    id: 'anniv-silver-jubilee',
    name: 'Silver Jubilee (25th) Setup',
    emoji: '🥈',
    category: 'stage',
    occasions: ['anniversary'],
    price: 11499, priceTo: 24999,
    blurb: 'Twenty-five years is a function, not a surprise. Full hall décor in silver and white with a stage for the family photograph.',
    includes: [
      'Raised stage with silver-and-white drape backdrop',
      'Seating for the couple, dressed to match',
      'Entrance décor and welcome board',
      'Table centrepieces across the hall',
      'Uplighting and a fairy-light wash',
      'Styled cake table with the “25” centrepiece',
    ],
    setup: '5–6 hrs', where: 'Banquet hall, 80–200 guests',
    query: 'silver anniversary hall stage decoration white celebration family',
  },
  {
    id: 'anniv-golden-jubilee',
    name: 'Golden Jubilee (50th) Setup',
    emoji: '🥇',
    category: 'stage',
    occasions: ['anniversary'],
    price: 13999, priceTo: 29999,
    blurb: 'Fifty years, done in gold and ivory, with the memory wall built in — because by this point four generations turn up.',
    includes: [
      'Raised stage, gold-and-ivory drape and floral backdrop',
      'Two thrones or a dressed settee for the couple',
      'Memory timeline wall along one side',
      'Entrance arch and welcome signage',
      'Full-hall table centres and uplighting',
      'Styled cake table with the “50” centrepiece',
    ],
    setup: '6–7 hrs', where: 'Banquet hall, 100–300 guests',
    query: 'golden anniversary celebration hall stage gold decoration family elders',
  },
  {
    id: 'anniv-vow-renewal',
    name: 'Vow Renewal Floral Stage',
    emoji: '💐',
    category: 'stage',
    occasions: ['anniversary'],
    price: 18999, priceTo: 44999,
    blurb: 'A real mandap or arch built for saying it again, with an aisle and seating — the ceremony, not the party around it.',
    includes: [
      'Four-pillar floral mandap or arch, fresh flowers',
      'Aisle with petal work and lantern or floral stands',
      'Seating for 40–80, dressed with sashes',
      'Registrar or priest table, dressed',
      'Ceremony lighting rig',
    ],
    setup: '7–8 hrs', where: 'Lawn, hall or resort deck',
    query: 'vow renewal ceremony floral arch aisle chairs outdoor wedding decoration',
  },

  {
    id: 'anniv-car-decor',
    name: 'Surprise Car Décor',
    emoji: '🚗',
    category: 'extras',
    occasions: ['anniversary', 'engagement', 'wedding', 'reception'],
    price: 2499, priceTo: 4999,
    blurb: 'Their car, dressed while they are inside. Works best as the thing they find on the way out.',
    includes: [
      'Fresh flower work on bonnet and mirrors',
      'Ribbon and balloon dressing',
      'Window message in removable marker or decal',
      'Interior petal and light strip',
    ],
    setup: '45 min', where: 'Your car, wherever it is parked',
    query: 'decorated car flowers ribbons wedding anniversary surprise',
  },
  {
    id: 'anniv-marquee-letters',
    name: 'LED Marquee Letters',
    emoji: '🔤',
    category: 'lighting',
    occasions: ['anniversary', 'birthday', 'engagement', 'graduation', 'get_together', 'reception', 'farewell'],
    price: 1899, priceTo: 4499,
    blurb: 'Four-foot light-up letters — initials, a number, or the word. Rented for the evening, delivered and collected.',
    includes: [
      'Up to 6 letters or digits, 4 ft tall',
      'Warm or colour-changing LED, mains powered',
      'Delivery, placement and collection',
      'Backup bulbs on site',
    ],
    setup: '30 min', where: 'Anywhere with a socket',
    query: 'illuminated love letter sign lights wedding marquee',
  },
  {
    id: 'anniv-fairy-canopy',
    name: 'Fairy-Light Canopy',
    emoji: '✨',
    category: 'lighting',
    occasions: ['anniversary', 'engagement', 'get_together', 'sangeet', 'reception', 'haldi', 'farewell'],
    price: 3499, priceTo: 7999,
    blurb: 'Warm strings run corner to corner overhead. The single highest-impact rupee in décor after dark.',
    includes: [
      '150–300 ft of warm-white string light',
      'Overhead canopy or perimeter run, safely rigged',
      'Dimmer and extension runs',
      'Rigging poles where there is nothing to fix to',
    ],
    setup: '2–3 hrs', where: 'Terrace, lawn or hall up to 800 sq ft',
    popular: true,
    query: 'string fairy lights canopy overhead terrace garden evening warm',
  },
  {
    id: 'anniv-cold-pyro',
    name: 'Cold Sparkler Entry',
    emoji: '🎇',
    category: 'extras',
    occasions: ['anniversary', 'birthday', 'engagement', 'wedding', 'sangeet', 'reception'],
    price: 3499, priceTo: 7499,
    blurb: 'Indoor-safe cold pyro for the entrance or the cake cutting. No heat, no smoke, licensed operator.',
    includes: [
      '4–8 cold-spark machines, indoor rated',
      'Licensed operator for the full evening',
      'Two cued moments (entry and cake, typically)',
      'Fire-safety clearance and extinguisher on site',
    ],
    setup: '90 min', where: 'Indoor or outdoor, 10 ft ceiling+',
    query: 'sparkler fountain fireworks stage entry night wedding',
  },
  {
    id: 'anniv-cake-table',
    name: 'Cake & Dessert Table Styling',
    emoji: '🍰',
    category: 'table',
    occasions: ['anniversary', 'birthday', 'first_birthday', 'baby_shower', 'engagement', 'graduation', 'retirement', 'reception', 'farewell', 'annaprashana', 'mundan'],
    price: 1499, priceTo: 3999,
    blurb: 'Tiered stands, cloth, a lit backdrop and the whole spread arranged as the photograph everyone takes.',
    includes: [
      'Table with linen, runner and skirting',
      'Three to five tiered stands and risers',
      'Small backdrop or balloon cluster behind',
      'Fairy lights and a floral touch',
      'Arrangement of the desserts you supply',
    ],
    setup: '45 min', where: 'One 6 ft table',
    query: 'dessert table styling tiered stands cake backdrop party decoration',
  },
  {
    id: 'anniv-welcome-board',
    name: 'Welcome Board & Entry Balloons',
    emoji: '🪧',
    category: 'entrance',
    occasions: ['anniversary', 'birthday', 'first_birthday', 'baby_shower', 'engagement', 'graduation', 'housewarming', 'reception', 'shop_opening', 'farewell', 'annaprashana', 'mundan', 'aksharabhyasa', 'half_saree'],
    price: 1999, priceTo: 3299,
    blurb: 'A printed board with their names and a balloon cluster at the door, so guests know they are in the right place.',
    includes: [
      'Custom-printed A1 board on an easel',
      'Balloon cluster or half-arch at the doorway',
      'Fresh flower or greenery trim',
      'Direction signage inside if the venue needs it',
    ],
    setup: '45 min', where: 'Your entrance',
    query: 'welcome sign board easel balloons entrance party decoration',
  },
  {
    id: 'anniv-dry-ice',
    name: 'Dry-Ice First Dance',
    emoji: '🌫️',
    category: 'extras',
    occasions: ['anniversary', 'engagement', 'wedding', 'reception'],
    price: 2999, priceTo: 5999,
    blurb: 'Low fog that sits on the floor for the first dance. Not a smoke machine — this one stays at ankle height.',
    includes: [
      'Low-fog machine and dry ice for two cues',
      'Operator on site',
      'Two pin-spot lights on the floor area',
    ],
    setup: '60 min', where: 'Indoor dance floor',
    query: 'low fog dry ice dance floor first dance wedding lighting',
  },

  /* ══════════════════════════════════════════════════════════════════
     BIRTHDAY & FIRST BIRTHDAY
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'bday-simple-room',
    name: 'Simple Birthday Room Décor',
    emoji: '🎂',
    category: 'room',
    occasions: ['birthday'],
    price: 1499, priceTo: 2199,
    blurb: 'One wall, done properly, in an hour. The version that turns a Tuesday evening into a birthday.',
    includes: [
      'Balloon wall in your two colours (approx. 80 balloons)',
      '“HAPPY BIRTHDAY” foil letters',
      'Ceiling balloons with ribbon tails',
      'Fairy-light curtain behind',
    ],
    setup: '60 min', where: 'One wall, at home',
    popular: true,
    query: 'simple birthday balloon wall decoration home living room',
  },
  {
    id: 'bday-balloon-arch',
    name: 'Balloon Arch & Name Backdrop',
    emoji: '🎈',
    category: 'balloon',
    occasions: ['birthday', 'first_birthday', 'graduation'],
    price: 2299, priceTo: 3999,
    blurb: 'An organic garland over a clean wall, the age or the name in foil, and the cake table styled underneath.',
    includes: [
      'Organic balloon garland, 8–10 ft, three tones',
      'Foil age or name letters',
      'Backdrop panel or drape behind',
      'Cake table styled underneath',
    ],
    setup: '2 hrs', where: 'One wall, 10 ft',
    popular: true,
    query: 'organic balloon garland arch backdrop birthday name decoration',
  },
  {
    id: 'bday-theme-room',
    name: 'Theme Room Takeover',
    emoji: '🦖',
    category: 'room',
    occasions: ['birthday', 'first_birthday'],
    price: 4999, priceTo: 10999,
    blurb: 'Jungle, unicorn, superhero, space, dinosaur or whatever they are currently obsessed with. Props, cutouts, the lot.',
    includes: [
      'Themed backdrop and balloon work in the theme palette',
      'Life-size character cutouts and props',
      'Themed table styling and centrepieces',
      'Entrance décor in the theme',
      'Themed cake corner',
    ],
    setup: '3–4 hrs', where: 'One room or hall corner',
    query: 'jungle dinosaur theme kids birthday party decoration props cutouts',
  },
  {
    id: 'bday-luxury-party',
    name: 'Luxury Party Décor',
    emoji: '💎',
    category: 'stage',
    occasions: ['birthday', 'graduation', 'get_together'],
    price: 10999, priceTo: 24999,
    blurb: 'The whole room handled — stage, entrance, lighting rig, seating and a photo corner. Booked for the milestone ones.',
    includes: [
      'Raised stage with hard-panel backdrop and neon signage',
      'Dense premium balloon work (chrome, double-stuffed)',
      'Entrance arch and walkway décor',
      'Table centres across the room',
      'Uplighting rig and fairy-light wash',
      'Photo corner with props',
    ],
    setup: '5–6 hrs', where: 'Banquet hall, 60–200 guests',
    query: 'luxury birthday party hall stage decoration lighting premium balloons',
  },
  {
    id: 'first-bday-one',
    name: 'First Birthday “ONE” Backdrop',
    emoji: '1️⃣',
    category: 'backdrop',
    occasions: ['first_birthday'],
    price: 2799, priceTo: 4499,
    blurb: 'Pastel garland, a large “ONE”, and the smash-cake corner set at a one-year-old’s height rather than ours.',
    includes: [
      'Pastel balloon garland over a drape backdrop',
      'Large “ONE” prop or foil balloon',
      'Smash-cake table at toddler height with a floor mat',
      'Month-by-month photo line if you send the pictures',
    ],
    setup: '2 hrs', where: 'One wall, at home or hall',
    popular: true,
    query: 'first birthday one backdrop pastel balloon smash cake decoration',
  },
  {
    id: 'first-bday-play',
    name: 'Soft Play & Ball Pit Corner',
    emoji: '🧸',
    category: 'extras',
    occasions: ['first_birthday', 'birthday', 'baby_shower'],
    price: 5499, priceTo: 11999,
    blurb: 'A fenced, matted zone that is the toddlers’ and nobody else’s — which is what actually makes the party survivable.',
    includes: [
      'Fenced soft-play area with foam mats',
      'Ball pit, slide and rockers',
      'Sanitised equipment, cleaned on site before setup',
      'One attendant for 3 hrs',
    ],
    setup: '90 min', where: 'A 10×10 ft area',
    query: 'toddler soft play ball pit fenced kids party area indoor',
  },
  {
    id: 'first-bday-grand',
    name: 'Grand First Birthday Stage',
    emoji: '🎪',
    category: 'stage',
    occasions: ['first_birthday'],
    price: 9999, priceTo: 21999,
    blurb: 'The hall version — raised stage, themed backdrop, entrance arch and a booth for the family shots.',
    includes: [
      'Raised stage with themed hard backdrop',
      'Full balloon installation across the stage',
      'Entrance arch and welcome board',
      'Table centres and chair styling',
      'Photo booth with props',
      'Uplighting rig',
    ],
    setup: '5 hrs', where: 'Banquet hall, 80–250 guests',
    query: 'first birthday hall stage decoration grand celebration balloons',
  },

  /* ══════════════════════════════════════════════════════════════════
     BABY SHOWER / SEEMANTHAM / NAMING
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'baby-pastel-arch',
    name: 'Pastel Balloon Arch',
    emoji: '🍼',
    category: 'balloon',
    occasions: ['baby_shower', 'annaprashana', 'mundan'],
    price: 2499, priceTo: 3999,
    blurb: 'A soft garland over the seat of honour, with the mother-to-be’s chair styled as the centrepiece.',
    includes: [
      'Pastel organic balloon garland, 8–10 ft',
      'Styled chair for the mother-to-be',
      '“Oh Baby” or name signage',
      'Drape backdrop and fairy lights',
    ],
    setup: '2 hrs', where: 'One wall, at home or hall',
    popular: true,
    query: 'baby shower pastel balloon arch chair decoration soft',
  },
  {
    id: 'baby-floral-swing',
    name: 'Floral Swing / Jhula Setup',
    emoji: '🌼',
    category: 'floral',
    occasions: ['baby_shower', 'seemantham', 'naming_ceremony', 'half_saree'],
    price: 7999, priceTo: 17999,
    blurb: 'A flower-dressed jhula as the centrepiece — the shot every godh bharai and seemantham is built around.',
    includes: [
      'Swing or jhula frame, fully dressed in fresh flowers',
      'Fabric drape and ribbon work',
      'Floral backdrop behind the swing',
      'Nameplate or banner in flowers',
      'Warm lighting for indoor photographs',
    ],
    setup: '4–5 hrs', where: 'Hall or large room, 10 ft clearance',
    query: 'flower decorated swing jhula baby shower indian ceremony decoration',
  },
  {
    id: 'baby-godh-bharai',
    name: 'Traditional Godh Bharai Décor',
    emoji: '🪷',
    category: 'floral',
    occasions: ['baby_shower', 'seemantham'],
    price: 4999, priceTo: 9999,
    blurb: 'Marigold and jasmine, a low decorated seat, brass lamps and the thali laid out for the rasam.',
    includes: [
      'Marigold and jasmine strings across the backdrop',
      'Low decorated seat with cushions',
      'Brass lamps and kalash placement',
      'Rangoli at the entrance',
      'Thali and rasam items laid out',
    ],
    setup: '3–4 hrs', where: 'Hall or living room',
    query: 'godh bharai seemantham marigold jasmine flower decoration indian traditional',
  },
  {
    id: 'baby-bangle-corner',
    name: 'Bangle & Mehendi Corner',
    emoji: '💫',
    category: 'extras',
    occasions: ['baby_shower', 'seemantham', 'sangeet', 'haldi', 'half_saree'],
    price: 3499, priceTo: 6999,
    blurb: 'The glass-bangle table, mehendi seating and a mirror corner — the bit the women in the family actually gather at.',
    includes: [
      'Bangle display table, dressed and lit',
      'Low mehendi seating with cushions and bolsters',
      'Mirror-and-flower corner for photographs',
      'Marigold string work overhead',
    ],
    setup: '2–3 hrs', where: 'A 10×10 ft corner',
    query: 'indian bangles display mehendi seating cushions colourful decoration corner',
  },
  {
    id: 'baby-reveal',
    name: 'Gender Reveal Corner',
    emoji: '🎉',
    category: 'extras',
    occasions: ['baby_shower'],
    price: 3299, priceTo: 5999,
    blurb: 'A confetti balloon, the reveal board and a dessert table that works whichever way it goes.',
    includes: [
      'Giant confetti reveal balloon, filled on site',
      'Reveal board and guess-the-gender wall',
      'Neutral dessert table styling',
      'Colour-neutral balloon backdrop',
      'Reveal moment cued with the photographer',
    ],
    setup: '2 hrs', where: 'One corner, indoor or outdoor',
    query: 'gender reveal balloon confetti party decoration board setup',
  },
  {
    id: 'naming-cradle',
    name: 'Cradle & Floral Canopy',
    emoji: '👶',
    category: 'floral',
    occasions: ['naming_ceremony', 'annaprashana'],
    price: 6499, priceTo: 13999,
    blurb: 'The cradle dressed in fresh flowers under a fabric canopy, lit for the moment the name is said.',
    includes: [
      'Cradle dressed in fresh flowers',
      'Fabric canopy overhead with drape fall',
      'Floral backdrop and name banner',
      'Soft warm lighting for indoor photographs',
      'Petal work around the base',
    ],
    setup: '4 hrs', where: 'Hall or large room',
    popular: true,
    query: 'baby naming ceremony cradle flower decoration namkaran indian',
  },
  {
    id: 'naming-name-board',
    name: 'Name Reveal Backdrop',
    emoji: '✍️',
    category: 'backdrop',
    occasions: ['naming_ceremony', 'first_birthday', 'annaprashana', 'mundan'],
    price: 2799, priceTo: 4999,
    blurb: 'A printed backdrop carrying the child’s name and its meaning, with a styled table for the blessings.',
    includes: [
      'Custom-printed backdrop panel with the name',
      'Balloon or floral trim',
      'Styled blessings table',
      'Fairy-light wash',
    ],
    setup: '2 hrs', where: 'One wall, 8 ft',
    query: 'baby naming ceremony name backdrop banner decoration celebration',
  },

  /* ══════════════════════════════════════════════════════════════════
     HOUSEWARMING / THREAD CEREMONY — ritual-led
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'house-entrance-toran',
    name: 'Entrance Toran & Rangoli',
    emoji: '🪔',
    category: 'entrance',
    occasions: ['housewarming', 'thread_ceremony', 'naming_ceremony', 'seemantham', 'mundan', 'annaprashana', 'aksharabhyasa', 'vehicle_pooja', 'shop_opening', 'half_saree'],
    price: 2499, priceTo: 4499,
    blurb: 'Mango-leaf toran across the door, a fresh rangoli on the threshold and marigold along the frame.',
    includes: [
      'Fresh mango-leaf and marigold toran',
      'Hand-drawn rangoli at the threshold',
      'Marigold garlands down both door frames',
      'Brass diyas and a kalash at the entry',
      'Banana stems either side if you want them',
    ],
    setup: '2–3 hrs', where: 'Main door and threshold',
    popular: true,
    query: 'indian house entrance marigold toran rangoli door decoration mango leaves',
  },
  {
    id: 'house-pooja-setup',
    name: 'Griha Pravesh Pooja Setup',
    emoji: '🕉️',
    category: 'ritual',
    occasions: ['housewarming', 'annaprashana', 'aksharabhyasa', 'mundan', 'bhoomi_pooja', 'shop_opening', 'vehicle_pooja'],
    price: 5999, priceTo: 12999,
    blurb: 'Kalash, havan kund and seating laid out the way the purohit will want it, with the samagri counted out in advance.',
    includes: [
      'Havan kund with fireproof base and surround',
      'Kalash, coconut and full samagri set',
      'Mats and asanas for the family and purohit',
      'Floral and rangoli work around the ritual space',
      'Ghee, wood and offerings, measured for the vidhi',
    ],
    setup: '3 hrs', where: 'Pooja room or hall floor',
    query: 'griha pravesh puja setup kalash havan kund indian ritual home',
  },
  {
    id: 'house-full-decor',
    name: 'Full Griha Pravesh Décor',
    emoji: '🏡',
    category: 'floral',
    occasions: ['housewarming', 'shop_opening'],
    price: 8999, priceTo: 19999,
    blurb: 'Entrance, pooja space, terrace lighting and a shaded seating area for the relatives who stay all afternoon.',
    includes: [
      'Entrance toran, rangoli and garland work',
      'Ritual space dressed and laid out',
      'Fresh flower work through the main rooms',
      'Terrace or balcony string lighting',
      'Shaded seating with chairs and fans',
    ],
    setup: '5–6 hrs', where: 'A 2–3 BHK home end to end',
    query: 'indian home interior decorated flowers oil lamps festival',
  },
  {
    id: 'thread-homam',
    name: 'Homam & Ritual Space',
    emoji: '🔥',
    category: 'ritual',
    occasions: ['thread_ceremony', 'naming_ceremony', 'seemantham', 'mundan', 'annaprashana', 'aksharabhyasa', 'bhoomi_pooja'],
    price: 5499, priceTo: 11999,
    blurb: 'Havan kund, mats, kalash and samagri, laid out for the full vidhi rather than assembled while the priest waits.',
    includes: [
      'Havan kund with fireproof base',
      'Kalash, coconut, mango leaves and full samagri',
      'Mats and asanas for family and purohit',
      'Floral and rangoli work around the space',
      'Ventilation and smoke management indoors',
    ],
    setup: '3 hrs', where: 'Hall floor or courtyard',
    query: 'homam havan fire ritual indian ceremony setup upanayanam priest',
  },
  {
    id: 'thread-pandal',
    name: 'Shaded Guest Pandal',
    emoji: '⛱️',
    category: 'extras',
    occasions: ['thread_ceremony', 'housewarming', 'naming_ceremony', 'get_together', 'seemantham', 'haldi', 'bhoomi_pooja', 'shop_opening', 'half_saree'],
    price: 7999, priceTo: 24999,
    blurb: 'A pandal, chairs and fans for a morning function that will run well into the afternoon, because they always do.',
    includes: [
      'Shamiana or pandal with side draping',
      'Chairs for 80–200 with covers',
      'Pedestal fans or coolers',
      'Carpeting or matting underfoot',
      'Basic lighting inside',
    ],
    setup: '5–6 hrs', where: 'Courtyard, lawn or street frontage',
    query: 'outdoor event tent pandal canopy chairs seating rows shamiana indian',
  },

  /* ══════════════════════════════════════════════════════════════════
     ENGAGEMENT / WEDDING / SANGEET
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'eng-ring-stage',
    name: 'Ring Ceremony Stage',
    emoji: '💍',
    category: 'stage',
    occasions: ['engagement', 'half_saree'],
    price: 9999, priceTo: 24999,
    blurb: 'A floral or fabric backdrop, two chairs and lighting set for the exchange — built so the photographs work, not just the room.',
    includes: [
      'Raised stage with floral or drape backdrop',
      'Two dressed chairs or a settee',
      'Ring platter and stand, styled',
      'Stage lighting and two uplights',
      'Petal and floral work at the base',
    ],
    setup: '5 hrs', where: 'Banquet hall, 60–250 guests',
    popular: true,
    query: 'engagement ring ceremony stage decoration flowers indian couple seating',
  },
  {
    id: 'eng-proposal',
    name: 'Private Proposal Setup',
    emoji: '💐',
    category: 'romantic',
    occasions: ['engagement'],
    price: 5799, priceTo: 9999,
    blurb: 'Candles, petals, a ring stand and letter lights, set before anybody else has been told. We are in and out before they arrive.',
    includes: [
      'Balloon or floral ring frame',
      '“MARRY ME” marquee letters',
      'Candle pathway and petal heart',
      'Ring platter and photo point',
      'A discreet setup window you choose',
    ],
    setup: '2 hrs', where: 'Terrace, room or private venue',
    query: 'marriage proposal setup candles rose petals marry me lights romantic',
  },
  {
    id: 'wed-mandap',
    name: 'Mandap & Ritual Space',
    emoji: '🛕',
    category: 'stage',
    occasions: ['wedding'],
    price: 24999, priceTo: 89999,
    blurb: 'Pillars, canopy, florals and the seating arranged the way the purohit will need it — the structure the whole day happens under.',
    includes: [
      'Four-pillar mandap structure with canopy',
      'Fresh floral dressing on pillars and canopy',
      'Havan kund, base and full ritual layout',
      'Seating for the couple and both families',
      'Dedicated mandap lighting',
      'Aisle and approach work',
    ],
    setup: '8–10 hrs', where: 'Hall, lawn or kalyana mantapa',
    popular: true,
    query: 'indian wedding mandap decoration flowers ceremony pillars canopy',
  },
  {
    id: 'wed-reception-stage',
    name: 'Reception Stage',
    emoji: '👑',
    category: 'stage',
    occasions: ['wedding', 'engagement', 'reception'],
    price: 19999, priceTo: 74999,
    blurb: 'A lit backdrop, the couple’s seating and a rig that works for both the eye in the room and the camera in front of it.',
    includes: [
      'Raised stage, 12–20 ft, with hard-panel backdrop',
      'Floral or drape dressing in your palette',
      'Couple’s settee or thrones',
      'Full stage lighting with key and fill',
      'Steps, railings and side dressing',
      'Greeting-queue rope and floral stands',
    ],
    setup: '8 hrs', where: 'Banquet hall, 200–800 guests',
    query: 'wedding reception stage decoration lighting backdrop couple sofa',
  },
  {
    id: 'wed-entrance-gate',
    name: 'Entrance Gate & Pathway',
    emoji: '🌿',
    category: 'entrance',
    occasions: ['wedding', 'engagement', 'sangeet', 'reception'],
    price: 12999, priceTo: 39999,
    blurb: 'The gate, the walkway and the welcome board — the first thing four hundred people see, and the one they judge the rest by.',
    includes: [
      'Floral entrance gate or arch, 10–14 ft',
      'Lined walkway with floral or lantern stands',
      'Welcome board with the couple’s names',
      'Carpet or petal run',
      'Pathway lighting',
    ],
    setup: '5–6 hrs', where: 'Venue entrance and approach',
    query: 'wedding aisle walkway flower arch outdoor ceremony path',
  },
  {
    id: 'sangeet-dance-floor',
    name: 'Dance Floor & Lighting Rig',
    emoji: '🕺',
    category: 'lighting',
    occasions: ['sangeet', 'get_together', 'birthday', 'wedding', 'haldi'],
    price: 14999, priceTo: 44999,
    blurb: 'A floor, a rig and the seating pulled back — built for the performances rather than for sitting through them.',
    includes: [
      'Modular dance floor, 16×16 ft or larger',
      'Truss with moving heads, pars and strobes',
      'Haze machine and operator',
      'Seating repositioned around the floor',
      'Power distribution and cable safety',
    ],
    setup: '5–6 hrs', where: 'Hall or lawn, 100–500 guests',
    query: 'dance floor party lighting truss sangeet indian wedding night stage',
  },
  {
    id: 'sangeet-haldi-backdrop',
    name: 'Haldi & Mehendi Backdrop',
    emoji: '💛',
    category: 'backdrop',
    occasions: ['sangeet', 'wedding', 'haldi'],
    price: 5499, priceTo: 14999,
    blurb: 'Marigold, yellow drape, umbrellas and low seating — the daytime half of the same weekend, and the most colourful thing we build.',
    includes: [
      'Marigold and yellow drape backdrop, 10 ft',
      'Hanging painted umbrellas and pom-poms',
      'Low seating with bolsters for the couple',
      'Urlis, brass pots and petal float',
      'Photo corner with props',
    ],
    setup: '4 hrs', where: 'Terrace, lawn or hall',
    popular: true,
    query: 'haldi mehendi marigold yellow backdrop umbrellas low seating indian decoration',
  },

  /* ══════════════════════════════════════════════════════════════════
     GET-TOGETHER / RETIREMENT / GRADUATION / CORPORATE
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'gt-terrace',
    name: 'Terrace & Backyard Setup',
    emoji: '🌇',
    category: 'lighting',
    occasions: ['get_together', 'birthday', 'anniversary', 'farewell'],
    price: 4999, priceTo: 11999,
    blurb: 'String lights, low seating and a drinks corner — the version that needs no venue booking at all.',
    includes: [
      'Overhead string-light canopy',
      'Low seating with rugs, cushions and poufs',
      'Drinks or bar corner, dressed',
      'Lanterns and standing candles',
      'Bluetooth speaker set',
    ],
    setup: '3 hrs', where: 'Terrace or backyard, up to 30',
    popular: true,
    query: 'terrace party string lights outdoor low seating evening gathering rooftop',
  },
  {
    id: 'gt-lounge',
    name: 'Lounge Seating & Tables',
    emoji: '🛋️',
    category: 'extras',
    occasions: ['get_together', 'corporate_event', 'retirement', 'farewell'],
    price: 6999, priceTo: 18999,
    blurb: 'Sofas, low tables and lamps arranged so people can actually hear each other — which is the whole point of a get-together.',
    includes: [
      'Lounge sofas and armchairs for 20–60',
      'Low tables with runners and centrepieces',
      'Floor and table lamps',
      'Rugs and screens to break up the space',
    ],
    setup: '3–4 hrs', where: 'Hall, lawn or large terrace',
    query: 'party lounge seating sofa low tables lamps decoration evening event',
  },
  {
    id: 'ret-felicitation',
    name: 'Felicitation Stage',
    emoji: '🎖️',
    category: 'stage',
    occasions: ['retirement', 'corporate_event', 'graduation', 'farewell'],
    price: 8999, priceTo: 22999,
    blurb: 'A backdrop, a podium and lighting set for the speeches, the shawl and the photograph with the plaque.',
    includes: [
      'Raised stage with printed or drape backdrop',
      'Podium with mic stand and reading light',
      'Seating for the honoree and guests of honour',
      'Stage wash and two spots',
      'Dressed table for mementos and shawls',
    ],
    setup: '4 hrs', where: 'Hall or auditorium, 50–300',
    query: 'conference hall stage podium speaker audience formal ceremony',
  },
  {
    id: 'grad-photo-corner',
    name: 'Graduation Photo Corner',
    emoji: '🎓',
    category: 'photo',
    occasions: ['graduation'],
    price: 3999, priceTo: 7499,
    blurb: 'A backdrop in the college colours, cap-and-scroll props and a frame people will actually queue at.',
    includes: [
      'Backdrop panel in your institution’s colours',
      'Balloon garland with the year in foil',
      'Cap, scroll and sign props',
      'Giant frame prop for group shots',
      'Softbox lighting',
    ],
    setup: '2 hrs', where: 'A 6×8 ft corner',
    query: 'graduates in gowns celebrating throwing caps friends',
  },
  {
    id: 'corp-branded-stage',
    name: 'Branded Stage & Backdrop',
    emoji: '🏢',
    category: 'stage',
    occasions: ['corporate_event', 'shop_opening'],
    price: 11999, priceTo: 34999,
    blurb: 'A printed backdrop, podium and stage lighting set to your brand colours — supplied from your own artwork, not a template.',
    includes: [
      'Printed flex or fabric backdrop from your artwork',
      'Stage risers, skirting and steps',
      'Podium with mic and logo panel',
      'Stage wash, key light and two spots',
      'Standees and directional signage',
    ],
    setup: '5 hrs', where: 'Conference hall, 50–500 delegates',
    query: 'corporate event stage branded printed backdrop conference podium lighting',
  },
  {
    id: 'corp-registration',
    name: 'Registration & Entrance',
    emoji: '🗂️',
    category: 'entrance',
    occasions: ['corporate_event', 'shop_opening'],
    price: 5999, priceTo: 14999,
    blurb: 'A welcome desk, standees, signage and a branded entrance, so four hundred arrivals do not become a queue in a corridor.',
    includes: [
      'Branded registration desk with skirting',
      'Entrance arch or branded gate',
      'Roll-up standees and floor decals',
      'Directional signage through the venue',
      'Lanyard and badge station',
    ],
    setup: '3–4 hrs', where: 'Venue entrance and foyer',
    query: 'corporate event registration desk entrance signage welcome branded foyer',
  },

  /* ══════════════════════════════════════════════════════════════════
     NEW VEHICLE — the setups this catalogue had nothing for.

     A vahana pooja was being offered a doorway toran and a home pooja
     table, which are the right answer for a house and describe nothing
     about a motorcycle. What a family chooses between here is what goes ON
     the vehicle, and it differs completely by what they bought: a handlebar
     garland is not a bonnet installation is not banana stems on a lorry
     cabin. Each is a real setup with its own photograph.
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'veh-bike-garland',
    name: 'Two-Wheeler Garland & Ribbon',
    emoji: '🏍️',
    category: 'floral',
    occasions: ['vehicle_pooja'],
    price: 1499, priceTo: 2199,
    blurb: 'Handlebar garland, ribbon and bow on the mirrors, a rose on the tank and the lemons under the wheels.',
    includes: [
      'Fresh marigold and rose handlebar garland',
      'Satin ribbon and bow across the mirrors',
      'Single rose on the tank or the seat',
      'Lemons, kumkuma and turmeric for the wheels',
      'Fitted at the showroom or at your door',
    ],
    setup: '20–30 min', where: 'At the showroom or your gate',
    popular: true,
    query: 'royal enfield motorcycle parked garland showroom delivery day',
  },
  {
    id: 'veh-car-bonnet',
    name: 'Car Bonnet Garland',
    emoji: '🚗',
    category: 'floral',
    occasions: ['vehicle_pooja'],
    price: 3499, priceTo: 4999,
    blurb: 'The traditional dressing — a full garland across the bonnet, ribbon over the grille, lemons under both front wheels.',
    includes: [
      'Full bonnet garland in marigold and rose',
      'Ribbon and bow across the grille',
      'Lemons, kumkuma and coconut for the wheels',
      'Dashboard idol placed and secured',
      'Removed cleanly before you drive',
    ],
    setup: '30–45 min', where: 'Delivery bay or your portico',
    popular: true,
    query: 'car bonnet covered flowers wedding decorated vehicle front',
  },
  {
    id: 'veh-car-floral-premium',
    name: 'Full Floral Handover',
    emoji: '💐',
    category: 'floral',
    occasions: ['vehicle_pooja'],
    price: 11999, priceTo: 16999,
    blurb: 'For the photographs. Dense floral work across the bonnet and grille, a red carpet at the door and a printed name board.',
    includes: [
      'Dense floral installation on bonnet and grille',
      'Red carpet strip at the driver door',
      'Printed name board or number-plate cover',
      'Rose petals for the handover moment',
      'Floral removal after the shoot',
    ],
    setup: '60–90 min', where: 'Showroom delivery bay',
    query: 'luxury car handover flowers red carpet dealership celebration',
  },
  {
    id: 'veh-commercial-cabin',
    name: 'Lorry & Tractor Cabin Dressing',
    emoji: '🚜',
    category: 'floral',
    occasions: ['vehicle_pooja'],
    price: 4999, priceTo: 7499,
    blurb: 'A working vehicle is dressed differently — banana stems at the cabin, a heavy garland across the front, the name painted by hand.',
    includes: [
      'Banana stems and mango-leaf toran at the cabin',
      'Heavy marigold garland across the front',
      'Hand-painted name or “Shubham” board',
      'Lemons and coconut for the wheels',
      'Setup at the yard, the site or the showroom',
    ],
    setup: '45–60 min', where: 'Yard, site or showroom',
    query: 'indian truck lorry decorated flowers garland front new vehicle',
  },
  {
    id: 'veh-pooja-tray',
    name: 'Vahana Pooja Thali & Samagri',
    emoji: '🪔',
    category: 'ritual',
    occasions: ['vehicle_pooja'],
    price: 999, priceTo: 1799,
    blurb: 'Everything the purohit will ask for, laid out on the thali before he arrives — coconut, camphor, lemons, kumkuma and agarbatti.',
    includes: [
      'Arati thali with lamp, camphor and wicks',
      'Coconut, betel leaves and plantains',
      'Lemons, kumkuma, turmeric and akshate',
      'Agarbatti and a small idol for the dashboard',
      'Delivered to the showroom or the temple gate',
    ],
    setup: '15 min', where: 'Showroom, temple or home',
    popular: true,
    query: 'hindu pooja thali coconut camphor lemon ritual items india',
  },

  /* ══════════════════════════════════════════════════════════════════
     RECEPTION — its own stage, not the wedding's.
  ══════════════════════════════════════════════════════════════════ */

  {
    id: 'recep-stage-floral',
    name: 'Reception Stage — Floral Backdrop',
    emoji: '💒',
    category: 'stage',
    occasions: ['reception', 'engagement'],
    price: 34999, priceTo: 74999,
    blurb: 'The thing four hundred people queue to be photographed in front of. Raised, lit for the camera, built the night before.',
    includes: [
      'Raised platform with carpeted steps',
      'Fresh floral backdrop, 12–16 ft',
      'Two decorated seats and a side table',
      'Stage wash and key lighting for photographs',
      'Overnight build, cleared after the event',
    ],
    setup: 'Night before', where: 'Banquet hall or lawn',
    popular: true,
    query: 'indian wedding reception stage flower backdrop couple seats lights',
  },
  {
    id: 'recep-destination',
    name: 'Destination Reception Setup',
    emoji: '🌴',
    category: 'stage',
    occasions: ['reception'],
    price: 89999, priceTo: 199999,
    blurb: 'A resort lawn or a beachfront, built as one designed world — entrance, walkway, stage and lounge in a single palette.',
    includes: [
      'Designed entrance installation and walkway',
      'Stage with drape and imported floral work',
      'Lounge seating clusters across the lawn',
      'Full lighting design including pathway and canopy',
      'Designer site visit and a three-day build',
    ],
    setup: '2–3 days', where: 'Resort lawn or beachfront',
    query: 'destination wedding reception resort lawn decoration lights evening',
  },
]

/* ═══════════════════════════════════════════════════════════
   Derivation — nothing below is hand-maintained
═══════════════════════════════════════════════════════════ */

/**
 * Fail loudly, at import, on a broken reference.
 *
 * Same reasoning as assertSamples() in config/decorSamples.js: there is no test
 * runner in this project, so import time is the only place a typo gets caught,
 * and the quiet failure — an item tagged to an occasion that does not exist, so
 * it silently never renders — is the expensive one. All problems reported at
 * once rather than fail-on-first, so fixing a batch is one pass and not a
 * guessing game.
 */
function assertCatalog() {
  const problems = []
  const categoryIds = new Set(DECOR_CATEGORIES.map(c => c.id))
  const seen = new Set()

  for (const item of DECOR_CATALOG) {
    if (seen.has(item.id)) problems.push(`duplicate id "${item.id}"`)
    seen.add(item.id)

    if (!categoryIds.has(item.category)) {
      problems.push(`${item.id}: unknown category "${item.category}"`)
    }
    for (const occasion of item.occasions) {
      if (!EVENT_DATA[occasion]) {
        problems.push(`${item.id}: "${occasion}" is not an occasion in EVENT_DATA`)
      }
    }
    if (!(item.price > 0)) {
      problems.push(`${item.id}: price must be a positive rupee figure`)
    }
    // A band whose top is below its floor prints as "from ₹8,499 up to ₹2,499".
    if (item.priceTo != null && item.priceTo < item.price) {
      problems.push(`${item.id}: priceTo (${item.priceTo}) is below price (${item.price})`)
    }
    if (!item.includes?.length) {
      problems.push(`${item.id}: needs at least one line in includes`)
    }
  }

  if (problems.length) {
    throw new Error(`decorCatalog: ${problems.length} invalid entr(ies)\n  - ${problems.join('\n  - ')}`)
  }
}

assertCatalog()

/**
 * Which budget band an item sits in.
 *
 * Absolute rupee bands rather than per-occasion quantiles, unlike tierFor() in
 * decorSamples.js — and for the opposite reason. That function scales within
 * the occasion because it is answering "is this the small one or the big one
 * *for a wedding*". This one is answering "can I afford it", and ₹5,000 is
 * ₹5,000 whether the party is a first birthday or a reception. A relative scale
 * here would file a ₹25,000 mandap as "budget" because it is the cheapest
 * mandap, which is precisely the wrong answer to the question being asked.
 */
export const BUDGET_BANDS = [
  { id: 'under2500', label: 'Under ₹2,500',   min: 0,     max: 2500  },
  { id: 'mid',       label: '₹2,500 – ₹6,000', min: 2500,  max: 6000  },
  { id: 'upper',     label: '₹6,000 – ₹15,000', min: 6000, max: 15000 },
  { id: 'grand',     label: '₹15,000+',       min: 15000, max: Infinity },
]

export function bandFor(price) {
  return BUDGET_BANDS.find(b => price >= b.min && price < b.max) ?? BUDGET_BANDS[0]
}

/** One catalogue item, with its photograph and derived fields attached. */
function resolve(item) {
  const photo = GENERATED_CATALOG_PHOTOS[item.id] ?? null
  return {
    ...item,
    band: bandFor(item.price).id,
    // null until the resolver has run. The card renders a designed tinted
    // plate rather than a gap when it is — same contract as decorSamples.
    photo:  photo?.url    ?? null,
    alt:    photo?.alt    ?? `${item.name} — reference photograph of a similar setup`,
    credit: photo?.credit ?? null,
    // Every photograph here is a licensed lookalike today. Flip this to
    // 'actual' by hand on the day a real Sambramo setup is photographed and
    // the badge follows on its own.
    source: photo?.source ?? 'stock',
  }
}

/**
 * occasionId → the décor items available for it, cheapest first.
 *
 * Cheapest first rather than grandest first on purpose. The grid's job is to
 * make somebody feel this is affordable before it makes them feel it is
 * impressive — a first row of ₹25,000 mandaps closes the page for the customer
 * who came to spend ₹2,000, and that customer is most of them.
 */
export const CATALOG_BY_OCCASION = Object.fromEntries(
  Object.keys(EVENT_DATA).map(occasionId => [
    occasionId,
    DECOR_CATALOG
      .filter(item => item.occasions.includes(occasionId))
      .map(resolve)
      .sort((a, b) => a.price - b.price),
  ])
)

/** Flat, resolved list — for the resolver script and any "everything" view. */
export const ALL_CATALOG_ITEMS = DECOR_CATALOG.map(resolve)

/**
 * The categories actually present for one occasion, in DECOR_CATEGORIES order,
 * each carrying its count and its cheapest entry.
 *
 * Derived rather than declared so a filter chip can never offer a category that
 * would come back empty — the single most common way a filter row rots.
 */
export function categoriesForOccasion(occasionId) {
  const items = CATALOG_BY_OCCASION[occasionId] ?? []
  return DECOR_CATEGORIES
    .map(cat => {
      const mine = items.filter(i => i.category === cat.id)
      return mine.length
        ? { ...cat, count: mine.length, from: Math.min(...mine.map(i => i.price)) }
        : null
    })
    .filter(Boolean)
}

/**
 * A catalogue item in the shape the cart, the enquiry and the coordinator's
 * dashboard already speak.
 *
 * Décor selections ride the existing service pipeline rather than getting a
 * fourth cart line type beside items, packages and products. A décor setup IS
 * a service — something a vendor turns up and performs on the day — and every
 * screen downstream of the cart (CartPage, the enquiry insert, the admin
 * enquiry view, ReviewModal's eligibility check) already knows how to render
 * and store one. A new line type would need each of those taught about it, and
 * the ones nobody remembered would silently drop the customer's décor.
 *
 * `kind: 'decor'` rides along so a coordinator reading the enquiry can tell an
 * installed setup from a booked vendor at a glance, and so a future screen can
 * group them without re-deriving it from the id prefix.
 *
 * The id is the catalogue id unchanged, which is what makes ADD_SERVICE's
 * `${eventId}__${service.id}` key collision-free against the real services —
 * no service in eventServicesData uses a hyphenated id.
 */
export function decorAsService(item) {
  return {
    id:        item.id,
    name:      item.name,
    emoji:     item.emoji,
    category:  'Decor',
    desc:      item.blurb,
    // Absolute, whole-job, and the size it buys is carried in the string —
    // this is exactly the shape the per-plate hints are not. See the header.
    priceHint: `From ${formatINR(item.price)} · ${item.where}`,
    priceMin:  item.price,
    priceMax:  item.priceTo ?? item.price,
    kind:      'decor',
  }
}

/* ═══════════════════════════════════════════════════════════
   Starting points
═══════════════════════════════════════════════════════════ */

/**
 * Three ready combinations, derived from the occasion's own items.
 *
 * ── The problem these solve ───────────────────────────────────────────────
 * An anniversary now offers twenty-eight setups. That is the right amount of
 * choice for somebody who knows what they want and precisely the wrong amount
 * for somebody who does not, and the second group is larger. A grid of
 * twenty-eight equally-weighted cards is the classic paralysis case: people
 * scroll it, admire it and select nothing.
 *
 * So there are three tapped shortcuts above the grid. They are not products,
 * they have no price of their own and nothing is hidden inside them — tapping
 * one TICKS REAL ITEMS in the grid below, which then scroll into view already
 * selected and individually removable. The customer can see exactly what they
 * just agreed to and can take any of it back out. That is the whole difference
 * between a helpful shortcut and a bundle that quietly upsells.
 *
 * ── Derived rather than hand-written ──────────────────────────────────────
 * Fifteen occasions × three combinations is forty-five hand-written lists that
 * would go stale the first time somebody adds an item, in the silent way — the
 * new setup simply never appears in any shortcut and nobody notices for a year.
 * These read the catalogue, so a new item is a candidate the moment it lands.
 *
 * One item per category, always: a "bundle" of three balloon setups is three
 * versions of the same wall, which is the failure mode a naive cheapest-N
 * would produce every time.
 */
function pickDistinct(pool, count) {
  const chosen = []
  const usedCategories = new Set()
  for (const item of pool) {
    if (chosen.length >= count) break
    if (usedCategories.has(item.category)) continue
    usedCategories.add(item.category)
    chosen.push(item)
  }
  return chosen
}

export function startingPointsFor(occasionId) {
  const items = CATALOG_BY_OCCASION[occasionId] ?? []
  // Below four items there is nothing to shortcut — the grid IS the shortlist,
  // and three buttons over a five-card grid is furniture, not help.
  if (items.length < 6) return []

  const byPrice = [...items]                       // already cheapest-first
  const dearest = [...items].reverse()
  // `popular` marks the entries the market actually books most, so the middle
  // combination leads with those and falls back to price order behind them.
  const byPopularity = [...items].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))

  // The copy has to hold for all fifteen occasions, because these are derived
  // and not written per occasion. An earlier pass named the first one "Just the
  // surprise — set up while they are out of the house", which reads well on an
  // anniversary and is nonsense on a wedding at ₹15,000. Each line now
  // describes HOW THE THREE WERE PICKED — cheapest, most-booked, dearest —
  // which is true of every occasion and is also the thing a customer wants to
  // know before trusting a shortcut.
  const points = [
    {
      id: 'surprise',
      name: 'Start small',
      emoji: '🌱',
      blurb: 'The three least expensive ways to change how the place looks.',
      items: pickDistinct(byPrice, 3),
    },
    {
      /* Named "What most people book" for one draft, which was a lie. Sambramo
         is pre-launch and has no booking history at all — `popular` below is a
         judgement from market research, not a measurement of our own orders,
         and any wording that implies otherwise is the same class of claim as
         captioning a stock photograph "our recent work". It says whose opinion
         it is instead. */
      id: 'evening',
      name: 'Our pick',
      emoji: '🌟',
      blurb: 'The four we would put in front of you first for this occasion.',
      items: pickDistinct(byPopularity, 4),
    },
    {
      id: 'everything',
      name: 'The whole venue',
      emoji: '👑',
      blurb: 'Nothing left undressed. For the one with a guest list.',
      items: pickDistinct(dearest, 4),
    },
  ]

  return points
    .filter(p => p.items.length >= 2)
    .map(p => ({ ...p, from: p.items.reduce((sum, i) => sum + i.price, 0) }))
}

/** Headline numbers for the section copy, so they cannot drift from the data. */
export function catalogSummary(occasionId) {
  const items = CATALOG_BY_OCCASION[occasionId] ?? []
  if (!items.length) return null
  return {
    count:      items.length,
    from:       Math.min(...items.map(i => i.price)),
    categories: categoriesForOccasion(occasionId).length,
  }
}
