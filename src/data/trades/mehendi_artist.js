// Trade 18 — Mehendi Artist (spec Part 9, Trade 18)
import { q, screen, catalogue } from './schema'

export default {
  id: 'mehendi_artist',
  serviceNoun: 'mehendi service',
  screens: [
    screen('profile', 'Your mehendi', 'Styles, coverage and who you serve.', [
      q.multi('who', 'Bridal, family / guest or casual mehendi?', ['Bridal', 'Family / guest', 'Casual'], { required: true }),
      q.multi('styles', 'Which styles are offered?', ['Rajasthani', 'Arabic', 'Indo-Arabic', 'Moroccan', 'Portrait / figure', 'Minimal', 'Glitter'], { required: true, other: true }),
      q.multi('coverage', 'Coverage levels', ['Full hand', 'Half hand', 'Front only', 'Back only', 'Feet'], { required: true, other: true }),
      q.toggle('intricate_bridal', 'Intricate bridal work available'),
      q.single('cone', 'Is natural / cone material provided?', ['Natural organic cones', 'Ready-made cones', 'Customer provides'], { required: true }),
      q.toggle('trial_designs', 'Trial designs available'),
      q.toggle('references', 'Customers can share design references'),
    ]),
  ],
  catalogue: catalogue('services', 'Your mehendi services', 'service', 'services', [
    q.single('service', 'Service', ['Bridal full', 'Bridal hands only', 'Family / guest full hand', 'Guest half hand', 'Feet', 'Simple design'], { required: true, other: true }),
    q.single('coverage', 'Coverage', ['Full hand', 'Half hand', 'Front', 'Back', 'Feet'], { required: true }),
    q.number('minutes', 'Time per person', { required: true, min: 5, max: 600, suffix: 'minutes' }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Per', ['Hand', 'Person', 'Design', 'Session'], { required: true }),
  ]),
  pricing: {
    kinds: ['per_unit', 'per_person', 'session', 'event', 'fixed'],
    unitLabels: { per_unit: ['per hand', 'per design'] },
    fields: [
      q.money('min_booking_fee', 'Minimum booking fee', { required: true }),
      q.money('extra_design', 'Additional design charge'),
      q.money('early_start_fee', 'Early-start fee'),
      q.money('waiting_per_hour', 'Waiting per hour'),
    ],
    packages: { label: 'Bridal packages', fields: ['bride', 'family_count'] },
  },
  addons: [{ id: 'glitter', label: 'Glitter / stones', unit: 'per_person' }, { id: 'extra_artist', label: 'Extra artist', unit: 'per_hour' }],
  resources: { model: 'staff', title: 'Artists & time', fields: [
    q.number('artists', 'Number of artists', { required: true, min: 1, max: 100 }),
    q.number('simultaneous', 'Customers served at the same time', { required: true, min: 1, max: 100 }),
    q.text('setup_space', 'Space you need to work', { max: 60 }),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'schedule_overflow', label: 'Party too large for the time window' }],
  quoteTemplate: ['Bridal mehendi', 'Family / guests', 'Extra artists', 'Travel', 'Early start'],
  readiness: ['Services priced with time per person', 'Artists free for the total time'],
}
