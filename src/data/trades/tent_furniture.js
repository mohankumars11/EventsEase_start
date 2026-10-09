// Trade 27 — Tent & Furniture (spec Part 9, Trade 27)
import { q, screen, catalogue } from './schema'

export default {
  id: 'tent_furniture',
  serviceNoun: 'tent & furniture',
  screens: [
    screen('profile', 'Your tents & furniture', 'What you put up and furnish.', [
      q.multi('groups', 'What do you supply?', [
        'Tents / canopies', 'Tables', 'Chairs', 'Sofas / lounge', 'Stage / platform', 'Dining furniture', 'Counters', 'Partitioning',
      ], { required: true, other: true }),
      q.multi('surfaces', 'Surfaces you can install on', ['Lawn', 'Concrete', 'Sand', 'Terrace', 'Indoor hall'], { required: true }),
      q.toggle('weatherproof', 'Weather-proof tents available'),
      q.money('deposit', 'Security deposit (refundable)'),
      q.textarea('damage_policy', 'Damage policy', { required: true, max: 400 }),
    ]),
  ],
  catalogue: catalogue('items', 'Your items', 'item', 'items', [
    q.single('group', 'Type', ['Tent / canopy', 'Table', 'Chair', 'Sofa / lounge', 'Stage / platform', 'Dining set', 'Counter', 'Partition'], { required: true, other: true }),
    q.text('name', 'Name', { required: true, max: 60 }),
    q.dimensions('size', 'Dimensions', { unit: 'ft' }),
    q.number('capacity', 'Seats / people covered', { min: 0, max: 10000 }),
    q.text('material', 'Material', { max: 40 }),
    q.number('quantity', 'Quantity', { required: true, min: 1, max: 100000 }),
    q.single('condition', 'Condition', ['New', 'Excellent', 'Good'], { required: true }),
    q.money('rate', 'Rental rate', { required: true }),
    q.single('rate_period', 'Per', ['Day', 'Event'], { required: true }),
    q.number('assembly_minutes', 'Assembly time', { min: 0, max: 2880, suffix: 'minutes' }),
    q.photos('photos', 'Photo', { min: 1, max: 4 }),
  ]),
  pricing: {
    kinds: ['rental', 'fixed', 'quote'],
    unitLabels: { fixed: ['setup package', 'complete setup'] },
    fields: [
      q.money('transport_fee', 'Transport', { required: true }),
      q.money('installation_fee', 'Installation'),
      q.money('dismantling_fee', 'Dismantling'),
      q.money('extra_day', 'Each extra rental day (% of item rate applies if empty)'),
    ],
    packages: { label: 'Setup packages (e.g. "200-guest shamiana")', fields: ['guests', 'items'] },
    note: 'Transport, installation, dismantling, extra days, deposit and damage are separate lines. Deposits are never revenue.',
  },
  addons: [{ id: 'flooring', label: 'Flooring / carpet', unit: 'per_item' }, { id: 'side_walls', label: 'Side walls', unit: 'per_item' }],
  resources: { model: 'items', title: 'Stock & install crew', fields: [q.number('crew', 'Install crew available', { required: true, min: 1, max: 1000 })] },
  requestFields: [
    q.text('venue', 'Venue'), q.single('surface', 'Surface', ['Lawn', 'Concrete', 'Sand', 'Terrace', 'Indoor hall']),
    q.single('setting', 'Indoor / outdoor', ['Indoor', 'Outdoor']), q.number('coverage_sqft', 'Area to cover', { suffix: 'sq ft' }),
    q.number('guests', 'Guests'), q.time('install_by', 'Ready by'), q.time('remove_after', 'Remove after'),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'over_stock', label: 'More than your stock' }, { id: 'site_visit', label: 'Site inspection needed' }],
  quoteTemplate: ['Items × days', 'Transport', 'Installation', 'Dismantling', 'Deposit (refundable)'],
  readiness: ['Items listed with quantities', 'Transport set', 'Stock free for the whole period'],
}
