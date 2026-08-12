import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Calendar, Clock, Check, Sparkles, ArrowRight } from 'lucide-react'
import MonthGrid from '../common/MonthGrid'
import { useDateDemand } from '../../hooks/useDateDemand'
import {
  DEMAND_TONES, TIME_SLOTS, demandForDate, nearbyCalmDates,
  leadTimePressure, parseISO,
} from '../../lib/demand'
import { toISODate, humanDate } from '../../utils/format'

/**
 * Pick the day, and the part of the day, and see what that date is actually
 * like.
 *
 * The date is the single most valuable thing an enquiry can carry — without it
 * a coordinator cannot check a vendor, quote a price, or hold anything — so
 * this asks for it properly instead of leaving a bare `<input type="date">` to
 * be skipped. The demand tones are the reason a customer bothers: a date that
 * says "Saturday in wedding season, decorators book out earliest now" is a
 * reason to enquire today rather than in March.
 *
 * Nothing here is invented. Numbers appear only when they count real rows;
 * everything else is a statement about the calendar itself, which is true
 * whether or not anyone has booked yet. See lib/demand.js.
 */

const LEGEND = [DEMAND_TONES.OPEN, DEMAND_TONES.BOOKING_UP, DEMAND_TONES.IN_DEMAND, DEMAND_TONES.PEAK]

export default function EventDateSheet({
  open,
  onClose,
  city,
  value,                 // { event_date, time_slot, flexible_date, date_window_days, intake_status }
  onConfirm,
  maxLeadDays = null,
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayISO = toISODate(today)

  const [selected, setSelected] = useState(value?.event_date || '')
  const [slot, setSlot] = useState(value?.time_slot || '')
  const [flexible, setFlexible] = useState(value?.flexible_date ?? false)
  const [windowDays, setWindowDays] = useState(value?.date_window_days ?? 3)
  const [waitlist, setWaitlist] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const anchor = parseISO(value?.event_date) ?? today
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  })

  const panelRef = useRef(null)
  const { demandByDate, peaks } = useDateDemand(city)

  const ctx = useMemo(
    () => ({ today: todayISO, city, demandByDate, peaks, maxLeadDays }),
    [todayISO, city, demandByDate, peaks, maxLeadDays],
  )

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
    setWaitlist(false)
    panelRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const info = selected ? demandForDate(selected, ctx) : null
  const full = info?.tone.key === 'AT_CAPACITY'
  const alternatives = useMemo(
    () => (full || info?.tone.key === 'LAST_FEW' || info?.tone.key === 'PEAK'
      ? nearbyCalmDates(selected, ctx, 3)
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, full, info?.tone.key, ctx],
  )
  const lead = selected ? leadTimePressure(selected, maxLeadDays, todayISO) : null

  // A full date is still selectable — it just needs the customer to say they
  // want the waitlist, so nobody submits one by accident and nobody is
  // dead-ended either.
  const canConfirm = !!selected && !!slot && (!full || waitlist)

  if (!open) return null

  function confirm() {
    onConfirm({
      event_date: selected,
      time_slot: slot,
      flexible_date: flexible,
      date_window_days: flexible ? windowDays : null,
      intake_status: full && waitlist ? 'WAITLIST' : 'ACCEPTED',
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
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3 pb-4 border-b border-orange-100">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-plum-600" />
                When is the celebration?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Your date is what lets us hold vendors for you.
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

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <MonthGrid
            cursor={cursor}
            onCursor={setCursor}
            minDate={today}
            renderDay={(date, { iso, isToday, isPast }) => {
              // The past is history, not a choice.
              if (isPast) {
                return (
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-xs text-gray-300">
                    {date.getDate()}
                  </div>
                )
              }
              const day = demandForDate(iso, ctx)
              const isSelected = iso === selected
              const title = `${date.toDateString()} · ${day.tone.label}${day.showCount ? ` · ${day.headline}` : ''}`
              return (
                <button
                  type="button"
                  onClick={() => { setSelected(iso); setWaitlist(false) }}
                  title={title}
                  aria-label={title}
                  aria-pressed={isSelected}
                  className={[
                    'w-full h-full rounded-xl border text-xs font-semibold relative transition-colors',
                    'flex flex-col items-center justify-center gap-0.5',
                    day.tone.cell,
                    isSelected ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                    isToday && !isSelected ? 'ring-1 ring-plum-300' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  <span className={`w-1 h-1 rounded-full ${day.tone.dot}`} />
                </button>
              )
            }}
          />

          {/* Legend. Four tones, all of them a yes — there is no "unavailable"
              swatch here because a merely-busy date is never refused. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-orange-100">
            {LEGEND.map(t => (
              <span key={t.key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                {t.label}
              </span>
            ))}
          </div>

          {/* ── The selected date ───────────────────────────── */}
          {info && (
            <div className={`mt-4 rounded-2xl border p-4 ${info.tone.chip}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm">{humanDate(selected)}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                  {info.showCount ? info.headline : info.tone.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{info.subtext}</p>

              {/* Real arithmetic on a real vendor lead time — urgency that is
                  also useful, which is the only kind worth showing. */}
              {lead?.bookByISO && !full && (
                <p className="text-xs mt-2 font-semibold flex items-center gap-1.5">
                  <Clock size={12} />
                  {lead.tight
                    ? `That's ${lead.days} days away — tight, but tell us today and we'll try.`
                    : `Best to have this locked by ${humanDate(lead.bookByISO)}.`}
                </p>
              )}

              {alternatives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current/15">
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-2 opacity-70">
                    {full ? 'These dates are wide open' : 'Quieter dates near it'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {alternatives.map(alt => (
                      <button
                        key={alt.iso}
                        type="button"
                        onClick={() => { setSelected(alt.iso); setWaitlist(false) }}
                        className="px-2.5 py-1 rounded-full bg-white/80 border border-current/20 text-xs font-semibold hover:bg-white transition-colors"
                      >
                        {humanDate(alt.iso)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* A real ceiling, honestly stated. We would rather say this than
                  take the booking and under-serve everyone on the date. */}
              {full && (
                <div className="mt-3 pt-3 border-t border-current/15">
                  <p className="text-xs leading-relaxed mb-2">
                    We'd rather tell you now than stretch our vendors thin and let you
                    down on your own day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWaitlist(v => !v)}
                    className={[
                      'w-full px-3 py-2 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2',
                      waitlist
                        ? 'bg-plum-600 text-white border-plum-600'
                        : 'bg-white/80 border-current/20 hover:bg-white',
                    ].join(' ')}
                  >
                    {waitlist && <Check size={13} />}
                    Keep me on the list for {humanDate(selected)}
                  </button>
                  {waitlist && (
                    // No automated sender exists in this app, so this promises
                    // a phone call — which a coordinator genuinely makes from
                    // the admin waitlist — and not a notification that would
                    // never arrive.
                    <p className="text-[11px] mt-2 opacity-80">
                      We'll call you if a spot opens up on this date.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Time of day ─────────────────────────────────── */}
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

          {/* ── Flexibility ─────────────────────────────────── */}
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

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 border-t border-orange-100 bg-white sm:rounded-b-3xl">
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="w-full btn-cta justify-center flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!selected ? 'Pick a date'
              : !slot ? 'Pick a time of day'
              : full && !waitlist ? 'Pick another date, or join the list'
              : (
                <>
                  <Sparkles size={16} />
                  {full ? 'Join the list' : 'Use this date'}
                  <ArrowRight size={16} />
                </>
              )}
          </button>
        </div>
      </div>
    </div>
  )
}
