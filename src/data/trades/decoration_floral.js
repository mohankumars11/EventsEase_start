// Trade 7 — Decoration & Floral (spec Part 9, Trade 7)
import { q, screen, catalogue } from './schema'

export default {
  id: 'decoration_floral',
  serviceNoun: 'decoration service',
  screens: [
    screen('profile', 'Your decoration work', 'What you decorate and how.', [
      q.multi('services', 'What decoration services do you provide?', [
        'Stage decoration', 'Floral decoration', 'Mandap', 'Entrance', 'Table styling', 'Backdrop', 'Centrepieces', 'Complete venue decoration',
      ], { required: true, other: true }),
      q.multi('themes', 'Which themes and styles do you offer?', [
        'Traditional', 'Royal', 'Pastel', 'Boho', 'Minimal', 'Floral-heavy', 'Rustic', 'Contemporary',
      ], { required: true, other: true }),
      q.single('flowers', 'Do you use fresh flowers, artificial flowers or both?', ['Fresh', 'Artificial', 'Both'], { required: true }),
      q.toggle('custom_designs', 'Do you offer custom designs?'),
      q.toggle('setup_dismantle', 'Do you handle setup and dismantling?'),
    ]),
  ],
  catalogue: catalogue('packages', 'Your decoration packages', 'package', 'packages', [
    q.text('name', 'Package name', { required: true, max: 60 }),
    q.multi('areas', 'Areas included', ['Stage', 'Mandap', 'Entrance', 'Tables', 'Backdrop', 'Photo booth', 'Pathway', 'Ceiling'], { required: true, other: true }),
    q.textarea('items', 'Items included', { required: true, max: 400 }),
    q.single('flowers', 'Flowers', ['Fresh', 'Artificial', 'Mixed', 'None'], { required: true }),
    q.dimensions('stage_size', 'Stage size covered', { unit: 'ft' }),
    q.number('guest_capacity', 'Suits up to', { min: 10, max: 100000, suffix: 'guests' }),
    q.money('price', 'Package price', { required: true }),
    q.number('setup_hours', 'Setup time', { required: true, min: 1, max: 72, suffix: 'hours' }),
    q.photos('photos', 'Photos of this setup', { min: 1, max: 6 }),
  ]),
  pricing: {
    kinds: ['fixed', 'per_unit', 'quote'],
    unitLabels: { per_unit: ['per sq ft', 'per item', 'per setup'] },
    fields: [
      q.money('design_fee', 'Base design fee'),
      q.money('labour_fee', 'Labour'),
      q.money('transport_fee', 'Transportation'),
      q.money('dismantle_fee', 'Dismantling'),
      q.money('customisation_fee', 'Customisation'),
    ],
    note: 'Every package states exactly which areas, items and materials it includes.',
  },
  addons: [
    { id: 'extra_centrepiece', label: 'Extra centrepiece', unit: 'per_item' },
    { id: 'lighting', label: 'Decor lighting', unit: 'per_event' },
    { id: 'photo_booth', label: 'Photo booth', unit: 'per_event' },
    { id: 'fresh_upgrade', label: 'Upgrade to fresh flowers', unit: 'per_event' },
  ],
  resources: {
    model: 'staff',
    title: 'Crew & schedule',
    fields: [
      q.number('concurrent_setups', 'Setups you can run at the same time', { required: true, min: 1, max: 20 }),
      q.number('crew_size', 'Installation crew size', { required: true, min: 1, max: 200 }),
      q.number('procurement_days', 'Material procurement lead time', { min: 0, max: 60, suffix: 'days' }),
      q.number('dismantle_hours', 'Dismantling time', { min: 0, max: 48, suffix: 'hours' }),
    ],
  },
  requestFields: [
    q.number('event_area_sqft', 'Event area', { suffix: 'sq ft' }),
    q.dimensions('stage_dimensions', 'Stage dimensions', { unit: 'ft' }),
    q.number('ceiling_height_ft', 'Ceiling height', { suffix: 'ft' }),
    q.number('tables', 'Tables / seating areas'),
    q.text('colours', 'Colour theme'),
    q.textarea('venue_restrictions', 'Venue restrictions'),
    q.photos('references', 'Reference images', { max: 6 }),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'custom_design', label: 'Custom design not in your packages' },
    { id: 'schedule_infeasible', label: 'Install / removal window too tight' },
  ],
  quoteTemplate: ['Design fee', 'Materials & flowers', 'Labour', 'Transport', 'Setup', 'Dismantling'],
  readiness: ['Packages priced with areas and items', 'Crew free for the date', 'Lead time met'],
}
