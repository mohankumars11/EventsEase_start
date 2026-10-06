#!/usr/bin/env node
/**
 * Is every box a partner can type into in the inventory?
 *
 *   node scripts/check-validation-inventory.mjs
 *
 * Scans the partner surfaces for <input>, <textarea>, <select>,
 * ValidatedField and CheckedInput, and fails if a file that renders one
 * is neither in FIELD_INVENTORY (as a component) nor listed in
 * NOT_FREE_ENTRY with the reason it needs no rule. Also fails if an
 * inventory entry names a rule that does not exist, or a component file
 * that is not there, and if any source file in the change carries an
 * invisible character (the kind these rules refuse from users).
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

const M = await loadSrc({
  'src/lib/validation/inventory.js': ['FIELD_INVENTORY', 'NOT_FREE_ENTRY'],
  'src/lib/validation/fieldRules.js': ['FIELD_RULES'],
})

const SCAN = ['src/pages/partner', 'src/components/partner', 'src/components/vendor', 'src/components/onboarding']
const INPUT = /<(input|textarea|select)\b|<ValidatedField\b|<CheckedInput\b/

const files = []
const walk = d => {
  for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.jsx?$/.test(e.name)) files.push(p.replace(/\\/g, '/'))
  }
}
SCAN.forEach(walk)

const tick = String.fromCharCode(10003), cross = String.fromCharCode(10007)
const fails = []

const covered = new Set(M.FIELD_INVENTORY.map(f => f.component.split(' ')[0]))
const exempt = new Set(Object.keys(M.NOT_FREE_ENTRY).map(k => k.split('#')[0]))
let withInputs = 0
for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8')
  if (!INPUT.test(src)) continue
  if (/^src\/components\/(partner\/(ValidatedField|FieldCheck)|onboarding\/StepShell)\.jsx$/.test(f)) continue
  withInputs++
  if (!covered.has(f) && !exempt.has(f)) fails.push(`${f} renders an input and is not in the inventory`)
}

for (const e of M.FIELD_INVENTORY) {
  const file = e.component.split(' ')[0]
  if (!existsSync(join(ROOT, file))) fails.push(`${e.id}: component ${file} does not exist`)
  if (e.rule && !M.FIELD_RULES[e.rule]) fails.push(`${e.id}: rule ${e.rule} does not exist`)
  if (!e.server && !e.serverNote && e.rule && !/^not saved/.test(e.save)) {
    fails.push(`${e.id}: saved to ${e.save} with no server check and no note saying why`)
  }
}
const ids = M.FIELD_INVENTORY.map(e => e.id)
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i)
if (dupes.length) fails.push(`duplicate inventory ids: ${dupes.join(', ')}`)

/* Invisible characters in this change's own source. */
const INVISIBLE = /[\u{0}-\u{8}\u{B}\u{C}\u{E}-\u{1F}\u{7F}\u{A0}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}-\u{206F}\u{FEFF}]/u
const touched = [
  'src/lib/validation/fieldRules.js', 'src/lib/validation/inventory.js', 'src/lib/validation/serverError.js',
  'src/components/partner/FieldCheck.jsx', 'src/components/partner/ValidatedField.jsx',
  'supabase/migrations/159_a_value_the_server_checks_too.sql', 'scripts/validation/catalogue.mjs',
]
for (const f of touched) {
  const s = readFileSync(join(ROOT, f), 'utf8')
  const hit = [...s].findIndex(c => INVISIBLE.test(c))
  if (hit >= 0) fails.push(`${f}: an invisible character at offset ${hit}`)
}

console.log(`\n  ${M.FIELD_INVENTORY.length} inventoried fields, ${Object.keys(M.NOT_FREE_ENTRY).length} documented non-text inputs`)
console.log(`  ${withInputs} partner-side files render inputs; every one accounted for${fails.length ? ' — NOT' : ''}`)
for (const f of fails) console.log(`  ${cross} ${f}`)
console.log(`\n${fails.length ? cross + ' ' + fails.length + ' problem(s)' : tick + ' inventory complete'}\n`)
process.exit(fails.length ? 1 : 0)
