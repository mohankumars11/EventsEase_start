#!/usr/bin/env node
/**
 * Price every product in the live catalogue through its customiser and fail on
 * anything that doesn't add up.
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 * The customiser is the only place in this shop that computes money, and it
 * derives its option groups by pattern-matching product names. That is what
 * lets it work without a schema migration, and it is also what makes it
 * fragile in a way a build cannot see: a regex that stops matching turns a
 * ₹1,199 cake into a ₹1,199 cake with no size selector, and a flavour
 * mis-detection silently charges someone ₹220 extra for the item they
 * clicked on. Both shipped once.
 *
 * The invariant worth protecting is small and absolute:
 *
 *   Opening a product's sheet and changing nothing must quote exactly the
 *   price shown on its card.
 *
 * Everything else here is a secondary sanity check — no crashes, no empty
 * option sets, every group answerable.
 *
 *   node scripts/check-customizers.mjs            # live catalogue
 *   node scripts/check-customizers.mjs --verbose  # per-category detail
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

function loadEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["'](.*)["']$/, '$1')
  }
}
loadEnv()

/* ── Bundle the customiser so Node can import it ─────────────────────────
 * These modules are browser sources with extensionless relative imports;
 * esbuild resolves them exactly the way Vite does, so this tests the real
 * files rather than a copy that has drifted. */
const dir = mkdtempSync(join(tmpdir(), 'customizers-'))
const entry = join(dir, 'entry.mjs')
const abs = p => JSON.stringify(join(ROOT, p).split('\\').join('/'))

writeFileSync(entry, `
export * from ${abs('src/config/customizers/index.js')}
export { cakeFacts } from ${abs('src/data/cakeStyles.js')}
`)

const outfile = join(dir, 'bundle.mjs')
await esbuild.build({ entryPoints: [entry], outfile, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const mod = await import(pathToFileURL(outfile).href)
rmSync(dir, { recursive: true, force: true })

const { buildOptionGroups, defaultSelections, computeOrder, describeSelections, selectionSignature, isCustomizable } = mod

/* ── Catalogue ─────────────────────────────────────────────────────────── */
const base = process.env.VITE_SUPABASE_URL
const key  = process.env.VITE_SUPABASE_ANON_KEY
if (!base || !key) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env')
  process.exit(1)
}
const res = await fetch(`${base}/rest/v1/products?select=id,name,category,occasion,description,price&order=category.asc,name.asc`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } })
if (!res.ok) { console.error('Supabase read failed:', res.status, await res.text()); process.exit(1) }
const products = await res.json()

/* ── Check ─────────────────────────────────────────────────────────────── */
const failures = []
const stats = {}

for (const p of products) {
  const cat = p.category
  stats[cat] ??= { n: 0, customizable: 0, groups: 0 }
  stats[cat].n++
  if (!isCustomizable(cat)) continue
  stats[cat].customizable++

  let groups, selections, order
  try {
    groups = buildOptionGroups(p)
    selections = defaultSelections(groups)
    order = computeOrder(p, groups, selections)
    describeSelections(order.lines)
    selectionSignature(selections)
  } catch (err) {
    failures.push({ p, why: `threw: ${err.message}` })
    continue
  }

  stats[cat].groups += groups.length

  // THE invariant.
  if (order.unitPrice !== Number(p.price)) {
    failures.push({ p, why: `default quote ₹${order.unitPrice} ≠ catalogue ₹${p.price}` })
  }
  // A sheet with nothing to answer is a sheet that shouldn't have opened.
  const answerable = groups.filter(g => g.type !== 'info')
  if (answerable.length === 0) {
    failures.push({ p, why: 'customizable but has no answerable option group' })
  }
  // Every single-select must resolve to a real option, or the sheet renders
  // with nothing ticked and the price silently drops the group.
  for (const g of answerable) {
    if (g.type === 'single' && !g.options.some(o => o.id === selections[g.id])) {
      failures.push({ p, why: `group "${g.id}" has no resolvable default` })
    }
    if ((g.type === 'single' || g.type === 'multi') && !g.options?.length) {
      failures.push({ p, why: `group "${g.id}" has no options` })
    }
  }
}

console.log(`Checked ${products.length} products.\n`)
for (const [cat, s] of Object.entries(stats).sort()) {
  const avg = s.customizable ? (s.groups / s.customizable).toFixed(1) : '—'
  console.log(`  ${String(s.n).padStart(4)}  ${cat.padEnd(20)} ${s.customizable ? `${s.customizable} customizable, ${avg} groups avg` : 'not customizable'}`)
}

if (verbose) {
  const sample = products.filter(p => isCustomizable(p.category)).slice(0, 3)
  for (const p of sample) {
    const g = buildOptionGroups(p)
    console.log(`\n--- ${p.name} (${p.category}) ---`)
    console.log(g.map(x => `  ${x.type.padEnd(6)} ${x.role ?? '-'} ${x.id}`).join('\n'))
  }
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem(s):\n`)
  for (const f of failures.slice(0, 40)) console.error(`  ${f.p.category} / ${f.p.name}\n      ${f.why}`)
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`)
  process.exit(1)
}
console.log('\n✓ Every customizable product quotes its catalogue price at defaults.')
