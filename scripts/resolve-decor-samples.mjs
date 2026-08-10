#!/usr/bin/env node
/**
 * Resolve ONE distinct photograph per decoration sample and write
 * src/config/generatedDecorSamples.js.
 *
 * Sibling of resolve-product-images.mjs, and deliberately built the same way:
 * it runs locally by hand, it never writes to the database, and its single
 * most important behaviour is DEDUPLICATION.
 *
 * ── Why deduplication matters more here than it did there ─────────────────
 * The product resolver had to avoid two products sharing a photo. This one
 * has to avoid that AND avoid reusing any photograph the shop has already
 * assigned to a product — because these two galleries sit on the same page.
 * A "Balloon Arch & Name Backdrop" sample illustrated with the exact
 * photograph used by the "Baby Shower Balloon Arch Kit" product tile, six
 * hundred pixels apart, reads as a stock-photo site rather than a business.
 *
 * So the used-id set is seeded from every Pexels URL already committed
 * anywhere in src/config and supabase/migrations, then grown as this run
 * assigns. No DB round-trip is needed for that and no key beyond Pexels.
 *
 * ── What it is NOT ────────────────────────────────────────────────────────
 * It is not a portfolio builder. Every photo it assigns is marked
 * `source: 'stock'`, which is what makes the gallery render the
 * "Representative image" badge. Photographs of real Sambramo work get added
 * by hand with source 'actual'; this script will never overwrite one.
 *
 *   node scripts/resolve-decor-samples.mjs --dry-run
 *   node scripts/resolve-decor-samples.mjs --event birthday
 *   node scripts/resolve-decor-samples.mjs --only-missing
 *
 * Flags
 *   --dry-run        Print the plan; write nothing.
 *   --event <id>     Restrict to one event id (repeatable).
 *   --limit <n>      Stop after n samples.
 *   --only-missing   Skip samples that already have a photo. Pexels allows
 *                    200 requests/hour; use this to resume.
 *   --out <path>     Output module path.
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
  const out = { dryRun: false, events: [], limit: Infinity, onlyMissing: false, out: null }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run':      out.dryRun = true; break
      case '--only-missing': out.onlyMissing = true; break
      case '--event':        out.events.push(argv[++i]); break
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
 * Load the sample definitions the app itself uses.
 *
 * The app's imports are extensionless (bundler resolution), which Node cannot
 * follow on its own — and duplicating the sample list into this script is
 * exactly how the hardcoded copy in imagery.js went stale against migration
 * 021. So bundle the real module with the bundler the project already
 * depends on and import the result. One source, no copy to drift.
 */
