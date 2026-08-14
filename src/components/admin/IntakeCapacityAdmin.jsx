import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle, Loader2, CalendarDays, Save, ArrowUp, ArrowDown, RotateCcw, Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import MonthGrid from '../common/MonthGrid'
import { LIVE_CITIES } from '../../config/cities'
import { humanDate, todayISO } from '../../utils/format'
import { addDaysISO, parseISO } from '../../lib/demand'

/**
 * Intake capacity — how many celebrations we can actually serve on a date.
 *
 * ── Read this before extending it ────────────────────────────────────
 *
 * Migration 036 deliberately removed capacity from the product: it dropped
 * `consumed`/`capacity` from date_demand(), and lib/demand.js still says in
 * as many words that "nothing here can block, cap or refuse a date". That
 * decision was about *the customer-facing calendar*, and it stands — this
 * screen does not change it. No customer sees a date as full because of
 * anything set here.
 *
 * What this is instead is the operations view of the same numbers: how many
 * accepted celebrations already sit on a date against what the vendor bench
 * can take, and who is queued behind it. A coordinator deciding whether to
 * chase a twelfth Diwali enquiry needs that; a customer choosing a date does
 * not. Wiring it back into the customer calendar is a separate, deliberate
 * decision and should be made as one.
 *
 * ── Why it counts rows itself ────────────────────────────────────────
 *
 * The obvious shortcut is date_demand().site_count, and it is wrong here.
 * That function counts every non-cancelled event and every open enquiry
 * regardless of intake_status, so waitlisted rows are inside its total —
 * and a waitlist that consumed the very slots it is queueing for would show
 * every busy date as permanently over capacity. So the two queries below
 * filter on intake_status themselves and keep the halves separate.
 *
 * ── Capacity resolution ──────────────────────────────────────────────
 *
 * Exactly as 035's function resolved it: the city's own row wins, the
 * NULL-city row is the fallback, and 12 is the floor if neither exists.
 * Capacity is per-city by definition, so the calendar always shows one city
 * — a single bar over two cities' bookings would be a number that means
 * nothing.
 */

const HORIZON_DAYS = 400
const DEFAULT_CAP = 12

