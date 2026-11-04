import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RESTAURANT_KITCHEN,
  isRestaurantOrderListing,
} from '../src/customer/lib/restaurantMatching.js'

test('restaurant orders match only explicitly declared restaurant-capable listings', () => {
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: [RESTAURANT_KITCHEN] } }), true)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: RESTAURANT_KITCHEN } }), true)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: ['Catering service'] } }), false)
  assert.equal(isRestaurantOrderListing({ facets: { prep_location: ['At both locations'] } }), false)
  assert.equal(isRestaurantOrderListing({ facets: {} }), false)
  assert.equal(isRestaurantOrderListing(null), false)
})

test('restaurant matching fails closed when capability data is absent', () => {
  assert.equal(isRestaurantOrderListing({}), false)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: null } }), false)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: [] } }), false)
})
