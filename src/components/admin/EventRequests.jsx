import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, friendlyError } from '../../context/ToastContext'
import { EVENT_STATUSES } from '../../config/sambramo'
import { INK, STATUS, ORDINAL_BLUE } from '../../config/dataviz'
import { eventFunnel, EVENT_FUNNEL } from '../../lib/analytics'
import EventsTable from './EventsTable'
import { Funnel, StatTile, ChartCard } from './viz/Primitives'

/**
 * Every celebration request, on one screen.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * Six sidebar entries — New Requests, Under Review, Vendor Sourcing,
 * Proposals, Confirmed, Upcoming — each rendering the same table with a
 * different `status` filter. Six permanent slots for one screen and five
 * filters, which made the navigation look busy and the actual feature hard to
 * find. Worse, it hid the shape of the pipeline: you could see how many were
 * in Proposals only by clicking Proposals, so nobody ever saw the funnel
 * narrowing.
 *
 * Now the stages are tabs with their counts on them, the funnel sits above,
 * and the sidebar gets five slots back.
 *
 * ── The stages are the funnel's stages ───────────────────────────────────
 * Deliberately the same `EVENT_FUNNEL` grouping the Command Center draws, not
 * a second list of statuses maintained here. EVENT_STATUSES has fourteen
 * values; a fourteen-tab strip is a wall. Grouping them once, centrally, is
 * what stops this screen and the overview telling different stories about the
 * same pipeline.
 */

const TABS = [
  { id: 'all', label: 'All', statuses: null },
  ...EVENT_FUNNEL.map(s => ({ id: s.id, label: s.label, statuses: s.statuses })),
  { id: 'upcoming',  label: 'Upcoming',  statuses: null, upcoming: true },
  { id: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
]

export default function EventRequests({ data, navigate }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { events = [], refresh } = data

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCity, setFilterCity] = useState('')

  const funnel = useMemo(() => eventFunnel(events), [events])

  const counts = useMemo(() => {
    const now = new Date()
    const map = { all: events.length }
    for (const t of TABS) {
      if (t.id === 'all') continue
      map[t.id] = events.filter(e => matches(e, t, now)).length
    }
    return map
  }, [events])

  const filtered = useMemo(() => {
    const now = new Date()
    const active = TABS.find(t => t.id === tab) ?? TABS[0]
    let list = events.filter(e => matches(e, active, now))

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
  }, [events, tab, search, filterStatus, filterType, filterCity])

  const cities     = useMemo(() => [...new Set(events.map(e => e.city).filter(Boolean))].sort(), [events])
  const eventTypes = useMemo(() => [...new Set(events.map(e => e.event_type).filter(Boolean))].sort(), [events])

  async function assignToMe(eventId) {
    if (!profile?.id) return
    const { error } = await supabase.from('events').update({ assigned_coordinator: profile.id }).eq('id', eventId)
    if (error) toast.error(friendlyError(error, 'Could not assign this request.'))
    else { toast.success('Assigned to you.'); await refresh() }
  }

  const unassigned = events.filter(e => e.status === 'REQUEST_RECEIVED').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Waiting on a first reply" value={unassigned}
          tone={unassigned > 0 ? STATUS.critical : undefined}
          sub="nobody has picked these up"
        />
        <StatTile label="In the pipeline" value={funnel.total} sub="cancellations excluded" />
        <StatTile label="Delivered end to end" value={funnel.stages.at(-1)?.at ?? 0} sub={`${funnel.conversion}% of live requests`} />
        <StatTile label="Cancelled" value={funnel.cancelled} />
      </div>

      <ChartCard
        title="The pipeline"
        sub="Bar length is how many requests have reached that stage or gone past it. The figure on the right is how many are sitting there now."
        table={{
          columns: [
            { key: 'label', label: 'Stage' },
            { key: 'reached', label: 'Reached' },
            { key: 'at', label: 'Here now' },
          ],
          rows: funnel.stages.map(s => ({ ...s, key: s.id })),
        }}
      >
        <Funnel
          stages={funnel.stages}
          footnote={`${funnel.conversion}% of live requests have been delivered end to end.`}
        />
      </ChartCard>

      {/* ── Stage tabs, which is what the six nav items really were ──── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Request stage">
        {TABS.map((t, i) => {
          const on = tab === t.id
          const n = counts[t.id] ?? 0
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                on ? 'text-ink border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
              }`}
              style={on ? {
                // Ordered stages get the ordinal ramp — the same one the funnel
                // above uses — so a tab and its bar are visibly the same thing.
                background: t.id === 'cancelled' ? STATUS.critical
                  : t.id === 'all' || t.id === 'upcoming' ? '#6d28d9'
                  : ORDINAL_BLUE[Math.min(i - 1, ORDINAL_BLUE.length - 1)],
              } : undefined}
            >
              {t.label}
              <span className={`text-[10px] tabular-nums ${on ? 'opacity-80' : ''}`}
                    style={on ? undefined : { color: INK.muted }}>
                {n}
              </span>
            </button>
          )
        })}
      </div>

      <EventsTable
        events={filtered}
        navigate={navigate}
        showAssign={tab === 'all' || tab === 'requested'}
        onAssign={assignToMe}
        search={search} setSearch={setSearch}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterType={filterType} setFilterType={setFilterType}
        filterCity={filterCity} setFilterCity={setFilterCity}
        cities={cities} eventTypes={eventTypes}
      />
    </div>
  )
}

function matches(event, tab, now) {
  if (tab.upcoming) {
    return event.status !== 'CANCELLED' && event.event_date && new Date(event.event_date) >= now
  }
  if (!tab.statuses) return true
  return tab.statuses.includes(event.status)
}

export { EVENT_STATUSES }
