import { useMemo, useState } from 'react'
import { Phone, MessageCircle, Loader2, IndianRupee, ArrowRight, Undo2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR, formatDate } from '../../utils/format'
import { INK, STATUS, CATEGORICAL, ORDINAL_BLUE, compactINR } from '../../config/dataviz'
import { orderLifecycle, ORDER_FLOW, ageInDays, orderLines, dailySeries } from '../../lib/analytics'
import {
  ChartCard, Funnel, StatTile, SectionHead, EmptyNote, BarRows, DataTable, Meter,
} from './viz/Primitives'

/**
 * The whole life of an order, from placed to delivered — and the two places it
 * gets stuck.
 *
 * ── Why this is a view and not a column on the orders table ──────────────
 * The Shop Orders tab is a ledger: every order, newest first, with buttons. It
 * is the right shape for "find order #4A2C" and the wrong shape for every
 * question about the process itself — how many are waiting, for how long, what
 * that is worth, and where the pipe narrows.
 *
 * ── The two stalls, named ────────────────────────────────────────────────
 * Sambramo's order flow has exactly two places work piles up, and both are
 * human rather than technical:
 *
 *   PAYMENT CONFIRMATION.  Direct UPI has no gateway callback. A customer taps
 *     "I've paid", the order is written with payment_status 'pending', and it
 *     stays there until somebody opens the banking app and ticks it off. Every
 *     unconfirmed order is money that probably arrived and is not counted.
 *
 *   FULFILMENT.  placed → processing → dispatched → delivered is advanced by
 *     hand. An order nobody has touched in four days is not a slow courier,
 *     it is a forgotten order.
 *
 * Both queues are actionable from this screen — confirming a payment or moving
 * a stage from an analytics view is the difference between a chart and a tool.
 *
 * ── The honest limit on "time in stage" ──────────────────────────────────
 * `orders` carries created_at and updated_at and no per-stage timestamps, so
 * there is no way to know how long an order sat in `processing` specifically.
 * Everything here says "untouched for N days" (now − updated_at), which is
 * both true and the number an operator needs. It is not dressed up as a stage
 * duration the schema cannot support.
 */

const STAGE_LABEL = {
  placed:     'Placed',
  processing: 'Being prepared',
  dispatched: 'Out for delivery',
  delivered:  'Delivered',
}

