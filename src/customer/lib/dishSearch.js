/**
 * The whole master dish catalogue, for "Swap" and "Add a dish" on a menu
 * card — 2,500+ dishes partners already cook from (data/masterDishes,
 * generated from sambramo_master_dishes). Loaded once, on demand, and
 * searched in memory, so a swap list opens instantly.
 *
 *   await loadMaster()
 *   searchMaster({ q, section, edition, taken, family }) → [{ id, name, diet, section }]
 *
 * The edition's promise holds here too: a Veg, Jain or Satvik card is only
 * ever offered dishes the catalogue says are vegetarian — never one whose
 * diet nobody has reviewed — and Jain and Satvik drop onion, garlic and
 * root vegetables by name.
 */
import { fitsEdition } from './occasionMenus'

let MASTER = null
let loading = null
export function loadMaster() {
  if (MASTER) return Promise.resolve(MASTER)
  loading ??= import('../data/masterDishes.generated').then(m => {
    MASTER = m.MASTER.map(([id, name, diet, section, cuisine]) => ({ id, name, diet, section, cuisine, low: name.toLowerCase() }))
    return MASTER
  })
  return loading
}
export const masterReady = () => !!MASTER

/* Courses that share a pool: a welcome drink can be any drink, a main can be a breakfast dish or a rice. */
const POOL = { welcome: ['welcome', 'beverages'], beverages: ['beverages', 'welcome'], mains: ['mains', 'rice'], live: ['live', 'starters', 'mains'], soups: ['soups', 'curries'], special: ['special', 'starters'] }
/* Family → the cuisine ids its dishes carry (a prefix is enough: ka_, tn_, ap_ …). */
const CUISINE = { karnataka: 'ka_', tamil: 'tn_', andhra: 'ap_', telangana: 'tg_', kerala: 'kl_', north_indian: 'ni_', gujarati: 'wi_guj', rajasthani: 'wi_raj', maharashtrian: 'wi_mah', bengali: 'ei_ben', odia: 'ei_od', kashmiri: 'ni_kash', northeast: 'ne_' }

export function searchMaster({ q = '', section = null, edition = 'veg', taken = new Set(), family = null, limit = 60 } = {}) {
  if (!MASTER) return []
  const t = q.trim().toLowerCase()
  const pools = section ? POOL[section] ?? [section] : null
  const pre = CUISINE[family] ?? null
  const ok = d => {
    if (taken.has(d.id) || !d.diet) return false
    if (edition && edition !== 'non_veg' && !fitsEdition({ name: d.name, desc: '', diet: d.diet === 'egg' ? 'egg' : d.diet, root: false }, edition)) return false
    if (t.length >= 2) return d.low.includes(t)
    return !pools || pools.includes(d.section)
  }
  const score = d => (t && d.low.startsWith(t) ? 4 : 0) + (pools?.[0] === d.section ? 2 : 0) + (pre && String(d.cuisine ?? '').startsWith(pre) ? 2 : 0) + (edition === 'non_veg' && d.diet === 'non_veg' ? 1 : 0)
  return MASTER.filter(ok).map(d => ({ d, s: score(d) })).sort((a, b) => b.s - a.s || a.d.name.localeCompare(b.d.name)).slice(0, limit).map(x => x.d)
}
