import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR, formatDate } from '../../utils/format'
import { ORDER_FLOW } from '../../lib/analytics'
import { describeReasons } from '../../lib/orderJourney'
import { EmptyNote } from './viz/Primitives'

/**
 * The four transactional screens: vendors, shop orders, reviews and support.
 *
 * ── What changed when they moved here ────────────────────────────────────
 * Behaviour: nothing. Every action, confirmation prompt and toast is the one
 * that was in AdminDashboard.jsx.
 *
 * Data: everything. Each of these used to open with its own `useEffect` and
 * its own `supabase.from(…)`, so opening three tabs re-read `orders` three
 * times with three different selects and three spinners. They now take the
 * rows the dashboard already loaded and call the shared `refresh()` after a
 * write, which means an action taken here also corrects the numbers on the
 * Command Center — previously the two would disagree until a page reload.
 */

/* ── Vendors ───────────────────────────────────────────────────────────── */

const VENDOR_STATUS_CSS = {
  PENDING_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700' },
  APPROVED:       { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED:       { bg: 'bg-red-100',   text: 'text-red-700'   },
  SUSPENDED:      { bg: 'bg-gray-100',  text: 'text-gray-600'  },
}

export function VendorsContent({ data }) {
  const toast = useToast()
  const { vendors = [], refresh } = data
  const [acting, setActing]       = useState(null)
  const [filterStatus, setFilter] = useState('')

  async function updateStatus(vendorId, status, reason = null) {
    setActing(vendorId + status)
    const patch = { status }
    if (reason) patch.rejection_reason = reason
    const { error } = await supabase.from('vendors').update(patch).eq('id', vendorId)
    if (error) toast.error(friendlyError(error, 'Could not update this vendor.'))
    else {
      toast.success(`Vendor ${status.toLowerCase().replace(/_/g, ' ')}.`)
      await refresh()
    }
    setActing(null)
  }

  const displayed = filterStatus ? vendors.filter(v => v.status === filterStatus) : vendors
  const pending   = vendors.filter(v => v.status === 'PENDING_REVIEW').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {pending > 0 && (
            <p className="text-sm text-amber-600 font-medium">
              {pending} partner{pending !== 1 ? 's' : ''} awaiting review
            </p>
          )}
        </div>
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} className="input text-sm py-2 w-auto pr-8">
          <option value="">All statuses</option>
          {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {displayed.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-gray-500 text-sm font-medium">No vendors found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Business', 'Category', 'City', 'Contact', 'Status', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(vendor => {
                  const css = VENDOR_STATUS_CSS[vendor.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
                  const isActing = acting?.startsWith(vendor.id)
                  return (
                    <tr key={vendor.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm leading-tight">{vendor.business_name}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{vendor.profiles?.full_name ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{vendor.category ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{vendor.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">{vendor.profiles?.phone ?? '—'}</div>
                        <div className="text-[11px] text-gray-400">{vendor.profiles?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                          {vendor.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {vendor.status !== 'APPROVED' && (
                            <button onClick={() => updateStatus(vendor.id, 'APPROVED')} disabled={isActing}
                              className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                              Approve
                            </button>
                          )}
                          {vendor.status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection (optional):')
                                if (reason !== null) updateStatus(vendor.id, 'REJECTED', reason || null)
                              }}
                              disabled={isActing}
                              className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          {vendor.status === 'APPROVED' && (
                            <button onClick={() => updateStatus(vendor.id, 'SUSPENDED')} disabled={isActing}
                              className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">{displayed.length} vendor{displayed.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Shop orders ───────────────────────────────────────────────────────── */

const ORDER_STATUS_CSS = {
  placed:     { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  processing: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'    },
}

export function OrdersContent({ data, onOpenOrder }) {
  const toast = useToast()
  const { orders = [], refresh } = data
  const [acting, setActing] = useState(null)

  async function advanceStatus(order) {
    const next = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1]
    if (!next) return
    setActing(order.id)
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) toast.error(friendlyError(error, 'Could not move this order forward.'))
    else {
      toast.success(`Order #${order.id.slice(0, 8).toUpperCase()} → ${next}.`)
      await refresh()
    }
    setActing(null)
  }

  // Direct-UPI orders have no gateway callback, so a customer tapping
  // "I've completed the payment" only creates a payment_status='pending'
  // order — this is the manual step where an admin, after checking the
  // UPI app/bank statement for that amount, confirms it actually arrived.
  async function markPaid(order) {
    if (!confirm(`Confirm ₹${order.total} was received via UPI for order #${order.id.slice(0, 8).toUpperCase()}?`)) return
    setActing(order.id)
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
    if (error) toast.error(friendlyError(error, 'Could not mark this order paid.'))
    else {
      toast.success(`Payment confirmed for #${order.id.slice(0, 8).toUpperCase()}.`)
      await refresh()
    }
    setActing(null)
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-gray-500 text-sm font-medium">No orders yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(order => {
                  const css = ORDER_STATUS_CSS[order.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
                  const next = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1]
                  return (
                    <tr
                      key={order.id}
                      onClick={() => onOpenOrder?.(order.id)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{formatDate(order.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">{order.profiles?.full_name ?? '—'}</div>
                        <div className="text-[11px] text-gray-400">{order.profiles?.phone ?? order.address?.phone ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {order.order_items?.length ?? 0} item{order.order_items?.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">{formatINR(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-gray-400'}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                          {order.status}
                        </span>
                      </td>
                      {/* The row opens the journey; the buttons must not. */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {order.payment_status === 'pending' && (
                            <button onClick={() => markPaid(order)} disabled={acting === order.id}
                              className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                              Mark Paid
                            </button>
                          )}
                          {next && order.status !== 'cancelled' && (
                            <button onClick={() => advanceStatus(order)} disabled={acting === order.id}
                              className="px-2.5 py-1 bg-plum-600 text-white text-xs font-medium rounded-lg hover:bg-plum-700 transition-colors disabled:opacity-50">
                              {acting === order.id ? <Loader2 size={11} className="animate-spin" /> : `Mark ${next}`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reviews ───────────────────────────────────────────────────────────── */

export function ReviewsContent({ data }) {
  const toast = useToast()
  const { reviews = [], refresh } = data
  const [replyingId, setReplyingId] = useState(null)
  const [replyText, setReplyText]   = useState('')
  const [saving, setSaving]         = useState(false)

  function startReply(review) {
    setReplyingId(review.id)
    setReplyText(review.admin_reply ?? '')
  }

  async function submitReply(reviewId) {
    setSaving(true)
    const { error } = await supabase
      .from('reviews_catalog')
      .update({ admin_reply: replyText.trim() || null, admin_reply_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (error) toast.error(friendlyError(error, 'Could not save your reply.'))
    else {
      toast.success('Reply published.')
      setReplyingId(null)
      await refresh()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-gray-500 text-sm font-medium">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{r.customer_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase">{r.subject_type}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.subject_name} · {formatDate(r.created_at)}</p>
                </div>
                <span className="text-amber-500 font-bold text-sm shrink-0">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}

              {r.admin_reply && replyingId !== r.id && (
                <div className="mt-3 ml-2 pl-3 border-l-2 border-plum-200 bg-plum-50/50 rounded-r-lg py-2 pr-3">
                  <p className="text-xs font-bold text-plum-700 mb-0.5">Your response</p>
                  <p className="text-xs text-gray-600">{r.admin_reply}</p>
                </div>
              )}

              {replyingId === r.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full min-h-[70px] resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
                    placeholder="Write a response…"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitReply(r.id)} disabled={saving}
                      className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save reply'}
                    </button>
                    <button onClick={() => setReplyingId(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startReply(r)} className="text-xs font-semibold text-plum-600 hover:text-plum-700 mt-3">
                  {r.admin_reply ? 'Edit reply' : 'Reply'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Support: returns, complaints, service requests ────────────────────── */

const SUPPORT_PILLS = [
  { id: 'returns',    label: 'Returns',          emoji: '↩️' },
  { id: 'complaints', label: 'Complaints',       emoji: '⚠️' },
  { id: 'requests',   label: 'Service Requests', emoji: '📋' },
]

/**
 * Returns, complaints and service enquiries.
 *
 * ── Why this is three screens now, not one "Support" tab ─────────────────
 * They were pills on one page because they are all "somebody wrote in". But
 * that is a shape, not a subject: a return is an ORDER problem, a complaint is
 * a PERSON problem, and a service enquiry is an unpriced EVENT. Filing them
 * together meant an admin working the order queue had to leave it, open
 * Support, and remember which of three pills held the returns.
 *
 * So each is exported on its own and sits in its own domain group. The
 * component stays single because the logic — reply, resolve, quote — is
 * genuinely shared; `only` fixes which section renders and drops the pill bar.
 */
function SupportContent({ data, onOpenOrder, only }) {
  const toast = useToast()
  const { returns = [], complaints = [], enquiries = [], refresh } = data

  const [pill, setPill]   = useState(only ?? 'returns')
  const [acting, setActing] = useState(null)
  const [replyingId, setReplyingId] = useState(null)
  const [replyText, setReplyText]   = useState('')
  const [quotingId, setQuotingId]   = useState(null)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  async function resolveReturn(id, status) {
    setActing(id)
    const { error } = await supabase.from('return_requests')
      .update({ status, resolved_at: new Date().toISOString() }).eq('id', id)
    if (!error && status === 'refunded') {
      const row = returns.find(r => r.id === id)
      if (row) await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', row.order_id)
    }
    if (error) toast.error(friendlyError(error, 'Could not update this return request.'))
    else {
      toast.success(status === 'refunded' ? 'Marked refunded — the order was updated too.' : `Return marked ${status}.`)
      await refresh()
    }
    setActing(null)
  }

  function startReply(item) {
    setReplyingId(item.id)
    setReplyText(item.admin_reply ?? '')
  }

  async function submitComplaintReply(id, status) {
    setActing(id)
    const { error } = await supabase.from('complaints')
      .update({ admin_reply: replyText.trim() || null, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) toast.error(friendlyError(error, 'Could not save your reply.'))
    else {
      toast.success(status === 'resolved' ? 'Complaint resolved.' : 'Reply sent.')
      setReplyingId(null)
      await refresh()
    }
    setActing(null)
  }

  async function advanceEnquiry(id, status) {
    setActing(id)
    const { error } = await supabase.from('service_enquiries').update({ status }).eq('id', id)
    if (error) toast.error(friendlyError(error, 'Could not update this enquiry.'))
    else { toast.success(`Enquiry marked ${status}.`); await refresh() }
    setActing(null)
  }

  function startQuote(enq) {
    setQuotingId(enq.id)
    setQuotePrice(enq.quoted_price ?? '')
    setQuoteNotes(enq.quote_notes ?? '')
  }

  async function sendQuote(id) {
    const price = Number(quotePrice)
    if (!price || price <= 0) { toast.error('Enter a quote amount greater than zero.'); return }
    setActing(id)
    const { error } = await supabase.from('service_enquiries').update({
      quoted_price: price,
      quote_notes: quoteNotes.trim() || null,
      quoted_at: new Date().toISOString(),
      status: 'responded',
    }).eq('id', id)
    if (error) toast.error(friendlyError(error, 'Could not send this quote.'))
    else {
      toast.success(`Quote of ${formatINR(price)} sent to the customer.`)
      setQuotingId(null)
      await refresh()
    }
    setActing(null)
  }

  const active = only ?? pill

  return (
    <div className="space-y-4">
      {!only && <h2 className="text-lg font-bold text-gray-900">🛟 Support</h2>}

      <div className={only ? 'hidden' : 'flex gap-2'}>
        {SUPPORT_PILLS.map(p => (
          <button
            key={p.id}
            onClick={() => setPill(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              pill === p.id ? 'bg-plum-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.emoji} {p.label}
            {p.id === 'returns' && returns.filter(r => r.status === 'requested').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {returns.filter(r => r.status === 'requested').length}
              </span>
            )}
            {p.id === 'complaints' && complaints.filter(c => c.status === 'open').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {complaints.filter(c => c.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === 'returns' && (
        returns.length === 0 ? <EmptyNote icon="↩️">No return requests.</EmptyNote> : (
          <div className="space-y-3">
            {returns.map(r => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{r.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      Order #{r.order_id.slice(0, 8).toUpperCase()} · {formatINR(r.orders?.total)} · {formatDate(r.requested_at)}
                    </p>
                    <p className="text-sm text-gray-700 mt-1.5">{describeReasons(r)}{r.comment ? ` — ${r.comment}` : ''}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.status === 'requested' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'refunded'  ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                    r.status === 'refund_pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{r.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {/* The decision lives in the order journey, where the policy
                      check and the calculated refund amount are — approving a
                      return from a card that shows neither is how a delivery
                      fee gets refunded on a changed-mind return. */}
                  <button
                    onClick={() => onOpenOrder?.(r.order_id)}
                    className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700"
                  >
                    Open the order &amp; decide
                  </button>
                  {r.status === 'requested' && (
                    <button onClick={() => resolveReturn(r.id, 'rejected')} disabled={acting === r.id}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50">
                      Reject outright
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {active === 'complaints' && (
        complaints.length === 0 ? <EmptyNote icon="⚠️">No complaints.</EmptyNote> : (
          <div className="space-y-3">
            {complaints.map(c => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{c.profiles?.full_name ?? '—'}</p>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase">{c.subject_type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.created_at)}</p>
                    <p className="text-sm text-gray-700 mt-1.5">{c.message}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    c.status === 'open' ? 'bg-red-100 text-red-700' :
                    c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{c.status}</span>
                </div>

                {c.admin_reply && replyingId !== c.id && (
                  <div className="mt-3 ml-2 pl-3 border-l-2 border-plum-200 bg-plum-50/50 rounded-r-lg py-2 pr-3">
                    <p className="text-xs font-bold text-plum-700 mb-0.5">Your response</p>
                    <p className="text-xs text-gray-600">{c.admin_reply}</p>
                  </div>
                )}

                {replyingId === c.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={replyText} onChange={e => setReplyText(e.target.value)}
                      className="w-full min-h-[70px] resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
                      placeholder="Write a response…"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitComplaintReply(c.id, 'in_progress')} disabled={acting === c.id}
                        className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700 disabled:opacity-50">
                        Save &amp; keep open
                      </button>
                      <button onClick={() => submitComplaintReply(c.id, 'resolved')} disabled={acting === c.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                        Save &amp; resolve
                      </button>
                      <button onClick={() => setReplyingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startReply(c)} className="text-xs font-semibold text-plum-600 hover:text-plum-700 mt-3">
                    {c.admin_reply ? 'Edit reply' : 'Reply'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {active === 'requests' && (
        enquiries.length === 0 ? <EmptyNote icon="📋">No service requests yet.</EmptyNote> : (
          <div className="space-y-3">
            {enquiries.map(e => (
              <div key={e.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{e.event_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(e.created_at)}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    e.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    e.status === 'responded' ? 'bg-amber-100 text-amber-700' :
                    e.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{e.status}</span>
                </div>

                {/* What's actually being requested — needed to quote against */}
                {((e.services?.length ?? 0) > 0 || (e.packages?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(e.services ?? []).map(s => (
                      <span key={s.id} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">
                        {s.emoji} {s.name}{s.qty > 1 ? ` ×${s.qty}` : ''}
                      </span>
                    ))}
                    {(e.packages ?? []).map(p => (
                      <span key={p.id} className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px]">📦 {p.name}</span>
                    ))}
                  </div>
                )}

                {e.quoted_price && quotingId !== e.id && (
                  <div className="mt-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm font-bold text-amber-700">Quoted: {formatINR(e.quoted_price)}</p>
                    {e.quote_notes && <p className="text-xs text-gray-500 mt-0.5">{e.quote_notes}</p>}
                  </div>
                )}

                {quotingId === e.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="number" min="1" placeholder="Quote amount (₹)"
                      value={quotePrice} onChange={ev => setQuotePrice(ev.target.value)}
                      className="w-40 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
                    />
                    <textarea
                      value={quoteNotes} onChange={ev => setQuoteNotes(ev.target.value)}
                      placeholder="Notes for the customer (optional) — what's included, validity, etc."
                      className="w-full min-h-[60px] resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => sendQuote(e.id)} disabled={acting === e.id}
                        className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700 disabled:opacity-50">
                        Send Quote
                      </button>
                      <button onClick={() => setQuotingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    {(e.status === 'open' || e.status === 'responded') && (
                      <button onClick={() => startQuote(e)}
                        className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700">
                        {e.quoted_price ? 'Edit Quote' : 'Send Quote'}
                      </button>
                    )}
                    {e.status === 'responded' && (
                      <button onClick={() => advanceEnquiry(e.id, 'closed')} disabled={acting === e.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                        Mark Closed
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}


/**
 * The three, each in its own domain. Same component, one section apiece —
 * see the note on SupportContent for why they were split.
 */
export const ReturnsView    = props => <SupportContent {...props} only="returns" />
export const ComplaintsView = props => <SupportContent {...props} only="complaints" />
export const EnquiriesView  = props => <SupportContent {...props} only="requests" />

export { SupportContent }
