import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarX2, CalendarCog } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { daySeverity } from '../../lib/calendarConflicts'
import MonthGrid from './MonthGrid'
import SetAvailability from './SetAvailability'
import AgendaView from './AgendaView'

/**
 * The month, and the day underneath it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE GRID IS FED BY THE SAME CONFLICT ENGINE AS THE AGENDA
 * ══════════════════════════════════════════════════════════════════════
 *
 * `daySeverity` is run per day here and inside the agenda rows below.
 * A month view whose dots came from a simpler test — "more than one job"
 * — would mark days red that are perfectly workable and, worse, leave
 * unmarked the Whitefield-then-Mysuru day that is the reason to draw a
 * calendar at all.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SELECTING A DAY NARROWS, IT DOES NOT NAVIGATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tapping a date filters the list beneath rather than pushing a screen.
 * A partner checking "what have I got on the 26th" wants to look, see,
 * and carry on scanning the month — not to land somewhere and have to
 * come back. Tapping the same date again clears it.
 */
export default function CalendarMonth({ vendorId, availability, onSetDay, onSetRange }) {
  const [jobs, setJobs] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)

  const read = useCallback(async () => {
    if (!vendorId) return
    /* A wide window, because the grid pages through months and a
       re-query per swipe would make the dots flicker in and out. Ninety
       days back covers "what did I do last month"; a year forward
       covers every booking this platform takes. */
    const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('partner_jobs')
      .select('line_id, service_name, occasion_name, trade, status, event_date, time_note, area_label, distance_m, is_funded')
      .gte('event_date', from)
      .order('event_date', { ascending: true })
    setJobs((data ?? []).filter(j => !['cancelled', 'expired'].includes(j.status)))
  }, [vendorId])

  useEffect(() => { read() }, [read])

  /* One severity per day, from the same engine the agenda uses. */
  const conflicts = useMemo(() => {
    const byDay = {}
    for (const j of jobs) {
      if (!j.event_date) continue
      byDay[j.event_date] = byDay[j.event_date] ?? []
      byDay[j.event_date].push(j)
    }
    return Object.fromEntries(
      Object.entries(byDay).map(([iso, list]) => [iso, daySeverity(list)]))
  }, [jobs])

  const onDay = jobs.filter(j => j.event_date === selected)

  return (
    <div className="space-y-3">
      <MonthGrid
        jobs={jobs}
        availability={availability}
        conflicts={conflicts}
        selected={selected}
        onSelect={iso => { setEditing(false); setSelected(s => (s === iso ? null : iso)) }}
      />

      {/* The sheet, in place of the day's list while it is open. Not a
          modal: a partner setting a date wants the month still visible
          above it, and a sheet that covers the calendar is one they
          have to close to check what they just did. */}
      {selected && editing && (
        <div className="rounded-[22px] bg-surface-sunk p-3.5 ring-1 ring-ink/[0.07]">
          <SetAvailability
            date={selected}
            availability={availability}
            onSetDay={onSetDay}
            onSetRange={onSetRange}
            onDone={() => setEditing(false)}
          />
        </div>
      )}

      {selected && !editing ? (
        <div>
          <p className="mb-2 text-[13px] font-extrabold text-ink">
            {new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN',
              { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <button
            type="button" onClick={() => setEditing(true)}
            className="mb-2 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-white text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"
          >
            <CalendarCog size={14} /> Set availability for this day
          </button>
          {onDay.length === 0 ? (
            <p className="flex items-center gap-2 rounded-[18px] bg-ink/[0.03] px-4 py-3.5 text-[12.5px] text-ink-mute">
              <CalendarX2 size={14} className="shrink-0" />
              Nothing booked. {availability?.[selected]?.status === 'BLOCKED'
                ? 'You have marked this day unavailable.'
                : 'You are available.'}
            </p>
          ) : (
            <AgendaView vendorId={vendorId} onlyDate={selected} />
          )}
        </div>
      ) : (
        <AgendaView vendorId={vendorId} />
      )}
    </div>
  )
}
