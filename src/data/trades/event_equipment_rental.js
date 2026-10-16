// Trade 9 — Event Equipment Rental (spec Part 9, Trade 9)
import { q, screen, catalogue } from './schema'

export default {
  id: 'event_equipment_rental',
  serviceNoun: 'equipment rental',
  screens: [
    screen('profile', 'What you rent out', 'Pick every type you have.', [
      q.multi('equipment_types', 'Which equipment types are available?', [
        'Tables / chairs', 'Staging', 'Audio equipment', 'Lighting', 'Screens / projectors',
        'Power equipment', 'Cooling equipment', 'Decorative equipment',
      ], { required: true, other: true }),
    ]),
    screen('terms', 'Rental terms', 'The rules every rental follows.', [
      q.single('min_period', 'Minimum rental period', ['4 hours', '1 day', '2 days', '1 week'], { required: true }),
      q.single('max_period', 'Maximum rental period', ['1 day', '3 days', '1 week', '1 month', 'No limit']),
      q.multi('handover', 'Delivery / pickup options', ['We deliver and collect', 'Customer collects', 'Customer returns'], { required: true }),
      q.toggle('setup_offered', 'You offer setup and dismantling'),
      q.money('deposit', 'Security deposit (refundable)'),
      q.textarea('damage_policy', 'Damage / loss policy', { required: true, max: 400 }),
      q.money('late_fee', 'Late-return charge per day'),
      q.money('cleaning_fee', 'Cleaning fee'),
    ]),
  ],
  catalogue: catalogue('items', 'Your rental items', 'item', 'items', [
    q.text('name', 'Item name', { required: true, max: 60 }),
    q.text('sku', 'SKU / code', { max: 30 }),
    q.textarea('description', 'Description', { max: 200 }),
    q.photos('photos', 'Photo', { min: 1, max: 4 }),
    q.number('total_qty', 'Total quantity', { required: true, min: 1, max: 100000 }),
    q.single('condition', 'Condition', ['New', 'Excellent', 'Good', 'Fair'], { required: true }),
    q.money('rate', 'Rental rate', { required: true }),
    q.single('rate_period', 'Per', ['Hour', 'Day', 'Event'], { required: true }),
    q.money('replacement_value', 'Replacement value'),
    q.text('delivery_restrictions', 'Delivery restrictions', { max: 100 }),
    q.toggle('needs_operator', 'Needs an operator / installer'),
  ]),
  pricing: {
    kinds: ['rental', 'fixed'],
    note: 'Rental = item rate × quantity × rental periods. Delivery, installation and other fees are separate lines; refundable deposits are never counted as revenue.',
  },
  addons: [
    { id: 'delivery', label: 'Delivery & collection', unit: 'per_trip' },
    { id: 'installation', label: 'Installation', unit: 'per_event' },
    { id: 'operator', label: 'Operator', unit: 'per_hour' },
  ],
  resources: { model: 'items', title: 'Stock is tracked per item', fields: [] },
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'unlisted_item', label: 'An item you do not list' },
    { id: 'over_stock', label: 'More than your available stock' },
  ],
  quoteTemplate: ['Rental items', 'Delivery & collection', 'Installation', 'Operator', 'Deposit (refundable)'],
  readiness: ['Every item priced with quantity', 'Stock free for the whole rental period'],
}
