import { useEffect, useState } from 'react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import { Bell, CalendarDays, ChevronRight, Sparkles } from 'lucide-react'
import { LIFECYCLE } from '../../lib/partnerOnboarding'
import { useReviewClock } from './ReviewCountdown'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'

/**
 * Jobs home hero.
 *
 * This component owns the complete visual header of the Jobs tab. It keeps
 * every existing action and data source intact while presenting the partner,
 * availability state, alerts and review state as one premium surface.
 */
const STATE = {
  [LIFECYCLE.LIVE]: {
    label: 'Live',
    dot: 'bg-emerald-400',
    tone: 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/30',
  },
  [LIFECYCLE.UNDER_REVIEW]: {
    label: 'Under review',
    dot: 'bg-amber-300',
    tone: 'bg-amber-300/15 text-amber-100 ring-amber-200/30',
  },
  [LIFECYCLE.REQUIRES_ACTION]: {
    label: 'Action needed',
    dot: 'bg-rose-400',
    tone: 'bg-rose-400/15 text-rose-100 ring-rose-300/30',
  },
  [LIFECYCLE.ONBOARDING]: {
    label: 'Setting up',
    dot: 'bg-white/50',
    tone: 'bg-white/10 text-white/80 ring-white/20',
  },
}

function useGreeting(fullName) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer
    const arm = () => {
      const at = new Date()
      setNow(at)
      timer = setTimeout(arm, msUntilNextBand(at) + 1000)
    }
    timer = setTimeout(arm, msUntilNextBand(new Date()) + 1000)
    return () => clearTimeout(timer)
  }, [])

  return greetingFor({ fullName, date: now })
}

export default function JobsHeader({
  lifecycle,
  businessName,
  fullName = null,
  vendorId,
  avatarUrl,
  acceptingJobs,
  unreadAlerts = 0,
  reviewDueAt = null,
  reviewSubmittedAt = null,
  onAcceptingChange,
  onOpenProfile,
  onOpenAlerts,
}) {
  const s = STATE[lifecycle] ?? STATE[LIFECYCLE.ONBOARDING]
  const { wish, dayLine } = useGreeting(fullName)
  const { left, words } = useReviewClock({
    dueAt: lifecycle === LIFECYCLE.UNDER_REVIEW ? reviewDueAt : null,
    submittedAt: reviewSubmittedAt,
  })

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#16002f] via-[#2A085C] to-[#4c1d95] px-4 pb-5 pt-[calc(12px+env(safe-area-inset-top,0px))] text-white sm:px-6">
      {/* Ambient cinematic light */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-28 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex overflow-hidden text-[15px] font-black uppercase tracking-[0.24em] text-white">
                SAMBRAMO
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-8 w-7 skew-x-[-20deg] bg-white/35 blur-[3px] motion-safe:animate-sheen" />
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-100 backdrop-blur-sm">
                Partner
              </span>
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${acceptingJobs ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-white/30'}`}
              />
            </div>

            <p className="mt-4 text-[13px] font-semibold text-violet-100/85">{wish}</p>
            <h1 className="mt-0.5 truncate text-[25px] font-black leading-tight tracking-[-0.03em]">
              {businessName ?? 'Your business'}
            </h1>
            <p className="mt-1 text-[12.5px] font-semibold text-violet-200/80">{dayLine}</p>

            <div className="mt-3">
              <OnlineToggle
                vendorId={vendorId}
                initial={acceptingJobs}
                onChange={onAcceptingChange}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={onOpenAlerts}
              aria-label={unreadAlerts
                ? `Alerts and updates, ${unreadAlerts} unread`
                : 'Alerts and updates'}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition active:scale-95"
            >
              <Bell size={20} strokeWidth={2.2} />
              {unreadAlerts > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-[#2A085C]">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              aria-label="Your account"
              className="rounded-2xl ring-2 ring-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition active:scale-95"
            >
              <PartnerAvatar url={avatarUrl} name={businessName} size={44} shape="square" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-white/15 bg-white/[0.08] px-3.5 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
              <span className="text-[13px] font-black">{s.label}</span>
              {words && (
                <span className="truncate text-[11px] font-bold tabular-nums text-violet-100/75">{words}</span>
              )}
            </div>
            {!words && (
              <p className="mt-1 text-[10.5px] font-semibold text-violet-100/60">
                {s.label === 'Live' ? 'Ready to receive new opportunities' : s.label === 'Action needed' ? 'Something needs your attention' : 'We will keep you updated'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[10.5px] font-extrabold text-white ring-1 ring-white/15 transition active:scale-95"
          >
            View status <ChevronRight size={13} />
          </button>
        </div>

        {/* Lightweight visual cue that this is an event-operations home,
            not a generic account screen. No new navigation or interaction. */}
        <div aria-hidden="true" className="mt-4 flex items-center gap-2 text-violet-100/55">
          <Sparkles size={13} />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Your celebrations, moving forward</span>
          <CalendarDays size={13} className="ml-auto" />
        </div>
      </div>
    </header>
  )
}
