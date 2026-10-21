#!/usr/bin/env node
/**
 * Can a partner say the thing you did not think of?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY EVERY CHOICE QUESTION IS NOT THE SAME
 * ══════════════════════════════════════════════════════════════════════
 *
 * A list of options is a claim that the list is complete. For "which
 * styles do you offer" that claim is false in every trade — somebody
 * does a style nobody wrote down — and the partner's only escape is to
 * abandon the question or lie. So those need "Other".
 *
 * But not all of them. "Charged per person / per look / per session" is
 * a closed set: the pricing engine knows those three units and an
 * "Other" would produce an unpriceable rule. Same for yes/no-shaped
 * single-selects and anything whose options map to engine behaviour.
 *
 * So this does not demand "Other" everywhere. It lists the questions
 * that lack one, split into the ones that look closed by nature and the
 * ones that look like an open list, and fails only on the second kind.
 * ENGINE_CLOSED is the list of question ids that genuinely are closed;
 * adding to it is a decision somebody makes on purpose.
 */
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/* Question ids whose options the engine, the law or arithmetic fixes.
   An "Other" on these produces an answer nothing can act on. */
/* Questions that already have an escape, just not an "Other" chip: a
   sibling free-text field, or an option that opens one. Named as
   trade+id pairs so adding one is a decision about a specific question
   rather than a blanket exemption for an id that might mean something
   else in another trade. */
const ESCAPED_ELSEWHERE = new Set([
  'Security Services|services',           // other_service textarea beside it
  'Safety & Facilities|subtype',          // "other_reviewed" option -> quote-only
  'Transportation|service_type',          // "other" option -> other_description
])

/* Questions whose options are exhaustive by construction: every
   combination is already on the list, so an "Other" would be an answer
   about nothing. */
const EXHAUSTIVE = new Set([
  'DJ & Music|own_equipment',             // sound+light / sound / light / neither
  'Mehendi Artist|cone',                  // we bring / ready-made / customer brings
  'Loading & Unloading Crew|shifts',      // morning / day / evening / night
  'Event Equipment Rental|handover',      // we deliver / they collect / they return
  'Priest & Rituals|materials',           // we bring all / some / family arranges
  'DJ & Music|duration_options',          // feeds hourly pricing; list extended instead
  'Live Entertainment|durations',         // same
])

const ENGINE_CLOSED = new Set([
  'price_unit', 'rate_period', 'unit', 'rate_unit', 'charged', 'price_mode',
  'supply_scope', 'pricing_model', 'price_model', 'billing', 'per',
  'indoor_outdoor', 'diet', 'veg_nonveg', 'availability', 'shift',
  'who', 'experience', 'team_size_band', 'vehicle_class', 'fuel',
])

/* Words that mean the list cannot be complete, whoever wrote it. */
const OPEN_SHAPED = /\b(style|type|types|cuisine|service|services|speciality|specialities|language|languages|equipment|brand|brands|occasion|event|events|theme|themes|flavour|flavours|material|materials|dish|dishes|option|options|package|packages|skill|skills|category|categories)\b/i

const out = join(mkdtempSync(join(tmpdir(), 'other-')), 'trades.mjs')
writeFileSync(join(ROOT, 'scripts/.other-entry.tmp.js'),
  "export { TRADE_CONFIGS } from '../src/data/trades/index'\n")
await esbuild.build({ entryPoints: [join(ROOT, 'scripts/.other-entry.tmp.js')], bundle: true,
  format: 'esm', outfile: out, platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic' })
const { TRADE_CONFIGS } = await import(pathToFileURL(out).href)

const questionsOf = c => [
  ...(c.screens ?? []).flatMap(s => (s.questions ?? []).map(q => ({ ...q, where: s.id }))),
  ...((c.catalogue?.fields) ?? []).map(q => ({ ...q, where: 'catalogue' })),
  ...((c.pricing?.fields) ?? []).map(q => ({ ...q, where: 'pricing' })),
  ...((c.resources?.fields) ?? []).map(q => ({ ...q, where: 'resources' })),
]

let choice = 0, withOther = 0
const openGaps = [], closedOk = []
for (const c of TRADE_CONFIGS) {
  for (const q of questionsOf(c)) {
    if (q.type !== 'single' && q.type !== 'multi') continue
    choice++
    if (q.other) { withOther++; continue }
    const row = `${c.name} · ${q.where} · ${q.id} — "${q.label}"`
    const pair = `${c.name}|${q.id}`
    if (ENGINE_CLOSED.has(q.id) || ESCAPED_ELSEWHERE.has(pair) || EXHAUSTIVE.has(pair)) closedOk.push(row)
    else if (OPEN_SHAPED.test(q.label) || OPEN_SHAPED.test(q.id)) openGaps.push(row)
    else closedOk.push(row)
  }
}

console.log(`trades                      : ${TRADE_CONFIGS.length}`)
console.log(`choice questions            : ${choice}`)
console.log(`with "Other"                : ${withOther}  (${Math.round(withOther / choice * 100)}%)`)
console.log(`without, and closed by design: ${closedOk.length}`)
console.log(`without, and open by nature  : ${openGaps.length}`)
console.log('')
for (const g of openGaps) console.log(`  FAIL  ${g}`)
console.log(openGaps.length
  ? `\nFAIL — ${openGaps.length} open-ended question(s) offer no way to say anything else`
  : '\nPASS — every open-ended choice lets a partner add their own')
process.exit(openGaps.length ? 1 : 0)
