import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { AVAILABILITY_ORDER, AVAILABILITY_STATES, WEEKDAYS } from '../../config/vendor'

/**
 * "What is happening on this day?"
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SHEET AND NOT A TAP-CYCLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * The grid used to cycle open → busy → partly on repeated taps, with the
 * rule written in grey text under the calendar. Two things were wrong with
 * that and both are fatal for the person this app is actually for.
 *
 * A cycle is only discoverable to somebody who already knows it is a cycle.
 * Everyone else taps once, sees red, and concludes the app marked their day
 * busy by accident — so they tap again, get amber, and now have no idea what
 * state their Saturday is in. "How does a partner mark partly booked?" was
 * asked of the old screen and the honest answer was: by tapping a date twice
 * and hoping. Nobody does that.
 *
 * And "partly booked" is meaningless to dispatch without a number. Migration
 * 060 only skips a LIMITED day when `slots_booked >= slots_total`, so a
 * LIMITED row with a NULL `slots_total` is treated exactly like an open one.
 * A partner who marked a day "partly booked" and then got a full day's worth
 * of offers was told a lie by the interface. This asks for the number, right
 * where the state is chosen, because the state is not usable without it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ANSWERS, ONE SCOPE, ONE SAVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every state names the CONSEQUENCE, not just the state: "Busy — do not send
 * me jobs". The nouns alone ask somebody to translate three database words
 * into an outcome, and getting that backwards costs them a strike.
 *
 * Nothing here writes until Save. A picker that commits on selection cannot
 * also offer a scope ("every Sunday this month"), because the scope would
 * have to be chosen before the thing it applies to — which is the one order
 * a first-time user will never guess.
 */

/* Portalled to <body> deliberately. A `position: fixed` panel is trapped by
   any ancestor carrying a transform, and the dashboard's cards animate in —
   an identity transform is enough to reparent the containing block and land
   this sheet halfway down the page instead of over it. */
