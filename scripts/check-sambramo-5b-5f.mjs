#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const load = async file => {
  const out = await build({ entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const V = await load(path.join(ROOT, 'src/config/vendor.js'))
const P = await load(path.join(ROOT, 'src/data/partnerCatalogue.js'))
const PT = await load(path.join(ROOT, 'src/data/partnerSpecs.js'))
const PS = await load(path.join(ROOT, 'src/data/partnerServiceSpecs.js'))
const OPSM = await load(path.join(ROOT, 'src/data/partnerOperations.js'))
const QR = await load(path.join(ROOT, 'src/data/sambramoPartnerQuestionnaireV2Rules.js'))
const LP = await load(path.join(ROOT, 'src/data/logisticsPartnerSpecsV2.js'))
const PR = await load(path.join(ROOT, 'src/data/logisticsPricing.js'))
const MR = await load(path.join(ROOT, 'src/lib/matchingReconciliation.js'))

const { VENDOR_CATEGORIES, TRADE_FOR_SERVICE } = V
const { TRADES } = P
const { specsForTrade } = PT
const { specsForServices } = PS
const { operationScreensFor } = OPSM
const { reconcilePartnerQuestionGroups, filterPartnerQuestionGroups } = QR
const { LOGISTICS_SERVICE_SPECS, LOGISTICS_TRADES, logisticsSpecsForServices } = LP
const { LOGISTICS_PRICING, priceLogisticsLine, platformSplit } = PR
const { TRADE_BOUNDARY_BY_SERVICE, customerMatchRequirements } = MR
const failures = []
const ok = (cond, msg) => cond || failures.push(msg)

const expectedTrades = [
  'Catering & Food','Photography','Videography','Decoration & Floral','Venue','DJ & Music',
  'Live Entertainment','Bridal Makeup & Hair','Wedding Planning','Tent & Furniture',
  'Invitation & Printing','Transportation','Event Lighting','Cake & Desserts','Mehendi Artist',
  'Anchor & MC','Sound & AV','Valet Parking','Security Services','Bar & Beverages','Guest Services',
  'Power & Cooling','Safety & Facilities','Priest & Rituals','Gifts & Favours',
  'Trousseau & Gift Packing','Mini Truck / Pickup','Medium / Large Goods Vehicle','Passenger Transport',
  'Event Equipment Rental','Loading & Unloading Crew','Warehouse / Storage',
  'Event Materials Supplier','End-to-End Event Logistics',
]
ok(TRADES.length === 34, 'expected 34 partner trades, got ' + TRADES.length)
ok(expectedTrades.every(t => VENDOR_CATEGORIES.includes(t)), 'partner vocabulary missing an expected trade')
ok(!VENDOR_CATEGORIES.includes('Other'), 'Other must not be a live trade')
ok(!Object.prototype.hasOwnProperty.call(TRADE_FOR_SERVICE, 'event_equipment_rental'), 'dead event_equipment_rental mapping still exists')

for (const trade of expectedTrades) {
  const groups = reconcilePartnerQuestionGroups(
    LOGISTICS_TRADES.has(trade)
      ? logisticsSpecsForServices(Object.entries(TRADE_FOR_SERVICE).filter(([,t]) => t === trade).map(([id]) => id))
      : specsForServices(Object.entries(TRADE_FOR_SERVICE).filter(([,t]) => t === trade).map(([id]) => id), specsForTrade(trade))
  )
  const ops = operationScreensFor(trade)
  ok(ops.length >= 6, trade + ': shared operations spine incomplete')
  const ids = groups.map(g => g.id)
  ok(ids.length === new Set(ids).size, trade + ': duplicate rendered capability groups remain')
  const conditionalProbe = { id: trade + ':conditional_probe', showWhen: { type: 'detailPresent', field: '__probe' }, choices: [{ id: 'yes', label: 'Yes', showWhen: { type: 'detailIncludes', field: '__mode', value: 'on' } }] }
  ok(filterPartnerQuestionGroups([conditionalProbe], { trade, picked: [], detail: { __probe: '', __mode: 'on' } }).length === 0, trade + ': conditional group should hide when prerequisite is absent')
  ok(filterPartnerQuestionGroups([conditionalProbe], { trade, picked: [], detail: { __probe: 'x', __mode: 'off' } })[0]?.choices.length === 0, trade + ': conditional choice should hide when choice prerequisite is absent')
}

const logistics = Object.keys(LOGISTICS_SERVICE_SPECS)
ok(logistics.length === 8, 'expected 8 logistics service questionnaires, got ' + logistics.length)
for (const serviceId of logistics) {
  const groups = LOGISTICS_SERVICE_SPECS[serviceId]
  ok(groups.length >= 3, serviceId + ': fewer than 3 capability questions')
  const q = customerMatchRequirements({ serviceId, logisticsDemand: {} })
  ok(q.boundaryCode, serviceId + ': missing boundary code')
  const sample = serviceId === 'mini_truck'
    ? { weightKg: 600 }
    : serviceId === 'goods_vehicle'
      ? { vehicleClass: '17ft', weightKg: 3500 }
      : serviceId === 'passenger_transport'
        ? { passengers: 18 }
        : serviceId === 'event_equipment'
          ? { quantity: 10, durationDays: 2 }
          : serviceId === 'loading_crew'
            ? { workers: 6, shiftHours: 10 }
            : serviceId === 'warehouse_storage'
              ? { spaceSqFt: 500, durationDays: 45 }
              : serviceId === 'event_materials'
                ? { orderValue: 8000 }
                : { shipments: 6, scope: 'multi-site consolidation' }
  const a = priceLogisticsLine({ serviceId, demand: sample })
  const b = priceLogisticsLine({ serviceId, demand: JSON.parse(JSON.stringify(sample)) })
  ok(a.ok && a.amountPaise > 0, serviceId + ': deterministic price missing')
  ok(JSON.stringify(a) === JSON.stringify(b), serviceId + ': price engine is not deterministic')
  ok(a.basis?.version === '2026-09-29.1', serviceId + ': missing price-book version')
  const split = platformSplit(a.amountPaise, 0.15)
  ok(split.partnerPaise + split.platformFeePaise === split.grossPaise, serviceId + ': platform split does not reconcile')
}

const boundaryAssertions = {
  E12: ['wedding_car'],
  L01: ['mini_truck','goods_move'],
  L02: ['goods_vehicle'],
  L03: ['passenger_transport'],
  L04: ['event_equipment'],
  L05: ['loading_crew'],
  L06: ['warehouse_storage'],
  L07: ['event_materials'],
  L08: ['event_logistics'],
}
for (const [code, services] of Object.entries(boundaryAssertions)) {
  for (const sid of services) ok(TRADE_BOUNDARY_BY_SERVICE[sid]?.code === code, code + ': wrong service boundary for ' + sid)
}

const androidWorkflow = fs.readFileSync(path.join(ROOT, '.github/workflows/android.yml'), 'utf8')
ok(androidWorkflow.indexOf('npx cap sync android') >= 0 && androidWorkflow.indexOf('./gradlew') > androidWorkflow.indexOf('npx cap sync android'), 'Capacitor sync must precede Gradle packaging')

const sourceChecks = [
  ['api/dispatch-booking.js', /match_requirements:/, 'dispatch booking must persist match requirements'],
  ['api/dispatch-booking.js', /priceLogisticsLine/, 'dispatch booking must use deterministic logistics pricing'],
  ['api/razorpay-webhook.js', /timingSafeEqual/, 'payment webhook must use constant-time signature comparison'],
  ['api/create-booking-payment.js', /quoted_amount_paise/, 'payment order must derive amount from server-side booking lines'],
  ['.github/workflows/android.yml', /run: npx cap sync android/, 'Capacitor sync step is present'],
  ['.github/workflows/android.yml', /assemble\$\{\{ matrix\.flavour[\s\S]*Debug/, 'Gradle debug packaging step is present'],
]
for (const [rel, re, msg] of sourceChecks) {
  const data = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  ok(re.test(data), msg)
}

const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/163_fix_legacy_match_profile_fallback.sql'), 'utf8')
ok(/match_booking_line_partners/.test(migration), 'matching reconciliation migration missing')
ok(/REVOKE ALL ON FUNCTION public\.dispatch_wave/.test(migration), 'dispatch_wave execution scope not explicitly tightened')

/* ── Partner capacities reach the matcher ─────────────────────────────
   Built from answers in the shape the questionnaire actually stores them
   ("<service>:<question>"). The bare-key version of this passed every
   check while every real logistics profile carried max_payload_kg: null,
   which the 161/163 matcher reads as 0 and so never offered a truck
   partner a job with a stated weight. */
const cap = (trade, picked, detail) => MR.buildPartnerMatchProfile({ trade, picked, detail }).capabilityNumbers
ok(cap('Mini Truck / Pickup', ['mini_truck'], { 'mini_truck:payload': '750' }).max_payload_kg === 750,
   'L01 payload answer does not reach max_payload_kg')
ok(cap('Medium / Large Goods Vehicle', ['goods_vehicle'], { 'goods_vehicle:payload': '7000' }).max_payload_kg === 7000,
   'L02 payload answer does not reach max_payload_kg')
ok(cap('Passenger Transport', ['passenger_transport'], { 'passenger_transport:seats': '26' }).max_passengers === 26,
   'L03 seats answer does not reach max_passengers')
ok(cap('Loading & Unloading Crew', ['loading_crew'], { 'loading_crew:crew_size': '8' }).max_crew === 8,
   'L05 crew answer does not reach max_crew')
ok(cap('Warehouse / Storage', ['warehouse_storage'], { 'warehouse_storage:capacity': '2000' }).max_storage_sqft === 2000,
   'L06 capacity answer does not reach max_storage_sqft')
ok(cap('Mini Truck / Pickup', ['mini_truck'], { 'mini_truck:payload': '500', 'other:payload': '1500' }).max_payload_kg === 1500,
   'the largest payload across offerings is not the one used')

if (failures.length) {
  console.error('\n5B→5F VALIDATION FAILED')
  for (const f of failures) console.error(' - ' + f)
  process.exit(1)
}
console.log('5B→5F validation passed: 34 trades, 8 logistics boundaries, deterministic pricing, booking/payment security gates.')
