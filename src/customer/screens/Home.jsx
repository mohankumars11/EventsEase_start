/**
 * Celebrate — the first screen.
 *
 * Two doors of equal weight, because customers arrive two ways: thinking
 * about an OCCASION ("my daughter's first birthday") or about a SERVICE
 * ("I need a photographer on Saturday"). The switch keeps both on the
 * first screen without stacking one under the other.
 *
 * The date strip sits above both: it is the one fact every list needs,
 * and a customer who sets it once never sees it asked again.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LayoutGrid, MapPin, PartyPopper, Search, ShieldCheck, Wallet, BadgeCheck } from 'lucide-react'
import { useCity } from '../../context/CityContext'
import { useAuth } from '../../context/AuthContext'
import { usePlan } from '../state/PlanContext'
import { CATEGORIES, FEATURED, inSeason } from '../data/occasions'
import { TRADE_GROUPS } from '../data/trades'
import { CategoryTile, OccasionTile, TradeTile } from '../ui/cards'
import { SectionHead, Segmented } from '../ui/kit'
import WhenSheet from './WhenSheet'
import WhenCapsule from '../ui/When'

const POPULAR_TRADES = ['photography', 'catering_food', 'decoration_floral', 'cake_desserts', 'bridal_makeup_hair', 'dj_music', 'mehendi_artist', 'priest_rituals']

export default function Home() {
  const { city, openCityPicker } = useCity()
  const { profile } = useAuth()
  const { event, setEvent } = usePlan()
  const navigate = useNavigate()
  const [door, setDoor] = useState(() => { try { return sessionStorage.getItem('sbm.cx.door') ?? 'occasions' } catch { return 'occasions' } })
  const [pickDate, setPickDate] = useState(false)
  const season = useMemo(() => inSeason(), [])
  const choose = d => { setDoor(d); try { sessionStorage.setItem('sbm.cx.door', d) } catch { /* storage off */ } }
  const name = profile?.full_name?.split(' ')[0]

  return (
    <main className="cx-enter cx-bottom-pad-bar">
      <header className="cx-safe-top px-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={openCityPicker} className="cx-press flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-2 text-left" data-city>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-tint)] text-[var(--brand)]"><MapPin size={18} /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[15px] font-extrabold tracking-[-0.02em]">{city}<ChevronDown size={16} /></span>
              <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">Verified partners near you</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Link to="/notifications" aria-label="Notifications" className="cx-press cx-btn grid h-11 w-11 place-items-center rounded-full"><Bell size={19} /></Link>
            <Link to="/me" aria-label="Account" className="cx-press cx-btn grid h-11 w-11 place-items-center rounded-full text-[15px] font-extrabold">
              {name ? name[0].toUpperCase() : 'S'}
            </Link>
          </div>
        </div>

        <h1 className="cx-display mt-5 text-[34px]">
          {name ? <>{name}, what are<br />we celebrating?</> : <>What are we<br />celebrating?</>}
        </h1>

        <button type="button" onClick={() => navigate('/search')} className="cx-press mt-4 flex h-14 w-full items-center gap-3 rounded-[18px] bg-[var(--soft)] px-4 text-left" data-search>
          <Search size={20} className="text-[var(--brand)]" />
          <span className="flex-1 truncate text-[14.5px] font-semibold text-[var(--ink-3)]">Haldi, photographer, annual day…</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[var(--am-ink)] shadow-[0_0_0_1px_var(--am-200)]">438 occasions</span>
        </button>
      </header>

      {/* When — the day and the start time, set once and read by every list after it. */}
      <section className="mx-4 mt-4">
        <WhenCapsule date={event.date} time={event.time} hours={event.hours} onOpen={() => setPickDate(true)} />
      </section>

      <div className="sticky top-0 z-[110] mt-4 bg-white/95 px-4 py-2.5 backdrop-blur-xl" style={{ top: 0 }}>
        <Segmented value={door} onChange={choose} options={[
          { value: 'occasions', label: 'Celebrations', icon: PartyPopper },
          { value: 'services', label: 'Book a service', icon: LayoutGrid },
        ]} />
      </div>

      {door === 'occasions' ? (
        <div className="cx-enter" key="o">
          <SectionHead className="mt-4" title="Planning season" sub="What Bengaluru is booking this month" />
          <div className="cx-rail cx-noscroll">
            {season.map(o => <OccasionTile key={o.id} occasion={o} size="lg" className="w-[64%] max-w-[300px]" />)}
          </div>

          <SectionHead className="mt-3" title="Every moment, covered" sub={`${CATEGORIES.length} kinds of celebration, every one planned to what it needs`} />
          <div className="grid grid-cols-2 gap-3 px-4">
            {CATEGORIES.map(c => <CategoryTile key={c.id} category={c} />)}
          </div>

          <SectionHead className="mt-8" title="Most loved" sub="Planned end to end on Sambramo" />
          <div className="grid grid-cols-2 gap-3 px-4">
            {FEATURED.slice(0, 10).map(o => <OccasionTile key={o.id} occasion={o} />)}
          </div>
        </div>
      ) : (
        <div className="cx-enter" key="s">
          <SectionHead className="mt-4" title="Book a pro, instantly" sub="Pick one service — confirm and pay in a minute" />
          <div className="cx-rail cx-noscroll">
            {POPULAR_TRADES.map(id => <TradeTile key={id} tradeId={id} className="w-[38%] max-w-[170px]" />)}
          </div>
          {TRADE_GROUPS.map(g => (
            <section key={g.id} className="mt-3">
              <SectionHead title={g.label} />
              <div className="grid grid-cols-3 gap-2.5 px-4">
                {g.trades.map(t => <TradeTile key={t.id} tradeId={t.id} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="mx-4 mt-10 grid grid-cols-3 gap-2 rounded-[24px] bg-[var(--brand-deep)] p-4 text-white" aria-label="Why Sambramo">
        {[[BadgeCheck, 'Verified partners', 'Checked before they go live'], [Wallet, 'Escrow payments', 'Released after your event'], [ShieldCheck, 'Clear prices', 'The total before you pay']].map(([I, t, d]) => (
          <div key={t} className="text-center">
            <I size={20} className="mx-auto text-[#C9B2FF]" />
            <p className="mt-1.5 text-[12px] font-extrabold leading-tight">{t}</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/65">{d}</p>
          </div>
        ))}
      </section>

      <WhenSheet open={pickDate} onClose={() => setPickDate(false)} date={event.date} time={event.time} hours={event.hours} onPick={w => { setEvent(w); setPickDate(false) }} />
    </main>
  )
}
