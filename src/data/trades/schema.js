/**
 * The questionnaire language every trade file is written in.
 *
 * A trade file describes WHAT to ask; the shared renderer decides HOW it
 * looks (chips, toggles, steppers, sheets — never native selects or radios).
 *
 * Question:
 *   { id, label, type, hint?, options?, other?, required?, min?, max?,
 *     maxSelect?, unit?, suffix?, showWhen?, placeholder? }
 *   type: single | multi | number | money | toggle | text | textarea |
 *         dimensions | photos | time | date | url
 *   showWhen: { q: 'otherQuestionId', in: [...] } | { q, truthy: true } |
 *             { q, includes: 'optionId' }  (for multi)
 *
 * Screen:  { id, title, sub?, questions: [...] }
 * Catalogue (menus, products, rental items, vehicles, spaces…):
 *   { key, title, sub?, noun, nounPlural, min, fields: [...questions] }
 *
 * Pricing rule kinds are the ones the server knows how to price (see
 * RULE_KINDS). A trade lists the kinds that make sense for it; every rule
 * a partner enables must end with an exact amount, unit and limits.
 */

const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const opts = list => (list ?? []).map(o => (typeof o === 'string' ? { id: slug(o), label: o } : o))

const make = type => (id, label, a = {}, b = {}) => {
  const hasOptions = Array.isArray(a)
  return { id, label, type, ...(hasOptions ? { options: opts(a), ...b } : a) }
}

export const q = {
  single: make('single'),
  multi: make('multi'),
  number: make('number'),
  money: make('money'),
  toggle: make('toggle'),
  text: make('text'),
  textarea: make('textarea'),
  dimensions: make('dimensions'),
  photos: make('photos'),
  time: make('time'),
  date: make('date'),
  url: make('url'),
}

export const screen = (id, title, sub, questions) => ({ id, title, sub, questions })
export const catalogue = (key, title, noun, nounPlural, fields, extra = {}) =>
  ({ key, title, noun, nounPlural, fields, min: 1, ...extra })

/**
 * Pricing rule kinds and what the engine does with them.
 *   amount is always integer paise; `rate` is what the rule's price mode says
 *   (take-home by default, customer price when price_mode = 'customer').
 */
export const RULE_KINDS = {
  hour:            { label: 'Per hour',            unit: 'hour',    qty: 'hours' },
  session:         { label: 'Per session',         unit: 'session', qty: 'sessions' },
  event:           { label: 'Per event',           unit: 'event',   qty: 'events' },
  half_day:        { label: 'Half-day',            unit: 'half_day', qty: 'days' },
  full_day:        { label: 'Full-day',            unit: 'day',     qty: 'days' },
  multi_day:       { label: 'Multi-day',           unit: 'day',     qty: 'days' },
  per_person:      { label: 'Per person',          unit: 'person',  qty: 'people' },
  per_unit:        { label: 'Per unit',            unit: 'unit',    qty: 'units' },
  per_guest:       { label: 'Per guest / plate',   unit: 'guest',   qty: 'guests' },
  per_staff_hour:  { label: 'Per staff per hour',  unit: 'staff_hour', qty: 'staff×hours' },
  per_staff_shift: { label: 'Per staff per shift', unit: 'staff_shift', qty: 'staff×shifts' },
  per_staff_day:   { label: 'Per staff per day',   unit: 'staff_day', qty: 'staff×days' },
  per_trip:        { label: 'Per trip',            unit: 'trip',    qty: 'trips' },
  per_km:          { label: 'Per kilometre',       unit: 'km',      qty: 'km' },
  vehicle_hour:    { label: 'Per vehicle per hour', unit: 'vehicle_hour', qty: 'hours' },
  vehicle_day:     { label: 'Per vehicle per day', unit: 'vehicle_day', qty: 'days' },
  catalogue:       { label: 'From your catalogue', unit: 'item',    qty: 'items' },
  rental:          { label: 'Rental rate per item', unit: 'item_period', qty: 'items×periods' },
  space:           { label: 'Per space / slot',    unit: 'slot',    qty: 'slots' },
  capacity_period: { label: 'Per capacity per period', unit: 'capacity_period', qty: 'units×periods' },
  fixed:           { label: 'Fixed package / project fee', unit: 'package', qty: 'packages' },
  percentage:      { label: 'Percentage of an agreed base', unit: 'percent', qty: 'base' },
  quote:           { label: 'Custom Quote only',   unit: 'quote',   qty: '—' },
}

export const ADDON_UNITS = [
  'per_event', 'per_session', 'per_hour', 'per_day', 'per_person', 'per_guest', 'per_item',
  'per_piece', 'per_set', 'per_box', 'per_kg', 'per_km', 'per_trip', 'per_staff', 'per_counter', 'per_vehicle',
]

/** Shared option lists, reused only where the meaning is genuinely the same. */
export const EVENT_TYPES = ['Weddings', 'Engagements', 'Receptions', 'Corporate events', 'Private parties',
  'Birthdays', 'Festivals', 'Religious functions', 'College events', 'Exhibitions']

export const YES_NO = ['Yes', 'No']

export { slug, opts }
