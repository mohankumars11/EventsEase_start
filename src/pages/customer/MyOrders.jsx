import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Star, XCircle, RotateCcw, MessageCircleWarning } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ReviewModal from '../../components/reviews/ReviewModal'
import ReasonModal from '../../components/customer/ReasonModal'

const STATUS_CSS = {
  placed:     { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  processing: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'   },
}

const CANCEL_REASONS = ['Changed my mind', 'Found a better price', 'Ordered by mistake', 'Taking too long', 'Other']
const RETURN_REASONS = ['Damaged or defective', 'Wrong item received', 'Not as described', 'No longer needed', 'Other']

const RETURN_STATUS_LABEL = {
  requested: 'Return requested — pending review',
  approved:  'Return approved',
  rejected:  'Return request declined',
  refunded:  'Refunded',
}

export default function MyOrders() {
  const { user } = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [myReviews, setMyReviews] = useState([])
  const [reviewing, setReviewing] = useState(null) // { subject, source }
  const [returns, setReturns] = useState([])
  const [actionModal, setActionModal] = useState(null) // { kind: 'cancel'|'return'|'complaint', order }

  const loadOrders = useCallback(() => {
    if (!user) return
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [user])
  useEffect(loadOrders, [loadOrders])

  const loadReturns = useCallback(() => {
    if (!user) return
    supabase.from('return_requests').select('*').eq('customer_id', user.id)
      .then(({ data }) => setReturns(data ?? []))
  }, [user])
  useEffect(loadReturns, [loadReturns])

  function loadMyReviews() {
    if (!user) return
    supabase.from('reviews_catalog').select('order_id, subject_id')
      .eq('customer_id', user.id).eq('subject_type', 'product')
      .then(({ data }) => setMyReviews(data ?? []))
  }
  useEffect(loadMyReviews, [user])

  function hasReviewed(orderId, productId) {
    return myReviews.some(r => r.order_id === orderId && r.subject_id === String(productId))
  }

  function returnFor(orderId) {
    return returns.find(r => r.order_id === orderId)
  }

  async function handleCancel({ reason, message }) {
    const { error } = await supabase.from('orders').update({
      status: 'cancelled',
      cancellation_reason: message ? `${reason} — ${message}` : reason,
      cancelled_at: new Date().toISOString(),
    }).eq('id', actionModal.order.id)
    if (error) throw error
    loadOrders()
  }

  async function handleReturn({ reason, message }) {
    const { error } = await supabase.from('return_requests').insert({
      order_id: actionModal.order.id,
      customer_id: user.id,
      reason,
      comment: message || null,
    })
    if (error) throw error
    loadReturns()
  }

  async function handleComplaint({ message }) {
    const { error } = await supabase.from('complaints').insert({
      customer_id: user.id,
      subject_type: 'order',
      order_id: actionModal.order.id,
      message,
    })
    if (error) throw error
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShoppingBag size={22} className="text-amber-500" /> My Orders
        </h1>
        <p className="text-sm text-gray-500 mb-6">Everything you've ordered from the Shop.</p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🛍️</div>
            <h3 className="font-bold text-gray-700">No orders yet</h3>
            <Link to="/shop" className="inline-block mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const css = STATUS_CSS[order.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
              return (
                <div key={order.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {(order.order_items ?? []).map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                        <span>{item.product_name} × {item.qty}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span>{formatINR(item.subtotal)}</span>
                          {order.status === 'delivered' && item.product_id && (
                            hasReviewed(order.id, item.product_id) ? (
                              <span className="text-xs text-green-600 font-medium">Reviewed</span>
                            ) : (
                              <button
                                onClick={() => setReviewing({
                                  subject: { type: 'product', id: item.product_id, name: item.product_name },
                                  source: { orderId: order.id },
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
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-400">
                      Payment: <span className={order.payment_status === 'paid' ? 'text-green-600 font-semibold' : ''}>{order.payment_status}</span>
                    </span>
                    <span className="font-bold text-gray-900">{formatINR(order.total)}</span>
                  </div>

                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-2">Cancelled — {order.cancellation_reason}</p>
                  )}
                  {returnFor(order.id) && (
                    <p className="text-xs text-purple-600 mt-2 font-medium">
                      {RETURN_STATUS_LABEL[returnFor(order.id).status]}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    {['placed', 'processing'].includes(order.status) && (
                      <button
                        onClick={() => setActionModal({ kind: 'cancel', order })}
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        <XCircle size={13} /> Cancel Order
                      </button>
                    )}
                    {order.status === 'delivered' && !returnFor(order.id) && (
                      <button
                        onClick={() => setActionModal({ kind: 'return', order })}
                        className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
                      >
                        <RotateCcw size={13} /> Request Return/Refund
                      </button>
                    )}
                    <button
                      onClick={() => setActionModal({ kind: 'complaint', order })}
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
          title="Cancel this order?"
          itemLabel={`Order #${actionModal.order.id.slice(0, 8).toUpperCase()}`}
          reasons={CANCEL_REASONS}
          submitLabel="Cancel Order"
          onSubmit={handleCancel}
          onClose={() => setActionModal(null)}
        />
      )}
      {actionModal?.kind === 'return' && (
        <ReasonModal
          title="Request a return or refund"
          itemLabel={`Order #${actionModal.order.id.slice(0, 8).toUpperCase()}`}
          reasons={RETURN_REASONS}
          submitLabel="Submit Request"
          onSubmit={handleReturn}
          onClose={() => setActionModal(null)}
        />
      )}
      {actionModal?.kind === 'complaint' && (
        <ReasonModal
          title="Report a problem"
          itemLabel={`Order #${actionModal.order.id.slice(0, 8).toUpperCase()}`}
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
