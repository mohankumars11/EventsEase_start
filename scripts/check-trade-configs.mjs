#!/usr/bin/env node
/**
 * Are all 34 trade questionnaires well-formed, and is each its own?
 *
 * A typo in a trade file is silent at runtime: a `showWhen` pointing at a
 * question that does not exist simply never shows, an add-on unit the
 * server does not know is rejected at submit, a compliance id that is not
 * a real requirement is never asked. This catches all of those before a
 * partner does.
 *
 *   node scripts/check-trade-configs.mjs
 *   node scripts/check-trade-configs.mjs --verbose
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

const CACHE = join(ROOT, 'node_modules/.cache')
mkdirSync(CACHE, { recursive: true })
const ENTRY = join(CACHE, 'trade-configs-entry.mjs')
const OUT = join(CACHE, 'trade-configs.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/data/trades/index.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/data/trades/registry.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/data/trades/schema.js'))}`,
  `export { requirementsFor, ALL_REQUIREMENT_IDS } from ${JSON.stringify(join(ROOT, 'src/lib/verification/requirements.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`, '--log-level=error',
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { TRADE_CONFIGS, TRADE_REGISTRY, ARCHETYPES, RULE_KINDS, ADDON_UNITS, requirementsFor, ALL_REQUIREMENT_IDS, complianceFlags } = M

const TYPES = new Set(['single', 'multi', 'number', 'money', 'toggle', 'text', 'textarea', 'dimensions', 'photos', 'time', 'date', 'url'])
let ran = 0, bad = 0
const ok = (name, cond, d = '') => {
  ran++
  if (!cond) bad++
  if (verbose || !cond) console.log(`  ${cond ? '✓' : '✗'} ${name}${cond ? '' : `   <-- ${d}`}`)
}

/* ── Registry ──────────────────────────────────────────────────────── */
ok('34 trades', TRADE_CONFIGS.length === 34, `got ${TRADE_CONFIGS.length}`)
ok('canonical order 1..34', TRADE_REGISTRY.every((r, i) => r.order === i + 1))
for (const k of ['id', 'code', 'name']) {
  const vals = TRADE_REGISTRY.map(r => r[k])
  ok(`registry ${k}s unique`, new Set(vals).size === vals.length)
}
ok('anchor_mc is #1', TRADE_CONFIGS[0].id === 'anchor_mc' && TRADE_CONFIGS[0].legacyFlow === 'anchor')

/* ── Each trade ────────────────────────────────────────────────────── */
function checkQuestion(t, where, x, seen) {
  const at = `${t.id} ${where}.${x.id}`
  ok(`${at} has id/label`, !!x.id && !!x.label)
  ok(`${at} type`, TYPES.has(x.type), x.type)
  if (seen) { ok(`${at} id unique`, !seen.has(x.id)); seen.add(x.id) }
  if (x.type === 'single' || x.type === 'multi') {
    const ids = (x.options ?? []).map(o => o.id)
    ok(`${at} has options`, ids.length >= 2, `${ids.length}`)
    ok(`${at} option ids unique`, new Set(ids).size === ids.length, ids.join(','))
  }
  if (x.min != null && x.max != null) ok(`${at} min <= max`, x.min <= x.max)
}

function checkCond(t, where, cond, byId) {
  if (!cond) return
  const at = `${t.id} ${where}`
  if (cond.q === '_rule_kinds') {
    ok(`${at} kind exists`, t.pricing.kinds.includes(cond.includes), cond.includes)
    return
  }
  const target = byId.get(cond.q)
  ok(`${at} refers to a real question`, !!target, cond.q)
  if (!target) return
  const optIds = new Set((target.options ?? []).map(o => o.id))
  for (const v of cond.in ?? []) ok(`${at} option '${v}' exists on ${cond.q}`, optIds.has(v))
  if (cond.includes) ok(`${at} option '${cond.includes}' exists on ${cond.q}`, target.type === 'multi' && optIds.has(cond.includes))
}

