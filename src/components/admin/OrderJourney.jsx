import { useState, useMemo } from 'react'
import {
  X, Phone, MessageCircle, Copy, Check, Loader2, IndianRupee, ArrowRight,
  AlertCircle, Link2, Ban, ShieldCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { INK, STATUS, ORDINAL_BLUE, shopCategoryColor } from '../../config/dataviz'
import {
  buildJourney, STAGE_ORDER, STAGE_BY_ID, formatDuration, describeReasons, returnRefund,
} from '../../lib/orderJourney'
import {
  ruleForCategory, REFUND_METHODS, REFUND_METHOD_BY_ID, REASON_BY_ID,
  cancellationState, describeWindow, POLICY_VERSION,
} from '../../config/policies'
import { buildAppUpiLinks, IS_CONFIGURED as UPI_CONFIGURED } from '../../lib/payment/upiProvider'
import { SectionHead, EmptyNote } from './viz/Primitives'

/**
 * One order, all the way through — and every action that moves it.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * A row in a table with two buttons on it. That is enough to advance an order
 * and nothing else: it cannot say when the order was dispatched, how long it
 * has been sitting, what the customer actually bought, whether the return that
 * came in is inside policy, what we owe back, or how to get the money there.
 * Every one of those questions ended in somebody opening the Supabase console.
 *
 * ── Three tracks, drawn as three tracks ──────────────────────────────────
 * Fulfilment, payment and after-sale run in parallel and interleaving them is
 * what makes most order screens unreadable. They get their own blocks, and the
 * merged chronological view is offered separately, at the bottom, for when the
 * question really is "what happened, in order".
 *
 * ── The next action is stated, once, at the top ──────────────────────────
 * Payment outranks fulfilment in that sentence deliberately: an order already
 * out for delivery against an unconfirmed payment is the expensive mistake,
 * and it is invisible if the screen just shows a green "dispatched" chip.
 */

export default function OrderJourney({ order, events = [], returns = [], onClose, onRefresh }) {
  const toast = useToast()
  const [acting, setActing] = useState(null)
  const [copied, setCopied] = useState(null)

  const journey = useMemo(
    () => buildJourney(order, events, returns),
    [order, events, returns],
  )
  if (!journey) return null

  const ref = `#${String(order.id).slice(0, 8).toUpperCase()}`
  const phone = order.profiles?.phone ?? order.address?.phone ?? null

  /* ── Actions ──────────────────────────────────────────────────────── */

  async function run(label, fn) {
    setActing(label)
    try {
      const { error } = await fn()
      if (error) throw error
      await onRefresh?.()
    } catch (err) {
      toast.error(friendlyError(err, 'That did not go through.'))
    } finally {
      setActing(null)
    }
  }

  const advance = () => {
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(order.status) + 1]
    if (!next) return
    if (order.payment_status === 'pending' && next !== 'processing' &&
        !confirm(`The payment on ${ref} has not been confirmed. Send it ${STAGE_BY_ID[next].label.toLowerCase()} anyway?`)) return
    run('advance', async () => {
      const res = await supabase.from('orders').update({ status: next }).eq('id', order.id)
      if (!res.error) toast.success(`${ref} → ${STAGE_BY_ID[next].label}.`)
      return res
    })
  }

  const markPaid = () => {
    if (!confirm(`Confirm ${formatINR(order.total)} was received for ${ref}? Only tick this after you have seen it in the bank.`)) return
    run('paid', async () => {
      const res = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
      if (!res.error) toast.success(`Payment confirmed for ${ref}.`)
      return res
    })
  }

  const cancel = () => {
    const reason = prompt('Why is this being cancelled? The customer sees this.')
    if (reason === null) return
    run('cancel', async () => {
      const res = await supabase.from('orders')
        .update({ status: 'cancelled', cancellation_reason: reason || 'Cancelled by Sambramo', cancelled_at: new Date().toISOString() })
        .eq('id', order.id)
      if (!res.error) toast.success(`${ref} cancelled.`)
      return res
    })
  }

  /* ── The payment link ─────────────────────────────────────────────── */

  /**
   * A customer who has not paid needs a link, not a reminder.
   *
   * Rebuilt from the same `buildAppUpiLinks` the checkout uses, against the
   * same order id as the transaction reference — so a payment made from this
   * link is reconcilable in the bank statement exactly like one made at
   * checkout. When no UPI id is configured the block says so rather than
   * producing a dead `upi://` link, which is the same honesty rule the
   * checkout follows.
   */
  const payment = useMemo(() => {
    if (!UPI_CONFIGURED) return null
    const links = buildAppUpiLinks({
      amount: order.total,
      note: `Sambramo order ${String(order.id).slice(0, 8).toUpperCase()}`,
      txnRef: order.id,
    })
    const message =
      `Hi ${order.profiles?.full_name ?? 'there'}, this is Sambramo about order ${ref} ` +
      `(${formatINR(order.total)}).\n\nYou can pay here: ${links.upi}\n\n` +
      `Once you have, reply and we will confirm it.`
    return { links, message }
  }, [order, ref])

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error('Could not copy — select and copy it by hand.')
    }
  }

  const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(order.status) + 1]
  const cancelState = cancellationState(order.status)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-xl max-h-[94vh] overflow-y-auto">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 font-mono">{ref}</h3>
                <StatusChip journey={journey} />
              </div>
              <p className="text-xs mt-1" style={{ color: INK.muted }}>
                {order.profiles?.full_name ?? 'Customer'}
                {order.address?.city ? ` · ${order.address.city}` : ''}
                {order.address?.pincode ? ` ${order.address.pincode}` : ''}
                {' · '}{formatINR(order.total)}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1 shrink-0"><X size={20} /></button>
          </div>

          {/* One sentence: what to do about this order right now. */}
          <div
            className="mt-3 flex items-start gap-2.5 rounded-xl px-3 py-2.5"
            style={{
              background: journey.nextAction.urgency === 'none' ? INK.plane : '#fff7ed',
              border: `1px solid ${journey.nextAction.urgency === 'critical' ? STATUS.critical
                        : journey.nextAction.urgency === 'high' ? STATUS.serious : INK.grid}`,
            }}
          >
            <span aria-hidden="true">{journey.nextAction.urgency === 'none' ? '✅' : '👉'}</span>
            <p className="text-xs font-semibold text-gray-800 flex-1">{journey.nextAction.text}</p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">

          {!journey.recorded && (
            <p className="flex items-start gap-2 text-[11px] rounded-xl px-3 py-2"
               style={{ background: INK.plane, color: INK.secondary }}>
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>
                This order predates the event log, so the stage times below are reconstructed from
                when the row was last touched — they are marked. Orders placed after migration&nbsp;039
                record every transition exactly.
              </span>
            </p>
          )}

          {/* ── Fulfilment ─────────────────────────────────────────── */}
          <section>
            <SectionHead
              title="Fulfilment"
              sub={journey.cancelled ? 'This order was cancelled before it finished.' : 'Where it has got to, and how long each step took.'}
            />
            {journey.cancelled ? (
              <div className="rounded-xl p-4" style={{ background: '#fef2f2', border: `1px solid ${STATUS.critical}33` }}>
                <p className="text-sm font-semibold" style={{ color: STATUS.critical }}>🚫 Cancelled</p>
                {journey.cancellationReason && (
                  <p className="text-xs mt-1" style={{ color: INK.secondary }}>{journey.cancellationReason}</p>
                )}
                {order.payment_status === 'paid' && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: STATUS.serious }}>
                    This was paid for — {formatINR(order.total)} is owed back.
                  </p>
                )}
              </div>
            ) : (
              <ol className="space-y-0">
                {journey.stages.map((s, i) => (
                  <li key={s.id} className="flex gap-3">
                    {/* Rail: a filled node for reached, a ring for the current one. */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[13px]"
                        style={{
                          background: s.reached ? ORDINAL_BLUE[Math.min(i, ORDINAL_BLUE.length - 1)] : INK.plane,
                          color: s.reached ? '#fff' : INK.muted,
                          outline: s.current ? `2px solid ${STATUS.good}` : 'none',
                          outlineOffset: 2,
                        }}
                        aria-hidden="true"
                      >
                        {s.emoji}
                      </span>
                      {i < journey.stages.length - 1 && (
                        <span className="w-0.5 flex-1 min-h-[26px]"
                              style={{ background: journey.stages[i + 1].reached ? ORDINAL_BLUE[1] : INK.grid }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className={`text-sm ${s.reached ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {s.label}
                        </span>
                        <span className="text-[11px] tabular-nums" style={{ color: INK.muted }}>
                          {s.at
                            ? new Date(s.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
                            : s.reached ? 'time not recorded' : ''}
                          {s.inferred && s.at ? ' (approx)' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: INK.muted }}>
                        {s.reached ? s.admin : `Not yet — ${s.admin.toLowerCase()}`}
                      </p>
                      {s.durationHours != null && (
                        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: INK.secondary }}>
                          took {formatDuration(s.durationHours)}
                          {s.targetHours && s.durationHours > s.targetHours && (
                            <span style={{ color: STATUS.serious }}> · over the {formatDuration(s.targetHours)} target</span>
                          )}
                        </p>
                      )}
                      {/* "Here for N" only where there is something still to
                          wait on. Delivered is the end of the line — an age
                          against a terminal stage is a stopwatch nobody is
                          running. */}
                      {s.current && s.next && (
                        <p className="text-[11px] mt-0.5 font-semibold"
                           style={{ color: journey.overdue ? STATUS.critical : INK.secondary }}>
                          here for {formatDuration(journey.ageInStage)}
                          {journey.overdue ? ` · past the ${formatDuration(s.targetHours)} target` : ''}
                        </p>
                      )}
                      {s.note && <p className="text-[11px] mt-0.5 italic" style={{ color: INK.secondary }}>{s.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-2 mt-1">
              {nextStage && !journey.cancelled && (
                <button onClick={advance} disabled={acting === 'advance'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-ink text-xs font-semibold hover:bg-plum-700 disabled:opacity-50">
                  {acting === 'advance' ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                  Mark {STAGE_BY_ID[nextStage].label.toLowerCase()}
                </button>
              )}
              {cancelState.allowed && !journey.cancelled && (
                <button onClick={cancel} disabled={acting === 'cancel'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                  <Ban size={12} /> Cancel this order
                </button>
              )}
            </div>
          </section>

          {/* ── Payment ────────────────────────────────────────────── */}
          <section>
            <SectionHead title="Payment" sub="Direct UPI has no gateway callback, so this only moves when somebody checks the bank." />
            <div className="rounded-xl p-4" style={{ background: INK.plane }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    <span aria-hidden="true">{journey.payment.emoji}</span> {journey.payment.label}
                  </p>
                  <p className="text-[11px] mt-0.5 max-w-prose" style={{ color: INK.secondary }}>
                    {journey.payment.admin}
                  </p>
                  {journey.payment.at && (
                    <p className="text-[11px] mt-1 tabular-nums" style={{ color: INK.muted }}>
                      {new Date(journey.payment.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      {journey.payment.actorRole ? ` · by ${journey.payment.actorRole}` : ''}
                    </p>
                  )}
                  {journey.payment.waitingHours != null && (
                    <p className="text-[11px] mt-1 font-semibold"
                       style={{ color: journey.payment.waitingHours > 48 ? STATUS.critical : STATUS.serious }}>
                      waiting {formatDuration(journey.payment.waitingHours)}
                    </p>
                  )}
                </div>
                <span className="text-lg font-bold text-gray-900">{formatINR(order.total)}</span>
              </div>

              {order.payment_status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-2.5">
                  <button onClick={markPaid} disabled={acting === 'paid'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-ink text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                    {acting === 'paid' ? <Loader2 size={12} className="animate-spin" /> : <IndianRupee size={12} />}
                    Confirm the money arrived
                  </button>

                  {payment ? (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-700 mb-1.5">Or send them the link again</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => copy(payment.links.upi, 'link')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-[11px] font-semibold hover:border-plum-300">
                          {copied === 'link' ? <Check size={11} /> : <Link2 size={11} />}
                          {copied === 'link' ? 'Copied' : 'Copy payment link'}
                        </button>
                        <button onClick={() => copy(payment.message, 'msg')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-[11px] font-semibold hover:border-plum-300">
                          {copied === 'msg' ? <Check size={11} /> : <Copy size={11} />}
                          {copied === 'msg' ? 'Copied' : 'Copy the whole message'}
                        </button>
                        {phone && (
                          <a
                            href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(payment.message)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold hover:bg-green-100"
                          >
                            <MessageCircle size={11} /> Send on WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: STATUS.serious }}>
                      No UPI ID is configured (<code>VITE_UPI_ID</code>), so there is no link to send.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── What was bought ────────────────────────────────────── */}
          <section>
            <SectionHead title="What was bought" sub="Each line carries the return rule for its shelf." />
            <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100">
              {(order.order_items ?? []).map(item => {
                const rule = ruleForCategory(item.category)
                return (
                  <li key={item.id} className="flex items-start gap-3 p-3">
                    <span className="w-1.5 h-10 rounded-full shrink-0"
                          style={{ background: shopCategoryColor(item.category) }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{item.product_name}</p>
                      <p className="text-[11px]" style={{ color: INK.muted }}>
                        {item.category ?? 'Uncategorised'}{item.occasion ? ` · ${item.occasion}` : ''}
                        {' · '}{formatINR(item.unit_price)} × {item.qty}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: INK.secondary }}>
                        Returns: {rule.label}
                      </p>
                      {item.customization && (
                        <p className="text-[11px] mt-1 whitespace-pre-line rounded p-1.5"
                           style={{ background: INK.plane, color: INK.secondary }}>
                          {item.customization}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 tabular-nums shrink-0">{formatINR(item.subtotal)}</span>
                  </li>
                )
              })}
            </ul>
            <dl className="mt-2 space-y-0.5 text-[11px]">
              <Row label="Items" value={formatINR(order.subtotal)} />
              <Row label="Delivery" value={formatINR(order.delivery_fee)} />
              {Number(order.discount) > 0 && <Row label="Discount" value={`− ${formatINR(order.discount)}`} />}
              <Row label="Total" value={formatINR(order.total)} bold />
            </dl>
          </section>

          {/* ── After-sale ─────────────────────────────────────────── */}
          <ReturnBlock
            journey={journey} order={order} acting={acting} setActing={setActing}
            onRefresh={onRefresh} toast={toast} phone={phone} orderRef={ref}
          />

          {/* ── Everything, in order ───────────────────────────────── */}
          <section>
            <SectionHead title="Everything that happened" sub="All three tracks, merged chronologically." />
            {journey.timeline.length === 0 ? (
              <EmptyNote>No history recorded for this order.</EmptyNote>
            ) : (
              <ol className="space-y-2">
                {journey.timeline.map(row => (
                  <li key={row.id} className="flex items-start gap-2.5 text-xs">
                    <span className="shrink-0 mt-0.5" aria-hidden="true">{row.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900">{row.title}</span>
                      {row.detail && <span style={{ color: INK.secondary }}> — {row.detail}</span>}
                      {row.actorRole && (
                        <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded"
                              style={{ background: INK.plane, color: INK.muted }}>
                          {row.actorRole}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums" style={{ color: INK.muted }}>
                      {new Date(row.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      {row.inferred ? ' ~' : ''}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {phone && (
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Phone size={12} /> {phone}
              </a>
              <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100">
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Return & refund ───────────────────────────────────────────────────── */

/**
 * The end of the lifecycle, which is where every order screen stops short.
 *
 * Approving a return is not one decision, it is three: is it inside policy,
 * how much do we owe, and how does the money physically get there. All three
 * are on screen, and the amount is CALCULATED from the policy rather than
 * typed — an admin doing arithmetic under pressure is how a delivery fee gets
 * refunded on a changed-mind return.
 */
function ReturnBlock({ journey, order, acting, setActing, onRefresh, toast, phone, orderRef }) {
  const r = journey.activeReturn
  const [method, setMethod] = useState('upi')
  const [refundRef, setRefundRef] = useState('')
  const [amount, setAmount] = useState('')

  const breakdown = useMemo(() => (r ? returnRefund(order, r) : null), [order, r])

  async function update(patch, message) {
    setActing('return')
    try {
      const { error } = await supabase.from('return_requests').update(patch).eq('id', r.id)
      if (error) throw error
      // A completed refund is also a fact about the ORDER — the payment track
      // has to agree with the return track or Revenue keeps counting money
      // that has gone back.
      if (patch.status === 'refunded') {
        await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', order.id)
      }
      toast.success(message)
      await onRefresh?.()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not update this return.'))
    } finally {
      setActing(null)
    }
  }

  if (!r) {
    return (
      <section>
        <SectionHead title="Returns" />
        <div className="rounded-xl p-4" style={{ background: INK.plane }}>
          <p className="text-xs font-semibold text-gray-800">
            {journey.eligibility.eligible ? '🟢 Inside the return window' : '⚪ No return raised'}
          </p>
          <p className="text-[11px] mt-1 max-w-prose" style={{ color: INK.secondary }}>
            {journey.eligibility.message}
          </p>
          {journey.eligibility.rules?.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {journey.eligibility.rules.map(rule => (
                <li key={rule.category} className="text-[11px]" style={{ color: INK.muted }}>
                  <span className="font-semibold">{rule.category}</span> — {rule.label}. {rule.condition}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    )
  }

  const owed = breakdown?.total ?? 0
  const methodMeta = REFUND_METHOD_BY_ID[method]
  const refundMessage =
    `Hi ${order.profiles?.full_name ?? 'there'}, your return on Sambramo order ${orderRef} is approved. ` +
    `We are sending ${formatINR(owed)} back by ${methodMeta?.label ?? 'transfer'} — ` +
    `it should reach you in ${methodMeta?.eta ?? 'a few days'}.`

  return (
    <section>
      <SectionHead title="Return & refund" sub={`Raised ${new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Agreed against policy ${r.policy_version ?? '(unversioned — predates 039)'}.`} />

      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: INK.grid }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">{describeReasons(r)}</p>
            {r.comment && <p className="text-xs mt-1" style={{ color: INK.secondary }}>{r.comment}</p>}
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full shrink-0"
                style={{ background: INK.plane, color: INK.secondary }}>
            {r.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Was it inside policy? Goodwill is fine — but visibly goodwill. */}
        <div className="flex items-start gap-2 text-[11px] rounded-lg px-2.5 py-2"
             style={{ background: journey.eligibility.eligible ? '#f0fdf4' : '#fff7ed' }}>
          <ShieldCheck size={13} className="shrink-0 mt-0.5"
                       style={{ color: journey.eligibility.eligible ? STATUS.good : STATUS.serious }} />
          <span style={{ color: INK.secondary }}>
            {journey.eligibility.eligible
              ? `Inside the window — raised with ${describeWindow(journey.eligibility.hoursLeft ?? 0)} to spare.`
              : `Outside the window. Honouring this is a goodwill exception, which is allowed — it should just be a decision rather than an accident.`}
            {r.terms_accepted_at && (
              <> The customer accepted the return terms on {new Date(r.terms_accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.</>
            )}
          </span>
        </div>

        {/* What we owe, computed. */}
        {breakdown && (
          <div className="rounded-lg p-3" style={{ background: INK.plane }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: INK.muted }}>What we owe</p>
            <dl className="space-y-0.5 text-[11px]">
              <Row label="Goods" value={formatINR(breakdown.goods)} />
              {breakdown.delivery > 0 && <Row label="Delivery" value={formatINR(breakdown.delivery)} />}
              {breakdown.deliveryWithheld > 0 && (
                <Row label="Delivery withheld" value={`− ${formatINR(breakdown.deliveryWithheld)}`} />
              )}
              <Row label="Refund" value={formatINR(breakdown.total)} bold />
            </dl>
            <p className="text-[10px] mt-1.5" style={{ color: INK.muted }}>{breakdown.reason}</p>
          </div>
        )}

        {/* Actions, by state. */}
        {r.status === 'requested' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => update({ status: 'approved', refund_amount: owed }, 'Return approved.')}
              disabled={acting === 'return'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-ink text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
              {acting === 'return' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Approve — refund {formatINR(owed)}
            </button>
            <button
              onClick={() => {
                const note = prompt('Why is this being rejected? The customer sees this.')
                if (note === null) return
                update({ status: 'rejected', admin_notes: note || null, resolved_at: new Date().toISOString() }, 'Return rejected.')
              }}
              disabled={acting === 'return'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-50">
              <Ban size={12} /> Reject
            </button>
          </div>
        )}

        {r.status === 'approved' && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: INK.muted }}>Send the money</p>
            <div className="flex flex-wrap gap-2">
              {REFUND_METHODS.filter(m => m.available).map(m => (
                <button
                  key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                  title={m.note}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    method === m.id ? 'bg-plum-700 border-plum-700 text-ink' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
                  }`}
                >
                  {m.label} <span className="opacity-70">· {m.eta}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: INK.muted }}>{methodMeta?.note}</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder={String(owed)} type="number" min="0"
                className="w-28 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              />
              <input
                value={refundRef} onChange={e => setRefundRef(e.target.value)}
                placeholder="UPI / bank reference"
                className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => update({
                  status: 'refund_pending',
                  refund_method: method,
                  refund_amount: Number(amount) || owed,
                  refund_ref: refundRef.trim() || null,
                  refund_initiated_at: new Date().toISOString(),
                }, 'Refund recorded as sent.')}
                disabled={acting === 'return'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-ink text-xs font-semibold hover:bg-plum-700 disabled:opacity-50">
                {acting === 'return' ? <Loader2 size={12} className="animate-spin" /> : <IndianRupee size={12} />}
                I have sent it
              </button>
              {phone && (
                <a href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(refundMessage)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100">
                  <MessageCircle size={12} /> Tell the customer
                </a>
              )}
            </div>
          </div>
        )}

        {r.status === 'refund_pending' && (
          <div className="space-y-2">
            <p className="text-[11px]" style={{ color: INK.secondary }}>
              {formatINR(r.refund_amount ?? owed)} sent by {REFUND_METHOD_BY_ID[r.refund_method]?.label ?? r.refund_method}
              {r.refund_ref ? ` · ref ${r.refund_ref}` : ''}.
              Mark it complete once the customer confirms it landed.
            </p>
            <button
              onClick={() => update({
                status: 'refunded',
                refund_completed_at: new Date().toISOString(),
                resolved_at: new Date().toISOString(),
              }, 'Refund complete — the order is marked refunded too.')}
              disabled={acting === 'return'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-ink text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
              {acting === 'return' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              They confirmed it arrived
            </button>
          </div>
        )}

        {(r.status === 'refunded' || r.status === 'rejected') && (
          <p className="text-[11px]" style={{ color: INK.muted }}>
            Closed {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}.
            {r.admin_notes ? ` ${r.admin_notes}` : ''}
          </p>
        )}
      </div>
    </section>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt style={{ color: INK.muted }}>{label}</dt>
      <dd className={`tabular-nums ${bold ? 'font-bold text-gray-900' : ''}`} style={bold ? undefined : { color: INK.secondary }}>
        {value}
      </dd>
    </div>
  )
}

function StatusChip({ journey }) {
  const { order } = journey
  const tone = journey.cancelled ? STATUS.critical
             : order.status === 'delivered' ? STATUS.good
             : journey.overdue ? STATUS.serious : ORDINAL_BLUE[2]
  const label = journey.cancelled ? 'Cancelled' : (STAGE_BY_ID[order.status]?.label ?? order.status)
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: tone }}>
      {label}
    </span>
  )
}

export { REASON_BY_ID, POLICY_VERSION }
