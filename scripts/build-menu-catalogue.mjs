#!/usr/bin/env node
/**
 * Menu Studio — compiles the curated menus (supabase/seed/menu-catalogue/v1)
 * onto the LIVE master dish catalogue, so a menu points at the same dish ids
 * partners already cook from (sambramo_master_dishes, 2,742 dishes).
 *
 *   node --env-file=.env scripts/build-menu-catalogue.mjs [--offline]
 *
 * 1. Reads the live dishes over PostgREST with the anon key (they are
 *    public), cached in scripts/data/master-dishes-live.json; --offline
 *    uses the cache.
 * 2. Matches each menu dish by a spelling-tolerant key (Medu Vada = Medhu
 *    Vadai), preferring a dish of the menu's own cuisine family. A dish the
 *    catalogue lacks becomes a NEW master dish, id SBM-MS-<slug>,
 *    provenance 'sambramo-curated:menu-studio', needs_review.
 * 3. Derives each dish's attributes: description (from the menu text),
 *    diet (non-veg/egg from the name or an explicit flag), allergens it
 *    USUALLY contains (never "allergen-free"), spice, and Jain/vegan flags
 *    for the caterer to adapt. Vegan and Jain are never claimed as verified.
 * 4. Refuses to write when a vegetarian menu carries meat, fish or egg, a
 *    family has fewer than four menus, or two menus are near-copies.
 * 5. Writes src/customer/data/menuCatalogue.generated.js (the app's copy,
 *    loaded on demand) and supabase/seed/menu-catalogue/v1/catalogue.json
 *    (what scripts/apply-menu-catalogue.mjs puts in the database).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'supabase/seed/menu-catalogue/v1')
const CACHE = join(ROOT, 'scripts/data/master-dishes-live.json')
const OUT_JS = join(ROOT, 'src/customer/data/menuCatalogue.generated.js')
const OUT_JSON = join(SRC, 'catalogue.json')
const imp = f => import(pathToFileURL(join(SRC, f)).href)

const { SECTIONS, FAMILIES, RULES } = await imp('families.mjs')
const MENUS = [...(await imp('menus-south.mjs')).MENUS, ...(await imp('menus-north-west-east.mjs')).MENUS, ...(await imp('menus-world.mjs')).MENUS]

// ── 1. the live catalogue ───────────────────────────────────────────────
async function liveDishes() {
  if (process.argv.includes('--offline')) return JSON.parse(readFileSync(CACHE, 'utf8'))
  const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — run with --env-file=.env, or --offline')
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/sambramo_master_dishes?select=id,name,aliases,cuisine_ids,category_id,suggested_diet,review_status&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`master dishes ${r.status} ${await r.text()}`)
    const page = await r.json()
    rows.push(...page)
    if (page.length < 1000) break
  }
  mkdirSync(dirname(CACHE), { recursive: true })
  writeFileSync(CACHE, JSON.stringify(rows))
  return rows
}
const live = await liveDishes()

// ── 2. matching ─────────────────────────────────────────────────────────
/* A spelling-tolerant key: Medhu Vadai → meduvada, Puliyodharai → puliyodarai. */
const key = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '')
  .replace(/([bcdgjkpt])h/g, '$1').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/w/g, 'v').replace(/z/g, 'j')
  .replace(/(.)\1+/g, '$1').replace(/[aeiu]$/, '')
const index = new Map()
for (const d of live) for (const n of [d.name, ...(d.aliases ?? [])]) {
  const k = key(n)
  if (k.length < 3) continue
  if (!index.has(k)) index.set(k, [])
  index.get(k).push(d)
}
const famCuisines = Object.fromEntries(FAMILIES.map(f => [f.id, new Set(f.variants.map(v => v[0]))]))