export default function IntakeCapacityAdmin() {
  const [caps, setCaps]         = useState([])
  const [events, setEvents]     = useState([])
  const [enquiries, setEnq]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busy, setBusy]         = useState(null)
  const [drafts, setDrafts]     = useState({})

  const [city, setCity] = useState(LIVE_CITIES[0]?.name ?? 'Bengaluru')

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor, setCursor]     = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(todayISO())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const from = todayISO()
    const to   = addDaysISO(from, HORIZON_DAYS)

    const [cap, ev, se] = await Promise.all([
      supabase.from('intake_capacity').select('*'),
      supabase.from('events')
        .select('id, event_date, city, status, intake_status, event_type, customer_id')
        .gte('event_date', from).lte('event_date', to)
        .neq('status', 'CANCELLED'),
      supabase.from('service_enquiries')
        .select('id, event_date, location, status, intake_status, event_name')
        .gte('event_date', from).lte('event_date', to)
        .neq('status', 'closed'),
    ])

    if (cap.error) {
      setError(
        cap.error.code === '42P01'
          ? 'Migration 035 has not been applied yet. Run supabase/migrations/035_date_demand.sql in the SQL editor.'
          : cap.error.message,
      )
      setLoading(false)
      return
    }
    const firstErr = ev.error ?? se.error
    if (firstErr) { setError(firstErr.message); setLoading(false); return }

    setCaps(cap.data ?? [])
    setEvents(ev.data ?? [])
    setEnq(se.data ?? [])
    setDrafts({})
    setLoading(false)
  }

  /** City row wins · NULL-city row is the fallback · 12 is the floor. */
  function capFor(cityName) {
    const own = caps.find(c => c.city === cityName)
    if (own) return own.max_per_date
    const fallback = caps.find(c => c.city === null)
    return fallback ? fallback.max_per_date : DEFAULT_CAP
  }

  const cap = capFor(city)

  /**
   * Both request tables, normalised to one shape and split by intake_status.
   * service_enquiries keeps its city inside a jsonb blob and defaults to
   * Bengaluru when unset — mirroring the COALESCE date_demand() uses, so the
   * two never disagree about which city a row belongs to.
   */
  const rows = useMemo(() => {
    const out = []
    for (const e of events) {
      if (!e.event_date) continue
      out.push({
        id: e.id, table: 'events', iso: e.event_date,
        city: e.city ?? 'Bengaluru',
        intake: e.intake_status ?? 'ACCEPTED',
        label: e.event_type ?? 'Celebration',
        who: null,
      })
    }
    for (const s of enquiries) {
      if (!s.event_date) continue
      out.push({
        id: s.id, table: 'service_enquiries', iso: s.event_date,
        city: s.location?.city ?? 'Bengaluru',
        intake: s.intake_status ?? 'ACCEPTED',
        label: s.event_name ?? 'Enquiry',
        who: null,
      })
    }
    return out
  }, [events, enquiries])

  /** iso → { accepted, waitlist, rows } for the selected city only. */
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      if (r.city !== city) continue
      const cur = map.get(r.iso) ?? { accepted: 0, waitlist: 0, rows: [] }
      if (r.intake === 'WAITLIST') cur.waitlist++
      else cur.accepted++
      cur.rows.push(r)
      map.set(r.iso, cur)
    }
    return map
  }, [rows, city])

  function dayLoad(iso) {
    return byDate.get(iso) ?? { accepted: 0, waitlist: 0, rows: [] }
  }

  const sel = dayLoad(selected)

  const stats = useMemo(() => {
    let full = 0, over = 0, waiting = 0
    for (const [, v] of byDate) {
      if (v.accepted >= cap) full++
      if (v.accepted > cap) over++
      waiting += v.waitlist
    }
    return { full, over, waiting }
  }, [byDate, cap])

  async function saveCap(cityName) {
    const key = cityName ?? '__all__'
    const next = Number(drafts[key])
    if (!Number.isFinite(next) || next < 1) return
    setBusy(key)
    setError(null)

    const existing = caps.find(c => c.city === (cityName ?? null))
    const { error: err } = existing
      ? await supabase.from('intake_capacity').update({ max_per_date: next }).eq('id', existing.id)
      : await supabase.from('intake_capacity').insert({ city: cityName ?? null, max_per_date: next })

    setBusy(null)
    if (err) { setError(err.message); return }
    load()
  }

  /** The whole waitlist mechanism: one column, flipped both ways. */
  async function setIntake(row, intake) {
    setBusy(row.id)
    setError(null)
    const { error: err } = await supabase.from(row.table).update({ intake_status: intake }).eq('id', row.id)
    setBusy(null)
    if (err) { setError(err.message); return }
    const patch = list => list.map(r => (r.id === row.id ? { ...r, intake_status: intake } : r))
    if (row.table === 'events') setEvents(patch)
    else setEnq(patch)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-plum-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🧮 Intake capacity</h2>
        <p className="text-sm text-gray-500">
          How many celebrations are already booked on a date against what the vendor
          bench can take, and who is queued behind it.
        </p>
      </div>

      {/* The one thing somebody will assume wrongly, said before they assume it. */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-800">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
        <span>
          Internal only. Nothing here changes what a customer sees — the public calendar
          still shows every date as bookable, by design. This decides who a coordinator
          chases, not who the site accepts.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />{error}
          <button onClick={load} className="ml-auto shrink-0 font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* ── The ceilings ────────────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bookings per date</h3>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold text-plum-600 hover:underline">
            <RotateCcw size={12} /> Refresh
          </button>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Raise these as the approved vendor bench grows. It is a setting precisely so
          revisiting it never needs a migration.
        </p>

        <div className="mt-3 space-y-2">
          {[...LIVE_CITIES.map(c => c.name), null].map(cityName => {
            const key = cityName ?? '__all__'
            const row = caps.find(c => c.city === (cityName ?? null))
            const current = row ? row.max_per_date : (cityName ? capFor(cityName) : DEFAULT_CAP)
            const draft = drafts[key] ?? String(current)
            const dirty = Number(draft) !== current
            return (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-800">
                    {cityName ?? 'Every other city'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {row ? `set · updated ${row.updated_at?.slice(0, 10)}` : 'not set — using the fallback'}
                  </span>
                </span>
                <input
                  type="number" min={1} max={200}
                  value={draft}
                  onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                  className="input w-24"
                  aria-label={`Max per date for ${cityName ?? 'every other city'}`}
                />
                <button
                  onClick={() => saveCap(cityName)}
                  disabled={!dirty || busy === key}
                  className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-30"
                >
                  {busy === key ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── The calendar ────────────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {LIVE_CITIES.map(c => (
              <button
                key={c.name}
                onClick={() => setCity(c.name)}
                aria-pressed={city === c.name}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  city === c.name ? 'bg-plum-600 text-ink' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            ceiling <span className="font-bold text-gray-800">{cap}</span> / date
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3">
          {[
            { label: 'Dates at the ceiling', value: stats.full,    tone: 'bg-orange-50 text-orange-700' },
            { label: 'Dates over it',        value: stats.over,    tone: 'bg-red-50 text-red-700' },
            { label: 'On the waitlist',      value: stats.waiting, tone: 'bg-gray-100 text-gray-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 ${s.tone}`}>
              <p className="text-xl font-extrabold">{s.value}</p>
              <p className="text-[11px] leading-tight opacity-75">{s.label}</p>
            </div>
          ))}
        </div>

        <MonthGrid
          cursor={cursor}
          onCursor={setCursor}
          minDate={today}
          renderDay={(date, { iso, isToday, isPast }) => {
            if (isPast) {
              return (
                <div className="flex h-full w-full items-center justify-center rounded-xl text-xs text-gray-300">
                  {date.getDate()}
                </div>
              )
            }
            const d = dayLoad(iso)
            const isSel = iso === selected
            const pct = cap > 0 ? Math.min(100, Math.round((d.accepted / cap) * 100)) : 0
            const tone =
              d.accepted > cap  ? 'border-red-400 bg-red-50 text-red-800'
              : d.accepted === cap ? 'border-orange-400 bg-orange-50 text-orange-800'
              : d.accepted > 0     ? 'border-teal-300 bg-teal-50 text-teal-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-plum-300'
            return (
              <button
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSel}
                title={`${date.toDateString()} · ${d.accepted}/${cap} booked, ${d.waitlist} waiting`}
                className={[
                  'relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border text-xs font-semibold transition-colors',
                  tone,
                  isSel ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                  isToday && !isSel ? 'ring-1 ring-plum-300' : '',
                ].join(' ')}
              >
                {date.getDate()}
                {d.accepted > 0 && (
                  <span className="text-[9px] font-extrabold leading-none">{d.accepted}/{cap}</span>
                )}
                {d.waitlist > 0 && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-plum-500" title={`${d.waitlist} waiting`} />
                )}
                {/* The fill is the fastest read on a grid this dense — you
                    see the shape of a busy month before any number. */}
                {d.accepted > 0 && (
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-current opacity-40" style={{ width: `${pct}%` }} />
                )}
              </button>
            )
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-orange-100 pt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-teal-300 bg-teal-50" /> Room left</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-orange-400 bg-orange-50" /> At the ceiling</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-red-400 bg-red-50" /> Over it</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-plum-500" /> Someone waiting</span>
        </div>
      </section>

      {/* ── The selected date ───────────────────────────────── */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <CalendarDays size={16} className="text-plum-600" />
              {humanDate(selected)} · {city}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{sel.accepted}</span> of {cap} booked ·{' '}
              <span className="font-semibold text-gray-700">{sel.waitlist}</span> waiting
            </p>
          </div>
          <span className={[
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
            sel.accepted > cap ? 'bg-red-100 text-red-800'
              : sel.accepted === cap ? 'bg-orange-100 text-orange-800'
              : 'bg-teal-100 text-teal-800',
          ].join(' ')}>
            {sel.accepted > cap ? 'over capacity'
              : sel.accepted === cap ? 'at capacity'
              : `${cap - sel.accepted} slot${cap - sel.accepted === 1 ? '' : 's'} left`}
          </span>
        </div>

        {sel.rows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nothing booked in {city} on this date.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {[...sel.rows]
              // Accepted first, then the queue in the order it formed.
              .sort((a, b) => (a.intake === b.intake ? 0 : a.intake === 'WAITLIST' ? 1 : -1))
              .map(r => {
                const waiting = r.intake === 'WAITLIST'
                return (
                  <div key={`${r.table}-${r.id}`} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      waiting ? 'bg-plum-100 text-plum-700' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {waiting ? 'waiting' : 'booked'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-gray-800">{r.label}</span>
                      {r.who && <span className="text-gray-500"> · {r.who}</span>}
                      <span className="text-gray-500"> · {r.table === 'events' ? 'event' : 'enquiry'}</span>
                    </span>
                    <button
                      onClick={() => setIntake(r, waiting ? 'ACCEPTED' : 'WAITLIST')}
                      disabled={busy === r.id}
                      className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                        waiting
                          ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-40`}
                    >
                      {busy === r.id ? <Loader2 size={11} className="animate-spin" />
                        : waiting ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {waiting ? 'Promote' : 'Waitlist'}
                    </button>
                  </div>
                )
              })}
          </div>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-gray-500">
          <Users size={12} className="mt-0.5 shrink-0" />
          Waitlisted rows stay ordinary leads — they keep their status and their
          coordinator, and they are excluded from the booked count so the queue never
          eats the slots it is queueing for.
        </p>
      </section>
    </div>
  )
}
