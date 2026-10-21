// Trade 2 — Beverages, Ice Cream & Cold Storage
//
// ══════════════════════════════════════════════════════════════════════
// THIS WAS "BAR & BEVERAGES"
// ══════════════════════════════════════════════════════════════════════
//
// Renamed and rescoped: drinks, ice cream and the cold chain that keeps
// both of them cold, which is how this service is actually bought at an
// Indian event. The alcohol service option and the liquor-licence path
// are gone with it; what remains needs FSSAI, which is the licence that
// matters for everything on this list.
//
// ── Why the id did not change ─────────────────────────────────────────
//
// `bar_beverages` stays as the id. It is an internal key: it appears in
// 51 places across generated artifacts, the typed tables
// partner_bar_beverages_profiles and _items, the catalogue seed, the
// pictogram sprites and the verification requirements. Renaming it would
// touch every one of them to change nothing a partner or customer sees,
// and the cost of missing one is a trade that silently stops resolving.
// The display name is what people read, and that is what changed.
//
// Checked before rewriting: no partner has data under this trade —
// 0 profiles, 0 items, 0 listing versions, 0 vendor_services. So nothing
// here invalidates work somebody already did.

import { q, screen, catalogue } from './schema'
import { ALLERGEN_OPTIONS } from '../allergens'