// ── 3. attributes from the name (and an explicit [flag]) ────────────────
const NV = /\b(chicken|mutton|lamb|gosht|maas|mansa|mangsho|mangshor|keema|kheema|galouti|adana|joojeh|pollo|masor|kakori|shami|rista|gushtaba|yakhni|tabak|rogan josh|fish|meen|machha?|maach|ilish|bhetki|bombil|surmai|nethili|karimeen|apollo|prawns?|chemmeen|chingri|chingudi|royyala|kolambi|gambas|crab|kankada|mussel|kallummakkaya|duck|hanh|kodi|kozhi|kori|murg[h]?|murgir|kokur|pork|salmon|seafood|chepala|marag|dalcha|haleem|pathar|wings|bulgogi|pepperoni|shawarma|tawook|mandi|souvlaki|tinga|nihari|erachi|sukka|chukka|varattiyathu|rassa|sha phaley|wonton|siu mai|har gow|california roll|nigiri|tuna)\b/i
const VEGWORD = /\b(veg|vegetable|paneer|tofu|mushroom|gobi|aloo|potato|bean|dal|chhena|corn|soya|jackfruit|nadru|lotus)\b/i
const EGG = /\b(egg|eggs|anda|mutta|omelette|mayonnaise|mayo|kabiraji|tortilla española|crème caramel|caramel pudding|crème brûlée|crema catalana|tiramisu|cheesecake|brownies?|cupcakes?|mousse|lemon tart|tres leches|revani|dorayaki|pajeon|katsu|coleslaw|yang chow|pad thai)\b/i
const ALLERGENS = [
  ['dairy', /paneer|chhena|chhanar|curd|dahi|mosaru|thayir|mor\b|majjig|raita|lassi|chaas|mattha|milk|paal|payas|payesh|kheer|khiri|phirni|firni|ghee|neychoru|butter|benne|makhan|malai|cream|kulfi|rabri|rasmalai|rasgulla|rosogolla|rasagola|sandesh|basundi|doodhpak|shrikhand|amrakhand|ice cream|gelato|peda|barfi|khoa|mawa|cheese|halloumi|feta|labneh|tzatziki|yoghurt|yogurt|custard|makhani|makhanwala|korma|qorma|pasanda|shahi|alfredo|au gratin|gratin|sheer|lababdar|mishti doi|kadhi|kalan|kaalan|pulissery|olan|pradhaman|palada|basanti|jangiri|mysore pak|kesari|sheera|shira|halwa|kunafa|panna cotta|mac and cheese|sour cream|kahwa|tea\b|chai|coffee|thandai|jigarthanda|falooda|lyangcha|pantua|kheer kadam|kalakand|mohanthal|ghevar|malpua|churma|baati|kaju paneer/i],
  ['tree nuts', /kaju|cashew|badam|almond|pista|pistachio|walnut|akhrot|doon chetin|muj chetin|muhammara|waldorf|baklava|kardantu|shufta|qubani|pesto|kesar pista|nut/i],
  ['peanut', /peanut|groundnut|shenga|kadalekai|puliyogare|pulihora|puliyodharai|ennegai|mirchi ka salan|bagara baingan|satay|kung pao|pad thai|girmit|koshimbir|dabeli|sarva pindi/i],
  ['gluten', /roti|rotli|naan|poori|puri\b|luchi|radhaballavi|chapati|phulka|paratha|kulcha|bhatura|bhature|rumali|parotta|porotta|pasta|penne|spaghetti|fettuccine|lasagne|noodle|hakka|chow mein|thukpa|maggi|bread|bun|bao|pav|pita|khubz|lavash|focaccia|crostini|bruschetta|croissant|muffin|cake|brownie|cookie|cupcake|tart|samosa|kachori|fafda|gota|puffs|frankie|burger|slider|pizza|sandwich|toast|rava|semolina|sooji|upma|kesari|sheera|shira|goli baje|mysore bonda|chiroti|holige|obbattu|bobbatlu|puran poli|malpua|jalebi|jangiri|ghevar|shahi tukda|double ka meetha|malidalu|godhi|gothambu|churma|baati|bati|missi|thepla|couscous|bulgur|tabbouleh|fattoush|fatayer|spanakopita|baklava|kunafa|vol-au-vent|croquet|katsu|tempura|gyoza|wonton|momos?|sha phaley|siu mai|cutlet|fish fry|kabiraji|semiya|vermicelli|sheer khurma|darsaan|bakarkhani|girda|sheermal|warqi|manchurian|spring roll|chilli chicken|dragon chicken|chilli paneer|honey chilli|crispy|nuggets|fries|churros|enchilada|burrito|taco|quesadilla|fajita|nachos|wraps?\b|umm ali|revani|loukoumades|dorayaki/i],
  ['fish', /fish|meen|machha?|maach|ilish|bhetki|bombil|surmai|nethili|karimeen|apollo|salmon|nigiri|caesar|tuna|chepala/i],
  ['shellfish', /prawn|shrimp|chemmeen|chingri|chingudi|royyala|kolambi|gambas|crab|kankada|mussel|kallummakkaya|har gow|seafood paella|yang chow|california roll/i],
  ['egg', EGG],
  ['soy', /soy|tofu|manchurian|hakka|schezwan|szechuan|chilli chicken|chilli paneer|dragon chicken|honey chilli|fried rice|teriyaki|bulgogi|miso|edamame|axone|mapo|black bean|hot garlic|salt and pepper|japchae|bibimbap|tteokbokki|kimchi fried|dim sum|dumpling|gyoza/i],
  ['sesame', /sesame|til\b|til pitha|ellu|tahini|hummus|baba ghanoush|mirchi ka salan|bagara baingan|ennegai|sakinalu|milagai podi/i],
  ['mustard', /shorshe|mustard|kasundi|besara|paturi|kosha|xaak|lai xaak/i],
]
const HOT = /chettinad|kolhapuri|tambda|laal maas|gongura|andhra|guntur|pepper|chilli|chili|mirchi|mirapakaya|kara\b|vepudu|ghee roast|sukka|chukka|raja mircha|schezwan|vindaloo|apollo|chicken 65|gobi 65|aloo 65|dragon|arrabbiata|jalapeño|tteokbokki|lasan|lehsun|thecha|malvani|kodi|natu kodi|mutton fry|pulusu/i
/* Jain: the caterer cooks every dish without onion or garlic; what cannot
   be made Jain is a dish MADE of them or of roots — judged on the name, and
   on the description only for roots (an "onion-tomato gravy" can lose its onion). */
