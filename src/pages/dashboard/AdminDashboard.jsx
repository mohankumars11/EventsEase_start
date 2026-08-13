import { useState, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { BRAND } from '../../config/sambramo'
import { INK } from '../../config/dataviz'
import useAdminData from '../../hooks/useAdminData'
import useNotifications from '../../hooks/useNotifications'
import SambramoMark from '../../components/ui/SambramoMark'
import EventsTable from '../../components/admin/EventsTable'
import CommandCenter from '../../components/admin/CommandCenter'
import NotificationCenter, { NotificationInbox } from '../../components/admin/NotificationCenter'
import { VendorsContent, OrdersContent, ReviewsContent, SupportContent } from '../../components/admin/OperationsViews'
import { supabase } from '../../lib/supabase'

/**
 * The admin shell: navigation, one data load, and a router over the views.
 *
 * ── What this file used to be ────────────────────────────────────────────
 * Two thousand lines. It held the shell, sixteen nav items, six independent
 * supabase fetches, and nine screens defined inline — Revenue, City Demand,
 * Customers, Vendors, Orders, Reviews and Support all lived in here as local
 * function components, each opening with its own `useEffect` and spinner.
 *
 * Two consequences, both bad. Opening three tabs re-read `orders` three times
 * with three different selects. And the same question could be answered
 * differently in two places, because two `useMemo`s five hundred lines apart
 * each defined "a sale" for themselves.
 *
 * Now: this file routes. `useAdminData` loads once and every view reads the
 * same rows. `lib/analytics` defines every derived number once. The screens
 * live in `components/admin/`.
 *
 * ── Code splitting ───────────────────────────────────────────────────────
 * The analytics views pull `recharts` (~376 KB) behind a lazy ChartKit, and
 * the two catalogue editors pull the image compression and upload path. None
 * of that should be in the chunk an operator downloads to look at today's new
 * requests, so each is `lazy()` and arrives when its view is opened.
 */

const ProductIntelligence = lazy(() => import('../../components/admin/ProductIntelligence'))
const AreaDemand          = lazy(() => import('../../components/admin/AreaDemand'))
const OrderLifecycle      = lazy(() => import('../../components/admin/OrderLifecycle'))
const CustomersView       = lazy(() => import('../../components/admin/CustomersView'))
const AdminCatalog        = lazy(() => import('../../components/admin/AdminCatalog'))
const AdminServices       = lazy(() => import('../../components/admin/AdminServices'))
const ContentStudio       = lazy(() => import('../../components/admin/ContentStudio'))
const DateConsole         = lazy(() => import('../../components/admin/DateConsole'))
const OrderJourney        = lazy(() => import('../../components/admin/OrderJourney'))

/**
 * Navigation, grouped by what you came here to DO.
 *
 * The old sidebar was sixteen flat items in the order they happened to be
 * built, so "Revenue" sat between "Support" and "City Demand" and the four
 * event-status views were indistinguishable from the four catalogue ones. The
 * three groups below are the three modes of using this dashboard: understand
 * the business, work the queues, change what is on sale.
 */
const NAV_GROUPS = [
  {
    id: 'insight',
    label: 'Understand',
    items: [
      { id: 'overview',  label: 'Command Center',       emoji: '🏠' },
      { id: 'inbox',     label: 'Activity Inbox',       emoji: '🔔', badge: 'unread' },
      { id: 'products',  label: 'Product Intelligence', emoji: '📦' },
      { id: 'geography', label: 'Area Demand',          emoji: '🗺️' },
      { id: 'lifecycle', label: 'Order Lifecycle',      emoji: '🔄' },
      { id: 'customers', label: 'Customers',            emoji: '👥' },
    ],
  },
  {
    id: 'operate',
    label: 'Work the queues',
    items: [
      { id: 'new_requests',    label: 'New Requests',    emoji: '📥', badge: 'new' },
      { id: 'under_review',    label: 'Under Review',    emoji: '🔍' },
      { id: 'vendor_sourcing', label: 'Vendor Sourcing', emoji: '📞' },
      { id: 'proposals',       label: 'Proposals',       emoji: '📋' },
      { id: 'confirmed',       label: 'Confirmed',       emoji: '✅' },
      { id: 'upcoming',        label: 'Upcoming',        emoji: '📅' },
      { id: 'orders',          label: 'Shop Orders',     emoji: '🛍️' },
      { id: 'support',         label: 'Support',         emoji: '🛟', badge: 'support' },
    ],
  },
  {
    id: 'manage',
    label: 'What we sell',
    items: [
      { id: 'catalog',  label: 'Shop Catalog',   emoji: '🖼️' },
      { id: 'studio',   label: 'Content Studio', emoji: '🎛️' },
      { id: 'services', label: 'Event Services', emoji: '🎪' },
      { id: 'dates',    label: 'Dates',          emoji: '📆' },
      { id: 'vendors',  label: 'Vendors',        emoji: '🤝', badge: 'vendors' },
      { id: 'reviews',  label: 'Reviews',        emoji: '⭐' },
    ],
  },
]

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items)

