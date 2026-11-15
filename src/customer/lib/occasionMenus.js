/**
 * Occasion menus — the menu cards a caterer would write for THIS day
 * (Mohan, 2026-11-13: "when it comes to a housewarming ceremony the menu
 * should be specific to a housewarming; a wedding reception, the
 * reception menu … for all the occasions … veg, non-veg, Jain, Satvik …
 * three to five menu cards, every dish swappable").
 *
 *   occasionMenus(cat, { occasion, ev, family, diet, meal, city })
 *     → up to five menus for one cuisine family, composed for the occasion
 *   editionsFor(cat, menu, ctx)       which of Veg · Non-veg · Jain · Satvik
 *                                     this menu can be served as
 *   compose(cat, menu, edition, ctx)  the same menu, re-set for an edition
 *
 * How a menu is composed. The occasion's profile (data/occasionProfile —
 * the template, never the words in the name) picks a RECIPE: the courses a
 * haldi brunch, a reception dinner, a naming-ceremony lunch, a memorial
 * meal or a kids' party actually run, how many dishes each course carries,
 * the dishes such a day is known for (kesari and puliyogare at a
 * housewarming, chaat and kulfi at a mehendi, payasa at a naming) and what
 * never belongs (a cocktail counter at a shraddha). Each of the family's
 * curated Sambramo menus (migration 200) is then re-set to that recipe:
 * its own dishes first, topped up from every dish the family cooks, so
 * every dish is a real catalogue dish partners already quote for. The
 * menu keeps the curated template as its base (templateId), so the
 * snapshot that travels to caterers marks what was added or swapped.
 *
 * Editions are honest: Jain and Satvik drop every dish the catalogue
 * flags as made with roots, onion or garlic, and the caterer still
 * confirms; a Non-veg edition exists only where the family really cooks
 * non-veg courses. Nothing here is served to a day it does not fit —
 * scripts/audit-occasion-menus.mjs proves it for all 438 occasions.
 */
import { profileFor, isCouple, isKids } from '../data/occasionProfile'
import { mealFor, rankMenus, startFrom } from './menuStudio'

export const EDITIONS = [
  { id: 'veg', label: 'Veg', line: 'Pure vegetarian' },
  { id: 'non_veg', label: 'Non-veg', line: 'With chicken, mutton or fish courses' },
  { id: 'jain', label: 'Jain', line: 'No onion, garlic or root vegetables' },
  { id: 'satvik', label: 'Satvik', line: 'No onion or garlic — pooja-friendly' },
]
const JAIN_WORDS = /onion|garlic|potato|aloo|carrot|beetroot|radish|mushroom|batata|urulai|gadde|eerulli|bellulli/i
const SATVIK_WORDS = /onion|garlic|mushroom|eerulli|bellulli|egg/i
const PROTEIN = new Set(['starters', 'mains', 'curries', 'rice', 'live', 'soups'])

/** Whether one dish can go on an edition of a menu. */
export function fitsEdition(d, edition) {
  if (!d) return false
  const txt = `${d.name} ${d.desc ?? ''}`
  switch (edition) {
    case 'veg': return d.diet === 'veg'
    case 'jain': return d.diet === 'veg' && !d.root && !JAIN_WORDS.test(txt)
    case 'satvik': return d.diet === 'veg' && !d.root && !SATVIK_WORDS.test(txt)
    default: return true
  }
}

/* ── Course plans: which sections, how many dishes each ───────────── */
const PLAN = {
  leafLunch: { welcome: 1, starters: 1, mains: 2, rice: 2, breads: 1, curries: 3, sides: 4, desserts: 2 },
  grandDinner: { welcome: 2, soups: 1, starters: 4, live: 2, mains: 2, rice: 2, breads: 2, curries: 3, sides: 3, salads: 1, desserts: 3, icecream: 1 },
  partyDinner: { welcome: 2, starters: 3, live: 1, mains: 2, rice: 1, breads: 1, curries: 2, sides: 2, desserts: 2, icecream: 1 },
  brunch: { welcome: 2, starters: 2, live: 2, mains: 2, rice: 1, curries: 1, sides: 2, desserts: 2, beverages: 1 },
  highTea: { welcome: 1, starters: 4, live: 1, desserts: 2, beverages: 2 },
  breakfast: { mains: 3, live: 1, curries: 1, sides: 2, desserts: 1, beverages: 2 },
  simpleLunch: { mains: 1, rice: 2, breads: 1, curries: 2, sides: 3, desserts: 1 },
  kidsParty: { welcome: 2, starters: 4, live: 1, mains: 2, rice: 1, desserts: 2, icecream: 1 },
  working: { starters: 1, mains: 1, rice: 1, breads: 1, curries: 2, sides: 1, salads: 1, desserts: 1 },
  plated: { welcome: 1, soups: 1, starters: 2, mains: 2, breads: 1, sides: 1, desserts: 2 },
  cocktail: { welcome: 2, starters: 6, live: 2, desserts: 2 },
  stalls: { welcome: 1, starters: 4, live: 3, mains: 1, desserts: 2, icecream: 1, beverages: 1 },
}
const word = (lunch, dinner, morning = null, tea = null) => ({ breakfast: morning ?? lunch, lunch, hightea: tea ?? lunch, dinner })
const S = (plan, words, line, x = {}) => ({ plan: PLAN[plan], planKey: plan, words, line, boost: /$^/, avoid: /$^/, tags: [], avoidTags: [], editions: ['veg', 'non_veg', 'jain', 'satvik'], ...x })
const NO_NV = ['veg', 'jain', 'satvik']

