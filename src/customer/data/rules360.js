/**
 * The 360° recommendation rules — data, not code.
 *
 * The engine (lib/recommend360.js) starts from the bundle's baseline
 * (catalogue360.generated.js: CORE / CONDITIONAL / OPTIONAL / NOT_DEFAULT per
 * occasion × trade) and applies these rules to the event's context. Edit
 * this file — or publish a new version to the database with
 * `scripts/rules360.mjs publish` — to tune recommendations; no UI code
 * changes are needed. Every rule carries the reason the customer reads.
 *
 * ── Rule shape ────────────────────────────────────────────────────────
 *   { id, when, unless?, effect, trades, reason, allowNotDefault? }
 *
 *   effect
 *     activate   put a CONDITIONAL (or OPTIONAL) trade on the shortlist;
 *                a NOT_DEFAULT one only with `allowNotDefault`, and never
 *                when `unless` matches (bundle rule 4: no keyword upgrade
 *                against a contradictory fact)
 *     suppress   keep it off the shortlist (still searchable)
 *     cover      the venue or the occasion already provides it
 *     demote     reclassify as NOT_DEFAULT for this occasion
 *
 *   Precedence (bundle rules 5 and 2): customer choices > cover > suppress
 *   > demote > activate > baseline.
 *
 * ── Conditions ────────────────────────────────────────────────────────
 *   { all: [...] } | { any: [...] } | { not: cond }
 *   { f: 'guests', gte: 100 }   { f: 'venueType', in: ['home'] }
 *   { f: 'formats', has: 'rituals' }   { f: 'formats', hasAny: [...] }
 *   { f: 'venueBooked', is: true }      { f: 'time', gte: '17:00' }
 *   { f: 'occasion.category', in: [...] }   { f: 'occasion.id', in: [...] }
 *   { f: 'endHour', gte: 22 }  (derived: start + hours)
 *   A field the customer has not answered never matches, so a rule cannot
 *   fire on a guess.
 */

export const RULES_VERSION = 'R360-2026.10.27-1'

/* Venue facilities the customer can tick, and the trade each one covers. */
export const VENUE_FACILITIES = [
  { id: 'catering', label: 'In-house catering', trades: ['catering_food'] },
  { id: 'decor', label: 'Decoration', trades: ['decoration_floral'] },
  { id: 'sound', label: 'Sound system & mics', trades: ['sound_av'] },
  { id: 'lighting', label: 'Lighting', trades: ['event_lighting'] },
  { id: 'furniture', label: 'Tables, chairs & stage', trades: ['tent_furniture', 'event_equipment_rental'] },
  { id: 'power', label: 'Power backup & AC', trades: ['power_cooling'] },
  { id: 'parking', label: 'Parking & valet', trades: ['valet_parking'] },
  { id: 'security', label: 'Security staff', trades: ['security_services'] },
  { id: 'cleaning', label: 'Cleaning & washrooms', trades: ['safety_facilities'] },
]

const WEDDING_TRADES = ['wedding_planning', 'bridal_makeup_hair', 'mehendi_artist', 'trousseau_gift_packing']
/* Occasions outside the wedding category that are still weddings. */
const WEDDING_LIKE = ['engagement-celebration', 'bridal-shower', 'destination-wedding', 'beach-wedding', 'garden-wedding', 'hybrid-wedding']
const SOLEMN = ['memorial-gathering', 'celebration-of-life']
const FESTIVE = ['dj_music', 'live_entertainment', 'bar_beverages', 'cake_desserts', 'gifts_favours', 'anchor_mc']
const PHYSICAL = ['venue', 'tent_furniture', 'catering_food', 'bar_beverages', 'valet_parking', 'passenger_transport', 'security_services',
  'loading_unloading_crew', 'transportation', 'mini_truck_pickup', 'medium_large_goods_vehicle', 'warehouse_storage', 'event_equipment_rental',
  'decoration_floral', 'power_cooling', 'cake_desserts', 'safety_facilities']
const VIRTUAL = { any: [{ f: 'venueType', in: ['virtual'] }, { f: 'occasion.where', in: ['online'] }] }
const SETTLED_PLACE = ['home', 'newhome', 'school', 'campus', 'premises', 'site', 'venue_known', 'route']

