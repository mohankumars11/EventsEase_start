/**
 * One trade: every live partner, filterable, comparable, addable.
 *
 * Reached two ways — "Book a service" (no occasion: the partner joins a
 * single-service plan) and from an occasion's row (`?o=`: the partner is
 * picked FOR that occasion). The screen is the same; only where the pick
 * lands differs.
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Check, Scale, X, Zap } from 'lucide-react'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { photoFor } from '../data/photos.generated'
import { usePlan } from '../state/PlanContext'
import { partnersFor, SORTS } from '../lib/market'
import { plural } from '../lib/format'
import { BackHeader, Chip, Empty, Photo, PlanBar, Sheet } from '../ui/kit'
import { PartnerCard, PartnerCardSkeleton } from '../ui/cards'
import CompareSheet from './CompareSheet'

export default function Trade() {
  const { tradeId } = useParams()
  const [q] = useSearchParams()
  const occasion = OCCASION[q.get('o')] ?? null
  const t = TRADE[tradeId]
  const plan = usePlan()
  const [all, setAll] = useState(null)
  const [sort, setSort] = useState('best')
  const [filters, setFilters] = useState({ instant: false, rated: false, near: false })
  const [sortOpen, setSortOpen] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    if (!t) return
    let live = true
    setAll(null)
    partnersFor(tradeId).then(l => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [tradeId, t])

  const list = useMemo(() => {
    if (!all) return null
    const f = all.filter(p => (!filters.instant || p.instant) && (!filters.rated || (p.rating ?? 0) >= 4.5) && (!filters.near || (p.distanceKm ?? 99) <= 8))
    return SORTS[sort].fn(f)
  }, [all, filters, sort])

  if (!t) return <Navigate to="/" replace />
  const p = photoFor(`trade:${tradeId}`)
  const occId = occasion?.id ?? null
  const line = plan.lineFor(occId, tradeId)
  const toggle = k => setFilters(f => ({ ...f, [k]: !f[k] }))
  const pick = x => setPicked(s => (s.some(y => y.serviceId === x.serviceId) ? s.filter(y => y.serviceId !== x.serviceId) : s.length >= 3 ? s : [...s, x]))

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title={t.label} sub={occasion ? `For ${occasion.name}` : all ? `${plural(all.length, 'partner')} live · ${all.filter(x => x.instant).length} instant` : 'Loading partners…'}
        right={<button type="button" onClick={() => { setComparing(c => !c); setPicked([]) }} aria-pressed={comparing}
          className={'cx-press flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold ' + (comparing ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>
          {comparing ? <X size={16} /> : <Scale size={16} />}{comparing ? 'Done' : 'Compare'}
        </button>} />

      <section className="mx-4 mt-1 flex items-center gap-3 rounded-[22px] bg-[var(--soft)] p-2.5 pr-4">
        <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[17px]"><Photo src={p?.url} className="absolute inset-0 h-full w-full object-cover" /></span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.02em]"><t.icon size={16} className="text-[var(--brand)]" />{t.label}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{(occasion && occasion.why[tradeId]) ?? t.why}</p>
        </div>
      </section>

      <div className="cx-rail cx-noscroll mt-3 !pb-3">
        <Chip on={sort !== 'best'} onClick={() => setSortOpen(true)}><span className="flex items-center gap-1.5"><ArrowUpDown size={14} />{SORTS[sort].label}</span></Chip>
        <Chip on={filters.instant} onClick={() => toggle('instant')}><span className="flex items-center gap-1"><Zap size={14} className={filters.instant ? 'fill-[var(--gold)] text-[var(--gold)]' : ''} />Instant</span></Chip>
        <Chip on={filters.rated} onClick={() => toggle('rated')}>4.5★ and up</Chip>
        <Chip on={filters.near} onClick={() => toggle('near')}>Within 8 km</Chip>
      </div>

      {comparing && (
        <p className="mx-4 mb-3 rounded-[16px] bg-[var(--brand-tint)] px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--brand-deep)]">Tap <b>Vs</b> on up to three partners to see them side by side.</p>
      )}

      <div className="grid grid-cols-2 gap-3 px-4">
        {!list && Array.from({ length: 6 }, (_, i) => <PartnerCardSkeleton key={i} />)}
        {list?.map((x, i) => (
          <PartnerCard key={x.serviceId} partner={sort === 'best' ? x : { ...x, reason: null }}
            href={`/p/${x.serviceId}?t=${tradeId}${occId ? `&o=${occId}` : ''}`}
            added={line?.serviceId === x.serviceId}
            onAdd={y => (line?.serviceId === y.serviceId ? plan.remove(line.key) : plan.add(y, occId))}
            saved={plan.isSaved(x.serviceId)} onSave={y => plan.toggleSaved(y)}
            selectable={comparing} selected={picked.some(y => y.serviceId === x.serviceId)} onSelect={pick}
            className={i < 2 ? '' : ''} />
        ))}
      </div>
      {list?.length === 0 && <Empty title={all?.length ? 'No one matches those filters' : `No ${t.label.toLowerCase()} live yet`}
        body={all?.length ? 'Clear a filter to see everyone.' : 'Partners for this service are being verified in your city.'} />}

      {comparing && picked.length >= 2 ? (
        <div className="fixed inset-x-0 z-[140] px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
          <button type="button" onClick={() => setCompareOpen(true)} className="cx-press cx-cta cx-pop mx-auto flex h-14 w-full max-w-[540px] items-center justify-center gap-2 rounded-[20px] text-[15px] font-extrabold">
            <Scale size={18} />Compare {picked.length} side by side
          </button>
        </div>
      ) : <PlanBar />}

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort partners">
        <div className="pb-2">
          {Object.entries(SORTS).map(([k, s]) => (
            <button key={k} type="button" onClick={() => { setSort(k); setSortOpen(false) }}
              className="cx-press flex w-full items-center justify-between border-b border-[var(--line)] py-4 text-left text-[15px] font-bold last:border-0">
              {s.label}{sort === k && <Check size={18} className="text-[var(--brand)]" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Sheet>
      <CompareSheet open={compareOpen} onClose={() => setCompareOpen(false)} tradeId={tradeId} partners={picked} occasionId={occId} />
    </main>
  )
}