/* The recipes — one per kind of day. `line(a, b, c)` reads three signature dishes. */
const RECIPE = {
  haldi: S('brunch', word('Haldi Lunch', 'Haldi Dinner', 'Haldi Breakfast', 'Haldi Spread'), (a, b, c) => `Light and bright for the turmeric morning — ${a}, ${b} and ${c}, easy to eat standing`,
    { boost: /kesari|laddoo|ladoo|chaat|panaka|buttermilk|majjige|jalebi|lassi|lime|mango/i, tags: ['light', 'festive', 'family', 'street'], avoidTags: ['corporate', 'cocktail'], editions: NO_NV }),
  mehendi: S('highTea', word('Mehendi Lunch', 'Mehendi Dinner', 'Mehendi Brunch', 'Mehendi Spread'), (a, b, c) => `Chaat, bites and something sweet while the mehendi dries — ${a}, ${b}, ${c}`,
    { boost: /chaat|pani puri|dahi|kulfi|jalebi|mocktail|tikki|samosa|lassi|falooda|gol/i, tags: ['street', 'party', 'festive', 'hightea'], avoidTags: ['corporate'] }),
  sangeet: S('partyDinner', word('Sangeet Lunch', 'Sangeet Dinner', 'Sangeet Brunch', 'Sangeet High Tea'), (a, b, c) => `Starters that keep coming through the dancing — ${a}, ${b}, then ${c}`,
    { boost: /tikka|kebab|paneer|biryani|kulfi|gulab|chaat|live/i, tags: ['party', 'celebration', 'grand', 'cocktail'], avoidTags: ['ritual', 'breakfast'] }),
  cocktail: S('cocktail', word('Cocktail Bites', 'Cocktail Night', 'Cocktail Brunch', 'Cocktail Evening'), (a, b, c) => `Passed bites and live counters for a standing crowd — ${a}, ${b}, ${c}`,
    { boost: /tikka|kebab|skewer|slider|crostini|canap|prawn|fish|chicken|mocktail/i, tags: ['cocktail', 'party', 'modern'], avoidTags: ['ritual', 'traditional', 'breakfast'] }),
  wedding: S('leafLunch', word('Wedding Feast', 'Wedding Dinner', 'Wedding Breakfast'), (a, b, c) => `The full kalyana oota — ${a}, ${b} and ${c}, served course by course`,
    { boost: /holige|obbattu|payasa|payasam|laddoo|ladoo|jalebi|mysore pak|poli|kheer|halwa|appam/i, tags: ['wedding', 'grand', 'traditional', 'ritual'], avoidTags: ['corporate', 'kids'] }),
  reception: S('grandDinner', word('Reception Lunch', 'Reception Dinner', 'Reception Brunch'), (a, b, c) => `A grand evening spread — ${a} to start, ${b} on the main table, ${c} to finish`,
    { boost: /tikka|kebab|biryani|paneer|dum|live|kulfi|gulab|rasmalai|pasta|noodle/i, tags: ['grand', 'wedding', 'celebration'], avoidTags: ['breakfast', 'light', 'kids'] }),
  engagement: S('partyDinner', word('Engagement Lunch', 'Engagement Dinner', 'Engagement Breakfast', 'Engagement High Tea'), (a, b, c) => `A family celebration with a sweet start — ${a}, ${b} and ${c}`,
    { boost: /laddoo|ladoo|kesari|payasa|paneer|jalebi|kulfi|gulab/i, tags: ['celebration', 'family', 'festive'], avoidTags: ['corporate', 'kids', 'street'] }),
  shower: S('highTea', word('Bridal Shower Lunch', 'Bridal Shower Dinner', 'Bridal Shower Brunch', 'Bridal Shower High Tea'), (a, b, c) => `Pretty, light and sweet — ${a}, ${b}, ${c}`,
    { boost: /cupcake|pastry|mocktail|sandwich|salad|tart|cheesecake|brownie|quiche/i, tags: ['hightea', 'modern', 'light', 'party'], avoidTags: ['ritual', 'spicy'] }),
  griha: S('leafLunch', word('Griha Pravesh Oota', 'Griha Pravesh Dinner', 'Griha Pravesh Breakfast'), (a, b, c) => `Satvik and auspicious for the first meal in the new home — ${a}, ${b}, ${c}`,
    { boost: /kesari|puliyogare|chitranna|obbattu|holige|payasa|panaka|pongal|kheer|halwa|poori/i, tags: ['ritual', 'traditional', 'family'], avoidTags: ['cocktail', 'party', 'corporate'], editions: ['satvik', 'veg', 'jain'] }),
  home: S('leafLunch', word('Housewarming Oota', 'Housewarming Dinner', 'Housewarming Breakfast'), (a, b, c) => `The pooja-morning meal a housewarming is known for — ${a}, ${b} and ${c}`,
    { boost: /kesari|puliyogare|chitranna|obbattu|holige|payasa|panaka|pongal|kheer|halwa|poori|upma|vada|idli/i, tags: ['ritual', 'traditional', 'family', 'breakfast'], avoidTags: ['cocktail', 'party', 'corporate'], editions: ['satvik', 'veg', 'jain'] }),
  faith: S('leafLunch', word('Festive Feast', 'Festive Dinner', 'Prasada Breakfast'), (a, b, c) => `A festive, pooja-friendly meal — ${a}, ${b} and ${c}`,
    { boost: /holige|obbattu|payasa|payasam|laddoo|ladoo|pongal|kesari|kheer|halwa|puliyogare|chitranna|sadya/i, tags: ['ritual', 'traditional', 'festive'], avoidTags: ['cocktail', 'corporate'], editions: ['veg', 'satvik', 'jain'] }),
  eid: S('partyDinner', word('Eid Dawat', 'Eid Dinner', 'Eid Breakfast'), (a, b, c) => `The dawat table — ${a}, ${b} and ${c} to end it sweet`,
    { boost: /biryani|haleem|kebab|korma|sheer|phirni|kheer|seviyan|nihari|mutton|chicken|khurma/i, tags: ['festive', 'grand', 'family'], avoidTags: ['ritual'] }),
  christmas: S('partyDinner', word('Christmas Lunch', 'Christmas Dinner', 'Christmas Breakfast', 'Christmas High Tea'), (a, b, c) => `A Christmas table — ${a}, ${b} and ${c}`,
    { boost: /roast|cake|plum|pudding|stew|appam|pie|wine|cookie|chicken|turkey/i, tags: ['festive', 'celebration', 'modern'], avoidTags: ['ritual'] }),
  festival: S('partyDinner', word('Festival Lunch', 'Festival Dinner', 'Festival Breakfast', 'Festival Snacks'), (a, b, c) => `Festive favourites to share — ${a}, ${b} and ${c}`,
    { boost: /thandai|gujiya|jalebi|chaat|puran|laddoo|ladoo|kheer|halwa|sweet/i, tags: ['festive', 'celebration', 'street'], avoidTags: ['corporate'] }),
  babyShower: S('leafLunch', word('Seemantha Lunch', 'Baby Shower Dinner', 'Baby Shower Breakfast', 'Baby Shower High Tea'), (a, b, c) => `Mild, traditional and sweet for the mother-to-be — ${a}, ${b}, ${c}`,
    { boost: /payasa|payasam|kheer|laddoo|ladoo|holige|obbattu|kesari|halwa|kosambari|sweet/i, tags: ['traditional', 'ritual', 'family'], avoidTags: ['spicy', 'cocktail', 'corporate'] }),
  babyRite: S('leafLunch', word('Naming Ceremony Lunch', 'Naming Ceremony Dinner', 'Naming Ceremony Breakfast'), (a, b, c) => `A family lunch for the little one’s big day — ${a}, ${b} and ${c}`,
    { boost: /payasa|payasam|kheer|laddoo|ladoo|holige|obbattu|kesari|halwa|sweet/i, tags: ['traditional', 'ritual', 'family'], avoidTags: ['spicy', 'cocktail', 'corporate'] }),
  kids: S('kidsParty', word('Kids’ Party Lunch', 'Kids’ Party Menu', 'Kids’ Party Breakfast', 'Kids’ Party Snacks'), (a, b, c) => `What children actually eat — ${a}, ${b} and ${c}, nothing too spicy`,
    { boost: /pasta|pizza|fries|noodle|manchurian|mini idli|cupcake|brownie|ice cream|nugget|sandwich|corn|momo|burger|wrap|chocolate/i, avoid: /chilli|chettinad|mirchi|pepper fry|spicy|ghee roast/i, tags: ['kids', 'party', 'street'], avoidTags: ['ritual', 'spicy', 'cocktail', 'corporate'] }),
  birthday: S('partyDinner', word('Birthday Lunch', 'Birthday Dinner', 'Birthday Brunch', 'Birthday High Tea'), (a, b, c) => `A party spread — ${a}, ${b} and ${c}`,
    { boost: /tikka|paneer|biryani|pasta|noodle|kulfi|gulab|brownie|chaat|manchurian/i, tags: ['party', 'celebration', 'family'], avoidTags: ['ritual', 'corporate'] }),
  milestone: S('leafLunch', word('Milestone Lunch', 'Milestone Dinner', 'Milestone Breakfast'), (a, b, c) => `A traditional family feast — ${a}, ${b} and ${c}`,
    { boost: /holige|obbattu|payasa|payasam|laddoo|ladoo|kheer|halwa|kosambari/i, tags: ['traditional', 'family', 'celebration'], avoidTags: ['cocktail', 'corporate', 'kids'] }),
  anniversary: S('partyDinner', word('Anniversary Lunch', 'Anniversary Dinner', 'Anniversary Brunch', 'Anniversary High Tea'), (a, b, c) => `A celebration for the two of you and everyone who loves you — ${a}, ${b}, ${c}`,
    { boost: /paneer|tikka|biryani|kulfi|gulab|rasmalai|cake|mousse|pasta/i, tags: ['celebration', 'family', 'grand'], avoidTags: ['kids', 'corporate', 'ritual'] }),
  couple: S('plated', word('Lunch for Two', 'Dinner for Two', 'Breakfast for Two', 'High Tea for Two'), (a, b, c) => `Three courses at one table — ${a}, ${b}, ${c}`,
    { boost: /soup|salad|pasta|risotto|grill|mousse|cheesecake|tiramisu|brownie|chocolate|prawn|paneer/i, tags: ['modern', 'light', 'celebration'], avoidTags: ['kids', 'corporate', 'ritual', 'stall'] }),
  dining: S('plated', word('Lunch Party', 'Dinner Party', 'Brunch', 'High Tea'), (a, b, c) => `Served to the table — ${a}, ${b}, ${c}`,
    { boost: /soup|salad|grill|roast|risotto|pasta|mousse|tart|kebab|biryani/i, tags: ['modern', 'celebration', 'family'], avoidTags: ['kids', 'stall'] }),
  gathering: S('partyDinner', word('Get-together Lunch', 'Get-together Dinner', 'Get-together Breakfast', 'Get-together High Tea'), (a, b, c) => `Easy food for a room full of your people — ${a}, ${b} and ${c}`,
    { boost: /biryani|paneer|tikka|pulao|kulfi|gulab|chaat|payasa/i, tags: ['family', 'celebration', 'party'], avoidTags: ['corporate', 'ritual'] }),
  nightlife: S('cocktail', word('Party Bites', 'Party Night', 'After-party Breakfast', 'Party Evening'), (a, b, c) => `Finger food that works with a drink in hand — ${a}, ${b}, ${c}`,
    { boost: /tikka|kebab|wings|fries|nacho|slider|skewer|prawn|chicken|pizza|momo/i, tags: ['cocktail', 'party', 'modern', 'street'], avoidTags: ['ritual', 'traditional', 'breakfast', 'kids'] }),
  memorial: S('simpleLunch', word('Memorial Lunch', 'Memorial Dinner', 'Memorial Breakfast'), (a, b, c) => `A simple, satvik meal served quietly — ${a}, ${b} and ${c}`,
    { boost: /payasa|payasam|kheer|rice|dal|sambar|rasam|curd|kosambari|palya|poriyal/i, avoid: /ice cream|mocktail|cocktail|manchurian|pizza|burger/i, tags: ['traditional', 'ritual', 'light'], avoidTags: ['party', 'cocktail', 'celebration', 'grand', 'kids', 'street', 'stall'], editions: ['satvik', 'veg', 'jain'] }),
  corporate: S('working', word('Working Lunch', 'Corporate Dinner', 'Office Breakfast', 'Office High Tea'), (a, b, c) => `Served fast, eaten at a table or a desk — ${a}, ${b}, ${c}`,
    { boost: /salad|wrap|sandwich|pulao|paneer|dal|roti|brownie|cookie|pasta/i, tags: ['corporate', 'light', 'modern'], avoidTags: ['ritual', 'kids', 'cocktail'] }),
  gala: S('grandDinner', word('Gala Lunch', 'Gala Dinner', 'Gala Brunch', 'Gala High Tea'), (a, b, c) => `A formal evening spread — ${a}, ${b}, ${c}`,
    { boost: /tikka|kebab|biryani|grill|paneer|live|mousse|cheesecake|kulfi|soup/i, tags: ['grand', 'corporate', 'modern', 'celebration'], avoidTags: ['ritual', 'kids', 'street'] }),
  school: S('highTea', word('School Lunch', 'School Evening Snacks', 'School Breakfast', 'School Snacks'), (a, b, c) => `Easy, mild and quick to serve to children and parents — ${a}, ${b}, ${c}`,
    { boost: /sandwich|samosa|cutlet|pasta|noodle|cupcake|juice|idli|vada|puff|cake/i, avoid: /chilli|chettinad|mirchi|spicy|ghee roast/i, tags: ['kids', 'light', 'street'], avoidTags: ['cocktail', 'ritual', 'grand'] }),
  campus: S('stalls', word('Fest Lunch', 'Fest Night Stalls', 'Fest Breakfast', 'Fest Stalls'), (a, b, c) => `Stall food a crowd queues for — ${a}, ${b}, ${c}`,
    { boost: /chaat|momo|noodle|roll|fries|pizza|biryani|dosa|wrap|burger|shawarma|ice/i, tags: ['street', 'stall', 'party', 'kids'], avoidTags: ['ritual', 'grand', 'corporate'] }),
  show: S('stalls', word('Show Snacks', 'Show Night Stalls', 'Show Breakfast', 'Show Stalls'), (a, b, c) => `Stall food for an audience on its feet — ${a}, ${b}, ${c}`,
    { boost: /chaat|momo|noodle|roll|fries|pizza|popcorn|sandwich|wrap|burger|shawarma|ice|juice|mocktail/i, tags: ['street', 'stall', 'party'], avoidTags: ['ritual', 'grand', 'corporate'] }),
  publicCrowd: S('simpleLunch', word('Crowd Lunch', 'Crowd Dinner', 'Crowd Breakfast', 'Crowd Snacks'), (a, b, c) => `Simple, fast and in quantity — ${a}, ${b}, ${c}`,
    { boost: /pulao|rice|dal|sambar|chapati|roti|curd|laddoo|ladoo|idli|vada|biryani/i, tags: ['family', 'traditional', 'light'], avoidTags: ['cocktail', 'grand'] }),
  outdoor: S('partyDinner', word('Outdoor Lunch', 'Outdoor Grill Night', 'Camp Breakfast', 'Picnic Hamper'), (a, b, c) => `Food that travels and grills well — ${a}, ${b}, ${c}`,
    { boost: /grill|tikka|kebab|barbecue|bbq|corn|sandwich|wrap|skewer|roast/i, tags: ['party', 'street', 'modern'], avoidTags: ['ritual', 'corporate'] }),
  retail: S('highTea', word('Launch Lunch', 'Launch Evening', 'Launch Breakfast', 'Launch High Tea'), (a, b, c) => `Light bites for guests who are walking around — ${a}, ${b}, ${c}`,
    { boost: /canap|sandwich|cookie|cupcake|mocktail|juice|puff|tart|slider/i, tags: ['corporate', 'cocktail', 'light', 'modern'], avoidTags: ['ritual', 'kids'] }),
  food: S('plated', word('Tasting Lunch', 'Tasting Dinner', 'Tasting Breakfast', 'Tasting Afternoon'), (a, b, c) => `Course after course — ${a}, ${b}, ${c}`,
    { boost: /soup|grill|roast|risotto|mousse|tart|kebab|biryani|curry/i, tags: ['modern', 'grand', 'celebration'], avoidTags: ['kids'] }),
}