export const RULES = [
  /* ── Venue ─────────────────────────────────────────────────────────── */
  { id: 'venue.booked', when: { f: 'venueBooked', is: true }, effect: 'cover', trades: ['venue'], reason: 'You already have the venue' },
  { id: 'venue.home', when: { f: 'venueType', in: ['home'] }, effect: 'cover', trades: ['venue'], reason: 'It’s at your home' },
  { id: 'venue.settled', when: { f: 'occasion.where', in: SETTLED_PLACE }, effect: 'cover', trades: ['venue'], reason: 'The place is set by the occasion' },
  ...VENUE_FACILITIES.map(v => ({ id: `venue.provides.${v.id}`, when: { f: 'venueProvides', has: v.id }, effect: 'cover', trades: v.trades, reason: `Your venue provides ${v.label.toLowerCase()}` })),

  /* ── Programme ─────────────────────────────────────────────────────── */
  { id: 'programme.sound', when: { any: [{ f: 'formats', hasAny: ['stage', 'speeches', 'performance', 'concert', 'workshop', 'livestream'] }, { f: 'venueType', in: ['virtual', 'hybrid'] }] },
    effect: 'activate', trades: ['sound_av'], reason: 'Speeches or a stage need mics and sound' },
  { id: 'programme.host', when: { f: 'formats', hasAny: ['stage', 'speeches', 'performance'] }, effect: 'activate', trades: ['anchor_mc'], reason: 'A host keeps the stage programme moving' },
  { id: 'programme.performance', when: { f: 'formats', hasAny: ['performance', 'concert'] }, effect: 'activate', trades: ['live_entertainment'], reason: 'You planned a performance' },
  { id: 'programme.dancing', when: { f: 'formats', hasAny: ['dancing'] }, effect: 'activate', trades: ['dj_music'], reason: 'There’ll be dancing' },
  { id: 'programme.rituals', when: { f: 'formats', has: 'rituals' }, effect: 'activate', allowNotDefault: true,
    unless: VIRTUAL, trades: ['priest_rituals'], reason: 'There are rituals to perform' },
  { id: 'programme.light', when: { any: [{ f: 'time', gte: '17:00' }, { f: 'formats', hasAny: ['stage', 'performance', 'concert'] }, { f: 'setting', in: ['outdoor', 'mixed'] }] },
    unless: VIRTUAL, effect: 'activate', trades: ['event_lighting'], reason: 'Evening, stage or outdoor — it needs lighting' },

  /* ── Setting and duration ──────────────────────────────────────────── */
  { id: 'setting.outdoor', when: { any: [{ f: 'setting', in: ['outdoor', 'mixed'] }, { f: 'venueType', in: ['outdoor', 'destination'] }] },
    effect: 'activate', allowNotDefault: true, unless: VIRTUAL, trades: ['tent_furniture', 'power_cooling'], reason: 'Outdoors needs shelter, seating and power' },
  { id: 'duration.long', when: { f: 'hours', gte: 6 }, unless: VIRTUAL, effect: 'activate', trades: ['power_cooling'], reason: 'A long event needs backup power and cooling' },
  { id: 'duration.multiday', when: { f: 'hours', gte: 24 }, effect: 'activate', trades: ['warehouse_storage'], reason: 'Multi-day — décor and equipment need storage overnight' },

  /* ── Guests ────────────────────────────────────────────────────────── */
  { id: 'guests.welcome', when: { f: 'guests', gte: 50 }, effect: 'activate', trades: ['guest_services'], reason: 'With 50+ guests, someone should welcome them' },
  { id: 'guests.invites', when: { f: 'guests', gte: 50 }, effect: 'activate', trades: ['invitation_printing'], reason: 'Invitations for a larger guest list' },
  { id: 'guests.parking', when: { f: 'guests', gte: 100 }, unless: { any: [{ f: 'venueType', in: ['home', 'virtual'] }, VIRTUAL] }, effect: 'activate', trades: ['valet_parking'], reason: '100+ guests arriving by car' },
  { id: 'guests.small', when: { f: 'guests', lt: 30 }, unless: { f: 'public', is: true }, effect: 'suppress', trades: ['valet_parking', 'security_services'], reason: 'Not needed for a small private gathering' },
  { id: 'guests.logistics', when: { any: [{ f: 'guests', gte: 200 }, { all: [{ f: 'setting', in: ['outdoor', 'mixed'] }, { f: 'guests', gte: 100 }] }] },
    unless: VIRTUAL, effect: 'activate', trades: ['loading_unloading_crew', 'transportation', 'event_equipment_rental'], reason: 'A big set-up needs crew and vehicles' },
  { id: 'guests.heavy', when: { f: 'guests', gte: 500 }, unless: VIRTUAL, effect: 'activate', trades: ['medium_large_goods_vehicle'], reason: 'Large loads for a 500+ guest event' },

  /* ── Travel and access ─────────────────────────────────────────────── */
  { id: 'travel.away', when: { any: [{ f: 'travel', in: ['outstation', 'destination'] }, { f: 'venueType', in: ['destination'] }] },
    unless: VIRTUAL, effect: 'activate', allowNotDefault: true, trades: ['passenger_transport', 'transportation'], reason: 'Guests and goods are travelling' },
  { id: 'travel.late', when: { f: 'endHour', gte: 22 }, unless: { any: [VIRTUAL, { f: 'venueType', in: ['home'] }] }, effect: 'activate', trades: ['passenger_transport'], reason: 'It ends late — get guests home safely' },
  { id: 'access.support', when: { f: 'accessibility', is: true }, effect: 'activate', trades: ['guest_services', 'passenger_transport'], reason: 'Help for elders and guests who need access support' },

  /* ── Safety ────────────────────────────────────────────────────────── */
  { id: 'safety.crowd', when: { any: [{ f: 'public', is: true }, { f: 'guests', gte: 300 }, { f: 'drinks', in: ['alcohol'] }, { f: 'formats', hasAny: ['concert', 'sports', 'procession'] }] },
    unless: VIRTUAL, effect: 'activate', trades: ['security_services', 'safety_facilities'], reason: 'Crowds, alcohol or a public event need security and first aid' },
  { id: 'safety.children', when: { f: 'children', is: true }, unless: VIRTUAL, effect: 'activate', trades: ['safety_facilities'], reason: 'Children attending — first aid and safe spaces' },
  /* Product decision (Mohan, 2026-10-27): every physical event is cleaned up after. */
  { id: 'safety.cleanup', when: { f: 'occasion.id', exists: true }, unless: VIRTUAL, effect: 'activate', trades: ['safety_facilities'], reason: 'Clean-up and washrooms after the event' },

  /* ── Food, drink and media ─────────────────────────────────────────── */
  { id: 'food.none', when: { f: 'food', in: ['none'] }, effect: 'suppress', trades: ['catering_food'], reason: 'You said no food' },
  { id: 'food.yes', when: { f: 'food', in: ['snacks', 'meal'] }, unless: VIRTUAL, effect: 'activate', trades: ['catering_food'], reason: 'You’re serving food' },
  { id: 'drinks.yes', when: { f: 'drinks', in: ['soft', 'alcohol'] }, unless: VIRTUAL, effect: 'activate', trades: ['bar_beverages'], reason: 'You want a drinks counter' },
  { id: 'media.none', when: { f: 'media', in: ['none'] }, effect: 'suppress', trades: ['photography', 'videography'], reason: 'You chose no photos or video' },
  { id: 'media.photo', when: { f: 'media', in: ['photo', 'both'] }, effect: 'activate', trades: ['photography'], reason: 'You want it photographed' },
  { id: 'media.video', when: { any: [{ f: 'media', in: ['video', 'both'] }, { f: 'formats', has: 'livestream' }] }, effect: 'activate', trades: ['videography'], reason: 'You want it filmed or streamed' },

  /* ── Occasion-specific ─────────────────────────────────────────────── */
  { id: 'occasion.not-a-wedding', when: { all: [{ not: { f: 'occasion.category', in: ['wedding'] } }, { not: { f: 'occasion.id', in: WEDDING_LIKE } }] },
    effect: 'suppress', trades: WEDDING_TRADES, reason: 'Only for weddings' },
  { id: 'occasion.solemn', when: { f: 'occasion.id', in: SOLEMN }, effect: 'demote', trades: FESTIVE, reason: 'Kept out for a respectful gathering' },
  { id: 'occasion.virtual', when: VIRTUAL, unless: { f: 'venueType', in: ['hybrid'] }, effect: 'suppress', trades: PHYSICAL, reason: 'Not needed for an online event' },
]

