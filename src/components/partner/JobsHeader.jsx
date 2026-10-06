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
    return (
    <header className="bg-white border-b border-ink/[0.08]">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-3 pt-[calc(10px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-black tracking-[-0.04em] text-plum-950">SAMBRAMO</span>
              <span className="rounded-full bg-plum-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-plum-700">Partner</span>
              <span className={`h-2.5 w-2.5 rounded-full ${acceptingJobs ? 'bg-forest-600' : 'bg-ink/[0.25]'}`} aria-label={acceptingJobs ? 'Available for jobs' : 'Not accepting jobs'} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="sp-touch relative grid place-items-center rounded-full bg-white text-ink ring-1 ring-ink/[0.10] shadow-sm">
              <Bell size={19} />
              {unreadAlerts > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
            </button>
            <button type="button" onClick={onOpenProfile} aria-label="Your account" className="grid h-11 w-11 place-items-center overflow-hidden rounded-full ring-1 ring-ink/[0.10]">
              <PartnerAvatar url={avatarUrl} name={businessName} size={44} shape="circle" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink-mute">{wish}{dayLine ? ' · ' + dayLine : ''}</p>
            <h1 className="mt-1 truncate text-[24px] font-black leading-tight tracking-[-0.035em] text-ink">{businessName ?? 'Your business'}</h1>
          </div>
          <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
        </div>
        {lifecycle === LIFECYCLE.UNDER_REVIEW && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">Your application is under Sambramo review. Job access opens after approval.</p>
        )}
      </div>
    </header>
  )}
