import { test } from 'node:test'
import assert from 'node:assert/strict'
import { savedContextFor, planFromSaved } from '../src/customer/lib/eventPlanSnapshot.js'

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
  }, place)
  assert.equal(context.venueType, 'restaurant')
  assert.equal(context.venueChoice, 'restaurant')
  assert.equal(context.venueKind, 'dining')
  assert.equal(context.budgetChoice, '1l-1.5l')
  assert.deepEqual(context.eventPlace, place)
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