export default function DayStatusSheet({
  date, current, hasRow, currentSlots, currentNote, reason, isDayOff, maxPerDay = 1,
  onClose, onSave,
}) {
  /* Seeded from the EFFECTIVE state, not from the row. Opening a standing
     day off and finding "Open" pre-selected would tell a partner their
     Monday is available, and one careless Save would make it so. */
  const [status, setStatus] = useState(current ?? 'OPEN')
  /* Seeded from the row so reopening a day shows what is already on it —
     a picker that reopens on the default silently offers to undo the last
     edit, and one careless Save does. */
  const [slots,  setSlots]  = useState(
    Number.isFinite(Number(currentSlots)) && Number(currentSlots) > 0 ? Number(currentSlots) : 1,
  )
  const [scope, setScope] = useState('day')
  const [note,  setNote]  = useState(currentNote ?? '')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef(null)

  const weekday = WEEKDAYS[date.getDay()]
  const pretty  = date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  /* Escape closes, and the sheet owns the page scroll while open — the same
     contract CitySheet uses, so every sheet in the app behaves identically. */
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  /* The scopes, and why "every Tuesday" is offered but "every day" is not.
     A standing weekly closure belongs in weekly_days_off — it is one row on
     the vendor and it covers next year too. This one is for the month a
     partner is travelling, or the month a hall has them every Sunday. */
  const scopes = useMemo(() => ([
    { id: 'day',     label: 'Just this day' },
    { id: 'weekday', label: `Every ${weekday.abbr} left this month` },
    { id: 'rest',    label: 'This day → end of month' },
  ]), [weekday.abbr])

  const saveLabel = {
    day:     'Save this day',
    weekday: `Save every ${weekday.abbr}`,
    rest:    'Save to end of month',
  }[scope]

  async function save() {
    setSaving(true)
    try {
      await onSave({ status, scope, slots: status === 'LIMITED' ? slots : null, note: note.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-sheet-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="animate-pop-in flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-md sm:rounded-3xl"
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="type-overline text-plum-600">Set this day</p>
            <h2 id="day-sheet-title" className="mt-1 text-[17px] font-extrabold leading-tight text-gray-900">
              {pretty}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* A standing closure is stated, not silently applied. Somebody
              looking at a greyed-out Monday needs to know it is their own
              rule and not the app refusing them work. */}
          {isDayOff && reason === 'weekly' && (
            <p className="mb-3 rounded-xl bg-plum-50 px-3 py-2.5 text-[12.5px] leading-snug text-plum-900">
              <span className="font-bold">{weekday.label} is your standing day off.</span>{' '}
              Choosing “Open” here works this one {weekday.abbr} without changing the rule.
            </p>
          )}

          {/* ── The three answers ─────────────────────────── */}
          <div className="space-y-2">
            {AVAILABILITY_ORDER.map(id => {
              const m  = AVAILABILITY_STATES[id]
              const on = status === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  aria-pressed={on}
                  aria-label={m.verb}
                  className={[
                    'flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-colors',
                    on ? m.chip : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <span className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                    on ? m.chipIcon : 'bg-gray-100 text-transparent',
                  ].join(' ')}>
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-extrabold leading-tight">
                      {m.verb}
                    </span>
                    <span className={`mt-0.5 block text-[12px] leading-snug ${on ? 'opacity-80' : 'text-gray-500'}`}>
                      {m.consequence}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── The number that makes "partly" mean anything ── */}
          {status === 'LIMITED' && (
            <div className="mt-3 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
              <p className="text-[13px] font-bold text-amber-900">
                How many more jobs can you take that day?
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-amber-800/85">
                We will stop offering you work on this day once you have that many.
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <Stepper
                  value={slots}
                  min={1}
                  max={Math.max(maxPerDay, 10)}
                  onChange={setSlots}
                />
                <span className="text-[12.5px] font-semibold text-amber-900">
                  {slots === 1 ? '1 more job' : `${slots} more jobs`}
                </span>
              </div>
            </div>
          )}

          {/* ── Scope ─────────────────────────────────────── */}
          <div className="mt-4">
            <p className="type-overline mb-1.5 text-gray-500">Apply to</p>
            <div className="flex flex-wrap gap-1.5">
              {scopes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  aria-pressed={scope === s.id}
                  className={[
                    'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors',
                    scope === s.id
                      ? 'border-plum-600 bg-plum-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Note ──────────────────────────────────────── */}
          {/* For the partner, not for us. "Ramesh wedding, Jayanagar" three
              months out is the difference between a calendar they trust and
              one they re-check by phone. */}
          <div className="mt-4">
            <label htmlFor="day-note" className="type-overline mb-1.5 block text-gray-500">
              Note for yourself (optional)
            </label>
            <input
              id="day-note"
              className="input"
              placeholder="e.g. Ramesh wedding, Jayanagar"
              value={note}
              maxLength={120}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* ── Save ───────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 border-t border-gray-100 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Only offered when there is something to undo. A "Reset" on a day
              that has never been touched is a button that does nothing. */}
          {hasRow && (
            <button
              type="button"
              disabled={saving}
              onClick={() => { setStatus('OPEN'); setNote(''); setScope('day') }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-plum ml-auto flex-1 sm:flex-none sm:min-w-[10rem]"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {/* The button says which days it is about to write. A fixed
                "Save this day" beside a scope chip reading "every Sat left
                this month" is two answers to the same question, and the
                one in the primary button is the one people believe. */}
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ══════════════════════════════════════════════════════════ */

/**
 * A number with two big targets instead of a keyboard.
 *
 * Deliberately not a text input. This is one of two or three digits on a
 * phone held in one hand, and a numeric keypad covering the sheet to type
 * "2" is the kind of friction that ends with the day left unmarked.
 */
function Stepper({ value, min, max, onChange }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-amber-300 bg-white">
      <button
        type="button"
        aria-label="One fewer"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-2 text-amber-800 disabled:opacity-30"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[2.5rem] text-center text-[15px] font-extrabold text-amber-900">
        {value}
      </span>
      <button
        type="button"
        aria-label="One more"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-3 py-2 text-amber-800 disabled:opacity-30"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
