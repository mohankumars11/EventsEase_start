import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, X, Phone, MessageCircle, Loader2, AlertCircle,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, Users, Search, Mail,
} from 'lucide-react'
// Lazy so `recharts` is a separate chunk fetched only when the Revenue view
// is opened, rather than 376 KB every operator pays to see any other tab.
const RevenueTrendChart = lazy(() => import('../../components/admin/RevenueTrendChart'))
// Same reasoning: the catalogue editor pulls in the image upload/compression
// path and is opened by one operator occasionally, not on every dashboard load.
const AdminCatalog = lazy(() => import('../../components/admin/AdminCatalog'))
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, friendlyError } from '../../context/ToastContext'
import { EVENT_STATUSES, STATUS_CSS, PRIORITIES, EVENT_TYPE_EMOJIS, BRAND } from '../../config/sambramo'
import { SHOP_CATEGORIES } from '../../config/shop'
import SambramoMark from '../../components/ui/SambramoMark'
import DateDemandAdmin from '../../components/admin/DateDemandAdmin'
import { formatDate, formatINR } from '../../utils/format'

// Dataviz-skill validated categorical order (adjacent-pair CVD/contrast
// gates pass for 6 slots) — fixed order, one hue per shop category,
// never reassigned when a category has zero sales.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']

/* ── Sidebar navigation items ──────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'overview',        label: 'Dashboard',        emoji: '🏠' },
  { id: 'new_requests',    label: 'New Requests',     emoji: '📥' },
  { id: 'under_review',    label: 'Under Review',     emoji: '🔍' },
  { id: 'vendor_sourcing', label: 'Vendor Sourcing',  emoji: '📞' },
  { id: 'proposals',       label: 'Proposals',        emoji: '📋' },
  { id: 'confirmed',       label: 'Confirmed Events', emoji: '✅' },
  { id: 'upcoming',        label: 'Upcoming Events',  emoji: '📅' },
  { id: 'vendors',         label: 'Vendors',          emoji: '🤝' },
  { id: 'orders',          label: 'Shop Orders',      emoji: '🛍️' },
  { id: 'catalog',         label: 'Catalog',          emoji: '🖼️' },
  { id: 'customers',       label: 'Customers',        emoji: '👥' },
  { id: 'reviews',         label: 'Reviews',          emoji: '⭐' },
  { id: 'support',         label: 'Support',          emoji: '🛟' },
  { id: 'revenue',         label: 'Revenue',          emoji: '📊' },
  { id: 'city_demand',     label: 'City Demand',      emoji: '🗺️' },
  { id: 'dates',           label: 'Date Demand',      emoji: '📆' },
]

const TABLE_TABS = ['All', 'New', 'In Progress', 'Proposals', 'Confirmed', 'Completed']

const ACTIVE_STATUSES = [
  'CONTACTING_VENDORS', 'QUOTES_COLLECTED', 'PROPOSAL_PREPARED',
  'PROPOSAL_SENT', 'CUSTOMER_REVIEW', 'CUSTOMER_CHANGES_REQUESTED',
  'APPROVED', 'CONFIRMED', 'IN_COORDINATION',
]

/* ── Shared badge components ───────────────────────────────────── */
function StatusBadge({ status }) {
  const css = STATUS_CSS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const label = EVENT_STATUSES[status]?.label ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
      {label}
    </span>
  )
}

