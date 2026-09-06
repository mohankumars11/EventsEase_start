#!/usr/bin/env node
/**
 * Check the hand-written menu-card dishes against the cards themselves.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS CHECKS AND NO LONGER GENERATES
 * ══════════════════════════════════════════════════════════════════════
 *
 * src/data/menuCardDishes.js used to be written by keyword rules. The
 * rules were wrong eight times and every error was a substring matching
 * inside a word — `paya` in Payasa marked six sweets as meat, `sambar`
 * in Kosambari filed eleven salads as curries, `dal` in Dalimbe filed
 * another, `fry` in Dal Fry made a lentil curry a canapé.
 *
 * Rules cannot be trusted with this, so the table is written by hand and
 * this script checks it. That inverts the risk: a generator's mistake
 * ships silently, a checker's mistake at worst fails loudly.
 *
 * ── What it proves ───────────────────────────────────────────────────
 *   1  every name on every card resolves — catalogue, alias, staple or
 *      the table; nothing is left over
 *   2  the table has no dish that no card names
 *   3  every cuisine_id and course_id exists in the catalogue
 *   4  no name appears twice, which would make a line ambiguous
 *   5  diet has a second opinion: any veg row that names meat, or any
 *      nonveg row that names none, has to be explained here
 *
 *   node scripts/check-menu-card-dishes.mjs
 */
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const M = await load('src/data/cateringMenus.js')
const PARSE = await load('src/lib/menuLineParse.js')
const MC = await load('src/data/menuCardDishes.js')

const norm = PARSE.normaliseDishName

/* The catalogue as the database actually holds it, read from the seed so
   this can never disagree with what was applied. */
const sql = readFileSync('supabase/migrations/107_catalogue_seed.generated.sql', 'utf8')

/* The VALUES list ends the line; the ON CONFLICT clause is the next one.
   An empty result is a broken pattern, not an empty table — this file has
   twice printed a green tick for a check that matched nothing, so it
   fails here instead of passing quietly. */
const pick = table => {
  const re = new RegExp(
    '^INSERT INTO public\\.' + table + ' \\([^)]+\\) VALUES \\((.*)\\)$', 'gm')
  const rows = [...sql.matchAll(re)].map(m => m[1])
  if (!rows.length) {
    console.log(`\n  x read no rows at all for ${table} — the pattern is broken\n`)
    process.exit(1)
  }
  return rows
}

/* The catalogue WITHOUT this table's own rows.
   The seed now writes these dishes too, with source 'menu_card'. Reading
   them back as "already in the catalogue" would make every row look like
   a collision with itself, and would hide a real collision with a dish
   that was there before. */
