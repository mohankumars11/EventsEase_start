// Trade 31 — Venue (spec Part 9, Trade 31)
import { q, screen, catalogue } from './schema'

export default {
  id: 'venue',
  serviceNoun: 'venue',
  screens: [
    screen('profile', 'Your venue', 'The property as a whole.', [
      q.text('venue_name', 'Venue name', { required: true, max: 80 }),
      q.single('venue_type', 'Venue type', ['Banquet hall', 'Convention centre', 'Lawn / garden', 'Resort', 'Hotel', 'Farmhouse', 'Rooftop', 'Community hall', 'Temple hall'], { required: true, other: true }),
      q.photos('photos', 'Photos', { required: true, min: 5, max: 30 }),
      q.url('video', 'Walkthrough video link'),
      q.number('max_capacity', 'Maximum capacity', { required: true, min: 10, max: 50000, suffix: 'guests' }),
      q.number('recommended_capacity', 'Recommended capacity', { required: true, min: 10, max: 50000, suffix: 'guests' }),
      q.multi('accessibility', 'Accessibility', ['Step-free entry', 'Lift', 'Accessible toilet', 'Wheelchair available'], { other: true }),
      q.number('parking', 'Parking spaces', { required: true, min: 0, max: 10000 }),
      q.number('rooms', 'Rooms on site', { min: 0, max: 1000 }),
      q.multi('facilities', 'Included facilities', ['Furniture', 'Power backup', 'Air-conditioning', 'Bridal room', 'Kitchen', 'Basic sound', 'Stage'], { other: true }),
    ]),
    screen('rules', 'House rules', 'What customers must know before they book.', [
      q.single('catering_rule', 'Catering', ['In-house only', 'Outside caterers allowed', 'Outside allowed with a fee', 'Approved list only'], { required: true }),
      q.money('outside_catering_fee', 'Outside catering fee', { showWhen: { q: 'catering_rule', in: ['outside_allowed_with_a_fee'] } }),
      q.single('decor_rule', 'Decoration', ['Any decorator', 'Approved list only', 'In-house only'], { required: true }),
      q.textarea('decor_restrictions', 'Decoration restrictions (fire, nails, confetti…)'),
      q.time('sound_cutoff', 'Amplified sound must stop by', { required: true }),
      q.toggle('alcohol', 'Alcohol permitted'),
      q.number('setup_hours', 'Setup time before the event', { required: true, min: 0, max: 48, suffix: 'hours' }),
      q.number('cleanup_hours', 'Cleanup time after', { required: true, min: 0, max: 24, suffix: 'hours' }),
      q.single('setup_charging', 'When does setup / cleanup time start being charged?', ['Never — included', 'Beyond the included hours', 'Always charged'], { required: true }),
    ]),
  ],
  catalogue: catalogue('spaces', 'Your spaces', 'space', 'spaces', [
    q.text('name', 'Space name', { required: true, max: 60 }),
    q.single('setting', 'Indoor / outdoor', ['Indoor', 'Outdoor', 'Semi-covered'], { required: true }),
    q.number('capacity', 'Capacity', { required: true, min: 5, max: 50000, suffix: 'guests' }),
    q.dimensions('size', 'Dimensions', { unit: 'ft' }),
    q.multi('layouts', 'Layouts', ['Theatre', 'Round tables', 'Cluster', 'Classroom', 'U-shape', 'Cocktail', 'Floating buffet'], { required: true }),
    q.multi('slots', 'Bookable slots', ['Morning', 'Evening', 'Half-day', 'Full-day'], { required: true }),
    q.single('combinable', 'Booking', ['Separately only', 'Separately or combined', 'Only with another space'], { required: true }),
    q.multi('amenities', 'Amenities', ['AC', 'Stage', 'Projector', 'Green room', 'Dance floor'], { other: true }),
    q.money('base_rate', 'Base rate', { required: true }),
    q.number('included_hours', 'Hours included', { required: true, min: 1, max: 48 }),
    q.photos('photos', 'Photos', { min: 1, max: 8 }),
  ]),
  pricing: {
    kinds: ['space', 'hour', 'half_day', 'full_day', 'event', 'quote'],
    fields: [
      q.money('deposit', 'Security deposit (refundable)', { required: true }),
      q.money('overtime_per_hour', 'Overtime per hour', { required: true }),
      q.money('extra_setup_hour', 'Each extra setup / cleanup hour'),
    ],
    note: 'Each space has its own base rate and included hours. Deposits are never revenue.',
  },
  addons: [
    { id: 'rooms', label: 'Rooms', unit: 'per_item' }, { id: 'generator', label: 'Full generator backup', unit: 'per_event' },
    { id: 'valet', label: 'Valet', unit: 'per_event' }, { id: 'housekeeping', label: 'Extra housekeeping', unit: 'per_staff' },
  ],
  resources: { model: 'spaces', title: 'Spaces & slots', fields: [] },
  requestFields: [q.number('guests', 'Guests', { required: true }), q.single('layout', 'Layout', ['Theatre', 'Round tables', 'Cocktail', 'Floating buffet'])],
  compliance: { conditional: [
    { doc: 'VER-TRADE-PROPERTY', always: true, blocksInstant: true },
    { doc: 'VER-TRADE-FIRE', always: true },
  ] },
  quoteTriggers: [{ id: 'over_capacity', label: 'Guests above the space capacity' }, { id: 'combined_spaces', label: 'Several spaces combined' }],
  quoteTemplate: ['Space × slot', 'Overtime', 'Extra setup hours', 'Rooms', 'Facilities', 'Deposit (refundable)'],
  readiness: ['Property document verified', 'Every space priced with included hours', 'Admin review passed'],
}
