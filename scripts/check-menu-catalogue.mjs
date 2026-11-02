#!/usr/bin/env node
/**
 * The Menu Studio, checked end to end on the code the app runs
 * (src/customer/lib/menuStudio.js over the compiled catalogue) — no
 * network, no login:
 *
 *   1. the twenty scenarios of Mohan's spec (Part 16), each a real
 *      recommendation or menu the customer would get
 *   2. every one of the 438 occasions resolves to a rule and gets at least
 *      four menus, vegetarian and mixed
 *   3. diet integrity: no meat, fish or egg in a vegetarian menu; Jain and
 *      vegan are flags for the caterer, never claimed
 *   4. customising: swap within the diet, remove, add, type — the template
 *      stays untouched, the snapshot marks every change, and the server's
 *      sanitiser (api/_lib/anchorBook.js menuSnapshot) keeps all of it
 *
 *   node scripts/check-menu-catalogue.mjs
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/check-menu-catalogue.mjs')
mkdirSync(dirname(OUT), { recursive: true })
/* The catalogue logic, with the Supabase client stubbed: this check is offline. */
await build({
  stdin: { contents: `export * from './src/customer/lib/menuStudio.js'; export { OCCASIONS, OCCASION } from './src/customer/data/occasions.js'; export { menuSnapshot } from './api/_lib/anchorBook.js'`, resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', jsx: 'automatic', external: ['@supabase/supabase-js'],
  plugins: [{ name: 'stub-supabase', setup(b) { b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: 'stub', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {}' })) } }],
})
const S = await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)
const cat = await S.loadCatalogue({ live: false })
let pass = 0, fail = 0
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  ✗', label) } }
const O = S.OCCASION
const occ = (tpl, cat2) => S.OCCASIONS.find(o => o.template === tpl && (!cat2 || o.category === cat2))
const fam = (f, diet, meal) => S.rankMenus(cat, { occasion: occ('birthday'), diet, meal, family: f })
const dishes = m => m.sections.flatMap(s => s.dishes).map(id => cat.dishes[id])
const menu = id => cat.menus.find(m => m.id === id)
const has = (m, re) => dishes(m).some(d => re.test(d.name))

// ── 1 · the twenty scenarios ────────────────────────────────────────
console.log('Scenarios')
const scen = [
  ['Karnataka vegetarian lunch', () => fam('karnataka', 'veg', 'lunch').slice(0, 4).some(m => m.id === 'ka-traditional-veg-feast') && has(menu('ka-traditional-veg-feast'), /Bisi Bele Bath/)],
  ['Mysore traditional feast', () => { const m = menu('ka-mysore-celebration'); return m.diet === 'veg' && has(m, /Mysore Pak/) && has(m, /Mysore Bonda/) }],
  ['Andhra non-vegetarian dinner', () => fam('andhra', 'non_veg', 'dinner').length >= 2 && fam('andhra', 'non_veg', 'dinner').every(m => m.diet !== 'veg') && has(menu('ap-grand-nonveg'), /Natu Kodi/)],
  ['Telangana celebration menu', () => fam('telangana', 'mixed', 'dinner')[0]?.family === 'telangana' && has(menu('tg-hyderabadi-celebration'), /Mirchi Ka Salan/)],
  ['Kerala Sadya', () => { const m = menu('kl-sadya'); return m.serve.includes('leaf') && ['Avial', 'Olan', 'Kaalan', 'Erissery'].every(n => has(m, new RegExp(n))) && has(m, /Pradhaman/) }],
  ['Tamil vegetarian feast', () => fam('tamil', 'veg', 'lunch').filter(m => m.diet === 'veg').length >= 3],
  ['Punjabi buffet', () => { const m = menu('ni-punjabi-veg-feast'); return m.serve.includes('buffet') && has(m, /Chole/) && has(m, /Dal Makhani/) }],
  ['Gujarati thali', () => { const m = menu('gj-traditional-thali'); return has(m, /Dhokla/) && has(m, /Kadhi/) && has(m, /Shrikhand/) }],
  ['Rajasthani feast', () => has(menu('rj-traditional-thali'), /Baati/) && has(menu('rj-royal-feast'), /Laal Maas/)],
  ['Bengali menu', () => fam('bengali', 'mixed', 'lunch').length >= 4 && has(menu('bn-traditional-feast'), /Shukto/)],
  ['Chinese vegetarian menu', () => { const m = menu('cn-veg-menu'); return m.diet === 'veg' && dishes(m).every(d => d.diet === 'veg') }],
  ['Indo-Chinese mixed menu', () => { const m = menu('cn-indo-mixed'); return dishes(m).some(d => d.diet === 'veg') && dishes(m).some(d => d.diet === 'non_veg') }],
  ['Continental menu', () => fam('continental', 'mixed', 'dinner').length >= 4],
  ['Italian party menu', () => { const m = menu('it-party-menu'); return m.tags.includes('party') && has(m, /Pizza/) }],
  ['Arabic / Middle Eastern menu', () => fam('arabic', 'mixed', 'dinner').length >= 4 && has(menu('ar-mezze'), /Hummus/)],
  ['Mexican party menu', () => has(menu('mx-party'), /Nachos/) && menu('mx-party').diet === 'veg'],
  ['Corporate breakfast', () => S.rankMenus(cat, { occasion: occ('conference', 'corporate'), diet: 'mixed', meal: 'breakfast' }).slice(0, 5).filter(m => m.meals.includes('breakfast')).length >= 3],
  ['Wedding reception buffet', () => S.rankMenus(cat, { occasion: occ('reception'), diet: 'veg', meal: 'dinner', serve: 'buffet' }).slice(0, 5).every(m => m.tags.some(t => ['grand', 'wedding', 'celebration'].includes(t)))],
  ['First birthday dinner', () => S.rankMenus(cat, { occasion: occ('firstBirthday'), diet: 'veg', meal: 'dinner' }).slice(0, 5).every(m => m.tags.some(t => ['family', 'kids', 'party', 'celebration'].includes(t)) && !m.tags.includes('corporate'))],
  ['Naming ceremony lunch', () => S.rankMenus(cat, { occasion: occ('babyRite'), diet: 'veg', meal: 'lunch' }).slice(0, 3).every(m => m.tags.some(t => ['traditional', 'ritual'].includes(t)) && m.meals.includes('lunch'))],
]
for (const [label, f] of scen) { let r = false; try { r = f() } catch (e) { console.log('   ', e.message) } ok(r, label); if (r) console.log('  ✓', label) }

// ── 2 · every occasion ──────────────────────────────────────────────
console.log('Occasions')
let byTemplate = 0, byCategory = 0, thin = []
for (const o of S.OCCASIONS) {
  const r = S.ruleFor(cat, o)
  if (r?.scope === 'template' || r?.scope === 'occasion') byTemplate++
  else if (r?.scope === 'category') byCategory++
  for (const diet of ['veg', 'mixed']) if (S.rankMenus(cat, { occasion: o, diet }).length < 4) thin.push(`${o.id}/${diet}`)
}
ok(byTemplate + byCategory === S.OCCASIONS.length, `every occasion has a rule (${byTemplate + byCategory}/${S.OCCASIONS.length})`)
ok(!thin.length, `every occasion gets ≥4 menus per diet (${thin.slice(0, 5).join(', ')})`)
console.log(`  ✓ ${S.OCCASIONS.length}/${S.OCCASIONS.length} occasions resolve — ${byTemplate} by their own template rule, ${byCategory} by their category rule`)

// ── 3 · diet integrity ──────────────────────────────────────────────
console.log('Diet')
const veg = cat.menus.filter(m => m.diet === 'veg')
ok(veg.every(m => dishes(m).every(d => d.diet === 'veg')), 'vegetarian menus carry no meat, fish or egg')
ok(cat.menus.filter(m => m.diet === 'mixed').every(m => dishes(m).some(d => d.diet === 'veg') && dishes(m).some(d => d.diet !== 'veg')), 'mixed menus carry both')
const by = n => Object.values(cat.dishes).find(d => d.name === n)
for (const [n, d] of [['Chicken 65', 'non_veg'], ['Paneer Tikka', 'veg'], ['Mutta Kuzhambu', 'egg'], ['Hara Bhara Kebab', 'veg'], ['Mochar Chop', 'veg'], ['Kashmiri Seekh Kebab', 'non_veg'], ['Nadru Yakhni', 'veg'], ['Smoked Pork with Bamboo Shoot', 'non_veg']])
  ok(by(n)?.diet === d, `${n} is ${d} (got ${by(n)?.diet})`)
ok(S.rankMenus(cat, { diet: 'jain' }).every(m => m.diet === 'veg') && S.rankMenus(cat, { diet: 'vegan' }).every(m => m.diet === 'veg'), 'Jain and vegan customers see vegetarian menus only')
ok(S.flagsFor(by('Aloo 65'), 'jain').length === 1 && S.flagsFor(by('Paneer Butter Masala'), 'vegan').length === 1 && S.flagsFor(by('Steamed Rice'), 'vegan').length === 0, 'Jain / vegan needs are flagged dish by dish')
ok(S.flagsFor(by('Kaju Paneer Curry'), 'veg', 'no cashews please').some(f => /tree nuts/.test(f)), 'a stated allergy is matched against what a dish usually contains')
console.log(`  ✓ ${veg.length} vegetarian menus clean · flags only, never "vegan" or "Jain" claimed`)

// ── 4 · customising and sending ─────────────────────────────────────
console.log('Customise')
const tpl = menu('ka-traditional-veg-feast')
const before = JSON.stringify(tpl)
const st = { ...S.startFrom(cat, tpl), clientKey: 'check-menu-0001' }
const si = st.sections.findIndex(s => s.id === 'starters')
const alts = S.alternativesFor(cat, st, 'starters', st.sections[si].items[0].id, 'veg')
ok(alts.length > 0 && alts.every(d => d.diet === 'veg'), 'swaps stay within the diet')
const was = st.sections[si].items[0]
st.sections[si].items[0] = { id: alts[0].id, name: alts[0].name, diet: alts[0].diet, replaces: was.name, replacesId: was.id }
st.sections.find(s => s.id === 'desserts').items.pop()
st.sections.find(s => s.id === 'sides').items.push({ id: 'typed:ellu bella', name: 'Ellu Bella', diet: null, typed: true })
const add = S.searchDishes(cat, 'payasam', { diet: 'veg' })[0]
ok(!!add, 'a dish can be found to add')
st.sections.find(s => s.id === 'desserts').items.push({ id: add.id, name: add.name, diet: add.diet })
ok(JSON.stringify(tpl) === before, 'the template is untouched by the customer’s edits')
const snap = S.snapshotFor(cat, st, { diet: 'veg', meal: 'lunch', serve: 'leaf', guests: 100, allergies: 'no peanuts', instructions: 'Less spicy for children', refs: ['https://example.com/a.jpg'] })
const flat = snap.sections.flatMap(s => s.dishes)
ok(flat.some(d => d.c === 'swapped' && d.r === was.name) && flat.some(d => d.c === 'typed') && flat.some(d => d.c === 'added'), 'the snapshot marks swapped, added and typed dishes')
ok(snap.flags.some(f => /peanut/.test(f)), 'the peanut allergy reaches the caterer as a flag')
const kept = S.menuSnapshot(JSON.parse(JSON.stringify(snap)))
ok(kept && kept.sections.flatMap(s => s.dishes).length === flat.length && kept.guests === 100 && kept.refs.length === 1, 'the server keeps the whole menu')
ok(S.menuSnapshot({ sections: [{ id: 'x', dishes: [{ n: 'A'.repeat(500), d: 'beef' }] }], refs: ['http://insecure'] }).sections[0].dishes[0].n.length === 80, 'the server bounds what it stores')
console.log(`  ✓ ${S.dishCount(st)} dishes after edits; snapshot of ${kept.sections.length} sections survives the server`)

const n = cat.menus.length, d = Object.keys(cat.dishes).length
console.log(`\n${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail} · ${cat.families.length} cuisines · ${cat.families.reduce((t, f) => t + f.variants.length, 0)} regional variants · ${n} menus · ${d} dishes`)
process.exit(fail ? 1 : 0)
