import { Phone, MessageCircle } from 'lucide-react'
import { EVENT_STATUSES, STATUS_CSS, PRIORITIES, EVENT_TYPE_EMOJIS } from '../../config/sambramo'
import { formatDate, formatINR } from '../../utils/format'

/**
 * The concierge request table, and the badges that go on it.
 *
 * Lifted out of AdminDashboard.jsx unchanged in behaviour. That file was two
 * thousand lines holding a shell, a router, six data fetches and nine screens,
 * and every new view made the next one harder to find. The shell now routes;
 * the screens live beside it.
 */

export function StatusBadge({ status }) {
  const css = STATUS_CSS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const label = EVENT_STATUSES[status]?.label ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
      {label}
    </span>
  )
}

export function PriorityDot({ priority }) {
  const p = PRIORITIES[priority] ?? PRIORITIES.NORMAL
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${p.dot} shrink-0`} />
      <span className={`text-xs font-medium ${p.text}`}>{p.label}</span>
    </span>
  )
}

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
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input text-sm py-2 w-auto pr-8">
        <option value="">All Statuses</option>
        {Object.entries(EVENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input text-sm py-2 w-auto pr-8">
        <option value="">All Types</option>
        {eventTypes.map(t => (
          <option key={t} value={t}>{EVENT_TYPE_EMOJIS[t] ?? '🎉'} {t.replace(/-/g, ' ')}</option>
        ))}
      </select>
      <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="input text-sm py-2 w-auto pr-8">
        <option value="">All Cities</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

export default function EventsTable({
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
            <p className="text-xs text-gray-500 mt-1">Try clearing the search or filter above.</p>
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
                      <div className="font-medium text-gray-900 text-xs leading-tight">{ev.profiles?.full_name ?? '—'}</div>
                      <div className="text-gray-500 text-[11px] mt-0.5">{ev.profiles?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="mr-1">{EVENT_TYPE_EMOJIS[ev.event_type] ?? '🎉'}</span>
                      <span className="text-xs text-gray-700 capitalize">{ev.event_type?.replace(/-/g, ' ') ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {ev.event_date ? formatDate(ev.event_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{ev.city ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {ev.budget_text ?? (ev.budget ? formatINR(ev.budget) : '—')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3"><PriorityDot priority={ev.priority} /></td>
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
                            <a href={`tel:${ev.profiles.phone}`} title="Call"
                               className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/${ev.profiles.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${ev.profiles.full_name ?? ''}, this is your Sambramo coordinator!`)}`}
                              target="_blank" rel="noopener noreferrer" title="WhatsApp"
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
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
            <p className="text-xs text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
