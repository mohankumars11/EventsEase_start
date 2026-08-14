import { useMemo, useState, lazy, Suspense } from 'react'
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react'
import { SHOP_CATEGORIES } from '../../config/shop'
import { formatINR } from '../../utils/format'
import {
  INK, STATUS, CATEGORICAL,
  shopCategoryColor, compactINR, compactCount,
} from '../../config/dataviz'
import {
  orderLines, paidOnly, dailySeries, monthlySeries, weekdayHeatmap,
  productDemand, productBuckets, categoryDemand, areaDemand,
  orderLifecycle, eventFunnel, serviceDemand, customerStats, headline,
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
    orders = [], products = [], events = [], proposals = [], profiles = [],
    vendors = [], enquiries = [], returns = [], complaints = [], interest = [],
    refreshing, loadedAt, refresh,
  } = data

  const model = useMemo(() => {
    const lines = orderLines(orders)
    const proposalValue = proposals.reduce((s, p) => s + (Number(p.total_amount) || 0), 0)

    const kpis = headline({ orders, events, proposalValue, windowDays })
    const series = dailySeries(lines, windowDays)
    const monthly = monthlySeries(lines, 6)
    const categories = categoryDemand(SHOP_CATEGORIES, lines)
    const productRows = productDemand(products, lines, { windowDays })
    const buckets = productBuckets(productRows)
    const lifecycle = orderLifecycle(orders)
    const concierge = eventFunnel(events)
    const services = serviceDemand(enquiries)
    const customers = customerStats(profiles, orders, events)
    const geography = areaDemand({ orders, events, enquiries, interest })
    const heat = weekdayHeatmap(lines, 12)

    // Monthly revenue split by category, for the stacked bars. Built from the
    // same category rows so the colours are pinned to the same ids.
    const monthlyByCategory = monthly.map(m => ({ label: m.label }))
    const paid = paidOnly(lines)
    for (const cat of categories) {
      monthly.forEach((m, i) => { monthlyByCategory[i][cat.id] = 0 })
    }
    for (const l of paid) {
      const t = new Date(l.created_at)
      const label = t.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      const row = monthlyByCategory.find(r => r.label === label)
      if (row) row[l.category || 'Uncategorized'] = (row[l.category || 'Uncategorized'] ?? 0) + (Number(l.subtotal) || 0)
    }

    return {
      lines, kpis, series, monthly, monthlyByCategory, categories,
      productRows, buckets, lifecycle, concierge, services, customers, geography, heat,
      proposalValue,
    }
  }, [orders, products, events, proposals, profiles, enquiries, interest, windowDays])

  const { kpis, series, categories, productRows, buckets, lifecycle, concierge, services, customers, geography, heat, monthlyByCategory } = model

  /* ── The attention queue ────────────────────────────────────────────── */
  const alerts = useMemo(() => {
    const list = []
    const stuck = lifecycle.stages.reduce((s, st) => s + st.stuck, 0)

    if (lifecycle.awaitingPayment > 0) list.push({
      id: 'payments', tone: 'critical', nav: 'orders',
      title: `${lifecycle.awaitingPayment} payment${lifecycle.awaitingPayment !== 1 ? 's' : ''} to confirm`,
      detail: `${formatINR(lifecycle.awaitingPaymentValue)} the customer says they sent. Nothing tells us it arrived — check the UPI app and tick them off.`,
    })
    if (stuck > 0) list.push({
      id: 'stuck', tone: 'serious', nav: 'lifecycle',
      title: `${stuck} order${stuck !== 1 ? 's' : ''} not moving`,
      detail: 'Sitting at the same stage past its normal turnaround.',
    })
    const newRequests = events.filter(e => e.status === 'REQUEST_RECEIVED').length
    if (newRequests > 0) list.push({
      id: 'requests', tone: 'warning', nav: 'new_requests',
      title: `${newRequests} celebration request${newRequests !== 1 ? 's' : ''} unanswered`,
      detail: 'A concierge enquiry with nobody assigned to it yet.',
    })
    const openReturns = returns.filter(r => r.status === 'requested').length
    if (openReturns > 0) list.push({
      id: 'returns', tone: 'serious', nav: 'support',
      title: `${openReturns} return${openReturns !== 1 ? 's' : ''} awaiting a decision`, detail: 'Approve and refund, or reject with a reason.',
    })
    const openComplaints = complaints.filter(c => c.status === 'open').length
    if (openComplaints > 0) list.push({
      id: 'complaints', tone: 'critical', nav: 'support',
      title: `${openComplaints} complaint${openComplaints !== 1 ? 's' : ''} open`, detail: 'Unanswered, and the customer is waiting.',
    })
    const openQuotes = enquiries.filter(e => e.status === 'open').length
    if (openQuotes > 0) list.push({
      id: 'quotes', tone: 'warning', nav: 'support',
      title: `${openQuotes} service enquir${openQuotes !== 1 ? 'ies' : 'y'} without a quote`,
      detail: 'Somebody asked what it costs and has not been told.',
    })
    const pendingVendors = vendors.filter(v => v.status === 'PENDING_REVIEW').length
    if (pendingVendors > 0) list.push({
      id: 'vendors', tone: 'warning', nav: 'vendors',
      title: `${pendingVendors} partner${pendingVendors !== 1 ? 's' : ''} awaiting review`, detail: 'Nobody can be sourced from an unapproved vendor.',
    })
    const noPhoto = productRows.filter(p => !p.orphan && !p.image_url).length
    if (noPhoto > 0) list.push({
      id: 'photos', tone: 'warning', nav: 'catalog',
      title: `${noPhoto} product${noPhoto !== 1 ? 's' : ''} with no photograph`,
      detail: 'An emoji tile on a shop shelf is a product nobody buys.',
    })
    return list
  }, [lifecycle, events, returns, complaints, enquiries, vendors, productRows])

  /* ── Derived display rows ───────────────────────────────────────────── */

  // Sorted by the figure the bars actually draw. `productDemand` returns rows
  // ranked by paid revenue, and this card ranks by value ORDERED — leaving it
  // on the default sort put a longer bar below a shorter one, which reads as a
  // broken chart even though both numbers were right.
  const topProducts = productRows
    .filter(p => p.demandUnits > 0)
    .sort((a, b) => b.demandValue - a.demandValue)
    .slice(0, 8)
  const topServices = services.services.slice(0, 8)
  const photographed = productRows.filter(p => !p.orphan && p.image_source === 'actual').length
  const catalogueSize = productRows.filter(p => !p.orphan).length
  const soldEver = productRows.filter(p => !p.orphan && p.everSold).length

  const categoriesRanked = [...categories].sort((a, b) => b.demandValue - a.demandValue)
  const anySales = categories.some(c => c.demandUnits > 0)

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
            spark={series.map(d => d.revenue)}
            accent={CATEGORICAL[5]}
            sub={
              kpis.unconfirmed > 0
                ? `${formatINR(kpis.unconfirmed)} more was ordered and is waiting on payment confirmation.`
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
          label="Orders" value={compactCount(kpis.orders)} delta={kpis.ordersDelta}
          deltaPeriod="vs prior" spark={series.map(d => d.orders)} accent={CATEGORICAL[0]}
          sub={`${kpis.units} items`} onClick={() => onNavigate('lifecycle')}
        />
        <StatTile
          label="Avg order" value={kpis.aov ? formatINR(kpis.aov) : '—'}
          sub="paid orders only" accent={CATEGORICAL[0]}
        />
        <StatTile
          label="Awaiting payment" value={formatINR(lifecycle.awaitingPaymentValue)}
          sub={`${lifecycle.awaitingPayment} order${lifecycle.awaitingPayment !== 1 ? 's' : ''}`}
          tone={lifecycle.awaitingPayment > 0 ? STATUS.critical : undefined}
          onClick={() => onNavigate('orders')}
        />
        <StatTile
          label="Celebration requests" value={compactCount(kpis.enquiries)}
          delta={kpis.enquiriesDelta} deltaPeriod="vs prior"
          sub={`${concierge.total} live`} onClick={() => onNavigate('new_requests')}
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
      <ChartCard
        title="Ordered vs paid"
        sub="The filled area is what customers ordered; the line is what has been confirmed as received. The gap between them is your payment-confirmation backlog, not lost interest."
        table={{
          columns: [
            { key: 'label', label: 'Day' },
            { key: 'demand', label: 'Ordered', render: r => formatINR(r.demand) },
            { key: 'revenue', label: 'Paid', render: r => formatINR(r.revenue) },
            { key: 'orders', label: 'Orders' },
          ],
          rows: series.filter(d => d.demand > 0 || d.orders > 0),
        }}
      >
        <Suspense fallback={<ChartSkeleton height={240} />}>
          <ChartKit.DemandRevenueTrend data={series} />
        </Suspense>
        <ThinDataNote n={series.reduce((s, d) => s + d.orders, 0)} noun="orders" />
      </ChartCard>

      {/* ── Category demand ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="Where the money comes from"
          sub="Share of everything customers have ordered, by shelf."
          table={{
            columns: [
              { key: 'label', label: 'Category' },
              { key: 'demandUnits', label: 'Units ordered' },
              { key: 'demandValue', label: 'Ordered', render: r => formatINR(r.demandValue) },
              { key: 'revenue', label: 'Paid', render: r => formatINR(r.revenue) },
              { key: 'products', label: 'Distinct items' },
            ],
            rows: categoriesRanked.map(c => ({ ...c, key: c.id })),
          }}
        >
          {anySales ? (
            <>
              <ShareBar
                segments={categoriesRanked.map(c => ({
                  id: c.id, label: c.label, value: c.demandValue, color: shopCategoryColor(c.id),
                }))}
                format={formatINR}
              />
              <div className="mt-5">
                <BarRows
                  rows={categoriesRanked.map(c => ({
                    id: c.id, emoji: c.emoji, label: c.label, value: c.demandValue,
                    color: shopCategoryColor(c.id),
                    note: `${c.demandUnits} units · ${c.products} distinct item${c.products === 1 ? '' : 's'} · ${productRows.filter(p => p.category === c.id && !p.orphan).length} listed`,
                  }))}
                  format={formatINR}
                />
              </div>
            </>
          ) : (
            <EmptyNote icon="🛍️">
              No shop orders yet. The moment the first one lands, this splits by shelf.
            </EmptyNote>
          )}
        </ChartCard>

        <ChartCard
          title="Shelf mix, month by month"
          sub="Whether the shop is broadening or leaning harder on one shelf."
          table={{
            columns: [
              { key: 'label', label: 'Month' },
              ...categoriesRanked.map(c => ({ key: c.id, label: c.label, render: r => formatINR(r[c.id] ?? 0) })),
            ],
            rows: monthlyByCategory,
          }}
        >
          {anySales ? (
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <ChartKit.StackedCategoryBars
                data={monthlyByCategory}
                series={categoriesRanked
                  .filter(c => c.revenue > 0)
                  .map(c => ({ key: c.id, label: c.label, color: shopCategoryColor(c.id) }))}
              />
            </Suspense>
          ) : (
            <EmptyNote icon="📊">Six months of history will appear here as it accumulates.</EmptyNote>
          )}
        </ChartCard>
      </div>

      {/* ── The two funnels ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="Shop order lifecycle"
          sub="Bar length is how many orders have reached that stage; the figure on the right is how many are sitting there now."
          table={{
            columns: [
              { key: 'status', label: 'Stage' },
              { key: 'reached', label: 'Reached' },
              { key: 'at', label: 'Here now' },
              { key: 'value', label: 'Value here', render: r => formatINR(r.value) },
              { key: 'stuck', label: 'Overdue' },
            ],
            rows: lifecycle.stages.map(s => ({ ...s, key: s.status })),
          }}
          actions={
            <button onClick={() => onNavigate('lifecycle')} className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
              Full view →
            </button>
          }
        >
          {lifecycle.total === 0 ? (
            <EmptyNote icon="📦">No orders yet.</EmptyNote>
          ) : (
            <Funnel
              stages={lifecycle.stages}
              labelKey="status"
              footnote={`${lifecycle.completionRate}% of every order ever placed has been delivered. ${lifecycle.cancelled} cancelled.`}
            />
          )}
        </ChartCard>

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
          title="Most wanted products"
          sub="By value ordered, cancellations excluded."
          actions={
            <button onClick={() => onNavigate('products')} className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
              All products →
            </button>
          }
          table={{
            columns: [
              { key: 'name', label: 'Product' },
              { key: 'demandUnits', label: 'Ordered' },
              { key: 'units', label: 'Paid' },
              { key: 'revenue', label: 'Revenue', render: r => formatINR(r.revenue) },
            ],
            rows: topProducts.map(p => ({ ...p, key: p.id })),
          }}
        >
          <BarRows
            rows={topProducts.map(p => ({
              id: p.id, emoji: p.emoji, label: p.name, value: p.demandValue,
              color: shopCategoryColor(p.category),
              note: `${p.demandUnits} ordered · ${p.units} paid${p.paidRate != null && p.paidRate < 100 ? ` (${p.paidRate}% confirmed)` : ''}`,
            }))}
            format={formatINR}
            emptyNote="Nothing has been ordered yet."
          />
        </ChartCard>

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
          title="When people buy"
          sub="Units ordered per day over the last twelve weeks. Weekends run across the middle of the grid."
          table={{
            columns: [
              { key: 'iso', label: 'Date' },
              { key: 'value', label: 'Units' },
            ],
            rows: heat.columns.flatMap(c => c.days).filter(d => d.value > 0).map(d => ({ ...d, key: d.iso })),
          }}
        >
          <Heatmap columns={heat.columns} max={heat.max} />
        </ChartCard>

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
            label="Catalogue actually selling"
            value={soldEver} max={catalogueSize}
            caption={`${soldEver} of ${catalogueSize}`}
            note="Items with at least one order ever. A shelf nobody has bought from is a shelf, not a business."
            onClick={() => onNavigate('products')}
          />
          <HealthMeter
            label="Real photographs"
            value={photographed} max={catalogueSize}
            caption={`${photographed} of ${catalogueSize}`}
            note="Products showing what will actually arrive, rather than a licensed lookalike."
            onClick={() => onNavigate('catalog')}
          />
          <HealthMeter
            label="Payments confirmed"
            value={lifecycle.total - lifecycle.awaitingPayment} max={Math.max(1, lifecycle.total)}
            caption={`${lifecycle.total - lifecycle.awaitingPayment} of ${lifecycle.total}`}
            note="Direct UPI has no gateway callback, so this only moves when somebody checks the bank."
            onClick={() => onNavigate('orders')}
          />
          <HealthMeter
            label="Customers who come back"
            value={customers.repeatBuyers} max={Math.max(1, customers.buyers)}
            caption={`${customers.repeatRate}%`}
            note={`${customers.repeatBuyers} of ${customers.buyers} buyers have ordered more than once.`}
            onClick={() => onNavigate('customers')}
          />
        </div>
      </div>

      {/* ── Catalogue attention split ────────────────────────────────── */}
      <ChartCard
        title="The catalogue, sorted by what to do about it"
        sub="Every product falls into exactly one of these. Pre-launch, almost all of them are in the last bucket — that is expected, and it is the list to work through."
        table={{
          columns: [
            { key: 'label', label: 'Bucket' },
            { key: 'count', label: 'Products' },
            { key: 'examples', label: 'For example' },
          ],
          rows: BUCKET_META.map(b => ({
            key: b.id, label: b.label, count: buckets[b.id].length,
            examples: buckets[b.id].slice(0, 3).map(p => p.name).join(', ') || '—',
          })),
        }}
        actions={
          <button onClick={() => onNavigate('products')} className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
            Product intelligence →
          </button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {BUCKET_META.map(b => (
            <button
              key={b.id}
              onClick={() => onNavigate('products')}
              className="text-left p-3.5 rounded-xl border border-gray-100 hover:border-plum-200 hover:shadow-sm transition-all"
              style={{ background: INK.plane }}
            >
              <div className="text-xl mb-1" aria-hidden="true">{b.emoji}</div>
              <div className="text-xl font-bold" style={{ color: INK.primary }}>{buckets[b.id].length}</div>
              <div className="text-[11px] font-semibold text-gray-700 mt-0.5">{b.label}</div>
              <div className="text-[10px] mt-1 leading-snug" style={{ color: INK.muted }}>{b.hint}</div>
            </button>
          ))}
        </div>
      </ChartCard>
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
