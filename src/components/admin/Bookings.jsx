/**
 * Every event, and every partner on it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE HOLE THIS FILLS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `booking_lines` is the centre of the business — it carries the money,
 * the partner, the status and the escrow — and the console had no view
 * of it at all. The concierge screens that once covered it were deleted
 * (config/adminNav says so), and nothing replaced them, so "what did
 * this customer book and what happened to it" was a SQL question.
 *
 * ── One request, several lines ──────────────────────────────────────
 * A customer books ONE event and gets a line per partner on it. Grouped
 * by event here, because that is the unit a person asks about: nobody
 * says "how is line 3", they say "how is the Sharma wedding".
 *
 * ── Read-only, deliberately ─────────────────────────────────────────
 * Cancelling a booking, refunding it or reassigning a partner all move
 * money and all have customer consequences. None of them should be a
 * button a founder can reach while scrolling. This screen answers
 * "what is happening"; changing it is a conversation, then an RPC.
 *
 * The one exception worth noting: a line sitting in `dispatching` with
 * no offers out is a stuck booking, and this flags it rather than
 * leaving it to be discovered by the customer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, RefreshCw, CalendarDays, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EmptyNote, SectionHead, StatTile } from './viz/Primitives'

const money = paise => `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`
const day = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

/* The ten states a line can be in (059:126-128), in words, with the
   ones that mean "somebody is waiting" marked. */
const LINE_STATE = {
  pending: ['Not sent out', 'bg-ink/[0.05] text-ink/55 ring-ink/10', true],
  dispatching: ['Looking for a partner', 'bg-saffron-50 text-saffron-800 ring-saffron-200', true],
  accepted: ['Partner accepted', 'bg-plum-50 text-plum-800 ring-plum-200', true],
  paid: ['Paid, upcoming', 'bg-forest-50 text-forest-700 ring-forest-200', false],
  in_progress: ['Happening now', 'bg-forest-50 text-forest-700 ring-forest-200', false],
  delivered: ['Delivered', 'bg-forest-50 text-forest-700 ring-forest-200', false],
  settled: ['Settled', 'bg-ink/[0.05] text-ink/55 ring-ink/10', false],
  expired: ['Nobody took it', 'bg-chilli-50 text-chilli-700 ring-chilli-200', false],
  cancelled: ['Cancelled', 'bg-ink/[0.05] text-ink/45 ring-ink/10', false],
  disputed: ['Disputed', 'bg-chilli-50 text-chilli-700 ring-chilli-200', true],
}

