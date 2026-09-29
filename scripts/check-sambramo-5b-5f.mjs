#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VENDOR_CATEGORIES, TRADE_FOR_SERVICE } from '../src/config/vendor.js'
import { TRADES } from '../src/data/partnerCatalogue.js'
import { specsForTrade } from '../src/data/partnerSpecs.js'
import { specsForServices } from '../src/data/partnerServiceSpecs.js'
import { operationScreensFor } from '../src/data/partnerOperations.js'
import { reconcilePartnerQuestionGroups, filterPartnerQuestionGroups } from '../src/data/sambramoPartnerQuestionnaireV2Rules.js'
import { LOGISTICS_SERVICE_SPECS, LOGISTICS_TRADES, logisticsSpecsForServices } from '../src/data/logisticsPartnerSpecsV2.js'
import { LOGISTICS_PRICING, priceLogisticsLine, platformSplit } from '../src/data/logisticsPricing.js'
import { TRADE_BOUNDARY_BY_SERVICE, customerMatchRequirements } from '../src/lib/matchingReconciliation.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
  const ids = groups.map(g => g.canonicalField ?? g.id)
  ok(ids.length === new Set(ids).size, trade + ': duplicate canonical capability questions remain')
  ok(filterPartnerQuestionGroups(groups, { trade, picked: [] }).length <= groups.length, trade + ': conditional evaluator failed')
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
  L07: ['event_materials'],
  L08: ['event_logistics'],
}
for (const [code, services] of Object.entries(boundaryAssertions)) {
  for (const sid of services) ok(TRADE_BOUNDARY_BY_SERVICE[sid]?.code === code, code + ': wrong service boundary for ' + sid)
}

const sourceChecks = [
  ['api/dispatch-booking.js', /match_requirements:/, 'dispatch booking must persist match requirements'],
  ['api/dispatch-booking.js', /priceLogisticsLine/, 'dispatch booking must use deterministic logistics pricing'],
  ['api/razorpay-webhook.js', /timingSafeEqual/, 'payment webhook must use constant-time signature comparison'],
  ['api/create-booking-payment.js', /quoted_amount_paise/, 'payment order must derive amount from server-side booking lines'],
  ['.github/workflows/android.yml', /cap sync android[\s\S]*assembleCustomerDebug/, 'Capacitor sync must precede Gradle packaging'],
]
for (const [rel, re, msg] of sourceChecks) {
  const data = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  ok(re.test(data), msg)
}

const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/162_dispatch_wave_uses_reconciled_matching.sql'), 'utf8')
ok(/match_booking_line_partners/.test(migration), 'matching reconciliation migration missing')
ok(/REVOKE ALL ON FUNCTION public\.dispatch_wave/.test(migration), 'dispatch_wave execution scope not explicitly tightened')

if (failures.length) {
  console.error('\n5B→5F VALIDATION FAILED')
  for (const f of failures) console.error(' - ' + f)
  process.exit(1)
}
console.log('5B→5F validation passed: 34 trades, 8 logistics boundaries, deterministic pricing, booking/payment security gates.')
