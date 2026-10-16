// Trade 3 — Bridal Makeup & Hair (spec Part 9, Trade 3)
import { q, screen, catalogue } from './schema'

export default {
  id: 'bridal_makeup_hair',
  serviceNoun: 'makeup and hair service',
  screens: [
    screen('profile', 'Your makeup & hair work', 'What you offer and how you work.', [
      q.multi('services_offered', 'What makeup and hair services do you offer?', [
        'Bridal makeup', 'Bridal hairstyle', 'Bridal makeup and hair combo', 'Bridesmaid / family makeup',
        'Guest makeup', 'Hairstyling', 'Draping', 'Touch-up service', 'Trial session', 'Extra look',
      ], { required: true, other: true }),
      q.multi('styles', 'Which styles can customers choose?', ['Traditional', 'Natural', 'Glam', 'HD', 'Airbrush', 'Editorial'], { required: true, other: true }),
      q.multi('who', 'Do you offer bridal, family and guest services?', ['Bride', 'Groom', 'Family', 'Guests'], { required: true }),
      q.number('people_per_day', 'How many people can you serve on the same day?', { required: true, min: 1, max: 100 }),
      q.toggle('travels_to_venue', "Do you travel to the customer's venue?"),
      q.toggle('trial_available', 'Do you provide a trial session?'),
    ]),
  ],
  catalogue: catalogue('services', 'Your services', 'service', 'services', [
    q.single('service', 'Service', [
      'Bridal makeup', 'Bridal hairstyle', 'Bridal makeup and hair combo', 'Bridesmaid / family makeup', 'Guest makeup',
      'Hairstyling', 'Draping', 'Touch-up service', 'Trial session', 'Extra look',
    ], { required: true, other: true }),
    q.number('duration_minutes', 'How long it takes', { required: true, min: 10, max: 600, suffix: 'minutes' }),
    q.textarea('deliverables', 'What the customer gets', { max: 200 }),
    q.textarea('materials_included', 'Products / materials included', { max: 200 }),
    q.number('artists', 'Artists needed', { required: true, min: 1, max: 10 }),
    q.toggle('travel_applies', 'Travel charge applies to this service?'),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Charged', ['Per person', 'Per look', 'Per session'], { required: true }),
  ]),
  pricing: {
    kinds: ['per_person', 'per_unit', 'session', 'fixed', 'full_day'],
    unitLabels: { per_unit: ['per look'] },
    fields: [
      q.money('trial_fee', 'Trial session fee', { showWhen: { q: 'trial_available', truthy: true } }),
      q.money('extra_look_price', 'Each extra look'),
      q.money('early_start_fee', 'Early-start fee (before 6 AM)'),
      q.money('additional_artist_fee', 'Each additional artist'),
    ],
    packages: { label: 'Bridal & party packages', fields: ['looks', 'people', 'trial_included'] },
    note: 'A trial or service included in a package is never charged again.',
  },
  addons: [
    { id: 'draping', label: 'Saree / dupatta draping', unit: 'per_person' },
    { id: 'hair_extensions', label: 'Hair extensions / accessories', unit: 'per_person' },
    { id: 'touch_up', label: 'Touch-up artist on standby', unit: 'per_hour' },
    { id: 'lashes', label: 'Premium lashes', unit: 'per_person' },
  ],
  resources: {
    model: 'staff',
    title: 'Your team and schedule',
    fields: [
      q.number('artists', 'Number of artists', { required: true, min: 1, max: 50 }),
      q.number('simultaneous', 'Appointments you can run at the same time', { required: true, min: 1, max: 50 }),
      q.number('setup_minutes', 'Setup time at the venue', { min: 0, max: 180, suffix: 'minutes' }),
      q.toggle('early_morning', 'Available for early-morning starts'),
      q.number('min_notice_days', 'Minimum advance notice', { min: 0, max: 180, suffix: 'days' }),
      q.number('buffer_minutes', 'Rest / travel buffer between bookings', { min: 0, max: 240, suffix: 'minutes' }),
    ],
  },
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'large_party', label: 'Bridal party larger than your same-day capacity' },
    { id: 'multiple_locations', label: 'Services at more than one location' },
    { id: 'complex_styling', label: 'Styling not in your published services' },
  ],
  quoteTemplate: ['Bridal look(s)', 'Family / guest looks', 'Additional artists', 'Trial', 'Travel', 'Early start'],
  readiness: ['Every service priced with a duration', 'Artists and time windows available', 'Travel rules set'],
}
