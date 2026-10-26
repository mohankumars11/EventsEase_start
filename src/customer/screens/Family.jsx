/** One service family (Photography = photographers + videographers): its trades, then masters. */
import { Navigate, useParams } from 'react-router-dom'
import { FAMILY } from '../data/families'
import { BackHeader } from '../ui/kit'
import { ServiceCard } from '../ui/art'

export default function Family() {
  const f = FAMILY[useParams().familyId]
  if (!f) return <Navigate to="/s" replace />
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title={f.label} sub={f.line} />
      <p className="px-4 pb-3 text-[13px] font-semibold text-[var(--ink-3)]">Pick what you need — the masters for it are ready to book.</p>
      <div className="grid grid-cols-3 gap-2 px-3">{f.trades.map(t => <ServiceCard key={t} tradeId={t} />)}</div>
    </main>
  )
}
