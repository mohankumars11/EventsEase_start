#!/usr/bin/env node
/**
 * Resolve ONE distinct high-resolution photo per product, and emit the SQL
 * that assigns them.
 *
 * Why this exists
 * ---------------
 * Migrations 017 and 021 set products.image_url with category-wide UPDATEs —
 * `WHERE category = 'Cakes' AND occasion = 'Birthday'` — so every birthday
 * cake in the shop shares a single stock photo. This script replaces that
 * with a per-row assignment, and its single most important behaviour is
 * DEDUPLICATION: no two products anywhere in the shop may receive the same
 * photograph. That is precisely what 017 got wrong. The run aborts rather
 * than emit a duplicate.
 *
 * How it runs
 * -----------
 * Locally, by hand, like every migration in this project. It writes a .sql
 * file for review and NEVER touches the database — reads go through the
 * public anon key (products are world-readable by RLS), writes happen when
 * you paste the generated SQL into the Supabase SQL editor. There is
 * therefore no service-role key anywhere in this script, and nothing here
 * is ever bundled into the client.
 *
 *   node scripts/resolve-product-images.mjs --category Cakes --dry-run
 *   node scripts/resolve-product-images.mjs --category Cakes
 *   node scripts/resolve-product-images.mjs            # everything
 *
 * Flags
 *   --dry-run          Print the plan; write no files.
 *   --category <name>  Restrict to one category (repeatable).
 *   --limit <n>        Stop after n products. Useful against the rate limit.
 *   --only-missing     Only rows this resolver has never touched. Pexels
 *                      allows 200 requests/hour and the catalogue is ~344
 *                      products, so a full run WILL be cut short; apply the
 *                      SQL it produced, wait an hour, then resume with this.
 *   --source <p|u>     'pexels' (default) or 'unsplash'.
 *   --out <path>       Output SQL path.
 *
 * Environment (read from .env; none are VITE_-prefixed except the two the
 * app already uses, so no secret added here can reach the browser bundle):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   — to read the catalog
 *   PEXELS_API_KEY                              — https://pexels.com/api
 *   UNSPLASH_ACCESS_KEY                         — fallback source
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Shared with generate-cake-catalog.mjs — above all the dedup set, which
// only works if both generators consult the same live list of photo ids.
import {
  ROOT, loadEnv, searchPexels, searchUnsplash, fetchAssignedPhotoIds,
  supabaseHeaders, sqlStr, dedupeWords, pacingMs, sleep,
} from './lib/photos.mjs'

loadEnv()

/* ── args ───────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = { dryRun: false, categories: [], limit: Infinity, source: 'pexels', out: null, onlyMissing: false }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run':  out.dryRun = true; break
      case '--only-missing': out.onlyMissing = true; break
      case '--category': out.categories.push(argv[++i]); break
      case '--limit':    out.limit = Number(argv[++i]); break
      case '--source':   out.source = argv[++i].startsWith('u') ? 'unsplash' : 'pexels'; break
      case '--out':      out.out = argv[++i]; break
      case '-h':
      case '--help':
        console.log(`
Resolve one distinct HD photo per product and emit the assigning SQL.

  node scripts/resolve-product-images.mjs [flags]

  --dry-run          Print the plan; write no files. Start here.
  --category <name>  Restrict to one category. Repeatable.
                     Cakes | Gifts | Flowers | Hampers |
                     "Party Essentials" | "Pooja & Essentials"
  --limit <n>        Stop after n products.
  --only-missing     Only products this resolver has never touched.
                     Use to resume after a rate limit, once the
                     generated SQL from the previous run is applied.
  --source <name>    pexels (default, 200 req/hr) | unsplash (50 req/hr)
  --out <path>       Output SQL path.

Requires PEXELS_API_KEY (or UNSPLASH_ACCESS_KEY) plus VITE_SUPABASE_URL
and VITE_SUPABASE_ANON_KEY in .env. Never writes to the database.
`)
        process.exit(0)
      default:
        if (argv[i].startsWith('--')) throw new Error(`Unknown flag: ${argv[i]}`)
    }
  }
  return out
}

/* ── Query building ─────────────────────────────────────────────────────
 *
 * A product name is a shopping label, not a search term. "Barbie Theme Cake
 * (1.5kg)" returns doll photographs; "Number Shaped Cake (0.5kg)" returns
 * nothing useful at all. Three transformations fix that:
 *
 *   1. Strip the packaging suffix — "(1.5kg)", "(Set of 6)" — which is
 *      meaningful to a buyer and pure noise to an image search.
 *   2. Rewrite a licensed/ambiguous theme into what the photo should
 *      actually depict. This also sidesteps trademarked terms: we want a
 *      pink fondant cake, not a photograph of a Mattel product.
 *   3. Append a category term so "Rose" lands on flowers, not perfume.
 *
 * This table is meant to be edited. Run with --dry-run, look at what comes
 * back, add a line, run again.
 */
