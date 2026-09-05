#!/usr/bin/env node
/**
 * The dish registry, checked for the things that break matching silently.
 *
 * ── Why every one of these matters ────────────────────────────────────
 * Matching is set arithmetic on ids. Every failure below produces a
 * WRONG MATCH rather than an error: a caterer offered a job they cannot
 * cook, or never offered one they can. Neither is visible from either
 * end, and neither shows up in a build.
 *
 *   node scripts/check-dish-registry.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const R = await load('src/data/dishRegistry.js')
const M = await load('src/lib/menuMatch.js')
const cuisines = await load('src/data/cuisineMenus.js')

const fails = []
const line = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
  if (!ok) fails.push(label + (detail ? ` — ${detail}` : ''))
}

console.log('\n  Dish registry\n')

// ── 1 · Ids are unique ────────────────────────────────────────────
// Two dishes on one id means one of them can never be claimed, and the
// caterer who ticked it is matched against the other.
{
  const seen = new Map()
  const dupes = []
  for (const d of R.DISHES) {
    if (seen.has(d.id)) dupes.push(`${d.id} (${seen.get(d.id)} / ${d.name})`)
    seen.set(d.id, d.name)
  }
  line(!dupes.length, `every id is unique (${R.DISHES.length} dishes)`, dupes.join('; '))
}

// ── 2 · Ids are well formed ───────────────────────────────────────
// A typo'd id is a dish nothing ever renders and nobody ever ticks.
{
  const bad = R.DISHES
    .filter(d => !/^SBM-(TN|AP|KL|KA)-(ST|MC|RA|DE)-\d{3}$/.test(d.id))
    .map(d => d.id)
  line(!bad.length, 'every id matches SBM-<REGION>-<COURSE>-<NNN>', bad.join(', '))
}

// ── 3 · The id agrees with the row ────────────────────────────────
// A dish filed under STARTERS with an -MC- id is one the picker shows in
// one place and the matcher reasons about in another.
{
  const COURSE_CODE = { STARTERS: 'ST', MAIN_CURRIES: 'MC', RICE_ASSETS: 'RA', DESSERTS_LIVE: 'DE' }
  const bad = R.DISHES
    .filter(d => d.id.split('-')[2] !== COURSE_CODE[d.course])
    .map(d => `${d.id} is ${d.course}`)
  line(!bad.length, 'the course in the id matches the course on the row', bad.join('; '))
}

// ── 4 · Every dish has a diet, and it is one of two values ────────
// An undefined diet passes `!== 'nonveg'` and lands a mutton dish on a
// pure-veg card. This is the check that stops the one failure a refund
// does not settle.
{
  const bad = R.DISHES.filter(d => d.diet !== 'veg' && d.diet !== 'nonveg').map(d => d.id)
  line(!bad.length, 'every dish is veg or nonveg, never blank', bad.join(', '))
}

// ── 5 · Every dish hangs off a cuisine that exists ────────────────
// A dish on a cuisine id no screen renders is unreachable, and unreachable
// looks exactly like not-yet-added.
{
  const known = new Set(cuisines.CUISINES.map(c => c.id))
  const bad = [...new Set(R.DISHES.map(d => d.cuisine).filter(c => !known.has(c)))]
  line(!bad.length, 'every dish names a real cuisine screen', bad.join(', '))
}

// ── 6 · Every cuisine named by a region actually gets dishes ──────
{
  const counts = {}
  for (const d of R.DISHES) counts[d.cuisine] = (counts[d.cuisine] ?? 0) + 1
  const summary = Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')
  line(Object.keys(counts).length >= 4, 'dishes reach every region', summary)
}

// ── 7 · resolveDishId round-trips ─────────────────────────────────
// The migration aid has to actually resolve the names it was built from,
// or listings written before ids will silently convert to nothing.
{
  const bad = R.DISHES.filter(d => R.resolveDishId(d.name) !== d.id).map(d => d.name)
  line(!bad.length, 'every name resolves back to its own id', bad.slice(0, 4).join(', '))
}

// ── 8 · Every id in the catalogue resolves to a diet ──────────────
// The lookup, before the rule that depends on it. This is the check that
// was missing: dietAllows read diet out of the 144-dish registry only,
// so for the 771 generated ids it found nothing, decided the card had no
// meat on it, and cleared a pure-veg kitchen to cook mutton.
{
  const unknown = []
  for (const c of cuisines.CUISINES) {
    for (const courseId of Object.keys(c.courses ?? {})) {
      for (const d of cuisines.dishesFor(c, courseId)) {
        if (!d.sbmId) unknown.push(`${c.id}/${d.name} has no id`)
        else if (!M.dishDiet(d.sbmId)) unknown.push(`${d.sbmId} (${d.name}) has no diet`)
      }
    }
  }
  line(!unknown.length, 'every catalogue dish resolves to an id AND a diet',
    unknown.slice(0, 3).join('; '))
}

// ── 9 · A veg card never matches a shared kitchen on coverage ─────
// The behaviour, not the data, and built from a REAL CUSTOMER CARD.
//
// The first version of this check built its card out of registry dishes,
// which are exactly the ids that resolved correctly, so it passed while
// the bug was live. A check that exercises only the easy half of a
// lookup proves the wrong thing.
{
  /* A card a customer could actually build: Karnataka, which carries
     both veg and non-veg lines. */
  const ka = cuisines.CUISINE_BY_ID.karnataka
  const all = ['starters', 'mains', 'curries']
    .flatMap(c => cuisines.dishesFor(ka, c))
  const veg = all.filter(d => d.veg).slice(0, 4).map(d => d.sbmId)
  const meat = all.filter(d => d.veg === false).slice(0, 2).map(d => d.sbmId)
  const nvCard = [...veg.slice(0, 2), ...meat]

  line(meat.length === 2 && meat.every(Boolean),
    'the test card really does carry non-veg ids', meat.join(', '))

  /* Ticked everything, so coverage can never be the reason it is
     refused — only diet can. */
  const pureVeg = { id: 'v', kitchen: 'pure_veg', dishIds: [...veg, ...meat] }

  const ranked = M.rankForCard([pureVeg], nvCard)
  line(ranked.length === 0,
    'a pure-veg kitchen is never returned for a card with meat on it',
    ranked.length ? 'IT WAS RETURNED' : '')

  const okRanked = M.rankForCard([pureVeg], veg)
  line(okRanked.length === 1 && okRanked[0].complete,
    'and is returned, complete, for a card it can cook')

  /* An id nobody has assigned a diet to must refuse, not wave through. */
  line(M.dietAllows('pure_veg', ['SBM-XX-XX-999']) === false,
    'an unknown dish id refuses rather than assuming vegetarian')
}

