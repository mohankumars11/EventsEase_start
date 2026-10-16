#!/usr/bin/env node
/**
 * Does every trade's flow produce a payload submit_listing_version accepts?
 *
 * For each of the 33 engine trades: answer every question the way a partner
 * would (first option, the minimum number, a ₹1,000 amount), add one
 * catalogue item, switch on one priced rule, then build the payload with the
 * same buildTradePayload the app submits — and check it against the rules
 * migration 20261010_08 enforces, plus the archetype needs of 20261010_09.
 *
 * Also pins the money rounding the client previews against the server's:
 *   customer = round10(take / (1 - fee)),  take = floor10(customer × (1 - fee))
 *
 *   node scripts/check-trade-payloads.mjs [--verbose]
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const CACHE = join(ROOT, 'node_modules/.cache'); mkdirSync(CACHE, { recursive: true })
const ENTRY = join(CACHE, 'trade-payloads-entry.mjs'), OUT = join(CACHE, 'trade-payloads.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/data/trades/index.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/components/vendor/listing/payload.js'))}`,
  `export { RULE_KINDS, ADDON_UNITS } from ${JSON.stringify(join(ROOT, 'src/data/trades/schema.js'))}`,
  `export { buildCateringPayload, cateringDone, CATERING_STAGES } from ${JSON.stringify(join(ROOT, 'src/components/vendor/listing/catering/cateringFlow.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`, '--log-level=error',
  '--jsx=automatic', '--loader:.js=jsx', '--packages=external'], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }
const M = await import(pathToFileURL(OUT).href)
const { TRADE_CONFIGS, buildTradePayload, resourcesFor, stagesFor, suggestPackages, RULE_KINDS, ADDON_UNITS, holds, buildCateringPayload, cateringDone, CATERING_STAGES } = M

let ran = 0, bad = 0
const ok = (name, cond, d = '') => { ran++; if (!cond) bad++; if (verbose || !cond) console.log(`  ${cond ? '✓' : '✗'} ${name}${cond ? '' : `   <-- ${d}`}`) }

/* A partner's plausible answer to one question. */
function answer(q) {
  switch (q.type) {
    case 'single': return q.options[0].id
    case 'multi': return [q.options[0].id]
    case 'number': return Math.max(q.min ?? 1, 1) === q.min ? q.min : Math.max(q.min ?? 1, Math.min(q.max ?? 10, 10))
    case 'money': return 100000
    case 'toggle': return true
    case 'url': return 'https://example.com/work'
    case 'dimensions': return { l: '10', w: '8', h: '6', unit: q.unit ?? 'ft' }
    case 'photos': return Array.from({ length: q.min ?? 1 }, (_, i) => ({ kind: 'photo', path: `x/${i}.jpg`, caption: 'Work' }))
    case 'time': return '10:00'
    case 'date': return '2026-12-01'
    default: return `Sample ${q.id.replace(/_/g, ' ')} for review`
  }
}
const fill = qs => Object.fromEntries(qs.map(q => [q.id, answer(q)]))
const ITEM_PRICED = ['catalogue', 'rental', 'space', 'quote', 'percentage']

/* ── Money rounding matches the server ─────────────────────────────── */
const customerFrom = (take, fee) => Math.round(take / (1 - fee) / 10) * 10
const takeFrom = (cust, fee) => Math.floor((cust * (1 - fee)) / 10) * 10
ok('₹5,000 take-home at 8% → ₹5,435 customer', customerFrom(500000, 0.08) === 543480, customerFrom(500000, 0.08))
ok('customer → take-home never pays the partner more than entered', [100000, 543480, 999990].every(c => customerFrom(takeFrom(c, 0.08), 0.08) <= c + 10))
ok('round10 is to the nearest ₹0.10 (paise multiple of 10)', customerFrom(123457, 0.08) % 10 === 0)

