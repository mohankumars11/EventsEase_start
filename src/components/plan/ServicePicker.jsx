import { Check, Plus, Minus, UtensilsCrossed, Palette } from 'lucide-react'
import { SERVICE_GROUPS, serviceCost, defaultQty, serviceUnitLabel } from '../../data/servicePricing'
import { formatINR } from '../../utils/format'

/**
 * Everything that is not food and not décor.
 *
 * ── Why this replaced two checkboxes ────────────────────────────────────
 * "Individual services" used to mean a choice between Catering and Décor —
 * two toggles for a catalogue with forty services in it. Somebody who wanted
 * only a photographer, only a priest, or only a dhol player for the entrance
 * had no way to say so, which is exactly the low-commitment first booking the
 * whole two-door strategy depends on. You do not earn a ₹4,00,000 wedding
 * from a family who could not book you for a ₹8,000 mehendi artist.
 *
 * ── Making it make sense, not just listing options ──────────────────────
 * A flat list of thirty services is a wall. Three things turn it back
 * into a decision:
 *
 *   Grouped by what the customer is trying to achieve ("Photos & video",
 *   "What guests take home"), not by which vendor supplies it.
 *
 *   The tier's own picks arrive pre-ticked and badged "In your scale", so the
 *   default state is already a coherent event rather than an empty form. What
 *   the tier promised in its highlights is visible here as line items with
 *   prices — no gap between the sales copy and the invoice.
 *
 *   Every row carries a live price at THIS guest count with its unit spelled
 *   out, so "₹150 per guest" can never be misread as ₹150 for the job. That
 *   misreading is the specific reason service prices are hidden everywhere
 *   else in the app (SHOW_SERVICE_PRICES in config/sambramo.js).
 */
export default function ServicePicker({
  selectedIds, onToggle, serviceQty, onQty, guestCount, includedByTier = [],
  includeCatering, onIncludeCatering, includeDecor, onIncludeDecor,
  cateringTotal, decorTotal,
}) {
  return (
    <div className="space-y-4">
      {/* Food and décor are services too — they just have their own screens
          because a menu and a stage design need more than a checkbox. Shown
          here anyway so this page is the honest full list of what is in the
          quote, and so turning one off is possible without hunting for it. */}
      <div className="card p-4">
        <p className="text-sm font-bold text-gray-900 mb-1">The two big ones</p>
        <p className="text-xs text-gray-500 mb-3">These have their own steps because there is a lot to choose.</p>
        <div className="space-y-2">
          <BigToggle
            icon={UtensilsCrossed} label="Food & catering" on={includeCatering} onChange={onIncludeCatering}
            amount={cateringTotal} hint="Cuisine, full menu, live counters"
          />
          <BigToggle
            icon={Palette} label="Décor & staging" on={includeDecor} onChange={onIncludeDecor}
            amount={decorTotal} hint="Level, theme, installation and add-ons"
          />
        </div>
      </div>

      {SERVICE_GROUPS.map(group => (
        <div key={group.id} className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="font-bold text-gray-800 text-sm">{group.label}</p>
            <p className="text-xs text-gray-500">{group.hint}</p>
          </div>

          <div className="divide-y divide-gray-50">
            {group.services.map(service => {
              const picked = selectedIds.includes(service.id)
              const fromTier = includedByTier.includes(service.id)
              const qty = serviceQty[service.id] ?? defaultQty(service, guestCount)
              const amount = serviceCost(service, guestCount, qty)

              return (
                <div key={service.id} className={picked ? 'bg-green-50/40' : ''}>
                  <button
                    type="button"
                    onClick={() => onToggle(service.id)}
                    aria-pressed={picked}
                    className="w-full flex items-start gap-3 text-left px-4 py-3.5 min-h-[64px] active:bg-gray-50"
                  >
                    <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                      picked ? 'bg-green-600 text-white' : 'border-2 border-gray-300'
                    }`}>
                      {picked ? <Check size={14} /> : <Plus size={12} className="text-gray-500" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-base font-semibold text-gray-900">
                          {service.emoji} {service.name}
                        </span>
                        {fromTier && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-plum-100 text-plum-700">
                            In your scale
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">{service.desc}</span>
                      {service.note && <span className="block text-[11px] text-gray-500 mt-0.5">{service.note}</span>}
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-plum-700">{formatINR(amount)}</span>
                      <span className="block text-[10px] text-gray-500 leading-tight max-w-[92px]">
                        {serviceUnitLabel(service)}
                      </span>
                    </span>
                  </button>

                  {/* Countable services get a stepper, but only once they are
                      actually in the quote — a quantity control on something
                      you have not chosen is noise. The default already fits
                      the guest count, so most people never touch it. */}
                  {picked && service.unit === 'per_unit' && (
                    <div className="flex items-center justify-between gap-3 px-4 pb-3.5 -mt-1">
                      <span className="text-xs text-gray-500">
                        How many {service.unitLabel}s? We suggest {defaultQty(service, guestCount)} for {guestCount} guests.
                      </span>
                      <span className="shrink-0 flex items-center gap-1">
                        <StepBtn onClick={() => onQty(service.id, Math.max(1, qty - 1))} label="one fewer">
                          <Minus size={16} />
                        </StepBtn>
                        <span className="w-9 text-center text-base font-bold text-gray-900">{qty}</span>
                        <StepBtn onClick={() => onQty(service.id, qty + 1)} label="one more">
                          <Plus size={16} />
                        </StepBtn>
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function BigToggle({ icon: Icon, label, hint, on, onChange, amount }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`w-full flex items-center gap-3 px-4 py-3.5 min-h-[64px] rounded-xl border-2 text-left transition-colors ${
        on ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
        on ? 'bg-green-600 text-white' : 'border-2 border-gray-300'
      }`}>
        {on ? <Check size={14} /> : <Plus size={12} className="text-gray-500" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-gray-900">
          <Icon size={15} className="inline mr-1.5 -mt-0.5 text-plum-600" />{label}
        </span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-plum-700">
        {on ? formatINR(amount) : '—'}
      </span>
    </button>
  )
}

/** 44px minimum, because a stepper you miss twice is worse than no stepper. */
function StepBtn({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100"
    >
      {children}
    </button>
  )
}