/** Views that are just the events table under a different status filter. */
const EVENT_VIEWS = ['new_requests', 'under_review', 'vendor_sourcing', 'proposals', 'confirmed', 'upcoming']

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const toast       = useToast()
  const data        = useAdminData()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav]     = useState('overview')
  // Which order's full journey is open. An id rather than the row itself, so
  // the drawer re-reads from `data` after a refresh instead of showing the
  // stale copy it was handed.
  const [journeyId, setJourneyId]     = useState(null)

  /**
   * The bell. `onToast` pops only the urgent, still-outstanding items that
   * arrive while the tab is open — see lib/notifications § toastable for why
   * a reload must never replay the backlog as toasts.
   */
  const notifications = useNotifications(data, {
    onToast: item => toast.info(`${item.emoji} ${item.title}`),
  })

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterCity, setFilterCity]     = useState('')

  const { events = [], orders = [], vendors = [], returns = [], complaints = [], loading, refreshing, error, refresh } = data

  /** Counts on the sidebar, so a queue announces itself before it is opened. */
  const badges = useMemo(() => ({
    new:     events.filter(e => e.status === 'REQUEST_RECEIVED').length,
    support: returns.filter(r => r.status === 'requested').length + complaints.filter(c => c.status === 'open').length,
    vendors: vendors.filter(v => v.status === 'PENDING_REVIEW').length,
    orders:  orders.filter(o => o.status !== 'cancelled' && o.payment_status === 'pending').length,
    unread:  notifications.unread,
  }), [events, returns, complaints, vendors, orders, notifications.unread])

  const filteredEvents = useMemo(() => {
    let list = [...events]

    switch (activeNav) {
      case 'new_requests':    list = list.filter(e => e.status === 'REQUEST_RECEIVED'); break
      case 'under_review':    list = list.filter(e => e.status === 'UNDER_REVIEW'); break
      case 'vendor_sourcing': list = list.filter(e => e.status === 'CONTACTING_VENDORS'); break
      case 'proposals':       list = list.filter(e => ['PROPOSAL_SENT', 'CUSTOMER_REVIEW'].includes(e.status)); break
      case 'confirmed':       list = list.filter(e => ['APPROVED', 'CONFIRMED'].includes(e.status)); break
      case 'upcoming':        list = list.filter(e => e.event_date && new Date(e.event_date) >= new Date()); break
      default: break
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.event_code?.toLowerCase().includes(q) ||
        e.profiles?.full_name?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q))
    }
    if (filterStatus) list = list.filter(e => e.status === filterStatus)
    if (filterType)   list = list.filter(e => e.event_type === filterType)
    if (filterCity)   list = list.filter(e => e.city === filterCity)

    return list
  }, [events, activeNav, search, filterStatus, filterType, filterCity])

  const cities     = useMemo(() => [...new Set(events.map(e => e.city).filter(Boolean))].sort(), [events])
  const eventTypes = useMemo(() => [...new Set(events.map(e => e.event_type).filter(Boolean))].sort(), [events])

  function go(id) {
    setActiveNav(id)
    setSidebarOpen(false)
    setSearch(''); setFilterStatus(''); setFilterType(''); setFilterCity('')
    // The views are long; landing halfway down the previous one is disorienting.
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  async function assignToMe(eventId) {
    if (!profile?.id) return
    await supabase.from('events').update({ assigned_coordinator: profile.id }).eq('id', eventId)
    refresh()
  }

  const tableProps = {
    navigate, search, setSearch, filterStatus, setFilterStatus,
    filterType, setFilterType, filterCity, setFilterCity, cities, eventTypes,
  }

  const activeItem = ALL_NAV.find(n => n.id === activeNav)

  return (
    <div className="flex bg-gray-50" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 shadow-xl z-30',
          'flex flex-col transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:sticky md:top-0 md:translate-x-0 md:shadow-none md:z-auto',
        ].join(' ')}
        style={{ maxHeight: '100vh', top: 0 }}
      >
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
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.id}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: INK.muted }}>
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, emoji, badge }) => {
                  const count = badge ? badges[badge] : 0
                  const on = activeNav === id
                  return (
                    <button
                      key={id}
                      onClick={() => go(id)}
                      aria-current={on ? 'page' : undefined}
                      className={[
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium',
                        'transition-all text-left',
                        on ? 'bg-plum-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      ].join(' ')}
                    >
                      <span className="text-base shrink-0" aria-hidden="true">{emoji}</span>
                      <span className="truncate">{label}</span>
                      {count > 0 && (
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          on ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <div className="text-xs text-gray-400 truncate">{profile?.full_name ?? 'Admin'}</div>
          <div className="text-[11px] text-gray-300 truncate">{profile?.email ?? ''}</div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700 p-1">
            <Menu size={22} />
          </button>
          <SambramoMark size={26} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base leading-tight truncate">
              {activeItem ? `${activeItem.emoji} ${activeItem.label}` : 'Sambramo Operations'}
            </div>
            <div className="text-xs text-gray-400">{BRAND.signature}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={refresh} disabled={refreshing || loading}
              title="Reload everything"
              className="p-2 rounded-xl text-gray-400 hover:text-plum-700 hover:bg-plum-50 disabled:opacity-40"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <NotificationCenter {...notifications} onNavigate={go} />
            <span className="hidden sm:block text-xs text-gray-500 ml-1">{profile?.full_name?.split(' ')[0] ?? 'Admin'}</span>
            <span className="px-2.5 py-1 bg-plum-100 text-plum-700 text-xs font-semibold rounded-full">Admin</span>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 py-6 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="animate-spin text-plum-600" size={32} />
              <span className="text-sm">Loading the business…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={refresh} className="font-semibold hover:underline">Retry</button>
            </div>
          ) : (
            /* Held at reduced opacity on refetch rather than replaced by a
               skeleton — no layout jump, and the numbers stay readable while
               the new ones arrive. */
            <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <Suspense fallback={<ViewSkeleton />}>
                {activeNav === 'overview'  && <CommandCenter data={data} onNavigate={go} />}
                {activeNav === 'inbox'     && <NotificationInbox {...notifications} onNavigate={go} />}
                {activeNav === 'products'  && <ProductIntelligence data={data} onNavigate={go} />}
                {activeNav === 'geography' && <AreaDemand data={data} />}
                {activeNav === 'lifecycle' && <OrderLifecycle data={data} onOpenOrder={setJourneyId} />}
                {activeNav === 'customers' && <CustomersView data={data} />}

                {activeNav === 'new_requests' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">📥 New Requests</h2>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {filteredEvents.length} pending
                      </span>
                    </div>
                    <EventsTable events={filteredEvents} showAssign onAssign={assignToMe} {...tableProps} />
                  </div>
                )}

                {EVENT_VIEWS.includes(activeNav) && activeNav !== 'new_requests' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      {activeItem?.emoji} {activeItem?.label}
                    </h2>
                    <EventsTable events={filteredEvents} {...tableProps} />
                  </div>
                )}

                {activeNav === 'orders'   && <OrdersContent data={data} onOpenOrder={setJourneyId} />}
                {activeNav === 'support'  && <SupportContent data={data} onOpenOrder={setJourneyId} />}
                {activeNav === 'vendors'  && <VendorsContent data={data} />}
                {activeNav === 'reviews'  && <ReviewsContent data={data} />}
                {activeNav === 'catalog'  && <AdminCatalog />}
                {activeNav === 'studio'   && <ContentStudio onNavigate={go} />}
                {activeNav === 'services' && <AdminServices data={data} />}
                {activeNav === 'dates'    && <DateConsole />}
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {/* The order journey opens over whichever view raised it, so an admin
          triaging the payment queue never loses their place in it. */}
      {journeyId && (
        <Suspense fallback={null}>
          <OrderJourney
            order={orders.find(o => o.id === journeyId)}
            events={data.orderEvents}
            returns={returns}
            onClose={() => setJourneyId(null)}
            onRefresh={refresh}
          />
        </Suspense>
      )}
    </div>
  )
}

function ViewSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="animate-spin text-plum-600" size={28} />
      <span className="text-sm">Opening…</span>
    </div>
  )
}
