// Trade 21 — Photography (spec Part 9, Trade 21)
import { q, screen, catalogue, EVENT_TYPES } from './schema'

export default {
  id: 'photography',
  serviceNoun: 'photography',
  screens: [
    screen('profile', 'Your photography', 'What you shoot and how you deliver.', [
      q.multi('specialties', 'Specialties', ['Candid', 'Traditional', 'Pre-wedding', 'Portrait', 'Product', 'Corporate', 'Fashion', 'Maternity / newborn'], { required: true, other: true }),
      q.multi('events', 'Event categories', EVENT_TYPES, { required: true, other: true }),
      q.multi('styles', 'Styles', ['Documentary', 'Editorial', 'Fine art', 'Classic posed', 'Cinematic stills'], { other: true }),
      q.number('years', 'Years of experience', { required: true, min: 0, max: 60, suffix: 'years' }),
      q.photos('portfolio', 'Portfolio', { required: true, min: 6, max: 30 }),
      q.url('gallery_link', 'Online gallery link'),
      q.multi('equipment', 'Equipment', ['Full-frame bodies', 'Backup body', 'Prime lenses', 'Zoom lenses', 'Off-camera flash', 'Studio lights', 'Drone (licensed)'], { other: true }),
      q.multi('formats', 'Delivery formats', ['Online gallery', 'Pen drive', 'Printed album', 'Prints', 'RAW files'], { required: true }),
      q.number('service_radius_km', 'Service area radius', { required: true, min: 5, max: 3000, suffix: 'km' }),
    ]),
  ],
  catalogue: catalogue('packages', 'Your coverage', 'coverage package', 'coverage packages', [
    q.single('coverage', 'Coverage type', ['Hourly', 'Ceremony / session', 'Half-day', 'Full-day', 'Multi-day', 'Couple / portrait shoot'], { required: true, other: true }),
    q.number('hours', 'Hours of coverage', { required: true, min: 1, max: 72, suffix: 'hours' }),
    q.number('photographers', 'Photographers', { required: true, min: 1, max: 20 }),
    q.number('edited_images', 'Edited images delivered', { required: true, min: 10, max: 5000 }),
    q.single('retouch', 'Retouching level', ['Basic colour', 'Standard', 'Advanced skin & detail'], { required: true }),
    q.single('album', 'Album / prints', ['None', 'Digital album', 'Printed album', 'Prints'], { required: true }),
    q.number('delivery_days', 'Delivery timeline', { required: true, min: 1, max: 180, suffix: 'days' }),
    q.toggle('raw', 'RAW files included'),
    q.money('price', 'Your price for this package', { required: true, hint: 'Starts from a suggestion based on your hourly rate; your edited price is kept separately.' }),
  ]),
  pricing: {
    kinds: ['hour', 'session', 'half_day', 'full_day', 'multi_day', 'fixed'],
    fields: [
      q.money('overtime_per_hour', 'Overtime per hour', { required: true }),
      q.money('extra_photographer', 'Additional photographer per hour'),
      q.money('extra_function', 'Extra function / event'),
    ],
    packages: { label: 'Starter packages', fields: ['hours', 'photographers', 'edited_images'], suggestFrom: 'hour' },
    note: 'Suggested package prices come from your hourly rate. Your edited price and the suggestion are stored separately.',
  },
  addons: [
    { id: 'album', label: 'Printed album', unit: 'per_item' },
    { id: 'prints', label: 'Extra prints', unit: 'per_piece' },
    { id: 'same_day', label: 'Same-day edit slideshow', unit: 'per_event' },
    { id: 'drone', label: 'Drone shots', unit: 'per_event' },
  ],
  resources: { model: 'staff', title: 'Team & delivery capacity', fields: [
    q.number('team', 'Photographers in your team', { required: true, min: 1, max: 100 }),
    q.number('events_per_day', 'Events you can cover per day', { required: true, min: 1, max: 20 }),
    q.number('edits_per_month', 'Events you can edit per month', { min: 1, max: 200 }),
    q.number('travel_buffer_minutes', 'Travel buffer between events', { min: 0, max: 600, suffix: 'minutes' }),
  ] },
  compliance: { conditional: [{ doc: 'VER-TRADE-DRONE', flag: 'flies_drone', when: { q: 'equipment', includes: 'drone_licensed' } }] },
  quoteTriggers: [{ id: 'multi_city', label: 'Coverage across cities' }, { id: 'over_team', label: 'More photographers than your team' }],
  quoteTemplate: ['Coverage hours', 'Photographers', 'Edited images', 'Album / prints', 'Travel', 'Extra function'],
  readiness: ['Portfolio uploaded', 'At least one package priced', 'Team, travel buffer and delivery capacity fit'],
}
