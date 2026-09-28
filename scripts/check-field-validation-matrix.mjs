#!/usr/bin/env node
/**
 * Every rule, every category that applies, through the real validator.
 *
 *   node scripts/check-field-validation-matrix.mjs
 *
 * Reads the field inventory (src/lib/validation/inventory.js) and the
 * case catalogue (scripts/validation/catalogue.mjs), runs each case
 * through validateField exactly as the screens call it, and writes
 * reports/validation/rules-matrix.json for the traceability document.
 *
 * Fails on: a case whose outcome differs from its expectation, a rule the
 * inventory uses that has no cases, or a rule in the inventory that does
 * not exist.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'
import { CASES, CATEGORIES } from './validation/catalogue.mjs'

const M = await loadSrc({
  'src/lib/validation/fieldRules.js': ['FIELD_RULES', 'validateField', 'SEVERITY'],
  'src/lib/validation/inventory.js': ['FIELD_INVENTORY'],
})

const tick = String.fromCharCode(10003), cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const failures = []
const results = {}   // rule -> [{ category, input, expect, got, pass }]

/* Identity and bank values are never printed in full: an Aadhaar-shaped
   or account-shaped test value is masked in the report too. */
const shown = v => {
  const s = String(v)
  const masked = /^\d{9,}$/.test(s.replace(/\s/g, '')) && s.length < 40 ? s.slice(0, 2) + '…' + s.slice(-2) : s
  return JSON.stringify(masked.length > 48 ? masked.slice(0, 45) + '…' : masked)
}

function outcome(rule, input, ctx) {
  const r = M.validateField(rule, input, ctx)
  return { severity: r.severity, value: r.value, says: r.says }
}

function passes(expect, got) {
  if (expect === 'ok') return got.severity !== M.SEVERITY.ERROR
  if (expect === 'err') return got.severity === M.SEVERITY.ERROR
  if (expect === 'warn') return got.severity === M.SEVERITY.WARN
  if (expect.startsWith('=')) return got.severity !== M.SEVERITY.ERROR && got.value === expect.slice(1)
  throw new Error('unknown expectation ' + expect)
}

const rulesUsed = [...new Set(M.FIELD_INVENTORY.map(f => f.rule).filter(Boolean))]

for (const rule of rulesUsed) {
  if (!M.FIELD_RULES[rule]) { bad++; failures.push(`inventory names rule "${rule}", which does not exist`); continue }
  const cases = CASES[rule]
  if (!cases?.length) { bad++; failures.push(`rule "${rule}" has no test cases`); continue }
  results[rule] = []
  for (const [category, input, expect, note = '', caseCtx] of cases) {
    /* A case carries its own context: a screen-specific limit (the
       120-character note) is a case of its own, not a default for all. */
    const ctx = { ...(caseCtx ?? {}) }
    const got = outcome(rule, input, ctx)
    const pass = passes(expect, got)
    ran++
    if (!pass) {
      bad++
      failures.push(`${rule} [${category} ${CATEGORIES[category]}] ${shown(input)} expected ${expect}, got ${got.severity}`
        + `${got.value !== undefined && expect.startsWith('=') ? ` value ${shown(got.value)}` : ''}${got.says ? ` — "${got.says}"` : ''}${note ? `  (${note})` : ''}`)
    }
    results[rule].push({ category, input: shown(input), expect, got: got.severity, says: got.says, note, pass })
  }
}

/* Correction after an invalid value (23): the same box, wrong then right. */
const correction = [
  ['contact_phone', '98450', '9845000000'], ['pincode', '5600a1', '560001'],
  ['business_name', 'A', 'Anna Ruchi'], ['upi_id', 'anna', 'anna@ybl'], ['item_price', '45o', '450'],
]
for (const [rule, wrong, right] of correction) {
  ran++
  const a = outcome(rule, wrong, {}), b = outcome(rule, right, {})
  const pass = a.severity === M.SEVERITY.ERROR && b.severity !== M.SEVERITY.ERROR
  if (!pass) { bad++; failures.push(`${rule} [23] ${shown(wrong)} then ${shown(right)} did not go error → ok`) }
  ;(results[rule] ??= []).push({ category: 23, input: `${shown(wrong)} → ${shown(right)}`, expect: 'err→ok', got: `${a.severity}→${b.severity}`, pass })
}

/* No rule message ever echoes a whole identity or bank number back. */
for (const [rule, input] of [['aadhaar', '234567890124'], ['account_number', '12345678'], ['pan', 'ABCDE12345'], ['doc_number', '23456789012']]) {
  ran++
  const says = outcome(rule, input, rule === 'doc_number' ? { kind: 'aadhaar' } : {}).says ?? ''
  const leaked = says.includes(input)
  if (leaked) { bad++; failures.push(`${rule}: the message repeats the whole value back`) }
}

const dir = join(ROOT, 'reports', 'validation')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'rules-matrix.json'), JSON.stringify({ ran, failed: bad, results }, null, 1))

const byRule = Object.entries(results).map(([r, rows]) => `${r}: ${rows.filter(x => x.pass).length}/${rows.length}`)
console.log('\n' + byRule.join('\n'))
if (failures.length) {
  console.log('\nFAILURES\n')
  for (const f of failures) console.log(`  ${cross} ${f}`)
}
console.log(`\n${failures.length ? cross : tick} ${ran - bad}/${ran} rule cases across ${rulesUsed.length} rules`)
console.log('  report: reports/validation/rules-matrix.json\n')
process.exit(bad ? 1 : 0)
