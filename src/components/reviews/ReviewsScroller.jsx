import { useEffect, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ReviewCard from './ReviewCard'
import StarRating from './StarRating'

/**
 * A self-contained "Customer Feedback" panel — the review list scrolls
 * within its own fixed-height box so the page itself never moves.
 *
 * subjects: [{ type: 'product'|'service'|'package', id, name }]
 * title: section heading (defaults to "Customer Feedback")
 */
export default function ReviewsScroller({ subjects = [], title = 'Customer Feedback', maxHeight = 420 }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (subjects.length === 0) { setLoading(false); return }
    setLoading(true)
    const byType = subjects.reduce((acc, s) => {
      (acc[s.type] ??= []).push(String(s.id))
      return acc
    }, {})

    Promise.all(
      Object.entries(byType).map(([type, ids]) =>
        supabase.from('reviews_catalog').select('*')
          .eq('subject_type', type).in('subject_id', ids)
          .order('created_at', { ascending: false })
      )
    ).then(results => {
      const all = results.flatMap(r => r.data ?? [])
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setReviews(all)
      setLoading(false)
    })
  }

  useEffect(load, [JSON.stringify(subjects)])

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  if (loading || subjects.length === 0) return null

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <MessageSquareText size={18} className="text-plum-500" /> {title}
        </h2>
        {reviews.length > 0 && <StarRating value={avgRating} count={reviews.length} size="sm" />}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400 mt-3">No reviews yet — be the first once you've received your order.</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">{reviews.length} review{reviews.length !== 1 ? 's' : ''} from real customers</p>
          {/* Fixed-height scroll box — this scrolls, the page doesn't. */}
          <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} onVoted={load} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
