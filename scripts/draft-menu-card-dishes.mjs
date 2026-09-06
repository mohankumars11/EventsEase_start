#!/usr/bin/env node
/**
 * Draft the dishes a menu card names that the catalogue does not have.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE CATALOGUE HAS TO GROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * catalogue_menu_lines.dish_id was NULL for all 304 lines. It is the
 * bridge menu-card matching needs: a customer picks "Option 1", and
 * dispatch has to find the caterers who can cook its lines. A caterer's
 * listing holds dish ids from the picker, so a line can only ever be
 * matched if its dish is IN the picker.
 *
 * 236 of the names on those cards were not. They are real dishes — Aloo
 * Batani Palya, Suvarnagadde Chopse, Nellikai Gojju — and the honest fix
 * is to add them, not to force a near-match onto something else.
 *
 * ── Why not fuzzy matching ───────────────────────────────────────────
 * Edit distance was tried. At distance 2 it proposed:
 *
 *     Masala Dosa   →  Masala soda
 *     Saagu         →  Saaru
 *
 * A soft drink offered as a dosa, and a potato stew as rasam. A wrong
 * dish_id is worse than a NULL one: NULL means "not matched yet", and a
 * wrong one sends a caterer a job they cannot cook. So spellings are an
 * explicit hand-checked list, and everything else becomes a new dish.
 *
 * This script only DRAFTS. What it writes is meant to be read.
 *
 *   node scripts/draft-menu-card-dishes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const OUT = 'src/data/menuCardDishes.js'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const M = await load('src/data/cateringMenus.js')
const PARSE = await load('src/lib/menuLineParse.js')

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/* Every dish already in the catalogue, read from the seed so this can
   never disagree with what is in the database. */
