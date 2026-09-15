import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The month, as dots.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR THINGS CAN BE TRUE OF A DAY, AND THEY ARE NOT EXCLUSIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Job        a booking is on it
 *   Blocked    the partner marked it unavailable
 *   Limited    they have capped how many jobs they will take
 *   Conflict   two jobs that cannot both be done — see calendarConflicts
 *
 * A day can carry a job AND be limited. So the cell shows up to three
 * dots rather than picking one colour and losing the rest, and the
 * legend names every colour used. Colour alone never carries meaning
 * here: tapping a day opens the list underneath, which says it in words.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CONFLICT DOT IS THE POINT OF THIS GRID
 * ══════════════════════════════════════════════════════════════════════
 *
 * A month view that only shows where the work is tells a partner what
 * they already know. The reason to draw it is the day that looks fine
 * and is not — a Whitefield finish at 4pm and a Mysuru start at 5pm sit
 * in the same cell as any other two jobs. Those get a rose dot, and it
 * is the only one that is also given a ring, because it is the only one
 * that needs doing something about.
 */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TONE = {
  job:      'bg-plum-600',
  blocked:  'bg-ink/40',
  limited:  'bg-saffron-500',
  conflict: 'bg-rose-500',
}

const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function MonthGrid({ jobs, availability, conflicts, selected, onSelect }) {
  const [cursor, setCursor] = useState(() => {
    const d = selected ? new Date(`${selected}T00:00:00`) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const marks = useMemo(() => {
    const m = {}
    const add = (iso, kind) => {
      if (!iso) return
      m[iso] = m[iso] ?? new Set()
      m[iso].add(kind)
    }
    for (const j of jobs ?? []) {
      if (['cancelled', 'expired'].includes(j.status)) continue
      add(j.event_date, 'job')
    }
    for (const [iso, row] of Object.entries(availability ?? {})) {
      if (row?.status === 'BLOCKED') add(iso, 'blocked')
      else if (row?.status === 'LIMITED') add(iso, 'limited')
    }
    /* conflictsFor keys by day already; anything it flags above OK is a
       day worth a dot. */
    for (const [iso, severity] of Object.entries(conflicts ?? {})) {
      if (severity && severity !== 'OK') add(iso, 'conflict')
    }
    return m
  }, [jobs, availability, conflicts])

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    /* Leading blanks so the 1st lands under its real weekday. Without
       them every date in the month sits one column out, which is the
       kind of wrong nobody notices until they miss a Saturday. */
    return [
      ...Array(first.getDay()).fill(null),
      ...Array.from({ length: days }, (_, i) =>
        new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ]
  }, [cursor])

  const today = key(new Date())
  const used = new Set(Object.values(marks).flatMap(s => [...s]))

  const shift = n => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1))

  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft">
          <ChevronLeft size={18} />
        </button>
        <p className="text-[14.5px] font-extrabold text-ink">
          {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <button type="button" onClick={() => shift(1)} aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {DOW.map(d => (
          <span key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-ink-mute">
            {d}
          </span>
        ))}

        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />
          const iso = key(d)
          const kinds = [...(marks[iso] ?? [])]
          const isToday = iso === today
          const isSel = iso === selected
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              aria-label={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}${kinds.length ? `, ${kinds.join(', ')}` : ''}`}
              aria-pressed={isSel}
              className="flex flex-col items-center gap-0.5 py-1"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] font-bold tabular-nums ${
                isSel ? 'bg-plum-950 text-white'
                : isToday ? 'text-plum-800 ring-1 ring-plum-300'
                : 'text-ink-soft'}`}>
                {d.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {kinds.slice(0, 3).map(k => (
                  <span key={k}
                        className={`h-1.5 w-1.5 rounded-full ${TONE[k]} ${
                          k === 'conflict' ? 'ring-1 ring-rose-300' : ''}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Only the colours actually on this month. A legend listing four
          keys when the month uses one teaches a partner to ignore it. */}
      {used.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ink/[0.06] pt-2.5">
          {[['job', 'Jobs'], ['conflict', 'Too tight'], ['limited', 'Limited'], ['blocked', 'Blocked']]
            .filter(([k]) => used.has(k))
            .map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-mute">
                <span className={`h-1.5 w-1.5 rounded-full ${TONE[k]}`} /> {label}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
