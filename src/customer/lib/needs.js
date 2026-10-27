/**
 * What the customer needs from each master — every question the partner
 * answered when they listed, asked back in the customer's words.
 *
 * The questions are GENERATED from the partner app's own definitions
 * (src/data/trades/<trade>.js): every choice question and every yes/no on
 * the partner's listing screens, with the partner's own options, so a
 * customer's "Candid" is exactly the `candid` a photographer ticked and
 * nothing is matched on free text. A short list per trade is skipped —
 * questions about the partner's own operation that a customer would never
 * choose by (where the food is cooked, who drives the truck).
 *
 * Specials the onboarding answers do not hold, read from the listing:
 *   $diet     a caterer's menus, in the partner app's five diets
 *   $cuisine  cuisines from answers + menus, as 10 regions
 *   $dishes   the dishes caterers really list (sambramo_catalogue_items)
 *   $years    "at least N years", against the partner's years
 *   capacity  the event's guests against the master's own maximum
 *
 * A master who never answered a question is not claimed to meet it.
 */
import { configFor, questionsOf } from '../../data/trades/index'

/* Never asked: the partner's operation, or something the occasion already says. */
const SKIP = new Set([
  'events', 'event_types', 'occasions', 'sites', 'cities', 'service_area', 'prep_location', 'supply_scope', 'supply_scope_custom',
  'child_policy', 'fuel_policy', 'delivered_by', 'driver_type', 'operation', 'cone', 'travel', 'permit_scope', 'notice', 'min_period',
  'max_period', 'setup_charging', 'flower_sourcing', 'access_needs', 'brands', 'sound_covers', 'shifts', 'safety_equipment', 'tools',
  'skills', 'handover', 'fulfilment', 'routes', 'handling', 'subtype', 'needs_water_power', 'own_cold_storage', 'backup_power',
  'custom_design_fee', 'own_transport', 'own_storage', 'gst_invoice', 'returns_unused', 'bulk', 'grooming', 'transport', 'travel_applies',
  'refrigeration', 'proof_required', 'materials',
])

/* Customer wording, where the partner's would read oddly to a customer. */
const TITLE = {
  'photography.specialties': 'What should they shoot?', 'photography.styles': 'Which photo style do you love?',
  'photography.equipment': 'Gear that matters to you', 'photography.formats': 'How do you want the photos?',
  'photography.same_day_edit': 'Same-day slideshow at the reception', 'photography.outstation': 'Will travel for a destination shoot',
  'videography.specialties': 'What kind of film?', 'videography.deliverables': 'What should the film include?', 'videography.equipment': 'Gear that matters to you',
  'catering_food.services': 'What kind of catering?', 'catering_food.service_styles': 'How should it be served?',
  'decoration_floral.services': 'What should be decorated?', 'decoration_floral.themes': 'Which look do you love?', 'decoration_floral.flowers': 'Fresh or artificial flowers?',
  'decoration_floral.flower_types': 'Favourite flowers', 'decoration_floral.props': 'What should the décor include?', 'decoration_floral.venues': 'Where is it?',
  'bridal_makeup_hair.services_offered': 'Which looks do you need?', 'bridal_makeup_hair.styles': 'Which makeup style?', 'bridal_makeup_hair.who': 'Who needs a look?',
  'mehendi_artist.who': 'Mehendi for whom?', 'mehendi_artist.styles': 'Which design style?', 'mehendi_artist.coverage': 'How much coverage?',
  'dj_music.performance_kinds': 'What kind of music act?', 'dj_music.styles': 'Music that gets your crowd dancing', 'dj_music.own_equipment': 'Should they bring the sound & lights?',
  'dj_music.settings': 'Where will they play?', 'dj_music.formats': 'Performance format', 'dj_music.duration_options': 'How long should they play?',
  'venue.venue_type': 'What kind of venue?', 'venue.facilities': 'Must-have facilities', 'venue.catering_rule': 'Bringing your own caterer?', 'venue.decor_rule': 'Bringing your own decorator?',
  'cake_desserts.product_types': 'What are you ordering?', 'cake_desserts.flavours': 'Favourite flavour?', 'cake_desserts.sizes': 'What size?', 'cake_desserts.dietary': 'Any dietary needs?',
  'priest_rituals.ceremonies': 'Which ceremony?', 'priest_rituals.traditions': 'Which tradition does your family follow?', 'priest_rituals.languages': 'Mantras and guidance in which language?',
  'live_entertainment.act_types': 'What would you love on stage?', 'wedding_planning.services': 'How much planning do you need?', 'wedding_planning.budget_band': 'Your wedding budget',
}

