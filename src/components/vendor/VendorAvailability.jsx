import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, PauseCircle, PlayCircle } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import {
  AVAILABILITY_STATES, WEEKDAYS, nextAvailabilityState, toDateKey,
} from '../../config/vendor'

/**
 * When the vendor can actually serve the list.
 *
 * The model is exception-based: everyone is available unless they say
 * otherwise. Three controls, in the order a vendor thinks about them:
 *
 *   1. accepting_bookings — the master switch, for closing the books entirely.
 *   2. weekly_days_off    — the standing closure. One tap covers every Monday
 *                           for the rest of time, instead of 52 rows a year.
 *   3. the calendar        — the specific Saturday that just got booked.
 *
 * Any of the three can make a date unavailable, so a cell has to show which
 * one did it. A vendor staring at a greyed-out Sunday with no explanation
 * assumes the app is broken; the legend and the per-cell reason are not
 * decoration.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

export default function VendorAvailability({ vendor, availability, onSetDay, onSetRange, onUpdateVendor }) {
  const toast = useToast()
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor,  setCursor]  = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [pending, setPending] = useState(null)   // dateKey mid-write
  const [savingRules, setSavingRules] = useState(false)

  const daysOff  = vendor?.weekly_days_off ?? []
  const paused   = vendor?.accepting_bookings === false
  const todayKey = toDateKey(today)

  /**
   * The month grid, padded to whole weeks starting Sunday.
   *
   * Leading and trailing blanks are rendered rather than skipped: a grid that
   * starts the 1st under the wrong weekday column is a calendar a vendor will
   * misread, and they will block the wrong day because of it.
   */
  const cells = useMemo(() => {
    const year  = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const total = new Date(year, month + 1, 0).getDate()
    const out   = Array.from({ length: first.getDay() }, () => null)
    for (let d = 1; d <= total; d++) out.push(new Date(year, month, d))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  /**
   * One date's effective state, and why.
   *
   * Precedence is deliberate: an explicit row always wins over the weekly
   * rule. That is what makes "I do work this one Sunday" expressible — see the
   * matching rule in useVendorAccount.setDayStatus, which keeps an OPEN row
   * only when it contradicts a day off.
   */
  function resolve(date) {
    const key = toDateKey(date)
    const row = availability[key]
    if (row) return { key, row, state: row.status, reason: 'date' }
    if (daysOff.includes(date.getDay())) {
      return { key, row: null, state: 'BLOCKED', reason: 'weekly' }
    }
    return { key, row: null, state: 'OPEN', reason: null }
  }

  async function cycle(date) {
    const { key, state } = resolve(date)
    setPending(key)
    try {
      await onSetDay(key, nextAvailabilityState(state))
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setPending(null)
    }
  }

  async function saveRules(patch, successMessage) {
    setSavingRules(true)
    try {
      await onUpdateVendor(patch)
      if (successMessage) toast.success(successMessage)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSavingRules(false)
    }
  }

  function toggleDayOff(dayId) {
    const next = daysOff.includes(dayId)
      ? daysOff.filter(d => d !== dayId)
      : [...daysOff, dayId].sort((a, b) => a - b)
    saveRules({ weekly_days_off: next })
  }

  /** Block or free every remaining day of the month on screen. */
  async function bulk(state) {
    const keys = cells
      .filter(d => d && toDateKey(d) >= todayKey)
      .map(d => toDateKey(d))
    if (keys.length === 0) return
    try {
      await onSetRange(keys, state)
      toast.success(state === 'OPEN'
        ? `Cleared ${MONTHS[cursor.getMonth()]}.`
        : `Marked the rest of ${MONTHS[cursor.getMonth()]} busy.`)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  // Only past months are off-limits; a vendor legitimately takes bookings a
  // year out, so forward paging is unbounded.
  const atFloor = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-display font-bold text-gray-900">When you can work</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          You are treated as available unless you say otherwise. Tap a date to
          mark it busy.
        </p>
      </header>

      {/* ── Master switch ────────────────────────────────── */}
      <div className={`card p-4 flex items-center gap-3 ${paused ? 'border-amber-300 bg-amber-50/60' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          paused ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
        }`}>
          {paused ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">
            {paused ? 'Not taking bookings' : 'Taking bookings'}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {paused
              ? 'Coordinators will not offer you to customers. Your list and calendar are untouched.'
              : 'Use this if you are away or fully booked for a while — it beats blocking dates one by one.'}
          </p>
        </div>
        <button
          onClick={() => saveRules(
            { accepting_bookings: paused },
            paused ? 'You are taking bookings again.' : 'Bookings paused.',
          )}
          disabled={savingRules}
          className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60 ${
            paused
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700'
          }`}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* ── Standing rules ───────────────────────────────── */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div>
          <div className="label mb-2">Days you are normally closed</div>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(d => {
              const off = daysOff.includes(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDayOff(d.id)}
                  disabled={savingRules}
                  aria-pressed={off}
                  title={off ? `${d.label} — closed` : `${d.label} — open`}
                  className={`w-10 h-10 rounded-xl text-xs font-bold border transition-colors disabled:opacity-60 ${
                    off
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-plum-300'
                  }`}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {daysOff.length === 0
              ? 'Open every day. Tap any day you never take work.'
              : `Closed ${daysOff.map(id => WEEKDAYS[id].label).join(', ')}. You can still open a single date below.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-orange-100">
          <NumberRule
            key={`lead-${vendor?.lead_time_days ?? 2}`}
            id="lead-time"
            label="Shortest notice"
            suffix="days"
            value={vendor?.lead_time_days ?? 2}
            min={0} max={365}
            hint="How late a customer can still book you."
            disabled={savingRules}
            onCommit={v => saveRules({ lead_time_days: v })}
          />
          <NumberRule
            key={`perday-${vendor?.max_events_per_day ?? 1}`}
            id="per-day"
            label="Events per day"
            suffix="max"
            value={vendor?.max_events_per_day ?? 1}
            min={1} max={50}
            hint="Above one, a date can be partly booked."
            disabled={savingRules}
            onCommit={v => saveRules({ max_events_per_day: v })}
          />
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────────── */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            disabled={atFloor}
            aria-label="Previous month"
            className="p-2 rounded-lg text-gray-500 hover:text-plum-600 hover:bg-plum-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="font-display font-bold text-gray-900">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            aria-label="Next month"
            className="p-2 rounded-lg text-gray-500 hover:text-plum-600 hover:bg-plum-50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAYS.map(d => (
            <div key={d.id} className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wide py-1">
              {d.short}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} className="aspect-square" />

            const { key, state, reason, row } = resolve(date)
            const isPast    = key < todayKey
            const isToday   = key === todayKey
            const busy      = pending === key
            const meta      = AVAILABILITY_STATES[state]

            // The past is history, not a setting. Blocking a date that has
            // already happened does nothing, and offering the control implies
            // it does.
            if (isPast) {
              return (
                <div key={key} className="aspect-square rounded-xl border border-transparent flex items-center justify-center text-xs text-gray-300">
                  {date.getDate()}
                </div>
              )
            }

            const title = [
              date.toDateString(),
              meta.label,
              reason === 'weekly' ? '(your standing day off)' : null,
              row?.note ?? null,
            ].filter(Boolean).join(' · ')

            return (
              <button
                key={key}
                onClick={() => cycle(date)}
                disabled={busy}
                title={title}
                aria-label={title}
                className={[
                  'aspect-square rounded-xl border text-xs font-semibold relative transition-colors',
                  'flex items-center justify-center',
                  meta.cell,
                  // A weekly closure is shown dimmer than a date the vendor
                  // blocked by hand — same outcome, different thing to change.
                  reason === 'weekly' ? 'opacity-70 border-dashed' : '',
                  isToday ? 'ring-2 ring-plum-400 ring-offset-1' : '',
                  busy ? 'opacity-50' : '',
                ].join(' ')}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : date.getDate()}
                {state === 'LIMITED' && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend, and the bulk actions that only make sense next to it. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-orange-100">
          {Object.entries(AVAILABILITY_STATES).map(([id, m]) => (
            <span key={id} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />{m.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-gray-400" />
            Standing day off
          </span>
          <span className="ml-auto flex gap-2">
            <button onClick={() => bulk('BLOCKED')} className="text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors">
              Block rest of month
            </button>
            <button onClick={() => bulk('OPEN')} className="text-xs font-semibold text-gray-500 hover:text-emerald-600 transition-colors">
              Clear month
            </button>
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Tapping cycles a date: open → busy → partly booked. Anything you leave
        alone stays open.
      </p>
    </div>
  )
}

/**
 * A number that saves itself.
 *
 * Committed on blur and on Enter rather than on every keystroke — one write per
 * decision instead of one per digit, and it survives a vendor clearing the
 * field to retype it (an empty box would otherwise write NaN and trip the
 * CHECK constraint from migration 021).
 */
function NumberRule({ id, label, suffix, value, min, max, hint, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const n = Number(draft)
    if (!Number.isFinite(n) || draft === '') { setDraft(String(value)); return }
    const clamped = Math.min(max, Math.max(min, Math.round(n)))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="input pr-12"
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
          {suffix}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  )
}
