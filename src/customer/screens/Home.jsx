/**
 * Home.
 *
 * Laid out to Mohan's reference (2026-10-23): the two doors as big cards
 * at the top — Celebrations, Book a Service — then the hero, the search,
 * and the eighteen event categories four across as 3D illustrated cards
 * with their names underneath. Below them, where the masters are.
 *
 * The doors switch the page in place rather than navigating, so the
 * search and the hero stay put and the choice is remembered for the
 * session. "Book a Service" shows the 34 services in the same card family.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, MapPin, PartyPopper, Search, SlidersHorizontal, Wrench } from 'lucide-react'
import { useCity } from '../../context/CityContext'
import { useAuth } from '../../context/AuthContext'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { usePlan } from '../state/PlanContext'
import { CATEGORIES, OCCASIONS } from '../data/occasions'
import { TRADE_GROUPS } from '../data/trades'
import { artFor } from '../data/art'
import { CategoryCard, ServiceCard } from '../ui/art'
import PlaceSheet from './PlaceSheet'

export default function Home() {
  const { city, openCityPicker } = useCity()
  const { profile } = useAuth()
  const plan = usePlan()
  const navigate = useNavigate()
  const [door, setDoor] = useState(() => { try { return sessionStorage.getItem('sbm.cx.door') ?? 'occasions' } catch { return 'occasions' } })
  const [placeOpen, setPlaceOpen] = useState(false)
  const choose = d => { setDoor(d); try { sessionStorage.setItem('sbm.cx.door', d) } catch { /* storage off */ } }
  const name = profile?.full_name?.trim()
  const hero = artFor('hero-family')

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <header className="cx-safe-top flex items-center justify-between gap-3 px-4">
        <button type="button" onClick={openCityPicker} className="cx-press flex min-w-0 items-center gap-1.5 py-1.5" data-city>
          <MapPin size={22} className="shrink-0 fill-[var(--brand)] text-white" strokeWidth={1.6} />
          <span className="truncate text-[17px] font-extrabold tracking-[-0.02em]">{plan.place?.area ?? city}</span>
          <ChevronDown size={18} className="shrink-0 text-[var(--brand)]" />
        </button>
        <Link to="/me" aria-label="Account" className="cx-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#F3EDFF] to-[#E2D3FF] text-[15px] font-extrabold text-[var(--am-ink)] ring-2 ring-white shadow-[0_6px_16px_-8px_rgba(58,18,144,.6)]">
          {name ? name[0].toUpperCase() : 'S'}
        </Link>
      </header>

      {/* The two doors. */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 px-4" role="tablist">
        <Door on={door === 'occasions'} onClick={() => choose('occasions')} icon={PartyPopper} title="Celebrations" sub="Plan your moments" />
        <Door on={door === 'services'} onClick={() => choose('services')} icon={Wrench} title="Book a Service" sub="Find trusted masters" />
      </div>

      {/* The hero. */}
      <section className="relative mx-4 mt-4 h-[168px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FDEBF5] via-[#F6EAFF] to-[#E9E0FF]" aria-label="Sambramo">
        {hero && <img src={hero} alt="" className="absolute bottom-0 right-0 h-full w-[64%] object-cover object-left [mask-image:linear-gradient(90deg,transparent_0%,#000_22%)]" />}
        <div className="relative z-10 flex h-full max-w-[52%] flex-col justify-center pl-4">
          <h1 className="text-[22px] font-extrabold leading-[1.05] tracking-[-0.035em] text-[#1E0B4B]">Make Every Moment Special</h1>
          <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-[#5B4A86]">From birthdays to big milestones, we make it happen</p>
        </div>
      </section>

      <button type="button" onClick={() => navigate('/search')} className="cx-press mx-4 mt-4 flex h-[52px] w-[calc(100%-32px)] items-center gap-3 rounded-full bg-white px-4 text-left shadow-[0_0_0_1.5px_var(--am-200),0_10px_24px_-18px_rgba(58,18,144,.6)]" data-search>
        <Search size={20} className="shrink-0 text-[var(--am-ink)]" />
        <span className="flex-1 truncate text-[13.5px] font-semibold text-[var(--ink-3)]">Search occasion, service or anything…</span>
        <SlidersHorizontal size={19} className="shrink-0 text-[var(--am-ink)]" />
      </button>

      {door === 'occasions' ? (
        <section className="cx-enter mt-6" key="o">
          <Head title={`Explore ${CATEGORIES.length} Event Categories`} action={<Link to="/search" className="flex items-center gap-0.5 text-[13px] font-extrabold text-[var(--brand)]">View all<ChevronRight size={16} /></Link>} />
          <div className="grid grid-cols-4 gap-2.5 px-4">
            {CATEGORIES.map(c => <CategoryCard key={c.id} category={c} />)}
            <Helper onClick={() => choose('services')} title="Just one service" sub="34 kinds" />
            <Helper onClick={() => navigate('/search')} title="Search all" sub={`${OCCASIONS.length} occasions`} />
          </div>
        </section>
      ) : (
        <section className="cx-enter mt-6" key="s">
          {TRADE_GROUPS.map((g, i) => (
            <div key={g.id} className={i ? 'mt-5' : ''}>
              <Head title={g.label} />
              <div className="grid grid-cols-4 gap-2.5 px-4">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
            </div>
          ))}
        </section>
      )}

      <button type="button" onClick={() => setPlaceOpen(true)} className="cx-press relative mx-4 mt-6 flex w-[calc(100%-32px)] items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-r from-[#5B21C8] via-[#7A3FE4] to-[#A47BFF] px-4 py-3.5 text-left text-white shadow-[0_16px_30px_-18px_rgba(58,18,144,.9)]" data-places>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20"><MapPin size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-extrabold tracking-[-0.02em]">Explore {BENGALURU_AREAS.length} areas of {city}</span>
          <span className="block truncate text-[11.5px] font-semibold text-white/80">{plan.place?.area ? `Showing masters near ${plan.place.area}` : 'Set yours for exact travel and prices'}</span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[var(--brand)]"><ChevronRight size={18} /></span>
      </button>

      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} value={plan.place} onPick={p => { plan.setPlace(p); setPlaceOpen(false) }} />
    </main>
  )
}

