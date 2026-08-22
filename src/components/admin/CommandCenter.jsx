import { useMemo, useState, lazy, Suspense } from 'react'
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react'
import { formatINR } from '../../utils/format'
import {
  INK, STATUS, CATEGORICAL,
  compactINR, compactCount,
} from '../../config/dataviz'
import {
  areaDemand, eventFunnel, serviceDemand, customerStats, headline,
} from '../../lib/analytics'
import {
  HeroFigure, StatTile, ChartCard, BarRows, ShareBar, Funnel, Heatmap,
  Meter, SectionHead, EmptyNote, ThinDataNote,
} from './viz/Primitives'

const ChartKit = {
  DemandRevenueTrend: lazy(() => import('./charts/ChartKit').then(m => ({ default: m.DemandRevenueTrend }))),
  StackedCategoryBars: lazy(() => import('./charts/ChartKit').then(m => ({ default: m.StackedCategoryBars }))),
}

/**
 * The screen the founder opens first.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 * Not "all the numbers". The previous overview was four counters and a table
 * of every event ever raised, which answers "what exists" — a question nobody
 * has. This screen answers three, in this order, because that is the order a
 * founder actually asks them in:
 *
 *   1. Is the business up or down?          → the hero figure and the KPI row
 *   2. What needs me today?                 → the attention queue
 *   3. What is actually selling, and where? → everything below it
 *
 * The attention queue sits ABOVE the charts on purpose. A dashboard whose
 * first screenful is graphs is a report; a dashboard whose first screenful is
 * "four payments to confirm, worth ₹6,400" is a tool. The graphs are the
 * second question, and they are one scroll away.
 *
 * ── One filter row, scoping everything ───────────────────────────────────
 * The comparison window lives once, at the top, and every delta on the page
 * reads from it. Per-card time pickers are the anti-pattern: with four of them
 * a reader has no idea whether two cards are even describing the same fortnight.
 */

