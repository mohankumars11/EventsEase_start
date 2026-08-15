import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Info, MessageCircle, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { fetchActivity } from '../../lib/activity'
import { buildCelebrationJourney, NO_LOG_NOTE, CANCELLED_STAGE } from '../../lib/celebrationJourney'
import { defaultPlanFor } from '../../config/celebrationPayments'
import { formatINR } from '../../utils/format'
import JourneyStepper from '../../components/track/JourneyStepper'
import PaymentLadder from '../../components/track/PaymentLadder'
import { TrackerHeader } from './OrderTracker'

/**
 * One celebration, tracked end to end.
 *
 * ── The thing this finally fixes ──────────────────────────────────────────
 * `celebrations.js` tells a customer "Your plan is ready to review 🎉" and
 * then sends them to a screen that shows no plan — nothing customer-facing has
 * ever read `event_proposals`. The proposal is the single most valuable thing
 * a waiting customer could be shown, it is already customer-readable by RLS,
 * and it was sitting there unrendered.
 *
 * ── The honesty rule, made concrete ───────────────────────────────────────
 * Only rows that wrote themselves somewhere get a timestamp: the request, the
 * quote, each proposal, each change request, the price-lock claim, each
 * payment. Stage transitions in between are unrecorded until migration 045
 * adds the log, so the stepper prints `time not recorded` and one banner says
 * why — rather than the screen inventing a plausible-looking history for a
 * customer who is deciding whether to trust us with a wedding.
 *
 * ── The margin leak this must not open ────────────────────────────────────
 * `event_proposal_items.sambramo_margin` is a GENERATED column and
 * `vendor_cost` sits beside it. `select('*')` here would put our margin per
 * line into a customer's browser. The column list below is explicit and must
 * stay that way.
 */
