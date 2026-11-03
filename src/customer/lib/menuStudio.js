/**
 * The Menu Studio's brain (Mohan, 2026-11-02: "SAMBRAMO creates the menu.
 * Customers customise it. Eligible partners compete to fulfil it.").
 *
 * The catalogue is read from the database (migration 200, seeded by
 * scripts/apply-menu-catalogue.mjs) so an admin's edit reaches customers
 * without a release; until 200 is in, or offline, the compiled copy
 * (data/menuCatalogue.generated.js) answers. Both are turned into one shape:
 *   { sections, families, menus, dishes, rules, photos, source }
 *
 * Recommendation is data, not code: an occasion's template rule (else its
 * category rule) raises menus by tags, meal and service style; the event's
 * city raises its own cuisines and never hides another. Diet filters: a
 * vegetarian, Jain or vegan customer sees vegetarian menus only — Jain and
 * vegan are adaptations the caterer confirms, flagged dish by dish, never
 * claimed for a dish nobody verified.
 */
import { supabase } from '../../lib/supabase'

let cached = null
const bundle = () => Promise.all([import('../data/menuCatalogue.generated'), import('../data/menuPhotos.generated')])

function fromBundle([C, P]) {
  const dishes = Object.fromEntries(Object.entries(C.DISHES).map(([id, [name, desc, diet, allergens, spice, root, format]]) =>
    [id, { id, name, desc, diet, allergens, spice, root: !!root, format }]))
  return {
    source: 'bundle', version: C.VERSION, sections: C.SECTIONS, families: C.FAMILIES, rules: C.RULES, dishes,
    menus: C.MENUS.map(m => ({ ...m, photo: P.MENU_PHOTOS[m.id] ?? null })),
    familyPhotos: P.FAMILY_PHOTOS,
  }
}

/* The live catalogue, when migration 200 is in and seeded. Null otherwise. */
async function fromDatabase(base) {
  const [s, f, t, i, r, a] = await Promise.all([
    supabase.from('sambramo_menu_sections').select('id, name, sort').order('sort'),
    supabase.from('sambramo_cuisine_families').select('id, name, region, line, cuisine_ids, variant_labels, cities, hero_asset_id, sort').order('sort'),
    supabase.from('sambramo_menu_templates').select('id, family_id, cuisine_id, name, line, diet, meals, serve, tags, hero_asset_id, sort, version').order('sort'),
    supabase.from('sambramo_menu_template_items').select('template_id, dish_id, section_id, label, sort').order('sort').limit(5000),
    supabase.from('sambramo_occasion_menu_rules').select('scope, key, tags, meals, serve, avoid'),
    supabase.from('sambramo_catalogue_assets').select('id, url, alt, attribution, source_page'),
  ])
  if ([s, f, t, i].some(x => x.error) || !t.data?.length) return null
  const ids = [...new Set(i.data.map(x => x.dish_id))]
  const dishRows = []
  for (let k = 0; k < ids.length; k += 300) {
    const { data, error } = await supabase.from('sambramo_master_dishes')
      .select('id, name, description, suggested_diet, contains_egg, allergens_usual, spice_level, serving_format').in('id', ids.slice(k, k + 300))
    if (error) return null
    dishRows.push(...data)
  }
  const label = Object.fromEntries(i.data.filter(x => x.label).map(x => [x.dish_id, x.label]))
  const dishes = Object.fromEntries(dishRows.map(d => {
    const b = base.dishes[d.id]
    return [d.id, { id: d.id, name: label[d.id] ?? b?.name ?? d.name, desc: d.description ?? b?.desc ?? null,
      diet: d.suggested_diet === 'non_veg' ? 'non_veg' : (d.contains_egg || d.suggested_diet === 'egg') ? 'egg' : 'veg',
      allergens: d.allergens_usual ?? b?.allergens ?? [], spice: d.spice_level ?? b?.spice ?? null, root: b?.root ?? false, format: d.serving_format ?? b?.format ?? null }]
  }))
  const asset = Object.fromEntries((a.data ?? []).map(x => [x.id, { url: x.url, alt: x.alt, credit: x.attribution, page: x.source_page }]))
  const menus = t.data.map(m => ({
    id: m.id, family: m.family_id, cuisine: m.cuisine_id, name: m.name, line: m.line, diet: m.diet, meals: m.meals, serve: m.serve, tags: m.tags, version: m.version,
    photo: asset[m.hero_asset_id] ?? base.menus.find(x => x.id === m.id)?.photo ?? null,
    sections: s.data.map(sec => ({ id: sec.id, dishes: i.data.filter(x => x.template_id === m.id && x.section_id === sec.id).map(x => x.dish_id).filter(id => dishes[id]) })).filter(x => x.dishes.length),
  })).filter(m => m.sections.length)
  return {
    source: 'db', version: base.version, sections: s.data, rules: r.data ?? base.rules, dishes, menus,
    families: f.data.map(x => ({ id: x.id, name: x.name, region: x.region, line: x.line, cities: x.cities, variants: x.cuisine_ids.map(c => [c, x.variant_labels?.[c] ?? c]) })),
    familyPhotos: Object.fromEntries(f.data.map(x => [x.id, asset[x.hero_asset_id] ?? base.familyPhotos[x.id] ?? null])),
  }
}

