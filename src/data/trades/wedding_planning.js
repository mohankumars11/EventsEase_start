// Trade 34 — Wedding Planning (spec Part 9, Trade 34)
import { q, screen, catalogue } from './schema'

export default {
  id: 'wedding_planning',
  serviceNoun: 'wedding planning',
  screens: [
    screen('profile', 'Your planning services', 'What you take on.', [
      q.multi('services', 'Services', [
        'Full planning', 'Partial planning', 'Day-of coordination', 'Destination weddings', 'Vendor coordination',
        'Guest coordination', 'Budget management', 'Design / theme', 'Ceremony & reception management',
      ], { required: true, other: true }),
      q.multi('cities', 'Cities / destinations', ['Bengaluru', 'Mysuru', 'Coorg', 'Goa', 'Udaipur', 'Jaipur', 'Kerala'], { required: true, other: true }),
      q.number('years', 'Years planning weddings', { required: true, min: 0, max: 60, suffix: 'years' }),
      q.photos('portfolio', 'Weddings you planned', { required: true, min: 4, max: 30 }),
      q.single('budget_band', 'Typical wedding budget you handle', ['Under ₹10 L', '₹10–25 L', '₹25–50 L', '₹50 L–1 Cr', 'Above ₹1 Cr'], { required: true }),
    ]),
  ],
  catalogue: catalogue('packages', 'Your planning packages', 'package', 'packages', [
    q.text('name', 'Package name', { required: true, max: 60 }),
    q.number('functions', 'Functions covered', { required: true, min: 1, max: 20 }),
    q.number('planning_months', 'Planning period', { required: true, min: 0, max: 24, suffix: 'months' }),
    q.number('onsite_days', 'Onsite days', { required: true, min: 1, max: 15 }),
    q.number('onsite_hours', 'Onsite hours per day', { min: 1, max: 24 }),
    q.number('coordinators', 'Coordinators onsite', { required: true, min: 1, max: 50 }),
    q.multi('vendor_categories', 'Vendors you coordinate', ['Venue', 'Catering', 'Decor', 'Photo / video', 'Makeup', 'Entertainment', 'Transport', 'Stay'], { required: true }),
    q.textarea('deliverables', 'Deliverables', { required: true, max: 400 }),
    q.textarea('exclusions', 'Not included', { required: true, max: 400 }),
    q.number('change_limit', 'Scope changes included', { min: 0, max: 20 }),
    q.money('price', 'Package fee', { required: true }),
  ]),
  pricing: {
    kinds: ['fixed', 'event', 'full_day', 'percentage', 'quote'],
    unitLabels: { event: ['per function'], fixed: ['fixed project', 'planning phase'] },
    fields: [
      q.money('extra_function', 'Each extra function', { required: true }),
      q.money('extra_day', 'Each extra onsite day', { required: true }),
      q.single('travel', 'Travel & stay for destination weddings', ['Customer pays actuals', 'Included', 'Fixed charge']),
      q.single('pct_base', 'Percentage is taken on', ['Total vendor spend', 'Agreed budget'], { showWhen: { q: '_rule_kinds', includes: 'percentage' } }),
      q.textarea('pct_policy', 'What the percentage covers and how it is reconciled', { showWhen: { q: '_rule_kinds', includes: 'percentage' } }),
    ],
    note: 'A percentage fee needs an explicit base, inclusions and reconciliation rule, or it cannot be used.',
  },
  addons: [{ id: 'guest_desk', label: 'Guest hospitality desk', unit: 'per_day' }, { id: 'rsvp', label: 'RSVP management', unit: 'per_event' }],
  resources: { model: 'projects', title: 'Concurrent weddings', fields: [
    q.number('concurrent', 'Weddings you run at the same time', { required: true, min: 1, max: 50 }),
    q.number('team', 'Team size', { required: true, min: 1, max: 500 }),
  ] },
  requestFields: [
    q.number('functions', 'Functions'), q.number('guests', 'Guests'), q.number('venues', 'Venues'),
    q.text('city', 'City / destination'), q.single('budget', 'Budget', ['Under ₹10 L', '₹10–25 L', '₹25–50 L', '₹50 L–1 Cr', 'Above ₹1 Cr']),
    q.toggle('accommodation', 'Guest accommodation'), q.textarea('own_vendors', 'Vendors already booked'),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'destination', label: 'Destination wedding' }, { id: 'custom_scope', label: 'Scope outside your packages' }],
  quoteTemplate: ['Planning fee', 'Functions', 'Onsite days', 'Coordinators', 'Travel & stay'],
  readiness: ['At least one package with deliverables and exclusions', 'Concurrent capacity set'],
}
