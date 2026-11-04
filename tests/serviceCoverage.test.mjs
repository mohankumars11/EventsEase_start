import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SERVICE_COVERAGE, addonKeysFor, coverageSelection, durationHours } from '../src/customer/lib/serviceCoverage.js'

test('service coverage durations are occasion-facing scopes, not partner tier names', () => {
  assert.deepEqual(SERVICE_COVERAGE.photography, ['2 hours', '4 hours', '6 hours + printed album'])
  assert.deepEqual(SERVICE_COVERAGE.videography, ['2 hours', '4 hours', '6 hours'])
  assert.deepEqual(SERVICE_COVERAGE.dj_music, ['2 hours', '3 hours', '4 hours'])
  assert.deepEqual(SERVICE_COVERAGE.anchor_mc, ['2 hours', '4 hours', '6 hours + custom script'])
  assert.deepEqual(SERVICE_COVERAGE.live_entertainment, ['1 hour', '2 hours', '3 hours'])
  assert.deepEqual(SERVICE_COVERAGE.bridal_makeup_hair, ['1 hour', '2 hours', '3 hours'])
  assert.deepEqual(SERVICE_COVERAGE.mehendi_artist, ['1 hour', '2 hours', '3 hours'])
})

test('coverage labels are converted into numeric hours for matching', () => {
  assert.equal(durationHours('6 hours + printed album'), 6)
  assert.equal(durationHours('2 hours'), 2)
  assert.equal(durationHours(4), 4)
  assert.equal(durationHours('Full day'), null)
})

test('photography six-hour coverage freezes the printed album in the request', () => {
  assert.deepEqual(coverageSelection('photography', '6 hours + printed album', ['Drone']), {
    coverage: '6 hours + printed album', hours: 6, extras: ['Drone', 'Printed album'],
  })
  assert.deepEqual(coverageSelection('photography', '4 hours', ['Drone', 'Printed album']), {
    coverage: '4 hours', hours: 4, extras: ['Drone'],
  })
})

test('anchor six-hour coverage freezes custom script writing in the request', () => {
  assert.deepEqual(coverageSelection('anchor_mc', '6 hours + custom script', []), {
    coverage: '6 hours + custom script', hours: 6, extras: ['Custom script writing'],
  })
})

test('only canonical add-on ids are sent to the server; unsupported requests remain in the customer brief', () => {
  assert.deepEqual(addonKeysFor('photography', ['Printed album', 'Drone', 'Photo booth']), ['album', 'drone'])
  assert.deepEqual(addonKeysFor('videography', ['Drone', 'Live streaming']), ['drone', 'streaming'])
  assert.deepEqual(addonKeysFor('anchor_mc', ['Custom script writing']), [])
})