const JAIN_NAME = /aloo|potato|bateta|batata|urulai|onion|pyaaz|kanda|piaji|garlic|lasan|lehsun|lasaniya|toum|carrot|gajar|beetroot|radish|mooli|muj\b|yam|suran|kaalan|colocasia|patra|patrode|arbi|sweet potato|ginger|inji|allam|lotus stem|nadru|hash browns|fries|wedges|tikki|vada pav|pav bhaji|ragda|dum aloo|aloor|bravas|croquet|mashed potatoes|gratin|pani puri|papdi chaat|dahi puri|samosa|bonda|malai kofta|masala dosa|kachori|frankie|burrito/i
const JAIN_DESC = /potato|carrot|beetroot|\byam\b|colocasia|radish|sweet potato|lotus stem/i
const flagsOf = s => (String(s).match(/\[([a-z ,]+)\]/i)?.[1] ?? '').split(/[ ,]+/).filter(Boolean)
function parse(raw) {
  const flags = flagsOf(raw)
  const clean = String(raw).replace(/\[[a-z ,]+\]/ig, '').trim()
  const [name, desc] = clean.split(/\s+~\s+/)
  return { name: name.trim(), desc: desc?.trim() || null, flags }
}

const SECTION_FORMAT = { welcome: 'drink', soups: 'soup', starters: 'starter', live: 'live counter', mains: 'main', rice: 'rice', breads: 'bread', curries: 'curry', sides: 'accompaniment', salads: 'salad', desserts: 'sweet', icecream: 'frozen dessert', beverages: 'drink', special: 'addition' }
/* Category for a NEW master dish — a real sambramo_food_categories id. */
function categoryFor(section, name, nonVeg) {
  const n = name.toLowerCase()
  const has = re => re.test(n)
  switch (section) {
    case 'welcome': case 'beverages':
      return has(/coffee/) ? 'bev_coffee' : has(/tea|chai|kahwa/) ? 'bev_tea' : has(/lassi|chaas|mattha|majjig|mor\b|buttermilk|sambharam/) ? 'bev_buttermilk_lassi'
        : has(/lime|lemon|nimbu/) ? 'bev_lemon' : has(/juice/) ? 'bev_fresh_juice' : has(/milk|thandai|jigarthanda/) ? 'bev_milk' : has(/mocktail|punch|sarbath|sharbat|sherbet/) ? 'bev_mocktail' : 'bev_traditional'
    case 'soups': return nonVeg ? 'sp_nonveg' : has(/rasam|charu|saaru/) ? 'sp_rasam' : has(/cream/) ? 'sp_cream' : has(/tomato/) ? 'sp_tomato' : has(/corn/) ? 'sp_sweet_corn' : has(/miso|tom yum|tom kha|manchow|hot and sour|wonton|thukpa/) ? 'sp_asian' : 'sp_vegetable'
    case 'starters': case 'live':
      if (has(/chicken|murg|kodi|kozhi/)) return 'st_chicken'
      if (has(/mutton|lamb|gosht|kebab.*mutton|soola|tabak|keema|kheema|shami|galouti|kakori/)) return 'st_mutton'
      if (has(/prawn|crab|mussel|kolambi|gambas|chemmeen|royyala/)) return 'st_seafood'
      if (has(/fish|meen|bombil|surmai|nethili|machha|apollo|bhetki/)) return 'st_fish'
      if (has(/egg|omelette/)) return 'st_egg'
      if (has(/paneer/)) return 'st_paneer'
      if (has(/pani puri|papdi|chaat|bhel|sev puri|dahi puri|raj kachori|ragda/)) return 'ch_regional'
      if (has(/dosa|uttapam|uthappam|idli|vada|appam|idiyappam/)) return 'bf_regional'
      if (has(/manchurian/)) return 'st_manchurian'
      if (has(/spring roll/)) return 'st_spring_roll'
      if (has(/cutlet|croquet|chop\b|tikki|patties/)) return 'st_cutlet'
      if (has(/bajji|baje|bonda|pakod|pakor|fritter|piaji|beguni|bor\b|gota|pori/)) return 'st_fritter'
      if (has(/tikka|kebab|soola/)) return 'st_tikka'
      return nonVeg ? 'st_other' : 'st_regional'
    case 'mains': case 'rice':
      if (has(/biryani|mandi/)) return 'rc_biryani'
      if (has(/fried rice|schezwan rice/)) return 'rc_fried_rice'
      if (has(/pulao|pulav|pilaf|polo|kanika/)) return 'rc_pulao'
      if (has(/curd rice|thayir|mosaru|daddojanam/)) return 'rc_curd'
      if (has(/khichdi|khichuri|khechudi|pongal/)) return 'rc_khichdi'
      if (has(/steamed|white rice|matta|joha|jasmine|boiled rice|japanese rice/)) return 'rc_steamed'
      if (has(/bath|chitranna|pulihora|puliyo|sadam|lemon rice|coconut rice|bagara|masale bhaat|ghee rice|tawa pulao|vermicelli rice|cilantro/)) return 'rc_flavoured'
      if (has(/idli|dosa|vada|upma|pongal|uttapam/)) return 'bf_regional'
      if (has(/sangati|mudde/)) return 'rc_millet'
      return nonVeg ? (has(/fish|prawn|seafood/) ? 'gr_fish' : 'gr_chicken') : 'ml_other'
    case 'breads':
      return has(/naan/) ? 'br_naan' : has(/kulcha/) ? 'br_kulcha' : has(/paratha/) ? 'br_paratha' : has(/poori|puri|luchi|bhatur|radhaballavi/) ? 'br_poori' : has(/appam/) ? 'br_appam'
        : has(/parotta|porotta/) ? 'br_parotta' : has(/neer dosa/) ? 'br_neer_dosa' : has(/rotti|rotte|rotla|bhakri|makki|bajr|jowar|jolada|sajje/) ? 'br_rotti' : has(/tandoori roti|missi/) ? 'br_tandoori'
          : has(/chapati|phulka|poli|rotli|rumali|roti/) ? 'br_chapati' : 'br_other'
    case 'curries':
      if (has(/chicken|murg|kodi|kozhi|kokur|kori/)) return 'gr_chicken'
      if (has(/mutton|lamb|gosht|maas|mansa|mangsho|mamsam|rista|gushtaba|yakhni|rogan|keema|kheema|rezala|rassa|varattiyathu|chukka|sukka/)) return 'gr_mutton'
      if (has(/prawn|chingri|chingudi|chemmeen|crab|kankada|royyala/)) return 'gr_prawn'
      if (has(/fish|meen|machha?|maach|ilish|bhetki|tenga/)) return 'gr_fish'
      if (has(/egg|mutta/)) return 'gr_egg'
      if (has(/duck|hanh|pork/)) return 'gr_other'
      if (has(/sambar|huli/)) return 'gr_sambar'
      if (has(/dal|pappu|paruppu|parippu|varan|amti|dalma|dail|bele saaru|dalitoy/)) return 'gr_dal'
      if (has(/paneer|chhena|chaman/)) return 'gr_paneer'
      if (has(/kofta/)) return 'gr_kofta'
      if (has(/mushroom/)) return 'gr_mushroom'
      return 'gr_vegetable'
    case 'sides':
      return has(/pickle|achar|avakaya|thokku|lonche|chhundo|gor keri|kadumanga/) ? 'ac_pickle' : has(/raita|pachadi|kichadi/) ? 'ac_raita' : has(/papad|appalam|appadam|happala|pappadam/) ? 'ac_papad'
        : has(/kosambari|kosumalli|koshimbir|salad|kachumber/) ? 'ac_salad' : has(/podi|chutney powder/) ? 'ac_podi' : has(/chutney|chetin|thecha|gojju|inji|pitika/) ? 'ac_chutney'
          : has(/curd|mosaru|yoghurt/) ? 'ac_yogurt' : has(/hummus|tzatziki|guacamole|salsa|dip|labneh|toum|baba|muhammara|daqoos|sour cream/) ? 'ac_dip' : 'dr_poriyal'
    case 'salads': return 'ac_salad'
    case 'desserts':
      return has(/payas|kheer|khiri|phirni|firni|payesh|pradhaman|palada|paramannam/) ? 'ds_payasam' : has(/halwa|halva|sheera|shira|kesari/) ? 'ds_halwa' : has(/laddu|ladoo|laru/) ? 'ds_laddu'
        : has(/mysore pak/) ? 'ds_mysore_pak' : has(/holige|obbattu|bobbatlu|puran poli/) ? 'ds_holige' : has(/jamun|jangiri|jalebi|kaja|rasabali|pantua|lyangcha|chhena gaja|chhena jhili/) ? 'ds_syrup'
          : has(/rosogolla|rasagola|sandesh|mishti|rasmalai|chhena|kheer kadam/) ? 'ds_bengali' : has(/cake|brownie|cookie|cupcake|tart|cheesecake|croissant|muffin/) ? 'ds_bakery'
            : has(/pudding|custard|mousse|panna cotta|caramel|brûlée|catalana|tres leches/) ? 'ds_pudding' : has(/fruit/) ? 'ds_fruit' : has(/basundi|rabri|shrikhand|amrakhand|doodhpak|doi/) ? 'ds_milk' : 'ds_festival'
    case 'icecream': return has(/kulfi/) ? 'ds_kulfi' : 'ds_ice_cream'
    default: return has(/water/) ? 'bev_water' : 'ad_other'
  }
}