/** The recipe for an occasion — by its profile, never by its name's words. */
export function recipeFor(o, ev = {}) {
  const p = profileFor(o)
  const w = `${o?.id ?? ''} ${o?.name ?? ''}`.toLowerCase()
  if (p.family === 'wedding') return RECIPE[{ roka: 'engagement', baraat: 'wedding', jaimala: 'wedding' }[p.fn] ?? (RECIPE[p.fn] ? p.fn : 'wedding')]
  if (p.family === 'memorial') return RECIPE.memorial
  if (p.family === 'home') return RECIPE.home
  if (p.family === 'baby') return /shower|seemanth|valaikappu|godh|gender/.test(w) ? RECIPE.babyShower : RECIPE.babyRite
  if (p.family === 'faith') return /eid|iftar|ramadan/.test(w) ? RECIPE.eid : RECIPE.faith
  if (p.family === 'festival') return /christmas/.test(w) ? RECIPE.christmas : RECIPE.festival
  if (p.family === 'birthday') return isKids(o) ? RECIPE.kids : p.milestone ? RECIPE.milestone : RECIPE.birthday
  if (p.family === 'anniversary') return isCouple(o, ev) ? RECIPE.couple : RECIPE.anniversary
  if (p.family === 'romance') return RECIPE.couple
  if (p.family === 'dining') return RECIPE.dining
  if (p.family === 'food') return RECIPE.food
  if (p.family === 'nightlife') return RECIPE.nightlife
  if (p.family === 'gala') return RECIPE.gala
  if (['corporate', 'online', 'property'].includes(p.family)) return RECIPE.corporate
  if (p.family === 'retail') return RECIPE.retail
  if (p.family === 'school') return RECIPE.school
  if (p.family === 'campus') return RECIPE.campus
  if (p.family === 'public' && /concert|liveMusic|stageShow|smallStage|screening|immersive|publicFestival|market|dance|celebrity|culturalFest|exhibition/.test(o.template ?? '')) return RECIPE.show
  if (['public', 'community', 'sport'].includes(p.family)) return RECIPE.publicCrowd
  if (p.family === 'outdoor') return RECIPE.outdoor
  if (p.family === 'gathering' && p.milestone) return RECIPE.milestone
  return RECIPE.gathering
}

