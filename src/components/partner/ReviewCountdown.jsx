import { useEffect, useState } from 'react'
import ReviewDial from './ReviewDial'
import {
  BadgeCheck, CalendarDays, ChevronRight, Clock3, FileSearch,
  Info, PlayCircle, TriangleAlert,
} from 'lucide-react'

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

export function reviewWording(left) {
  if (!left) return null
  if (left.over) return 'Taking a little longer'
  return `${left.hours}h ${String(left.minutes).padStart(2, '0')}m left`
}

export function useReviewClock({ dueAt, submittedAt, extended = 0 }) {
  const [now, setNow] = useState(() => Date.now())
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
    ? (left.hours >= 1 ? `${left.hours}h` : left.minutes >= 1 ? `${left.minutes}m` : `${left.seconds}s`)
    : elapsed
      ? (elapsed.hours >= 24 ? `${Math.floor(elapsed.hours / 24)}d` : elapsed.hours >= 1 ? `${elapsed.hours}h` : elapsed.minutes >= 1 ? `${elapsed.minutes}m` : `${elapsed.seconds}s`)
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

  if (status === 'approved') {
    return (
      <div className={`flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3 ring-1 ring-emerald-200 ${compact ? '' : 'mb-4'}`}>
        <BadgeCheck size={17} className="shrink-0 text-emerald-700" />
        <p className="text-[12.5px] font-extrabold leading-snug text-emerald-900">You are approved and live. Jobs will start reaching you.</p>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className={`rounded-2xl bg-amber-50 px-3.5 py-3 ring-1 ring-amber-200 ${compact ? '' : 'mb-4'}`}>
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-amber-900">
          <TriangleAlert size={15} className="shrink-0" />
          We need something changed
        </p>
        {note && <p className="mt-1 text-[12px] leading-snug text-slate-700">{note}</p>}
      </div>
    )
  }

  if (status !== 'submitted') return null

  const overdue = !!left?.over
  const extendedReview = extended > 0
  const sent = formatSent(submittedAt)

  return (
    <section className={`mb-3 overflow-hidden rounded-[24px] border border-amber-200/80 bg-gradient-to-br from-[#fffaf0] via-[#fff4cf] to-[#ffe99b] px-3.5 py-3.5 text-[#2A085C] shadow-[0_8px_26px_rgba(67,42,0,0.10)] ${compact ? 'mb-0' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-amber-600 ring-1 ring-white shadow-sm">
            <Clock3 size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-800/75">Sambramo review</p>
            <h2 className="mt-0.5 truncate text-[19px] font-black leading-tight">
              {overdue ? 'Taking a little longer' : 'Your listing is under review'}
            </h2>
          </div>
        </div>

        <div className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center">
          <ReviewDial {...dial} label={null} size={70} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-black tabular-nums leading-none">
              {left && !overdue
                ? `${left.hours}h ${String(left.minutes).padStart(2, '0')}m`
                : elapsed
                  ? `${elapsed.hours}h ${String(elapsed.minutes).padStart(2, '0')}m`
                  : '24h'}
            </span>
            <span className="mt-0.5 text-[7px] font-extrabold uppercase tracking-wide text-[#2A085C]/55">
              {overdue ? 'elapsed' : 'left'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-white/80">
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[11px] font-semibold leading-snug text-slate-700">
            {extendedReview
              ? <>We needed a little longer on yours. <strong>The current review window is shown above.</strong> Nothing more is needed from you.</>
              : overdue
                ? <>We’ve extended the review window. <strong>We’ll keep you updated.</strong> Nothing more is needed from you.</>
                : <>Our team is verifying your details and listed services. We’ll notify you when your listing goes live.</>}
          </p>
        </div>
      </div>

      {(onOpenCalendar || onHowItWorks) && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-[#2A085C] px-3 text-[11.5px] font-black text-white shadow-sm transition active:scale-[0.98]"
            >
              <CalendarDays size={15} />
              Update calendar
              <ChevronRight size={14} className="ml-auto" />
            </button>
          )}
          {onHowItWorks && (
            <button
              type="button"
              onClick={onHowItWorks}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-white/85 px-3 text-[11.5px] font-black text-[#2A085C] ring-1 ring-white shadow-sm transition active:scale-[0.98]"
            >
              <PlayCircle size={15} />
              See how it works
              <ChevronRight size={14} className="ml-auto" />
            </button>
          )}
        </div>
      )}

      {onOpenListing && listingCount > 0 && (
        <button
          type="button"
          onClick={onOpenListing}
          className="mt-2 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-2xl bg-white/85 px-3 text-left ring-1 ring-white shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FileSearch size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11.5px] font-black">See the listing being reviewed</span>
              {listingNames && <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">{listingNames}</span>}
            </span>
          </span>
          <ChevronRight size={15} className="shrink-0 text-slate-500" />
        </button>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {extendedReview && (
          <p className="truncate text-[9.5px] font-bold text-[#2A085C]/55">
            Review window extended {extended === 1 ? 'once' : `${extended} times`}{note ? ` · ${note}` : ''}
          </p>
        )}
        {sent && <p className="ml-auto shrink-0 text-[9.5px] font-semibold text-[#2A085C]/50">{sent}</p>}
      </div>
    </section>
  )
}
