import { useCallback, useMemo, useState } from 'react'
import {
  CalendarPlus, CalendarRange, Repeat, ChevronRight, MapPin,
  CalendarDays, RotateCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { daySeverity } from '../../lib/calendarConflicts'
import { useAsyncData } from '../../hooks/useAsyncData'
import { istTodayISO } from '../../lib/istTime'
import { STATUS, dayStatus } from '../../lib/availability'
import ScreenState from '../ui/ScreenState'
import MonthGrid, { CalendarLegend } from './MonthGrid'
import DayDetailSheet from './DayDetailSheet'
import BlockDatesSheet from './BlockDatesSheet'
import RecurringAvailability from './RecurringAvailability'
import AgendaView from './AgendaView'

/**
 * The Calendar screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS HAD TO STOP DOING
 * ══════════════════════════════════════════════════════════════════════
 *
 * It read `partner_jobs` with `const { data } = await …` and threw the
 * error away. A request that failed — offline, expired token, anything —
 * rendered as a month with no work in it. On the screen whose entire
 * purpose is telling a partner what they have on, "we could not load
 * this" and "you have nothing" are the two answers that must never be
 * confused, and they were the same answer.
 *
 * Now it goes through useAsyncData and ScreenState like every other
 * partner screen, which is what commit d79ccc3 built them for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE GRID AND THE AGENDA SHARE ONE CONFLICT ENGINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `daySeverity` runs per day here and inside the agenda rows. A month
 * view whose warnings came from a simpler test — "more than one job" —
 * would flag days that are perfectly workable and, worse, leave unmarked
 * the Whitefield-then-Mysuru day that is the reason to draw a calendar.
 *
 * ── Availability is not fetched here ────────────────────────────────
 * It arrives as a prop from useVendorAccount, which owns the writes too.
 * A second reader would be a second cache to go stale, and the bug this
 * whole screen was rebuilt for was a save that appeared not to persist.
 */
const VIEWS = [['month', 'Month'], ['week', 'Week'], ['list', 'List']]

export default function CalendarMonth({
  vendorId,
  vendor,
  availability = {},
  weeklyRules = [],
  availabilityError = null,
  onSetDay,
  onSetRange,
  onClearDays,
  onSaveWeeklyRules,
}) {
  const todayISO = istTodayISO()
  const [view, setView] = useState('month')
  const [selected, setSelected] = useState(null)
  const [blocking, setBlocking] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const d = new Date(`${todayISO}T00:00:00Z`)
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), 1)
  })

  const read = useCallback(async () => {
    if (!vendorId) return { jobs: [], pending: [] }
    const from = new Date(`${todayISO}T00:00:00Z`)
    from.setUTCDate(from.getUTCDate() - 120)
    const fromISO = from.toISOString().slice(0, 10)

    const [jobsRes, offersRes] = await Promise.all([
      supabase.from('partner_jobs')
        .select('line_id, service_name, occasion_name, trade, status, event_date, time_note, area_label, city, distance_m, partner_amount_paise, is_funded')
        .eq('vendor_id', vendorId)
        .gte('event_date', fromISO)
        .order('event_date', { ascending: true }),
      supabase.from('partner_offer_feed')
        .select('offer_id, line_id, occasion_name, service_name, event_date, time_note, area_label, expires_at, partner_amount_paise')
        .eq('vendor_id', vendorId)
        .eq('status', 'OFFERED')
        .gt('expires_at', new Date().toISOString()),
    ])
    /* Thrown, not swallowed — useAsyncData turns it into an error state
       and keeps whatever was already on screen. */
    if (jobsRes.error) throw jobsRes.error
    return {
      jobs: (jobsRes.data ?? []).filter(j => !['cancelled', 'expired'].includes(j.status)),
      /* A failed offer read is survivable: the day sheet loses its
         "pending" count, the month keeps its bookings. The inbox is
         where offers are answered anyway. */
      pending: offersRes.error ? [] : (offersRes.data ?? []),
    }
  }, [vendorId, todayISO])

  const { data, loading, error, retry } = useAsyncData(read, [vendorId, todayISO])
  const jobs = data?.jobs ?? []
  const pending = data?.pending ?? []

  const byDay = useMemo(() => {
    const m = {}
    for (const j of jobs) if (j.event_date) (m[j.event_date] ??= []).push(j)
    return m
  }, [jobs])

  const pendingByDay = useMemo(() => {
    const m = {}
    for (const p of pending) if (p.event_date) (m[p.event_date] ??= []).push(p)
    return m
  }, [pending])

  const conflicts = useMemo(() => Object.fromEntries(
    Object.entries(byDay).map(([iso, list]) => [iso, daySeverity(list)])), [byDay])

  const upcoming = useMemo(
    () => jobs.filter(j => (j.event_date ?? '') >= todayISO).slice(0, 5),
    [jobs, todayISO])

  const maxPerDay = vendor?.max_events_per_day ?? 1
  const configured = Object.keys(availability).length > 0 || weeklyRules.length > 0

  const goToday = () => {
    const d = new Date(`${todayISO}T00:00:00Z`)
    setCursor(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1))
    setView('month')
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[19px] font-extrabold leading-tight text-ink">Calendar</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-mute">
            Manage your availability, block dates and stay in control of your bookings.
          </p>
        </div>
        <button
          type="button" onClick={() => setBlocking(true)}
          className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-plum-700 px-4 text-[12.5px] font-extrabold text-white"
        >
          <CalendarPlus size={14} /> Block dates
        </button>
      </header>

      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-full bg-ink/[0.05] p-1">
          {VIEWS.map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`min-h-[34px] rounded-full text-[12.5px] font-extrabold transition ${
                view === id ? 'bg-plum-700 text-white' : 'text-ink-soft'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button" onClick={goToday}
          className="min-h-[36px] shrink-0 rounded-full bg-white px-3.5 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"
        >
          Today
        </button>
      </div>

      {/* An availability read that failed must say so. Without this the
          month renders every date as "Not set" — an empty calendar the
          partner has already filled in. */}
      {availabilityError && (
        <p className="flex items-start gap-2 rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
          <RotateCw size={14} className="mt-px shrink-0" />
          Your marked days could not be loaded, so this month may be incomplete.
          Nothing has been lost — pull down to try again.
        </p>
      )}

      <ScreenState
        loading={loading} error={error} onRetry={retry} what="your calendar" rows={4}
      >
        {view === 'month' && (
          <div className="space-y-3">
            <MonthGrid
              jobs={jobs}
              availability={availability}
              weeklyRules={weeklyRules}
              conflicts={conflicts}
              maxPerDay={maxPerDay}
              selected={selected}
              onSelect={setSelected}
              cursor={cursor}
              onCursor={setCursor}
            />
            <CalendarLegend />
          </div>
        )}

        {view === 'week' && (
          <WeekStrip
            todayISO={todayISO}
            availability={availability}
            weeklyRules={weeklyRules}
            byDay={byDay}
            maxPerDay={maxPerDay}
            onSelect={setSelected}
          />
        )}

        {view === 'list' && <AgendaView vendorId={vendorId} />}
      </ScreenState>

      {!configured && !loading && !error && (
        <div className="rounded-[22px] bg-plum-50 px-5 py-5 text-center ring-1 ring-plum-100">
          <p className="text-[13.5px] font-extrabold text-ink">Your calendar isn't set up yet.</p>
          <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-ink-mute">
            Tell us the days you normally work and we will stop offering you jobs on the
            days you don't.
          </p>
          <button
            type="button" onClick={() => setRecurring(true)}
            className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-700 px-5 text-[13px] font-extrabold text-white"
          >
            Set your availability
          </button>
        </div>
      )}

      <section>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
          Availability tools
        </p>
        <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.06]">
          <Tool icon={CalendarRange} title="Block multiple dates"
                hint="Select a date range" onClick={() => setBlocking(true)} />
          <Tool icon={Repeat} title="Set your usual week"
                hint="E.g. never on Sundays" onClick={() => setRecurring(true)} />
          {/* Honest rather than aspirational: there is no Google
              integration in this codebase — no OAuth, no client, nothing.
              A button that looked live would be a promise the app cannot
              keep the first time somebody pressed it. */}
          <Tool icon={CalendarDays} title="Sync Google Calendar"
                hint="Coming soon" disabled />
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
            Upcoming bookings
          </p>
          {upcoming.length > 0 && (
            <button type="button" onClick={() => setView('list')}
                    className="text-[11.5px] font-extrabold text-plum-700">
              View all
            </button>
          )}
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-[18px] bg-ink/[0.02] px-4 py-5 text-center text-[12.5px] text-ink-mute">
            No upcoming bookings.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map(j => (
              <li key={j.line_id}>
                <button
                  type="button" onClick={() => setSelected(j.event_date)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 text-left ring-1 ring-ink/[0.06]"
                >
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] bg-plum-50 text-plum-800">
                    <span className="text-[14px] font-extrabold leading-none">
                      {new Date(`${j.event_date}T00:00:00Z`).getUTCDate()}
                    </span>
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {new Date(`${j.event_date}T00:00:00Z`).toLocaleDateString('en-IN',
                        { month: 'short', timeZone: 'UTC' })}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold text-ink">
                      {j.occasion_name ?? j.service_name ?? 'Booking'}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-mute">
                      {j.time_note && <span>{j.time_note}</span>}
                      {j.area_label && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin size={10} />{j.area_label}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <DayDetailSheet
          date={selected}
          vendor={vendor}
          availability={availability}
          weeklyRules={weeklyRules}
          jobsOnDay={byDay[selected] ?? []}
          pendingOnDay={pendingByDay[selected] ?? []}
          onSetDay={onSetDay}
          onClearDay={iso => onClearDays([iso])}
          onClose={() => setSelected(null)}
        />
      )}

      {blocking && (
        <BlockDatesSheet
          jobs={jobs}
          onSetRange={onSetRange}
          onClose={() => setBlocking(false)}
        />
      )}

      {recurring && (
        <RecurringAvailability
          weeklyRules={weeklyRules}
          vendor={vendor}
          onSave={onSaveWeeklyRules}
          onClose={() => setRecurring(false)}
        />
      )}
    </div>
  )
}

function Tool({ icon: Icon, title, hint, onClick, disabled = false }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className="flex w-full items-center gap-3 border-b border-ink/[0.05] px-3.5 py-3 text-left last:border-b-0 disabled:opacity-55"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-plum-50 text-plum-700">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">{title}</span>
        <span className="block text-[11px] text-ink-mute">{hint}</span>
      </span>
      {!disabled && <ChevronRight size={16} className="shrink-0 text-ink-faint" />}
    </button>
  )
}

/**
 * Seven days, in words.
 *
 * The month grid has to fit a state into 46 pixels; this does not, so it
 * spells out what each day is and what is on it. Same verdict function,
 * same ordering — only the room to say it differs.
 */
function WeekStrip({ todayISO, availability, weeklyRules, byDay, maxPerDay, onSelect }) {
  const days = useMemo(() => {
    const start = new Date(`${todayISO}T00:00:00Z`)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [todayISO])

  const TONE = {
    [STATUS.OPEN]:    'bg-forest-50 ring-forest-200',
    [STATUS.LIMITED]: 'bg-saffron-50 ring-saffron-200',
    [STATUS.BOOKED]:  'bg-plum-50 ring-plum-200',
    [STATUS.BLOCKED]: 'bg-ink/[0.05] ring-ink/[0.12]',
    [STATUS.UNSET]:   'bg-white ring-ink/[0.07]',
  }
  const WORD = {
    [STATUS.OPEN]: 'Available', [STATUS.LIMITED]: 'Limited',
    [STATUS.BOOKED]: 'Booked', [STATUS.BLOCKED]: 'Blocked', [STATUS.UNSET]: 'Not set',
  }

  return (
    <ul className="space-y-1.5">
      {days.map(iso => {
        const jobsOnDay = byDay[iso] ?? []
        const v = dayStatus({
          dateISO: iso, row: availability[iso] ?? null,
          weeklyRules, jobsOnDay, maxPerDay, todayISO,
        })
        const d = new Date(`${iso}T00:00:00Z`)
        return (
          <li key={iso}>
            <button
              type="button" onClick={() => onSelect(iso)}
              className={`flex w-full items-center gap-3 rounded-[18px] px-3.5 py-3 text-left ring-1 ${TONE[v.status]}`}
            >
              <span className="w-11 shrink-0">
                <span className="block text-[10px] font-bold uppercase leading-none text-ink-mute">
                  {d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}
                </span>
                <span className="mt-0.5 block text-[16px] font-extrabold leading-none text-ink">
                  {d.getUTCDate()}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-ink">
                  {WORD[v.status]}
                  {v.status === STATUS.LIMITED && ` · ${v.remaining} left`}
                  {v.today && ' · Today'}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">
                  {jobsOnDay.length > 0
                    ? jobsOnDay.map(j => j.occasion_name ?? j.service_name ?? 'Booking').join(', ')
                    : v.reason ?? 'Nothing booked'}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-faint" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
