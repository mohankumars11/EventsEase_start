/**
 * Book a venue with us — /o/:occasionId/venues (Mohan, 2026-11-11: "when
 * the customer selects book venue, provide him the entire venue listed in
 * the partner backend, synthetic too, with filters … so that he'll
 * directly book it, and post that book the rest").
 *
 * Every LIVE venue partner near the event (lib/market, the same rows the
 * offer board prices), never the OSM directory. Filters live in ONE sheet
 * (Mohan, 2026-11-14: "every option inside a filter, not a radio button …
 * type, budget, price, ratings, every customisation, like Zomato"): does a
 * space hold the guests, the kind of venue, catering rule, facilities,
 * price band, rating, distance, instant — and a sort. The cards are the
 * professional kind a customer books from: the photo, what it holds, the
 * price for the date, one tap to book. "Book this venue" opens the
 * matching step for the venue alone, with its spaces priced by the server.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Loader2, MapPin, Star, Users, Utensils, Zap } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { partnersFor, rank } from '../lib/market'
import { needsFor as tradeQuestions } from '../lib/needs'
import { savedWhere } from '../lib/where'
import { dayLabel } from '../lib/format'
import EventJourney from '../ui/EventJourney'
import { BackHeader, Photo } from '../ui/kit'
import FilterBar, { passes } from '../ui/FilterSheet'
import Glyph3D from '../ui/Glyph3D'

const rupees = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')
const list = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])
const SORTS = [['best', 'Best match', 'rating, distance and instant booking together'], ['price', 'Price · low to high'], ['near', 'Nearest first'], ['rating', 'Top rated'], ['big', 'Holds the most']]
const PRICE = [['u25k', 'Under ₹25,000', 0, 2500000], ['25k50k', '₹25,000 – 50,000', 2500000, 5000000], ['50k1l', '₹50,000 – 1 L', 5000000, 10000000], ['1l2l', '₹1 – 2 L', 10000000, 20000000], ['2l+', '₹2 L and above', 20000000, Infinity]]
const RATING = [['4.5', '4.5 ★ and up', 4.5], ['4.0', '4.0 ★ and up', 4], ['3.5', '3.5 ★ and up', 3.5]]
const NEAR = [['3', 'Within 3 km', 3], ['5', 'Within 5 km', 5], ['10', 'Within 10 km', 10], ['20', 'Within 20 km', 20]]

export default function Venues() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const place = plan.place?.lat ? plan.place : savedWhere()
  const guests = Number(ev.guests) || 0
  const [all, setAll] = useState(null)
  const [f, setF] = useState({ fits: true })
  const [sort, setSort] = useState('best')
  useEffect(() => {
    let live = true
    partnersFor('venue', place?.lat ? { lat: place.lat, lng: place.lng, limit: 100 } : { limit: 100 }).then(l => live && setAll(l), () => live && setAll([]))
    return () => { live = false }
  }, [place?.lat, place?.lng])

  const qs = tradeQuestions('venue')
  const label = (key, id) => qs.find(q => q.key === key)?.options.find(x => x.id === id)?.label ?? String(id).replace(/_/g, ' ')
  const holds = p => Math.max(Number(p.facets?.max_capacity) || 0, ...(p.spaces ?? []).map(s => Number(s.capacity) || 0))
  const fitting = p => (p.spaces ?? []).filter(s => !guests || !s.capacity || s.capacity >= guests)
  const price = p => fitting(p).map(s => s.paise).filter(Boolean).sort((a, b) => a - b)[0] ?? p.fromPaise ?? null
  const band = p => { const x = price(p); return x == null ? null : PRICE.find(([, , lo, hi]) => x >= lo && x < hi)?.[0] ?? null }
  const opts = (key, ids) => ids.map(id => ({ id, label: label(key, id), count: (all ?? []).filter(p => list(p.facets?.[key]).includes(id)).length })).sort((a, b) => b.count - a.count)
  const facets = useMemo(() => {
    const rows = all ?? []
    const types = [...new Set(rows.flatMap(p => list(p.facets?.venue_type)))]
    const fac = [...new Set(rows.flatMap(p => list(p.facets?.facilities)))]
    return [
      { id: 'fits', type: 'toggle', label: 'Capacity', on: `Fits ${guests.toLocaleString('en-IN')} guests`, icon: Users },
      { id: 'instant', type: 'toggle', label: 'Booking', on: 'Instant booking', icon: Zap, hint: 'Confirmed the moment you pay — no waiting for an accept' },
      types.length > 1 && { id: 'type', type: 'many', anyOf: true, label: 'Kind of venue', options: opts('venue_type', types) },
      { id: 'rule', type: 'one', label: 'Food', options: [{ id: 'outside', label: 'Bring your own caterer', icon: Utensils }, { id: 'inhouse', label: 'In-house food' }] },
      fac.length > 0 && { id: 'must', type: 'many', label: 'Must-have facilities', options: opts('facilities', fac).slice(0, 14) },
      { id: 'price', type: 'one', label: 'Price per slot', options: PRICE.map(([id, l]) => ({ id, label: l })) },
      { id: 'rating', type: 'one', label: 'Rating', options: RATING.map(([id, l]) => ({ id, label: l, icon: Star })) },
      { id: 'near', type: 'one', label: 'Distance', options: NEAR.map(([id, l]) => ({ id, label: l, icon: MapPin })) },
    ].filter(Boolean)
  }, [all, guests]) // eslint-disable-line react-hooks/exhaustive-deps
  const get = (p, id) => ({
    fits: !guests || holds(p) >= guests || fitting(p).length > 0,
    instant: !!p.instant,
    type: list(p.facets?.venue_type),
    rule: list(p.facets?.catering_rule).includes('in_house_only') ? ['inhouse'] : list(p.facets?.catering_rule).length ? ['outside'] : ['outside', 'inhouse'],
    must: list(p.facets?.facilities),
    price: band(p),
    rating: RATING.filter(([, , min]) => (p.rating ?? 0) >= min).map(([id]) => id),
    near: NEAR.filter(([, , km]) => p.distanceKm != null && p.distanceKm <= km).map(([id]) => id),
  })[id]
  const shown = useMemo(() => {
    if (!all) return []
    const l = all.filter(p => passes(p, facets, f, get))
    if (sort === 'price') return [...l].sort((a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity))
    if (sort === 'near') return [...l].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
    if (sort === 'rating') return [...l].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    if (sort === 'big') return [...l].sort((a, b) => holds(b) - holds(a))
    return rank(l)
  }, [all, facets, f, sort, guests]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />
  const book = p => { plan.setPick(o.id, 'venue', 'need'); navigate(`/o/${o.id}/live?only=venue&master=${p.serviceId}`) }

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#FAF8FD] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-venues>
      <BackHeader title="Book a venue" sub={`${o.name} · ${guests.toLocaleString('en-IN')} guests · ${dayLabel(ev.date)}`} onBack={() => navigate(`/o/${o.id}/plan`)} />
      <EventJourney at={1} occasionId={o.id} />

      <section className="mx-3 mt-3 flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-[#5B21B6] to-[#8B5CF6] p-3 text-white" data-venues-head>
        <Glyph3D id="venue" size={52} lift />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#FFE071]">Verified venue partners</span>
          <span className="block text-[16.5px] font-black leading-tight">{all ? `${shown.length} ${shown.length === 1 ? 'venue' : 'venues'} for your ${o.name.toLowerCase()}` : 'Finding venues near you…'}</span>
          <span className="block text-[11.5px] font-semibold text-white/85">Near {place?.area ?? 'you'} · every price is for your date · your date is locked when you book</span>
        </span>
      </section>

      <FilterBar className="mt-3" facets={facets} value={f} onChange={setF} sorts={SORTS} sort={sort} onSort={setSort} count={all ? shown.length : null}
        quick={[{ facet: 'fits', label: `Fits ${guests.toLocaleString('en-IN')}`, icon: Users }, { facet: 'instant', label: 'Instant', icon: Zap }, { facet: 'rule', id: 'outside', label: 'Own caterer' }]} />

      <section className="mt-3 space-y-3 px-3" data-venue-list>
        {!all && <p className="flex items-center gap-2 py-8 text-center text-[13px] font-bold text-[var(--ink-3)]"><Loader2 size={16} className="animate-spin text-[#7C3AED]" />Reading live venue listings…</p>}
        {all && !shown.length && (
          <div className="rounded-[20px] bg-white p-5 text-center shadow-[0_0_0_1px_#EEE8F8]">
            <p className="text-[15px] font-black">{all.length ? 'No venue matches those filters yet' : 'No venue partner near here yet'}</p>
            <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-2)]">{all.length ? 'Loosen a filter, or let us find one — masters still come to the place you choose.' : 'Venues are joining Sambramo now. Masters still come to the place you choose.'}</p>
            {all.length > 0 && <button type="button" onClick={() => setF({})} className="cx-press mt-3 rounded-full bg-[#1C1033] px-4 py-2 text-[12.5px] font-extrabold text-white">Show every venue</button>}
          </div>
        )}
        {shown.map((p, i) => {
          const sp = fitting(p).sort((a, b) => (a.paise ?? Infinity) - (b.paise ?? Infinity))
          const cap = holds(p)
          const from = sp[0]?.paise ?? p.fromPaise
          return (
            <article key={p.serviceId} className="overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#ECE6F4,0_22px_44px_-30px_rgba(58,18,144,.7)]" data-venue={p.serviceId}>
              <Link to={`/p/${p.serviceId}`} className="relative block aspect-[16/10] bg-[#F3EEF9]">
                <Photo src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <span className="absolute left-3 top-3 flex flex-wrap gap-1">
                  {p.reason && <span className="rounded-full bg-[#1C1033] px-2 py-0.5 text-[10.5px] font-black text-white">{p.reason}</span>}
                  {list(p.facets?.venue_type).slice(0, 1).map(t => <span key={t} className="rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-extrabold text-[#3B1670]">{label('venue_type', t)}</span>)}
                </span>
                {p.instant && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#FFD84A] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-[#5E3500]"><Zap size={10} className="fill-current" />Instant</span>}
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
                  <span className="min-w-0">
                    <span className="block truncate text-[18px] font-black leading-tight tracking-[-0.025em]">{p.name}</span>
                    <span className="flex items-center gap-2 text-[11.5px] font-bold text-white/90">
                      <span className="flex items-center gap-1"><MapPin size={11} />{p.area ?? 'Bengaluru'}{p.distanceKm != null ? ` · ${p.distanceKm.toFixed(1)} km` : ''}</span>
                      {p.precise && <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, '_blank', 'noopener') }} className="pointer-events-auto underline underline-offset-2" data-directions>Directions</button>}
                      {cap > 0 && <span className="flex items-center gap-1"><Users size={11} />Holds {cap.toLocaleString('en-IN')}</span>}
                    </span>
                  </span>
                  {p.rating && <span className="flex shrink-0 items-center gap-1 rounded-[10px] bg-[#16A34A] px-2 py-1 text-[12.5px] font-black"><Star size={12} className="fill-current" />{p.rating.toFixed(1)}{p.reviews ? <span className="text-[10.5px] font-bold text-white/85"> ({p.reviews})</span> : null}</span>}
                </span>
              </Link>
              <div className="p-3">
                {/* The spaces that hold the guests: a mini card each, price big. */}
                {sp.length > 0 ? (
                  <div data-venue-spaces>
                    <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.12em] text-[#0B7A45]"><Users size={12} />{sp.length === 1 ? 'The space' : `${sp.length} spaces`} for your {guests.toLocaleString('en-IN')} guests</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {sp.slice(0, 4).map(s => (
                        <span key={s.key} className="flex flex-col rounded-[14px] bg-[#F8F5FD] p-2.5 shadow-[inset_0_0_0_1px_#EEE8F8]">
                          <span className="truncate text-[12.5px] font-extrabold text-[#2E1A4F]">{s.name}</span>
                          {s.capacity && <span className="text-[10.5px] font-bold text-[var(--ink-3)]">holds {s.capacity.toLocaleString('en-IN')}</span>}
                          {s.paise && <span className="cx-num mt-1 text-[14px] font-black text-[#1C1033]">{rupees(s.paise)}<span className="text-[9.5px] font-bold text-[var(--ink-3)]"> / slot</span></span>}
                        </span>
                      ))}
                    </div>
                    {sp.length > 4 && <p className="mt-1 px-1 text-[11px] font-bold text-[var(--ink-3)]">+ {sp.length - 4} more spaces</p>}
                  </div>
                ) : from ? <p className="rounded-[12px] bg-[#F8F5FD] px-3 py-2 text-[12px] font-bold text-[#2E1A4F]">From <span className="cx-num font-black">{rupees(from)}</span> per slot</p> : null}
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold text-[var(--ink-3)]">
                  {list(p.facets?.catering_rule)[0] && <span className="flex items-center gap-1"><Utensils size={11} />{label('catering_rule', list(p.facets?.catering_rule)[0])}</span>}
                  {list(p.facets?.facilities).slice(0, 4).map(x => <span key={x} className="flex items-center gap-0.5"><Check size={11} className="text-[#16A34A]" />{label('facilities', x)}</span>)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link to={`/p/${p.serviceId}`} className="cx-press flex h-11 shrink-0 items-center rounded-[14px] bg-[#F4F1F8] px-3.5 text-[12.5px] font-extrabold text-[var(--ink-2)]">Details</Link>
                  <button type="button" onClick={() => book(p)} className="cx-press cx-cta flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] text-[13.5px] font-extrabold" data-book-venue={p.serviceId}>Book this venue<ChevronRight size={16} /></button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
