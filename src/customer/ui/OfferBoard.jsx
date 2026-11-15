/**
 * The offer board (lib/offerBoard): every master who can deliver what the
 * customer chose, each with every package of theirs that delivers it —
 * priced by the server for the customer's date — to compare, negotiate and
 * choose. Opened from a service row on the live-match screen.
 *
 * One card per master (spec Part 6D: never "partners × packages"): their
 * cheapest qualifying package leads; "+N more that deliver it" opens the
 * rest, each saying what it adds and for how much. Masters who fall short
 * are only ever in "Close, but not …", with what they lack — never mixed
 * in with the ones that qualify.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Clock3, HandCoins, Loader2, MapPin, Scale, Star, Zap } from 'lucide-react'
import FilterBar, { passes } from './FilterSheet'
import { buildBoard, diffText, inclusionLabel } from '../lib/offerBoard'
import { rupees } from '../lib/format'
import { Photo, Sheet } from './kit'
import OfferCompare from './OfferCompare'

const SORTS = [['best', 'Best match', 'who fits your ask best'], ['price', 'Price · low to high'], ['hours', 'Most hours'], ['rating', 'Top rated'], ['near', 'Nearest first']]
const RATING = [['4.5', '4.5 ★ and up', 4.5], ['4.0', '4.0 ★ and up', 4], ['3.5', '3.5 ★ and up', 3.5]]
const NEAR = [['3', 'Within 3 km', 3], ['5', 'Within 5 km', 5], ['10', 'Within 10 km', 10], ['20', 'Within 20 km', 20]]
const YEARS = [['2', '2+ years', 2], ['5', '5+ years', 5], ['10', '10+ years', 10]]
/* Four price bands between the cheapest and dearest offer on the board. */
const bandsOf = r => {
  if (!r || r.hi == null || r.lo == null || r.hi <= r.lo) return []
  const step = (r.hi - r.lo) / 4, round = x => Math.round(x / 50000) * 50000 || x
  return [0, 1, 2, 3].map(i => { const lo = round(r.lo + step * i), hi = i === 3 ? Infinity : round(r.lo + step * (i + 1)); return { id: String(i), lo, hi, label: i === 3 ? `${rupees(lo)} and above` : `${rupees(lo)} – ${rupees(hi)}` } })
}
const sortBy = {
  best: () => 0,
  price: (a, b) => (a.headline.price ?? Infinity) - (b.headline.price ?? Infinity),
  hours: (a, b) => (b.headline.hours ?? 0) - (a.headline.hours ?? 0),
  rating: (a, b) => (b.partner.rating ?? 0) - (a.partner.rating ?? 0),
  near: (a, b) => (a.partner.distanceKm ?? Infinity) - (b.partner.distanceKm ?? Infinity),
}
const gapLine = gaps => gaps.map(g => g.need === 'capacity' ? `holds ${g.have} of your ${g.want} guests` : g.need === 'hours' ? (g.have ? `${g.have} h of the ${g.want} h needed` : 'hours not stated')
  : g.need === 'inclusion' ? `no ${inclusionLabel(g.want)}` : 'not this experience').join(' · ')

function Price({ o }) {
  return o.price != null
    ? <span className="cx-num text-[17px] font-black tracking-[-0.02em]">{rupees(o.price)}</span>
    : <span className="text-[12.5px] font-extrabold text-[#B45309]">They send a price</span>
}

