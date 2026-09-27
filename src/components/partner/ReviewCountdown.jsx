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
  const [detailsOpen, setDetailsOpen] = useState(false)

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
    <div className={`mb-3 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#FFF9E8] via-[#FFF4C9] to-[#FFE89A] px-4 py-4 shadow-[0_8px_26px_rgba(121,83,8,.12)] ring-1 ring-amber-200 ${compact ? 'mb-0' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE98A] to-[#FFC928] shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_5px_14px_rgba(202,145,0,.18)]">
          <Clock3 size={34} strokeWidth={2.5} className="text-[#111111]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[21px] font-black leading-none tracking-[-0.035em] text-[#12235C] sm:text-[27px]">Under review</p>
          <p className="mt-1 text-[12px] font-semibold leading-snug text-[#59657E] sm:text-[15px]">Your listing is being reviewed by our team.</p>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(v => !v)}
          aria-expanded={detailsOpen}
          className="flex min-h-[56px] shrink-0 items-center gap-3 rounded-full bg-white/75 px-4 text-left text-[12px] font-black text-[#7A351D] shadow-[0_3px_12px_rgba(115,72,8,.08)] ring-1 ring-white/90 sm:min-w-[245px] sm:px-6 sm:text-[17px]"
        >
          <span className="min-w-0">{overdue ? 'Taking a little longer' : left ? `${left.hours}h ${String(left.minutes).padStart(2, '0')}m left` : 'Review status'}</span>
          <ChevronRight size={22} className={`shrink-0 transition-transform ${detailsOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-3 rounded-[18px] bg-white/70 p-3.5 ring-1 ring-white/90">
          <div className="flex items-center gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <ReviewDial {...dial} label={null} size={60} />
              <span className="absolute text-[9px] font-black tabular-nums">{left && !overdue ? `${left.hours}h ${String(left.minutes).padStart(2, '0')}m` : elapsed ? `${elapsed.hours}h ${String(elapsed.minutes).padStart(2, '0')}m` : '24h'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-plum-950">{overdue ? 'We need a little more time.' : 'We’re reviewing your profile.'}</p>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-plum-950/70">
                {extendedReview
                  ? <>We needed a little longer on yours. <strong>The new timer above is the current review window.</strong> Nothing more is needed from you.</>
                  : overdue
                    ? <>We’ve extended the review window. <strong>We’ll keep you updated.</strong> Nothing more is needed from you.</>
                    : <>We’ll notify you as soon as your listing goes live. If it takes a little longer, we’ll automatically extend the time and keep you updated.</>}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {onOpenCalendar && <button type="button" onClick={onOpenCalendar} className="flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-plum-950 px-3 text-[11px] font-black text-white"><CalendarDays size={15} />Update calendar<ChevronRight size={14} className="ml-auto" /></button>}
            {onHowItWorks && <button type="button" onClick={onHowItWorks} className="flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-white px-3 text-[11px] font-black text-plum-950 ring-1 ring-plum-100"><PlayCircle size={15} fill="currentColor" />See how it works<ChevronRight size={14} className="ml-auto" /></button>}
          </div>

          {onOpenListing && listingCount > 0 && <button type="button" onClick={onOpenListing} className="mt-2 flex min-h-[46px] w-full items-center justify-between rounded-[15px] bg-white px-3 text-left ring-1 ring-slate-100">
            <span className="flex min-w-0 items-center gap-2"><FileSearch size={16} className="text-violet-700" /><span className="min-w-0"><span className="block text-[11px] font-black">See the listing being reviewed</span>{listingNames && <span className="block truncate text-[10px] font-semibold text-ink-mute">{listingNames}</span>}</span></span>
            <ChevronRight size={15} className="shrink-0 text-ink-mute" />
          </button>}

          {extendedReview && <p className="mt-2 text-[10px] font-bold text-plum-950/60">Review window extended {extended === 1 ? 'once' : `${extended} times`}{note ? ` · ${note}` : ''}</p>}
          {sent && <p className="mt-1 text-[10px] font-semibold text-plum-950/50">{sent}</p>}
          <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-plum-950/45"><Info size={12} />Tap the banner above to collapse these details.</p>
        </div>
      )}
    </div>
  )
}
