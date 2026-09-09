#!/usr/bin/env node
/**
 * Every category a partner can pick must be a trade dispatch can match.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FAILURE THIS CATCHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `match_partners` joins on `vendors.category` as an exact string. The
 * onboarding form offers VENDOR_CATEGORIES. If those two lists ever
 * disagree by one word, a partner completes signup, is approved, lists
 * their trades, and is never returned by a single dispatch query — with
 * every screen showing them fully onboarded.
 *
 * That is not hypothetical. 'Other' sat at the bottom of the category
 * list, which is exactly where somebody unsure of themselves lands, and
 * it matched nothing at all.
 *
 * ── Sabotage test ────────────────────────────────────────────────────
 *   node scripts/check-partner-vocabulary.mjs --sabotage
 */
import fs from 'node:fs'

/* Comments are stripped FIRST. The note explaining why 'Other' was
   removed contains the word 'Other' in quotes, and a checker that reads
   its own explanation as evidence reports a fault that is not there —
   which is how three guards in this repo came to be vacuous. */
const strip = s => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')

function read(sabotage = false) {
  const src = strip(fs.readFileSync('src/config/vendor.js', 'utf8'))

  const catStart = src.indexOf('export const VENDOR_CATEGORIES = [')
  const catBody = src.slice(catStart, src.indexOf('\n]', catStart))
  const cats = [...catBody.matchAll(/'([^']+)'/g)].map(m => m[1])

  const mapStart = src.indexOf('export const TRADE_FOR_SERVICE')
  const mapBody = src.slice(mapStart, src.indexOf('\n}', mapStart))
  const trades = new Set([...mapBody.matchAll(/:\s*'([^']+)'/g)].map(m => m[1]))

  if (sabotage) cats.push('Miscellaneous')
  return { cats, trades }
}

function offences({ cats, trades }) {
  return cats.filter(c => !trades.has(c))
}

if (process.argv.includes('--sabotage')) {
  const found = offences(read(true))
  if (!found.includes('Miscellaneous')) {
    console.error('✗ SABOTAGE SURVIVED — this guard does not work')
    process.exit(1)
  }
  console.log('✓ sabotage caught: the guard bites')
  process.exit(0)
}

const { cats, trades } = read()
if (!cats.length || !trades.size) {
  console.error('✗ read nothing — the shape of config/vendor.js has changed')
  process.exit(1)
}

const bad = offences({ cats, trades })
if (bad.length) {
  console.error(`✗ ${bad.length} partner categor${bad.length === 1 ? 'y' : 'ies'} match no trade:`)
  for (const c of bad) console.error(`    ${c} — a partner who picks this is never dispatched`)
  process.exit(1)
}
console.log(`  ✓ all ${cats.length} partner categories are trades dispatch can match (${trades.size} trades)`)
