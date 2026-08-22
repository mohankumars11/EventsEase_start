import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Info, MessageCircle, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { fetchActivity } from '../../lib/activity'
import { buildCelebrationJourney, NO_LOG_NOTE, CANCELLED_STAGE } from '../../lib/celebrationJourney'
import { buildSettlement } from '../../config/celebrationPayments'
import { buildServiceLedger } from '../../lib/serviceLedger'
import { formatINR } from '../../utils/format'
import JourneyStepper from '../../components/track/JourneyStepper'
import SettlePayment, { PayButton } from '../../components/track/SettlePayment'
import ServiceLedger from '../../components/track/ServiceLedger'
import PaymentReceipt from '../../components/track/PaymentReceipt'
import CelebrationReviews from '../../components/track/CelebrationReviews'
import TrackerHeader from '../../components/track/TrackerHeader'

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
 * ── The order of this screen is the argument it makes ─────────────────────
 * Read top to bottom it is: what happens next · where it is · your price, with
 * the button that pays it · your receipt · every service you ordered · what
 * actually happened · how did it go. That order is deliberate — the money is
 * asked for beside the number it is for, and everything below the payment is
 * the transparency that justifies having asked.
 *
 * ── The honesty rule, made concrete ───────────────────────────────────────
 * Only rows that wrote themselves somewhere get a timestamp: the request, the
 * quote, each proposal, each change request, the price-lock claim, the
 * payment, each service's own row. Stage transitions in between are
 * unrecorded until migration 045 is applied, so the stepper prints `time not
 * recorded` and one banner says why — rather than the screen inventing a
 * plausible-looking history for a customer who is deciding whether to trust us
 * with a wedding. `lib/serviceLedger.js` applies the same rule per service,
 * where a wrong tick would be a much more specific lie.
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

  const { user, profile } = useAuth()
  const [item, setItem] = useState(null)
  const [proposals, setProposals] = useState([])
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [eventServices, setEventServices] = useState([])
  const [log, setLog] = useState([])
  const [state, setState] = useState('loading')
  // Bumped after a payment so every panel re-reads rather than the screen
  // showing a stale "to pay" beside a receipt.
  const [refresh, setRefresh] = useState(0)

  const reload = useCallback(() => setRefresh(n => n + 1), [])

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

      // The single settlement reaches an enquiry too — migration 046 dropped
      // the NOT NULL on `event_id` and added `enquiry_id`, so the builder and
      // the services cart are no longer structurally unable to hold a payment.
      supabase.from('event_payments')
        .select('id, event_id, enquiry_id, amount, payment_type, status, milestone_id, schedule_version, due_at, paid_at, notes, created_at')
        .eq(subjectType === 'event' ? 'event_id' : 'enquiry_id', subjectId)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (!cancelled && data) setPayments(data) })

      // Proposals, proposal lines and the per-service rows remain events-only:
      // none of those tables has an enquiry column, and inventing one is a
      // bigger change than this. The ledger reads an enquiry's services out of
      // its JSONB instead — see lib/serviceLedger.js.
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

      // What the customer actually asked us to arrange, one row per service.
      // Customer-readable by RLS since migration 004; nothing has ever shown
      // it to them until now.
      supabase.from('event_services')
        .select('id, event_id, service_category, service_name, description, quantity, status, created_at, updated_at')
        .eq('event_id', subjectId)
        .then(({ data }) => { if (!cancelled && data) setEventServices(data) })

      supabase.from('event_change_requests')
        .select('id, event_id, description, created_at, resolved_at')
        .eq('event_id', subjectId)
        .then(({ data }) => { if (!cancelled && data) setChangeRequests(data) })
    }

    load()
    return () => { cancelled = true }
  }, [user, subjectId, subjectType, refresh])

  const journey = useMemo(
    () => (item ? buildCelebrationJourney(item, { log, proposals, payments, changeRequests }) : null),
    [item, log, proposals, payments, changeRequests],
  )

  // The services on this booking drive which release lines are true for it.
  const serviceIds = useMemo(() => {
    const raw = item?.raw?.services
    if (Array.isArray(raw)) return raw.map(s => s?.id).filter(Boolean)
    return eventServices
      .map(r => String(r.service_category ?? r.service_name ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
      .filter(Boolean)
  }, [item, eventServices])

  const approved = proposals.find(p => p.status === 'APPROVED')
  const sent = proposals.find(p => p.status === 'SENT' || p.status === 'APPROVED')
  const confirmedTotal = journey?.payment.confirmedTotal ?? null

  const settlement = useMemo(() => buildSettlement({
    confirmedTotal,
    eventDate: item?.eventDate ?? null,
    approvedAt: approved?.updated_at ?? item?.raw?.quoted_at ?? null,
    payments,
    services: serviceIds,
  }), [confirmedTotal, item, approved, payments, serviceIds])

  const ledger = useMemo(() => buildServiceLedger({
    item,
    eventServices,
    proposal: sent ?? null,
    proposalItems: items,
    settlement,
    log,
  }), [item, eventServices, sent, items, settlement, log])

  if (state === 'loading') {
    return (
      <div className="a-canvas min-h-screen pb-bottom-nav">
        <TrackerHeader title="Your celebration" />
        <div className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse a-well" />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'missing' || !journey) {
    return (
      <div className="a-canvas min-h-screen pb-bottom-nav">
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

  const contact = {
    name: profile?.full_name ?? item.raw?.customer_name ?? null,
    email: profile?.email ?? item.raw?.customer_email ?? null,
    phone: profile?.phone ?? item.raw?.customer_phone ?? null,
  }
  const priced = settlement.basis === 'confirmed'
  const owes = priced && !settlement.settled && !journey.cancelled

  return (
    <div className="a-canvas min-h-screen pb-bottom-nav">
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

        {/* ── Payment received, and what it set off ─────────────────
            Above the stepper on purpose: somebody who has just paid opens
            this screen to be told it landed, and making them scroll past a
            progress rail to find out is how a confident customer becomes a
            support message. */}
        <PaymentReceipt
          settlement={settlement}
          item={item}
          proposal={approved ?? sent ?? null}
          ledger={ledger}
        />

        {/* ── Where it is ──────────────────────────────────────────── */}
        <section className="a-card p-4">
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

        {/* ── The plan they were told was ready ──────────────────────
            Events carry an itemised proposal. Enquiries carry one confirmed
            number and no lines, so they get the block below instead — the
            important half being the same either way: the price, and the
            button that pays it, in the same eyeline. */}
        {sent && (
          <section className="overflow-hidden a-card">
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

            {/* ── The total, with the payment link beside it ─────────
                This is the moment the customer decides. A pay button parked
                at the bottom of a different card makes somebody scroll away
                from the number they are agreeing to, and every scroll
                between the price and the button is a chance to not pay. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline/[0.08] bg-surface-sunk/[0.03] px-4 py-3">
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                  {settlement.settled ? 'Paid in full' : 'Your price'}
                </span>
                <span className="block text-[19px] font-extrabold leading-tight tabular-nums text-ink">
                  {formatINR(sent.total_amount)}
                </span>
              </span>
              {owes && (
                <PayButton
                  subjectType={subjectType}
                  subjectId={subjectId}
                  amount={settlement.settlement.amount}
                  contact={contact}
                  label={item.title}
                  onPaid={reload}
                  size="compact"
                />
              )}
            </div>
          </section>
        )}

        {/* ── An enquiry's confirmed price ───────────────────────────
            `service_enquiries` has no proposal table behind it — a
            coordinator sets `quoted_price` and that one number is the whole
            agreement. It was previously shown nowhere on this screen, so a
            customer whose celebration came through the builder or the
            services cart could be quoted and have no way to pay. */}
        {!sent && priced && (
          <section className="overflow-hidden a-card">
            <div className="flex items-center gap-2 border-b border-hairline/[0.08] px-4 py-3">
              <FileText size={15} className="shrink-0 text-accent" />
              <h2 className="flex-1 text-[14px] font-extrabold text-ink">Your confirmed price</h2>
            </div>
            <p className="px-4 pt-3 text-[11.5px] leading-relaxed text-ink-mute">
              Your coordinator has priced this celebration. It covers everything on your
              list below — one number, one payment.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3 px-4 pb-3.5 pt-2">
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                  {settlement.settled ? 'Paid in full' : 'Your price'}
                </span>
                <span className="block text-[19px] font-extrabold leading-tight tabular-nums text-ink">
                  {formatINR(settlement.confirmedTotal)}
                </span>
              </span>
              {owes && (
                <PayButton
                  subjectType={subjectType}
                  subjectId={subjectId}
                  amount={settlement.settlement.amount}
                  contact={contact}
                  label={item.title}
                  onPaid={reload}
                  size="compact"
                />
              )}
            </div>
          </section>
        )}

        {/* ── What it costs to commit, and what the payment starts ── */}
        <SettlePayment
          subjectType={subjectType}
          subjectId={subjectId}
          confirmedTotal={confirmedTotal}
          eventDate={item.eventDate}
          approvedAt={approved?.updated_at ?? item.raw?.quoted_at ?? null}
          payments={payments}
          services={serviceIds}
          contact={contact}
          label={item.title}
          onPaid={reload}
        />

        {/* ── Every service, with its own ticks ────────────────────── */}
        <ServiceLedger ledger={ledger} />

        {/* ── Everything that actually happened ────────────────────── */}
        {journey.timeline.length > 0 && (
          <section className="a-card p-4">
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

        {/* ── How did it go ────────────────────────────────────────
            Only once it is over. A rating asked for mid-arrangement measures
            anxiety rather than quality. */}
        {item.stage === 'done' && !journey.cancelled && (
          <CelebrationReviews
            subjectType={subjectType}
            subjectId={subjectId}
            ledger={ledger}
          />
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
