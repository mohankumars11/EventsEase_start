/**
 * View all — the whole app on one page.
 *
 * "View all" on Home used to go nowhere. A customer who taps it is asking
 * "what can this actually do for me?", so the answer is everything, in
 * the order they would ask it:
 *
 *   Celebrations   all 18 categories, their occasions taking turns
 *   Services       all 34 kinds of master, in their groups
 *   How it works   pick → compare & negotiate → pay safely → celebrate
 *   Why trust it   verified, escrow, clear prices, instant
 *   Invite         refer a friend
 *
 * The chips stay pinned and jump to each part; /explore#services lands
 * straight on one (the centre orb uses #celebrations).
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BadgeCheck, CalendarCheck2, ChevronRight, Gift, HandCoins, MessagesSquare, PartyPopper, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react'
import { CATEGORIES, OCCASIONS } from '../data/occasions'
import { TRADES, TRADE_GROUPS } from '../data/trades'
import { artFor } from '../data/art'
import { CategoryCard, ServiceCard } from '../ui/art'
import { BackHeader } from '../ui/kit'

const PARTS = [['celebrations', 'Celebrations'], ['services', 'Services'], ['how', 'How it works'], ['trust', 'Why trust it'], ['invite', 'Invite']]

const STEPS = [
  [PartyPopper, 'Pick the moment', `${OCCASIONS.length} occasions. Tell us the day, the guests and the venue.`],
  [MessagesSquare, 'Compare & negotiate', 'Every master it needs, side by side. Send your price; they reply.'],
  [Wallet, 'Pay in one go', 'UPI, cards or netbanking. Held safely until each master delivers.'],
  [CalendarCheck2, 'Celebrate', 'Your masters arrive on the day. You just enjoy it.'],
]
const TRUST = [
  [BadgeCheck, 'Verified masters', 'ID and work checked before they go live'],
  [ShieldCheck, 'Escrow payments', 'Released only after your event'],
  [HandCoins, 'Clear prices', 'The exact total before you pay'],
  [Zap, 'Instant booking', 'Confirm the moment you pay'],
]

export default function Explore() {
  const { hash } = useLocation()
  const [on, setOn] = useState('celebrations')
  const refs = useRef({})
  const jump = id => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  useEffect(() => { const id = hash.slice(1); if (refs.current[id]) setTimeout(() => jump(id), 60) }, [hash])
  useEffect(() => {
    const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setOn(v.target.dataset.part) }, { rootMargin: '-120px 0px -60% 0px' })
    Object.values(refs.current).forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  const part = id => el => { refs.current[id] = el }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <BackHeader title="Everything, in one place" sub={`${CATEGORIES.length} categories · ${OCCASIONS.length} occasions · ${TRADES.length} services`} />
      <nav className="cx-noscroll sticky top-[calc(env(safe-area-inset-top,0px)+64px)] z-[110] flex gap-2 overflow-x-auto bg-white/95 px-4 pb-3 pt-1 backdrop-blur-xl" aria-label="Sections">
        {PARTS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => jump(id)} aria-pressed={on === id}
            className={'cx-press shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' + (on === id ? 'bg-gradient-to-br from-[#F3ECFF] to-[#DCC8FF] text-[var(--am-ink)] shadow-[0_0_0_1.5px_#CDB4FF]' : 'bg-white text-[var(--ink-2)] shadow-[0_0_0_1px_#EEE6FA]')}>{label}</button>
        ))}
      </nav>

      <Part setRef={part('celebrations')} id="celebrations" eyebrow="Celebrations" title="Every moment worth marking" sub="Tap a category to see every occasion in it.">
        <div className="grid grid-cols-3 gap-2 px-3">{CATEGORIES.map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}</div>
      </Part>

      <Part setRef={part('services')} id="services" eyebrow="Services" title="Book one master, instantly" sub="When you need just the photographer, the cook or the DJ.">
        {TRADE_GROUPS.map((g, i) => (
          <div key={g.id} className={i ? 'mt-5' : ''}>
            <h3 className="px-4 pb-2.5 text-[13.5px] font-extrabold text-[var(--ink-2)]">{g.label}</h3>
            <div className="grid grid-cols-3 gap-2 px-3">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
          </div>
        ))}
      </Part>

      <Part setRef={part('how')} id="how" eyebrow="How it works" title="From a thought to a celebration" sub="Four steps, all in this app.">
        <ol className="mx-4 grid gap-2.5">
          {STEPS.map(([I, t, d], k) => (
            <li key={t} className="flex items-start gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA,0_12px_24px_-20px_rgba(58,18,144,.6)]">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-gradient-to-br from-[#F3ECFF] to-[#DCC8FF] text-[var(--brand)]">
                <I size={22} /><span className="cx-num absolute -left-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-extrabold text-white ring-2 ring-white">{k + 1}</span>
              </span>
              <span className="min-w-0 pt-0.5"><span className="block text-[15px] font-extrabold tracking-[-0.02em]">{t}</span><span className="mt-0.5 block text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{d}</span></span>
            </li>
          ))}
        </ol>
      </Part>

      <Part setRef={part('trust')} id="trust" eyebrow="Why trust it" title="Peace of mind, built in" sub="What every booking comes with.">
        <div className="mx-4 grid grid-cols-2 gap-2.5">
          {TRUST.map(([I, t, d]) => (
            <div key={t} className="rounded-[20px] bg-[var(--am-50)] p-3.5 ring-1 ring-[var(--am-200)]">
              <I size={22} className="text-[var(--brand)]" />
              <p className="mt-2 text-[14px] font-extrabold tracking-[-0.02em]">{t}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[var(--ink-2)]">{d}</p>
            </div>
          ))}
        </div>
      </Part>

      <Part setRef={part('invite')} id="invite" eyebrow="Invite" title="Celebrate together" sub="Bring the people you plan with.">
        <Link to="/refer" className="cx-press mx-4 block overflow-hidden rounded-[22px] shadow-[0_0_0_1px_#EEE6FA,0_18px_32px_-22px_rgba(58,18,144,.7)]" data-invite>
          <img src={artFor('promo-refer')} alt="Celebrate together — refer your friend" className="block aspect-[1670/941] w-full object-cover" loading="lazy" />
        </Link>
        <Link to="/refer" className="cx-press cx-cta mx-4 mt-3 flex h-14 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold"><Gift size={18} />Invite a friend<ChevronRight size={18} /></Link>
      </Part>

      <p className="mt-10 flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#A79BC2]"><Sparkles size={14} />Crafted with love in Mysuru</p>
    </main>
  )
}

const Part = ({ setRef, id, eyebrow, title, sub, children }) => (
  <section ref={setRef} data-part={id} className="scroll-mt-[130px] pt-6">
    <div className="px-4 pb-3.5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">{eyebrow}</p>
      <h2 className="mt-1 text-[21px] font-extrabold leading-[1.1] tracking-[-0.035em]">{title}</h2>
      <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-3)]">{sub}</p>
    </div>
    {children}
  </section>
)
