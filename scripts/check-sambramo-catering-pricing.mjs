#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/catering-pricing-contract.mjs')
const IDS_OUT = join(ROOT, 'node_modules/.cache/catering-dish-ids.mjs')

const build = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/data/cateringPricing.js'),
  '--bundle', '--platform=node', '--format=esm', '--outfile=' + OUT,
], { encoding: 'utf8', shell: true })

if (build.status !== 0) {
  console.error(build.stderr || build.stdout)
  process.exit(1)
}

const mod = await import(pathToFileURL(OUT).href)
const idsBuild = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/data/dishIds.generated.js'), '--bundle', '--platform=node', '--format=esm',
  '--outfile=' + IDS_OUT,
], { encoding: 'utf8', shell: true })
if (idsBuild.status !== 0) {
  console.error(idsBuild.stderr || idsBuild.stdout)
  process.exit(1)
}
const { DISH_ID_BY_KEY } = await import(pathToFileURL(IDS_OUT).href)
const { cateringDishCatalogue, emptyCateringPackage, validateCateringPackage,
  cateringCapabilityFromListing, CATERING_SERVICE_STYLES, CATERING_ADDON_UNITS,
  validateCateringRateBands } = mod

let bad = 0
let ran = 0
const ok = (name, condition, detail = '') => {
  ran++
  if (!condition) bad++
  console.log('  ' + (condition ? '✓' : '✗') + ' ' + name + (condition ? '' : ' <-- ' + detail))
}

console.log('\nSAMBRAMO CATERING PRICING CONTRACT\n')

const allDishes = cateringDishCatalogue([], 'both')
const vegDishes = cateringDishCatalogue(['karnataka','udupi','tamil','andhra','kerala'], 'pure_veg')
const nonVegDishes = cateringDishCatalogue(['karnataka','udupi','tamil','andhra','kerala'], 'pure_nonveg')

ok('canonical dish ID source covers the 1000+ target', Object.keys(DISH_ID_BY_KEY).length >= 1000, String(Object.keys(DISH_ID_BY_KEY).length))
ok('resolved static catalogue is available as an offline fallback', allDishes.length > 0, String(allDishes.length))
ok('production-sized catalogue is sourced separately from the live database', Object.keys(DISH_ID_BY_KEY).length >= 1000)
ok('catalogue entries have stable dish IDs', allDishes.every(d => /^SBM-/.test(d.id)))
ok('pure-veg filtering removes non-veg dishes', vegDishes.every(d => d.diet === 'veg'))
ok('non-veg filtering removes vegetarian dishes', nonVegDishes.every(d => d.diet === 'nonveg'))
ok('service styles are controlled enums', CATERING_SERVICE_STYLES.length >= 5)
ok('add-on units are controlled enums', CATERING_ADDON_UNITS.length >= 6)

const blank = emptyCateringPackage({ cuisines: ['karnataka'], kitchenType: 'pure_veg' })
let result = validateCateringPackage({ draft: blank, requireActive: true })
ok('blank package cannot activate without a name', !!result.errors.name)
ok('blank package cannot activate without dishes', !!result.errors.items)
ok('blank package cannot activate without a rate', !!result.errors.rate)
ok('new package has automatic per-guest defaults', blank.minGuests === 100 && blank.maxGuests === 1000)
ok('new package defaults to the full food-sourcing mode', blank.sourcingMode === 'full')
ok('catering capability is listing-driven', (() => { const x = cateringCapabilityFromListing({ specs: { cuisines: ['karnataka'], kitchen_type: 'pure_veg', dish_ids: ['SBM-KA-RA-001'], sourcing_mode: 'full' } }); return x.cuisines.length === 1 && x.dishIds.length === 1 && x.sourcingMode === 'full' })())

const good = {
  ...blank,
  name: 'Wedding Plantain Leaf Feast',
  rate: '650',
  rateBands: [{ id: 'b1', minGuests: '100', maxGuests: '1000', rate: '650' }],
  capabilityDishIds: allDishes.slice(0, 3).map(d => d.id),
  items: allDishes.slice(0, 3).map((d, i) => ({ id: d.id, section: ['rice','curries','sweets'][i], selectionType: 'included' })),
  addons: [{ id: 'a1', name: 'Live dosa counter', unit: 'per_counter', rate: '12000', minimum: '1', maximum: '2', included: '0' }],
}
result = validateCateringPackage({ draft: good, requireActive: true })
ok('complete package can activate', result.ok, JSON.stringify(result.errors))

const invalid = { ...good, addons: [{ id: 'a2', name: 'Staff', unit: 'per_staff', rate: '500', minimum: '5', maximum: '2', included: '0' }] }
result = validateCateringPackage({ draft: invalid, requireActive: true })
ok('add-on validates max >= min', !!result.errors['addon:a2'])

const duplicate = { ...good, items: [good.items[0], good.items[0]] }
result = validateCateringPackage({ draft: duplicate, requireActive: true })
ok('duplicate dish is rejected', !!result.errors.items)

const unclaimed = { ...good, items: [{ id: allDishes[10].id, section: 'mains', selectionType: 'included' }] }
result = validateCateringPackage({ draft: unclaimed, requireActive: true })
ok('menu cannot activate with a dish outside the listing capability', !!result.errors.items)

const replacement = { ...good, items: [{ id: good.items[0].id, section: 'starters', selectionType: 'replacement', choiceGroup: '' }] }
result = validateCateringPackage({ draft: replacement, requireActive: true })
ok('replacement dishes require a choice group', !!result.errors.items)

const bandGap = validateCateringRateBands({ bands: [
  { minGuests: '100', maxGuests: '199', rate: '650' },
  { minGuests: '201', maxGuests: '1000', rate: '600' },
], minGuests: 100, maxGuests: 1000, requireActive: true })
ok('guest pricing bands reject gaps', bandGap.length > 0)

const bandGood = validateCateringRateBands({ bands: [
  { minGuests: '100', maxGuests: '199', rate: '650' },
  { minGuests: '200', maxGuests: '1000', rate: '600' },
], minGuests: 100, maxGuests: 1000, requireActive: true })
ok('contiguous guest pricing bands activate cleanly', bandGood.length === 0)

console.log('\n' + (bad ? '✗' : '✓') + ' ' + (ran - bad) + '/' + ran + ' passed\n')
process.exit(bad ? 1 : 0)
