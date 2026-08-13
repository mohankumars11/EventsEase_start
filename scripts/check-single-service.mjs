#!/usr/bin/env node
/**
 * The single-service door, checked end to end.
 *
 *   node scripts/check-single-service.mjs
 *   node scripts/check-single-service.mjs --verbose
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 * /service/:id is the only screen in the app where a customer configures and
 * prices something entirely on their own, and it is assembled from three data
 * files that nothing else joins up: the service catalogue, the decoration
 * setups and the package shelves. The failures that produces are silent by
 * construction:
 *
 *   · a service added to eventServicesData with no pack shelf and no décor
 *     route renders a page whose only button is "ask for a price" — the exact
 *     dead end this whole flow replaced, reintroduced by an omission;
 *   · a décor route pointed at a family with no themes renders an empty grid;
 *   · a pack priced per `unit` with no `unitLabel` renders "4 × ₹2,200 per
 *     undefined";
 *   · and a cart line whose id contains `__` silently corrupts the cart key,
 *     because `__` is the delimiter CartContext splits on to find the row to
 *     delete. That one deletes the wrong item rather than throwing.
 *
 * None of it fails a build and none of it is visible in review. So it is
 * checked here, the same way prices and customisers already are.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

/* ── Bundle the browser sources so Node can import them ──────────────────
 * Same approach as check-customizers.mjs: these are browser modules with
 * extensionless relative imports, and esbuild resolves them exactly as Vite
 * does — so this tests the real files rather than a copy that has drifted. */
const dir = mkdtempSync(join(tmpdir(), 'single-service-'))
const entry = join(dir, 'entry.mjs')
const abs = p => JSON.stringify(join(ROOT, p).split('\\').join('/'))

writeFileSync(entry, `
export { TOP_SERVICES, SERVICES_BY_CATEGORY } from ${abs('src/data/planCatalog.js')}
export { resolveService, BOOKABLE_SERVICE_IDS, cartLineFor, isBookable } from ${abs('src/data/singleService.js')}
export { DECOR_THEME_CATALOGUE, DECOR_FAMILIES, themeCost, themeFrom } from ${abs('src/data/decorThemes.js')}
export { SERVICE_PACKS, packCost, defaultPackQty } from ${abs('src/data/servicePacks.js')}
`)

