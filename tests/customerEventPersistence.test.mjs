import { test } from 'node:test'
import assert from 'node:assert/strict'
import { savedContextFor, planFromSaved, serviceRowsForPlan, staleServiceIds } from '../src/customer/lib/eventPlanSnapshot.js'

const occasion = { id: 'birthday-party', where: 'ask' }

test('account snapshot preserves event choice, venue facilities and the event location', () => {
  const place = { area: 'Vijayanagar', city: 'Mysuru', lat: 12.3, lng: 76.6, address: 'Vijayanagar, Mysuru' }
  const context = savedContextFor(occasion, { catering_food: 'need' }, {
    date: '2026-12-12',
    time: '18:00',
    hours: 4,
    guests: 80,
    venue: 'have',
    venueChoice: 'restaurant',
    venueKind: 'dining',
    venueOther: '',
    budget: '1l-1.5l',
    context: { venueProvides: ['sound'], formats: ['meal'] },
  }, place, {
    'birthday-party:venue': { venue_type: ['lawn_garden'], facilities: ['power_backup'] },
    'birthday-party:catering_food': { $ways: ['cater'], $studio: { menuId: 'family_feast', name: 'Family Feast' }, $studioDiet: 'veg', $guests: 80 },
    'another-event:photography': { styles: ['candid'] },
  })
  assert.equal(context.venueType, 'restaurant')
  assert.equal(context.venueChoice, 'restaurant')
  assert.equal(context.venueKind, 'dining')
  assert.equal(context.budgetChoice, '1l-1.5l')
  assert.deepEqual(context.eventPlace, place)
  assert.deepEqual(context.$serviceNeeds, {
    venue: { venue_type: ['lawn_garden'], facilities: ['power_backup'] },
    catering_food: { $ways: ['cater'], $studio: { menuId: 'family_feast', name: 'Family Feast' }, $studioDiet: 'veg', $guests: 80 },
  })
  assert.deepEqual(context.added, ['catering_food'])
})

test('saved plan rehydrates venue, event place, service decisions and context', () => {
  const place = { area: 'Vijayanagar', city: 'Mysuru', lat: 12.3, lng: 76.6 }
  const restored = planFromSaved({
    occasion_id: 'birthday-party',
    context: {
      date: '2026-12-12', time: '18:00', hours: 4, guests: 80,
      venueType: 'restaurant', venueBooked: true, venueChoice: 'restaurant',
      venueKind: 'dining', venueOther: '', budgetChoice: '1l-1.5l',
      venueProvides: ['sound'], eventPlace: place,
      $serviceNeeds: {
        venue: { venue_type: ['resort'], facilities: ['power_backup'] },
        catering_food: { $ways: ['cook'], $studio: { menuId: 'southern_thali', name: 'Southern Thali' }, $studioDiet: 'jain' },
      },
    },
    event_plan_services: [
      { trade_id: 'catering_food', decision: 'selected' },
      { trade_id: 'photography', decision: 'arranged' },
      { trade_id: 'videography', decision: 'removed' },
      { trade_id: 'dj_music', decision: 'later' },
      { trade_id: 'sound_av', decision: 'recommended' },
    ],
  })
  assert.equal(restored.event.venueChoice, 'restaurant')
  assert.equal(restored.event.venueKind, 'dining')
  assert.equal(restored.event.budget, '1l-1.5l')
  assert.equal(restored.event.context.venueType, 'restaurant')
  assert.deepEqual(restored.place, place)
  assert.deepEqual(restored.needs, {
    'birthday-party:venue': { venue_type: ['resort'], facilities: ['power_backup'] },
    'birthday-party:catering_food': { $ways: ['cook'], $studio: { menuId: 'southern_thali', name: 'Southern Thali' }, $studioDiet: 'jain' },
  })
  assert.deepEqual(restored.picks, {
    catering_food: 'need', photography: 'have', videography: 'skip', dj_music: 'later',
  })
})

