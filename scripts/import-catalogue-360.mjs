#!/usr/bin/env node
/**
 * Import the SAMBRAMO 360° catalogue (docs/sambramo-360) into the app.
 *
 *   node scripts/import-catalogue-360.mjs            validate + write generated files
 *   node scripts/import-catalogue-360.mjs --check    validate only, write nothing
 *   node --env-file=.env scripts/import-catalogue-360.mjs --apply
 *                                                    + upsert into the database (PostgREST,
 *                                                      service role; needs migration 190)
 *
 * Validation (fails the run on any error):
 *   - the CSV and the workbook's Trade Matrix agree for every occasion and trade
 *   - 438 unique occasion ids, all present in src/customer/data/occasions.js
 *   - 18 categories, each mapping to exactly one app category
 *   - 34 trades, every label resolving to a registry trade id; each occasion row
 *     classifies all 34 exactly once with a known status
 *
 * Writes (idempotent — same input, byte-identical output):
 *   src/customer/data/catalogue360.generated.js   what the engine reads
 *   supabase/seed/catalogue360.json               what --apply upserts
 *
 * The app catalogue stays the system of record for ids and display names;
 * the bundle supplies the baseline matrix, trade scope and lifecycle model.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { readXlsx } from './lib/xlsx.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'docs/sambramo-360')
const CSV = join(SRC, 'SAMBRAMO_438_Occasion_Service_Map.csv')
const XLSX = join(SRC, 'SAMBRAMO_360_Event_Service_Recommendation_Catalogue.xlsx')
const CHECK = process.argv.includes('--check'), APPLY = process.argv.includes('--apply')
const errors = [], warnings = []
const fail = m => errors.push(m)

/* ── the live app catalogue ─────────────────────────────────────────── */
const cache = join(ROOT, 'node_modules/.cache/catalogue360-app.mjs')
mkdirSync(dirname(cache), { recursive: true })
await build({ stdin: { contents: "export * from './src/customer/data/occasions.js'; export * from './src/customer/data/trades.js'", resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: cache, logLevel: 'error', loader: { '.js': 'jsx' } })
const app = await import(pathToFileURL(cache).href + `?t=${Date.now()}`)

/* ── the bundle ─────────────────────────────────────────────────────── */
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') q = false; else cell += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.length > 1)
}
const csvRows = parseCsv(readFileSync(CSV, 'utf8').replace(/^﻿/, ''))
const book = readXlsx(XLSX)
const need = ['438 Occasion Map', 'Trade Matrix', '34 Trade Master', '360 Lifecycle', 'Recommendation Rules', 'Category Summary']
for (const s of need) if (!book[s]) fail(`workbook: missing sheet "${s}"`)

/* trades: label → registry id, via the workbook's trade master */
const master = book['34 Trade Master'].slice(1).filter(r => r[0])
const TRADE_MASTER = {}, byLabel = {}
for (const [sid, label, scope] of master) {
  const id = sid.replace(/^svc-/, '')
  if (!app.TRADE[id]) fail(`trade ${sid} is not in the app registry`)
  TRADE_MASTER[id] = { label, scope }
  byLabel[label] = id
}
const TRADE_ORDER = Object.keys(TRADE_MASTER).sort()
if (TRADE_ORDER.length !== 34) fail(`expected 34 trades, found ${TRADE_ORDER.length}`)
for (const t of app.TRADES) if (!TRADE_MASTER[t.id]) fail(`app trade ${t.id} missing from the bundle trade master`)

