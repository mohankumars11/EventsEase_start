/**
 * One service's masters, Blinkit-style: the requirement bar, the filter
 * chips, two columns of masters, compare. Shared by the single-service
 * page (Trade) and the celebration's sidebar screen (Match).
 *
 * The filters are the customer's, not ours: distance is a slider from
 * 1 km, the price ceiling is a slider across the prices actually on the
 * list, rating is Any / 4+ / 4.5+, and instant is a switch. Nothing is a
 * hard-coded band.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { companions } from '../data/crossSell'
import { NOUN } from '../screens/Brief'
import { serviceArt } from '../data/art'
import { ArtFill } from './art'
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Clock, IndianRupee, MapPin, Scale, SlidersHorizontal, Users, X, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TRADE } from '../data/trades'
import { usePlan } from '../state/PlanContext'
import { partnersFor, SORTS } from '../lib/market'
import { filterByNeeds, loadCuisines, loadDishes, needsFor } from '../lib/needs'
import { plural, rupees } from '../lib/format'
import { askOf, asksFor, asLine, withQuotes } from '../lib/quote'
import { Empty, Sheet } from './kit'
import { PartnerCard, PartnerCardSkeleton } from './cards'
import { needsSummary } from './needs'
import CompareSheet from '../screens/CompareSheet'

const NONE = { instant: false, km: null, rating: null, maxRupees: null }

export function MastersPanel({ tradeId, occasionId = null, guests = null, onCount, onCompanion }) {
  const plan = usePlan()
  const navigate = useNavigate()
  const t = TRADE[tradeId]
  const [all, setAll] = useState(null)
  const [sort, setSort] = useState('best')
  const [f, setF] = useState(NONE)
  const [sheet, setSheet] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)
  const wants = plan.needsOf(occasionId, tradeId)

  useEffect(() => {
    let live = true
    setAll(null); setF(NONE); setSort('best'); setComparing(false); setPicked([])
    Promise.all([loadCuisines(supabase).catch(() => null), tradeId === 'catering_food' ? loadDishes(supabase).catch(() => null) : null])
      .then(() => partnersFor(tradeId)).then(l => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [tradeId])

  const fit0 = useMemo(() => filterByNeeds(all, tradeId, wants, guests), [all, tradeId, wants, guests])
  /* Hours and guests turn every master's rate into YOUR price; masters who
     cannot do what was asked (too many hours for them) drop out. */
  const can = useMemo(() => asksFor(tradeId, all), [tradeId, all])
  const fit = useMemo(() => ({ ...fit0, list: withQuotes(fit0.list, askOf(wants, { guests })) }), [fit0, wants, guests])
  const priceOf = p => p.quote?.paise ?? p.fromPaise
  const setAsk = (k, v) => plan.setNeeds(`${occasionId ?? 'solo'}:${tradeId}`, { ...wants, [k]: v })
  const prices = useMemo(() => (fit.list ?? []).map(p => p.quote?.paise ?? p.fromPaise).filter(Boolean).map(p => Math.ceil(p / 100)), [fit.list])
  const lo = prices.length ? Math.min(...prices) : 0, hi = prices.length ? Math.max(...prices) : 0
  const list = useMemo(() => {
    if (!fit.list) return null
    const out = fit.list.filter(p => (!f.instant || p.instant) && (f.km == null || (p.distanceKm ?? 999) <= f.km)
      && (f.rating == null || (p.rating ?? 0) >= f.rating) && (f.maxRupees == null || (priceOf(p) && priceOf(p) / 100 <= f.maxRupees)))
    return SORTS[sort].fn(out)
  }, [fit.list, f, sort])
  useEffect(() => { onCount?.(list?.length ?? null) }, [list?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const line = plan.lineFor(occasionId, tradeId)
  const said = needsSummary(tradeId, wants)
  const asks = needsFor(tradeId).length > 0
  const nF = [f.instant, f.km != null, f.rating != null, f.maxRupees != null].filter(Boolean).length
  const pick = x => setPicked(s => (s.some(y => y.serviceId === x.serviceId) ? s.filter(y => y.serviceId !== x.serviceId) : s.length >= 3 ? s : [...s, x]))
  const brief = `/brief/${tradeId}${occasionId ? `?o=${occasionId}` : ''}`

  return (
    <div className="min-w-0" data-masters={tradeId}>
      {asks && (
        <Link to={brief} className="cx-press mx-3 mb-2.5 mt-1 flex items-center gap-2.5 rounded-[16px] bg-[#F1FBF5] px-3 py-2.5 ring-1 ring-[#CDEFDC]" data-needs-bar>
          <SlidersHorizontal size={16} className="shrink-0 text-[#0C831F]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-[#0B6B3D]">{said ? (fit.exact ? `${plural(fit.list?.length ?? 0, 'master')} do exactly this` : 'Closest to what you asked') : `What do you need from your ${NOUN[tradeId] ?? t.label.toLowerCase()}?`}</span>
            <span className="block truncate text-[11.5px] font-bold text-[#3C7A5A]">{said || 'Tell us — we show only the masters who do it'}</span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-[#0C831F]" />
        </Link>
      )}

      {(can.hours || can.guests) && (
        <div className="mx-3 mb-2.5 rounded-[16px] bg-gradient-to-r from-[#FFF8EA] to-[#FFF1DC] px-3 py-2.5 ring-1 ring-[#FFD9A0]" data-ask-bar>
          <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#7A3E00]">
            {can.hours ? <Clock size={14} /> : <Users size={14} />}
            {can.hours ? (wants.$hours ? `Prices below are for ${wants.$hours} hours` : 'How many hours? See your exact price') : (askOf(wants, { guests }).guests ? `Prices below are for ${askOf(wants, { guests }).guests.toLocaleString('en-IN')} guests` : 'How many guests? See your exact price')}
          </p>
          <div className="cx-noscroll -mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1">
            {(can.hours ? [2, 3, 4, 5, 6, 8, 10, 12] : [50, 100, 150, 200, 300, 500]).map(n => {
              const on = can.hours ? wants.$hours === n : askOf(wants, { guests }).guests === n
              return (
                <button key={n} type="button" onClick={() => setAsk(can.hours ? '$hours' : '$guests', n)} aria-pressed={on} data-ask={n}
                  className={'cx-press shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-extrabold transition ' + (on ? 'bg-[#1C1033] text-white' : 'bg-white text-[#5A3B12] shadow-[inset_0_0_0_1px_#F4D9AE]')}>
                  {n}{can.hours ? ' h' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="cx-noscroll flex gap-2 overflow-x-auto px-3 pb-3">
        <FChip on={nF > 0} onClick={() => setSheet('filters')} icon={SlidersHorizontal}>Filters{nF ? ` · ${nF}` : ''}</FChip>
        <FChip on={sort !== 'best'} onClick={() => setSheet('sort')} icon={ArrowUpDown}>{sort === 'best' ? 'Sort' : SORTS[sort].label}</FChip>
        <FChip on={f.km != null} onClick={() => setSheet('filters')} icon={MapPin}>{f.km != null ? `Within ${f.km} km` : 'Distance'}</FChip>
        <FChip on={f.maxRupees != null} onClick={() => setSheet('filters')} icon={IndianRupee}>{f.maxRupees != null ? `Up to ${rupees(f.maxRupees * 100)}` : 'Price'}</FChip>
        <FChip on={f.instant} onClick={() => setF(x => ({ ...x, instant: !x.instant }))} icon={Zap} plain>Instant</FChip>
        <FChip on={comparing} onClick={() => { setComparing(c => !c); setPicked([]) }} icon={comparing ? X : Scale} plain>{comparing ? 'Done' : 'Compare'}</FChip>
      </div>
      <div className="cx-noscroll mx-3 mb-2.5 flex gap-3 overflow-x-auto text-[11.5px] font-extrabold text-[#0B6B3D]" data-hooks>
        {['Ready to book', 'Instant payment', '10% off first booking', 'Free cancellation before acceptance'].map(h => <span key={h} className="flex shrink-0 items-center gap-1"><Check size={12} strokeWidth={3.2} />{h}</span>)}
      </div>
      {comparing && <p className="mx-3 mb-2.5 rounded-[14px] bg-[var(--brand-tint)] px-3 py-2 text-[12px] font-bold text-[var(--brand-deep)]">Tap <b>Compare</b> on up to three masters.</p>}

      {/* Once one is in the cart: what people add next, in a tap. */}
      {line && (() => {
        const have = plan.basket.filter(l => l.occasionId === occasionId).map(l => l.tradeId)
        const next = companions(tradeId, have)
        if (!next.length) return null
        return (
          <div className="cx-pop mx-3 mb-3 rounded-[18px] bg-gradient-to-r from-[#EEFAF2] to-[#F3ECFF] p-3 ring-1 ring-[#CDEFDC]" data-complete-set>
            <p className="text-[13px] font-extrabold text-[#0B4F2A]">✓ {line.name} is in. Complete the set:</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {next.map(([t, hook]) => (
                <button key={t} type="button" onClick={() => (onCompanion ? onCompanion(t) : navigate(`/s/${t}${occasionId ? `?o=${occasionId}` : ''}`))}
                  className="cx-press flex items-center gap-2 rounded-[14px] bg-white p-2 text-left shadow-[0_0_0_1px_#E7F3EA]" data-companion={t}>
                  <ArtFill art={serviceArt(t)} tone="#F6F1FF" className="h-9 w-9 shrink-0 rounded-[10px]" inset="6%" />
                  <span className="min-w-0"><span className="line-clamp-1 block text-[12px] font-extrabold leading-tight">{TRADE[t].label}</span><span className="mt-0.5 line-clamp-2 block text-[10.5px] font-bold leading-tight text-[#0B7A45]">{hook}</span></span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="grid grid-cols-2 gap-2.5 px-3">
        {!list && Array.from({ length: 4 }, (_, i) => <PartnerCardSkeleton key={i} />)}
        {list?.map(x => (
          <PartnerCard key={x.serviceId} partner={sort === 'best' ? x : { ...x, reason: null }}
            href={`/p/${x.serviceId}?t=${tradeId}${occasionId ? `&o=${occasionId}` : ''}`}
            added={line?.serviceId === x.serviceId}
            onAdd={y => (line?.serviceId === y.serviceId ? plan.remove(line.key) : plan.add(asLine(y), occasionId))}
            saved={plan.isSaved(x.serviceId)} onSave={y => plan.toggleSaved(y)}
            selectable={comparing} selected={picked.some(y => y.serviceId === x.serviceId)} onSelect={pick} />
        ))}
      </div>
      {list?.length === 0 && <div className="pt-4"><Empty title={all?.length ? 'No one matches those filters' : `No ${t.label.toLowerCase()} live yet`}
        body={all?.length ? 'Widen a filter to see more masters.' : 'Masters for this service are being verified in your city.'}
        action={nF ? <button type="button" onClick={() => setF(NONE)} className="font-extrabold text-[var(--brand)]">Clear filters</button> : null} /></div>}

      {comparing && picked.length >= 2 && (
        <div className="fixed inset-x-0 z-[145] px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}>
          <button type="button" onClick={() => setCompareOpen(true)} className="cx-press cx-cta cx-pop mx-auto flex h-14 w-full max-w-[540px] items-center justify-center gap-2 rounded-[20px] text-[15px] font-extrabold">
            <Scale size={18} />Compare {picked.length} side by side
          </button>
        </div>
      )}

      <Sheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort masters">
        <div className="pb-2">{Object.entries(SORTS).map(([k, x]) => <Row key={k} on={sort === k} onClick={() => { setSort(k); setSheet(null) }}>{x.label}</Row>)}</div>
      </Sheet>
      <Sheet open={sheet === 'filters'} onClose={() => setSheet(null)} title="Filters"
        footer={<div className="flex gap-2">
          <button type="button" onClick={() => setF(NONE)} className="cx-press h-[52px] rounded-[16px] bg-[#F4F1F8] px-5 text-[14px] font-extrabold text-[var(--ink-2)]">Reset</button>
          <button type="button" onClick={() => setSheet(null)} className="cx-press flex h-[52px] flex-1 items-center justify-center rounded-[16px] bg-[#0C831F] text-[15px] font-extrabold text-white" data-filters-done>Show {plural(list?.length ?? 0, 'master')}</button>
        </div>}>
        <div className="space-y-5 pb-3">
          <Slider label="Distance" value={f.km} empty="Any distance" fmt={v => `Within ${v} km`} min={1} max={50} step={1} onChange={v => setF(x => ({ ...x, km: v }))} />
          {hi > lo && <Slider label="Starting price" value={f.maxRupees} empty="Any price" fmt={v => `Up to ${rupees(v * 100)}`} min={lo} max={hi} step={Math.max(1, Math.round((hi - lo) / 40))} onChange={v => setF(x => ({ ...x, maxRupees: v }))} />}
          <div>
            <p className="text-[14px] font-extrabold">Rating</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[[null, 'Any'], [4, '4.0 ★ +'], [4.5, '4.5 ★ +']].map(([v, l]) => (
                <button key={l} type="button" onClick={() => setF(x => ({ ...x, rating: v }))} aria-pressed={f.rating === v}
                  className={'cx-press h-11 rounded-[13px] text-[13px] font-extrabold transition ' + (f.rating === v ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-[#F7F5FA] text-[var(--ink-2)]')}>{l}</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setF(x => ({ ...x, instant: !x.instant }))} aria-pressed={f.instant} className="flex w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">Books instantly</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">Confirmed the moment you pay</span></span>
            <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (f.instant ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (f.instant ? 'left-[21px]' : 'left-[3px]')} /></span>
          </button>
        </div>
      </Sheet>
      <CompareSheet open={compareOpen} onClose={() => setCompareOpen(false)} tradeId={tradeId} partners={picked} occasionId={occasionId} />
    </div>
  )
}

function Slider({ label, value, empty, fmt, min, max, step, onChange }) {
  const v = value ?? max
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-extrabold">{label}</p>
        <button type="button" onClick={() => onChange(null)} className={'text-[12.5px] font-extrabold ' + (value == null ? 'text-[var(--ink-3)]' : 'text-[#0C831F]')}>{value == null ? empty : `${fmt(value)} ✕`}</button>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => onChange(Number(e.target.value))} aria-label={label}
        className="cx-range mt-3 w-full" style={{ '--fill': `${((v - min) / Math.max(1, max - min)) * 100}%` }} />
      <div className="mt-1 flex justify-between text-[10.5px] font-bold text-[var(--ink-3)]"><span>{fmt(min).replace(/^(Within|Up to) /, '')}</span><span>{fmt(max).replace(/^(Within|Up to) /, '')}</span></div>
    </div>
  )
}

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
