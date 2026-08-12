import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Clock, ChevronRight, PhoneCall,
  MessageCircle, SearchX, CalendarHeart, ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BRAND, CTA, EVENT_TYPES } from '../config/sambramo'
import { SHOP_CATEGORIES } from '../config/shop'
import { FESTIVALS } from '../data/festivals'
import { UPCOMING_FESTIVALS } from '../data/eventServicesData'
import { OCCASIONS } from '../data/planCatalog'
import { usePublicOffers, bestOfferFor } from '../hooks/usePublicOffers'
import { useAutoScrollRail } from '../hooks/useAutoScrollRail'
import PlanDateCard from '../components/home/PlanDateCard'
import DateInterestBadge from '../components/home/DateInterestBadge'
import { formatINR } from '../utils/format'
import ProductImage from '../components/shop/ProductImage'
import OffersRail from '../components/shop/OffersRail'
import StickyCartBar from '../components/shop/StickyCartBar'
import { useCart } from '../context/CartContext'
import HomeAppBar from '../components/home/HomeAppBar'
import LiveEventStrip from '../components/home/LiveEventStrip'
import PromoDeck from '../components/home/PromoDeck'
import OccasionCard from '../components/home/OccasionCard'
import TierRail from '../components/home/TierRail'
import ShopPicksRail from '../components/home/ShopPicksRail'
import ReferAndEarn from '../components/customer/ReferAndEarn'

/**
 * Home — one screen, signed in or signed out.
 *
 * There used to be two. `/` was a marketing landing page and
 * `/dashboard/customer` was a "customer home", and they offered the same
 * things in different words and different layouts: both sold the planner,
 * both listed celebration types, both pushed the shop, both ran a festival
 * rail. Signing in therefore replaced the app you had just learned with
 * another one that did the same job — the whole cost of a second screen and
 * none of the benefit.
 *
 * So there is one Home now, and authentication changes what is *on* it
 * rather than which screen you land on:
 *
 *   signed out   the deck opens on "plan a celebration", and the page ends
 *                with how the service works and who is answerable for it —
 *                the things a first-time visitor needs before they trust it.
 *   signed in    their live celebrations pin to the top with real pipeline
 *                progress, the deck opens on whatever is next for them, and
 *                the explanatory tail collapses into a support strip. They
 *                have already bought the pitch.
 *
 * Everything on the page is live: events from `events`, coupons from
 * `coupons`, packages and prices from data/eventServicesData, festival
 * countdowns from real dates. Nothing here is a placeholder, and nothing
 * claims a saving that isn't in the data.
 */

const ACTIVE_STATUSES = [
  'REQUEST_RECEIVED', 'UNDER_REVIEW', 'CONTACTING_VENDORS', 'QUOTES_COLLECTED',
  'PROPOSAL_PREPARED', 'PROPOSAL_SENT', 'CUSTOMER_REVIEW', 'APPROVED',
  'CONFIRMED', 'IN_COORDINATION', 'EVENT_DAY',
]

