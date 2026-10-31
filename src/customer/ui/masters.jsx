/**
 * One service's masters, Blinkit-style: the requirement bar, the filter
 * chips, two columns of masters, compare. Shared by the single-service
 * page (Trade) and the celebration's sidebar screen (Match).
 *
 * The filters are the customer's, not ours: price runs from 0 with typed
 * min/max and quick "Under ₹X" chips drawn from the prices actually on the
 * list, rating is Any / 4+ / 4.5+, and instant is a switch. Nothing is a
 * hard-coded band.
 *
 * Prices are each master's own published base rate — ₹200 per plate, ₹9,000
 * per event — and never move as answers change (Mohan, 2026-10-31: no
 * total "without even looking the caterer's menu"). The master confirms the
 * final amount when they accept the request.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { companions } from '../data/crossSell'
import { NOUN } from '../screens/Brief'
import { serviceArt } from '../data/art'
import { ArtFill } from './art'
import { ArrowUpDown, Check, ChevronDown, ChevronRight, IndianRupee, Scale, SlidersHorizontal, X, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TRADE } from '../data/trades'
import { usePlan } from '../state/PlanContext'
import { partnersFor, SORTS } from '../lib/market'
import { filterByNeeds, loadCuisines, loadDishes, needsFor } from '../lib/needs'
import { plural, rupees } from '../lib/format'
import { asLine } from '../lib/quote'
import { sambu } from './Buddy'
import { Empty, Sheet } from './kit'
import { PartnerCard, PartnerCardSkeleton } from './cards'
import { needsSummary } from './needs'
import CompareSheet from '../screens/CompareSheet'

const NONE = { instant: false, km: null, rating: null, minRupees: null, maxRupees: null }

/* "Under ₹X" chips from the list's own prices: round numbers near its
   quarter, half and three-quarters — ₹200 / ₹500 / ₹1,000 for plates,
   ₹10,000 / ₹25,000 for a photographer's day. */
/* Up to a round step half a magnitude wide: 574 → 600, 780 → 800, 18,500 → 20,000. */
const niceUp = x => { const step = 10 ** Math.floor(Math.log10(Math.max(1, x))) / 2; return Math.ceil(x / step) * step }
export function quickCaps(prices) {
  const v = [...prices].sort((a, b) => a - b)
  if (v.length < 2) return []
  const at = q => v[Math.min(v.length - 1, Math.floor(q * v.length))]
  return [...new Set([0.25, 0.5, 0.75].map(q => niceUp(at(q))))].filter(c => c > v[0] && c < v[v.length - 1])
}

