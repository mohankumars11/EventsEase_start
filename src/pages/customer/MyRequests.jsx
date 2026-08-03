import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Calendar, Clock, Users, MapPin, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ReviewModal from '../../components/reviews/ReviewModal'

const STATUS_CSS = {
  open:      { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Under review' },
  responded: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Quote ready' },
  closed:    { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
}

export default function MyRequests() {
  const { user } = useAuth()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [myReviews, setMyReviews] = useState([])
  const [reviewing, setReviewing] = useState(null) // { subject, source }

  useEffect(() => {
    if (!user) return
    supabase
      .from('service_enquiries')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setEnquiries(data ?? []); setLoading(false) })
  }, [user])

  function loadMyReviews() {
    if (!user) return
    supabase.from('reviews_catalog').select('enquiry_id, subject_type, subject_id')
      .eq('customer_id', user.id).in('subject_type', ['service', 'package'])
      .then(({ data }) => setMyReviews(data ?? []))
  }
  useEffect(loadMyReviews, [user])

  function hasReviewed(enquiryId, subjectType, subjectId) {
    return myReviews.some(r => r.enquiry_id === enquiryId && r.subject_type === subjectType && r.subject_id === String(subjectId))
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ClipboardList size={22} className="text-plum-600" /> My Requests
        </h1>
        <p className="text-sm text-gray-500 mb-6">Everything you've asked Sambramo to arrange.</p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">📋</div>
            <h3 className="font-bold text-gray-700">No requests yet</h3>
            <Link to="/dashboard/customer/services" className="inline-block mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              Browse services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enquiries.map(enq => {
              const css = STATUS_CSS[enq.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: enq.status }
              const canReview = enq.status === 'closed'
              return (
                <div key={enq.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{enq.event_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(enq.created_at)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                      {css.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-gray-500">
                    {enq.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(enq.event_date)}</span>}
                    {enq.start_time && <span className="flex items-center gap-1"><Clock size={12} />{enq.start_time}</span>}
                    {enq.guest_count && <span className="flex items-center gap-1"><Users size={12} />{enq.guest_count} guests</span>}
                    {enq.location?.area && <span className="flex items-center gap-1"><MapPin size={12} />{enq.location.area}, {enq.location.city}</span>}
                  </div>

                  <div className="space-y-1.5 border-t border-gray-100 pt-3">
                    {(enq.services ?? []).map(svc => (
                      <div key={svc.id} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                        <span>{svc.emoji} {svc.name}{svc.qty > 1 ? ` × ${svc.qty}` : ''}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          {svc.unit_price && <span className="text-xs text-gray-400">{formatINR(svc.unit_price)}</span>}
                          {canReview && (
                            hasReviewed(enq.id, 'service', svc.id) ? (
                              <span className="text-xs text-green-600 font-medium">Reviewed</span>
                            ) : (
                              <button
                                onClick={() => setReviewing({
                                  subject: { type: 'service', id: svc.id, name: svc.name },
                                  source: { enquiryId: enq.id },
                                })}
                                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                              >
                                <Star size={12} /> Rate &amp; Review
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                    {(enq.packages ?? []).map(pkg => (
                      <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                        <span>📦 {pkg.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-400">{formatINR(pkg.price_min)}+</span>
                          {canReview && (
                            hasReviewed(enq.id, 'package', pkg.id) ? (
                              <span className="text-xs text-green-600 font-medium">Reviewed</span>
                            ) : (
                              <button
                                onClick={() => setReviewing({
                                  subject: { type: 'package', id: pkg.id, name: pkg.name },
                                  source: { enquiryId: enq.id },
                                })}
                                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                              >
                                <Star size={12} /> Rate &amp; Review
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          subject={reviewing.subject}
          source={reviewing.source}
          onClose={() => setReviewing(null)}
          onSubmitted={loadMyReviews}
        />
      )}
    </CustomerLayout>
  )
}
