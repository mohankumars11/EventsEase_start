// Trade 7 — Decoration & Floral
//
// ══════════════════════════════════════════════════════════════════════
// WHY THIS TRADE NEEDED MORE THAN EIGHT OPTIONS
// ══════════════════════════════════════════════════════════════════════
//
// It asked eight services, eight themes and one question about flowers,
// and then asked the partner to type what a package includes into a
// 400-character box. Everything that decides the price of a decoration
// job — which areas, how big a stage, fresh or artificial, whose
// flowers, how many hours to install, can the lorry reach the mantapa —
// was either missing or buried in prose nothing can read.
//
// That is why almost every decoration job fell to a custom quote. A
// quote is the right answer for a bespoke design; it is the wrong
// answer for "stage, entrance and twelve centrepieces at a kalyana
// mantapa", which is most of this trade's work and is perfectly
// priceable from a rate card.
//
// So: the areas are a list, the flowers are a list, the props are a
// list, the venue types are a list, and the rate card prices the units
// this trade actually sells — per square foot of stage, per flower
// wall, per centrepiece, per pillar, per entrance arch.
//
// ══════════════════════════════════════════════════════════════════════
// WRITTEN FOR THIS MARKET
// ══════════════════════════════════════════════════════════════════════
//
// Kalyana mantapas and community halls, not just banquet halls. Mallige
// and kanakambara, not just roses and orchids. Naamkarana, gruhapravesha
// and seemantha, which are bookings here and are nowhere in a Western
// events taxonomy. Torana, banana stems and rangoli, which are the
// first three things a South Indian family asks for and none of which
// the old list could express.

import { q, screen, catalogue } from './schema'

/* What a decorator is hired to dress. Grouped by where it happens, so a
   partner ticking their way down the list reads it as a venue walk
   rather than an alphabet. */
const SERVICES = [
  // The ceremony itself
  'Mandap / mantap decoration', 'Stage decoration', 'Reception stage',
  'Backdrop', 'Haldi decoration', 'Mehendi decoration', 'Sangeet decoration',
  'Engagement decoration', 'Naming ceremony (naamkarana)', 'Seemantha / baby shower',
  'Housewarming (gruhapravesha)', 'Pooja / homa setup', 'Temple decoration',
  // Arrival and approach
  'Entrance arch', 'Gate decoration', 'Welcome board / nameplate',
  'Pathway / aisle decoration', 'Torana and banana stems', 'Rangoli',
  'Flower shower arrangement', 'Car decoration', 'Palanquin / doli decoration',
  // The room
  'Complete venue decoration', 'Ceiling decoration and drapes', 'Pillar decoration',
  'Table styling', 'Centrepieces', 'Chair covers and sashes', 'Lounge / sofa setup',
  'Photo booth / selfie point', 'Flower wall', 'Balloon decoration',
  'Theme props and cutouts', 'LED letters and neon signs', 'Candle and lantern styling',
  // Other occasions
  'Birthday decoration', 'Anniversary decoration', 'Corporate stage and backdrop',
  'Exhibition / retail display', 'Festival decoration',
  // Around the edges
  'Fresh flower garlands', 'Floral jewellery', 'Bouquets and bunches',
  'Dismantling and clearing',
]

const THEMES = [
  'Traditional South Indian', 'Temple style', 'Mysore royal', 'North Indian traditional',
  'Royal / regal', 'Contemporary', 'Minimal', 'Pastel', 'Floral-heavy',
  'Marigold-heavy', 'White and green', 'Monochrome', 'Metallic and gold',
  'Boho', 'Rustic', 'Vintage', 'Garden', 'Tropical', 'Beach / destination',
  'Fairy-light', 'Floral tunnel', 'Bollywood', 'Cartoon / character (for children)',
  'Corporate / brand-led',
]