export default {
  id: 'bar_beverages',
  serviceNoun: 'beverage, ice cream or cold storage service',
  screens: [
    screen('profile', 'What you supply', 'Drinks, ice cream, cold storage, or all three.', [
      q.text('display_name', 'What name should customers see?', { required: true, max: 60 }),
      q.multi('service_lines', 'Which of these do you provide?', [
        'Beverage counters', 'Mobile beverage bar', 'Tea and coffee service',
        'Juice and soft drinks', 'Mocktails', 'Milkshakes and smoothies',
        'Traditional drinks', 'Packaged water supply',
        'Ice cream counter', 'Softy / soft-serve machine', 'Kulfi cart',
        'Live ice cream station', 'Ice cream tubs and family packs',
        'Falooda and sundae counter',
        'Ice supply', 'Dry ice', 'Freezer unit hire', 'Chiller / cold room hire',
        'Refrigerated vehicle', 'Cold storage at your own facility',
      ], { required: true, other: true }),
      q.single('supply_scope', 'Do you supply the goods, the staff, the equipment, or a combination?', [
        'Goods only', 'Staff only', 'Equipment only', 'Goods, staff and equipment', 'Custom combination',
      ], { required: true }),
      q.textarea('supply_scope_custom', 'Describe your combination', { max: 300, showWhen: { q: 'supply_scope', in: ['custom_combination'] } }),
      q.multi('events', 'Which events do you serve?', ['Weddings', 'Corporate events', 'Private parties', 'Festivals', 'Religious ceremonies', 'Exhibitions'], { required: true, other: true }),
      q.number('guests_per_hour', 'How many guests can you serve per hour?', { required: true, min: 10, max: 5000, suffix: 'guests / hour' }),
    ]),
    screen('setup', 'Counters and equipment', 'What arrives at the venue.', [
      q.number('counters', 'How many counters or stations can you supply?', { min: 0, max: 50, required: true }),
      q.number('staff', 'How many staff can you provide?', { min: 0, max: 200, required: true }),
      q.toggle('glassware_included', 'Are glasses, cups or bowls included?'),
      q.toggle('ice_included', 'Is ice included?'),
      q.toggle('garnish_included', 'Are garnishes or toppings included?'),
      q.toggle('setup_teardown_included', 'Is setup and teardown included?'),
      q.toggle('needs_water_power', 'Is a water supply or power source required at the venue?'),
      /* Cold storage is the part that fails loudly and late, so the
         questions about it are asked rather than assumed. */
      q.toggle('own_cold_storage', 'Do you have your own cold storage facility?'),
      q.number('freezer_capacity_litres', 'Freezer capacity you can bring', { min: 0, max: 100000, suffix: 'litres', showWhen: { q: 'own_cold_storage', truthy: true } }),
      q.toggle('backup_power', 'Do you bring backup power for the cold chain?'),
      q.number('cold_hold_hours', 'How long can you hold goods cold at a venue?', { min: 0, max: 72, suffix: 'hours' }),
    ]),
  ],
  catalogue: catalogue('items', 'What you sell', 'item', 'items', [
    q.text('name', 'Item name', { max: 60, placeholder: 'Leave blank and we will name it from the details below' }),
    q.single('category', 'Category', [
      'Mocktail', 'Juice', 'Soft drink', 'Tea / coffee', 'Milkshake', 'Smoothie',
      'Traditional drink', 'Packaged water',
      'Ice cream scoop', 'Soft serve', 'Kulfi', 'Falooda', 'Sundae', 'Ice cream tub',
      'Ice', 'Dry ice', 'Freezer hire', 'Chiller hire', 'Refrigerated transport',
    ], { required: true, other: true }),
    q.textarea('description', 'Description', { max: 200 }),
    q.text('serving_size', 'Serving or unit size', { required: true, placeholder: 'e.g. 250 ml glass, 100 ml scoop, 10 kg bag', max: 40 }),
    q.money('unit_price', 'Price per serving or unit', { required: true }),
    q.number('min_order', 'Minimum order', { min: 0, max: 100000 }),
    q.multi('allergens', 'Ingredients / allergens', ALLERGEN_OPTIONS, { other: true }),
    q.number('qty_available', 'How many you can supply per event', { min: 1, max: 1000000 }),
    q.number('prep_minutes', 'Preparation or serving time', { min: 0, max: 240, suffix: 'minutes' }),
    q.toggle('staff_equipment_included', 'Staff and equipment included in this price?'),
    q.toggle('needs_freezer', 'Does this item need freezing or chilling at the venue?'),
  ], { requiredWhen: { q: 'supply_scope', in: ['goods_only', 'goods_staff_and_equipment', 'custom_combination'] } }),
  pricing: {
    kinds: ['per_guest', 'per_unit', 'per_staff_hour', 'event', 'rental', 'fixed', 'quote'],
    unitLabels: { per_unit: ['per serving', 'per counter', 'per kg of ice', 'per freezer per day'] },
    fields: [
      q.number('min_guests', 'Minimum guests', { min: 1, max: 100000, required: true }),
      q.number('included_hours', 'Serving hours included', { min: 1, max: 24, required: true }),
      q.toggle('includes_staff_equipment', 'Staff and equipment included in this rate?'),
      q.money('extra_hour_rate', 'Each extra serving hour'),
      q.money('cold_storage_day_rate', 'Cold storage, per day'),
    ],
    note: 'Goods, staffing, equipment and cold storage are always shown to the customer as separate lines.',
  },
  addons: [
    { id: 'delivery', label: 'Delivery', unit: 'per_event' },
    { id: 'setup', label: 'Counter setup', unit: 'per_event' },
    { id: 'extra_staff', label: 'Extra staff member', unit: 'per_hour' },
    { id: 'extra_station', label: 'Extra counter', unit: 'per_event' },
    { id: 'glassware', label: 'Glassware or bowl hire', unit: 'per_guest' },
    { id: 'ice_top_up', label: 'Ice top-up during the event', unit: 'per_event' },
    { id: 'freezer_hire', label: 'Freezer unit on site', unit: 'per_event' },
  ],
  resources: {
    model: 'capacity',
    title: 'How much you can serve',
    fields: [
      q.number('events_per_day', 'Events you can serve on the same day', { min: 1, max: 20, required: true }),
      q.number('max_guests_per_event', 'Most guests at one event', { min: 10, max: 100000, required: true }),
    ],
  },
  compliance: {
    /* FSSAI covers drinks, ice cream and cold storage of food alike. The
       liquor path is gone with the alcohol option. */
    conditional: [{ doc: 'VER-TRADE-FSSAI', always: true, blocksInstant: true }],
    note: 'Anything served or stored for eating needs a valid FSSAI registration before it can be booked instantly.',
  },
  quoteTriggers: [
    { id: 'unpriced_item', label: 'An item the customer wants is not on your list' },
    { id: 'over_capacity', label: 'Guest count above what you can serve' },
    { id: 'cold_chain', label: 'Cold storage needed for longer than you can hold' },
  ],
  quoteTemplate: ['Beverages', 'Ice cream', 'Staff', 'Counters & equipment', 'Ice and cold storage', 'Delivery & setup'],
  readiness: ['Priced list or service scope', 'Enough supply and staff for the guest count', 'FSSAI registration', 'Cold chain confirmed for anything frozen'],
}
