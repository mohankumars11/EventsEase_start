/**
 * Canonical customer/partner matching contract.
 */
export const MATCHING_CONTRACT_VERSION = '2026-09-29.1'

export const TRADE_BOUNDARY_BY_SERVICE = {
  wedding_car: { code: 'E12', scope: ['event_car','chauffeur','guest_transfer'], excludes: ['goods_movement','group_shuttle'] },
  mini_truck: { code: 'L01', scope: ['small_goods_movement'], excludes: ['passenger_transport'] },
  goods_move: { code: 'L01', scope: ['small_goods_movement'], excludes: ['passenger_transport'] },
  goods_vehicle: { code: 'L02', scope: ['heavy_goods_movement','bulk_event_cargo'], excludes: ['passenger_transport'] },
  passenger_transport: { code: 'L03', scope: ['bus','tempo_traveller','van','group_shuttle','multi_stop_guest_transport'], excludes: ['single_wedding_car'] },
  event_equipment: { code: 'L04', scope: ['event_equipment'], excludes: ['tent_furniture','lighting','sound_av','power_cooling','safety_facilities'] },
  loading_crew: { code: 'L05', scope: ['loading_unloading_crew'], excludes: ['vehicle_transport','warehouse_storage'] },
  warehouse_storage: { code: 'L06', scope: ['event_storage','consolidation'], excludes: ['vehicle_transport','loading_crew'] },
  event_materials: { code: 'L07', scope: ['bulk_event_materials','consumables','raw_materials'], excludes: ['finished_gifts','invitations','food'] },
  event_logistics: { code: 'L08', scope: ['orchestration','multi_vendor_logistics'], excludes: [] },
}

export function boundaryForService(serviceId) {
  return TRADE_BOUNDARY_BY_SERVICE[serviceId] ?? null
}

const arr = value => Array.isArray(value) ? value : (value == null || value === '' ? [] : [value])

export function customerMatchRequirements({ serviceId, options = {}, logisticsDemand = null, guestCount = null }) {
  const b = boundaryForService(serviceId)
  const tags = []
  for (const [group, raw] of Object.entries(options ?? {})) {
    for (const choice of arr(raw)) {
      if (choice !== '' && choice != null) tags.push('option:' + group + ':' + choice)
    }
  }
  const demand = logisticsDemand ? { ...logisticsDemand } : {}
  if (Number(guestCount) > 0) demand.guests = Number(guestCount)
  return {
    contractVersion: MATCHING_CONTRACT_VERSION, serviceId,
    boundaryCode: b?.code ?? null, scope: b?.scope ?? [], excludes: b?.excludes ?? [],
    requiredTags: [...new Set(tags)], demand,
  }
}

function numeric(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function buildPartnerMatchProfile({ trade, picked = [], detail = {}, opsScreens = [], serviceRadiusKm = null }) {
  const capabilityTags = new Set(picked.map(id => 'service:' + id))
  const capabilityNumbers = {}
  const capabilityValues = {}

  for (const [key, value] of Object.entries(detail ?? {})) {
    const values = arr(value)
    for (const v of values) if (typeof v === 'string' && v.trim()) { capabilityTags.add('answer:' + key + ':' + v); capabilityTags.add('option:' + key + ':' + v) }
    const n = numeric(value)
    if (n != null) capabilityNumbers[key] = n
    capabilityValues[key] = values
  }

  for (const screen of opsScreens ?? []) {
    for (const g of screen.groups ?? []) {
      const key = g.stateKey ?? g.id
      const value = detail?.[key]
      if (value == null || value === '') continue
      const values = arr(value)
      for (const v of values) if (typeof v === 'string' && v.trim()) capabilityTags.add('ops:' + key + ':' + v)
      const n = numeric(value)
      if (n != null) capabilityNumbers[key] = n
      capabilityValues[key] = values
    }
  }

  if (trade === 'Mini Truck / Pickup' || trade === 'Medium / Large Goods Vehicle') capabilityNumbers.max_payload_kg = numeric(detail.payload)
  if (trade === 'Passenger Transport') capabilityNumbers.max_passengers = numeric(detail.seats)
  if (trade === 'Loading & Unloading Crew') capabilityNumbers.max_crew = numeric(detail.crew_size)
  if (trade === 'Warehouse / Storage') capabilityNumbers.max_storage_sqft = numeric(detail.capacity)
  if (serviceRadiusKm != null) capabilityNumbers.service_radius_km = numeric(serviceRadiusKm)

  return { contractVersion: MATCHING_CONTRACT_VERSION, trade, serviceIds: picked, capabilityTags: [...capabilityTags], capabilityNumbers, capabilityValues }
}
