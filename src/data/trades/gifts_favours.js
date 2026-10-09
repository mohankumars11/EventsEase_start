// Trade 12 — Gifts & Favours (spec Part 9, Trade 12)
import { q, screen, catalogue } from './schema'

export default {
  id: 'gifts_favours',
  serviceNoun: 'gifts and favours',
  screens: [
    screen('profile', 'Your gifts & favours', 'What you make and how much notice you need.', [
      q.multi('gift_types', 'What types of gifts or favours do you offer?', [
        'Guest favours', 'Welcome gifts', 'Return gifts', 'Corporate gifts', 'Gift hampers', 'Personalized items',
      ], { required: true, other: true }),
      q.toggle('packaging_personalisation', 'Can customers choose packaging and personalization?'),
      q.number('min_order', 'What is the minimum order quantity?', { required: true, min: 1, max: 100000 }),
      q.number('prep_days', 'How much time do you need to prepare an order?', { required: true, min: 0, max: 90, suffix: 'days' }),
    ]),
  ],
  catalogue: catalogue('products', 'Your gift products', 'product', 'products', [
    q.text('name', 'Name', { required: true, max: 60 }),
    q.text('material', 'Material', { max: 40 }),
    q.dimensions('dimensions', 'Dimensions', { unit: 'cm' }),
    q.money('unit_price', 'Price', { required: true }),
    q.single('unit', 'Per', ['Item', 'Pack', 'Hamper', 'Set'], { required: true }),
    q.text('quantity_tiers', 'Quantity tiers', { placeholder: 'e.g. 100+: ₹180', max: 120 }),
    q.text('packaging', 'Packaging', { max: 60 }),
    q.toggle('personalisation', 'Personalisation available'),
    q.money('personalisation_fee', 'Personalisation per item', { showWhen: { q: 'personalisation', truthy: true } }),
    q.toggle('proof_required', 'Proof approval before production'),
    q.number('stock', 'In stock (0 if made to order)', { min: 0, max: 1000000 }),
    q.number('lead_days', 'Lead time', { required: true, min: 0, max: 90, suffix: 'days' }),
    q.photos('photos', 'Photos', { min: 1, max: 4 }),
  ]),
  pricing: { kinds: ['catalogue', 'quote'], note: 'Customisation, print, packaging and delivery are separate lines unless the product says included.' },
  addons: [
    { id: 'gift_wrap', label: 'Premium gift wrap', unit: 'per_item' },
    { id: 'delivery', label: 'Delivery', unit: 'per_trip' },
    { id: 'tag_card', label: 'Tag / message card', unit: 'per_item' },
  ],
  resources: { model: 'production', title: 'Production', fields: [
    q.number('units_per_day', 'Units you can produce per day', { required: true, min: 1, max: 100000 }),
    q.multi('fulfilment', 'Pickup / delivery', ['We deliver', 'Customer collects'], { required: true }),
    q.textarea('fragile_handling', 'Fragile-item handling', { max: 200 }),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'custom_manufacturing', label: 'Custom manufacturing' }, { id: 'lead_time', label: 'Requested date sooner than your lead time' }],
  quoteTemplate: ['Gifts', 'Personalisation', 'Packaging', 'Delivery'],
  readiness: ['Products priced', 'Lead time and batch capacity meet the date'],
}
