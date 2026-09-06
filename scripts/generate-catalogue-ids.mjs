#!/usr/bin/env node
/**
 * Permanent ids for everything in the catalogue that is not a dish.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS STILL ANONYMOUS
 * ══════════════════════════════════════════════════════════════════════
 *
 * generate-dish-ids.mjs gave all 915 dishes an id. Three things were left
 * without one, and all three are things a booking will need to point at:
 *
 *   MENUS        15 set menus. They carry slugs like `pl_option_1`, which
 *                are unique but say nothing and were never meant to be
 *                referenced from outside the file.
 *
 *   MENU LINES   ~280 lines of text inside those menus. This is the one
 *                that matters: "the menu card the customer chose" is a
 *                LIST OF LINES, and until each line has an id and a
 *                nullable dish_id beside it, there is nothing to match a
 *                caterer against. It is the bridge between a menu card
 *                and the dish registry, and it does not exist yet.
 *
 *   COUNTERS     7 live counters, priced and bookable.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAME DISCIPLINE AS THE DISH IDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Append-only, keyed by content rather than array position, output
 * committed. An id that has been written into a booking must never be
 * handed to a different thing later — see dishIds.generated.js.
 *
 * Menu lines are keyed `menu-slug|normalised-text`, so reordering the
 * lines inside a menu changes nothing. Two identical lines in one menu
 * collapse to one id, which is correct: they are the same line.
 *
 *   node scripts/generate-catalogue-ids.mjs
 *   node scripts/generate-catalogue-ids.mjs --check
 */
import { build } from 'esbuild'
import { writeFileSync, existsSync } from 'node:fs'

const OUT = 'src/data/catalogueIds.generated.js'
const CHECK = process.argv.includes('--check')

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const M = await load('src/data/cateringMenus.js')
const P = await load('src/data/partnerCatalogue.js')
const S = await load('src/data/partnerSpecs.js')
const SS = await load('src/data/partnerServiceSpecs.js')
const O = await load('src/data/cateringOperations.js')
const OPS = await load('src/data/partnerOperations.js')
const V = await load('src/config/vendor.js')

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

let existing = {}
if (existsSync(OUT)) existing = { ...(await load(OUT)).CATALOGUE_ID_BY_KEY }

const highest = {}
for (const id of Object.values(existing)) {
  const m = /^SBM-([A-Z]{3})-(\d+)$/.exec(id)
  if (m) highest[m[1]] = Math.max(highest[m[1]] ?? 0, Number(m[2]))
}

const assigned = { ...existing }
const fresh = []
const seen = new Set()

function take(prefix, key, label) {
  seen.add(key)
  if (assigned[key]) return assigned[key]
  const next = (highest[prefix] ?? 0) + 1
  highest[prefix] = next
  assigned[key] = `SBM-${prefix}-${String(next).padStart(3, '0')}`
  fresh.push(`${assigned[key]}  ${label}`)
  return assigned[key]
}

/* ── menus, then the lines inside each one ─────────────────────────── */
for (const menu of M.ALL_MENUS) {
  take('MNU', `menu|${menu.id}`, `menu · ${menu.name}`)

  /* menuLines flattens both shapes — `items` on most, `courses` on the
     two buffet options that store theirs by course. Reading .items
     directly is the bug that took the whole flow to the error boundary
     once already. */
  for (const line of M.menuLines(menu)) {
    const text = typeof line === 'string' ? line : (line?.name ?? line?.text ?? String(line))
    if (!norm(text)) continue
    take('MLN', `line|${menu.id}|${norm(text)}`, `line · ${menu.id} · ${text}`)
  }
}

/* ── counters ──────────────────────────────────────────────────────── */
for (const c of M.FOOD_COUNTERS ?? []) {
  take('CTR', `counter|${c.id}`, `counter · ${c.name}`)
}