function PriorityDot({ priority }) {
  const p = PRIORITIES[priority] ?? PRIORITIES.NORMAL
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${p.dot} shrink-0`} />
      <span className={`text-xs font-medium ${p.text}`}>{p.label}</span>
    </span>
  )
}

/* ── Search + filter bar ───────────────────────────────────────── */
function SearchFilters({
  search, setSearch,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  filterCity, setFilterCity,
  cities, eventTypes,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        placeholder="Search by ID, customer, city…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input flex-1 min-w-[180px] max-w-xs py-2 text-sm"
      />
      <select
        value={filterStatus}
        onChange={e => setFilterStatus(e.target.value)}
        className="input text-sm py-2 w-auto pr-8"
      >
        <option value="">All Statuses</option>
        {Object.entries(EVENT_STATUSES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      <select
        value={filterType}
        onChange={e => setFilterType(e.target.value)}
        className="input text-sm py-2 w-auto pr-8"
      >
        <option value="">All Types</option>
        {eventTypes.map(t => (
          <option key={t} value={t}>
            {EVENT_TYPE_EMOJIS[t] ?? '🎉'} {t.replace(/-/g, ' ')}
          </option>
        ))}
      </select>
      <select
        value={filterCity}
        onChange={e => setFilterCity(e.target.value)}
        className="input text-sm py-2 w-auto pr-8"
      >
        <option value="">All Cities</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

/* ── Events data table ─────────────────────────────────────────── */
function EventsTable({
  events, navigate, showAssign, onAssign,
  search, setSearch, filterStatus, setFilterStatus,
  filterType, setFilterType, filterCity, setFilterCity,
  cities, eventTypes,
}) {
  return (
    <div className="space-y-4">
      <SearchFilters
        search={search} setSearch={setSearch}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterType={filterType} setFilterType={setFilterType}
        filterCity={filterCity} setFilterCity={setFilterCity}
        cities={cities} eventTypes={eventTypes}
      />

      {events.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm font-medium">No events found matching the filter.</p>
          {(search || filterStatus || filterType || filterCity) && (
            <p className="text-xs text-gray-400 mt-1">Try clearing the search or filter above.</p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Request ID', 'Customer', 'Event Type', 'Date', 'City', 'Budget', 'Status', 'Priority', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map(ev => (
                  <tr
                    key={ev.id}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/admin/events/${ev.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-plum-700 font-semibold bg-plum-50 px-1.5 py-0.5 rounded">
                        {ev.event_code ?? ev.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs leading-tight">
                        {ev.profiles?.full_name ?? '—'}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{ev.profiles?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="mr-1">{EVENT_TYPE_EMOJIS[ev.event_type] ?? '🎉'}</span>
                      <span className="text-xs text-gray-700 capitalize">
                        {ev.event_type?.replace(/-/g, ' ') ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {ev.event_date ? formatDate(ev.event_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{ev.city ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {ev.budget_text ?? (ev.budget ? formatINR(ev.budget) : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityDot priority={ev.priority} />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => navigate(`/dashboard/admin/events/${ev.id}`)}
                          className="px-2.5 py-1 bg-plum-600 text-white text-xs font-medium rounded-lg hover:bg-plum-700 transition-colors"
                        >
                          View Details
                        </button>
                        {ev.profiles?.phone && (
                          <>
                            <a
                              href={`tel:${ev.profiles.phone}`}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Call"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/${ev.profiles.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${ev.profiles.full_name ?? ''}, this is your Sambramo coordinator!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </>
                        )}
                        {showAssign && (
                          <button
                            onClick={() => onAssign?.(ev.id)}
                            className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap"
                          >
                            Assign to me
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Overview tab ──────────────────────────────────────────────── */
function OverviewContent({
  metrics, filteredEvents, tableTab, setTableTab,
  search, setSearch, filterStatus, setFilterStatus,
  filterType, setFilterType, filterCity, setFilterCity,
  cities, eventTypes, navigate,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Operations Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '📥', label: 'New Requests',         value: metrics.new,       color: 'bg-blue-50'    },
            { icon: '⚡',  label: 'Active Events',        value: metrics.active,    color: 'bg-purple-50'  },
            { icon: '📋', label: 'Proposals Pending',    value: metrics.proposals, color: 'bg-amber-50'   },
            { icon: '✅', label: 'Completed This Month', value: metrics.completed, color: 'bg-emerald-50' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl ${color}`}>
                {icon}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {TABLE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setTableTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tableTab === tab
                  ? 'bg-plum-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <EventsTable
          events={filteredEvents}
          navigate={navigate}
          search={search} setSearch={setSearch}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterType={filterType} setFilterType={setFilterType}
          filterCity={filterCity} setFilterCity={setFilterCity}
          cities={cities} eventTypes={eventTypes}
        />
      </div>
    </div>
  )
}

/* ── Revenue tab ───────────────────────────────────────────────── */
function KpiTile({ label, value, delta, sub }) {
  const isUp = typeof delta === 'number' && delta >= 0
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-2xl font-bold text-gray-900 break-words">{value}</div>
      <div className="flex items-center gap-1.5 mt-1.5 min-h-[16px]">
        {typeof delta === 'number' && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  )
}

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