const known = new Map()
for (const row of pick('catalogue_dishes')) {
  if (/, 'menu_card', /.test(row)) continue
  const f = row.match(/'((?:[^']|'')*)'/g).map(s => s.slice(1, -1).replace(/''/g, "'"))
  known.set(norm(f[3]), { id: f[0], cuisine: f[1], course: f[2], name: f[3] })
}
const cuisines = new Set(pick('catalogue_cuisines').map(r => r.match(/'([^']*)'/)[1]))
const courses = new Set(pick('catalogue_courses').map(r => r.match(/'([^']*)'/)[1]))

const table = MC.MENU_CARD_DISHES
const staples = new Set(MC.MENU_CARD_STAPLES.map(norm))
const aliases = MC.MENU_CARD_ALIASES
const byName = new Map(table.map(d => [norm(d.name), d]))

let bad = 0
const fail = (head, lines) => {
  bad++
  console.log(`\n  x ${head}`)
  for (const l of lines.slice(0, 40)) console.log(`      ${l}`)
  if (lines.length > 40) console.log(`      … and ${lines.length - 40} more`)
}
const pass = msg => console.log(`  ${String.fromCharCode(10003)} ${msg}`)

/* ══════════════════════════════════════════════════════════════════
   1 · EVERY NAME ON EVERY CARD RESOLVES
   ══════════════════════════════════════════════════════════════════ */

const seen = new Map()
let lines = 0
for (const menu of M.ALL_MENUS) {
  for (const line of M.menuLines(menu)) {
    const text = typeof line === 'string' ? line : (line?.name ?? line?.text ?? String(line))
    if (!text.trim()) continue
    lines++
    for (const name of PARSE.parseMenuLine(text).parts) {
      const k = norm(name)
      if (!k) continue
      seen.set(k, (seen.get(k) ?? 0) + 1)
    }
  }
}

const unaccounted = []
for (const k of seen.keys()) {
  if (known.has(k) || staples.has(k) || aliases[k] || byName.has(k)) continue
  unaccounted.push(k)
}
if (unaccounted.length) {
  fail(`${unaccounted.length} names on the cards resolve to nothing`, unaccounted)
} else {
  pass(`every name on ${lines} card lines resolves `
    + `(${seen.size} distinct: ${[...seen.keys()].filter(k => known.has(k)).length} catalogue, `
    + `${[...seen.keys()].filter(k => byName.has(k)).length} added, `
    + `${[...seen.keys()].filter(k => staples.has(k)).length} staple, `
    + `${[...seen.keys()].filter(k => aliases[k]).length} alias)`)
}

/* ══════════════════════════════════════════════════════════════════
   2 · NOTHING IN THE TABLE THAT NO CARD NAMES
   Dead rows would mint dish ids nobody can ever be matched on.
   ══════════════════════════════════════════════════════════════════ */

const orphans = table.filter(d => !seen.has(norm(d.name))).map(d => d.name)
if (orphans.length) fail(`${orphans.length} table dishes no card names`, orphans)
else pass(`all ${table.length} added dishes are named by a card`)

/* An alias or staple that no card uses is also dead weight, and a stale
   one hides a name that has since changed. */
const deadAlias = Object.keys(aliases).filter(k => !seen.has(k))
const deadStaple = MC.MENU_CARD_STAPLES.filter(s => !seen.has(norm(s)))
if (deadAlias.length) fail(`${deadAlias.length} aliases no card uses`, deadAlias)
else pass(`all ${Object.keys(aliases).length} aliases are used`)
if (deadStaple.length) console.log(`  · ${deadStaple.length} staples unused, kept on purpose: ${deadStaple.join(', ')}`)

/* An alias must point at something real. */
const brokenAlias = Object.entries(aliases)
  .filter(([, target]) => !known.has(norm(target)))
  .map(([k, t]) => `${k} -> ${t}  (not in the catalogue)`)
if (brokenAlias.length) fail(`${brokenAlias.length} aliases point at nothing`, brokenAlias)
else pass('every alias points at a catalogue dish')

/* ══════════════════════════════════════════════════════════════════
   3 · CUISINE AND COURSE EXIST
   ══════════════════════════════════════════════════════════════════ */

const badRef = []
for (const d of table) {
  if (!cuisines.has(d.cuisine)) badRef.push(`${d.name}: cuisine '${d.cuisine}'`)
  if (!courses.has(d.course)) badRef.push(`${d.name}: course '${d.course}'`)
  if (d.diet !== 'veg' && d.diet !== 'nonveg') badRef.push(`${d.name}: diet '${d.diet}'`)
}
if (badRef.length) fail(`${badRef.length} rows point at something that does not exist`, badRef)
else pass(`every row uses a real cuisine, course and diet`)

/* ══════════════════════════════════════════════════════════════════
   4 · NO NAME TWICE
   Two rows for one name means a menu line has two dish ids and no way
   to choose, so the bridge would resolve it arbitrarily.
   ══════════════════════════════════════════════════════════════════ */

const dupes = []
const count = new Map()
for (const d of table) count.set(norm(d.name), (count.get(norm(d.name)) ?? 0) + 1)
for (const [k, n] of count) if (n > 1) dupes.push(`${k} x${n}`)
for (const d of table) if (known.has(norm(d.name))) dupes.push(`${d.name} is already in the catalogue as ${known.get(norm(d.name)).id}`)
if (dupes.length) fail(`${dupes.length} names collide`, dupes)
else pass('no name appears twice')

/* ══════════════════════════════════════════════════════════════════
   5 · A SECOND OPINION ON DIET
   ══════════════════════════════════════════════════════════════════
   This does NOT decide anything — the table decides. It only asks the
   question a rule would ask, so a disagreement has to be looked at
   rather than discovered by a vegetarian kitchen.

   Word boundaries on both ends, which is the whole lesson: `paya` and
   `neer` and `kaal` are all inside innocent words.
*/
const MEAT = [
  'chicken', 'mutton', 'fish', 'egg', 'prawn', 'prawns', 'crab', 'kori',
  'koli', 'meen', 'meat', 'lamb', 'keema', 'boti', 'paya', 'kaal',
  'bangude', 'marvai', 'anjal', 'sukka', 'kuri', 'motte', 'nati',
]
const MEAT_RE = new RegExp('\\b(' + MEAT.join('|') + ')\\b', 'i')

/* Names where the meat word is there and the dish is not — each read
   and decided, not waved through as a class. */
const NOT_MEAT = {
  'Veg Ball Ghee Roast': 'ghee roast is a Mangaluru masala, this one is veg balls',
  'Sukka (dry vegetable)': 'sukka is a dry-fry style; the gloss says vegetable',
  'Gobi Batani Sukka': 'cauliflower and peas, dry',
  'Kaalu Saaru': 'kaalu is sprouted legumes in Kannada, not kaal (trotter)',
  'Egg Masala': 'egg — non-veg, and marked so',
}

const argue = []
for (const d of table) {
  const hit = MEAT_RE.exec(d.name)
  if (hit && d.diet === 'veg' && !NOT_MEAT[d.name]) {
    argue.push(`${d.name}: marked veg but names '${hit[1]}' — add it to NOT_MEAT with a reason, or fix the diet`)
  }
  if (!hit && d.diet === 'nonveg') {
    argue.push(`${d.name}: marked nonveg but names no meat — is that right?`)
  }
}
if (argue.length) fail(`${argue.length} rows where the diet and the name disagree`, argue)
else pass(`diet agrees with the name on all ${table.length} rows `
  + `(${table.filter(d => d.diet === 'nonveg').length} non-veg), `
  + `${Object.keys(NOT_MEAT).length} explained exceptions`)

/* A payasa, a holige or a kosambari is never meat. This is the exact
   error that shipped, named so it cannot come back. */
const NEVER_MEAT = /payasa|payasam|holige|obbattu|kosambari|kesari|halwa|jamoon|jilebi/i
const regress = table.filter(d => NEVER_MEAT.test(d.name) && d.diet === 'nonveg')
if (regress.length) fail('a sweet or a salad is marked non-veg', regress.map(d => d.name))
else pass('no sweet and no kosambari is marked non-veg')

/* Kosambari is a salad, rasam is a curry, palya is an accompaniment.
   The three the rules got wrong, pinned. */
const SHAPE = [
  [/kosambari|salad/i, 'accompaniments'],
  [/\brasam\b|\bsaaru\b|\bsambar\b|\bshorba\b|soup/i, 'curries'],
  [/\bpalya\b|\bchopse\b/i, 'accompaniments'],
]
const misshaped = []
for (const d of table) {
  for (const [re, course] of SHAPE) {
    if (re.test(d.name) && d.course !== course) {
      misshaped.push(`${d.name}: '${d.course}', expected '${course}'`)
    }
  }
}
if (misshaped.length) fail(`${misshaped.length} rows in the wrong course`, misshaped)
else pass('every kosambari is a salad, every rasam a curry, every palya a side')

/* ══════════════════════════════════════════════════════════════════ */

const spread = new Map()
for (const d of table) spread.set(d.cuisine, (spread.get(d.cuisine) ?? 0) + 1)
console.log(`\n  ${table.length} dishes added by hand across ${spread.size} cuisines`)
for (const [c, n] of [...spread].sort((a, b) => b[1] - a[1])) {
  console.log(`      ${String(n).padStart(3)}  ${c}`)
}

if (bad) {
  console.log(`\n  ${bad} check${bad > 1 ? 's' : ''} failed\n`)
  process.exit(1)
}
console.log('\n  the table is the cards, and the cards are the table\n')
