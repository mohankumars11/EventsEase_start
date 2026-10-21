import { useEffect, useState } from 'react'
import ReviewDial from './ReviewDial'
import { BadgeCheck, CalendarDays, ChevronRight, Clock3, FileSearch, Info, PlayCircle, TriangleAlert } from 'lucide-react'

function remaining(due, now) {
  const ms = new Date(due).getTime() - now
  if (!Number.isFinite(ms)) return null
  const clamped = Math.max(0, ms)
  return {
    ms: clamped,
    over: ms <= 0,
    hours: Math.floor(clamped / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
  }
}

const SLA_HOURS = 24

function shortLeft(left) {
  if (!left) return null
  if (left.hours >= 1) return `${left.hours}h`
  if (left.minutes >= 1) return `${left.minutes}m`
  return `${left.seconds}s`
}

function shortElapsed(e) {
  if (!e) return null
  if (e.hours >= 24) return `${Math.floor(e.hours / 24)}d`
  if (e.hours >= 1) return `${e.hours}h`
  if (e.minutes >= 1) return `${e.minutes}m`
  return `${e.seconds}s`
}

export function reviewWording(left) {
  if (!left) return null
  if (left.over) return 'Taking a little longer'
  return `${left.hours}h ${String(left.minutes).padStart(2, '0')}m left`
}

export function useReviewClock({ dueAt, submittedAt, extended = 0 }) {
  const [now, setNow] = useState(() => Date.now())

  // The first review window is ALWAYS exactly 24 hours from the real
  // submission timestamp. A stale/mis-stamped due_at must never turn the
  // first window into 48/53 hours. Only a backend-created extension may
  // legitimately move the deadline beyond the first 24-hour window.
  const submittedMs = submittedAt ? new Date(submittedAt).getTime() : NaN
  const canonicalFirstDueMs = Number.isFinite(submittedMs)
    ? submittedMs + SLA_HOURS * 3_600_000
    : NaN
  const backendDueMs = dueAt ? new Date(dueAt).getTime() : NaN
  const effectiveDueMs = extended > 0 && Number.isFinite(backendDueMs)
    ? backendDueMs
    : canonicalFirstDueMs
  const effectiveDueAt = Number.isFinite(effectiveDueMs) ? new Date(effectiveDueMs).toISOString() : null
  const left = effectiveDueAt ? remaining(effectiveDueAt, now) : null
  const ticking = Number.isFinite(submittedMs) || !!dueAt

  useEffect(() => {
    if (!ticking) return undefined
    // This is a LIVE clock. Do not downgrade to minute ticks; partners
    // should see the seconds move continuously.
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ticking])


  let elapsed = null
  if (submittedAt) {
    const since = now - new Date(submittedAt).getTime()
    if (Number.isFinite(since) && since >= 0) {
      elapsed = {
        ms: since,
        hours: Math.floor(since / 3_600_000),
        minutes: Math.floor((since % 3_600_000) / 60_000),
        seconds: Math.floor((since % 60_000) / 1000),
      }
    }
  }

  let fraction = null
  if (effectiveDueAt && submittedAt) {
    const start = new Date(submittedAt).getTime()
    const end = new Date(effectiveDueAt).getTime()
    const span = end - start
    if (Number.isFinite(span) && span > 0) {
      fraction = Math.min(1, Math.max(0, (now - start) / span))
    }
  }

  const dialFraction = fraction != null
    ? fraction
    : elapsed
      ? Math.min(1, elapsed.ms / (SLA_HOURS * 3_600_000))
      : 0

  const dialLabel = left && !left.over
    ? shortLeft(left)
    : elapsed
      ? shortElapsed(elapsed)
      : null

  return {
    left,
    words: reviewWording(left),
    fraction,
    elapsed,
    dial: { fraction: dialFraction, label: dialLabel, over: !!left?.over },
  }
}

function formatSent(submittedAt) {
  if (!submittedAt) return null
  const d = new Date(submittedAt)
  if (Number.isNaN(d.getTime())) return null
  return `Sent ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

export default function ReviewCountdown({
  status,
  dueAt,
  submittedAt,
  extended = 0,
  note,
  compact = false,
  onOpenCalendar = null,
  onOpenListing = null,
  listingCount = 0,
  listingNames = null,
  onHowItWorks = null,
}) {
  const { left, elapsed, dial } = useReviewClock({ dueAt, submittedAt, extended })

  /* ── The moment it is over ────────────────────────────────────────
     The clock, the listings and the calendar button all belong to a
     wait that has ended, so none of them render here. What replaces
     them has to be unmistakable: a partner who refreshed this screen
     for a day should not have to work out from a tone change that the
     answer arrived. It says approved, it says jobs are open, and the
     compact header variant says the same thing in one line. */
  if (status === 'approved') {
    if (compact) {
      return (
        <div className="flex items-center gap-2 rounded-[18px] bg-forest-50 px-3 py-2 ring-1 ring-forest-200">
          <BadgeCheck size={15} className="shrink-0 text-forest-700" />
          <p className="text-[12px] font-extrabold text-forest-900">Approved · you are live</p>
        </div>
      )
    }
    return (
      <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-forest-600 to-forest-800 p-4 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15">
            <BadgeCheck size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-100">Review complete</p>
            <p className="mt-0.5 text-[17px] font-black leading-tight">You are live on Sambramo</p>
            <p className="mt-1 text-[12.5px] leading-snug text-white/75">
              Your listings are approved and you can be booked. Jobs will arrive on this
              tab — keep your calendar up to date so you only get asked about days you can work.
            </p>
            {onOpenCalendar && (
              <button type="button" onClick={onOpenCalendar}
                className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-4 text-[12.5px] font-extrabold text-forest-800">
                <CalendarDays size={14} /> Update calendar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className={`rounded-[18px] bg-saffron-400/10 px-3.5 py-3 ring-1 ring-saffron-300/60 ${compact ? '' : 'mb-4'}`}>
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-saffron-800">
          <TriangleAlert size={14} className="shrink-0" />
          We need something changed
        </p>
        {note && <p className="mt-1 text-[12px] leading-snug text-ink-soft">{note}</p>}
      </div>
    )
  }

  if (status !== 'submitted') return null

  const overdue = !!left?.over
  const extendedReview = extended > 0
  const sent = formatSent(submittedAt)

  const timerText = left && !overdue
    ? `${String(left.hours).padStart(2, '0')}:${String(left.minutes).padStart(2, '0')}:${String(left.seconds).padStart(2, '0')}`
    : elapsed
      ? `${String(elapsed.hours).padStart(2, '0')}:${String(elapsed.minutes).padStart(2, '0')}:${String(elapsed.seconds).padStart(2, '0')}`
      : '24:00:00'
  const timerCaption = overdue
    ? 'TIME ELAPSED · REVIEW EXTENDED'
    : extendedReview
      ? 'TIME REMAINING · EXTENDED WINDOW'
      : 'TIME REMAINING · 24 HOUR WINDOW'

  return (
    <section aria-label="Profile review status" className={`mb-3 overflow-hidden rounded-[20px] border border-amber-200 bg-[#FFFCF4] px-3 py-3 text-[#17152B] shadow-[0_3px_12px_rgba(65,42,0,.035)] sm:px-4 sm:py-4 ${compact ? 'mb-0' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700"><Clock3 size={15} className="shrink-0" />With our team</p>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-amber-800">Under review</span>
      </div>
      <h2 className="mt-1.5 text-[21px] font-black leading-[1.04] tracking-[-0.045em] sm:text-[24px]">
        {overdue ? 'We need a little more time.' : 'We’re reviewing your profile'}
      </h2>
      <p className="mt-1.5 text-[12px] font-medium leading-snug text-[#77738D] sm:text-[13px]">
        {overdue ? 'Your review is taking a little longer than expected. We will keep you updated.' : 'Our team is verifying your details and listed services. This usually takes up to 24 hours.'}
      </p>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-[17px] border border-slate-100 bg-white px-3 py-3 sm:gap-5 sm:py-4">
        <div className="relative flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-amber-50 sm:h-[76px] sm:w-[76px]">
          <ReviewDial {...dial} label={null} size={66} />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><Clock3 size={22} className="text-amber-600" strokeWidth={2} /></span>
        </div>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[29px] font-black leading-none tracking-[-0.045em] tabular-nums text-[#21124E] sm:text-[36px]">{timerText}</p>
          <p className="mt-1.5 text-[8.5px] font-extrabold uppercase tracking-[0.09em] text-[#77738D] sm:text-[10px]">{timerCaption}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-2 rounded-[15px] border border-amber-100 bg-amber-50/70 px-3 py-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-amber-600"><Info size={15} /></span>
        <p className="text-[11px] font-semibold leading-snug text-[#4E466A] sm:text-[12px]">
          {extendedReview
            ? <>We needed a little longer on yours. <strong>The timer above shows your current review window.</strong> Nothing more is needed from you.</>
            : overdue
              ? <>We’ve extended the review window. <strong>We’ll keep you updated.</strong> Nothing more is needed from you.</>
              : <>We’ll notify you as soon as your listing goes live. If it takes a little longer, we’ll extend the time and keep you updated.</>}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {onOpenCalendar && <button type="button" onClick={onOpenCalendar} className="flex min-h-[42px] min-w-0 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-violet-700 to-purple-600 px-1.5 text-[10px] font-extrabold text-white shadow-sm transition active:scale-[0.98] sm:text-[11px]">
          <CalendarDays size={14} className="shrink-0" /><span className="whitespace-nowrap">Update calendar</span><ChevronRight size={14} className="shrink-0" />
        </button>}
        {onHowItWorks && <button type="button" onClick={onHowItWorks} className="flex min-h-[42px] min-w-0 items-center justify-center gap-1 rounded-full border border-violet-200 bg-white px-1.5 text-[10px] font-extrabold text-violet-700 transition active:scale-[0.98] sm:text-[11px]">
          <PlayCircle size={14} className="shrink-0" /><span className="whitespace-nowrap">See how it works</span><ChevronRight size={14} className="shrink-0" />
        </button>}
      </div>

      {onOpenListing && listingCount > 0 && <button type="button" onClick={onOpenListing} className="mt-2 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-[15px] border border-slate-100 bg-white px-2.5 text-left transition active:scale-[0.99]">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileSearch size={18} /></span>
          <span className="min-w-0"><span className="block text-[11.5px] font-extrabold">See the listing being reviewed</span>{listingNames && <span className="mt-0.5 block truncate text-[10px] font-medium text-[#77738D]">{listingNames}</span>}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-[#77738D]" />
      </button>}

      {extendedReview && <p className="mt-2 text-[10px] font-semibold text-[#77738D]">Review window extended {extended === 1 ? 'once' : `${extended} times`}{note ? ` · ${note}` : ''}</p>}
      {sent && <p className="mt-2 text-[10px] font-medium text-[#77738D]">{sent}</p>}
    </section>
  )
}