for (const c of TRADE_CONFIGS.filter(t => !t.legacyFlow && !t.customFlow)) {
  const qs = [...c.screens.flatMap(s => s.questions), ...(c.pricing.fields ?? []), ...(c.resources.fields ?? [])]
  const answers = fill(qs)
  // Redirecting options (Transportation) are not what a direct operator picks.
  if (c.redirects && answers.service_type in c.redirects) answers.service_type = c.screens[0].questions[0].options.find(o => !(o.id in c.redirects)).id
  const catalogue = c.catalogue ? [{ item_key: `${c.catalogue.key}_1`, answers: fill(c.catalogue.fields) }] : []
  const kind = c.pricing.kinds.find(k => !ITEM_PRICED.includes(k))
  const rules = kind ? { [kind]: { on: true, amount_paise: 250000, min_qty: 1, hours: 4 } } : {}
  const a = { basics: { display_name: 'Sample', bio: 'x'.repeat(60), legal_name: 'Sample Legal' }, location: {}, answers, catalogue, rules,
    packages: [], addons: Object.fromEntries(c.addons.slice(0, 1).map(x => [x.id, { on: true, take_home_paise: 50000 }])),
    availability: { min_notice_days: 1, horizon_months: 6, travel_model: 'included_radius' }, booking: { advance_pct: 30, cancellation: 'flexible', quote_hours: 4 } }
  if (c.tiers && c.pricing.packages) a.packages = suggestPackages(c, a, { signature_uplift: 1.75, vip_factor: 2 })

  let p
  try { p = buildTradePayload(c, a) } catch (e) { ok(`${c.id} builds a payload`, false, e.message); continue }
  ok(`${c.id} builds a payload`, true)
  ok(`${c.id} stages start with About and end with Submit`, stagesFor(c)[0].id === 'basics' && stagesFor(c).at(-1).id === 'review')

  // What 20261010_08 refuses.
  const required = c.screens.flatMap(s => s.questions).filter(q => q.required && !q.showWhen).map(q => q.id)
  const missing = required.filter(k => [undefined, null, '', []].some(x => JSON.stringify(p.answers[k]) === JSON.stringify(x)))
  ok(`${c.id} every required answer travels`, missing.length === 0, missing.join(','))
  ok(`${c.id} rule kinds are allowed for the trade`, p.rules.every(r => c.pricing.kinds.includes(r.kind)), p.rules.map(r => r.kind).join(','))
  ok(`${c.id} every rule has an amount`, p.rules.every(r => r.kind === 'quote' || (r.take_home_paise ?? r.customer_paise) > 0))
  ok(`${c.id} something is priced`, p.rules.length + p.catalogue.filter(i => i.take_home_paise > 0).length + p.packages.length > 0
    || c.pricing.kinds.includes('quote'), 'no priced rule, item or package')
  for (const it of p.catalogue) {
    ok(`${c.id} item has a name`, !!it.name?.trim(), JSON.stringify(it.attributes).slice(0, 80))
    if (c.archetype === 'RENTAL_INVENTORY') ok(`${c.id} rental item carries stock`, it.stock_qty > 0, 'stock_qty missing')
    ok(`${c.id} item never carries a private registration`, !('registration' in it.attributes))
  }
  ok(`${c.id} add-on units are known`, p.addons.every(x => ADDON_UNITS.includes(x.unit)))
  ok(`${c.id} charges have roles and amounts`, p.booking_rules.charges.every(x => x.role && x.take_home_paise > 0))

  // What 20261010_09 needs to price and reserve.
  const res = resourcesFor(c, a)
  if (!['TIME_PERFORMER', 'PROJECT_QUOTE'].includes(c.archetype)) ok(`${c.id} declares something to reserve`, res.length > 0, c.resources.model)
  if (c.archetype === 'TRIP_VEHICLE' && c.catalogue) ok(`${c.id} each vehicle is its own resource`, res.some(r => r.resource_key === catalogue[0].item_key))
  if (c.archetype === 'VENUE_SPACE') ok(`${c.id} each space is its own resource`, res.some(r => r.kind === 'space'))
  ok(`${c.id} resources have positive quantities`, res.every(r => r.quantity > 0))
  if (c.tiers && c.pricing.packages) ok(`${c.id} tier packages suggested from its own rate`, p.packages.length === 3 && p.packages.every(x => x.take_home_paise > 0))
  ok(`${c.id} compliance flags derive`, p.booking_rules.compliance.every(d => c.compliance.conditional.some(x => x.doc === d)))
  void holds; void RULE_KINDS
}

