// Trade 17 — Medium / Large Goods Vehicle (spec Part 9, Trade 17)
import { q, screen, catalogue } from './schema'
import { TRIP_PRICING, TRIP_REQUEST } from './_trip'

export default {
  id: 'medium_large_goods_vehicle',
  serviceNoun: 'goods vehicle service',
  screens: [
    screen('profile', 'Your goods vehicles', 'What you carry and how.', [
      q.multi('loads', 'Which loads do your trucks move?', ['Event equipment', 'Furniture', 'Staging & truss', 'Generators', 'Decor', 'Bulk materials', 'Machinery'], { required: true, other: true }),
      q.multi('handling', 'Special handling', ['Fragile', 'Over-dimension', 'Temperature-controlled', 'High-value'], { other: true }),
      q.multi('routes', 'Routes you run', ['Within the city', 'Intercity (same state)', 'Interstate'], { required: true }),
      q.single('permit_scope', 'Goods-carriage permit', ['State permit', 'National permit', 'Both'], { required: true }),
      q.number('service_radius_km', 'Furthest you will go for one booking', { required: true, min: 5, max: 3000, suffix: 'km' }),
      q.toggle('part_load', 'You take part loads (shared truck)'),
    ]),
  ],
  catalogue: catalogue('vehicles', 'Your vehicles', 'vehicle', 'vehicles', [
    q.single('category', 'Vehicle type', ['14 ft truck', '17 ft truck', '19 ft truck', '22 ft truck', '24 ft container', '32 ft container', 'Trailer'], { required: true, other: true }),
    q.number('payload_kg', 'Load capacity', { required: true, min: 500, max: 50000, suffix: 'kg' }),
    q.dimensions('load_dimensions', 'Load space (L × W × H)', { unit: 'ft', required: true }),
    q.single('body', 'Body type', ['Open', 'Closed', 'Container', 'Flatbed'], { required: true }),
    q.multi('features', 'Loading features', ['Tail lift', 'Ramps', 'Tie-down points', 'GPS tracking'], { other: true }),
    q.toggle('driver_included', 'Driver included'),
    q.text('registration', 'Registration number (private)', { required: true, max: 15, private: true }),
    q.photos('photos', 'Vehicle photos', { min: 1, max: 4 }),
    q.number('count', 'How many of this vehicle', { required: true, min: 1, max: 500 }),
  ]),
  pricing: TRIP_PRICING,
  addons: [{ id: 'loading', label: 'Loading / unloading', unit: 'per_trip' }, { id: 'helper', label: 'Helper', unit: 'per_staff' }, { id: 'return_trip', label: 'Return journey', unit: 'per_trip' }],
  resources: { model: 'vehicles', title: 'Vehicles & drivers', fields: [q.number('drivers', 'Drivers available', { required: true, min: 1, max: 500 })] },
  requestFields: TRIP_REQUEST,
  compliance: { conditional: [
    { doc: 'VER-TRADE-RC', always: true, blocksInstant: true }, { doc: 'VER-TRADE-INSURANCE', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-DL', always: true, blocksInstant: true }, { doc: 'VER-TRADE-PERMIT', flag: 'commercial_vehicle', always: true },
  ] },
  quoteTriggers: [{ id: 'route_unresolved', label: 'Route or charges cannot be resolved' }, { id: 'over_payload', label: 'Load above vehicle capacity' }],
  quoteTemplate: ['Trip fare', 'Distance', 'Loading / unloading', 'Waiting', 'Tolls & permits', 'Return journey'],
  readiness: ['Vehicle and driver verified', 'Payload and route fit', 'Vehicle and driver free'],
}
