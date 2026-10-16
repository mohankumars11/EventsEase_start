// Trade 20 — Passenger Transport (spec Part 9, Trade 20)
import { q, screen, catalogue } from './schema'
import { TRIP_PRICING } from './_trip'

export default {
  id: 'passenger_transport',
  serviceNoun: 'passenger transport',
  screens: [
    screen('profile', 'Your passenger transport', 'What you provide.', [
      q.multi('vehicle_services', 'What do you provide?', [
        'Cars', 'Premium cars', 'SUVs', 'Vans', 'Mini-buses', 'Buses', 'Shuttle service', 'Multi-vehicle guest transport',
      ], { required: true, other: true }),
      q.number('service_radius_km', 'Service area radius', { required: true, min: 5, max: 3000, suffix: 'km' }),
      q.single('driver_type', 'Drivers', ['Our own drivers', 'Contract drivers', 'Both'], { required: true }),
      q.toggle('airport_station', 'Flight / train coordination'),
    ]),
  ],
  catalogue: catalogue('vehicles', 'Your vehicles', 'vehicle', 'vehicles', [
    q.single('category', 'Vehicle', ['Sedan', 'Premium sedan', 'SUV', 'Luxury car', 'Tempo Traveller', 'Mini-bus', 'Bus', 'Vintage car'], { required: true, other: true }),
    q.number('seats', 'Passenger capacity', { required: true, min: 1, max: 80 }),
    q.number('bags', 'Luggage capacity (bags)', { min: 0, max: 100 }),
    q.multi('accessibility', 'Accessibility features', ['Wheelchair ramp', 'Low step', 'Child seat'], { other: true }),
    q.toggle('ac', 'Air-conditioned'),
    q.number('count', 'How many', { required: true, min: 1, max: 500 }),
    q.text('registration', 'Registration number (private)', { required: true, max: 15, private: true }),
    q.photos('photos', 'Photos', { min: 1, max: 4 }),
  ]),
  pricing: { ...TRIP_PRICING, kinds: [...TRIP_PRICING.kinds, 'per_unit'], unitLabels: { per_unit: ['per shuttle loop'] },
    fields: [...TRIP_PRICING.fields, q.money('extra_stop', 'Each extra stop'), q.money('extra_hour', 'Each extra hour')] },
  addons: [{ id: 'decoration', label: 'Car decoration', unit: 'per_vehicle' }, { id: 'child_seat', label: 'Child seat', unit: 'per_vehicle' }, { id: 'meet_greet', label: 'Meet & greet', unit: 'per_trip' }],
  resources: { model: 'vehicles', title: 'Vehicles & drivers', fields: [
    q.number('drivers', 'Drivers available', { required: true, min: 1, max: 500 }),
    q.number('turnaround_minutes', 'Turnaround between trips', { min: 0, max: 600, suffix: 'minutes' }),
  ] },
  requestFields: [
    q.text('pickup', 'Pickup', { required: true }), q.text('dropoff', 'Drop-off', { required: true }),
    q.time('arrive_by', 'Arrive by', { required: true }), q.toggle('return', 'Return journey'),
    q.number('passengers', 'Passengers', { required: true }), q.number('bags', 'Bags'),
    q.number('stops', 'Extra stops'), q.single('usage', 'Usage', ['Point to point', 'Hourly hire']),
    q.number('waiting_hours', 'Waiting', { suffix: 'hours' }), q.text('flight_train', 'Flight / train number'),
    q.toggle('child_seat', 'Child seat'),
  ],
  compliance: { conditional: [
    { doc: 'VER-TRADE-RC', always: true, blocksInstant: true }, { doc: 'VER-TRADE-INSURANCE', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-DL', always: true, blocksInstant: true }, { doc: 'VER-TRADE-PERMIT', flag: 'commercial_vehicle', always: true },
  ] },
  quoteTriggers: [{ id: 'multi_vehicle', label: 'Several vehicles across routes' }, { id: 'route_unresolved', label: 'Route cannot be priced' }],
  quoteTemplate: ['Vehicles', 'Distance / hours', 'Extra stops', 'Waiting', 'Parking & tolls', 'Night charge'],
  readiness: ['Vehicles and drivers verified', 'Seats fit the passengers', 'Vehicle and driver free for the whole window'],
}
