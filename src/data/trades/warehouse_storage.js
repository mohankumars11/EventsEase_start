// Trade 33 — Warehouse / Storage (spec Part 9, Trade 33)
import { q, screen } from './schema'

export default {
  id: 'warehouse_storage',
  serviceNoun: 'storage',
  screens: [
    screen('profile', 'What you store', 'Anything outside these is reviewed by hand.', [
      q.multi('item_types', 'Item types accepted', ['Event equipment', 'Furniture', 'Decor', 'Cartons', 'Pallets', 'Exhibition stands', 'Vehicles'], { required: true }),
      q.textarea('custom_category', 'Another category (reviewed before it is shown)'),
      q.multi('storage_kind', 'Storage', ['Indoor', 'Covered', 'Open yard'], { required: true }),
      q.toggle('climate', 'Climate-controlled area'),
      q.toggle('hazardous_excluded', 'Hazardous goods are refused', { required: true }),
      q.text('smallest', 'Smallest item accepted', { max: 40 }),
      q.text('largest', 'Largest item accepted', { max: 40 }),
    ]),
    screen('facility', 'Your facility', null, [
      q.number('area_sqft', 'Usable area', { required: true, min: 50, max: 2000000, suffix: 'sq ft' }),
      q.number('pallet_positions', 'Pallet positions', { min: 0, max: 100000 }),
      q.number('available_sqft', 'Area available to Sambramo customers', { required: true, min: 10, max: 2000000, suffix: 'sq ft' }),
      q.text('access_hours', 'Access hours', { required: true, max: 40 }),
      q.multi('security', 'Security', ['24×7 guard', 'CCTV', 'Fire system', 'Insurance'], { required: true }),
      q.multi('equipment', 'Loading equipment', ['Forklift', 'Pallet jack', 'Loading dock', 'Ramp'], { other: true }),
      q.toggle('inspection', 'Inbound inspection & photo log'),
      q.single('min_period', 'Minimum storage period', ['1 day', '1 week', '1 month'], { required: true }),
      q.single('max_period', 'Maximum storage period', ['1 month', '3 months', '1 year', 'No limit']),
      q.toggle('collection', 'You collect and deliver'),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['capacity_period', 'per_unit', 'fixed', 'quote'],
    unitLabels: { capacity_period: ['per item per day', 'per pallet per day', 'per sq ft per month', 'per cubic ft per month'], fixed: ['per month / period'] },
    fields: [
      q.money('handling_in', 'Handling in'), q.money('handling_out', 'Handling out'),
      q.money('loading_fee', 'Loading / unloading'), q.money('transport_fee', 'Collection / delivery', { showWhen: { q: 'collection', truthy: true } }),
      q.single('rounding', 'Partial periods are charged as', ['Whole day', 'Whole week', 'Whole month'], { required: true }),
    ],
  },
  addons: [{ id: 'packing', label: 'Packing & wrapping', unit: 'per_item' }, { id: 'insurance', label: 'Goods insurance', unit: 'per_item' }],
  resources: { model: 'capacity', title: 'Capacity over time', fields: [] },
  requestFields: [q.text('items', 'What is being stored'), q.number('quantity', 'Quantity'), q.date('from', 'From'), q.date('to', 'Until')],
  compliance: { conditional: [] },
  rules: { reviewWhen: { q: 'custom_category', truthy: true } },
  quoteTriggers: [{ id: 'over_capacity', label: 'More than the available capacity' }, { id: 'custom_category', label: 'Item category not listed' }],
  quoteTemplate: ['Storage × period', 'Handling in / out', 'Loading', 'Collection / delivery', 'Insurance'],
  readiness: ['Capacity and minimum period set', 'Capacity reserved for the whole period'],
}
