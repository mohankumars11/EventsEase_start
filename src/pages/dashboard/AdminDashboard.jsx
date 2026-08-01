import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, X, Phone, MessageCircle, Loader2, AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_STATUSES, STATUS_CSS, PRIORITIES, EVENT_TYPE_EMOJIS } from '../../config/sambramo'
import { formatDate, formatINR } from '../../utils/format'

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
  { id: 'revenue',         label: 'Revenue',          emoji: '📊' },
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
function RevenueContent({ events, proposalValue }) {
  const completedCount = events.filter(e => e.status === 'COMPLETED').length
  const confirmedCount = events.filter(e => ['CONFIRMED', 'APPROVED'].includes(e.status)).length

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-bold text-gray-900">📊 Revenue Overview</h2>

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

      <div className="card p-5 border-amber-100 bg-amber-50">
        <div className="flex gap-3">
          <TrendingUp className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800">Revenue metrics grow as events are completed.</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Proposal values represent potential revenue. Track actual received payments
              in the Payments tab of each event. Coordinator fees and margins are visible
              in individual proposals.
            </p>
          </div>
        </div>
      </div>
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

/* ── Vendor management tab ─────────────────────────────────────── */
function VendorsContent() {
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
    if (err) { alert('Error: ' + err.message) }
    else { await fetchVendors() }
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
        .select('*, profiles(full_name, email, phone)')
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
    await supabase.from('events').update({ coordinator_id: profile.id }).eq('id', eventId)
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
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Sambramo Operations</div>
            <div className="text-[11px] text-gray-400">Your Moment. Our Magic.</div>
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
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base leading-tight">Sambramo Operations</div>
            <div className="text-xs text-gray-400">Your Moment. Our Magic.</div>
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

              {activeNav === 'revenue' && (
                <RevenueContent events={events} proposalValue={proposalValue} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
