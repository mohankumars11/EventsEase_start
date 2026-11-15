#!/usr/bin/env node
/**
 * Audit — occasion menus (src/customer/lib/occasionMenus.js).
 *
 *   node scripts/audit-occasion-menus.mjs [--quiet]
 *
 * For every one of the 438 occasions, every cuisine family and every diet a
 * customer can choose, composes the menus the app would show and checks:
 *
 *   coverage   at least one family offers 3+ menus for the diet; the local
 *              family (Karnataka, for a Bengaluru event) offers 3+ for veg
 *   size       every menu has 6+ dishes and 3+ courses; names are unique
 *   edition    a Veg/Jain/Satvik menu carries no non-veg dish; Jain and
 *              Satvik carry no dish flagged roots/onion/garlic; a Non-veg
 *              edition carries at least one non-veg dish
 *   fit        a memorial menu has no live counter, ice cream or party dish;
 *              a kids' menu has no fiery dish; a housewarming, griha pravesh,
 *              pooja or memorial never offers a Non-veg edition; no menu's
 *              name carries another occasion's word
 *
 * Writes docs/occasion-menu-audit.md — one table per recipe (the kind of
 * day), with the Karnataka menus it produces, so anyone can read what a
 * naming ceremony or a reception is served. Exits 1 on any finding.
 */
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const quiet = process.argv.includes('--quiet')
const dir = mkdtempSync(join(tmpdir(), 'menu-audit-'))
const entry = join(dir, 'entry.mjs')
const root = process.cwd().replace(/\\/g, '/')
writeFileSync(entry, `
  export { occasionMenus, editionsFor, recipeFor, studioFor, fitsEdition, EDITIONS } from '${root}/src/customer/lib/occasionMenus.js'
  export { profileFor } from '${root}/src/customer/data/occasionProfile.js'
  export { OCCASIONS } from '${root}/src/customer/data/occasions.js'
  export * as C from '${root}/src/customer/data/menuCatalogue.generated.js'
`)
const out = join(dir, 'bundle.mjs')
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', jsx: 'automatic',
  define: { 'import.meta.env': '{}' },
  loader: { '.webp': 'empty', '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /lib\/supabase$/ }, a => ({ path: a.path, namespace: 'stub' }))
    b.onResolve({ filter: /^\.\.\/art\/.*\.webp$/ }, a => ({ path: a.path, namespace: 'x' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = { from() { throw new Error("no db in audit") }, rpc() { throw new Error("no db in audit") } }' }))
    b.onLoad({ filter: /.*/, namespace: 'x' }, () => ({ contents: 'export default ""' }))
  } }] })
const { occasionMenus, editionsFor, recipeFor, studioFor, fitsEdition, EDITIONS, profileFor, OCCASIONS, C } = await import(pathToFileURL(out).href)

/* The catalogue as the app builds it from the bundle (lib/menuStudio fromBundle). */
const cat = {
  source: 'bundle', version: C.VERSION, sections: C.SECTIONS, families: C.FAMILIES, rules: C.RULES,
  dishes: Object.fromEntries(Object.entries(C.DISHES).map(([id, [name, desc, diet, allergens, spice, rootv, format]]) => [id, { id, name, desc, diet, allergens, spice, root: !!rootv, format }])),
  menus: C.MENUS.map(m => ({ ...m, photo: null })),
}

const DIETS = ['veg', 'non_veg', 'mixed', 'jain', 'vegan']
const FIERY = /chilli|chettinad|mirchi|pepper fry|ghee roast|spicy/i
const PARTY = /ice cream|mocktail|cocktail|manchurian|pizza|burger/i
const OCC_WORDS = [['haldi', /haldi/], ['mehendi', /mehendi/], ['sangeet', /sangeet/], ['reception', /reception/], ['wedding', /wedding/], ['engagement', /engagement/], ['housewarming', /housewarming/],
  ['griha', /griha/], ['naming', /naming/], ['seemantha', /seemantha|baby shower/], ['memorial', /memorial/], ['eid', /eid/], ['christmas', /christmas/], ['kids', /kids/], ['anniversary', /anniversary/], ['birthday', /birthday/], ['gala', /gala/], ['school', /school/], ['fest', /fest\b/]]
const NO_NV_FAMILIES = new Set(['home', 'memorial'])

const findings = []
const note = (o, what) => findings.push(`${o.id}: ${what}`)
let checks = 0
const byRecipe = {}
const ev = { time: '12:30', guests: 100 }

