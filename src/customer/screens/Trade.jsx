/**
 * One trade: every live partner, filterable, comparable, addable.
 *
 * Reached two ways — "Book a service" (no occasion: the partner joins a
 * single-service plan) and from an occasion's row (`?o=`: the partner is
 * picked FOR that occasion). The screen is the same; only where the pick
 * lands differs.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Check, ChevronDown, IndianRupee, Scale, SlidersHorizontal, Star, X, Zap } from 'lucide-react'
import { FAMILIES } from '../data/families'
import { serviceArt } from '../data/art'
import { ArtFill } from '../ui/art'
import { NeedsPicker, needsSummary } from '../ui/needs'
import { filterByNeeds, loadCuisines, needsFor } from '../lib/needs'
import { supabase } from '../../lib/supabase'
import { TRADE } from '../data/trades'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { partnersFor, SORTS } from '../lib/market'
import { plural } from '../lib/format'
import { BackHeader, Empty, Journey, PlanBar, Sheet } from '../ui/kit'
import { PartnerCard, PartnerCardSkeleton } from '../ui/cards'
import CompareSheet from './CompareSheet'

export default function Trade() {
  const { tradeId } = useParams()
  const [q] = useSearchParams()
  const occasion = OCCASION[q.get('o')] ?? null
  const t = TRADE[tradeId]
  const plan = usePlan()
  const [all, setAll] = useState(null)
  const occKey = OCCASION[q.get('o')]?.id ?? null
  const wants = plan.needsOf(occKey, tradeId)
  const [sort, setSort] = useState('best')
  const [filters, setFilters] = useState({ instant: false, rated: false, near: false, price: null })
  const [sheet, setSheet] = useState(null) // sort | filters | price
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    if (!t) return
    let live = true
    setAll(null)
    loadCuisines(supabase).catch(() => {}).then(() => partnersFor(tradeId)).then(l => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [tradeId, t])

  const list = useMemo(() => {
    if (!all) return null
    const band = PRICE.find(b => b.id === filters.price)
    const fitted = filterByNeeds(all, tradeId, wants, occasion && plan.event.occasionId === occasion.id ? plan.event.guests : null).list
    const f = fitted.filter(p => (!filters.instant || p.instant) && (!filters.rated || (p.rating ?? 0) >= 4.5) && (!filters.near || (p.distanceKm ?? 99) <= 8) && (!band || (p.fromPaise && band.test(p.fromPaise / 100))))
    return SORTS[sort].fn(f)
  }, [all, filters, sort, wants]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return <Navigate to="/" replace />
  const family = FAMILIES.find(x => x.trades.includes(tradeId))
  const nFilters = ['instant', 'near'].filter(k => filters[k]).length
  const occId = occasion?.id ?? null
  const line = plan.lineFor(occId, tradeId)
  const toggle = k => setFilters(f => ({ ...f, [k]: !f[k] }))
  const pick = x => setPicked(s => (s.some(y => y.serviceId === x.serviceId) ? s.filter(y => y.serviceId !== x.serviceId) : s.length >= 3 ? s : [...s, x]))

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <BackHeader title={t.label} sub={occasion ? `For ${occasion.name}` : all ? `${plural(all.length, 'master')} live · ${all.filter(x => x.instant).length} instant` : 'Loading masters…'}
        right={<button type="button" onClick={() => { setComparing(c => !c); setPicked([]) }} aria-pressed={comparing}
          className={'cx-press flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold ' + (comparing ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>
          {comparing ? <X size={16} /> : <Scale size={16} />}{comparing ? 'Done' : 'Compare'}
        </button>} />

      <Journey flow={occasion ? 'celebration' : 'service'} at={occasion ? 3 : 1} />
      {comparing && (
        <p className="mx-4 mb-2 rounded-[16px] bg-[var(--brand-tint)] px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--brand-deep)]">Tap <b>Compare</b> on up to three masters to see them side by side.</p>
      )}

      {/* Blinkit's shape: the family down the left, filters across the top, masters in two columns. */}
      <div className="flex">
        {family && family.trades.length > 1 && (
          <nav className="sticky top-[calc(env(safe-area-inset-top,0px)+60px)] w-[74px] shrink-0 self-start border-r border-[#F1ECF8]" aria-label={family.label}>
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
        <div className="min-w-0 flex-1">
          {needsFor(tradeId).length > 0 && (
            <button type="button" onClick={() => setSheet('needs')} className="cx-press mx-3 mb-2.5 mt-1 flex w-[calc(100%-24px)] items-center gap-2.5 rounded-[16px] bg-[#F1FBF5] px-3 py-2.5 text-left ring-1 ring-[#CDEFDC]" data-needs-bar>
              <SlidersHorizontal size={16} className="shrink-0 text-[#0C831F]" />
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-[#0B6B3D]">{needsSummary(tradeId, wants) ? 'Showing masters for' : 'Tell us what you need'}</span>
                <span className="block truncate text-[11.5px] font-bold text-[#3C7A5A]">{needsSummary(tradeId, wants) || 'Only masters who do exactly that'}</span></span>
              <ChevronDown size={16} className="shrink-0 -rotate-90 text-[#0C831F]" />
            </button>
          )}
          <div className="cx-noscroll flex gap-2 overflow-x-auto px-3 pb-3 pt-1">
            <FChip on={nFilters > 0} onClick={() => setSheet('filters')} icon={SlidersHorizontal}>Filters{nFilters ? ` · ${nFilters}` : ''}</FChip>
            <FChip on={sort !== 'best'} onClick={() => setSheet('sort')} icon={ArrowUpDown}>Sort</FChip>
            <FChip on={!!filters.price} onClick={() => setSheet('price')} icon={IndianRupee}>{PRICE.find(b => b.id === filters.price)?.label ?? 'Price'}</FChip>
            <FChip on={filters.rated} onClick={() => toggle('rated')} icon={Star} plain>4.5★ +</FChip>
            <FChip on={filters.instant} onClick={() => toggle('instant')} icon={Zap} plain>Instant</FChip>
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-3">
            {!list && Array.from({ length: 6 }, (_, i) => <PartnerCardSkeleton key={i} />)}
            {list?.map(x => (
              <PartnerCard key={x.serviceId} partner={sort === 'best' ? x : { ...x, reason: null }}
                href={`/p/${x.serviceId}?t=${tradeId}${occId ? `&o=${occId}` : ''}`}
                added={line?.serviceId === x.serviceId}
                onAdd={y => (line?.serviceId === y.serviceId ? plan.remove(line.key) : plan.add(y, occId))}
                saved={plan.isSaved(x.serviceId)} onSave={y => plan.toggleSaved(y)}
                selectable={comparing} selected={picked.some(y => y.serviceId === x.serviceId)} onSelect={pick} />
            ))}
          </div>
      {list?.length === 0 && <Empty title={all?.length ? 'No one matches those filters' : `No ${t.label.toLowerCase()} live yet`}
        body={all?.length ? 'Clear a filter to see everyone.' : 'Masters for this service are being verified in your city.'} />}
        </div>
      </div>

      {comparing && picked.length >= 2 ? (
        <div className="fixed inset-x-0 z-[140] px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
          <button type="button" onClick={() => setCompareOpen(true)} className="cx-press cx-cta cx-pop mx-auto flex h-14 w-full max-w-[540px] items-center justify-center gap-2 rounded-[20px] text-[15px] font-extrabold">
            <Scale size={18} />Compare {picked.length} side by side
          </button>
        </div>
      ) : <PlanBar />}

      <Sheet open={sheet === 'needs'} onClose={() => setSheet(null)} title={`What you need from your ${t.label.toLowerCase()}`}
        footer={<button type="button" onClick={() => setSheet(null)} className="cx-press flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#0C831F] text-[15px] font-extrabold text-white" data-needs-done>Show {plural(list?.length ?? 0, 'master')}</button>}>
        <div className="pb-2"><NeedsPicker tradeId={tradeId} value={wants} onChange={v => plan.setNeeds(`${occKey ?? 'solo'}:${tradeId}`, v)} /></div>
      </Sheet>
      <Sheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort masters">
        <div className="pb-2">
          {Object.entries(SORTS).map(([k, x]) => <Row key={k} on={sort === k} onClick={() => { setSort(k); setSheet(null) }}>{x.label}</Row>)}
        </div>
      </Sheet>
      <Sheet open={sheet === 'price'} onClose={() => setSheet(null)} title="Starting price">
        <div className="pb-2">
          <Row on={!filters.price} onClick={() => { setFilters(f => ({ ...f, price: null })); setSheet(null) }}>Any price</Row>
          {PRICE.map(b => <Row key={b.id} on={filters.price === b.id} onClick={() => { setFilters(f => ({ ...f, price: b.id })); setSheet(null) }}>{b.label}</Row>)}
        </div>
      </Sheet>
      <Sheet open={sheet === 'filters'} onClose={() => setSheet(null)} title="Filters"
        footer={<button type="button" onClick={() => setSheet(null)} className="cx-press flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#0C831F] text-[15px] font-extrabold text-white">Show {plural(list?.length ?? 0, 'master')}</button>}>
        <div className="pb-2">
          {[['instant', 'Books instantly', 'Confirmed the moment you pay'], ['near', 'Within 8 km', 'Closest to your venue'], ['rated', 'Rated 4.5★ and up', 'Loved by customers']].map(([k, t, d]) => (
            <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={filters[k]} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-3.5 text-left last:border-0">
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{t}</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">{d}</span></span>
              <span className={'grid h-6 w-6 place-items-center rounded-[7px] ' + (filters[k] ? 'bg-[#0C831F] text-white' : 'ring-2 ring-[#D6D0E0]')}>{filters[k] && <Check size={15} strokeWidth={3} />}</span>
            </button>
          ))}
        </div>
      </Sheet>
      <CompareSheet open={compareOpen} onClose={() => setCompareOpen(false)} tradeId={tradeId} partners={picked} occasionId={occId} />
    </main>
  )
}

const PRICE = [
  { id: 'lt5', label: 'Under ₹5,000', test: r => r < 5000 },
  { id: '5to20', label: '₹5,000 – ₹20,000', test: r => r >= 5000 && r <= 20000 },
  { id: 'gt20', label: 'Above ₹20,000', test: r => r > 20000 },
]

/* A Blinkit filter chip: white, hairline, a caret when it opens a sheet. */
function FChip({ on, onClick, icon: Icon, plain = false, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={'cx-press flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[12px] px-3 text-[12.5px] font-bold transition ' + (on ? 'bg-[#E9F8EF] text-[#0C831F] shadow-[inset_0_0_0_1.5px_#0C831F]' : 'bg-white text-[var(--ink)] shadow-[inset_0_0_0_1px_#E3DEEA]')}>
      <Icon size={14} />{children}{!plain && <ChevronDown size={14} className="opacity-60" />}
    </button>
  )
}

function Row({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="cx-press flex w-full items-center justify-between border-b border-[var(--line)] py-4 text-left text-[15px] font-bold last:border-0">
      {children}{on && <Check size={18} className="text-[#0C831F]" strokeWidth={3} />}
    </button>
  )
}
