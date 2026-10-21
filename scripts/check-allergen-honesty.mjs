#!/usr/bin/env node
/**
 * Can the app ever tell somebody "no allergens" about a dish nobody was
 * asked about?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A GUARD AND NOT A CODE REVIEW NOTE
 * ══════════════════════════════════════════════════════════════════════
 *
 * cateringFlow.js shipped `allergens: d.allergens ?? []` for months. It
 * reads as harmless defaulting and it is the one bug in this area that
 * can put somebody in hospital: an empty array is a DECLARATION that the
 * dish contains none of the listed allergens, and that line manufactured
 * one for every dish whose partner was never asked.
 *
 * It is a single character of carelessness away from coming back, in any
 * of the four files that touch this data, and nothing about reading the
 * line tells you it is dangerous. So it gets a guard.
 *
 * Three rules:
 *   1. No `allergens: ... ?? []` or `|| []` anywhere.
 *   2. Every payload that sends allergens must send null when the value
 *      is not an array — the Array.isArray(...) ? ... : null shape.
 *   3. The three states must stay distinguishable in data/allergens.js:
 *      undeclared, none, listed.
 */
import { readFileSync } from 'node:fs'

const FILES = [
  'src/data/allergens.js',
  'src/components/vendor/listing/catering/cateringFlow.js',
  'src/components/vendor/listing/catering/MenuBuilder.jsx',
  'src/components/vendor/listing/catering/DishCatalogue.jsx',
]

const codeOf = raw => raw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const fails = []

for (const f of FILES) {
  const src = codeOf(readFileSync(f, 'utf8'))
  /* `allergens: <anything> ?? []` — the exact bug, in any spelling. */
  const defaulted = [...src.matchAll(/allergens\s*:\s*[^,\n]*?(\?\?|\|\|)\s*\[\s*\]/g)]
  for (const m of defaulted) fails.push(`${f}: defaults allergens to [] — "${m[0].trim()}"`)
}

/* The payload has to send null, not an empty array, for "not asked". */
const flow = codeOf(readFileSync('src/components/vendor/listing/catering/cateringFlow.js', 'utf8'))
const sends = [...flow.matchAll(/allergens\s*:\s*([^,\n]+)/g)].map(m => m[1].trim())
for (const expr of sends) {
  if (!/Array\.isArray\([^)]*\)\s*\?[^:]*:\s*null/.test(expr)) {
    fails.push(`cateringFlow.js: allergens sent as "${expr}" — must be Array.isArray(x) ? x : null`)
  }
}
if (!sends.length) fails.push('cateringFlow.js: sends no allergens at all')

/* The three states must stay apart. */
const vocab = readFileSync('src/data/allergens.js', 'utf8')
for (const [name, re] of [
  ['undeclared is its own state', /state:\s*'undeclared'/],
  ['none is its own state', /state:\s*'none'/],
  ['listed is its own state', /state:\s*'listed'/],
  ['null is checked before the array is read', /value === null \|\| value === undefined/],
]) if (!re.test(vocab)) fails.push(`data/allergens.js: ${name} — missing`)

console.log(`files checked : ${FILES.length}`)
console.log(`allergens sent as : ${sends.join(' | ') || '(none)'}`)
console.log('')
for (const f of fails) console.log(`  FAIL  ${f}`)
console.log(fails.length
  ? `FAIL — ${fails.length} problem(s). An undeclared allergen must never read as "none".`
  : 'PASS — "not declared" cannot be turned into "contains nothing"')
process.exit(fails.length ? 1 : 0)