const EVENTS = [
  'Weddings', 'Receptions', 'Engagements', 'Haldi', 'Mehendi', 'Sangeet',
  'Naming ceremonies', 'Seemantha / baby showers', 'Housewarmings',
  'Birthdays', 'Anniversaries', 'Pooja and homa', 'Temple functions',
  'Festivals', 'Corporate events', 'Exhibitions', 'School and college events',
]

/* Named because the price of a decoration job is mostly the price of
   its flowers, and a customer asking for mallige and getting carnation
   has a complaint nobody can settle from a listing that said "fresh". */
const FLOWERS = [
  'Rose', 'Marigold (chendu hoovu)', 'Jasmine (mallige)', 'Kanakambara',
  'Tuberose (rajnigandha)', 'Chrysanthemum (sevanthige)', 'Carnation',
  'Gerbera', 'Orchid', 'Lily', 'Anthurium', 'Hydrangea', 'Bird of paradise',
  'Lotus', 'Banana stems and leaves', 'Mango leaves and torana',
  'Imported flowers', 'Dried and preserved flowers', 'Artificial flowers',
]

const PROPS = [
  'Drapes and fabric', 'Truss and framework', 'Mirror panels', 'Acrylic panels',
  'MDF cutouts', 'Thermocol / foam carving', 'Flower walls and panels',
  'LED letters', 'Neon signs', 'Fairy lights', 'Festoon lights',
  'Candles', 'Lanterns', 'Balloons — latex', 'Balloons — foil and chrome',
  'Carpets and runners', 'Pedestals and pots', 'Umbrellas and chhatris',
  'Swings / jhoola', 'Furniture and lounge seating', 'Fog and cold pyro',
]

/* Where the work happens, because it decides access, install time and
   whether a lorry gets near the stage. */
const VENUES = [
  'Kalyana mantapa', 'Community hall', 'Banquet hall', 'Hotel', 'Resort',
  'Convention centre', 'Open ground', 'Farmhouse', 'Private home',
  'Apartment clubhouse', 'Temple', 'Beach', 'Palace / heritage property',
  'Corporate office', 'Exhibition centre',
]

