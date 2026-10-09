// Trade 25 — Security Services (spec Part 9, Trade 25)
import { q, screen } from './schema'

export default {
  id: 'security_services',
  serviceNoun: 'security service',
  screens: [
    screen('profile', 'Your security services', 'What your guards do on site.', [
      q.multi('services', 'Services', [
        'Guest access control', 'Entry / exit management', 'Queue management', 'Site security', 'Parking security', 'Supervision',
      ], { required: true }),
      q.textarea('other_service', 'Anything else (reviewed before it is shown)'),
      q.multi('venues', 'Venue types', ['Banquet halls', 'Open grounds', 'Hotels', 'Corporate', 'Residences', 'Exhibitions'], { required: true, other: true }),
      q.number('max_visitors', 'Largest visitor volume handled', { required: true, min: 10, max: 200000, suffix: 'people' }),
    ]),
    screen('team', 'Your team', null, [
      q.number('guards', 'Guards available', { required: true, min: 1, max: 5000 }),
      q.number('supervisors', 'Supervisors available', { required: true, min: 0, max: 500 }),
      q.multi('shifts', 'Shifts', ['Day (8h)', 'Night (8h)', '12-hour'], { required: true, other: true }),
      q.multi('uniform', 'Uniform', ['Standard uniform', 'Formal / suited', 'Bouncer'], { required: true }),
      q.multi('equipment', 'Equipment', ['Metal detectors', 'Radios', 'Torches', 'Barricades', 'Body cameras'], { other: true }),
      q.toggle('briefing', 'Pre-event briefing included'),
      q.toggle('relief', 'Break relief guards provided'),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['per_staff_hour', 'per_staff_shift', 'event', 'per_staff_day', 'quote'],
    fields: [
      q.money('min_engagement', 'Minimum engagement', { required: true }),
      q.money('overtime_per_hour', 'Overtime per guard per hour', { required: true }),
      q.money('supervisor_rate', 'Supervisor per shift'),
      q.money('transport_fee', 'Transport'),
      q.money('night_premium', 'Night premium per guard'),
    ],
  },
  addons: [{ id: 'metal_detector', label: 'Door-frame metal detector', unit: 'per_day' }, { id: 'bouncer', label: 'Bouncer', unit: 'per_staff' }],
  resources: { model: 'staff', title: 'Guards on roster', fields: [] },
  requestFields: [q.number('visitors', 'Expected visitors'), q.number('entry_points', 'Entry points'), q.time('start', 'Start'), q.time('end', 'End')],
  compliance: { conditional: [
    { doc: 'VER-TRADE-PSARA', always: true, blocksInstant: true },
  ] },
  rules: { reviewWhen: { q: 'other_service', truthy: true } },
  quoteTriggers: [{ id: 'not_verified', label: 'PSARA licence not yet reviewed' }, { id: 'over_roster', label: 'More guards than your roster' }],
  quoteTemplate: ['Guards × shifts', 'Supervisors', 'Overtime', 'Night premium', 'Equipment', 'Transport'],
  readiness: ['PSARA licence reviewed', 'Rates, minimum and overtime set', 'Actual guards reserved for the shift'],
}
