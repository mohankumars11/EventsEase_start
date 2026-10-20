#!/usr/bin/env node
/**
 * Is every seeded dish filed somewhere that exists?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS RUNS BEFORE THE INSERT, NOT AFTER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first draft of the seed filed four salads under `sl_indian`, a
 * category id that does not exist. category_id is a nullable FK, so
 * PostgREST would have rejected them — or worse, a nulled category makes
 * a dish invisible to every course filter, which is the exact bug this
 * seed exists to fix. It would have looked like a successful insert.
 *
 * So: every cuisine id, every category id and every diet is checked
 * against the live database first, and nothing is written unless all of
 * them resolve. It also refuses a dish whose name already exists in the
 * same cuisine, because a duplicate is how one dish becomes two
 * half-used ids.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(['.env', '.env.local'].filter(existsSync).flatMap(f =>
  readFileSync(f, 'utf8').split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])))
const U = env.VITE_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
if (!U || !K) { console.error('missing supabase env'); process.exit(1) }
const H = { apikey: K, authorization: `Bearer ${K}` }
const all = async (t, sel) => {
  const out = []; let from = 0
  for (;;) {
    const r = await fetch(`${U}/rest/v1/${t}?select=${sel}&order=id.asc&limit=1000&offset=${from}`, { headers: H })
    const j = await r.json(); out.push(...j)
    if (j.length < 1000) break; from += 1000
  }
  return out
}

const out = join(mkdtempSync(join(tmpdir(), 'seed-')), 'seed.mjs')
const FILE = (process.argv.find(a => a.startsWith('--file=')) ?? '--file=scripts/data/dish-seed-partJ.js').slice(7)
await esbuild.build({ entryPoints: [join(ROOT, FILE)], bundle: true,
  format: 'esm', outfile: out, platform: 'node', logLevel: 'silent' })
const { SEED } = await import(pathToFileURL(out).href)

const cuisines = new Set((await all('sambramo_cuisines', 'id')).map(x => x.id))
const cats = Object.fromEntries((await all('sambramo_food_categories', 'id,course_group')).map(c => [c.id, c.course_group]))
const existing = await all('sambramo_master_dishes', 'name,cuisine_ids')
const DIETS = new Set(['veg', 'non_veg', 'vegan', 'jain', 'egg'])
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
/* A universal item carries no cuisine, so it needs a key of its own or
   every one of them would look like a duplicate of every other. */
const keysOf = row => ((row.cuisine_ids ?? []).length ? row.cuisine_ids : ['(universal)']).map(c => `${c}|${norm(row.name)}`)
const already = new Set(existing.flatMap(keysOf))

const bad = []
const seen = new Set()
for (const row of SEED) {
  for (const c of (row.cuisine_ids ?? [])) if (!cuisines.has(c)) bad.push(`${row.name}: no such cuisine "${c}"`)
  if (!cats[row.category_id]) bad.push(`${row.name}: no such category "${row.category_id}"`)
  if (!DIETS.has(row.suggested_diet)) bad.push(`${row.name}: bad diet "${row.suggested_diet}"`)
  for (const k of keysOf(row)) {
    if (already.has(k)) bad.push(`${row.name}: already in the catalogue under ${k.split('|')[0]}`)
    if (seen.has(k)) bad.push(`${row.name}: listed twice in this seed under ${k.split('|')[0]}`)
    seen.add(k)
  }
}

/* What the seed actually fills, so a run cannot claim more than it does. */
const fills = {}
for (const row of SEED) {
  const course = cats[row.category_id]
  for (const c of ((row.cuisine_ids ?? []).length ? row.cuisine_ids : ['(universal)'])) (fills[`${c} · ${course}`] ??= []).push(row.name)
}
console.log(`seed rows        : ${SEED.length}`)
console.log(`cuisine-course cells touched: ${Object.keys(fills).length}`)
console.log(`problems         : ${bad.length}`)
for (const b of bad.slice(0, 40)) console.log(`  FAIL  ${b}`)
if (bad.length > 40) console.log(`  … and ${bad.length - 40} more`)
console.log(bad.length ? '\nFAIL — fix the seed before applying it' : '\nPASS — every row resolves against the live taxonomy')
process.exit(bad.length ? 1 : 0)