/* ── Catering & Food: its own flow and payload ─────────────────────── */
{
  const c = TRADE_CONFIGS.find(t => t.id === 'catering_food')
  const a = {
    basics: { display_name: 'Annapoorna', bio: 'x'.repeat(50), legal_name: 'Annapoorna Caterers' }, location: { lat: 12.97, lng: 77.59, confirmed: true, postal_code: '560001', source: 'gps' },
    cuisines: ['ka_udupi', 'sp_jain'],
    answers: { services: ['Wedding catering'], prep_location: 'At both locations', service_styles: ['Buffet'], service_area: '50',
      max_guests: 800, guests_per_day: 1500, events_per_day: 2, staff: 30, staff_per_100: 4, min_billable_guests: 100, child_policy: 'per_menu',
      fssai: { type: 'state_licence', number: '12345678901234', expiry: '2027-12-31', premises: 'Kitchen, Jayanagar', responsible: 'R. Rao' },
      declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
    dishes: [
      { item_key: 'd1', name: 'Bisi Bele Bath', category_id: 'rc_flavoured', diet: 'veg', serving: { qty: 200, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd2', name: 'Badam Halwa', category_id: 'ds_halwa', diet: 'veg', serving: { qty: 100, unit: 'g' }, allergens: ['Nuts (tree nuts)', 'Milk / dairy'], menu_eligible: true,
        standalone: { on: true, unit: 'per_kg', price_paise: 120000, min_qty: 2 }, active: true },
      { item_key: 'd3', name: 'Masala Dosa', category_id: 'bf_dosa', diet: 'veg', serving: { qty: 1, unit: 'piece' }, menu_eligible: true, standalone: { on: false }, active: true },
      { item_key: 'd4', name: 'Old dish', category_id: 'ad_other', diet: 'veg', serving: {}, active: false },
    ],
    menus: [{ menu_key: 'm1', name: 'Udupi Wedding Lunch', diet: 'veg', min_guests: 100, max_guests: 800, price_model: 'per_person', price_paise: 35000, child_price_paise: 20000,
      items: [{ dish_key: 'd1', course_group: 'rice_biryani', sort: 0, included: true }, { dish_key: 'd2', course_group: 'desserts', sort: 1, included: false, extra_paise: 4000 }], status: 'active' }],
    counters: [{ counter_key: 'c1', name: 'Dosa Counter', counter_type: 'Dosa Counter', dish_keys: ['d3'], price_model: 'per_event', price_paise: 800000,
      duration_hours: 3, included_servings: 200, available_qty: 2, status: 'active' }],
    packages: [{ key: 'pkg_a', name: 'Classic Wedding', menu_keys: ['m1'], counter_keys: ['c1'], included_addons: ['crockery'], guest_min: 200, guest_max: 600, hours: 5,
      price_model: 'per_guest', price_paise: 45000, status: 'active' }],
    extras: [{ id: 'crockery', label: 'Crockery and cutlery', unit: 'per_guest', on: true, take_home_paise: 1500 }, { id: 'extra_staff', label: 'Additional serving staff', unit: 'per_staff_hour', on: false }],
    availability: { min_notice_days: 7, horizon_months: 12, menu_freeze_days: 5, guest_confirm_days: 3, travel_model: 'included_radius' },
    booking: { instant: true, advance_pct: 30, cancellation: 'moderate', custom_quotes: true, quote_hours: 12 },
  }
  const done = cateringDone(a)
  ok('catering: 13 stages, all complete for a full listing', CATERING_STAGES.length === 13 && CATERING_STAGES.every(st => done.has(st.id)), CATERING_STAGES.filter(st => !done.has(st.id)).map(st => st.id))
  const p = buildCateringPayload(c, a)
  const keys = new Set(p.catalogue.map(i => i.item_key))
  ok('catering: every required answer the server checks is present', ['services', 'prep_location', 'service_styles', 'max_guests', 'guests_per_day', 'events_per_day', 'staff', 'min_billable_guests', 'child_policy'].every(k => p.answers[k] != null && p.answers[k] !== ''))
  ok('catering: archived, unused dish is not submitted', !keys.has('d4'))
  ok('catering: every menu dish is in the same submission', p.menus.every(m => m.items.every(i => keys.has(i.dish_key))))
  ok('catering: every counter dish is in the same submission', p.counters.every(x => x.dish_keys.every(k => keys.has(k))))
  ok('catering: packages name menus and counters that are sent', p.packages.every(pk => pk.meta.menu_keys.every(k => p.menus.some(m => m.menu_key === k)) && pk.meta.counter_keys.every(k => p.counters.some(x => x.counter_key === k))))
  ok('catering: per-person menu carries its price; extra-cost dish its extra', p.menus[0].take_home_paise === 35000 && p.menus[0].items.find(i => i.dish_key === 'd2').extra_take_home_paise === 4000)
  ok('catering: dish in menus only is not priced alone', p.catalogue.find(i => i.item_key === 'd1').quote_only === true)
  ok('catering: standalone dish carries unit and price', p.catalogue.find(i => i.item_key === 'd2').take_home_paise === 120000 && p.catalogue.find(i => i.item_key === 'd2').unit === 'kg')
  ok('catering: flat counter says hours and servings it covers', p.counters[0].duration_hours === 3 && p.counters[0].included_servings === 200)
  ok('catering: included extra is linked to its package', p.addons.find(x => x.addon_id === 'crockery').included_in.includes('PKG_A'))
  ok('catering: resources for guests/day, events, staff and each counter', ['guests', 'events', 'staff', 'c1'].every(k => p.resources.some(r => r.resource_key === k)))
  ok('catering: FSSAI premises / responsible person kept private', !('premises' in p.answers.fssai) && p.answers.private_fssai.premises === 'Kitchen, Jayanagar')
  ok('catering: add-on units are known', p.addons.every(x => ADDON_UNITS.includes(x.unit)))
}

console.log(`\ncheck-trade-payloads: ${ran - bad}/${ran} passed`)
process.exit(bad ? 1 : 0)
