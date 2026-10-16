// Trade 16 — Loading & Unloading Crew (spec Part 9, Trade 16)
import { q, screen } from './schema'

export default {
  id: 'loading_unloading_crew',
  serviceNoun: 'loading crew',
  screens: [
    screen('profile', 'Your crew', 'What you handle and who you send.', [
      q.multi('work', 'Loading, unloading or both?', ['Loading', 'Unloading'], { required: true }),
      q.multi('materials', 'What kinds of materials do you handle?', ['Furniture', 'Event equipment', 'Cartons', 'Pallets', 'Fragile items', 'Heavy machinery', 'Decor'], { required: true, other: true }),
      q.multi('access', 'Access you can work with', ['Ground floor', 'Lift', 'Stairs', 'Long carry (50 m+)'], { required: true }),
      q.multi('tools', 'Lifting tools you bring', ['Trolleys', 'Pallet jack', 'Straps & blankets', 'Ramps'], { other: true }),
      q.number('max_item_kg', 'Heaviest single item you will lift', { required: true, min: 10, max: 2000, suffix: 'kg' }),
    ]),
    screen('crew', 'Crew configuration', 'How your crews are put together.', [
      q.number('workers', 'Workers available per day', { required: true, min: 1, max: 1000 }),
      q.multi('skills', 'Skills', ['General loading', 'Fragile handling', 'Assembly', 'Heavy equipment'], { other: true }),
      q.toggle('supervisor', 'Supervisor available'),
      q.number('min_crew', 'Minimum crew size', { required: true, min: 1, max: 100 }),
      q.number('min_paid_hours', 'Minimum paid hours', { required: true, min: 1, max: 12 }),
      q.multi('shifts', 'Shift options', ['Morning', 'Day', 'Evening', 'Night'], { required: true }),
      q.text('breaks', 'Breaks', { max: 60 }),
      q.multi('safety_equipment', 'Safety equipment', ['Gloves', 'Safety shoes', 'Helmets', 'Back belts'], { other: true }),
      q.single('travel', 'Crew travel', ['We arrange it', 'Customer arranges it', 'Charged separately'], { required: true }),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['per_staff_hour', 'per_staff_shift', 'fixed', 'per_unit', 'quote'],
    unitLabels: { per_unit: ['per load'] },
    fields: [
      q.money('min_charge', 'Minimum charge', { required: true }),
      q.money('extra_hour_rate', 'Each extra hour per worker'),
      q.money('extra_worker_rate', 'Each additional worker'),
      q.money('special_handling_fee', 'Special handling fee'),
      q.money('waiting_fee', 'Waiting per hour'),
      q.money('equipment_fee', 'Equipment charge'),
    ],
  },
  addons: [{ id: 'packing', label: 'Packing materials', unit: 'per_set' }, { id: 'assembly', label: 'Assembly / dismantling', unit: 'per_hour' }],
  resources: { model: 'staff', title: 'Crew availability', fields: [] },
  requestFields: [
    q.number('items', 'Items, cartons or pallets'), q.number('approx_kg', 'Approximate total weight', { suffix: 'kg' }),
    q.textarea('pickup_access', 'Pickup access'), q.textarea('destination_access', 'Destination access'),
    q.time('start', 'Start time'), q.time('finish', 'Expected finish'),
  ],
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'overweight', label: 'Overweight or dangerous load' }, { id: 'no_crew', label: 'Not enough crew or equipment for the slot' }],
  quoteTemplate: ['Crew (workers × hours)', 'Supervisor', 'Special handling', 'Equipment', 'Waiting'],
  readiness: ['Rates and minimums set', 'Crew and equipment free for the slot', 'Load within declared limits'],
}
