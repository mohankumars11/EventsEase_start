#!/usr/bin/env node
/**
 * Resolve ONE distinct photograph per décor catalogue item and write
 * src/config/generatedDecorCatalog.js.
 *
 * Direct sibling of resolve-decor-samples.mjs — same Pexels key, same
 * bundle-the-real-module trick so nothing is duplicated into this script, same
 * dedupe discipline, same `source: 'stock'` on every assignment.
 *
 * ── Why the dedupe seed matters even more here ────────────────────────────
 * The catalogue renders on the SAME PAGE as the four decoration samples and
 * one scroll from the shop's product tiles. Three galleries, one page. If the
 * "Candlelight Dinner at Home" card and the "Candlelight Dinner Setup" sample
 * share a photograph, the page stops reading as a catalogue of distinct things
 * we build and starts reading as one stock photo used twice — which is exactly
 * the impression the whole honesty apparatus exists to avoid.
 *
 * So the used-id set is seeded from every Pexels id already committed anywhere
 * in src/config and supabase/migrations, which by construction includes
 * generatedDecorSamples.js and every product image migration.
 *
 *   node scripts/resolve-decor-catalog.mjs --dry-run
 *   node scripts/resolve-decor-catalog.mjs --occasion anniversary
 *   node scripts/resolve-decor-catalog.mjs --only-missing
 *
 * Flags
 *   --dry-run          Print the plan; write nothing.
 *   --occasion <id>    Restrict to items tagged with that occasion (repeatable).
 *   --limit <n>        Stop after n items.
 *   --only-missing     Skip items that already have a photo. Pexels allows 200
 *                      requests/hour; use this to resume after a rate limit.
 *   --out <path>       Output module path.
 *
 * Environment (read from .env, never VITE_-prefixed, never bundled):
 *   PEXELS_API_KEY   — https://www.pexels.com/api/
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import * as esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ── .env, without adding a dependency ──────────────────────────────── */
function loadEnv() {
  const path = resolve(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const value = m[2].trim().replace(/^["'](.*)["']$/, '$1')
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}
loadEnv()

/* ── args ───────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = { dryRun: false, occasions: [], limit: Infinity, onlyMissing: false, out: null }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run':      out.dryRun = true; break
      case '--only-missing': out.onlyMissing = true; break
      case '--occasion':     out.occasions.push(argv[++i]); break
      case '--limit':        out.limit = Number(argv[++i]); break
      case '--out':          out.out = argv[++i]; break
      case '--help':
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
        process.exit(0)
      default:
        if (argv[i].startsWith('--')) {
          console.error(`Unknown flag ${argv[i]}`)
          process.exit(1)
        }
    }
  }
  return out
}

/**
 * Load the catalogue the app itself renders.
 *
 * Bundled with esbuild rather than imported directly, because the app's imports
 * are extensionless and Node cannot follow those. Same approach as the sample
 * resolver, and for the same reason: a copy of the item list in this script is
 * a copy that goes stale the first time somebody adds a setup.
 *
 * DECOR_CATALOG, not ALL_CATALOG_ITEMS — the resolved export reads the very
 * file this script writes, which would make the run depend on its own previous
 * output.
 */
async function loadCatalog() {
  const dir = mkdtempSync(join(tmpdir(), 'decor-catalog-'))
  const bundle = join(dir, 'catalog.mjs')
  try {
    await esbuild.build({
      entryPoints: [resolve(ROOT, 'src/data/decorCatalog.js')],
      outfile: bundle,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    })
    const mod = await import(pathToFileURL(bundle).href)
    return mod.DECOR_CATALOG
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* ── dedupe seed ────────────────────────────────────────────────────── */

/**
 * Every Pexels photo id already committed to this repo — the samples gallery,
 * the shop's product migrations, everything.
 *
 * Scanning committed files rather than querying Supabase keeps this script
 * credential-free beyond the Pexels key, and the migrations ARE the record of
 * what the products were given.
 */
function seedUsedIds() {
  const used = new Set()
  const roots = [resolve(ROOT, 'src/config'), resolve(ROOT, 'supabase/migrations')]

  for (const dir of roots) {
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (!/\.(js|sql)$/.test(name)) continue
      const text = readFileSync(join(dir, name), 'utf8')
      for (const m of text.matchAll(/pexels-photo-(\d+)/g)) used.add(m[1])
    }
  }
  return used
}

/* ── Pexels ─────────────────────────────────────────────────────────── */

async function searchPexels(query, perPage = 24) {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/')

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText}`)

  const body = await res.json()
  return body.photos ?? []
}

function altFor(photo, item) {
  const alt = (photo.alt ?? '').trim()
  return alt || `${item.name} — reference photograph of a similar setup`
}

const STOPWORDS = new Set([
  'the', 'and', 'a', 'of', 'for', 'with', 'party', 'decoration', 'decor',
  'setup', 'celebration', 'event', 'indian',
])

/**
 * How well a candidate photograph matches what the item actually is.
 *
 * Identical scoring to the sample resolver, and it earns its keep harder here:
 * this catalogue asks Pexels ~60 queries that overlap heavily with the ones the
 * samples and the shop already spent, so "first unused result" lands deep in
 * the page far more often. Rank the whole page, take the best.
 */
function relevance(photo, query) {
  const alt = (photo.alt ?? '').toLowerCase()
  if (!alt) return 0

  const terms = [...new Set(query.toLowerCase().split(/\s+/))].filter(t => t && !STOPWORDS.has(t))
  const hits = terms.filter(t => alt.includes(t)).length
  const score = terms.length ? hits / terms.length : 0

  const ratio = photo.width / photo.height
  const wide  = ratio >= 1.2 && ratio <= 2.2 ? 0.08 : 0

  return score + wide
}

/* ── output ─────────────────────────────────────────────────────────── */

function buildModule(entries) {
  const body = entries
    .map(([key, v]) =>
      `  ${JSON.stringify(key)}: {\n` +
      `    url:    ${JSON.stringify(v.url)},\n` +
      `    alt:    ${JSON.stringify(v.alt)},\n` +
      `    credit: ${JSON.stringify(v.credit)},\n` +
      `    source: ${JSON.stringify(v.source)},\n` +
      `  },`
    )
    .join('\n')

  return `// GENERATED by scripts/resolve-decor-catalog.mjs — do not edit.
//
// One distinct photograph per décor catalogue item, keyed by the item \`id\` in
// src/data/decorCatalog.js. Every URL here is a licensed stock photograph of a
// similar setup, never a photograph of work Sambramo has delivered — see the
// header of decorCatalog.js for why that distinction is load-bearing.
//
// Re-run the resolver rather than editing this file:
//   node scripts/resolve-decor-catalog.mjs --dry-run
//   node scripts/resolve-decor-catalog.mjs --only-missing
//
// Resolved ${new Date().toISOString().slice(0, 10)} from pexels. ${entries.length} items.

export const GENERATED_CATALOG_PHOTOS = {
${body}
}
`
}

/* ── main ───────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/,')
    console.error('then add PEXELS_API_KEY=... to .env')
    process.exit(1)
  }

  const outPath = args.out
    ? resolve(ROOT, args.out)
    : resolve(ROOT, 'src/config/generatedDecorCatalog.js')

  // Anything already resolved is kept, not refetched — and an 'actual' photo
  // added by hand is never touched by this script under any flag.
  const existing = {}
  if (existsSync(outPath)) {
    const mod = await import(pathToFileURL(outPath).href + `?t=${Date.now()}`)
    Object.assign(existing, mod.GENERATED_CATALOG_PHOTOS ?? {})
  }

  const catalog = await loadCatalog()
  const used = seedUsedIds()
  console.log(`Seeded ${used.size} photo ids already committed in this repo.\n`)

  const queue = catalog.filter(item => {
    if (args.occasions.length && !item.occasions.some(o => args.occasions.includes(o))) return false
    if (existing[item.id]?.source === 'actual') return false
    if (args.onlyMissing && existing[item.id]) return false
    return true
  })

  const work = queue.slice(0, args.limit)
  console.log(`${work.length} item${work.length === 1 ? '' : 's'} to resolve.\n`)

  const resolved = { ...existing }
  let assigned = 0
  let skipped = 0

  for (const item of work) {
    let photos
    try {
      photos = await searchPexels(item.query)
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.error(`\nPexels rate limit hit after ${assigned} assignments.`)
        console.error('What is written below is complete; wait an hour and resume with --only-missing.')
        break
      }
      throw err
    }

    const [pick] = photos
      .filter(p => !used.has(String(p.id)))
      .map(p => [p, relevance(p, item.query)])
      .sort(([, a], [, b]) => b - a)
      .map(([p]) => p)

    if (!pick) {
      console.warn(`  ⚠ ${item.id} — every result already used; leaving unresolved`)
      skipped++
      continue
    }

    used.add(String(pick.id))
    resolved[item.id] = {
      url:    pick.src.large ?? pick.src.original,
      alt:    altFor(pick, item),
      credit: `Photo by ${pick.photographer} on Pexels`,
      source: 'stock',
    }
    assigned++
    console.log(`  ✓ ${item.id.padEnd(26)} ${String(pick.id).padEnd(9)} ${(pick.alt ?? '').slice(0, 50)}`)
  }

  console.log(`\n${assigned} assigned, ${skipped} skipped, ${Object.keys(resolved).length} total.`)

  if (args.dryRun) {
    console.log('\n--dry-run: nothing written.')
    return
  }

  const entries = Object.entries(resolved).sort(([a], [b]) => a.localeCompare(b))
  writeFileSync(outPath, buildModule(entries), 'utf8')
  console.log(`\nWrote ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