/* ── The family's larder: every dish it cooks, by course ──────────── */
const NEAR = { karnataka: ['tamil', 'andhra', 'kerala'], tamil: ['karnataka', 'kerala'], andhra: ['telangana', 'karnataka'], telangana: ['andhra'], kerala: ['tamil', 'karnataka'],
  north_indian: ['rajasthani', 'kashmiri'], gujarati: ['rajasthani', 'maharashtrian'], rajasthani: ['gujarati', 'north_indian'], maharashtrian: ['gujarati'], bengali: ['odia'], odia: ['bengali'],
  kashmiri: ['north_indian'], northeast: ['bengali'], continental: ['italian', 'mediterranean'], italian: ['continental'], mediterranean: ['arabic', 'continental'], arabic: ['mediterranean'],
  mexican: ['global_party'], asian: ['chinese'], chinese: ['asian'], global_party: ['indian_fusion', 'continental'], indian_fusion: ['global_party', 'north_indian'] }
const pools = new WeakMap()
function larder(cat, family) {
  let all = pools.get(cat)
  if (!all) { all = {}; pools.set(cat, all) }
  if (all[family]) return all[family]
  const own = {}, near = {}
  for (const m of cat.menus) {
    const bag = m.family === family ? own : (NEAR[family] ?? []).includes(m.family) ? near : null
    if (!bag) continue
    for (const s of m.sections) { bag[s.id] ??= []; for (const id of s.dishes) if (cat.dishes[id] && !bag[s.id].includes(id)) bag[s.id].push(id) }
  }
  return (all[family] = { own, near })
}

