import { useState } from 'react'
import { ThumbsUp, BadgeCheck } from 'lucide-react'
import StarRating from './StarRating'
import { formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ReviewCard({ review, onVoted }) {
  const { user } = useAuth()
  const [voting, setVoting] = useState(false)
  const isVerified = Boolean(review.order_id || review.enquiry_id)

  async function castHelpfulVote() {
    if (!user || voting) return
    setVoting(true)
    const { error } = await supabase.from('review_helpful_votes').insert({
      review_id: review.id,
      customer_id: user.id,
    })
    setVoting(false)
    if (!error) onVoted?.()
  }

  return (
    <div className="border-b border-gray-100 last:border-0 py-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-plum-100 text-plum-700 flex items-center justify-center font-bold text-sm shrink-0">
          {review.customer_name?.charAt(0)?.toUpperCase() ?? 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{review.customer_name}</p>
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                <BadgeCheck size={11} /> Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={review.rating} showValue={false} size="xs" />
            <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
          </div>
          {review.comment && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>}

          {review.admin_reply && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-plum-200 bg-plum-50/50 rounded-r-lg py-2 pr-3">
              <p className="text-xs font-bold text-plum-700 mb-0.5">Response from Sambramo</p>
              <p className="text-xs text-gray-600 leading-relaxed">{review.admin_reply}</p>
            </div>
          )}

          <button
            onClick={castHelpfulVote}
            disabled={!user || voting}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-plum-600 mt-3 disabled:opacity-50 transition-colors"
          >
            <ThumbsUp size={13} /> Helpful{review.helpful_count > 0 ? ` (${review.helpful_count})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