export default function CelebrationTracker() {
  const { eventId, enquiryId } = useParams()
  const subjectType = eventId ? 'event' : 'enquiry'
  const subjectId = eventId ?? enquiryId

  const { user } = useAuth()
  const [item, setItem] = useState(null)
  const [proposals, setProposals] = useState([])
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [log, setLog] = useState([])
  const [plan, setPlan] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    if (!user || !subjectId) return
    let cancelled = false

    async function load() {
      // Reuse the merge rather than re-querying either table — one definition
      // of what a celebration is, whichever door it came through.
      const { items: all } = await fetchActivity(user.id)
      if (cancelled) return
      const hit = all.find(i => i.kind === 'celebration' && i.id === subjectId)
      if (!hit) { setState('missing'); return }
      setItem(hit)
      setState('ready')

      // ── The transition log (migration 045) ────────────────────────
      // Customer-visible rows only — the policy enforces that server-side,
      // and the column list keeps vendor names and negotiated amounts out of
      // the browser even if the policy ever loosened.
      //
      // Both subject types: a celebration is owed one history whichever
      // table it landed in. On a database that has not run 045 this 42P01s
      // and the journey falls back to inferred timestamps, which is exactly
      // what `buildCelebrationJourney` is written to do.
      supabase.from('celebration_events')
        .select('id, subject_type, subject_id, kind, from_value, to_value, customer_copy, note, created_at')
        .eq('subject_type', subjectType)
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (!cancelled && data) setLog(data) })

      // Milestone payments now reach an enquiry too — migration 046 dropped
      // the NOT NULL on `event_id` and added `enquiry_id`, so the builder and
      // the services cart are no longer structurally unable to hold one.
      supabase.from('event_payments')
        .select('id, event_id, enquiry_id, amount, payment_type, status, milestone_id, schedule_version, due_at, paid_at, notes, created_at')
        .eq(subjectType === 'event' ? 'event_id' : 'enquiry_id', subjectId)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (!cancelled && data) setPayments(data) })

      // Proposals and change requests remain events-only: neither table has
      // an enquiry column, and inventing one is a bigger change than this.
      if (subjectType !== 'event') return

      supabase.from('event_proposals')
        .select('id, event_id, status, subtotal, discount, total_amount, customer_message, valid_until, created_at, updated_at')
        .eq('event_id', subjectId)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (!cancelled && data) setProposals(data) })

      // 🔴 Explicit columns. Never `select('*')` — `vendor_cost` and the
      // generated `sambramo_margin` live on this table.
      supabase.from('event_proposal_items')
        .select('id, proposal_id, event_service_id, description, customer_price, quantity')
        .then(({ data }) => { if (!cancelled && data) setItems(data) })

      supabase.from('event_change_requests')
        .select('id, event_id, description, created_at, resolved_at')
        .eq('event_id', subjectId)
        .then(({ data }) => { if (!cancelled && data) setChangeRequests(data) })
    }

    load()
    return () => { cancelled = true }
  }, [user, subjectId, subjectType])

  const journey = useMemo(
    () => (item ? buildCelebrationJourney(item, { log, proposals, payments, changeRequests }) : null),
    [item, log, proposals, payments, changeRequests],
  )

  // The services on this booking drive which unlock lines are true for it.
  const serviceIds = useMemo(() => {
    const raw = item?.raw?.services
    if (!Array.isArray(raw)) return []
    return raw.map(s => s?.id).filter(Boolean)
  }, [item])

  if (state === 'loading') {
    return (
      <div className="home-canvas min-h-screen pb-bottom-nav">
        <TrackerHeader title="Your celebration" />
        <div className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-sunk/[0.07]" />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'missing' || !journey) {
    return (
      <div className="home-canvas min-h-screen pb-bottom-nav">
        <TrackerHeader title="Your celebration" />
        <div className="mx-auto max-w-2xl px-4 pt-10 text-center">
          <p className="text-sm font-bold text-ink">We couldn't find that celebration</p>
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

  const approved = proposals.find(p => p.status === 'APPROVED')
  const sent = proposals.find(p => p.status === 'SENT' || p.status === 'APPROVED')
  const confirmedTotal = journey.payment.confirmedTotal

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <TrackerHeader title={item.title} />

      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4">
        {/* ── The one sentence ─────────────────────────────────────── */}
        <div className={`rounded-2xl px-4 py-3.5 ring-1 ${
          journey.nextAction.urgency === 'you'
            ? 'bg-saffron-400/15 ring-saffron-400/35'
            : 'bg-accent/[0.07] ring-accent/15'
        }`}>
          <p className="text-[13px] font-extrabold leading-snug text-ink">
            {journey.nextAction.text ?? item.message}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-ink-mute">
            {item.reference}
            {item.eventDate && <> · {new Date(item.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</>}
            {item.guestCount ? ` · ${item.guestCount} guests` : ''}
          </p>
        </div>

        {/* ── Where it is ──────────────────────────────────────────── */}
        <section className="rounded-2xl bg-surface p-4 ring-1 ring-hairline/[0.08]">
          <h2 className="mb-3 text-[14px] font-extrabold text-ink">Where it is</h2>
          <JourneyStepper
            stages={journey.cancelled ? [{ ...CANCELLED_STAGE, reached: true, current: true, at: journey.cancelledAt }] : journey.stages}
            voice="customer"
          />
          {!journey.recorded && !journey.cancelled && (
            <p className="mt-1 flex items-start gap-2 rounded-xl bg-surface-sunk/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-ink-mute">
              <Info size={12} className="mt-0.5 shrink-0" />
              {NO_LOG_NOTE}
            </p>
          )}
        </section>

        {/* ── The plan they were told was ready ────────────────────── */}
        {sent && (
          <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline/[0.08]">
            <div className="flex items-center gap-2 border-b border-hairline/[0.08] px-4 py-3">
              <FileText size={15} className="shrink-0 text-accent" />
              <h2 className="flex-1 text-[14px] font-extrabold text-ink">Your plan</h2>
              {approved && (
                <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-forest-700 ring-1 ring-forest-500/20">
                  Approved
                </span>
              )}
            </div>

            {sent.customer_message && (
              <p className="border-b border-hairline/[0.06] px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
                {sent.customer_message}
              </p>
            )}

            <ul className="divide-y divide-hairline/[0.06]">
              {items.filter(i => i.proposal_id === sent.id).map(line => (
                <li key={line.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-[12.5px] text-ink-soft">
                    {line.description}
                    {line.quantity > 1 && <span className="text-ink-mute"> × {line.quantity}</span>}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-ink">
                    {formatINR(line.customer_price)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-hairline/[0.08] bg-surface-sunk/[0.03] px-4 py-3">
              <span className="text-[12px] font-bold text-ink-soft">Total</span>
              <span className="text-[16px] font-extrabold tabular-nums text-ink">
                {formatINR(sent.total_amount)}
              </span>
            </div>
          </section>
        )}

        {/* ── What it costs to commit, and what each payment starts ── */}
        <PaymentLadder
          subjectType={subjectType}
          subjectId={subjectId}
          confirmedTotal={confirmedTotal}
          eventDate={item.eventDate}
          approvedAt={approved?.updated_at ?? null}
          payments={payments}
          services={serviceIds}
          plan={plan ?? defaultPlanFor(confirmedTotal)}
          onPlanChange={setPlan}
        />

        {/* ── Everything that actually happened ────────────────────── */}
        {journey.timeline.length > 0 && (
          <section className="rounded-2xl bg-surface p-4 ring-1 ring-hairline/[0.08]">
            <h2 className="mb-3 text-[14px] font-extrabold text-ink">Everything so far</h2>
            <ol className="space-y-3">
              {journey.timeline.map(t => (
                <li key={t.id} className="flex gap-3">
                  <span aria-hidden="true" className="text-[15px] leading-none">{t.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-[12.5px] font-bold text-ink">{t.title}</span>
                      <span className="text-[11px] tabular-nums text-ink-mute">
                        {new Date(t.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        {t.inferred ? ' (approx)' : ''}
                      </span>
                    </div>
                    {t.detail && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">{t.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <a
          href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
            `Hi Sambramo, about ${item.title} (${item.reference})`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-surface px-4 py-3.5 text-[13px] font-extrabold text-ink ring-1 ring-hairline/[0.08]"
        >
          <MessageCircle size={15} className="text-forest-600" /> Ask your coordinator
        </a>
      </div>
    </div>
  )
}
