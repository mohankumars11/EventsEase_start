#!/usr/bin/env node
/**
 * Build the master food catalogue seed from the dishes Sambramo already has,
 * plus the curated files, into one de-duplicated list.
 *
 *   node scripts/build-food-catalogue-seed.mjs
 *   → supabase/seed/food-catalogue/v1/dishes.json   (+ a coverage report)
 *
 * Sources, in order of authority:
 *   1. src/data/dishRegistry.js     144 dishes, permanent SBM-* ids (reviewed)
 *   2. src/data/cuisineMenus.js     16 cuisines × courses, ids from dishIds.generated.js
 *   3. src/data/cateringDishes.js   840-dish catering library (Karnataka, North
 *                                   Indian, non-veg, beverages) — new ids
 *   4. supabase/seed/food-catalogue/v1/curated-*.json   editorial expansion,
 *                                   every entry review_status 'needs_review'
 *
 * Existing ids are never changed. A later source naming a dish that already
 * exists (same normalised name and diet) adds its cuisine tags and spelling
 * as an alias instead of creating a second row. No prices, ever.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = join(ROOT, 'supabase/seed/food-catalogue/v1')
const CACHE = join(ROOT, 'node_modules/.cache'); mkdirSync(CACHE, { recursive: true })
const ENTRY = join(CACHE, 'food-seed-entry.mjs'), OUT = join(CACHE, 'food-seed.mjs')
writeFileSync(ENTRY, ['dishRegistry', 'cuisineMenus', 'cateringDishes', 'dishIds.generated']
  .map(f => `export * as ${f.replace('.', '_')} from ${JSON.stringify(join(ROOT, 'src/data', f + '.js'))}`).join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`, '--log-level=error'], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }
const M = await import(pathToFileURL(OUT).href)
const { dishRegistry: R, cuisineMenus: CM, cateringDishes: CD, dishIds_generated: IDS } = M

const categories = JSON.parse(readFileSync(join(SEED, 'categories.json'), 'utf8'))
const cuisines = JSON.parse(readFileSync(join(SEED, 'cuisines.json'), 'utf8'))
const CAT_IDS = new Set(categories.parents.flatMap(p => p.children.map(c => c[0])))
const CUISINE_IDS = new Set(cuisines.groups.flatMap(g => g.styles.map(s => s[0])))

const norm = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')
const slugId = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ── Category from a dish's name and the course it came from ─────────── */
const K = (re, cat) => [re, cat]
const BY_NAME = [
  K(/biryani|biriyani/, 'rc_biryani'), K(/pulao|pulav|pilaf/, 'rc_pulao'), K(/fried rice/, 'rc_fried_rice'), K(/khichdi|khichuri|pongal/, 'rc_khichdi'),
  K(/curd rice|mosaranna|thayir sadam|dahi chawal/, 'rc_curd'), K(/steamed rice|plain rice|white rice/, 'rc_steamed'),
  K(/lemon rice|coconut rice|tamarind rice|puliyogare|puliyodharai|jeera rice|tomato rice|chitranna|ghee rice|\bbath\b|\bbhaat\b/, 'rc_flavoured'),
  K(/naan/, 'br_naan'), K(/kulcha/, 'br_kulcha'), K(/paratha|parantha|thepla/, 'br_paratha'), K(/parotta|porotta/, 'br_parotta'),
  K(/tandoori roti/, 'br_tandoori'), K(/chapati|chapathi|phulka|roti|rotti|rotli|bhakri/, 'br_rotti'), K(/poori|puri\b|bhatura|luchi/, 'br_poori'),
  K(/appam/, 'br_appam'), K(/neer dos/, 'br_neer_dosa'),
  K(/idli|idly/, 'bf_idli'), K(/dosa|dose|dosai/, 'bf_dosa'), K(/uttapam|uthappam/, 'bf_uttapam'), K(/vada|vadai|wada/, 'bf_vada'),
  K(/upma|uppittu|khara bath/, 'bf_upma'), K(/poha|avalakki/, 'bf_poha'), K(/pesarattu/, 'bf_pesarattu'), K(/puttu/, 'bf_puttu'), K(/adai/, 'bf_adai'),
  K(/sambar|sambhar|kuzhambu|huli\b|saaru|pulusu|kootu|kadhi|dalma/, 'gr_sambar'), K(/rasam|charu/, 'sp_rasam'),
  K(/\bdal\b|daal|dhal|pappu|varan|tadka|makhani/, 'gr_dal'),
  K(/soup|shorba/, 'sp_vegetable'),
  K(/paneer/, 'gr_paneer'), K(/kofta/, 'gr_kofta'), K(/mushroom/, 'gr_mushroom'),
  K(/prawn|shrimp|crab|squid|lobster|clam|mussel/, 'gr_prawn'), K(/fish|meen|machli|machh|pomfret|seer|surmai|rawas|bangda|mackerel|sardine|anjal/, 'gr_fish'),
  K(/mutton|lamb|gosht|keema|rogan|nalli|pandi|pork|beef/, 'gr_mutton'), K(/chicken|murgh|kodi|kozhi|kori/, 'gr_chicken'), K(/egg|anda|motte/, 'gr_egg'),
  K(/raita|pachadi/, 'ac_raita'), K(/chutney|thogayal|thuvaiyal|gojju/, 'ac_chutney'), K(/pickle|achar|uppinakayi|avakaya|oorugai/, 'ac_pickle'),
  K(/papad|appalam|happala|appadam/, 'ac_papad'), K(/kosambari/, 'ac_kosambari'), K(/salad/, 'ac_salad'), K(/podi/, 'ac_podi'),
  K(/halwa|halva|alva|kesari|sheera/, 'ds_halwa'), K(/laddu|ladoo|unde/, 'ds_laddu'), K(/barfi|burfi/, 'ds_barfi'), K(/peda|pedha/, 'ds_peda'),
  K(/mysore pak|mysorepak/, 'ds_mysore_pak'), K(/holige|obbattu|poli\b|puran/, 'ds_holige'), K(/payasa|payasam|kheer|kheeri|pradhaman|payesh/, 'ds_payasam'),
  K(/jamun|rasgulla|rasagolla|rasmalai|chamcham/, 'ds_syrup'), K(/jalebi|imarti/, 'ds_jalebi'), K(/rabri|basundi|shrikhand|phirni/, 'ds_milk'),
  K(/sandesh|chhena|mishti/, 'ds_bengali'), K(/ice cream/, 'ds_ice_cream'), K(/kulfi/, 'ds_kulfi'), K(/cake|pastry|brownie|cookie/, 'ds_bakery'),
  K(/pudding|custard/, 'ds_pudding'),
  K(/lassi|buttermilk|majjige|chaas|neer mor/, 'bev_buttermilk_lassi'), K(/coffee/, 'bev_coffee'), K(/\btea\b|chai/, 'bev_tea'),
  K(/juice/, 'bev_fresh_juice'), K(/mocktail|mojito/, 'bev_mocktail'), K(/shake/, 'bev_shake'), K(/coconut water|elaneer/, 'bev_coconut'),
  K(/lime|lemon|nimbu|panaka|panakam/, 'bev_lemon'), K(/sherbet|sharbat|jaljeera|panna|kokum|solkadhi|sol kadhi|thandai|badam milk|rose milk/, 'bev_traditional'),
  K(/pani puri|golgappa|puchka/, 'ch_pani_puri'), K(/sev puri/, 'ch_sev_puri'), K(/bhel/, 'ch_bhel'), K(/dahi puri/, 'ch_dahi_puri'), K(/papdi/, 'ch_papdi'),
  K(/tikki/, 'ch_tikki'), K(/kachori/, 'ch_kachori'), K(/pav\b|pao\b/, 'ch_pav'), K(/bajji|bonda|bhaji|bajje/, 'ch_bajji'),
  K(/tikka/, 'st_tikka'), K(/kebab|kabab|seekh|galouti|shami/, 'st_kebab'), K(/cutlet/, 'st_cutlet'), K(/pakoda|pakora|fritter/, 'st_pakoda'),
  K(/spring roll/, 'st_spring_roll'), K(/manchurian/, 'st_manchurian'), K(/tandoori/, 'st_tandoori'), K(/65|fry|roast|sukka|chukka|pepper/, 'dr_regional_fry'),
  K(/palya|poriyal|thoran|sabzi|subzi|bhaji\b|aloo/, 'dr_poriyal'),
]
const COURSE_DEFAULT = {
  welcome: 'bev_traditional', starters: 'st_vegetable', mains: 'rc_regional', curries: 'gr_vegetable', accompaniments: 'ac_other',
  sweets: 'ds_other', counters: 'ad_live_counter',
  STARTERS: 'st_regional', MAIN_CURRIES: 'gr_south', RICE_ASSETS: 'rc_regional', DESSERTS_LIVE: 'ds_festival',
}
/* Courses that pin a dish's family, so a "fry" in sweets stays a sweet. */
const COURSE_FAMILY = { welcome: 'bev_', sweets: 'ds_', accompaniments: 'ac_', counters: null, DESSERTS_LIVE: 'ds_' }
function categoryFor(name, course, nonVeg) {
  const n = String(name).toLowerCase()
  const fam = COURSE_FAMILY[course]
  for (const [re, cat] of BY_NAME) {
    if (!re.test(n)) continue
    if (fam && !cat.startsWith(fam)) continue
    if (cat === 'st_vegetable' && nonVeg) return 'st_chicken'
    return cat
  }
  if (course === 'starters' && nonVeg) return /fish|prawn/.test(n) ? 'st_fish' : /mutton/.test(n) ? 'st_mutton' : 'st_chicken'
  if (course === 'counters') return 'ad_live_counter'
  return COURSE_DEFAULT[course] ?? 'ad_other'
}

