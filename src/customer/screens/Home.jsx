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
import { tilesFor, tileUrl, DEFAULT_TILES } from '../../lib/slippyMap'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, ChevronDown, ChevronRight, Gift, Headset, IndianRupee, LayoutGrid, Mail, MailOpen, MapPin, MessageCircle, Mic, Music2, Navigation, PartyPopper, Pencil, RotateCcw, Search, ShieldCheck, UtensilsCrossed, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { CATEGORIES, OCCASION, OCCASIONS } from '../data/occasions'
import { plateLabel, priceTag } from '../data/startingPrices'
import { TRADES, TRADE_GROUPS } from '../data/trades'
import { TEMPLATES } from '../data/inviteTemplates'
import { artFor, hdArtFor, occasionArt, serviceArt } from '../data/art'
import { Card, CategoryCard, Rotator, ServiceCard } from '../ui/art'
import { OfferDeck } from '../ui/offers'
import Glyph3D from '../ui/Glyph3D'
import RazorpayLogo from '../ui/RazorpayLogo'
import Spotlight from '../ui/Spotlight'
import LocationSheet from '../ui/LocationSheet'
import ResumeBar from '../ui/ResumeBar'
import { InstantSheet, OfferSlider, PrebookCard, QuickCard } from '../ui/homeDeck'
import { saveWhere, savedWhere } from '../lib/where'
import { listen, canListen } from '../lib/voice'

const CREAM = '#FFFFFF' // screen ground: pure white (2026-10-31); cards keep their own tones
/* The head of the page is ONE plain purple (Mohan, 2026-11-10: "not the
   light purple at the top — a plain purple"). Plain on purpose: the
   pinned block is its own element, after the location row rather than
   inside it — that is what lets it stay pinned all the way down — and
   only a flat colour lets two elements meet without a seam. Everything
   standing on it is white, or the Instant yellow. */
/* The top surface — location through the category row — a light purple
   with a gloss across it (Mohan, 2026-11-12: "a lightweight, very solid,
   light, professional, glossy look"). The head and the pinned block are
   siblings, so each paints its half of the one gradient. */
/* The head is one solid royal amethyst, a shade lighter than the brand
   purple (Mohan, 2026-11-13: "make it like this but reduce the colour a
   bit — royal light amethyst"); white type on it, the tab bar below stays
   white like every successful delivery app's. */
/* Royal blue, to the reference screen (Mohan, 2026-11-14: "build the top
   exactly like that … the contrast should be perfect, like a brand
   product"): one deep blue from the status bar to the icon row, white
   type, the Instant yellow as the only other colour. */
const HEAD_TOP = 'linear-gradient(180deg, #0F4FC4 0%, #0C49B8 100%)'
const HEAD_PIN = 'linear-gradient(180deg, #0C49B8 0%, #0A43AE 100%)'
const HEAD_STRIP = '#0F4FC4'
const TRACK = 'rgba(255,255,255,.08)' // the door bar: a hairline track, the chosen door a white pill
const YELLOW = 'linear-gradient(135deg, #FFD54A 0%, #FFC21A 100%)' // the Instant yellow
/* What the second line of the promise cycles through — the real trades,
   in the order a customer thinks of them, so "Book …" is always naming
   something the app can actually book. */
const BOOKABLE = ['venues', 'caterers', 'decorators', 'photographers', 'DJs & music', 'cake & desserts', 'makeup artists', 'mehendi artists', 'priests', 'anchors & MCs', 'transport', 'event staff']

const POPULAR_OCC = ['birthday-party', 'wedding-reception', 'haldi-ceremony', 'housewarming-ceremony', 'naming-ceremony', 'wedding-anniversary', 'baby-shower', 'engagement-ceremony', 'corporate-annual-day', 'mehendi-ceremony']
const POPULAR_SVC = ['photography', 'catering_food', 'decoration_floral', 'cake_desserts', 'bridal_makeup_hair', 'dj_music', 'mehendi_artist', 'priest_rituals']

/* In the spotlight: [id, badge, hook]. Only ones with their own picture are shown. */
const SPOT_OCC = [
  ['birthday-party', '🔥 Trending', 'Cake, decor and a photographer — planned in minutes'],
  ['wedding-reception', 'Wedding season', 'Every master for the big night, in one plan'],
  ['haldi-ceremony', 'Most booked', 'Marigolds, music and the yellow glow'],
  ['baby-shower', 'Loved by moms', 'Décor, games and a cake for the little one'],
  ['housewarming-ceremony', 'Auspicious', 'Pooja, lunch and a full house'],
  ['engagement-ceremony', 'Popular', 'Rings, flowers and the first dance'],
  ['wedding-anniversary', 'Romantic', 'Make the years feel brand new'],
  ['cocktail-party', 'This weekend', 'DJ, bar and lights — sorted'],
  ['naming-ceremony', 'Family favourite', 'Priest, cradle decor and lunch'],
  ['corporate-annual-day', 'For teams', 'Stage, sound, anchor and dinner'],
]
const SPOT_SVC = [
  ['photography', 'Most booked', 'Every ritual, every relative — priced by the hour'],
  ['catering_food', 'Per-plate prices', 'See each caterer’s menu and price per plate'],
  ['decoration_floral', '🔥 Trending', 'Stage, entrance and flowers, set up and removed'],
  ['cake_desserts', 'Order now', 'The cake, and a dessert table if you want one'],
  ['bridal_makeup_hair', 'Wedding season', 'Bridal and family looks, draping included'],
  ['dj_music', 'This weekend', 'A dance floor that stays full'],
  ['mehendi_artist', 'Popular', 'Bridal and guest mehendi'],
]

/* Parties people throw ON a weekend — never date-bound ones (a birthday
   falls on its own day, so it is not sold as "this Saturday"). */
