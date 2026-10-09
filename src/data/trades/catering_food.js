// Trade 5 — Catering & Food (spec Part 9, Trade 5). Rebuilt on the shared engine.
import { q, screen, catalogue } from './schema'

export default {
  id: 'catering_food',
  serviceNoun: 'catering service',
  screens: [
    screen('profile', 'Your catering', 'What you cook and how you serve.', [
      q.multi('food_service', 'What types of food service do you provide?', [
        'Vegetarian', 'Non-vegetarian', 'Vegan', 'Regional cuisine', 'Multi-cuisine',
        'Buffet', 'Plated meal', 'Packed meals', 'Live food counters',
      ], { required: true, other: true }),
      q.number('max_guests', 'How many guests can you serve at one event?', { required: true, min: 10, max: 100000 }),
      q.number('min_guests', 'What is your minimum order or guest count?', { required: true, min: 1, max: 10000 }),
      q.multi('provides', 'Do you provide staff, crockery, serving equipment and setup?', [
        'Serving staff', 'Crockery', 'Serving equipment', 'Setup', 'Cleanup',
      ]),
      q.single('prep_location', 'Can you prepare food at the venue, off-site, or both?', ['At the venue', 'Off-site', 'Both'], { required: true }),
    ]),
    screen('service', 'Service configuration', 'How an event runs.', [
      q.multi('meal_types', 'Meal types', ['Breakfast', 'Lunch', 'Hi-tea', 'Dinner', 'Snacks'], { required: true }),
      q.number('service_hours', 'Service hours included', { required: true, min: 1, max: 24, suffix: 'hours' }),
      q.number('counters', 'Food counters you can run', { min: 0, max: 50 }),
      q.multi('live_counters', 'Live counter options', ['Dosa', 'Chaat', 'Pasta', 'Tandoor', 'Barbecue', 'Desserts'], { other: true, showWhen: { q: 'food_service', includes: 'live_food_counters' } }),
      q.number('staff_per_100', 'Serving staff per 100 guests', { min: 0, max: 50 }),
      q.textarea('kitchen_needs', 'Kitchen equipment needed at the venue', { max: 200 }),
      q.toggle('needs_power_water', 'Power / water needed at the venue'),
      q.single('cleanup', 'Serving and cleanup', ['We serve and clean up', 'We serve, venue cleans', 'Drop-off only'], { required: true }),
      q.number('setup_minutes', 'Setup and dismantling window', { min: 0, max: 600, suffix: 'minutes' }),
    ]),
  ],
  catalogue: catalogue('menu', 'Menus & dishes', 'dish', 'dishes', [
    q.text('name', 'Dish or menu name', { required: true, max: 80 }),
    q.single('meal_category', 'Category', ['Welcome drink', 'Starter', 'Main course', 'Bread', 'Rice', 'Dessert', 'Live counter', 'Full menu'], { required: true }),
    q.textarea('description', 'Description', { max: 200 }),
    q.single('diet', 'Dietary class', ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Jain'], { required: true }),
    q.text('serving_size', 'Serving size', { max: 40 }),
    q.text('allergens', 'Ingredients / allergens', { max: 160 }),
    q.single('pricing', 'How it is priced', ['Included in a menu', 'Per person', 'Per counter'], { required: true }),
    q.money('price', 'Price', { showWhen: { q: 'pricing', in: ['per_person', 'per_counter'] } }),
    q.number('min_qty', 'Minimum quantity', { min: 0, max: 100000 }),
  ], { dishRegistry: true }),
  pricing: {
    kinds: ['per_guest', 'per_unit', 'fixed', 'per_staff_hour', 'quote'],
    unitLabels: { per_unit: ['per live counter'] },
    fields: [
      q.number('min_billable_guests', 'Minimum billable guest count', { required: true, min: 1, max: 10000 }),
      q.text('guest_bands', 'Rate by guest count', { placeholder: 'e.g. 100–199: ₹450, 200+: ₹420', max: 160 }),
    ],
    note: 'Food subtotal = confirmed guests × menu rate; counters, staff, equipment and delivery are added as separate lines. The minimum guest count is shown before payment.',
  },
  addons: [
    { id: 'live_counter', label: 'Live counter', unit: 'per_counter' },
    { id: 'extra_staff', label: 'Extra serving staff', unit: 'per_staff' },
    { id: 'crockery', label: 'Premium crockery', unit: 'per_guest' },
    { id: 'delivery', label: 'Delivery', unit: 'per_trip' },
  ],
  resources: {
    model: 'capacity',
    title: 'Kitchen capacity',
    fields: [
      q.number('events_per_day', 'Events you can cater on the same day', { required: true, min: 1, max: 20 }),
      q.number('guests_per_day', 'Total guests you can cook for in a day', { required: true, min: 10, max: 100000 }),
    ],
  },
  compliance: { conditional: [{ doc: 'VER-TRADE-FSSAI', always: true, blocksInstant: true }] },
  quoteTriggers: [
    { id: 'menu_customisation', label: 'Major menu customisation' },
    { id: 'special_diet', label: 'A special diet you have not priced' },
    { id: 'capacity_overflow', label: 'More guests than your capacity' },
    { id: 'venue_facilities', label: 'Venue kitchen / facilities not confirmed' },
  ],
  quoteTemplate: ['Food (per guest)', 'Live counters', 'Serving staff', 'Equipment & crockery', 'Delivery & setup'],
  readiness: ['Menu priced', 'Guest count within capacity', 'Service window set', 'FSSAI verified'],
}
