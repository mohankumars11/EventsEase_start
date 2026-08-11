#!/usr/bin/env node
/**
 * Create catalogue rows for any shop category, each with a distinct licensed
 * photograph already attached.
 *
 * This is generate-cake-catalog.mjs generalised. That script was written for
 * one category and hard-coded 'Cakes' in six places; Party Essentials and
 * Pooja & Essentials needed exactly the same machinery — read the live
 * catalogue, skip names already present, resolve one unused photo per row,
 * emit guarded INSERTs — so the category became a parameter instead of a
 * fourth copy of the file.
 *
 * The dedup set is still the point, and it is still global: scripts/lib/photos
 * reads every image_url in the products table, so a photo already used by a
 * cake cannot be handed to a balloon arch. No two products in this shop share
 * a photograph — that was migration 017's bug.
 *
 * Every row is written with image_source = 'stock'. Sambramo is pre-launch
 * with no signed supplier, so no photograph here is of the item that will
 * arrive, and the UI labels all of them "Representative image" until an admin
 * uploads a real one. Do not default-flip that column.
 *
 * Runs locally, by hand, like every migration here. Writes a .sql file for
 * review; NEVER touches the database.
 *
 *   node scripts/generate-catalog.mjs --set party --dry-run
 *   node scripts/generate-catalog.mjs --set party
 *   node scripts/generate-catalog.mjs --set pooja --out supabase/migrations/033_x.sql
 *
 * Flags
 *   --set <name>    Which catalogue file under scripts/data to use. Required.
 *   --dry-run       Print the plan; write no files.
 *   --limit <n>     Stop after n products (Pexels allows 200 requests/hour).
 *   --source <p|u>  'pexels' (default) or 'unsplash'.
 *   --out <path>    Output SQL path. Defaults to the set's own suggestion.
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ROOT, loadEnv, searchPexels, searchUnsplash, fetchAssignedPhotoIds,
  supabaseHeaders, sqlStr, dedupeWords, pacingMs, sleep,
} from './lib/photos.mjs'

loadEnv()

const SETS = {
  party: () => import('./data/party-catalog.mjs'),
  pooja: () => import('./data/pooja-catalog.mjs'),
}

/* ── args ───────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = { set: null, dryRun: false, limit: Infinity, source: 'pexels', out: null }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--set':     out.set = argv[++i]; break
      case '--dry-run': out.dryRun = true; break
      case '--limit':   out.limit = Number(argv[++i]); break
      case '--source':  out.source = argv[++i].startsWith('u') ? 'unsplash' : 'pexels'; break
      case '--out':     out.out = argv[++i]; break
      case '-h':
      case '--help':
        console.log(`
Create catalogue rows for a shop category, photos included.

  node scripts/generate-catalog.mjs --set <${Object.keys(SETS).join('|')}> [flags]

  --dry-run     Print the plan; write no files. Start here.
  --limit <n>   Stop after n products.
  --source      pexels (default, 200 req/hr) | unsplash (50 req/hr)
  --out <path>  Output SQL path.
`)
        process.exit(0)
      default:
        if (argv[i].startsWith('--')) throw new Error(`Unknown flag: ${argv[i]}`)
    }
  }
  if (!out.set || !SETS[out.set]) {
    console.error(`--set is required, one of: ${Object.keys(SETS).join(', ')}`)
    process.exit(1)
  }
  return out
}

/* ── What the shop already has ──────────────────────────────────────── */
async function fetchExisting(categories) {
  const { base, headers } = supabaseHeaders()
  const list = categories.map(c => `"${encodeURIComponent(c)}"`).join(',')
  const res = await fetch(
    `${base}/rest/v1/products?select=name,category,occasion,image_url&category=in.(${list})`,
    { headers }
  )
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/* ── Query building ─────────────────────────────────────────────────────
 * Three tiers, narrowest first. The specific query is what gets a haldi kit
 * an actual turmeric-ceremony shot; that same specificity returns nothing for
 * a niche item, and a product with no photo is worse than one with a broader
 * photo. `query` in the catalogue data overrides tier 1 wherever the product
 * name is a poor search term — which, for pooja items especially, is most of
 * them.
 */
const NOISE = /\([^)]*\)/g

function queryTiers(item, categoryTerm) {
  const plain = item.name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim()
  const specific = item.query
    ? dedupeWords(`${item.query} ${categoryTerm}`)
    : dedupeWords(`${plain} ${item.occasion} ${categoryTerm}`)

  return [specific, dedupeWords(`${item.occasion} ${categoryTerm}`), categoryTerm]
    .filter((q, i, all) => q && all.indexOf(q) === i)
}

