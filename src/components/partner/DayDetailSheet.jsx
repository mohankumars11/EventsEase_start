import { useEffect, useMemo, useState } from 'react'
import { assessChange, LEVEL } from '../../lib/calendarAlerts'
import { FIELD_RULES } from '../../lib/validation/fieldRules'
import { X, CalendarCheck, CalendarClock, CalendarX2, Clock, StickyNote, MapPin, IndianRupee, Check, Loader2, AlertTriangle, CalendarRange, Info } from 'lucide-react'
import {
  STATUS, dayStatus, hoursFor, hoursLabel, clockLabel, reasonLabel,
} from '../../lib/availability'
import { istTodayISO } from '../../lib/istTime'
import { INTEREST_FLOOR } from '../../lib/demand'

/**
 * One day, in full, and the only place a day is edited.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS REPLACED AN INLINE PANEL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old editor showed three buttons and a note field. It could not
 * show what was already booked on the day it was editing, so a partner
 * could mark a date Blocked with two confirmed jobs on it and be told
 * nothing. It also could not show a pending request, which is the one
 * thing that makes a date worth looking at.
 *
 * This shows the day first and the controls second, because the question
 * is always "what have I got on" before "what shall I do about it".
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO ENTRANCE ANIMATION ON THE FIXED CONTAINER
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is a `position: fixed` sheet on mobile. A transform on an
 * ancestor — including an IDENTITY transform, which is what a settled
 * entrance animation leaves behind — makes that ancestor the containing
 * block and the sheet renders off-screen relative to it rather than the
 * viewport. It has happened here before. The backdrop fades; the sheet
 * itself does not move.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BLOCKING A DAY DOES NOT CANCEL WHAT IS ON IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * And the sheet says so in those words before it lets the save through.
 * Silently cancelling somebody's confirmed wedding because they tapped
 * Blocked is the worst thing this screen could do; refusing to let them
 * block it is the second worst, because the reason they are blocking it
 * is usually that something has gone wrong.
 */
const REASONS = [
  ['personal', 'Personal'],
  ['holiday', 'Holiday'],
  ['travel', 'Travelling'],
  ['maintenance', 'Maintenance'],
  ['committed', 'Committed elsewhere'],
  ['unavailable', 'Unavailable'],
  ['other', 'Other'],
]

const STATES = [
  { id: 'OPEN', label: 'Available', icon: CalendarCheck, hint: 'Open to offers',
    on: 'bg-forest-600 text-white ring-forest-600' },
  { id: 'LIMITED', label: 'Limited', icon: CalendarClock, hint: 'Cap the jobs',
    on: 'bg-saffron-400 text-plum-950 ring-saffron-400' },
  { id: 'BLOCKED', label: 'Blocked', icon: CalendarX2, hint: 'No offers',
    on: 'bg-ink text-white ring-ink' },
]

const BANNER = {
  [STATUS.OPEN]:    ['bg-forest-50 text-forest-800 ring-forest-200', 'Available', 'You can receive bookings for this date.'],
  [STATUS.LIMITED]: ['bg-saffron-50 text-saffron-800 ring-saffron-200', 'Limited', 'You are taking a capped number of jobs.'],
  [STATUS.BOOKED]:  ['bg-plum-50 text-plum-800 ring-plum-200', 'Booked', 'You have confirmed work on this date.'],
  [STATUS.BLOCKED]: ['bg-ink/[0.06] text-ink ring-ink/15', 'Blocked', 'You are not available on this date.'],
  [STATUS.UNSET]:   ['bg-ink/[0.03] text-ink-soft ring-ink/10', 'Not set', 'No preference recorded. You can still be offered work.'],
}

const rupees = paise =>
  typeof paise === 'number' ? `₹${Math.round(paise / 100).toLocaleString('en-IN')}` : null