export default {
  id: 'decoration_floral',
  serviceNoun: 'decoration service',
  screens: [
    screen('profile', 'Your decoration work', 'What you decorate, and in what style.', [
      q.multi('services', 'What decoration work do you take on?', SERVICES, { required: true, other: true }),
      q.multi('themes', 'Which themes and styles do you offer?', THEMES, { required: true, other: true }),
      q.multi('events', 'Which events do you decorate?', EVENTS, { required: true, other: true }),
      q.single('flowers', 'Do you use fresh flowers, artificial flowers or both?', ['Fresh', 'Artificial', 'Both'], { required: true }),
      q.multi('flower_types', 'Which flowers do you work with?', FLOWERS,
        { other: true, showWhen: { q: 'flowers', in: ['fresh', 'both'] } }),
      q.single('flower_sourcing', 'Where do your flowers come from?', [
        'Flower market, bought per order', 'Regular wholesale supplier', 'Own farm or nursery',
        'Imported through an agent', 'Depends on the order',
      ], { other: true, showWhen: { q: 'flowers', in: ['fresh', 'both'] } }),
      q.multi('props', 'What do you build with?', PROPS, { required: true, other: true }),
      q.toggle('custom_designs', 'Do you offer custom designs?'),
      q.toggle('setup_dismantle', 'Do you handle setup and dismantling?'),
      q.toggle('site_visit', 'Do you do a site visit before the event?'),
      q.toggle('design_mockup', 'Do you share a design or mock-up before the day?'),
    ]),
    screen('scale', 'What you can take on', 'The size of job you can handle, and where.', [
      q.multi('venues', 'Which venues do you work in?', VENUES, { required: true, other: true }),
      q.number('max_area_sqft', 'Largest area you can decorate', { required: true, min: 100, max: 500000, suffix: 'sq ft' }),
      q.number('max_stage_sqft', 'Largest stage you can build', { min: 0, max: 20000, suffix: 'sq ft' }),
      q.number('max_height_ft', 'Tallest structure you can put up', { min: 0, max: 200, suffix: 'ft' }),
      q.number('install_hours_before', 'How long before the event do you need the venue?', { required: true, min: 1, max: 120, suffix: 'hours' }),
      q.toggle('overnight_install', 'Can you install overnight?'),
      q.toggle('same_day_turnaround', 'Can you set up and clear on the same day?'),
      q.multi('access_needs', 'What do you need at the venue?', [
        'Vehicle access to the hall', 'Power supply', 'Water supply', 'Storage space',
        'Lift access', 'Permission to drill or nail', 'Scaffolding or ladder access',
        'Parking for a lorry',
      ], { other: true }),
      q.number('travel_radius_km', 'How far do you travel?', { min: 0, max: 2000, suffix: 'km' }),
      q.toggle('outstation', 'Do you take outstation and destination events?'),
    ]),
  ],

  /* ── The rate card ──────────────────────────────────────────────────
     The old catalogue was "packages", each with a 400-character box for
     what was in it. A package is still here, and so is everything a
     package is MADE of — priced per unit, because that is what makes a
     job instantly priceable instead of a quote. */
  catalogue: catalogue('packages', 'Your decoration items & packages', 'item', 'items', [
    q.text('name', 'Name', { max: 60, placeholder: 'Leave blank and we will name it from the details below' }),
    q.single('kind', 'What is this?', [
      'Full package', 'Stage', 'Mandap', 'Backdrop', 'Entrance arch', 'Flower wall',
      'Centrepiece', 'Pillar', 'Ceiling and drapes', 'Pathway', 'Photo booth',
      'Car decoration', 'Garland', 'Bouquet', 'Rangoli', 'Balloon setup',
      'Lounge setup', 'Prop or cutout', 'Add-on item',
    ], { required: true, other: true }),
    q.multi('areas', 'Areas included', [
      'Stage', 'Mandap', 'Entrance', 'Gate', 'Pathway', 'Tables', 'Backdrop',
      'Photo booth', 'Ceiling', 'Pillars', 'Lounge', 'Dining area', 'Car',
    ], { other: true, showWhen: { q: 'kind', in: ['full_package'] } }),
    q.multi('includes', 'What the customer gets', [
      'Fresh flowers', 'Artificial flowers', 'Drapes and fabric', 'Lighting',
      'Props and cutouts', 'Furniture', 'Carpets', 'Balloons', 'Candles',
      'Design and mock-up', 'Site visit', 'Installation crew', 'Transport',
      'Dismantling and clearing', 'Standby crew during the event',
    ], { required: true, other: true }),
    q.single('flowers', 'Flowers used', ['Fresh', 'Artificial', 'Mixed', 'None'], { required: true }),
    q.multi('flower_types', 'Which flowers', FLOWERS, { other: true, showWhen: { q: 'flowers', in: ['fresh', 'mixed'] } }),
    q.dimensions('size', 'Size', { unit: 'ft' }),
    q.number('guest_capacity', 'Suits up to', { min: 10, max: 100000, suffix: 'guests' }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Charged', [
      'Per setup', 'Per sq ft', 'Per running ft', 'Per piece', 'Per table', 'Per event',
    ], { required: true }),
    q.number('min_order', 'Minimum order', { min: 1, max: 10000 }),
    q.number('setup_hours', 'Setup time', { required: true, min: 1, max: 72, suffix: 'hours' }),
    q.number('crew_needed', 'Crew needed', { min: 1, max: 200 }),
    q.number('lead_days', 'Notice you need for this', { min: 0, max: 90, suffix: 'days' }),
    q.toggle('dismantle_included', 'Dismantling included in this price?'),
    q.photos('photos', 'Photos of this setup', { min: 1, max: 6 }),
  ]),

  pricing: {
    kinds: ['fixed', 'per_unit', 'catalogue', 'per_guest', 'quote'],
    unitLabels: { per_unit: ['per sq ft', 'per running ft', 'per piece', 'per table', 'per setup'] },
    fields: [
      q.money('design_fee', 'Base design fee'),
      q.money('site_visit_fee', 'Site visit, where it is charged'),
      q.money('labour_fee', 'Labour'),
      q.money('transport_fee', 'Transportation'),
      q.money('dismantle_fee', 'Dismantling'),
      q.money('customisation_fee', 'Customisation'),
      q.money('overnight_fee', 'Overnight or early-morning install'),
      q.money('standby_crew_hour', 'Crew standing by during the event, per hour'),
      q.money('outstation_day_rate', 'Outstation, per day',
        { showWhen: { q: 'outstation', truthy: true } }),
    ],
    note: 'Every item states its areas, its flowers and whether dismantling is in the price. '
      + 'A bespoke design still goes to a custom quote — a rate card is for the work you repeat.',
  },

  addons: [
    { id: 'extra_centrepiece', label: 'Extra centrepiece', unit: 'per_item' },
    { id: 'extra_garland', label: 'Extra garland', unit: 'per_item' },
    { id: 'lighting', label: 'Decor lighting', unit: 'per_event' },
    { id: 'photo_booth', label: 'Photo booth', unit: 'per_event' },
    { id: 'fresh_upgrade', label: 'Upgrade to fresh flowers', unit: 'per_event' },
    { id: 'flower_shower', label: 'Flower shower on entry', unit: 'per_event' },
    { id: 'car_decoration', label: 'Car decoration', unit: 'per_item' },
    { id: 'rangoli', label: 'Rangoli', unit: 'per_item' },
    { id: 'balloon_arch', label: 'Balloon arch', unit: 'per_item' },
    { id: 'led_letters', label: 'LED letters or neon sign', unit: 'per_item' },
    { id: 'fog_effect', label: 'Fog or cold pyro entry', unit: 'per_event' },
    { id: 'standby_crew', label: 'Crew standing by during the event', unit: 'per_hour' },
  ],

  resources: {
    model: 'staff',
    title: 'Crew & schedule',
    fields: [
      q.number('concurrent_setups', 'Setups you can run at the same time', { required: true, min: 1, max: 20 }),
      q.number('crew_size', 'Installation crew size', { required: true, min: 1, max: 200 }),
      q.number('florists', 'Florists in your team', { min: 0, max: 100 }),
      q.number('procurement_days', 'Material procurement lead time', { min: 0, max: 60, suffix: 'days' }),
      q.number('dismantle_hours', 'Dismantling time', { min: 0, max: 48, suffix: 'hours' }),
      q.toggle('own_transport', 'Do you have your own transport?'),
      q.toggle('own_storage', 'Do you have your own storage or godown?'),
    ],
  },

  requestFields: [
    q.number('event_area_sqft', 'Event area', { suffix: 'sq ft' }),
    q.dimensions('stage_dimensions', 'Stage dimensions', { unit: 'ft' }),
    q.number('ceiling_height_ft', 'Ceiling height', { suffix: 'ft' }),
    q.number('tables', 'Tables / seating areas'),
    q.text('colours', 'Colour theme'),
    q.textarea('venue_restrictions', 'Venue restrictions'),
    q.photos('references', 'Reference images', { max: 6 }),
  ],

  compliance: { conditional: [] },

  quoteTriggers: [
    { id: 'custom_design', label: 'Custom design not in your rate card' },
    { id: 'schedule_infeasible', label: 'Install / removal window too tight' },
    { id: 'over_capacity', label: 'Area or height beyond what you can do' },
    { id: 'outstation_unpriced', label: 'Outstation event with no day rate set' },
  ],

  quoteTemplate: ['Design fee', 'Materials & flowers', 'Props and structures', 'Labour',
    'Transport', 'Setup', 'Dismantling'],

  readiness: [
    'Items priced with their unit and setup time',
    'Areas, flowers and inclusions stated on each',
    'Crew free for the date',
    'Procurement lead time met',
  ],
}
