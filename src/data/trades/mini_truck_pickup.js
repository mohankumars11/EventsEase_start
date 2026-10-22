// Trade 19 — Mini Truck / Pickup (spec Part 9, Trade 19)
import { q, screen, catalogue } from './schema'
import { TRIP_PRICING, TRIP_REQUEST } from './_trip'

export default {
  id: 'mini_truck_pickup',
  serviceNoun: 'mini truck service',
  screens: [
    screen('profile', 'Your mini trucks', 'Where you go and what you carry.', [
      q.number('service_radius_km', 'How far from your base will you take a trip?', { required: true, min: 2, max: 500, suffix: 'km' }),
      q.multi('loads', 'What do your mini trucks usually carry?', ['Event equipment', 'Furniture', 'Decor', 'Cartons', 'Food supplies', 'Household',
        'Catering vessels', 'Flowers', 'Sound & lighting gear', 'Return gifts', 'Water cans & beverages', 'Chairs & tables'], { required: true, other: true }),
      q.toggle('helpers', 'You can send helpers for loading'),
      q.toggle('same_day', 'You take same-day, on-demand trips'),
      q.single('notice', 'Shortest notice you need', ['30 minutes', '1 hour', '3 hours', 'Next day', '2 hours', '6 hours'], { required: true }),
      /* Each of these decides whether a trip request can be confirmed as
         booked or has to come back as a question. */
      q.toggle('night_trips', 'Night trips (after 10 pm)'),
      q.toggle('multi_stop', 'Multi-stop trips (pick up from several shops)'),
      q.toggle('outstation', 'Outstation trips'),
      q.toggle('fragile', 'You handle fragile loads (glass, cakes, decor)'),
    ]),
  ],
  catalogue: catalogue('vehicles', 'Your vehicles', 'vehicle', 'vehicles', [
    q.single('category', 'Vehicle', ['3-wheeler', 'Tata Ace / 7 ft', '8 ft pickup', '9 ft pickup', '14 ft LCV',
      'Electric 3-wheeler', 'Mahindra Bolero pickup', 'Ashok Leyland Dost', 'Tata Intra', 'Mahindra Supro / Maxx'], { required: true, other: true }),
    q.number('payload_kg', 'Load capacity', { required: true, min: 100, max: 5000, suffix: 'kg' }),
    q.dimensions('load_dimensions', 'Load space', { unit: 'ft', required: true }),
    q.single('body', 'Body', ['Open', 'Closed', 'Container (closed box)', 'Tarpaulin-covered', 'Refrigerated'], { required: true, other: true }),
    q.number('count', 'How many', { required: true, min: 1, max: 200 }),
    q.toggle('driver_included', 'Driver included'),
    q.text('registration', 'Registration number (private)', { required: true, max: 15, private: true }),
    q.text('access', 'Loading access requirements', { max: 80 }),
    q.photos('photos', 'Vehicle photos', { min: 1, max: 4 }),
  ]),
  pricing: TRIP_PRICING,
  addons: [{ id: 'helper', label: 'Helper / loading', unit: 'per_staff' }, { id: 'return_trip', label: 'Return journey', unit: 'per_trip' }],
  resources: { model: 'vehicles', title: 'Vehicles & drivers', fields: [q.number('drivers', 'Drivers available', { required: true, min: 1, max: 200 })] },
  requestFields: TRIP_REQUEST,
  compliance: { conditional: [
    { doc: 'VER-TRADE-RC', always: true, blocksInstant: true }, { doc: 'VER-TRADE-INSURANCE', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-DL', always: true, blocksInstant: true },
  ] },
  quoteTriggers: [{ id: 'route_unresolved', label: 'Route cannot be priced' }, { id: 'over_capacity', label: 'Load above capacity' }],
  quoteTemplate: ['Trip fare', 'Distance', 'Helpers', 'Waiting', 'Tolls', 'Return journey'],
  readiness: ['Vehicle and driver verified', 'Capacity and route fit', 'Vehicle and driver free'],
}
