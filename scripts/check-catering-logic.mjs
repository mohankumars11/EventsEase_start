/**
 * The catering data, checked for the things that break it quietly.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY EACH OF THESE IS HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every one of them has already gone wrong once, on a live account, and
 * none of them is visible from a build log.
 *
 *   1  ONE VOCABULARY
 *      The partner picked cuisines from a list of nine written for them;
 *      the customer picked from sixteen in data/cuisineMenus.js. Matching
 *      a customer's "Kerala Sadya" against a partner's "South Indian --
 *      everyday" needs a translation table nobody maintains, so the two
 *      lists must be the same ids.
 *
 *   2  EVERY MENU IS READABLE
 *      Plantain-leaf menus store `items`; buffet options 3 and 4 store
 *      `courses`. Every screen read `menu.items.length`, so picking
 *      "North Indian" -- the cuisine that returns exactly those cards --
 *      threw `Cannot read properties of undefined` and took the partner
 *      to the error boundary.
 *
 *   3  THE DIET FILTER MEANS SOMETHING
 *      A pure-vegetarian kitchen must never be shown a non-veg card to
 *      tick. Jain & Satvik and Chaat & Street Food are vegetarian by
 *      definition and must return nothing under 'nonveg' rather than
 *      falling through to everything.
 *
 *   4  NO CUISINE IS A DEAD END
 *      A cuisine that returns zero menus under 'both' is a partner who
 *      ticks their own tradition and is shown an empty screen.
 *
 * Usage:  node scripts/check-catering-logic.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const menus = await load('src/data/cateringMenus.js')
const cuisineCatalogue = await load('src/data/cuisineMenus.js')
const specs = await load('src/data/partnerSpecs.js')
const dishes = await load('src/data/cateringDishes.js')

const fails = []
const line = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
  if (!ok) fails.push(label + (detail ? ` — ${detail}` : ''))
}

console.log('\n  Catering data\n')

// ── 1 · One vocabulary ────────────────────────────────────────────
const partnerCuisines = specs.SPECS_BY_TRADE['Catering & Food']
  .find(g => g.id === 'cuisines').choices.map(c => c.id)
const customerCuisines = cuisineCatalogue.CUISINES.map(c => c.id)

const missing = customerCuisines.filter(c => !partnerCuisines.includes(c))
const extra = partnerCuisines.filter(c => !customerCuisines.includes(c))
line(!missing.length && !extra.length,
  `one cuisine vocabulary (${partnerCuisines.length})`,
  missing.length ? `partner is missing ${missing.join(', ')}`
    : extra.length ? `partner has ${extra.join(', ')} which no customer can ask for` : '')

// ── 2 · Every menu is readable ────────────────────────────────────
const unreadable = menus.ALL_MENUS.filter(m => menus.menuLines(m).length === 0)
line(!unreadable.length, `every menu yields dish lines (${menus.ALL_MENUS.length})`,
  unreadable.map(m => m.name).join(', '))

// ── 3 · The diet filter means something ───────────────────────────
const VEG_ONLY_CUISINES = ['jain_satvik', 'chaat_street', 'gujarati_rajasthani', 'mysuru_royal']
let dietOk = true
for (const c of partnerCuisines) {
  const veg = menus.menusFor({ cuisines: [c], diet: 'veg' })
  if (veg.some(m => m.diet === 'nonveg')) {
    dietOk = false
    fails.push(`${c} + veg returns a non-veg menu`)
  }
  const nv = menus.menusFor({ cuisines: [c], diet: 'nonveg' })
  if (nv.some(m => m.diet !== 'nonveg')) {
    dietOk = false
    fails.push(`${c} + nonveg returns a vegetarian menu`)
  }
  if (VEG_ONLY_CUISINES.includes(c) && nv.length) {
    dietOk = false
    fails.push(`${c} is vegetarian by definition but offers ${nv.length} non-veg menus`)
  }
}
line(dietOk, 'veg / non-veg filtering is exact')

// ── 4 · No cuisine is a dead end ──────────────────────────────────
const dead = partnerCuisines.filter(c => menus.menusFor({ cuisines: [c], diet: 'both' }).length === 0)
line(!dead.length, 'every cuisine offers at least one menu', dead.join(', '))

// ── 5 · Enough non-veg to be worth the name ───────────────────────
const nvMenus = menus.ALL_MENUS.filter(m => m.diet === 'nonveg').length
const nvDishes = dishes.ALL_DISH_GROUPS
  .filter(g => g.id.startsWith('nv_'))
  .reduce((n, g) => n + g.items.length, 0)
line(nvMenus >= 5, `non-veg menus (${nvMenus})`)
line(nvDishes >= 100, `non-veg dishes (${nvDishes})`)

console.log(`\n  ${menus.ALL_MENUS.length} menus · ${dishes.TOTAL_DISHES} dishes · ${dishes.ALL_DISH_GROUPS.length} groups\n`)

if (fails.length) {
  console.error('  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('  Catering data holds together.\n')
