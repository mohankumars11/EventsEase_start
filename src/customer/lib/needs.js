/**
 * What the customer needs from each master — asked in their words,
 * answered in the partner's.
 *
 * Every question here is one a partner already answered when they listed
 * (src/data/trades/<trade>.js), and its options are read from that same
 * definition at load, so a customer's "Candid" is exactly the `candid` a
 * photographer ticked. Nothing is matched on free text and nothing is
 * invented: a master who never answered a question is not claimed to
 * match it.
 *
 *   needsFor(tradeId)          → the questions to ask (0–3 per service)
 *   matchNeeds(partner, picks) → { ok, met, unmet } for one master
 *   filterByNeeds(list, picks) → matches first; if none, the closest,
 *                                marked so the screen can say so
 *
 * Two answers are not in the onboarding answers and are read from the
 * listing instead: a caterer's diets come from their menus (`veg` /
 * `mixed`), and cuisines from both their answers and their menus.
 * Capacity questions compare the event's guest count with the master's
 * own maximum.
 */
import { configFor, questionsOf } from '../../data/trades/index'

/* Per trade: the onboarding question key, how the customer is asked, and
   (optionally) which of the partner's options make sense to a customer. */
const ASK = {
  photography: [
    { key: 'specialties', title: 'What style of photos?', only: ['candid', 'traditional', 'pre_wedding', 'portrait', 'haldi_and_mehendi', 'baby_and_kids', 'drone_photography', 'event_conference'] },
    { key: 'languages', title: 'Language the photographer speaks', single: true },
  ],
  videography: [
    { key: 'deliverables', title: 'What should the film include?' },
    { key: 'languages', title: 'Language the crew speaks', single: true },
  ],
  catering_food: [
    { key: '$diet', title: 'Veg or non-veg?', single: true, options: [{ id: 'veg', label: 'Pure veg' }, { id: 'mixed', label: 'Veg & non-veg' }] },
    { key: '$cuisine', title: 'Which food style?' },
    { key: 'service_styles', title: 'How should it be served?', only: ['buffet', 'traditional_banana_leaf_meal', 'seated_plated_service', 'food_counters', 'live_cooking', 'packed_meals'] },
  ],
  decoration_floral: [
    { key: 'themes', title: 'Which look do you love?' },
    { key: 'flowers', title: 'Fresh or artificial flowers?', single: true },
  ],
  bridal_makeup_hair: [
    { key: 'who', title: 'Who needs the look?' },
    { key: 'styles', title: 'Which makeup style?' },
  ],
  mehendi_artist: [
    { key: 'who', title: 'Mehendi for whom?' },
    { key: 'styles', title: 'Which design style?' },
  ],
  dj_music: [
    { key: 'performance_kinds', title: 'What kind of music?' },
    { key: 'styles', title: 'Music that gets your crowd dancing' },
  ],
  live_entertainment: [{ key: 'act_types', title: 'What would you love on stage?' }],
  venue: [
    { key: 'venue_type', title: 'What kind of venue?' },
    { key: 'catering_rule', title: 'Bringing your own caterer?', single: true },
    { key: '$capacity', field: 'max_capacity' },
  ],
  cake_desserts: [
    { key: 'product_types', title: 'What are you ordering?' },
    { key: 'dietary', title: 'Any dietary needs?' },
    { key: 'flavours', title: 'Favourite flavour?' },
  ],
  priest_rituals: [
    { key: 'traditions', title: 'Which tradition does your family follow?' },
    { key: 'languages', title: 'Mantras / guidance in which language?', single: true },
  ],
  invitation_printing: [{ key: 'products', title: 'What do you need made?' }, { key: 'card_styles', title: 'Which style?' }],
  gifts_favours: [{ key: 'gift_types', title: 'What kind of gifts?' }, { key: 'personalisation_methods', title: 'Personalise them?' }],
  trousseau_gift_packing: [{ key: 'types', title: 'What should be packed?' }],
  event_lighting: [{ key: 'service_types', title: 'What lighting?' }, { key: 'suitability', title: 'Indoor or outdoor?' }],
  sound_av: [{ key: 'groups', title: 'What equipment?' }],
  tent_furniture: [{ key: 'groups', title: 'What do you need set up?' }, { key: 'surfaces', title: 'On what ground?' }],
  event_equipment_rental: [{ key: 'equipment_types', title: 'What do you need to rent?' }],
  passenger_transport: [{ key: 'vehicle_services', title: 'Which vehicles?' }],
  guest_services: [{ key: 'roles', title: 'Who should greet your guests?' }, { key: 'languages', title: 'Languages they speak', single: true }],
  security_services: [{ key: 'services', title: 'What should security cover?' }, { key: 'uniform', title: 'How should they dress?' }],
  safety_facilities: [{ key: 'kit', title: 'What do you need on site?' }],
  power_cooling: [{ key: 'services', title: 'Power or cooling?' }],
  wedding_planning: [{ key: 'services', title: 'How much planning do you need?' }, { key: 'wedding_styles', title: 'Which wedding style?' }],
  valet_parking: [{ key: 'services', title: 'What do you need?' }],
  bar_beverages: [{ key: 'service_lines', title: 'Which drinks and counters?' }],
  event_materials_supplier: [{ key: 'supplies', title: 'What supplies?' }],
  mini_truck_pickup: [{ key: 'loads', title: 'What are you moving?' }],
  medium_large_goods_vehicle: [{ key: 'loads', title: 'What are you moving?' }],
  loading_unloading_crew: [{ key: 'materials', title: 'What needs lifting?' }],
  warehouse_storage: [{ key: 'item_types', title: 'What needs storing?' }, { key: 'storage_kind', title: 'What kind of storage?' }],
  transportation: [{ key: 'vehicle_types', title: 'Which vehicles?' }],
  end_to_end_event_logistics: [{ key: 'scope', title: 'What should be handled?' }],
}