export default function OrderLifecycle({ data }) {
  const toast = useToast()
  const { orders = [], returns = [], refresh } = data
  const [acting, setActing] = useState(null)

  const lc = useMemo(() => orderLifecycle(orders), [orders])
  const lines = useMemo(() => orderLines(orders), [orders])
  const series = useMemo(() => dailySeries(lines, 30), [lines])

  const stuckAll = useMemo(
    () => lc.stages.flatMap(s => s.stuckOrders.map(o => ({ ...o, stage: s.status })))
      .sort((a, b) => new Date(a.updated_at ?? a.created_at) - new Date(b.updated_at ?? b.created_at)),
    [lc],
  )

  /* Age distribution of everything still in flight. */
  const aging = useMemo(() => {
    const live = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
    const bands = [
      { id: '0', label: 'Today',      test: d => d === 0 },
      { id: '1', label: '1–2 days',   test: d => d >= 1 && d <= 2 },
      { id: '3', label: '3–6 days',   test: d => d >= 3 && d <= 6 },
      { id: '7', label: 'A week or more', test: d => d >= 7 },
    ]
    return bands.map((b, i) => {
      const hits = live.filter(o => b.test(ageInDays(o.updated_at ?? o.created_at)))
      return {
        id: b.id, label: b.label, value: hits.length,
        // An ordered scale, so an ordinal ramp — not four categorical hues,
        // which would say these bands are four unrelated things.
        color: ORDINAL_BLUE[Math.min(i, ORDINAL_BLUE.length - 1)],
        note: hits.length ? formatINR(hits.reduce((s, o) => s + (Number(o.total) || 0), 0)) : null,
      }
    })
  }, [orders])

  const openReturns = returns.filter(r => r.status === 'requested')
  const refunded    = returns.filter(r => r.status === 'refunded')

  async function markPaid(order) {
    if (!confirm(`Confirm ${formatINR(order.total)} was received via UPI for order #${short(order.id)}?`)) return
    setActing(order.id)
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
    if (error) toast.error(friendlyError(error, 'Could not mark this order paid.'))
    else { toast.success(`Payment confirmed for #${short(order.id)}.`); await refresh() }
    setActing(null)
  }

  async function advance(order) {
    const next = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1]
    if (!next) return
    setActing(order.id)
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) toast.error(friendlyError(error, 'Could not move this order forward.'))
    else { toast.success(`Order #${short(order.id)} → ${STAGE_LABEL[next] ?? next}.`); await refresh() }
    setActing(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🔄 Order Lifecycle</h2>
        <p className="text-sm text-gray-500 mt-0.5 max-w-prose">
          Every order from placed to delivered, and the two places they pile up — waiting on a
          payment nobody has confirmed, and waiting on a stage nobody has moved.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Live orders" value={lc.total} sub="cancellations excluded" />
        <StatTile
          label="Awaiting payment" value={lc.awaitingPayment}
          sub={formatINR(lc.awaitingPaymentValue)}
          tone={lc.awaitingPayment > 0 ? STATUS.critical : undefined}
        />
        <StatTile
          label="Not moving" value={stuckAll.length}
          sub="past normal turnaround"
          tone={stuckAll.length > 0 ? STATUS.serious : undefined}
        />
        <StatTile label="Delivered" value={lc.stages.at(-1)?.at ?? 0} sub={`${lc.completionRate}% of all orders`} />
        <StatTile label="Cancelled" value={lc.cancelled} sub={formatINR(lc.cancelledValue)} />
        <StatTile label="Refunded" value={lc.refunded} sub={`${openReturns.length} return${openReturns.length === 1 ? '' : 's'} open`} />
      </div>

      {/* ── The funnel ───────────────────────────────────────────────── */}
      <ChartCard
        title="The pipe"
        sub="Bar length is how many orders have reached that stage or gone past it. The figure on the right is how many are sitting there right now."
        table={{
          columns: [
            { key: 'status', label: 'Stage', render: r => STAGE_LABEL[r.status] ?? r.status },
            { key: 'reached', label: 'Reached' },
            { key: 'at', label: 'Here now' },
            { key: 'value', label: 'Value here', render: r => formatINR(r.value) },
            { key: 'stuck', label: 'Overdue' },
            { key: 'oldestDays', label: 'Oldest (days)' },
          ],
          rows: lc.stages.map(s => ({ ...s, key: s.status })),
        }}
      >
        {lc.total === 0 ? (
          <EmptyNote icon="📦">No orders have been placed yet.</EmptyNote>
        ) : (
          <Funnel
            stages={lc.stages.map(s => ({ ...s, label: STAGE_LABEL[s.status] ?? s.status }))}
            footnote={`${lc.completionRate}% of every order ever placed reached the customer. ${lc.cancelled} cancelled, worth ${formatINR(lc.cancelledValue)}.`}
          />
        )}
      </ChartCard>

      {/* ── The payment queue ────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="Payments to confirm"
          sub="Direct UPI gives us no callback, so an order only becomes revenue when somebody checks the bank and ticks it off here. Oldest first."
        >
          <span className="text-xs font-bold" style={{ color: lc.awaitingPayment ? STATUS.critical : INK.muted }}>
            {formatINR(lc.awaitingPaymentValue)} unconfirmed
          </span>
        </SectionHead>

        {lc.awaitingPaymentOrders.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <span className="text-2xl" aria-hidden="true">✅</span>
            <p className="text-sm text-gray-700">Every order has had its payment confirmed.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {lc.awaitingPaymentOrders.map(o => (
              <li key={o.id} className="flex items-center gap-3 py-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-900">#{short(o.id)}</span>
                    <span className="text-xs text-gray-600">{o.profiles?.full_name ?? '—'}</span>
                    <span className="text-[11px]" style={{ color: INK.muted }}>
                      {formatDate(o.created_at)} · waiting {ageInDays(o.created_at)}d
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: INK.muted }}>
                    {(o.order_items ?? []).length} item{(o.order_items ?? []).length === 1 ? '' : 's'}
                    {o.address?.city ? ` · ${o.address.city}` : ''}
                    {o.address?.pincode ? ` ${o.address.pincode}` : ''}
                  </div>
                </div>
                <span className="font-bold text-sm text-gray-900 tabular-nums">{formatINR(o.total)}</span>
                <div className="flex items-center gap-1.5">
                  {o.profiles?.phone && (
                    <>
                      <a href={`tel:${o.profiles.phone}`} title="Call"
                         className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Phone size={13} />
                      </a>
                      <a
                        href={`https://wa.me/${o.profiles.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${o.profiles.full_name ?? ''}, checking on the payment for Sambramo order #${short(o.id)} (${formatINR(o.total)}).`)}`}
                        target="_blank" rel="noopener noreferrer" title="WhatsApp"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <MessageCircle size={13} />
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => markPaid(o)} disabled={acting === o.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting === o.id ? <Loader2 size={11} className="animate-spin" /> : <IndianRupee size={11} />}
                    Confirm
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── The stalled queue ────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="Orders that stopped moving"
          sub="Placed or being prepared for more than two days, or out for delivery for more than three. Oldest first."
        />
        {stuckAll.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <span className="text-2xl" aria-hidden="true">🏃</span>
            <p className="text-sm text-gray-700">Everything in flight is inside its normal turnaround.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {stuckAll.map(o => {
              const next = ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1]
              const days = ageInDays(o.updated_at ?? o.created_at)
              return (
                <li key={o.id} className="flex items-center gap-3 py-3 flex-wrap">
                  <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: days >= 7 ? STATUS.critical : STATUS.serious }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-900">#{short(o.id)}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: INK.plane, color: INK.secondary }}>
                        {STAGE_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="text-[11px]" style={{ color: INK.muted }}>
                        untouched for {days} day{days === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: INK.muted }}>
                      {o.profiles?.full_name ?? '—'}{o.address?.city ? ` · ${o.address.city}` : ''}
                    </div>
                  </div>
                  <span className="font-bold text-sm text-gray-900 tabular-nums">{formatINR(o.total)}</span>
                  {next && (
                    <button
                      onClick={() => advance(o)} disabled={acting === o.id}
                      className="flex items-center gap-1 px-2.5 py-1 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700 disabled:opacity-50"
                    >
                      {acting === o.id ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                      {STAGE_LABEL[next] ?? next}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Aging & returns ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="How long things have been sitting"
          sub="Everything still in flight, by time since anything last happened to it."
          table={{
            columns: [
              { key: 'label', label: 'Age' },
              { key: 'value', label: 'Orders' },
              { key: 'note', label: 'Value', render: r => r.note ?? '—' },
            ],
            rows: aging.map(a => ({ ...a, key: a.id })),
          }}
        >
          <BarRows rows={aging} format={v => `${v} order${v === 1 ? '' : 's'}`}
                   emptyNote="Nothing in flight." />
        </ChartCard>

        <ChartCard
          title="Returns and refunds"
          sub="The end of the lifecycle nobody plans for. A rising rate here is a product or a packaging problem, not a customer problem."
          table={{
            columns: [
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status' },
              { key: 'requested_at', label: 'Requested', render: r => formatDate(r.requested_at) },
            ],
            rows: returns.map(r => ({ ...r, key: r.id })),
          }}
        >
          {returns.length === 0 ? (
            <EmptyNote icon="📦">No returns have been requested.</EmptyNote>
          ) : (
            <div className="space-y-4">
              <Meter
                value={refunded.length} max={Math.max(1, lc.total)}
                label="Return rate against live orders"
                caption={`${Math.round((refunded.length / Math.max(1, lc.total)) * 100)}%`}
                fill={refunded.length / Math.max(1, lc.total) > 0.1 ? STATUS.critical : STATUS.good}
              />
              <DataTable
                columns={[
                  { key: 'reason', label: 'Reason' },
                  { key: 'status', label: 'Status' },
                  { key: 'when', label: 'Requested', render: r => formatDate(r.requested_at) },
                ]}
                rows={returns.slice(0, 8).map(r => ({ ...r, key: r.id }))}
              />
              {openReturns.length > 0 && (
                <p className="text-[11px] flex items-center gap-1.5" style={{ color: STATUS.serious }}>
                  <Undo2 size={12} />
                  {openReturns.length} still need a decision — that is done in Support.
                </p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Throughput ───────────────────────────────────────────────── */}
      <ChartCard
        title="Orders per day"
        sub="Volume rather than value — how much work the operation is absorbing."
        table={{
          columns: [
            { key: 'label', label: 'Day' },
            { key: 'orders', label: 'Orders' },
            { key: 'units', label: 'Units' },
          ],
          rows: series.filter(d => d.orders > 0),
        }}
      >
        <BarRows
          rows={series.filter(d => d.orders > 0).slice(-14).map(d => ({
            id: d.iso, label: d.label, value: d.orders, color: CATEGORICAL[0],
            note: `${d.units} units · ${compactINR(d.demand)} ordered`,
          }))}
          format={v => `${v} order${v === 1 ? '' : 's'}`}
          emptyNote="No orders in the last 30 days."
        />
      </ChartCard>
    </div>
  )
}

const short = id => String(id).slice(0, 8).toUpperCase()