test('legacy saved home plans remain a home event when resumed', () => {
  const restored = planFromSaved({
    occasion_id: 'birthday-party',
    context: { venueType: 'home', guests: 20 },
    event_plan_services: [],
  })
  assert.equal(restored.event.venueChoice, 'home')
  assert.equal(restored.event.venue, 'have')
  assert.equal(restored.event.context.venueType, 'home')
})

test('legacy saved venue plans without a type still recover booked vs not booked', () => {
  assert.equal(planFromSaved({ occasion_id: 'birthday-party', context: { venueBooked: true } }).event.venueChoice, 'have')
  assert.equal(planFromSaved({ occasion_id: 'birthday-party', context: {} }).event.venueChoice, 'need')
})

test('autosave preserves existing booking-line and master links after checkout removes the basket line', () => {
  const rows = serviceRowsForPlan('plan-1', {
    photography: 'CORE',
    catering_food: 'CONDITIONAL',
  }, {
    photography: 'need',
    catering_food: 'need',
  }, [], [
    { trade_id: 'photography', vendor_service_id: 'master-1', booking_line_id: 'booking-line-1' },
  ])
  const photo = rows.find(row => row.trade_id === 'photography')
  assert.equal(photo.vendor_service_id, 'master-1')
  assert.equal(photo.booking_line_id, 'booking-line-1')
  assert.equal(rows.find(row => row.trade_id === 'catering_food').booking_line_id, null)
})

test('a newly selected master replaces the saved master without dropping a booking link', () => {
  const rows = serviceRowsForPlan('plan-1', { photography: 'CORE' }, { photography: 'need' }, [
    { tradeId: 'photography', serviceId: 'master-2' },
  ], [
    { trade_id: 'photography', vendor_service_id: 'master-1', booking_line_id: 'booking-line-1' },
  ])
  assert.equal(rows[0].vendor_service_id, 'master-2')
  assert.equal(rows[0].booking_line_id, 'booking-line-1')
})


test('autosave removes a previously selected optional service when the customer deselects it', () => {
  const previous = [
    { trade_id: 'photography', decision: 'selected', recommendation_status: 'OPTIONAL', booking_line_id: null },
    { trade_id: 'catering_food', decision: 'selected', recommendation_status: 'CORE', booking_line_id: null },
    { trade_id: 'sound_av', decision: 'selected', recommendation_status: 'OPTIONAL', booking_line_id: null },
  ]
  const rows = serviceRowsForPlan('plan-1', {
    photography: 'OPTIONAL',
    catering_food: 'CORE',
    sound_av: 'OPTIONAL',
  }, {
    catering_food: 'need',
  }, [], previous)

  assert.deepEqual(rows.map(row => row.trade_id).sort(), ['catering_food'])
  assert.deepEqual(staleServiceIds(previous, rows).sort(), ['photography', 'sound_av'])
})

test('autosave retains a booked service even after the planning preference is cleared', () => {
  const previous = [
    {
      trade_id: 'photography',
      decision: 'selected',
      recommendation_status: 'CORE',
      vendor_service_id: 'master-1',
      booking_line_id: 'booking-line-1',
    },
    {
      trade_id: 'dj_music',
      decision: 'selected',
      recommendation_status: 'OPTIONAL',
      vendor_service_id: null,
      booking_line_id: null,
    },
  ]
  const rows = serviceRowsForPlan('plan-1', {
    photography: 'NOT_DEFAULT',
    dj_music: 'OPTIONAL',
  }, {}, [], previous)

  assert.equal(rows.length, 1)
  assert.equal(rows[0].trade_id, 'photography')
  assert.equal(rows[0].decision, 'selected')
  assert.equal(rows[0].vendor_service_id, 'master-1')
  assert.equal(rows[0].booking_line_id, 'booking-line-1')
  assert.deepEqual(staleServiceIds(previous, rows), ['dj_music'])
})
