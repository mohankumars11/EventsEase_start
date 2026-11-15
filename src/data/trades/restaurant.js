// Trade 35 — Restaurant & Dining (Mohan, 2026-11-11: "create one restaurant
// trade which will be the 35th trade in the partner app … so that even they
// list into our app — book a dining or order catering food from the
// restaurant").
//
// A restaurant is not a caterer who delivers (that is kitchen_type on
// Catering & Food): it has tables, a private room, a party hall, opening
// hours and a per-person set menu. Customers reach it two ways — "we're
// eating at a restaurant" (a table or a room for the guests) and "we'll
// order in" (a bulk order delivered) — and both are priced per person.
import { q, screen, catalogue, EVENT_TYPES } from './schema'

const CUISINES = [
  'South Indian', 'North Indian', 'Biryani & kebabs', 'Chinese', 'Continental', 'Multi-cuisine', 'Street food & chaat',
  'Mughlai', 'Coastal / seafood', 'Andhra', 'Kerala', 'Italian', 'Pan-Asian', 'Bakery & desserts', 'Café',
]

export default {
  id: 'restaurant',
  serviceNoun: 'restaurant',
  screens: [
    screen('profile', 'Your restaurant', 'What you serve and how guests can book you.', [
      q.text('restaurant_name', 'Restaurant name', { required: true, max: 80 }),
      q.multi('cuisines', 'Cuisines you serve', CUISINES, { required: true, other: true }),
      q.single('diet', 'Food you serve', ['Pure vegetarian', 'Veg and non-veg', 'Non-veg specialist'], { required: true }),
      q.multi('dining_modes', 'How can a celebration book you?', [
        'Table booking', 'Private dining room', 'Party hall', 'Bulk order delivered', 'Takeaway for events',
      ], { required: true }),
      q.multi('meal_formats', 'What can you offer a group?', ['Set menu per person', 'Buffet', 'À la carte', 'Party platters', 'Live counters'], { required: true, other: true }),
      q.multi('events', 'Celebrations you host', EVENT_TYPES, { other: true }),
      q.photos('photos', 'Photos of the restaurant and the food', { required: true, min: 3, max: 30 }),
      q.number('seating_capacity', 'Seats in the restaurant', { required: true, min: 4, max: 5000, suffix: 'seats' }),
      q.number('private_room_capacity', 'Private room / hall capacity', { min: 0, max: 2000, suffix: 'guests', showWhen: { q: 'dining_modes', includes: 'private_dining_room' } }),
      q.number('delivery_radius_km', 'Bulk orders delivered within', { min: 1, max: 100, suffix: 'km', showWhen: { q: 'dining_modes', includes: 'bulk_order_delivered' } }),
      q.number('min_order_guests', 'Minimum guests for a bulk order', { min: 1, max: 5000, showWhen: { q: 'dining_modes', includes: 'bulk_order_delivered' } }),
      q.text('open_hours', 'Opening hours', { max: 60, placeholder: 'e.g. 11 am – 11 pm, all days' }),
      q.multi('facilities', 'Facilities', ['Air-conditioning', 'Parking', 'Valet', 'Kids friendly', 'Wheelchair access', 'Rooftop / outdoor seating', 'Live music', 'Screen for slideshows'], { other: true }),
      q.toggle('alcohol', 'Alcohol served (licensed)'),
    ]),
    screen('rules', 'House rules for celebrations', 'What a host must know before they book.', [
      q.number('advance_notice_hours', 'Notice you need for a group booking', { required: true, min: 1, max: 240, suffix: 'hours' }),
      q.toggle('outside_cake', 'Guests may bring their own cake'),
      q.toggle('decor_allowed', 'Guests may decorate the table or room'),
      q.toggle('music_allowed', 'Guests may play their own music'),
      q.number('max_hours', 'Longest a group may hold the table or room', { min: 1, max: 12, suffix: 'hours' }),
    ]),
  ],
  catalogue: catalogue('packages', 'Your set menus & party packages', 'package', 'packages', [
    q.text('name', 'Package name', { required: true, max: 60, placeholder: 'e.g. Birthday dinner set menu' }),
    q.single('format', 'Format', ['Set menu per person', 'Buffet per person', 'Party platter (serves 10)', 'Private room package'], { required: true }),
    q.single('diet', 'Diet', ['Veg', 'Non-veg', 'Both'], { required: true }),
    q.number('courses', 'Courses', { min: 1, max: 12 }),
    q.textarea('includes', 'What it includes', { max: 400, placeholder: 'Starters, mains, dessert, one soft drink…' }),
    q.money('price_per_person', 'Price per person', { required: true }),
    q.number('min_guests', 'Minimum guests', { required: true, min: 1, max: 5000 }),
    q.number('max_guests', 'Maximum guests', { min: 1, max: 5000 }),
    q.photos('photos', 'Photos', { min: 0, max: 8 }),
  ]),
  pricing: {
    kinds: ['per_person', 'per_guest', 'fixed', 'quote'],
    fields: [
      q.money('room_charge', 'Private room / hall charge (if any)'),
      q.money('delivery_fee', 'Delivery fee for bulk orders', { showWhen: { q: 'dining_modes', includes: 'bulk_order_delivered' } }),
      q.money('min_charge', 'Minimum bill for a group booking'),
    ],
    note: 'Packages are priced per person. A room charge or delivery fee is added once; the minimum bill tops up a small group.',
  },
  addons: [
    { id: 'extra_course', label: 'Extra course', unit: 'per_guest' },
    { id: 'cake_cutting', label: 'Cake cutting arranged', unit: 'per_event' },
    { id: 'decor_setup', label: 'Table décor and balloons', unit: 'per_event' },
    { id: 'live_counter', label: 'Live counter', unit: 'per_counter' },
  ],
  resources: { model: 'capacity', title: 'Seating & kitchen capacity', fields: [] },
  requestFields: [q.number('guests', 'Guests', { required: true }), q.single('mode', 'How', ['Table booking', 'Private dining room', 'Party hall', 'Bulk order delivered'])],
  compliance: { conditional: [
    { doc: 'VER-TRADE-FSSAI', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-LIQUOR', flag: 'serves_alcohol', when: { q: 'alcohol', truthy: true } },
  ] },
  quoteTriggers: [
    { id: 'over_capacity', label: 'More guests than the room seats' },
    { id: 'custom_menu', label: 'A menu outside your packages' },
    { id: 'beyond_radius', label: 'Delivery beyond your radius' },
  ],
  quoteTemplate: ['Package × guests', 'Room / hall charge', 'Extra courses', 'Cake and décor', 'Delivery', 'Service charge'],
  readiness: ['FSSAI verified', 'At least one package priced per person', 'Seating or delivery capacity set'],
}
