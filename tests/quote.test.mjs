/* The instant quote: a master's rate × what the customer asked, priced the way the engine prices it. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/quote.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({ entryPoints: [join(ROOT, 'src/customer/lib/quote.js')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const { asksFor, asLine, priceRange, quote, withQuotes } = await import(pathToFileURL(out).href)

const hourly = { serviceId: 'a', offers: [{ type: 'rule', key: 'hour', paise: 200000, minHours: 3, maxHours: 8, ref: { type: 'rule', key: 'hour' } }] }
const packaged = { serviceId: 'b', offers: [
  { type: 'package', paise: 1500000, hours: 6, label: 'Classic', ref: { type: 'package', key: 'classic', hours: 6 } },
  { type: 'package', paise: 900000, hours: 3, label: 'Essential', ref: { type: 'package', key: 'essential', hours: 3 } },
] }
const caterer = { serviceId: 'c', offers: [
  { type: 'plate', paise: 45000, minQty: 100, diet: 'veg', label: 'Veg feast', ref: { type: 'menu', key: 'veg' } },
  { type: 'plate', paise: 60000, minQty: 50, diet: 'non_veg', label: 'Biryani', ref: { type: 'menu', key: 'nv' } },
] }
const onRequest = { serviceId: 'd', offers: [] }

test('hourly: rate × hours, and their minimum applies', () => {
  assert.equal(quote(hourly, { hours: 4 }).paise, 800000)
  const q = quote(hourly, { hours: 2 })
  assert.equal(q.paise, 600000)
  assert.equal(q.hours, 3)
  assert.deepEqual(q.line.fromRef, { type: 'rule', key: 'hour' })
})

test('hourly: beyond their maximum there is no quote', () => {
  assert.equal(quote(hourly, { hours: 10 }), null)
})

test('package: the cheapest one that covers the hours', () => {
  assert.equal(quote(packaged, { hours: 3 }).paise, 900000)
  assert.equal(quote(packaged, { hours: 5 }).paise, 1500000)
  assert.equal(quote(packaged, { hours: 7 }), null)
  assert.equal(quote(packaged, { hours: 5 }).line.fromKind, 'package')
})

test('plates: rate × guests with the menu minimum, and the diet asked for', () => {
  assert.equal(quote(caterer, { guests: 200 }).paise, 45000 * 200)
  assert.equal(quote(caterer, { guests: 60 }).paise, 60000 * 60)
  assert.equal(quote(caterer, { guests: 200, diets: ['non_veg'] }).paise, 60000 * 200)
  assert.equal(quote(caterer, { guests: 60, diets: ['veg'] }).paise, 45000 * 100)
})

test('nothing asked → no quote; the list stays as it was', () => {
  assert.equal(quote(hourly, {}), null)
  const l = [hourly, onRequest]
  assert.equal(withQuotes(l, {}), l)
})

test('a priced master who cannot cover the ask drops out; price-on-request stays', () => {
  const out = withQuotes([hourly, packaged, onRequest], { hours: 10 })
  assert.deepEqual(out.map(p => p.serviceId), ['d'])
  const out2 = withQuotes([hourly, packaged, onRequest], { hours: 4 })
  assert.deepEqual(out2.map(p => p.serviceId), ['a', 'b', 'd'])
  assert.equal(priceRange(out2).text.replace(/\s/g, ''), '₹8,000–₹15,000')
})

test('which questions a list can price', () => {
  assert.deepEqual(asksFor('photography', [hourly, packaged]), { hours: true, guests: false })
  assert.deepEqual(asksFor('catering_food', [caterer]), { hours: false, guests: true })
})

test('the plan line carries what it was priced for', () => {
  const [p] = withQuotes([hourly], { hours: 2 })
  const l = asLine(p)
  assert.equal(l.fromPaise, 200000)
  assert.equal(l.fromKind, 'hour')
  assert.equal(l.askHours, 3)
})
