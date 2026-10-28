/**
 * Two or three partners of one trade, side by side.
 *
 * Only facts each partner published: their price, rating, distance,
 * whether they book instantly, their advance and cancellation terms. The
 * best value in a row is marked, so the comparison reads in one glance
 * rather than as a table to be studied.
 */
import { Check, Plus } from 'lucide-react'
import { TRADE } from '../data/trades'
import { usePlan } from '../state/PlanContext'
import { rupees } from '../lib/format'
import { Photo, Sheet } from '../ui/kit'

const CANCEL = { flexible: 'Flexible', moderate: 'Moderate', strict: 'Strict' }

export default function CompareSheet({ open, onClose, tradeId, partners, occasionId = null }) {
  const plan = usePlan()
  const t = TRADE[tradeId]
  if (!t) return <Sheet open={false} onClose={onClose} title="" />
  const best = (get, dir = 'min') => {
    const vals = partners.map(get).filter(v => v != null)
    if (vals.length < 2 || new Set(vals).size === 1) return null
    return dir === 'min' ? Math.min(...vals) : Math.max(...vals)
  }
  const rows = [
    { label: 'From', get: p => p.fromPaise, show: p => (p.fromPaise ? <span><span className="cx-num">{rupees(p.fromPaise)}</span><span className="block text-[11px] font-semibold text-[var(--ink-3)]">{p.fromKind === 'package' ? `${p.fromLabel ?? ''} package` : p.fromUnit}</span></span> : '—'),
      win: new Set(partners.map(p => p.fromUnit)).size === 1 ? best(p => p.fromPaise) : null },
    { label: 'Rating', get: p => p.rating, show: p => (p.rating ? <span className="cx-num">★ {p.rating.toFixed(1)}{p.reviews ? <span className="text-[var(--ink-3)]"> ({p.reviews})</span> : null}</span> : 'New'), win: best(p => p.rating, 'max') },
    { label: 'Distance', get: p => p.distanceKm, show: p => (p.distanceKm != null ? <span className="cx-num">{p.distanceKm} km</span> : p.area ?? '—'), win: best(p => p.distanceKm) },
    { label: 'Booking', get: p => (p.instant ? 1 : 0), show: p => (p.instant ? 'Instant' : `Quote${p.quoteHours ? ` in ${p.quoteHours}h` : ''}`), win: partners.some(p => p.instant) && partners.some(p => !p.instant) ? 1 : null },
    { label: 'Pay at booking', get: p => p.advancePct, show: p => (p.advancePct == null ? '—' : p.advancePct >= 100 ? 'In full' : `${p.advancePct}% advance`), win: best(p => p.advancePct) },
    // One policy for every master on Sambramo (customer/data/policies.js) — not a per-listing label that contradicts it.
    { label: 'Cancellation', get: () => null, show: () => 'Sambramo policy · full refund before accepting' },
    { label: 'Experience', get: p => p.years, show: p => (p.years ? `${p.years} yrs` : '—'), win: best(p => p.years, 'max') },
  ]
  return (
    <Sheet open={open} onClose={onClose} title={`Compare ${t.label.toLowerCase()}`}>
      <div className="grid gap-2 pb-2" style={{ gridTemplateColumns: `88px repeat(${partners.length}, minmax(0, 1fr))` }} data-compare>
        <span />
        {partners.map(p => (
          <div key={p.serviceId} className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[var(--brand-tint)]">
              <Photo src={p.cover} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-tight tracking-[-0.015em]">{p.name}</p>
          </div>
        ))}
        {rows.map(r => (
          <div key={r.label} className="contents">
            <span className="flex items-center border-t border-[var(--line)] py-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--ink-3)]">{r.label}</span>
            {partners.map(p => {
              const win = r.win != null && r.get(p) === r.win
              return (
                <span key={p.serviceId} className={'flex items-center border-t border-[var(--line)] py-2.5 text-[13px] font-bold ' + (win ? 'text-[var(--ok)]' : '')}>
                  <span className={'rounded-lg px-1.5 py-0.5 ' + (win ? 'bg-[var(--ok-tint)]' : '')}>{r.show(p)}</span>
                </span>
              )
            })}
          </div>
        ))}
        <span />
        {partners.map(p => {
          const line = plan.lineFor(occasionId, tradeId)
          const added = line?.serviceId === p.serviceId
          return (
            <button key={p.serviceId} type="button" onClick={() => (added ? plan.remove(line.key) : plan.add(p, occasionId))}
              className={'cx-press mt-1 flex h-11 items-center justify-center gap-1 rounded-[14px] text-[13px] font-extrabold ' + (added ? 'bg-[var(--ok-tint)] text-[var(--ok)]' : 'cx-btn ring-1 ring-[var(--am-300)]')}>
              {added ? <><Check size={15} strokeWidth={3} />Added</> : <><Plus size={15} strokeWidth={3} />Add</>}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