const sql = readFileSync('supabase/migrations/107_catalogue_seed.generated.sql', 'utf8')
const known = new Set()
const DISH_ROW = /INSERT INTO public\.catalogue_dishes \([^)]+\) VALUES \('[^']*', '[^']*', '[^']*', '((?:[^']|'')*)'/g
for (const m of sql.matchAll(DISH_ROW)) known.add(norm(m[1].replace(/''/g, "'")))

/* ══════════════════════════════════════════════════════════════════
   THE THREE KINDS OF LINE
   ══════════════════════════════════════════════════════════════════ */

/**
 * Things every caterer has.
 *
 * Salt, papad, a banana, drinking water. A menu line asking for one
 * carries no information about who can cook the card, so matching on it
 * would only ever add noise — and left unclassified it looks like a
 * permanent gap in the bridge.
 */
const STAPLE = [
  'salt', 'papad', 'pickle', 'ghee', 'curd', 'banana', 'beeda', 'paan',
  'drinkingwater', 'friedchilly', 'sweetbeeda', 'magaibeeda', 'maghaibeeda',
  'bidarpaan', 'papadpickle', 'saltpicklepapad', 'cutfruits', 'stickfruit',
  'appalam', 'happala', 'icecream', 'coconutchutney', 'thayircurd',
  'fruitbowl', 'stickfruits', 'cutfruit',
]

/**
 * Spellings of a dish the catalogue already has.
 *
 * Hand-checked one at a time. The four that edit distance proposed and a
 * person REJECTED are named here so nobody quietly re-adds them:
 *
 *   Saagu → Saaru                  a potato stew is not rasam
 *   Masala Dosa → Masala soda      a dosa is not a soft drink
 *   Mutton Sukka → Mutton chukka   Mangaluru dry, Tamil dry
 *   Chicken Dum Biryani → Chicken biryani   dum is its own thing
 */
const ALIAS = {
  paalpayasa: 'Paal Payasam',
  channamasala: 'Chana masala',
  raitha: 'Raita',
  neerudosa: 'Neer dosa',
  pulka: 'Phulka',
  jilebi: 'Jalebi',
  dalthadka: 'Dal tadka',
  chapathi: 'Chapati',
  akkirotti: 'Akki roti',
  payasa: 'Payasam',
  chillychicken: 'Chilli chicken',
  prawnkoliwada: 'Prawns koliwada',
  dalithoy: 'Dalitoy',
  dahikebab: 'Dahi ke kabab',
  lachaparata: 'Laccha paratha',
  gulabjamoon: 'Gulab jamun',
  whiterice: 'Steamed rice',
  whitericewithghee: 'Steamed rice',
  boiledrice: 'Boiled rice',
  greensalad: 'Green salad',
}

/* ══════════════════════════════════════════════════════════════════
   WHERE A NEW DISH BELONGS
   ══════════════════════════════════════════════════════════════════

   A course label on the line wins. The leaf menus are a flat list with
   no labels at all, and there the name is the strongest signal a Kannada
   menu gives: anything ending payasa is a sweet, anything called palya
   is an accompaniment. First rule that fires wins, so the order is the
   decision. */
const COURSE_RULES = [
  ['welcome', /water|juice|coffee|tea|sherbet|panaka|soda|lassi|majjige|buttermilk|thandai|jaljeera/i],
  ['sweets', /payasa|holige|obbattu|jamoon|jamun|halwa|jilebi|jalebi|kesari|peda|laddu|rasmalai|kadam|chiroti|malpuva|malpua|mysore pak|kulfi|rabdi|rabri|champakali|karjoora|basundi|chum chum|bhog|katli|barfi|mohini|shrikhand|kheer|phirni|sandwich|peta roll|dryfruit|slice|peni|ariselu|ukkarai|sukhiyan|modak|jigarthanda/i],
  ['starters', /vada|vadai|bonda|bajji|bhaji|pakoda|kebab|kabab|tikka|65|manchurian|chilly|chilli|cutlet|finger|ball|sathe|satay|angara|gold coin|crispy|fries|koliwada|tilimili|rawa fry|tawa fry|\bchops\b|sukka|boti|fry|roast|shangai|spring roll|samosa|kachori|dhokla|khandvi|patra|gota|punugulu|garelu/i],
  ['mains', /rice|bath|pulao|biryani|poori|\bpuri\b|roti|rotti|parata|paratha|chapathi|chapati|dosa|naan|batoora|bhatura|idiyappam|appam|kadubu|mudde|noodles|pasta|sadam|choru|annam|bhaat|luchi|sheermal|taftan|khichdi|khichuri|thepla|bhakri|rotla|baati|pongal/i],
  ['curries', /\bsambar\b|saaru|rasam|kurma|gojju|dal|curry|kolambu|huli|pulusu|thoy|soup|shorba|salan|stew|ennegai|thadka|tadka|pappu|charu|amti|jhol|dalna|gassi|moilee|rassa|korma|josh|nihari|masala|kadai|kolhapuri|kandahar|jodhpuri|milon hundy|jaal freez|jalfrezi|sherva|pasanda|tovve|bassaru/i],
  ['accompaniments', /palya|kosambari|raitha|raita|salad|papad|pickle|curd|chutney|sandige|uppinakayi|thoran|poriyal|upkari|chopse|usili|pachadi|kichadi|thecha|koshimbir|achar|lonche|\bsev\b|boondi|onion|lemon|kaal soup/i],
]

const NONVEG = /chicken|mutton|fish|egg|prawn|koli|kuri|boti|motte|bangude|anjal|crab|squid|meen|kodi|gosht|murgh|beef|nati|keema|seekh|nihari|jhinga|chingri|mangsho|maach|kori|marvai|nethili|apollo|\bpaya\b|\bkaal\b/i

/**
 * Cuisine, and why Karnataka is the default.
 *
 * These cards are one Bengaluru caterer's, and a Bengaluru card is
 * Karnataka-shaped. Anything else has to be EARNED by a marker that
 * cannot appear inside another word.
 *
 * `neer` did not clear that bar. It matched inside PaNEERr and filed
 * eight paneer dishes — Paneer Sathe, Paneer Sholey, Pahadi Paneer Tikka
 * — under Udupi. Cuisine decides which picker screen a dish appears on,
 * so a Karnataka caterer would never have been shown them and the card
 * that needs one could never be matched.
 *
 * `puri` had the same fault in the course rules: it matched Kolhapuri
 * and Jodhpuri and filed two curries as breads. `bath` deliberately
 * keeps no boundary — Kharabath and Menthyabath are single words.
 */
const CUISINE_RULES = [
  ['mughlai', /hyderabadi|nawabi|mughalai|mughlai|awadhi|galouti|kakori|shami/i],
  ['tamil', /chettinad|madurai|ambur|dindigul|thalappakatti|kolambu/i],
  ['kerala', /malabar|thalassery|sadya|kappa/i],
  ['andhra', /andhra|guntur|nellore|gongura|pesarattu/i],
  ['udupi', /udupi|mangalore|mangaluru|\bneer\b|gassi|marvai|\bkori\b|pundi|dali thoy/i],
  ['indo_chinese', /manchurian|schezwan|hakka|shangai/i],
  ['north_indian', /punjabi|amritsari|tandoori|jodhpuri|kandahar|batoora|bhatura|rumali/i],
]

/**
 * The twelve the rules could not place, decided by reading the slot each
 * one sits in on the card rather than by guessing from its name.
 *
 *   Ambode              leaf snack slot, beside Bonda
 *   Uppittu             same slot, beside Kharabath
 *   Veg Chaina Town     starter slot, beside Dahi Kebab
 *   Paneer Sholey       starter slot, beside Paneer Malai Kebab
 *   Lotus Stem Pepper Dry  starter slot, beside Arbi Chilly
 *   Capsicum Matar Dry  dry-vegetable slot, after Gobi Batani Sukka
 *   Raw Banana Pepper Dry  the same slot, its alternative
 *   Boiled Egg          beside Onion and Lemon on the donne meal
 *   Saagu               beside Kurma, after Poori
 *   Haryali Mix Veg     gravy slot, beside Veg Kadai
 *   Kaju Matar Paneer   gravy slot, beside Veg Kandahar
 *
 * "Fruit Bowl" is not here: it sits beside Banana and Stick Fruit, so it
 * is a staple and matching on it would say nothing.
 */
const COURSE_OVERRIDE = {
  ambode: 'starters',
  uppittu: 'starters',
  vegchainatown: 'starters',
  paneersholey: 'starters',
  lotusstempepperdry: 'starters',
  capsicummatardry: 'accompaniments',
  rawbananapepperdry: 'accompaniments',
  boiledegg: 'accompaniments',
  saagu: 'curries',
  haryalimixveg: 'curries',
  kajumatarpaneer: 'curries',
  /* Both sit in the dry-vegetable slot on Option 3, beside each other.
     `roast` and `sukka` are starter words and pulled them out of it. */
  roastedaloowithgunpowder: 'accompaniments',
  gobibatanisukka: 'accompaniments',
}

const courseOf = name =>
  COURSE_OVERRIDE[norm(name)]
  ?? COURSE_RULES.find(([, re]) => re.test(name))?.[0] ?? null
const cuisineOf = name => CUISINE_RULES.find(([, re]) => re.test(name))?.[0] ?? 'karnataka'

/* ══════════════════════════════════════════════════════════════════ */

const STAPLE_SET = new Set(STAPLE)
const found = new Map()

for (const menu of M.ALL_MENUS) {
  for (const line of M.menuLines(menu)) {
    let text = typeof line === 'string' ? line : (line?.name ?? line?.text ?? String(line))
    if (!text.trim()) continue

    /* One parser, shared with the seed. Two copies drifted apart
       would half-build the bridge in silence: the drafter deciding a
       line is two dishes and creating both, the seed deciding it is one
       and resolving neither. See lib/menuLineParse.js. */
    const { parts, course: labelCourse } = PARSE.parseMenuLine(text)

    for (const name of parts) {
      const k = norm(name)
      if (known.has(k) || STAPLE_SET.has(k) || ALIAS[k]) continue
      if (!found.has(k)) {
        found.set(k, {
          name,
          cuisine: cuisineOf(name),
          course: labelCourse ?? courseOf(name),
          diet: NONVEG.test(name) ? 'nonveg' : 'veg',
          n: 0,
        })
      }
      found.get(k).n++
      if (labelCourse) found.get(k).course = labelCourse
    }
  }
}

const rows = [...found.values()].sort((a, b) =>
  a.cuisine.localeCompare(b.cuisine)
  || (a.course ?? 'zz').localeCompare(b.course ?? 'zz')
  || a.name.localeCompare(b.name))

const noCourse = rows.filter(r => !r.course)

const body = rows.map(r =>
  `  { name: ${JSON.stringify(r.name)}, cuisine: '${r.cuisine}',`
  + ` course: ${r.course ? `'${r.course}'` : 'null'}, diet: '${r.diet}' },`
  + (r.course ? '' : '   // NO COURSE — decide before this ships')
).join('\n')

writeFileSync(OUT, `// DRAFTED by scripts/draft-menu-card-dishes.mjs.
//
// The dishes a set menu names that the catalogue did not have.
//
// catalogue_menu_lines.dish_id was NULL for all 304 lines, and it is the
// bridge menu-card matching needs: a caterer's listing holds dish ids
// from the picker, so a line can only ever be matched if its dish is IN
// the picker. 236 of the names on those cards were not.
//
// Re-drafting OVERWRITES this file, so a correction made here is lost on
// the next run. Once a row is right it belongs in the script — in its
// ALIAS or STAPLE list, or in its course rules.
//
// ${rows.length} dishes${noCourse.length ? `, ${noCourse.length} still without a course` : ''}

export const MENU_CARD_DISHES = [
${body}
]

/** Spellings a menu card uses for a dish the catalogue already has. */
export const MENU_CARD_ALIASES = ${JSON.stringify(ALIAS, null, 2)}

/** Lines nobody is matched on — every caterer has salt. */
export const MENU_CARD_STAPLES = ${JSON.stringify(STAPLE, null, 2)}
`, 'utf8')

console.log(`\n  ${OUT}`)
console.log(`  ${rows.length} new dishes · ${Object.keys(ALIAS).length} aliases · ${STAPLE.length} staples`)
console.log(`  ${noCourse.length} without a course\n`)
for (const r of noCourse) console.log(`   · ${r.name}`)
