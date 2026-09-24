import { useEffect, useMemo, useState } from 'react'
import { FIELD_RULES } from '../../lib/validation/fieldRules'
import {
  X, Loader2, Check, AlertTriangle, CalendarCheck, CalendarClock, CalendarX2, Eraser,
} from 'lucide-react'
import { istTodayISO } from '../../lib/istTime'
import { expandRange, assessChange, quickRanges, LEVEL } from '../../lib/calendarAlerts'

/**
 * "I am available from the 25th to the 31st." And the other three answers.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS REPLACED BlockDatesSheet
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old sheet wrote ranges, but only BLOCKED ones. A partner could say
 * "I am away from the 20th to the 25th" and could not say "I am
 * available from the 25th to the 31st" — the opposite statement, wanted
 * just as often, and the one that actually earns them work.
 *
 * Worse, the only way to open a stretch of days was to tap each one, and
 * a partner opening up their October was not going to tap thirty-one
 * times. So the calendar could be closed in bulk and only opened one day
 * at a time, which is a bias in the tool, not in the partner.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR ANSWERS, AND CLEAR IS NOT THE SAME AS AVAILABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Open, Limited, Blocked and Clear. The fourth is the one worth
 * explaining, because it looks redundant and is not:
 *
 *   Available  writes an OPEN row. A written row OUTRANKS the standing
 *              week, so this is how "closed Sundays, but open THIS
 *              Sunday" gets said.
 *   Clear      deletes the rows, so the standing week takes back over.
 *
 * useVendorAccount.js:308-320 documents the same distinction on the
 * write side. Collapsing them would make the weekly pattern
 * unrecoverable once a date had been touched.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS KEPT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything the old sheet got right, because it got a lot right:
 * inclusive of both ends, the day count printed ON the button before the
 * tap, the ninety-day cap that says out loud that it truncated, and the
 * clashing dates named individually rather than counted.
 *
 * What is new is that the warnings now come from lib/calendarAlerts.js
 * and are RATIONED — see that file's header. The two-press confirm is
 * armed by red and by nothing else.
 */
const REASONS = [
  ['travel', 'Travelling'],
  ['personal', 'Personal'],
  ['holiday', 'Holiday'],
  ['maintenance', 'Maintenance'],
  ['committed', 'Committed elsewhere'],
  ['other', 'Other'],
]

const MAX_DAYS = 90

/* The fourth entry has `status: null`, which every write path already
   reads as "delete these rows". */
const MODES = [
  {
    id: 'OPEN', status: 'OPEN', label: 'Available', icon: CalendarCheck,
    hint: 'Send me offers on these days',
    on: 'bg-forest-600 text-white ring-forest-600',
    cta: n => `Open ${n} ${n === 1 ? 'day' : 'days'}`,
    done: 'Opened', busy: 'Opening…', tone: 'bg-forest-600',
  },
  {
    id: 'LIMITED', status: 'LIMITED', label: 'Limited', icon: CalendarClock,
    hint: 'Cap how many jobs a day',
    on: 'bg-saffron-400 text-plum-950 ring-saffron-400',
    cta: n => `Cap ${n} ${n === 1 ? 'day' : 'days'}`,
    done: 'Saved', busy: 'Saving…', tone: 'bg-saffron-500',
  },
  {
    id: 'BLOCKED', status: 'BLOCKED', label: 'Blocked', icon: CalendarX2,
    hint: 'No offers on these days',
    on: 'bg-ink text-white ring-ink',
    cta: n => `Block ${n} ${n === 1 ? 'day' : 'days'}`,
    done: 'Blocked', busy: 'Blocking…', tone: 'bg-ink',
  },
  {
    id: 'CLEAR', status: null, icon: Eraser, label: 'Clear',
    hint: 'Back to my usual week',
    on: 'bg-plum-600 text-white ring-plum-600',
    cta: n => `Clear ${n} ${n === 1 ? 'day' : 'days'}`,
    done: 'Cleared', busy: 'Clearing…', tone: 'bg-plum-600',
  },
]