for (const o of OCCASIONS) {
  const p = profileFor(o)
  const recipe = recipeFor(o, ev)
  const key = recipe.words.lunch
  byRecipe[key] ??= { recipe, occasions: [], sample: null, families: 0 }
  byRecipe[key].occasions.push(o.name)
  /* A pooja-kind of day never offers non-veg. */
  checks++
  if ((NO_NV_FAMILIES.has(p.family) || (p.family === 'faith' && !/eid|iftar|ramadan/.test(o.id))) && recipe.editions.includes('non_veg')) note(o, `offers a Non-veg edition (${p.family})`)
  for (const diet of DIETS) {
    const ctx = { occasion: o, ev, diet, meal: null, city: 'bengaluru' }
    let famsWith3 = 0
    const names = new Set()
    for (const f of cat.families) {
      const menus = occasionMenus(cat, { ...ctx, family: f.id })
      if (menus.length >= 3) famsWith3++
      if (f.id === 'karnataka' && diet === 'veg') byRecipe[key].sample ??= menus
      for (const m of menus) {
        checks++
        const dishes = m.sections.flatMap(s => s.dishes.map(id => cat.dishes[id]))
        if (dishes.length < 6) note(o, `${f.id} "${m.name}" has only ${dishes.length} dishes`)
        if (m.sections.length < 3) note(o, `${f.id} "${m.name}" has only ${m.sections.length} courses`)
        if (names.has(`${f.id}:${m.name}`)) note(o, `${f.id} repeats the name "${m.name}"`)
        names.add(`${f.id}:${m.name}`)
        /* Edition honesty. */
        const bad = dishes.filter(d => !fitsEdition(d, m.edition))
        if (bad.length) note(o, `${f.id} "${m.name}" (${m.edition}) carries ${bad.map(d => d.name).slice(0, 3).join(', ')}`)
        if (m.edition === 'non_veg' && !dishes.some(d => d.diet !== 'veg')) note(o, `${f.id} "${m.name}" is a Non-veg edition with no non-veg dish`)
        if (m.edition === 'non_veg' && m.base.diet === 'veg') note(o, `${f.id} "${m.name}" serves a pure-veg menu (${m.base.name}) as non-veg`)
        if (editionsFor(cat, m, recipe).some(e => e.id === 'non_veg') && m.base.diet === 'veg') note(o, `${f.id} "${m.name}" offers a Non-veg edition of a pure-veg menu`)
        /* Fit to the day. */
        if (p.family === 'memorial') {
          if (m.sections.some(s => ['live', 'icecream', 'welcome'].includes(s.id))) note(o, `${f.id} "${m.name}" has a party course on a memorial`)
          if (dishes.some(d => PARTY.test(d.name))) note(o, `${f.id} "${m.name}" has a party dish on a memorial`)
        }
        if (['kids', 'teen'].includes(p.age) && p.family === 'birthday' && dishes.some(d => FIERY.test(`${d.name} ${d.desc ?? ''}`))) note(o, `${f.id} "${m.name}" has a fiery dish on a kids' party`)
        for (const [w, re] of OCC_WORDS) if (re.test(m.name.toLowerCase()) && !re.test(key.toLowerCase()) && !re.test(o.name.toLowerCase())) note(o, `${f.id} "${m.name}" names another occasion (${w})`)
        /* Every edition offered still makes a meal, and keeps its promise. */
        if (f.id === 'karnataka' || f.id === 'north_indian') {
          for (const e of editionsFor(cat, m, recipe)) {
            checks++
            const st = studioFor(cat, m, e.id, { occasion: o, ev })
            const items = st.sections.flatMap(s => s.items.map(i => cat.dishes[i.id]))
            if (items.some(d => !fitsEdition(d, e.id))) note(o, `${f.id} "${m.name}" as ${e.label} breaks the edition`)
          }
        }
      }
    }
    checks++
    if (!famsWith3) note(o, `no family offers 3 menus for ${diet}`)
    if (diet === 'veg') {
      const ka = occasionMenus(cat, { ...ctx, family: 'karnataka' })
      if (ka.length < 3) note(o, `Karnataka offers only ${ka.length} veg menus`)
      byRecipe[key].families = Math.max(byRecipe[key].families, famsWith3)
    }
  }
}

/* ── The report ───────────────────────────────────────────────────── */
if (!quiet) {
  const L = []
  L.push('# Occasion menus — audit', '', `Generated by \`node scripts/audit-occasion-menus.mjs\` on ${new Date().toISOString().slice(0, 10)}.`, '',
    `${OCCASIONS.length} occasions · ${Object.keys(byRecipe).length} kinds of day · ${cat.families.length} cuisine families · ${checks.toLocaleString('en-IN')} checks · ${findings.length} findings.`, '',
    'Every menu is a Sambramo template re-set to the kind of day: the courses such a day runs, how many dishes each carries, the dishes it is known for, and what never belongs. Editions (Veg · Non-veg · Jain · Satvik) are filtered dish by dish on the catalogue’s own flags; the caterer still confirms.', '')
  for (const [key, r] of Object.entries(byRecipe).sort((a, b) => b[1].occasions.length - a[1].occasions.length)) {
    L.push(`## ${key}`, '', `**Occasions (${r.occasions.length}):** ${r.occasions.slice(0, 12).join(', ')}${r.occasions.length > 12 ? ` … and ${r.occasions.length - 12} more` : ''}`, '',
      `Courses: ${Object.entries(r.recipe.plan).map(([s, n]) => `${s} ×${n}`).join(', ')} · Editions: ${r.recipe.editions.join(', ')} · Families with 3+ menus: ${r.families}`, '')
    if (r.sample?.length) {
      L.push('| Karnataka menu (veg) | Dishes | Known for |', '|---|---|---|')
      for (const m of r.sample) L.push(`| ${m.name} | ${m.sections.reduce((n, s) => n + s.dishes.length, 0)} | ${m.highlights.join(', ')} |`)
      L.push('')
    }
  }
  if (findings.length) { L.push('## Findings', '', ...findings.map(f => `- ${f}`), '') }
  writeFileSync('docs/occasion-menu-audit.md', L.join('\n'))
}

console.log(`${checks.toLocaleString('en-IN')} checks across ${OCCASIONS.length} occasions and ${cat.families.length} families · ${findings.length} findings`)
for (const f of findings.slice(0, 40)) console.log('  ✗ ' + f)
if (findings.length > 40) console.log(`  … ${findings.length - 40} more`)
if (!findings.length) console.log('✓ every occasion has menus written for its kind of day, in honest editions, for all ' + OCCASIONS.length)
process.exit(findings.length ? 1 : 0)