/* ── Cuisine ids for the existing data's cuisine keys ───────────────── */
const CUISINE_MAP = {
  karnataka: ['ka_traditional'], udupi: ['ka_udupi'], tamil: ['tn_traditional'], andhra: ['ap_traditional'], kerala: ['kl_central'],
  north_indian: ['ni_punjabi'], mughlai: ['ni_mughlai'], bengali: ['ei_bengali'], gujarati_rajasthani: ['wi_gujarati', 'wi_rajasthani'],
  maharashtrian: ['wi_maharashtrian'], jain_satvik: ['sp_jain', 'sp_satvik'], indo_chinese: ['oi_indo_chinese'], continental: ['in_continental'],
  chaat_street: ['oi_street_food'], multi_cuisine: [], mysuru_royal: ['ka_mysuru'],
}
const NONVEG_CUISINE = { tn_traditional: 'tn_non_veg', ap_traditional: 'ap_non_veg', kl_central: 'kl_non_veg', ni_punjabi: 'ni_non_veg' }
const tagNonVeg = (ids, nonVeg) => nonVeg ? ids.map(c => NONVEG_CUISINE[c] ?? c) : ids

const rows = new Map()           // id → row
const byKey = new Map()          // norm(name)|diet → id
let merged = 0
function add({ id, name, cuisine_ids = [], category_id, suggested_diet = null, aliases = [], provenance, review_status }) {
  name = String(name).trim()
  if (!name || /^other\b/i.test(name)) return
  const key = `${norm(name)}|${suggested_diet ?? ''}`
  const hit = byKey.get(key)
  if (hit) {           // same dish: widen it, never duplicate it
    const r = rows.get(hit)
    r.cuisine_ids = [...new Set([...r.cuisine_ids, ...cuisine_ids])]
    for (const a of [name, ...aliases]) if (norm(a) !== norm(r.name) && !r.aliases.some(x => norm(x) === norm(a))) r.aliases.push(a)
    merged++
    return
  }
  if (rows.has(id)) id = `${id}-${rows.size}`
  rows.set(id, { id, name, aliases: [...new Set(aliases)], local_names: {}, cuisine_ids: [...new Set(cuisine_ids)], category_id,
    suggested_diet, variants: [], provenance, review_status, version: 1, active: true })
  byKey.set(key, id)
}

