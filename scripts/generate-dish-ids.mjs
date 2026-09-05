#!/usr/bin/env node
/**
 * Give every dish in the catalogue a permanent id.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS HAD TO EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * dishRegistry.js gave 144 dishes hand-written ids. The customer's menu
 * cards are built from cuisineMenus.js, which has 324 dishes across the
 * South Indian screens alone and no ids at all — so a card a customer
 * built could not be matched against a caterer's listing. Measured: 21
 * of 324 customer dishes resolved to a registry id. The engine was
 * correct and had almost nothing to work on.
 *
 * One id space, or there is no matching. This assigns an id to every
 * dish in cuisineMenus and REUSES the registry's id wherever the same
 * dish appears in both — so "Bisi Bele Bath" is one id whether the
 * customer picked it or the caterer ticked it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IDS ARE ASSIGNED ONCE AND NEVER REASSIGNED
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the whole discipline of the file. Once a caterer has ticked an
 * id it is in their listing and in every booking that referenced it.
 * Renumbering silently re-points somebody's claim at a different dish —
 * no error, no way to notice, and a caterer sent to cook something they
 * never claimed.
 *
 * So the generator is APPEND-ONLY. It reads what it wrote last time,
 * keeps every existing key exactly as it is, and only allocates numbers
 * for keys it has never seen. A dish removed from cuisineMenus keeps its
 * id in the file, marked gone, rather than freeing the number.
 *
 * The key is `cuisine|course|normalised-name`, not array position, so
 * reordering the source changes nothing.
 *
 *   node scripts/generate-dish-ids.mjs          # append new, report
 *   node scripts/generate-dish-ids.mjs --check  # fail if anything is new
 *
 * --check is the one for CI: it fails when somebody adds a dish and does
 * not regenerate, which would otherwise ship a dish nothing can match.
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = 'src/data/dishIds.generated.js'
const CHECK = process.argv.includes('--check')

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const C = await load('src/data/cuisineMenus.js')
const R = await load('src/data/dishRegistry.js')

/* Two-letter code per cuisine. Fixed, not derived — a derived code
   changes when a cuisine is renamed, and the code is inside every id. */
const CU = {
  karnataka: 'KA', udupi: 'UD', tamil: 'TN', andhra: 'AP', kerala: 'KL',
  mysuru_royal: 'MY', north_indian: 'NI', mughlai: 'MG', bengali: 'BN',
  gujarati_rajasthani: 'GR', maharashtrian: 'MH', jain_satvik: 'JS',
  indo_chinese: 'IC', continental: 'CN', chaat_street: 'CS',
  multi_cuisine: 'MU',
}
const CO = {
  welcome: 'WE', starters: 'ST', mains: 'MA', curries: 'CU',
  accompaniments: 'AC', sweets: 'SW', counters: 'CO',
}

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const keyOf = (cuisine, course, name) => `${cuisine}|${course}|${norm(name)}`

/* ── what the registry already owns ──────────────────────────────────
   A dish in both files must carry ONE id, and it must be the
   hand-written one — that is the id already printed in the source and
   the one a reviewer will look for. */
const registryByKey = new Map()
for (const d of R.DISHES) {
  const course = R.COURSE_CATEGORIES.find(c => c.id === d.course)?.maps ?? 'starters'
  registryByKey.set(keyOf(d.cuisine, course, d.name), d.id)
  /* Also under the registry's own coarse course, so a dish filed as
     RICE_ASSETS on one side and `mains` on the other still unifies. */
  registryByKey.set(`${d.cuisine}|*|${norm(d.name)}`, d.id)
}

/* ── what was assigned last time ─────────────────────────────────── */
let existing = {}
if (existsSync(OUT)) {
  const prev = await load(OUT)
  existing = { ...prev.DISH_ID_BY_KEY }
}

/* Highest generated number per cuisine+course, so new ones continue the
   sequence rather than colliding with a retired id. */
