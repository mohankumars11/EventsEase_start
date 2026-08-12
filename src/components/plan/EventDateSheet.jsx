import { useState, useEffect, useMemo, useRef } from 'react'
import { X, CalendarDays, Clock, ArrowRight, Users, Zap } from 'lucide-react'
import MonthGrid from '../common/MonthGrid'
import { useDateInterest } from '../../hooks/useDateDemand'
import { TIME_SLOTS, interestForDate, noticeForDate, parseISO } from '../../lib/demand'
import { humanDate } from '../../utils/format'

/**
 * Pick the day, and the part of the day.
 *
 * The date is the single most valuable thing an enquiry can carry — without
 * it a coordinator cannot check a Master, quote a price, or hold anything —
 * so this asks for it properly instead of leaving a bare `<input type="date">`
 * to be skipped.
 *
 * ── White, because a calendar is a document ──────────────────────────
 *
 * This was plum-950 for a while, on the argument that it should carry the
 * ground of the home screen it opens from. Two things were wrong with that.
 * MonthGrid is shared with the vendor availability editor and styles its own
 * chrome for a light surface — so the month name and the weekday letters were
 * `text-gray-900` and `text-gray-400` on near-black, effectively invisible,
 * and a calendar whose month you cannot read is not a calendar. And a dense
 * grid of 35 numbers is a document, not a hero: dark type on white is where
 * numerals are easiest to scan, which is the entire job here.
 *
 * White also gives the sheet its own edge. Opening off a dark screen it now
 * arrives as a distinct sheet of paper rather than a slightly different
 * shade of the same night.
 *
 * ── Two colours, two meanings ────────────────────────────────────────
 *
 * Plum is *your* choice — the day you selected, the slot you picked, the
 * button that continues. Teal is *other people's* interest — the dots and
 * washes on dates families are already asking about. Keeping them apart
 * means a busy date never looks selected and a selected date never looks
 * busy, which on a calendar is the whole ballgame.
 *
 * ── Every date is available ──────────────────────────────────────────
 *
 * Nothing is blocked, greyed or refused, and the copy never uses the word
 * "available" of a date — implying some days are available says the rest are
 * not, which is both untrue and the opposite of what this is selling. The
 * only mark a date carries is how many families have asked about it, and
 * only once that is a real number worth showing.
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
  const notice = selected ? noticeForDate(selected) : null
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose your event date and time"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-pop-in flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl shadow-black/50 outline-none ring-1 ring-black/5 sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="shrink-0 border-b border-gray-100 px-5 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-plum-950">
                <CalendarDays size={18} className="text-teal-600" />
                When is the celebration?
              </h2>
              {/* Positive framing on purpose: we take every date. */}
              <p className="mt-0.5 text-[12px] text-gray-500">
                We take bookings on any date — yours is what lets us hold the Masters.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
                  <div className="flex h-full w-full items-center justify-center rounded-xl text-xs text-gray-300">
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
                    'relative flex h-full w-full flex-col items-center justify-center gap-0.5',
                    'rounded-xl border text-xs font-semibold transition-colors',
                    // The chosen day is filled, not outlined. An outline on a
                    // grid that already uses colour for interest is one signal
                    // too many to tell apart at a glance.
                    isSelected
                      ? 'border-plum-600 bg-plum-600 text-white shadow-sm shadow-plum-600/30'
                      : day.level.cell,
                    isToday && !isSelected ? 'ring-1 ring-gray-300' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  {/* Only marked dates carry a dot. Most days show nothing,
                      which is what keeps the mark meaning something. */}
                  {day.showCount
                    ? <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : day.level.dot}`} />
                    : <span className="h-1 w-1" />}
                </button>
              )
            }}
          />

          <p className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
            <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
            Dates other families are already asking about
          </p>

          {notice && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <Zap size={14} />{notice.label} — that's {notice.when}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">{notice.line}</p>
            </div>
          )}

          {info?.showCount && (
            <div className={`mt-4 rounded-2xl border p-4 ${info.level.chip}`}>
              <p className="mb-0.5 flex items-center gap-1.5 text-sm font-bold">
                <Users size={14} />{info.headline} for {humanDate(selected)}
              </p>
              <p className="text-xs leading-relaxed opacity-85">{info.subtext}</p>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
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
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    slot === s.key
                      ? 'border-plum-600 bg-plum-600 text-white'
                      : 'border-gray-200 bg-white text-plum-900 hover:border-teal-500 hover:bg-teal-50',
                  ].join(' ')}
                >
                  <span className="block text-sm font-bold">{s.emoji} {s.label}</span>
                  <span className={`block text-[11px] ${slot === s.key ? 'text-white/75' : 'text-gray-500'}`}>
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Still requires a target date. Someone genuinely undecided would
              otherwise abandon the form entirely, and a date with a window on
              it is far more useful to a coordinator than no date at all. */}
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={flexible}
              onChange={e => setFlexible(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-plum-600"
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-plum-950">
                I'm flexible around this date
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                We'll look either side of it — often that's how we get you a better Master.
              </span>
              {flexible && (
                <span className="mt-2 flex gap-1.5">
                  {[3, 7].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={e => { e.preventDefault(); setWindowDays(w) }}
                      className={[
                        'rounded-full border px-2.5 py-1 text-xs font-bold transition-colors',
                        windowDays === w
                          ? 'border-plum-600 bg-plum-600 text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-plum-400',
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

        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:rounded-b-3xl">
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            // Greyed rather than faded: a translucent purple button on white
            // still reads as tappable, and this one is the gate that makes the
            // time of day compulsory.
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-600 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-plum-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            {!selected ? 'Pick a date'
              : !slot ? 'Pick a time of day'
              : (
                <>
                  Continue with {humanDate(selected)}
                  <ArrowRight size={15} />
                </>
              )}
          </button>
        </div>
      </div>
    </div>
  )
}
