#!/usr/bin/env node
import { build } from 'esbuild'

const load = async file => {
  const out = await build({ entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const V = await load('src/config/vendor.js')
const P = await load('src/data/partnerCatalogue.js')
const SS = await load('src/data/partnerServiceSpecs.js')
const OPS = await load('src/data/partnerOperations.js')
const IDS = await load('src/data/catalogueIds.generated.js')

const expectedTrades = [
  'Catering & Food','Photography','Videography','Decoration & Floral','Venue','DJ & Music',
  'Live Entertainment','Bridal Makeup & Hair','Wedding Planning','Tent & Furniture',
  'Invitation & Printing','Transportation','Event Lighting','Cake & Desserts','Mehendi Artist',
  'Anchor & MC','Sound & AV','Valet Parking','Security Services','Bar & Beverages',
  'Guest Services','Power & Cooling','Safety & Facilities','Priest & Rituals','Gifts & Favours',
  'Trousseau & Gift Packing','Mini Truck / Pickup','Medium / Large Goods Vehicle',
  'Passenger Transport','Event Equipment Rental','Loading & Unloading Crew','Warehouse / Storage',
  'Event Materials Supplier','End-to-End Event Logistics',
]
const failures = []
const assert = (ok, message) => { if (!ok) failures.push(message) }


assert(V.VENDOR_CATEGORIES.length === 34, `expected 34 trades, got ${V.VENDOR_CATEGORIES.length}`)
assert(P.TRADES.length === 34, `partnerCatalogue resolved ${P.TRADES.length} trades`)
assert(JSON.stringify([...V.VENDOR_CATEGORIES].sort()) === JSON.stringify([...expectedTrades].sort()), 'trade vocabulary drifted')

const serviceIds = Object.keys(V.TRADE_FOR_SERVICE)
assert(!serviceIds.includes('event_equipment_rental'), 'dead event_equipment_rental alias is still dispatchable')
for (const trade of expectedTrades) {
  assert(IDS.tradeIdFor(trade), `missing trade id: ${trade}`)
  const screens = OPS.operationScreensFor(trade)
  assert(screens.length >= 6, `missing operations spine: ${trade}`)
}
for (const serviceId of serviceIds) {
  const trade = V.TRADE_FOR_SERVICE[serviceId]
  assert(P.offeringsForTrade(trade).some(o => o.serviceId === serviceId), `service not offerable: ${serviceId}`)
  assert(SS.SPECS_BY_SERVICE[serviceId], `service lacks questionnaire: ${serviceId}`)
  assert(IDS.serviceIdFor(serviceId), `missing service id: ${serviceId}`)
  for (const group of SS.SPECS_BY_SERVICE[serviceId]) {
    const qid = IDS.questionIdFor(`service:${serviceId}`, group.id)
    assert(qid, `missing question id: service:${serviceId}:${group.id}`)
    for (const choice of group.choices ?? []) {
      assert(
        IDS.answerIdFor(`service:${serviceId}`, group.id, choice.id),
        `missing answer id: service:${serviceId}:${group.id}:${choice.id}`,
      )
    }
  }
}

const logisticsTrades = new Set([
  'Mini Truck / Pickup','Medium / Large Goods Vehicle','Passenger Transport','Event Equipment Rental',
  'Loading & Unloading Crew','Warehouse / Storage','Event Materials Supplier','End-to-End Event Logistics',
])
assert(logisticsTrades.size === 8, 'logistics trade set is not eight')
for (const trade of logisticsTrades) assert(V.VENDOR_CATEGORIES.includes(trade), `missing logistics trade: ${trade}`)

const logisticsServices = {
  'Mini Truck / Pickup': ['mini_truck'],
  'Medium / Large Goods Vehicle': ['goods_vehicle'],
  'Passenger Transport': ['passenger_transport'],
  'Event Equipment Rental': ['event_equipment'],
  'Loading & Unloading Crew': ['loading_crew'],
  'Warehouse / Storage': ['warehouse_storage'],
  'Event Materials Supplier': ['event_materials'],
  'End-to-End Event Logistics': ['event_logistics'],
}
for (const [trade, ids] of Object.entries(logisticsServices)) {
  for (const id of ids) {
    assert(V.TRADE_FOR_SERVICE[id] === trade, `wrong logistics mapping: ${id}`)
    assert(SS.SPECS_BY_SERVICE[id].length >= 3, `logistics questionnaire too short: ${id}`)
  }
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'PASS',
  trades: expectedTrades.length,
  dispatchableServices: serviceIds.length,
  logisticsTrades: logisticsTrades.size,
  generatedTradeIds: expectedTrades.length,
  generatedServiceIds: serviceIds.length,
  logisticsQuestionGroups: Object.values(logisticsServices).flat().reduce((n, id) => n + SS.SPECS_BY_SERVICE[id].length, 0),
}, null, 2))