/* ── Composing one menu ───────────────────────────────────────────── */
function compose0(cat, base, recipe, edition, family, taken = new Map()) {
  const { own, near } = larder(cat, family)
  const inBase = new Set(base.sections.flatMap(s => s.dishes))
  const ok = id => { const d = cat.dishes[id]; return d && fitsEdition(d, edition) && !recipe.avoid.test(`${d.name} ${d.desc ?? ''}`) }
  const score = (id, sec) => {
    const d = cat.dishes[id]
    let s = 0
    if (inBase.has(id)) s += 4
    if (recipe.boost.test(`${d.name} ${d.desc ?? ''}`)) s += 3
    if ((d.cuisines ?? []).includes(base.cuisine)) s += 1
    if (edition === 'non_veg' && PROTEIN.has(sec) && d.diet !== 'veg') s += 2
    /* Five menus for one day should read differently: a dish already on an earlier card steps back. */
    s -= 2 * (taken.get(id) ?? 0)
    return s
  }
  const used = new Set()
  const out = []
  /* A family that has no welcome drinks or live counter still serves a
     meal: a plan that lands under three courses is topped up with these. */
  const plan = { ...recipe.plan }
  const has = sec => [...(base.sections.find(s => s.id === sec)?.dishes ?? []), ...(own[sec] ?? []), ...(near[sec] ?? [])].some(ok)
  const courses = () => Object.keys(plan).filter(has).length
  for (const [sec, n] of [['mains', 2], ['salads', 1], ['soups', 1], ['sides', 1], ['rice', 1], ['breads', 1], ['beverages', 1]]) if (courses() < 3 && !plan[sec] && has(sec)) plan[sec] = n
  for (const sec of cat.sections.map(s => s.id)) {
    const n = plan[sec]
    if (!n) continue
    const ids = [...(base.sections.find(s => s.id === sec)?.dishes ?? []), ...(own[sec] ?? []), ...(near[sec] ?? [])]
      .filter((id, i, a) => a.indexOf(id) === i && !used.has(id) && ok(id))
      .map((id, i) => ({ id, s: score(id, sec), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.id)
    /* A non-veg card is non-veg where it counts: at least half of every
       protein course, where the family cooks it (Mohan, 2026-11-13). */
    if (edition === 'non_veg' && PROTEIN.has(sec)) {
      const nv = ids.filter(id => cat.dishes[id].diet !== 'veg')
      const want = Math.min(nv.length, Math.max(1, Math.ceil(n / 2)))
      const head = nv.slice(0, want)
      ids.splice(0, ids.length, ...head, ...ids.filter(id => !head.includes(id)))
    }
    const picked = ids.slice(0, n)
    picked.forEach(id => used.add(id))
    if (picked.length) out.push({ id: sec, dishes: picked })
  }
  return out
}
const count = sections => sections.reduce((n, s) => n + s.dishes.length, 0)
const overlap = (a, b) => { const A = new Set(a.flatMap(s => s.dishes)), B = new Set(b.flatMap(s => s.dishes)); let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)) }

