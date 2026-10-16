// Trade 6 — DJ & Music (spec Part 9, Trade 6)
import { q, screen, EVENT_TYPES } from './schema'

export default {
  id: 'dj_music',
  serviceNoun: 'music performance',
  screens: [
    screen('profile', 'Your music performance', 'What you play and who performs.', [
      q.multi('performance_kinds', 'What kind of music performances do you provide?', [
        'DJ', 'Live musician', 'DJ with live musician', 'Ceremony music', 'Background music',
      ], { required: true, other: true }),
      q.multi('event_types', 'Which event types do you support?', EVENT_TYPES, { required: true, other: true }),
      q.multi('styles', 'Which music styles do you play?', [
        'Bollywood', 'Punjabi', 'Kannada / South Indian', 'Retro', 'EDM', 'House', 'Hip-hop', 'Sufi', 'Instrumental', 'Western pop',
      ], { required: true, other: true }),
      q.number('performers', 'How many performers can you provide?', { required: true, min: 1, max: 30 }),
      q.single('own_equipment', 'Do you supply your own sound and lighting equipment?', ['Sound and lighting', 'Sound only', 'Lighting only', 'Neither'], { required: true }),
    ]),
    screen('performance', 'Performance details', 'What a booking includes.', [
      q.multi('formats', 'Performance format', ['Solo DJ set', 'DJ + percussionist', 'DJ + singer', 'Live band set', 'Acoustic set'], { required: true, other: true }),
      q.multi('duration_options', 'Duration options', ['1 hour', '2 hours', '3 hours', '4 hours', '6 hours'], { required: true }),
      q.number('setup_minutes', 'Setup / soundcheck time', { required: true, min: 0, max: 300, suffix: 'minutes' }),
      q.textarea('equipment_included', 'Equipment included', { max: 300 }),
      q.text('power_needs', 'Power requirements', { placeholder: 'e.g. 2 × 15A sockets', max: 80 }),
      q.text('space_needs', 'Space / stage requirements', { placeholder: 'e.g. 8 × 4 ft console area', max: 80 }),
      q.toggle('song_requests', 'Takes playlist / custom song requests'),
      q.textarea('special_production', 'Special production requirements', { max: 200 }),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['hour', 'session', 'event', 'half_day', 'full_day', 'fixed'],
    fields: [
      q.number('included_minutes', 'Performance time included', { min: 30, max: 1440, suffix: 'minutes' }),
      q.money('overtime_rate', 'Overtime per hour', { required: true }),
      q.money('extra_performer', 'Each extra performer'),
      q.money('extra_equipment', 'Extra equipment bundle'),
    ],
    packages: { label: 'Packages by duration or production level', fields: ['duration', 'performers', 'equipment'] },
  },
  addons: [
    { id: 'lighting', label: 'Dance-floor lighting', unit: 'per_event' },
    { id: 'fog', label: 'Fog / haze machine', unit: 'per_event' },
    { id: 'dhol', label: 'Dhol player', unit: 'per_hour' },
    { id: 'extra_speakers', label: 'Extra speaker zone', unit: 'per_event' },
  ],
  resources: {
    model: 'staff',
    title: 'Availability',
    fields: [
      q.number('max_hours', 'Most performance hours in one booking', { required: true, min: 1, max: 24 }),
      q.number('travel_buffer_minutes', 'Travel buffer between gigs', { min: 0, max: 600, suffix: 'minutes' }),
      q.number('min_notice_days', 'Minimum booking notice', { min: 0, max: 180, suffix: 'days' }),
    ],
  },
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'unpriced_production', label: 'Production you have not priced' },
    { id: 'multiple_stages', label: 'More than one stage or zone' },
    { id: 'equipment_beyond', label: 'Equipment beyond your published setup' },
  ],
  quoteTemplate: ['Performance', 'Extra performers', 'Sound & lighting', 'Setup & soundcheck', 'Travel', 'Overtime'],
  readiness: ['Priced performance', 'Equipment configuration matches the request', 'Date and travel buffer free'],
}
