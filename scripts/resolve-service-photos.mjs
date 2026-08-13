#!/usr/bin/env node
/**
 * Resolve ONE distinct photograph per decoration setup, per cuisine and per
 * service package, and write src/config/generatedServicePhotos.js.
 *
 * Third sibling of resolve-product-images.mjs and resolve-decor-samples.mjs,
 * built the same way for the same reasons: it runs locally by hand, it never
 * writes to the database, every photo it assigns is marked `source: 'stock'`,
 * and its single most important behaviour is DEDUPLICATION.
 *
 * ── Why this one exists ───────────────────────────────────────────────────
 * The single-service pages ship 89 decoration setups, 16 cuisines and 144
 * packages, and every card drew its own picture from a two-colour gradient.
 * That was the honest choice while there was nothing better: the app caps
 * live Unsplash lookups at 24 per page load, and the 60 photographs already
 * committed belong to occasion samples — putting a wedding mandap on the
 * "cold pyro" card would be a claim, not a placeholder.
 *
 * A committed, deduplicated, per-item photo is better than both. Somebody
 * choosing a haldi setup or a Chettinad menu is making a visual decision, and
 * a gradient cannot answer "what does a banana-leaf sadya actually look like".
 *
 * ── What these photographs are, exactly ───────────────────────────────────
 * Licensed stock photographs of similar work. NOT photographs of anything
 * Sambramo has delivered, because Sambramo has not delivered any yet. Every
 * entry carries `source: 'stock'`, which is what makes the UI render the
 * "Representative image" badge — the same rule, in the same words, that the
 * product tiles and the decor gallery already follow.
 *
 * When a real setup is photographed, replace the entry by hand and flip
 * `source` to 'actual'. This script will never overwrite one.
 *
 *   node scripts/resolve-service-photos.mjs --dry-run
 *   node scripts/resolve-service-photos.mjs --group decor
 *   node scripts/resolve-service-photos.mjs --only-missing
 *
 * Flags
 *   --dry-run          Print the plan; write nothing.
 *   --group <g>        decor | cuisine | pack (repeatable). Default: all.
 *   --limit <n>        Stop after n assignments. Pexels allows 200/hour.
 *   --only-missing     Skip anything already resolved. Use this to resume.
 *   --out <path>       Output module path.
 *
 * Environment (read from .env, never VITE_-prefixed, never bundled):
 *   PEXELS_API_KEY     — https://www.pexels.com/api/
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
  const out = { dryRun: false, groups: [], limit: Infinity, onlyMissing: false, out: null }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dry-run':      out.dryRun = true; break
      case '--only-missing': out.onlyMissing = true; break
      case '--group':        out.groups.push(argv[++i]); break
      case '--limit':        out.limit = Number(argv[++i]); break
      case '--out':          out.out = argv[++i]; break
      case '--help':
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
        process.exit(0)
      default:
        if (argv[i].startsWith('--')) { console.error(`Unknown flag ${argv[i]}`); process.exit(1) }
    }
  }
  return out
}

/**
 * Load the real catalogue modules.
 *
 * Bundled with esbuild rather than copied, for the reason the sibling script
 * gives at length: a duplicated list is a list that goes stale, and this one
 * would go stale the first time somebody adds a decoration setup.
 */
