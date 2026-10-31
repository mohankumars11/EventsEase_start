/**
 * Masters of one trade, side by side — as many as the customer picked.
 *
 * A table that scrolls sideways (Mohan, 2026-10-31: "unlimited … a
 * horizontal scrolling comparison table"): the row names stay pinned on
 * the left, each master is a 136px column. Only facts each master
 * published — their base price, rating, distance, how fast they accept,
 * their advance, experience. The best value in a row is marked, so it
 * reads in one glance rather than as a table to be studied.
 */
import { Check, Plus } from 'lucide-react'
import { TRADE } from '../data/trades'
import { usePlan } from '../state/PlanContext'
import { rupees } from '../lib/format'
import { Photo, Sheet } from '../ui/kit'

const COL = 136

export default function CompareSheet({ open, onClose, tradeId, partners, occasionId = null }) {
  const plan = usePlan()
  const t = TRADE[tradeId]
  if (!t) return <Sheet open={false} onClose={onClose} title="" />
  const best = (get, dir = 'min') => {
    const vals = partners.map(get).filter(v => v != null)
    if (vals.length < 2 || new Set(vals).size === 1) return null
    return dir === 'min' ? Math.min(...vals) : Math.max(...vals)
  }
  const unitOf = p => (p.fromKind === 'package' ? `${p.fromLabel ?? ''} package`.trim() : p.fromUnit)
  const rows = [
    { label: 'Base price', get: p => p.fromPaise, show: p => (p.fromPaise ? <span><span className="cx-num">{rupees(p.fromPaise)}</span><span className="block text-[11px] font-semibold text-[var(--ink-3)]">{unitOf(p)}</span></span> : 'On request'),
      win: new Set(partners.map(unitOf)).size === 1 ? best(p => p.fromPaise) : null },
    { label: 'Rating', get: p => p.rating, show: p => (p.rating ? <span className="cx-num">★ {p.rating.toFixed(1)}{p.reviews ? <span className="text-[var(--ink-3)]"> ({p.reviews})</span> : null}</span> : 'New'), win: best(p => p.rating, 'max') },
    { label: 'Distance', get: p => p.distanceKm, show: p => (p.distanceKm != null ? <span className="cx-num">{p.distanceKm} km</span> : p.area ?? '—'), win: best(p => p.distanceKm) },
    { label: 'Accepts', get: p => (p.instant ? 1 : 0), show: p => (p.instant ? 'Within minutes' : `Within ${p.quoteHours ?? 12} h`), win: partners.some(p => p.instant) && partners.some(p => !p.instant) ? 1 : null },
    { label: 'Advance', get: p => p.advancePct, show: p => (p.advancePct == null ? '—' : p.advancePct >= 100 ? 'In full' : `${p.advancePct}%`), win: best(p => p.advancePct) },
    { label: 'Experience', get: p => p.years, show: p => (p.years ? `${p.years} yrs` : '—'), win: best(p => p.years, 'max') },
    // One policy for every master on Sambramo (customer/data/policies.js) — not a per-listing label that contradicts it.
    { label: 'Cancellation', get: () => null, show: () => 'Sambramo policy' },
  ]
  const cell = 'flex items-center border-t border-[var(--line)] px-2 py-2.5 text-[13px] font-bold'
  const head = 'sticky left-0 z-[1] bg-white pr-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--ink-3)]'
  return (
    <Sheet open={open} onClose={onClose} title={`Compare ${partners.length} ${t.label.toLowerCase()}`}>
      {partners.length > 2 && <p className="-mt-1 pb-2 text-[11.5px] font-bold text-[var(--ink-3)]">Swipe sideways to see every master →</p>}
      <div className="cx-noscroll -mx-4 overflow-x-auto px-4 pb-2" data-compare data-compare-n={partners.length}>
        <div className="grid" style={{ gridTemplateColumns: `86px repeat(${partners.length}, ${COL}px)`, width: 86 + partners.length * COL }}>
          <span className={head} />
          {partners.map(p => (
            <div key={p.serviceId} className="min-w-0 px-2">
              <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[var(--brand-tint)]">
                <Photo src={p.cover} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <p className="mt-2 line-clamp-2 min-h-[32px] text-[13px] font-extrabold leading-tight tracking-[-0.015em]">{p.name}</p>
            </div>
          ))}
          {rows.map(r => (
            <div key={r.label} className="contents">
              <span className={head + ' flex items-center border-t border-[var(--line)] py-2.5'}>{r.label}</span>
              {partners.map(p => {
                const win = r.win != null && r.get(p) === r.win
                return (
                  <span key={p.serviceId} className={cell + (win ? ' text-[var(--ok)]' : '')}>
                    <span className={'rounded-lg px-1.5 py-0.5 ' + (win ? 'bg-[var(--ok-tint)]' : '')}>{r.show(p)}</span>
                  </span>
                )
              })}
            </div>
          ))}
          <span className={head} />
          {partners.map(p => {
            const line = plan.lineFor(occasionId, tradeId)
            const added = line?.serviceId === p.serviceId
            return (
              <div key={p.serviceId} className="px-2">
                <button type="button" onClick={() => (added ? plan.remove(line.key) : plan.add(p, occasionId))}
                  className={'cx-press mt-1 flex h-11 w-full items-center justify-center gap-1 rounded-[14px] text-[13px] font-extrabold ' + (added ? 'bg-[var(--ok-tint)] text-[var(--ok)]' : 'cx-btn ring-1 ring-[var(--am-300)]')}>
                  {added ? <><Check size={15} strokeWidth={3} />Added</> : <><Plus size={15} strokeWidth={3} />Add</>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