const highest = {}
for (const id of Object.values(existing)) {
  const m = /^SBM-([A-Z]{2})-([A-Z]{2})-(\d+)$/.exec(id)
  if (!m) continue
  const k = `${m[1]}-${m[2]}`
  highest[k] = Math.max(highest[k] ?? 0, Number(m[3]))
}
/* Hand-written registry ids run 001-144. Generated ones start at 500 so
   the two ranges can never meet, whatever order things are added in. */
const FLOOR = 500

const assigned = { ...existing }
const fresh = []
const seen = new Set()

for (const cuisine of C.CUISINES) {
  const cu = CU[cuisine.id]
  if (!cu) { console.error(`  no code for cuisine '${cuisine.id}' — add one to CU`); process.exit(1) }

  for (const [courseId, dishes] of Object.entries(cuisine.courses ?? {})) {
    const co = CO[courseId]
    if (!co) { console.error(`  no code for course '${courseId}' — add one to CO`); process.exit(1) }

    for (const dish of dishes) {
      const key = keyOf(cuisine.id, courseId, dish.name)
      seen.add(key)
      if (assigned[key]) continue

      /* The registry's id wins where the dish is in both. */
      const owned = registryByKey.get(key) ?? registryByKey.get(`${cuisine.id}|*|${norm(dish.name)}`)
      if (owned) { assigned[key] = owned; continue }

      const bucket = `${cu}-${co}`
      const next = Math.max(highest[bucket] ?? 0, FLOOR - 1) + 1
      highest[bucket] = next
      assigned[key] = `SBM-${cu}-${co}-${String(next).padStart(3, '0')}`
      fresh.push(`${assigned[key]}  ${cuisine.id} · ${courseId} · ${dish.name}`)
    }
  }
}

const gone = Object.keys(existing).filter(k => !seen.has(k))

console.log(`\n  ${Object.keys(assigned).length} dishes carry an id`)
console.log(`  ${fresh.length} newly assigned, ${gone.length} no longer in the catalogue`)
if (fresh.length) console.log('\n' + fresh.slice(0, 12).map(l => '    ' + l).join('\n'))

if (CHECK) {
  if (fresh.length) {
    console.error(`\n  ${fresh.length} dish(es) have no id.`)
    console.error(`  Run: node scripts/generate-dish-ids.mjs\n`)
    process.exit(1)
  }
  console.log('\n  Every dish has an id.\n')
  process.exit(0)
}

/* ── write it ─────────────────────────────────────────────────────── */
const lines = Object.keys(assigned).sort().map(k =>
  `  ${JSON.stringify(k)}: ${JSON.stringify(assigned[k])},`)

writeFileSync(OUT, `// GENERATED by scripts/generate-dish-ids.mjs — do not edit by hand.
//
// A permanent id for every dish in cuisineMenus.js, keyed by
// \`cuisine|course|normalised-name\` so reordering the source changes
// nothing.
//
// ── These ids are load-bearing ────────────────────────────────────────
// A caterer's listing stores them and every booking references them.
// Changing one silently re-points somebody's claim at a different dish:
// no error, nothing to notice, and a caterer sent to cook something they
// never said they cook.
//
// So the generator is append-only and this file is committed. Entries for
// dishes no longer in the catalogue are KEPT — freeing the number would
// let it be handed to a different dish later, which is the same bug with
// an extra step.
//
// Ids in the 001-499 range are hand-written in dishRegistry.js and appear
// here because the same dish exists on both sides; 500 and up are
// assigned by the generator.
//
// Regenerate:  node scripts/generate-dish-ids.mjs
// Verify:      node scripts/generate-dish-ids.mjs --check

export const DISH_ID_BY_KEY = {
${lines.join('\n')}
}

/** cuisine|course|normalised-name — the same key the generator uses. */
export const dishKey = (cuisine, course, name) =>
  \`\${cuisine}|\${course}|\${String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')}\`

/** The id for one dish, or null if it has never been assigned one. */
export const dishIdFor = (cuisine, course, name) =>
  DISH_ID_BY_KEY[dishKey(cuisine, course, name)] ?? null
`, 'utf8')

console.log(`\n  wrote ${OUT}\n`)
