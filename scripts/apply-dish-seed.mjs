#!/usr/bin/env node
/**
 * Put the Part J dishes into the live catalogue.
 *
 * Runs check-dish-seed first and refuses to write if it fails, because
 * the failure mode it catches — a category id that does not exist —
 * produces rows that are invisible to the very filters this seed exists
 * to fill.
 *
 * Every row carries provenance `sambramo-curated:partJ` and
 * review_status `needs_review`:
 *   · visible to partners at once, because an empty course is the worse
 *     failure of the two;
 *   · flagged in admin, so somebody who knows the food can correct a
 *     spelling or a diet;
 *   · and removable in one statement, which is what makes this safe to
 *     run against production at all.
 *
 *     delete from sambramo_master_dishes
 *      where provenance = 'sambramo-curated:partJ';
 *
 * Idempotent: a dish already present under the same cuisine is skipped,
 * not duplicated. --dry prints what would happen and writes nothing.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry')

/* The seed file has to reach the checker too. The first version forgot,
   so it validated a different tranche than the one it was about to
   write — it failed safe, but for the wrong reason, which is its own
   kind of broken. */
const FILE_ARG = process.argv.find(a => a.startsWith('--file=')) ?? '--file=scripts/data/dish-seed-partJ.js'
try {
  execFileSync(process.execPath, [join(ROOT, 'scripts/check-dish-seed.mjs'), FILE_ARG], { stdio: 'inherit' })
} catch {
  console.error('\nthe seed does not validate — nothing was written')
  process.exit(1)
}

const env = Object.fromEntries(['.env', '.env.local'].filter(existsSync).flatMap(f =>
  readFileSync(f, 'utf8').split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])))
const U = env.VITE_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: K, authorization: `Bearer ${K}`, 'content-type': 'application/json' }

const out = join(mkdtempSync(join(tmpdir(), 'seed-')), 'seed.mjs')
const FILE = FILE_ARG.slice(7)
await esbuild.build({ entryPoints: [join(ROOT, FILE)], bundle: true,
  format: 'esm', outfile: out, platform: 'node', logLevel: 'silent' })
const { SEED } = await import(pathToFileURL(out).href)

/* Ids must be permanent and must not collide with anything already
   issued, so they live in their own namespace rather than extending a
   sequence somebody else's generator also extends. */
const existingIds = new Set()
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${U}/rest/v1/sambramo_master_dishes?select=id&order=id.asc&limit=1000&offset=${from}`, { headers: H })
  const j = await r.json(); j.forEach(x => existingIds.add(x.id))
  if (j.length < 1000) break
}
/* Each tranche gets its own id namespace: reusing one would hand an id
   that already means something to a different dish. */
const PREFIX = FILE.includes('supplies') ? 'SBM-SUP' : 'SBM-PJ'
const PROV = FILE.includes('supplies') ? 'sambramo-curated:partJ-supplies' : 'sambramo-curated:partJ'
const rows = SEED.map((row, i) => {
  const id = `${PREFIX}-${String(i + 1).padStart(4, '0')}`
  if (existingIds.has(id)) throw new Error(`id collision: ${id}`)
  return { id, name: row.name, aliases: row.aliases ?? [], cuisine_ids: row.cuisine_ids,
    category_id: row.category_id, suggested_diet: row.suggested_diet,
    provenance: PROV, review_status: 'needs_review', active: true }
})

console.log(`\n${DRY ? 'would insert' : 'inserting'}: ${rows.length} dishes`)
if (DRY) { console.log(rows.slice(0, 3)); process.exit(0) }

let done = 0
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100)
  const r = await fetch(`${U}/rest/v1/sambramo_master_dishes`, {
    method: 'POST', headers: { ...H, prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify(batch),
  })
  if (!r.ok) { console.error('batch failed:', r.status, (await r.text()).slice(0, 400)); process.exit(1) }
  done += batch.length
  console.log(`  ${done}/${rows.length}`)
}
console.log(`\ndone. To undo: delete from sambramo_master_dishes where provenance = '${PROV}';`)
