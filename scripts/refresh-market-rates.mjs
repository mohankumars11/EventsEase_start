#!/usr/bin/env node
/**
 * Read today's mandi prices and write src/config/generatedMarketIndex.js.
 *
 *   node scripts/refresh-market-rates.mjs --dry-run
 *   node scripts/refresh-market-rates.mjs
 *   node scripts/refresh-market-rates.mjs --state Karnataka
 *
 * ── What this actually does ───────────────────────────────────────────────
 * Pulls the Agmarknet "Current Daily Price of Various Commodities from
 * Various Markets (Mandi)" resource from data.gov.in for one state, takes the
 * modal price of each commodity in the catering basket below, compares each
 * against a committed baseline, and combines them into ONE `provisions`
 * multiplier weighted by how much of an Indian catering plate each commodity
 * actually represents.
 *
 * That multiplier is the only thing in this app that moves with a live feed,
 * and data/marketRates.js is explicit about why: there is no open daily index
 * for what a decorator or a photographer charges, so those stay at their
 * published rates rather than being given an invented number.
 *
 * ── Why a weighted basket and not an average ──────────────────────────────
 * Onion tripling is a national news story and moves a plate by about two
 * percent, because a plate contains a small amount of onion. Rice moving ten
 * percent moves a plate by nearly four. An unweighted average of seven
 * commodities would report the onion story and misprice the rice one, which
 * is exactly backwards.
 *
 * ── Why the baselines are committed rather than fetched ───────────────────
 * A multiplier needs a fixed point. If the baseline were "last week's read",
 * the index would drift: every week's noise would compound into the next
 * week's reference and after two months the number would be measuring its own
 * history rather than the market. So the baseline is the rate the committed
 * per-plate figures in cuisineMenus.js were researched against, it is written
 * down here, and it changes only when somebody deliberately re-bases.
 *
 * Environment (read from .env, never VITE_-prefixed, never bundled):
 *   DATA_GOV_IN_API_KEY  — free, from https://data.gov.in
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/config/generatedMarketIndex.js')

/* ── .env, without adding a dependency ──────────────────────────────── */
function loadEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const value = m[2].trim().replace(/^["'](.*)["']$/, '$1')
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}
loadEnv()

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const stateArg = argv[argv.indexOf('--state') + 1]
const STATE = argv.includes('--state') && stateArg ? stateArg : 'Karnataka'

/**
 * The catering basket.
 *
 * `weight` is the share of a vegetarian plate's PROVISION cost this commodity
 * represents — they sum to 1. `baseline` is the modal ₹/quintal these rates
 * were researched against (mid-2026 Karnataka averages). `match` is matched
 * case-insensitively against the API's `commodity` field, which is not
 * consistently spelled and has to be matched loosely.
 */
const BASKET = [
  { key: 'rice',   label: 'Rice',        match: ['rice'],                       weight: 0.26, baseline: 4200 },
  { key: 'dal',    label: 'Tur dal',     match: ['arhar', 'tur', 'red gram'],   weight: 0.18, baseline: 9800 },
  { key: 'oil',    label: 'Edible oil',  match: ['groundnut', 'sunflower'],     weight: 0.16, baseline: 7600 },
  { key: 'onion',  label: 'Onion',       match: ['onion'],                      weight: 0.10, baseline: 2400 },
  { key: 'tomato', label: 'Tomato',      match: ['tomato'],                     weight: 0.09, baseline: 2000 },
  { key: 'potato', label: 'Potato',      match: ['potato'],                     weight: 0.08, baseline: 2200 },
  { key: 'veg',    label: 'Other veg',   match: ['brinjal', 'cabbage', 'beans', 'carrot'], weight: 0.13, baseline: 2600 },
]

const RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'
const ENDPOINT = `https://api.data.gov.in/resource/${RESOURCE}`

/** ±18%, the same clamp data/marketRates.js applies on read. Belt and braces. */
const clamp = n => Math.min(1.18, Math.max(0.82, n))
const round3 = n => Math.round(n * 1000) / 1000

async function fetchRecords(apiKey) {
  const url = new URL(ENDPOINT)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '4000')
  url.searchParams.set('filters[state]', STATE)

  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`data.gov.in returned ${res.status} ${res.statusText}`)
  const body = await res.json()
  const records = body?.records
  if (!Array.isArray(records)) throw new Error('unexpected response shape — no `records` array')
  return records
}

