#!/usr/bin/env node
/**
 * Create the occasion-complete cake catalogue: one INSERT per cake, each with
 * a distinct licensed photograph already attached.
 *
 * Why this is a separate script from resolve-product-images.mjs
 * -------------------------------------------------------------
 * That one assigns photos to rows that already exist (UPDATE ... WHERE id).
 * These cakes don't exist yet, so there is no id to target and no way to
 * resolve their photos until after a migration has been applied by hand.
 * Splitting it in two would mean shipping ~154 cakes with no imagery, waiting
 * for someone to paste SQL into Supabase, and only then resolving photos —
 * with a shop full of emoji tiles in between. This does both at once.
 *
 * What it shares with the other script, and must
 * ----------------------------------------------
 * The dedup set. `scripts/lib/photos.mjs` reads every image_url currently in
 * the products table, so a photo already used by a hamper cannot be handed to
 * a cake. No two products in the shop share a photograph — that is migration
 * 017's bug, and it stays fixed only if both generators check the same list.
 *
 * Honesty about what the photos are
 * ---------------------------------
 * Every row is written with image_source = 'stock'. Sambramo is pre-launch
 * with no signed bakery, so no photograph here is of the item that will
 * arrive, and the UI labels all of them "Representative image" until an admin
 * uploads a real one through Admin → Catalog (migration 023/025). Do not
 * default-flip that column.
 *
 * How it runs
 * -----------
 * Locally, by hand, like every migration in this project. Writes files for
 * review; NEVER touches the database.
 *
 *   node scripts/generate-cake-catalog.mjs --dry-run
 *   node scripts/generate-cake-catalog.mjs
 *
 * Flags
 *   --dry-run          Print the plan; write no files.
 *   --limit <n>        Stop after n cakes. Pexels allows 200 requests/hour
 *                      and the catalogue is ~154 cakes, so a full run fits —
 *                      but only just. Use --resume after a rate limit.
 *   --resume           Skip cakes whose name is already in the database.
 *                      Apply the SQL from the cut-short run first.
 *   --source <p|u>     'pexels' (default) or 'unsplash'.
 *   --out <path>       Output SQL path.
 *
 * Environment (from .env):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   — to read the catalog
 *   PEXELS_API_KEY                              — https://pexels.com/api
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ROOT, loadEnv, searchPexels, searchUnsplash, fetchAssignedPhotoIds,
  supabaseHeaders, sqlStr, dedupeWords, pacingMs, sleep,
} from './lib/photos.mjs'
import { NEW_CAKES } from './data/cake-catalog.mjs'

loadEnv()

const SQL_OUT      = 'supabase/migrations/029_cake_catalog_occasions.sql'
const PHOTOS_OUT   = 'src/config/generatedCakeOccasionPhotos.js'
const CATEGORY     = 'Cakes'
const CATEGORY_TERM = 'cake dessert food photography'
const NOISE        = /\([^)]*\)/g     // "(1.5kg)", "(Box of 12)" — noise to a photo search

/* ── args ───────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = { dryRun: false, limit: Infinity, resume: false, source: 'pexels', out: null }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run': out.dryRun = true; break
      case '--resume':  out.resume = true; break
      case '--limit':   out.limit = Number(argv[++i]); break
      case '--source':  out.source = argv[++i].startsWith('u') ? 'unsplash' : 'pexels'; break
      case '--out':     out.out = argv[++i]; break
      case '-h':
      case '--help':
        console.log(`
Create the occasion-complete cake catalogue, photos included.

  node scripts/generate-cake-catalog.mjs [flags]

  --dry-run     Print the plan; write no files. Start here.
  --limit <n>   Stop after n cakes.
  --resume      Skip cakes already in the database (after a rate limit).
  --source      pexels (default, 200 req/hr) | unsplash (50 req/hr)
  --out <path>  Output SQL path (default ${SQL_OUT})
`)
        process.exit(0)
      default:
        if (argv[i].startsWith('--')) throw new Error(`Unknown flag: ${argv[i]}`)
    }
  }
  return out
}

/* ── What the shop already has ──────────────────────────────────────── */
async function fetchExistingCakes() {
  const { base, headers } = supabaseHeaders()
  const res = await fetch(
    `${base}/rest/v1/products?select=name,occasion,image_url&category=eq.${encodeURIComponent(CATEGORY)}`,
    { headers }
  )
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/* ── Query building ─────────────────────────────────────────────────────
 * Three tiers, narrowest first — same reasoning as resolve-product-images:
 * the specific query is what gets "Haldi Ceremony Marigold Cake" an actual
 * turmeric-yellow ceremony shot, but that same specificity returns nothing
 * for a niche item, and a product with no photo is worse than one with a
 * broader photo. `query` in the catalogue data overrides tier 1 wherever the
 * product name is a poor search term.
 */
function queryTiers(cake) {
  const plain = cake.name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim()
  const specific = cake.query
    ? dedupeWords(`${cake.query} ${CATEGORY_TERM}`)
    : dedupeWords(`${plain} ${cake.occasion} ${CATEGORY_TERM}`)

  return [
    specific,
    dedupeWords(`${cake.occasion} ${CATEGORY_TERM}`),
    CATEGORY_TERM,
  ].filter((q, i, all) => q && all.indexOf(q) === i)
}

/* ── SQL emission ───────────────────────────────────────────────────── */
function buildSql(rows, source, skipped) {
  const stamp = new Date().toISOString().slice(0, 10)
  const byOccasion = rows.reduce((acc, r) => {
    acc[r.cake.occasion] = (acc[r.cake.occasion] ?? 0) + 1
    return acc
  }, {})
  const occasionLines = Object.entries(byOccasion)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([o, n]) => `--   ${String(n).padStart(3)}  ${o}`)
    .join('\n')

  const header = `-- ============================================================
-- Migration 029: the cake catalogue, by occasion.  GENERATED FILE.
--
-- Produced by scripts/generate-cake-catalog.mjs on ${stamp} from ${source}.
-- Do not hand-edit: change scripts/data/cake-catalog.mjs and re-run.
--
-- Migration 015 gave the shop 51 cakes under ten occasion tags. That covers
-- a greeting-card calendar, not a life: there was nothing for a first
-- birthday, a naming ceremony, an annaprashan, a mundan, a roka, a
-- bride-to-be, a groom-to-be, a haldi, a retirement, a housewarming, Onam,
-- Eid, or the plain "I'm sorry" cake that is a real and frequent order.
--
-- ${rows.length} cakes across ${Object.keys(byOccasion).length} occasions:
${occasionLines}
--
-- Each row carries its own distinct photograph, deduplicated against every
-- image_url already in the products table — no two products in this shop
-- share a photo (that was migration 017's bug).
--
-- image_source is 'stock' on every row: these are licensed lookalikes and
-- the UI labels them "Representative image". Sambramo is pre-launch with no
-- signed bakery, so no photo here can claim to be the item that will arrive.
-- An admin uploading a real photo via Admin → Catalog flips the row to
-- 'actual'. See migration 023. Do not default-flip that column.
--
-- Prices are benchmarked against the going rate for the equivalent item at
-- established Indian bakery chains, on the same basis as migration 015 —
-- not quoted from any named supplier, because there isn't one yet.
--
-- Every statement is guarded by NOT EXISTS on (name, category), so this file
-- is safe to re-run and safe to apply after a partial run.${skipped.length ? `
--
-- ${skipped.length} cake(s) in the source data were skipped as already present:
${skipped.map(n => `--   ${n}`).join('\n')}` : ''}
--
-- Run this in: Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;
`

  const body = rows.map(({ cake, photo, query }) => {
    const alt = photo.alt || `${cake.name} — ${cake.description}`
    return `-- ${CATEGORY} / ${cake.occasion} — ${cake.name}
--   query: ${query}
INSERT INTO products (name, category, occasion, description, price, emoji,
                      image_url, image_alt, image_credit, image_source, image_updated_at)
SELECT ${sqlStr(cake.name)}, ${sqlStr(CATEGORY)}, ${sqlStr(cake.occasion)},
       ${sqlStr(cake.description)}, ${cake.price}, ${sqlStr(cake.emoji)},
       ${sqlStr(photo.url)},
       ${sqlStr(alt)},
       ${sqlStr(photo.credit)}, 'stock', now()
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = ${sqlStr(cake.name)} AND category = ${sqlStr(CATEGORY)}
);`
  }).join('\n\n')

  return `${header}\n${body}\n\nCOMMIT;\n`
}

