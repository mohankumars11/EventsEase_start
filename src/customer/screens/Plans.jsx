/**
 * Plans — everything in flight. A celebration being planned is a card with
 * how far along it is and the one next thing to do.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlan, needsFor } from '../state/PlanContext'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { photoFor } from '../data/photos.generated'
import { countdown, dayLabel, plural } from '../lib/format'
import { Empty, Photo } from '../ui/kit'

export default function Plans() {
  const { user } = useAuth()
  const plan = usePlan()
  const ids = [...new Set([plan.event.occasionId, ...plan.basket.map(l => l.occasionId)].filter(Boolean))]
  const solo = plan.basket.filter(l => !l.occasionId)
  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <header className="cx-safe-top px-4 pb-2">
        <h1 className="cx-display mt-3 text-[34px]">Plans</h1>
        <p className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">Every celebration you are planning, and how far along it is.</p>
      </header>

      {!ids.length && !solo.length && (
        <div className="mt-6"><Empty title="Nothing planned yet" body="Choose an occasion and Sambramo lays out exactly what it needs."
          action={<Link to="/" className="cx-press cx-cta inline-flex h-12 items-center rounded-[16px] px-5 text-[14px] font-extrabold">Start planning</Link>} /></div>
      )}

      {ids.length > 0 && <h2 className="px-4 pb-2 pt-4 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">In progress</h2>}
      <div className="space-y-3 px-4">
        {ids.map(id => {
          const o = OCCASION[id]
          if (!o) return null
          const p = photoFor(o.id) ?? photoFor(`cat:${o.category}`)
          const ev = plan.event.occasionId === id ? plan.event : { venue: 'need' }
          const { needed } = needsFor(o, plan.picks[id] ?? {}, ev)
          const picked = needed.filter(t => plan.lineFor(id, t))
          const next = needed.find(t => !plan.lineFor(id, t))
          const pct = needed.length ? Math.round((picked.length / needed.length) * 100) : 0
          const when = plan.event.date && plan.event.occasionId === id ? countdown(plan.event.date) : null
          return (
            <Link key={id} to={next ? `/o/${id}/match` : '/plan'} className="cx-card cx-press block overflow-hidden" data-plan-card={id}>
              <div className="relative aspect-[16/9] overflow-hidden" style={{ background: p?.tone ?? '#EDE7F8' }}>
                <Photo src={p?.url} alt={p?.alt} className="absolute inset-0 h-full w-full object-cover" />
                {when && <span className="cx-glass absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold">{when}</span>}
              </div>
              <div className="p-4">
                <p className="text-[19px] font-extrabold tracking-[-0.03em]">{o.name}</p>
                <p className="mb-3 mt-0.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ink-3)]"><CalendarDays size={13} />{plan.event.date && plan.event.occasionId === id ? dayLabel(plan.event.date) : 'Date not set'}</p>
                <div className="flex items-center justify-between text-[12.5px] font-extrabold">
                  <span>{picked.length} of {plural(needed.length, 'service')} chosen</span><span className="cx-num text-[var(--brand)]">{pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--soft)]"><div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#5B21C8] transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                <p className="mt-3 flex items-center justify-between text-[13.5px] font-extrabold">
                  <span>{next ? `Next: pick ${TRADE[next].label.toLowerCase()}` : 'Ready to review and pay'}</span><ArrowRight size={17} className="text-[var(--brand)]" />
                </p>
              </div>
            </Link>
          )
        })}
        {solo.length > 0 && (
          <Link to="/plan" className="cx-card cx-press flex items-center gap-3 p-3">
            <span className="flex -space-x-3">{solo.slice(0, 3).map(l => <span key={l.key} className="relative h-12 w-12 overflow-hidden rounded-[15px] ring-2 ring-white"><Photo src={l.cover} className="absolute inset-0 h-full w-full object-cover" /></span>)}</span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold">Single services</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">{plural(solo.length, 'partner')} picked</span></span>
            <ArrowRight size={18} className="text-[var(--brand)]" />
          </Link>
        )}
      </div>

      <h2 className="px-4 pb-2 pt-8 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Booked</h2>
      <p className="mx-4 rounded-[20px] bg-[var(--soft)] px-4 py-4 text-[13px] font-semibold leading-relaxed text-[var(--ink-2)]">
        {user ? 'Bookings you confirm appear here with live status from each partner, the payments, and the day’s timeline.' : 'Sign in at checkout and every booking you confirm appears here, with live status from each partner.'}
      </p>
    </main>
  )
}
