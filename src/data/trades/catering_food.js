// Trade 5 — Catering & Food. Its onboarding is the dedicated 13-stage
// catering flow (src/components/vendor/listing/catering): food catalogue →
// menus → live counters → packages. The screens below describe the answers
// that flow stores, so the validator, admin review and the server's
// required-answer check (sambramo_trade_registry.required_answers) speak the
// same language. Prices live on menus / counters / packages / dishes, not here.
import { q, screen } from './schema'

export default {
  id: 'catering_food',
  serviceNoun: 'catering service',
  customFlow: 'catering',
  screens: [
    screen('profile', 'Business & service profile', 'What you cook and how you serve.', [
      q.multi('services', 'What catering services do you provide?', [
        'Wedding catering', 'Corporate catering', 'Home functions', 'Birthday parties', 'Religious ceremonies', 'Traditional wedding meals',
        'Breakfast catering', 'Lunch or dinner catering', 'Buffet catering', 'Plated meals', 'Packed meals', 'Live food counters',
        'Dessert catering', 'Beverage catering', 'Institutional or bulk catering',
      ], { required: true, other: true }),
      q.single('prep_location', 'Where is your food prepared?', ['At my kitchen or catering facility', "At the customer's venue", 'At both locations'], { required: true }),
      q.multi('service_styles', 'How do you serve food?', ['Buffet', 'Traditional banana-leaf meal', 'Seated / plated service', 'Family-style serving',
        'Packed meals', 'Food counters', 'Live cooking', 'Mixed service styles'], { required: true, other: true }),
      q.single('service_area', 'Where can you provide catering?', ['Within 10 km', 'Within 25 km', 'Within 50 km', 'Within 100 km', 'Throughout Karnataka', 'Across India', 'Custom service area']),
    ]),
    screen('capacity', 'Guest capacity & service', null, [
      q.number('max_guests', 'Most guests at one event', { required: true, min: 10, max: 100000 }),
      q.number('guests_per_day', 'Total guests you can cook for in a day', { required: true, min: 10, max: 100000 }),
      q.number('events_per_day', 'Events you can cater on the same day', { required: true, min: 1, max: 20 }),
      q.number('staff', 'Serving staff available', { required: true, min: 1, max: 2000 }),
      q.number('staff_per_100', 'Serving staff per 100 guests', { min: 0, max: 50 }),
      q.number('service_hours', 'Service hours included per event', { min: 1, max: 24, suffix: 'hours' }),
    ]),
    screen('pricing_rules', 'Pricing & minimum orders', null, [
      q.number('min_billable_guests', 'Minimum billable guests', { required: true, min: 1, max: 10000 }),
      q.single('child_policy', 'Children', [{ id: 'same', label: 'Same price as adults' }, { id: 'per_menu', label: 'Set a child price on each menu' }], { required: true }),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['per_guest', 'fixed', 'per_unit', 'quote'],
    note: 'Menus (per guest or fixed), live counters (own model) and catering packages carry the prices. Included dishes, counters and extras are never charged twice.',
  },
  addons: [
    { id: 'extra_staff', label: 'Additional serving staff', unit: 'per_staff_hour' },
    { id: 'crockery', label: 'Crockery and cutlery', unit: 'per_guest' },
    { id: 'buffet_setup', label: 'Table and buffet setup', unit: 'per_event' },
    { id: 'transport', label: 'Food transport', unit: 'per_trip' },
  ],
  resources: { model: 'capacity', title: 'Kitchen, staff & counters', fields: [] },
  compliance: { conditional: [{ doc: 'VER-TRADE-FSSAI', always: true, blocksInstant: true }] },
  quoteTriggers: [
    { id: 'menu_customisation', label: 'Major menu customisation' },
    { id: 'special_diet', label: 'A special diet you have not declared' },
    { id: 'capacity_overflow', label: 'More guests than your capacity' },
    { id: 'venue_facilities', label: 'Venue kitchen / facilities not confirmed' },
  ],
  quoteTemplate: ['Food (per guest)', 'Menu / package', 'Live counters', 'Additional dishes', 'Serving staff', 'Equipment & crockery', 'Setup & teardown', 'Delivery'],
  readiness: ['A priced menu', 'Guest count within capacity', 'Preparation deadlines set', 'FSSAI verified'],
}