function Chip({ status }) {
  const [label, look] = LINE_STATE[status] ?? [status, 'bg-ink/[0.05] text-ink/55 ring-ink/10']
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${look}`}>{label}</span>
}

function isMissing(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message ?? '')
}

export default function Bookings() {
  const [events, setEvents] = useState(undefined)
  const [missing, setMissing] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('live')

  const load = useCallback(async () => {
    const { data: lines, error } = await supabase
      .from('booking_lines')
      .select('id, status, trade, service_name, quoted_amount_paise, partner_amount_paise, request_id, created_at, delivered_at')
      .order('created_at', { ascending: false })
      .limit(600)
    if (error) {
      if (isMissing(error)) { setMissing(true); setEvents([]); return }
      setEvents([]); return
    }

    const reqIds = [...new Set((lines ?? []).map(l => l.request_id).filter(Boolean))]
    const { data: requests } = reqIds.length
      ? await supabase.from('booking_requests')
          .select('id, occasion_name, event_date, customer_id, area_label')
          .in('id', reqIds)
      : { data: [] }
    const byId = Object.fromEntries((requests ?? []).map(r => [r.id, r]))

    /* Grouped by event, because that is the unit a person asks about. */
    const grouped = {}
    for (const l of lines ?? []) {
      const r = byId[l.request_id]
      const key = l.request_id ?? l.id
      grouped[key] ??= { id: key, request: r, lines: [] }
      grouped[key].lines.push(l)
    }
    setEvents(Object.values(grouped).sort((a, b) =>
      new Date(b.request?.event_date ?? 0) - new Date(a.request?.event_date ?? 0)))
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const all = (events ?? []).flatMap(e => e.lines)
    const live = all.filter(l => ['paid', 'in_progress', 'accepted'].includes(l.status))
    return {
      events: (events ?? []).length,
      lines: all.length,
      liveValue: live.reduce((n, l) => n + (Number(l.quoted_amount_paise) || 0), 0),
      stuck: all.filter(l => ['dispatching', 'pending'].includes(l.status)).length,
      disputed: all.filter(l => l.status === 'disputed').length,
    }
  }, [events])

  const shown = useMemo(() => {
    let e = events ?? []
    if (filter === 'live') {
      e = e.filter(x => x.lines.some(l => ['pending', 'dispatching', 'accepted', 'paid', 'in_progress'].includes(l.status)))
    } else if (filter === 'trouble') {
      e = e.filter(x => x.lines.some(l => ['dispatching', 'pending', 'disputed', 'expired'].includes(l.status)))
    } else if (filter === 'done') {
      e = e.filter(x => x.lines.every(l => ['settled', 'delivered', 'cancelled', 'expired'].includes(l.status)))
    }
    const t = q.trim().toLowerCase()
    if (!t) return e
    return e.filter(x =>
      (x.request?.occasion_name ?? '').toLowerCase().includes(t)
      || (x.request?.area_label ?? '').toLowerCase().includes(t)
      || x.lines.some(l => (l.service_name ?? '').toLowerCase().includes(t)
        || (l.trade ?? '').toLowerCase().includes(t)))
  }, [events, q, filter])

  if (events === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-plum-600" /></div>
  }
  if (missing) {
    return <EmptyNote icon="📅">Bookings are not in this database yet.</EmptyNote>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Events" value={stats.events} sub={`${stats.lines} partner lines`} />
        <StatTile label="Value in play" value={money(stats.liveValue)} sub="accepted, paid or running" />
        <StatTile label="Waiting for a partner" value={stats.stuck} sub="nobody has taken it yet" />
        <StatTile label="Disputed" value={stats.disputed} sub="needs a decision" />
      </div>

      <SectionHead title="Events" sub="One row per event, with every partner on it. Read-only: changing a booking moves money.">
        <div className="flex items-center gap-1.5">
          {[['live', 'In play'], ['trouble', 'Trouble'], ['done', 'Closed'], ['all', 'All']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${
                filter === k ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/60 hover:bg-ink/[0.07]'}`}>
              {l}
            </button>
          ))}
          <button type="button" onClick={load} aria-label="Refresh"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/60">
            <RefreshCw size={14} />
          </button>
        </div>
      </SectionHead>

      <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-ink/[0.08]">
        <Search size={15} className="shrink-0 text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Occasion, area, trade or service"
          className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:text-ink/35" />
      </div>

      {!shown.length ? (
        <EmptyNote icon="📭">
          {filter === 'live' ? 'Nothing in play right now.' : 'Nothing matches that.'}
        </EmptyNote>
      ) : (
        <div className="space-y-3">
          {shown.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }) {
  const r = event.request
  const total = event.lines.reduce((n, l) => n + (Number(l.quoted_amount_paise) || 0), 0)
  const stuck = event.lines.filter(l => ['dispatching', 'pending'].includes(l.status))

  return (
    <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.07]">
      <div className="flex items-start justify-between gap-3 border-b border-ink/[0.05] px-5 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-ink">
            {r?.occasion_name ?? 'Event'}
          </p>
          <p className="flex items-center gap-1.5 text-[12.5px] text-ink/50">
            <CalendarDays size={12} />{day(r?.event_date)}
            {r?.area_label && <span>· {r.area_label}</span>}
            <span>· {event.lines.length} partner{event.lines.length === 1 ? '' : 's'}</span>
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-extrabold tabular-nums text-ink">{money(total)}</p>
      </div>

      {!!stuck.length && (
        <p className="flex items-start gap-1.5 bg-saffron-50 px-5 py-2 text-[12.5px] font-bold text-saffron-900">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {stuck.length} line{stuck.length === 1 ? ' has' : 's have'} no partner yet.
          {r?.event_date && ` Event is ${day(r.event_date)}.`}
        </p>
      )}

      <ul className="divide-y divide-ink/[0.04]">
        {event.lines.map(l => (
          <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold text-ink">{l.service_name ?? l.trade}</p>
              <p className="text-[11.5px] text-ink/45">{l.trade}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums text-[13px] text-ink/70">{money(l.quoted_amount_paise)}</span>
              <Chip status={l.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
