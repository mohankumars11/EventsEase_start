import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import StarRatingInput from './StarRatingInput'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

/**
 * subject: { type: 'product'|'service'|'package', id, name }
 * source: { orderId } | { enquiryId } — whichever qualifies this review as verified
 */
export default function ReviewModal({ subject, source, onClose, onSubmitted }) {
  const { user, profile } = useAuth()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!rating) { setError('Pick a star rating first.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('reviews_catalog').upsert({
        customer_id:   user.id,
        customer_name: profile?.full_name || 'Verified Customer',
        subject_type:  subject.type,
        subject_id:    subject.id,
        subject_name:  subject.name,
        order_id:      source?.orderId ?? null,
        enquiry_id:    source?.enquiryId ?? null,
        rating,
        comment: comment.trim() || null,
      }, { onConflict: 'customer_id,subject_type,subject_id,order_id,enquiry_id' })
      if (err) throw err
      onSubmitted?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not submit your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Rate &amp; review</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subject.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">How was it?</p>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Your review (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full min-h-[90px] resize-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="What did you like? What could be better?"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