/** The catalogue: the bundle at once, the database when it answers. */
export async function loadCatalogue({ live = true } = {}) {
  if (cached?.source === 'db') return cached
  const base = cached ?? fromBundle(await bundle())
  cached = base
  if (!live) return base
  try { const db = await fromDatabase(base); if (db) cached = db } catch { /* the bundle stands */ }
  return cached
}

// ── recommendation ─────────────────────────────────────────────────────
export const DIETS = [
  { id: 'veg', label: 'Vegetarian' }, { id: 'non_veg', label: 'Non-veg' }, { id: 'mixed', label: 'Both' },
  { id: 'jain', label: 'Jain' }, { id: 'vegan', label: 'Vegan' }, { id: 'eggless', label: 'Eggless' },
]
export const MEALS = [{ id: 'breakfast', label: 'Breakfast' }, { id: 'lunch', label: 'Lunch' }, { id: 'hightea', label: 'High tea' }, { id: 'dinner', label: 'Dinner' }]
/* How it is served — each maps to the catering partners' own answer
   (data/trades/catering_food.js service_styles), so it narrows the match.
   Restaurant bulk orders appear once restaurant partners exist. */
export const SERVES = [
  { id: 'buffet', label: 'Buffet', styles: ['Buffet'] },
  { id: 'leaf', label: 'Banana leaf', styles: ['Traditional banana-leaf meal'] },
  { id: 'plated', label: 'Plated', styles: ['Seated / plated service'] },
  { id: 'family', label: 'Family-style', styles: ['Family-style serving'] },
  { id: 'counters', label: 'Live counters', styles: ['Food counters', 'Live cooking'] },
  { id: 'packed', label: 'Packed meals', styles: ['Packed meals'] },
]
export const mealFor = time => { const h = Number(String(time ?? '').slice(0, 2)); return Number.isNaN(h) || !String(time ?? '').trim() ? 'lunch' : h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'hightea' : 'dinner' }

/** Which menus a diet can see at all. */
export function dietAllows(menu, diet) {
  if (!diet || diet === 'mixed') return true
  if (['veg', 'jain', 'vegan'].includes(diet)) return menu.diet === 'veg'
  if (diet === 'non_veg') return menu.diet !== 'veg'
  return true // eggless: every menu; egg dishes are flagged
}

/** The rule for an occasion: its template's, else its category's. */
export function ruleFor(cat, occasion) {
  return cat.rules.find(r => r.scope === 'occasion' && r.key === occasion?.id)
    ?? cat.rules.find(r => r.scope === 'template' && r.key === occasion?.template)
    ?? cat.rules.find(r => r.scope === 'category' && r.key === occasion?.category) ?? null
}

const cityKey = s => String(s ?? '').toLowerCase().trim()
/** Families in the order this event should see them. */
export function familiesFor(cat, { city } = {}) {
  const c = cityKey(city)
  const home = f => (c && f.cities?.some(x => c.includes(x)) ? 1 : 0)
  /* South Indian neighbours for a Karnataka event: a Bengaluru table often is. */
  const near = { karnataka: ['tamil', 'andhra', 'kerala', 'north_indian'], tamil: ['karnataka', 'kerala', 'andhra'], telangana: ['andhra', 'karnataka'], andhra: ['telangana', 'karnataka'], kerala: ['tamil', 'karnataka'] }
  const homes = cat.families.filter(home).map(f => f.id)
  const next = new Set(homes.flatMap(h => near[h] ?? []))
  return [...cat.families].sort((a, b) => (home(b) * 2 + (next.has(b.id) ? 1 : 0)) - (home(a) * 2 + (next.has(a.id) ? 1 : 0)))
}

