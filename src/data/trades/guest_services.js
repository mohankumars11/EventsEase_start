// Trade 13 — Guest Services (spec Part 9, Trade 13)
import { q, screen, catalogue } from './schema'

export default {
  id: 'guest_services',
  serviceNoun: 'guest services team',
  screens: [
    screen('profile', 'Your guest services', 'Pick every role you staff.', [
      q.multi('roles', 'Which services do you provide?', [
        'Guest reception', 'Registration desk', 'Ushers', 'Guest guidance', 'Queue management',
        'Gift distribution', 'Hospitality desk', 'Guest coordination',
      ], { required: true, other: true }),
    ]),
  ],
  catalogue: catalogue('role_specs', 'Each role', 'role', 'roles', [
    q.single('role', 'Role', ['Guest reception', 'Registration desk', 'Ushers', 'Guest guidance', 'Queue management', 'Gift distribution', 'Hospitality desk', 'Guest coordination'], { required: true, other: true }),
    q.number('min_staff', 'Minimum staff', { required: true, min: 1, max: 500 }),
    q.number('max_staff', 'Maximum staff', { required: true, min: 1, max: 2000 }),
    q.multi('languages', 'Languages', ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'], { other: true }),
    q.text('dress_code', 'Dress code', { max: 60 }),
    q.toggle('uniform', 'Uniform provided'),
    q.single('experience', 'Experience', ['Fresher', '1+ year', '3+ years'], { required: true }),
    q.number('briefing_minutes', 'Briefing time', { min: 0, max: 240, suffix: 'minutes' }),
    q.number('shift_hours', 'Shift length', { required: true, min: 2, max: 16, suffix: 'hours' }),
    q.text('break_policy', 'Break policy', { max: 80 }),
    q.toggle('supervisor_required', 'Needs a supervisor'),
    q.money('rate', 'Rate', { required: true }),
    q.single('rate_unit', 'Per', ['Staff per hour', 'Staff per shift', 'Staff per day'], { required: true }),
  ]),
  pricing: {
    kinds: ['per_staff_hour', 'per_staff_shift', 'per_staff_day', 'event', 'fixed'],
    fields: [
      q.number('min_engagement_hours', 'Minimum engagement', { required: true, min: 1, max: 24, suffix: 'hours' }),
      q.money('extra_hour_rate', 'Extra hour per staff'),
      q.money('supervisor_rate', 'Supervisor per shift'),
      q.money('night_surcharge', 'Night / holiday surcharge (only if you charge it)'),
      q.single('transport_meals', 'Transport and meals', ['Included', 'Customer provides', 'Charged separately'], { required: true }),
    ],
  },
  addons: [{ id: 'uniform_branding', label: 'Branded uniforms', unit: 'per_staff' }, { id: 'transport', label: 'Staff transport', unit: 'per_trip' }],
  resources: { model: 'staff', title: 'Your staff pool', fields: [
    q.number('staff_pool', 'Staff available per day', { required: true, min: 1, max: 5000 }),
    q.number('supervisors', 'Supervisors available', { min: 0, max: 500 }),
    q.number('turnaround_minutes', 'Travel / turnaround between events', { min: 0, max: 600, suffix: 'minutes' }),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'language_mismatch', label: 'Language not available' }, { id: 'staff_count', label: 'More staff than available' }, { id: 'schedule', label: 'Schedule cannot be matched' }],
  quoteTemplate: ['Staff by role', 'Supervisors', 'Extra hours', 'Transport & meals'],
  readiness: ['Every role priced', 'Staff and supervisors free for the shifts'],
}
