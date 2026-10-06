#!/usr/bin/env node
/**
 * Indian names, both directions.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TWO FAILURES THIS SITS BETWEEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Too strict rejects real people: "Rajesh Kumar" against "Rajesh K." is
 * the commonest shape of a TRUE match in India, and a matcher that
 * calls it a mismatch turns away an honest supply base all day.
 *
 * Too loose does nothing: if "Rajesh Kumar" matches "Ramesh Kumar" then
 * the check has told a customer something it does not know.
 *
 * Both directions are asserted, which is the point of the file. A table
 * of only-should-match cases would pass with a function that returns
 * MATCH unconditionally.
 *
 *   node scripts/check-name-matching.mjs
 *   node scripts/check-name-matching.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sabotage = process.argv.includes('--sabotage')
const verbose = process.argv.includes('--verbose')

const OUT = join(ROOT, 'node_modules/.cache/name-matching.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/name-matching-entry.mjs')
writeFileSync(ENTRY,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/matching.js'))}\n`)
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { compareNames, normaliseName, phonetic, matchOutcome, MATCH } = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  if (verbose || !cond) console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

function t(entered, doc, want, note = '') {
  const r = compareNames(entered, doc)
  ok(`${JSON.stringify(entered)} vs ${JSON.stringify(doc)} -> ${want}`,
     r.result === want, `got ${r.result}${note ? ` (${note})` : ''}`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE SAME NAME, WRITTEN THE SAME WAY\n')
t('Rajesh Kumar', 'Rajesh Kumar', MATCH.MATCH)
t('rajesh kumar', 'RAJESH KUMAR', MATCH.MATCH, 'case')
t('  Rajesh   Kumar ', 'Rajesh Kumar', MATCH.MATCH, 'whitespace')
t('Rajesh Kumar', 'Sri Rajesh Kumar', MATCH.MATCH, 'honorific dropped')
t('Rajesh Kumar', 'Smt. Rajesh Kumar', MATCH.MATCH)
t('Lakshmi', 'Lakshmi', MATCH.MATCH, 'mononyms are complete names')

console.log('\nORDER DOES NOT DECIDE IDENTITY\n')
t('Rajesh Kumar', 'Kumar Rajesh', MATCH.MATCH, 'south Indian ordering')
t('Venkatesh Srinivasa', 'Srinivasa Venkatesh', MATCH.MATCH)

console.log('\nPUNCTUATION IS NOT A DIFFERENCE\n')
t('R.K. Sharma', 'R K Sharma', MATCH.MATCH)
t('D’Souza Maria', 'DSouza Maria', MATCH.MATCH)

console.log('\nRELATIONSHIP MARKERS DESCRIBE A PARENT\n')
t('Rajesh Kumar', 'Rajesh Kumar S/O Suresh Kumar', MATCH.MATCH)
t('Lakshmi Devi', 'Lakshmi Devi W/O Ramesh', MATCH.MATCH)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nCLOSE ENOUGH FOR A HUMAN, NOT FOR A MACHINE\n')
t('Rajesh Kumar', 'Rajesh K.', MATCH.PARTIAL, 'the headline case')
t('R Kumar', 'Rajesh Kumar', MATCH.PARTIAL)
t('Rajesh Kumar', 'Rajesh Kumar Suresh', MATCH.PARTIAL, 'extra name part')
t('Lakshmi', 'Lakshmi Devi', MATCH.PARTIAL, 'mononym vs fuller name')
t('Krishnan Nair', 'Krishnnan Nair', MATCH.PARTIAL, 'transliteration')
t('Lakshmi Devi', 'Laxmi Devi', MATCH.PARTIAL, 'transliteration')
t('Ravi Shankar', 'Ravi Shanker', MATCH.PARTIAL, 'one letter')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nDIFFERENT PEOPLE\n')
t('Rajesh Kumar', 'Ramesh Kumar', MATCH.MISMATCH, 'the headline case')
t('Rajesh Kumar', 'Suresh Babu', MATCH.MISMATCH)
t('Lakshmi', 'Ganesh', MATCH.MISMATCH)
t('Ravi', 'Ram', MATCH.MISMATCH, 'short names tolerate fewer typos')
t('Anil Kumar', 'Sunil Kumar', MATCH.MISMATCH, 'a shared surname is not enough')
t('Rajesh Kumar', 'Priya Sharma', MATCH.MISMATCH)

console.log('\nNO OPINION WHEN THERE IS NOTHING TO COMPARE\n')
t('', 'Rajesh Kumar', MATCH.NOT_AVAILABLE)
t('Rajesh Kumar', '', MATCH.NOT_AVAILABLE)
t(null, null, MATCH.NOT_AVAILABLE)
t('Sri', 'Rajesh', MATCH.NOT_AVAILABLE, 'an honorific alone is not a name')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE PARTS BEHAVE\n')

ok('honorifics are stripped',
   JSON.stringify(normaliseName('Sri Rajesh Kumar')) === JSON.stringify(['rajesh', 'kumar']))
ok('a relationship marker cuts everything after it',
   JSON.stringify(normaliseName('Rajesh S/O Suresh')) === JSON.stringify(['rajesh']))
ok('dots become separators',
   JSON.stringify(normaliseName('R.K.Sharma')) === JSON.stringify(['r', 'k', 'sharma']))
ok('sound-alikes collapse', phonetic('lakshmi') === phonetic('laxmi'),
   `${phonetic('lakshmi')} vs ${phonetic('laxmi')}`)
ok('but different sounds do not', phonetic('rajesh') !== phonetic('ramesh'))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA MISMATCH IS NEVER AN AUTOMATIC REJECTION\n')

const mism = matchOutcome(MATCH.MISMATCH)
ok('a mismatch blocks', mism.blocks === true)
ok('and asks the partner to act', mism.requiresAction === true)
ok('and routes to a human', mism.review === true)

const part = matchOutcome(MATCH.PARTIAL)
ok('a partial does NOT block', part.blocks === false)
ok('but is reviewed', part.review === true)

const full = matchOutcome(MATCH.MATCH)
ok('a match blocks nothing', full.blocks === false && full.review === false)

ok('a mismatch tells the partner what to do',
   /check you have entered/i.test(compareNames('Rajesh Kumar', 'Ramesh Kumar').says ?? ''))
ok('a partial says a reviewer will look',
   /reviewer/i.test(compareNames('Rajesh Kumar', 'Rajesh K.').says ?? ''))
ok('a full match says nothing at all',
   compareNames('Rajesh Kumar', 'Rajesh Kumar').says === null)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE MATCHER IS NOT VACUOUS\n')

/* A function returning MATCH unconditionally would pass every
   should-match case above. These are what stop that. */
const everything = [
  ['Rajesh Kumar', 'Ramesh Kumar'], ['Ravi', 'Ram'], ['Anil Kumar', 'Sunil Kumar'],
  ['Lakshmi', 'Ganesh'], ['Rajesh Kumar', 'Priya Sharma'],
]
ok('none of the different-people pairs return MATCH',
   everything.every(([a, c]) => compareNames(a, c).result !== MATCH.MATCH))
ok('and none return PARTIAL either',
   everything.every(([a, c]) => compareNames(a, c).result === MATCH.MISMATCH),
   everything.map(([a, c]) => `${a}/${c}=${compareNames(a, c).result}`).join(' '))

if (sabotage) {
  ran++
  if (compareNames('Rajesh Kumar', 'Ramesh Kumar').result === MATCH.MISMATCH) {
    bad++
    fails.push('sabotage: expected the mismatch rule to be broken, and it was not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