/** Menus ranked for the occasion, meal, service and diet. */
export function rankMenus(cat, { occasion, diet, meal, serve, family = null, city = null } = {}) {
  const rule = ruleFor(cat, occasion)
  /* A Bengaluru event leads with Karnataka, then its neighbours — never hiding the rest. */
  const order = city ? familiesFor(cat, { city }).map(f => f.id) : []
  const local = id => { const k = order.indexOf(id); return k < 0 ? 0 : k === 0 ? 3 : k < 4 ? 1 : 0 }
  return cat.menus
    .filter(m => (!family || m.family === family) && dietAllows(m, diet))
    .map(m => {
      let s = 0
      for (const t of rule?.tags ?? []) if (m.tags.includes(t)) s += 3
      for (const t of rule?.avoid ?? []) if (m.tags.includes(t)) s -= 5
      /* A meal the customer chose outranks every tag: breakfast first means breakfast menus first. */
      if (meal && m.meals.includes(meal)) s += 3
      else if (meal) s -= 4
      else if (rule?.meals?.some(x => m.meals.includes(x))) s += 1
      if (serve && m.serve.includes(serve)) s += 2
      else if (rule?.serve?.some(x => m.serve.includes(x))) s += 1
      if (diet === 'mixed' && m.diet === 'mixed') s += 1
      s += local(m.family)
      return { m, s }
    })
    .sort((a, b) => b.s - a.s || a.m.name.localeCompare(b.m.name))
    .map(x => ({ ...x.m, fit: x.s }))
}

// ── the customer's version of a menu ───────────────────────────────────
/** A fresh, editable copy of a template — the template itself never changes. */
export function startFrom(cat, menu) {
  return {
    templateId: menu.id, templateVersion: menu.version ?? 1, family: menu.family, cuisine: menu.cuisine, name: menu.name, menuDiet: menu.diet,
    sections: menu.sections.map(s => ({ id: s.id, items: s.dishes.map(id => ({ id, name: cat.dishes[id]?.name ?? id, diet: cat.dishes[id]?.diet ?? 'veg' })) })),
  }
}
export const dishCount = studio => (studio?.sections ?? []).reduce((n, s) => n + s.items.length, 0)
export const sectionName = (cat, id) => cat.sections.find(s => s.id === id)?.name ?? id

/** Dishes that can stand in for one: same section, this cuisine first, never against the diet. */
export function alternativesFor(cat, studio, sectionId, dishId, diet) {
  const taken = new Set(studio.sections.flatMap(s => s.items.map(i => i.id)))
  const vegOnly = ['veg', 'jain', 'vegan'].includes(diet) || studio.menuDiet === 'veg'
  const score = m => (m.family === studio.family ? 2 : 0)
  const seen = new Set()
  const out = []
  for (const m of [...cat.menus].sort((a, b) => score(b) - score(a))) {
    for (const s of m.sections) if (s.id === sectionId) for (const id of s.dishes) {
      const d = cat.dishes[id]
      if (!d || id === dishId || taken.has(id) || seen.has(id)) continue
      if (vegOnly && d.diet !== 'veg') continue
      if (diet === 'eggless' && d.diet === 'egg') continue
      seen.add(id); out.push({ ...d, own: m.family === studio.family })
    }
  }
  return out.slice(0, 24)
}

/** Every catalogue dish matching a search, for "Add a dish". */
export function searchDishes(cat, q, { diet, menuDiet } = {}) {
  const t = String(q ?? '').toLowerCase().trim()
  if (t.length < 2) return []
  const vegOnly = ['veg', 'jain', 'vegan'].includes(diet) || menuDiet === 'veg'
  const where = {}
  for (const m of cat.menus) for (const s of m.sections) for (const id of s.dishes) where[id] ??= s.id
  return Object.values(cat.dishes).filter(d => d.name.toLowerCase().includes(t) && (!vegOnly || d.diet === 'veg'))
    .sort((a, b) => a.name.toLowerCase().indexOf(t) - b.name.toLowerCase().indexOf(t)).slice(0, 12).map(d => ({ ...d, section: where[d.id] ?? 'special' }))
}

/**
 * What the caterer must adapt for this customer, dish by dish — honest
 * about what is only typical: "usually contains dairy", never "dairy-free".
 */
