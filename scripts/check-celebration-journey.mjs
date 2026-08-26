#!/usr/bin/env node
/**
 * The guided journey, checked across all fifteen occasions.
 *
 *   node scripts/check-celebration-journey.mjs
 *   node scripts/check-celebration-journey.mjs --verbose
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 * /celebrate/:occasion is assembled from four data files that nothing else
 * joins up — the blueprints, the package shelves, the cuisine spreads and the
 * guest circles — and every failure it can produce is silent by construction:
 *
 *   · a chapter naming a service with no pack shelf renders a question with
 *     no answers, and a Continue button that can never be enabled;
 *   · a `recommend` naming a pack the chapter does not offer pre-selects
 *     nothing, so the screen opens blank and every customer has to have an
 *     opinion about crew sizes;
 *   · a pairing rule naming a dish id that does not exist anywhere silently
 *     never appears — chapati opens with no gravies, and nobody finds out;
 *   · a circle whose rungs do not exist in the tier ladder prices the whole
 *     celebration against `full_celebration` regardless of size;
 *   · and an occasion in EVENT_DATA with no blueprint drops into the generic
 *     flow, which is a real journey but not the researched one — a wedding
 *     that never asks which functions are being planned.
 *
 * None of it fails a build. `npm run build` on this box exits 0 even when it
 * has OOMed, so a build passing means nothing at all. This is the gate.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

/* Bundle the browser sources so Node can import them. Same approach as
 * check-single-service.mjs: these modules use extensionless relative imports
 * that Node's ESM resolver will not follow, and esbuild resolves them exactly
 * as Vite does — so this tests the real files rather than a copy. */
const tmp = mkdtempSync(join(tmpdir(), 'journey-check-'))
const entry = join(tmp, 'entry.js')
writeFileSync(entry, `
export * from ${JSON.stringify(join(ROOT, 'src/data/celebrationBlueprints.js'))}
export * from ${JSON.stringify(join(ROOT, 'src/data/guestCircles.js'))}
export * from ${JSON.stringify(join(ROOT, 'src/data/menuPairings.js'))}
export { SERVICE_PACKS, PACK_BY_ID, packCost, defaultPackQty } from ${JSON.stringify(join(ROOT, 'src/data/servicePacks.js'))}
export { EVENT_DATA } from ${JSON.stringify(join(ROOT, 'src/data/eventServicesData.js'))}
export { CUISINES, CUISINE_BY_ID, COURSES, defaultMenu, dishesFor } from ${JSON.stringify(join(ROOT, 'src/data/cuisineMenus.js'))}
export { TIER_BY_ID } from ${JSON.stringify(join(ROOT, 'src/data/celebrationTiers.js'))}
export { journeyQuote, resolvePacks } from ${JSON.stringify(join(ROOT, 'src/lib/journeyQuote.js'))}
`)
const out = join(tmp, 'bundle.mjs')
await esbuild.build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
  outfile: out, resolveExtensions: ['.js', '.jsx'], logLevel: 'error',
})
const M = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })

const problems = []
const note = m => { if (verbose) console.log('   ' + m) }
const bad = m => problems.push(m)

/* ── 1 · Every occasion has its own researched blueprint ──────────────── */
console.log('\n1 · Blueprint coverage')
for (const id of Object.keys(M.EVENT_DATA)) {
  if (!M.BLUEPRINTS[id]) bad(`${id}: no blueprint — falls back to the generic flow`)
}
for (const id of Object.keys(M.BLUEPRINTS)) {
  if (!M.EVENT_DATA[id]) bad(`blueprint "${id}" has no occasion in EVENT_DATA`)
}
console.log(`   ${Object.keys(M.BLUEPRINTS).length} blueprints for ${Object.keys(M.EVENT_DATA).length} occasions`)

