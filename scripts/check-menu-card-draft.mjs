#!/usr/bin/env node
/**
 * Every course and cuisine rule that fired in the middle of a word.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE BUG, FOUND FOUR TIMES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The draft rules are substring matches, and substring matches inside a
 * word are almost always wrong. Found by reading the output, one at a
 * time, each time believing it was the last:
 *
 *   neer   inside Pa[neer]        eight paneer dishes filed under Udupi
 *   puri   inside Kolha[puri]     two curries filed as breads
 *   paya   inside [Paya]sa        six sweets marked non-veg
 *   chops  inside [Chops]e        a dry palya filed as a starter
 *   sambar inside Ko[sambar]i     a salad filed as a curry
 *
 * The last one is the point: four had been fixed and a fifth was still
 * sitting there. Reading output finds them one at a time and stops when
 * the reader gets bored. This finds all of them at once.
 *
 * A mid-word match is not automatically wrong — `bath` has to match
 * Khara[bath] and Menthya[bath], which are single words — so this
 * reports rather than fails, and the known-good ones are listed.
 *
 *   node scripts/check-menu-card-draft.mjs
 */
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const D = await load('src/data/menuCardDishes.js')

/* The rules, read out of the drafting script so the two can never
   disagree about what was actually applied. */
const src = readFileSync('scripts/draft-menu-card-dishes.mjs', 'utf8')
function rulesFrom(name) {
  const block = src.slice(src.indexOf(`const ${name} = [`))
  const end = block.indexOf('\n]')
  return [...block.slice(0, end).matchAll(/\['([a-z_]+)', \/(.+?)\/i\]/g)]
    .map(m => [m[1], m[2].split('|')])
}
const COURSE = rulesFrom('COURSE_RULES')
const CUISINE = rulesFrom('CUISINE_RULES')

/* Deliberate: a token that is MEANT to match inside a word. */
const ON_PURPOSE = new Set([
  'bath',   // Khara[bath], Menthya[bath] — one word
  'rice', 'roti', 'rotti', 'dal', 'fry', 'ball', '65',
  'pappu',  // [Pappu]koora IS a dal, so curries is right
  'bhog',   // Raj [Bhog]h IS a sweet
])

const word = c => /[a-z0-9]/i.test(c ?? '')
const findings = []

for (const d of D.MENU_CARD_DISHES) {
  for (const [kind, rules] of [['course', COURSE], ['cuisine', CUISINE]]) {
    for (const [value, tokens] of rules) {
      let fired = null
      for (const t of tokens) {
        const clean = t.replace(/\b/g, '')
        if (clean !== t) continue                       // already bounded
        const i = d.name.toLowerCase().indexOf(clean.toLowerCase())
        if (i < 0) continue
        const before = d.name[i - 1], after = d.name[i + clean.length]
        if (!word(before) && !word(after)) { fired = null; break }   // clean word match
        fired = { t: clean, i }
      }
      /* Only a finding if the mid-word match actually WON. A rule can
         fire wrongly and still be overruled — Roasted Aloo with Gun
         Powder matches `roast` but a COURSE_OVERRIDE puts it in the
         dry-vegetable slot where the card has it. Reporting that would
         train the reader to ignore this list. */
      const actual = kind === 'course' ? d.course : d.cuisine
      if (fired && !ON_PURPOSE.has(fired.t) && actual === value) {
        const n = d.name
        findings.push(`${kind} ${value.padEnd(15)} "${fired.t}" inside `
          + `${n.slice(0, fired.i)}[${n.substr(fired.i, fired.t.length)}]${n.slice(fired.i + fired.t.length)}`)
      }
      if (fired) break
      if (rules.find(([v]) => v === value)) { /* keep scanning lower rules */ }
    }
  }
}

const unique = [...new Set(findings)].sort()
console.log(`\n  ${D.MENU_CARD_DISHES.length} drafted dishes\n`)
if (!unique.length) {
  console.log('  No rule fired in the middle of a word.\n')
  process.exit(0)
}
console.log(`  ${unique.length} rule(s) fired mid-word — each one is a dish in the wrong place:\n`)
for (const f of unique) console.log('   · ' + f)
console.log()
process.exit(1)
