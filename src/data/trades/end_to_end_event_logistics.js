// Trade 8 — End-to-End Event Logistics (spec Part 9, Trade 8)
import { q, screen } from './schema'

const SCOPE = [
  'Loading / unloading coordination', 'Material transport', 'Storage', 'Equipment delivery', 'Setup coordination',
  'Vendor scheduling', 'On-site logistics management', 'Return logistics', 'Multi-location coordination', 'Complete logistics management',
]

export default {
  id: 'end_to_end_event_logistics',
  serviceNoun: 'event logistics service',
  screens: [
    screen('scope', 'What you manage', 'Pick everything you can take on.', [
      q.multi('scope', 'What parts of event logistics can you manage?', SCOPE, { required: true, other: true }),
      q.single('delivered_by', 'Who performs this work?', ['Our own staff', 'Approved subcontractors', 'A combination'], { required: true }),
      q.number('own_vehicles', 'Vehicles you operate', { min: 0, max: 500 }),
      q.number('own_staff', 'Staff you employ', { min: 0, max: 5000 }),
      q.number('max_concurrent_projects', 'Projects you can run at the same time', { required: true, min: 1, max: 100 }),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['fixed', 'full_day', 'per_trip', 'per_staff_shift', 'capacity_period', 'quote'],
    fields: [
      q.money('loading_rate', 'Loading / unloading (per crew shift)'),
      q.money('storage_rate', 'Storage (per pallet per day)'),
      q.money('management_day_rate', 'Management fee per day'),
    ],
    note: 'Every separately charged component is its own line. An unconfirmed subcontractor or vehicle is never shown as booked.',
  },
  addons: [
    { id: 'site_survey', label: 'Site survey', unit: 'per_event' },
    { id: 'night_work', label: 'Night work', unit: 'per_staff' },
    { id: 'packing_materials', label: 'Packing materials', unit: 'per_set' },
  ],
  resources: { model: 'staff', title: 'Crew & vehicles', fields: [
    q.number('crews', 'Crews available per day', { required: true, min: 1, max: 100 }),
    q.number('vehicles_per_day', 'Vehicles available per day', { min: 0, max: 500 }),
  ] },
  requestFields: [
    q.textarea('pickup_points', 'Pickup points'),
    q.textarea('dropoff_points', 'Drop-off points'),
    q.multi('material_categories', 'Material categories', ['Furniture', 'Equipment', 'Decor', 'Food & beverage', 'Fragile', 'Heavy machinery'], { other: true }),
    q.text('load_quantity', 'Load quantity & dimensions'),
    q.number('vehicles_needed', 'Vehicles needed'),
    q.number('staff_needed', 'Staff needed'),
    q.text('deadlines', 'Setup / teardown deadlines'),
    q.toggle('storage_needed', 'Storage needed'),
    q.textarea('milestones', 'Coordination milestones'),
    q.textarea('customer_resources', 'What you are providing yourself'),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'multi_location', label: 'More than one location' },
    { id: 'multi_day', label: 'Runs across several days' },
    { id: 'subcontracted', label: 'Needs unconfirmed subcontractors' },
  ],
  quoteTemplate: ['Project management fee', 'Transport (per trip)', 'Loading / unloading crews', 'Storage', 'Site survey', 'Return logistics'],
  readiness: ['Every component priced', 'Capacity, routes and time windows resolved'],
}
