// Trade 22 — Power & Cooling (spec Part 9, Trade 22)
import { q, screen, catalogue } from './schema'

export default {
  id: 'power_cooling',
  serviceNoun: 'power & cooling',
  screens: [
    screen('profile', 'Your power & cooling', 'What you supply and support.', [
      q.multi('services', 'What do you provide?', [
        'Generators', 'Backup power', 'Power distribution', 'Temporary cooling', 'Air-conditioning', 'Fans / air coolers', 'Setup & on-site support',
      ], { required: true, other: true }),
      q.toggle('operators', 'You supply operators / technicians'),
      q.single('fuel_policy', 'Fuel policy', ['Fuel included for the booked hours', 'Fuel charged at actuals', 'Customer supplies fuel'], { required: true }),
      q.number('service_radius_km', 'Service radius', { required: true, min: 5, max: 1000, suffix: 'km' }),
    ]),
  ],
  catalogue: catalogue('items', 'Your units', 'unit', 'units', [
    q.single('type', 'Type', ['Diesel generator', 'Silent generator', 'Distribution board', 'Tower AC', 'Ducted AC', 'Mist fan', 'Air cooler', 'Pedestal fan'], { required: true, other: true }),
    q.text('model', 'Make / model', { max: 40 }),
    q.number('capacity', 'Rated capacity', { required: true, min: 0.1, max: 5000, suffix: 'kVA / ton' }),
    q.number('quantity', 'Quantity owned', { required: true, min: 1, max: 1000 }),
    q.single('power_source', 'Fuel / power', ['Diesel', 'Petrol', 'Gas', 'Mains electricity'], { required: true }),
    q.number('runtime_hours', 'Runtime on one fill', { min: 1, max: 72, suffix: 'hours' }),
    q.single('placement', 'Indoor / outdoor', ['Indoor', 'Outdoor', 'Both'], { required: true }),
    q.toggle('cabling', 'Cabling included'),
    q.toggle('installation', 'Installation included'),
    q.money('rate', 'Rental rate', { required: true }),
    q.single('rate_period', 'Per', ['Hour', 'Day', 'Event'], { required: true }),
    q.date('last_service', 'Last maintenance'),
    q.photos('photos', 'Photos', { min: 1, max: 4 }),
  ]),
  pricing: {
    kinds: ['rental', 'hour', 'full_day', 'capacity_period', 'fixed', 'quote'],
    unitLabels: { rental: ['per unit per hour', 'per unit per day'], capacity_period: ['per kVA per day'] },
    fields: [
      q.money('setup_fee', 'Setup / installation'),
      q.money('operator_per_shift', 'Operator per shift'),
      q.money('transport_fee', 'Transport', { required: true }),
      q.money('fuel_per_hour', 'Fuel per running hour', { showWhen: { q: 'fuel_policy', in: ['fuel_charged_at_actuals'] } }),
    ],
    note: 'Customers see exactly what fuel, transport and operators are included before they pay.',
  },
  addons: [{ id: 'standby', label: 'Standby backup unit', unit: 'per_day' }, { id: 'extra_cable', label: 'Extra cabling run', unit: 'per_item' }],
  resources: { model: 'items', title: 'Units & technicians', fields: [q.number('technicians', 'Technicians available', { min: 0, max: 200 })] },
  requestFields: [
    q.number('required_kva', 'Required capacity', { suffix: 'kVA' }), q.number('hours', 'Hours needed'),
    q.textarea('load', 'What will be powered / cooled'), q.toggle('backup', 'Backup needed'),
    q.single('environment', 'Environment', ['Indoor', 'Outdoor', 'Covered outdoor']), q.textarea('access', 'Space & access'),
  ],
  compliance: { conditional: [
    { doc: 'VER-TRADE-ELECTRICAL', always: true, blocksInstant: true },
  ] },
  quoteTriggers: [{ id: 'over_capacity', label: 'Load above your largest setup' }, { id: 'no_inspection', label: 'Site inspection or safety approval needed' }],
  quoteTemplate: ['Units × hours / days', 'Fuel', 'Operators', 'Setup', 'Transport'],
  readiness: ['Units with rated capacity listed', 'Electrical credential verified', 'Fuel policy stated'],
}