function PackageLine({ o, vs = null, picked, onPick, onChoose, negotiate }) {
  return (
    <div className="rounded-[14px] bg-[#FAF8FD] p-2.5" data-offer={o.packageId ?? o.ref?.key ?? o.kind}>
      <div className="flex items-start justify-between gap-2">
        {o.photo && <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] bg-white shadow-[0_0_0_1px_#EEE8F8]" data-offer-photo><Photo src={o.photo} alt={o.label ?? ''} className="absolute inset-0 h-full w-full object-cover" /></span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold">{o.kind === 'rate' ? 'By the hour' : o.kind === 'item' && o.label ? o.label : o.label ? `Their “${o.label}”` : 'Their price'}{o.summary && o.kind !== 'rate' ? <span className="font-semibold text-[var(--ink-2)]"> · {o.summary}</span> : o.kind === 'rate' ? ` · ${o.hours} h` : null}</span>
          {o.inclusions?.length > 0 && <span className="mt-0.5 block text-[11.5px] font-semibold text-[var(--ink-2)]">With {o.inclusions.map(inclusionLabel).join(', ')}</span>}
          {vs && <span className="mt-0.5 block text-[11.5px] font-bold text-[#4C1D95]">{diffText(vs)}</span>}
        </span>
        <span className="shrink-0 text-right">
          <Price o={o} />
          <span className="flex items-center justify-end gap-1 text-[10.5px] font-extrabold text-[var(--ink-3)]">
            {o.path === 'INSTANT' ? <><Zap size={10} className="fill-[#F5B301] text-[#F5B301]" />Instant</> : <><Clock3 size={10} />They accept first</>}
          </span>
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button type="button" onClick={onPick} aria-pressed={picked} data-compare-pick
          className={'flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-extrabold ' + (picked ? 'bg-[#1C1033] text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_#E5DDF2]')}>
          {picked ? <Check size={12} strokeWidth={3} /> : <Scale size={12} />}Compare
        </button>
        {negotiate && <Link to={negotiate} className="flex h-8 items-center gap-1 rounded-full bg-[#F4EEFF] px-2.5 text-[11.5px] font-extrabold text-[#4C1D95]" data-negotiate><HandCoins size={12} />Negotiate</Link>}
        <button type="button" onClick={onChoose} className="cx-press ml-auto h-8 rounded-full bg-[var(--brand)] px-3.5 text-[12px] font-extrabold text-white" data-choose>Choose</button>
      </div>
    </div>
  )
}

function MasterCard({ m, open, onToggle, isPicked, pick, choose, negotiateFor }) {
  const p = m.partner
  return (
    <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#EEE8F6,0_16px_28px_-24px_rgba(76,29,149,.45)]" data-master={p.serviceId}>
      <div className="flex gap-3 p-3">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#F3EEF9]">{p.cover && <Photo src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-black tracking-[-0.02em]">{p.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-bold text-[var(--ink-3)]">
            {p.rating ? <span className="flex items-center gap-0.5 text-[#1C1033]"><Star size={11} className="fill-[#F5B301] text-[#F5B301]" />{p.rating.toFixed(1)}{p.reviews ? <span className="text-[var(--ink-3)]"> ({p.reviews})</span> : null}</span> : <span>New</span>}
            {p.distanceKm != null && <span className="flex items-center gap-0.5"><MapPin size={11} />{p.distanceKm.toFixed(1)} km</span>}
            {p.years ? <span>{p.years} yrs</span> : null}
          </span>
          {m.badges.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {m.badges.map(b => <span key={b} className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[10.5px] font-extrabold text-[#0B5B30]" data-badge={b}>{b}</span>)}
            </span>
          )}
        </span>
      </div>
      <div className="space-y-2 px-3 pb-3">
        <PackageLine o={m.headline} picked={isPicked(m.headline)} onPick={() => pick(m, m.headline)} onChoose={() => choose(m, m.headline)} negotiate={negotiateFor(m, m.headline)} />
        {m.extras.length > 0 && (
          <button type="button" onClick={onToggle} className="flex w-full items-center justify-between rounded-[12px] px-1 py-1 text-[12px] font-extrabold text-[var(--brand)]" data-more-packages>
            {open ? 'Hide' : `+ ${m.extras.length} more that deliver it`}<ChevronDown size={15} className={'transition-transform ' + (open ? 'rotate-180' : '')} />
          </button>
        )}
        {open && m.extras.map(o => (
          <PackageLine key={o.packageId ?? o.kind} o={o} vs={o.vs} picked={isPicked(o)} onPick={() => pick(m, o)} onChoose={() => choose(m, o)} negotiate={negotiateFor(m, o)} />
        ))}
        {m.morePackages > 0 && <p className="px-1 text-[11px] font-semibold text-[var(--ink-3)]">and {m.morePackages} more of theirs — on their profile</p>}
      </div>
    </article>
  )
}

/**
 * The board for one service. `onChoose(offer, partner, backups)` — the
 * offer the customer chose, and the other masters' offers they ticked to
 * compare, which become their backups (theirs first, migration 197).
 */
export default function OfferBoard({ open, onClose, title, tradeId, occasionId, event, place, needs, initial = null, onChoose, focus = null }) {
  const [board, setBoard] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('best')
  const [f, setF] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())
  const [picked, setPicked] = useState([])          // [{ m, o }] — up to 4
  const [comparing, setComparing] = useState(false)
  const [showClose, setShowClose] = useState(false)

  const load = async (page = 0) => {
    setBusy(true); setErr('')
    try {
      const b = await buildBoard({ tradeId, occasionId, event, place, needs, page })
      setBoard(prev => (page && prev ? { ...b, masters: [...prev.masters, ...b.masters], unavailable: [...prev.unavailable, ...b.unavailable] } : b))
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  /* `initial`: the page the radar already priced — opens instantly. */
  useEffect(() => { if (open && tradeId) { setPicked([]); if (initial) setBoard(initial); else load(0) } }, [open, tradeId]) // eslint-disable-line react-hooks/exhaustive-deps
  /* `focus`: the master the customer tapped on the Venues / Restaurants screen — first, and open. */
  useEffect(() => { if (focus) setExpanded(s => new Set([...s, focus])) }, [focus, board])

  const key = o => `${o.serviceId}:${o.packageId ?? o.kind}`
  const isPicked = o => picked.some(x => key(x.o) === key(o))
  const pick = (m, o) => setPicked(xs => (isPicked(o) ? xs.filter(x => key(x.o) !== key(o)) : [...xs, { m, o }].slice(-4)))
  const choose = (m, o) => {
    /* Backups: the other masters the customer ticked — never a second
       package of the same master, who cannot be their own backup. */
    const backups = picked.filter(x => x.m.partner.serviceId !== m.partner.serviceId).map(x => x.o)
      .filter((o2, i, a) => a.findIndex(y => y.serviceId === o2.serviceId) === i).slice(0, 3)
    onChoose?.(o, m.partner, backups)
  }
  const negotiateFor = (m, o) => (o.kind === 'package' && o.packageId
    ? `/negotiate/${m.partner.serviceId}?t=${tradeId}${occasionId ? `&o=${occasionId}` : ''}&pkg=${o.packageId}` : null)

  const incs = useMemo(() => [...new Set((board?.masters ?? []).flatMap(m => m.offers.flatMap(o => o.inclusions ?? [])))], [board])
  const bands = useMemo(() => bandsOf(board?.range), [board])
  /* The facets (Mohan, 2026-11-14: "a high-value filter for all 35 services"):
     what every master's package really carries — price band, instant or
     accept-first, rating, distance, years, and each inclusion on the board. */
  const facets = useMemo(() => [
    { id: 'instant', type: 'toggle', label: 'Booking', on: 'Instant booking', icon: Zap, hint: 'Confirmed the moment you pay' },
    bands.length > 1 && { id: 'price', type: 'one', label: 'Price', options: bands.map(b => ({ id: b.id, label: b.label })) },
    { id: 'rating', type: 'one', label: 'Rating', options: RATING.map(([id, l]) => ({ id, label: l, icon: Star })) },
    { id: 'near', type: 'one', label: 'Distance', options: NEAR.map(([id, l]) => ({ id, label: l, icon: MapPin })) },
    { id: 'years', type: 'one', label: 'Experience', options: YEARS.map(([id, l]) => ({ id, label: l })) },
    incs.length > 0 && { id: 'inc', type: 'many', label: 'Must include', options: incs.map(x => ({ id: x, label: inclusionLabel(x) })) },
    { id: 'badge', type: 'many', anyOf: true, label: 'Highlights', options: [...new Set((board?.masters ?? []).flatMap(m => m.badges ?? []))].map(b => ({ id: b, label: b })) },
  ].filter(x => x && (x.type === 'toggle' || x.options?.length)), [bands, incs, board])
  const shown = useMemo(() => {
    const get = (m, o) => id => ({
      instant: o.path === 'INSTANT',
      price: bands.find(b => o.price != null && o.price >= b.lo && o.price < b.hi)?.id ?? null,
      rating: RATING.filter(([, , min]) => (m.partner.rating ?? 0) >= min).map(([id]) => id),
      near: NEAR.filter(([, , km]) => m.partner.distanceKm != null && m.partner.distanceKm <= km).map(([id]) => id),
      years: YEARS.filter(([, , y]) => (m.partner.years ?? 0) >= y).map(([id]) => id),
      inc: o.inclusions ?? [],
      badge: m.badges ?? [],
    })[id]
    return (board?.masters ?? []).map(m => {
      const keep = o => passes(o, facets, f, (row, id) => get(m, row)(id))
      const offers = m.offers.filter(keep)
      if (!offers.length) return null
      const headline = offers[0]
      return { ...m, headline, extras: m.extras.filter(e => keep(e) && key(e) !== key(headline)) }
    }).filter(Boolean).sort(sortBy[sort]).sort((a, b) => (b.partner.serviceId === focus) - (a.partner.serviceId === focus))
  }, [board, facets, f, sort, focus, bands])

  const exp = board?.ask?.experience
  const r = board?.range
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={picked.length > 0 ? (
        <button type="button" onClick={() => setComparing(true)} disabled={picked.length < 2} data-compare-open
          className="cx-press cx-cta flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-extrabold disabled:opacity-50">
          <Scale size={17} />{picked.length < 2 ? 'Tick one more to compare' : `Compare ${picked.length}`}
        </button>
      ) : null}>
      <div className="space-y-3 pb-2" data-offer-board={tradeId}>
        <p className="text-[13px] font-bold text-[var(--ink-2)]" data-board-summary>
          {busy && !board ? 'Pricing every offer for your date…'
            : board?.total ? <>{exp ? <><b>{exp.name}</b> · </> : null}{board.total} can deliver it{r ? ` · ${rupees(r.lo)}${r.hi !== r.lo ? ` – ${rupees(r.hi)}` : ''}` : ''}</>
            : exp ? `Nobody near you delivers ${exp.name} at a fixed price yet.` : 'Nobody near you can take this yet.'}
        </p>
        {err && <p className="rounded-[14px] bg-[#FFF4F4] p-3 text-[12.5px] font-bold text-[#B42318]">{err}</p>}

        {board?.masters?.length > 1 && (
          <div className="-mx-4" data-board-sort>
            <FilterBar className="px-4" facets={facets} value={f} onChange={setF} sorts={SORTS} sort={sort} onSort={setSort} count={shown.length}
              quick={[{ facet: 'instant', label: 'Instant', icon: Zap }, { facet: 'rating', id: '4.5', label: '4.5 ★+' }]} />
          </div>
        )}

        {shown.map(m => (
          <MasterCard key={m.partner.serviceId} m={m} open={expanded.has(m.partner.serviceId)} isPicked={isPicked} pick={pick} choose={choose} negotiateFor={negotiateFor}
            onToggle={() => setExpanded(s => { const n = new Set(s); n.has(m.partner.serviceId) ? n.delete(m.partner.serviceId) : n.add(m.partner.serviceId); return n })} />
        ))}
        {board && !shown.length && board.masters.length > 0 && <p className="text-[12.5px] font-bold text-[var(--ink-3)]">No offer matches those filters. <button type="button" onClick={() => setF({})} className="font-extrabold text-[var(--brand)]">Clear filters</button></p>}

        {board?.more && (
          <button type="button" onClick={() => load(board.page + 1)} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#F4F0FA] text-[13px] font-extrabold text-[#3B1670]" data-load-more>
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}Show more masters
          </button>
        )}

        {board?.close?.length > 0 && (
          <section className="rounded-[18px] bg-[#FFF8F3] p-3 shadow-[inset_0_0_0_1px_#FBE3D3]" data-close>
            <button type="button" onClick={() => setShowClose(v => !v)} className="flex w-full items-center justify-between text-left text-[13px] font-extrabold text-[#9A4A12]">
              Close, but not {exp?.name ?? 'what you chose'} · {board.close.length}<ChevronDown size={15} className={showClose ? 'rotate-180' : ''} />
            </button>
            {showClose && (
              <ul className="mt-2 space-y-1.5">
                {board.close.map(c => (
                  <li key={c.partner.serviceId} className="text-[12px] font-semibold text-[var(--ink-2)]">
                    <b>{c.partner.name}</b> — their “{c.option.label}”: {gapLine(c.option.gaps ?? [])}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {board?.unavailable?.length > 0 && (
          <p className="text-[11.5px] font-semibold text-[var(--ink-3)]" data-unavailable>
            Not free on your date: {board.unavailable.map(u => u.partner.name).join(', ')}
          </p>
        )}
      </div>
      <OfferCompare open={comparing} onClose={() => setComparing(false)} items={picked.map(x => ({ partner: x.m.partner, offer: x.o, m: x.m }))}
        onChoose={(m, o) => { setComparing(false); choose(m, o) }} />
    </Sheet>
  )
}
