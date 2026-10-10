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
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`, '--log-level=error'], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }
const M = await import(pathToFileURL(OUT).href)
const { TRADE_CONFIGS, buildTradePayload, resourcesFor, stagesFor, suggestPackages, RULE_KINDS, ADDON_UNITS, holds } = M

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

for (const c of TRADE_CONFIGS.filter(t => !t.legacyFlow)) {
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

console.log(`\ncheck-trade-payloads: ${ran - bad}/${ran} passed`)
process.exit(bad ? 1 : 0)