/* ── 2 · Every chapter can actually be answered ───────────────────────── */
console.log('\n2 · Chapters and their options')
for (const [oid, bp] of Object.entries(M.BLUEPRINTS)) {
  const ids = new Set()
  for (const ch of bp.chapters) {
    if (ids.has(ch.id)) bad(`${oid}/${ch.id}: duplicate chapter id — React keys collide and one overwrites the other`)
    ids.add(ch.id)

    if (!ch.question) bad(`${oid}/${ch.id}: no question`)
    if (!ch.why) bad(`${oid}/${ch.id}: no "why" line — the sentence that turns a form field into a question`)

    if (ch.kind === 'choice') {
      if (!ch.options?.length) bad(`${oid}/${ch.id}: choice chapter with no options`)
      const optIds = new Set()
      for (const o of ch.options ?? []) {
        if (optIds.has(o.id)) bad(`${oid}/${ch.id}: duplicate option "${o.id}"`)
        optIds.add(o.id)
      }
      continue
    }

    const shelf = M.SERVICE_PACKS[ch.serviceId]
    if (!shelf) { bad(`${oid}/${ch.id}: service "${ch.serviceId}" has no pack shelf — the screen renders no options`); continue }
    if (!ch.packIds?.length) { bad(`${oid}/${ch.id}: no packIds`); continue }
    const shelfIds = new Set(shelf.packs.map(p => p.id))
    for (const pid of ch.packIds) {
      if (!shelfIds.has(pid)) bad(`${oid}/${ch.id}: pack "${pid}" is not on the ${ch.serviceId} shelf`)
    }
    for (const [circle, pid] of Object.entries(ch.recommend ?? {})) {
      if (pid && !ch.packIds.includes(pid)) {
        bad(`${oid}/${ch.id}: recommends "${pid}" for ${circle}, which the chapter does not offer`)
      }
      if (pid && !M.CIRCLE_BY_ID[circle]) bad(`${oid}/${ch.id}: recommendation for unknown circle "${circle}"`)
    }
    // A per-unit pack with no label renders "4 × ₹2,200 per undefined".
    for (const pid of ch.packIds) {
      const p = M.PACK_BY_ID[pid]
      if (p?.unit === 'unit' && !p.unitLabel) bad(`${oid}/${ch.id}: "${pid}" is per-unit with no unitLabel`)
    }
  }
}
console.log(`   ${Object.values(M.BLUEPRINTS).reduce((n, b) => n + b.chapters.length, 0)} chapters checked`)

/* ── 2b · Every `core` id names a chapter that exists ──────────────────────
   `coreChapters` filters the chapter list by id, so a core entry with no
   chapter behind it is not an error — it is simply dropped. That is the worst
   possible failure mode: the office-opening flow silently had no purohit
   because `core` named 'priest' and the corporate blueprint had no priest
   chapter, and nothing anywhere said so.

   `core` may be a function of ctx, so it is probed across the flag
   combinations its own choice chapters can produce, plus the empty one. */
console.log('\n2b · Core lists name real chapters')
{
  let checked = 0
  for (const [oid, bp] of Object.entries(M.BLUEPRINTS)) {
    if (!bp.core) continue
    const ids = new Set(bp.chapters.map(c => c.id))

    // Every flag any of this occasion's choice options can set, tried one at
    // a time and all together — enough to reach every branch a `core`
    // function realistically has.
    const flagSets = [{}]
    for (const ch of bp.chapters.filter(c => c.kind === 'choice')) {
      for (const o of ch.options) flagSets.push({ ...(o.flags ?? {}) })
    }
    flagSets.push(Object.assign({}, ...flagSets))

    for (const flags of flagSets) {
      const ctx = { flags, guests: 150, circleId: 'family', outdoor: false, venueKind: null }
      const core = typeof bp.core === 'function' ? bp.core(ctx) : bp.core
      for (const id of core) {
        if (!ids.has(id)) {
          bad(`${oid}: core names "${id}" but no chapter has that id — it is silently dropped`)
        }
      }
      checked += 1
    }
  }
  console.log(`   ${checked} core lists resolved across every answer`)
}

