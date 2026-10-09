// Trade 29 — Trousseau & Gift Packing (spec Part 9, Trade 29)
import { q, screen, catalogue } from './schema'

export default {
  id: 'trousseau_gift_packing',
  serviceNoun: 'packing service',
  screens: [
    screen('profile', 'Your packing work', 'What you pack and how.', [
      q.multi('types', 'What do you pack?', [
        'Wedding trousseau', 'Gift boxes', 'Return favours', 'Hampers', 'Jewellery packaging', 'Premium decorative packing', 'Corporate gifts',
      ], { required: true, other: true }),
      q.multi('materials', 'Materials you use', ['Rigid boxes', 'Baskets / trays', 'Fabric wraps', 'Acrylic', 'Wood', 'Eco / paper'], { required: true, other: true }),
      q.multi('customisation', 'Customisation', ['Ribbons', 'Name tags', 'Monogram', 'Theme colours', 'Fresh flowers'], { other: true }),
      q.toggle('customer_materials', 'You pack customer-supplied items'),
      q.toggle('proof', 'You share a sample / photo proof before the full order'),
      q.multi('handover', 'Pickup / delivery', ['We pick up items', 'We deliver packed sets', 'Customer drops and collects'], { required: true }),
    ]),
  ],
  catalogue: catalogue('products', 'Your packing options', 'option', 'options', [
    q.text('name', 'Name', { required: true, max: 60 }),
    q.single('type', 'Type', ['Saree tray', 'Jewellery box', 'Hamper', 'Gift box', 'Favour pouch', 'Trunk / suitcase'], { required: true, other: true }),
    q.dimensions('size', 'Dimensions', { unit: 'in' }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Per', ['Item', 'Box', 'Set'], { required: true }),
    q.toggle('materials_included', 'Box / materials included in price'),
    q.photos('photos', 'Photo', { min: 1, max: 4 }),
  ]),
  pricing: {
    kinds: ['catalogue', 'per_unit', 'fixed', 'quote'],
    fields: [q.money('design_fee', 'Design / theme fee'), q.money('labour_per_item', 'Labour when the customer supplies boxes')],
    tiers: { label: 'Bulk discounts', basis: 'quantity' },
  },
  addons: [{ id: 'tags', label: 'Printed name tags', unit: 'per_piece' }, { id: 'flowers', label: 'Fresh flower accents', unit: 'per_set' }, { id: 'delivery', label: 'Delivery', unit: 'per_trip' }],
  resources: { model: 'production', title: 'Production capacity', fields: [
    q.number('sets_per_day', 'Sets you can finish per day', { required: true, min: 1, max: 5000 }),
    q.number('lead_days', 'Lead time', { required: true, min: 0, max: 90, suffix: 'days' }),
    q.number('max_orders', 'Orders in progress at once', { required: true, min: 1, max: 100 }),
  ] },
  requestFields: [q.number('sets', 'Sets / gifts'), q.text('theme', 'Theme'), q.date('complete_by', 'Needed by')],
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'custom_design', label: 'Custom design' }, { id: 'over_capacity', label: 'Order larger than capacity before the date' }],
  quoteTemplate: ['Packing sets', 'Materials', 'Customisation', 'Design fee', 'Delivery'],
  readiness: ['Options priced', 'Daily capacity and lead time set'],
}
