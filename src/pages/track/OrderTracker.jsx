import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Info, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { buildJourney, TERMINAL } from '../../lib/orderJourney'
import { formatINR } from '../../utils/format'
import JourneyStepper from '../../components/track/JourneyStepper'

/**
 * One shop order, tracked.
 *
 * ── Almost nothing here is new ────────────────────────────────────────────
 * `lib/orderJourney.js` already models this completely, and every stage in it
 * already carries a `customer` sentence — "Your order is being made", "On its
 * way to you" — written and, until now, rendered nowhere. The admin modal
 * renders `s.admin`. So this screen is mostly `buildJourney()` plus the other
 * voice.
 *
 * ── It works whether or not migration 039 is applied ──────────────────────
 * `buildJourney` infers what it can from `created_at` and `updated_at`, flags
 * every guess `inferred: true`, and reports `recorded: false` when the log is
 * missing. Nothing here has to know which of those is the case — the stepper
 * prints `time not recorded` and `(approx)` on its own.
 *
 * ── Deliberately lighter than the celebration tracker ─────────────────────
 * A cake needs a status word and a date. Giving it the full ladder-and-
 * sourcing treatment would make a ₹450 delivery look like a project, and bury
 * the celebration it sits beside on the hub.
 */
export default function OrderTracker() {
  const { orderId } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [events, setEvents] = useState([])
  const [returns, setReturns] = useState([])
  const [state, setState] = useState('loading')   // loading | ready | missing

  useEffect(() => {
    if (!user || !orderId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (error || !data) { setState('missing'); return }
      setOrder(data)
      setState('ready')

      // The transition log, if migration 039 has been applied. A database
      // that has not run it answers 42P01; the journey degrades to inferred
      // timestamps rather than the screen failing.
      supabase.from('order_events')
        .select('id, order_id, kind, from_value, to_value, actor_role, note, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .then(({ data: log }) => { if (!cancelled && log) setEvents(log) })

      supabase.from('return_requests').select('*').eq('order_id', orderId)
        .then(({ data: rows }) => { if (!cancelled && rows) setReturns(rows) })
    }

    load()
    return () => { cancelled = true }
  }, [user, orderId])

  if (state === 'loading') {
    return (
      <div className="a-canvas min-h-screen pb-bottom-nav">
        <TrackerHeader title="Your order" />
        <div className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-sunk/[0.07]" />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'missing') {
    return (
      <div className="a-canvas min-h-screen pb-bottom-nav">
        <TrackerHeader title="Your order" />
        <div className="mx-auto max-w-2xl px-4 pt-10 text-center">
          <p className="text-sm font-bold text-ink">We couldn't find that order</p>
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-ink-mute">
            It may belong to another account, or the link may be old.
          </p>
          <Link to="/track" className="mt-4 inline-flex rounded-xl bg-saffron-400 px-4 py-2.5 text-xs font-extrabold text-plum-950">
            Back to Track
          </Link>
        </div>
      </div>
    )
  }

  const journey = buildJourney(order, events, returns)
  const items = order.order_items ?? []

  return (
    <div className="a-canvas min-h-screen pb-bottom-nav">
      <TrackerHeader title={`Order #${String(order.id).slice(0, 8).toUpperCase()}`} />

      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4">
        {/* What happens next, in one sentence, before any detail. */}
        {journey.nextAction?.text && !journey.cancelled && (
          <p className="rounded-2xl bg-accent/[0.07] px-4 py-3 text-[12.5px] font-semibold leading-relaxed text-ink ring-1 ring-accent/15">
            {journey.currentStage?.customer ?? journey.nextAction.text}
          </p>
        )}

        {journey.cancelled && (
          <div className="rounded-2xl bg-surface-sunk/[0.06] px-4 py-3 ring-1 ring-hairline/10">
            <p className="text-[13px] font-extrabold text-ink">{TERMINAL.cancelled.customer}</p>
            {journey.cancellationReason && (
              <p className="mt-0.5 text-[11.5px] text-ink-mute">{journey.cancellationReason}</p>
            )}
          </div>
        )}

        {/* One banner, not a caveat per row — the rule orderJourney sets. */}
        {!journey.recorded && (
          <p className="flex items-start gap-2 rounded-2xl bg-surface-sunk/[0.05] px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-mute ring-1 ring-hairline/10">
            <Info size={13} className="mt-0.5 shrink-0" />
            This order predates our step-by-step log, so the times below are worked
            out from when it was last updated. They are marked where that is the case.
          </p>
        )}

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-hairline/[0.08]">
          <h2 className="mb-3 text-[14px] font-extrabold text-ink">Where it is</h2>
          <JourneyStepper stages={journey.stages} voice="customer" />
        </section>

        <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08]">
          <h2 className="border-b border-hairline/[0.08] px-4 py-3 text-[14px] font-extrabold text-ink">
            What's in it
          </h2>
          <ul className="divide-y divide-hairline/[0.06]">
            {items.map(it => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">{it.emoji ?? '🛍️'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold text-ink">{it.product_name}</span>
                  <span className="block text-[11px] text-ink-mute">Qty {it.quantity}</span>
                </span>
                <span className="text-[12.5px] font-extrabold tabular-nums text-ink">
                  {formatINR((it.price ?? 0) * (it.quantity ?? 1))}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-hairline/[0.08] px-4 py-3">
            <span className="text-[12px] font-bold text-ink-soft">
              {journey.payment.label}
            </span>
            <span className="text-[15px] font-extrabold tabular-nums text-ink">{formatINR(order.total)}</span>
          </div>
        </section>

        <a
          href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
            `Hi Sambramo, about order #${String(order.id).slice(0, 8).toUpperCase()}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-surface px-4 py-3.5 text-[13px] font-extrabold text-ink ring-1 ring-hairline/[0.08]"
        >
          <MessageCircle size={15} className="text-forest-600" /> Ask about this order
        </a>
      </div>
    </div>
  )
}

export function TrackerHeader({ title }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-hairline/[0.06] bg-surface/90 px-3 py-3 backdrop-blur-md pt-safe">
      <Link
        to="/track"
        aria-label="Back to Track"
        className="tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk/[0.07]"
      >
        <ArrowLeft size={19} />
      </Link>
      <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">{title}</p>
    </header>
  )
}
