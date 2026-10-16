/**
 * Sambramo deterministic logistics price book.
 * Customer-facing price is derived from the job inputs only.
 */
export const LOGISTICS_PRICE_BOOK_VERSION = '2026-09-29.1'
const INR = n => Math.round(Number(n) || 0)

export const LOGISTICS_PRICING = {
  mini_truck: { serviceName: 'Mini truck / pickup',
    tradeId: 'L01', base: 900, includedKm: 10, extraKm: 24,
    weightSurcharge: [{ upto: 500, add: 0 }, { upto: 750, add: 180 }, { upto: 1500, add: 420 }],
  },
  goods_vehicle: { serviceName: 'Medium / large goods vehicle',
    tradeId: 'L02',
    baseByClass: { '14ft': 2200, '17ft': 2800, '19ft': 3400, container: 3900, other: 3200 },
    includedKm: 15, extraKm: 34,
    weightSurcharge: [{ upto: 2000, add: 0 }, { upto: 4000, add: 700 }, { upto: 7000, add: 1500 }, { upto: 10000, add: 2400 }],
  },
  passenger_transport: { serviceName: 'Group passenger transport',
    tradeId: 'L03',
    packageBySeats: [{ upto: 9, rate: 2600 }, { upto: 17, rate: 3600 }, { upto: 26, rate: 4600 }, { upto: 33, rate: 5600 }, { upto: 45, rate: 7200 }],
    includedKm: 100, extraKm: 24, driverAllowance: 450, extraHour: 350, stopCharge: 120,
  },
  event_equipment: { serviceName: 'Event operations equipment rental',
    tradeId: 'L04',
    dayRateByQty: [{ upto: 5, rate: 1200 }, { upto: 20, rate: 2200 }, { upto: 50, rate: 4000 }, { upto: 100, rate: 6500 }],
    deliveryFee: 650, setupFee: 900, pickupFee: 500,
  },
  loading_crew: { serviceName: 'Loading & unloading crew', tradeId: 'L05', perPersonShift: 650, includedHours: 8, overtimeHour: 110, equipmentFee: 350 },
  warehouse_storage: { serviceName: 'Warehouse / storage', tradeId: 'L06', sqftMonthRate: 22, inbound: 900, outbound: 900, pickupDelivery: 650 },
  event_materials: { serviceName: 'Bulk event materials', tradeId: 'L07', minimumOrder: 2500, deliveryFee: 450, rushSurchargePct: 12, customizationFee: 750 },
  event_logistics: { serviceName: 'End-to-end event logistics', tradeId: 'L08', minimumProjectFee: 6000, coordinationFeePct: 8, transportManagementFee: 1800, siteSurveyFee: 1500 },
}

const kmBetween = input => {
  const n = Number(input?.distanceKm)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}
const tierRate = (tiers, n) => {
  const x = Math.max(1, Number(n) || 1)
  return tiers.find(t => x <= t.upto)?.rate ?? tiers[tiers.length - 1].rate
}
const payloadAdd = (tiers, kg) => {
  const n = Math.max(0, Number(kg) || 0)
  return (tiers.find(t => n <= t.upto) ?? tiers[tiers.length - 1])?.add ?? 0
}