/* What to ask when a CONDITIONAL trade's trigger is still unknown. */
export const QUESTIONS = {
  sound_av: { field: 'formats', text: 'Will there be speeches, a stage or a performance?' },
  anchor_mc: { field: 'formats', text: 'Is there a stage programme to host?' },
  live_entertainment: { field: 'formats', text: 'Any performances planned?' },
  dj_music: { field: 'formats', text: 'Will there be dancing?' },
  priest_rituals: { field: 'formats', text: 'Are there rituals to perform?' },
  event_lighting: { field: 'time', text: 'What time does it start?' },
  tent_furniture: { field: 'setting', text: 'Indoors or outdoors?' },
  power_cooling: { field: 'setting', text: 'Indoors or outdoors, and how long?' },
  catering_food: { field: 'food', text: 'Are you serving food?' },
  bar_beverages: { field: 'drinks', text: 'Do you want a drinks counter?' },
  photography: { field: 'media', text: 'Do you want photos?' },
  videography: { field: 'media', text: 'Do you want a video or livestream?' },
  guest_services: { field: 'guests', text: 'How many guests?' },
  invitation_printing: { field: 'guests', text: 'How many guests?' },
  valet_parking: { field: 'guests', text: 'How many guests?' },
  security_services: { field: 'public', text: 'Is it open to the public?' },
  safety_facilities: { field: 'public', text: 'Is it open to the public?' },
  passenger_transport: { field: 'travel', text: 'Are guests travelling from out of town?' },
  transportation: { field: 'travel', text: 'Are guests travelling from out of town?' },
  loading_unloading_crew: { field: 'guests', text: 'How many guests?' },
  event_equipment_rental: { field: 'guests', text: 'How many guests?' },
  medium_large_goods_vehicle: { field: 'guests', text: 'How many guests?' },
  warehouse_storage: { field: 'hours', text: 'Does it run over more than a day?' },
}