const customerise = s => String(s).trim()
  .replace(/^Do you provide /i, 'Should they provide ').replace(/^Do you offer /i, 'Should they offer ').replace(/^Do you /i, 'Should they ')
  .replace(/^Can you /i, 'Can they ').replace(/^You /, 'They ').replace(/^Are /i, 'Are ').replace(/^Is /i, 'Is ')
  .replace(/do you provide\?$/i, 'do you need?').replace(/do you offer\?$/i, 'would you like?').replace(/\bdo you\b/gi, 'do they')
  .replace(/\byour\b/gi, 'their').replace(/\byou\b/gi, 'they')

const YEARS = [{ id: '3', label: '3+ years' }, { id: '5', label: '5+ years' }, { id: '10', label: '10+ years' }]
/* The caterer's own menu diets — the same list the partner app offers
   (MENU_DIETS in components/vendor/listing/catering/options.js; copied, not
   imported, because that module pulls the whole food-catalogue seed in). */
const DIETS = [['veg', 'Pure vegetarian'], ['non_veg', 'Non-vegetarian'], ['mixed', 'Veg + non-veg'], ['vegan', 'Vegan'], ['jain', 'Jain']].map(([id, label]) => ({ id, label }))
export const CAPACITY = { venue: 'max_capacity', catering_food: 'max_guests' }

let CUISINES = null
/** Cuisine regions (Karnataka, North India…) for the catering question. */
export async function loadCuisines(supabase) {
  if (CUISINES) return CUISINES
  const { data } = await supabase.from('sambramo_cuisines').select('id, group_id, group_name').eq('active', true)
  const groups = []
  for (const r of data ?? []) {
    let g = groups.find(x => x.id === r.group_id)
    if (!g) groups.push(g = { id: r.group_id, label: r.group_name, members: [] })
    g.members.push(r.id)
  }
  CUISINES = groups
  return groups
}

let DISHES = null
/** Every dish a live caterer lists, by course: [{ id, label, course }]. */
export async function loadDishes(supabase) {
  if (DISHES) return DISHES
  const { data: v } = await supabase.from('sambramo_listing_versions').select('id').eq('status', 'LIVE').eq('trade', 'Catering & Food')
  const ids = (v ?? []).map(x => x.id)
  if (!ids.length) return (DISHES = [])
  const [items, courses] = await Promise.all([
    supabase.from('sambramo_catalogue_items').select('item_key, name').eq('active', true).like('item_key', 'd_%').in('listing_version_id', ids),
    supabase.from('sambramo_catering_menu_items').select('dish_key, course_group').in('listing_version_id', ids),
  ])
  const course = Object.fromEntries((courses.data ?? []).map(x => [x.dish_key, x.course_group]))
  const seen = new Map()
  for (const x of items.data ?? []) if (!seen.has(x.item_key)) seen.set(x.item_key, { id: x.item_key, label: x.name, course: course[x.item_key] ?? 'other' })
  DISHES = [...seen.values()].sort((a, b) => a.label.localeCompare(b.label))
  return DISHES
}
export const courseLabel = c => String(c ?? 'other').replace(/_/g, ' ').replace(/^\w/, x => x.toUpperCase())

const cache = {}
/**
 * The questions for one trade: [{ key, title, kind: single|multi|toggle,
 * options, group: 'choose'|'must' }]. Choices first, must-haves last.
 */
