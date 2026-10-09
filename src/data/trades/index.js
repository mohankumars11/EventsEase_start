/**
 * Every trade's questionnaire and engine config, in the canonical order.
 *
 * `TRADE_CONFIGS[i]` is the registry entry (id, code, name, archetype,
 * tiers…) merged with that trade's own file. Anchor & MC is #1 and points
 * at its existing flow through `legacyFlow`; the other 33 are rendered by
 * the shared ListingOnboardingFlow.
 */
import { TRADE_REGISTRY, tradeOf } from './registry'

import anchor_mc from './anchor_mc'
import bar_beverages from './bar_beverages'
import bridal_makeup_hair from './bridal_makeup_hair'
import cake_desserts from './cake_desserts'
import catering_food from './catering_food'
import dj_music from './dj_music'
import decoration_floral from './decoration_floral'
import end_to_end_event_logistics from './end_to_end_event_logistics'
import event_equipment_rental from './event_equipment_rental'
import event_lighting from './event_lighting'
import event_materials_supplier from './event_materials_supplier'
import gifts_favours from './gifts_favours'
import guest_services from './guest_services'
import invitation_printing from './invitation_printing'
import live_entertainment from './live_entertainment'
import loading_unloading_crew from './loading_unloading_crew'
import medium_large_goods_vehicle from './medium_large_goods_vehicle'
import mehendi_artist from './mehendi_artist'
import mini_truck_pickup from './mini_truck_pickup'
import passenger_transport from './passenger_transport'
import photography from './photography'
import power_cooling from './power_cooling'
import priest_rituals from './priest_rituals'
import safety_facilities from './safety_facilities'
import security_services from './security_services'
import sound_av from './sound_av'
import tent_furniture from './tent_furniture'
import transportation from './transportation'
import trousseau_gift_packing from './trousseau_gift_packing'
import valet_parking from './valet_parking'
import venue from './venue'
import videography from './videography'
import warehouse_storage from './warehouse_storage'
import wedding_planning from './wedding_planning'

const FILES = {
  anchor_mc, bar_beverages, bridal_makeup_hair, cake_desserts, catering_food, dj_music,
  decoration_floral, end_to_end_event_logistics, event_equipment_rental, event_lighting,
  event_materials_supplier, gifts_favours, guest_services, invitation_printing, live_entertainment,
  loading_unloading_crew, medium_large_goods_vehicle, mehendi_artist, mini_truck_pickup,
  passenger_transport, photography, power_cooling, priest_rituals, safety_facilities,
  security_services, sound_av, tent_furniture, transportation, trousseau_gift_packing,
  valet_parking, venue, videography, warehouse_storage, wedding_planning,
}

export const TRADE_CONFIGS = TRADE_REGISTRY.map(r => ({ ...FILES[r.id], ...r }))
export const CONFIG_BY_ID = Object.fromEntries(TRADE_CONFIGS.map(c => [c.id, c]))

/** Config for a trade id, display name or code. null when unknown. */
export function configFor(key) {
  const r = tradeOf(key)
  return r ? CONFIG_BY_ID[r.id] : null
}

/** Every question a trade asks of the partner, flattened, with where it lives. */
export function questionsOf(config) {
  const out = []
  for (const s of config.screens ?? []) for (const x of s.questions) out.push({ ...x, scope: `screen:${s.id}` })
  for (const x of config.catalogue?.fields ?? []) out.push({ ...x, scope: 'catalogue' })
  for (const x of config.pricing?.fields ?? []) out.push({ ...x, scope: 'pricing' })
  for (const x of config.resources?.fields ?? []) out.push({ ...x, scope: 'resources' })
  return out
}

/**
 * Does a `showWhen` / `when` condition hold for these answers?
 * `_rule_kinds` is the list of pricing kinds the partner switched on.
 */
export function holds(cond, answers = {}) {
  if (!cond) return true
  const v = answers[cond.q]
  if (cond.in) return cond.in.includes(v)
  if (cond.includes) return Array.isArray(v) && v.includes(cond.includes)
  if (cond.truthy) return !!v && !(Array.isArray(v) && v.length === 0)
  return true
}

/** The compliance documents this listing needs, given its answers. */
export function complianceFor(config, answers = {}) {
  return (config.compliance?.conditional ?? []).filter(c => c.always || holds(c.when, answers))
}

/**
 * The `answers` flags requirementsFor() reads (serves_alcohol, flies_drone…),
 * derived from the trade's own questions, so a partner is never asked the
 * same thing twice.
 */
export function complianceFlags(config, answers = {}) {
  const flags = {}
  for (const c of config.compliance?.conditional ?? []) if (c.flag) flags[c.flag] = c.always || holds(c.when, answers)
  return flags
}

/**
 * What the booking engine does with a trade's money fields. A field with a
 * role becomes a `booking_rules.charges` entry the server prices on its own;
 * a field without one (extra function, design fee…) only pre-fills custom
 * quotes. Amounts are take-home paise.
 *   minimum      the booking total is topped up to this
 *   fixed_fee    charged once on every booking
 *   overtime     per hour beyond what the base includes
 *   waiting      per hour of waiting the customer asks for
 *   km_beyond    per km beyond `included_km`
 *   per_stop     per extra stop
 *   night        once, when the job runs past `night_after`
 *   early_start  once, when the job starts before `early_before`
 *   deposit      refundable, collected separately, never revenue
 */
export const FIELD_ROLES = {
  min_charge: 'minimum', min_fare: 'minimum', min_engagement: 'minimum', min_booking_fee: 'minimum',
  transport_fee: 'fixed_fee', setup_fee: 'fixed_fee', delivery_fee: 'fixed_fee', installation_fee: 'fixed_fee',
  dismantling_fee: 'fixed_fee', dismantle_fee: 'fixed_fee', setup_teardown_fee: 'fixed_fee', signage_fee: 'fixed_fee',
  equipment_fee: 'fixed_fee', cleaning_fee: 'fixed_fee', handling_in: 'fixed_fee', handling_out: 'fixed_fee',
  loading_fee: 'fixed_fee',
  overtime_per_hour: 'overtime', overtime_rate: 'overtime', extra_hour_rate: 'overtime', extra_hour: 'overtime',
  waiting_per_hour: 'waiting', waiting_fee: 'waiting',
  per_km_beyond: 'km_beyond',
  extra_stop: 'per_stop',
  night_charge: 'night', night_premium: 'night', night_surcharge: 'night',
  early_start_fee: 'early_start',
  deposit: 'deposit',
}

/** booking_rules.charges for a listing, from its answers. */
export function chargesFrom(config, answers = {}) {
  const fields = [...(config.screens ?? []).flatMap(s => s.questions), ...(config.pricing?.fields ?? [])]
  return fields
    .filter(f => f.type === 'money' && FIELD_ROLES[f.id] && holds(f.showWhen, answers))
    .map(f => ({ id: f.id, label: f.label, role: FIELD_ROLES[f.id], take_home_paise: Math.round(Number(answers[f.id]) || 0) }))
    .filter(c => c.take_home_paise > 0)
}

/** Where a Transportation partner should really be listed, if anywhere else. */
export function redirectFor(config, answers = {}) {
  const pick = config.redirects && answers.service_type
  return pick ? config.redirects[pick] ?? null : null
}
