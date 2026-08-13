import { useState, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { resolveNav } from '../../config/adminNav'
import useAdminData from '../../hooks/useAdminData'
import useNotifications from '../../hooks/useNotifications'
import AdminShell from '../../components/admin/AdminShell'
import CommandCenter from '../../components/admin/CommandCenter'
import NotificationCenter, { NotificationInbox } from '../../components/admin/NotificationCenter'
import {
  VendorsContent, OrdersContent, ReviewsContent,
  ReturnsView, ComplaintsView, EnquiriesView,
} from '../../components/admin/OperationsViews'

/**
 * The admin console: one data load, and a router over the screens.
 *
 * ── What this file is now ────────────────────────────────────────────────
 * A router and nothing else. The frame moved to `components/admin/AdminShell`,
 * the information architecture to `config/adminNav`, and every screen lives
 * beside them. What is left here is the part that genuinely belongs to a page
 * component: load the data once, work out the badges, and choose what to show.
 *
 * ── Why the navigation is data ───────────────────────────────────────────
 * The sidebar, the command palette and the page header all read the same
 * registry, so a screen's name, description and badge are declared once. Three
 * hand-maintained copies of the same list is exactly how PROJECT_SUMMARY
 * describes the brand strings ending up with four contradicting versions.
 *
 * ── Code splitting ───────────────────────────────────────────────────────
 * The analytics views pull `recharts` (~376 KB) behind a lazy ChartKit, and
 * the catalogue editors pull the image compression and upload path. None of
 * that belongs in the chunk somebody downloads to glance at today's requests.
 */

const EventRequests       = lazy(() => import('../../components/admin/EventRequests'))
const ProductIntelligence = lazy(() => import('../../components/admin/ProductIntelligence'))
const AreaDemand          = lazy(() => import('../../components/admin/AreaDemand'))
const OrderLifecycle      = lazy(() => import('../../components/admin/OrderLifecycle'))
const CustomersView       = lazy(() => import('../../components/admin/CustomersView'))
const AdminCatalog        = lazy(() => import('../../components/admin/AdminCatalog'))
const AdminServices       = lazy(() => import('../../components/admin/AdminServices'))
const ContentStudio       = lazy(() => import('../../components/admin/ContentStudio'))
const DateConsole         = lazy(() => import('../../components/admin/DateConsole'))
const OrderJourney        = lazy(() => import('../../components/admin/OrderJourney'))

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const toast       = useToast()
  const data        = useAdminData()

  const [activeNav, setActiveNav] = useState('overview')
  // Which order's journey is open. An id rather than the row, so the drawer
  // re-reads from `data` after a refresh instead of showing a stale copy.
  const [journeyId, setJourneyId] = useState(null)

  const notifications = useNotifications(data, {
    onToast: item => toast.info(`${item.emoji} ${item.title}`),
  })

  const {
    events = [], orders = [], vendors = [], returns = [], complaints = [],
    enquiries = [], loading, refreshing, error, refresh,
  } = data

  /** Counts on the rail, so a queue announces itself before it is opened. */
  const badges = useMemo(() => ({
    unread:     notifications.unread,
    new:        events.filter(e => e.status === 'REQUEST_RECEIVED').length,
    enquiries:  enquiries.filter(e => e.status === 'open').length,
    orders:     orders.filter(o => o.status !== 'cancelled' && o.payment_status === 'pending').length,
    returns:    returns.filter(r => ['requested', 'approved', 'refund_pending'].includes(r.status)).length,
    complaints: complaints.filter(c => c.status === 'open').length,
    vendors:    vendors.filter(v => v.status === 'PENDING_REVIEW').length,
  }), [notifications.unread, events, enquiries, orders, returns, complaints, vendors])

  /**
   * `resolveNav` maps retired ids onto their new home rather than dropping
   * them: six status views collapsed into Event Requests, and every
   * notification kind still carries the old `nav` value it was written with.
   */
  function go(id) {
    setActiveNav(resolveNav(id))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openOrder = setJourneyId

  return (
    <AdminShell
      activeNav={activeNav}
      onNavigate={go}
      badges={badges}
      profile={profile}
      onRefresh={refresh}
      refreshing={refreshing}
      notifications={<NotificationCenter {...notifications} onNavigate={go} />}
    >
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
           skeleton — no layout jump, and the numbers stay readable while the
           new ones arrive. */
        <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Suspense fallback={<ViewSkeleton />}>
            {/* Overview */}
            {activeNav === 'overview'  && <CommandCenter data={data} onNavigate={go} />}
            {activeNav === 'inbox'     && <NotificationInbox {...notifications} onNavigate={go} />}

            {/* Events */}
            {activeNav === 'requests'  && <EventRequests data={data} navigate={navigate} />}
            {activeNav === 'enquiries' && <EnquiriesView data={data} onOpenOrder={openOrder} />}
            {activeNav === 'services'  && <AdminServices data={data} />}
            {activeNav === 'dates'     && <DateConsole />}

            {/* Orders */}
            {activeNav === 'allorders' && <OrdersContent data={data} onOpenOrder={openOrder} />}
            {activeNav === 'lifecycle' && <OrderLifecycle data={data} onOpenOrder={openOrder} />}
            {activeNav === 'returns'   && <ReturnsView data={data} onOpenOrder={openOrder} />}

            {/* Catalogue */}
            {activeNav === 'catalog'   && <AdminCatalog />}
            {activeNav === 'studio'    && <ContentStudio onNavigate={go} />}

            {/* People */}
            {activeNav === 'customers'  && <CustomersView data={data} />}
            {activeNav === 'complaints' && <ComplaintsView data={data} onOpenOrder={openOrder} />}
            {activeNav === 'reviews'    && <ReviewsContent data={data} />}
            {activeNav === 'vendors'    && <VendorsContent data={data} />}

            {/* Insight */}
            {activeNav === 'products'  && <ProductIntelligence data={data} onNavigate={go} />}
            {activeNav === 'geography' && <AreaDemand data={data} />}
          </Suspense>
        </div>
      )}

      {/* The journey opens over whichever screen raised it, so an admin
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
    </AdminShell>
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
