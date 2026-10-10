/**
 * Catering & Food on the shared listing flow: its 13 stages, what "done"
 * means for each, and the payload submit_listing_version receives
 * (migration 20261010_14 adds menus, counters and the catering checks).
 */
import { profileDone, cuisinesDone, capacityDone, pricingRulesDone, prepDone, foodSafetyDone, dishesDone, menusDone,
  countersDone, packagesDone, extrasDone, cateringLocationDone } from './rules'

export const CATERING_STAGES = [
  { id: 'cat_profile', label: 'Business & service profile', short: 'Profile' },
  { id: 'location', label: 'Location & service area', short: 'Location' },
  { id: 'cat_cuisines', label: 'Regional cuisines & food styles', short: 'Cuisines' },
  { id: 'cat_capacity', label: 'Guest capacity & service', short: 'Capacity' },
  { id: 'cat_dishes', label: 'My Food Catalogue', short: 'Dishes' },
  { id: 'cat_menus', label: 'Menu Builder', short: 'Menus' },
  { id: 'cat_counters', label: 'Live counters', short: 'Counters' },
  { id: 'cat_packages', label: 'Catering packages', short: 'Packages' },
  { id: 'cat_pricing', label: 'Pricing & minimum orders', short: 'Pricing' },
  { id: 'cat_extras', label: 'Extra services & charges', short: 'Extras' },
  { id: 'cat_prep', label: 'Availability & preparation', short: 'Calendar' },
  { id: 'cat_safety', label: 'Food safety & business details', short: 'FSSAI' },
  { id: 'review', label: 'Review everything & submit', short: 'Submit' },
]

export function cateringDone(a) {
  const s = new Set()
  if (profileDone(a)) s.add('cat_profile')
  if (cateringLocationDone(a)) s.add('location')
  if (cuisinesDone(a)) s.add('cat_cuisines')
  if (capacityDone(a)) s.add('cat_capacity')
  if (dishesDone(a)) s.add('cat_dishes')
  if (menusDone(a)) s.add('cat_menus')
  if (countersDone(a)) s.add('cat_counters')
  if (packagesDone(a)) s.add('cat_packages')
  if (pricingRulesDone(a)) s.add('cat_pricing')
  if (extrasDone(a)) s.add('cat_extras')
  if (prepDone(a)) s.add('cat_prep')
  if (foodSafetyDone(a)) s.add('cat_safety')
  if (CATERING_STAGES.slice(0, -1).every(x => s.has(x.id))) s.add('review')
  return s
}

const live = x => x.status !== 'archived'
const STANDALONE_UNIT = { per_serving: 'serving', per_piece: 'piece', per_kg: 'kg', per_100g: '100g', per_litre: 'litre', per_cup: 'cup',
  per_tray: 'tray', per_box: 'box', per_fixed_qty: 'pack' }

