import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Calendar, Clock, Users, MapPin, Star, XCircle, MessageCircleWarning, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import { BRAND } from '../../config/sambramo'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ReviewModal from '../../components/reviews/ReviewModal'
import ReasonModal from '../../components/customer/ReasonModal'

const STATUS_CSS = {
  open:      { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Under review' },
  responded: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Quote ready' },
  closed:    { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Cancelled' },
}

const CANCEL_REASONS = ['Changed my mind', 'Found another option', 'Requested by mistake', 'Other']

export default function MyRequests() {
  const { user } = useAuth()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [myReviews, setMyReviews] = useState([])
  const [reviewing, setReviewing] = useState(null) // { subject, source }
  const [actionModal, setActionModal] = useState(null) // { kind: 'cancel'|'complaint', enquiry }

  const loadEnquiries = useCallback(() => {
    if (!user) return
    supabase
      .from('service_enquiries')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setEnquiries(data ?? []); setLoading(false) })
  }, [user])
  useEffect(loadEnquiries, [loadEnquiries])

  async function handleCancel({ reason, message }) {
    const { error } = await supabase.from('service_enquiries')
      .update({ status: 'cancelled', cancellation_reason: message ? `${reason} — ${message}` : reason })
      .eq('id', actionModal.enquiry.id)
    if (error) throw error
    loadEnquiries()
  }

  async function handleComplaint({ message }) {
    const { error } = await supabase.from('complaints').insert({
      customer_id: user.id,
      subject_type: 'enquiry',
      enquiry_id: actionModal.enquiry.id,
      message,
    })
    if (error) throw error
  }

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
                          {pkg.type === 'hamper' && <span className="text-xs text-gray-400">{formatINR(pkg.price_min)}</span>}
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

                  {enq.status === 'cancelled' && enq.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-2">Cancelled — {enq.cancellation_reason}</p>
                  )}

                  {enq.quoted_price && (enq.status === 'responded' || enq.status === 'closed') && (
                    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-saffron-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">💰 Your Quote</p>
                      <p className="text-2xl font-extrabold text-gray-900">{formatINR(enq.quoted_price)}</p>
                      {enq.quote_notes && <p className="text-xs text-gray-600 mt-1.5">{enq.quote_notes}</p>}
                      {enq.status === 'responded' && (
                        <a
                          href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
                            `Hi Sambramo! I'd like to accept the quote of ${formatINR(enq.quoted_price)} for my "${enq.event_name}" request. Please confirm next steps.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                        >
                          <MessageCircle size={15} /> Accept &amp; Proceed
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    {enq.status === 'open' && (
                      <button
                        onClick={() => setActionModal({ kind: 'cancel', enquiry: enq })}
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        <XCircle size={13} /> Cancel Request
                      </button>
                    )}
                    <button
                      onClick={() => setActionModal({ kind: 'complaint', enquiry: enq })}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                      <MessageCircleWarning size={13} /> Report a Problem
                    </button>
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

      {actionModal?.kind === 'cancel' && (
        <ReasonModal
          title="Cancel this request?"
          itemLabel={actionModal.enquiry.event_name}
          reasons={CANCEL_REASONS}
          submitLabel="Cancel Request"
          onSubmit={handleCancel}
          onClose={() => setActionModal(null)}
        />
      )}
      {actionModal?.kind === 'complaint' && (
        <ReasonModal
          title="Report a problem"
          itemLabel={actionModal.enquiry.event_name}
          messageRequired
          messagePlaceholder="What went wrong?"
          submitLabel="Send to Support"
          onSubmit={handleComplaint}
          onClose={() => setActionModal(null)}
        />
      )}
    </CustomerLayout>
  )
}
