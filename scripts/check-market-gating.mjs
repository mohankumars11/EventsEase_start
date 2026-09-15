#!/usr/bin/env node
/**
 * Which cities are open to partners, and what a detected city means.
 *
 * Pure: no browser, no device, no database. The rule that has to hold as
 * this grows is that NO SCREEN contains the word "Bengaluru" in a
 * condition — every screen asks config/markets.js. So this asserts the
 * module, and a grep at the end asserts the screens stayed clean.
 *
 *   node scripts/check-market-gating.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/market-check.mjs')

/* markets.js imports cities.js, so it needs bundling to run under node. */
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/config/markets.js'),
  '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const { marketCheck, isActiveMarket, launchMarkets, MARKET_STATUS } =
  await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let failed = 0
const check = (name, got, want) => {
  const ok = got === want
  if (!ok) failed++
  console.log(`  ${ok ? tick : cross} ${name}${ok ? '' : `  got ${got}, wanted ${want}`}`)
}

console.log('\nWHO WE RECRUIT IN\n')

check('Bengaluru is open',       isActiveMarket('Bengaluru'), true)
/* The spelling a partner's phone actually returns. Nominatim says
   "Bangalore" about as often as "Bengaluru", and a market check that
   fails on the alias tells a working Bengaluru partner their city is
   closed. */
check('"Bangalore" is the same city', isActiveMarket('Bangalore'), true)
check('"BLR" too',                isActiveMarket('BLR'), true)
check('Mysore is not open yet',   isActiveMarket('Mysore'), false)
check('Mysuru is the same place',  isActiveMarket('Mysuru'), false)
check('somewhere we have never heard of', isActiveMarket('Kadapa'), false)
check('exactly one launch market', launchMarkets().length, 1)
check('and it is Bengaluru',       launchMarkets()[0]?.city, 'Bengaluru')

console.log('\nWHAT A DETECTED CITY MEANS\n')

check('in the launch city',   marketCheck('Bangalore').status, MARKET_STATUS.ACTIVE)
check('a city we know, closed', marketCheck('Mysuru').status, MARKET_STATUS.COMING_SOON)
check('...and we know it',      marketCheck('Mysuru').knownCity, true)
check('a city we do not know',  marketCheck('Kadapa').status, MARKET_STATUS.COMING_SOON)
/* The screen must not say "coming to Kadapa" when there is no plan for
   Kadapa. It is an interest to capture, not a promise to make. */
check('...and we say we do not', marketCheck('Kadapa').knownCity, false)
check('no city at all',          marketCheck(null).knownCity, false)

/* ══════════════════════════════════════════════════════════════════════
   NO SCREEN MAY NAME THE LAUNCH CITY IN A CONDITION
   ══════════════════════════════════════════════════════════════════════

   This is the guard that keeps §19 true a year from now. Opening Mysuru
   should be one line in config/markets.js and no UI work — which stops
   being true the first time somebody writes `city === 'Bengaluru'` in a
   component, and nothing would notice until a Mysuru partner was told
   they were in the wrong city by a screen nobody remembered. */
console.log('\nNO HARD-CODED LAUNCH CITY IN THE PARTNER SCREENS\n')

const DIRS = ['src/pages/partner', 'src/components/vendor']
const BAD = /(===|!==|includes\(|startsWith\()\s*['"`](Bengaluru|Bangalore|BLR)['"`]/

const offenders = []
for (const dir of DIRS) {
  for (const f of readdirSync(join(ROOT, dir))) {
    if (!/\.jsx?$/.test(f)) continue
    const text = readFileSync(join(ROOT, dir, f), 'utf8')
    text.split('\n').forEach((line, i) => {
      /* A comment naming the city is fine and often necessary — the ban
         is on BRANCHING on it. */
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
      if (BAD.test(code)) offenders.push(`${dir}/${f}:${i + 1}  ${line.trim().slice(0, 70)}`)
    })
  }
}

if (offenders.length) {
  failed += offenders.length
  console.log(`  ${cross} ${offenders.length} screen(s) branch on the city name:`)
  offenders.forEach(o => console.log(`      ${o}`))
} else {
  console.log(`  ${tick} every screen asks config/markets.js`)
}

console.log(failed ? `\n${cross} ${failed} failed\n` : `\n${tick} all passed\n`)
process.exit(failed ? 1 : 0)