export function buildCateringPayload(config, a) {
  const ans = a.answers ?? {}, av = a.availability ?? {}, b = a.booking ?? {}, loc = a.location ?? {}
  const { legal_name, work, ...basics } = a.basics ?? {} // eslint-disable-line no-unused-vars
  const { premises, responsible, ...fssaiPublic } = ans.fssai ?? {}
  const menus = (a.menus ?? []).filter(live)
  const counters = (a.counters ?? []).filter(live)
  const packages = (a.packages ?? []).filter(live)
  const extras = (a.extras ?? []).filter(x => x.on)
  const usedDishes = new Set([...menus.flatMap(m => (m.items ?? []).map(i => i.dish_key)), ...counters.flatMap(c => c.dish_keys ?? [])])
  return {
    trade_id: config.id,
    schema_version: 2,
    legal_name,
    profile: { ...basics, events: [...new Set(menus.flatMap(m => m.event_types ?? []))], cuisines: a.cuisines ?? [] },
    answers: { ...ans, fssai: fssaiPublic, private_fssai: { premises, responsible }, cuisines: a.cuisines ?? [] },
    // Every price lives on a menu, counter, package, dish or extra; the only rule is "quotes welcome".
    rules: b.custom_quotes !== false ? [{ kind: 'quote' }] : [],
    catalogue: (a.dishes ?? []).filter(d => d.active !== false || usedDishes.has(d.item_key)).map((d, i) => ({
      collection: 'dishes', item_key: d.item_key, name: d.name, category: d.category_id,
      unit: d.standalone?.on ? STANDALONE_UNIT[d.standalone.unit] ?? 'serving' : 'serving',
      take_home_paise: d.standalone?.on ? d.standalone.price_paise : null, quote_only: !d.standalone?.on, price_mode: 'target_net',
      min_qty: d.standalone?.on ? d.standalone.min_qty || 1 : 1, max_qty: d.standalone?.max_capacity || null,
      stock_qty: null, lead_days: d.standalone?.lead_days || 0, qty_bands: [],
      attributes: {
        master_dish_id: d.master_dish_id, category_id: d.category_id, cuisine_ids: d.cuisine_ids ?? [], description: d.description,
        diet: d.diet, diet_note: d.diet_note, serving: d.serving, allergens: d.allergens ?? [], allergen_note: d.allergen_note,
        cross_contact: d.cross_contact, menu_eligible: d.menu_eligible !== false, standalone: d.standalone, increment: d.standalone?.increment ?? null,
        pricing_status: d.pricing_status, active: d.active !== false, legacy: d.legacy ?? null, sort: i,
      },
      media: (d.photos ?? []).filter(x => x.kind !== 'testimonial'),
    })),
    menus: menus.map((m, i) => ({
      menu_key: m.menu_key, sort_order: i, name: m.name, description: m.description, cuisine_ids: m.cuisine_ids ?? [], diet: m.diet,
      service_style: m.service_style, event_types: m.event_types ?? [], min_guests: m.min_guests, max_guests: m.max_guests, lead_days: m.lead_days || 0,
      price_model: m.price_model, take_home_paise: m.price_model === 'quote' ? null : m.price_paise,
      child_take_home_paise: m.child_price_paise ?? null, extra_guest_take_home_paise: m.extra_guest_paise ?? null,
      fixed_scope: m.price_model === 'fixed' ? m.fixed_scope : {}, included_services: m.included_services ?? [],
      items: (m.items ?? []).map(it => ({ dish_key: it.dish_key, course_group: it.course_group, sort_order: it.sort ?? 0, included: it.included !== false,
        extra_take_home_paise: it.included === false ? it.extra_paise : null, portion: it.portion ?? null, required: it.required !== false,
        choice_group: it.choice_group ?? null, choice_pick: it.choice_pick ?? null, notes: it.notes ?? null })),
    })),
    counters: counters.map((c, i) => ({
      counter_key: c.counter_key, sort_order: i, counter_type: c.counter_type ?? 'Custom', name: c.name, description: c.description,
      cuisine_ids: c.cuisine_ids ?? [], included_servings: c.included_servings, serving_capacity: c.serving_capacity, duration_hours: c.duration_hours,
      chefs: c.chefs ?? 1, equipment: c.equipment, power_water: c.power_water, space_required: c.space_required,
      setup_minutes: c.setup_minutes ?? 0, dismantle_minutes: c.dismantle_minutes ?? 0, indoor_outdoor: c.indoor_outdoor ?? 'both',
      lead_days: c.lead_days ?? 0, available_qty: c.available_qty ?? 1, price_model: c.price_model,
      take_home_paise: c.price_model === 'quote' ? null : c.price_paise,
      extra_serving_take_home_paise: c.extra_serving_paise ?? null, extra_hour_take_home_paise: c.extra_hour_paise ?? null, dish_keys: c.dish_keys ?? [],
    })),
    packages: packages.map(p => ({
      key: p.key.toUpperCase(), name: p.name, description: p.description, badge: p.tier ? ({ ESSENTIAL: 'Essential', SIGNATURE: 'Signature', PREMIUM: 'Premium' })[p.tier] : null,
      take_home_paise: p.price_paise, hours: p.hours, inclusions: p.included_addons ?? [],
      meta: { catering: true, tier: p.tier ?? null, price_model: p.price_model, menu_keys: p.menu_keys ?? [], counter_keys: p.counter_keys ?? [],
        included_addons: p.included_addons ?? [], included_services: p.included_services ?? [], exclusions: p.exclusions ?? '',
        guest_min: p.guest_min, guest_max: p.guest_max ?? null, staff: p.staff ?? null, equipment: p.equipment ?? null, event_types: p.event_types ?? [],
        extra_guest_take_home_paise: p.extra_guest_paise ?? null, child_take_home_paise: p.child_price_paise ?? null,
        extra_counter_take_home_paise: p.extra_counter_paise ?? null, overtime_take_home_paise: p.overtime_paise ?? null },
    })),
    addons: extras.map(x => ({
      addon_id: x.id, label: x.label, unit: x.unit, take_home_paise: x.take_home_paise, notice_days: x.lead_days ?? 0,
      description: x.description ?? null, min_qty: x.min_qty ?? null, requires: x.requires ? { text: x.requires } : {},
      included_in: packages.filter(p => (p.included_addons ?? []).includes(x.id)).map(p => p.key.toUpperCase()),
    })),
    resources: [
      { kind: 'capacity', resource_key: 'guests', label: 'Guests per day', quantity: Number(ans.guests_per_day) || 0, unit: 'guest', buffer_minutes: 0, attributes: {}, private_ref: {} },
      { kind: 'project', resource_key: 'events', label: 'Events at once', quantity: Number(ans.events_per_day) || 0, unit: 'event',
        buffer_minutes: Number(av.travel_buffer_minutes) || 0, attributes: {}, private_ref: {} },
      { kind: 'staff', resource_key: 'staff', label: 'Serving staff', quantity: Number(ans.staff) || 0, unit: 'person', buffer_minutes: 0, attributes: {}, private_ref: {} },
      ...counters.map(c => ({ kind: 'equipment', resource_key: c.counter_key, label: c.name, quantity: Number(c.available_qty) || 1, unit: 'counter',
        buffer_minutes: (Number(c.setup_minutes) || 0) + (Number(c.dismantle_minutes) || 0), attributes: {}, private_ref: {} })),
    ].filter(r => r.quantity > 0),
    booking_rules: {
      instant: b.instant !== false, advance_pct: b.advance_pct, cancellation: b.cancellation,
      custom_quotes: b.custom_quotes !== false, quote_hours: b.quote_hours,
      min_notice_days: av.min_notice_days, horizon_months: av.horizon_months,
      menu_freeze_days: av.menu_freeze_days, guest_confirm_days: av.guest_confirm_days,
      setup_minutes: av.setup_minutes ?? null, teardown_minutes: av.teardown_minutes ?? null,
      min_billable_guests: Number(ans.min_billable_guests) || null, child_policy: ans.child_policy,
      charges: [], compliance: ['VER-TRADE-FSSAI'],
    },
    travel_rules: {
      scope: ans.service_area ?? loc.travel_scope, model: av.travel_model,
      flat_take_home_paise: Math.round(Number(av.travel_fee_paise) || 0) || null, per_km_take_home_paise: Math.round(Number(av.travel_per_km_paise) || 0) || null,
    },
    location: {
      lat: loc.lat, lng: loc.lng, formatted_address: loc.formatted_address, state: loc.state, city: loc.city,
      locality: loc.locality, postal_code: loc.postal_code, source: loc.source, confirmed: !!loc.confirmed, travel_scope: ans.service_area ?? loc.travel_scope,
    },
  }
}
