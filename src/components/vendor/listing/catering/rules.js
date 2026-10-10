/**
 * Catering & Food — what "complete" means for each part of a listing.
 * Pure functions, no UI and no network, so the screens, the flow, the
 * payload checks and the tests all apply exactly the same rules.
 */

export const locationDone = v => v?.lat != null && !!v?.travel_scope && (v?.confirmed || v?.source === 'manual')
/** Catering asks its service area on the profile step, so the map need not ask it again. */
export const cateringLocationDone = a => a.location?.lat != null && (!!a.location?.travel_scope || !!a.answers?.service_area)
  && (a.location?.confirmed || a.location?.source === 'manual')

/* ── Profile, cuisines, capacity, pricing rules, preparation ─────────── */
export const profileDone = a => !!a.basics?.display_name?.trim() && (a.basics?.bio ?? '').trim().length >= 40 && !!a.basics?.legal_name?.trim()
  && (a.answers?.services ?? []).length > 0 && !!a.answers?.prep_location && (a.answers?.service_styles ?? []).length > 0
  && (!(a.answers?.services ?? []).includes('Other') || !!a.answers?.services_other?.trim())

export const cuisinesDone = a => (a.cuisines ?? []).length > 0

export const capacityDone = a => { const s = a.answers ?? {}; return s.max_guests > 0 && s.guests_per_day >= s.max_guests && s.events_per_day > 0 && s.staff > 0 }

export const pricingRulesDone = a => { const s = a.answers ?? {}, b = a.booking ?? {}
  return s.min_billable_guests > 0 && !!s.child_policy && !!b.advance_pct && !!b.cancellation && (b.custom_quotes === false || !!b.quote_hours) }

export const prepDone = a => { const v = a.availability ?? {}
  return v.min_notice_days != null && !!v.horizon_months && v.menu_freeze_days != null && v.guest_confirm_days != null && !!v.travel_model }

/* ── Food safety ─────────────────────────────────────────────────────── */
export const DECLARATIONS = [
  ['dietary_accurate', 'The diet shown on each dish (veg / non-veg / vegan / Jain) is accurate, and veg and non-veg are prepared separately where I say so.'],
  ['allergens_shared', 'I will tell customers about allergens and possible cross-contact as listed on each dish.'],
  ['hygiene', 'Food is prepared and stored hygienically, and staff follow food-handling practice.'],
  ['temperature', 'Food is transported and held at safe temperatures.'],
  ['special_requests', 'I will only accept special dietary requests I can actually prepare safely.'],
]
export const foodSafetyDone = a => { const f = a.answers?.fssai ?? {}
  return !!f.type && /^\d{14}$/.test(String(f.number ?? '')) && !!f.expiry && !!f.premises?.trim() && !!f.responsible?.trim()
    && DECLARATIONS.every(([id]) => (a.answers?.declarations ?? []).includes(id)) }

/* ── Dishes ──────────────────────────────────────────────────────────── */
/** What still stops this dish from being saved. */
export function dishProblems(d) {
  const p = []
  if (!d.name?.trim()) p.push('Name')
  if (!d.category_id) p.push('Category')
  if (!d.diet) p.push('Dietary class')
  if (d.diet === 'other' && !d.diet_note?.trim()) p.push('Explain the dietary class')
  const sa = d.standalone ?? {}
  if (sa.on) {
    if (!sa.unit) p.push('How you charge')
    if (!(Number(sa.price_paise) > 0)) p.push('Price')
    if (!(Number(d.serving?.qty) > 0) || !d.serving?.unit) p.push('Serving size (quantity and unit)')
  }
  return p
}
export const dishesDone = a => (a.dishes ?? []).filter(d => d.active !== false).length > 0
  && (a.dishes ?? []).every(d => d.active === false || dishProblems(d).length === 0)

/* ── Menus ───────────────────────────────────────────────────────────── */
export function menuProblems(m, dishes = []) {
  const p = []
  if (!m.name?.trim()) p.push('Menu name')
  if (!(m.items ?? []).length) p.push('At least one dish')
  const byKey = Object.fromEntries(dishes.map(d => [d.item_key, d]))
  if ((m.items ?? []).some(i => !byKey[i.dish_key])) p.push('A dish that no longer exists')
  if ((m.items ?? []).some(i => byKey[i.dish_key]?.active === false)) p.push('An archived dish')
  if ((m.items ?? []).some(i => !i.included && !(Number(i.extra_paise) > 0))) p.push('A price for each extra-cost dish')
  if (!(Number(m.min_guests) > 0)) p.push('Minimum guests')
  if (m.max_guests && m.min_guests && m.max_guests < m.min_guests) p.push('Maximum guests below minimum')
  if (m.price_model !== 'quote' && !(Number(m.price_paise) > 0)) p.push(m.price_model === 'fixed' ? 'Fixed price' : 'Price per guest')
  if (m.price_model === 'fixed' && !(Number(m.fixed_scope?.guests) > 0 && Number(m.fixed_scope?.hours) > 0)) p.push('What the fixed price covers (guests and hours)')
  if (m.status === 'draft') p.push('Confirm this menu (it came from your earlier form)')
  return p
}
export const menusDone = a => (a.menus ?? []).some(m => m.status !== 'archived')
  && (a.menus ?? []).every(m => m.status === 'archived' || menuProblems(m, a.dishes).length === 0)

/* ── Live counters, packages, extras ─────────────────────────────────── */
export function counterProblems(c) {
  const p = []
  if (!c.name?.trim()) p.push('Name')
  if (!(c.dish_keys ?? []).length) p.push('Dishes served')
  if (!c.price_model) p.push('Price model')
  if (c.price_model && c.price_model !== 'quote' && !(Number(c.price_paise) > 0)) p.push('Price')
  if (['per_event', 'fixed'].includes(c.price_model) && !(Number(c.duration_hours) > 0 && Number(c.included_servings) > 0)) p.push('Hours and servings the price covers')
  if (c.price_model === 'per_hour' && !(Number(c.duration_hours) > 0)) p.push('Minimum hours')
  if (!(Number(c.available_qty) > 0)) p.push('How many of this counter you can run at once')
  return p
}
export const countersDone = a => (a.counters ?? []).every(c => c.status === 'archived' || counterProblems(c).length === 0)
  && !(a.dishes ?? []).some(d => d.legacy?.counter_price_paise && !d.legacy?.counter_migrated)

export function packageProblems(p, a) {
  const q = []
  if (!p.name?.trim()) q.push('Name')
  const menus = new Set((a.menus ?? []).filter(m => m.status !== 'archived').map(m => m.menu_key))
  const counters = new Set((a.counters ?? []).filter(c => c.status !== 'archived').map(c => c.counter_key))
  if (!(p.menu_keys ?? []).length) q.push('At least one menu')
  if ((p.menu_keys ?? []).some(k => !menus.has(k)) || (p.counter_keys ?? []).some(k => !counters.has(k))) q.push('A menu or counter that is archived or gone')
  if (!(Number(p.guest_min) > 0)) q.push('Minimum guests')
  if (p.guest_max && p.guest_min && p.guest_max < p.guest_min) q.push('Maximum below minimum')
  if (!(Number(p.hours) > 0)) q.push('Service hours')
  if (!p.price_model) q.push('Price model')
  if (!(Number(p.price_paise) > 0)) q.push('Price')
  return q
}
export const packagesDone = a => (a.packages ?? []).every(p => p.status === 'archived' || packageProblems(p, a).length === 0)

export const extrasDone = a => (a.extras ?? []).every(x => !x.on || (Number(x.take_home_paise) > 0 && !!x.unit && !!x.label?.trim()))
