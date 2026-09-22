import { useMemo, useState } from 'react'
import { X, Loader2, Check, AlertTriangle } from 'lucide-react'
import { istTodayISO } from '../../lib/istTime'

/**
 * "I am away from the 20th to the 25th."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE COUNT GOES ON THE BUTTON, BEFORE THE TAP
 * ══════════════════════════════════════════════════════════════════════
 *
 * "14 to 16" is three days to a person and two to a naive loop, and
 * blocking eleven days when you meant three is not something anybody
 * notices until the offers stop. So the range is inclusive of both ends
 * and the number of days it will write is printed on the button.
 *
 * ── The cap is ninety, and it says so ───────────────────────────────
 * A typo in a date field can ask for four thousand rows. Ninety days is
 * longer than anyone plans a decorating business and short enough to be
 * one write. The old editor truncated silently at ninety; this one says
 * that it did.
 *
 * ── Confirmed work is named, not blocked ────────────────────────────
 * If the range covers dates with confirmed bookings, they are listed by
 * date and the save takes a second press. Blocking stops NEW offers; it
 * does not cancel anything already agreed, and this sheet is the last
 * place that sentence can be said before the write happens.
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

export default function BlockDatesSheet({ jobs = [], onSetRange, onClose }) {
  const today = istTodayISO()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [reason, setReason] = useState('travel')
  const [reasonDetail, setReasonDetail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const { days, truncated } = useMemo(() => {
    const a = new Date(`${from}T00:00:00Z`)
    const b = new Date(`${to}T00:00:00Z`)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return { days: [], truncated: false }
    }
    const out = []
    for (const d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
      if (out.length >= MAX_DAYS) return { days: out, truncated: true }
      out.push(d.toISOString().slice(0, 10))
    }
    return { days: out, truncated: false }
  }, [from, to])

  /* Only live work counts. A cancelled job on a date is not a reason to
     make the partner press twice. */
  const clashes = useMemo(() => {
    const inRange = new Set(days)
    const byDate = {}
    for (const j of jobs) {
      if (!inRange.has(j.event_date)) continue
      if (['cancelled', 'expired'].includes(j.status)) continue
      ;(byDate[j.event_date] ??= []).push(j)
    }
    return byDate
  }, [days, jobs])

  const clashDates = Object.keys(clashes).sort()

  async function save() {
    if (!days.length || busy) return
    if (clashDates.length > 0 && !confirm) { setConfirm(true); return }
    setBusy(true); setError(null)
    try {
      await onSetRange(days, 'BLOCKED', {
        slots_total: null,
        note: note.trim() || null,
        reason,
        reason_detail: reason === 'other' ? (reasonDetail.trim() || null) : null,
        hours: null,
      })
      setSaved(true)
      setTimeout(onClose, 700)
    } catch (err) {
      setError(err?.message ?? 'Could not block those dates. Your previous availability is still active.')
    } finally {
      setBusy(false)
    }
  }

  const pretty = iso => new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <>
      <div onClick={onClose} aria-hidden="true"
           className="fixed inset-0 z-40 bg-ink/40 transition-opacity" />
      {/* No transform on this element or any ancestor of it — see the
          header of DayDetailSheet. */}
      <section
        role="dialog" aria-modal="true" aria-label="Block dates"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[26px] bg-white pb-[max(env(safe-area-inset-bottom),18px)] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-ml-[220px] sm:mt-[-46vh] sm:w-[440px] sm:rounded-[26px]"
      >
        <div className="sticky top-0 z-10 rounded-t-[26px] bg-white px-4 pb-2 pt-3">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-extrabold text-ink">Block dates</p>
            <button type="button" onClick={onClose} aria-label="Close"
                    className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/[0.05]">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <input type="date" min={today} value={from}
                     onChange={e => { setFrom(e.target.value); setConfirm(false) }}
                     className={inputClass} />
            </Field>
            <Field label="To">
              <input type="date" min={from} value={to}
                     onChange={e => { setTo(e.target.value); setConfirm(false) }}
                     className={inputClass} />
            </Field>
          </div>

          {to < from && (
            <p className="text-[12px] font-bold text-rose-700">
              The end date is before the start date.
            </p>
          )}
          {truncated && (
            <p className="rounded-[14px] bg-saffron-50 px-3.5 py-2.5 text-[11.5px] leading-snug text-saffron-900 ring-1 ring-saffron-200">
              That range is longer than {MAX_DAYS} days. Only the first {MAX_DAYS} will be
              blocked — block the rest in a second go.
            </p>
          )}

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

          <Field label="Private note" hint={`${note.length}/200`}>
            <textarea rows={2} maxLength={200} value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Only you see this."
                      className={`resize-none ${inputClass}`} />
          </Field>

          {clashDates.length > 0 && (
            <div className="rounded-[16px] bg-saffron-50 px-3.5 py-3 ring-1 ring-saffron-300">
              <p className="flex items-start gap-2 text-[12px] font-bold leading-snug text-saffron-900">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                <span>
                  {clashDates.length === 1 ? 'One date in this range has' : `${clashDates.length} dates in this range have`} confirmed
                  bookings. Blocking stops new offers and <strong>does not cancel them</strong>.
                </span>
              </p>
              <ul className="mt-2 space-y-0.5 pl-[23px]">
                {clashDates.map(d => (
                  <li key={d} className="text-[11.5px] text-saffron-900">
                    <span className="font-extrabold">{pretty(d)}</span>
                    {' · '}
                    {clashes[d].map(j => j.occasion_name ?? j.service_name ?? 'Booking').join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="rounded-[16px] bg-rose-50 px-3.5 py-3 text-[12px] font-bold leading-snug text-rose-800 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <button
            type="button" onClick={save} disabled={busy || days.length === 0}
            className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold text-white transition disabled:opacity-50 ${
              saved ? 'bg-forest-600' : confirm ? 'bg-rose-600' : 'bg-ink'}`}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {saved && <Check size={15} />}
            {busy ? 'Blocking…'
              : saved ? 'Blocked'
              : confirm ? 'Yes, block them anyway'
              : days.length === 0 ? 'Pick a range'
              : `Block ${days.length} ${days.length === 1 ? 'day' : 'days'}`}
          </button>
        </div>
      </section>
    </>
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
