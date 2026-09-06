#!/usr/bin/env node
/**
 * Write the catalogue and the listing tab into SQL.
 *
 * Reads the JavaScript in src/data — which stays the source — and emits
 * supabase/migrations/107_catalogue_seed.generated.sql, ready to paste
 * into the Supabase SQL editor like every other migration here.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A GENERATED .sql AND NOT A SCRIPT THAT WRITES TO THE DATABASE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migrations in this project are applied by hand, deliberately: somebody
 * reads them before they run. A seeder that connects and writes 2,000
 * rows is a thing nobody reads and nobody can diff.
 *
 * A generated file can be reviewed, committed, and re-run. Every
 * statement is an upsert on the id, so applying it twice changes
 * nothing and applying it after a catalogue edit updates exactly what
 * moved.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING IS EVER DELETED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A dish removed from the source is NOT removed from the table — it is
 * marked is_active = false. Bookings and listings reference these ids,
 * and deleting a row somebody points at is how a listing ends up
 * claiming something that no longer exists, with no way to find out
 * what it was.
 *
 *   node scripts/generate-catalogue-seed.mjs
 */
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'

const OUT = 'supabase/migrations/107_catalogue_seed.generated.sql'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const C  = await load('src/data/cuisineMenus.js')
const R  = await load('src/data/dishRegistry.js')
const M  = await load('src/data/cateringMenus.js')
const P  = await load('src/data/partnerCatalogue.js')
const S  = await load('src/data/partnerSpecs.js')
const SS = await load('src/data/partnerServiceSpecs.js')
const O  = await load('src/data/cateringOperations.js')
const OPS = await load('src/data/partnerOperations.js')
const V  = await load('src/config/vendor.js')
const IDS = await load('src/data/catalogueIds.generated.js')

