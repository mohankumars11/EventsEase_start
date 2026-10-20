#!/usr/bin/env node
/**
 * Move mis-filed dishes onto the right shelf.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS EDITS ROWS THAT ALREADY EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * The seed only added rows, so undoing it was one DELETE by provenance.
 * This changes dishes partners may already have chosen, so before any
 * write it saves the current category of every row it will touch to
 * scripts/data/dish-refile-backup.json, and --undo puts them all back
 * from that file.
 *
 * It never changes a dish's id, name or cuisines: a partner's listing
 * references the id, so a re-filed dish stays exactly the dish they
 * picked. Only the shelf moves.
 *
 * --dry  prints every proposed move, grouped by the course it leaves and
 *        the course it joins, and writes nothing. Run this first; the
 *        output is the thing worth reading before trusting the mapping.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP = join(ROOT, 'scripts/data/dish-refile-backup.json')
const DRY = process.argv.includes('--dry')
const UNDO = process.argv.includes('--undo')

const env = Object.fromEntries(['.env', '.env.local'].filter(existsSync).flatMap(f =>
  readFileSync(f, 'utf8').split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])))
const U = env.VITE_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
if (!U || !K) { console.error('missing supabase env'); process.exit(1) }
const H = { apikey: K, authorization: `Bearer ${K}`, 'content-type': 'application/json' }

const all = async (t, sel) => {
  const out = []; let from = 0
  for (;;) {
    const r = await fetch(`${U}/rest/v1/${t}?select=${sel}&order=id.asc&limit=1000&offset=${from}`, { headers: H })
    const j = await r.json(); out.push(...j)
    if (j.length < 1000) break; from += 1000
  }
  return out
}

const patch = async (id, category_id) => {
  const r = await fetch(`${U}/rest/v1/sambramo_master_dishes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { ...H, prefer: 'return=minimal' },
    body: JSON.stringify({ category_id }),
  })
  if (!r.ok) throw new Error(`${id}: ${r.status} ${(await r.text()).slice(0, 200)}`)
}

if (UNDO) {
  if (!existsSync(BACKUP)) { console.error('no backup file — nothing to undo'); process.exit(1) }
  const rows = JSON.parse(readFileSync(BACKUP, 'utf8'))
  console.log(`restoring ${rows.length} dishes to their previous categories`)
  for (const r of rows) await patch(r.id, r.was)
  console.log('done')
  process.exit(0)
}

const out = join(mkdtempSync(join(tmpdir(), 'refile-')), 'map.mjs')
await esbuild.build({ entryPoints: [join(ROOT, 'scripts/data/dish-refile-partJ.js')], bundle: true,
  format: 'esm', outfile: out, platform: 'node', logLevel: 'silent' })
const { FAMILIES, BY_NAME } = await import(pathToFileURL(out).href)

const cats = Object.fromEntries((await all('sambramo_food_categories', 'id,name,course_group')).map(c => [c.id, c]))
const dishes = await all('sambramo_master_dishes', 'id,name,category_id')

/* Only dishes currently in a catch-all are candidates. A dish already on
   a sensible shelf is left alone even if a family rule would match it —
   this pass is for the ones nobody can reach, not a re-think of the
   whole catalogue. */
const STUCK = ['ml_component', 'ml_bengali', 'ml_gujarati', 'ml_maharashtrian']

const moves = []
const unknownTarget = []
for (const d of dishes) {
  if (!STUCK.includes(d.category_id)) continue
  let to = BY_NAME[d.name]
  if (!to) for (const [re, target] of FAMILIES) if (re.test(d.name)) { to = target; break }
  if (!to) continue
  if (!cats[to]) { unknownTarget.push(`${d.name} -> ${to}`); continue }
  if (to === d.category_id) continue
  moves.push({ id: d.id, name: d.name, was: d.category_id, to,
    fromCourse: cats[d.category_id]?.course_group ?? '?', toCourse: cats[to].course_group })
}

if (unknownTarget.length) {
  console.error('mapping names categories that do not exist — nothing written:')
  for (const u of unknownTarget) console.error('  ' + u)
  process.exit(1)
}

const byCourse = {}
for (const m of moves) (byCourse[`${m.fromCourse} -> ${m.toCourse}`] ??= []).push(m.name)
console.log(`candidates in catch-alls : ${dishes.filter(d => STUCK.includes(d.category_id)).length}`)
console.log(`moves                    : ${moves.length}`)
console.log(`left alone (not in map)  : ${dishes.filter(d => STUCK.includes(d.category_id)).length - moves.length}`)
console.log('')
for (const [k, names] of Object.entries(byCourse).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${k}   (${names.length})`)
  console.log(`      ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` … +${names.length - 6}` : ''}`)
}

if (DRY) { console.log('\n--dry: nothing written'); process.exit(0) }

writeFileSync(BACKUP, JSON.stringify(moves.map(m => ({ id: m.id, name: m.name, was: m.was })), null, 1))
console.log(`\nbackup written: ${BACKUP}`)
let n = 0
for (const m of moves) { await patch(m.id, m.to); if (++n % 25 === 0) console.log(`  ${n}/${moves.length}`) }
console.log(`  ${n}/${moves.length}\n\ndone. To undo: node scripts/apply-dish-refile.mjs --undo`)