export function flagsFor(dish, diet, allergyText = '') {
  const d = dish ?? {}
  const f = []
  if (diet === 'jain' && d.root) f.push('Made with roots, onion or garlic — swap it for Jain')
  if (diet === 'vegan' && (d.allergens ?? []).some(a => ['dairy', 'egg'].includes(a))) f.push('Usually made with dairy — needs a vegan version')
  if (diet === 'eggless' && d.diet === 'egg') f.push('Contains egg — swap it or ask for eggless')
  const said = String(allergyText).toLowerCase()
  for (const a of d.allergens ?? []) if (said && (said.includes(a) || (a === 'tree nuts' && /nut|cashew|almond/.test(said)) || (a === 'dairy' && /milk|lactose|dairy/.test(said)))) f.push(`Usually contains ${a} — you said to avoid it`)
  return f
}

/** Every flag on the menu, for the review and the partner's brief. */
export function menuFlags(cat, studio, diet, allergies) {
  return studio.sections.flatMap(s => s.items.map(i => ({ name: i.name, flags: i.typed ? [] : flagsFor(cat.dishes[i.id], diet, allergies) }))).filter(x => x.flags.length)
}

/**
 * The menu as it travels to partners: a structured snapshot that
 * api/_lib/anchorBook.js keeps in canonical_demand.menu, and the partner
 * app renders as a menu card. Changes the customer made are marked.
 */
export function snapshotFor(cat, studio, ctx) {
  const tpl = cat.menus.find(m => m.id === studio.templateId)
  const orig = new Set(tpl?.sections.flatMap(s => s.dishes) ?? [])
  const fam = cat.families.find(f => f.id === studio.family)
  return {
    menuId: ctx.menuId ?? null, version: ctx.version ?? null, templateId: studio.templateId, name: studio.name, way: ctx.way ?? 'caterer',
    cuisine: fam?.name ?? studio.family, diet: ctx.diet, meal: ctx.meal, serve: SERVES.find(s => s.id === ctx.serve)?.label ?? ctx.serve, guests: ctx.guests,
    allergies: ctx.allergies || null, instructions: ctx.instructions || null, refs: ctx.refs ?? [],
    flags: menuFlags(cat, studio, ctx.diet, ctx.allergies).map(x => `${x.name}: ${x.flags.join('; ')}`),
    sections: studio.sections.filter(s => s.items.length).map(s => ({
      id: s.id, name: sectionName(cat, s.id),
      dishes: s.items.map(i => ({ id: i.typed ? null : i.id, n: i.name, d: i.diet ?? null, c: i.typed ? 'typed' : i.replaces ? 'swapped' : orig.has(i.id) ? null : 'added', r: i.replaces ?? null })),
    })),
  }
}

/** One line per section — for the request note and anywhere text is all there is. */
export function menuText(cat, studio) {
  return `${studio.name} (${dishCount(studio)} dishes) — ` + studio.sections.filter(s => s.items.length)
    .map(s => `${sectionName(cat, s.id)}: ${s.items.map(i => i.name).join(', ')}`).join('; ')
}

/**
 * Keep the customer's menu in the database: a header and a NEW version of
 * its dishes, in one transaction (save_customer_menu, migration 200).
 * Returns null — never throws — until 200 is pasted.
 */
export async function saveCustomerMenu(studio, ctx) {
  try {
    const items = studio.sections.flatMap(s => s.items.map(i => ({ section_id: s.id, dish_id: i.typed ? null : i.id, custom_name: i.typed ? i.name : null, replaces_dish_id: i.replacesId ?? null })))
    const { data, error } = await supabase.rpc('save_customer_menu', {
      p_client_key: studio.clientKey,
      p_menu: { occasion_id: ctx.occasionId, event_date: ctx.date || null, guests: ctx.guests || null, location: ctx.location ?? {}, template_id: studio.templateId,
        template_version: studio.templateVersion, family_id: studio.family, cuisine_id: studio.cuisine, name: studio.name, diet: ctx.diet, allergies: ctx.allergies || null,
        meal: ctx.meal, serve: ctx.serve, instructions: ctx.instructions || null, reference_urls: ctx.refs ?? [], quote_group_id: ctx.group ?? null, status: ctx.status ?? 'draft' },
      p_items: items,
    })
    if (error) return null
    const row = Array.isArray(data) ? data[0] : data
    return row ? { menuId: row.menu_id, version: row.version } : null
  } catch { return null }
}