function RevenueContent({ events, proposalValue }) {
  const completedCount = events.filter(e => e.status === 'COMPLETED').length
  const confirmedCount = events.filter(e => ['CONFIRMED', 'APPROVED'].includes(e.status)).length

  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [expandedCategory, setExpandedCategory] = useState(null)

  useEffect(() => { fetchSales() }, [])

  async function fetchSales() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, created_at, order_items(product_name, category, unit_price, qty, subtotal)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setOrders(data ?? [])
    setLoading(false)
  }

  // Flatten paid orders' line items — only paid orders count as real
  // revenue, matching how OrdersContent treats payment_status elsewhere.
  const paidItems = useMemo(() => {
    return orders
      .filter(o => o.payment_status === 'paid')
      .flatMap(o => (o.order_items ?? []).map(i => ({ ...i, order_id: o.id, created_at: o.created_at })))
  }, [orders])

  const shopRevenue = paidItems.reduce((s, i) => s + (i.subtotal ?? 0), 0)
  const totalRevenue = shopRevenue + proposalValue

  function sumBetween(from, to) {
    return paidItems
      .filter(i => { const t = new Date(i.created_at); return t >= from && t < to })
      .reduce((s, i) => s + (i.subtotal ?? 0), 0)
  }
  function pctDelta(curr, prev) {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  const todayStart     = startOfDay(new Date())
  const tomorrowStart  = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart      = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)
  const prevWeekStart  = new Date(weekStart);  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const monthStart     = new Date(todayStart); monthStart.setDate(monthStart.getDate() - 30)
  const prevMonthStart = new Date(monthStart); prevMonthStart.setDate(prevMonthStart.getDate() - 30)

  const todayRevenue     = sumBetween(todayStart, tomorrowStart)
  const yesterdayRevenue = sumBetween(yesterdayStart, todayStart)
  const weekRevenue      = sumBetween(weekStart, tomorrowStart)
  const prevWeekRevenue  = sumBetween(prevWeekStart, weekStart)
  const monthRevenue     = sumBetween(monthStart, tomorrowStart)
  const prevMonthRevenue = sumBetween(prevMonthStart, monthStart)

  // One row per known shop category, in the fixed CATEGORY_COLORS order —
  // zero-sale categories still render (at 0) rather than disappearing, so
  // the color→category mapping never shifts as sales come in.
  const categoryRevenue = useMemo(() => {
    const map = {}
    for (const item of paidItems) {
      const cat = item.category || 'Uncategorized'
      if (!map[cat]) map[cat] = { revenue: 0, qty: 0, orderIds: new Set() }
      map[cat].revenue += item.subtotal ?? 0
      map[cat].qty += item.qty ?? 0
      map[cat].orderIds.add(item.order_id)
    }
    return SHOP_CATEGORIES.map((c, idx) => ({
      id: c.id, label: c.label, emoji: c.emoji, color: CATEGORY_COLORS[idx],
      revenue: map[c.id]?.revenue ?? 0,
      qty: map[c.id]?.qty ?? 0,
      orders: map[c.id]?.orderIds.size ?? 0,
    })).sort((a, b) => b.revenue - a.revenue)
  }, [paidItems])

  const maxCategoryRevenue   = Math.max(1, ...categoryRevenue.map(c => c.revenue))
  const totalCategoryRevenue = categoryRevenue.reduce((s, c) => s + c.revenue, 0) || 1

  function topProductsForCategory(catId) {
    const map = {}
    for (const item of paidItems) {
      if ((item.category || 'Uncategorized') !== catId) continue
      if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, revenue: 0, qty: 0 }
      map[item.product_name].revenue += item.subtotal ?? 0
      map[item.product_name].qty += item.qty ?? 0
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }

  const topProducts = useMemo(() => {
    const map = {}
    for (const item of paidItems) {
      if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, category: item.category || 'Uncategorized', revenue: 0, qty: 0 }
      map[item.product_name].revenue += item.subtotal ?? 0
      map[item.product_name].qty += item.qty ?? 0
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [paidItems])

  const trendData = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      days.push({ date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: sumBetween(d, next) })
    }
    return days
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidItems])

  const funnel = ['placed', 'processing', 'dispatched', 'delivered'].map(s => ({
    status: s, count: orders.filter(o => o.status === s).length,
  }))
  const paymentBreakdown = ['paid', 'pending', 'failed'].map(s => ({
    status: s, count: orders.filter(o => o.payment_status === s).length,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchSales} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-lg font-bold text-gray-900">📊 Sales &amp; Revenue</h2>

      {/* KPI ticker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Revenue" value={formatINR(totalRevenue)} sub="Shop + event proposals" />
        <KpiTile label="Today" value={formatINR(todayRevenue)} delta={pctDelta(todayRevenue, yesterdayRevenue)} sub="vs yesterday" />
        <KpiTile label="This Week" value={formatINR(weekRevenue)} delta={pctDelta(weekRevenue, prevWeekRevenue)} sub="vs prior 7 days" />
        <KpiTile label="This Month" value={formatINR(monthRevenue)} delta={pctDelta(monthRevenue, prevMonthRevenue)} sub="vs prior 30 days" />
      </div>

      {/* Revenue trend */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">Shop Revenue — Last 30 Days</h3>
        <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Loading chart…</div>}>
          <RevenueTrendChart data={trendData} />
        </Suspense>
      </div>

      {/* Category breakdown with click-to-drill-down */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-3">Revenue by Category</h3>
        <div className="space-y-1">
          {categoryRevenue.map(cat => {
            const pct = Math.round((cat.revenue / totalCategoryRevenue) * 100)
            const barPct = Math.round((cat.revenue / maxCategoryRevenue) * 100)
            const isOpen = expandedCategory === cat.id
            const products = isOpen ? topProductsForCategory(cat.id) : []
            return (
              <div key={cat.id} className="border-b border-gray-50 last:border-0">
                <button
                  onClick={() => setExpandedCategory(isOpen ? null : cat.id)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50/60 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <span className="text-xl shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm truncate">{cat.label}</span>
                      <span className="font-bold text-gray-900 text-sm shrink-0">{formatINR(cat.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-9 text-right">{pct}%</span>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="pb-3 pl-9 pr-2 space-y-1.5">
                    {products.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No paid sales yet in this category.</p>
                    ) : products.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs text-gray-600 py-1">
                        <span className="truncate">{p.name} <span className="text-gray-400">× {p.qty}</span></span>
                        <span className="font-semibold text-gray-800 shrink-0 ml-2">{formatINR(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Top products */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Top Products</h3>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No paid orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Product', 'Category', 'Units Sold', 'Revenue'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map(p => (
                  <tr key={p.name} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-gray-600">{p.qty}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatINR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order funnel */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">Order Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {funnel.map(f => (
            <div key={f.status} className="text-center p-3 rounded-xl bg-gray-50">
              <div className="text-xl font-bold text-gray-900">{f.count}</div>
              <div className="text-xs text-gray-500 capitalize mt-0.5">{f.status}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {paymentBreakdown.map(p => (
            <div key={p.status} className={`text-center p-3 rounded-xl ${p.status === 'paid' ? 'bg-green-50' : p.status === 'failed' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <div className={`text-xl font-bold ${p.status === 'paid' ? 'text-green-700' : p.status === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>{p.count}</div>
              <div className="text-xs text-gray-500 capitalize mt-0.5">{p.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Event services revenue — unchanged logic from before, restyled */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Event Services Revenue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-plum-700 mb-1 break-words">{formatINR(proposalValue)}</div>
            <div className="text-sm font-medium text-gray-700">Total Proposals Value</div>
            <div className="text-xs text-gray-400 mt-1">Sum of all proposal amounts</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-teal-700 mb-1">{confirmedCount}</div>
            <div className="text-sm font-medium text-gray-700">Confirmed Events</div>
            <div className="text-xs text-gray-400 mt-1">Approved &amp; confirmed</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-emerald-700 mb-1">{completedCount}</div>
            <div className="text-sm font-medium text-gray-700">Completed Events</div>
            <div className="text-xs text-gray-400 mt-1">Successfully delivered</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── City demand (pilot-launch waitlist) tab ───────────────────── */
function CityDemandContent() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { fetchRequests() }, [])

  async function fetchRequests() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('city_interest_requests')
      .select('city, created_at')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setRequests(data ?? [])
    setLoading(false)
  }

  const byCity = useMemo(() => {
    const map = {}
    for (const r of requests) {
      const key = r.city.trim()
      if (!map[key]) map[key] = { city: key, count: 0, latest: r.created_at }
      map[key].count += 1
      if (r.created_at > map[key].latest) map[key].latest = r.created_at
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [requests])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchRequests} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🗺️ City Demand</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {requests.length} request{requests.length !== 1 ? 's' : ''} from customers outside Bengaluru &amp; Mysore
        </p>
      </div>

      {byCity.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-gray-500 text-sm font-medium">No city requests yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['City', 'Requests', 'Most recent'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {byCity.map(({ city, count, latest }) => (
                  <tr key={city} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{city}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full bg-plum-100 text-plum-700 font-bold text-xs">{count}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(latest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Vendor status badge ───────────────────────────────────────── */
const VENDOR_STATUS_CSS = {
  PENDING_REVIEW: { bg: 'bg-amber-100',   text: 'text-amber-700'  },
  APPROVED:       { bg: 'bg-green-100',   text: 'text-green-700'  },
  REJECTED:       { bg: 'bg-red-100',     text: 'text-red-700'    },
  SUSPENDED:      { bg: 'bg-gray-100',    text: 'text-gray-600'   },
}

/* ── Customer 360 tab ───────────────────────────────────────────── */
function CustomersContent() {
  const [profiles, setProfiles] = useState([])
  const [orders, setOrders]     = useState([])
  const [events, setEvents]     = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [sortBy, setSortBy]     = useState('spend')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    const [p, o, e, r] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, email, city, created_at').eq('role', 'customer').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, customer_id, total, payment_status, created_at, order_items(product_name, qty, subtotal)').order('created_at', { ascending: false }),
      supabase.from('events').select('id, customer_id, event_type, status, created_at').order('created_at', { ascending: false }),
      supabase.from('reviews_catalog').select('id, customer_id, created_at').order('created_at', { ascending: false }),
    ])
    if (p.error) { setError(p.error.message); setLoading(false); return }
    if (o.error) { setError(o.error.message); setLoading(false); return }
    if (e.error) { setError(e.error.message); setLoading(false); return }
    if (r.error) { setError(r.error.message); setLoading(false); return }
    setProfiles(p.data ?? [])
    setOrders(o.data ?? [])
    setEvents(e.data ?? [])
    setReviews(r.data ?? [])
    setLoading(false)
  }

  const customers = useMemo(() => {
    const list = profiles.map(prof => {
      const myOrders  = orders.filter(o => o.customer_id === prof.id)
      const paidOrders = myOrders.filter(o => o.payment_status === 'paid')
      const myEvents  = events.filter(e => e.customer_id === prof.id)
      const myReviews = reviews.filter(r => r.customer_id === prof.id)
      const activityDates = [...myOrders.map(o => o.created_at), ...myEvents.map(e => e.created_at)]
      return {
        ...prof,
        orders: myOrders,
        events: myEvents,
        reviews: myReviews,
        orderCount: myOrders.length,
        totalSpend: paidOrders.reduce((s, o) => s + (o.total ?? 0), 0),
        eventCount: myEvents.length,
        lastActivity: activityDates.length ? activityDates.sort().at(-1) : null,
      }
    })
    const q = search.trim().toLowerCase()
    const filtered = q
      ? list.filter(c => c.full_name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      : list
    return [...filtered].sort((a, b) => {
      if (sortBy === 'spend')  return b.totalSpend - a.totalSpend
      if (sortBy === 'orders') return b.orderCount - a.orderCount
      if (sortBy === 'events') return b.eventCount - a.eventCount
      if (sortBy === 'name')   return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [profiles, orders, events, reviews, search, sortBy])

  const selectedCustomer = customers.find(c => c.id === selected)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchAll} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">👥 Customers</h2>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email"
              className="input text-sm py-2 pl-8 w-56"
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm py-2 w-auto pr-8">
            <option value="spend">Sort: Total spend</option>
            <option value="orders">Sort: Orders</option>
            <option value="events">Sort: Events</option>
            <option value="name">Sort: Name</option>
            <option value="joined">Sort: Newest</option>
          </select>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 text-sm font-medium">No customers found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Customer', 'City', 'Joined', 'Orders', 'Spend', 'Events', 'Last activity'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c.id)} className="hover:bg-purple-50/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-sm">{c.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-400">{c.phone || c.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{c.orderCount}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatINR(c.totalSpend)}</td>
                    <td className="px-4 py-3 text-gray-700">{c.eventCount}</td>
                    <td className="px-4 py-3 text-gray-500">{c.lastActivity ? formatDate(c.lastActivity) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCustomer && <CustomerDetailPanel customer={selectedCustomer} onClose={() => setSelected(null)} />}
    </div>
  )
}

function CustomerDetailPanel({ customer, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-gray-900">{customer.full_name || 'Unnamed customer'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Customer since {formatDate(customer.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Phone size={12} /> {customer.phone}
              </a>
            )}
            {customer.phone && (
              <a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100">
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Mail size={12} /> {customer.email}
              </a>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <div className="text-lg font-bold text-gray-900">{formatINR(customer.totalSpend)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total spend</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <div className="text-lg font-bold text-gray-900">{customer.orderCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Orders</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <div className="text-lg font-bold text-gray-900">{customer.eventCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Events</div>
            </div>
          </div>

          {customer.orders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Order history</h4>
              <div className="space-y-2">
                {customer.orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-xs">
                    <div>
                      <span className="font-semibold text-gray-800">{(o.order_items ?? []).length} item{(o.order_items ?? []).length !== 1 ? 's' : ''}</span>
                      <span className="text-gray-400 ml-2">{formatDate(o.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.payment_status}</span>
                      <span className="font-bold text-gray-900">{formatINR(o.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.events.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Event bookings</h4>
              <div className="space-y-2">
                {customer.events.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-xs">
                    <span className="font-semibold text-gray-800 capitalize">{e.event_type?.replace(/-/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_CSS[e.status]?.bg ?? 'bg-gray-100'} ${STATUS_CSS[e.status]?.text ?? 'text-gray-600'}`}>
                      {EVENT_STATUSES[e.status]?.label ?? e.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.reviews.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Reviews written</h4>
              <p className="text-xs text-gray-500">{customer.reviews.length} review{customer.reviews.length !== 1 ? 's' : ''} submitted</p>
            </div>
          )}

          {customer.orders.length === 0 && customer.events.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No activity yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Vendor management tab ─────────────────────────────────────── */
function VendorsContent() {
  const toast = useToast()
  const [vendors, setVendors]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [acting, setActing]       = useState(null)
  const [filterStatus, setFilter] = useState('')

  useEffect(() => { fetchVendors() }, [])

  async function fetchVendors() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('vendors')
      .select('*, profiles(full_name, email, phone)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setVendors(data ?? [])
    setLoading(false)
  }

  async function updateStatus(vendorId, status, reason = null) {
    setActing(vendorId + status)
    const patch = { status }
    if (reason) patch.rejection_reason = reason
    const { error: err } = await supabase
      .from('vendors')
      .update(patch)
      .eq('id', vendorId)
    if (err) { toast.error(friendlyError(err, 'Could not update this vendor.')) }
    else {
      toast.success(`Vendor ${status.toLowerCase().replace(/_/g, ' ')}.`)
      await fetchVendors()
    }
    setActing(null)
  }

  const displayed = filterStatus ? vendors.filter(v => v.status === filterStatus) : vendors
  const pending   = vendors.filter(v => v.status === 'PENDING_REVIEW').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchVendors} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🤝 Vendor Management</h2>
          {pending > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-0.5">{pending} partner{pending !== 1 ? 's' : ''} awaiting review</p>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilter(e.target.value)}
          className="input text-sm py-2 w-auto pr-8"
        >
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
                            <button
                              onClick={() => updateStatus(vendor.id, 'APPROVED')}
                              disabled={isActing}
                              className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
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
                            <button
                              onClick={() => updateStatus(vendor.id, 'SUSPENDED')}
                              disabled={isActing}
                              className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
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

/* ── Order status badge ────────────────────────────────────────── */
const ORDER_STATUS_CSS = {
  placed:     { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  processing: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'   },
}
const ORDER_STATUS_FLOW = ['placed', 'processing', 'dispatched', 'delivered']

/* ── Shop orders tab ────────────────────────────────────────────── */
function OrdersContent() {
  const toast = useToast()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [acting, setActing]   = useState(null)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles!customer_id(full_name, phone)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setOrders(data ?? [])
    setLoading(false)
  }

  async function advanceStatus(order) {
    const idx = ORDER_STATUS_FLOW.indexOf(order.status)
    const next = ORDER_STATUS_FLOW[idx + 1]
    if (!next) return
    setActing(order.id)
    const { error: err } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (err) toast.error(friendlyError(err, 'Could not move this order forward.'))
    else {
      toast.success(`Order #${order.id.slice(0, 8).toUpperCase()} → ${next}.`)
      await fetchOrders()
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
    const { error: err } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
    if (err) toast.error(friendlyError(err, 'Could not mark this order paid.'))
    else {
      toast.success(`Payment confirmed for #${order.id.slice(0, 8).toUpperCase()}.`)
      await fetchOrders()
    }
    setActing(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchOrders} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">🛍️ Shop Orders</h2>

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
                  const next = ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(order.status) + 1]
                  return (
                    <tr key={order.id} className="hover:bg-purple-50/30 transition-colors">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {order.payment_status === 'pending' && (
                            <button
                              onClick={() => markPaid(order)}
                              disabled={acting === order.id}
                              className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                          {next && order.status !== 'cancelled' && (
                            <button
                              onClick={() => advanceStatus(order)}
                              disabled={acting === order.id}
                              className="px-2.5 py-1 bg-plum-600 text-white text-xs font-medium rounded-lg hover:bg-plum-700 transition-colors disabled:opacity-50"
                            >
                              Mark {next}
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

/* ── Reviews tab ────────────────────────────────────────────────── */
function ReviewsContent() {
  const toast = useToast()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [replyingId, setReplyingId] = useState(null)
  const [replyText, setReplyText]   = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => { fetchReviews() }, [])

  async function fetchReviews() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('reviews_catalog')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setReviews(data ?? [])
    setLoading(false)
  }

  function startReply(review) {
    setReplyingId(review.id)
    setReplyText(review.admin_reply ?? '')
  }

  async function submitReply(reviewId) {
    setSaving(true)
    const { error: err } = await supabase
      .from('reviews_catalog')
      .update({ admin_reply: replyText.trim() || null, admin_reply_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (err) toast.error(friendlyError(err, 'Could not save your reply.'))
    else {
      toast.success('Reply published.')
      setReplyingId(null)
      await fetchReviews()
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchReviews} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⭐ Customer Reviews</h2>

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
                    <button
                      onClick={() => submitReply(r.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-plum-600 text-white text-xs font-semibold rounded-lg hover:bg-plum-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save reply'}
                    </button>
                    <button
                      onClick={() => setReplyingId(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startReply(r)}
                  className="text-xs font-semibold text-plum-600 hover:text-plum-700 mt-3"
                >
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

/* ── Support tab: returns, complaints, service requests ──────────── */
const SUPPORT_PILLS = [
  { id: 'returns',   label: 'Returns',          emoji: '↩️' },
  { id: 'complaints', label: 'Complaints',      emoji: '⚠️' },
  { id: 'requests',  label: 'Service Requests', emoji: '📋' },
]

function SupportContent() {
  const toast = useToast()
  const [pill, setPill] = useState('returns')
  const [returns, setReturns]     = useState([])
  const [complaints, setComplaints] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [acting, setActing]   = useState(null)
  const [replyingId, setReplyingId] = useState(null)
  const [replyText, setReplyText]   = useState('')
  const [quotingId, setQuotingId]   = useState(null)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('return_requests').select('*, orders(id,total), profiles!customer_id(full_name, phone)').order('requested_at', { ascending: false }),
      supabase.from('complaints').select('*, profiles!customer_id(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('service_enquiries').select('*').order('created_at', { ascending: false }),
    ])
    if (r1.error) { setError(r1.error.message); setLoading(false); return }
    if (r2.error) { setError(r2.error.message); setLoading(false); return }
    if (r3.error) { setError(r3.error.message); setLoading(false); return }
    setReturns(r1.data ?? [])
    setComplaints(r2.data ?? [])
    setEnquiries(r3.data ?? [])
    setLoading(false)
  }

  async function resolveReturn(id, status) {
    setActing(id)
    const { error: err } = await supabase.from('return_requests').update({ status, resolved_at: new Date().toISOString() }).eq('id', id)
    if (!err && status === 'refunded') {
      const row = returns.find(r => r.id === id)
      if (row) await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', row.order_id)
    }
    if (err) toast.error(friendlyError(err, 'Could not update this return request.'))
    else {
      toast.success(status === 'refunded' ? 'Marked refunded — the order was updated too.' : `Return marked ${status}.`)
      await fetchAll()
    }
    setActing(null)
  }

  function startReply(item) {
    setReplyingId(item.id)
    setReplyText(item.admin_reply ?? '')
  }

  async function submitComplaintReply(id, status) {
    setActing(id)
    const { error: err } = await supabase.from('complaints')
      .update({ admin_reply: replyText.trim() || null, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id)
    if (err) toast.error(friendlyError(err, 'Could not save your reply.'))
    else {
      toast.success(status === 'resolved' ? 'Complaint resolved.' : 'Reply sent.')
      setReplyingId(null)
      await fetchAll()
    }
    setActing(null)
  }

  async function advanceEnquiry(id, status) {
    setActing(id)
    const { error: err } = await supabase.from('service_enquiries').update({ status }).eq('id', id)
    if (err) toast.error(friendlyError(err, 'Could not update this enquiry.'))
    else {
      toast.success(`Enquiry marked ${status}.`)
      await fetchAll()
    }
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
    const { error: err } = await supabase.from('service_enquiries').update({
      quoted_price: price,
      quote_notes: quoteNotes.trim() || null,
      quoted_at: new Date().toISOString(),
      status: 'responded',
    }).eq('id', id)
    if (err) toast.error(friendlyError(err, 'Could not send this quote.'))
    else {
      toast.success(`Quote of ${formatINR(price)} sent to the customer.`)
      setQuotingId(null)
      await fetchAll()
    }
    setActing(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-plum-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
      <AlertCircle size={18} />{error}
      <button onClick={fetchAll} className="font-semibold hover:underline ml-auto">Retry</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">🛟 Support</h2>

      <div className="flex gap-2">
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
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{returns.filter(r => r.status === 'requested').length}</span>
            )}
            {p.id === 'complaints' && complaints.filter(c => c.status === 'open').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{complaints.filter(c => c.status === 'open').length}</span>
            )}
          </button>
        ))}
      </div>

      {pill === 'returns' && (
        returns.length === 0 ? (
          <div className="card p-14 text-center"><p className="text-gray-500 text-sm font-medium">No return requests.</p></div>
        ) : (
          <div className="space-y-3">
            {returns.map(r => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{r.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">Order #{r.order_id.slice(0, 8).toUpperCase()} · {formatINR(r.orders?.total)} · {formatDate(r.requested_at)}</p>
                    <p className="text-sm text-gray-700 mt-1.5">{r.reason}{r.comment ? ` — ${r.comment}` : ''}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.status === 'requested' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'refunded'  ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected'  ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>{r.status}</span>
                </div>
                {r.status === 'requested' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => resolveReturn(r.id, 'refunded')} disabled={acting === r.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                      Approve &amp; Refund
                    </button>
                    <button onClick={() => resolveReturn(r.id, 'rejected')} disabled={acting === r.id}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {pill === 'complaints' && (
        complaints.length === 0 ? (
          <div className="card p-14 text-center"><p className="text-gray-500 text-sm font-medium">No complaints.</p></div>
        ) : (
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
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
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
                      <button onClick={() => setReplyingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
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

      {pill === 'requests' && (
        enquiries.length === 0 ? (
          <div className="card p-14 text-center"><p className="text-gray-500 text-sm font-medium">No service requests yet.</p></div>
        ) : (
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
                      <span key={p.id} className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px]">
                        📦 {p.name}
                      </span>
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
                    <div className="flex gap-2">
                      <input
                        type="number" min="1" placeholder="Quote amount (₹)"
                        value={quotePrice} onChange={ev => setQuotePrice(ev.target.value)}
                        className="w-40 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-300"
                      />
                    </div>
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
                      <button onClick={() => setQuotingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
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

/* ── Main AdminDashboard component ─────────────────────────────── */
export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav,   setActiveNav]   = useState('overview')
  const [tableTab,    setTableTab]    = useState('All')
  const [events,      setEvents]      = useState([])
  const [metrics,     setMetrics]     = useState({ new: 0, active: 0, proposals: 0, completed: 0 })
  const [proposalValue, setProposalValue] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [search,         setSearch]        = useState('')
  const [filterStatus,   setFilterStatus]  = useState('')
  const [filterType,     setFilterType]    = useState('')
  const [filterCity,     setFilterCity]    = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const [evRes, propRes] = await Promise.all([
      supabase
        .from('events')
        .select('*, profiles!customer_id(full_name, email, phone)')
        .order('created_at', { ascending: false }),
      supabase.from('event_proposals').select('total_amount'),
    ])

    if (evRes.error) {
      setError(evRes.error.message)
      setLoading(false)
      return
    }

    const ev = evRes.data ?? []
    setEvents(ev)

    const now          = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    setMetrics({
      new:       ev.filter(e => e.status === 'REQUEST_RECEIVED').length,
      active:    ev.filter(e => ACTIVE_STATUSES.includes(e.status)).length,
      proposals: ev.filter(e => ['PROPOSAL_SENT', 'CUSTOMER_REVIEW'].includes(e.status)).length,
      completed: ev.filter(e => e.status === 'COMPLETED' && new Date(e.updated_at) >= startOfMonth).length,
    })

    const props = propRes.data ?? []
    setProposalValue(props.reduce((s, p) => s + (Number(p.total_amount) || 0), 0))
    setLoading(false)
  }

  async function assignToMe(eventId) {
    if (!profile?.id) return
    await supabase.from('events').update({ assigned_coordinator: profile.id }).eq('id', eventId)
    fetchAll()
  }

  const filteredEvents = useMemo(() => {
    let list = [...events]

    // Nav-level filter
    switch (activeNav) {
      case 'new_requests':    list = list.filter(e => e.status === 'REQUEST_RECEIVED'); break
      case 'under_review':    list = list.filter(e => e.status === 'UNDER_REVIEW'); break
      case 'vendor_sourcing': list = list.filter(e => e.status === 'CONTACTING_VENDORS'); break
      case 'proposals':       list = list.filter(e => ['PROPOSAL_SENT','CUSTOMER_REVIEW'].includes(e.status)); break
      case 'confirmed':       list = list.filter(e => ['APPROVED','CONFIRMED'].includes(e.status)); break
      case 'upcoming':        list = list.filter(e => e.event_date && new Date(e.event_date) >= new Date()); break
      default: break
    }

    // Table tab filter (overview only)
    if (activeNav === 'overview') {
      switch (tableTab) {
        case 'New':         list = list.filter(e => e.status === 'REQUEST_RECEIVED'); break
        case 'In Progress': list = list.filter(e => ACTIVE_STATUSES.includes(e.status)); break
        case 'Proposals':   list = list.filter(e => ['PROPOSAL_SENT','CUSTOMER_REVIEW'].includes(e.status)); break
        case 'Confirmed':   list = list.filter(e => ['APPROVED','CONFIRMED'].includes(e.status)); break
        case 'Completed':   list = list.filter(e => e.status === 'COMPLETED'); break
        default: break
      }
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.event_code?.toLowerCase().includes(q) ||
        e.profiles?.full_name?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q)
      )
    }

    // Dropdown filters
    if (filterStatus) list = list.filter(e => e.status === filterStatus)
    if (filterType)   list = list.filter(e => e.event_type === filterType)
    if (filterCity)   list = list.filter(e => e.city === filterCity)

    return list
  }, [events, activeNav, tableTab, search, filterStatus, filterType, filterCity])

  const cities     = useMemo(() => [...new Set(events.map(e => e.city).filter(Boolean))].sort(), [events])
  const eventTypes = useMemo(() => [...new Set(events.map(e => e.event_type).filter(Boolean))].sort(), [events])

  const handleNavClick = (id) => {
    setActiveNav(id)
    setSidebarOpen(false)
    setTableTab('All')
    setSearch('')
    setFilterStatus('')
    setFilterType('')
    setFilterCity('')
  }

  const tableProps = {
    navigate, search, setSearch, filterStatus, setFilterStatus,
    filterType, setFilterType, filterCity, setFilterCity, cities, eventTypes,
  }

  return (
    <div className="flex bg-gray-50" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={[
        'fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 shadow-xl z-30',
        'flex flex-col transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:sticky md:top-0 md:translate-x-0 md:shadow-none md:z-auto',
      ].join(' ')}
        style={{ maxHeight: '100vh', top: 0 }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <SambramoMark size={26} />
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">Sambramo Operations</div>
              {/* Internal console: the customer-facing caption would be
                  marketing copy in a tool, so this keeps the signature line
                  and only stops hardcoding it. */}
              <div className="text-[11px] text-gray-400">{BRAND.signature}</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all text-left',
                activeNav === id
                  ? 'bg-plum-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}
            >
              <span className="text-base shrink-0">{emoji}</span>
              {label}
              {id === 'new_requests' && metrics.new > 0 && (
                <span className="ml-auto bg-white/30 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {metrics.new}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <div className="text-xs text-gray-400 truncate">{profile?.full_name ?? 'Admin'}</div>
          <div className="text-[11px] text-gray-300 truncate">{profile?.email ?? ''}</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu size={22} />
          </button>
          <SambramoMark size={26} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base leading-tight">Sambramo Operations</div>
            <div className="text-xs text-gray-400">{BRAND.signature}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:block text-xs text-gray-500">
              {profile?.full_name?.split(' ')[0] ?? 'Admin'}
            </span>
            <span className="px-2.5 py-1 bg-plum-100 text-plum-700 text-xs font-semibold rounded-full">
              Admin
            </span>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 sm:px-6 py-6 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="animate-spin text-plum-600" size={32} />
              <span className="text-sm">Loading events…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={fetchAll} className="font-semibold hover:underline">Retry</button>
            </div>
          ) : (
            <>
              {activeNav === 'overview' && (
                <OverviewContent
                  metrics={metrics}
                  filteredEvents={filteredEvents}
                  tableTab={tableTab} setTableTab={setTableTab}
                  {...tableProps}
                />
              )}

              {activeNav === 'new_requests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">📥 New Requests</h2>
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {filteredEvents.length} pending
                    </span>
                  </div>
                  <EventsTable
                    events={filteredEvents}
                    showAssign
                    onAssign={assignToMe}
                    {...tableProps}
                  />
                </div>
              )}

              {['under_review', 'vendor_sourcing', 'proposals', 'confirmed', 'upcoming'].includes(activeNav) && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    {NAV_ITEMS.find(n => n.id === activeNav)?.emoji}{' '}
                    {NAV_ITEMS.find(n => n.id === activeNav)?.label}
                  </h2>
                  <EventsTable events={filteredEvents} {...tableProps} />
                </div>
              )}

              {activeNav === 'vendors' && <VendorsContent />}

              {activeNav === 'orders' && <OrdersContent />}

              {activeNav === 'catalog' && (
                <Suspense fallback={
                  <div className="h-48 flex items-center justify-center gap-3 text-gray-400">
                    <Loader2 className="animate-spin text-plum-600" size={28} />
                    <span className="text-sm">Loading catalogue…</span>
                  </div>
                }>
                  <AdminCatalog />
                </Suspense>
              )}
              {activeNav === 'customers' && <CustomersContent />}
              {activeNav === 'reviews' && <ReviewsContent />}
              {activeNav === 'support' && <SupportContent />}

              {activeNav === 'revenue' && (
                <RevenueContent events={events} proposalValue={proposalValue} />
              )}

              {activeNav === 'city_demand' && <CityDemandContent />}

              {activeNav === 'dates' && <DateDemandAdmin />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
