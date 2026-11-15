/**
 * Our restaurants — /o/:occasionId/restaurants (Mohan, 2026-11-11: "if you
 * wanted to order from a restaurant, we should have all the restaurants
 * … book a dining, or order catering food from the restaurant").
 *
 * Every LIVE Restaurant & Dining partner (trade #35) near the event. The
 * filters are ONE sheet (Mohan, 2026-11-14: "when we go to restaurant,
 * every specific option … inside a filter, not a radio button — veg,
 * non-veg, type, budget, price, ratings, like Zomato, Swiggy"): how they
 * can host, what they serve, veg or not, cuisines, formats, facilities,
 * price per person, rating, distance, alcohol, instant — and a sort. The
 * cards are the kind people order from. "Book" opens the matching step for
 * the restaurant alone, priced per person for the guest count.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Leaf, Loader2, MapPin, Star, Users, Wine, Zap } from 'lucide-react'
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
const MODES = [['table_booking', 'Book a table'], ['private_dining_room', 'Private room'], ['party_hall', 'Party hall'], ['bulk_order_delivered', 'Order in']]
const SORTS = [['best', 'Best match', 'rating, distance and instant booking together'], ['price', 'Price · low to high'], ['near', 'Nearest first'], ['rating', 'Top rated']]
const PRICE = [['u300', 'Under ₹300 / person', 0, 30000], ['300600', '₹300 – 600', 30000, 60000], ['6001k', '₹600 – 1,000', 60000, 100000], ['1k+', '₹1,000 and above', 100000, Infinity]]
const RATING = [['4.5', '4.5 ★ and up', 4.5], ['4.0', '4.0 ★ and up', 4], ['3.5', '3.5 ★ and up', 3.5]]
const NEAR = [['3', 'Within 3 km', 3], ['5', 'Within 5 km', 5], ['10', 'Within 10 km', 10]]
const servesVeg = p => list(p.facets?.diet).some(d => ['pure_vegetarian', 'veg_and_non_veg', 'jain_available', 'vegan_available'].includes(d))
const servesNonVeg = p => list(p.facets?.diet).some(d => ['veg_and_non_veg', 'non_vegetarian'].includes(d))

export default function Restaurants() {
  const { occasionId } = useParams()
  const o = OCCASION[occasionId]
  const navigate = useNavigate()
  const plan = usePlan()
  const ev = plan.event
  const valid = !!(o && ev.occasionId === o.id && ev.date)
  const place = plan.place?.lat ? plan.place : savedWhere()
  const guests = Number(ev.guests) || 0
  const answers = o ? plan.answersOf(o.id) : {}
  const [all, setAll] = useState(null)
  /* What the event already said: a bulk order, a veg table. */
  const [f, setF] = useState(() => ({ mode: answers.food_way === 'order' ? 'bulk_order_delivered' : null, food: ['veg', 'jain', 'vegan'].includes(answers.diet) ? 'pure' : answers.diet === 'nonveg' ? 'nonveg' : null, seats: true }))
  const [sort, setSort] = useState('best')
  useEffect(() => {
    let live = true
    partnersFor('restaurant', place?.lat ? { lat: place.lat, lng: place.lng, limit: 100 } : { limit: 100 }).then(l => live && setAll(l), () => live && setAll([]))
    return () => { live = false }
  }, [place?.lat, place?.lng])

  const qs = tradeQuestions('restaurant')
  const label = (key, id) => qs.find(q => q.key === key)?.options.find(x => x.id === id)?.label ?? String(id).replace(/_/g, ' ')
  const seats = p => Math.max(Number(p.facets?.seating_capacity) || 0, Number(p.facets?.private_room_capacity) || 0)
  const band = p => (p.fromPaise == null ? null : PRICE.find(([, , lo, hi]) => p.fromPaise >= lo && p.fromPaise < hi)?.[0] ?? null)
  const opts = (key, ids) => ids.map(id => ({ id, label: label(key, id), count: (all ?? []).filter(p => list(p.facets?.[key]).includes(id)).length })).sort((a, b) => b.count - a.count)
  const facets = useMemo(() => {
    const rows = all ?? []
    const cuisines = [...new Set(rows.flatMap(p => list(p.facets?.cuisines)))]
    const formats = [...new Set(rows.flatMap(p => list(p.facets?.meal_formats)))]
    const fac = [...new Set(rows.flatMap(p => list(p.facets?.facilities)))]
    return [
      { id: 'mode', type: 'one', label: 'How you want it', options: MODES.map(([id, l]) => ({ id, label: l, count: rows.filter(p => list(p.facets?.dining_modes).includes(id)).length })) },
      { id: 'food', type: 'one', label: 'Veg or non-veg', options: [{ id: 'pure', label: 'Pure veg only', icon: Leaf }, { id: 'veg', label: 'Serves veg', icon: Leaf }, { id: 'nonveg', label: 'Serves non-veg' }] },
      { id: 'seats', type: 'toggle', label: 'Seating', on: `Seats ${guests.toLocaleString('en-IN')}`, icon: Users, hint: 'Not applied to orders delivered to you' },
      cuisines.length > 1 && { id: 'cuisine', type: 'many', anyOf: true, label: 'Cuisine', options: opts('cuisines', cuisines).slice(0, 14) },
      formats.length > 1 && { id: 'format', type: 'many', anyOf: true, label: 'Meal format', options: opts('meal_formats', formats) },
      { id: 'price', type: 'one', label: 'Price per person', options: PRICE.map(([id, l]) => ({ id, label: l })) },
      { id: 'rating', type: 'one', label: 'Rating', options: RATING.map(([id, l]) => ({ id, label: l, icon: Star })) },
      { id: 'near', type: 'one', label: 'Distance', options: NEAR.map(([id, l]) => ({ id, label: l, icon: MapPin })) },
      fac.length > 0 && { id: 'fac', type: 'many', label: 'Facilities', options: opts('facilities', fac).slice(0, 12) },
      { id: 'alcohol', type: 'toggle', label: 'Bar', on: 'Serves alcohol', icon: Wine },
      { id: 'instant', type: 'toggle', label: 'Booking', on: 'Instant booking', icon: Zap },
    ].filter(Boolean)
  }, [all, guests]) // eslint-disable-line react-hooks/exhaustive-deps
  const get = (p, id) => ({
    mode: list(p.facets?.dining_modes),
    food: [list(p.facets?.diet).includes('pure_vegetarian') && 'pure', servesVeg(p) && 'veg', servesNonVeg(p) && 'nonveg'].filter(Boolean),
    seats: f.mode === 'bulk_order_delivered' || !guests || !seats(p) || seats(p) >= guests,
    cuisine: list(p.facets?.cuisines),
    format: list(p.facets?.meal_formats),
    price: band(p),
    rating: RATING.filter(([, , min]) => (p.rating ?? 0) >= min).map(([id]) => id),
    near: NEAR.filter(([, , km]) => p.distanceKm != null && p.distanceKm <= km).map(([id]) => id),
    fac: list(p.facets?.facilities),
    alcohol: p.facets?.alcohol === true || p.facets?.alcohol === 'true',
    instant: !!p.instant,
  })[id]
  const shown = useMemo(() => {
    if (!all) return []
    const l = all.filter(p => passes(p, facets, f, get))
    if (sort === 'price') return [...l].sort((a, b) => (a.fromPaise ?? Infinity) - (b.fromPaise ?? Infinity))
    if (sort === 'near') return [...l].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
    if (sort === 'rating') return [...l].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    return rank(l)
  }, [all, facets, f, sort, guests]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return <Navigate to="/" replace />
  if (!valid) return <Navigate to={`/o/${o.id}`} replace />
  const book = p => { plan.setPick(o.id, 'restaurant', 'need'); navigate(`/o/${o.id}/live?only=restaurant&master=${p.serviceId}`) }
  const ordering = f.mode === 'bulk_order_delivered'

  return (
    <main className="cx-enter min-h-[100dvh] bg-[#FAF8FD] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-restaurants>
      <BackHeader title="Restaurants" sub={`${o.name} · ${guests.toLocaleString('en-IN')} guests · ${dayLabel(ev.date)}`} onBack={() => navigate(`/o/${o.id}/plan`)} />
      <EventJourney at={1} occasionId={o.id} />

      <section className="mx-3 mt-3 flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-[#0B7A45] to-[#16A34A] p-3 text-white" data-restaurants-head>
        <Glyph3D id="svc:food" size={52} lift />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#FFE071]">Our restaurant partners</span>
          <span className="block text-[16.5px] font-black leading-tight">{all ? `${shown.length} ${shown.length === 1 ? 'restaurant' : 'restaurants'} for your ${o.name.toLowerCase()}` : 'Finding restaurants near you…'}</span>
          <span className="block text-[11.5px] font-semibold text-white/85">Near {place?.area ?? 'you'} · set menus priced per person · you pay after they accept</span>
        </span>
      </section>

      <FilterBar className="mt-3" facets={facets} value={f} onChange={setF} sorts={SORTS} sort={sort} onSort={setSort} count={all ? shown.length : null}
        quick={[{ facet: 'food', id: 'pure', label: 'Pure veg', icon: Leaf }, { facet: 'food', id: 'nonveg', label: 'Non-veg' }, { facet: 'mode', id: 'bulk_order_delivered', label: 'Order in' }, { facet: 'mode', id: 'table_booking', label: 'Table' }]} />

      <section className="mt-3 grid grid-cols-2 gap-2.5 px-3" data-restaurant-list>
        {!all && <p className="col-span-2 flex items-center gap-2 py-8 text-[13px] font-bold text-[var(--ink-3)]"><Loader2 size={16} className="animate-spin text-[#16A34A]" />Reading live restaurant listings…</p>}
        {all && !shown.length && (
          <div className="col-span-2 rounded-[20px] bg-white p-5 text-center shadow-[0_0_0_1px_#EEE8F8]">
            <p className="text-[15px] font-black">{all.length ? 'No restaurant matches those filters yet' : 'No restaurant partner near here yet'}</p>
            <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-2)]">{all.length ? 'Loosen a filter to see every restaurant.' : 'Restaurants are joining Sambramo now. A caterer can deliver the same food to your place meanwhile.'}</p>
            {all.length > 0 && <button type="button" onClick={() => setF({})} className="cx-press mt-3 rounded-full bg-[#1C1033] px-4 py-2 text-[12.5px] font-extrabold text-white">Show every restaurant</button>}
          </div>
        )}
        {/* Two a row (Mohan, 2026-11-14): the photo, the diet mark, the rating, the price per person, one Book. */}
        {shown.map(p => {
          const pure = list(p.facets?.diet).includes('pure_vegetarian')
          return (
            <article key={p.serviceId} className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#ECE6F4,0_18px_36px_-28px_rgba(58,18,144,.7)]" data-restaurant={p.serviceId}>
              <Link to={`/p/${p.serviceId}`} className="relative block aspect-[4/3] bg-[#F3EEF9]">
                <Photo src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/65 to-transparent" />
                <span className={'absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-[4px] bg-white ring-1 ' + (pure || !servesNonVeg(p) ? 'ring-[#1B7F4A]' : 'ring-[#B42318]')} title={pure ? 'Pure veg' : 'Serves non-veg'}>
                  <span className={'h-2.5 w-2.5 rounded-full ' + (pure || !servesNonVeg(p) ? 'bg-[#1B7F4A]' : 'bg-[#B42318]')} />
                </span>
                {p.instant && <span className="absolute right-2 top-2 rounded-full bg-[#FFD84A] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#5E3500]">Instant</span>}
                <span className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1 text-white">
                  {p.rating ? <span className="flex items-center gap-0.5 rounded-[8px] bg-[#16A34A] px-1.5 py-0.5 text-[11.5px] font-black"><Star size={10} className="fill-current" />{p.rating.toFixed(1)}</span> : <span />}
                  {p.distanceKm != null && (p.precise ? <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, '_blank', 'noopener') }} className="rounded-full bg-black/35 px-1.5 text-[10.5px] font-extrabold underline-offset-2" data-directions>{p.distanceKm.toFixed(1)} km · Map</button> : <span className="text-[10.5px] font-extrabold">{p.distanceKm.toFixed(1)} km</span>)}
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-2.5">
                <span className="block truncate text-[14px] font-black tracking-[-0.02em] text-[#1C1033]">{p.name}</span>
                <span className="block truncate text-[11px] font-bold text-[#0B7A45]">{list(p.facets?.cuisines).slice(0, 2).map(c => label('cuisines', c)).join(' · ') || label('diet', list(p.facets?.diet)[0])}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {list(p.facets?.dining_modes).slice(0, 2).map(m => <span key={m} className="rounded-full bg-[#F4F1F8] px-1.5 py-0.5 text-[9.5px] font-extrabold text-[var(--ink-2)]">{label('dining_modes', m)}</span>)}
                  {seats(p) > 0 && <span className="flex items-center gap-0.5 rounded-full bg-[#F4F1F8] px-1.5 py-0.5 text-[9.5px] font-extrabold text-[var(--ink-2)]"><Users size={9} />{seats(p)}</span>}
                </span>
                <div className="mt-auto flex items-end justify-between gap-1 pt-2">
                  {p.fromPaise ? <span><span className="cx-num block text-[14px] font-black leading-none text-[#1C1033]">{rupees(p.fromPaise)}</span><span className="block text-[9.5px] font-bold text-[var(--ink-3)]">{p.fromLabel ? 'per person' : p.fromUnit}</span></span> : <span className="text-[10.5px] font-bold text-[var(--ink-3)]">Priced on request</span>}
                  <button type="button" onClick={() => book(p)} className="cx-press flex h-9 items-center gap-0.5 rounded-[11px] bg-gradient-to-r from-[#16A34A] to-[#0B7A45] px-3 text-[12px] font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(11,122,69,.95)]" data-book-restaurant={p.serviceId}>
                    {ordering ? 'Order' : 'Book'}<ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
