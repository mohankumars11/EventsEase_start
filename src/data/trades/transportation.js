// Trade 28 — Transportation (spec Part 9, Trade 28)
// General transport and coordination. Partners who really run mini trucks,
// goods vehicles or passenger cars are redirected to those trades.
import { q, screen } from './schema'
import { TRIP_PRICING } from './_trip'

export default {
  id: 'transportation',
  serviceNoun: 'transportation',
  screens: [
    screen('scope', 'What kind of transport do you run?', 'If you mainly operate one vehicle type, list it under its own trade.', [
      q.single('service_type', 'Service type', [
        'Guest transport coordination', 'Item movement', 'Scheduled shuttle coordination',
        'I run mini trucks / pickups', 'I run medium / large goods vehicles', 'I run cars / buses for passengers',
        'Other',
      ], { required: true }),
      q.textarea('other_description', 'Describe it', { required: true, showWhen: { q: 'service_type', in: ['other'] } }),
      q.single('operation', 'How do you operate?', ['Our own vehicles', 'We coordinate third-party operators', 'Both'], { required: true }),
      q.textarea('routes', 'Areas / routes you cover', { required: true }),
      q.number('vehicles', 'Vehicles you can arrange', { required: true, min: 1, max: 1000 }),
    ]),
  ],
  catalogue: null,
  redirects: {
    i_run_mini_trucks_pickups: 'mini_truck_pickup',
    i_run_medium_large_goods_vehicles: 'medium_large_goods_vehicle',
    i_run_cars_buses_for_passengers: 'passenger_transport',
  },
  pricing: { ...TRIP_PRICING, kinds: ['per_trip', 'per_km', 'vehicle_hour', 'vehicle_day', 'fixed', 'percentage', 'quote'],
    unitLabels: { fixed: ['per route'], percentage: ['coordination fee'] } },
  addons: [{ id: 'coordinator', label: 'On-site transport coordinator', unit: 'per_day' }],
  resources: { model: 'vehicles', title: 'Vehicles you can arrange', fields: [] },
  requestFields: [
    q.text('origin', 'Origin', { required: true }), q.text('destination', 'Destination', { required: true }),
    q.textarea('schedule', 'Schedule'), q.number('passengers', 'Passengers'), q.text('load', 'Load'),
    q.number('stops', 'Stops'), q.number('waiting_hours', 'Waiting', { suffix: 'hours' }), q.toggle('return', 'Return'),
  ],
  compliance: { conditional: [
    { doc: 'VER-TRADE-RC', when: { q: 'operation', in: ['our_own_vehicles', 'both'] }, blocksInstant: true },
    { doc: 'VER-TRADE-INSURANCE', when: { q: 'operation', in: ['our_own_vehicles', 'both'] }, blocksInstant: true },
  ] },
  quoteTriggers: [{ id: 'multi_route', label: 'Multiple routes' }, { id: 'coordination_unpriced', label: 'Coordination not covered by your rates' }],
  quoteTemplate: ['Routes / trips', 'Distance', 'Vehicles', 'Coordination fee', 'Waiting', 'Tolls'],
  readiness: ['Service type is not a specialised vehicle trade', 'Routes and rates set'],
}