/* ── 3 · The flow is the right length at both ends ────────────────────── */
console.log('\n3 · Flow length under real answers')
const SCENES = [
  { label: 'small, at home', ctx: { flags: {}, guests: 30, circleId: 'close', outdoor: false } },
  { label: 'the usual hall', ctx: { flags: {}, guests: 150, circleId: 'family', outdoor: false } },
  { label: 'large, outdoor', ctx: { flags: {}, guests: 700, circleId: 'grand', outdoor: true } },
]
for (const [oid] of Object.entries(M.BLUEPRINTS)) {
  const counts = SCENES.map(s => M.chaptersFor(oid, s.ctx).length)
  note(`${oid.padEnd(17)} ${counts.map((c, i) => `${SCENES[i].label}: ${c}`).join('  ')}`)
  // A journey that never gets shorter is a journey whose gating does nothing.
  if (counts[0] >= counts[2]) bad(`${oid}: a 30-guest function is asked as many questions as a 700-guest one — showIf gating is not working`)
  // And one nobody can finish is worse than no journey at all.
  if (counts[2] > 34) bad(`${oid}: ${counts[2]} chapters at the top end — too long to finish`)
}
console.log(`   shortest ${Math.min(...Object.keys(M.BLUEPRINTS).map(o => M.chaptersFor(o, SCENES[0].ctx).length))}, `
  + `longest ${Math.max(...Object.keys(M.BLUEPRINTS).map(o => M.chaptersFor(o, SCENES[2].ctx).length))}`)

/* ── 4 · Pairings point at dishes that exist ──────────────────────────── */
console.log('\n4 · Menu pairings')
const known = new Set()
for (const c of M.CUISINES) for (const list of Object.values(c.courses)) for (const d of list) known.add(d.id)

let leadless = 0
for (const cuisine of M.CUISINES) {
  for (const course of M.COURSES) {
    for (const dish of cuisine.courses[course.id] ?? []) {
      const pairing = M.pairingFor(dish, course.id)
      if (!pairing) { bad(`${cuisine.id}/${dish.id}: no pairing at all — tapping it opens nothing`); continue }
      for (const prompt of pairing.prompts) {
        const r = M.resolvePrompt(prompt, cuisine, { vegOnly: false })
        if (!r.lead.length && !r.rest.length) leadless++
        if (!M.COURSES.some(c => c.id === prompt.course)) bad(`pairing "${pairing.id}" names unknown course "${prompt.course}"`)
      }
    }
  }
}
if (leadless > 0) note(`${leadless} dish/prompt pairs resolve to an empty course (cuisine simply has none — the sheet hides the section)`)
console.log(`   every dish in ${M.CUISINES.length} cuisines opens a pairing sheet`)

/* ── 5 · Circles resolve to real pricing rungs ────────────────────────── */
console.log('\n5 · Guest circles')
for (const circle of M.GUEST_CIRCLES) {
  for (const tid of circle.tiers) {
    if (!M.TIER_BY_ID[tid]) bad(`circle "${circle.id}" names tier "${tid}", which is not on the ladder`)
  }
  if (circle.guests.typical < circle.guests.min || circle.guests.typical > circle.guests.max) {
    bad(`circle "${circle.id}": typical ${circle.guests.typical} is outside its own ${circle.guests.min}–${circle.guests.max} band`)
  }
}
// The bands have to tile without a gap, or a headcount falls through.
for (let i = 1; i < M.GUEST_CIRCLES.length; i++) {
  const prev = M.GUEST_CIRCLES[i - 1], next = M.GUEST_CIRCLES[i]
  if (next.guests.min !== prev.guests.max) {
    bad(`gap or overlap between "${prev.id}" (to ${prev.guests.max}) and "${next.id}" (from ${next.guests.min})`)
  }
}
for (const n of [10, 25, 50, 51, 149, 150, 151, 399, 400, 401, 900, 3000]) {
  const c = M.circleForGuests(n)
  const t = M.pricingTierFor(c.id, n)
  if (!t) bad(`${n} guests resolves to no pricing tier`)
  note(`${String(n).padStart(4)} → ${c.id.padEnd(11)} → ${t.id}`)
}
console.log(`   ${M.GUEST_CIRCLES.length} circles, bands tile cleanly, every headcount prices`)

