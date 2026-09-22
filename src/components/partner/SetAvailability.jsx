import { useState } from 'react'
import { Loader2, CalendarCheck, CalendarX2, CalendarClock } from 'lucide-react'

/**
 * Set availability — one date, or a run of them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT WRITES THROUGH THE SAME HANDLERS AS THE FULL CALENDAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * `onSetDay` and `onSetRange` come from `useVendorAccount`, which is
 * what VendorAvailability already uses. This sheet is a second door onto
 * one write path, not a second write path — a duplicate would be the
 * thing that eventually sets `slots_booked` on one screen and not the
 * other, and a partner would get offers on a day they had capped.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BLOCKED IS THE DESTRUCTIVE ONE, SO IT IS NOT THE DEFAULT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The three states are not equal. Available restores work; Limited caps
 * it; Blocked removes the partner from every dispatch that day. A sheet
 * that opened on Blocked with a Save button under it would eventually be
 * tapped through by somebody who only meant to check a date.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A RANGE IS INCLUSIVE AND SAYS HOW MANY
 * ══════════════════════════════════════════════════════════════════════
 *
 * "14 to 16" is three days to a person and two to a naive loop. The
 * count goes on the button before the tap, because marking eleven days
 * busy when you meant three is not something you notice until the
 * offers stop.
 */

/* ── `id` is the DATABASE value, `label` is the partner's word ───────
   These are not the same string and must not be assumed to be.
   `vendor_availability.status` is CHECK (status IN ('BLOCKED','LIMITED',
   'OPEN')) -- migration 021 -- so the open state is stored as OPEN.

   This read `id: 'AVAILABLE'`, which is not in that list. Every save of
   an open day, including the default for a date with no row yet, was
   rejected by Postgres with

     new row for relation "vendor_availability" violates check
     constraint "vendor_availability_status_check"

   printed raw above the Save button. Marking a day Limited or Blocked
   worked, which is why it survived: the one state that fails is the one
   the sheet opens on. AVAILABILITY_ORDER in config/vendor.js has had
   'OPEN' all along -- this component is the only place that disagreed. */
const STATES = [
  { id: 'OPEN', label: 'Available', icon: CalendarCheck,
    hint: 'Open to offers', tone: 'bg-forest-600 text-white' },
  { id: 'LIMITED', label: 'Limited', icon: CalendarClock,
    hint: 'Cap how many jobs', tone: 'bg-saffron-400 text-plum-950' },
  { id: 'BLOCKED', label: 'Blocked', icon: CalendarX2,
    hint: 'No offers at all', tone: 'bg-ink text-white' },
]

const key = d => {
  const x = d instanceof Date ? d : new Date(`${d}T00:00:00`)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const todayKey = key(new Date())

export default function SetAvailability({ date, availability, onSetDay, onSetRange, onDone }) {
  const existing = availability?.[date] ?? null

  const [mode, setMode] = useState('single')
  const [from, setFrom] = useState(date ?? todayKey)
  const [to, setTo] = useState(date ?? todayKey)
  const [status, setStatus] = useState(existing?.status ?? 'OPEN')
  const [slots, setSlots] = useState(existing?.slots_total ?? 2)
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  /* Inclusive of both ends, and capped. A typo in a date field can ask
     for four thousand rows; ninety days is longer than anyone plans a
     decorating business and short enough to be one write. */
  const days = (() => {
    if (mode === 'single') return [from]
    const a = new Date(`${from}T00:00:00`)
    const b = new Date(`${to}T00:00:00`)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return []
    const out = []
    for (let d = new Date(a); d <= b && out.length < 90; d.setDate(d.getDate() + 1)) {
      out.push(key(d))
    }
    return out
  })()

  async function save() {
    if (!days.length || busy) return
    setBusy(true); setError(null)
    const extra = {
      slots_total: status === 'LIMITED' ? Number(slots) || 1 : null,
      slots_booked: 0,
      note: note.trim() || null,
    }
    try {
      if (days.length === 1) await onSetDay(days[0], status, extra)
      else await onSetRange(days, status, extra)
      onDone?.()
    } catch (err) {
      setError(err?.message ?? 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-ink/[0.05] p-1">
        {[['single', 'Single date'], ['range', 'Date range']].map(([id, label]) => (
          <button
            key={id} type="button" onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={`min-h-[38px] rounded-full text-[13px] font-extrabold transition ${
              mode === id ? 'bg-plum-700 text-white' : 'text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={mode === 'range' ? 'grid grid-cols-2 gap-2' : ''}>
        <Field label={mode === 'range' ? 'From' : 'Date'}>
          <input type="date" value={from} min={todayKey}
                 onChange={e => { setFrom(e.target.value); if (mode === 'single') setTo(e.target.value) }}
                 className="w-full rounded-2xl bg-white px-3.5 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.12]" />
        </Field>
        {mode === 'range' && (
          <Field label="To">
            <input type="date" value={to} min={from}
                   onChange={e => setTo(e.target.value)}
                   className="w-full rounded-2xl bg-white px-3.5 py-3 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.12]" />
          </Field>
        )}
      </div>

      <Field label="Availability">
        <div className="flex flex-col gap-2">
          {STATES.map(s => {
            const Icon = s.icon
            const on = status === s.id
            return (
              <button
                key={s.id} type="button" onClick={() => setStatus(s.id)}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ${
                  on ? 'ring-plum-400' : 'ring-ink/[0.08]'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  on ? s.tone : 'bg-ink/[0.05] text-ink-mute'}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-extrabold text-ink">{s.label}</span>
                  <span className="block text-[11.5px] text-ink-mute">{s.hint}</span>
                </span>
                <span className={`h-4 w-4 shrink-0 rounded-full ring-1 ${
                  on ? 'bg-plum-700 ring-plum-700' : 'ring-ink/20'}`} />
              </button>
            )
          })}
        </div>
      </Field>

      {status === 'LIMITED' && (
        <Field label="How many jobs will you take?" hint="Offers stop once this many are booked.">
          <input type="number" min={1} max={12} value={slots}
                 onChange={e => setSlots(e.target.value)}
                 className="w-24 rounded-2xl bg-white px-3.5 py-3 text-[14px] font-extrabold tabular-nums text-ink ring-1 ring-ink/[0.12]" />
        </Field>
      )}

      <Field label="Note" hint="For you only. Customers never see it.">
        <input type="text" value={note} maxLength={120}
               onChange={e => setNote(e.target.value)}
               placeholder="Wedding in the family"
               className="w-full rounded-2xl bg-white px-3.5 py-3 text-[14px] text-ink ring-1 ring-ink/[0.12] placeholder:text-ink-mute" />
      </Field>

      {error && <p className="text-[12px] font-semibold text-rose-700">{error}</p>}

      <button
        type="button" onClick={save} disabled={!days.length || busy}
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 text-[15px] font-extrabold text-white disabled:opacity-40"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {!days.length ? 'Pick a valid range'
          : days.length === 1 ? 'Save this day'
          : `Save ${days.length} days`}
      </button>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-ink-mute">
        {label}
      </p>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-ink-mute">{hint}</p>}
    </div>
  )
}