// 1. Registry (authoritative ids, reviewed)
const REG_CUISINE = { tamil: 'tn_traditional', andhra: 'ap_traditional', kerala: 'kl_central', karnataka: 'ka_brahmin_veg' }
for (const d of R.DISHES) {
  const nonVeg = d.diet !== 'veg'
  add({ id: d.id, name: d.name, cuisine_ids: tagNonVeg([REG_CUISINE[d.cuisine] ?? 'ka_traditional'], nonVeg),
    category_id: categoryFor(d.name, d.course, nonVeg), suggested_diet: nonVeg ? 'non_veg' : 'veg',
    provenance: 'sambramo:dishRegistry', review_status: 'reviewed' })
}
// 2. Cuisine menus (ids from dishIds.generated)
for (const cu of CM.CUISINES) {
  for (const course of CM.COURSES) {
    for (const d of CM.dishesFor(cu.id, course.id) ?? []) {
      const id = IDS.dishIdFor(cu.id, course.id, d.name) ?? `SBM-CM-${slugId(cu.id)}-${slugId(d.name)}`
      add({ id, name: d.name, cuisine_ids: tagNonVeg(CUISINE_MAP[cu.id] ?? [], !d.veg), category_id: categoryFor(d.name, course.id, !d.veg),
        suggested_diet: d.veg ? 'veg' : 'non_veg', provenance: `sambramo:cuisineMenus/${cu.id}`, review_status: 'reviewed' })
    }
  }
}
// 3. Catering library groups
const GROUP = {
  rice_bath: ['rc_flavoured', ['ka_traditional']], dose: ['bf_dosa', ['ka_traditional']], kosambari: ['ac_kosambari', ['ka_traditional']],
  gojju: ['ac_chutney', ['ka_traditional']], palya: ['dr_poriyal', ['ka_traditional']], dry_items: ['dr_regional_fry', ['ka_traditional']],
  sambar: ['gr_sambar', ['ka_traditional']], kootu: ['ml_component', ['ka_traditional']], rasam: ['sp_rasam', ['ka_traditional']],
  thambuli: ['ml_component', ['ka_traditional']], payasa: ['ds_payasam', ['ka_traditional']], holige: ['ds_holige', ['ka_traditional']],
  sweets: ['ds_festival', ['ka_traditional', 'oi_sweets']], bengali_sweets: ['ds_bengali', ['ei_bengali', 'oi_sweets']],
  ni_starter: ['st_vegetable', ['ni_veg']], ni_soup: ['sp_vegetable', ['ni_veg']], ni_gravy: ['gr_north', ['ni_veg']], ni_bread: ['br_other', ['ni_veg']],
  ni_rice: ['rc_pulao', ['ni_veg']], ni_salad: ['ac_salad', ['ni_veg']], ni_sweet: ['ds_other', ['ni_veg', 'oi_sweets']],
  nv_nati: ['gr_chicken', ['ka_south']], nv_chicken: ['gr_chicken', ['ni_non_veg']], nv_tandoor: ['st_tandoori', ['ni_tandoori']],
  nv_mutton: ['gr_mutton', ['ni_non_veg']], nv_offal: ['gr_mutton', ['ka_south']], nv_pork_beef: ['gr_mutton', ['ka_kodava']],
  nv_coastal_fish: ['gr_fish', ['ka_mangalorean']], nv_fish_other: ['gr_fish', ['kl_seafood']], nv_prawn_shell: ['gr_prawn', ['ka_mangalorean']],
  nv_egg: ['gr_egg', ['ni_non_veg']], nv_biryani: ['rc_biryani', ['tg_hyderabadi_biryani']], nv_starter: ['st_chicken', ['ni_non_veg']],
  nv_soup: ['sp_nonveg', ['ni_non_veg']], nv_regional: ['gr_chicken', ['ka_mangalorean']], nv_accompaniment: ['ac_other', ['ni_non_veg']],
  tea: ['bev_tea', []], coffee: ['bev_coffee', []], hot_other: ['bev_milk', []], juice: ['bev_fresh_juice', []], milkshake: ['bev_shake', []], mocktail: ['bev_mocktail', []],
}
for (const g of CD.ALL_DISH_GROUPS) {
  const [fallbackCat, cuis] = GROUP[g.id] ?? ['ad_other', []]
  const diet = g.id === 'nv_egg' ? 'egg' : g.id.startsWith('nv_') ? 'non_veg' : 'veg'
  for (const name of g.items) {
    const guessed = categoryFor(name, g.id.startsWith('nv_') ? 'curries' : 'x', diet !== 'veg')
    const cat = guessed !== 'ad_other' && guessed.slice(0, 3) === fallbackCat.slice(0, 3) ? guessed : fallbackCat
    add({ id: `SBM-CL-${slugId(g.id)}-${slugId(name)}`, name, cuisine_ids: cuis, category_id: cat, suggested_diet: diet,
      provenance: `sambramo:cateringDishes/${g.id}`, review_status: 'reviewed' })
  }
}
const existing = rows.size
// 4. Curated expansion
const curatedFiles = readdirSync(SEED).filter(f => /^curated-.*\.json$/.test(f)).sort()
for (const f of curatedFiles) {
  const doc = JSON.parse(readFileSync(join(SEED, f), 'utf8'))
  for (const grp of doc.groups) {
    for (const entry of grp.dishes) {
      const [name, ...aliases] = Array.isArray(entry) ? entry : [entry]
      add({ id: `SBM-MD-${slugId(name)}`, name, aliases, cuisine_ids: grp.cuisines, category_id: grp.category,
        suggested_diet: grp.diet ?? null, provenance: `sambramo:curated/${f}`, review_status: 'needs_review' })
    }
  }
}

