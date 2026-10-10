#!/usr/bin/env node
/**
 * The catering draft upgrade loses nothing (spec Part 3).
 *   node scripts/check-catering-draft-migration.mjs
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'node_modules/.cache'); mkdirSync(CACHE, { recursive: true })
const OUT = join(CACHE, 'catering-draft.mjs')
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [join(ROOT, 'src/lib/cateringDraft.js'), '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`, '--log-level=error'], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }
const { migrateCateringDraft, parseServing } = await import(pathToFileURL(OUT).href)

let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? '✓' : '✗'} ${n}${c ? '' : `   <-- ${JSON.stringify(d)}`}`) }

/* Fixtures shaped exactly like the old CatalogueEditor draft. */
const OLD = {
  basics: { display_name: 'Annapoorna Caterers' }, location: { city: 'Bengaluru' }, answers: { food_service: ['vegetarian'] },
  catalogue: [
    { item_key: 'menu_lx1', answers: { name: 'Badam Alva', meal_category: 'dessert', diet: 'vegetarian', serving_size: '100 g', allergens: 'Almonds, milk, ghee', pricing: 'per_counter', price: 450000 } },
    { item_key: 'menu_lx2', answers: { name: 'Bisi Bele Bath', meal_category: 'rice', diet: 'vegetarian', serving_size: '1 plate', pricing: 'per_person', price: 9000, min_qty: 50 } },
    { item_key: 'menu_lx3', answers: { name: 'Paneer Butter Masala', meal_category: 'main_course', diet: 'vegetarian', serving_size: 'a ladle', pricing: 'included_in_a_menu' } },
    { item_key: 'menu_lx4', answers: { name: 'Gobi Manchurian', meal_category: 'starter', diet: 'vegetarian', pricing: 'per_person' } },
    { item_key: 'menu_lx5', answers: { name: 'Wedding Lunch', meal_category: 'full_menu', diet: 'vegetarian', pricing: 'per_person', price: 35000, description: '18 items' } },
    { item_key: 'menu_lx6', answers: { name: 'Chicken 65', meal_category: 'starter', diet: 'non_vegetarian', serving_size: '6 pieces', pricing: 'per_person', price: 15000 } },
  ],
  availability: { min_notice_days: 3 }, booking: { advance_pct: 30 },
}

const v2 = migrateCateringDraft(structuredClone(OLD))
const keysBefore = OLD.catalogue.map(i => i.item_key).sort()
const keysAfter = [...v2.dishes.map(d => d.item_key), ...v2.menus.map(m => m.menu_key)].sort()
ok('every item_key survives (dishes + menus)', JSON.stringify(keysBefore) === JSON.stringify(keysAfter), { keysBefore, keysAfter })
ok('record count preserved: 5 dishes + 1 draft menu', v2.dishes.length === 5 && v2.menus.length === 1, [v2.dishes.length, v2.menus.length])
ok('no duplicate ids', new Set(keysAfter).size === keysAfter.length)
ok('the untouched original is kept for audit', JSON.stringify(v2._legacy_catalogue) === JSON.stringify(OLD.catalogue))
ok('other answers untouched (basics, location, booking)', v2.basics.display_name === 'Annapoorna Caterers' && v2.location.city === 'Bengaluru' && v2.booking.advance_pct === 30)

const badam = v2.dishes.find(d => d.item_key === 'menu_lx1')
ok('Badam Alva keeps its name, diet, allergens and serving', badam.name === 'Badam Alva' && badam.diet === 'veg' && badam.allergen_note === 'Almonds, milk, ghee' && badam.serving.qty === 100 && badam.serving.unit === 'g')
ok('"Per counter" is NOT turned into a dish price', badam.standalone.on === false, badam.standalone)
ok('…its counter fee is kept and flagged for review', badam.legacy.counter_price_paise === 450000 && badam.legacy.needs_review === true && badam.pricing_status === 'needs_review', badam.legacy)

const bbb = v2.dishes.find(d => d.item_key === 'menu_lx2')
ok('"Per person" → standalone per serving at the same rate and minimum', bbb.standalone.on && bbb.standalone.unit === 'per_serving' && bbb.standalone.price_paise === 9000 && bbb.standalone.min_qty === 50, bbb.standalone)
ok('…still eligible for menus', bbb.menu_eligible === true)

const pbm = v2.dishes.find(d => d.item_key === 'menu_lx3')
ok('"Included in a menu" → menu-eligible, not sold separately', pbm.menu_eligible && pbm.standalone.on === false)
ok('unclear serving ("a ladle") kept as text and flagged', pbm.serving.qty === null && pbm.serving.legacy_text === 'a ladle' && pbm.legacy.needs_review === true, pbm.serving)

const gobi = v2.dishes.find(d => d.item_key === 'menu_lx4')
ok('per-person with no price → needs_price, no price invented', gobi.pricing_status === 'needs_price' && gobi.standalone.on === false, gobi)

const menu = v2.menus[0]
ok('"Full menu" row → draft menu, price NOT invented (suggestion kept)', menu.menu_key === 'menu_lx5' && menu.price_paise === null && menu.suggested_price_paise === 35000 && menu.status === 'draft', menu)

const ch = v2.dishes.find(d => d.item_key === 'menu_lx6')
ok('non-vegetarian stays non-vegetarian', ch.diet === 'non_veg')
ok('"6 pieces" → 6 × piece', ch.serving.qty === 6 && ch.serving.unit === 'piece', ch.serving)

const again = migrateCateringDraft(structuredClone(v2))
ok('idempotent: migrating twice changes nothing', JSON.stringify(again) === JSON.stringify(v2))
ok('empty / missing draft is safe', migrateCateringDraft(null) === null && migrateCateringDraft({}).dishes.length === 0)

for (const [t, want] of [['150 g', [150, 'g']], ['250ml', [250, 'ml']], ['1 kg', [1, 'kg']], ['2 pcs', [2, 'piece']], ['1 cup', [1, 'cup']], ['some', null]]) {
  const p = parseServing(t)
  ok(`serving "${t}" → ${want ? want.join(' ') : 'unclear'}`, want ? p?.qty === want[0] && p?.unit === want[1] : p === null, p)
}

console.log(`\ncheck-catering-draft-migration: ${ran - bad}/${ran} passed`)
process.exit(bad ? 1 : 0)