const WEEKEND = ['friends-get-together', 'cocktail-party', 'private-dinner-party', 'family-reunion', 'bachelorette-party', 'bachelor-party', 'childrens-theme-party', 'gender-reveal-party', 'farewell-party']

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
  const [allCats, setAllCats] = useState(false)
  const [whereOpen, setWhereOpen] = useState(false)
  const [instant, setInstant] = useState(false)
  /* Once, after sign-in: the door pill slides to "Book a Service" and back,
     so a new customer sees there are two ways in (Mohan, 2026-11-13). */
  const [nudge, setNudge] = useState(false)
  useEffect(() => {
    if (!user) return
    let seen = false
    try { seen = localStorage.getItem('sbm.cx.door.nudged') === '1' } catch { /* off */ }
    if (seen) return
    const a = setTimeout(() => setNudge(true), 1100)
    const b = setTimeout(() => { setNudge(false); try { localStorage.setItem('sbm.cx.door.nudged', '1') } catch { /* off */ } }, 2900)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [user])
  const [where, setWhere] = useState(savedWhere)
  const grid = useRef(null)
  const compact = useCompact()
  const choose = d => { setDoor(d); setFilter('all'); try { sessionStorage.setItem('sbm.cx.door', d) } catch { /* storage off */ } }
  const name = profile?.full_name?.trim()
  const photo = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
  const initial = (name || user?.email || 'S').trim()[0].toUpperCase()
  const celebrate = door === 'occasions'
  const [invitesSeen] = useState(() => { try { return localStorage.getItem('sbm.cx.invites.seen') === '1' } catch { return false } })
  const hints = useMemo(() => shuffle([...OCCASIONS.filter(o => o.featured).map(o => o.name), ...TRADES.map(t => t.label), ...CATEGORIES.map(c => c.short)]).slice(0, 50), [])
  const sat = useMemo(nextSaturday, [])
  const days = Math.round((sat - new Date().setHours(0, 0, 0, 0)) / 864e5)
  const satLabel = sat.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const cats = filter === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === filter)
  /* A chip takes the page to the grid, landing its heading just under the
     pinned block. The block is measured, not assumed: it tightens as the
     page scrolls, so the landing is checked once more after it settles.
     "All" only moves the page when the customer is already past the grid
     — from the top of the page it just resets the filter. */
  const head = useRef(null)
  const strip = useRef(null)
  const gap = () => {
    const g = grid.current, h = head.current
    if (!g || !h) return null
    /* The section's own top padding (16px) is the breathing room: its
       edge tucks 6px under the block, so the heading shows 10px clear. */
    return g.getBoundingClientRect().top - ((strip.current?.offsetHeight ?? 0) + h.offsetHeight - 6)
  }
  const toGrid = (onlyIfPast = false) => requestAnimationFrame(() => {
    const off = gap()
    if (off == null || (onlyIfPast && off > 0)) return
    window.scrollBy({ top: off, behavior: 'smooth' })
    /* Re-measured only once the scroll has stopped — mid-flight the
       block is still tightening and the reading is wrong. */
    let done = false
    const fix = () => { const again = gap(); if (again != null && Math.abs(again) > 3) window.scrollBy({ top: again, behavior: 'smooth' }) }
    const settle = () => { if (done) return; done = true; window.removeEventListener('scrollend', settle); setTimeout(fix, 340) } // the block's own 300 ms tighten
    window.addEventListener('scrollend', settle, { once: true })
    setTimeout(settle, 1100)
  })
  const pick = id => { setFilter(id); toGrid(id === 'all') }
  const voice = async () => { const said = await listen().catch(() => null); navigate(said ? `/search?q=${encodeURIComponent(said)}` : '/search') }

  return (
    <main className="cx-enter bg-white pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      {/* The page scrolls under a phone's status bar; the strip it scrolls
          under is painted the head's purple, so nothing shows through it. */}
      <div ref={strip} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[116]" style={{ height: 'env(safe-area-inset-top, 0px)', background: HEAD_STRIP }} />

      {/* ── The head: location and the promise, on royal light amethyst ── */}
      <div className="relative" style={{ background: HEAD_TOP }} data-top-surface>
        <header className="cx-safe-top flex items-center justify-between gap-2 px-4">
          <button type="button" onClick={() => setWhereOpen(true)} className="flex min-w-0 items-center gap-2.5 text-left" data-where>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/20"><MapPin size={18} className="fill-white text-[#0C49B8]" strokeWidth={1.8} /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-0.5 text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-white"><span className="truncate">{where?.area ?? 'Bengaluru'}</span><ChevronDown size={15} strokeWidth={2.6} className="shrink-0" /></span>
              <span className="block truncate text-[11.5px] font-semibold leading-tight text-white/85">{where?.for?.name ? `For ${where.for.name} · ` : ''}{[where?.city ?? 'Bengaluru', where?.pincode].filter(Boolean).join(', ')}{where?.test ? ' · testing' : ''}</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link to="/help" aria-label="Help" className="cx-press grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white" data-help><Headset size={17} /></Link>
            <Link to="/invites" aria-label="Invitations and RSVP" onClick={() => { try { localStorage.setItem('sbm.cx.invites.seen', '1') } catch { /* off */ } }}
              className="cx-press relative grid h-9 w-9 place-items-center rounded-full bg-white text-[#DB2777] shadow-[0_4px_10px_-6px_rgba(0,0,0,.45)]" data-head-invites>
              <Mail size={17} strokeWidth={2.2} />
              {!invitesSeen && <span className="absolute -right-1.5 -top-2 rounded-full bg-[#FFC21A] px-1 py-[1px] text-[8.5px] font-black tracking-[0.04em] text-[#1C1033]">NEW</span>}
            </Link>
          </div>
        </header>

        {/* The promise. The second line names a real service and keeps
            changing, so the claim is specific rather than a slogan. */}
        <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-2" data-promise-row>
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] shadow-[0_6px_12px_-8px_rgba(0,0,0,.55)]" style={{ background: YELLOW }}>
            <Zap size={19} className="fill-[#F97316] text-[#1C1033]" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block whitespace-nowrap text-[16.5px] font-extrabold leading-[1.1] tracking-[-0.025em] text-white" data-book-minutes>Book in Minutes</span>
            <span className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[12px] font-semibold leading-tight text-white/95">
              Book<Rotator items={BOOKABLE} every={1500} className="font-semibold text-white" />
            </span>
          </span>
          <span aria-hidden className="h-7 w-px shrink-0 bg-white/45" />
          <InstantPill onClick={() => setInstant(true)} />
        </div>
      </div>

      {/* ── Pinned while scrolling ─────────────────────────────────────
          A sibling of the head, not a child of it. A sticky element can
          only stick inside its parent, and inside the head it went with
          the head the moment the head scrolled away. Here it stays for the
          whole page — the doors, the search and the icon row — so a
          customer can change door or category from anywhere on the page
          (Mohan, 2026-11-10). */}
      <div ref={head} className={'sticky z-[115] pb-1.5 transition-shadow duration-300 ' + (compact ? 'shadow-[0_16px_30px_-18px_rgba(8,30,90,.45)]' : 'shadow-[0_10px_24px_-20px_rgba(8,30,90,.35)]')}
        style={{ top: 'env(safe-area-inset-top, 0px)', background: HEAD_PIN }} data-sticky-head={compact ? 'compact' : 'full'}>

        {/* The two doors: a deeper track, the chosen door a white pill. */}
        <div className={'relative mx-3 grid grid-cols-2 rounded-[13px] p-[2px] shadow-[0_0_0_1px_rgba(255,255,255,.5)] transition-[height,margin] duration-300 ' + (compact ? 'mt-1.5 h-[34px]' : 'h-[37px]')}
          style={{ background: TRACK }} role="tablist" data-door-bar>
          <span aria-hidden className={'absolute bottom-[2px] left-[2px] top-[2px] w-[calc(50%-2px)] rounded-[11px] bg-white shadow-[0_4px_12px_-8px_rgba(0,0,0,.5)] transition-transform duration-300 ease-out ' + ((celebrate && !nudge) ? 'translate-x-0' : 'translate-x-full') + (nudge ? ' duration-700' : '')} />
          {nudge && <span className="cx-pop pointer-events-none absolute -bottom-8 right-2 z-20 rounded-full bg-[#1C1033] px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,.6)]" data-door-nudge>Book one service here too</span>}
          {[['occasions', 'Celebrations'], ['services', 'Book a Service']].map(([id, t]) => (
            <button key={id} type="button" role="tab" aria-selected={door === id} onClick={() => choose(id)} data-door={t}
              className={'relative z-10 rounded-[11px] font-extrabold tracking-[-0.02em] transition-[color,font-size] duration-300 ' + (compact ? 'text-[13px] ' : 'text-[14px] ') + ((nudge ? id === 'services' : door === id) ? 'text-[#0C49B8]' : 'text-white')}>{t}</button>
          ))}
        </div>

        {/* Search: white on white, held by a hairline, on the same gutter as the doors. */}
        <div className={'mx-3 transition-[margin] duration-300 ' + (compact ? 'mt-1.5' : 'mt-2')}>
          <div className={'flex items-center gap-2.5 rounded-[13px] bg-white pl-3 pr-1 shadow-[0_6px_16px_-12px_rgba(0,0,0,.45)] transition-[height] duration-300 ' + (compact ? 'h-[36px]' : 'h-[40px]')} data-sticky-search>
            <button type="button" onClick={() => navigate('/search')} className="flex min-w-0 flex-1 items-center gap-2 text-left" data-search>
              <Search size={17} className="shrink-0 text-[#1C1033]" strokeWidth={2.4} />
              <span className="flex min-w-0 flex-1 items-center gap-1 text-[13.5px] font-medium text-[#6B6880]">Search<Rotator items={hints.map((h, k) => <span className="font-extrabold" style={{ color: HINT_INK[k % HINT_INK.length] }}>“{h}”</span>)} every={1900} /></span>
            </button>
            <span className="h-5 w-px shrink-0 bg-[#E7E2EE]" /><button type="button" onClick={canListen() ? voice : () => navigate('/search')} aria-label="Search by voice" className="cx-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#1C1033]" data-mic><Mic size={17} /></button>
          </div>
        </div>

        {/* Icon row: modelled 3D marks standing on the white, no plate.
            Each one filters the grid below and takes the page to it. */}
        <div className="cx-noscroll flex gap-0.5 overflow-x-auto px-2 pt-2" key={door} data-icon-row>
          <IconChip on={filter === 'all'} onClick={() => pick('all')} label="All" mark="all" compact={compact} />
          {(celebrate ? CATEGORIES.map(c => ({ id: c.id, label: CHIP[c.id] ?? c.short, mark: c.id })) : TRADE_GROUPS.map(g => ({ id: g.id, label: g.chip ?? g.label, mark: `svc:${g.id}` })))
            .map(x => <IconChip key={x.id} on={filter === x.id} onClick={() => pick(x.id)} label={x.label} mark={x.mark} compact={compact} />)}
        </div>
      </div>

      <ResumeBar className="mt-3" />
      <QuickCard where={where?.area ?? null} />

      <section style={{ background: CREAM }} className="pb-1">
        {/* The hero comes after the controls, and nothing is laid over its picture. */}
        <OfferSlider door={door} />
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
            {WEEKEND.map(id => OCCASION[id]).filter(o => o && occasionArt(o).kind === 'art').map(o => (
              <div key={o.id} className="w-[38%] max-w-[172px]" data-weekend={o.id}>
                <Card to={`/o/${o.id}`} art={occasionArt(o)} tone={o.tone} title={o.name} price={priceTag(o.id, o.category)}>
                  <span className="flex items-center gap-1 text-[#0B7A45]"><Zap size={10} className="shrink-0 fill-current" />Book it for this weekend</span>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      <PromiseStrip />
      {celebrate && <PrebookCard />}

      {/* ── In the spotlight: one big card, the next ones peeking in ─── */}
      <Spotlight key={door} items={celebrate
        ? SPOT_OCC.map(([id, badge, hook]) => OCCASION[id] && occasionArt(OCCASION[id]).kind === 'art' && { id, to: `/o/${id}`, title: OCCASION[id].name, badge, hook, art: hdArtFor(`occ-${id}`), tone: OCCASION[id].tone }).filter(Boolean)
        : SPOT_SVC.map(([id, badge, hook]) => TRADES.some(t => t.id === id) && serviceArt(id).kind === 'art' && { id, to: `/s/${id}`, title: TRADES.find(t => t.id === id).label, badge, hook, art: hdArtFor(`svc-${id}`), tone: '#E9DDFB' }).filter(Boolean)} />

      {/* ── The grid, on cream ───────────────────────────────────────── */}
      <section ref={grid} style={{ background: CREAM }} className="mt-3 py-4">
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-black leading-tight tracking-[-0.035em]">{celebrate ? 'Book a Celebration' : 'Popular Services Near You'}</h2>
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-3)]">{celebrate ? 'Pick the moment — we line up every master' : 'Verified masters · instant booking'}</p>
          </div>
          <Link to={celebrate ? '/explore#celebrations' : '/s'} className="cx-press flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[0_0_0_1px_#E9DDFB]" data-view-all>View all<ChevronRight size={15} /></Link>
        </div>
        {filter === 'all' ? (
          celebrate ? (
            <>
              <div className="grid grid-cols-3 gap-2 px-3">{(allCats ? cats : cats.slice(0, 9)).map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}</div>
              {!allCats && cats.length > 9 && <ExploreAll n={cats.length - 9} onClick={() => setAllCats(true)} />}
            </>
          ) : (
            /* Every service its own card, three a row, under a plain heading
               (Mohan, 2026-10-31: no Catering card that is also drinks). */
            <div className="space-y-5" data-service-groups>
              {TRADE_GROUPS.map(g => (
                <div key={g.id} data-service-group={g.id}>
                  <h3 className="px-4 pb-2.5 text-[15.5px] font-black tracking-[-0.025em] text-[#2E1A4F]">{g.label}</h3>
                  <div className="grid grid-cols-3 gap-2 px-3">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* One tap on a category shows what you can book in it, here and now:
             the first six, and View all for the rest (Mohan, 2026-10-31). */
          <div data-cat-open={filter}>
            <div className="grid grid-cols-3 gap-2 px-3">
              {celebrate
                ? OCCASIONS.filter(o => o.category === filter).sort((x, y) => (y.featured ? 1 : 0) - (x.featured ? 1 : 0)).slice(0, 6).map(o => <Card key={o.id} to={`/o/${o.id}`} art={occasionArt(o)} tone={o.tone} title={o.name} price={priceTag(o.id, o.category)}>{null}</Card>)
                : (TRADE_GROUPS.find(g => g.id === filter)?.trades ?? []).map(t => <ServiceCard key={t.id} tradeId={t.id} />)}
            </div>
            <Link to={celebrate ? `/c/${filter}` : '/s'} className="cx-press mx-3 mt-3 flex h-11 items-center justify-center gap-1 rounded-[14px] bg-[#F4EEFF] text-[13.5px] font-extrabold text-[var(--brand)]" data-cat-view-all>
              View all {celebrate ? `${OCCASIONS.filter(o => o.category === filter).length} ${CHIP[filter] ?? ''}` : ''}<ChevronRight size={16} />
            </Link>
          </div>
        )}
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
            <div key={o.id} className="w-[38%] max-w-[172px]"><Card to={`/o/${o.id}`} art={occasionArt(o)} tone={o.tone} title={o.name} price={priceTag(o.id, o.category)}>{null}</Card></div>
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
          {POPULAR_SVC.map(t => <div key={t} className="w-[38%] max-w-[172px]"><ServiceCard tradeId={t} /></div>)}
        </div>
      </section>

      {/* ── Live RSVP: the invite, and what it gives back ───────────── */}
      <RsvpCard />

      {/* ── Where the masters go: the real streets, and a way to change it ── */}
      <section className="mx-3 mt-3 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#ECE6F6,0_16px_32px_-26px_rgba(58,18,144,.6)]" data-promises>
        <VenueMap where={where} onEdit={() => setWhereOpen(true)} />
      </section>

      {/* ── The three bands, as one moving deck ──────────────────────
          They were three full-width bands stacked down the page, which
          is three screens of scrolling for three messages. As a deck
          they cost one screen, and the one that is showing changes by
          itself — the way a marketing rail works everywhere else. */}
      <BandDeck />

      <SignOff />

      <InstantSheet open={instant} onClose={() => setInstant(false)} />
      <LocationSheet open={whereOpen} onClose={() => setWhereOpen(false)} onPick={p => { saveWhere(p); setWhere(savedWhere()); setWhereOpen(false) }} />
    </main>
  )
}

/**
 * The marketing deck — welcome offer, book a service, refer & earn.
 *
 * A scroll-snap rail that also advances on its own every 4 s, pauses for
 * 7 s whenever the customer touches it, and loops. Native swipe, no
 * library: the same mechanic as the offer deck above it, so the two read
 * as one idea rather than two carousels built by different hands.
 */
const BANDS = [
  {
    id: 'offer', to: '/rewards', kicker: 'Welcome offer', kickerFg: '#B45309',
    bg: 'linear-gradient(120deg, #FFF4D6 0%, #FFEBD2 55%, #FFE0EC 100%)',
    big: '25% OFF', bigFg: '#1C1033',
    line: 'On your first celebration booking — up to ₹2,500. Yours on sign-up.', lineFg: '#5B4A3A',
    cta: 'See my 25% voucher', ctaBg: '#1C1033', ctaFg: '#FFFFFF',
    art: <Gift size={88} strokeWidth={1.2} className="absolute -right-3 bottom-1 text-[#F59E0B]/40" />,
  },
  {
    id: 'service', to: '/s', kicker: 'Book a service', kickerFg: '#0C831F',
    bg: 'linear-gradient(120deg, #E8F8EE 0%, #E6F2FF 100%)',
    big: 'One master, booked in a minute', bigFg: '#1C1033',
    line: 'A photographer, a cook, a DJ — price upfront, 25% off your first booking.', lineFg: '#3F5A4B',
    cta: 'Book a service', ctaBg: '#0C831F', ctaFg: '#FFFFFF',
    art: <img src={artFor('svc-photography')} alt="" className="pointer-events-none absolute -right-2 bottom-0 h-[118px] w-auto mix-blend-multiply" loading="lazy" />,
  },
  {
    id: 'refer', to: '/refer', kicker: 'Refer & earn', kickerFg: '#6A2BD9',
    bg: 'linear-gradient(120deg, #F3ECFF 0%, #FCE7F3 100%)',
    big: 'Celebrate Together', bigFg: '#1C1033',
    line: 'Invite the people you celebrate with.', lineFg: '#5F5675',
    cta: 'Refer your friend', ctaBg: '#6D28D9', ctaFg: '#FFFFFF',
    art: <img src={artFor('cat-life')} alt="" className="pointer-events-none absolute -right-3 bottom-0 h-[118px] w-auto mix-blend-multiply" loading="lazy" />,
  },
]

/**
 * Explore the rest of the categories.
 *
 * Nine cards is enough to show what the app covers; the other nine are
 * behind this. A sweep of light crosses it every few seconds so it reads
 * as something to press rather than a divider.
 */
/**
 * The live strip — what is true right now, one line at a time.
 *
 * Quick commerce sells a PROMISE, and the promise is the only thing the
 * customer cannot see for themselves: that a master is awake, that they
 * accept on the spot, and that money does not move until they do. This
 * card says that, changing every few seconds, with a pulse so it reads
 * as a live state and not a slogan.
 *
 * Every line is something the app actually guarantees — a policy or a
 * state — never an invented name, count or "Priya just booked". A feed
 * of fictional strangers is the easiest thing here to build and the
 * fastest way to lose somebody who later notices it repeating.
 */
const LIVE_LINES = where => [
  { icon: Zap, fg: '#0C831F', bg: '#E9F8EF', text: <>Masters are <b>accepting requests now</b>{where ? <> near {where}</> : null}</> },
  { icon: ShieldCheck, fg: '#6D28D9', bg: '#F3ECFF', text: <>Sending a request is <b>free</b> — you pay <b>only after a master accepts</b></> },
  { icon: CalendarCheck2, fg: '#1D4ED8', bg: '#EAF1FF', text: <>Master accepted? Pay to <b>lock your date</b> — an advance from 20% on bookings over ₹25,000</> },
  { icon: IndianRupee, fg: '#B45309', bg: '#FFF4DA', text: <><b>No hidden charges</b> — ₹0 booking fee; the price you see is the price you pay</> },
  { icon: BadgeCheck, fg: '#BE185D', bg: '#FDECF4', text: <>Every master is <b>ID-verified</b> before they go live</> },
  { icon: RotateCcw, fg: '#0B6B3D', bg: '#E9F8EF', text: <>Master cancels on you? You get a <b>full refund</b></> },
]

/* The live card (Mohan, 2026-11-10: "India's quickest celebration
   platform … make it very amazing, futuristic, like a card"). The claim
   is the headline and stays put; under it the live line changes, with a
   story-style bar per line so it reads as a feed, and a band of light
   runs round the border. */
function LiveStrip({ where }) {
  const lines = useMemo(() => LIVE_LINES(where), [where])
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % lines.length), 3600)
    return () => clearInterval(t)
  }, [lines.length])
  const l = lines[i]
  return (
    <div className="relative mx-3 mt-3 overflow-hidden rounded-[20px] p-[1.6px] shadow-[0_16px_32px_-24px_rgba(58,18,144,.7)]" data-live-strip>
      <span aria-hidden className="cx-live-ring absolute left-1/2 top-1/2 aspect-square w-[160%]"
        style={{ background: 'conic-gradient(from 0deg, #7C3AED, #22C55E, #FFB61C, #EC4899, #7C3AED)' }} />
      <div className="relative rounded-[18.6px] bg-white px-3 pb-2.5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-black tracking-[-0.025em] text-[#1C1033]">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] shadow-[0_4px_10px_-6px_rgba(200,125,10,.9)]" style={{ background: YELLOW }}><Zap size={13} className="fill-[#6B3E00] text-[#6B3E00]" /></span>
            <span className="min-w-0 text-[12.5px] leading-tight">India’s quickest celebration platform</span>
          </p>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#16A34A] to-[#0B6B3D] px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-[0.09em] text-white shadow-[0_6px_14px_-8px_rgba(11,107,61,.95)]">
            <span className="relative grid h-1.5 w-1.5 place-items-center">
              <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-80" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Live
          </span>
        </div>
        <div className="mt-2 flex min-h-[34px] items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] transition-colors duration-500" style={{ background: l.bg, color: l.fg }}>
            <l.icon size={16} strokeWidth={2.4} />
          </span>
          <span key={i} className="cx-rise min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-[#2E1A4F]">{l.text}</span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {lines.map((_, k) => (
            <span key={k} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[#EEEAF5]">
              {k < i && <span className="absolute inset-0 rounded-full bg-[#86EFAC]" />}
              {k === i && <span key={`f${i}`} className="cx-story absolute inset-0 rounded-full bg-[#16A34A]" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExploreAll({ n, onClick }) {
  return (
    <button type="button" onClick={onClick} data-explore-all
      className="cx-press group relative mx-3 mt-3 flex h-[52px] w-[calc(100%-1.5rem)] items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A855F7] text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,.95)]">
      <span aria-hidden className="cx-explore-sheen pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <span className="relative z-10 text-[14px] font-black tracking-[-0.02em]">Explore all {n + 9} celebration types</span>
      <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full bg-white/20"><ChevronDown size={16} strokeWidth={3} /></span>
    </button>
  )
}

function BandDeck() {
  const rail = useRef(null)
  const [i, setI] = useState(0)
  const quietUntil = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const el = rail.current
      if (!el || Date.now() < quietUntil.current || document.visibilityState !== 'visible') return
      const cards = [...el.children]
      if (!cards.length) return
      const next = (i + 1) % cards.length
      el.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' })
    }, 4000)
    return () => clearInterval(t)
  }, [i])
  const onScroll = () => {
    const el = rail.current
    if (!el) return
    const cards = [...el.children]
    const at = cards.reduce((best, c, k) => (Math.abs(c.offsetLeft - cards[0].offsetLeft - el.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - el.scrollLeft) ? k : best), 0)
    if (at !== i) setI(at)
  }
  const hold = () => { quietUntil.current = Date.now() + 7000 }
  return (
    <section className="mt-4" data-band-deck>
      <div ref={rail} onScroll={onScroll} onTouchStart={hold} onPointerDown={hold}
        className="cx-noscroll flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-1">
        {BANDS.map(b => (
          <Link key={b.id} to={b.to} data-band={b.id}
            className="cx-press relative flex min-h-[172px] w-[88%] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] px-4 py-4"
            style={{ background: b.bg }}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: b.kickerFg }}>{b.kicker}</p>
            <p className={'mt-1 font-black tracking-[-0.04em] ' + (b.id === 'offer' ? 'text-[30px] leading-none' : 'text-[23px] leading-[1.05]')} style={{ color: b.bigFg }}>{b.big}</p>
            <p className="mt-1 max-w-[62%] text-[12.5px] font-semibold leading-snug" style={{ color: b.lineFg }}>{b.line}</p>
            <span className="relative z-10 mt-auto inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold"
              style={{ background: b.ctaBg, color: b.ctaFg }}>{b.cta}<ArrowRight size={15} /></span>
            {b.art}
          </Link>
        ))}
      </div>
      {/* Which of the three is showing. */}
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {BANDS.map((b, k) => <span key={b.id} className={'h-1.5 rounded-full transition-all duration-300 ' + (k === i ? 'w-5 bg-[var(--brand)]' : 'w-1.5 bg-[#D9CEF0]')} />)}
      </div>
    </section>
  )
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* ── The hero: scenes, each a headline with its own picture ───────────
   Every 3 s the headline, the question chips and the little live card
   change together, so what the words promise is what the card shows:
   "Prices Upfront" shows a price, "Pay Only After a Master Accepts"
   shows the payment going through. Each scene has its own colour of
   card (Mohan, 2026-11-10: "one light purple, one green, one orange…"). */
const PLATE = (plateLabel() ?? 'Per-plate prices').replace(/^from/, 'From').replace(' per plate', ' / plate')
const SCENES = {
  occasions: [
    { tone: 'purple', lines: ['Book Your', 'Celebration', 'in Minutes'], ask: ['Booked your party yet?', '25% off your first booking'],
      card: { icon: CalendarCheck2, title: 'Birthday Party', sub: '6 masters lined up', meter: 1, to: '/o/birthday-party' }, art: ['hero-family'] },
    { tone: 'pink', lines: ['Invite', 'Everyone in', 'One Tap'], ask: ['Who’s coming? Know it live', 'Free WhatsApp RSVP'],
      card: { icon: MailOpen, title: 'WhatsApp invites', sub: 'Live RSVP headcount', to: '/invites' }, art: ['hero-invite', 'svc-invitation_printing'] },
    { tone: 'orange', lines: ['No Waiting', 'for Quotes.', 'Prices Upfront'], ask: ['Seen the price before you book?', 'No “we’ll call you back”'],
      card: { icon: IndianRupee, title: PLATE, sub: 'Catering · price shown upfront', to: '/s/catering_food' }, art: ['hero-price', 'svc-catering_food'] },
    { tone: 'green', lines: ['No Chasing', 'for Replies.', 'Masters Ready'], ask: ['Tried instant booking?', 'Ready on your date'],
      card: { icon: Zap, title: 'Accepted', sub: 'Your photographer said yes', to: '/s/photography' }, art: ['hero-masters', 'svc-decoration_floral'] },
    { tone: 'blue', lines: ['Pay Only After', 'a Master', 'Accepts'], ask: ['Requests are free to send', 'Pay to lock your date'],
      card: { icon: ShieldCheck, title: 'Payment secured', sub: 'Only after a master accepts', razorpay: true, to: '/legal/cancellation' }, art: ['hero-secure', 'svc-wedding_planning'] },
    { tone: 'gold', lines: ['Plan a', 'Surprise', 'Birthday'], ask: ['They’ll never see it coming', 'Cake, decor & a photographer'],
      card: { icon: PartyPopper, title: 'Surprise Birthday', sub: 'Ready in 4 taps', to: '/o/surprise-birthday-party' }, art: ['occ-surprise-birthday-party'] },
    { tone: 'purple', lines: ['Weekend', 'Party?', 'Sorted.'], ask: ['This Saturday, all set', 'DJ, food & lights in one go'],
      card: { icon: Music2, title: 'Rooftop party', sub: 'Book it for this Saturday', to: '/o/rooftop-party' }, art: ['hero-weekend', 'occ-friends-get-together'] },
    { tone: 'orange', lines: ['Private', 'Dining,', 'Booked'], ask: ['A table that’s all yours', 'Chef, decor & music'],
      card: { icon: UtensilsCrossed, title: 'Private dinner', sub: 'For 2 to 50 guests', to: '/o/private-dinner-party' }, art: ['occ-private-dinner-party'] },
  ],
  services: [
    { tone: 'purple', lines: ['Book the', 'Right Service', 'in Minutes'], ask: ['Need a photographer today?', '25% off your first booking'],
      card: { icon: CalendarCheck2, title: '11 photographers', sub: 'Near you · instant', to: '/s/photography' }, art: ['svc-photography'] },
    { tone: 'pink', lines: ['Invite', 'Everyone in', 'One Tap'], ask: ['Who’s coming? Know it live', 'Free WhatsApp RSVP'],
      card: { icon: MailOpen, title: 'WhatsApp invites', sub: 'Live RSVP headcount', to: '/invites' }, art: ['hero-invite', 'svc-invitation_printing'] },
    { tone: 'orange', lines: ['No Enquiries.', 'No Waiting.', 'Just Book'], ask: ['Seen the price before you book?', 'Pick, request, pay'],
      card: { icon: IndianRupee, title: '₹4,348', sub: 'Photography · price upfront', to: '/s/photography' }, art: ['svc-dj_music'] },
    { tone: 'green', lines: ['Masters Are', 'Ready for', 'Your Date'], ask: ['Tried instant booking?', 'Verified before they go live'],
      card: { icon: BadgeCheck, title: 'Verified master', sub: 'ID and work checked', to: '/s' }, art: ['hero-masters', 'svc-bridal_makeup_hair'] },
    { tone: 'blue', lines: ['Pay Only After', 'a Master', 'Accepts'], ask: ['Requests are free to send', 'Pay to lock your date'],
      card: { icon: ShieldCheck, title: 'Payment secured', sub: 'Only after a master accepts', razorpay: true, to: '/legal/cancellation' }, art: ['hero-secure', 'svc-wedding_planning'] },
  ],
}
/* One light ground per scene, the accent the words and the button take
   from it. Light on purpose: the art is drawn on white and multiplies
   into whatever it stands on, so the card colours the picture too. */
const TONES = {
  purple: { bg: 'linear-gradient(135deg, #F5EEFF 0%, #E5D6FF 100%)', ink: '#6D28D9', cta: 'linear-gradient(135deg, #7C3AED, #5B21B6)', glow: 'rgba(91,33,182,.95)' },
  pink: { bg: 'linear-gradient(135deg, #FFF0F6 0%, #FFD7E8 100%)', ink: '#DB2777', cta: 'linear-gradient(135deg, #EC4899, #BE185D)', glow: 'rgba(190,24,93,.95)' },
  orange: { bg: 'linear-gradient(135deg, #FFF5E8 0%, #FFE0BC 100%)', ink: '#C2410C', cta: 'linear-gradient(135deg, #F97316, #C2410C)', glow: 'rgba(194,65,12,.95)' },
  green: { bg: 'linear-gradient(135deg, #ECFAF1 0%, #CDEFDB 100%)', ink: '#0C831F', cta: 'linear-gradient(135deg, #16A34A, #0B6B3D)', glow: 'rgba(11,107,61,.95)' },
  blue: { bg: 'linear-gradient(135deg, #EEF5FF 0%, #D3E3FF 100%)', ink: '#1D4ED8', cta: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', glow: 'rgba(29,78,216,.95)' },
  gold: { bg: 'linear-gradient(135deg, #FFFAE6 0%, #FFEBAE 100%)', ink: '#B45309', cta: 'linear-gradient(135deg, #F59E0B, #B45309)', glow: 'rgba(180,83,9,.95)' },
}
/* The four promises as marks a customer has seen on real apps: a bolt for
   instant, the blue verified rosette, the payment partner's own glyph, a
   rupee coming back. Drawn, so they stay sharp at any size. */
const ROSETTE = (() => {
  const n = 12, inner = 10.4, outer = 12.9, at = (r, a) => `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`
  let d = `M${at(inner, -Math.PI / 2)}`
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI / 2 + (2 * Math.PI * k) / n, a1 = a0 + (2 * Math.PI) / n
    d += `Q${at(outer + 1.2, (a0 + a1) / 2)} ${at(inner, a1)}`
  }
  return d + 'Z'
})()
function Mark({ kind }) {
  if (kind === 'instant') return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <defs><linearGradient id="mk-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE16B" /><stop offset="1" stopColor="#FF9F0A" /></linearGradient></defs>
      <rect width="24" height="24" rx="7" fill="#4C1D95" />
      <path d="M13.6 3.6 6.4 13.3h4.9l-1.2 7.1 7.5-10.1h-5z" fill="url(#mk-bolt)" stroke="#FFF3C4" strokeWidth=".5" strokeLinejoin="round" />
    </svg>
  )
  if (kind === 'verified') return (
    <svg viewBox="-1 -1 26 26" className="h-full w-full" aria-hidden>
      <path d={ROSETTE} fill="#1D9BF0" />
      <path d="m7.6 12.3 3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <rect width="24" height="24" rx="12" fill="#0C831F" />
      <path d="M18.3 12a6.3 6.3 0 1 1-1.9-4.5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M17.6 4.4v3.5h-3.5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 9h4.8M9.6 11.1h4.8M11.4 9c1.9 0 1.9 4.2 0 4.2H9.8l3.4 3.2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
/* Said in full, never "pay after accept": accept WHAT, by WHOM, is the
   question a first-time customer actually has (Mohan, 2026-11-10). */
const FEATURES = [['instant', 'Pay after a master accepts'], ['verified', 'Verified masters']]

/**
 * The hero — one card, coloured per scene.
 *
 * The art spreads across the card with no frame: it is drawn on white,
 * so mix-blend-multiply dissolves its ground into the card's colour, and
 * object-contain keeps every bit of the character in view.
 */
function Hero({ door }) {
  const scenes = SCENES[door] ?? SCENES.occasions
  const [i, setI] = useState(0)
  useEffect(() => { setI(0); const t = setInterval(() => setI(n => (n + 1) % scenes.length), 3000); return () => clearInterval(t) }, [scenes])
  /* The two doors have different numbers of scenes: index modulo the
     current list, or switching door on a late scene reads past the end. */
  const s = scenes[i % scenes.length]
  const T = TONES[s.tone] ?? TONES.purple
  const C = s.card
  const Live = C.to ? Link : 'div'
  const open = C.to ?? (door === 'services' ? '/s' : '/explore#celebrations')
  return (
    <div className="relative mx-3 mt-3 overflow-hidden rounded-[22px] shadow-[0_16px_34px_-26px_rgba(58,18,144,.6)]" data-hero={i} data-hero-tone={s.tone}>
      <span key={`bg${door}${i}`} aria-hidden className="cx-enter absolute inset-0" style={{ background: T.bg }} />
      {/* One height for every scene: the headline is given three lines'
          room whether it uses two or three, so the page below never
          jumps when the scene changes. */}
      <div className="relative h-[170px]">
        <Link to={open} aria-label={C.title} className="absolute bottom-0 right-0 top-0 w-[50%]">
          <img key={`img${door}${i}`} src={(s.art ?? []).map(artFor).find(Boolean) ?? artFor('hero-family')} alt=""
            className="absolute inset-0 h-full w-full object-contain object-right-bottom mix-blend-multiply" />
        </Link>
        <Link to={open} className="relative z-10 flex h-full w-[56%] flex-col py-3 pl-3.5 pr-1" data-hero-open>
          <p key={`a${door}${i}`} className="cx-rise flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.09em]" style={{ color: T.ink }} data-hero-ask>
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ background: T.ink }} /><span className="truncate">{s.ask[0]}</span>
          </p>
          <h1 key={`${door}-${i}`} className="cx-rise mt-1.5 text-[21px] font-black leading-[1.1] tracking-[-0.042em] text-[#16092E]" aria-live="polite">
            {s.lines[0]} {s.lines[1]}{' '}
            <span style={{ color: T.ink }}>{s.lines[2]}</span>
          </h1>
          <span className="mt-auto flex flex-col gap-1 pt-2" data-hero-marks>
            {FEATURES.map(([k, t]) => (
              <span key={k} className="flex items-center gap-1.5 text-[10.5px] font-extrabold leading-tight tracking-[-0.01em] text-[#2A2140]" data-mark={k}>
                <span className="h-[18px] w-[18px] shrink-0 drop-shadow-[0_2px_4px_rgba(20,15,31,.18)]"><Mark kind={k} /></span>{t}
              </span>
            ))}
          </span>
        </Link>
      </div>

      {/* What you can do with it, right now: the live card and one action. */}
      <div className="relative flex h-[74px] items-stretch gap-2 px-3 pb-3 pt-0.5" data-hero-below>
        <Live {...(C.to ? { to: C.to } : {})} key={`c${door}${i}`} className="cx-pop flex min-w-0 flex-1 flex-col justify-center rounded-[13px] bg-white/90 px-2.5 py-2 shadow-[0_0_0_1px_rgba(255,255,255,.9),0_8px_18px_-14px_rgba(20,15,31,.5)]">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: T.cta }}><C.icon size={16} strokeWidth={2.6} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-black leading-[1.15] tracking-[-0.025em] text-[#1C1033]">{C.title}</span>
              <span className="block truncate text-[10px] font-semibold leading-[1.2] text-[#6B6480]">{C.sub}</span>
            </span>
            {C.to && <ChevronRight size={15} className="shrink-0 text-[var(--ink-3)]" />}
          </span>
          {C.meter && <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#EDE6FB]"><span className="block h-full w-[78%] animate-pulse rounded-full" style={{ background: T.ink }} /></span>}
          {C.razorpay && <span className="mt-1 flex items-center gap-1 text-[9.5px] font-bold text-[#5F5675]"><ShieldCheck size={10} className="text-[#0F9D58]" />Secured by <RazorpayLogo className="h-[9px] w-auto" /></span>}
        </Live>
        <Link to={door === 'services' ? '/s' : '/rewards'} key={`b${door}${i}`} style={{ animationDelay: '.15s', background: T.cta, boxShadow: `0 8px 18px -11px ${T.glow}` }}
          className="cx-pop flex w-[37%] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[13px] px-2 py-2 text-center">
          <span className="line-clamp-3 text-[10.5px] font-extrabold leading-[1.2] tracking-[-0.005em] text-white">{s.ask[1]}</span>
          <span className="flex items-center gap-0.5 text-[8.5px] font-black uppercase tracking-[0.06em] text-white/80">Book now<ChevronRight size={10} strokeWidth={3} /></span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Safe payments, and cancellation — the two things a first booking is
 * nervous about, said once, as two cards that fill the row.
 *
 * The payment card carries Razorpay's own logo (ui/RazorpayLogo, their
 * file, not a redrawing): every payment here goes through them, so it is
 * a fact the customer can check. Each line is what actually happens —
 * money is held until the event is delivered, and a master who cancels
 * means everything back (data/policies.js).
 */
function PromiseStrip() {
  return (
    <div className="mx-3 mt-4 grid grid-cols-2 gap-2.5" data-promise-strip>
      <Link to="/legal/cancellation" className="cx-press relative flex min-h-[124px] flex-col overflow-hidden rounded-[18px] bg-white p-3 shadow-[0_0_0_1px_#DCE8FA,0_14px_28px_-24px_rgba(7,38,84,.75)]" data-mark="safe">
        <span aria-hidden className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-[#EAF3FF]" />
        <span className="relative flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-[#3E5878]"><ShieldCheck size={13} className="text-[#3395FF]" />Secured by</span>
        <RazorpayLogo className="relative mt-1.5 h-[19px] w-auto self-start" />
        <span className="relative mt-auto block pt-2 text-[14px] font-black leading-tight tracking-[-0.02em] text-[#072654]">Safe payments</span>
        <span className="relative mt-0.5 block text-[11px] font-semibold leading-snug text-[#4B5B76]">Held safely until your event is done</span>
      </Link>
      <Link to="/legal/cancellation" className="cx-press relative flex min-h-[124px] flex-col overflow-hidden rounded-[18px] bg-white p-3 shadow-[0_0_0_1px_#D4F0DE,0_14px_28px_-24px_rgba(11,107,61,.75)]" data-mark="refunds">
        <span aria-hidden className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-[#E9F8EF]" />
        <span className="relative h-9 w-9 drop-shadow-[0_4px_8px_rgba(12,131,31,.3)]"><Mark kind="refunds" /></span>
        <span className="relative mt-auto block pt-2 text-[14px] font-black leading-tight tracking-[-0.02em] text-[#064E3B]">Easy cancellation & refunds</span>
        <span className="relative mt-0.5 block text-[11px] font-semibold leading-snug text-[#3F6B57]">Full refund if a master cancels</span>
      </Link>
    </div>
  )
}

/* Pinned header: tight once the location row has scrolled off, full again
   only back near the top (two thresholds, so it never flickers between). */
function useCompact() {
  const [c, setC] = useState(false)
  useEffect(() => {
    let raf = 0, cur = false
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const next = cur ? y > 24 : y > 150
        if (next !== cur) { cur = next; setC(next) }
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])
  return c
}

/**
 * One chip in the icon row.
 *
 * A modelled 3D mark standing on the white, no plate behind it (Mohan,
 * 2026-11-10; white ground 2026-11-11). The chosen one lifts a little into
 * a soft purple glow, its label goes full ink and a yellow bar — the
 * Instant yellow — sits under it. Pinned and tightened, the marks shrink to keep the block short.
 */
function IconChip({ on, onClick, label, mark, compact = false }) {
  const plate = compact ? 36 : 48
  const size = compact ? 24 : 34
  const all = mark === 'all'
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="cx-press flex min-w-[68px] shrink-0 flex-col items-center px-1" data-chip={label}>
      {/* Each mark stands on a light-blue plate (the reference); "All" is the white grid. */}
      <span className={'relative grid place-items-center rounded-full transition-[width,height,background-color] duration-300 ' + (all ? 'bg-white/[.14] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.35)]' : 'bg-white/[.16]')} style={{ width: plate, height: plate }}>
        {all
          ? <LayoutGrid size={compact ? 18 : 23} className="fill-white text-white" strokeWidth={2.2} />
          : <span className="relative" style={{ filter: 'saturate(1.3) contrast(1.1) brightness(1.08) drop-shadow(0 4px 6px rgba(4,20,70,.4))' }}><Glyph3D id={mark} size={size} className={'relative transition-transform duration-300 ' + (on ? 'scale-[1.06]' : '')} /></span>}
      </span>
      <span className={'whitespace-nowrap text-center leading-tight tracking-[-0.01em] text-white transition-[font-size,margin] duration-300 ' + (compact ? 'mt-0.5 text-[10.5px] ' : 'mt-1 text-[11.5px] ') + (on ? 'font-extrabold' : 'font-bold')}>{label}</span>
      <span className={'h-[3px] w-7 rounded-full transition-colors duration-300 ' + (compact ? 'mt-0.5 ' : 'mt-1 ') + (on ? 'bg-[#FFC21A]' : 'bg-transparent')} />
    </button>
  )
}

/**
 * Instant booking — and the reason it is instant.
 *
 * The pill says what the button DOES; the live line under it says why it
 * can: masters are online now and accept on the spot. The dot pulses, so
 * the claim reads as a live state rather than a slogan.
 */
function InstantPill({ onClick }) {
  return (
    <button type="button" onClick={onClick} data-instant-pill
      className="cx-press flex shrink-0 flex-col items-center justify-center rounded-[13px] px-2.5 py-1.5 shadow-[0_8px_16px_-10px_rgba(0,0,0,.5)]" style={{ background: YELLOW }}>
      <span className="flex items-center gap-1 whitespace-nowrap text-[12px] font-extrabold leading-none tracking-[-0.02em] text-[#1C1033]"><Zap size={11} className="fill-current" />Instant Booking</span>
      <span className="mt-[4px] flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold leading-none text-[#2A1B00]">
        <span className="relative grid h-2 w-2 place-items-center">
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-[#16A34A] opacity-75" />
          <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
        </span>
        Masters live now
      </span>
    </button>
  )
}

/* One line each (2026-10-31): the short names the icon row shows. */
const CHIP = { life: 'Celebrations', wedding: 'Indian Weddings', festivals: 'Festivals', school: 'School', college: 'College', corporate: 'Corporate', nightlife: 'Nightlife', public: 'Shows', sport: 'Sports', food: 'Dining', retail: 'Fashion', property: 'Property', community: 'Community' }
/* The search hints, each in its own colour — brand, rose, green, saffron, teal, magenta. */
const HINT_INK = ['#7C3AED', '#DB2777', '#0C831F', '#EA580C', '#0F766E', '#C026D3']

/* The streets around the customer's venue — real OpenStreetMap tiles —
   with the route a master drives in, and an Edit that opens the location
   sheet so the pin can be moved to the actual venue (Mohan, 2026-11-10). */
function VenueMap({ where, onEdit }) {
  const centre = where?.lat && where?.lng ? { lat: Number(where.lat), lng: Number(where.lng) } : { lat: 12.9716, lng: 77.5946 }
  const W = 360, H = 158, zoom = 15
  const tiles = tilesFor({ centre, zoom, width: W, height: H })
  return (
    <div className="relative h-[158px] overflow-hidden bg-[#EEF0F2]" data-venue-map>
      <div className="absolute left-1/2 top-0 h-[158px] w-[360px] -translate-x-1/2">
        {tiles.map(t => <img key={t.key} src={tileUrl(DEFAULT_TILES, t)} alt="" className="absolute h-[256px] w-[256px] max-w-none" style={{ left: t.left, top: t.top }} loading="lazy" draggable={false} />)}
      </div>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0)_0%,rgba(91,33,182,.12)_75%)]" />
      {/* The way in: a dashed line that keeps moving toward the pin. */}
      <svg className="absolute left-1/2 top-0 h-[158px] w-[360px] -translate-x-1/2" viewBox="0 0 360 158" aria-hidden>
        <path d="M-8 150C52 136 74 92 122 96S168 80 180 64" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" opacity=".85" />
        <path className="cx-route" d="M-8 150C52 136 74 92 122 96S168 80 180 64" fill="none" stroke="#6D28D9" strokeWidth="3.6" strokeLinecap="round" strokeDasharray="1 8" />
      </svg>
      <span aria-hidden className="absolute left-1/2 top-[64px] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/25 cx-orb-halo" />
      <span className="absolute left-1/2 top-[64px] grid h-9 w-9 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-[#6D28D9] text-white shadow-[0_6px_14px_-4px_rgba(91,33,168,.8)] ring-4 ring-white"><MapPin size={17} /></span>
      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#4C1D95] shadow">Your venue</span>
      <span className="absolute right-1.5 top-1.5 text-[8.5px] font-semibold text-[#5F5675]">© OpenStreetMap</span>
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-[15px] bg-white/95 p-1.5 pl-2 shadow-[0_10px_22px_-12px_rgba(30,8,70,.6)]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F1EAFF] text-[#6D28D9]"><Navigation size={15} className="fill-current" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-black tracking-[-0.01em] text-[#2E1A4F]">Masters navigate straight to {where?.area ?? 'your venue'}</span>
          <span className="block truncate text-[10px] font-semibold text-[#6B6480]">Not the venue? Tap Edit to move the pin</span>
        </span>
        <button type="button" onClick={onEdit} className="cx-press flex shrink-0 items-center gap-1 rounded-full bg-[#6D28D9] px-3 py-2 text-[11.5px] font-extrabold text-white shadow-[0_8px_16px_-10px_rgba(91,33,168,.95)]" data-venue-edit>
          <Pencil size={12} strokeWidth={2.6} />Edit
        </button>
      </div>
    </div>
  )
}

/**
 * Live RSVP — what the free invite gives back.
 *
 * It was a picture card with a 3D envelope in its corner, which said
 * "invitation" and nothing about why anyone would send one through us.
 * This draws the thing itself: the three answers a guest can give,
 * filling as they come in, and the veg / non-veg split the caterer is
 * told. It is a drawing of the feature, never a count — there are no
 * numbers on it, because there is no event behind it yet.
 */
function RsvpCard() {
  return (
    <Link to="/invites" className="cx-press relative mx-3 mt-3 block overflow-hidden rounded-[24px] p-4" data-home-invites
      style={{ background: 'linear-gradient(140deg, #FFF3F8 0%, #FFE6F0 55%, #FFDAEA 100%)', boxShadow: '0 0 0 1px #FAD2E3, 0 18px 34px -26px rgba(190,24,93,.65)' }}>
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/55" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-[#DB2777] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white">
            <span className="relative grid h-1.5 w-1.5 place-items-center"><span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-80" /><span className="h-1.5 w-1.5 rounded-full bg-white" /></span>
            Live RSVP · Free
          </span>
          <p className="mt-2.5 text-[19px] font-black leading-[1.12] tracking-[-0.035em] text-[#3B0A24]">Invite everyone on WhatsApp.<br /><span className="text-[#DB2777]">See who’s coming, live.</span></p>
          <p className="mt-1 text-[12px] font-semibold leading-snug text-[#8A3A5E]">Guests reply in one tap — no app to install.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#25D366] text-white shadow-[0_10px_20px_-10px_rgba(18,140,70,.9)]"><MessageCircle size={24} strokeWidth={2.4} /></span>
      </div>

      <div className="relative mt-3.5 rounded-[18px] bg-white/90 p-3 shadow-[0_0_0_1px_rgba(255,255,255,.9),0_10px_22px_-18px_rgba(190,24,93,.6)]" aria-hidden>
        <p className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-[#B0306E]">Your guest list<span className="font-bold normal-case tracking-normal text-[#B79AAE]">updates as they reply</span></p>
        {[['Coming', '#16A34A', '82%'], ['Maybe', '#F59E0B', '40%'], ['Can’t make it', '#B5ADC4', '18%']].map(([t, c, w], i) => (
          <div key={t} className="flex items-center gap-2 py-[3px]">
            <span className="w-[86px] shrink-0 text-[11px] font-extrabold text-[#3B2A4A]">{t}</span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#F3EEF7]"><span className="cx-rsvp-bar absolute inset-y-0 left-0 rounded-full" style={{ width: w, background: c, animationDelay: `${i * 0.35}s` }} /></span>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2 border-t border-[#F4E8F0] pt-2">
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#15803D]"><FoodMark />Veg</span>
          <span className="flex h-2 flex-1 overflow-hidden rounded-full"><span className="h-full w-[62%] bg-[#22C55E]" /><span className="h-full flex-1 bg-[#DC2626]" /></span>
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#B91C1C]">Non-veg<FoodMark non /></span>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 rounded-full bg-[#DB2777] px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(190,24,93,.95)]">Create a free invite<ChevronRight size={15} /></span>
        <span className="text-right text-[11.5px] font-bold leading-tight text-[#8A3A5E]">1,000+ most-loved<br />designs, animated</span>
      </div>
    </Link>
  )
}
/* The veg / non-veg square every Indian menu carries. */
const FoodMark = ({ non = false }) => (
  <span className={'grid h-3.5 w-3.5 place-items-center rounded-[3px] border-[1.5px] ' + (non ? 'border-[#B91C1C]' : 'border-[#15803D]')}>
    <span className={'h-1.5 w-1.5 rounded-full ' + (non ? 'bg-[#B91C1C]' : 'bg-[#15803D]')} />
  </span>
)

/* ── The sign-off ────────────────────────────────────────────────── */
function SignOff() {
  return (
    <footer className="mt-8 overflow-hidden" aria-label="Crafted with love in Mysuru">
      <div className="px-6">
        <p className="text-[42px] font-extrabold leading-[0.96] tracking-[-0.05em] text-[#E6DDF6]">Crafted<br />with love <Heart /><br /><span className="text-[#D8CAF1]">in Mysuru.</span></p>
        <p className="mt-3 text-[12.5px] font-bold text-[#A79BC2]">For every celebration across India.</p>
      </div>
      <div className="mt-3 bg-gradient-to-b from-white via-[#FBF8FF] to-[#F3EDFF] pt-1">
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