/* ── Validate and report ─────────────────────────────────────────────── */
const out = [...rows.values()]
const badCat = out.filter(r => !CAT_IDS.has(r.category_id))
const badCuisine = out.filter(r => r.cuisine_ids.some(c => !CUISINE_IDS.has(c)))
if (badCat.length || badCuisine.length) {
  console.error('Unknown category:', badCat.slice(0, 10).map(r => `${r.name}→${r.category_id}`))
  console.error('Unknown cuisine:', badCuisine.slice(0, 10).map(r => `${r.name}→${r.cuisine_ids}`))
  process.exit(1)
}
const ids = new Set(out.map(r => r.id))
if (ids.size !== out.length) { console.error('Duplicate ids'); process.exit(1) }
writeFileSync(join(SEED, 'dishes.json'), JSON.stringify({ version: 1, generated_by: 'scripts/build-food-catalogue-seed.mjs', count: out.length, dishes: out }, null, 0))

const by = (f) => out.reduce((m, r) => { for (const k of [].concat(f(r))) m[k] = (m[k] ?? 0) + 1; return m }, {})
const groupOf = Object.fromEntries(cuisines.groups.flatMap(g => g.styles.map(s => [s[0], g.name])))
const courseOf = Object.fromEntries(categories.parents.flatMap(p => p.children.map(c => [c[0], p.name])))
console.log(`dishes: ${out.length} (existing ${existing}, curated new ${out.length - existing}, merged duplicates ${merged})`)
console.log('by cuisine group:', by(r => r.cuisine_ids.length ? [...new Set(r.cuisine_ids.map(c => groupOf[c]))] : ['(untagged)']))
console.log('by category family:', by(r => courseOf[r.category_id]))
console.log('by diet:', by(r => r.suggested_diet ?? '(not suggested)'))
console.log('review:', by(r => r.review_status))