function Door({ on, onClick, icon: Icon, title, sub }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick} data-door={title}
      className={'cx-press flex min-w-0 items-center gap-2.5 rounded-[20px] px-3 py-3 text-left transition ' +
        (on ? 'bg-gradient-to-br from-[#6A2BD9] to-[#4A16B0] text-white shadow-[0_14px_26px_-14px_rgba(74,22,176,.9)]' : 'bg-white text-[var(--am-ink)] shadow-[0_0_0_1.5px_var(--am-200)]')}>
      <Icon size={24} className="shrink-0" strokeWidth={2.1} />
      <span className="min-w-0">
        <span className="block truncate text-[14.5px] font-extrabold tracking-[-0.02em]">{title}</span>
        <span className={'block truncate text-[10.5px] font-semibold ' + (on ? 'text-white/80' : 'text-[var(--ink-3)]')}>{sub}</span>
      </span>
    </button>
  )
}

function Head({ title, action = null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-3">
      <h2 className="text-[18px] font-extrabold tracking-[-0.03em]">{title}</h2>
      {action}
    </div>
  )
}

function Helper({ onClick, title, sub }) {
  return (
    <button type="button" onClick={onClick} className="cx-press flex flex-col items-center justify-center rounded-[16px] bg-[var(--am-50)] px-1.5 text-center border border-dashed border-[var(--am-300)]">
      <span className="text-[11px] font-extrabold leading-tight text-[var(--am-ink)]">{title}</span>
      <span className="mt-0.5 text-[10px] font-bold text-[var(--ink-3)]">{sub}</span>
    </button>
  )
}