export function MastersPanel({ tradeId, occasionId = null, guests = null, onCount, onCompanion, cols = 2, everyone: allAtFirst = false }) {
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
  const [everyone, setEveryone] = useState(!!allAtFirst) // all masters, or only the ones who fit the answers
  const wants = plan.needsOf(occasionId, tradeId)

  useEffect(() => {
    let live = true
    setAll(null); setF(NONE); setSort('best'); setComparing(false); setPicked([])
    Promise.all([loadCuisines(supabase).catch(() => null), tradeId === 'catering_food' ? loadDishes(supabase).catch(() => null) : null])
      .then(() => partnersFor(tradeId)).then(l => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [tradeId])

  const curated = useMemo(() => filterByNeeds(all, tradeId, wants, guests), [all, tradeId, wants, guests])
  const fit = everyone ? { list: all, exact: true, asked: false, total: all?.length ?? 0 } : curated
  /* The base rate, as the master published it — never a computed total. */
  const rupeesOf = p => (p.fromPaise ? Math.ceil(p.fromPaise / 100) : null)
  const prices = useMemo(() => (fit.list ?? []).map(rupeesOf).filter(Boolean), [fit.list])
  const caps = useMemo(() => quickCaps(prices), [prices])
  const units = [...new Set((fit.list ?? []).filter(p => p.fromPaise).map(p => (p.fromKind === 'package' ? 'package' : p.fromUnit)))]
  const list = useMemo(() => {
    if (!fit.list) return null
    const out = fit.list.filter(p => (!f.instant || p.instant) && (f.km == null || (p.distanceKm ?? 999) <= f.km)
      && (f.rating == null || (p.rating ?? 0) >= f.rating)
      && (f.minRupees == null || (rupeesOf(p) ?? 0) >= f.minRupees)
      && (f.maxRupees == null || (rupeesOf(p) != null && rupeesOf(p) <= f.maxRupees)))
    return SORTS[sort].fn(out)
  }, [fit.list, f, sort])
  useEffect(() => { onCount?.(list?.length ?? null) }, [list?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const line = plan.lineFor(occasionId, tradeId)
  const said = needsSummary(tradeId, wants)
  const asks = needsFor(tradeId).length > 0
  const nF = [f.instant, f.km != null, f.rating != null, f.minRupees != null || f.maxRupees != null].filter(Boolean).length
  // As many as the customer likes — the table scrolls sideways.
  const pick = x => setPicked(s => (s.some(y => y.serviceId === x.serviceId) ? s.filter(y => y.serviceId !== x.serviceId) : [...s, x]))
  const priceChip = f.maxRupees != null ? `${f.minRupees ? `${rupees(f.minRupees * 100)}–` : 'Under '}${rupees(f.maxRupees * 100)}` : f.minRupees != null ? `From ${rupees(f.minRupees * 100)}` : 'Price'
  const brief = `/brief/${tradeId}${occasionId ? `?o=${occasionId}` : ''}`

  return (
    <div className="min-w-0" data-masters={tradeId}>
      {/* Curated or everyone — always the customer's choice (2026-10-31). */}
      {said && (
        <div className="mx-3 mb-2.5 grid grid-cols-2 gap-1 rounded-[14px] bg-[#F4F1F8] p-1" role="tablist" data-scope>
          {[[false, `Matched to you${curated.list ? ` · ${curated.list.length}` : ''}`], [true, `All masters${all ? ` · ${all.length}` : ''}`]].map(([v, l]) => (
            <button key={String(v)} type="button" role="tab" aria-selected={everyone === v} onClick={() => setEveryone(v)} data-scope-all={v}
              className={'h-9 rounded-[11px] text-[12.5px] font-extrabold transition ' + (everyone === v ? 'bg-white text-[var(--ink)] shadow-[0_1px_3px_rgba(28,16,51,.14)]' : 'text-[var(--ink-3)]')}>{l}</button>
          ))}
        </div>
      )}
      {asks && (
        <Link to={brief} className="cx-press mx-3 mb-2.5 mt-1 flex items-center gap-2.5 rounded-[16px] bg-[#F1FBF5] px-3 py-2.5 ring-1 ring-[#CDEFDC]" data-needs-bar>
          <SlidersHorizontal size={16} className="shrink-0 text-[#0C831F]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-[#0B6B3D]">{said ? (everyone ? 'Your answers' : fit.exact ? `${plural(fit.list?.length ?? 0, 'master')} do exactly this` : 'Closest to what you asked') : `Want only the masters who fit?`}</span>
            <span className="block truncate text-[11.5px] font-bold text-[#3C7A5A]">{said || `Tell us what you need from your ${NOUN[tradeId] ?? t.label.toLowerCase()} — optional`}</span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-[#0C831F]" />
        </Link>
      )}

      <div className="cx-noscroll flex gap-2 overflow-x-auto px-3 pb-3">
        <FChip on={nF > 0} onClick={() => setSheet('filters')} icon={SlidersHorizontal}>Filters{nF ? ` · ${nF}` : ''}</FChip>
        <FChip on={comparing} onClick={() => { setComparing(c => !c); setPicked([]) }} icon={comparing ? X : Scale} plain data-compare-toggle>{comparing ? 'Done' : 'Compare'}</FChip>
        <FChip on={f.minRupees != null || f.maxRupees != null} onClick={() => setSheet('filters')} icon={IndianRupee}>{priceChip}</FChip>
        <FChip on={sort !== 'best'} onClick={() => setSheet('sort')} icon={ArrowUpDown}>{sort === 'best' ? 'Sort' : SORTS[sort].label}</FChip>
        <FChip on={f.instant} onClick={() => setF(x => ({ ...x, instant: !x.instant }))} icon={Zap} plain>Instant</FChip>
      </div>
      <div className="cx-noscroll mx-3 mb-2.5 flex gap-3 overflow-x-auto text-[11.5px] font-extrabold text-[#0B6B3D]" data-hooks>
        {['Send a request free', 'Pay only after they accept', '25% off your first booking'].map(h => <span key={h} className="flex shrink-0 items-center gap-1"><Check size={12} strokeWidth={3.2} />{h}</span>)}
      </div>
      {comparing && <p className="mx-3 mb-2.5 rounded-[14px] bg-[var(--brand-tint)] px-3 py-2 text-[12px] font-bold text-[var(--brand-deep)]">Tap <b>Compare</b> on as many masters as you like{picked.length ? ` · ${picked.length} picked` : ''}.</p>}

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

      <div className={'grid px-3 ' + (cols === 3 ? 'grid-cols-3 gap-x-2 gap-y-3' : 'grid-cols-2 gap-2.5')} data-masters-grid={cols}>
        {!list && Array.from({ length: 4 }, (_, i) => <PartnerCardSkeleton key={i} />)}
        {list?.map(x => (
          <PartnerCard key={x.serviceId} compact={cols === 3} partner={sort === 'best' ? x : { ...x, reason: null }}
            href={`/p/${x.serviceId}?t=${tradeId}${occasionId ? `&o=${occasionId}` : ''}`}
            added={line?.serviceId === x.serviceId}
            onAdd={y => { if (line?.serviceId === y.serviceId) { plan.remove(line.key); sambu(`${y.name} taken out — pick another any time.`) } else { plan.add(asLine(y), occasionId); sambu(`${y.name} is in ✓ Send your request at checkout — you pay only after they accept.`) } }}
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
          <PriceFilter f={f} setF={setF} caps={caps} unit={units.length === 1 ? units[0] : null} />
          <Slider label="Distance" value={f.km} empty="Any distance" fmt={v => `Within ${v} km`} min={1} max={50} step={1} onChange={v => setF(x => ({ ...x, km: v }))} />
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
            <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">Books instantly</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">Accept requests within minutes</span></span>
            <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (f.instant ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (f.instant ? 'left-[21px]' : 'left-[3px]')} /></span>
          </button>
        </div>
      </Sheet>
      <CompareSheet open={compareOpen} onClose={() => setCompareOpen(false)} tradeId={tradeId} partners={picked} occasionId={occasionId} />
    </div>
  )
}

/* Price from ₹0: quick chips, or type your own range. */
function PriceFilter({ f, setF, caps, unit }) {
  const num = v => { const d = String(v).replace(/\D/g, '').slice(0, 9); return d ? Number(d) : null }
  const any = f.minRupees == null && f.maxRupees == null
  return (
    <div data-price-filter>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-extrabold">Price{unit ? <span className="font-bold text-[var(--ink-3)]"> · {unit === 'package' ? 'per package' : unit}</span> : null}</p>
        {!any && <button type="button" onClick={() => setF(x => ({ ...x, minRupees: null, maxRupees: null }))} className="text-[12.5px] font-extrabold text-[#0C831F]">Clear ✕</button>}
      </div>
      <div className="cx-noscroll -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
        {[[null, 'Any price'], ...caps.map(c => [c, `Under ${rupees(c * 100)}`])].map(([c, l]) => {
          const on = c == null ? any : f.minRupees == null && f.maxRupees === c
          return <button key={l} type="button" onClick={() => setF(x => ({ ...x, minRupees: null, maxRupees: c }))} aria-pressed={on} data-cap={c ?? 'any'}
            className={'cx-press h-9 shrink-0 rounded-full px-3.5 text-[12.5px] font-extrabold transition ' + (on ? 'bg-[#1C1033] text-white' : 'bg-[#F7F5FA] text-[var(--ink-2)]')}>{l}</button>
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[['minRupees', 'Min', '0'], ['maxRupees', 'Max', 'Any']].map(([k, l, ph]) => (
          <label key={k} className="flex h-12 items-center gap-1.5 rounded-[14px] bg-white px-3 shadow-[inset_0_0_0_1.5px_#E3DEEA] focus-within:shadow-[inset_0_0_0_2px_#0C831F]">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">{l}</span>
            <span className="text-[14px] font-extrabold text-[var(--ink-2)]">₹</span>
            <input inputMode="numeric" value={f[k] ?? ''} placeholder={ph} onChange={e => { const v = num(e.target.value); setF(x => ({ ...x, [k]: v })) }} aria-label={`${l} price in rupees`} data-price-input={k}
              className="cx-num min-w-0 flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:text-[var(--ink-3)]" />
          </label>
        ))}
      </div>
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

function FChip({ on, onClick, icon: Icon, plain = false, children, ...rest }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} {...rest}
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
