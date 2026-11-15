/**
 * The catalogue audit and the blueprint coverage report, across every
 * category that has been written.
 *
 *   node scripts/check-occasion-blueprints.mjs                  everything
 *   node scripts/check-occasion-blueprints.mjs --category life  one category
 *   node scripts/check-occasion-blueprints.mjs --audit          the audit table
 *   node scripts/check-occasion-blueprints.mjs --json           machine-readable
 *
 * Reads the real catalogue and the real trade registry — nothing here is
 * typed in by hand, so it cannot drift from the app. Exits non-zero if an
 * occasion is missing a blueprint, or if a blueprint names a trade the
 * registry does not have.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/life-blueprints.report.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: {
    contents: `export { CATEGORY, OCCASIONS } from './src/customer/data/occasions.js'
      export { BLUEPRINT as LIFE_BLUEPRINT, BY_CATEGORY } from './src/customer/data/blueprints.js'
      export { TRADE } from './src/customer/data/trades.js'
      export { occasionPlan, questionsFor } from './src/customer/lib/occasionPlan.js'`,
    resolveDir: ROOT,
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' },
})
const E = await import(pathToFileURL(out).href)

/* One category at a time: `--category wedding`, or every written one. */
const only = (() => { const i = process.argv.indexOf('--category'); return i === -1 ? null : process.argv[i + 1] })()
const CATS = only ? [only] : Object.keys(E.BY_CATEGORY)
const LIFE = CATS.flatMap(c => E.CATEGORY[c].occasions)
const json = process.argv.includes('--json')
const auditOnly = process.argv.includes('--audit')
const pad = (s, n) => String(s).padEnd(n).slice(0, n)
let bad = 0

const rows = LIFE.map((o, i) => {
  const b = E.LIFE_BLUEPRINT[o.id]
  if (!b) { bad++; return { position: i + 1, id: o.id, name: o.name, status: 'MISSING' } }
  const unknown = [...b.plan.map(s => s.trade), ...b.addons.map(a => a.trade).filter(Boolean)].filter(t => !E.TRADE[t])
  if (unknown.length) bad++
  const p = E.occasionPlan(o, {})
  const kinds = b.plan.reduce((m, s) => ({ ...m, [s.kind]: (m[s.kind] ?? 0) + 1 }), {})
  return {
    position: i + 1, id: o.id, name: o.name, category: o.category.toUpperCase(),
    status: unknown.length ? `BAD TRADE: ${unknown.join(',')}` : 'COMPLETE',
    version: b.v,
    questions: b.ask.length, required: b.ask.filter(q => !q.optional).length,
    services: b.plan.length,
    essential: kinds.essential ?? 0, recommended: kinds.recommended ?? 0, conditional: kinds.conditional ?? 0, optional: kinds.optional ?? 0,
    addons: b.addons.length, bookableAddons: b.addons.filter(a => a.trade).length, ideas: b.addons.filter(a => !a.trade).length,
    trades: [...new Set(b.plan.map(s => s.trade))].length,
    toolkit: p.toolkit.features.length,
    timeline: ['before', 'during', 'after'].reduce((n, k) => n + (b.timeline[k]?.length ?? 0), 0),
    checklist: b.checklist.length,
    defaultOn: p.recommended.filter(r => r.on).length,
  }
})

if (json) { console.log(JSON.stringify({ count: rows.length, rows }, null, 2)); process.exit(bad ? 1 : 0) }

console.log('')
console.log(`OCCASION BLUEPRINTS — ${CATS.join(', ')}`)
console.log('Source of truth: src/customer/data/occasions.js\n')
console.log(`${pad('#', 3)} ${pad('occasion_id', 28)} ${pad('occasion_name', 28)} ${pad('category_id', 23)} ${pad('pos', 4)} blueprint_status`)
console.log('-'.repeat(118))
for (const r of rows) console.log(`${pad(r.position, 3)} ${pad(r.id, 28)} ${pad(r.name, 28)} ${pad(r.category ?? '-', 23)} ${pad(r.position, 4)} ${r.status}`)

if (!auditOnly) {
  console.log('\n\nBLUEPRINT COVERAGE\n')
  console.log(`${pad('occasion', 28)} ${pad('ask', 8)} ${pad('services', 9)} ${pad('ess/rec/cond/opt', 18)} ${pad('add-ons', 9)} ${pad('toolkit', 8)} ${pad('timeline', 9)} ${pad('check', 6)} on`)
  console.log('-'.repeat(118))
  for (const r of rows) {
    console.log(`${pad(r.name, 28)} ${pad(`${r.required}/${r.questions}`, 8)} ${pad(r.services, 9)} ${pad(`${r.essential}/${r.recommended}/${r.conditional}/${r.optional}`, 18)} ${pad(`${r.bookableAddons}+${r.ideas}`, 9)} ${pad(r.toolkit, 8)} ${pad(r.timeline, 9)} ${pad(r.checklist, 6)} ${r.defaultOn}`)
  }
  const sum = k => rows.reduce((n, r) => n + (r[k] ?? 0), 0)
  console.log('-'.repeat(118))
  console.log(`${pad(`TOTAL (${rows.length} occasions)`, 28)} ${pad(sum('questions'), 8)} ${pad(sum('services'), 9)} ${pad(`${sum('essential')}/${sum('recommended')}/${sum('conditional')}/${sum('optional')}`, 18)} ${pad(`${sum('bookableAddons')}+${sum('ideas')}`, 9)} ${pad(sum('toolkit'), 8)} ${pad(sum('timeline'), 9)} ${pad(sum('checklist'), 6)}`)
  console.log(`\nEvery trade id above is a live registry id. ${sum('ideas')} add-ons are planning ideas with no partner behind them, and say so on screen.`)
}

console.log(bad ? `\n${bad} occasion(s) FAILED.\n` : `\nAll ${rows.length} occasions complete.\n`)
process.exit(bad ? 1 : 0)
