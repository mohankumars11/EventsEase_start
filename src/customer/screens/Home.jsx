/**
 * Home (Mohan, 2026-10-26 — built to his two reference screens).
 *
 *   cream, edge to edge ─────────────────────────────────────────────
 *     location · help · bell · you
 *     Book Your Celebration / the Right Service — in Minutes   + hero
 *     search (voice where the phone supports it)
 *     [ Celebrations | Book a Service ]  one pill, no icons
 *     icon row: All · each category (or service family)
 *   white ─────────────────────────────────────────────────────────────
 *     Weekend rail: the next Saturday, the parties people book for it
 *   cream ──────────────────────────────────────────────────────────────
 *     Book a Celebration / Popular Services — 3 across, short cards,
 *     the green live line naming what is inside each
 *   white ─────────────────────────────────────────────────────────────
 *     four promises, four colours · the offer · refer & earn · sign-off
 *
 * No brand name or logo of our own. The one logo is the payment
 * partner's, because "secured by Razorpay" is a fact the customer can
 * check. Cashfree is not shown: no payment in this app goes through it.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Bell, CalendarCheck2, CalendarClock, ChevronDown, ChevronRight, Gift, Headset, IndianRupee, Loader2, LocateFixed, MailOpen, MapPin, Mic, Music2, PartyPopper, RotateCcw, Search, ShieldCheck, Users, UtensilsCrossed, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { CATEGORIES, OCCASION, OCCASIONS } from '../data/occasions'
import { TRADES } from '../data/trades'
import { FAMILIES } from '../data/families'
import { artFor, categoryArt, occasionArt, serviceArt } from '../data/art'
import { Card, CategoryCard, FamilyCard, Rotator, ServiceCard } from '../ui/art'
import { Sheet } from '../ui/kit'
import { OfferDeck } from '../ui/offers'
import { locate, saveWhere, savedWhere } from '../lib/where'
import { listen, canListen } from '../lib/voice'

const CREAM = '#FFF7EE'
const POPULAR_OCC = ['birthday-party', 'wedding-reception', 'haldi-ceremony', 'housewarming-ceremony', 'naming-ceremony', 'wedding-anniversary', 'baby-shower', 'engagement-ceremony', 'corporate-annual-day', 'mehendi-ceremony']
const POPULAR_SVC = ['photography', 'catering_food', 'decoration_floral', 'cake_desserts', 'bridal_makeup_hair', 'dj_music', 'mehendi_artist', 'priest_rituals']

/* The four promises, each its own colour. */
const PROMISES = [
  [Zap, 'Instant Booking', 'No quote, no waiting', '#7C3AED', '#F3ECFF'],
  [MapPin, 'GPS Navigation', 'Straight to your venue', '#2563EB', '#EAF1FF'],
  [ShieldCheck, 'Secure Payment', 'Held safe till delivered', '#0F9D58', '#E7F8EF'],
  [CalendarClock, 'On-Time Service', 'For your event date', '#EA580C', '#FFF1E6'],
]

/* Parties people throw ON a weekend — never date-bound ones (a birthday
   falls on its own day, so it is not sold as "this Saturday"). */
const WEEKEND = ['friends-get-together', 'rooftop-party', 'pool-party', 'bbq-party', 'brunch-gathering', 'karaoke-night', 'private-dinner-party', 'exclusive-house-party', 'bachelor-party', 'bachelorette-party']

function nextSaturday() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  return d
}