const labelSets = []
for (const t of TRADE_CONFIGS) {
  ok(`${t.id} archetype known`, ARCHETYPES.includes(t.archetype))
  ok(`${t.id} file id matches registry`, !!t.serviceNoun, 'missing file or serviceNoun')
  ok(`${t.id} pricing kinds`, (t.pricing?.kinds ?? []).length > 0 && t.pricing.kinds.every(k => RULE_KINDS[k]),
    (t.pricing?.kinds ?? []).filter(k => !RULE_KINDS[k]).join(','))
  for (const k of Object.keys(t.pricing?.unitLabels ?? {})) ok(`${t.id} unitLabel '${k}' is an enabled kind`, t.pricing.kinds.includes(k))
  ok(`${t.id} quote template`, (t.quoteTemplate ?? []).length > 0)
  ok(`${t.id} quote triggers`, (t.quoteTriggers ?? []).length > 0)
  ok(`${t.id} readiness checks`, (t.readiness ?? []).length > 0)
  ok(`${t.id} resource model`, !!t.resources?.model)

  const addonIds = (t.addons ?? []).map(a => a.id)
  ok(`${t.id} add-on ids unique`, new Set(addonIds).size === addonIds.length)
  for (const a of t.addons ?? []) ok(`${t.id} add-on ${a.id} unit`, ADDON_UNITS.includes(a.unit), a.unit)

  if (t.legacyFlow) continue

  /* Profile, pricing and resource answers share one namespace. */
  const seen = new Set()
  const byId = new Map()
  ok(`${t.id} has screens`, (t.screens ?? []).length > 0)
  for (const s of t.screens ?? []) {
    ok(`${t.id} screen ${s.id} has questions`, s.questions.length > 0)
    for (const x of s.questions) { checkQuestion(t, s.id, x, seen); byId.set(x.id, x) }
  }
  for (const x of t.pricing.fields ?? []) { checkQuestion(t, 'pricing', x, seen); byId.set(x.id, x) }
  for (const x of t.resources.fields ?? []) { checkQuestion(t, 'resources', x, seen); byId.set(x.id, x) }
  if (t.catalogue) {
    ok(`${t.id} catalogue has fields`, t.catalogue.fields.length > 0 && !!t.catalogue.key && !!t.catalogue.noun)
    const cs = new Set()
    for (const x of t.catalogue.fields) checkQuestion(t, `catalogue:${t.catalogue.key}`, x, cs)
  }
  for (const x of t.requestFields ?? []) checkQuestion(t, 'request', x, null)

  for (const x of byId.values()) checkCond(t, `showWhen ${x.id}`, x.showWhen, byId)
  for (const [k, cond] of Object.entries(t.rules ?? {})) if (cond?.q) checkCond(t, `rules.${k}`, cond, byId)

  /* Compliance: a real requirement, reachable through requirementsFor for this trade. */
  const flagsOn = Object.fromEntries((t.compliance?.conditional ?? []).filter(c => c.flag).map(c => [c.flag, true]))
  const emitted = new Set(requirementsFor({ trades: [t.name], answers: flagsOn }).map(r => r.id))
  for (const c of t.compliance?.conditional ?? []) {
    ok(`${t.id} compliance ${c.doc} is a real requirement`, ALL_REQUIREMENT_IDS.includes(c.doc))
    ok(`${t.id} compliance ${c.doc} is asked of ${t.name}`, emitted.has(c.doc), 'requirementsFor never emits it for this trade')
    checkCond(t, `compliance ${c.doc}`, c.when, byId)
  }
  ok(`${t.id} complianceFlags runs`, typeof complianceFlags(t, {}) === 'object')

  for (const [opt, target] of Object.entries(t.redirects ?? {})) {
    ok(`${t.id} redirect ${opt} → ${target} exists`, TRADE_CONFIGS.some(c => c.id === target))
    ok(`${t.id} redirect option ${opt} is offered`, [...byId.values()].some(x => (x.options ?? []).some(o => o.id === opt)))
  }

  labelSets.push([t.id, new Set((t.screens ?? []).flatMap(s => s.questions.map(x => x.label.toLowerCase())))])
}

/* ── Nothing copied: no two trades share most of their profile questions ── */
for (let i = 0; i < labelSets.length; i++) {
  for (let j = i + 1; j < labelSets.length; j++) {
    const [a, A] = labelSets[i], [c, C] = labelSets[j]
    const inter = [...A].filter(x => C.has(x)).length
    const jac = inter / (A.size + C.size - inter || 1)
    ok(`${a} vs ${c} questions are their own`, jac < 0.5, `${Math.round(jac * 100)}% identical`)
  }
}

console.log(`\ncheck-trade-configs: ${ran - bad}/${ran} passed`)
process.exit(bad ? 1 : 0)