/* categories: bundle name → app id, by the occasions they contain */
const CODE = { CORE: 'C', CONDITIONAL: 'D', OPTIONAL: 'O', 'NOT DEFAULT': 'N' }
const header = book['Trade Matrix'][0]
const matrixCols = header.slice(3).map(l => byLabel[l] ?? (fail(`matrix column "${l}" is not a known trade`), null))
const matrix = Object.fromEntries(book['Trade Matrix'].slice(1).filter(r => r[2]).map(r => [r[2], r]))
const CATEGORY_SOURCE = {}, BASELINE = {}, RATIONALE = {}, SCENE = {}
const seen = new Set()
for (const r of csvRows.slice(1)) {
  const [cat, , sid, core, cond, opt, why, scene] = r
  const id = sid.replace(/^occ-/, '')
  if (seen.has(id)) fail(`duplicate occasion ${sid}`)
  seen.add(id)
  const o = app.OCCASION[id]
  if (!o) { fail(`occasion ${sid} is not in the app catalogue`); continue }
  if (CATEGORY_SOURCE[o.category] && CATEGORY_SOURCE[o.category] !== cat) fail(`app category ${o.category} maps to two bundle categories`)
  CATEGORY_SOURCE[o.category] = cat
  const status = {}
  const put = (list, s) => list.split(';').map(x => x.trim()).filter(Boolean).forEach(l => {
    const t = byLabel[l]
    if (!t) return fail(`${sid}: unknown trade label "${l}"`)
    if (status[t]) fail(`${sid}: ${t} classified twice`)
    status[t] = s
  })
  put(core, 'C'); put(cond, 'D'); put(opt, 'O')
  for (const t of TRADE_ORDER) status[t] ??= 'N'
  /* the workbook matrix must say the same thing */
  const mr = matrix[sid]
  if (!mr) fail(`${sid}: missing from the Trade Matrix sheet`)
  else matrixCols.forEach((t, i) => { if (t && CODE[mr[i + 3]] !== status[t]) fail(`${sid}/${t}: CSV says ${status[t]}, matrix says ${mr[i + 3]}`) })
  BASELINE[id] = TRADE_ORDER.map(t => status[t]).join('')
  RATIONALE[o.category] ??= why
  if (RATIONALE[o.category] !== why) warnings.push(`${sid}: rationale differs from its category's`)
  SCENE[id] = scene
}
if (seen.size !== 438) fail(`expected 438 occasions, found ${seen.size}`)
for (const o of app.OCCASIONS) if (!seen.has(o.id)) fail(`app occasion ${o.id} missing from the bundle`)
const cats = Object.keys(CATEGORY_SOURCE)
if (cats.length !== 18) fail(`expected 18 categories, found ${cats.length}`)
const summary = Object.fromEntries(book['Category Summary'].slice(1).filter(r => r[0]).map(r => [r[0], Number(r[1])]))
for (const [cid, name] of Object.entries(CATEGORY_SOURCE)) {
  const n = app.OCCASIONS.filter(o => o.category === cid).length
  if (summary[name] !== n) fail(`category ${name}: summary says ${summary[name]}, catalogue has ${n}`)
}
let nameDiffs = 0
for (const r of csvRows.slice(1)) { const o = app.OCCASION[r[2].replace(/^occ-/, '')]; if (o && o.name !== r[1]) nameDiffs++ }

/* lifecycle: the workbook's 11 stages, their trades resolved to ids */
const ALIAS = { 'Event Management & Coordination': 'end_to_end_event_logistics', 'Venue Booking': 'venue', 'Bridal Makeup': 'bridal_makeup_hair' }
const resolve = name => {
  const n = name.replace(/ for wedding events$/i, '').trim()
  return byLabel[n] ?? ALIAS[n] ?? Object.entries(byLabel).find(([l]) => l.startsWith(n))?.[1] ?? null
}
const LIFECYCLE_STAGES = book['360 Lifecycle'].slice(1).filter(r => r[0]).map(([stage, checklist, trades, rule]) => {
  const ids = trades.split(';').map(x => x.trim()).filter(Boolean).map(n => resolve(n) ?? (warnings.push(`lifecycle: "${n}" unresolved`), null)).filter(Boolean)
  return { stage, checklist, trades: [...new Set(ids)], rule }
})
const SIGNALS = book['Recommendation Rules'].slice(1).filter(r => r[0]).map(([signal, inputs, behaviour]) => ({ signal, inputs, behaviour }))

