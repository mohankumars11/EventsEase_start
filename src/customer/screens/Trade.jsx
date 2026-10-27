/**
 * One service: its family down the left (Photography / Videography), and
 * the masters (ui/masters.jsx) on the right, filtered by what the customer
 * needs. Reached from "Book a service" (no occasion) or from an occasion
 * (`?o=`), where the pick lands in that occasion's plan.
 */
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { FAMILIES } from '../data/families'
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
  if (!t) return <Navigate to="/" replace />
  const occId = occasion?.id ?? null
  const family = FAMILIES.find(x => x.trades.includes(tradeId))
  const guests = occasion && plan.event.occasionId === occasion.id ? plan.event.guests : null

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title={t.label} sub={occasion ? `For your ${occasion.name}` : t.why} />
      <Journey flow={occasion ? 'celebration' : 'service'} at={occasion ? 3 : 1} occasionId={occId} tradeId={tradeId} />
      <OfferStrip className="mx-3 mb-2.5" />
      <div className="flex">
        {family && family.trades.length > 1 && (
          <nav className="sticky top-[calc(env(safe-area-inset-top,0px)+60px)] w-[76px] shrink-0 self-start border-r border-[#F1ECF8]" aria-label={family.label}>
            {family.trades.map(id => {
              const on = id === tradeId
              return (
                <Link key={id} to={`/s/${id}${occId ? `?o=${occId}` : ''}`} replace className="relative flex flex-col items-center gap-1 px-1 py-2.5 text-center" aria-current={on ? 'page' : undefined}>
                  {on && <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l-full bg-[#0C831F]" />}
                  <ArtFill art={serviceArt(id)} tone={on ? '#E9F8EF' : '#F6F1FF'} className="h-[52px] w-[52px] rounded-full" inset="14%" />
                  <span className={'text-[10.5px] leading-tight ' + (on ? 'font-extrabold text-[var(--ink)]' : 'font-semibold text-[var(--ink-2)]')}>{TRADE[id].label}</span>
                </Link>
              )
            })}
          </nav>
        )}
        <div className="min-w-0 flex-1"><MastersPanel tradeId={tradeId} occasionId={occId} guests={guests} /></div>
      </div>
      <PlanBar />
    </main>
  )
}
