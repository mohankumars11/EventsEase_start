// Trade 32 — Videography (spec Part 9, Trade 32)
import { q, screen, catalogue, EVENT_TYPES } from './schema'

export default {
  id: 'videography',
  serviceNoun: 'videography',
  screens: [
    screen('profile', 'Your videography', 'What you film and how you deliver.', [
      q.multi('specialties', 'Specialties', ['Wedding films', 'Corporate', 'Music video', 'Documentary', 'Ads / brand', 'Live events'], { required: true, other: true }),
      q.multi('events', 'Events', EVENT_TYPES, { required: true, other: true }),
      q.number('years', 'Years of experience', { required: true, min: 0, max: 60, suffix: 'years' }),
      q.url('showreel', 'Showreel link', { required: true }),
      q.photos('portfolio', 'Portfolio stills', { min: 3, max: 20 }),
      q.multi('equipment', 'Equipment', ['Cinema cameras', 'Mirrorless', 'Gimbals', 'Sliders', 'Wireless audio', 'Lights', 'Drone (licensed)', 'Streaming encoder'], { other: true }),
      q.number('service_radius_km', 'Service area radius', { required: true, min: 5, max: 3000, suffix: 'km' }),
    ]),
  ],
  catalogue: catalogue('offerings', 'Your offerings', 'offering', 'offerings', [
    q.single('service', 'Service', [
      'Event coverage', 'Wedding film', 'Highlight reel', 'Full-length film', 'Cinematic film', 'Interviews',
      'Multi-camera', 'Live streaming', 'Raw footage', 'Drone (authorized)',
    ], { required: true, other: true }),
    q.number('hours', 'Hours of filming', { required: true, min: 1, max: 72 }),
    q.number('videographers', 'Videographers', { required: true, min: 1, max: 20 }),
    q.number('cameras', 'Cameras', { required: true, min: 1, max: 30 }),
    q.single('resolution', 'Resolution', ['1080p', '4K', '6K+'], { required: true }),
    q.single('edit_level', 'Edit level', ['Basic cut', 'Colour-graded', 'Cinematic'], { required: true }),
    q.number('highlight_minutes', 'Highlight length', { min: 0, max: 30, suffix: 'minutes' }),
    q.toggle('full_film', 'Full-length film included'),
    q.toggle('raw', 'Raw footage included'),
    q.number('delivery_days', 'Delivery timeline', { required: true, min: 1, max: 180, suffix: 'days' }),
    q.number('revisions', 'Revisions included', { min: 0, max: 10 }),
    q.money('price', 'Price', { required: true }),
  ]),
  pricing: {
    kinds: ['hour', 'session', 'event', 'half_day', 'full_day', 'multi_day', 'fixed'],
    fields: [
      q.money('overtime_per_hour', 'Overtime per hour', { required: true }),
      q.money('extra_day', 'Extra day'),
      q.money('extra_revision', 'Each extra revision'),
    ],
    packages: { label: 'Deliverable packages', fields: ['hours', 'videographers', 'deliverables'], suggestFrom: 'hour' },
  },
  addons: [{ id: 'drone', label: 'Drone footage', unit: 'per_event' }, { id: 'streaming', label: 'Live streaming', unit: 'per_event' }, { id: 'teaser', label: 'Same-week teaser', unit: 'per_item' }],
  resources: { model: 'staff', title: 'Crew, kit & edit capacity', fields: [
    q.number('crew', 'Videographers in your team', { required: true, min: 1, max: 100 }),
    q.number('edits_per_month', 'Films you can edit per month', { required: true, min: 1, max: 200 }),
    q.number('travel_buffer_minutes', 'Travel buffer', { min: 0, max: 600, suffix: 'minutes' }),
  ] },
  compliance: { conditional: [{ doc: 'VER-TRADE-DRONE', flag: 'flies_drone', when: { q: 'equipment', includes: 'drone_licensed' } }] },
  quoteTriggers: [{ id: 'multi_day_travel', label: 'Multi-day / destination shoot' }, { id: 'over_crew', label: 'More crew than your team' }],
  quoteTemplate: ['Filming hours', 'Crew', 'Edit & deliverables', 'Drone', 'Streaming', 'Travel'],
  readiness: ['Showreel added', 'At least one offering priced', 'Crew, kit and edit capacity fit'],
}
