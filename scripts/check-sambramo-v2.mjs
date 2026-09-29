import { VENDOR_CATEGORIES, TRADE_FOR_SERVICE } from '../src/config/vendor.js'
import { SERVICE_BY_ID } from '../src/data/servicePricing.js'
import { LOGISTICS_SERVICE_SPECS, LOGISTICS_TRADES, logisticsSpecsForServices } from '../src/data/logisticsPartnerSpecsV2.js'
import { PARTNER_QUESTIONNAIRE_V2_RULES, reconcilePartnerQuestionGroups } from '../src/data/sambramoPartnerQuestionnaireV2Rules.js'
import { operationScreensFor } from '../src/data/partnerOperations.js'

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

const logisticsServices = Object.keys(LOGISTICS_SERVICE_SPECS)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(VENDOR_CATEGORIES.length === 34, `Expected 34 partner trades, got ${VENDOR_CATEGORIES.length}`)
for (const trade of expectedTrades) assert(VENDOR_CATEGORIES.includes(trade), `Missing trade: ${trade}`)

const mappedTrades = new Set(Object.values(TRADE_FOR_SERVICE))
for (const trade of expectedTrades) {
  assert(mappedTrades.has(trade), `Trade has no customer-service mapping: ${trade}`)
}

for (const id of logisticsServices) {
  assert(SERVICE_BY_ID[id], `Missing customer catalogue service: ${id}`)
}

assert(LOGISTICS_TRADES.size === 8, 'Expected 8 logistics trades')
for (const trade of LOGISTICS_TRADES) {
  const screens = operationScreensFor(trade)
  assert(screens.length >= 6, `Logistics trade lacks shared operations spine: ${trade}`)
}

const logisticsQuestionCounts = Object.fromEntries(
  Object.entries(LOGISTICS_SERVICE_SPECS).map(([id, groups]) => [id, groups.length]),
)
assert(Object.values(logisticsQuestionCounts).every(n => n >= 3), 'Every logistics offering needs >=3 capability questions')

const sample = [
  { id: 'notice', question: 'Duplicate notice', type: 'one', choices: [{ id: '1', label: 'One day' }] },
  { id: 'vehicle_class', question: 'Vehicle class', type: 'one', choices: [{ id: 'mini', label: 'Mini' }] },
]
const reconciled = reconcilePartnerQuestionGroups(sample)
assert(!reconciled.some(g => g.id === 'notice'), 'Shared notice question leaked into trade detail')

assert(PARTNER_QUESTIONNAIRE_V2_RULES.version === '1.2.0', 'Wrong questionnaire schema version')
assert(PARTNER_QUESTIONNAIRE_V2_RULES.tradeSpecificRowCount === 229, 'Unexpected reconciled trade-row count')

const expectedBoundary = {
  E12: ['event_car','chauffeur','guest_transfer'],
  L01: ['small_goods_movement'],
  L02: ['heavy_goods_movement','bulk_event_cargo'],
  L03: ['bus','tempo_traveller','van','group_shuttle','multi_stop_guest_transport'],
}
for (const [id, expected] of Object.entries(expectedBoundary)) {
  const got = PARTNER_QUESTIONNAIRE_V2_RULES.tradeBoundaries[id]?.scope ?? []
  for (const value of expected) assert(got.includes(value), `Missing boundary ${id}:${value}`)
}

console.log(JSON.stringify({
  status: 'PASS',
  trades: VENDOR_CATEGORIES.length,
  logisticsTrades: LOGISTICS_TRADES.size,
  logisticsOfferings: logisticsServices.length,
  questionnaireVersion: PARTNER_QUESTIONNAIRE_V2_RULES.version,
  reconciledTradeRows: PARTNER_QUESTIONNAIRE_V2_RULES.tradeSpecificRowCount,
  logisticsQuestionCounts,
}, null, 2))
