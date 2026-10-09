// Shared trip pricing and booking-time questions for the vehicle trades
// (Mini Truck / Pickup, Medium / Large Goods Vehicle, Passenger Transport,
// Transportation). Each trade still has its own profile and vehicle fields.
import { q } from './schema'

export const TRIP_PRICING = {
  kinds: ['per_trip', 'per_km', 'vehicle_hour', 'vehicle_day', 'fixed', 'quote'],
  fields: [
    q.money('min_fare', 'Minimum fare', { required: true }),
    q.number('included_km', 'Kilometres included in the base fare', { min: 0, max: 1000, suffix: 'km' }),
    q.money('per_km_beyond', 'Each km beyond that'),
    q.money('waiting_per_hour', 'Waiting per hour', { required: true }),
    q.money('loading_fee', 'Loading / unloading'),
    q.single('tolls', 'Tolls & parking', ['Included', 'Charged at actuals (shown before payment)', 'Customer pays directly'], { required: true }),
    q.money('night_charge', 'Night charge (only if you charge it)'),
  ],
  note: 'Distance is the road distance between the stops in order. If a route or charge cannot be worked out from these rules, the request becomes a custom quote.',
}

export const TRIP_REQUEST = [
  q.text('pickup', 'Pickup address', { required: true }),
  q.text('dropoff', 'Delivery address', { required: true }),
  q.time('pickup_window', 'Pickup time', { required: true }),
  q.toggle('return', 'Return journey'),
  q.number('stops', 'Extra stops', { min: 0, max: 20 }),
  q.text('load', 'What is being moved'),
  q.number('weight_kg', 'Approximate weight', { suffix: 'kg' }),
  q.number('waiting_hours', 'Expected waiting', { suffix: 'hours' }),
  q.textarea('access', 'Access restrictions'),
]