// ── 10 · A gap is described in words, never in ids ────────────────
{
  const ka = cuisines.CUISINE_BY_ID.karnataka
  const card = cuisines.dishesFor(ka, 'mains').slice(0, 4).map(d => d.sbmId)
  const [r] = M.rankForCard(
    [{ id: 'n', kitchen: 'both', dishIds: card.slice(0, 3) }], card, { minRatio: 0 })
  const text = r ? M.describeGap(r) : ''
  line(!!r && !/SBM-/.test(text), 'a gap names the dish, not its id', text)
}

// ── 11 · A near miss is reported, not dropped ─────────────────────
{
  const card = R.DISHES.slice(0, 10).map(d => d.id)
  const nearly = { id: 'n', kitchen: 'both', dishIds: card.slice(0, 9) }
  const [r] = M.rankForCard([nearly], card)
  const named = r && M.describeGap(r).includes(R.DISH_BY_ID[card[9]].name)
  line(!!r && !r.complete && r.missing.length === 1 && named,
    'a caterer missing one dish is returned with that dish named',
    r ? M.describeGap(r) : 'NOT RETURNED')
}

const byDiet = R.DISHES.reduce((a, d) => ({ ...a, [d.diet]: (a[d.diet] ?? 0) + 1 }), {})
console.log(`\n  ${R.DISHES.length} dishes · ${byDiet.veg} veg · ${byDiet.nonveg} non-veg\n`)

if (fails.length) {
  console.error('  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('  The registry can be matched on.\n')
