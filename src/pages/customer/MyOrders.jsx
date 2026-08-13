import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Star, XCircle, RotateCcw, MessageCircleWarning } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import AppBar from '../../components/layout/AppBar'
import ReviewModal from '../../components/reviews/ReviewModal'
import ReasonModal from '../../components/customer/ReasonModal'
import ReturnRequestModal from '../../components/customer/ReturnRequestModal'

const STATUS_CSS = {
  placed:     { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  processing: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'   },
}

const CANCEL_REASONS = ['Changed my mind', 'Found a better price', 'Ordered by mistake', 'Taking too long', 'Other']

// Return reasons now live in config/policies.js with the rest of the policy —
// they carry whose fault each one is, whether a photo settles it, and whether
// the delivery fee comes back, none of which a bare string list could say.
// ReturnRequestModal reads them from there.

// 'refund_pending' arrives with migration 039 — the state between "we agreed"
// and "it landed", which the old three-state model had no way to express and
// so left a customer looking at "approved" for three days with no idea the
// money was already on its way.
const RETURN_STATUS_LABEL = {
  requested:      'Return requested — we are reviewing it',
  approved:       'Return approved — your refund is being sent',
  rejected:       'Return request declined',
  refund_pending: 'Refund sent — it should reach you in 2–5 working days',
  refunded:       'Refunded',
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

  async function handleReturn(payload) {
    // `reasons`, `policy_version` and `terms_accepted_at` arrive with
    // migration 039. On a database that has not run it yet the insert would
    // fail on the unknown columns and the customer would simply be unable to
    // raise a return — so the extras are dropped and retried rather than
    // losing the request.
    const base = {
      order_id: actionModal.order.id,
      customer_id: user.id,
      reason: payload.reason,
      comment: payload.comment || null,
    }
    let { error } = await supabase.from('return_requests').insert({
      ...base,
      reasons: payload.reasons,
      policy_version: payload.policy_version,
      terms_accepted_at: payload.terms_accepted_at,
    })
    if (error && /42703|column|schema cache/i.test(`${error.code ?? ''} ${error.message ?? ''}`)) {
      ({ error } = await supabase.from('return_requests').insert(base))
    }
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
    <div className="min-h-screen bg-cream pb-bottom-nav">
      {/* The heading is the app bar's, so the page does not print it a second
          time twelve pixels below itself — but a screen reader still needs an
          h1 that is the document's, not a bar shared across screens. */}
      <AppBar
        tone="plum"
        backTo="/dashboard/customer"
        title="My orders"
        subtitle="Everything you've ordered from the shop"
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">
        <h1 className="sr-only">My orders</h1>

        {loading ? (
          /* Skeletons, not the word "Loading…" left-aligned in an otherwise
             empty screen. The old text sat alone at the top of a full-height
             page, which reads as an empty account rather than a pending one. */
          <div className="space-y-4" aria-busy="true" aria-label="Loading your orders">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="text-5xl">🛍️</div>
            <h2 className="font-bold text-gray-800">No orders yet</h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">
              Cakes, flowers, gifts and pooja essentials — ordered today, delivered to your door.
            </p>
            <Link
              to="/shop"
              className="mt-1 inline-block rounded-xl bg-saffron-500 px-6 py-3 font-bold text-white transition-colors hover:bg-saffron-600"
            >
              Browse the shop
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
        <ReturnRequestModal
          order={actionModal.order}
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
    </div>
  )
}