export default function DayDetailSheet({
  date,
  vendor,
  availability = {},
  weeklyRules = [],
  jobsOnDay = [],
  pendingOnDay = [],
  onSetDay,
  onClearDay,
  onApplyToRange,
  interestOnDay = null,
  onClose,
}) {
  const row = availability[date] ?? null
  const todayISO = istTodayISO()
  const verdict = useMemo(() => dayStatus({
    dateISO: date, row, weeklyRules, jobsOnDay,
    maxPerDay: vendor?.max_events_per_day ?? 1, todayISO,
  }), [date, row, weeklyRules, jobsOnDay, vendor, todayISO])

  const defaultHours = hoursFor({ row, weeklyRules, dateISO: date, vendor })

  const [status, setStatus] = useState(row?.status ?? 'OPEN')
  const [slots, setSlots] = useState(row?.slots_total ?? 2)
  /* Live, because this field has exactly one keystroke of
     meaning and `min`/`max` on a number input are decoration --
     a phone keypad types 0 and 50 and the browser accepts both. */
  const slotsSays = FIELD_RULES.daily_slots.validate(String(slots ?? '').trim())
  const [note, setNote] = useState(row?.note ?? '')
  const [reason, setReason] = useState(row?.reason ?? 'personal')
  const [reasonDetail, setReasonDetail] = useState(row?.reason_detail ?? '')
  const [customHours, setCustomHours] = useState(Array.isArray(row?.hours) && row.hours.length > 0)
  const [from, setFrom] = useState(defaultHours[0]?.start ?? '09:00')
  const [to, setTo] = useState(defaultHours[0]?.end ?? '22:00')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  /* Re-seed when the partner taps a different date without closing. */
  useEffect(() => {
    const r = availability[date] ?? null
    const h = hoursFor({ row: r, weeklyRules, dateISO: date, vendor })
    setStatus(r?.status ?? 'OPEN')
    setSlots(r?.slots_total ?? 2)
    setNote(r?.note ?? '')
    setReason(r?.reason ?? 'personal')
    setReasonDetail(r?.reason_detail ?? '')
    setCustomHours(Array.isArray(r?.hours) && r.hours.length > 0)
    setFrom(h[0]?.start ?? '09:00')
    setTo(h[0]?.end ?? '22:00')
    setError(null); setSaved(false); setConfirmBlock(false)
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Changing the decision disarms the confirm. Somebody who arms a
     block and then switches to Limited must not be one tap from a
     blocked day they did not choose. */
  useEffect(() => { setConfirmBlock(false) }, [status, slots])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pretty = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  /* "21 Dec" for the save confirmation. The long form above is a
     heading; this sits inside a sentence. */
  const shortDay = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  })
  /* ── One engine, both paths ────────────────────────────────────────
     The range sheet has run every change through `assessChange` since
     the alerts work; this sheet had its own rule -- block a day that
     already has a booking -- and nothing else. So tapping a free date
     and blocking it said NOTHING about what blocking does, which is the
     one thing a partner is actually deciding.

     Same engine now, so the rationing holds: the quiet consequence line
     appears on every block, and red is still reserved for a clash, a
     blackout, or real demand. Two implementations of "is this worth
     interrupting them for" would drift, and the one that drifted would
     be the one nobody was watching. */
  const alert = useMemo(() => assessChange({
    dates: [date],
    status,
    availability,
    jobs: jobsOnDay,
    interestByDate: interestOnDay ? new Map([[date, interestOnDay]]) : null,
    weeklyRules,
    maxPerDay: status === 'LIMITED' ? Math.max(1, Number(slots) || 1) : 1,
    todayISO: istTodayISO(),
  }), [date, status, availability, jobsOnDay, interestOnDay, weeklyRules, slots])

  const needsConfirm = alert.needsConfirm

  /* Still its own value: the clash sentence says something the generic
     consequence line does not -- that existing work is NOT cancelled --
     and that is the fear this sheet exists to answer. */
  const blockingBookedDay = status === 'BLOCKED' && jobsOnDay.length > 0

  /* A count of real enquiries, or nothing. INTEREST_FLOOR exists because
     "1 enquiry" printed on a date reads as "nobody wants this" — the
     same reasoning that governs the customer-facing badge. */
  const asking = (interestOnDay?.total ?? 0) >= INTEREST_FLOOR ? interestOnDay.total : 0

  async function save() {
    if (busy) return
    if (needsConfirm && !confirmBlock) { setConfirmBlock(true); return }

    setBusy(true); setError(null); setSaved(false)
    try {
      await onSetDay(date, status, {
        slots_total: status === 'LIMITED' ? Math.max(1, Number(slots) || 1) : null,
        note: note.trim() || null,
        reason: status === 'BLOCKED' ? reason : null,
        reason_detail: status === 'BLOCKED' && reason === 'other'
          ? (reasonDetail.trim() || null) : null,
        hours: customHours ? [{ start: from, end: to }] : null,
      })
      setSaved(true)
      /* Left open on purpose: the partner has just changed a date and the
         banner above now says what it changed to. Closing would make them
         reopen it to check. */
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      setError(err?.message ?? 'That did not save. Your previous availability is still active.')
    } finally {
      setBusy(false)
    }
  }

  const [bannerSkin, bannerTitle, bannerBody] = BANNER[verdict.status]

  return (
    <>
      {/* Backdrop. Only this fades — see the header. */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden"
        aria-hidden="true"
      />
      <section
        role="dialog" aria-modal="true" aria-label={`Availability for ${pretty}`}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[26px] bg-white pb-[max(env(safe-area-inset-bottom),18px)] shadow-2xl lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-[22px] lg:pb-4 lg:shadow-none lg:ring-1 lg:ring-ink/[0.06]"
      >
        {/* The grab handle is mobile-only; on a desktop panel it is noise. */}
        <div className="sticky top-0 z-10 rounded-t-[26px] bg-white px-4 pb-2 pt-3 lg:static lg:rounded-none lg:px-4 lg:pt-4">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-ink/15 lg:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold leading-tight text-ink">{pretty}</p>
              {verdict.past && (
                <p className="mt-0.5 text-[11.5px] font-bold text-ink-mute">
                  This date has passed and cannot be changed.
                </p>
              )}
            </div>
            <button
              type="button" onClick={onClose} aria-label="Close"
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.05]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4">
          <div className={`rounded-[18px] px-3.5 py-3 ring-1 ${bannerSkin}`}>
            <p className="text-[13.5px] font-extrabold">{bannerTitle}</p>
            <p className="mt-0.5 text-[12px] leading-snug opacity-90">{bannerBody}</p>
            {verdict.reason && (
              <p className="mt-1 text-[12px] font-bold opacity-90">Reason: {verdict.reason}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Confirmed" value={jobsOnDay.length} />
            <Stat label="Pending" value={pendingOnDay.length} />
            {/* "1/2" does not say which number is which. The partner is
                deciding whether to take more work, so the number they
                need is what is LEFT. */}
            <Stat
              label={`Left of ${verdict.total}`}
              value={verdict.status === STATUS.BLOCKED ? '—' : verdict.remaining}
            />
          </div>

          <div className="flex items-center gap-2 rounded-[18px] bg-ink/[0.03] px-3.5 py-2.5">
            <Clock size={14} className="shrink-0 text-ink-mute" />
            <span className="text-[12px] text-ink-soft">
              Working hours <span className="font-extrabold text-ink">{hoursLabel(defaultHours)}</span>
            </span>
          </div>

          {jobsOnDay.length > 0 && (
            <Section title="Confirmed bookings">
              {jobsOnDay.map(j => (
                <li key={j.line_id} className="rounded-[16px] bg-plum-50 px-3.5 py-2.5 ring-1 ring-plum-100">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[12.5px] font-extrabold text-ink">
                      {j.occasion_name ?? j.service_name ?? 'Booking'}
                    </p>
                    {j.time_note && (
                      <p className="shrink-0 text-[11.5px] font-bold text-plum-700">{j.time_note}</p>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11px] text-ink-mute">
                    {j.service_name && <span>{j.service_name}</span>}
                    {j.area_label && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={10} />{j.area_label}
                      </span>
                    )}
                    {rupees(j.partner_amount_paise) && (
                      <span className="inline-flex items-center gap-0.5 font-bold text-ink-soft">
                        <IndianRupee size={10} />{Math.round(j.partner_amount_paise / 100).toLocaleString('en-IN')}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </Section>
          )}

          {pendingOnDay.length > 0 && (
            <Section title={`Pending requests (${pendingOnDay.length})`}>
              {pendingOnDay.map(p => (
                <li key={p.offer_id} className="rounded-[16px] bg-saffron-50 px-3.5 py-2.5 ring-1 ring-saffron-200">
                  <p className="truncate text-[12.5px] font-extrabold text-ink">
                    {p.occasion_name ?? p.service_name ?? 'Request'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-mute">
                    {p.time_note ?? 'Time to be confirmed'}
                    {p.area_label ? ` · ${p.area_label}` : ''}
                  </p>
                  {/* Answering happens in the Jobs inbox, which owns the
                      countdown and the accept/decline RPCs. Two places to
                      accept the same offer is two places to get the race
                      wrong. */}
                  <p className="mt-1 text-[11px] font-bold text-saffron-800">
                    Answer this in Jobs before it expires.
                  </p>
                </li>
              ))}
            </Section>
          )}

          {!verdict.past && (
            <>
              <div className="pt-0.5">
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
                  Set availability
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {STATES.map(s => {
                    const Icon = s.icon
                    const on = status === s.id
                    return (
                      <button
                        key={s.id} type="button"
                        onClick={() => { setStatus(s.id); setConfirmBlock(false) }}
                        aria-pressed={on}
                        className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[16px] px-1 ring-1 transition ${
                          on ? s.on : 'bg-white text-ink-soft ring-ink/[0.10]'}`}
                      >
                        <Icon size={16} />
                        <span className="text-[12px] font-extrabold leading-none">{s.label}</span>
                        <span className="text-[9.5px] leading-none opacity-80">{s.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {status === 'LIMITED' && (
                <Field label="Most jobs you will take that day">
                  <input
                    type="number" min="1" max="12" inputMode="numeric"
                    value={slots} onChange={e => setSlots(e.target.value)}
                    className="w-full rounded-[14px] border-0 bg-ink/[0.04] px-3.5 py-2.5 text-[13px] font-bold text-ink ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-plum-500"
                  />
              {slotsSays?.says && slotsSays.severity !== 'ok' && (
                <p className={`mt-1 text-[11.5px] font-semibold leading-snug ${
                  slotsSays.severity === 'warn' ? 'text-saffron-800' : 'text-rose-700'
                }`}>{slotsSays.says}</p>
              )}
                  {jobsOnDay.length > 0 && (
                    <p className="mt-1 text-[11px] text-ink-mute">
                      {jobsOnDay.length} already confirmed. A limit below that will be raised to match.
                    </p>
                  )}
                </Field>
              )}

              {status === 'BLOCKED' && (
                <Field label="Why (only you see this)">
                  <div className="flex flex-wrap gap-1.5">
                    {REASONS.map(([id, label]) => (
                      <button
                        key={id} type="button" onClick={() => setReason(id)}
                        aria-pressed={reason === id}
                        className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                          reason === id ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {reason === 'other' && (
                    <input
                      value={reasonDetail} onChange={e => setReasonDetail(e.target.value)}
                      maxLength={60} placeholder="In your own words"
                      className="mt-2 w-full rounded-[14px] border-0 bg-ink/[0.04] px-3.5 py-2.5 text-[13px] text-ink ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-plum-500"
                    />
                  )}
                </Field>
              )}

              {status !== 'BLOCKED' && (
                <Field label="Hours">
                  <label className="flex items-center gap-2 text-[12.5px] font-bold text-ink-soft">
                    <input
                      type="checkbox" checked={customHours}
                      onChange={e => setCustomHours(e.target.checked)}
                      className="h-4 w-4 rounded border-ink/20 text-plum-600 focus:ring-plum-500"
                    />
                    Different hours on this day
                  </label>
                  {customHours && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="time" value={from} onChange={e => setFrom(e.target.value)}
                        aria-label="Start time"
                        className="w-full rounded-[14px] border-0 bg-ink/[0.04] px-3 py-2.5 text-[13px] font-bold text-ink ring-1 ring-ink/[0.08]"
                      />
                      <input
                        type="time" value={to} onChange={e => setTo(e.target.value)}
                        aria-label="End time"
                        className="w-full rounded-[14px] border-0 bg-ink/[0.04] px-3 py-2.5 text-[13px] font-bold text-ink ring-1 ring-ink/[0.08]"
                      />
                    </div>
                  )}
                  {customHours && (
                    <p className="mt-1 text-[11px] text-ink-mute">
                      {`${clockLabel(from)} – ${clockLabel(to)}.`} Shown to you and used for clash
                      warnings; it does not yet filter which jobs you are offered.
                    </p>
                  )}
                </Field>
              )}

              <Field label="Private note" hint={`${note.length}/200`}>
                <div className="flex items-start gap-2 rounded-[14px] bg-ink/[0.04] px-3 py-2.5 ring-1 ring-ink/[0.08] focus-within:ring-2 focus-within:ring-plum-500">
                  <StickyNote size={14} className="mt-0.5 shrink-0 text-ink-mute" />
                  <textarea
                    rows={2} maxLength={200} value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Only you see this."
                    className="w-full resize-none border-0 bg-transparent p-0 text-[13px] text-ink placeholder:text-ink-faint focus:ring-0"
                  />
                </div>
              </Field>

              {/* ── What blocking a date DOES ─────────────────────────
                  Rendered on every block, in the quietest tone the
                  sheet has. It is not a warning and must not read as
                  one: it is a description of the button, and a partner
                  is entitled to read it before pressing, every time.

                  `assessChange` rations the loud ones -- a clash, a
                  blackout, real demand -- so this line appearing always
                  does not make those appear always. That distinction is
                  the whole argument in calendarAlerts.js's header. */}
              {alert.signals.filter(sig => sig.id === 'blocked').map(sig => (
                <p key={sig.id} data-signal="blocked"
                   className="flex items-start gap-2 rounded-[16px] bg-ink/[0.04] px-3.5 py-3 text-[12px] leading-snug text-ink-soft">
                  <Info size={15} className="mt-px shrink-0 text-ink-mute" />
                  <span>{sig.says}</span>
                </p>
              ))}

              {blockingBookedDay && (
                <p className="flex items-start gap-2 rounded-[16px] bg-saffron-50 px-3.5 py-3 text-[12px] leading-snug text-saffron-900 ring-1 ring-saffron-300">
                  <AlertTriangle size={15} className="mt-px shrink-0" />
                  <span>
                    This date has {jobsOnDay.length === 1 ? 'a confirmed booking' : `${jobsOnDay.length} confirmed bookings`}.
                    Blocking it stops new offers. <strong>It does not cancel what is already booked</strong> —
                    to cancel, open the job itself.
                  </span>
                </p>
              )}

              {/* Only when blocking, and only when the number is real.
                  A demand count shown while the partner is marking
                  themselves AVAILABLE is encouragement; shown while they
                  are blocking, it is the one fact that might change
                  their mind. */}
              {status === 'BLOCKED' && asking > 0 && (
                <p data-signal="demand"
                   className="flex items-start gap-2 rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] leading-snug text-rose-900 ring-1 ring-rose-200">
                  <AlertTriangle size={15} className="mt-px shrink-0" />
                  <span>
                    <strong>{asking} {asking === 1 ? 'family has' : 'families have'} asked about this date.</strong>{' '}
                    Block it and none of those enquiries can reach you.
                  </span>
                </p>
              )}

              {error && (
                <p className="rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
                  {error}
                </p>
              )}

              {/* Tapping one date and meaning "and the week after it" is
                  the commonest next thought. Carries the current choice
                  across so the range sheet opens on the same answer. */}
              {onApplyToRange && (
                <button
                  type="button"
                  onClick={() => onApplyToRange(status)}
                  className="flex w-full items-center justify-between gap-2 rounded-[16px] bg-plum-50 px-3.5 py-3 text-left ring-1 ring-plum-100"
                >
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-extrabold text-plum-900">
                      Apply to a range of dates
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-plum-700/80">
                      Say the same thing about every day from here onwards.
                    </span>
                  </span>
                  <CalendarRange size={16} className="shrink-0 text-plum-700" />
                </button>
              )}

              {/* ── What was saved, not merely that something was ──────
                  The button flashed "Saved" for two seconds and that was
                  the whole confirmation. It tells a partner the request
                  succeeded; it does not tell them what the calendar now
                  says, which is the thing they came to change and the
                  thing they will be held to.

                  Inline rather than a dialog: the spec asks for
                  lightweight feedback, and a sheet that opens a second
                  sheet to confirm the first is how a two-tap job becomes
                  a four-tap one. */}
              {saved && (
                <p data-saved={status}
                   className="flex items-start gap-2 rounded-[16px] bg-forest-50 px-3.5 py-3 text-[12.5px] leading-snug text-forest-900 ring-1 ring-forest-200">
                  <Check size={15} strokeWidth={3} className="mt-px shrink-0" />
                  <span>
                    <strong>{shortDay}</strong> is now{' '}
                    <strong>{(STATES.find(x => x.id === status)?.label ?? status).toLowerCase()}</strong>.
                    {status === 'BLOCKED'
                      ? ' No offers will reach you on it.'
                      : status === 'LIMITED'
                        ? ` We will offer you at most ${Math.max(1, Number(slots) || 1)} that day.`
                        : ' We can offer you work on it.'}
                  </span>
                </p>
              )}

              <div className="flex gap-2 pt-0.5">
                {row && (
                  <button
                    type="button" disabled={busy}
                    onClick={async () => {
                      setBusy(true); setError(null)
                      try { await onClearDay(date); onClose() }
                      catch (err) { setError(err?.message ?? 'Could not clear that day.') }
                      finally { setBusy(false) }
                    }}
                    className="min-h-[46px] shrink-0 rounded-full px-4 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.12] disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button" onClick={save} disabled={busy}
                  className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold text-white transition disabled:opacity-60 ${
                    saved ? 'bg-forest-600' : confirmBlock ? 'bg-rose-600' : 'bg-plum-700'}`}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {saved && <Check size={15} />}
                  {busy ? 'Saving…'
                    : saved ? 'Saved'
                    : confirmBlock ? 'Yes, block it anyway'
                    : 'Save availability'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[16px] bg-ink/[0.03] px-2 py-2.5 text-center">
      <p className="text-[16px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

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