/* The 12 lifecycle phases (bundle README §3.4). */
export const PHASES = [
  { id: 1, key: 'discover', title: 'Discover & define' },
  { id: 2, key: 'plan', title: 'Plan & budget' },
  { id: 3, key: 'book', title: 'Venue & main suppliers' },
  { id: 4, key: 'coordinate', title: 'Invites & coordination' },
  { id: 5, key: 'logistics', title: 'Logistics & transport' },
  { id: 6, key: 'setup', title: 'Set-up & tech checks' },
  { id: 7, key: 'arrival', title: 'Guest arrival & operations' },
  { id: 8, key: 'programme', title: 'The main programme' },
  { id: 9, key: 'hospitality', title: 'Food & hospitality' },
  { id: 10, key: 'departure', title: 'Guests leave' },
  { id: 11, key: 'teardown', title: 'Teardown & clean-up' },
  { id: 12, key: 'post', title: 'After the event' },
]
/* The workbook's 11 stages, placed on the 12 phases. */
export const STAGE_TO_PHASES = { 1: [1], 2: [2], 3: [3, 6], 4: [4], 5: [6, 8], 6: [9], 7: [6, 8], 8: [7], 9: [5, 11], 10: [10, 11], 11: [12] }
/* Where each service is shown in the plan (its main moment). */
export const PRIMARY_PHASE = {
  venue: 3, wedding_planning: 2, end_to_end_event_logistics: 2, invitation_printing: 4, guest_services: 7,
  decoration_floral: 6, event_lighting: 6, sound_av: 6, tent_furniture: 6, event_equipment_rental: 6, power_cooling: 6,
  photography: 8, videography: 8, anchor_mc: 8, dj_music: 8, live_entertainment: 8, priest_rituals: 8, bridal_makeup_hair: 8, mehendi_artist: 8,
  catering_food: 9, cake_desserts: 9, bar_beverages: 9, gifts_favours: 9, trousseau_gift_packing: 4,
  valet_parking: 7, security_services: 7, safety_facilities: 11, passenger_transport: 10,
  transportation: 5, mini_truck_pickup: 5, medium_large_goods_vehicle: 5, event_materials_supplier: 5, loading_unloading_crew: 11, warehouse_storage: 11,
}
