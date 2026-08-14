import { Star } from 'lucide-react'

/**
 * Amazon-style horizontal bar per star level.
 * reviews: array of { rating } rows (from reviews_catalog for this subject)
 */
export default function RatingBreakdown({ reviews = [], avgRating = 0 }) {
  const total = reviews.length
  const counts = [5, 4, 3, 2, 1].map(n => reviews.filter(r => r.rating === n).length)

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="text-center shrink-0">
        <p className="text-4xl font-extrabold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
        <div className="flex justify-center text-amber-400 my-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={16} fill={i < Math.round(avgRating) ? 'currentColor' : 'none'} className={i < Math.round(avgRating) ? '' : 'text-gray-200'} strokeWidth={i < Math.round(avgRating) ? 0 : 1.5} />
          ))}
        </div>
        <p className="text-xs text-gray-500">{total} review{total !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 w-full space-y-1.5">
        {[5, 4, 3, 2, 1].map((n, i) => {
          const pct = total > 0 ? (counts[i] / total) * 100 : 0
          return (
            <div key={n} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-gray-500 font-medium shrink-0">{n}★</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-gray-500 shrink-0 text-right">{counts[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
