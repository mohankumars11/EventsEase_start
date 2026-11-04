import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCustomerVisibleListing } from '../src/lib/customerListingVisibility.js'

test('only an explicitly non-synthetic vendor listing is visible to customers', () => {
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: false, profile: {}, answers: {} }), true)
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: true, profile: {}, answers: {} }), false)
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: undefined, profile: {}, answers: {} }), false)
})

test('a synthetic marker in the published listing still hides the listing', () => {
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: false, profile: { synthetic: true } }), false)
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: false, answers: { synthetic: true } }), false)
})

test('a real listing remains visible when optional profile and answer fields are absent', () => {
  assert.equal(isCustomerVisibleListing({ vendorIsSynthetic: false }), true)
})
