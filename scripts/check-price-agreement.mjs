#!/usr/bin/env node
/**
 * The screen and the server must quote the same number.
 *
 *   node scripts/check-price-agreement.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCRIPT AND NOT A CODE REVIEW
 * ══════════════════════════════════════════════════════════════════════
 *
 * The browser prices a line so the customer can decide. The server
 * prices it again, from `api/_lib/pricing.bundle.js`, because a price
 * sent by a browser is a price anybody can edit. Two engines, one
 * number, and nothing in the type system makes them agree.
 *
 * They drifted the first day decor gained options: the screen selected a
 * rate-card row while the server still picked one from the headcount,
 * and the two quoted 5,330 and 9,594 for the same booking. The customer
 * agrees to one number and is charged another, which is the single worst
 * class of bug this codebase can ship.
 *
 * The bundle is GENERATED from src (scripts/build-api-bundle.mjs), so
 * the usual failure is not a bad edit -- it is a correct edit and a
 * forgotten rebuild. This catches exactly that, which is why it runs
 * over every combination rather than a sample.
 */
import { loadSrc } from './lib/loadSrc.mjs'
import * as server from '../api/_lib/pricing.bundle.js'

const src = await loadSrc({
  'src/data/instantOptions.js': '*',
  'src/lib/instantPricing.js':  ['priceLine'],
})
const opts = src, price = src

let bad = 0
for (const guests of [15, 30, 60, 120, 250]) {
  for (const setup of ['lite', 'standard', 'full']) {
    for (const material of ['balloons', 'mixed', 'floral']) {
      const picked = { setup, material }
      const setupId = opts.setupChoice('decor', picked)

      const c = price.priceLine({ serviceId: 'decor', guestCount: guests, setupId })
      const cPaise = Math.round(c.paise * opts.optionMultiplier('decor', picked))

      const s = server.priceLine({ serviceId: 'decor', guestCount: guests, setupId })
      const sPaise = Math.round(s.paise * server.optionMultiplier('decor', picked))

      const ok = cPaise === sPaise
      if (!ok) bad++
      if (!ok || (guests === 30 && material === 'balloons')) {
        console.log(`  ${ok ? 'ok ' : 'BAD'}  ${String(guests).padStart(3)} guests  ${setup.padEnd(9)} ${material.padEnd(9)}`
          + `  screen ₹${(cPaise / 100).toLocaleString('en-IN')}  server ₹${(sPaise / 100).toLocaleString('en-IN')}  (${s.serviceName})`)
      }
    }
  }
}
if (bad) {
  console.error(`
  ${bad} DISAGREEMENTS between the screen and the server.`)
  console.error('  Run `node scripts/build-api-bundle.mjs` and try again.')
  process.exit(1)
}
console.log('')
console.log('  screen and server agree on all 45 decor combinations')
