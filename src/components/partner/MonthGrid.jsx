import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS, dayStatus } from '../../lib/availability'
import { istTodayISO } from '../../lib/istTime'

/**
 * The month, where every square says what it is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A BLANK CELL IS AN ANSWER THE PARTNER CANNOT READ
 * ══════════════════════════════════════════════════════════════════════
 *
 * This grid used to carry availability as dots — a 1.5px speck under a
 * number. A partner who tapped a date, chose Blocked and saved had to
 * hunt for the difference. Worse, a date nobody had touched looked
 * identical to a date marked Available, so the commonest action in the
 * app produced no visible result at all.
 *
 * So the cell IS the state: its fill, its ring and a word. Every date in
 * the month carries one, including the ones nobody has configured —
 * "Not set" is a state, and a partner who cannot tell it from "Available"
 * cannot tell what they have promised.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE VERDICT IS NOT COMPUTED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `dayStatus` in lib/availability decides, and the customer surface and
 * the accept path apply the same ordering. This component only draws the
 * answer. Anything resembling a rule in this file — "LIMITED with
 * nothing left is really BOOKED", "a row beats the standing week" — is a
 * bug, because it would be the second copy.
 *
 * ── The conflict ring is still the point ────────────────────────────
 * A month that only shows where the work is tells a partner what they
 * already know. The reason to draw it is the day that looks fine and is
 * not — a Whitefield finish at 4pm and a Mysuru start at 5pm sit in the
 * same square as any other two jobs. That gets a rose ring, on top of
 * whatever the day's status is, because it is the only mark that needs
 * doing something about.
 */
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/* Colour is never the only carrier: every cell also has a word, and the
   legend names each one. Blocked is the only filled-dark cell, so its
   text is white — an `ink` token dropped in here would be invisible. */
const SKIN = {
  [STATUS.OPEN]:    'bg-forest-50 text-forest-800 ring-forest-300',
  [STATUS.LIMITED]: 'bg-saffron-100 text-saffron-800 ring-saffron-400',
  [STATUS.BOOKED]:  'bg-plum-100 text-plum-800 ring-plum-300',
  [STATUS.BLOCKED]: 'bg-ink text-white ring-ink',
  [STATUS.UNSET]:   'bg-white text-ink-mute ring-ink/[0.10]',
}

/* Short enough for a 46px column on a 360px phone. The day sheet says
   it in full; this has to fit. */
function chipFor(v) {
  switch (v.status) {
    case STATUS.BLOCKED: return v.source === 'weekly' ? 'Off' : 'Blocked'
    case STATUS.BOOKED:  return v.booked > 1 ? `${v.booked} jobs` : '1 job'
    case STATUS.LIMITED: return `${v.remaining} left`
    case STATUS.OPEN:    return 'Open'
    default:             return 'Not set'
  }
}

const key = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function MonthGrid({
  jobs = [],
  availability = {},
  weeklyRules = [],
  conflicts = {},
  maxPerDay = 1,
  selected,
  onSelect,
  cursor,
  onCursor,
}) {
  const todayISO = istTodayISO()

  /* Jobs bucketed once, rather than filtered per cell — a month of 31
     cells against a year of jobs is 31 scans of the same array. */
  const jobsByDay = useMemo(() => {
    const m = {}
    for (const j of jobs) {
      if (!j.event_date || ['cancelled', 'expired'].includes(j.status)) continue
      ;(m[j.event_date] ??= []).push(j)
    }
    return m
  }, [jobs])

  const cells = useMemo(() => {
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()
    const days = new Date(y, mo + 1, 0).getDate()
    /* Leading blanks so the 1st lands under its real weekday. Without
       them every date sits one column out, which is the kind of wrong
       nobody notices until they miss a Saturday. */
    return [
      ...Array(new Date(y, mo, 1).getDay()).fill(null),
      ...Array.from({ length: days }, (_, i) => new Date(y, mo, i + 1)),
    ]
  }, [cursor])

  const shift = n =>
    onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  return (
    <div className="rounded-[22px] bg-white p-3 ring-1 ring-ink/[0.06] xs:p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button" onClick={() => shift(-1)} aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.04]"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-[14.5px] font-extrabold text-ink">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <button
          type="button" onClick={() => shift(1)} aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.04]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {DOW.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-ink-faint">
            <span aria-hidden="true">{d}</span>
            <span className="sr-only">{DOW_FULL[i]}</span>
          </div>
        ))}

        {cells.map((d, i) => {
          if (!d) return <div key={`blank-${i}`} aria-hidden="true" />

          const iso = key(d)
          const verdict = dayStatus({
            dateISO: iso,
            row: availability[iso] ?? null,
            weeklyRules,
            jobsOnDay: jobsByDay[iso] ?? null,
            maxPerDay,
            todayISO,
          })
          const clash = conflicts[iso] && conflicts[iso] !== 'OK'
          const isSelected = selected === iso

          /* Past days are shown, never hidden — a partner looking back at
             what they did last month is a real use — but they are dimmed
             and inert, so a stray tap cannot rewrite history. */
          return (
            <button
              key={iso}
              type="button"
              disabled={verdict.past}
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}, ${chipFor(verdict)}${verdict.today ? ', today' : ''}${clash ? ', has a timing clash' : ''}`}
              className={[
                'flex min-h-[54px] flex-col items-center justify-start gap-0.5 rounded-xl px-0.5 py-1.5 ring-1 transition',
                SKIN[verdict.status],
                verdict.past && 'opacity-40',
                !verdict.past && 'hover:brightness-[0.97]',
                isSelected && 'outline outline-2 outline-offset-1 outline-plum-600',
                clash && !isSelected && 'outline outline-2 outline-offset-1 outline-rose-400',
              ].filter(Boolean).join(' ')}
            >
              <span className={[
                'text-[13px] font-extrabold leading-none',
                verdict.today && 'flex h-[18px] w-[18px] items-center justify-center rounded-full bg-plum-600 text-white',
              ].filter(Boolean).join(' ')}>
                {d.getDate()}
              </span>
              <span className="w-full truncate text-center text-[8.5px] font-bold leading-tight xs:text-[9.5px]">
                {chipFor(verdict)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The legend, exported beside the grid it explains.
 *
 * Kept in this file because it names the same five states the SKIN map
 * draws, and a legend that drifts from its grid is worse than none.
 */
export function CalendarLegend() {
  const rows = [
    [STATUS.OPEN,    'Available', 'Open for bookings'],
    [STATUS.LIMITED, 'Limited',   'Few slots left'],
    [STATUS.BOOKED,  'Booked',    'Confirmed work'],
    [STATUS.BLOCKED, 'Blocked',   'Not available'],
    [STATUS.UNSET,   'Not set',   'No preference yet'],
  ]
  return (
    <div className="rounded-[22px] bg-white p-3.5 ring-1 ring-ink/[0.06]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 xs:grid-cols-3">
        {rows.map(([status, label, hint]) => (
          <div key={status} className="flex items-start gap-2">
            <span className={`mt-[3px] h-3 w-3 shrink-0 rounded-full ring-1 ${SKIN[status]}`} />
            <span className="min-w-0">
              <span className="block text-[12px] font-extrabold leading-tight text-ink">{label}</span>
              <span className="block text-[10.5px] leading-tight text-ink-mute">{hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