const GENERIC = /\b(menu|feast|buffet|celebration|traditional|vegetarian|veg|non-?veg|grand|special|spread|dinner|lunch|breakfast|party|family|mixed|night|thali|dawat|meals?)\b/gi
const OCCASIONISH = /\b(wedding|kids?|cocktail|office|college|fest|food|corporate|working|favourites|bites|stalls?|high tea|sit-?down|tea|party|birthday|festival|celebration|dawat|dinner|lunch|breakfast|brunch|night|feast|buffet|thali|menu|spread|meals?|bhoga|bari|biye)\b/gi
const cap = s => s.replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, ' ').trim()
/** "Mysore", "Udupi", "Traditional Karnataka", "Hyderabadi" — the words a menu can be known by, best first. */
function adjective(base, fam) {
  const famRe = new RegExp(`\\b${fam.name}\\b`, 'gi')
  const clean = s => cap(String(s ?? '').replace(/\(.*?\)/g, '').replace(GENERIC, '').replace(OCCASIONISH, '').replace(/non-?vegetarian|vegetarian|biryani/gi, ''))
  const fromName = clean(base.name.replace(famRe, ''))
  const v = fam.variants?.find(([id]) => id === base.cuisine)?.[1] ?? ''
  const variant = clean(/traditional$/i.test(v) ? `Traditional ${v.replace(/\s*traditional$/i, '')}` : v)
  const both = variant && fromName && variant !== fromName ? `${variant} ${fromName}` : ''
  return [...new Set([variant, fromName, both, fam.name, fromName && `${fam.name} ${fromName}`].filter(Boolean))]
}

