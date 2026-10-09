// Trade 24 — Safety & Facilities (spec Part 9, Trade 24)
import { q, screen } from './schema'

const REGULATED = ['crowd_safety_authorized', 'site_inspection', 'emergency_preparedness']

export default {
  id: 'safety_facilities',
  serviceNoun: 'safety & facilities service',
  screens: [
    screen('subtype', 'What exactly do you provide?', 'This decides what you are asked next and what needs verification.', [
      q.single('subtype', 'Service type', [
        'Facility support', 'Site inspection', 'Emergency preparedness', 'Safety equipment supply',
        'Sanitation staff', 'Temporary facility setup', 'Crowd safety (authorized)', 'Other (reviewed)',
      ], { required: true }),
      q.textarea('description', 'Describe the service', { required: true, max: 500 }),
      q.multi('sites', 'Sites / event types', ['Indoor halls', 'Open grounds', 'Corporate', 'Weddings', 'Festivals', 'Exhibitions'], { required: true, other: true }),
    ]),
    screen('capacity', 'Capacity & kit', null, [
      q.number('max_attendees', 'Largest event you can support', { required: true, min: 10, max: 200000, suffix: 'people' }),
      q.number('staff', 'Staff available', { required: true, min: 1, max: 2000 }),
      q.multi('kit', 'Equipment', ['Fire extinguishers', 'First-aid kits', 'Barricades', 'Signage', 'Portable toilets', 'Hand-wash stations', 'Radios'], { other: true }),
      q.number('shift_hours', 'Standard shift', { required: true, min: 2, max: 24, suffix: 'hours' }),
      q.toggle('setup_included', 'Setup included'),
      q.toggle('emergency_response', 'Emergency response capability'),
      q.textarea('restrictions', 'Restrictions'),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['per_staff_hour', 'per_staff_shift', 'per_staff_day', 'per_unit', 'fixed', 'quote'],
    unitLabels: { per_unit: ['per equipment unit'], fixed: ['per inspection / project'] },
    fields: [q.money('min_engagement', 'Minimum engagement', { required: true }), q.money('setup_fee', 'Setup fee')],
  },
  addons: [{ id: 'supervisor', label: 'Supervisor', unit: 'per_staff' }, { id: 'extra_kit', label: 'Extra equipment', unit: 'per_item' }],
  resources: { model: 'staff', title: 'Staff & equipment', fields: [] },
  compliance: {
    conditional: [
      { doc: 'VER-TRADE-SAFETY', flag: 'regulated_safety_subtype', when: { q: 'subtype', in: REGULATED }, blocksInstant: true },
      { doc: 'VER-TRADE-LIABILITY', when: { q: 'subtype', in: REGULATED } },
    ],
    note: 'Regulated subtypes stay Custom Quote only until their credentials are verified. "Other" is always reviewed.',
  },
  rules: { quoteOnlyWhen: { q: 'subtype', in: ['other_reviewed'] } },
  quoteTriggers: [{ id: 'regulated_unverified', label: 'Regulated service not yet verified' }, { id: 'over_capacity', label: 'Event above your capacity' }],
  quoteTemplate: ['Staff × hours', 'Supervisor', 'Equipment', 'Setup', 'Inspection'],
  readiness: ['Subtype and description set', 'Credentials verified for regulated subtypes', 'Rates and minimum set'],
}
