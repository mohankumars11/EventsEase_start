import { Check } from 'lucide-react'
import { CheckedInput } from '../partner/FieldCheck'

const FIELD_SETS = {
  'Mini Truck / Pickup': [
    ['base_fare', 'Local base fare', '₹'],
    ['included_km', 'Kilometres included', 'km'],
    ['extra_km_rate', 'Extra distance rate', '₹/km'],
    ['waiting_hour_rate', 'Waiting after free time', '₹/hour'],
  ],
  'Medium / Large Goods Vehicle': [
    ['base_fare', 'Base trip fare', '₹'],
    ['included_km', 'Kilometres included', 'km'],
    ['extra_km_rate', 'Extra distance rate', '₹/km'],
    ['waiting_hour_rate', 'Waiting after free time', '₹/hour'],
    ['heavy_handling_fee', 'Heavy/special handling', '₹'],
  ],
  'Passenger Transport': [
    ['package_rate', 'Standard package/day', '₹'],
    ['included_km', 'Kilometres included', 'km/day'],
    ['extra_km_rate', 'Extra distance rate', '₹/km'],
    ['driver_allowance', 'Driver allowance/day', '₹'],
    ['extra_hour_rate', 'Extra duty hour', '₹/hour'],
  ],
  'Event Equipment Rental': [
    ['day_rate', 'Standard rental/day', '₹'],
    ['delivery_fee', 'Delivery fee', '₹'],
    ['setup_fee', 'Setup fee', '₹'],
    ['pickup_fee', 'Pickup/strike fee', '₹'],
    ['deposit', 'Refundable damage deposit', '₹'],
  ],
  'Loading & Unloading Crew': [
    ['person_shift_rate', 'Per-person standard shift', '₹'],
    ['overtime_hour_rate', 'Overtime per person/hour', '₹/hour'],
    ['equipment_fee', 'Handling equipment fee', '₹'],
    ['minimum_crew', 'Minimum crew', 'people'],
  ],
  'Warehouse / Storage': [
    ['sqft_month_rate', 'Storage rate', '₹/sq ft/month'],
    ['in_handling_fee', 'Inbound handling', '₹'],
    ['out_handling_fee', 'Outbound handling', '₹'],
    ['pickup_delivery_fee', 'Pickup/delivery', '₹'],
  ],
  'Event Materials Supplier': [
    ['minimum_order_value', 'Minimum order value', '₹'],
    ['delivery_fee', 'Delivery fee', '₹'],
    ['rush_surcharge_pct', 'Rush surcharge', '%'],
    ['customization_fee', 'Custom sourcing/customization', '₹'],
  ],
  'End-to-End Event Logistics': [
    ['minimum_project_fee', 'Minimum project fee', '₹'],
    ['coordination_fee_pct', 'Coordination fee', '%'],
    ['transport_management_fee', 'Transport management', '₹'],
    ['site_survey_fee', 'Site survey', '₹'],
  ],
}

export default function LogisticsPriceBook({ trade, value = {}, onChange }) {
  const fields = FIELD_SETS[trade] ?? []

  if (!fields.length) return null

  const set = (id, next) => onChange(prev => ({ ...prev, [id]: next }))

  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="text-[13px] font-extrabold text-ink">Logistics price book</p>
      <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
        These are your supply-side rates. Sambramo uses them as inputs to structured quotes; customer prices are never typed here.
      </p>

      <div className="mt-3 space-y-2.5">
        {fields.map(([id, label, suffix]) => (
          <label key={id} className="block">
            <span className="mb-1 block text-[12px] font-bold text-ink-mute">{label}</span>
            <div className="flex items-center gap-2">
              <CheckedInput
                field="logistics_rate"
                name={'logistics_' + id}
                value={value[id] ?? ''}
                onChange={v => set(id, v)}
                inputMode="decimal"
                placeholder="0"
                aria-label={label}
                className="min-w-0 flex-1 rounded-2xl bg-ink/[0.02] px-3.5 py-2.5 text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
              />
              <span className="w-24 text-right text-[11px] font-bold text-ink-mute">{suffix}</span>
              {String(value[id] ?? '').trim() !== '' && (
                <Check size={14} className="shrink-0 text-forest-600" />
              )}
            </div>
          </label>
        ))}
      </div>

      <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-900">
        Keep the refundable deposit separate from the service rate. Tolls, permits and site-specific costs should only be added when the quote engine has the required structured inputs.
      </p>
    </div>
  )
}