const outfile = join(dir, 'bundle.mjs')
await esbuild.build({ entryPoints: [entry], outfile, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const mod = await import(pathToFileURL(outfile).href)
rmSync(dir, { recursive: true, force: true })

const {
  TOP_SERVICES, SERVICES_BY_CATEGORY, resolveService, BOOKABLE_SERVICE_IDS,
  cartLineFor, DECOR_THEME_CATALOGUE, DECOR_FAMILIES, themeCost, themeFrom,
  SERVICE_PACKS, packCost, defaultPackQty,
} = mod

const failures = []
const warnings = []
const fail = m => failures.push(m)
const warn = m => warnings.push(m)

/* ── 1 · Every service resolves to something that can be shown ─────────── */
const enquiryOnly = []
for (const svc of TOP_SERVICES) {
  const r = resolveService(svc.id)
  if (!r) { fail(`${svc.id}: resolveService returned null for a catalogued service`); continue }

  if (r.kind === 'decor') {
    if (!r.themes.length) fail(`${svc.id}: décor route resolves to zero setups`)
    if (!r.families.length) fail(`${svc.id}: décor route resolves to zero families`)
  } else if (r.kind === 'packs') {
    if (!r.packs.length) fail(`${svc.id}: pack route resolves to zero packages`)
  } else if (r.kind === 'enquiry') {
    enquiryOnly.push(svc.id)
  }

  if (r.kind !== 'enquiry' && !Number.isFinite(r.from)) {
    fail(`${svc.id}: bookable (${r.kind}) but has no "from" price for its card`)
  }
  if (!r.blurb) fail(`${svc.id}: no hero copy`)
}

/* ── 2 · Every decoration setup prices at every scale ──────────────────── */
const familyIds = new Set(DECOR_FAMILIES.map(f => f.id))
const seenThemeIds = new Set()
for (const t of DECOR_THEME_CATALOGUE) {
  if (seenThemeIds.has(t.id)) fail(`décor ${t.id}: duplicate id`)
  seenThemeIds.add(t.id)
  if (!familyIds.has(t.family)) fail(`décor ${t.id}: unknown family "${t.family}"`)
  if (!t.includes?.length) fail(`décor ${t.id}: nothing listed under "what our crew installs"`)
  if (!Array.isArray(t.tint) || t.tint.length !== 2) fail(`décor ${t.id}: card art needs exactly two colours`)
  if (!Number.isFinite(themeFrom(t)) || themeFrom(t) <= 0) fail(`décor ${t.id}: "from" price is not a positive number`)

  let last = 0
  for (const scale of ['home', 'standard', 'grand']) {
    const c = themeCost(t, scale, 150)
    if (!Number.isFinite(c.total) || c.total <= 0) {
      fail(`décor ${t.id} @ ${scale}: total is ${c.total}`)
      break
    }
    // A bigger room must never cost less than a smaller one. Cheap to check,
    // and the only way a scale factor typo becomes visible before a customer
    // finds it.
    if (c.total < last) fail(`décor ${t.id}: ${scale} (${c.total}) prices below the smaller scale (${last})`)
    last = c.total
  }
}

/* ── 3 · Every package prices, and describes its own unit ─────────────── */
let packCount = 0
const seenPackIds = new Set()
for (const [serviceId, shelf] of Object.entries(SERVICE_PACKS)) {
  const svc = TOP_SERVICES.find(s => s.id === serviceId)
  if (!svc) { fail(`packs defined for "${serviceId}", which is not a service in the catalogue`); continue }
  if (!shelf.blurb) fail(`${serviceId}: pack shelf has no blurb`)

  for (const p of shelf.packs) {
    packCount++
    if (seenPackIds.has(p.id)) fail(`pack ${p.id}: duplicate id (ids key the cart line)`)
    seenPackIds.add(p.id)

    const qty = defaultPackQty(p, 150)
    const total = packCost(p, 150, qty)
    if (!Number.isFinite(total) || total <= 0) fail(`${serviceId}/${p.id}: total is ${total} at 150 guests`)
    if (!p.includes?.length) fail(`${serviceId}/${p.id}: no inclusion list — the card would be a price with no product`)
    if (!Array.isArray(p.tint) || p.tint.length !== 2) fail(`${serviceId}/${p.id}: card art needs exactly two colours`)
    if (p.unit === 'unit' && !p.unitLabel) fail(`${serviceId}/${p.id}: per-unit pack with no unitLabel — renders "per undefined"`)
    if (!['event', 'guest', 'unit'].includes(p.unit)) fail(`${serviceId}/${p.id}: unknown unit "${p.unit}"`)

    // A per-guest pack priced like a flat fee (or the reverse) is the mistake
    // that quotes ₹35,000 per head. Anything over ₹2,000 a head is almost
    // certainly a flat price wearing the wrong unit.
    if (p.unit === 'guest' && p.price > 2000) {
      warn(`${serviceId}/${p.id}: ₹${p.price} per guest looks like a flat price on the wrong unit`)
    }
    if (p.unit === 'event' && p.price < 500) {
      warn(`${serviceId}/${p.id}: ₹${p.price} for a whole event looks like a per-guest price on the wrong unit`)
    }
  }
}

/* ── 4 · The cart key survives every option id ─────────────────────────
 * CartContext keys an item `${eventId}__${serviceId}` and splits on `__` to
 * find the Supabase row. Anything embedded in either half that contains the
 * delimiter silently targets the wrong row on delete. */
for (const svc of TOP_SERVICES) {
  const r = resolveService(svc.id)
  const optionIds =
    r?.kind === 'decor' ? r.themes.map(t => t.id)
    : r?.kind === 'packs' ? r.packs.map(p => p.id)
    : ['sample']

  for (const optionId of optionIds) {
    const line = cartLineFor({ service: svc, optionId, optionName: 'x', price: 1000, summary: [] })
    const key = `${line.eventId}__${line.service.id}`
    if (key.split('__').length !== 2) {
      fail(`cart key "${key}" (${svc.id}/${optionId}) does not split into exactly two parts`)
      break
    }
    if (!Number.isFinite(line.service.priceMin)) fail(`${svc.id}/${optionId}: cart line has no price`)
  }
}

/* ── Report ────────────────────────────────────────────────────────────── */
console.log('')
console.log(`  services in catalogue   ${TOP_SERVICES.length} across ${SERVICES_BY_CATEGORY.length} categories`)
console.log(`  bookable end to end     ${BOOKABLE_SERVICE_IDS.length}`)
console.log(`  decoration setups       ${DECOR_THEME_CATALOGUE.length} in ${DECOR_FAMILIES.length} families`)
console.log(`  priced packages         ${packCount} across ${Object.keys(SERVICE_PACKS).length} services`)
console.log(`  still enquiry-only      ${enquiryOnly.length}${enquiryOnly.length ? ` — ${enquiryOnly.join(', ')}` : ''}`)

if (verbose) {
  console.log('\n  Per service:')
  for (const svc of TOP_SERVICES) {
    const r = resolveService(svc.id)
    const n = r.kind === 'decor' ? `${r.themes.length} setups`
      : r.kind === 'packs' ? `${r.packs.length} packages`
      : r.kind === 'menu' ? `${r.optionCount} cuisines`
      : 'enquiry only'
    console.log(`    ${svc.id.padEnd(16)} ${r.kind.padEnd(8)} ${n}`)
  }
}

if (warnings.length) {
  console.log(`\n  ⚠ ${warnings.length} warning(s):`)
  for (const w of warnings) console.log(`    · ${w}`)
}

if (failures.length) {
  console.log(`\n  ✗ ${failures.length} failure(s):`)
  for (const f of failures) console.log(`    · ${f}`)
  process.exit(1)
}

console.log('\n  ✓ every service resolves, prices and carts cleanly\n')