const THEME_HINTS = [
  [/barbie/i,            'pink fondant doll birthday cake'],
  [/spider\s*-?man/i,    'red and blue superhero fondant cake'],
  [/minion/i,            'yellow fondant character cake'],
  [/unicorn/i,           'pastel unicorn cake with gold horn'],
  [/princess castle/i,   'three tier castle shaped fondant cake'],
  [/dinosaur/i,          'green jungle dinosaur birthday cake'],
  [/car racing/i,        'race track birthday cake for kids'],
  [/football/i,          'football pitch birthday cake'],
  [/cartoon theme/i,     'colourful character fondant birthday cake'],
  [/number shaped/i,     'number shaped birthday cake'],
  [/photo cake|collage photo|couple photo|a4 photo/i, 'edible photo print cake'],
  [/naked/i,             'semi frosted naked cake with berries'],
  [/three-?tier|3-?tier/i, 'three tier white wedding cake'],
  [/silver jubilee/i,    'silver anniversary cake'],
  [/golden anniversary/i,'gold leaf anniversary cake'],
  [/heart-?shaped/i,     'heart shaped red velvet cake'],
  [/rakhi/i,             'rakhi thali indian festival'],
  [/diwali/i,            'diwali diya lamps indian festival'],
  [/ganesh/i,            'ganesh chaturthi idol decoration'],
  [/haldi/i,             'haldi ceremony turmeric decoration'],
  [/mehendi|mehndi/i,    'mehendi henna hands indian wedding'],
]

const CATEGORY_TERM = {
  'Cakes':              'cake dessert food photography',
  'Gifts':              'gift box present',
  'Flowers':            'flower bouquet arrangement',
  'Hampers':            'gift hamper basket',
  'Party Essentials':   'party decoration celebration',
  'Pooja & Essentials': 'indian puja ritual brass',
}

// The parenthetical on a product name is always packaging or weight —
// "(1.5kg)", "(Set of 6)", "(Box of 6)". Meaningful to a buyer, noise to
// an image search.
const NOISE = /\([^)]*\)/g

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildQuery(product) {
  const base = product.name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim()

  for (const [pattern, replacement] of THEME_HINTS) {
    if (pattern.test(product.name)) {
      return dedupeWords(`${replacement} ${CATEGORY_TERM[product.category] ?? ''}`.trim())
    }
  }

  const parts = [base]
  // The occasion sharpens generic names ("Rose Cake" → wedding vs birthday)
  // but is redundant when the name already says it.
  if (product.occasion && !new RegExp(escapeRe(product.occasion), 'i').test(base)) {
    parts.push(product.occasion)
  }
  parts.push(CATEGORY_TERM[product.category] ?? '')
  return dedupeWords(parts.join(' ').replace(/\s+/g, ' ').trim())
}