const WINDOWS = [
  { days: 7,  label: '7 days'  },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export default function CommandCenter({ data, onNavigate }) {
  const [windowDays, setWindowDays] = useState(30)

  const {
    events = [], proposals = [], payments = [], profiles = [],
    vendors = [], enquiries = [], complaints = [], interest = [],
    refreshing, loadedAt, refresh,
  } = data

  const model = useMemo(() => {
    const proposalValue = proposals.reduce((s, p) => s + (Number(p.total_amount) || 0), 0)

    const kpis       = headline({ events, enquiries, payments, proposalValue, windowDays })
    const concierge  = eventFunnel(events)
    const services   = serviceDemand(enquiries)
    const customers  = customerStats(profiles, events, payments)
    const geography  = areaDemand({ events, enquiries, interest })

    return { kpis, concierge, services, customers, geography, proposalValue }
  }, [events, proposals, payments, profiles, enquiries, interest, windowDays])

  const { kpis, concierge, services, customers, geography } = model

  /* The bars draw the top slice; the table under the card carries the rest. */
  const topServices = [...(services.services ?? [])]
    .sort((a, b) => b.enquiries - a.enquiries)
    .slice(0, 8)

  /* ── The attention queue ────────────────────────────────────────────── */
  const alerts = useMemo(() => {
    const list = []

    /* Money somebody says they sent. GATEWAY_VERIFIED and ADMIN_VERIFIED both
       have a witness; CUSTOMER_CLAIMED_PAID has only the customer's word, and
       that gap is the payment-confirmation backlog. */
    const claimed = payments.filter(p => p.status === 'CUSTOMER_CLAIMED_PAID')
    if (claimed.length > 0) list.push({
      id: 'payments', tone: 'critical', nav: 'requests',
      title: `${claimed.length} payment${claimed.length !== 1 ? 's' : ''} to confirm`,
      detail: `${formatINR(claimed.reduce((t, p) => t + (Number(p.amount) || 0), 0))} the customer says they sent. Nothing tells us it arrived — check the bank and tick them off.`,
    })

    const newRequests = events.filter(e => e.status === 'REQUEST_RECEIVED').length
    if (newRequests > 0) list.push({
      id: 'requests', tone: 'warning', nav: 'new_requests',
      title: `${newRequests} celebration request${newRequests !== 1 ? 's' : ''} unanswered`,
      detail: 'A concierge enquiry with nobody assigned to it yet.',
    })
    const openComplaints = complaints.filter(c => c.status === 'open').length
    if (openComplaints > 0) list.push({
      id: 'complaints', tone: 'critical', nav: 'complaints',
      title: `${openComplaints} complaint${openComplaints !== 1 ? 's' : ''} open`, detail: 'Unanswered, and the customer is waiting.',
    })
    const openQuotes = enquiries.filter(e => e.status === 'open').length
    if (openQuotes > 0) list.push({
      id: 'quotes', tone: 'warning', nav: 'enquiries',
      title: `${openQuotes} service enquir${openQuotes !== 1 ? 'ies' : 'y'} without a quote`,
      detail: 'Somebody asked what it costs and has not been told.',
    })
    const pendingVendors = vendors.filter(v => v.status === 'PENDING_REVIEW').length
    if (pendingVendors > 0) list.push({
      id: 'vendors', tone: 'warning', nav: 'vendors',
      title: `${pendingVendors} partner${pendingVendors !== 1 ? 's' : ''} awaiting review`, detail: 'Nobody can be sourced from an unapproved vendor.',
    })
    return list
  }, [payments, events, complaints, enquiries, vendors])

  return (
    <div className="space-y-6">
      {/* ── Header + the one filter row ──────────────────────────────── */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <HeroFigure
            label={`Revenue · last ${windowDays} days`}
            value={compactINR(kpis.revenue)}
            delta={kpis.revenueDelta}
            deltaPeriod={`vs prior ${windowDays}`}
            accent={CATEGORICAL[5]}
            sub={
              kpis.unconfirmed > 0
                ? `${formatINR(kpis.unconfirmed)} more is claimed paid and waiting on confirmation.`
                : `${formatINR(kpis.revenueAllTime)} taken since launch.`
            }
          />

          <div className="flex flex-col items-end gap-2">
            <div role="group" aria-label="Comparison window" className="flex rounded-xl border border-gray-200 overflow-hidden">
              {WINDOWS.map(w => (
                <button
                  key={w.days}
                  onClick={() => setWindowDays(w.days)}
                  aria-pressed={windowDays === w.days}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    windowDays === w.days ? 'bg-plum-600 text-ink' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-plum-700 disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {loadedAt ? `Updated ${loadedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile
          label="Celebrations booked" value={compactCount(kpis.requests)}
          delta={kpis.requestsDelta} deltaPeriod="vs prior" accent={CATEGORICAL[0]}
          sub={`${concierge.total} live`} onClick={() => onNavigate('new_requests')}
        />
        <StatTile
          label="Avg celebration" value={kpis.aov ? formatINR(kpis.aov) : '—'}
          sub="verified payments only" accent={CATEGORICAL[0]}
        />
        <StatTile
          label="Awaiting confirmation" value={formatINR(kpis.unconfirmed)}
          sub="customer says paid"
          tone={kpis.unconfirmed > 0 ? STATUS.critical : undefined}
          onClick={() => onNavigate('requests')}
        />
        <StatTile
          label="Service enquiries" value={compactCount(kpis.enquiries)}
          delta={kpis.enquiriesDelta} deltaPeriod="vs prior"
          sub="asked, not yet quoted" onClick={() => onNavigate('enquiries')}
        />
        <StatTile
          label="Proposal pipeline" value={compactINR(kpis.proposalValue)}
          sub="quoted, not banked" onClick={() => onNavigate('proposals')}
        />
        <StatTile
          label="Customers" value={compactCount(customers.totalCustomers)}
          sub={`${customers.repeatRate}% come back`} onClick={() => onNavigate('customers')}
        />
      </div>

      {/* ── Attention queue ──────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="What needs you today"
          sub="Everything below is somebody waiting on a decision only you can make."
        />
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <span className="text-2xl" aria-hidden="true">✅</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Nothing is waiting on you.</p>
              <p className="text-xs" style={{ color: INK.muted }}>
                No unconfirmed payments, no stalled orders, no unanswered enquiries.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 -my-1">
            {alerts.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => onNavigate(a.nav)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50/70 rounded-lg px-2 -mx-2 transition-colors group"
                >
                  {/* Status colour never travels alone — it is a dot beside a
                      sentence that says the same thing in words. */}
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS[a.tone] }} aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{a.title}</span>
                    <span className="block text-xs mt-0.5" style={{ color: INK.secondary }}>{a.detail}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-gray-300 group-hover:text-plum-600 transition-colors" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Trend ────────────────────────────────────────────────────── */}
      

      {/* ── Category demand ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        

        
      </div>

      {/* ── The two funnels ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        

        <ChartCard
          title="Celebration pipeline"
          sub="The concierge side: a request becomes a proposal, a proposal becomes an event."
          table={{
            columns: [
              { key: 'label', label: 'Stage' },
              { key: 'reached', label: 'Reached' },
              { key: 'at', label: 'Here now' },
            ],
            rows: concierge.stages.map(s => ({ ...s, key: s.id })),
          }}
        >
          {concierge.total === 0 ? (
            <EmptyNote icon="🎉">No celebration requests yet.</EmptyNote>
          ) : (
            <Funnel
              stages={concierge.stages}
              footnote={`${concierge.conversion}% of live requests have been delivered end to end. ${concierge.cancelled} cancelled.`}
            />
          )}
        </ChartCard>
      </div>

      {/* ── Products & services demand ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        

        <ChartCard
          title="Most wanted event services"
          sub="Counted from what people tick on a service enquiry — the only demand signal the concierge side has, and the one that says which supplier to line up first."
          actions={
            <button onClick={() => onNavigate('services')} className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
              Edit services →
            </button>
          }
          table={{
            columns: [
              { key: 'name', label: 'Service' },
              { key: 'enquiries', label: 'Asked for' },
              { key: 'quoted', label: 'Quoted' },
              { key: 'won', label: 'Closed' },
            ],
            rows: services.services.map(s => ({ ...s, key: s.id })),
          }}
        >
          <BarRows
            rows={topServices.map(s => ({
              id: s.id, emoji: s.emoji, label: s.name, value: s.enquiries,
              color: CATEGORICAL[2],
              note: `${s.quoted} quoted · ${s.won} closed`,
            }))}
            format={v => `${v} ${v === 1 ? 'enquiry' : 'enquiries'}`}
            emptyNote="No service enquiries yet. Every service you offer is still untested demand."
          />
        </ChartCard>
      </div>

      {/* ── Rhythm & geography ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        

        <ChartCard
          title="Where the demand is"
          sub="Every signal a place can send: deliveries, celebration requests, service enquiries, and waitlist signups from cities we do not serve yet."
          actions={
            <button onClick={() => onNavigate('geography')} className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
              Full map →
            </button>
          }
          table={{
            columns: [
              { key: 'city', label: 'City' },
              { key: 'orders', label: 'Orders' },
              { key: 'events', label: 'Requests' },
              { key: 'enquiries', label: 'Enquiries' },
              { key: 'interest', label: 'Waitlist' },
              { key: 'revenue', label: 'Revenue', render: r => formatINR(r.revenue) },
            ],
            rows: geography.cities.map(c => ({ ...c, key: c.city })),
          }}
        >
          <BarRows
            rows={geography.cities.slice(0, 8).map(c => ({
              id: c.city, label: c.city, value: c.signals, color: CATEGORICAL[0],
              note: [
                c.orders ? `${c.orders} orders` : null,
                c.events ? `${c.events} requests` : null,
                c.enquiries ? `${c.enquiries} enquiries` : null,
                c.interest ? `${c.interest} on the waitlist` : null,
              ].filter(Boolean).join(' · '),
            }))}
            format={v => `${v} signal${v === 1 ? '' : 's'}`}
            emptyNote="No orders, requests or waitlist signups carry a place yet."
          />
        </ChartCard>
      </div>

      {/* ── Health ───────────────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="Is the business healthy?"
          sub="Four ratios that move slowly and matter more than any single day's revenue."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <HealthMeter
            label="Payments confirmed"
            value={payments.filter(p => ['GATEWAY_VERIFIED', 'ADMIN_VERIFIED'].includes(p.status)).length}
            max={Math.max(1, payments.length)}
            caption={`${payments.filter(p => ['GATEWAY_VERIFIED', 'ADMIN_VERIFIED'].includes(p.status)).length} of ${payments.length}`}
            note="Direct UPI has no gateway callback, so this only moves when somebody checks the bank."
            onClick={() => onNavigate('requests')}
          />
          <HealthMeter
            label="Requests that get a proposal"
            value={concierge.stages?.find(st => st.id === 'proposal')?.count ?? 0}
            max={Math.max(1, concierge.total)}
            caption={`${concierge.stages?.find(st => st.id === 'proposal')?.count ?? 0} of ${concierge.total}`}
            note="A celebration request that never gets priced is a customer who asked and heard nothing."
            onClick={() => onNavigate('requests')}
          />
          <HealthMeter
            label="Customers who come back"
            value={customers.repeatBuyers} max={Math.max(1, customers.buyers)}
            caption={`${customers.repeatRate}%`}
            note={`${customers.repeatBuyers} of ${customers.buyers} customers have celebrated with us more than once.`}
            onClick={() => onNavigate('customers')}
          />
        </div>
      </div>

    </div>
  )
}

const BUCKET_META = [
  { id: 'star',    emoji: '🚀', label: 'Growing',    hint: 'Selling more than last window — keep them in stock' },
  { id: 'steady',  emoji: '➡️', label: 'Steady',     hint: 'Selling at about the same rate' },
  { id: 'fading',  emoji: '📉', label: 'Slipping',   hint: 'Selling less — check the photo and the price' },
  { id: 'dormant', emoji: '💤', label: 'Gone quiet', hint: 'Has sold before, nothing this window' },
  { id: 'unsold',  emoji: '🕳️', label: 'Never sold', hint: 'Listed, never ordered once' },
]

function HealthMeter({ label, value, max, caption, note, onClick }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  // Severity on the FILL, from the same ramp family — the track stays a light
  // step of blue so state reads across the whole bar.
  const fill = pct >= 66 ? STATUS.good : pct >= 33 ? STATUS.warning : '#2a78d6'
  return (
    <button onClick={onClick} className="text-left group">
      <Meter value={value} max={max} label={label} caption={caption} fill={fill} />
      <p className="text-[11px] mt-1.5 leading-snug" style={{ color: INK.muted }}>{note}</p>
      <span className="text-[11px] font-semibold text-plum-700 opacity-0 group-hover:opacity-100 transition-opacity">
        Open →
      </span>
    </button>
  )
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm" style={{ height, color: INK.muted }}>
      <Loader2 size={16} className="animate-spin" /> Drawing…
    </div>
  )
}