/* ══════════════════════════════════════════════════════════════════
   THE LISTING TAB
   ══════════════════════════════════════════════════════════════════

   Everything a partner touches while listing what they do. None of it
   had an identity a database could hold:

     TRADES        24, and they are plain STRINGS. "Catering & Food" is
                   the primary key of the whole listing flow, typed out
                   in twenty places. One renamed trade orphans every
                   listing under it, silently.

     SERVICES      62 offerings. serviceId is unique and readable, and
                   it stays the natural key — but it is not stable
                   against a rename either.

     QUESTIONS     46 spec groups and 198 choices, plus the per-service
                   ones. A choice id like 'veg' is unique inside its own
                   group and nowhere else, so a partner's stored answer
                   cannot be read without knowing which group it came
                   from. That is the bug that makes answers unqueryable.

     OPERATIONS    7 screens, 14 groups — the catering ones.

     UNITS         8 ways of pricing.
   ══════════════════════════════════════════════════════════════════ */

/* ── trades ──────────────────────────────────────────────────────── */
for (const t of P.TRADES) {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  take('TRD', `trade|${norm(name)}`, `trade · ${name}`)
}

/* ── services, and the variants under them ───────────────────────── */
for (const t of P.TRADES) {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  for (const o of P.offeringsForTrade(name) ?? []) {
    take('SVC', `service|${o.serviceId}`, `service · ${name} · ${o.name}`)
    for (const vr of o.variants ?? []) {
      const label = typeof vr === 'string' ? vr : (vr.name ?? vr.label ?? vr.id)
      if (label) take('VAR', `variant|${o.serviceId}|${norm(label)}`, `variant · ${o.name} · ${label}`)
    }
  }
}

/* ── the questions, and every answer they offer ──────────────────── */
function takeGroups(scope, groups) {
  for (const g of groups ?? []) {
    /* Scoped by where the group LIVES. Two trades can both ask
       "How many people?" under the id 'team_size', and they are two
       different questions with two different answer sets. */
    take('SPG', `group|${scope}|${g.id}`, `question · ${scope} · ${g.question ?? g.id}`)
    for (const c of g.choices ?? []) {
      take('SPC', `choice|${scope}|${g.id}|${c.id}`, `answer · ${g.id} · ${c.label ?? c.id}`)
    }
  }
}

for (const [trade, groups] of Object.entries(S.SPECS_BY_TRADE ?? {})) {
  takeGroups(`trade:${trade}`, groups)
}
for (const [serviceId, groups] of Object.entries(SS.SPECS_BY_SERVICE ?? {})) {
  takeGroups(`service:${serviceId}`, groups)
}

/* ── the operations screens, for EVERY trade ─────────────────────────
   Scoped by trade as well as screen. "Scale" means hours and
   deliverables to a photographer and square feet to a tent supplier —
   the same screen, a different question, and they must never share an
   id or a partner's answer becomes unreadable.

   The screens themselves are registered once, because the six in the
   spine are genuinely shared. Only the questions inside them differ. */
for (const screen of OPS.OPERATION_SPINE ?? []) {
  take('OPS', `screen|${screen.id}`, `screen · ${screen.title}`)
}
for (const screen of O.OPERATION_SCREENS ?? []) {
  take('OPS', `screen|${screen.id}`, `screen · ${screen.title ?? screen.id}`)
}
for (const t of P.TRADES) {
  const name = typeof t === 'string' ? t : (t.name ?? t.id)
  for (const screen of OPS.operationScreensFor(name) ?? []) {
    takeGroups(`ops:${name}:${screen.id}`, screen.groups)
  }
}

/* ── how a thing is priced ───────────────────────────────────────── */
for (const u of V.SERVICE_UNITS ?? []) {
  take('UNT', `unit|${norm(u.id)}`, `unit · ${u.id}`)
}

const gone = Object.keys(existing).filter(k => !seen.has(k))
const count = p => Object.values(assigned).filter(v => v.startsWith(`SBM-${p}-`)).length

