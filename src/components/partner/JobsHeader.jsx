import { useEffect, useState } from 'react'
import { Bell, BadgeCheck } from 'lucide-react'
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
  const live = lifecycle === LIFECYCLE.LIVE

  return (
    <header className="partner-v2-topbar rounded-b-[22px]">
      <div className="partner-v2-topbar-inner min-h-[72px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[18px] font-black tracking-[-0.04em] text-plum-950">SAMBRAMO</span>
            {live && <BadgeCheck size={14} className="shrink-0 text-forest-600" aria-label="Verified partner" />}
            <span className="partner-v2-chip bg-plum-50 text-plum-700">PARTNER</span>
          </div>
          <p className="mt-1 truncate text-[13px] font-bold text-ink-soft">{wish}, {businessName ?? 'your business'}</p>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-ink-mute">{dayLine}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
          <button
            type="button"
            onClick={onOpenAlerts}
            aria-label={unreadAlerts ? 'Alerts and updates, ' + unreadAlerts + ' unread' : 'Alerts and updates'}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft ring-1 ring-ink/[0.09] shadow-sm active:bg-ink/[0.03]"
          >
            <Bell size={18} />
            {unreadAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Your account"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-ink/[0.09] shadow-sm"
          >
            <PartnerAvatar url={avatarUrl} name={businessName} size={38} shape="circle" />
          </button>
        </div>
      </div>
    </header>
  )
}
