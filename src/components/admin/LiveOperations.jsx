import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigation, TriangleAlert, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLivePoll } from '../../hooks/useLivePoll'
import { formatDistance, formatEta } from '../../lib/trackingDisplay'

/**
 * Every partner currently on the road.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT EXISTS TO CATCH THE ONE THAT IS GOING WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * A wall of green rows is not the point and would not be worth a screen.
 * The point is the caterer whose ETA is after the event starts, and the
 * tempo that has not moved in twenty minutes — both invisible in a list
 * sorted by time, and both things an operator can still do something
 * about if they see them at 8:40 rather than at 10.
 *
 * So rows are sorted by trouble rather than by ETA, and the four counts
 * across the top are the four states an operator triages between.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "AT RISK" IS DERIVED, AND IT IS NOT A COLUMN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing in the schema says a trip is in trouble, and nothing should:
 * it is a comparison between the ETA and the event, and between the last
 * fix and the clock, both of which change every minute. A stored flag
 * would be stale within one.
 *
 *   silent   no fix for 15 minutes — a dead battery, a tunnel, or an app
 *            that was force-quit. The operator does not know which, and
 *            that is exactly why it is worth surfacing.
 *   late     the ETA lands after the hour the event starts
 *   near     inside the geofence and not yet confirmed
 *
 * Operators read every session through the "operators watch everything"
 * policy in 127, including the trail that no customer can see. That
 * asymmetry is the point of having two tables.
 */

const SILENT_MS = 15 * 60 * 1000

export default function LiveOperations() {
  const [rows, setRows] = useState(null)
  const [unavailable, setUnavailable] = useState(false)

  const read = useCallback(async () => {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .select('id, vendor_id, line_id, mode, status, started_at, eta_at, '
            + 'distance_remaining_m, last_seen_at, geofence_entered_at, arrival_confirmed_at')
      .eq('status', 'active')
      .order('started_at', { ascending: true })

    if (error) { setUnavailable(true); setRows([]); return }

    const live = data ?? []
    if (!live.length) { setRows([]); return }

    /* Names and jobs in two queries rather than per row: an operations
       screen that polls must not fan out. */
    const [{ data: vendors }, { data: jobs }] = await Promise.all([
      supabase.from('vendors').select('id, business_name')
        .in('id', [...new Set(live.map(r => r.vendor_id))]),
      supabase.from('partner_jobs')
        .select('line_id, occasion_name, service_name, trade, event_date, time_note, area_label')
        .in('line_id', [...new Set(live.map(r => r.line_id))]),
    ])

    const byVendor = Object.fromEntries((vendors ?? []).map(v => [v.id, v.business_name]))
    const byLine = Object.fromEntries((jobs ?? []).map(j => [j.line_id, j]))
    setRows(live.map(s => ({ ...s, partner: byVendor[s.vendor_id], job: byLine[s.line_id] })))
  }, [])

  useEffect(() => { read() }, [read])
  useLivePoll(read, 15000, [read])

  const graded = useMemo(() => {
    const now = Date.now()
    return (rows ?? []).map(s => {
      const silent = s.last_seen_at
        ? now - new Date(s.last_seen_at).getTime() > SILENT_MS
        : now - new Date(s.started_at).getTime() > SILENT_MS
      /* Late means the ETA lands after the event's start hour, read off
         `time_note` — which is free text. A note we cannot parse means
         we do not claim lateness: silence beats a false alarm on a
         screen somebody is meant to act on. */
      const startsAt = startHour(s.job?.event_date, s.job?.time_note)
      const late = !!(startsAt && s.eta_at && new Date(s.eta_at).getTime() > startsAt)
      const near = !!s.geofence_entered_at && !s.arrival_confirmed_at
      return { ...s, silent, late, near, rank: silent ? 0 : late ? 1 : near ? 2 : 3 }
    }).sort((a, b) => a.rank - b.rank)
  }, [rows])

  const counts = {
    moving: graded.filter(r => r.rank === 3).length,
    near: graded.filter(r => r.rank === 2).length,
    late: graded.filter(r => r.rank === 1).length,
    silent: graded.filter(r => r.rank === 0).length,
  }

  if (rows === null) {
    return <p className="p-6 text-[13px] text-ink-mute">Reading live trips…</p>
  }

  if (unavailable) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-[13px] text-amber-900 ring-1 ring-amber-200">
        Migration 127 has not been applied to this database, so there are no
        tracking sessions to show.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Count icon={Navigation}    label="On the way" n={counts.moving} tone="plum" />
        <Count icon={CheckCircle2}  label="Arriving"   n={counts.near}   tone="forest" />
        <Count icon={Clock}         label="Late"       n={counts.late}   tone="amber" />
        <Count icon={TriangleAlert} label="No signal"  n={counts.silent} tone="rose" />
      </div>

      {graded.length === 0 ? (
        <p className="rounded-2xl bg-ink/[0.03] p-6 text-center text-[13px] text-ink-mute">
          Nobody is travelling to a job right now.
        </p>
      ) : (
        <ul className="divide-y divide-ink/[0.07] overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.07]">
          {graded.map(s => <Row key={s.id} s={s} />)}
        </ul>
      )}

      <button
        type="button" onClick={read}
        className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink-mute"
      >
        <RefreshCw size={12} /> Refreshes on its own every 15 seconds
      </button>
    </div>
  )
}

/** "10:00 AM – 10:00 PM" on a date -> the epoch of the start hour. */
function startHour(date, note) {
  if (!date || !note) return null
  const m = String(note).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  if (!m) return null
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, Number(m[2] ?? 0), 0, 0)
  return d.getTime()
}

const TONE = {
  plum: 'bg-plum-50 text-plum-700', forest: 'bg-forest-50 text-forest-700',
  amber: 'bg-amber-50 text-amber-800', rose: 'bg-rose-50 text-rose-700',
}

function Count({ icon: Icon, label, n, tone }) {
  return (
    <div className={`rounded-2xl p-3 ${TONE[tone]}`}>
      <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide opacity-80">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-0.5 text-[22px] font-extrabold leading-none tabular-nums">{n}</p>
    </div>
  )
}

function Row({ s }) {
  const flag = s.rank === 0 ? ['No signal', 'bg-rose-100 text-rose-800']
    : s.rank === 1 ? ['Late', 'bg-amber-100 text-amber-900']
    : s.rank === 2 ? ['At the venue', 'bg-forest-100 text-forest-800']
    : ['Moving', 'bg-ink/[0.06] text-ink-soft']

  const seen = s.last_seen_at
    ? `${Math.round((Date.now() - new Date(s.last_seen_at).getTime()) / 60000)}m ago`
    : 'no fix yet'

  return (
    <li className="flex items-start gap-3 p-3.5">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13.5px] font-extrabold text-ink">
            {s.partner ?? 'Unknown partner'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${flag[1]}`}>
            {flag[0]}
          </span>
          {s.mode === 'trip' && (
            <span className="rounded-full bg-plum-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-plum-700">
              Trip
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-ink-mute">
          {s.job?.occasion_name ?? s.job?.service_name ?? s.line_id}
          {s.job?.area_label ? ` · ${s.job.area_label}` : ''}
          {s.job?.time_note ? ` · ${s.job.time_note}` : ''}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-mute">Last fix {seen}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[13px] font-extrabold tabular-nums text-ink">
          {formatEta(s.eta_at) ?? '—'}
        </span>
        <span className="block text-[11px] font-semibold tabular-nums text-ink-mute">
          {formatDistance(s.distance_remaining_m) ?? ''}
        </span>
      </span>
    </li>
  )
}
