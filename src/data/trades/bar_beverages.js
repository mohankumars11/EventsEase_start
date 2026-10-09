// Trade 2 — Bar & Beverages (spec Part 9, Trade 2)
import { q, screen, catalogue, EVENT_TYPES } from './schema'

const ALCOHOL = 'alcoholic_beverage_service_if_legally_permitted'

export default {
  id: 'bar_beverages',
  serviceNoun: 'bar or beverage service',
  screens: [
    screen('profile', 'Your bar & beverage service', 'What you serve and how much you can handle.', [
      q.text('display_name', 'What name should customers see for your bar or beverage service?', { required: true, max: 60 }),
      q.multi('beverage_types', 'What types of beverages do you provide?', [
        'Non-alcoholic beverages', 'Mocktails', 'Tea and coffee', 'Juice and soft drinks',
        'Alcoholic beverage service, if legally permitted', 'Mobile bar', 'Beverage counters',
      ], { required: true, other: true }),
      q.single('supply_scope', 'Do you supply drinks, serving staff, bar equipment, or a combination?', [
        'Drinks only', 'Staff only', 'Equipment only', 'Drinks, staff and equipment', 'Custom combination',
      ], { required: true }),
      q.textarea('supply_scope_custom', 'Describe your combination', { max: 300, showWhen: { q: 'supply_scope', in: ['custom_combination'] } }),
      q.multi('events', 'Which events do you serve?', ['Weddings', 'Corporate events', 'Private parties', 'Festivals'], { required: true, other: true }),
      q.number('guests_per_hour', 'How many guests can you serve per hour?', { required: true, min: 10, max: 5000, suffix: 'guests / hour' }),
    ]),
    screen('bar_setup', 'Bar configuration', 'What comes with your bar.', [
      q.toggle('mobile_bar', 'Do you provide a mobile bar counter?'),
      q.number('bar_stations', 'How many bar stations can you supply?', { min: 0, max: 50, required: true }),
      q.number('bartenders', 'How many bartenders can you provide?', { min: 0, max: 200, required: true }),
      q.toggle('glassware_included', 'Is glassware included?'),
      q.toggle('ice_included', 'Is ice included?'),
      q.toggle('garnish_included', 'Is garnish included?'),
      q.toggle('setup_teardown_included', 'Is setup and teardown included?'),
      q.toggle('needs_water_power', 'Is a water supply or power source required at the venue?'),
    ]),
  ],
  catalogue: catalogue('beverages', 'Your beverage menu', 'beverage', 'beverages', [
    q.text('name', 'Beverage name', { required: true, max: 60 }),
    q.single('category', 'Category', ['Mocktail', 'Cocktail', 'Tea / coffee', 'Juice', 'Soft drink', 'Spirits', 'Beer / wine', 'Water'], { required: true, other: true }),
    q.textarea('description', 'Description', { max: 200 }),
    q.text('serving_size', 'Serving size', { required: true, placeholder: 'e.g. 250 ml glass', max: 40 }),
    q.money('unit_price', 'Price per serving', { required: true }),
    q.number('min_order', 'Minimum order (servings)', { min: 0, max: 100000 }),
    q.text('allergens', 'Ingredients / allergens', { max: 160 }),
    q.number('qty_available', 'Servings you can supply per event', { min: 1, max: 1000000 }),
    q.number('prep_minutes', 'Preparation / serving time (minutes)', { min: 0, max: 240 }),
    q.toggle('staff_equipment_included', 'Staff and equipment included in this price?'),
  ], { requiredWhen: { q: 'supply_scope', in: ['drinks_only', 'drinks_staff_and_equipment', 'custom_combination'] } }),
  pricing: {
    kinds: ['per_guest', 'per_unit', 'per_staff_hour', 'event', 'fixed', 'quote'],
    unitLabels: { per_unit: ['per serving', 'per beverage station'] },
    fields: [
      q.number('min_guests', 'Minimum guests', { min: 1, max: 100000, required: true }),
      q.number('included_hours', 'Serving hours included', { min: 1, max: 24, required: true }),
      q.toggle('includes_staff_equipment', 'Staff and equipment included in this rate?'),
      q.money('extra_hour_rate', 'Each extra serving hour'),
    ],
    note: 'Beverage supply, staffing and equipment are always shown to the customer as separate lines.',
  },
  addons: [
    { id: 'delivery', label: 'Delivery', unit: 'per_event' },
    { id: 'setup', label: 'Bar setup', unit: 'per_event' },
    { id: 'extra_bartender', label: 'Extra bartender', unit: 'per_hour' },
    { id: 'extra_station', label: 'Extra beverage station', unit: 'per_event' },
    { id: 'glassware', label: 'Glassware hire', unit: 'per_guest' },
  ],
  resources: {
    model: 'capacity',
    title: 'How much can you serve',
    fields: [
      q.number('events_per_day', 'Events you can serve on the same day', { min: 1, max: 20, required: true }),
      q.number('max_guests_per_event', 'Most guests at one event', { min: 10, max: 100000, required: true }),
    ],
  },
  compliance: {
    conditional: [{ doc: 'VER-TRADE-FSSAI', always: true, blocksInstant: true }, { doc: 'VER-TRADE-LIQUOR', flag: 'serves_alcohol', when: { q: 'beverage_types', includes: ALCOHOL }, blocksInstant: true }],
    note: 'Alcohol service needs the licences your state requires before it can be booked instantly.',
  },
  quoteTriggers: [
    { id: 'unpriced_beverage', label: 'A beverage the customer wants is not on your menu' },
    { id: 'over_capacity', label: 'Guest count above what you can serve' },
    { id: 'venue_licensing', label: 'Venue or licensing conditions are not settled' },
  ],
  quoteTemplate: ['Beverage supply', 'Bartenders', 'Bar equipment & glassware', 'Delivery & setup', 'Licensing / permits'],
  readiness: ['Priced menu or service scope', 'Enough supply and staff for the guest count', 'Alcohol approvals, when serving alcohol', 'Confirmed availability'],
}
