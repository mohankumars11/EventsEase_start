import { useEffect, useState } from 'react'
import { Bell, CalendarDays, ChevronRight, Gift, PartyPopper, Users } from 'lucide-react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import { LIFECYCLE } from '../../lib/partnerOnboarding'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'

const STATE = {
  [LIFECYCLE.LIVE]: { label: 'Live', dot: 'bg-emerald-300', tone: 'text-emerald-100' },
  [LIFECYCLE.UNDER_REVIEW]: { label: 'Under review', dot: 'bg-yellow-300', tone: 'text-yellow-50' },
  [LIFECYCLE.REQUIRES_ACTION]: { label: 'Action needed', dot: 'bg-rose-300', tone: 'text-rose-50' },
  [LIFECYCLE.ONBOARDING]: { label: 'Setting up', dot: 'bg-white/50', tone: 'text-white/85' },
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

function HeroArtwork() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[-4px] h-[128px] w-[58%] max-w-[190px] sm:right-[3%] sm:h-[165px] sm:max-w-[250px]">
      <div className="absolute inset-x-0 bottom-2 h-16 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="absolute right-1 top-7 w-[88%] rotate-[-6deg] rounded-[20px] border-2 border-fuchsia-300/80 bg-gradient-to-br from-violet-300/90 via-fuchsia-300/75 to-violet-700/95 p-2 shadow-[0_18px_45px_rgba(0,0,0,.35),0_0_34px_rgba(168,85,247,.75)]">
        <div className="absolute -top-5 left-[18%] h-11 w-4 rounded-full border-4 border-fuchsia-100 bg-violet-950" />
        <div className="absolute -top-5 left-[48%] h-11 w-4 rounded-full border-4 border-fuchsia-100 bg-violet-950" />
        <div className="absolute -top-5 right-[18%] h-11 w-4 rounded-full border-4 border-fuchsia-100 bg-violet-950" />
        <div className="rounded-[14px] bg-white/95 p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <span key={i} className="flex h-5 items-center justify-center rounded-md bg-violet-50">
                <span className="h-1.5 w-5 rounded-full bg-violet-700" />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute left-[2%] bottom-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-xl rotate-[7deg]">
        <Gift size={21} className="text-fuchsia-500" />
      </div>
      <div className="absolute left-[18%] bottom-[-2px] flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_0_25px_rgba(124,58,237,.8)]">
        <Users size={20} />
      </div>
      <div className="absolute right-[-2px] bottom-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500 text-white shadow-[0_0_25px_rgba(217,70,239,.75)]">
        <PartyPopper size={20} />
      </div>
      <div className="absolute left-[18%] top-12 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-2xl shadow-[0_0_30px_rgba(168,85,247,.8)]">
        <span>🔔</span>
      </div>
      <span className="absolute right-[2%] top-0 rotate-[5deg] rounded-2xl border border-white/20 bg-violet-800/85 px-2 py-1.5 text-center text-[8px] font-black leading-tight text-white shadow-xl sm:text-[10px]">
        Let’s create<br />more celebrations<br />together!
      </span>
      <span className="absolute left-[5%] top-5 text-base text-yellow-200 drop-shadow-[0_0_12px_rgba(253,224,71,.9)]">✦</span>
      <span className="absolute right-[38%] top-1 text-sm text-yellow-200 drop-shadow-[0_0_12px_rgba(253,224,71,.9)]">✦</span>
    </div>
  )
}

