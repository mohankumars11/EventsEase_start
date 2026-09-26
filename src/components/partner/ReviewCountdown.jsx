import { useEffect, useState } from 'react'
import ReviewDial from './ReviewDial'
import { BadgeCheck, CalendarDays, ChevronRight, Clock3, FileSearch, Info, PlayCircle, TriangleAlert, X } from 'lucide-react'

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

export function useReviewClock({ dueAt, submittedAt }) {
  const [now, setNow] = useState(() => Date.now())
  const left = dueAt ? remaining(dueAt, now) : null
  const ticking = !!dueAt || !!submittedAt
  const insideLastHour = !!left && !left.over && left.ms < 3_600_000

  useEffect(() => {
    if (!ticking) return undefined
    const step = insideLastHour || left?.over ? 1000 : 60_000
    const id = setInterval(() => setNow(Date.now()), step)
    return () => clearInterval(id)
  }, [ticking, insideLastHour, left?.over])

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
  if (dueAt && submittedAt) {
    const start = new Date(submittedAt).getTime()
    const end = new Date(dueAt).getTime()
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
  const { left, elapsed, dial } = useReviewClock({ dueAt, submittedAt })

  if (status === 'approved') {
    return (
      <div className={`flex items-center gap-2.5 rounded-[18px] bg-forest-50 px-3.5 py-3 ring-1 ring-forest-200 ${compact ? '' : 'mb-4'}`}>
        <BadgeCheck size={16} className="shrink-0 text-forest-700" />
        <p className="text-[12.5px] font-extrabold leading-snug text-forest-900">You are approved and live. Jobs will start reaching you.</p>
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

  return (
    <div className={`mb-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-yellow-300 via-amber-300 to-yellow-400 px-4 py-4 text-plum-950 shadow-[0_10px_30px_rgba(83,50,0,0.14)] ring-1 ring-yellow-500/50 ${compact ? 'mb-0' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[12.5px] font-black">
            <Clock3 size={16} className="shrink-0" />
            With our team
          </p>

          <h2 className="mt-1 text-[28px] font-black leading-[0.94] tracking-[-0.04em]">
            {overdue ? <>We need a<br />little more time.</> : <>We’re reviewing<br />your profile</>}
          </h2>

          <p className="mt-2 max-w-[250px] text-[12px] font-semibold leading-snug text-plum-950/80">
            {overdue
              ? 'Your review is taking a little longer than expected. We will keep you updated.'
              : 'Our team is verifying your details and listed services. This usually takes up to 24 hours.'}
          </p>
        </div>

        <div className="relative flex h-[116px] w-[116px] shrink-0 items-center justify-center rounded-full">
          <div className="absolute inset-0 rounded-full bg-white/35 blur-[1px]" />
          <div className="relative flex h-[110px] w-[110px] items-center justify-center rounded-full bg-yellow-200/30 ring-1 ring-white/60">
            <ReviewDial {...dial} label={null} size={104} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[15px] font-black tabular-nums leading-none">
                {left && !overdue
                  ? `${left.hours}h ${String(left.minutes).padStart(2, '0')}m`
                  : elapsed
                    ? `${elapsed.hours}h ${String(elapsed.minutes).padStart(2, '0')}m`
                    : '24h'}
              </span>
              <span className="mt-1 text-[9.5px] font-extrabold uppercase tracking-wide text-plum-950/65">
                {overdue ? 'elapsed' : 'remaining'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-[17px] bg-white/75 px-3 py-2.5 ring-1 ring-white/70">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm">
          <Info size={14} />
        </span>
        <p className="text-[11px] font-bold leading-snug text-plum-950/80">
          {extendedReview
            ? <>We needed a little longer on yours. <strong>The new timer above is the current review window.</strong> Nothing more is needed from you.</>
            : overdue
              ? <>We’ve extended the review window. <strong>We’ll keep you updated.</strong> Nothing more is needed from you.</>
              : <>We’ll notify you as soon as your listing goes live. If it takes a little longer, we’ll automatically extend the time and keep you updated.</>}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-plum-950 px-3 text-[12.5px] font-black text-white shadow-sm transition active:scale-[0.98]"
          >
            <CalendarDays size={16} />
            Update calendar
            <span className="ml-auto"><ChevronRight size={15} /></span>
          </button>
        )}

        {onHowItWorks && (
          <button
            type="button"
            onClick={onHowItWorks}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-white/80 px-3 text-[12.5px] font-black text-plum-950 shadow-sm ring-1 ring-white transition active:scale-[0.98]"
          >
            <PlayCircle size={17} fill="currentColor" className="text-plum-900" />
            See how it works
            <ChevronRight size={15} className="ml-auto" />
          </button>
        )}
      </div>

      {onOpenListing && listingCount > 0 && (
        <button
          type="button"
          onClick={onOpenListing}
          className="mt-2 flex min-h-[58px] w-full items-center justify-between gap-2 rounded-[17px] bg-white/80 px-3 text-left shadow-sm ring-1 ring-white transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FileSearch size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-black">See the listing being reviewed</span>
              {listingNames && <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-ink-mute">{listingNames}</span>}
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-ink-mute" />
        </button>
      )}

      {extendedReview && (
        <p className="mt-2 text-[10.5px] font-bold text-plum-950/65">
          Review window extended {extended === 1 ? 'once' : `${extended} times`}{note ? ` · ${note}` : ''}
        </p>
      )}

      {sent && <p className="mt-2 text-[10.5px] font-semibold text-plum-950/60">{sent}</p>}
    </div>
  )
}
