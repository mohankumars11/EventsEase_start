#!/usr/bin/env node
/**
 * Everything under the Listing tab, and whether it has an id.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO DIFFERENT QUESTIONS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1. Does the CATALOGUE have an id for this thing?
 *      — is there an SBM- id a database row can carry.
 *
 *   2. Does the partner's SAVED ANSWER use it?
 *      — what actually lands in vendor_services.specs when they submit.
 *
 * The second is the one that matters and the one nobody checks. A
 * catalogue full of ids is worth nothing if the answer stored against a
 * partner is `{ time_limits: ['early'] }`, because 'early' is unique
 * inside its own question and nowhere else: two trades both have one,
 * they mean different things, and neither can be read back without
 * already knowing which question it came from.
 *
 *   node scripts/audit-listing-ids.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const P    = await load('src/data/partnerCatalogue.js')
const S    = await load('src/data/partnerSpecs.js')
const SS   = await load('src/data/partnerServiceSpecs.js')
const OPS  = await load('src/data/partnerOperations.js')
const F    = await load('src/data/cateringFunnel.js')
const C    = await load('src/data/cuisineMenus.js')
const M    = await load('src/data/cateringMenus.js')
const V    = await load('src/config/vendor.js')
const IDS  = await load('src/data/catalogueIds.generated.js')
const DISH = await load('src/data/dishIds.generated.js')

const rows = []
const add = (screen, thing, n, withId) =>
  rows.push({ screen, thing, n, withId, gap: n - withId })

const trades = P.TRADES.map(t => typeof t === 'string' ? t : (t.name ?? t.id))

/* ── screen: trade ─────────────────────────────────────────────────── */
add('trade', 'trades', trades.length,
  trades.filter(t => IDS.tradeIdFor(t)).length)

/* ── screen: offerings ─────────────────────────────────────────────── */
let svc = 0, svcId = 0, vr = 0, vrId = 0
for (const t of trades) {
  for (const o of P.offeringsForTrade(t) ?? []) {
    svc++; if (IDS.serviceIdFor(o.serviceId)) svcId++
    for (const v of o.variants ?? []) {
      const label = typeof v === 'string' ? v : (v.name ?? v.label ?? v.id)
      if (!label) continue
      vr++
      const norm = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '')
      if (IDS.CATALOGUE_ID_BY_KEY[`variant|${o.serviceId}|${norm}`]) vrId++
    }
  }
}
add('offerings', 'services', svc, svcId)
add('offerings', 'service variants', vr, vrId)

/* ── screen: detail (the trade and service spec questions) ─────────── */
const tally = (scope, groups, gAcc, cAcc) => {
  for (const g of groups ?? []) {
    gAcc.n++; if (IDS.questionIdFor(scope, g.id)) gAcc.ok++
    for (const c of g.choices ?? []) {
      cAcc.n++; if (IDS.answerIdFor(scope, g.id, c.id)) cAcc.ok++
    }
  }
}
const gq = { n: 0, ok: 0 }, ga = { n: 0, ok: 0 }
for (const [t, groups] of Object.entries(S.SPECS_BY_TRADE ?? {})) tally(`trade:${t}`, groups, gq, ga)
for (const [s, groups] of Object.entries(SS.SPECS_BY_SERVICE ?? {})) tally(`service:${s}`, groups, gq, ga)
add('detail', 'spec questions', gq.n, gq.ok)
add('detail', 'spec answers', ga.n, ga.ok)

/* ── screen: kitchen ───────────────────────────────────────────────── */
const fq = { n: 0, ok: 0 }, fa = { n: 0, ok: 0 }
tally(F.FUNNEL_SCOPE, F.FUNNEL_QUESTIONS, fq, fa)
add('kitchen', 'funnel questions', fq.n, fq.ok)
add('kitchen', 'funnel answers', fa.n, fa.ok)

/* ── screen: cuisines ──────────────────────────────────────────────── */
const regions = [...new Set((C.CUISINES ?? []).map(c => c.region).filter(Boolean))]
add('cuisines', 'regions', regions.length, regions.length)          // natural key, in catalogue_regions
add('cuisines', 'cuisines', (C.CUISINES ?? []).length, (C.CUISINES ?? []).length)
add('cuisines', 'courses', (C.COURSES ?? []).length, (C.COURSES ?? []).length)

/* ── screens: cuisine:<id> and the libraries ───────────────────────── */
let dish = 0, dishId = 0
for (const c of C.CUISINES ?? []) {
  for (const course of C.COURSES ?? []) {
    for (const d of C.dishesFor(c, course.id) ?? []) {
      dish++
      if (d.sbmId || DISH.dishIdFor(c.id, course.id, d.name ?? d)) dishId++
    }
  }
}
add('cuisine:*', 'dishes offered', dish, dishId)

/* ── screen: menus ─────────────────────────────────────────────────── */
add('menus', 'set menus', (M.ALL_MENUS ?? []).length,
  (M.ALL_MENUS ?? []).filter(m => IDS.menuIdFor(m.id)).length)
let ln = 0, lnId = 0
for (const m of M.ALL_MENUS ?? []) {
  for (const l of M.menuLines(m) ?? []) {
    const text = typeof l === 'string' ? l : (l?.name ?? l?.text ?? String(l))
    if (!text.trim()) continue
    ln++; if (IDS.menuLineIdFor(m.id, text)) lnId++
  }
}
add('menus', 'menu lines', ln, lnId)
add('menus', 'live counters', (M.FOOD_COUNTERS ?? []).length,
  (M.FOOD_COUNTERS ?? []).filter(c => IDS.counterIdFor(c.id)).length)

/* ── screens: ops:<screen>, for every trade ────────────────────────── */
const oq = { n: 0, ok: 0 }, oa = { n: 0, ok: 0 }
let screens = 0, screensId = 0
const seenScreen = new Set()
for (const t of trades) {
  for (const s of OPS.operationScreensFor(t) ?? []) {
    if (!seenScreen.has(s.id)) {
      seenScreen.add(s.id); screens++
      if (IDS.CATALOGUE_ID_BY_KEY[`screen|${s.id}`]) screensId++
    }
    tally(`ops:${t}:${s.id}`, s.groups, oq, oa)
  }
}
add('ops:*', 'operations screens', screens, screensId)
add('ops:*', 'operations questions', oq.n, oq.ok)
add('ops:*', 'operations answers', oa.n, oa.ok)

/* ── screen: price ─────────────────────────────────────────────────── */
add('price', 'pricing units', (V.SERVICE_UNITS ?? []).length,
  (V.SERVICE_UNITS ?? []).filter(u => IDS.unitIdFor(u.id)).length)

/* ══════════════════════════════════════════════════════════════════ */
const w = Math.max(...rows.map(r => r.thing.length))
console.log('\n  THE CATALOGUE · does an id exist for this thing\n')
let missing = 0
for (const r of rows) {
  missing += r.gap
  console.log(`  ${r.gap ? '✗' : '✓'} ${r.thing.padEnd(w)}  ${String(r.withId).padStart(5)} / ${String(r.n).padStart(5)}`
    + `   ${r.screen}${r.gap ? `   ← ${r.gap} with no id` : ''}`)
}
const total = rows.reduce((a, r) => a + r.n, 0)
console.log(`\n  ${total - missing} of ${total} have an id`
  + (missing ? `  ·  ${missing} DO NOT\n` : '\n'))
process.exit(missing ? 1 : 0)
