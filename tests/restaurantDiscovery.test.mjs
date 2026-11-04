import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('restaurant is not represented as a catering kitchen subtype', () => {
  const catalogue = source('../src/customer/data/visualCatalogue.js')
  const menu = source('../src/customer/screens/MenuStudio.jsx')
  assert.doesNotMatch(catalogue, /id:\s*['"]restaurant['"]/)
  assert.doesNotMatch(menu, /isRestaurantOrderListing|ctx\.way\s*===\s*['"]restaurant['"]/)
})

test('restaurant ordering has its own customer route and sourcing screen', () => {
  const app = source('../src/customer/CustomerApp.jsx')
  const screen = source('../src/customer/screens/RestaurantOrder.jsx')
  const menu = source('../src/customer/screens/MenuStudio.jsx')
  assert.match(app, /\/o\/:occasionId\/restaurants/)
  assert.match(menu, /data-restaurant-order-link/)
  assert.match(screen, /separate restaurant order/)
  assert.match(screen, /does not place an order or confirm a price/)
  assert.match(screen, /data-source-restaurant/)
})