const FESTIVAL_DETAIL_IDS = new Set(FESTIVALS.map(f => f.id))
const FESTIVAL_SHOP_ROUTE = {
  'independence-day': { category: 'Party Essentials', occasion: 'Independence Day' },
  'raksha-bandhan':   { category: 'Gifts', occasion: 'Rakhi' },
  'janmashtami':      { category: 'Pooja & Essentials', occasion: 'Janmashtami' },
  'dussehra':         { category: 'Pooja & Essentials', occasion: 'Navratri' },
  'new-years-eve':    { category: 'Gifts', occasion: 'New Year' },
}
function festivalHref(f) {
  if (FESTIVAL_DETAIL_IDS.has(f.id)) return `/festivals/${f.id}`
  const route = FESTIVAL_SHOP_ROUTE[f.id] ?? { category: 'Gifts' }
  const qs = route.occasion ? `?occasion=${encodeURIComponent(route.occasion)}` : ''
  return `/shop/${encodeURIComponent(route.category)}${qs}`
}
function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}
function urgency(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

export default function HomeScreen() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState([])
  const [query, setQuery] = useState('')
  const offers = usePublicOffers()
  const { productCount } = useCart()

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.name?.split(' ')[0] ??
    null

  useEffect(() => {
    if (!user) { setEvents([]); return }
    let cancelled = false
    supabase.from('events').select('*').eq('customer_id', user.id)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (!cancelled) setEvents(data ?? []) })
    return () => { cancelled = true }
  }, [user])

  const activeEvents = events.filter(e => ACTIVE_STATUSES.includes(e.status))

  const upcoming = useMemo(() => UPCOMING_FESTIVALS
    .map(f => ({ ...f, days: daysUntil(f.date) }))
    .filter(f => f.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8), [])

  // The deck is assembled from what is true today, in the order that matters
  // to whoever is looking. A returning customer with a celebration underway
  // does not need the "plan a celebration" pitch first.
  const nextFestival = upcoming[0]
  const bestOffer = offers[0]
  const slides = [
    {
      key: 'plan',
      eyebrow: 'Concierge',
      title: activeEvents.length > 0 ? 'Planning another one?' : 'Tell us what’s being celebrated',
      body: 'Venue, decor, food, photography — one team arranges all of it and one number answers for it.',
      cta: CTA.planNav,
      to: '/plan',
      art: '🎊',
      background: 'linear-gradient(120deg,#6d28d9 0%,#a21caf 55%,#c026d3 100%)',
    },
    nextFestival && {
      key: `fest-${nextFestival.id}`,
      eyebrow: `${urgency(nextFestival.days)} to go`,
      title: nextFestival.name,
      body: 'Sweets, decor, pooja essentials and the whole celebration — sorted before the day arrives.',
      cta: FESTIVAL_DETAIL_IDS.has(nextFestival.id) ? 'Plan this festival' : 'Shop the festival',
      to: festivalHref(nextFestival),
      art: nextFestival.emoji,
      background: 'linear-gradient(120deg,#b45309 0%,#d97706 45%,#c62828 100%)',
    },
    bestOffer && {
      key: `offer-${bestOffer.id}`,
      eyebrow: 'Live offer',
      title: bestOffer.discount_type === 'percent'
        ? `${Number(bestOffer.discount_value)}% off the shop`
        : `${formatINR(bestOffer.discount_value)} off the shop`,
      body: `Use code ${bestOffer.code} at checkout${
        Number(bestOffer.min_order_amount) > 0 ? ` on orders above ${formatINR(bestOffer.min_order_amount)}` : ''
      }.`,
      cta: 'Start shopping',
      to: '/shop',
      art: '🎁',
      background: 'linear-gradient(120deg,#0e523c 0%,#12694c 50%,#1c8560 100%)',
    },
  ]
  // A returning customer sees what's next for them before the pitch.
  if (activeEvents.length > 0) slides.reverse()

  // The festival rail advances itself; `upcoming` is capped at 8.
  const festivalRail = useAutoScrollRail(upcoming.length)

  const searching = query.trim().length >= 2

  return (
    <div className="home-canvas min-h-screen pb-bottom-nav">
      <HomeAppBar query={query} onQueryChange={setQuery} />

      {searching ? (
        <SearchResults query={query.trim()} onClear={() => setQuery('')} />
      ) : (
        /* The tail padding exists to clear StickyCartBar, so it is only spent
           when that bar is on screen. Reserved unconditionally it left roughly
           300px of empty plum under the support strip for every visitor with an
           empty cart, which reads as a page that failed to finish loading. */
        <div className={`mx-auto max-w-3xl space-y-8 pt-4 ${productCount > 0 ? 'pb-32' : 'pb-8'}`}>

          {activeEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="px-4 text-[15px] font-extrabold text-white">
                {firstName ? `${firstName}, here's where things stand` : 'Your celebrations'}
              </h2>
              <LiveEventStrip events={activeEvents} />
            </div>
          )}

          <PromoDeck slides={slides} />

          {/* ── Pick the day, right here ──────────────────────────────
              The date was question two of a six-step form, so the single
              most useful thing an enquiry can carry sat behind a step most
              browsers never reached. It is the front door's own card now,
              and the choice travels into the wizard. */}
          <PlanDateCard />

          {/* ── The six scales of celebration ─────────────────────────
              Replaces PackageRail, which put "Grand Celebration Birthday,
              ₹75,000–₹1,50,000 — Popular" on the front page. That is the third
              screen of a birthday decision shown to someone who has not said
              they are planning a birthday, repeated once per occasion.

              The tiers are the axis customers actually start on: nobody thinks
              "I want the premium package", they think "there'll be about sixty
              people". One rail serves every occasion. */}
          <TierRail offer={bestOfferFor(50000, offers)} />

          {/* ── What are we celebrating ───────────────────────────────
              Was a horizontal rail of 72×72 thumbnails with a caption under
              each. At that size the photograph was a smudge, so fifteen
              occasions read as fifteen identical grey squares; nothing said
              what one costs or included; and being a scroller, eleven of them
              were behind a swipe most people never make.

              A two-per-row grid fixes all three at once — the photo becomes
              legible, there is room for the price and a live coupon, and every
              occasion is reachable by scrolling the page you are already
              scrolling. */}
          <section aria-labelledby="occasions-heading">
            <div className="px-4">
              <h2 id="occasions-heading" className="text-[15px] font-extrabold text-white">
                What are we celebrating?
              </h2>
              <p className="mt-0.5 text-[11px] text-white/50">
                Every one of these, arranged end to end — pick yours.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 px-4">
              {OCCASIONS.map((o, i) => (
                <OccasionCard
                  key={o.id}
                  occasion={o}
                  offer={bestOfferFor(o.fromPrice, offers)}
                  /* Each card starts its rotation a beat after the one
                     before, so the grid never flips as one block. */
                  stagger={i * 260}
                />
              ))}
            </div>
          </section>

          {/* ── Live shop coupons ───────────────────────────────────── */}
          <OffersRail />

          {/* ── Real products, priced, one tap from the front door ──── */}
          <ShopPicksRail />

          {/* ── Festivals, counting down ────────────────────────────── */}
          {upcoming.length > 0 && (
            <section aria-labelledby="festival-heading">
              <div className="px-4">
                <h2 id="festival-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-white">
                  <CalendarHeart size={16} className="text-saffron-300" /> Coming up
                </h2>
                <p className="mt-0.5 text-[11px] text-white/50">The calendar, with enough notice to do it properly.</p>
              </div>
              {/* Moves on its own, same contract as the tier deck: on a phone
                  two of these eight are visible and nothing says the rest are
                  there. Stops for good at the first touch. */}
              <div
                ref={festivalRail.ref}
                {...festivalRail.handlers}
                className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-pl-4"
              >
                {upcoming.map(f => (
                  <Link
                    key={f.id}
                    to={festivalHref(f)}
                    className="group relative h-36 w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-white/10"
                  >
                    <ProductImage
                      query={`${f.name} festival India celebration`}
                      emoji={f.emoji}
                      className="absolute inset-0 h-full w-full"
                      cinematic
                    />
                    {/* Two layers, not one ramp: festival photography runs from a
                        night sky to a white kurta, and a single gradient that looked
                        right on the dark ones left "Independence Day" white-on-white.
                        The lower half gets a near-solid floor the caption sits on. */}
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-plum-950 via-plum-950/45 to-transparent" />
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-plum-950 to-transparent" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-saffron-400 px-2 py-0.5 text-[10px] font-extrabold text-plum-950">
                      <Clock size={10} /> {urgency(f.days)}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 p-2.5">
                      <span className="block text-[12px] font-extrabold leading-tight text-white">{f.name}</span>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-saffron-300">
                        {FESTIVAL_DETAIL_IDS.has(f.id) ? 'Plan it' : 'Shop it'}
                        <ArrowRight size={10} />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-1 flex justify-center gap-1.5" aria-hidden="true">
                {upcoming.map((f, i) => (
                  <span
                    key={f.id}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === festivalRail.active ? 'w-4 bg-saffron-400' : 'w-1 bg-white/25'
                    }`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── How this works ──────────────────────────────────────
              Signed-out visitors get the full explanation; signed-in
              customers have already been through it and get the support
              strip only. */}
          {!user && <HowItWorks />}

          <SupportStrip />
        </div>
      )}

      <StickyCartBar />

      {/* Stays on screen rather than being scrolled past once. Renders
          nothing until real enquiries exist to point at. */}
      <DateInterestBadge />
    </div>
  )
}

/* ── How it works (signed out) ────────────────────────────────────────── */
const STEPS = [
  { emoji: '✨', title: 'Tell us the occasion', sub: 'A two-minute form — date, city, rough budget.' },
  { emoji: '🤝', title: 'We find the people',   sub: 'Vendors sourced, quoted and checked for your date.' },
  { emoji: '📋', title: 'You approve the plan', sub: 'One proposal, one price. Change anything before you say yes.' },
  { emoji: '🎉', title: 'We run the day',       sub: 'Coordination, delivery, setup — you turn up and celebrate.' },
]
function HowItWorks() {
  return (
    <section className="px-4" aria-labelledby="how-heading">
      <div className="home-glass p-5">
        <h2 id="how-heading" className="text-[15px] font-extrabold text-white">How Sambramo works</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">
          A human-assisted concierge — not a directory you have to phone yourself.
        </p>

        <ol className="relative mt-5 space-y-4">
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-saffron-400/60 via-white/20 to-plum-300/40" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3.5">
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-800 text-lg ring-1 ring-white/15">
                {s.emoji}
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-saffron-400 text-[9px] font-extrabold text-plum-950">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-white">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">{s.sub}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest-300" />
          <p className="text-[11px] leading-relaxed text-white/60">
            Nothing is charged until you approve a plan, and we're live in{' '}
            <span className="font-bold text-white">{BRAND.pilotCities.join(' and ')}</span> today —
            tell us where you are and we'll say honestly whether we can do it.
          </p>
        </div>

        <Link
          to="/plan"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3.5 text-sm font-extrabold text-plum-950 transition-transform active:scale-95"
        >
          {CTA.planAction}
        </Link>
      </div>
    </section>
  )
}

/* ── Support ──────────────────────────────────────────────────────────── */
function SupportStrip() {
  return (
    <section className="px-4">
      <div className="home-glass flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">💬</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-white">Talk to a person</p>
          <p className="text-[11px] text-white/50">Mon–Sat, 9am–8pm. A human, not a bot.</p>
        </div>
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition-transform active:scale-95"
        >
          <MessageCircle size={17} />
        </a>
        <a
          href={`tel:${BRAND.supportPhone}`}
          aria-label="Call support"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition-transform active:scale-95"
        >
          <PhoneCall size={16} />
        </a>
      </div>
    </section>
  )
}

/* ── Search ───────────────────────────────────────────────────────────── */
/**
 * One search box over both halves of the business.
 *
 * Someone typing "birthday" might want a cake delivered tomorrow or a party
 * arranged next month, and the app has no way to know which — so it answers
 * both, labelled, rather than guessing and being wrong half the time. The
 * local matches (occasions, festivals, categories) render instantly; the
 * product query is debounced behind them.
 */
function SearchResults({ query, onClear }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState(null)
  const reqId = useRef(0)
  const needle = query.toLowerCase()

  const occasions = EVENT_TYPES.filter(t => t.label.toLowerCase().includes(needle) || t.tagline?.toLowerCase().includes(needle))
  const festivals = FESTIVALS.filter(f => f.name.toLowerCase().includes(needle))
  const categories = SHOP_CATEGORIES.filter(c => c.label.toLowerCase().includes(needle) || c.tagline?.toLowerCase().includes(needle))

  useEffect(() => {
    const id = ++reqId.current
    setProducts(null)
    const t = setTimeout(() => {
      const term = query.replace(/[%,]/g, ' ')
      supabase.from('products').select('id, name, price, emoji, image_url, category')
        .or(`name.ilike.%${term}%,description.ilike.%${term}%,occasion.ilike.%${term}%`)
        .limit(8)
        .then(({ data }) => { if (id === reqId.current) setProducts(data ?? []) })
    }, 260)
    return () => clearTimeout(t)
  }, [query])

  const nothing =
    occasions.length === 0 && festivals.length === 0 &&
    categories.length === 0 && products !== null && products.length === 0

  if (nothing) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-16 text-center">
        <SearchX size={30} className="mx-auto text-white/25" />
        <p className="mt-3 text-sm font-bold text-white">Nothing matches “{query}”</p>
        <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-white/45">
          Try a shorter word — or just tell us what you're celebrating and we'll
          arrange it, catalogue or not.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link to="/plan" className="rounded-xl bg-saffron-400 px-4 py-2.5 text-xs font-extrabold text-plum-950">
            Plan a celebration
          </Link>
          <button onClick={onClear} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15">
            Clear
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-4">
      {(occasions.length > 0 || festivals.length > 0) && (
        <Group title="Plan this" hint="We arrange the whole thing">
          {occasions.map(t => (
            <Row key={t.id} emoji={t.emoji} label={t.label} sub={t.tagline} onClick={() => navigate(`/plan?type=${t.id}`)} />
          ))}
          {festivals.map(f => (
            <Row key={f.id} emoji={f.emoji} label={f.name} sub={f.month} onClick={() => navigate(`/festivals/${f.id}`)} />
          ))}
        </Group>
      )}

      {categories.length > 0 && (
        <Group title="Browse the shop" hint="Delivered, no planning needed">
          {categories.map(c => (
            <Row key={c.id} emoji={c.emoji} label={c.label} sub={c.tagline}
                 onClick={() => navigate(`/shop/${encodeURIComponent(c.id)}`)} />
          ))}
        </Group>
      )}

      <Group title="Buy this" hint={products === null ? 'Searching…' : `${products.length} item${products.length === 1 ? '' : 's'}`}>
        {products === null
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />)
          : products.map(p => (
              <Row
                key={p.id}
                emoji={p.emoji}
                label={p.name}
                sub={`${p.category} · ${formatINR(p.price)}`}
                onClick={() => navigate(`/shop/product/${p.id}`)}
              />
            ))}
      </Group>
    </div>
  )
}

function Group({ title, hint, children }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-extrabold text-white">{title}</h2>
        <span className="truncate text-[11px] text-white/40">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ emoji, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="home-glass flex w-full items-center gap-3 p-3 text-left transition-transform active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-white">{label}</span>
        {sub && <span className="block truncate text-[11px] text-white/45">{sub}</span>}
      </span>
      <ChevronRight size={15} className="shrink-0 text-white/30" />
    </button>
  )
}