/* ── Occasion imagery for the cake shop's occasion rail ─────────────────
 * The rail on /shop/Cakes shows a photo per occasion. Deriving it here, from
 * the same run that assigns the product photos, means the rail cannot drift
 * away from the catalogue the way the hand-maintained src/config/imagery.js
 * did. Existing rows are folded in so occasions that predate this run
 * (Birthday, Wedding, Photo Cake…) get a photo too.
 */
function buildOccasionPhotoModule(rows, existing) {
  const byOccasion = {}
  for (const row of existing) {
    if (!row.occasion || !row.image_url) continue
    byOccasion[row.occasion] ??= row.image_url
  }
  for (const { cake, photo } of rows) {
    byOccasion[cake.occasion] ??= photo.url
  }

  const sorted = Object.fromEntries(Object.entries(byOccasion).sort(([a], [b]) => a.localeCompare(b)))

  return `// GENERATED by scripts/generate-cake-catalog.mjs — do not edit.
//
// One representative photograph per cake occasion, taken from the same
// resolver run that assigned the product photos in migration 029 (plus the
// cakes that were already in the catalogue). The occasion rail on the cake
// shop reads from here, so it cannot drift away from the products it links
// to — which is exactly what happened to the hand-maintained imagery.js.
//
// These are licensed stock photographs of similar cakes, not photographs of
// a Sambramo deliverable. See migration 023 on image_source.

export const CAKE_OCCASION_PHOTOS = ${JSON.stringify(sorted, null, 2)}
`
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const args   = parseArgs(process.argv.slice(2))
  const search = args.source === 'unsplash' ? searchUnsplash : searchPexels

  if (args.source === 'pexels' && !process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/,')
    console.error('add it to .env, or run with --source unsplash.')
    process.exit(1)
  }

  const existing     = await fetchExistingCakes()
  const existingNames = new Set(existing.map(r => r.name))

  // A name already in the catalogue is skipped whether or not --resume was
  // passed: the SQL guard would no-op on it anyway, and spending a request
  // from a 200/hr budget to resolve a photo that will never be written is
  // the one thing this run cannot afford.
  const skipped = NEW_CAKES.filter(c => existingNames.has(c.name)).map(c => c.name)
  const todo    = NEW_CAKES.filter(c => !existingNames.has(c.name)).slice(0, args.limit)

  if (!todo.length) {
    console.error('Every cake in scripts/data/cake-catalog.mjs is already in the database.')
    process.exit(1)
  }
  console.log(`${existing.length} cakes already in the shop.`)
  if (skipped.length) console.log(`${skipped.length} of the new set already present — skipping those.`)
  console.log(`Resolving ${todo.length} cakes from ${args.source}…\n`)

  const used = await fetchAssignedPhotoIds()
  console.log(`(${used.size} photos already in use shop-wide, none will be reassigned)\n`)

  const resolved = []
  const failed   = []
  let truncated  = false

  for (const [i, cake] of todo.entries()) {
    const tiers = queryTiers(cake)
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
      // Only pay for a broader search if the narrow one found nothing usable.
      await sleep(pacingMs(args.source))
    }

    if (rateLimited) {
      console.error(`\n⚠  Rate limited after ${i} of ${todo.length} cakes.`)
      console.error('   Apply the SQL below, wait for the quota to reset, then re-run with --resume.')
      truncated = true
      break
    }
    if (!photo) {
      failed.push({ cake, query })
      console.log(`  ✗  ${cake.name}\n       ${query}  (nothing left unused)`)
      continue
    }

    used.add(photo.id)
    resolved.push({ cake, photo, query })
    console.log(`  ✓  ${cake.name}\n       ${query}\n       ${photo.id}`)
    await sleep(pacingMs(args.source))
  }

  console.log(`\n${resolved.length} resolved, ${failed.length} unresolved.`)
  if (failed.length) {
    console.log('\nUnresolved — give these a better `query` in scripts/data/cake-catalog.mjs:')
    for (const f of failed) console.log(`  ${f.cake.name}  →  "${f.query}"`)
  }

  // A duplicate here means the dedup pass failed, which is the one bug that
  // would reproduce migration 017's problem. Fail loudly rather than emit it.
  const urls = new Map()
  for (const r of resolved) {
    const seen = urls.get(r.photo.url)
    if (seen) {
      console.error(`\n✗ DUPLICATE: "${seen}" and "${r.cake.name}" share a photo. Aborting.`)
      process.exit(1)
    }
    urls.set(r.photo.url, r.cake.name)
  }

  if (args.dryRun) { console.log('\n--dry-run: no files written.'); return }
  if (!resolved.length) { console.error('Nothing resolved; no files written.'); process.exit(1) }

  const sqlPath = resolve(ROOT, args.out ?? SQL_OUT)
  writeFileSync(sqlPath, buildSql(resolved, args.source, skipped), 'utf8')
  console.log(`\nWrote ${sqlPath}`)

  // Only rewrite the occasion imagery from a complete run. A truncated one
  // describes part of the catalogue, and a partial map would quietly drop
  // occasions from the rail.
  if (truncated) {
    console.log(`Skipped ${PHOTOS_OUT} — this run was cut short and would describe a partial catalogue.`)
  } else {
    const photosPath = resolve(ROOT, PHOTOS_OUT)
    writeFileSync(photosPath, buildOccasionPhotoModule(resolved, existing), 'utf8')
    console.log(`Wrote ${photosPath}`)
  }

  console.log('\nNext: paste the SQL into Supabase Dashboard → SQL Editor.')
}

main().catch(err => { console.error(err); process.exit(1) })
