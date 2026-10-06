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
    <header className="bg-white text-ink">
      <div className="partner-content safe-top py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-black tracking-[-0.03em] text-plum-950">SAMBRAMO</span>
              <span className="partner-status-chip primary">PARTNER</span>
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${acceptingJobs ? 'bg-emerald-500' : 'bg-ink/20'}`} />
            </div>
            <p className="mt-2 text-[12.5px] font-semibold text-ink-mute">{wish},</p>
            <h1 className="mt-0.5 truncate text-[20px] font-black leading-tight tracking-[-0.025em] text-ink">{businessName ?? 'Your business'}</h1>
            <p className="mt-1 text-[12px] font-semibold text-ink-mute">{dayLine}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="relative grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-ink/[0.10] shadow-sm active:bg-ink/[0.03]">
              <Bell size={18} className="text-ink-soft" />
              {unreadAlerts > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
            </button>
            <button type="button" onClick={onOpenProfile} aria-label="Your account" className="grid h-11 w-11 place-items-center overflow-hidden rounded-[14px] bg-white ring-1 ring-ink/[0.10] shadow-sm active:bg-ink/[0.03]">
              <PartnerAvatar url={avatarUrl} name={businessName} size={42} shape="square" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-plum-50 px-3 py-2 ring-1 ring-plum-100">
          <div>
            <p className="text-[11px] font-extrabold text-plum-900">{acceptingJobs ? 'Ready to receive jobs' : 'Jobs are paused'}</p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-plum-700/80">{acceptingJobs ? 'Sambramo can match you when your calendar allows.' : 'Turn availability back on when you are ready.'}</p>
          </div>
          <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
        </div>
      </div>
    </header>
}
