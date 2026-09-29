import { supabase } from './supabase'
import { SAMBRAMO_TRADE_REGISTRY_V2 } from '../data/sambramoTradeRegistryV2'

const MONEY_COMPONENT_IDS = new Set([
  'base_fare','extra_km_rate','waiting_hour_rate','heavy_handling_fee',
  'package_rate','driver_allowance','extra_hour_rate',
  'day_rate','delivery_fee','setup_fee','pickup_fee','deposit',
  'person_shift_rate','overtime_hour_rate','equipment_fee',
  'sqft_month_rate','in_handling_fee','out_handling_fee','pickup_delivery_fee',
  'customization_fee','minimum_project_fee','transport_management_fee','site_survey_fee',
])

const TRADE_ID_BY_NAME = Object.fromEntries(
  Object.entries(SAMBRAMO_TRADE_REGISTRY_V2).map(([id, x]) => [x.internalName, id]),
)

function asPaise(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

function monetaryRows(service, version) {
  const rows = []
  const specs = service?.specs ?? {}
  const logistics = specs.logistics_rates ?? {}

  if (service?.price != null && Number(service.price) > 0) {
    rows.push({
      vendor_id: service.vendor_id,
      vendor_service_id: service.id,
      trade_id: TRADE_ID_BY_NAME[service.category] ?? null,
      offering_id: service.name,
      component_id: 'partner_base_rate',
      component_type: 'partner_base',
      unit: service.unit ?? 'per event',
      rate_paise: asPaise(service.price),
      minimum_quantity: Math.max(1, Number(service.min_quantity) || 1),
      included_quantity: 0,
      inclusions: specs.inclusions ?? [],
      exclusions: specs.exclusions ?? [],
      quantity_formula: { source: 'vendor_services.price' },
      pcu_ids: [],
      effective_from: new Date().toISOString(),
      effective_to: null,
      status: 'active',
      version,
    })
  }

  for (const [component_id, raw] of Object.entries(logistics)) {
    if (!MONEY_COMPONENT_IDS.has(component_id)) continue
    const rate_paise = asPaise(raw)
    if (rate_paise == null) continue
    rows.push({
      vendor_id: service.vendor_id,
      vendor_service_id: service.id,
      trade_id: TRADE_ID_BY_NAME[service.category] ?? null,
      offering_id: service.name,
      component_id,
      component_type: component_id === 'deposit' ? 'refundable_deposit' : 'logistics_rate',
      unit: component_id.includes('km') ? 'per km'
        : component_id.includes('hour') ? 'per hour'
          : component_id.includes('crew') || component_id.includes('person') ? 'per person'
            : component_id === 'sqft_month_rate' ? 'per sq ft/month'
              : 'per event',
      rate_paise,
      minimum_quantity: 1,
      included_quantity: 0,
      inclusions: [],
      exclusions: [],
      quantity_formula: { source: 'vendor_services.specs.logistics_rates', component_id },
      pcu_ids: [],
      effective_from: new Date().toISOString(),
      effective_to: null,
      status: 'active',
      version,
    })
  }

  return rows
}

/**
 * Persist supply-side partner rates into the canonical Sambramo price book.
 *
 * The customer's number is never written here. This table is only the
 * partner's commercial input, versioned so a future quote can be reproduced.
 */
export async function syncPartnerPriceBook(service) {
  if (!service?.id || !service?.vendor_id) return { ok: false, reason: 'missing-service' }

  const { data: latestRows, error: latestError } = await supabase
    .from('sambramo_partner_price_books')
    .select('version')
    .eq('vendor_service_id', service.id)
    .order('version', { ascending: false })
    .limit(1)

  if (latestError) return { ok: false, reason: latestError.message }
  const version = (Number(latestRows?.[0]?.version) || 0) + 1
  const rows = monetaryRows(service, version)
  if (!rows.length) return { ok: true, version, rows: 0 }

  const { error } = await supabase
    .from('sambramo_partner_price_books')
    .insert(rows)

  if (error) return { ok: false, reason: error.message }
  return { ok: true, version, rows: rows.length }
}