/** Median rather than mean: one mis-keyed mandi print should not move a plate. */
function median(numbers) {
  if (!numbers.length) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function buildIndex(records) {
  const basket = []
  let weighted = 0
  let covered = 0

  for (const item of BASKET) {
    const modals = records
      .filter(r => item.match.some(m => String(r.commodity ?? '').toLowerCase().includes(m)))
      .map(r => Number(r.modal_price))
      .filter(n => Number.isFinite(n) && n > 0)

    const modal = median(modals)
    if (modal == null) {
      // Not in today's print. Carried at its baseline rather than dropped —
      // dropping it would silently re-weight the whole basket onto whatever
      // did report, which is how one bad day becomes a price change.
      basket.push({ ...pick(item), modal: null, ratio: 1, markets: 0 })
      weighted += item.weight
      continue
    }

    const ratio = clamp(modal / item.baseline)
    basket.push({ ...pick(item), modal, ratio: round3(ratio), markets: modals.length })
    weighted += item.weight * ratio
    covered += item.weight
  }

  return {
    provisions: round3(clamp(weighted)),
    basket,
    coverage: round3(covered),
  }
}

const pick = item => ({
  key: item.key, label: item.label, unit: '₹/quintal',
  baseline: item.baseline, weight: item.weight,
})

function render({ provisions, basket, coverage, asOf }) {
  return `// GENERATED by scripts/refresh-market-rates.mjs — do not edit.
//
// Read ${asOf} from Agmarknet daily mandi prices (data.gov.in), ${STATE}.
// Basket coverage this run: ${Math.round(coverage * 100)}% of the provision
// weighting reported a price; anything that did not is carried at baseline.
//
// Only \`provisions\` is fed by a live source. Cooks, serving and decor are
// wage-linked and have no open daily index, so they stay at 1 — see the
// header of src/data/marketRates.js for why inventing a number there would
// be worse than holding the published rate.
//
// Re-run daily:
//   node scripts/refresh-market-rates.mjs

export const GENERATED_MARKET_INDEX = {
  asOf: ${JSON.stringify(asOf)},

  multipliers: {
    provisions: ${provisions},
    kitchen: 1,
    service: 1,
    decor: 1,
  },

  basket: ${JSON.stringify(basket, null, 4).replace(/\n/g, '\n  ')},
}
`
}

async function main() {
  const apiKey = process.env.DATA_GOV_IN_API_KEY
  if (!apiKey) {
    console.error('\nDATA_GOV_IN_API_KEY is not set.\n')
    console.error('  1. Register free at https://data.gov.in')
    console.error('  2. My Account → API → copy the key')
    console.error('  3. Add DATA_GOV_IN_API_KEY=<key> to .env\n')
    console.error('Until then the app prices at its committed baseline, which is')
    console.error('correct and is what the home screen says it is doing.\n')
    process.exit(1)
  }

  console.log(`Reading Agmarknet daily prices for ${STATE}…\n`)
  const records = await fetchRecords(apiKey)
  console.log(`  ${records.length} mandi records`)

  const { provisions, basket, coverage } = buildIndex(records)
  const asOf = new Date().toISOString().slice(0, 10)

  for (const b of basket) {
    const moved = Math.round((b.ratio - 1) * 100)
    const shown = b.modal == null
      ? 'not in today’s print — held at baseline'
      : `₹${b.modal}/qtl vs ₹${b.baseline} baseline  ${moved >= 0 ? '+' : ''}${moved}%  (${b.markets} markets)`
    console.log(`  ${b.label.padEnd(12)} ${shown}`)
  }

  const move = Math.round((provisions - 1) * 100)
  console.log(`\n  provisions multiplier ${provisions}  (${move >= 0 ? '+' : ''}${move}% on a plate’s ingredient cost)`)
  console.log(`  coverage ${Math.round(coverage * 100)}%`)

  if (dryRun) { console.log('\n--dry-run: nothing written.'); return }
  writeFileSync(OUT, render({ provisions, basket, coverage, asOf }))
  console.log(`\nWrote ${OUT}`)
}

main().catch(err => {
  console.error(`\nFailed: ${err.message}`)
  console.error('The committed index is unchanged, so the app keeps pricing at baseline.\n')
  process.exit(1)
})