export function priceLogisticsLine({ serviceId, demand = {} }) {
  const p = LOGISTICS_PRICING[serviceId]
  if (!p) return { ok: false, reason: 'unsupported_service' }

  const km = kmBetween(demand)
  let total = 0
  const components = []

  if (serviceId === 'mini_truck') {
    const base = p.base
    const extra = Math.max(0, km - p.includedKm) * p.extraKm
    const weight = payloadAdd(p.weightSurcharge, demand.weightKg)
    total = base + extra + weight
    components.push({ key: 'base', paise: base * 100 }, { key: 'extra_distance', paise: INR(extra) * 100 }, { key: 'payload', paise: weight * 100 })
  } else if (serviceId === 'goods_vehicle') {
    const cls = String(demand.vehicleClass ?? demand.vehicle_class ?? '14ft')
    const base = p.baseByClass[cls] ?? p.baseByClass.other
    const extra = Math.max(0, km - p.includedKm) * p.extraKm
    const weight = payloadAdd(p.weightSurcharge, demand.weightKg)
    total = base + extra + weight
    components.push({ key: 'base', paise: base * 100 }, { key: 'extra_distance', paise: INR(extra) * 100 }, { key: 'payload', paise: weight * 100 })
  } else if (serviceId === 'passenger_transport') {
    const seats = Math.max(1, Number(demand.passengers) || 1)
    const base = tierRate(p.packageBySeats, seats)
    const extra = Math.max(0, km - p.includedKm) * p.extraKm
    const stops = Math.max(0, Number(demand.stops) || 0) * p.stopCharge
    const hours = Math.max(0, Number(demand.durationHours) || 0)
    const extraHours = Math.max(0, hours - 8) * p.extraHour
    total = base + extra + p.driverAllowance + stops + extraHours
    components.push({ key: 'package', paise: base * 100 }, { key: 'extra_distance', paise: INR(extra) * 100 }, { key: 'driver_allowance', paise: p.driverAllowance * 100 }, { key: 'stops', paise: stops * 100 }, { key: 'extra_hours', paise: INR(extraHours) * 100 })
  } else if (serviceId === 'event_equipment') {
    const qty = Math.max(1, Number(demand.quantity) || 1)
    const days = Math.max(1, Number(demand.durationDays) || 1)
    const rate = tierRate(p.dayRateByQty, qty)
    const setup = /setup|install/i.test(String(demand.setup || '')) ? p.setupFee : 0
    const pickup = /pickup|collection|strike/i.test(String(demand.setup || '')) ? p.pickupFee : 0
    total = rate * days + p.deliveryFee + setup + pickup
    components.push({ key: 'rental', paise: rate * days * 100 }, { key: 'delivery', paise: p.deliveryFee * 100 }, { key: 'setup', paise: setup * 100 }, { key: 'pickup', paise: pickup * 100 })
  } else if (serviceId === 'loading_crew') {
    const workers = Math.max(1, Number(demand.workers) || 1)
    const hours = Math.max(1, Number(demand.shiftHours) || p.includedHours)
    const overtime = Math.max(0, hours - p.includedHours) * p.overtimeHour * workers
    const equip = /forklift|dolly|trolley|equipment|heavy/i.test(String(demand.access || '') + ' ' + String(demand.workScope || '')) ? p.equipmentFee : 0
    total = workers * p.perPersonShift + overtime + equip
    components.push({ key: 'crew', paise: workers * p.perPersonShift * 100 }, { key: 'overtime', paise: overtime * 100 }, { key: 'equipment', paise: equip * 100 })
  } else if (serviceId === 'warehouse_storage') {
    const sqft = Math.max(1, Number(demand.spaceSqFt) || 1)
    const days = Math.max(1, Number(demand.durationDays) || 30)
    const months = Math.max(1, Math.ceil(days / 30))
    const storage = sqft * p.sqftMonthRate * months
    total = storage + p.inbound + p.outbound + p.pickupDelivery
    components.push({ key: 'storage', paise: storage * 100 }, { key: 'inbound', paise: p.inbound * 100 }, { key: 'outbound', paise: p.outbound * 100 }, { key: 'pickup_delivery', paise: p.pickupDelivery * 100 })
  } else if (serviceId === 'event_materials') {
    const orderValue = Math.max(p.minimumOrder, Number(demand.orderValue ?? demand.value ?? 0))
    const rush = /rush|urgent|same.?day|next.?day/i.test(String(demand.custom || '')) ? orderValue * p.rushSurchargePct / 100 : 0
    const custom = /custom|bespoke|special/i.test(String(demand.custom || '') + ' ' + String(demand.materials || '')) ? p.customizationFee : 0
    total = orderValue + p.deliveryFee + rush + custom
    components.push({ key: 'materials', paise: INR(orderValue) * 100 }, { key: 'delivery', paise: p.deliveryFee * 100 }, { key: 'rush', paise: INR(rush) * 100 }, { key: 'customization', paise: custom * 100 })
  } else if (serviceId === 'event_logistics') {
    const project = Math.max(p.minimumProjectFee, Number(demand.projectValue ?? demand.value ?? 0))
    const coordination = project * p.coordinationFeePct / 100
    const transport = Number(demand.shipments ?? 0) > 0 ? p.transportManagementFee : 0
    const survey = /survey|site|complex/i.test(String(demand.scope || '') + ' ' + String(demand.storage || '') + ' ' + String(demand.crew || '')) ? p.siteSurveyFee : 0
    total = project + coordination + transport + survey
    components.push({ key: 'project', paise: INR(project) * 100 }, { key: 'coordination', paise: INR(coordination) * 100 }, { key: 'transport_management', paise: transport * 100 }, { key: 'site_survey', paise: survey * 100 })
  }

  const rounded = Math.max(500, Math.round(total / 50) * 50)
  return { ok: true, serviceId, serviceName: p.serviceName, tradeId: p.tradeId, amountPaise: rounded * 100,
    basis: { version: LOGISTICS_PRICE_BOOK_VERSION, engine: 'sambramo-logistics-deterministic-v1', serviceId, input: demand, components, roundedInr: rounded } }
}

/* 8% is the platform fee everywhere else (sambramo_pricing_config, and the
   per-trade policy rows of 20261010_07); 15% here charged logistics customers
   a different fee for the same marketplace. Pass the trade's rate when known. */
export function platformSplit(amountPaise, feeRate = 0.08) {
  const gross = Math.max(0, Number(amountPaise) || 0)
  const fee = Math.round(gross * Number(feeRate))
  return { grossPaise: gross, platformFeePaise: fee, partnerPaise: gross - fee }
}

export function logisticsServiceIds() { return Object.keys(LOGISTICS_PRICING) }