/** The signature dishes a line reads — a starter or live dish, a main, a sweet. */
function signature(cat, sections) {
  const first = ids => ids.map(id => cat.dishes[id]?.name).find(Boolean)
  const of = sec => first(sections.find(s => s.id === sec)?.dishes ?? [])
  const a = of('live') ?? of('starters') ?? of('mains') ?? of('welcome')
  const b = [of('mains'), of('rice'), of('curries'), of('breads')].find(x => x && x !== a)
  const c = of('desserts') ?? of('icecream') ?? of('sides')
  return [a, b, c].filter(Boolean).concat(sections.flatMap(s => s.dishes).map(id => cat.dishes[id]?.name)).filter((x, i, arr) => x && arr.indexOf(x) === i).slice(0, 3)
}

/** The edition the customer's diet asks for first. */
export const editionFor = (diet, recipe) => (recipe.editions[0] === 'satvik' && ['veg', 'jain', 'vegan'].includes(diet) ? 'satvik' : diet === 'jain' ? 'jain' : diet === 'non_veg' || diet === 'mixed' ? (recipe.editions.includes('non_veg') ? 'non_veg' : 'veg') : 'veg')

/**
 * The occasion's menus for one cuisine family — three to five, each a real
 * Sambramo template re-set for this day, in the edition the diet asks for.
 */