export default function Home() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [door, setDoor] = useState(() => { try { return sessionStorage.getItem('sbm.cx.door') ?? 'occasions' } catch { return 'occasions' } })
  const [filter, setFilter] = useState('all')
  const [whereOpen, setWhereOpen] = useState(false)
  const [where, setWhere] = useState(savedWhere)
  const grid = useRef(null)
  const choose = d => { setDoor(d); setFilter('all'); try { sessionStorage.setItem('sbm.cx.door', d) } catch { /* storage off */ } }
  const name = profile?.full_name?.trim()
  const photo = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
  const initial = (name || user?.email || 'S').trim()[0].toUpperCase()
  const celebrate = door === 'occasions'
  const hints = useMemo(() => shuffle([...OCCASIONS.filter(o => o.featured).map(o => o.name), ...TRADES.map(t => t.label), ...CATEGORIES.map(c => c.short)]).slice(0, 50), [])
  const sat = useMemo(nextSaturday, [])
  const days = Math.round((sat - new Date().setHours(0, 0, 0, 0)) / 864e5)
  const satLabel = sat.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const cats = filter === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === filter)
  const fams = filter === 'all' ? FAMILIES : FAMILIES.filter(f => f.id === filter)
  const toGrid = () => requestAnimationFrame(() => grid.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  const voice = async () => { const said = await listen().catch(() => null); navigate(said ? `/search?q=${encodeURIComponent(said)}` : '/search') }

  return (
    <main className="cx-enter bg-white pb-[calc(env(safe-area-inset-bottom,0px)+130px)]">
      {/* ── The cream top, edge to edge ─────────────────────────────── */}
      <section style={{ background: CREAM }}>
        <header className="cx-safe-top flex items-center justify-between gap-2 px-4">
          <button type="button" onClick={() => setWhereOpen(true)} className="flex min-w-0 items-center gap-2 py-1 text-left" data-where>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EFE6FF]"><MapPin size={18} className="fill-[var(--brand)] text-[#EFE6FF]" strokeWidth={1.6} /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-0.5 text-[17px] font-extrabold leading-tight tracking-[-0.025em]"><span className="truncate">{where?.area ?? 'Bengaluru'}</span><ChevronDown size={16} className="shrink-0" /></span>
              <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{[where?.city ?? 'Bengaluru', where?.pincode].filter(Boolean).join(', ')}{where?.test ? ' · testing' : ''}</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link to="/help" aria-label="Help" className="cx-press grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_4px_12px_-6px_rgba(58,18,144,.35)]" data-help><Headset size={18} /></Link>
            <Link to="/notifications" aria-label="Notifications" className="cx-press grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_4px_12px_-6px_rgba(58,18,144,.35)]"><Bell size={18} /></Link>
            <Link to="/me" aria-label="Your profile" className="cx-press relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#A57BFF] to-[#6D35E0] text-[15px] font-extrabold text-white ring-2 ring-white" data-avatar>
              {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
            </Link>
          </div>
        </header>

        <Hero door={door} />

      </section>

      {/* Search sticks under the status bar while the page scrolls (Blinkit / Zomato). */}
      <div className="sticky z-[115] px-4 pb-2 pt-2" style={{ top: 'env(safe-area-inset-top, 0px)', background: CREAM }} data-sticky-search>
        {/* Search: real names cycle; the mic listens where the phone can. */}
        <div className="flex h-[50px] items-center gap-3 rounded-[14px] bg-white pl-3.5 pr-1 shadow-[0_0_0_1px_#EDE6DC,0_8px_20px_-12px_rgba(20,15,31,.3)]">
          <button type="button" onClick={() => navigate('/search')} className="flex min-w-0 flex-1 items-center gap-3 text-left" data-search>
            <Search size={20} className="shrink-0 text-[var(--ink)]" />
            <span className="flex min-w-0 flex-1 items-center gap-1 text-[15px] font-medium text-[#8E889C]">Search<Rotator items={hints.map(h => <span>“{h}”</span>)} every={1900} /></span>
          </button>
          {canListen() && <><span className="h-6 w-px shrink-0 bg-[#E7E2EE]" /><button type="button" onClick={voice} aria-label="Search by voice" className="cx-press grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--ink)]" data-mic><Mic size={20} /></button></>}
        </div>

      </div>

      <section style={{ background: CREAM }} className="pb-2">
        {/* The two doors, shaped like the search box. */}
        <div className="mx-4 mt-1 grid grid-cols-2 gap-2" role="tablist">
          {[['occasions', 'Celebrations', 'Book by occasion'], ['services', 'Book a Service', 'Masters are ready']].map(([id, t, sub]) => (
            <button key={id} type="button" role="tab" aria-selected={door === id} onClick={() => choose(id)} data-door={t}
              className={'cx-press relative flex h-[46px] flex-col items-center justify-center overflow-hidden rounded-[14px] transition-all duration-300 ' + (door === id ? 'cx-door-on bg-gradient-to-r from-[#0C831F] to-[#16A34A] text-white shadow-[0_8px_18px_-10px_rgba(12,131,31,.85)]' : 'bg-white text-[#14532D] shadow-[0_0_0_1px_#EDE6DC,0_8px_20px_-14px_rgba(20,15,31,.3)]')}>
              <span className="text-[14px] font-black leading-tight tracking-[-0.03em]">{t}</span>
              <span className={'text-[10px] font-semibold leading-tight ' + (door === id ? 'text-white/80' : 'text-[var(--ink-3)]')}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Icon row: filters the grid below. */}
        <div className="cx-noscroll mt-2.5 flex gap-1 overflow-x-auto px-3" key={door}>
          <IconChip on={filter === 'all'} onClick={() => setFilter('all')} label="All" all />
          {(celebrate ? CATEGORIES.map(c => ({ id: c.id, label: c.short, src: categoryArt(c).src })) : FAMILIES.map(f => ({ id: f.id, label: f.label, src: serviceArt(f.trades[0]).src })))
            .map(x => <IconChip key={x.id} on={filter === x.id} onClick={() => { setFilter(x.id); toGrid() }} label={x.label} src={x.src} />)}
        </div>
      </section>

      {/* ── Weekend: the next Saturday, and what people book for it ──── */}
      {celebrate && (
        <section className="pt-4">
          <div className="flex items-end justify-between gap-3 px-4 pb-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0C831F]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#16A34A]" />This weekend · {satLabel}</p>
              <h2 className="mt-1 text-[20px] font-black leading-tight tracking-[-0.035em]">Weekend plans?<br />What are you celebrating?</h2>
            </div>
            <span className="shrink-0 rounded-full bg-[#E9F8EF] px-2.5 py-1 text-[11px] font-extrabold text-[#0B6B3D]">{days === 1 ? 'Tomorrow' : `In ${days} days`}</span>
          </div>
          <div className="cx-rail cx-noscroll !gap-2.5 !px-3">
            {WEEKEND.map(id => OCCASION[id]).filter(Boolean).map(o => (
              <div key={o.id} className="w-[31%] max-w-[150px]" data-weekend={o.id}>
                <Card to={`/o/${o.id}`} art={occasionArt(o)} tone={o.tone} title={o.name}>
                  <span className="flex items-center gap-1 text-[#0B7A45]"><Zap size={10} className="shrink-0 fill-current" />Plan it for this weekend</span>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── The grid, on cream ───────────────────────────────────────── */}
      <section ref={grid} style={{ background: CREAM }} className="mt-3 scroll-mt-16 py-4">
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-black leading-tight tracking-[-0.035em]">{celebrate ? 'Book a Celebration' : 'Popular Services Near You'}</h2>
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-3)]">{celebrate ? 'Pick the moment — we line up every master' : 'Verified masters · instant booking'}</p>
          </div>
          <Link to={celebrate ? '/explore#celebrations' : '/s'} className="cx-press flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[0_0_0_1px_#E9DDFB]" data-view-all>View all<ChevronRight size={15} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3">
          {celebrate ? cats.map((c, i) => <CategoryCard key={c.id} category={c} index={i} />) : fams.map((f, i) => <FamilyCard key={f.id} family={f} index={i} />)}
        </div>
      </section>

      {/* ── Offers for you: a moving deck of real cards ─────────────── */}
      <section className="pt-4" data-offers>
        <h2 className="px-4 pb-2 text-[18px] font-black tracking-[-0.03em]">Offers for you</h2>
        <OfferDeck />
      </section>

      {/* On the service side, the celebrations follow. */}
      {!celebrate && (
        <section className="pt-4" data-cats-after>
          <div className="flex items-end justify-between gap-3 px-4 pb-2.5">
            <h2 className="text-[18px] font-black tracking-[-0.03em]">Celebrating something?</h2>
            <Link to="/explore#celebrations" className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-extrabold text-[var(--brand)]">View all<ChevronRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3">{CATEGORIES.slice(0, 6).map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}</div>
        </section>
      )}

      {/* ── Most popular: what people actually book ─────────────────── */}
      <section className="pt-4" data-popular>
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-black leading-tight tracking-[-0.035em]">Most popular celebrations</h2>
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-3)]">What families book again and again</p>
          </div>
          <Link to="/explore#celebrations" className="cx-press flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[0_0_0_1px_#E9DDFB]">View all<ChevronRight size={15} /></Link>
        </div>
        <div className="cx-rail cx-noscroll !gap-2.5 !px-3">
          {POPULAR_OCC.map(id => OCCASION[id]).filter(Boolean).map(o => (
            <div key={o.id} className="w-[31%] max-w-[150px]"><Card to={`/o/${o.id}`} art={occasionArt(o)} tone={o.tone} title={o.name}>{null}</Card></div>
          ))}
        </div>
      </section>
      <section className="pt-3" data-popular-services>
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-black leading-tight tracking-[-0.035em]">Most popular services</h2>
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-3)]">Book one master, instantly</p>
          </div>
          <Link to="/s" className="cx-press flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[0_0_0_1px_#E9DDFB]">View all<ChevronRight size={15} /></Link>
        </div>
        <div className="cx-rail cx-noscroll !gap-2.5 !px-3">
          {POPULAR_SVC.map(t => <div key={t} className="w-[31%] max-w-[150px]"><ServiceCard tradeId={t} /></div>)}
        </div>
      </section>

      {/* ── Refunds & cancellation, said up front ───────────────────── */}
      <Link to="/help#cancellation" className="cx-press mx-3 mt-4 flex items-center gap-3 rounded-[20px] bg-[#F1FBF5] p-3.5 ring-1 ring-[#CDEFDC]" data-refunds>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[#0C831F]"><RotateCcw size={21} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-extrabold text-[#0B4F2A]">Refunds & cancellation, made clear</span>
          <span className="block text-[12px] font-semibold leading-snug text-[#3C7A5A]">100% back before a master accepts · 90% up to 2 days before · see the full policy</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[#0C831F]" />
      </Link>

      {/* ── Four promises ────────────────────────────────────────────── */}
      <section className="mx-3 mt-5 grid grid-cols-4 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#EEE6FA]">
        {PROMISES.map(([I, t, d, c, bg], k) => (
          <div key={t} className={'flex flex-col items-center px-1 py-3 text-center ' + (k ? 'border-l border-[#F1ECF8]' : '')}>
            <span className="grid h-10 w-10 place-items-center rounded-[14px]" style={{ background: bg, color: c }}><I size={20} strokeWidth={2.3} /></span>
            <p className="mt-1.5 text-[11px] font-extrabold leading-tight" style={{ color: c }}>{t}</p>
            <p className="mt-0.5 text-[9.5px] font-semibold leading-tight text-[var(--ink-3)]">{d}</p>
          </div>
        ))}
      </section>

      {/* ── The offer, edge to edge ──────────────────────────────────── */}
      <section className="relative mt-5 overflow-hidden bg-gradient-to-r from-[#FFF4D6] via-[#FFEBD2] to-[#FFE0EC] px-4 py-5" data-offer>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]">Welcome offer</p>
        <p className="mt-1 text-[30px] font-black leading-none tracking-[-0.04em] text-[#1C1033]">10% OFF</p>
        <p className="mt-1 max-w-[62%] text-[12.5px] font-semibold leading-snug text-[#5B4A3A]">On your first celebration booking, plus a welcome hamper.</p>
        <button type="button" onClick={() => { choose('occasions'); toGrid() }} className="cx-press mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1033] px-4 text-[13px] font-extrabold text-white">Book a celebration<ArrowRight size={15} /></button>
        <Gift size={92} strokeWidth={1.2} className="absolute -right-2 bottom-2 text-[#F59E0B]/40" />
      </section>

      {/* ── Invitations & RSVP ─────────────────────────────────────── */}
      <Link to="/invites" className="cx-press relative mx-3 mt-4 flex items-center gap-3 overflow-hidden rounded-[22px] bg-gradient-to-r from-[#6D28D9] to-[#9333EA] p-4 text-white" data-home-invites>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/15"><MailOpen size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-black tracking-[-0.02em]">Send invites. Count every guest.</span>
          <span className="block text-[12px] font-semibold text-white/80">WhatsApp invitations with one-tap RSVP — free</span>
        </span>
        <ChevronRight size={19} className="shrink-0" />
      </Link>

      {/* ── Book a service, edge to edge ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#E8F8EE] to-[#E6F2FF] px-4 py-5" data-service-band>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0C831F]">Book a service</p>
        <p className="mt-1 text-[24px] font-black leading-[1.05] tracking-[-0.04em] text-[#1C1033]">One master,<br /><span className="text-[#0C831F]">booked in a minute</span></p>
        <p className="mt-1 max-w-[56%] text-[12.5px] font-semibold leading-snug text-[#3F5A4B]">A photographer, a cook, a DJ — price upfront, 10% off your first booking.</p>
        <Link to="/s" className="cx-press relative z-10 mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-[#0C831F] pl-4 pr-1.5 text-[13.5px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(12,131,31,.9)]" data-book-service>
          <Zap size={16} />Book a service<span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#0C831F]"><ArrowRight size={16} /></span>
        </Link>
        <img src={artFor('svc-photography')} alt="" className="absolute -right-2 bottom-0 h-[130px] w-auto mix-blend-multiply" loading="lazy" />
      </section>

      {/* ── Refer & earn, edge to edge ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#F3ECFF] to-[#FCE7F3] px-4 py-5" data-refer-band>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand)]">Refer & earn</p>
        <p className="mt-1 text-[24px] font-black leading-[1.05] tracking-[-0.04em] text-[#1C1033]">Celebrate<br /><span className="bg-gradient-to-r from-[#7C3AED] to-[#DB2777] bg-clip-text text-transparent">Together</span></p>
        <p className="mt-1 max-w-[56%] text-[12.5px] font-semibold leading-snug text-[#5F5675]">Invite the people you celebrate with.</p>
        <Link to="/refer" className="cx-press relative z-10 mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] pl-4 pr-1.5 text-[13.5px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(109,40,217,.9)]" data-refer>
          <Users size={16} />Refer your friend<span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[var(--brand)]"><ArrowRight size={16} /></span>
        </Link>
        <img src={artFor('cat-life')} alt="" className="absolute -right-3 bottom-0 h-[130px] w-auto mix-blend-multiply" loading="lazy" />
      </section>

      <SignOff />

      <WhereSheet open={whereOpen} onClose={() => setWhereOpen(false)} onPick={p => { saveWhere(p); setWhere(savedWhere()); setWhereOpen(false) }} />
    </main>
  )
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* ── The hero: four scenes, each a headline with its own picture ──────
   Every 3 s the headline, the question chips and the little live card
   change together, so what the words promise is what the card shows:
   "Prices Upfront" shows a price, "Confirmed the Moment You Pay" shows
   the payment going through. The chips ask, they do not boast. */
const SCENES = {
  occasions: [
    { lines: ['Book Your', 'Celebration', 'in Minutes'], ask: ['Booked your party yet?', '10% off your first booking'],
      card: { icon: CalendarCheck2, tone: '#7C3AED', title: 'Birthday Party', sub: '6 masters lined up', meter: 1 } },
    { lines: ['No Waiting', 'for Quotes.', 'Prices Upfront'], ask: ['Seen the price before you book?', 'No “we’ll call you back”'],
      card: { icon: IndianRupee, tone: '#B45309', title: '₹815 / plate', sub: 'Catering · price shown upfront' } },
    { lines: ['No Chasing', 'for Replies.', 'Masters Ready'], ask: ['Tried instant booking?', 'Ready on your date'],
      card: { icon: Zap, tone: '#0C831F', title: 'Accepted', sub: 'Photographer · 0 min wait' } },
    { lines: ['Confirmed', 'the Moment', 'You Pay'], ask: ['Your money stays safe', 'Full refund before acceptance'],
      card: { icon: ShieldCheck, tone: '#0C831F', title: 'Payment secured', sub: 'Booking confirmed', razorpay: true } },
    { lines: ['Plan a', 'Surprise', 'Birthday'], ask: ['They’ll never see it coming', 'Cake, décor & a photographer'],
      card: { icon: PartyPopper, tone: '#DB2777', title: 'Surprise Birthday', sub: 'Ready in 4 taps', to: '/o/surprise-birthday-party' } },
    { lines: ['Weekend', 'Party?', 'Sorted.'], ask: ['This Saturday, all set', 'DJ, food & lights in one go'],
      card: { icon: Music2, tone: '#7C3AED', title: 'Rooftop party', sub: 'Book it for this Saturday', to: '/o/rooftop-party' } },
    { lines: ['Private', 'Dining,', 'Booked'], ask: ['A table that’s all yours', 'Chef, décor & music'],
      card: { icon: UtensilsCrossed, tone: '#B45309', title: 'Private dinner', sub: 'For 2 to 50 guests', to: '/o/private-dinner-party' } },
  ],
  services: [
    { lines: ['Book the', 'Right Service', 'in Minutes'], ask: ['Need a photographer today?', '10% off your first booking'],
      card: { icon: CalendarCheck2, tone: '#7C3AED', title: '11 photographers', sub: 'Near you · instant' } },
    { lines: ['No Enquiries.', 'No Waiting.', 'Just Book'], ask: ['Seen the price before you book?', 'Pick, pay, done'],
      card: { icon: IndianRupee, tone: '#B45309', title: '₹4,348', sub: 'Photography · price upfront' } },
    { lines: ['Masters Are', 'Ready for', 'Your Date'], ask: ['Tried instant booking?', 'Verified before they go live'],
      card: { icon: BadgeCheck, tone: '#0C831F', title: 'Verified master', sub: 'ID and work checked' } },
    { lines: ['Confirmed', 'the Moment', 'You Pay'], ask: ['Your money stays safe', 'Full refund before acceptance'],
      card: { icon: ShieldCheck, tone: '#0C831F', title: 'Payment secured', sub: 'Master confirmed', razorpay: true } },
  ],
}
const FEATURES = [[Zap, 'Instant booking', '#7C3AED'], [BadgeCheck, 'Verified masters', '#0C831F'], [ShieldCheck, 'Safe payment', '#2563EB'], [RotateCcw, 'Easy refunds', '#EA580C']]

function Hero({ door }) {
  const navigate = useNavigate()
  const scenes = SCENES[door] ?? SCENES.occasions
  const [i, setI] = useState(0)
  useEffect(() => { setI(0); const t = setInterval(() => setI(n => (n + 1) % scenes.length), 3000); return () => clearInterval(t) }, [scenes])
  const s = scenes[i]
  const C = s.card
  return (
    <div className="relative mt-1 min-h-[184px]" data-hero={i}>
      <div className="relative z-10 w-[56%] pl-4 pt-2">
        <h1 key={`${door}-${i}`} className="cx-rise min-h-[90px] text-[28px] font-black leading-[1.02] tracking-[-0.045em] text-[#16092E]" aria-live="polite">
          {s.lines[0]}<br />{s.lines[1]}<br />
          <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">{s.lines[2]}</span>
        </h1>
        <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
          {FEATURES.map(([I, t, c]) => (
            <span key={t} className="flex items-center gap-1.5 text-[10.5px] font-extrabold leading-tight text-[#3B3350]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" style={{ color: c }}><I size={13} strokeWidth={2.6} /></span>{t}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 top-0 w-[50%]" onClick={() => C.to && navigate(C.to)} role={C.to ? 'link' : undefined}>
        <img src={artFor('hero-booking') ?? artFor('hero-family')} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_30%] mix-blend-multiply [mask-image:linear-gradient(90deg,transparent_0%,#000_20%)]" />
        <span key={`a${door}${i}`} className="cx-pop absolute right-2 top-1 max-w-[92%] truncate rounded-[12px] bg-white/95 px-2.5 py-1.5 text-[10.5px] font-extrabold text-[#1C1033] shadow-[0_8px_20px_-10px_rgba(58,18,144,.6)]">{s.ask[0]}</span>
        <div key={`c${door}${i}`} className="cx-pop absolute bottom-9 right-2 w-[86%] rounded-[16px] bg-white p-2 shadow-[0_14px_28px_-14px_rgba(58,18,144,.75)]" style={{ animationDelay: '.15s' }}>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: C.tone }}><C.icon size={16} strokeWidth={2.6} /></span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-black tracking-[-0.02em] text-[#1C1033]">{C.title}</span>
              <span className="block truncate text-[10px] font-bold text-[#6B6480]">{C.sub}</span>
            </span>
          </div>
          {C.meter && <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#EDE6FB]"><span className="block h-full w-[78%] animate-pulse rounded-full bg-[#7C3AED]" /></span>}
          {C.razorpay && <span className="mt-1 flex items-center gap-1 text-[9.5px] font-bold text-[#5F5675]"><ShieldCheck size={10} className="text-[#0F9D58]" />Secured by <RazorpayMark /></span>}
        </div>
        <span key={`b${door}${i}`} className="cx-pop absolute bottom-1 right-2 max-w-[92%] truncate rounded-[12px] bg-[#0C831F] px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow-[0_8px_18px_-10px_rgba(12,131,31,.9)]" style={{ animationDelay: '.3s' }}>{s.ask[1]}</span>
      </div>
    </div>
  )
}

/* Razorpay's mark. Drop the official SVG from their brand kit in as
   src/customer/art/logo-razorpay.svg and it replaces this drawing. */
function RazorpayMark() {
  const official = artFor('logo-razorpay')
  if (official) return <img src={official} alt="Razorpay" className="h-3 w-auto" />
  return (
    <span className="inline-flex items-center gap-0.5 font-black tracking-[-0.02em] text-[#072654]">
      <svg viewBox="0 0 12 14" className="h-3 w-auto" aria-hidden><path d="M4.6 0 12 0 6.4 14H1.8L5 6.2 2.6 8.4Z" fill="#3395FF" /></svg>Razorpay
    </span>
  )
}

function IconChip({ on, onClick, label, src, all = false }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="cx-press flex w-[66px] shrink-0 flex-col items-center gap-1 pb-1" data-chip={label}>
      <span className={'relative grid h-[54px] w-[54px] place-items-center overflow-hidden rounded-[16px] transition ' + (on ? 'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-[0_8px_18px_-8px_rgba(109,40,217,.9)]' : 'bg-white shadow-[0_0_0_1px_#EFE7DD]')}>
        {all ? <span className="grid grid-cols-2 gap-[3px]">{[0, 1, 2, 3].map(i => <span key={i} className={'h-[9px] w-[9px] rounded-[3px] ' + (on ? 'bg-white' : 'bg-[var(--brand)]')} />)}</span>
          : <img src={src} alt="" className={'h-full w-full object-cover object-[50%_20%] ' + (on ? 'opacity-90' : 'mix-blend-multiply')} loading="lazy" />}
      </span>
      <span className={'line-clamp-2 text-center text-[10.5px] font-bold leading-tight ' + (on ? 'text-[var(--brand)]' : 'text-[var(--ink-2)]')}>{label}</span>
      {on && <span className="h-[3px] w-6 rounded-full bg-[var(--brand)]" />}
    </button>
  )
}

/* ── The sign-off ────────────────────────────────────────────────── */
function SignOff() {
  return (
    <footer className="mt-12 overflow-hidden" aria-label="Crafted with love in Mysuru">
      <div className="px-6">
        <p className="text-[42px] font-extrabold leading-[0.96] tracking-[-0.05em] text-[#E6DDF6]">Crafted<br />with love <Heart /><br /><span className="text-[#D8CAF1]">in Mysuru.</span></p>
        <p className="mt-3 text-[12.5px] font-bold text-[#A79BC2]">For every celebration across India.</p>
      </div>
      <div className="mt-6 bg-gradient-to-b from-white via-[#FBF8FF] to-[#F3EDFF] pt-2">
        <Palace className="block h-auto w-full" />
      </div>
    </footer>
  )
}

function Heart() {
  return (
    <svg viewBox="0 0 32 29" className="cx-beat inline-block h-[0.78em] w-auto align-baseline drop-shadow-[0_4px_8px_rgba(255,0,32,.35)]" aria-label="love">
      <path d="M16 28.5S1 19.6 1 9.4C1 4.6 4.7 1 9.2 1c2.9 0 5.4 1.5 6.8 3.8C17.4 2.5 19.9 1 22.8 1 27.3 1 31 4.6 31 9.4 31 19.6 16 28.5 16 28.5z" fill="#FF0F2E" />
      <path d="M8.6 5.2c-2 .3-3.6 2-3.8 4.1" stroke="#FFC2CB" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/* ── Where am I ──────────────────────────────────────────────────── */
function WhereSheet({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return BENGALURU_AREAS.filter(a => !t || a.name.toLowerCase().includes(t)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  }, [q])
  async function here() {
    setBusy(true); setErr('')
    const r = await locate()
    setBusy(false)
    if (!r.ok) { setErr('Location is off. Pick your area below.'); return }
    if (!r.market?.live) { setErr(`You are in ${r.place.area}. We are live in Bengaluru — pick an area below.`); return }
    onPick({ ...r.place, market: r.market.id, test: !!r.market.test })
  }
  return (
    <Sheet open={open} onClose={onClose} title="Where are you?">
      <button type="button" onClick={here} className="cx-press cx-btn flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left">
        {busy ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
        <span className="flex-1 text-[14.5px] font-extrabold">Use my current location</span><ArrowRight size={16} />
      </button>
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-[16px] bg-[var(--am-50)] px-3.5 ring-1 ring-[var(--am-200)]">
        <Search size={17} className="text-[var(--brand)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your area" className="h-full flex-1 bg-transparent text-[14px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
      </label>
      <ul className="mt-2 max-h-[40dvh] overflow-y-auto pb-2">
        {list.map(a => (
          <li key={a.name}>
            <button type="button" onClick={() => onPick({ area: a.name, city: 'Bengaluru', lat: a.lat, lng: a.lng, market: 'BLR', source: 'picked' })}
              className="cx-press flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left text-[14.5px] font-bold last:border-0">
              <MapPin size={16} className="text-[var(--brand)]" />{a.name}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/* Mysuru Palace, front on, edge to edge — drawn from its elevation, not a
   generic dome: the tall gilded central dome on its tiered tower, the
   seven-arch portico with the Gajalakshmi pediment above, the two domed
   towers that flank it, the corner towers, the chhatris on the roofline,
   the arcaded wings and the steps. Filled and lit from the left (each
   face has a shaded right side, each dome a highlight) so it reads as a
   building, not an outline. */
function Palace({ className }) {
  const C = { wall: '#F1EBFC', shade: '#E2D6F7', depth: '#D2C0EF', line: '#CDBBEE', cornice: '#E4D9F7', pin: '#D9CAF3' }
  const dome = (cx, r, b, h, k) => (
    <g key={k}>
      <path d={`M${cx - r} ${b}C${cx - r * 1.18} ${b - h * 0.42} ${cx - r * 0.38} ${b - h * 0.8} ${cx} ${b - h}C${cx + r * 0.38} ${b - h * 0.8} ${cx + r * 1.18} ${b - h * 0.42} ${cx + r} ${b}Z`} fill="url(#pal-dome)" stroke={C.line} strokeWidth=".8" />
      <path d={`M${cx - r * 0.55} ${b - h * 0.2}C${cx - r * 0.6} ${b - h * 0.5} ${cx - r * 0.25} ${b - h * 0.72} ${cx - r * 0.05} ${b - h * 0.82}`} stroke="#FFFFFF" strokeOpacity=".8" strokeWidth={Math.max(1.2, r * 0.12)} strokeLinecap="round" fill="none" />
      <rect x={cx - r - 1.5} y={b - 1.5} width={2 * r + 3} height="3.5" rx="1" fill={C.cornice} stroke={C.line} strokeWidth=".6" />
      <path d={`M${cx} ${b - h}v-${h * 0.22}`} stroke={C.line} strokeWidth="1.1" />
      <circle cx={cx} cy={b - h - h * 0.08} r={Math.max(1, r * 0.09)} fill="#E8C766" />
      <circle cx={cx} cy={b - h - h * 0.18} r={Math.max(0.8, r * 0.06)} fill="#E8C766" />
    </g>
  )
  const archWin = (x, y, w, h, k) => <path key={k} d={`M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z`} fill={C.depth} />
  /* a cusped (foliated) arch, the portico's signature */
  const cusped = (x, w, top, bottom, k) => {
    const q = w / 4
    return <path key={k} d={`M${x} ${bottom}V${top + q * 1.6}q0 -${q} ${q} -${q * 1.2}q${q * 0.2} -${q} ${q} -${q}q${q * 0.8} 0 ${q} ${q}q${q} ${q * 0.2} ${q} ${q * 1.2}V${bottom}Z`} fill={C.depth} />
  }
  const tower = (x, w, top, bottom, k) => (
    <g key={k}>
      <rect x={x} y={top} width={w} height={bottom - top} fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x={x + w * 0.64} y={top} width={w * 0.36} height={bottom - top} fill={C.shade} />
      {Array.from({ length: Math.floor((bottom - top - 6) / 13) }, (_, r) => (
        <g key={r}>
          <rect x={x - 1.5} y={top + r * 13} width={w + 3} height="2.2" fill={C.cornice} />
          {archWin(x + w / 2 - 3, top + r * 13 + 4, 6, 8, 'w')}
        </g>
      ))}
    </g>
  )
  const chhatri = (x, k) => (
    <g key={k}>
      <rect x={x} y="81" width="2" height="11" fill={C.shade} /><rect x={x + 12} y="81" width="2" height="11" fill={C.shade} />
      <rect x={x - 1.5} y="78.5" width="17" height="3" rx="1" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      {dome(x + 7, 6.5, 78.5, 10, 'd')}
    </g>
  )
  const wingArches = [], wingWins = [], pins = []
  for (let x = 52; x <= 103; x += 17) { wingArches.push(archWin(x, 126, 11, 24, `la${x}`)); wingWins.push(archWin(x + 2, 103, 7, 11, `lw${x}`)) }
  for (let x = 290; x <= 341; x += 17) { wingArches.push(archWin(x, 126, 11, 24, `ra${x}`)); wingWins.push(archWin(x + 2, 103, 7, 11, `rw${x}`)) }
  for (let x = 50; x < 350; x += 12) if (x < 110 || x > 288) pins.push(<path key={`p${x}`} d={`M${x} 92l2 -6l2 6Z`} fill={C.pin} />)

  return (
    <svg viewBox="0 -52 400 224" className={className} aria-label="Mysuru Palace" role="img">
      <defs>
        <linearGradient id="pal-dome" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#F7F1FF" /><stop offset=".45" stopColor="#E4D5FB" /><stop offset="1" stopColor="#C4ABEF" />
        </linearGradient>
        <linearGradient id="pal-ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E9DFF8" /><stop offset="1" stopColor="#DCCDF4" />
        </linearGradient>
      </defs>

      {/* the arcaded wings */}
      <rect x="46" y="96" width="308" height="54" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x="44" y="92" width="312" height="4.5" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      <rect x="46" y="119" width="308" height="2.5" fill={C.cornice} />
      {wingWins}{wingArches}{pins}
      {/* corner towers */}
      {tower(20, 28, 62, 150, 'ct1')}{tower(352, 28, 62, 150, 'ct2')}
      {dome(34, 12.5, 62, 22, 'cd1')}{dome(366, 12.5, 62, 22, 'cd2')}

      {chhatri(62, 'h1')}{chhatri(86, 'h2')}{chhatri(300, 'h3')}{chhatri(324, 'h4')}

      {/* the central tower and the great dome */}
      {tower(168, 64, 24, 92, 'mt')}
      <rect x="172" y="16" width="56" height="8" fill={C.wall} stroke={C.line} strokeWidth=".6" />
      {[178, 189, 200, 211, 222].map(x => <rect key={x} x={x - 1} y="17.5" width="2" height="5" fill={C.depth} />)}
      {dome(200, 27, 16, 54, 'md')}

      {/* the two towers flanking the portico */}
      {tower(114, 24, 50, 150, 'ft1')}{tower(262, 24, 50, 150, 'ft2')}
      {dome(126, 11, 50, 22, 'fd1')}{dome(274, 11, 50, 22, 'fd2')}

      {/* the portico: seven foliated arches, the Gajalakshmi pediment */}
      <rect x="138" y="84" width="124" height="66" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x="258" y="84" width="4" height="66" fill={C.shade} />
      <rect x="135" y="81" width="130" height="4" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      <rect x="138" y="110" width="124" height="2.5" fill={C.cornice} />
      {Array.from({ length: 7 }, (_, k) => archWin(146 + k * 16, 92, 8, 14, `pw${k}`))}
      {Array.from({ length: 7 }, (_, k) => cusped(144 + k * 16, 12, 116, 150, `pa${k}`))}
      <path d="M180 81v-7a20 13 0 0 1 40 0v7Z" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <path d="M188 81v-5a12 8 0 0 1 24 0v5Z" fill={C.depth} />
      <circle cx="200" cy="74.5" r="2.4" fill="#E8C766" />
      {[184, 216].map(x => <path key={x} d={`M${x} 74l2 -6l2 6Z`} fill={C.pin} />)}

      {/* the plinth and the steps */}
      <rect x="0" y="150" width="400" height="22" fill="url(#pal-ground)" />
      <rect x="0" y="150" width="400" height="2" fill={C.line} opacity=".7" />
      <rect x="146" y="146" width="108" height="4" fill={C.cornice} /><rect x="154" y="142" width="92" height="4" fill={C.wall} stroke={C.line} strokeWidth=".4" />
    </svg>
  )
}
