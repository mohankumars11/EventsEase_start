/**
 * One service: the masters (ui/masters.jsx), three a row, filtered by what
 * the customer needs. Reached from "Book a service" (no occasion) or from
 * an occasion (`?o=`), where the pick lands in that occasion's plan.
 *
 * Every other service sits behind a tab on the left edge, as on the
 * celebration's Find Masters screen (Mohan, 2026-10-31): tap it and the
 * rail slides in — this service's group first (Catering, Drinks & ice
 * cream, Cakes & desserts), then every other group — so the masters keep
 * the full width.
 */
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { TRADE, TRADE_GROUPS } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { serviceArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { BackHeader, Journey, PlanBar } from '../ui/kit'
import { ArtFill } from '../ui/art'
import { MastersPanel } from '../ui/masters'
import { OfferStrip } from '../ui/offers'

export default function Trade() {
  const { tradeId } = useParams()
  const [q] = useSearchParams()
  const occasion = OCCASION[q.get('o')] ?? null
  const t = TRADE[tradeId]
  const plan = usePlan()
  const [rail, setRail] = useState(false)
  useEffect(() => { setRail(false); window.scrollTo({ top: 0 }) }, [tradeId])
  if (!t) return <Navigate to="/" replace />
  const occId = occasion?.id ?? null
  const mine = TRADE_GROUPS.find(g => g.trades.some(x => x.id === tradeId))
  const groups = mine ? [mine, ...TRADE_GROUPS.filter(g => g !== mine)] : TRADE_GROUPS
  const guests = occasion && plan.event.occasionId === occasion.id ? plan.event.guests : null
  const href = id => `/s/${id}${occId ? `?o=${occId}` : ''}`

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title={t.label} sub={occasion ? `For your ${occasion.name}` : t.why} />
      <Journey flow={occasion ? 'celebration' : 'service'} at={occasion ? 3 : 1} occasionId={occId} tradeId={tradeId} />
      <OfferStrip className="mx-3 mb-2.5" />

      {/* This service's siblings, one tap away, without the rail. */}
      {mine && mine.trades.length > 1 && (
        <div className="cx-noscroll mb-2.5 flex gap-1.5 overflow-x-auto px-3" data-sibling-strip>
          {mine.trades.map(x => (
            <Link key={x.id} to={href(x.id)} replace aria-current={x.id === tradeId ? 'page' : undefined}
              className={'flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-extrabold transition ' + (x.id === tradeId ? 'bg-[#1C1033] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>
              <ArtFill art={serviceArt(x.id)} tone="#FFFFFF" className="h-6 w-6 rounded-full" inset="10%" />{x.label}
            </Link>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setRail(true)} className="fixed left-0 top-1/2 z-[125] flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-[14px] bg-[#1C1033]/90 px-1 py-3 text-white shadow-[0_10px_24px_-10px_rgba(28,16,51,.8)]" aria-label="All services" data-rail-tab>
        <span className="cx-num text-[13px] font-black">34</span>
        <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] [writing-mode:vertical-rl]">Services</span>
      </button>
      {rail && <div className="fixed inset-0 z-[160] bg-black/30" onClick={() => setRail(false)} aria-hidden />}
      <nav className={'cx-noscroll fixed bottom-0 left-0 top-0 z-[170] w-[118px] overflow-y-auto bg-white pb-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] shadow-[12px_0_32px_-16px_rgba(28,16,51,.5)] transition-transform duration-300 ' + (rail ? 'translate-x-0' : '-translate-x-full')} aria-label="All services" data-rail={rail ? 'open' : 'closed'}>
        {groups.map(g => (
          <div key={g.id} className="pb-1">
            <p className="px-2 pb-1 pt-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-[0.1em] text-[var(--ink-3)]">{g.chip ?? g.label}</p>
            {g.trades.map(x => {
              const on = x.id === tradeId
              return (
                <Link key={x.id} to={href(x.id)} replace aria-current={on ? 'page' : undefined} className="relative flex w-full flex-col items-center gap-1 px-1 py-2 text-center" data-side={x.id}>
                  {on && <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l-full bg-[#0C831F]" />}
                  <ArtFill art={serviceArt(x.id)} tone={on ? '#E9F8EF' : '#F7F4FB'} className={'h-[50px] w-[50px] rounded-full ' + (on ? 'ring-2 ring-[#16A34A]' : '')} inset="14%" />
                  <span className={'text-[10.5px] leading-tight ' + (on ? 'font-extrabold text-[var(--ink)]' : 'font-semibold text-[var(--ink-2)]')}>{x.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
        <Link to="/s" className="mx-2 mt-2 flex items-center justify-center gap-0.5 rounded-[12px] bg-[#F4EEFF] py-2 text-[11px] font-extrabold text-[var(--brand)]">All services<ChevronRight size={13} /></Link>
      </nav>

      <MastersPanel key={tradeId} cols={3} tradeId={tradeId} occasionId={occId} guests={guests} />
      <PlanBar />
    </main>
  )
}
