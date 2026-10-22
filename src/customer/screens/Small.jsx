/** The three small screens: saved partners, notifications, and all services. */
import { Link } from 'react-router-dom'
import { BellRing } from 'lucide-react'
import { usePlan } from '../state/PlanContext'
import { TRADE_GROUPS } from '../data/trades'
import { BackHeader, Empty, PlanBar, SectionHead } from '../ui/kit'
import { PartnerCard, TradeTile } from '../ui/cards'

export function Saved() {
  const plan = usePlan()
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title="Saved partners" sub={plan.saved.length ? `${plan.saved.length} saved` : null} />
      {!plan.saved.length && <div className="pt-6"><Empty title="Nothing saved yet" body="Tap the heart on any partner to keep them here."
        action={<Link to="/" className="font-extrabold text-[var(--brand)]">Browse partners</Link>} /></div>}
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
  return (
    <main className="cx-enter">
      <BackHeader title="Notifications" />
      <div className="px-4 pt-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[var(--brand-tint)]"><BellRing size={26} className="text-[var(--brand)]" /></span>
        <p className="mt-4 text-[17px] font-extrabold tracking-[-0.02em]">You are all caught up</p>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-[var(--ink-2)]">Quotes, confirmations and reminders for your event appear here — and on your phone, once you allow notifications.</p>
      </div>
    </main>
  )
}

export function Services() {
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title="All services" sub="34 kinds of partner, all verified" />
      {TRADE_GROUPS.map(g => (
        <section key={g.id} className="mt-3">
          <SectionHead title={g.label} />
          <div className="grid grid-cols-3 gap-2.5 px-4">{g.trades.map(t => <TradeTile key={t.id} tradeId={t.id} />)}</div>
        </section>
      ))}
      <PlanBar />
    </main>
  )
}