async function loadCatalogue() {
  const dir = mkdtempSync(join(tmpdir(), 'service-photos-'))
  const entry = join(dir, 'entry.mjs')
  const abs = p => JSON.stringify(join(ROOT, p).split('\\').join('/'))
  try {
    writeFileSync(entry, `
      export { DECOR_THEME_CATALOGUE } from ${abs('src/data/decorThemes.js')}
      export { CUISINES } from ${abs('src/data/cuisineMenus.js')}
      export { SERVICE_PACKS } from ${abs('src/data/servicePacks.js')}
    `)
    const bundle = join(dir, 'bundle.mjs')
    await esbuild.build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
    return await import(pathToFileURL(bundle).href)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* ── The queries ────────────────────────────────────────────────────────
 * Kept here rather than on the catalogue objects, unlike decorSamples.js,
 * and the difference is deliberate: a `query` on a sample is editorial —
 * somebody decided that setup should be illustrated a particular way. These
 * are search tuning, and search tuning is a property of the search engine we
 * happen to use this quarter, not of the product. Putting 249 Pexels query
 * strings into the data files would make them read as photo-management files.
 *
 * Most entries derive fine from their own name. The map below covers the ones
 * that do not — usually because the name is a domestic Indian term Pexels has
 * never been tagged with ("Namakarana", "Seemantham", "Golu"), where the
 * honest fallback is to search for what the setup physically *is*.
 */
const DECOR_QUERIES = {
  griha_pravesh:        'indian house entrance marigold flowers door decoration',
  satyanarayana_pooja:  'hindu home puja altar flowers brass lamp',
  namakarana_cradle:    'decorated baby cradle flowers naming ceremony',
  seemantham_setup:     'baby shower floral swing seat decoration indian',
  upanayanam_setup:     'hindu ceremony fire altar havan ritual',
  ganpati_mandap:       'ganesh chaturthi idol decoration flowers',
  navratri_golu:        'navratri golu doll display steps festival',
  diwali_home:          'diwali diya lamps rangoli home decoration',
  shashtiabdapoorthi:   'indian elderly couple garland ceremony celebration',
  christmas_newyear:    'christmas tree decoration warm lights indoor',
  eid_iftar:            'eid lantern decoration dates table ramadan',
  south_temple:         'south indian wedding jasmine marigold hall decoration',
  mysuru_royal:         'royal purple gold draped stage wedding decor',
  kerala_nalukettu:     'kerala wedding white gold decoration brass lamp',
  tamil_kolam:          'kolam rangoli doorway south indian flowers',
  bengali_alpona:       'bengali wedding red white decoration alpona',
  rajasthani_royal:     'rajasthani mirror work umbrella decoration wedding',
  punjabi_phulkari:     'punjabi wedding colourful dupatta charpai decor',
  gujarati_garba:       'garba navratri colourful matki decoration',
  marathi_warli:        'warli painting wall art traditional decoration',
  northeast_bamboo:     'bamboo arch green foliage outdoor decoration',
  awadhi_nawabi:        'jaali screen lantern white drape decoration',
  konkani_coastal:      'beach wedding palm leaves white drape decor',
  mandap_traditional:   'indian wedding mandap flowers pillars ceremony',
  mandap_glass:         'modern white acrylic wedding mandap crystal',
  mandap_open_garden:   'outdoor garden wedding arch greenery aisle',
  varmala_stage:        'indian wedding garland exchange stage lights',
  phoolon_ki_chadar:    'indian bride flower canopy entry wedding',
  haldi_setup:          'haldi ceremony marigold yellow decoration pots',
  mehendi_boho:         'mehendi decor hanging dupatta floor cushions',
  sangeet_stage:        'sangeet stage led lights dance floor wedding',
  reception_throne:     'wedding reception stage flower wall sofa',
  baraat_street:        'indian baraat procession street lights groom',
  nikah_walima:         'nikah stage white gold flowers decoration',
  christian_altar:      'church wedding aisle flowers altar decoration',
  anand_karaj:          'gurdwara sikh wedding decoration flowers',
  balloon_organic_arch: 'organic balloon garland arch backdrop party',
  balloon_room_surprise:'balloon room surprise decoration ceiling floor',
  balloon_jungle:       'jungle safari theme birthday party decoration',
  balloon_unicorn:      'unicorn pastel rainbow birthday party decoration',
  balloon_space:        'space astronaut rocket theme birthday party',
  balloon_dinosaur:     'dinosaur theme kids birthday party decoration',
  balloon_princess:     'princess castle pink gold birthday decoration',
  balloon_superhero:    'superhero comic theme kids birthday party',
  balloon_mermaid:      'mermaid under the sea birthday party decoration',
  balloon_cars:         'cars racing theme kids birthday party decoration',
  balloon_first_birthday:'first birthday one backdrop pastel balloons',
  balloon_milestone:    'gold number balloons milestone birthday party',
  balloon_bollywood:    'retro cinema poster wall party decoration',
  floral_marigold:      'marigold flower curtain garland decoration',
  floral_jasmine:       'jasmine flower strings garland white decoration',
  floral_rose_lily:     'rose lily floral arrangement stage wedding',
  floral_orchid_imported:'orchid tulip luxury floral installation',
  floral_lotus_temple:  'lotus flowers floating bowl diya water',
  floral_hanging:       'hanging flower ceiling installation event',
  floral_boho_dried:    'pampas grass dried flowers boho decoration',
  floral_petal_pathway: 'flower petal pathway aisle wedding entrance',
  floral_jewellery_corner:'flower jewellery haldi bride accessories',
  stage_draped:         'draped fabric backdrop stage event decoration',
  stage_flower_wall:    'fresh flower wall backdrop event photo',
  stage_neon_mirror:    'neon sign backdrop wedding party decoration',
  stage_led_wall:       'led video wall stage event production',
  stage_ring_circle:    'circular ring backdrop flowers event decor',
  stage_rustic:         'rustic wooden backdrop greenery string lights',
  stage_memory_wall:    'photo wall display frames memories event',
  stage_marquee_letters:'light up marquee letters party decoration',
  light_fairy_canopy:   'fairy lights canopy overhead outdoor event',
  light_uplighting:     'uplighting colour wash event hall lighting',
  light_gobo_monogram:  'monogram projection light dance floor wedding',
  light_cold_pyro:      'cold pyro sparklers indoor stage effect',
  light_fog_haze:       'low fog first dance couple stage smoke',
  light_fireworks:      'fireworks display night celebration sky',
  light_chandelier:     'crystal chandelier hanging event hall decoration',
  romantic_candlelight: 'candlelight dinner table two rose petals',
  romantic_proposal:    'marry me proposal candles rooftop setup',
  romantic_room:        'hotel room surprise petals balloons bed',
  romantic_cabana:      'poolside cabana dinner lanterns evening',
  corp_launch:          'product launch stage branding corporate event',
  corp_conference:      'conference stage backdrop podium corporate',
  corp_award_night:     'award night red carpet stage trophy gala',
  corp_office_festival: 'office festive decoration workplace celebration',
  corp_farewell_tribute:'farewell event stage photo display tribute',
  corp_graduation:      'graduation party decoration cap photo wall',
  outdoor_shamiana:     'indian shamiana tent pandal outdoor wedding',
  outdoor_german_hangar:'large marquee tent interior event wedding',
  outdoor_arabian_tent: 'arabian tent lounge rugs lanterns cushions',
  outdoor_gateway:      'wedding entrance gate arch flowers lights',
  outdoor_lounge:       'outdoor lounge sofa seating event garden',
  outdoor_poolside:     'poolside party floating candles flowers evening',
}

/**
 * The cuisines, written out rather than derived.
 *
 * These are the queries that most reward being right: this is the section a
 * customer scrolls to answer "what will you actually serve", and "Karnataka
 * Traditional" as a search string returns landscapes of Karnataka. Every one
 * below asks for the *food on a plate*, which is what the card is about.
 */
const CUISINE_QUERIES = {
  karnataka:           'south indian banana leaf meal rice sambar feast',
  udupi:               'udupi south indian thali coconut curry meal',
  tamil:               'banana leaf meal south indian lunch rice sambar',
  andhra:              'andhra meals spicy south indian rice curry',
  kerala:              'kerala sadya banana leaf rice curry feast food',
  north_indian:        'north indian thali paneer naan curry meal',
  mughlai:             'mughlai kebab biryani rich curry platter',
  bengali:             'bengali fish curry rice meal thali',
  gujarati_rajasthani: 'gujarati rajasthani thali dhokla dal baati meal',
  maharashtrian:       'maharashtrian thali puran poli misal meal',
  jain_satvik:         'jain sattvic vegetarian indian meal thali',
  indo_chinese:        'indo chinese noodles manchurian fried rice',
  continental:         'continental buffet pasta salad plated food',
  chaat_street:        'indian street food chaat pani puri counter',
  multi_cuisine:       'wedding buffet spread multiple dishes indian',
  mysuru_royal:        'royal indian feast thali festive banana leaf',
}

/** Packages fall back to their own name plus the service they belong to. */
const PACK_QUERY_HINTS = {
  photography: 'photographer camera event',
  videography: 'videographer camera film event',
  drone:       'drone aerial photography',
  livestream:  'live streaming camera broadcast setup',
  photobooth:  'photo booth props party guests',
  dj:          'dj console speakers party lights',
  live_music:  'live band musicians performing stage',
  nadaswaram:  'indian traditional wind instrument musicians',
  drum:        'indian dhol drummers procession',
  folk:        'indian folk dancers costume performance',
  bhajan:      'indian devotional singers harmonium tabla',
  emcee:       'event host microphone stage anchor',
  entertainment:'dancers performance stage event',
  choreography:'dance rehearsal choreography group',
  kids_play:   'kids bouncy castle play party',
  nanny:       'child care nanny toddler play',
  bouncers:    'security guard uniform event entrance',
  valet:       'valet parking cars attendant',
  power:       'diesel generator power backup equipment',
  cooling:     'pedestal fan outdoor cooling event',
  washrooms:   'portable toilet cabin outdoor event',
  medical:     'first aid kit ambulance paramedic',
  hospitality: 'hostess usher welcoming guests event',
  transport:   'bus coach passengers travel',
  wedding_car: 'decorated wedding car flowers',
  baraat:      'indian wedding procession band groom horse',
  mehendi:     'mehendi henna hands bridal design',
  makeup:      'bridal makeup artist indian bride',
  bridal_wear: 'indian bride getting ready saree draping',
  priest:      'hindu priest ritual ceremony fire',
  pooja:       'puja thali flowers offering ritual items',
  bar:         'bartender cocktail bar counter drinks',
  live_counters:'live food counter chef cooking guests',
  ice_cream:   'ice cream dessert counter cart',
  return_gifts:'gift bags favours wrapped party',
  gifting:     'gift hamper basket wrapped festive',
  invitations: 'wedding invitation cards stationery',
  signage:     'event signage welcome board seating chart',
  cleanup:     'cleaning crew mopping venue after event',
  av_setup:    'projector screen conference audio visual',
  fireworks:   'fireworks sparklers night celebration',
  venue:       'banquet hall interior event venue',
  cake:        'celebration cake decorated bakery',
  dining:      'banquet table setting chairs linen',
  memory_wall: 'photo display wall frames event',
}

/* ── dedupe seed ────────────────────────────────────────────────────── */
function seedUsedIds() {
  const used = new Set()
  const roots = [resolve(ROOT, 'src/config'), resolve(ROOT, 'supabase/migrations')]
  for (const dir of roots) {
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (!/\.(js|sql)$/.test(name)) continue
      for (const m of readFileSync(join(dir, name), 'utf8').matchAll(/pexels-photo-(\d+)/g)) used.add(m[1])
    }
  }
  return used
}

/* ── Pexels ─────────────────────────────────────────────────────────── */
async function searchPexels(query, perPage = 20) {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY is not set')
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText}`)
  return (await res.json()).photos ?? []
}

const STOPWORDS = new Set([
  'the', 'and', 'a', 'of', 'for', 'with', 'party', 'decoration', 'decor',
  'setup', 'celebration', 'event', 'indian', 'india',
])

/** Crude keyword overlap against Pexels' own alt text, plus a nudge for wide frames. */
function relevance(photo, query) {
  const alt = (photo.alt ?? '').toLowerCase()
  if (!alt) return 0
  const terms = [...new Set(query.toLowerCase().split(/\s+/))].filter(t => t && !STOPWORDS.has(t))
  const hits = terms.filter(t => alt.includes(t)).length
  const score = terms.length ? hits / terms.length : 0
  const ratio = photo.width / photo.height
  return score + (ratio >= 1.2 && ratio <= 2.2 ? 0.08 : 0)
}

/* ── output ─────────────────────────────────────────────────────────── */
function serialise(name, entries) {
  const body = entries.map(([key, v]) =>
    `  ${JSON.stringify(key)}: {\n` +
    `    url:    ${JSON.stringify(v.url)},\n` +
    `    alt:    ${JSON.stringify(v.alt)},\n` +
    `    credit: ${JSON.stringify(v.credit)},\n` +
    `    source: ${JSON.stringify(v.source)},\n` +
    `  },`
  ).join('\n')
  return `export const ${name} = {\n${body}\n}\n`
}

function buildModule(theme, cuisine, pack) {
  return `// GENERATED by scripts/resolve-service-photos.mjs — do not edit.
//
// One distinct photograph per decoration setup, cuisine and service package.
// Every URL here is a licensed stock photograph of similar work, never a
// photograph of anything Sambramo has delivered — the same distinction the
// product tiles and the decor gallery already make, and the reason every
// entry carries \`source: 'stock'\` and every card renders the "Representative
// image" badge.
//
// Re-run the resolver rather than editing this file:
//   node scripts/resolve-service-photos.mjs --dry-run
//   node scripts/resolve-service-photos.mjs --only-missing
//
// A photograph of real work is added by hand with source 'actual'; the
// resolver will never overwrite one.
//
// Resolved ${new Date().toISOString().slice(0, 10)} from pexels. ` +
`${theme.length} setups, ${cuisine.length} cuisines, ${pack.length} packages.

${serialise('THEME_PHOTOS', theme)}
${serialise('CUISINE_PHOTOS', cuisine)}
${serialise('PACK_PHOTOS', pack)}`
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY is not set. Get one free at https://www.pexels.com/api/, then add it to .env')
    process.exit(1)
  }

  const outPath = args.out ? resolve(ROOT, args.out) : resolve(ROOT, 'src/config/generatedServicePhotos.js')
  const existing = { THEME_PHOTOS: {}, CUISINE_PHOTOS: {}, PACK_PHOTOS: {} }
  if (existsSync(outPath)) {
    const mod = await import(pathToFileURL(outPath).href + `?t=${Date.now()}`)
    Object.assign(existing.THEME_PHOTOS,   mod.THEME_PHOTOS ?? {})
    Object.assign(existing.CUISINE_PHOTOS, mod.CUISINE_PHOTOS ?? {})
    Object.assign(existing.PACK_PHOTOS,    mod.PACK_PHOTOS ?? {})
  }

  const { DECOR_THEME_CATALOGUE, CUISINES, SERVICE_PACKS } = await loadCatalogue()
  const wants = g => !args.groups.length || args.groups.includes(g)

  /** Everything to resolve, as one flat queue: [bucket, key, query, label]. */
  const queue = []

  if (wants('decor')) {
    for (const t of DECOR_THEME_CATALOGUE) {
      queue.push({
        bucket: 'THEME_PHOTOS', key: t.id, label: t.name,
        query: DECOR_QUERIES[t.id]
          ?? `${t.name.split('—')[0].trim()} ${(t.tags ?? []).join(' ')} decoration india`,
      })
    }
  }
  if (wants('cuisine')) {
    for (const c of CUISINES) {
      queue.push({
        bucket: 'CUISINE_PHOTOS', key: c.id, label: c.name,
        query: CUISINE_QUERIES[c.id] ?? `${c.name} indian food thali meal`,
      })
    }
  }
  if (wants('pack')) {
    for (const [serviceId, shelf] of Object.entries(SERVICE_PACKS)) {
      for (const p of shelf.packs) {
        queue.push({
          bucket: 'PACK_PHOTOS', key: p.id, label: p.name,
          query: `${p.name.split('—')[0].trim()} ${PACK_QUERY_HINTS[serviceId] ?? serviceId.replace(/_/g, ' ')}`,
        })
      }
    }
  }

  const work = queue
    .filter(q => existing[q.bucket][q.key]?.source !== 'actual')
    .filter(q => !(args.onlyMissing && existing[q.bucket][q.key]))
    .slice(0, args.limit)

  console.log(`\n${work.length} item${work.length === 1 ? '' : 's'} to resolve.`)
  if (args.dryRun) {
    for (const q of work) console.log(`  ${q.bucket.padEnd(15)} ${q.key.padEnd(26)} "${q.query}"`)
    return
  }

  const used = seedUsedIds()
  console.log(`Seeded ${used.size} photo ids already committed in this repo.\n`)

  const resolved = {
    THEME_PHOTOS:   { ...existing.THEME_PHOTOS },
    CUISINE_PHOTOS: { ...existing.CUISINE_PHOTOS },
    PACK_PHOTOS:    { ...existing.PACK_PHOTOS },
  }
  let assigned = 0, skipped = 0, rateLimited = false

  for (const item of work) {
    let photos
    try {
      photos = await searchPexels(item.query)
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.error(`\nPexels rate limit hit after ${assigned} assignments.`)
        console.error('What is written below is complete; wait an hour and resume with --only-missing.')
        rateLimited = true
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
      console.warn(`  ⚠ ${item.key} — every result already used; card keeps its gradient`)
      skipped++
      continue
    }

    used.add(String(pick.id))
    resolved[item.bucket][item.key] = {
      url:    pick.src.large ?? pick.src.original,
      alt:    (pick.alt ?? '').trim() || `${item.label} — reference photograph of similar work`,
      credit: `Photo by ${pick.photographer} on Pexels`,
      source: 'stock',
    }
    assigned++
    console.log(`  ✓ ${item.key.padEnd(26)} ${String(pick.id).padEnd(9)} ${(pick.alt ?? '').slice(0, 48)}`)
  }

  const module = buildModule(
    Object.entries(resolved.THEME_PHOTOS).sort(([a], [b]) => a.localeCompare(b)),
    Object.entries(resolved.CUISINE_PHOTOS).sort(([a], [b]) => a.localeCompare(b)),
    Object.entries(resolved.PACK_PHOTOS).sort(([a], [b]) => a.localeCompare(b)),
  )
  writeFileSync(outPath, module)

  console.log(`\n${assigned} assigned, ${skipped} skipped. Written to ${outPath.replace(ROOT, '.')}`)
  if (rateLimited) process.exitCode = 2
}

main().catch(err => { console.error(err); process.exit(1) })