// ── build ──────────────────────────────────────────────────────────────
const dishes = new Map()          // id → dish
const report = { matched: 0, created: 0 }
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
function resolveDish(raw, menu, section) {
  const { name, desc, flags } = parse(raw)
  const nonVeg = flags.includes('nv') || flags.includes('pork') || (!flags.includes('veg') && NV.test(name) && !(VEGWORD.test(name) && !/chicken|mutton|fish|prawn|egg/i.test(name)))
  let egg = flags.includes('egg') || (EGG.test(name) && !/eggless/i.test(name))
  const hits = index.get(key(name)) ?? []
  /* A live name qualified for another region ("Mutton Curry (Bihari)") is
     that region's dish, not this menu's. */
  const ours = d => d.cuisine_ids?.some(c => famCuisines[menu.family].has(c))
  const pick = hits.find(ours) ?? hits.find(d => !d.cuisine_ids?.length) ?? hits.find(d => !/[(]/.test(d.name))
  /* A live dish whose recorded diet contradicts the menu's dish is not
     the same dish (a veg "Biryani" for a chicken one) — make our own. */
  const contradicts = pick && pick.suggested_diet && ((nonVeg && pick.suggested_diet === 'veg') || (!nonVeg && pick.suggested_diet === 'non_veg'))
  const id = pick && !contradicts ? pick.id : `SBM-MS-${slug(name)}`
  if (pick && !contradicts && /eggless/i.test(pick.name)) egg = false
  let d = dishes.get(id)
  if (!d) {
    const text = `${name} ${desc ?? ''}`
    d = {
      /* Customers and partners read Sambramo's own clean name; the master
         row's name is kept for the admin who reviews the link. */
      id, name, master_name: pick && !contradicts ? pick.name : null, new: !(pick && !contradicts),
      desc: desc ?? null, section, format: SECTION_FORMAT[section],
      diet: nonVeg ? 'non_veg' : egg ? 'egg' : 'veg', egg,
      pork: flags.includes('pork'),
      allergens: ALLERGENS.filter(([a, re]) => a === 'egg' ? egg : re.test(text)).map(([a]) => a),
      spice: ['desserts', 'icecream', 'welcome', 'beverages'].includes(section) ? 0 : HOT.test(text) ? 3 : null,
      rootVeg: JAIN_NAME.test(name) || JAIN_DESC.test(desc ?? ''),
      category: pick && !contradicts ? pick.category_id : categoryFor(section, name, nonVeg),
      cuisines: new Set(pick && !contradicts ? pick.cuisine_ids ?? [] : []),
      menus: 0,
    }
    if (d.new) report.created++; else report.matched++
    dishes.set(id, d)
  } else if (desc && !d.desc) d.desc = desc
  if (d.new) d.cuisines.add(menu.cuisine)
  d.menus++
  return d
}

const menus = MENUS.map((m, i) => {
  const sections = SECTIONS.filter(s => m.sections[s.id]?.length).map(s => ({ id: s.id, dishes: m.sections[s.id].map(raw => resolveDish(raw, m, s.id).id) }))
  const unknown = Object.keys(m.sections).filter(k => !SECTIONS.some(s => s.id === k))
  if (unknown.length) throw new Error(`${m.id}: unknown section ${unknown}`)
  return { ...m, sections, sort: (i + 1) * 10 }
})

// ── 4. refuse a catalogue that would mislead ──────────────────────────
const problems = []
for (const m of menus) {
  const ds = m.sections.flatMap(s => s.dishes).map(id => dishes.get(id))
  if (new Set(ds.map(d => d.id)).size !== ds.length) problems.push(`${m.id}: a dish appears twice`)
  if (m.diet === 'veg') for (const d of ds) if (d.diet !== 'veg') problems.push(`${m.id}: vegetarian menu has ${d.name} (${d.diet})`)
  if (m.diet === 'non_veg' && ds.filter(d => d.diet === 'non_veg').length < 2) problems.push(`${m.id}: non-vegetarian menu has fewer than two non-vegetarian dishes`)
  if (m.diet === 'mixed' && (!ds.some(d => d.diet !== 'veg') || !ds.some(d => d.diet === 'veg'))) problems.push(`${m.id}: a mixed menu needs both vegetarian and non-vegetarian dishes`)
  if (ds.length < 5) problems.push(`${m.id}: only ${ds.length} dishes`)
  if (!famCuisines[m.family]) problems.push(`${m.id}: unknown family ${m.family}`)
}
for (const f of FAMILIES) { const n = menus.filter(m => m.family === f.id).length; if (n < 4) problems.push(`${f.id}: only ${n} menus`) }
for (let i = 0; i < menus.length; i++) for (let j = i + 1; j < menus.length; j++) {
  const a = new Set(menus[i].sections.flatMap(s => s.dishes)), b = menus[j].sections.flatMap(s => s.dishes)
  const shared = b.filter(x => a.has(x)).length
  if (shared / Math.min(a.size, b.length) > 0.6) problems.push(`${menus[i].id} and ${menus[j].id} share ${shared} dishes — near-copies`)
}
if (problems.length) { console.error('REFUSED:\n  ' + problems.join('\n  ')); process.exit(1) }

// ── 5. write ───────────────────────────────────────────────────────────
const dishList = [...dishes.values()].map(d => ({ ...d, cuisines: [...d.cuisines] }))
const catalogue = { version: 1, built: new Date().toISOString().slice(0, 10), sections: SECTIONS, families: FAMILIES, menus, dishes: dishList, rules: RULES }
writeFileSync(OUT_JSON, JSON.stringify(catalogue, null, 1))
/* The app's copy: compact keys, loaded only when the Menu Studio opens. */
const D = Object.fromEntries(dishList.map(d => [d.id, [d.name, d.desc, d.diet, d.allergens, d.spice, d.rootVeg ? 1 : 0, d.format]]))
writeFileSync(OUT_JS, `/* Generated by scripts/build-menu-catalogue.mjs from supabase/seed/menu-catalogue/v1 — do not edit.
   The database (migration 200) is the source the app reads first; this copy
   keeps the Menu Studio working before 200 is pasted and offline.
   DISHES[id] = [name, description, diet, usually-contains allergens, spice 0-3|null, root vegetable 1|0, format] */
export const VERSION = ${JSON.stringify(catalogue.built)}
export const SECTIONS = ${JSON.stringify(SECTIONS.map(({ id, name }) => ({ id, name })))}
export const FAMILIES = ${JSON.stringify(FAMILIES.map(({ id, name, region, line, variants, cities }) => ({ id, name, region, line, variants, cities })))}
export const MENUS = ${JSON.stringify(menus.map(({ id, family, cuisine, name, line, diet, meals, serve, tags, sections }) => ({ id, family, cuisine, name, line, diet, meals, serve, tags, sections })))}
export const DISHES = ${JSON.stringify(D)}
export const RULES = ${JSON.stringify(RULES.map(({ scope, key, tags, meals, serve, avoid }) => ({ scope, key, tags, meals, serve, avoid })))}
`)
const veg = menus.filter(m => m.diet === 'veg').length
console.log(`families ${FAMILIES.length} · variants ${FAMILIES.reduce((s, f) => s + f.variants.length, 0)} · menus ${menus.length} (veg ${veg}, mixed ${menus.filter(m => m.diet === 'mixed').length}, non-veg ${menus.filter(m => m.diet === 'non_veg').length})`)
console.log(`dishes ${dishList.length}: ${report.matched} from the live catalogue, ${report.created} new (needs_review) · rules ${RULES.length}`)
console.log('wrote', OUT_JS.replace(ROOT, '.'), 'and', OUT_JSON.replace(ROOT, '.'))