/* ── SQL emission ───────────────────────────────────────────────────── */
function buildSql(rows, meta, source, skipped) {
  const stamp = new Date().toISOString().slice(0, 10)
  const byOccasion = rows.reduce((acc, r) => {
    acc[r.item.occasion] = (acc[r.item.occasion] ?? 0) + 1
    return acc
  }, {})
  const occasionLines = Object.entries(byOccasion)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([o, n]) => `--   ${String(n).padStart(3)}  ${o}`)
    .join('\n')

  const header = `-- ============================================================
-- ${meta.title}  GENERATED FILE.
--
-- Produced by scripts/generate-catalog.mjs --set ${meta.set} on ${stamp} from ${source}.
-- Do not hand-edit: change scripts/data/${meta.set}-catalog.mjs and re-run.
--
${meta.rationale.split('\n').map(l => `-- ${l}`.trimEnd()).join('\n')}
--
-- ${rows.length} products across ${Object.keys(byOccasion).length} occasions:
${occasionLines}
--
-- Each row carries its own distinct photograph, deduplicated against every
-- image_url already in the products table — no two products in this shop
-- share a photo (that was migration 017's bug).
--
-- image_source is 'stock' on every row: these are licensed lookalikes and the
-- UI labels them "Representative image". Sambramo is pre-launch with no signed
-- supplier, so no photo here can claim to be the item that will arrive. An
-- admin uploading a real photo via Admin → Catalog flips the row to 'actual'.
-- See migration 023. Do not default-flip that column.
--
-- Every statement is guarded by NOT EXISTS on (name, category), so this file
-- is safe to re-run and safe to apply after a partial run.${skipped.length ? `
--
-- ${skipped.length} item(s) in the source data were skipped as already present:
${skipped.map(n => `--   ${n}`).join('\n')}` : ''}
--
-- Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;
`

  const body = rows.map(({ item, photo, query }) => {
    const alt = photo.alt || `${item.name} — ${item.description}`
    return `-- ${meta.category} / ${item.occasion} — ${item.name}
--   query: ${query}
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT ${sqlStr(item.name)}, ${sqlStr(meta.category)}, ${sqlStr(item.occasion)},
       ${sqlStr(item.description)}, ${item.price}, ${sqlStr(item.emoji)},
       ${sqlStr(photo.url)},
       ${sqlStr(alt)},
       ${sqlStr(photo.credit)}, 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = ${sqlStr(item.name)} AND category = ${sqlStr(meta.category)}
);`
  }).join('\n\n')

  return `${header}\n${body}\n\nCOMMIT;\n`
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const args   = parseArgs(process.argv.slice(2))
  const search = args.source === 'unsplash' ? searchUnsplash : searchPexels
  const mod    = await SETS[args.set]()
  const { CATALOG, META } = mod

  if (args.source === 'pexels' && !process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/')
    process.exit(1)
  }

  // Aliased categories are read together so a name that exists under the old
  // tag is still recognised as present (Gifts/Hampers, migration 031).
  const existing = await fetchExisting(META.readCategories ?? [META.category])
  const existingNames = new Set(existing.map(r => r.name))

  const skipped = CATALOG.filter(c => existingNames.has(c.name)).map(c => c.name)
  const todo    = CATALOG.filter(c => !existingNames.has(c.name)).slice(0, args.limit)

  if (!todo.length) {
    console.error(`Every item in scripts/data/${args.set}-catalog.mjs is already in the database.`)
    process.exit(1)
  }
  console.log(`${existing.length} ${META.category} products already in the shop.`)
  if (skipped.length) console.log(`${skipped.length} of the new set already present — skipping those.`)
  console.log(`Resolving ${todo.length} products from ${args.source}…\n`)

  const used = await fetchAssignedPhotoIds()
  console.log(`(${used.size} photos already in use shop-wide, none will be reassigned)\n`)

  const resolved = []
  const failed   = []

  for (const [i, item] of todo.entries()) {
    const tiers = queryTiers(item, META.categoryTerm)
    let photo = null
    let query = tiers[0]
    let rateLimited = false

    for (const tier of tiers) {
      let candidates = []
      try {
        candidates = await search(tier)
      } catch (err) {
        if (err.message === 'RATE_LIMIT') { rateLimited = true; break }
        throw err
      }
      const pick = candidates.find(c => !used.has(c.id))
      if (pick) { photo = pick; query = tier; break }
      await sleep(pacingMs(args.source))
    }

    if (rateLimited) {
      console.error(`\n⚠  Rate limited after ${i} of ${todo.length}. Apply the SQL below, wait an hour, re-run.`)
      break
    }
    if (!photo) {
      failed.push({ item, query })
      console.log(`  ✗  ${item.name}\n       ${query}  (nothing left unused)`)
      continue
    }

    used.add(photo.id)
    resolved.push({ item, photo, query })
    console.log(`  ✓  ${item.name}\n       ${query}\n       ${photo.id}`)
    await sleep(pacingMs(args.source))
  }

  console.log(`\n${resolved.length} resolved, ${failed.length} unresolved.`)
  if (failed.length) {
    console.log(`\nUnresolved — give these a better \`query\` in scripts/data/${args.set}-catalog.mjs:`)
    for (const f of failed) console.log(`  ${f.item.name}  →  "${f.query}"`)
  }

  // A duplicate here means the dedup pass failed, which is the one bug that
  // would reproduce migration 017's problem. Fail loudly rather than emit it.
  const urls = new Map()
  for (const r of resolved) {
    const seen = urls.get(r.photo.url)
    if (seen) {
      console.error(`\n✗ DUPLICATE: "${seen}" and "${r.item.name}" share a photo. Aborting.`)
      process.exit(1)
    }
    urls.set(r.photo.url, r.item.name)
  }

  if (args.dryRun) { console.log('\n--dry-run: no files written.'); return }
  if (!resolved.length) { console.error('Nothing resolved; no files written.'); process.exit(1) }

  const sqlPath = resolve(ROOT, args.out ?? META.out)
  writeFileSync(sqlPath, buildSql(resolved, { ...META, set: args.set }, args.source, skipped), 'utf8')
  console.log(`\nWrote ${sqlPath}`)
  console.log('Next: paste the SQL into Supabase Dashboard → SQL Editor.')
}

main().catch(err => { console.error(err); process.exit(1) })
