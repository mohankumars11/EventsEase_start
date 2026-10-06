import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import { LIFECYCLE } from '../../lib/partnerOnboarding'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'

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
  lifecycle, businessName, fullName = null, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0,
  reviewDueAt = null, reviewSubmittedAt = null,
  onAcceptingChange, onOpenProfile, onOpenAlerts,
}) {
  const { wish, dayLine } = useGreeting(fullName)

  return (
    <header className="relative isolate overflow-hidden bg-gradient-to-br from-[#10052F] via-[#24105F] to-[#4B0B78] text-white">
      <div className="relative min-h-[185px] overflow-hidden px-4 pb-2 pt-[calc(8px+env(safe-area-inset-top,0px))] sm:min-h-[210px] sm:px-6">
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

      </div>
    </header>
  )
}
