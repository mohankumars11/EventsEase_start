import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOOD_WAYS,
  RESTAURANT_KITCHEN,
  foodNeeds,
  isRestaurantOrderListing,
} from '../src/customer/data/visualCatalogue.js'

test('restaurant ordering is a distinct customer food choice', () => {
  assert.ok(FOOD_WAYS.some(x => x.id === 'caterer' && x.label === 'Hire a caterer'))
  assert.ok(FOOD_WAYS.some(x => x.id === 'cook' && x.label === 'Hire a cook'))
  assert.ok(FOOD_WAYS.some(x => x.id === 'restaurant' && x.label === 'Order from a restaurant'))
  assert.deepEqual(foodNeeds(['restaurant']).kitchen_type, [RESTAURANT_KITCHEN])
})

test('only explicitly restaurant-capable listings are eligible for restaurant orders', () => {
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: [RESTAURANT_KITCHEN] } }), true)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: RESTAURANT_KITCHEN } }), true)
  assert.equal(isRestaurantOrderListing({ facets: { kitchen_type: ['Catering service'] } }), false)
  assert.equal(isRestaurantOrderListing({ facets: { prep_location: ['At both locations'] } }), false)
  assert.equal(isRestaurantOrderListing({ facets: {} }), false)
  assert.equal(isRestaurantOrderListing(null), false)
})
