import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, MapPin, TriangleAlert, Loader2, Clock, IndianRupee,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ScreenState from '../ui/ScreenState'
import { conflictsFor, spanOf, clock, mins, SEVERITY } from '../../lib/calendarConflicts'

/**
 * What the partner is actually doing, day by day.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A MONTH GRID CANNOT ANSWER THE QUESTION THEY HAVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The availability calendar below this says which days are open. It does
 * not say what is ON those days, because it reads `vendor_availability`
 * and the work lives in `partner_jobs`. So a partner asking "what am I
 * doing next week" had to hold two screens in their head.
 *
 * This is the other half: confirmed work, in order, with the thing no
 * grid shows — whether the day is physically possible. See
 * lib/calendarConflicts.
 *
 * ── Only real bookings ─────────────────────────────────────────────
 * Reads partner_jobs, which is the partner's own accepted work. Nothing
 * here is illustrative; an empty agenda says so plainly.
 */
export default function AgendaView({ vendorId, days = 30, onlyDate = null }) {
  const [state, setState] = useState({ loading: true, jobs: [], error: null })
  /* Retry has to make the effect run again. Setting loading:true alone
     would spin forever, because the effect depends on vendorId/days/
     onlyDate and none of them changed — a retry button that does
     nothing is worse than no retry button. */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    if (!vendorId) { setState({ loading: false, jobs: [], error: null }); return }

    /* `onlyDate` narrows the window to one day, for the month grid's
       selected date. Narrowing the QUERY rather than filtering the
       result matters: the conflict grouping below runs on what came
       back, and a filtered-after-the-fact list would hide the other job
       on that day and with it the reason the day is tight. Which is why
       both ends move to the same date rather than one. */
    const from = onlyDate ?? new Date().toISOString().slice(0, 10)
    const to = onlyDate ?? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

    supabase.from('partner_jobs')
      .select('line_id, occasion_name, service_name, trade, event_date, time_note, guest_count, area_label, city, distance_m, partner_amount_paise, status, is_funded')
      .eq('vendor_id', vendorId)
      .gte('event_date', from).lte('event_date', to)
      .order('event_date', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return
        setState({ loading: false, jobs: data ?? [], error })
      })
    return () => { alive = false }
  }, [vendorId, days, onlyDate, attempt])

  /* Grouped by day, because a conflict is a property of a day rather
     than of the list. */
  const byDay = useMemo(() => {
    const m = new Map()
    for (const j of state.jobs) {
      if (!m.has(j.event_date)) m.set(j.event_date, [])
      m.get(j.event_date).push(j)
    }
    return [...m.entries()].map(([date, jobs]) => ({ date, jobs, conflicts: conflictsFor(jobs) }))
  }, [state.jobs])

  if (state.loading) {
    return <ScreenState loading rows={2} what="your schedule" />
  }

  if (state.error) {
    /* Retry is the addition. The old card said the right thing and then
       offered nothing to do about it, so the only way out was to leave
       the tab and come back. */
    return (
      <ScreenState error what="your schedule"
                   onRetry={() => {
                     setState(s => ({ ...s, loading: true, error: null }))
                     setAttempt(n => n + 1)
                   }} />
    )
  }

  if (!byDay.length) {
    return (
      <div className="rounded-[20px] bg-ink/[0.02] p-6 text-center">
        <CalendarDays size={22} className="mx-auto mb-2 text-ink-mute" />
        <p className="text-[13.5px] font-extrabold text-ink">
          Nothing booked in the next {days} days
        </p>
        <p className="mx-auto mt-1 max-w-[16rem] text-[12.5px] leading-snug text-ink-mute">
          Keep your calendar up to date below — dispatch skips a day you have
          blocked, and offers the ones you have not.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {byDay.map(({ date, jobs, conflicts }) => (
        <section key={date} data-agenda-day={date}>
          <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
            {formatDay(date)}
          </p>
          <ConflictNotes conflicts={conflicts} />
          <ul className="flex flex-col gap-2">
            {jobs.map(j => <li key={j.line_id}><JobRow job={j} /></li>)}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* The warning goes ABOVE the jobs it is about. Underneath, it reads as
   a footnote to the last one rather than a property of the day. */
function ConflictNotes({ conflicts }) {
  if (!conflicts.length) return null
  return (
    <>
      {conflicts.map((c, i) => (
        <div
          key={i}
          data-conflict={c.severity}
          className={`mb-2 flex items-start gap-2.5 rounded-2xl p-3 ring-1 ${
            c.severity === SEVERITY.CLASH
              ? 'bg-rose-50 text-rose-900 ring-rose-200'
              : 'bg-amber-50 text-amber-900 ring-amber-200'
          }`}
        >
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-extrabold">
              {c.severity === SEVERITY.CLASH ? 'These overlap' : 'Tight turnaround'}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug">{c.message}</p>
            {/* Said out loud, because it is an estimate from a straight-line
                distance and a guess at city traffic. A warning presented as
                fact, wrong twice, is a warning ignored the third time. */}
            <p className="mt-1 text-[11px] opacity-70">
              Estimated from the distance on each job — check it against your own
              plan before relying on it.
            </p>
          </div>
        </div>
      ))}
    </>
  )
}

function JobRow({ job }) {
  const s = spanOf(job)
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
            {job.occasion_name ?? job.service_name}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-mute">{job.trade}</p>
        </div>
        {/* Funded or not is the fact a partner plans spending around, so
            it is the badge rather than the raw status name. */}
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
          job.is_funded ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800'
        }`}>
          {job.is_funded ? 'Confirmed' : 'Awaiting payment'}
        </span>
      </div>

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="shrink-0 text-ink-mute" />
          <span>
            {s.exact
              ? `${clock(s.eventStart)} – ${clock(s.eventEnd)}`
              : (job.time_note ?? 'Time to confirm')}
          </span>
        </div>
        {(job.area_label || job.city) && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0 text-ink-mute" />
            <span>{job.area_label ?? job.city}</span>
          </div>
        )}
        {Number.isFinite(job.guest_count) && job.guest_count > 0 && (
          <span>{job.guest_count} guests</span>
        )}
        {Number.isFinite(job.partner_amount_paise) && (
          <div className="flex items-center gap-1.5">
            <IndianRupee size={12} className="shrink-0 text-ink-mute" />
            <span className="tabular-nums">
              {Math.round(job.partner_amount_paise / 100).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </dl>

      {/* What the day actually costs them, stated rather than left to be
          worked out on the morning. */}
      <p className="mt-2 text-[11.5px] text-ink-mute">
        Allow about {mins(s.setup)} setup and {mins(s.travel)} travel each way.
      </p>
    </div>
  )
}

function formatDay(iso) {
  const d = new Date(`${iso}T00:00:00+05:30`)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString()
  const label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  return isToday ? `Today · ${label}` : isTomorrow ? `Tomorrow · ${label}` : label
}
