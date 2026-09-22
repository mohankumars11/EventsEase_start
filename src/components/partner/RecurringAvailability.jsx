import { useMemo, useState } from 'react'
import { X, Loader2, Check, Repeat } from 'lucide-react'
import { istTodayISO } from '../../lib/istTime'

/**
 * The week a partner works, as a standing rule.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE WEEK READS MONDAY-FIRST; THE VALUE IS getDay()
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the bug that made the feature necessary to rebuild rather than
 * extend. The onboarding step stored the INDEX of a Monday-first array,
 * so Monday went into the database as 0 while every reader treated 0 as
 * Sunday. A partner ticking Monday got Sunday closed, silently.
 *
 * The label and the stored number now travel together in one object, so
 * the two cannot be separated by an edit again.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OLD RULES ARE CLOSED, NEVER DELETED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Saving a new week writes rows with a new `effective_from` and closes
 * the previous ones with `effective_to`. "I used to work Sundays until
 * October" stays answerable, and a job taken under the old week is not
 * retrospectively made impossible. A calendar that rewrites its own
 * history cannot settle a dispute — which is the same reason migration
 * 130 gives availability an audit trail.
 *
 * ── A standing rule never outranks a date ───────────────────────────
 * Anything the partner has said about a SPECIFIC date wins, including
 * the days they have already been booked for. That ordering lives in
 * lib/availability and in weekday_is_open() (131); this screen only
 * writes the fallback.
 */
const WEEK = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
]

export default function RecurringAvailability({
  weeklyRules = [],
  vendor,
  onSave,
  onClose,
}) {
  const today = istTodayISO()

  /* Seed from whatever is in force today. A weekday with no rule is
     open — the same default weekday_is_open() uses, so the screen opens
     showing what the matcher currently believes. */
  const seeded = useMemo(() => {
    const live = {}
    for (const r of weeklyRules) {
      if ((r.effective_from ?? '') > today) continue
      if (r.effective_to && r.effective_to < today) continue
      const prev = live[r.weekday]
      if (!prev || String(r.effective_from) > String(prev.effective_from)) live[r.weekday] = r
    }
    return WEEK.map(d => ({
      ...d,
      is_available: live[d.weekday]?.is_available !== false,
      start_time: (live[d.weekday]?.start_time ?? vendor?.working_start ?? '09:00').slice(0, 5),
      end_time: (live[d.weekday]?.end_time ?? vendor?.working_end ?? '22:00').slice(0, 5),
    }))
  }, [weeklyRules, vendor, today])

  const [rows, setRows] = useState(seeded)
  const [from, setFrom] = useState(today)
  const [until, setUntil] = useState('')
  const [customHours, setCustomHours] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const patch = (weekday, next) =>
    setRows(rs => rs.map(r => (r.weekday === weekday ? { ...r, ...next } : r)))

  const openCount = rows.filter(r => r.is_available).length

  async function save() {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await onSave(rows.map(r => ({
        weekday: r.weekday,
        is_available: r.is_available,
        start_time: customHours && r.is_available ? r.start_time : null,
        end_time: customHours && r.is_available ? r.end_time : null,
        effective_to: until || null,
      })), from)
      setSaved(true)
      setTimeout(onClose, 700)
    } catch (err) {
      const raw = err?.message ?? ''
      setError(/vendor_weekly_rules|schema cache|does not exist/i.test(raw)
        ? 'Recurring availability is not switched on for this account yet. Your day-by-day calendar still works.'
        : (raw || 'Could not save your week.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div onClick={onClose} aria-hidden="true"
           className="fixed inset-0 z-40 bg-ink/40 transition-opacity" />
      <section
        role="dialog" aria-modal="true" aria-label="Recurring availability"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[26px] bg-white pb-[max(env(safe-area-inset-bottom),18px)] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-ml-[230px] sm:mt-[-46vh] sm:w-[460px] sm:rounded-[26px]"
      >
        <div className="sticky top-0 z-10 rounded-t-[26px] bg-white px-4 pb-2 pt-3">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
              <Repeat size={16} className="text-plum-600" /> Your usual week
            </p>
            <button type="button" onClick={onClose} aria-label="Close"
                    className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.05]">
              <X size={18} />
            </button>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">
            The days you normally work. Anything you set on a specific date beats this.
          </p>
        </div>

        <div className="space-y-3 px-4">
          <ul className="space-y-1.5">
            {rows.map(r => (
              <li key={r.weekday}
                  className={`rounded-[16px] px-3.5 py-2.5 ring-1 transition ${
                    r.is_available ? 'bg-forest-50 ring-forest-200' : 'bg-ink/[0.04] ring-ink/[0.08]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-[13px] font-extrabold ${
                    r.is_available ? 'text-forest-800' : 'text-ink-mute'}`}>
                    {r.label}
                  </span>
                  <button
                    type="button" role="switch" aria-checked={r.is_available}
                    aria-label={`${r.label}, ${r.is_available ? 'working' : 'not working'}`}
                    onClick={() => patch(r.weekday, { is_available: !r.is_available })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      r.is_available ? 'bg-forest-600' : 'bg-ink/20'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      r.is_available ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {customHours && r.is_available && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input type="time" value={r.start_time} aria-label={`${r.label} start`}
                           onChange={e => patch(r.weekday, { start_time: e.target.value })}
                           className={timeClass} />
                    <input type="time" value={r.end_time} aria-label={`${r.label} end`}
                           onChange={e => patch(r.weekday, { end_time: e.target.value })}
                           className={timeClass} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <label className="flex items-center gap-2 text-[12.5px] font-bold text-ink-soft">
            <input type="checkbox" checked={customHours}
                   onChange={e => setCustomHours(e.target.checked)}
                   className="h-4 w-4 rounded border-ink/20 text-plum-600 focus:ring-plum-500" />
            Set different hours per day
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Starting">
              <input type="date" value={from} min={today}
                     onChange={e => setFrom(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Until" hint="optional">
              <input type="date" value={until} min={from}
                     onChange={e => setUntil(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <p className="text-[11px] leading-snug text-ink-mute">
            {until
              ? `In force from ${pretty(from)} to ${pretty(until)}.`
              : `In force from ${pretty(from)}, with no end date.`}
            {' '}Dates you have already been booked for are not affected.
          </p>

          {openCount === 0 && (
            <p className="rounded-[14px] bg-saffron-50 px-3.5 py-2.5 text-[11.5px] leading-snug text-saffron-900 ring-1 ring-saffron-200">
              Every day is switched off. You will not be offered any work at all
              while this is in force.
            </p>
          )}

          {error && (
            <p className="rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <button
            type="button" onClick={save} disabled={busy}
            className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold text-white transition disabled:opacity-60 ${
              saved ? 'bg-forest-600' : 'bg-plum-700'}`}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {saved && <Check size={15} />}
            {busy ? 'Saving…' : saved ? 'Saved' : 'Save my week'}
          </button>
        </div>
      </section>
    </>
  )
}

const pretty = iso => iso
  ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN',
      { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : ''

const inputClass =
  'w-full rounded-[14px] border-0 bg-ink/[0.04] px-3.5 py-2.5 text-[13px] font-bold text-ink ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-plum-500'
const timeClass =
  'w-full rounded-[12px] border-0 bg-white px-2.5 py-2 text-[12.5px] font-bold text-ink ring-1 ring-ink/[0.10]'

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
