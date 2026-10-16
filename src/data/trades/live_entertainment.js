// Trade 15 — Live Entertainment (spec Part 9, Trade 15)
import { q, screen, catalogue } from './schema'

export default {
  id: 'live_entertainment',
  serviceNoun: 'entertainment act',
  screens: [
    screen('profile', 'Your acts', 'Pick every act you provide.', [
      q.multi('act_types', 'Which acts are provided?', [
        'Singer', 'Band', 'Instrumentalist', 'Dance troupe', 'Comedian', 'Magician',
        'Emcee-supported act', 'Traditional performance', 'Specialty act',
      ], { required: true, other: true }),
    ]),
  ],
  catalogue: catalogue('acts', 'Each act', 'act', 'acts', [
    q.text('name', 'Act name', { required: true, max: 60 }),
    q.textarea('description', 'Description', { required: true, max: 300 }),
    q.number('performers', 'Performers', { required: true, min: 1, max: 100 }),
    q.multi('durations', 'Duration options', ['15 min', '30 min', '45 min', '1 hour', '2 hours'], { required: true }),
    q.single('format', 'Performance format', ['On stage', 'Roaming', 'Interactive', 'Background'], { required: true }),
    q.number('setup_minutes', 'Setup / soundcheck', { min: 0, max: 300, suffix: 'minutes' }),
    q.dimensions('stage_space', 'Stage space needed', { unit: 'ft' }),
    q.textarea('tech_rider', 'Equipment & technical rider', { max: 300 }),
    q.multi('languages', 'Languages', ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'], { other: true }),
    q.single('audience', 'Audience suitability', ['All ages', 'Family', 'Adults', 'Corporate'], { required: true }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Per', ['Act', 'Session', 'Hour', 'Event'], { required: true }),
    q.url('showreel', 'Showreel link'),
  ]),
  pricing: {
    kinds: ['per_unit', 'session', 'hour', 'event', 'full_day', 'fixed'],
    unitLabels: { per_unit: ['per act'] },
    fields: [
      q.money('extra_set', 'Each extra set'),
      q.money('rehearsal_fee', 'Rehearsal'),
      q.money('tech_staff_fee', 'Technical staff'),
      q.money('overtime_rate', 'Overtime per hour', { required: true }),
    ],
    packages: { label: 'Multi-act packages', fields: ['acts', 'duration'] },
  },
  addons: [{ id: 'sound', label: 'Sound system', unit: 'per_event' }, { id: 'costume_theme', label: 'Themed costumes', unit: 'per_event' }],
  resources: { model: 'staff', title: 'Performers & crew', fields: [
    q.number('crew', 'Crew per event', { min: 0, max: 100 }),
    q.number('travel_buffer_minutes', 'Travel buffer', { min: 0, max: 600, suffix: 'minutes' }),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'unpriced_combo', label: 'Combination of acts not priced' }, { id: 'production', label: 'Production not available' }],
  quoteTemplate: ['Acts', 'Extra sets', 'Rehearsal', 'Technical staff & equipment', 'Travel'],
  readiness: ['Every act priced', 'Performers, crew and equipment free'],
}
