// Trade 11 — Event Materials Supplier (spec Part 9, Trade 11)
import { q, screen, catalogue } from './schema'

export default {
  id: 'event_materials_supplier',
  serviceNoun: 'event materials supply',
  screens: [
    screen('profile', 'What you supply', 'Pick everything you sell for events.', [
      q.multi('supplies', 'What supplies do you sell or supply for events?', [
        'Disposable serving items', 'Decorations', 'Event consumables', 'Signage materials',
        'Packaging', 'Table accessories', 'Gift materials',
      ], { required: true, other: true }),
      q.multi('fulfilment', 'How customers receive orders', ['Delivery', 'Pickup'], { required: true }),
      q.number('prep_hours', 'Order preparation time', { required: true, min: 0, max: 720, suffix: 'hours' }),
    ]),
  ],
  catalogue: catalogue('products', 'Your products', 'product', 'products', [
    q.text('sku', 'SKU', { max: 30 }),
    q.text('name', 'Name', { required: true, max: 60 }),
    q.textarea('description', 'Description', { max: 200 }),
    q.photos('photos', 'Photo', { min: 1, max: 4 }),
    q.single('unit', 'Unit of sale', ['Piece', 'Pack', 'Box', 'Set', 'Kg', 'Metre', 'Roll'], { required: true, other: true }),
    q.money('unit_price', 'Unit price', { required: true }),
    q.number('stock', 'Available stock', { required: true, min: 0, max: 10000000 }),
    q.number('min_order', 'Minimum order', { min: 1, max: 1000000 }),
    q.text('quantity_breaks', 'Quantity breaks', { placeholder: 'e.g. 500+: ₹8, 1000+: ₹7', max: 120 }),
    q.toggle('customisable', 'Can be customised / branded'),
    q.number('lead_days', 'Lead time', { min: 0, max: 90, suffix: 'days' }),
    q.text('return_conditions', 'Return conditions', { max: 120 }),
  ]),
  pricing: {
    kinds: ['catalogue'],
    note: 'Subtotal = unit price × quantity, with your quantity breaks; delivery and other charges are separate lines. An item is never treated as in stock just because it is listed.',
  },
  addons: [
    { id: 'delivery', label: 'Delivery', unit: 'per_trip' },
    { id: 'branding', label: 'Branding / customisation', unit: 'per_item' },
    { id: 'rush', label: 'Rush order', unit: 'per_event' },
  ],
  resources: { model: 'items', title: 'Stock & delivery', fields: [
    q.number('delivery_radius_km', 'Delivery area', { min: 0, max: 500, suffix: 'km' }),
    q.multi('slots', 'Pickup / delivery slots', ['Morning', 'Afternoon', 'Evening'], { required: true }),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'custom_branded', label: 'Custom-branded or made-to-order items (proof needed)' },
    { id: 'over_stock', label: 'More than your available stock' },
  ],
  quoteTemplate: ['Products', 'Customisation', 'Delivery', 'Rush'],
  readiness: ['Products priced with stock', 'Lead time and delivery slot met'],
}
