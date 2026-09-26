import { useCallback, useMemo, useState } from 'react'
import { useCalendarCoverage } from '../../hooks/useCalendarCoverage'
import {
  CalendarPlus, CalendarRange, Repeat, ChevronRight, MapPin, CalendarDays, RotateCw, CalendarCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { daySeverity } from '../../lib/calendarConflicts'
import { useAsyncData } from '../../hooks/useAsyncData'
import { istTodayISO } from '../../lib/istTime'
import { STATUS, dayStatus } from '../../lib/availability'
import { indexInterestRows } from '../../lib/demand'
import ScreenState from '../ui/ScreenState'
import MonthGrid, { CalendarLegend } from './MonthGrid'
import DayDetailSheet from './DayDetailSheet'
import AvailabilityRangeSheet from './AvailabilityRangeSheet'
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

  /* The same answer the Jobs card reads, so the two surfaces cannot
     disagree about how far ahead this calendar speaks. */
  const coverage = useCalendarCoverage({ availability, weeklyRules, vendor })

  const [view, setView] = useState('month')
  const [selected, setSelected] = useState(null)
  /* null when closed; otherwise { from, mode } — so the same sheet serves
     the header button, the tools list, and "apply to a range" inside a
     day. */
  const [range, setRange] = useState(null)
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

    /* How far ahead the demand read goes. Matches the 90-day cap on a
       range, so every date the partner can reach in one save has an
       answer. */
    const horizon = new Date(`${todayISO}T00:00:00Z`)
    horizon.setUTCDate(horizon.getUTCDate() + 120)

    const [jobsRes, offersRes, demandRes] = await Promise.all([
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
      /* What customers have actually asked about, so a block warning can
         name a number instead of guessing. Granted to `authenticated` in
         036; the customer surface reads the same function. */
      supabase.rpc('date_demand', {
        p_from: todayISO,
        p_to: horizon.toISOString().slice(0, 10),
        p_city: null,
      }),
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
      /* Survivable too, and more so: without it the block warning simply
         loses its demand line. A calendar that refused to open because
         an analytics function was missing would be a worse trade than
         one warning fewer. */
      interest: demandRes?.error ? [] : (demandRes?.data ?? []),
    }
  }, [vendorId, todayISO])

  const { data, loading, error, retry } = useAsyncData(read, [vendorId, todayISO])
  const jobs = data?.jobs ?? []
  const pending = data?.pending ?? []
  const interestByDate = useMemo(
    () => indexInterestRows(data?.interest ?? []), [data?.interest])

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
    <div className="space-y-3 pb-2">
      {/* Futuristic calendar header — same actions, clearer first-time experience. */}
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#24104f] via-[#4f20a8] to-[#7c3aed] px-4 pb-4 pt-4 text-white shadow-[0_14px_34px_rgba(63,25,130,0.22)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-violet-300/15 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">SAMBRAMO PARTNER</p>
            <h1 className="mt-1 text-[26px] font-black leading-none tracking-[-0.03em]">Calendar</h1>
            <p className="mt-2 max-w-[250px] text-[11.5px] font-medium leading-snug text-white/75">
              Tell us when you can work. We will use it when matching your next event.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white/10 ring-1 ring-white/15">
            <CalendarDays size={34} className="text-violet-100" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRange({ from: null, mode: 'OPEN' })}
          className="relative mt-4 flex min-h-[48px] w-full items-center gap-3 rounded-[17px] bg-white px-3.5 text-left text-plum-950 shadow-[0_8px_22px_rgba(0,0,0,0.12)] transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-violet-100 text-violet-700">
            <CalendarPlus size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-black">Set your dates</span>
            <span className="block text-[10.5px] font-semibold text-ink-mute">Available, limited or blocked — a few taps.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-violet-700" />
        </button>
      </section>

      {/* One clear switch between the three existing calendar views. */}
      <div className="flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-full bg-ink/[0.055] p-1">
          {VIEWS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={[
                'min-h-[38px] rounded-full text-[12.5px] font-black transition active:scale-[0.99]',
                view === id ? 'bg-plum-700 text-white shadow-sm' : 'text-ink-soft',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={goToday}
          className="min-h-[40px] shrink-0 rounded-full bg-white px-3.5 text-[12px] font-black text-plum-700 ring-1 ring-plum-200"
        >
          Today
        </button>
      </div>

      {availabilityError && (
        <p className="flex items-start gap-2 rounded-[16px] bg-rose-50 px-3.5 py-3 text-[11.5px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
          <RotateCw size={14} className="mt-px shrink-0" />
          Your marked days could not be loaded, so this month may be incomplete. Nothing has been lost — try again.
        </p>
      )}

      <ScreenState loading={loading} error={error} onRetry={retry} what="your calendar" rows={4}>
        {view === 'month' && (
          <section className="overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_8px_24px_rgba(42,8,92,0.07)] ring-1 ring-ink/[0.06]">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                disabled={cursor.getFullYear() === new Date(`${todayISO}T00:00:00Z`).getUTCFullYear() && cursor.getMonth() === new Date(`${todayISO}T00:00:00Z`).getUTCMonth()}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.035] text-ink-soft disabled:opacity-30"
              >
                <span className="text-xl leading-none">‹</span>
              </button>
              <button
                type="button"
                onClick={goToday}
                className="text-center"
                aria-label="Return to current month"
              >
                <p className="text-[16px] font-black tracking-[-0.02em] text-ink">
                  {new Date(`${todayISO}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </p>
                <p className="mt-0.5 text-[9.5px] font-bold text-ink-mute">Tap to return to today</p>
              </button>
              <button
                type="button"
                onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.035] text-ink-soft"
              >
                <span className="text-xl leading-none">›</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={`${d}-${i}`} className="py-1 text-center text-[9px] font-black uppercase tracking-wide text-ink-faint">{d}</div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {(() => {
                const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
                const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
                const pad = first.getDay()
                const grid = Array.from({ length: pad }, () => null)
                for (let d = 1; d <= total; d++) grid.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
                while (grid.length % 7 !== 0) grid.push(null)
                return grid.map((date, i) => {
                  if (!date) return <div key={`blank-${i}`} className="aspect-square" />
                  const iso = date.toISOString().slice(0, 10)
                  const isPast = iso < todayISO
                  const isToday = iso === todayISO
                  const jobsOnDay = byDay[iso] ?? []
                  const v = dayStatus({
                    dateISO: iso,
                    row: availability[iso] ?? null,
                    weeklyRules,
                    jobsOnDay,
                    maxPerDay,
                    todayISO,
                  })
                  const severity = conflicts[iso]
                  const status = v.status
                  const styles = {
                    [STATUS.OPEN]: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
                    [STATUS.LIMITED]: 'bg-amber-50 text-amber-900 ring-amber-200',
                    [STATUS.BOOKED]: 'bg-violet-50 text-violet-900 ring-violet-200',
                    [STATUS.BLOCKED]: 'bg-ink/[0.06] text-ink-soft ring-ink/[0.12]',
                    [STATUS.UNSET]: 'bg-white text-ink-mute ring-ink/[0.07]',
                  }[status] ?? 'bg-white text-ink-mute ring-ink/[0.07]'
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelected(iso)}
                      aria-label={`${date.toDateString()} — ${status}${v.reason ? ` — ${v.reason}` : ''}`}
                      className={[
                        'relative flex aspect-square min-h-[46px] flex-col items-center justify-center rounded-[14px] ring-1 transition active:scale-[0.97]',
                        styles,
                        isPast ? 'opacity-35' : 'hover:ring-plum-300',
                        isToday ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                      ].join(' ')}
                    >
                      <span className={`text-[13px] font-black leading-none ${isToday ? 'text-plum-700' : ''}`}>{date.getDate()}</span>
                      <span className="mt-1 max-w-full truncate px-0.5 text-[7.5px] font-extrabold leading-none opacity-70">
                        {status === STATUS.OPEN ? 'Open'
                          : status === STATUS.LIMITED ? `${v.remaining ?? availability[iso]?.slots_total ?? 1} left`
                          : status === STATUS.BOOKED ? 'Booked'
                          : status === STATUS.BLOCKED ? 'Blocked'
                          : 'Not set'}
                      </span>
                      {jobsOnDay.length > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
                      )}
                      {severity && severity !== 'ok' && (
                        <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-rose-500" />
                      )}
                    </button>
                  )
                })
              })()}
            </div>

            <div className="mt-3">
              <CalendarLegend />
            </div>
          </section>
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
        <div className="rounded-[22px] bg-gradient-to-br from-violet-50 to-white px-5 py-5 text-center ring-1 ring-violet-100">
          <p className="text-[13.5px] font-black text-ink">Your calendar isn't set up yet.</p>
          <p className="mx-auto mt-1 max-w-[34ch] text-[12px] leading-relaxed text-ink-mute">
            Tell us the days you normally work and we will stop offering you jobs on the days you don't.
          </p>
          <button
            type="button"
            onClick={() => setRecurring(true)}
            className="mt-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-plum-700 px-5 text-[13px] font-black text-white"
          >
            Set your availability
          </button>
        </div>
      )}

      {coverage.severity !== 'ok' && (
        <section
          data-coverage={coverage.severity}
          className="rounded-[22px] bg-white p-3.5 shadow-[0_6px_18px_rgba(42,8,92,0.05)] ring-1 ring-ink/[0.06]"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">Calendar coverage</p>
              <p className="mt-0.5 text-[12px] font-extrabold text-ink-soft">{coverage.coverageDays} of {coverage.targetDays} days ready</p>
            </div>
            <p className="text-[11px] font-black text-plum-700">{Math.round(coverage.fraction * 100)}%</p>
          </div>
          <span className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]">
            <span
              className={`h-full rounded-full ${coverage.severity === 'thin' ? 'bg-saffron-400' : 'bg-plum-600'}`}
              style={{ width: `${Math.max(2, Math.round(coverage.fraction * 100))}%` }}
            />
          </span>
          <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
            {coverage.firstBlank
              ? `Nothing said about ${coverage.firstBlank.label} yet. Customers plan celebrations months ahead, so the further out you go the more we can match you.`
              : 'Customers plan celebrations months ahead. The further out your calendar goes, the more we can match you.'}
          </p>
          <button
            type="button"
            data-cover-horizon
            onClick={() => setRange({ from: todayISO, to: coverage.horizonISO, mode: 'OPEN' })}
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-plum-600 px-4 text-[12.5px] font-black text-white"
          >
            <CalendarCheck size={14} />
            Open the next {coverage.targetDays} days
          </button>
        </section>
      )}

      <section>
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">Availability tools</p>
            <p className="mt-0.5 text-[11px] text-ink-mute">Set your routine once, or change a group of dates.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9.5px] font-black text-violet-700">Quick actions</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToolCard icon={CalendarRange} title="Set a range" hint="Open, limited or blocked" onClick={() => setRange({ from: null, mode: null })} />
          <ToolCard icon={Repeat} title="Usual week" hint="Set days you normally work" onClick={() => setRecurring(true)} />
          <ToolCard icon={CalendarDays} title="Google Calendar" hint="Coming soon" disabled />
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-end justify-between px-0.5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">Upcoming bookings</p>
            <p className="mt-0.5 text-[11px] text-ink-mute">{upcoming.length ? `${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'}` : 'Nothing booked yet'}</p>
          </div>
          {upcoming.length > 0 && (
            <button type="button" onClick={() => setView('list')} className="text-[11px] font-black text-plum-700">View all <ChevronRight size={13} className="inline" /></button>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-[20px] bg-white px-4 py-5 ring-1 ring-ink/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-violet-50 text-violet-700">
                <CalendarCheck size={18} />
              </span>
              <div>
                <p className="text-[12.5px] font-black text-ink">No upcoming bookings</p>
                <p className="mt-0.5 text-[11px] text-ink-mute">Accepted events will appear here automatically.</p>
              </div>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(j => (
              <li key={j.line_id}>
                <button
                  type="button"
                  onClick={() => setSelected(j.event_date)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 text-left shadow-[0_4px_16px_rgba(42,8,92,0.05)] ring-1 ring-ink/[0.06]"
                >
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] bg-violet-50 text-violet-800">
                    <span className="text-[14px] font-black leading-none">
                      {new Date(`${j.event_date}T00:00:00Z`).getUTCDate()}
                    </span>
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {new Date(`${j.event_date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-black text-ink">{j.occasion_name ?? j.service_name ?? 'Booking'}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-ink-mute">
                      {j.time_note && <span>{j.time_note}</span>}
                      {j.area_label && <span className="inline-flex items-center gap-0.5"><MapPin size={10} />{j.area_label}</span>}
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
          interestOnDay={interestByDate.get(selected) ?? null}
          onApplyToRange={mode => { setRange({ from: selected, mode }); setSelected(null) }}
          onClose={() => setSelected(null)}
        />
      )}

      {range && (
        <AvailabilityRangeSheet
          jobs={jobs}
          availability={availability}
          weeklyRules={weeklyRules}
          interestByDate={interestByDate}
          maxPerDay={maxPerDay}
          initialFrom={range.from}
          initialTo={range.to ?? null}
          initialMode={range.mode}
          onSetRange={onSetRange}
          onClearDays={onClearDays}
          onClose={() => setRange(null)}
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

function ToolCard({ icon: Icon, title, hint, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[112px] flex-col items-start justify-between rounded-[20px] bg-white p-3 text-left shadow-[0_6px_18px_rgba(42,8,92,0.05)] ring-1 ring-ink/[0.06] transition active:scale-[0.985] disabled:opacity-55"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-violet-50 text-violet-700">
        <Icon size={17} />
      </span>
      <span className="mt-2 block text-[12px] font-black leading-tight text-ink">{title}</span>
      <span className="mt-0.5 block text-[10px] leading-snug text-ink-mute">{hint}</span>
      {!disabled && <ChevronRight size={15} className="mt-2 self-end text-plum-600" />}
    </button>
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