const MEMO = new WeakMap()
export function occasionMenus(cat, args) {
  const { occasion, ev = {}, family, diet = 'veg', meal = null, city = null } = args
  if (!cat || !family || !occasion) return []
  let m = MEMO.get(cat)
  if (!m) { m = new Map(); MEMO.set(cat, m) }
  const key = [occasion.id, family, diet, meal ?? mealFor(ev.time), city ?? '', ev.company ?? ''].join('|')
  if (!m.has(key)) m.set(key, compose1(cat, args))
  return m.get(key)
}
function compose1(cat, { occasion, ev = {}, family, diet = 'veg', meal = null, city = null }) {
  const recipe = recipeFor(occasion, ev)
  const fam = cat.families.find(f => f.id === family)
  if (!fam) return []
  const m = meal ?? mealFor(ev.time)
  const edition = editionFor(diet, recipe)
  /* The family's templates, this occasion's first — the diet filter is the edition's, applied dish by dish. */
  const bases = rankMenus(cat, { occasion, diet: 'mixed', meal: m, family, city })
    /* A non-veg card comes only from a menu that really cooks non-veg; an
       Udupi or satvik menu stays veg (Mohan saw "Chicken Ghee Roast" on an
       Udupi naming lunch). Non-veg menus lead for a non-veg diet. */
    .sort((a, b) => (edition === 'non_veg' ? (a.diet === 'veg') - (b.diet === 'veg') : 0))
    .map(b => ({ b, s: (b.fit ?? 0) + recipe.tags.filter(t => b.tags.includes(t)).length * 3 - recipe.avoidTags.filter(t => b.tags.includes(t)).length * 4 }))
    .sort((a, b) => b.s - a.s).map(x => x.b)
  const out = []
  const names = new Set()
  const taken = new Map()
  /* The diet decides what is on the shelf (Mohan, 2026-11-14): veg never
     sees a non-veg card; non-veg sees only cards from menus that really
     cook non-veg; "both" sees each menu as it is cooked, and switches any
     card's edition on the card itself. */
  const both = diet === 'mixed' && recipe.editions.includes('non_veg')
  for (const base of bases) {
    if (out.length >= 5) break
    if (edition === 'non_veg' && !both && base.diet === 'veg') continue
    const ed = both ? (base.diet === 'veg' ? 'veg' : 'non_veg') : edition
    const sections = compose0(cat, base, recipe, ed, family, taken)
    if (count(sections) < 6) continue
    if (out.some(x => overlap(x.sections, sections) >= 0.8)) continue
    for (const id of sections.flatMap(s => s.dishes)) taken.set(id, (taken.get(id) ?? 0) + 1)
    const wordNow = recipe.words[m] ?? recipe.words.lunch
    const name = adjective(base, fam).map(a => `${a} ${wordNow}`).find(n => !names.has(n)) ?? `${fam.name} ${wordNow} ${out.length + 1}`
    names.add(name)
    const sig = signature(cat, sections)
    out.push({
      id: `occ:${occasion.id}:${base.id}:${ed}`, templateId: base.id, base, family, cuisine: base.cuisine, edition: ed, recipe: recipe.words[m] ?? recipe.words.lunch,
      name, line: recipe.line(sig[0] ?? 'the classics', sig[1] ?? 'rice and curries', sig[2] ?? 'something sweet'),
      diet: sections.some(s => s.dishes.some(id => cat.dishes[id]?.diet !== 'veg')) ? 'mixed' : 'veg', meals: base.meals, serve: base.serve, tags: base.tags, sections, photo: base.photo ?? null,
      highlights: sig,
    })
  }
  return out
}

/** Which editions this occasion menu can be served as (each must still make a meal), within the customer's diet. */
const DIET_EDITIONS = { veg: ['veg', 'jain', 'satvik'], vegan: ['veg', 'jain', 'satvik'], jain: ['jain'], non_veg: ['non_veg'], mixed: ['veg', 'non_veg', 'jain', 'satvik'] }
export function editionsFor(cat, menu, recipe, diet = 'mixed') {
  const allowed = DIET_EDITIONS[diet] ?? DIET_EDITIONS.mixed
  return EDITIONS.filter(e => allowed.includes(e.id) && recipe.editions.includes(e.id) && !(e.id === 'non_veg' && menu.base.diet === 'veg') && count(compose0(cat, menu.base, recipe, e.id, menu.family)) >= 6)
}

/** The customer's editable copy of an occasion menu, in one edition. */
export function studioFor(cat, menu, edition, { occasion, ev = {} } = {}) {
  const recipe = recipeFor(occasion, ev)
  const sections = edition === menu.edition ? menu.sections : compose0(cat, menu.base, recipe, edition, menu.family)
  const st = startFrom(cat, menu.base)
  return { ...st, name: menu.name, menuDiet: sections.some(s => s.dishes.some(id => cat.dishes[id]?.diet !== 'veg')) ? 'mixed' : 'veg', edition, composed: menu.id, occasionId: occasion?.id ?? null, line: menu.line,
    sections: sections.map(s => ({ id: s.id, items: s.dishes.map(id => ({ id, name: cat.dishes[id]?.name ?? id, diet: cat.dishes[id]?.diet ?? 'veg' })) })) }
}

/** Families that have at least one menu for this occasion and diet, in the catalogue's order of fit. */
export function familiesWithMenus(cat, fams, ctx) {
  return fams.filter(f => occasionMenus(cat, { ...ctx, family: f.id }).length > 0)
}
