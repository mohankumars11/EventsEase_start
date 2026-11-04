import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/customerPlan.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: {
    contents: `export { needsFor } from './src/customer/state/PlanContext.jsx'
      export { OCCASION } from './src/customer/data/occasions.js'`,
    resolveDir: ROOT,
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
  loader: { '.js': 'jsx' },
})
const E = await import(pathToFileURL(out).href)
const occasion = E.OCCASION['first-birthday']

test('venue-provided services are covered in the occasion plan, not searched twice', () => {
  const plan = E.needsFor(occasion, {}, {
    venue: 'have',
    venueChoice: 'have',
    guests: 120,
    context: { venueProvides: ['catering', 'sound', 'lighting', 'furniture'] },
  })
  const byTrade = Object.fromEntries(plan.rows.map(row => [row.tradeId, row]))
  for (const tradeId of ['catering_food', 'sound_av', 'event_lighting', 'tent_furniture']) {
    assert.equal(byTrade[tradeId].coveredByVenue, true, `${tradeId} is marked covered`)
    assert.ok(!plan.needed.includes(tradeId), `${tradeId} is not sent for matching`)
    assert.ok(!plan.essential.includes(tradeId), `${tradeId} is not shown as a service to arrange`)
  }
  assert.ok(plan.covered.some(row => row.tradeId === 'catering_food'))
})

test('a customer can explicitly request a service even when the venue says it provides it', () => {
  const plan = E.needsFor(occasion, { catering_food: 'need' }, {
    venue: 'have',
    venueChoice: 'have',
    guests: 120,
    context: { venueProvides: ['catering'] },
  })
  const catering = plan.rows.find(row => row.tradeId === 'catering_food')
  assert.equal(catering.coveredByVenue, false)
  assert.equal(catering.addedByCustomer, true)
  assert.ok(plan.needed.includes('catering_food'))
})

test('already-arranged services are visible as covered and excluded from the arrange shortlist', () => {
  const plan = E.needsFor(occasion, { photography: 'have' }, {
    venue: 'have',
    guests: 120,
  })
  const photo = plan.rows.find(row => row.tradeId === 'photography')
  assert.equal(photo.alreadyArranged, true)
  assert.ok(plan.covered.some(row => row.tradeId === 'photography'))
  assert.ok(!plan.essential.includes('photography'))
  assert.ok(!plan.needed.includes('photography'))
})
