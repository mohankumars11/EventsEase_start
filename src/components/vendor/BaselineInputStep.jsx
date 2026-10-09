/**
 * BaselineInputStep — Collect baseline pricing inputs for trades using the new
 * server-generated tier package pattern (e.g., Anchor & MC).
 *
 * Renders input fields based on a trade's pricing profile config, validates
 * the inputs, and returns them as jsonb for the generate_sambramo_tier_packages RPC.
 *
 * This replaces the generic "Your rate" question for profile-enabled trades.
 */

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

/**
 * Render an input field based on field config from the pricing profile.
 */
function BaselineField({ fieldId, config, value, onChange, showAll }) {
  const fieldValue = value?.[fieldId] ?? ''

  if (config.type === 'number') {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-extrabold text-ink">
          {config.label}
          {config.required && <span className="text-rose-600">*</span>}
        </span>
        {config.hint && (
          <span className="mb-2 block text-[12px] leading-snug text-ink-soft">
            {config.hint}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-[20px] font-extrabold text-ink">
            {config.unit ?? ''}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={fieldValue}
            onChange={e => onChange({ ...value, [fieldId]: e.target.value })}
            placeholder={config.example ? String(config.example) : ''}
            className="flex-1 rounded-2xl bg-surface px-4 py-3.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.10] outline-none focus:ring-2 focus:ring-plum-500"
          />
        </div>
      </label>
    )
  }

  if (config.type === 'select') {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-extrabold text-ink">
          {config.label}
          {config.required && <span className="text-rose-600">*</span>}
        </span>
        {config.hint && (
          <span className="mb-2 block text-[12px] leading-snug text-ink-soft">
            {config.hint}
          </span>
        )}
        <select
          value={fieldValue}
          onChange={e => onChange({ ...value, [fieldId]: e.target.value })}
          className="w-full rounded-2xl bg-surface px-4 py-3.5 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.10] outline-none focus:ring-2 focus:ring-plum-500"
        >
          <option value="">
            {config.default ? `Select (default: ${config.default})` : 'Select one'}
          </option>
          {config.options?.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return null
}

export default function BaselineInputStep({
  profile,
  value = {},
  onChange,
  showAll = false,
}) {
  const [errors, setErrors] = useState({})

  if (!profile || !profile.baseline_inputs) {
    return (
      <div className="rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-[13px] font-bold text-amber-900">
          No pricing profile configured for this trade.
        </p>
      </div>
    )
  }

  const inputs = profile.baseline_inputs

  return (
    <div className="space-y-4">
      {/* Header card explaining the baseline inputs */}
      <div className="rounded-[20px] bg-plum-50 p-4 ring-1 ring-plum-100">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0 text-plum-700" />
          <div>
            <p className="text-[12px] font-extrabold text-plum-950">
              Your baseline pricing
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-plum-900/75">
              These inputs tell our system how to generate your tiered packages. You can adjust
              the individual packages after they are created.
            </p>
          </div>
        </div>
      </div>

      {/* Input fields */}
      <div className="space-y-4">
        {Object.entries(inputs).map(([fieldId, config]) => (
          <div key={fieldId} className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
            <BaselineField
              fieldId={fieldId}
              config={config}
              value={value}
              onChange={onChange}
              showAll={showAll}
            />
          </div>
        ))}
      </div>

      {/* Optional note about generated packages */}
      <div className="rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200">
        <p className="text-[12px] font-bold text-forest-800">
          ✓ Your three-tier packages will be generated automatically on the next screen.
        </p>
      </div>
    </div>
  )
}
