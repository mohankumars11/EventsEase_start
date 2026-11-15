#!/usr/bin/env node
/**
 * Menu Studio photographs — one per cuisine family and one per menu, from
 * Pexels (Pexels License), resolved once into
 * src/customer/data/menuPhotos.generated.js. The app never searches at
 * runtime. Every photo is SAMBRAMO inspiration (kind 'inspiration'), shown
 * labelled as such — never as any caterer's own food.
 *
 *   node --env-file=.env scripts/resolve-menu-photos.mjs
 *
 * A photo is kept only when its own description names food and does not
 * centre on a person; no two menus get the same photo. A menu with no
 * acceptable photo gets none — the app shows its plain menu card instead
 * of a misleading picture.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const C = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/menu-catalogue/v1/catalogue.json'), 'utf8'))
const CACHE = join(ROOT, 'scripts/data/menu-photos-raw.json')
const OUT = join(ROOT, 'src/customer/data/menuPhotos.generated.js')
const KEY = process.env.PEXELS_API_KEY
if (!KEY) { console.error('PEXELS_API_KEY missing'); process.exit(1) }

const FOOD = /food|dish|meal|curry|rice|biryani|bread|naan|roti|dosa|idli|thali|plate|bowl|sweet|dessert|cake|soup|salad|noodle|pasta|pizza|taco|burrito|nacho|kebab|chicken|fish|prawn|meat|lamb|mutton|vegetable|paneer|snack|fritter|samosa|chaat|buffet|platter|cuisine|dumpling|momo|sushi|tea|coffee|drink|juice|milk|sauce|dip|hummus|falafel|shawarma|grill|fried|tikka|masala|lentil|dal|chutney|banana leaf|feast|dinner|lunch|breakfast|tapas|paella|gyoza|ramen|kimchi|burger|fries|sandwich|canap|appetizer|starter|ice cream|kulfi|pudding/i
/* People, places and props are not a menu: a photo whose description names
   them is skipped, wherever in the description they appear. */
const PERSON = /\b(man|men|woman|women|girls?|boys?|child|children|kids?|bride|groom|couple|person|people|family|portrait|chef|vendors?|hands?|elderly|crop|faceless|anonymous|market|port|boats?|venue|decor|attire|ceremony|puja|pooja|ritual|offering|prayer|worship)\b/i
/* A vegetarian menu never shows meat, fish or egg — not even plausibly. */
const MEAT = /chicken|meat|lamb|mutton|fish|shrimp|prawn|seafood|pork|beef|egg|biryani|kebab|carbonara/i
/* Where the menu's own query found nothing true to it. */
const BETTER = {
  karnataka: ['south indian thali', 'banana leaf meal'], kashmiri: ['rogan josh', 'lamb curry'], odia: ['dal rice', 'indian dal'], mexican: ['nachos', 'mexican food'],
  'kl-sadya': ['banana leaf meal', 'south indian thali'], 'tn-wedding-feast': ['south indian meals', 'south indian thali'], 'gj-traditional-thali': ['gujarati thali', 'vegetarian thali'],
  'rj-marwari-celebration': ['kachori', 'indian snacks'], 'bn-biye-bari': ['bengali food', 'fish curry rice'], 'ne-naga-smoked': ['pork curry', 'smoked meat'],
  'as-thai': ['thai curry', 'pad thai'], 'gp-kids-favourites': ['mini burgers', 'french fries'], 'gp-college-stalls': ['samosa', 'french fries'],
  'ni-grand-buffet': ['paneer curry naan', 'indian vegetarian food'], 'if-modern-dinner': ['indian fusion food', 'tandoori platter'],
  'ap-spicy-celebration': ['chicken 65', 'spicy chicken curry'], 'ap-mixed-family': ['south indian meals', 'indian thali'], 'tn-chettinad-celebration': ['chettinad chicken', 'pepper chicken'],
  'cn-cantonese-dinner': ['dim sum', 'chinese food'], 'od-celebration-feast': ['mutton curry', 'indian curry'],
}
const raw = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}
let calls = 0
async function search(q) {
  const k = `${q}|30`
  if (raw[k]) return raw[k]
  calls++
  const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: '30', orientation: 'landscape' })}`, { headers: { Authorization: KEY } })
  if (!r.ok) { console.error(q, r.status); return [] }
  const j = await r.json()
  raw[k] = (j.photos ?? []).map(p => ({ id: p.id, src: p.src.original, alt: p.alt ?? '', credit: `Photo by ${p.photographer} on Pexels`, page: p.url }))
  return raw[k]
}
const used = new Set()
const rec = p => ({ id: p.id, url: `${p.src}?auto=compress&cs=tinysrgb&fit=crop&w=640&h=420`, alt: p.alt, credit: p.credit, page: p.page })
/* A photo for these must say it is this food — otherwise none, and the app
   draws the menu card itself (an approved placeholder, never a look-alike). */
const MUST = {
  kashmiri: /rogan|kashmir|lamb curry/i, 'kl-sadya': /sadya|kerala/i, 'gj-traditional-thali': /gujarat/i,
  'ne-naga-smoked': /smoked|bamboo|naga/i, 'tn-chettinad-celebration': /chettinad|chicken|pepper/i,
}
async function pick(queries, veg = false, must = null) {
  for (const q of queries) {
    const hit = (await search(q)).find(p => FOOD.test(p.alt) && !PERSON.test(p.alt) && !(veg && MEAT.test(p.alt)) && (!must || must.test(p.alt)) && !used.has(p.id))
    if (hit) { used.add(hit.id); return rec(hit) }
  }
  return null
}

const family = {}, menu = {}
for (const f of C.families) family[f.id] = await pick([...(BETTER[f.id] ?? []), f.photo, `${f.name} food`], false, MUST[f.id])
const famName = Object.fromEntries(C.families.map(f => [f.id, f.name]))
for (const m of C.menus) menu[m.id] = await pick([...(BETTER[m.id] ?? []), m.photo, `${famName[m.family]} food`, m.diet === 'veg' ? 'indian vegetarian food' : 'indian food'], m.diet === 'veg', MUST[m.id])

mkdirSync(dirname(CACHE), { recursive: true })
writeFileSync(CACHE, JSON.stringify(raw))
writeFileSync(OUT, `/* Generated by scripts/resolve-menu-photos.mjs — do not edit by hand.
   SAMBRAMO inspiration photographs (Pexels License, kind 'inspiration'):
   the look of a cuisine or menu, never a caterer's own food. */
export const FAMILY_PHOTOS = ${JSON.stringify(family)}
export const MENU_PHOTOS = ${JSON.stringify(menu)}
`)
const n = o => Object.values(o).filter(Boolean).length
console.log(`families ${n(family)}/${C.families.length} · menus ${n(menu)}/${C.menus.length} · ${calls} new Pexels calls`)
