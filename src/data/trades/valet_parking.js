// Trade 30 — Valet Parking (spec Part 9, Trade 30)
import { q, screen } from './schema'

export default {
  id: 'valet_parking',
  serviceNoun: 'valet service',
  screens: [
    screen('profile', 'Your valet service', 'What you run on the day.', [
      q.multi('services', 'Services', ['Valet drivers', 'Parking management', 'Signage', 'Marshals', 'Supervisors', 'Digital / app ticketing', 'Paper ticketing'], { required: true }),
      q.number('valets', 'Valet drivers available', { required: true, min: 1, max: 1000 }),
      q.number('supervisors', 'Supervisors available', { required: true, min: 0, max: 200 }),
      q.number('cars_per_hour', 'Cars your team can take per hour at peak', { required: true, min: 5, max: 5000 }),
      q.toggle('insurance', 'Vehicle damage insurance'),
      q.textarea('customer_duties', 'What the host must provide', { hint: 'e.g. parking area within 500 m, key box' }),
    ]),
  ],
  catalogue: null,
  pricing: {
    kinds: ['per_staff_hour', 'per_staff_shift', 'event', 'quote'],
    fields: [
      q.number('min_valets', 'Minimum valets per booking', { required: true, min: 1, max: 50 }),
      q.money('overtime_per_hour', 'Overtime per valet per hour', { required: true }),
      q.money('supervisor_rate', 'Supervisor per shift'),
      q.money('signage_fee', 'Equipment / signage'),
      q.money('setup_fee', 'Setup'),
      q.money('transport_fee', 'Team transport'),
    ],
  },
  addons: [{ id: 'umbrella', label: 'Umbrella escort', unit: 'per_staff' }, { id: 'digital_tickets', label: 'Digital ticketing', unit: 'per_event' }],
  resources: { model: 'staff', title: 'Valets on roster', fields: [] },
  requestFields: [
    q.text('venue', 'Venue'), q.time('arrival_start', 'Arrivals start'), q.time('end', 'Service ends'),
    q.number('vehicles', 'Expected vehicles'), q.number('spaces', 'Parking spaces available'), q.number('peak_per_hour', 'Peak arrivals per hour'),
  ],
  compliance: { conditional: [
    { doc: 'VER-TRADE-DL', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-INSURANCE', when: { q: 'insurance', truthy: true } },
  ] },
  quoteTriggers: [{ id: 'over_volume', label: 'Peak arrivals above your team rate' }, { id: 'no_parking', label: 'Parking area not confirmed' }],
  quoteTemplate: ['Valets × hours', 'Supervisors', 'Overtime', 'Signage', 'Setup', 'Transport'],
  readiness: ['Driving licences verified', 'Minimum staffing and overtime set', 'Peak volume within capacity'],
}