/* Catering caps by the master's own most-guests answer. */
const CAPACITY = { venue: 'max_capacity', catering_food: 'max_guests' }

let CUISINES = null
/** Cuisine regions (Karnataka, North India…) for the catering question. */
export async function loadCuisines(supabase) {
  if (CUISINES) return CUISINES
  const { data } = await supabase.from('sambramo_cuisines').select('id, group_id, group_name').eq('active', true)
  const groups = []
  for (const r of data ?? []) {
    let g = groups.find(x => x.id === r.group_id)
    if (!g) groups.push(g = { id: r.group_id, label: r.group_name.replace(' & ', ' & '), members: [] })
    g.members.push(r.id)
  }
  CUISINES = groups
  return groups
}

const cache = {}
/** The questions to ask for one trade, with the partner's own options. */
export function needsFor(tradeId) {
  if (cache[tradeId]) return cache[tradeId]
  const cfg = configFor(tradeId)
  const qs = cfg ? questionsOf(cfg) : []
  const out = (ASK[tradeId] ?? []).filter(a => a.key !== '$capacity').map(a => {
    if (a.key === '$diet') return { ...a, kind: 'single' }
    if (a.key === '$cuisine') return { ...a, kind: 'multi', options: CUISINES ?? [] }
    const q = qs.find(x => x.id === a.key && x.options?.length)
    if (!q) return null
    const options = (a.only ? a.only.map(id => q.options.find(o => o.id === id)).filter(Boolean) : q.options).slice(0, 12)
    return { ...a, kind: a.single || q.type === 'single' ? 'single' : 'multi', options }
  }).filter(Boolean)
  if (!(ASK[tradeId] ?? []).some(a => a.key === '$cuisine') || CUISINES) cache[tradeId] = out
  return out
}

/** Keep only the onboarding answers a requirement can read. */
export function pickFacets(tradeId, answers) {
  if (!answers) return {}
  const keys = new Set([...(ASK[tradeId] ?? []).map(a => a.key).filter(k => !k.startsWith('$')), CAPACITY[tradeId]].filter(Boolean))
  return Object.fromEntries(Object.entries(answers).filter(([k]) => keys.has(k)))
}

const asList = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map(x => String(x).toLowerCase())

/**
 * Does one master meet the customer's picks? `picks` is { key: [ids] }.
 * `guests` checks capacity. Unanswered questions count as unmet.
 */
export function matchNeeds(partner, tradeId, picks = {}, guests = null) {
  const f = partner.facets ?? {}
  const met = [], unmet = []
  for (const q of needsFor(tradeId)) {
    const want = picks[q.key]
    if (!want?.length) continue
    let ok
    if (q.key === '$diet') ok = want.includes('mixed') ? f.diets?.includes('mixed') : (f.diets ?? []).includes('veg')
    else if (q.key === '$cuisine') {
      const members = (CUISINES ?? []).filter(g => want.includes(g.id)).flatMap(g => g.members)
      ok = (f.cuisines ?? []).some(c => members.includes(c))
    } else {
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
 * Masters that meet every pick, best first. With picks and no exact match,
 * the closest ones (fewest unmet) come back with `exact: false`.
 */
export function filterByNeeds(list, tradeId, picks = {}, guests = null) {
  if (!list) return { list: null, exact: true, asked: false }
  const asked = Object.values(picks).some(v => v?.length) || (!!guests && !!CAPACITY[tradeId])
  if (!asked) return { list, exact: true, asked }
  const scored = list.map(p => ({ p, m: matchNeeds(p, tradeId, picks, guests) }))
  const exact = scored.filter(x => x.m.ok)
  if (exact.length) return { list: exact.map(x => ({ ...x.p, matched: x.m.met })), exact: true, asked }
  const best = Math.min(...scored.map(x => x.m.unmet.length))
  return { list: scored.filter(x => x.m.unmet.length === best).map(x => ({ ...x.p, matched: x.m.met, missing: x.m.unmet })), exact: false, asked }
}
