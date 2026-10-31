/** The three small screens: saved masters, notifications, and all services. */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { alertsAvailability, enableAlerts } from '../../lib/push'
import { usePlan } from '../state/PlanContext'
import { TRADE_GROUPS } from '../data/trades'
import { BackHeader, Empty, PlanBar } from '../ui/kit'
import { PartnerCard } from '../ui/cards'
import { ServiceCard } from '../ui/art'

export function Saved() {
  const plan = usePlan()
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title="Saved masters" sub={plan.saved.length ? `${plan.saved.length} saved` : null} />
      {!plan.saved.length && <div className="pt-6"><Empty title="Nothing saved yet" body="Tap the heart on any master to keep them here."
        action={<Link to="/" className="font-extrabold text-[var(--brand)]">Browse masters</Link>} /></div>}
      <div className="grid grid-cols-2 gap-3 px-4 pt-1">
        {plan.saved.map(p => (
          <PartnerCard key={p.serviceId} partner={p} saved onSave={x => plan.toggleSaved(x)}
            added={plan.inBasket(p.serviceId)} onAdd={x => plan.add(x, null)} />
        ))}
      </div>
      <PlanBar withTabs={false} />
    </main>
  )
}

export function Notifications() {
  const { user, profile } = useAuth()
  const [state, setState] = useState('idle') // idle | busy | on | off
  const [detail, setDetail] = useState('')
  const avail = alertsAvailability()
  async function turnOn() {
    if (!profile?.id) return
    setState('busy')
    const r = await enableAlerts({ profileId: profile.id, app: 'customer' }).catch(e => ({ ok: false, detail: e.message }))
    setState(r?.ok ? 'on' : 'off')
    setDetail(r?.ok ? '' : r?.scan ?? r?.detail ?? 'Alerts could not be switched on.')
  }
  return (
    <main className="cx-enter">
      <BackHeader title="Notifications" />
      <section className="mx-4 mt-2 rounded-[24px] bg-[var(--am-50)] p-4 ring-1 ring-[var(--am-200)]">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white shadow-sm"><BellRing size={22} className="text-[var(--brand)]" /></span>
          <div className="min-w-0">
            <p className="text-[15.5px] font-extrabold tracking-[-0.02em]">Know the moment it happens</p>
            <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-[var(--ink-2)]">A master sends a quote, accepts your offer, or your payment confirms them — you hear it first.</p>
          </div>
        </div>
        {!user ? <p className="mt-3 text-[12.5px] font-bold text-[var(--ink-3)]">Sign in from Account to turn alerts on.</p>
          : state === 'on' ? <p className="mt-3 flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ok)]"><Check size={16} strokeWidth={3} />Alerts are on for this device</p>
            : avail.ok === false && avail.via === 'web' ? <p className="mt-3 text-[12.5px] font-bold text-[var(--ink-3)]">This browser cannot show alerts. Install the Sambramo app to get them.</p>
              : <button type="button" onClick={turnOn} disabled={state === 'busy'} className="cx-press cx-cta mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-extrabold" data-alerts>
                  {state === 'busy' ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}Turn on alerts
                </button>}
        {detail && <p className="mt-2 text-[12px] font-bold text-[#9B1A2A]">{detail}</p>}
      </section>
      <p className="mx-auto mt-6 max-w-[300px] px-4 text-center text-[12.5px] font-semibold leading-relaxed text-[var(--ink-3)]">Your quotes, confirmations and offers live in Plans — alerts just bring you there.</p>
    </main>
  )
}

export function Services() {
  return (
    <main className="cx-enter min-h-[100dvh] bg-white cx-bottom-pad-bar">
      <header className="cx-safe-top px-3 pb-1">
        <h1 className="pt-2 text-[24px] font-extrabold tracking-[-0.035em]">Book a master</h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">34 services, every master verified · send a request, pay after they accept</p>
      </header>
      {TRADE_GROUPS.map(g => (
        <section key={g.id} className="mt-5">
          <h2 className="px-3 pb-3 text-[17px] font-extrabold tracking-[-0.03em]">{g.label}</h2>
          <div className="grid grid-cols-3 gap-2 px-3">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
        </section>
      ))}
    </main>
  )
}
