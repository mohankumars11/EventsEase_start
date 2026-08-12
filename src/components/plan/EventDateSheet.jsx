import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Calendar, Clock, Sparkles, ArrowRight, Users } from 'lucide-react'
import MonthGrid from '../common/MonthGrid'
import { useDateInterest } from '../../hooks/useDateDemand'
import { TIME_SLOTS, interestForDate, parseISO } from '../../lib/demand'
import { toISODate, humanDate } from '../../utils/format'

/**
 * Pick the day, and the part of the day.
 *
 * The date is the single most valuable thing an enquiry can carry — without
 * it a coordinator cannot check a vendor, quote a price, or hold anything —
 * so this asks for it properly instead of leaving a bare `<input type="date">`
 * to be skipped.
 *
 * ── Every date is available ──────────────────────────────────────────
 *
 * Nothing is blocked, greyed or refused. The only mark a date can carry is
 * how many families have already asked about it, and only once that is a
 * real number worth showing. A calendar where most days are flagged is one
 * customers stop reading, so most days here are deliberately plain.
 */

export default function EventDateSheet({
  open,
  onClose,
  city,
  value,                 // { event_date, time_slot, flexible_date, date_window_days }
  onConfirm,
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const [selected, setSelected] = useState(value?.event_date || '')
  const [slot, setSlot] = useState(value?.time_slot || '')
  const [flexible, setFlexible] = useState(value?.flexible_date ?? false)
  const [windowDays, setWindowDays] = useState(value?.date_window_days ?? 3)
  const [cursor, setCursor] = useState(() => {
    const anchor = parseISO(value?.event_date) ?? today
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  })

  const panelRef = useRef(null)
  const { interestByDate } = useDateInterest(city)
  const ctx = useMemo(() => ({ interestByDate, city }), [interestByDate, city])

  // Escape closes, and the sheet owns the page's scroll while open — the same
  // contract CitySheet and ProductCustomizeSheet use.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  // Re-sync from the caller each opening, so reopening shows what was saved
  // rather than whatever was half-picked and abandoned last time.
  useEffect(() => {
    if (!open) return
    setSelected(value?.event_date || '')
    setSlot(value?.time_slot || '')
    setFlexible(value?.flexible_date ?? false)
    setWindowDays(value?.date_window_days ?? 3)
    panelRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const info = selected ? interestForDate(selected, ctx) : null
  const canConfirm = !!selected && !!slot

  if (!open) return null

  function confirm() {
    onConfirm({
      event_date: selected,
      time_slot: slot,
      flexible_date: flexible,
      date_window_days: flexible ? windowDays : null,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose your event date and time"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-pop-in outline-none"
      >
        <div className="shrink-0 px-5 pt-3 pb-4 border-b border-orange-100">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-plum-600" />
                When is the celebration?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Every date is open — your date is what lets us hold vendors for you.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <MonthGrid
            cursor={cursor}
            onCursor={setCursor}
            minDate={today}
            renderDay={(date, { iso, isToday, isPast }) => {
              // The past is history, not a choice. Every future date is live.
              if (isPast) {
                return (
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-xs text-gray-300">
                    {date.getDate()}
                  </div>
                )
              }
              const day = interestForDate(iso, ctx)
              const isSelected = iso === selected
              const title = day.showCount
                ? `${date.toDateString()} · ${day.headline}`
                : date.toDateString()
              return (
                <button
                  type="button"
                  onClick={() => setSelected(iso)}
                  title={title}
                  aria-label={title}
                  aria-pressed={isSelected}
                  className={[
                    'w-full h-full rounded-xl border text-xs font-semibold relative transition-colors',
                    'flex flex-col items-center justify-center gap-0.5',
                    day.level.cell,
                    isSelected ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                    isToday && !isSelected ? 'ring-1 ring-plum-300' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  {/* Only marked dates carry a dot. Most days show nothing,
                      which is what keeps the mark meaning something. */}
                  {day.showCount
                    ? <span className={`w-1 h-1 rounded-full ${day.level.dot}`} />
                    : <span className="w-1 h-1" />}
                </button>
              )
            }}
          />

          {/* One line, and only when there is something on the calendar to
              explain. No legend of states that mostly don't exist. */}
          <p className="mt-3 pt-3 border-t border-orange-100 text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Dates other families are already asking about
          </p>

          {info?.showCount && (
            <div className={`mt-4 rounded-2xl border p-4 ${info.level.chip}`}>
              <p className="text-sm font-bold mb-0.5 flex items-center gap-1.5">
                <Users size={14} />{info.headline} for {humanDate(selected)}
              </p>
              <p className="text-xs leading-relaxed opacity-90">{info.subtext}</p>
            </div>
          )}

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <Clock size={13} />
              What time of day? <span className="text-crimson-600">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSlot(s.key)}
                  aria-pressed={slot === s.key}
                  className={[
                    'px-3 py-2.5 rounded-xl border text-left transition-colors',
                    slot === s.key
                      ? 'bg-plum-600 text-white border-plum-600'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-plum-300',
                  ].join(' ')}
                >
                  <span className="block text-sm font-bold">{s.emoji} {s.label}</span>
                  <span className={`block text-[11px] ${slot === s.key ? 'text-white/75' : 'text-gray-400'}`}>
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Still requires a target date. Someone genuinely undecided would
              otherwise abandon the form entirely, and a date with a window on
              it is far more useful to a coordinator than no date at all. */}
          <label className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-cream border border-orange-100 cursor-pointer">
            <input
              type="checkbox"
              checked={flexible}
              onChange={e => setFlexible(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-plum-600"
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-gray-800">
                I'm flexible around this date
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                We'll look either side of it — often that's how we get you a better vendor.
              </span>
              {flexible && (
                <span className="flex gap-1.5 mt-2">
                  {[3, 7].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={e => { e.preventDefault(); setWindowDays(w) }}
                      className={[
                        'px-2.5 py-1 rounded-full text-xs font-bold border transition-colors',
                        windowDays === w
                          ? 'bg-plum-600 text-white border-plum-600'
                          : 'bg-white border-gray-200 text-gray-600',
                      ].join(' ')}
                    >
                      ± {w} days
                    </button>
                  ))}
                </span>
              )}
            </span>
          </label>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-orange-100 bg-white sm:rounded-b-3xl">
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="w-full btn-cta justify-center flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!selected ? 'Pick a date'
              : !slot ? 'Pick a time of day'
              : (
                <>
                  <Sparkles size={16} />
                  Use this date
                  <ArrowRight size={16} />
                </>
              )}
          </button>
        </div>
      </div>
    </div>
  )
}