export default function AvailabilityRangeSheet({
  jobs = [],
  availability = {},
  weeklyRules = [],
  interestByDate = null,
  maxPerDay = 1,
  initialFrom = null,
  initialMode = 'BLOCKED',
  onSetRange,
  onClearDays,
  onClose,
}) {
  const today = istTodayISO()
  const start = initialFrom && initialFrom >= today ? initialFrom : today

  const [modeId, setModeId] = useState(initialMode)
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(start)
  const [slots, setSlots] = useState(2)
  /* Live, because this field has exactly one keystroke of
     meaning and `min`/`max` on a number input are decoration --
     a phone keypad types 0 and 50 and the browser accepts both. */
  const slotsSays = FIELD_RULES.daily_slots.validate(String(slots ?? '').trim())
  const [reason, setReason] = useState('travel')
  const [reasonDetail, setReasonDetail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const mode = MODES.find(m => m.id === modeId) ?? MODES[2]

  const { days, truncated } = useMemo(
    () => expandRange(from, to, MAX_DAYS), [from, to])

  /* Every alert in one call, so the rules live in one file and this
     component only decides where on the screen they go. */
  const alert = useMemo(() => assessChange({
    dates: days,
    status: mode.status,
    availability,
    jobs,
    interestByDate,
    weeklyRules,
    maxPerDay,
    todayISO: today,
  }), [days, mode.status, availability, jobs, interestByDate, weeklyRules, maxPerDay, today])

  /* Changing anything disarms the confirm. Somebody who edits the range
     after seeing the warning has not agreed to the new one. */
  useEffect(() => { setConfirm(false) }, [from, to, modeId])

  async function save() {
    if (!days.length || busy) return
    if (alert.needsConfirm && !confirm) { setConfirm(true); return }
    setBusy(true); setError(null)
    try {
      if (mode.status === null) {
        await onClearDays(days)
      } else {
        await onSetRange(days, mode.status, {
          slots_total: mode.status === 'LIMITED' ? Math.max(1, Number(slots) || 1) : null,
          note: note.trim() || null,
          reason: mode.status === 'BLOCKED' ? reason : null,
          reason_detail: mode.status === 'BLOCKED' && reason === 'other'
            ? (reasonDetail.trim() || null) : null,
          hours: null,
        })
      }
      setSaved(true)
      setTimeout(onClose, 700)
    } catch (err) {
      setError(err?.message ?? 'That did not save. Your previous availability is still active.')
    } finally {
      setBusy(false)
    }
  }

  const ranges = quickRanges(today)
  const activeRange = ranges.findIndex(([, a, b]) => a === from && b === to)

  return (
    <>
      <div onClick={onClose} aria-hidden="true"
           className="fixed inset-0 z-40 bg-ink/40 transition-opacity" />
      {/* No transform on this element or any ancestor of it — see the
          header of DayDetailSheet. */}
      <section
        role="dialog" aria-modal="true" aria-label="Set availability for a range of dates"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[26px] bg-white pb-[max(env(safe-area-inset-bottom),18px)] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-ml-[230px] sm:mt-[-46vh] sm:w-[460px] sm:rounded-[26px]"
      >
        <div className="sticky top-0 z-10 rounded-t-[26px] bg-white px-4 pb-2 pt-3">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-extrabold text-ink">Set a range of dates</p>
            <button type="button" onClick={onClose} aria-label="Close"
                    className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.05]">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4">
          {/* ── What these days should say ──────────────────────────── */}
          <Field label="These days are">
            <div className="grid grid-cols-4 gap-1.5">
              {MODES.map(m => {
                const Icon = m.icon
                const on = m.id === modeId
                return (
                  <button
                    key={m.id} type="button" onClick={() => setModeId(m.id)}
                    aria-pressed={on}
                    data-mode={m.id}
                    className={`flex flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 text-[11px] font-extrabold ring-1 transition ${
                      on ? m.on : 'bg-white text-ink-soft ring-ink/[0.10]'}`}
                  >
                    <Icon size={16} />
                    {m.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink-mute">{mode.hint}</p>
          </Field>

          {/* ── When ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <input type="date" min={today} value={from}
                     onChange={e => {
                       setFrom(e.target.value)
                       if (to < e.target.value) setTo(e.target.value)
                     }}
                     className={inputClass} />
            </Field>
            <Field label="To">
              <input type="date" min={from} value={to}
                     onChange={e => setTo(e.target.value)}
                     className={inputClass} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ranges.map(([label, a, b], i) => (
              <button key={label} type="button"
                      onClick={() => { setFrom(a); setTo(b) }}
                      aria-pressed={i === activeRange}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
                        i === activeRange
                          ? 'bg-ink text-white'
                          : 'bg-ink/[0.04] text-ink-soft ring-1 ring-ink/[0.08]'}`}>
                {label}
              </button>
            ))}
          </div>

          {to < from && (
            <p className="text-[12px] font-bold text-rose-700">
              The end date is before the start date.
            </p>
          )}
          {truncated && (
            <p className="rounded-[14px] bg-saffron-50 px-3.5 py-2.5 text-[11.5px] leading-snug text-saffron-900 ring-1 ring-saffron-200">
              That range is longer than {MAX_DAYS} days. Only the first {MAX_DAYS} will be
              set — do the rest in a second go.
            </p>
          )}

          {/* ── Only what this mode actually needs ──────────────────── */}
          {mode.status === 'LIMITED' && (
            <Field label="Jobs you will take each day">
              <input type="number" min={1} max={12} inputMode="numeric" value={slots}
                     onChange={e => setSlots(e.target.value)}
                     className={`w-24 ${inputClass}`} />
              {slotsSays?.says && slotsSays.severity !== 'ok' && (
                <p className={`mt-1 text-[11.5px] font-semibold leading-snug ${
                  slotsSays.severity === 'warn' ? 'text-saffron-800' : 'text-rose-700'
                }`}>{slotsSays.says}</p>
              )}
            </Field>
          )}

          {mode.status === 'BLOCKED' && (
            <Field label="Why (only you see this)">
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setReason(id)}
                          aria-pressed={reason === id}
                          className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                            reason === id ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {reason === 'other' && (
                <input value={reasonDetail} onChange={e => setReasonDetail(e.target.value)}
                       maxLength={60} placeholder="In your own words"
                       className={`mt-2 ${inputClass}`} />
              )}
            </Field>
          )}

          {mode.status !== null && (
            <Field label="Private note" hint={`${note.length}/200`}>
              <textarea rows={2} maxLength={200} value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Only you see this."
                        className={`resize-none ${inputClass}`} />
            </Field>
          )}

          <AlertPanel alert={alert} jobs={jobs} />

          {error && (
            <p className="rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <button
            type="button" onClick={save} disabled={busy || days.length === 0}
            data-confirm={confirm ? 'armed' : 'idle'}
            className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold text-white transition disabled:opacity-50 ${
              saved ? 'bg-forest-600' : confirm ? 'bg-rose-600' : mode.tone}`}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {saved && <Check size={15} />}
            {busy ? mode.busy
              : saved ? mode.done
              : confirm ? 'Yes, I am sure'
              : days.length === 0 ? 'Pick a range'
              : mode.cta(days.length)}
          </button>
        </div>
      </section>
    </>
  )
}

/**
 * The alerts, in severity order.
 *
 * Red gets a panel. Warnings get a panel. Info gets one line of grey
 * text and no icon, because an informational notice styled like a
 * warning is a warning. See calendarAlerts.js.
 */
function AlertPanel({ alert, jobs }) {
  if (!alert.signals.length) return null

  const red = alert.signals.filter(s => s.level === LEVEL.RED)
  const warn = alert.signals.filter(s => s.level === LEVEL.WARN)
  const info = alert.signals.filter(s => s.level === LEVEL.INFO)

  const jobsOn = iso => jobs
    .filter(j => j.event_date === iso && !['cancelled', 'expired'].includes(j.status))
    .map(j => j.occasion_name ?? j.service_name ?? 'Booking')
    .join(', ')

  const pretty = i => new Date(`${i}T00:00:00Z`)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="space-y-2" data-alert-level={alert.level}>
      {red.map(s => (
        <div key={s.id} data-signal={s.id}
             className="rounded-[16px] bg-rose-50 px-3.5 py-3 ring-1 ring-rose-300">
          <p className="flex items-start gap-2 text-[12px] font-bold leading-snug text-rose-900">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            <span>{s.says}</span>
          </p>
          {s.id === 'clash' && (
            <ul className="mt-2 space-y-0.5 pl-[23px]">
              {s.dates.map(d => (
                <li key={d} className="text-[11.5px] text-rose-900">
                  <span className="font-extrabold">{pretty(d)}</span>
                  {jobsOn(d) ? ` · ${jobsOn(d)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {warn.map(s => (
        <p key={s.id} data-signal={s.id}
           className="flex items-start gap-2 rounded-[16px] bg-saffron-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-saffron-900 ring-1 ring-saffron-200">
          <AlertTriangle size={15} className="mt-px shrink-0" />
          <span>{s.says}</span>
        </p>
      ))}

      {info.map(s => (
        <p key={s.id} data-signal={s.id}
           className="px-1 text-[11.5px] leading-snug text-ink-mute">
          {s.says}
        </p>
      ))}
    </div>
  )
}

const inputClass =
  'w-full rounded-[14px] border-0 bg-ink/[0.04] px-3.5 py-2.5 text-[13px] font-bold text-ink ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-plum-500'

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">{label}</p>
        {hint && <p className="text-[10.5px] text-ink-faint">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
