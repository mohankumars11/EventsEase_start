import { Star } from 'lucide-react'

const SIZES = { xs: 11, sm: 13, md: 16, lg: 22 }

/**
 * Read-only star display. `value` can be fractional (e.g. 4.3) — renders
 * partial fill via a clipped overlay star.
 */
export default function StarRating({ value = 0, count, size = 'sm', showValue = true, className = '' }) {
  const px = SIZES[size] ?? SIZES.sm

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="relative inline-flex">
        <span className="flex text-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={px} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex text-amber-400 overflow-hidden"
          style={{ width: `${Math.max(0, Math.min(5, value)) / 5 * 100}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={px} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className="text-xs font-semibold text-gray-600">
          {value > 0 ? value.toFixed(1) : 'New'}
          {typeof count === 'number' && count > 0 && <span className="text-gray-400 font-normal"> ({count})</span>}
        </span>
      )}
    </span>
  )
}
