/**
 * GeneratedPackagesStep — Display the server-generated tier packages (Essential, Signature, VIP)
 * for trades using the new pricing profile pattern.
 *
 * Shows the three tiers as swipeable cards with prices, durations, and included features.
 * Partners can review before going live. Add-ons can be edited here.
 *
 * This step displays the result of calling generate_sambramo_tier_packages RPC.
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * A single tier card showing package details.
 */
function PackageTierCard({ tier, isActive, onEdit }) {
  const badge = tier.badge ? (
    <span className="absolute top-3 right-3 inline-flex rounded-full bg-forest-100 px-3 py-1 text-[10px] font-extrabold text-forest-700">
      {tier.badge}
    </span>
  ) : null

  return (
    <div
      className={`rounded-[20px] p-5 ring-1 transition ${
        isActive
          ? 'bg-plum-700 text-white ring-plum-600 shadow-lg'
          : 'bg-white text-ink ring-ink/[0.06]'
      }`}
    >
      {badge}

      <h3 className={`text-[18px] font-extrabold ${isActive ? 'text-white' : 'text-ink'}`}>
        {tier.name}
      </h3>

      {tier.description && (
        <p className={`mt-1 text-[12px] ${isActive ? 'text-plum-100' : 'text-ink-soft'}`}>
          {tier.description}
        </p>
      )}

      <div className="mt-4 border-t border-current opacity-20" />

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={`text-[12px] font-bold ${isActive ? 'text-plum-100' : 'text-ink-soft'}`}>
            Price
          </span>
          <span className={`text-[24px] font-extrabold ${isActive ? 'text-white' : 'text-ink'}`}>
            {formatINR(tier.price_paise / 100)}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className={`text-[12px] font-bold ${isActive ? 'text-plum-100' : 'text-ink-soft'}`}>
            Duration
          </span>
          <span className={`text-[14px] font-bold ${isActive ? 'text-white' : 'text-ink'}`}>
            {tier.duration_hours}h
          </span>
        </div>
      </div>

      {tier.inclusions && tier.inclusions.length > 0 && (
        <div className="mt-4">
          <p className={`mb-2 text-[11px] font-bold uppercase tracking-wide ${isActive ? 'text-plum-200' : 'text-ink-soft'}`}>
            Includes
          </p>
          <ul className="space-y-1">
            {tier.inclusions.map((inc, idx) => (
              <li key={idx} className={`flex items-center gap-2 text-[12px] ${isActive ? 'text-plum-50' : 'text-ink'}`}>
                <Check size={14} className="shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`mt-4 w-full rounded-full py-2.5 text-[12px] font-extrabold transition ${
            isActive
              ? 'bg-white text-plum-700 hover:bg-plum-50'
              : 'bg-plum-50 text-plum-700 hover:bg-plum-100'
          }`}
        >
          Edit package
        </button>
      )}
    </div>
  )
}

export default function GeneratedPackagesStep({
  packages = [],
  loading = false,
  error = null,
}) {
  const [activeIndex, setActiveIndex] = useState(1) // Signature is default (MOST POPULAR)

  if (error) {
    return (
      <div className="rounded-[20px] bg-rose-50 p-5 ring-1 ring-rose-200">
        <p className="text-[13px] font-bold text-rose-900">
          Error generating packages: {error}
        </p>
        <p className="mt-2 text-[12px] text-rose-800">
          Please try again or contact support.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-[20px] bg-plum-50 p-5 ring-1 ring-plum-100">
        <p className="text-[13px] font-bold text-plum-950">
          Generating your packages...
        </p>
      </div>
    )
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="rounded-[20px] bg-amber-50 p-5 ring-1 ring-amber-200">
        <p className="text-[13px] font-bold text-amber-900">
          No packages generated yet. Fill in the baseline inputs above and continue.
        </p>
      </div>
    )
  }

  const maxIndex = packages.length - 1
  const canPrev = activeIndex > 0
  const canNext = activeIndex < maxIndex

  return (
    <div className="space-y-4">
      {/* Header explanation */}
      <div className="rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200">
        <div className="flex items-start gap-2">
          <Check size={16} className="mt-0.5 shrink-0 text-forest-700" />
          <div>
            <p className="text-[12px] font-extrabold text-forest-950">
              Your tiered packages
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-forest-900/75">
              Essential for everyday bookings, Signature for your most popular offering,
              and VIP for premium events. Swipe to see all three.
            </p>
          </div>
        </div>
      </div>

      {/* Package carousel */}
      <div className="relative">
        {/* Cards container */}
        <div className="overflow-hidden rounded-[20px]">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {packages.map((pkg, idx) => (
              <div key={pkg.id || idx} className="w-full shrink-0">
                <PackageTierCard
                  tier={pkg}
                  isActive={idx === activeIndex}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        {packages.length > 1 && (
          <>
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setActiveIndex(idx => Math.max(0, idx - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md disabled:opacity-30"
              aria-label="Previous tier"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setActiveIndex(idx => Math.min(packages.length - 1, idx + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md disabled:opacity-30"
              aria-label="Next tier"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Pagination dots */}
      {packages.length > 1 && (
        <div className="flex justify-center gap-2">
          {packages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 w-2 rounded-full transition ${
                idx === activeIndex ? 'bg-plum-700' : 'bg-ink/[0.15]'
              }`}
              aria-label={`Go to tier ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Info about what happens next */}
      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[12px] text-ink-soft">
          These packages will be submitted for our team's review. They&apos;ll be live within
          24 hours, or we&apos;ll let you know if we need any changes.
        </p>
      </div>
    </div>
  )
}