/* ── 6 · A full journey actually produces a number ────────────────────── */
console.log('\n6 · End-to-end pricing')
for (const [oid, bp] of Object.entries(M.BLUEPRINTS)) {
  for (const scene of SCENES) {
    const chapters = M.chaptersFor(oid, scene.ctx)
    // Answer every service chapter with its recommended pack, or its first.
    const selections = {}
    for (const ch of chapters) {
      if (ch.kind !== 'service') continue
      const pick = ch.recommend?.[scene.ctx.circleId] ?? ch.packIds[0]
      const pack = M.PACK_BY_ID[pick]
      selections[ch.id] = { packIds: [pick], qty: { [pick]: M.defaultPackQty(pack, scene.ctx.guests) } }
    }
    const cuisineId = bp.cuisineLead[0]
    const cuisine = M.CUISINE_BY_ID[cuisineId]
    if (!cuisine) { bad(`${oid}: cuisineLead[0] "${cuisineId}" is not a cuisine`); continue }
    const allowance = M.allowanceFor(scene.ctx.circleId)

    const quote = M.journeyQuote({
      circleId: scene.ctx.circleId, guests: scene.ctx.guests, cuisineId,
      vegOnly: bp.vegDefault ?? true,
      menu: M.defaultMenu(cuisine, allowance, { vegOnly: bp.vegDefault ?? true }),
      decorLevelId: M.CIRCLE_BY_ID[scene.ctx.circleId].defaultDecor,
      themeId: 'traditional_red_gold', addonIds: [], selections,
    }, chapters)

    if (!quote) { bad(`${oid} @ ${scene.label}: produced no quote`); continue }
    if (!Number.isFinite(quote.total) || quote.total <= 0) bad(`${oid} @ ${scene.label}: total is ${quote.total}`)
    if (quote.range.low > quote.range.high) bad(`${oid} @ ${scene.label}: range is inverted`)
    if (quote.perGuest <= 0) bad(`${oid} @ ${scene.label}: per-guest is ${quote.perGuest}`)

    // The lines the customer reads have to add up to the subtotal they are
    // shown. A total that is not the sum of its own rows is the one error
    // that costs a booking on the reveal screen.
    const lineSum = quote.extras.reduce((n, e) => n + e.amount, 0)
    if (lineSum !== quote.extrasTotal) bad(`${oid} @ ${scene.label}: extras rows sum to ${lineSum}, extrasTotal says ${quote.extrasTotal}`)
    const rebuilt = quote.coordination + quote.decor.total + quote.catering.total + quote.servicesTotal + quote.extrasTotal
    if (rebuilt !== quote.subtotal) bad(`${oid} @ ${scene.label}: components sum to ${rebuilt}, subtotal says ${quote.subtotal}`)

    // Nothing over the circle's own allowance should be surcharged — the
    // menu was pre-filled to exactly that allowance.
    if (quote.plate.extraDishes > 0) {
      bad(`${oid} @ ${scene.label}: the pre-filled menu is already ${quote.plate.extraDishes} dishes "over" its own allowance — a surcharge nobody chose`)
    }

    note(`${oid.padEnd(17)} ${scene.label.padEnd(15)} ₹${quote.range.low.toLocaleString('en-IN')}–${quote.range.high.toLocaleString('en-IN')} (₹${quote.perGuest}/guest)`)
  }
}
console.log(`   ${Object.keys(M.BLUEPRINTS).length * SCENES.length} priced journeys, every total reconciles`)

/* ── Verdict ──────────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(56))
if (problems.length) {
  console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`)
  for (const p of problems) console.log('  · ' + p)
  process.exit(1)
}
console.log('All clear — every occasion has a journey, every question has answers,')
console.log('every pairing resolves, and every total adds up to its own lines.')