/* ── report ─────────────────────────────────────────────────────────── */
const counts = { C: 0, D: 0, O: 0, N: 0 }
for (const s of Object.values(BASELINE)) for (const c of s) counts[c]++
const hash = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16)
console.log(`categories ${cats.length} · occasions ${seen.size} · trades ${TRADE_ORDER.length} · matrix cells ${Object.keys(BASELINE).length * 34}`)
console.log(`statuses  CORE ${counts.C} · CONDITIONAL ${counts.D} · OPTIONAL ${counts.O} · NOT_DEFAULT ${counts.N}`)
console.log(`names     ${nameDiffs} bundle names differ in formatting from the app's curated names (app names kept)`)
console.log(`lifecycle ${LIFECYCLE_STAGES.length} stages · signals ${SIGNALS.length}`)
for (const w of warnings) console.log(`  warn: ${w}`)
if (errors.length) { for (const e of errors.slice(0, 40)) console.error(`  ERROR: ${e}`); console.error(`FAILED: ${errors.length} error(s)`); process.exit(1) }
console.log('integrity ok')
if (CHECK) process.exit(0)

/* ── write ──────────────────────────────────────────────────────────── */
const SOURCE = { bundle: 'SAMBRAMO Cloud Build Bundle v1.0 (27 Oct 2026)', csv: hash(CSV), xlsx: hash(XLSX) }
const js = `// GENERATED by scripts/import-catalogue-360.mjs from docs/sambramo-360 — do not edit.
// Re-run the script after changing the bundle. Baseline codes, one per trade in
// TRADE_ORDER: C = CORE, D = CONDITIONAL, O = OPTIONAL, N = NOT_DEFAULT.

export const SOURCE = ${JSON.stringify(SOURCE)}
export const TRADE_ORDER = ${JSON.stringify(TRADE_ORDER)}
export const TRADE_MASTER = ${JSON.stringify(TRADE_MASTER, null, 1)}
export const CATEGORY_SOURCE = ${JSON.stringify(CATEGORY_SOURCE, null, 1)}
export const RATIONALE = ${JSON.stringify(RATIONALE, null, 1)}
export const LIFECYCLE_STAGES = ${JSON.stringify(LIFECYCLE_STAGES, null, 1)}
export const SIGNALS = ${JSON.stringify(SIGNALS, null, 1)}
export const BASELINE = ${JSON.stringify(BASELINE, null, 0).replace(/,"/g, ',\n"')}
`
writeFileSync(join(ROOT, 'src/customer/data/catalogue360.generated.js'), js)

const order = Object.keys(CATEGORY_SOURCE)
const seed = {
  source: SOURCE,
  categories: order.map((id, i) => ({ id, name: app.CATEGORY[id].short ?? app.CATEGORY[id].label, source_name: CATEGORY_SOURCE[id], display_order: i + 1, is_active: true })),
  occasions: app.OCCASIONS.map((o, i) => ({ id: o.id, category_id: o.category, name: o.name, scene_description: SCENE[o.id] ?? null, display_order: i + 1, is_active: true })),
  trades: TRADE_ORDER.map(id => ({ id, customer_label: app.TRADE[id].label, scope_description: TRADE_MASTER[id].scope, is_active: true })),
  matrix: Object.entries(BASELINE).flatMap(([occ, codes]) => TRADE_ORDER.map((t, i) => ({ occasion_id: occ, trade_id: t,
    status: { C: 'CORE', D: 'CONDITIONAL', O: 'OPTIONAL', N: 'NOT_DEFAULT' }[codes[i]], rule_version: 'baseline-v1' }))),
}
mkdirSync(join(ROOT, 'supabase/seed'), { recursive: true })
writeFileSync(join(ROOT, 'supabase/seed/catalogue360.json'), JSON.stringify(seed))
console.log('wrote src/customer/data/catalogue360.generated.js and supabase/seed/catalogue360.json')

if (!APPLY) process.exit(0)

/* ── --apply: upsert over PostgREST (idempotent; never deletes) ─────── */
const URL_ = process.env.VITE_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) { console.error('--apply needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (node --env-file=.env)'); process.exit(1) }
async function upsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)) })
    if (!r.ok) { console.error(`${table}: ${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1) }
  }
  console.log(`  ${table}: ${rows.length} upserted`)
}
await upsert('occasion_categories', seed.categories, 'id')
await upsert('occasions', seed.occasions, 'id')
await upsert('service_trades', seed.trades, 'id')
await upsert('occasion_trade_recommendations', seed.matrix, 'occasion_id,trade_id')
console.log('applied')
