import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertCircle, ChevronRight, Calendar, MapPin, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import { StarInput } from '../../components/customer/StarRating'
import CustomerLayout from '../../components/customer/CustomerLayout'

const STATUS = {
  enquiry:   { label: 'Enquiry sent',   bg: 'bg-amber-100',  text: 'text-amber-700'  },
  quoted:    { label: 'Quote received', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  confirmed: { label: 'Confirmed',      bg: 'bg-green-100',  text: 'text-green-700'  },
  completed: { label: 'Completed',      bg: 'bg-purple-100', text: 'text-purple-700' },
  cancelled: { label: 'Cancelled',      bg: 'bg-gray-100',   text: 'text-gray-500'   },
}

const STEPS = ['enquiry', 'quoted', 'confirmed', 'completed']

export default function MyBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [reviewTarget, setReviewTarget] = useState(null) // { bookingId, vendorId, vendorName }
  const [review, setReview]           = useState({ rating: 0, comment: '' })
  const [reviewBusy, setReviewBusy]   = useState(false)
  const [reviewErr, setReviewErr]     = useState(null)

  useEffect(() => { fetchBookings() }, [])

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        vendors   ( id, business_name, category ),
        event_categories ( name, icon ),
        reviews   ( id, rating )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
    setBookings(data ?? [])
    setLoading(false)
  }

  async function submitReview() {
    if (!review.rating) return setReviewErr('Please select a rating before submitting.')
    setReviewBusy(true)
    setReviewErr(null)

    const { error } = await supabase.from('reviews').insert({
      booking_id:  reviewTarget.bookingId,
      customer_id: user.id,
      vendor_id:   reviewTarget.vendorId,
      rating:      review.rating,
      comment:     review.comment.trim() || null,
    })

    if (error) { setReviewErr(error.message); setReviewBusy(false); return }

    // DB trigger (migration 002) updates vendor rating_avg automatically
    closeModal()
    fetchBookings()
  }

  function closeModal() {
    setReviewTarget(null)
    setReview({ rating: 0, comment: '' })
    setReviewErr(null)
    setReviewBusy(false)
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">My Bookings</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-bold text-gray-700 mb-2">No bookings yet</h3>
            <p className="text-sm text-gray-400 mb-5">
              Find a vendor for your next celebration and send a quote request.
            </p>
            <button onClick={() => navigate('/dashboard/customer')} className="btn-primary">
              Browse vendors
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const s = STATUS[booking.status] ?? STATUS.enquiry
              const hasReview = booking.reviews?.length > 0
              const canReview = booking.status === 'completed' && !hasReview

              return (
                <div key={booking.id} className="card p-5 space-y-4">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {booking.vendors?.business_name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">{booking.vendors?.category}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                  </div>

                  {/* Event details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
                    {booking.event_categories?.name && (
                      <span>{booking.event_categories.icon} {booking.event_categories.name}</span>
                    )}
                    {booking.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {formatDate(booking.event_date)}
                      </span>
                    )}
                    {booking.event_location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {booking.event_location}
                      </span>
                    )}
                    {booking.guest_count && (
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {booking.guest_count} guests
                      </span>
                    )}
                    {booking.budget && (
                      <span>Budget: {formatINR(booking.budget)}</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <StatusBar status={booking.status} />

                  {/* Quoted price */}
                  {booking.quoted_price && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-medium">Vendor quote</span>
                      <span className="font-bold text-blue-800 text-sm">{formatINR(booking.quoted_price)}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{formatDate(booking.created_at)}</span>
                    <div className="flex items-center gap-3">
                      {canReview && (
                        <button
                          onClick={() => setReviewTarget({
                            bookingId:  booking.id,
                            vendorId:   booking.vendor_id,
                            vendorName: booking.vendors?.business_name,
                          })}
                          className="text-xs font-semibold text-marigold-600 hover:text-marigold-700 flex items-center gap-1"
                        >
                          ⭐ Leave a review
                        </button>
                      )}
                      {hasReview && (
                        <span className="text-xs text-green-600 font-medium">✅ Reviewed</span>
                      )}
                      <button
                        onClick={() => navigate(`/dashboard/customer/vendors/${booking.vendor_id}`)}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                      >
                        Vendor <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Leave Review modal ─────────────────────────── */}
      {reviewTarget && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Leave a review</h3>
                <p className="text-xs text-gray-400 mt-0.5">{reviewTarget.vendorName}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Star selector */}
              <div>
                <p className="label mb-2">How was your experience?</p>
                <StarInput
                  value={review.rating}
                  onChange={r => setReview(p => ({ ...p, rating: r }))}
                  size={36}
                />
                {review.rating > 0 && (
                  <p className="text-xs text-marigold-600 mt-1.5 font-medium">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][review.rating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="label">Your review (optional)</label>
                <textarea
                  value={review.comment}
                  onChange={e => setReview(p => ({ ...p, comment: e.target.value }))}
                  className="input min-h-[90px] resize-none"
                  placeholder="Tell others about your experience — what went well, what could be better…"
                />
              </div>

              {reviewErr && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle size={14} className="shrink-0" /> {reviewErr}
                </div>
              )}

              <button
                onClick={submitReview}
                disabled={reviewBusy || !review.rating}
                className="btn-primary w-full py-3"
              >
                {reviewBusy ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}

// ── Status progress bar ──────────────────────────────────
function StatusBar({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
        <span className="w-2 h-2 bg-red-400 rounded-full" /> Booking cancelled
      </div>
    )
  }
  const idx = STEPS.indexOf(status)
  const labels = { enquiry: 'Sent', quoted: 'Quoted', confirmed: 'Confirmed', completed: 'Done' }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-all ${i <= idx ? 'bg-marigold-400' : 'bg-gray-100'}`}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`text-[10px] font-medium ${i === idx ? 'text-marigold-600' : i < idx ? 'text-gray-400' : 'text-gray-200'}`}
          >
            {labels[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