console.log(`\n  catering  ${count('MNU')} menus · ${count('MLN')} lines · ${count('CTR')} counters`)
console.log(`  listing   ${count('TRD')} trades · ${count('SVC')} services · ${count('VAR')} variants`)
console.log(`  questions ${count('SPG')} groups · ${count('SPC')} answers · ${count('OPS')} ops screens · ${count('UNT')} units`)
console.log(`  ${fresh.length} newly assigned, ${gone.length} no longer in the catalogue`)
if (fresh.length) console.log('\n' + fresh.slice(0, 8).map(l => '    ' + l).join('\n'))

if (CHECK) {
  if (fresh.length) {
    console.error(`\n  ${fresh.length} thing(s) have no id.`)
    console.error(`  Run: node scripts/generate-catalogue-ids.mjs\n`)
    process.exit(1)
  }
  console.log('\n  Everything in the catalogue has an id.\n')
  process.exit(0)
}

const lines = Object.keys(assigned).sort().map(k =>
  `  ${JSON.stringify(k)}: ${JSON.stringify(assigned[k])},`)

writeFileSync(OUT, `// GENERATED by scripts/generate-catalogue-ids.mjs — do not edit by hand.
//
// Permanent ids for the catalogue's menus, menu lines and live counters.
// Dishes are in dishIds.generated.js; these are everything else a booking
// can point at.
//
//   SBM-MNU-###   a set menu
//   SBM-MLN-###   one line inside a menu — the bridge to a dish id
//   SBM-CTR-###   a live counter
//
// Keys are content-based (\`menu|slug\`, \`line|menu-slug|normalised-text\`,
// \`counter|slug\`) so reordering the source changes nothing.
//
// ── Append-only, and the file is committed ───────────────────────────
// An id written into a booking must never later mean something else.
// Entries for things no longer in the catalogue are KEPT rather than
// freed, because freeing a number is how it gets reused.
//
// Regenerate:  node scripts/generate-catalogue-ids.mjs
// Verify:      node scripts/generate-catalogue-ids.mjs --check

export const CATALOGUE_ID_BY_KEY = {
${lines.join('\n')}
}

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** The id for a set menu, by its slug. */
export const menuIdFor = slug => CATALOGUE_ID_BY_KEY[\`menu|\${slug}\`] ?? null

/** The id for one line inside a menu. */
export const menuLineIdFor = (menuSlug, text) =>
  CATALOGUE_ID_BY_KEY[\`line|\${menuSlug}|\${norm(text)}\`] ?? null

/** The id for a live counter, by its slug. */
export const counterIdFor = slug => CATALOGUE_ID_BY_KEY[\`counter|\${slug}\`] ?? null

/** The id for a trade, by its name — trades ARE their names in the code. */
export const tradeIdFor = name => CATALOGUE_ID_BY_KEY[\`trade|\${norm(name)}\`] ?? null

/** The id for a service, by its serviceId. */
export const serviceIdFor = sid => CATALOGUE_ID_BY_KEY[\`service|\${sid}\`] ?? null

/**
 * The id for a question.
 *
 * \`scope\` is where the group lives — \`trade:Catering & Food\`,
 * \`service:emcee\`, \`ops:limits\`. Two trades can ask the same-looking
 * question under the same group id and mean different things, so the
 * scope is part of the identity rather than a hint.
 */
export const questionIdFor = (scope, groupId) =>
  CATALOGUE_ID_BY_KEY[\`group|\${scope}|\${groupId}\`] ?? null

/** The id for one answer to one question. */
export const answerIdFor = (scope, groupId, choiceId) =>
  CATALOGUE_ID_BY_KEY[\`choice|\${scope}|\${groupId}|\${choiceId}\`] ?? null

/** The id for a pricing unit. */
export const unitIdFor = id => CATALOGUE_ID_BY_KEY[\`unit|\${norm(id)}\`] ?? null
`, 'utf8')

console.log(`\n  wrote ${OUT}\n`)
