import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  VENUE_EXPERIENCES,
  VENUE_TYPE_IDS,
  toggleVenueExperience,
  experienceSelected,
} from '../src/customer/data/venueExperiences.js'

test('venue experience groups map only to canonical venue listing answers', () => {
  assert.ok(VENUE_EXPERIENCES.length >= 8)
  assert.equal(new Set(VENUE_TYPE_IDS).size, VENUE_TYPE_IDS.length)
  for (const id of [
    'lawn_garden', 'resort', 'hotel', 'farmhouse', 'villa',
    'banquet_hall', 'kalyana_mantapa', 'heritage_property_palace',
    'rooftop', 'beach_property', 'auditorium', 'open_air_amphitheatre',
  ]) assert.ok(VENUE_TYPE_IDS.includes(id), `missing canonical venue type: ${id}`)
})

test('venue experience selection adds and removes all canonical types in a group', () => {
  const one = toggleVenueExperience([], 'resorts_hotels')
  assert.deepEqual(one.sort(), ['hotel', 'resort'])
  assert.equal(experienceSelected(one, 'resorts_hotels'), true)

  const two = toggleVenueExperience(one, 'farmhouses_villas')
  assert.deepEqual(two.sort(), ['farmhouse', 'hotel', 'resort', 'villa'])

  const three = toggleVenueExperience(two, 'resorts_hotels')
  assert.deepEqual(three.sort(), ['farmhouse', 'villa'])
  assert.equal(experienceSelected(three, 'resorts_hotels'), false)
})

test('unknown venue experience ids leave saved preferences untouched', () => {
  const selected = ['lawn_garden']
  assert.deepEqual(toggleVenueExperience(selected, 'parks_and_lakes'), selected)
})