async function loadSamples() {
  const dir = mkdtempSync(join(tmpdir(), 'decor-samples-'))
  const bundle = join(dir, 'samples.mjs')
  try {
    await esbuild.build({
      entryPoints: [resolve(ROOT, 'src/config/decorSamples.js')],
      outfile: bundle,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    })
    const mod = await import(pathToFileURL(bundle).href)
    return mod.DECOR_SAMPLES
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* ── dedupe seed ────────────────────────────────────────────────────── */

/** `.../photos/12114825/pexels-photo-12114825.jpeg` → `12114825` */
function photoIdFromUrl(url) {
  const m = String(url ?? '').match(/pexels-photo-(\d+)/) ?? String(url ?? '').match(/\/photos\/(\d+)\//)
  return m ? m[1] : null
}

/**
 * Every Pexels photo id already committed to this repo.
 *
 * Scanning the files rather than querying the database is the right trade
 * here: the migrations ARE the record of what the products were given, they
 * are checked in, and this way the script needs no Supabase credentials at
 * all. A photo assigned in the dashboard but never written to a migration
 * would be missed — but this project applies every image change through a
 * generated migration, so that case does not arise.
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

async function searchPexels(query, perPage = 20) {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/')

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText}`)

  const body = await res.json()
  return body.photos ?? []
}

/**
 * A caption a screen reader can use, built from what Pexels actually returns.
 *
 * Pexels' `alt` is usually a real description; when it is empty the honest
 * fallback is the sample's own title, not a guess about what is in the frame.
 */
function altFor(photo, sample) {
  const alt = (photo.alt ?? '').trim()
  return alt || `${sample.title} — reference photograph of a similar setup`
}

/**
 * Words that appear in half the queries here and so carry no signal — matching
 * on them would rank a photograph of a dinner party above a photograph of a
 * mandap for the query "indian wedding mandap decoration flowers ceremony".
 */
const STOPWORDS = new Set([
  'the', 'and', 'a', 'of', 'for', 'with', 'party', 'decoration', 'decor',
  'setup', 'celebration', 'event', 'indian',
])

/**
 * How well a candidate photograph actually matches what the sample is about.
 *
 * Taking the first unused result is not good enough here, and the reason is
 * the deduplication above: the product catalogue has already claimed the top
 * few results for every obvious query, so "first unused" routinely lands on
 * result eight — which for "baby shower pastel balloon arch" was a Minnie
 * Mouse birthday. These photographs are the entire point of the gallery, so
 * rank the whole page and take the best, not the earliest survivor.
 *
 * Scoring is deliberately crude — keyword overlap against Pexels' own alt
 * text, plus a nudge for landscape frames that crop well into a wide card.
 * A crude score over twenty candidates beats a perfect score over one.
 */
function relevance(photo, query) {
  const alt = (photo.alt ?? '').toLowerCase()
  if (!alt) return 0

  const terms = [...new Set(query.toLowerCase().split(/\s+/))].filter(t => t && !STOPWORDS.has(t))
  const hits = terms.filter(t => alt.includes(t)).length

  // Ratio rather than count, so a two-word query that matches both terms is
  // not beaten by a six-word query that matched three.
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

  return `// GENERATED by scripts/resolve-decor-samples.mjs — do not edit.
//
// One distinct photograph per decoration sample, keyed \`eventId/sampleId\` to
// match the entries in decorSamples.js. Every URL here is a licensed stock
// photograph of a similar setup, never a photograph of work Sambramo has
// delivered — see the header of decorSamples.js for why that distinction is
// load-bearing rather than pedantic.
//
// Re-run the resolver rather than editing this file:
//   node scripts/resolve-decor-samples.mjs --dry-run
//   node scripts/resolve-decor-samples.mjs
//
// Resolved ${new Date().toISOString().slice(0, 10)} from pexels. ${entries.length} setups.

export const GENERATED_DECOR_PHOTOS = {
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
    : resolve(ROOT, 'src/config/generatedDecorSamples.js')

  // Anything already resolved. Kept, not refetched — and an 'actual' photo
  // added by hand is never touched by this script under any flag.
  const existing = {}
  if (existsSync(outPath)) {
    const mod = await import(pathToFileURL(outPath).href + `?t=${Date.now()}`)
    Object.assign(existing, mod.GENERATED_DECOR_PHOTOS ?? {})
  }

  const samples = await loadSamples()
  const used = seedUsedIds()
  console.log(`Seeded ${used.size} photo ids already committed in this repo.\n`)

  const queue = []
  for (const [eventId, list] of Object.entries(samples)) {
    if (args.events.length && !args.events.includes(eventId)) continue
    for (const sample of list) {
      const key = `${eventId}/${sample.id}`
      if (existing[key]?.source === 'actual') continue
      if (args.onlyMissing && existing[key]) continue
      queue.push({ key, eventId, sample })
    }
  }

  const work = queue.slice(0, args.limit)
  console.log(`${work.length} sample${work.length === 1 ? '' : 's'} to resolve.\n`)

  const resolved = { ...existing }
  let assigned = 0
  let skipped = 0

  for (const { key, sample } of work) {
    let photos
    try {
      photos = await searchPexels(sample.query)
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.error(`\nPexels rate limit hit after ${assigned} assignments.`)
        console.error('Apply what has been written, wait an hour, then resume with --only-missing.')
        break
      }
      throw err
    }

    const [pick] = photos
      .filter(p => !used.has(String(p.id)))
      .map(p => [p, relevance(p, sample.query)])
      .sort(([, a], [, b]) => b - a)
      .map(([p]) => p)

    if (!pick) {
      console.warn(`  ⚠ ${key} — every result already used; leaving unresolved`)
      skipped++
      continue
    }

    used.add(String(pick.id))
    resolved[key] = {
      url:    pick.src.large ?? pick.src.original,
      alt:    altFor(pick, sample),
      credit: `Photo by ${pick.photographer} on Pexels`,
      source: 'stock',
    }
    assigned++
    console.log(`  ✓ ${key.padEnd(34)} ${pick.id}  ${(pick.alt ?? '').slice(0, 52)}`)
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
