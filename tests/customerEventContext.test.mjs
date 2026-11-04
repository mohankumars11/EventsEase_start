import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contextFor } from '../src/customer/lib/eventContext.js'

const occasion = { id: 'birthday-party', where: 'ask' }

test('an explicit restaurant venue replaces a stale home venue type', () => {
  const ctx = contextFor(occasion, {}, {
    venue: 'have',
    venueChoice: 'restaurant',
    venueKind: 'dining',
    context: { venueType: 'home', venueProvides: ['sound'] },
  })
  assert.equal(ctx.venueType, 'restaurant')
  assert.equal(ctx.venueBooked, true)
  assert.deepEqual(ctx.venueProvides, ['sound'])
})

test('home, banquet and outdoor choices map to distinct venue types', () => {
  assert.equal(contextFor(occasion, {}, { venueChoice: 'home' }).venueType, 'home')
  assert.equal(contextFor(occasion, {}, { venueChoice: 'banquet' }).venueType, 'banquet')
  assert.equal(contextFor(occasion, {}, { venueChoice: 'outdoor' }).venueType, 'outdoor')
})

test('a dining venue kind is not incorrectly classified as a banquet', () => {
  assert.equal(contextFor(occasion, {}, { venueKind: 'dining' }).venueType, 'restaurant')
})

test('an unanswered or custom venue clears a stale inferred venue type', () => {
  assert.equal(contextFor(occasion, {}, {
    venueChoice: 'other',
    context: { venueType: 'home' },
  }).venueType, undefined)
  assert.equal(contextFor(occasion, {}, {
    venueChoice: 'need',
    context: { venueType: 'home' },
  }).venueType, undefined)
})

test('current venue choice takes precedence over an old venue kind', () => {
  assert.equal(contextFor(occasion, {}, {
    venueChoice: 'restaurant',
    venueKind: 'banquet',
  }).venueType, 'restaurant')
})

test('customer service decisions are rebuilt without retaining stale picks', () => {
  const ctx = contextFor(occasion, {
    catering_food: 'need',
    photography: 'have',
    videography: 'skip',
    dj_music: 'later',
  }, {
    context: {
      added: ['old_trade'],
      arranged: ['old_arranged'],
      excluded: ['old_excluded'],
      later: ['old_later'],
    },
  })
  assert.deepEqual(ctx.added, ['catering_food'])
  assert.deepEqual(ctx.arranged, ['photography'])
  assert.deepEqual(ctx.excluded, ['videography'])
  assert.deepEqual(ctx.later, ['dj_music'])
})

test('clearing a date, time or guest count clears the old value', () => {
  const ctx = contextFor(occasion, {}, {
    date: null,
    time: '',
    guests: null,
    hours: 4,
    context: { date: '2026-12-24', time: '18:00', guests: 40 },
  })
  assert.equal(ctx.date, undefined)
  assert.equal(ctx.time, undefined)
  assert.equal(ctx.guests, undefined)
  assert.equal(ctx.hours, 4)
})

test('an occasion with a fixed setting supplies its venue type only when no choice overrides it', () => {
  assert.equal(contextFor({ where: 'home' }, {}).venueType, 'home')
  assert.equal(contextFor({ where: 'home' }, {}, { venueChoice: 'outdoor' }).venueType, 'outdoor')
})