/** A SQL literal. Never interpolate a raw string into SQL. */
const q = v => {
  if (v === null || v === undefined || v === '') return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

const out = []
const counts = {}
function section(title) { out.push('', `-- ── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`) }

/**
 * One upsert.
 *
 * `ON CONFLICT (id) DO UPDATE` and not DO NOTHING: re-running after a
 * catalogue edit has to carry the edit through, or the file silently
 * stops being the truth.
 */
function upsert(table, row, key = 'id') {
  const cols = Object.keys(row)
  const vals = cols.map(c => q(row[c]))
  const sets = cols.filter(c => c !== key).map(c => `${c} = EXCLUDED.${c}`)
  counts[table] = (counts[table] ?? 0) + 1
  out.push(`INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${vals.join(', ')})`
    + `\n  ON CONFLICT (${key}) DO UPDATE SET ${sets.join(', ')};`)
}

/* ══════════════════════════════════════════════════════════════════════
   105 · THE CATALOGUE
   ══════════════════════════════════════════════════════════════════════ */

section('regions')
const regions = [...new Set(C.CUISINES.map(c => c.region).filter(Boolean))]
regions.forEach((r, i) => upsert('catalogue_regions', { id: r, label: r, sort_order: i }))

section('courses')
C.COURSES.forEach((c, i) =>
  upsert('catalogue_courses', { id: c.id, label: c.label, hint: c.hint ?? null, sort_order: i }))

section('cuisines')
C.CUISINES.forEach((c, i) => upsert('catalogue_cuisines', {
  id: c.id, name: c.name, local_name: c.localName ?? null, emoji: c.emoji ?? null,
  region_id: c.region ?? null, blurb: c.blurb ?? null,
  base_plate: c.basePlate ?? null, has_non_veg: c.hasNonVeg === true,
  sort_order: i, is_active: true,
}))

section('dishes')
/* The registry's 144 first, so their curated note and diet win where the
   same dish also appears in cuisineMenus. */
const REGISTRY_COURSE = Object.fromEntries(R.COURSE_CATEGORIES.map(c => [c.id, c.maps]))
const seenDish = new Set()
for (const d of R.DISHES) {
  seenDish.add(d.id)
  upsert('catalogue_dishes', {
    id: d.id, cuisine_id: d.cuisine, course_id: REGISTRY_COURSE[d.course] ?? 'starters',
    name: d.name, note: d.note ?? null, diet: d.diet, delta: 0,
    source: 'registry', is_active: d.active !== false,
  })
}
for (const c of C.CUISINES) {
  for (const courseId of Object.keys(c.courses ?? {})) {
    for (const d of C.dishesFor(c, courseId)) {
      if (!d.sbmId || seenDish.has(d.sbmId)) continue
      seenDish.add(d.sbmId)
      upsert('catalogue_dishes', {
        id: d.sbmId, cuisine_id: c.id, course_id: courseId,
        name: d.name, note: d.note ?? null,
        diet: d.veg === false ? 'nonveg' : 'veg',
        delta: Number(d.delta ?? 0) || 0,
        source: 'catalogue', is_active: true,
      })
    }
  }
}

section('set menus')
for (const m of M.ALL_MENUS) {
  const id = IDS.menuIdFor(m.id)
  if (!id) continue
  upsert('catalogue_menus', {
    id, slug: m.id, name: m.name, tier: m.tier ?? null, scan: m.scan ?? null,
    from_price: m.fromPrice ?? null, min_pax: m.minPax ?? null,
    diet: m.diet === 'nonveg' ? 'nonveg' : 'veg', is_active: true,
  })
}

section('menu lines')
for (const m of M.ALL_MENUS) {
  const menuId = IDS.menuIdFor(m.id)
  if (!menuId) continue
  let n = 0
  const emitted = new Set()
  for (const raw of M.menuLines(m)) {
    const text = typeof raw === 'string' ? raw : (raw?.name ?? raw?.text ?? String(raw))
    const id = IDS.menuLineIdFor(m.id, text)
    /* Two identical lines in one menu share an id — they are the same
       line — so the second occurrence is skipped rather than fighting
       the first for the row. */
    if (!id || emitted.has(id)) continue
    emitted.add(id)
    upsert('catalogue_menu_lines', {
      id, menu_id: menuId, course_id: null, line_no: ++n, text,
      dish_id: null,
      /* "Paal Payasa OR Sabbakki Mango Payasa" is two dishes and a
         choice. Flagged so whoever resolves dish_id later knows this one
         needs a decision rather than a lookup. */
      has_choice: / OR /i.test(text),
    })
  }
}

section('live counters')
for (const c of M.FOOD_COUNTERS ?? []) {
  const id = IDS.counterIdFor(c.id)
  if (!id) continue
  upsert('catalogue_counters', {
    id, slug: c.id, name: c.name, scan: c.scan ?? null,
    from_price: c.fromPrice ?? null, is_active: true,
  })
}

/* ══════════════════════════════════════════════════════════════════════
   106 · THE LISTING TAB
   ══════════════════════════════════════════════════════════════════════ */

section('trades')
P.TRADES.forEach((t, i) => {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  const id = IDS.tradeIdFor(name)
  if (id) upsert('listing_trades', { id, name, sort_order: i, is_active: true })
})

section('services, and their variants')
for (const t of P.TRADES) {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  const tradeId = IDS.tradeIdFor(name)
  ;(P.offeringsForTrade(name) ?? []).forEach((o, i) => {
    const id = IDS.serviceIdFor(o.serviceId)
    if (!id || !tradeId) return
    upsert('listing_services', {
      id, service_key: o.serviceId, trade_id: tradeId, name: o.name,
      sort_order: i, is_active: true,
    })
    ;(o.variants ?? []).forEach((vr, j) => {
      const label = typeof vr === 'string' ? vr : (vr.name ?? vr.label ?? vr.id)
      if (!label) return
      const vid = IDS.CATALOGUE_ID_BY_KEY[
        `variant|${o.serviceId}|${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '')}`]
      if (vid) upsert('listing_service_variants',
        { id: vid, service_id: id, label, sort_order: j })
    })
  })
}

section('questions, and every answer they offer')
function emitGroups(scope, groups) {
  ;(groups ?? []).forEach((g, i) => {
    const qid = IDS.questionIdFor(scope, g.id)
    if (!qid) return
    upsert('listing_questions', {
      id: qid, scope, group_key: g.id,
      question: g.question ?? g.id, hint: g.hint ?? null,
      answer_type: g.type === 'multi' ? 'multi' : 'one',
      takes_exact: !!g.exact,
      exact_unit: g.exact?.unit ?? null,
      sort_order: i,
    })
    ;(g.choices ?? []).forEach((c, j) => {
      const aid = IDS.answerIdFor(scope, g.id, c.id)
      if (!aid) return
      upsert('listing_answers', {
        id: aid, question_id: qid, answer_key: c.id,
        label: c.label ?? c.id, scan: c.scan ?? null, sort_order: j,
      })
    })
  })
}

for (const [trade, groups] of Object.entries(S.SPECS_BY_TRADE ?? {})) emitGroups(`trade:${trade}`, groups)
for (const [sid, groups] of Object.entries(SS.SPECS_BY_SERVICE ?? {})) emitGroups(`service:${sid}`, groups)

section('operations screens')
/* The screens themselves are shared — six in the spine plus catering's
   own — so they are written once and de-duplicated by id. */
const screenSeen = new Set()
;[...(OPS.OPERATION_SPINE ?? []), ...(O.OPERATION_SCREENS ?? [])].forEach((s, i) => {
  const id = IDS.CATALOGUE_ID_BY_KEY[`screen|${s.id}`]
  if (!id || screenSeen.has(id)) return
  screenSeen.add(id)
  upsert('listing_operation_screens', {
    id, screen_key: s.id, title: s.title ?? s.id, why: s.why ?? null, sort_order: i,
  })
})

section('operations questions, per trade')
/* Scoped by trade AND screen. "Scale" is hours to a photographer and
   square feet to a tent supplier; one scope for both would make a
   partner's answer unreadable without knowing whose it was. */
for (const t of P.TRADES) {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  for (const screen of OPS.operationScreensFor(name) ?? []) {
    emitGroups(`ops:${name}:${screen.id}`, screen.groups)
  }
}

section('pricing units')
;(V.SERVICE_UNITS ?? []).forEach((u, i) => {
  const id = IDS.unitIdFor(u.id)
  if (id) upsert('listing_units', {
    id, unit_key: u.id, suffix: u.suffix ?? null,
    quantity_label: u.quantityLabel ?? null, sort_order: i,
  })
})

/* ══════════════════════════════════════════════════════════════════════
   write it
   ══════════════════════════════════════════════════════════════════════ */

const total = Object.values(counts).reduce((a, b) => a + b, 0)
const summary = Object.entries(counts)
  .map(([t, n]) => `--   ${String(n).padStart(5)}  ${t}`).join('\n')

writeFileSync(OUT, `-- ══════════════════════════════════════════════════════════════════════
-- 107 · The catalogue and the listing tab, as data
-- ══════════════════════════════════════════════════════════════════════
--
-- GENERATED by scripts/generate-catalogue-seed.mjs — do not edit by hand.
-- Regenerate after any change to the catalogue in src/data.
--
-- APPLY BY HAND in Supabase → SQL Editor, AFTER 105 and 106.
-- Re-runnable: every statement is an upsert on the id, so applying it
-- twice changes nothing and applying it after an edit carries the edit
-- through.
--
-- ${total} rows:
--
${summary}
--
-- ── Nothing here deletes ─────────────────────────────────────────────
-- A dish removed from the source is not removed from the table. Bookings
-- and listings reference these ids, and deleting a row somebody points
-- at leaves them claiming something that no longer exists with no way to
-- find out what it was. Retiring is a hand-written
-- \`UPDATE ... SET is_active = FALSE\`, done deliberately.

BEGIN;
${out.join('\n')}

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- CHECK IT
-- ══════════════════════════════════════════════════════════════════════
--
--   SELECT
--     (SELECT count(*) FROM catalogue_dishes)     AS dishes,
--     (SELECT count(*) FROM catalogue_menus)      AS menus,
--     (SELECT count(*) FROM catalogue_menu_lines) AS menu_lines,
--     (SELECT count(*) FROM listing_trades)       AS trades,
--     (SELECT count(*) FROM listing_services)     AS services,
--     (SELECT count(*) FROM listing_questions)    AS questions,
--     (SELECT count(*) FROM listing_answers)      AS answers;
--
--   -- the bridge still to build: which menu lines are not yet a dish
--   SELECT count(*) FILTER (WHERE dish_id IS NULL) AS unresolved,
--          count(*) FILTER (WHERE has_choice)      AS need_a_decision,
--          count(*) AS total
--   FROM catalogue_menu_lines;
`, 'utf8')

console.log(`\n  ${OUT}`)
console.log(`  ${total} rows\n`)
for (const [t, n] of Object.entries(counts)) console.log(`   ${String(n).padStart(5)}  ${t}`)
console.log()

/* ══════════════════════════════════════════════════════════════════════
   AND AGAIN, IN PIECES A SQL EDITOR WILL ACCEPT
   ══════════════════════════════════════════════════════════════════════

   The whole file is 1.3 MB and Supabase's SQL editor refuses it:

     Error: Query is too large to be run via the SQL Editor

   So the same statements are written again, split into parts small
   enough to paste. 107 itself stays the reviewable artefact — one file,
   one diff, and the guard reads it — and the parts are how it is
   actually applied.

   ── The parts are ORDERED, and the order is a foreign key ────────────
   catalogue_dishes references catalogue_cuisines; listing_answers
   references listing_questions. Statements are emitted parent-first and
   the split preserves that sequence, so part 3 pasted before part 2
   fails on a foreign key rather than doing something quiet and wrong.

   Each part is its own BEGIN/COMMIT, so a part that fails rolls back
   whole and can simply be pasted again — every statement is an upsert.
*/
import { mkdirSync, rmSync, readdirSync } from 'node:fs'

const PARTS_DIR = 'supabase/migrations/107_parts'
const BUDGET = 120_000   // bytes of statements per part; the editor refused 1.3 MB

/* Break only BETWEEN entries in `out`. Each entry is a complete
   statement (the INSERT and its ON CONFLICT line are one string), so a
   part can never end mid-statement. */
const parts = []
let cur = []
let size = 0
for (const entry of out) {
  if (size + entry.length > BUDGET && cur.length) { parts.push(cur); cur = []; size = 0 }
  cur.push(entry)
  size += entry.length + 1
}
if (cur.length) parts.push(cur)

rmSync(PARTS_DIR, { recursive: true, force: true })
mkdirSync(PARTS_DIR, { recursive: true })

const stmts = chunk => chunk.filter(l => l.startsWith('INSERT INTO')).length

parts.forEach((chunk, i) => {
  const n = String(i + 1).padStart(2, '0')
  const of = parts.length
  const name = `${PARTS_DIR}/107_${n}_of_${of}.sql`
  writeFileSync(name, `-- ══════════════════════════════════════════════════════════════════════
-- 107 · part ${i + 1} of ${of} — ${stmts(chunk)} rows
-- ══════════════════════════════════════════════════════════════════════
--
-- GENERATED by scripts/generate-catalogue-seed.mjs — do not edit by hand.
-- The whole migration is 107_catalogue_seed.generated.sql; it is too
-- large for the SQL editor in one paste, so it is split here.
--
-- ── PASTE THE PARTS IN ORDER ─────────────────────────────────────────
-- 01, then 02, then 03 … A later part references rows an earlier one
-- creates (a dish needs its cuisine, an answer needs its question), so
-- out of order fails on a foreign key.
--
-- Apply AFTER 105 and 106.
--
-- Safe to re-run: every statement is an upsert on the id, and this part
-- is one transaction — if it fails it rolls back whole, and you paste
-- it again.

BEGIN;
${chunk.join('\n')}

COMMIT;
`, 'utf8')
})

console.log(`  ${PARTS_DIR}/  —  ${parts.length} parts to paste, in order`)
for (const f of readdirSync(PARTS_DIR).sort()) console.log(`     ${f}`)
console.log()