/* ── Catalog read ───────────────────────────────────────────────────── */
async function fetchProducts(categories, onlyMissing = false) {
  const { base, headers } = supabaseHeaders()

  let url = `${base}/rest/v1/products?select=id,name,category,occasion,description`
            + `&order=category.asc,name.asc`

  // Resume after a rate limit. image_credit is the marker: this resolver
  // always writes one, and the category-wide URLs from migrations 017/021
  // never had it. So "credit is null" means "this row has never had a
  // photo of its own" — exactly the set worth spending quota on.
  if (onlyMissing) url += `&image_credit=is.null`
  if (categories.length) {
    // Each name must be percent-encoded: "Pooja & Essentials" contains an
    // ampersand, which otherwise ends the query parameter and leaves
    // PostgREST parsing an unterminated in.() list.
    const list = categories.map(c => `"${encodeURIComponent(c)}"`).join(',')
    url += `&category=in.(${list})`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/* ── SQL emission ───────────────────────────────────────────────────── */
function buildSql(rows, source) {
  const stamp = new Date().toISOString().slice(0, 10)
  const byCategory = rows.reduce((acc, r) => {
    acc[r.product.category] = (acc[r.product.category] ?? 0) + 1
    return acc
  }, {})

  const header = `-- ============================================================
-- Migration 024: per-product photography.  GENERATED FILE.
--
-- Produced by scripts/resolve-product-images.mjs on ${stamp} from ${source}.
-- Do not hand-edit: re-run the script instead.
--
-- Replaces the category-wide image_url assignments made by migrations 017
-- and 021, under which every birthday cake shared one photograph. Each
-- statement below targets a single product id, and no two products in the
-- same category were given the same photo.
--
-- ${rows.length} products:
${Object.entries(byCategory).map(([c, n]) => `--   ${String(n).padStart(4)}  ${c}`).join('\n')}
--
-- image_source stays 'stock' — these are licensed lookalikes, and the UI
-- labels them "Representative image". An admin uploading a real photo via
-- the Catalog tab flips the row to 'actual'. See migration 023.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;
`

  const body = rows.map(({ product, photo, query }) =>
`-- ${product.category}${product.occasion ? ` / ${product.occasion}` : ''} — ${product.name}
--   query: ${query}
UPDATE products SET
  image_url        = ${sqlStr(photo.url)},
  image_alt        = ${sqlStr(photo.alt || `${product.name} — ${product.description || product.category}`)},
  image_credit     = ${sqlStr(photo.credit)},
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = ${sqlStr(product.id)};`
  ).join('\n\n')

  return `${header}\n${body}\n\nCOMMIT;\n`
}

/* ── Landing-page imagery, generated from the same data ─────────────────
 * src/config/imagery.js is a hand-copied mirror of migration 017's URLs
 * and has already drifted (it still claims Party Essentials has no photo,
 * which migration 021 fixed). Emitting it from the same run that writes
 * the SQL means the landing page and the shop cannot disagree again.
 */
function buildImageryModule(rows) {
  const catalogue = {}
  for (const { product, photo } of rows) {
    const occasion = product.occasion || 'Default'
    catalogue[product.category] ??= {}
    // First product in each (category, occasion) group represents the group.
    catalogue[product.category][occasion] ??= photo.url
  }

  return `// GENERATED by scripts/resolve-product-images.mjs — do not edit.
//
// One representative photo per (category, occasion), taken from the same
// resolver run that produced the product image_url values. Importing from
// here keeps the landing page in step with the shop; the previous
// hand-maintained copy in imagery.js had silently gone stale.

export const GENERATED_CATALOGUE_PHOTOS = ${JSON.stringify(catalogue, null, 2)}

export const GENERATED_CATEGORY_PHOTO = Object.fromEntries(
  Object.entries(GENERATED_CATALOGUE_PHOTOS).map(([category, byOccasion]) => [
    category,
    Object.values(byOccasion)[0] ?? null,
  ])
)
`
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const search = args.source === 'unsplash' ? searchUnsplash : searchPexels

  // Check the key before the catalogue read, not on the first search —
  // otherwise a missing key reports itself after "Resolving 341 products…",
  // which reads like the run got somewhere.
  if (args.source === 'pexels' && !process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/,')
    console.error('add it to .env, or run with --source unsplash.')
    process.exit(1)
  }
  if (args.source === 'unsplash' && !(process.env.UNSPLASH_ACCESS_KEY || process.env.VITE_UNSPLASH_ACCESS_KEY)) {
    console.error('UNSPLASH_ACCESS_KEY is not set.')
    process.exit(1)
  }

  const products = (await fetchProducts(args.categories, args.onlyMissing)).slice(0, args.limit)
  if (!products.length) {
    console.error('No products matched. Check --category spelling against the CHECK constraint.')
    process.exit(1)
  }
  console.log(`Resolving ${products.length} products from ${args.source}…\n`)

  // Dedup is GLOBAL, not per-category. Scoping it per category was the
  // first instinct — a bouquet and a hamper might reasonably share a
  // festive table shot — but it produced 12 shared photos across Flowers,
  // Gifts and Hampers on the first real run, and a shopper who sees the
  // same picture on "Rose Bouquet" and "Rose Hamper" has been told nothing
  // about either. One photo, one product, shop-wide.
  // Seeded with everything the shop already points at, so photos are never
  // reused across separate runs of this script.
  const used = await fetchAssignedPhotoIds()
  if (used.size) console.log(`(${used.size} photos already in use, will not be reassigned)\n`)

  const resolved = []
  const failed = []
  // Set when the source cuts us off mid-catalogue, so the landing-page
  // imagery module below knows this run does not describe the whole shop.
  let truncated = false

  for (const [i, product] of products.entries()) {
    // Three tiers, narrowest first. A long specific query is what gets a
    // Barbie cake an actual pink fondant cake, but the same specificity
    // returns nothing at all for a niche item — and a product with no photo
    // is worse than a product with a broader one. Only the tier that
    // produced a usable result is reported, so --dry-run still shows what
    // the search actually matched on.
    const tiers = [
      buildQuery(product),
      dedupeWords([product.occasion, CATEGORY_TERM[product.category]].filter(Boolean).join(' ')),
      CATEGORY_TERM[product.category] ?? product.category,
    ].filter((q, idx, all) => q && all.indexOf(q) === idx)

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
      console.error(`\n⚠  Rate limited after ${i} of ${products.length} products.`)
      console.error('   Apply the SQL below, then re-run with --only-missing once the quota resets.')
      truncated = true
      break
    }
    if (!photo) {
      // Every tier down to the bare category term came back with nothing
      // new. Either the source has no matching photography, or this
      // category has more products than the source has distinct images.
      failed.push({ product, query, reason: 'no unused photo at any tier' })
      console.log(`  ✗  ${product.name}\n       ${query}  (nothing left unused)`)
      continue   // the tier loop already paced itself
    }

    used.add(photo.id)
    resolved.push({ product, photo, query })
    console.log(`  ✓  ${product.name}\n       ${query}\n       ${photo.id}`)

    // Stay under 200 req/hr on Pexels, 50 on Unsplash.
    await sleep(pacingMs(args.source))
  }

  console.log(`\n${resolved.length} resolved, ${failed.length} unresolved.`)
  if (failed.length) {
    console.log('\nUnresolved — widen or fix these in THEME_HINTS, then re-run:')
    for (const f of failed) console.log(`  ${f.product.name}  →  "${f.query}"  (${f.reason})`)
  }

  // A duplicate here means the dedup pass failed, which is the one bug that
  // would reproduce migration 017's problem. Fail loudly rather than emit it.
  // Keyed on the URL alone, matching the global dedup above.
  const urls = new Map()
  for (const r of resolved) {
    const seen = urls.get(r.photo.url)
    if (seen) {
      console.error(`\n✗ DUPLICATE: "${seen}" and "${r.product.name}" share a photo. Aborting.`)
      process.exit(1)
    }
    urls.set(r.photo.url, r.product.name)
  }

  if (args.dryRun) {
    console.log('\n--dry-run: no files written.')
    return
  }
  if (!resolved.length) {
    console.error('Nothing resolved; no files written.')
    process.exit(1)
  }

  const sqlPath = resolve(ROOT, args.out ?? 'supabase/migrations/024_product_images_per_product.sql')
  writeFileSync(sqlPath, buildSql(resolved, args.source), 'utf8')
  console.log(`\nWrote ${sqlPath}`)

  // Only regenerate landing imagery on a genuinely complete run. Any partial
  // pass writes a module missing whole categories: --category is the obvious
  // one, but --only-missing is just as partial (it deliberately skips every
  // product already resolved) and a rate-limited run is partial by accident.
  // imagery.js merges this over its hardcoded fallbacks, so a truncated file
  // degrades rather than breaks — but it would still silently misrepresent
  // itself as the source of truth, which is the exact failure this module
  // was introduced to end.
  const isFullRun =
    !args.categories.length &&
    args.limit === Infinity &&
    !args.onlyMissing &&
    !failed.length &&
    !truncated

  if (isFullRun) {
    const imageryPath = resolve(ROOT, 'src/config/generatedImagery.js')
    writeFileSync(imageryPath, buildImageryModule(resolved), 'utf8')
    console.log(`Wrote ${imageryPath}`)
  }

  console.log('\nReview the SQL, then paste it into the Supabase SQL editor.')
}

main().catch(err => { console.error(err); process.exit(1) })
