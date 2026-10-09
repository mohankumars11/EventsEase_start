// Trade 10 — Event Lighting (spec Part 9, Trade 10)
import { q, screen, catalogue } from './schema'

export default {
  id: 'event_lighting',
  serviceNoun: 'lighting service',
  screens: [
    screen('profile', 'Your lighting service', 'What you light and how.', [
      q.multi('service_types', 'Which lighting services do you provide?', [
        'Basic event lighting', 'Stage lighting', 'Decorative lighting', 'Moving lights',
        'Architectural / venue lighting', 'Outdoor lighting', 'Custom lighting design',
      ], { required: true, other: true }),
      q.multi('suitability', 'Indoor / outdoor', ['Indoor', 'Outdoor'], { required: true }),
      q.number('coverage_sqft', 'Largest area you can light', { min: 100, max: 1000000, suffix: 'sq ft' }),
      q.toggle('rigging', 'You handle rigging (truss, hanging)'),
      q.text('power_needs', 'Power requirements', { required: true, max: 80, placeholder: 'e.g. 3-phase 63A' }),
      q.multi('controllers', 'Controller / console options', ['DMX console', 'Pre-programmed', 'Wireless control', 'Timecode show'], { other: true }),
      q.toggle('operator', 'Operator available'),
      q.toggle('setup_dismantle', 'Setup and dismantling included'),
      q.textarea('safety', 'Safety measures', { max: 200 }),
      q.toggle('transport', 'You transport the equipment'),
    ]),
  ],
  catalogue: catalogue('fixtures', 'Your fixtures', 'fixture', 'fixtures', [
    q.text('name', 'Fixture', { required: true, max: 60, placeholder: 'e.g. LED par 54×3W' }),
    q.number('total_qty', 'Quantity', { required: true, min: 1, max: 10000 }),
    q.single('suitability', 'Use', ['Indoor', 'Outdoor', 'Both'], { required: true }),
    q.number('watts', 'Power draw', { min: 0, max: 100000, suffix: 'W' }),
    q.money('rate', 'Rental rate', { required: true }),
    q.single('rate_period', 'Per', ['Event', 'Day', 'Hour'], { required: true }),
    q.photos('photos', 'Photo', { max: 3 }),
  ]),
  pricing: {
    kinds: ['rental', 'fixed', 'per_staff_hour', 'event', 'full_day', 'quote'],
    fields: [
      q.money('operator_rate', 'Operator per hour'),
      q.money('setup_fee', 'Setup'),
      q.money('dismantle_fee', 'Dismantling'),
      q.money('cable_fee', 'Cables & accessories'),
      q.money('transport_fee', 'Transport'),
      q.money('overtime_rate', 'Overtime per hour'),
    ],
  },
  addons: [
    { id: 'truss', label: 'Truss structure', unit: 'per_event' },
    { id: 'haze', label: 'Haze machine', unit: 'per_event' },
    { id: 'gobo', label: 'Custom gobo projection', unit: 'per_item' },
  ],
  resources: { model: 'items', title: 'Fixture stock and technicians', fields: [
    q.number('technicians', 'Technicians available per day', { required: true, min: 1, max: 100 }),
    q.number('max_power_kw', 'Largest total load you can run', { min: 1, max: 10000, suffix: 'kW' }),
  ] },
  compliance: { conditional: [{ doc: 'VER-TRADE-ELECTRICAL', always: true }] },
  quoteTriggers: [
    { id: 'over_power', label: 'Load above your configured power' },
    { id: 'rigging_unknown', label: 'Rigging compatibility not confirmed' },
    { id: 'custom_design', label: 'Custom lighting design' },
  ],
  quoteTemplate: ['Fixtures', 'Operator', 'Setup & dismantling', 'Cables & accessories', 'Transport'],
  readiness: ['Fixtures stocked and priced', 'Technician free', 'Power and rigging within limits'],
}