export default function JobsHeader({
  lifecycle, businessName, fullName = null, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0,
  reviewDueAt = null, reviewSubmittedAt = null,
  onAcceptingChange, onOpenProfile, onOpenAlerts,
}) {
  const state = STATE[lifecycle] ?? STATE[LIFECYCLE.ONBOARDING]
  const { wish, dayLine } = useGreeting(fullName)
  const underReview = lifecycle === LIFECYCLE.UNDER_REVIEW

  return (
    <header className="relative isolate overflow-hidden bg-gradient-to-br from-[#10052F] via-[#24105F] to-[#4B0B78] text-white">
      <div className="relative min-h-[195px] overflow-hidden px-4 pb-2 pt-[calc(8px+env(safe-area-inset-top,0px))] sm:min-h-[220px] sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(168,85,247,.35),transparent_25%),radial-gradient(circle_at_45%_85%,rgba(236,72,153,.22),transparent_32%)]" />
        <div className="relative z-20 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative text-[24px] font-black uppercase tracking-[-0.05em] drop-shadow-[0_0_16px_rgba(255,255,255,.35)] sm:text-[30px]">
                SAMBRAMO
                <span aria-hidden="true" className="absolute -bottom-2 left-0 h-1.5 w-[88%] -skew-x-[24deg] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-transparent shadow-[0_0_14px_rgba(168,85,247,.9)]" />
              </span>
              <span className="rounded-full border border-fuchsia-300/45 bg-fuchsia-500/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] sm:text-[11px]">PARTNER</span>
              <span className={`h-3 w-3 shrink-0 rounded-full ring-4 ring-emerald-400/10 ${acceptingJobs ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.85)]' : 'bg-white/30'}`} />
            </div>

            <p className="mt-4 text-[16px] font-semibold leading-tight text-violet-100 sm:text-[19px]">{wish},</p>
            <h1 className="mt-1 max-w-[290px] truncate text-[27px] font-black leading-none tracking-[-0.04em] sm:max-w-[520px] sm:text-[38px]">
              {businessName ?? 'Your business'} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-[16px] font-bold text-violet-100/90 sm:text-[20px]">{dayLine}</p>

            <div className="mt-4">
              <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
            </div>
          </div>

          <div className="relative z-30 flex shrink-0 items-start gap-2">
            <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-fuchsia-300/50 bg-violet-950/55 shadow-[0_0_24px_rgba(168,85,247,.6)] backdrop-blur sm:h-12 sm:w-12">
              <Bell size={24} className="text-white sm:h-7 sm:w-7" />
              {unreadAlerts > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-[#24105F]">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
            </button>
            <button type="button" onClick={onOpenProfile} aria-label="Your account" className="rounded-[12px] border-2 border-fuchsia-300/70 shadow-[0_0_20px_rgba(168,85,247,.5)]">
              <PartnerAvatar url={avatarUrl} name={businessName} size={48} shape="square" />
            </button>
          </div>
        </div>

        <HeroArtwork />

        <div className="absolute bottom-2 left-3 right-3 z-30 sm:left-6 sm:right-6">
          <button type="button" onClick={onOpenProfile} data-partner-state={lifecycle} className="flex w-full items-center gap-3 rounded-[18px] border border-yellow-200/70 bg-gradient-to-r from-[#FFF8D9] via-[#FFF4C2] to-[#FFE58A] px-3 py-2.5 text-left text-[#16205C] shadow-[0_12px_30px_rgba(0,0,0,.18)] sm:px-5 sm:py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD83D] shadow-inner sm:h-14 sm:w-14"><span className="text-xl">◷</span></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[18px] font-black leading-tight text-[#16205C] sm:text-[23px]">{state.label}</span>
              <span className="mt-0.5 block text-[11px] font-semibold leading-tight text-[#46506F] sm:text-[14px]">
                {underReview ? 'Your listing is being reviewed by our team.' : state.label === 'Live' ? 'Your profile is live and ready for opportunities.' : state.label === 'Action needed' ? 'Something needs your attention.' : 'Finish setup to receive opportunities.'}
              </span>
            </span>
            {underReview && <span className="hidden shrink-0 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black text-[#7B3F00] shadow-sm sm:block">Taking a little longer <ChevronRight size={18} className="inline-block align-middle" /></span>}
            {!underReview && <span className="shrink-0"><ChevronRight size={18} /></span>}
          </button>
        </div>
      </div>
    </header>
  )
}
