// Trade 26 — Sound & AV (spec Part 9, Trade 26)
import { q, screen, catalogue, EVENT_TYPES } from './schema'

export default {
  id: 'sound_av',
  serviceNoun: 'sound & AV',
  screens: [
    screen('profile', 'Your sound & AV', 'Which equipment groups you supply.', [
      q.multi('groups', 'Equipment groups', [
        'Speakers', 'Mixers', 'Microphones', 'Wireless systems', 'Projectors & screens',
        'Video-conferencing', 'LED walls / video', 'Stage monitors', 'Cables & stands', 'Operators',
        'Line arrays', 'Subwoofers', 'DJ setup', 'Podium mics', 'Interpretation booths', 'Teleprompters', 'Intercom / talk-back', 'Stage timers',
      ], { required: true, other: true }),
      q.multi('capabilities', 'You can also handle', ['Recording', 'Live streaming', 'Multi-zone audio', 'Simultaneous interpretation',
        'Hybrid / virtual events', 'Live-band audio', 'Silent-disco headphones', 'Webcasting'], { other: true }),
      q.number('max_audience', 'Largest audience you can cover', { required: true, min: 10, max: 100000, suffix: 'people' }),
      /* Customers ask which speakers by name, and the brand is often the
         difference between two quotes that look the same. */
      q.multi('brands', 'Brands in your inventory', ['JBL', 'Bose', 'Shure', 'Sennheiser', 'Yamaha', 'Allen & Heath', 'Behringer',
        'L-Acoustics', 'd&b audiotechnik', 'QSC', 'RCF', 'Electro-Voice'], { other: true }),
      q.multi('events', 'Events you supply for', EVENT_TYPES, { other: true }),
      q.toggle('backup', 'A backup mixer and mics stay on site'),
      q.number('setup_hours', 'Setup time you need before the event', { min: 0, max: 48, suffix: 'hours' }),
      q.number('service_radius_km', 'How far you work from your base', { min: 5, max: 3000, suffix: 'km' }),
    ]),
  ],
  catalogue: catalogue('items', 'Your equipment', 'item', 'items', [
    q.single('group', 'Group', ['Speakers', 'Mixers', 'Microphones', 'Wireless systems', 'Projectors & screens', 'Video-conferencing', 'LED walls / video', 'Stage monitors', 'Cables & stands',
      'Line arrays', 'Subwoofers', 'DJ setup', 'Podium mics', 'Teleprompters', 'Intercom / talk-back'], { required: true, other: true }),
    q.text('model', 'Make / model', { required: true, max: 60 }),
    q.number('quantity', 'Quantity', { required: true, min: 1, max: 10000 }),
    q.single('condition', 'Condition', ['New', 'Excellent', 'Good'], { required: true }),
    q.number('power_watts', 'Power draw', { min: 0, max: 200000, suffix: 'W' }),
    q.number('setup_minutes', 'Setup time', { min: 0, max: 1440, suffix: 'minutes' }),
    q.money('rate', 'Rental rate', { required: true }),
    q.single('rate_period', 'Per', ['Event', 'Day', 'Hour'], { required: true }),
    q.photos('photos', 'Photo', { min: 1, max: 4 }),
  ]),
  pricing: {
    kinds: ['rental', 'fixed', 'event', 'full_day', 'quote'],
    unitLabels: { fixed: ['bundle / event setup'] },
    fields: [
      q.money('operator_per_hour', 'Operator / technician per hour', { required: true }),
      q.money('delivery_fee', 'Delivery'),
      q.money('setup_teardown_fee', 'Setup & teardown'),
    ],
    packages: { label: 'Bundles (e.g. "Up to 200 guests")', fields: ['audience', 'items'] },
    note: 'Equipment, operators, delivery and setup / teardown always appear as separate lines.',
  },
  addons: [{ id: 'recording', label: 'Recording', unit: 'per_event' }, { id: 'streaming', label: 'Live streaming', unit: 'per_event' }],
  resources: { model: 'items', title: 'Equipment & technicians', fields: [q.number('technicians', 'Technicians available', { required: true, min: 1, max: 500 })] },
  requestFields: [
    q.single('setting', 'Indoor / outdoor', ['Indoor', 'Outdoor']), q.number('audience', 'Audience size'),
    q.number('zones', 'Zones / stages'), q.number('inputs', 'Inputs / channels'), q.number('mics', 'Microphones'),
    q.toggle('presentation', 'Presentation / video'), q.toggle('recording', 'Recording / streaming'),
    q.time('soundcheck', 'Soundcheck window'), q.number('venue_power_kw', 'Venue power limit', { suffix: 'kW' }),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'over_limits', label: 'Specification outside your equipment or power limits' }, { id: 'no_technician', label: 'No technician free' }],
  quoteTemplate: ['Equipment', 'Operators', 'Delivery', 'Setup & teardown', 'Recording / streaming'],
  readiness: ['Equipment listed with quantities', 'Operator rate set', 'Equipment and technicians free'],
}
