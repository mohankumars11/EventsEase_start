/**
 * Photographs for the home mosaic's shelves.
 *
 * The mosaic on the home screen is built out of photographs, not emoji plates,
 * and most of its tiles already have one: the shop categories resolve through
 * config/imagery.js, the occasions through generatedDecorSamples.js. Two
 * shelves have nothing to draw from because they are new — Indian handmade and
 * eco/plants — and a tile with no photograph falls back to an emoji, which is
 * the exact look the mosaic exists to replace.
 *
 * Same shape and same reasoning as resolve-decor-samples.mjs: resolve a set of
 * DISTINCT photos per shelf, write them to a generated module, and never search
 * at runtime. ProductImage's live `query` path is capped at 24 searches per page
 * load app-wide, and a mosaic that spends a third of that budget on two tiles
 * would starve everything else on the screen.
 *
 * Run by hand, like every other resolver here:
 *
 *   node scripts/resolve-shelf-photos.mjs --dry-run
 *   node scripts/resolve-shelf-photos.mjs
 *
 * Nothing here touches the database. It writes one file.
 */

import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, loadEnv, searchPexels, photoIdFromUrl, pacingMs, sleep } from './lib/photos.mjs'

loadEnv()

const DRY = process.argv.includes('--dry-run')
const OUT = resolve(ROOT, 'src/config/generatedShelfPhotos.js')

/**
 * Four frames each, because the tile cross-fades them (see RotatingPhoto). One
 * still of "handmade" says we own a stock photo; four different crafts say
 * there is a shelf behind it.
 *
 * The queries are specific on purpose. "handicraft" alone returns European
 * pottery studios; naming the actual traditions — Channapatna lacquerware,
 * terracotta, brass, jute — returns the objects these shelves are meant to
 * sell, and Channapatna in particular is made on the road between the two
 * cities Sambramo is live in.
 */
const SHELVES = {
  handmade: [
    'channapatna wooden toys indian handicraft',
    'indian terracotta clay pottery handmade',
    'indian brass handicraft traditional decor',
    'handwoven jute basket indian craft',
  ],
  eco: [
    'money plant indoor pot gift',
    'peace lily plant white ceramic pot',
    'lucky bamboo plant indoor decor',
    'succulent plant terracotta pot gift',
  ],
  /* Migration 048's shelves. Named as the OBJECT and not as the craft term:
     "handloom" returns European weaving studios and "heritage" returns
     castles, whereas "silk saree gold zari" returns a silk saree. */
  silk: [
    'silk saree gold zari indian traditional',
    'indian bride silk saree wedding',
    'silk fabric texture gold thread',
    'draped silk saree pallu detail',
  ],
  weaves: [
    'indian handloom weaving loom weaver',
    'handloom cotton saree folded stack',
    'indian textile block print fabric',
    'silk thread spools weaving workshop',
  ],
  carving: [
    'stone carving sculpture indian temple',
    'wood carving artisan hands chisel',
    'brass idol statue indian traditional',
    'sandalwood carved figurine detail',
  ],
  mysuru: [
    'mysore palace karnataka india',
    'indian traditional painting gold leaf',
    'sandalwood incense sticks india',
    'indian wooden inlay box craft',
  ],
}

/* Dedup against every photo the repo has already committed, not just within
   this run. Without it a fresh resolve can hand the handmade tile a photo the
   decor gallery is already using, and the same picture appearing twice on one
   screen is the single most visible way a catalogue looks thin. */
function committedPhotoIds() {
  const ids = new Set()
  const files = [
    'src/config/generatedImagery.js',
    'src/config/generatedDecorSamples.js',
    'src/config/generatedServicePhotos.js',
    'src/config/generatedDecorCatalog.js',
    'src/config/generatedCakeOccasionPhotos.js',
  ]
  for (const rel of files) {
    let text
    try { text = readFileSync(resolve(ROOT, rel), 'utf8') } catch { continue }
    for (const m of text.matchAll(/https?:\/\/[^"'\s]+/g)) {
      const id = photoIdFromUrl(m[0])
      if (id) ids.add(id)
    }
  }
  return ids
}

const taken = committedPhotoIds()
console.log(`Already committed elsewhere: ${taken.size} photos`)

const resolved = {}
let misses = 0

for (const [shelf, queries] of Object.entries(SHELVES)) {
  resolved[shelf] = []
  for (const query of queries) {
    let candidates = []
    try {
      candidates = await searchPexels(query)
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.error('Rate limited — stopping. Re-run later; committed results are kept.')
        break
      }
      throw err
    }

    const pick = candidates.find(c => !taken.has(c.id))
    if (!pick) {
      console.warn(`  MISS  ${shelf} :: ${query}`)
      misses++
    } else {
      taken.add(pick.id)
      resolved[shelf].push({ url: pick.url, alt: pick.alt ?? query, credit: pick.credit, query })
      console.log(`  ok    ${shelf} :: ${query}`)
    }
    await sleep(pacingMs('pexels'))
  }
}

const body = `// GENERATED by scripts/resolve-shelf-photos.mjs — do not edit.
//
// Photographs for the home mosaic's two newest shelves. Every URL is a licensed
// stock photograph of similar goods, never a photograph of anything Sambramo has
// sourced — the same distinction every product tile and the decor gallery make,
// and the reason the shelves these front are seeded with image_source 'stock'.
//
// Re-run the resolver rather than editing this file:
//   node scripts/resolve-shelf-photos.mjs --dry-run
//   node scripts/resolve-shelf-photos.mjs
//
// Resolved ${new Date().toISOString().slice(0, 10)} from pexels.

export const GENERATED_SHELF_PHOTOS = ${JSON.stringify(resolved, null, 2)}
`

if (DRY) {
  console.log('\n--- would write ---\n' + body)
} else {
  writeFileSync(OUT, body, 'utf8')
  console.log(`\nWrote ${OUT}`)
}
console.log(`Resolved ${Object.values(resolved).flat().length}, missed ${misses}`)
