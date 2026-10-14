import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'
import SambramoWordmark from '../ui/SambramoWordmark'

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
  businessName, fullName = null, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0,
  onAcceptingChange, onOpenProfile, onOpenAlerts,
}) {
  const { wish, dayLine } = useGreeting(fullName)
  return (
    <header className="bg-white text-[#17152B]">
      <div className="px-0 pb-3 pt-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <SambramoWordmark size={22} className="shrink-0" />
            <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-violet-700">Partner</span>
            <span aria-label={acceptingJobs ? 'Online' : 'Offline'} className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${acceptingJobs ? 'bg-emerald-500 ring-emerald-100' : 'bg-slate-300 ring-slate-100'}`} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17152B] shadow-[0_2px_8px_rgba(25,15,50,.06)] transition active:scale-95">
              <Bell size={21} strokeWidth={1.9} />
              {unreadAlerts > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
            </button>
            <button type="button" onClick={onOpenProfile} aria-label="Your account" className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(25,15,50,.06)] transition active:scale-95">
              <PartnerAvatar url={avatarUrl} name={businessName} size={42} shape="square" />
            </button>
          </div>
        </div>
        <p className="mt-4 text-[15px] font-medium leading-tight text-[#77738D] sm:text-[17px]">{wish},</p>
        <h1 className="mt-1 max-w-full truncate text-[27px] font-black leading-[1.04] tracking-[-0.045em] text-[#17152B] sm:text-[36px]">{businessName ?? 'Your business'} <span aria-hidden="true">👋</span></h1>
        <p className="mt-1 text-[15px] font-semibold text-[#77738D] sm:text-[18px]">{dayLine}</p>
        <div className="mt-3">
          <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
        </div>
      </div>
    </header>
  )
}