export function needsFor(tradeId) {
  if (cache[tradeId]) return cache[tradeId]
  const cfg = configFor(tradeId)
  const all = cfg ? questionsOf(cfg).filter(q => q.scope.startsWith('screen')) : []
  const out = []
  if (tradeId === 'catering_food') {
    out.push({ key: '$diet', title: 'What should the menu be?', kind: 'multi', options: DIETS, group: 'choose' })
    out.push({ key: '$cuisine', title: 'Which food style?', kind: 'multi', options: CUISINES ?? [], group: 'choose' })
    out.push({ key: '$dishes', title: 'Dishes you must have', kind: 'dishes', options: DISHES ?? [], group: 'choose' })
  }
  for (const q of all) {
    if (SKIP.has(q.id)) continue
    const title = TITLE[`${tradeId}.${q.id}`] ?? customerise(q.label)
    if ((q.type === 'multi' || q.type === 'single') && q.options?.length) out.push({ key: q.id, title, kind: q.type, options: q.options, group: 'choose' })
    else if (q.type === 'toggle') out.push({ key: q.id, title, kind: 'toggle', options: [], group: 'must' })
  }
  if (all.some(q => q.id === 'years')) out.push({ key: '$years', title: 'Experience', kind: 'single', options: YEARS, group: 'choose' })
  const ready = tradeId !== 'catering_food' || (CUISINES && DISHES)
  if (ready) cache[tradeId] = out
  return out
}

/** Keep only the onboarding answers a requirement can read. */
export function pickFacets(tradeId, answers) {
  if (!answers) return {}
  const keys = new Set([...needsFor(tradeId).map(q => q.key).filter(k => !k.startsWith('$')), CAPACITY[tradeId], 'years'].filter(Boolean))
  return Object.fromEntries(Object.entries(answers).filter(([k]) => keys.has(k)))
}

/* A typed answer ("Not listed? Type it") lives under `<key>__typed`: it is
   shown and sent to the master in the booking note, but never filters —
   free text cannot be matched honestly against a ticked option. */
export const TYPED = '__typed'

const asList = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map(x => String(x).toLowerCase())
export const answered = picks => Object.entries(picks ?? {}).filter(([, v]) => (Array.isArray(v) ? v.length : v === true || (typeof v === 'number' && v > 0))).length

/** Does one master meet the customer's picks? Unanswered questions count as unmet. */
export function matchNeeds(partner, tradeId, picks = {}, guests = null) {
  const f = partner.facets ?? {}
  const met = [], unmet = []
  for (const q of needsFor(tradeId)) {
    const want = picks[q.key]
    if (q.kind === 'toggle' ? want !== true : !want?.length) continue
    let ok
    if (q.kind === 'toggle') ok = f[q.key] === true
    else if (q.key === '$diet') {
      const d = f.diets ?? []
      ok = want.some(w => d.includes(w) || (w === 'non_veg' && d.includes('mixed')) || (w === 'mixed' && d.includes('non_veg')))
    }
    else if (q.key === '$cuisine') {
      const members = (CUISINES ?? []).filter(g => want.includes(g.id)).flatMap(g => g.members)
      ok = (f.cuisines ?? []).some(c => members.includes(c))
    } else if (q.key === '$dishes') ok = want.every(d => (f.dishes ?? []).includes(d))
    else if (q.key === '$years') ok = Number(f.years) >= Number(want[0])
    else {
      const have = asList(f[q.key])
      ok = want.some(w => have.includes(String(w).toLowerCase()))
    }
    ;(ok ? met : unmet).push(q.title)
  }
  const cap = CAPACITY[tradeId]
  if (cap && guests && f[cap] != null) (Number(f[cap]) >= guests ? met : unmet).push(`Hosts ${guests.toLocaleString('en-IN')} guests`)
  return { ok: unmet.length === 0, met, unmet }
}

/**
 * Masters that meet every pick. With picks and no exact match, the
 * closest ones (fewest unmet) come back with `exact: false`.
 */
export function filterByNeeds(list, tradeId, picks = {}, guests = null) {
  if (!list) return { list: null, exact: true, asked: false, total: 0 }
  /* "Any is fine" ($any) is an answer, not a filter. */
  const asked = answered(picks) - (picks?.$any ? 1 : 0) > 0 || (!!guests && !!CAPACITY[tradeId])
  if (!asked) return { list, exact: true, asked, total: list.length }
  const scored = list.map(p => ({ p, m: matchNeeds(p, tradeId, picks, guests) }))
  const exact = scored.filter(x => x.m.ok)
  if (exact.length) return { list: exact.map(x => ({ ...x.p, matched: x.m.met })), exact: true, asked, total: list.length }
  const best = Math.min(...scored.map(x => x.m.unmet.length))
  return { list: scored.filter(x => x.m.unmet.length === best).map(x => ({ ...x.p, matched: x.m.met, missing: x.m.unmet })), exact: false, asked, total: list.length }
}
