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
import DateCheckCard from '../components/home/DateCheckCard'
import DateInterestBadge from '../components/home/DateInterestBadge'
import { formatINR } from '../utils/format'
import ProductImage from '../components/shop/ProductImage'
import OffersGrid from '../components/home/OffersGrid'
import StickyCartBar from '../components/shop/StickyCartBar'
import { useCart } from '../context/CartContext'
import HomeAppBar from '../components/home/HomeAppBar'
import LiveEventStrip from '../components/home/LiveEventStrip'
import { fetchCelebrations, isLive } from '../lib/celebrations'
import PromoDeck from '../components/home/PromoDeck'
import BrandFilm from '../components/home/BrandFilm'
import BrandBanner from '../components/home/BrandBanner'
import ServiceMosaic from '../components/home/ServiceMosaic'
import PhotoReelFilm from '../components/home/PhotoReelFilm'
import OccasionCard from '../components/home/OccasionCard'
import TierRail from '../components/home/TierRail'
import ShopPicksRail from '../components/home/ShopPicksRail'

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

/* Active celebrations come from lib/celebrations.js now, which reads BOTH
   `events` and `service_enquiries`. This page used to query `events` alone, so
   a request raised in the celebration builder or the services cart never
   appeared on the customer's own front door. */

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
  const [celebrations, setCelebrations] = useState([])
  const [query, setQuery] = useState('')
  const offers = usePublicOffers()
  const { productCount } = useCart()

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.name?.split(' ')[0] ??
    null

  useEffect(() => {
    if (!user) { setCelebrations([]); return }
    let cancelled = false
    fetchCelebrations(user.id).then(({ celebrations: rows }) => {
      if (!cancelled) setCelebrations(rows)
    })
    return () => { cancelled = true }
  }, [user])

  // Newest five that are neither finished nor cancelled. The slice happens
  // after the merge, so a builder enquiry and a wizard event compete for the
  // same five slots on recency rather than one table always winning.
  const activeEvents = useMemo(
    () => celebrations.filter(isLive).slice(0, 5),
    [celebrations],
  )

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

  /* ── The deck carries what is TIME-SENSITIVE, and nothing else ──────────
     There used to be a permanent "Tell us what's being celebrated / Plan a
     celebration" slide at the front of this deck, and removing it is the
     single biggest fix on this screen.

     It was the second of five identical "Plan a celebration" buttons above
     the fold — the brand band had two doors, this deck had one, the drawn
     film's first beat had one, the mosaic's hero had one, and the signed-out
     tail had one. Repeating a button five times is not emphasis. It teaches
     the eye that this shape is wallpaper, so the one at the bottom — placed
     after the argument has actually been made, which is the moment it is most
     likely to be pressed — is the one that gets skipped.

     Worse, it was a permanent slide in a rotating panel. The whole point of a
     deck is that it shows what is true TODAY: a festival that is nine days
     away, a coupon that expires. "You can plan a celebration" is true every
     day forever, so it was a slide that never told anyone anything new while
     occupying a third of the rotation.

     The planner is not harder to reach for its absence — it is the left-hand
     door in the band directly above, the hero of the mosaic below, and a tab
     in the bar. It has simply stopped being said five times.

     The fallback below matters: with no festival in range and no live coupon
     the deck would render nothing, so it keeps ONE slide rather than leaving a
     hole where the hero was. */
  const slides = [
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
  ].filter(Boolean)

  /* Nothing timely to show — no festival within range, no live coupon. Rather
     than render an empty band where the deck was, fall back to the one thing
     that is always true. This is the ONLY path on which the planner CTA
     appears in the deck, so on any ordinary day it does not. */
  if (slides.length === 0) {
    slides.push({
      key: 'plan',
      eyebrow: 'Concierge',
      title: activeEvents.length > 0 ? 'Planning another one?' : 'Tell us what’s being celebrated',
      body: 'Venue, decor, food, photography — one team arranges all of it and one number answers for it.',
      cta: CTA.planNav,
      to: '/plan',
      art: '🎊',
      background: 'linear-gradient(120deg,#6d28d9 0%,#a21caf 55%,#c026d3 100%)',
    })
  }

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
           empty cart, which reads as a page that failed to finish loading.

           ── The vertical rhythm ─────────────────────────────────────────
           One `space-y-8` used to separate everything, and 32px between every
           pair is not a rhythm — it is the absence of one. On a 390px phone it
           also reads as much more than 32px, because each neighbour is a
           rounded card with its own padding and a soft shadow, so the eye
           measures card-edge to card-edge and sees the gap plus two inner
           margins.

           The page now spaces by *relationship* rather than by default:

             8px    inside a block that is one idea (the hero pair below)
             24px   between two sections that are different ideas
             +8px   only before the closing explanatory tail

           Everything the trim saves is real screen: the occasion grid, which
           is the thing people are here to tap, arrives most of a phone-height
           earlier than it did. */
        <div className={`mx-auto max-w-3xl space-y-6 pt-3 ${productCount > 0 ? 'pb-32' : 'pb-8'}`}>

          {/* ── The name, once, properly ──────────────────────────────
              Nobody has heard of Sambramo yet: there is no rating, no order
              count and no ad recall, so a visitor arriving from a link met a
              search box and a gradient and had no idea whose app this was.

              This is the only section on Home that carries no price, no coupon
              and no live data, which is exactly the cost of putting it first —
              see the component for why that trade is worth making now and why
              it is written to expire once there is recall to trade on. */}
          <BrandBanner />

          {activeEvents.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="px-4 text-[15px] font-extrabold text-ink">
                {firstName ? `${firstName}, here's where things stand` : 'Your celebrations'}
              </h2>
              <LiveEventStrip celebrations={activeEvents} />
            </div>
          )}

          {/* ── The hero pair ─────────────────────────────────────────
              The deck and the film are one unit and are now spaced like
              one: 8px, so they stack as a single above-the-fold block
              instead of two cards floating a full gap apart.

              They were the worst offender for exactly the reason they
              belong together — both are full-bleed rounded panels of
              almost the same height, so a 32px trough between them read
              as two unrelated adverts with dead ground in between rather
              than as "here is what's on" followed by "here is what it's
              for". Adjacent, the film reads as the deck's answer.

              Signed-in customers keep the film lower down the page (see
              below), so this pair only exists when there is no session —
              which is also the only time the film is the argument rather
              than a re-pitch. */}
          {user ? (
            <PromoDeck slides={slides} />
          ) : (
            <div className="space-y-2">
              <PromoDeck slides={slides} />
              <BrandFilm />
            </div>
          )}

          {/* ── Everything we do ──────────────────────────────────────
              The answer to the first question a new visitor actually has,
              which is not "what does a wedding cost" but "what can I even get
              here?". It is a broad answer and it is the product's real
              strength — whole celebrations, single services, cakes, flowers,
              decor, pooja, gifting, and a heritage-crafts shelf nobody else in
              these two cities lists — and a range is shown as a grid rather
              than said in a sentence.

              Placed directly under the hero pair, before the tier rail and the
              date check. Those two are the best things on this page for
              somebody who has already decided to plan a celebration; the
              mosaic is for everybody who hasn't, which on a pre-launch app is
              almost everybody. Fourteen tiles, mixed spans, every one of them a
              real shelf with real photography behind it — see
              config/homeMosaic.js. */}
          <ServiceMosaic />

          {/* ── The same story, in photographs ────────────────────────
              The mosaic above says what the shelves ARE; this says that they
              exist. A drawn hamper is our idea of gifting, and a photograph of
              gold zari on crepe silk is a thing you can buy — a pre-launch
              brand needs both, and the drawn film at the top of the page is the
              other half of this pair.

              Seven beats, each with its own button pointing at its own shelf,
              plus a standing "Everything in the shop" underneath. Deliberately
              placed below the mosaic rather than beside the drawn film: two
              films back to back is one film too many, and this one works as the
              evidence for the grid it follows. See config/homeReel.js. */}
          <PhotoReelFilm />

          {/* ── The six scales of celebration ─────────────────────────
              Replaces PackageRail, which put "Grand Celebration Birthday,
              ₹75,000–₹1,50,000 — Popular" on the front page. That is the third
              screen of a birthday decision shown to someone who has not said
              they are planning a birthday, repeated once per occasion.

              The tiers are the axis customers actually start on: nobody thinks
              "I want the premium package", they think "there'll be about sixty
              people". One rail serves every occasion.

              Moved above the date check. It used to sit fourth, behind the
              deck, the film and the date card, which on a phone put the only
              thing on Home carrying a real scale, a real price and a live
              coupon below the fold — so the page asked for a date before it
              had once said what the thing costs. Sequence now runs the way
              the decision does: what this is (film) → what it costs
              (tiers) → when is it (date). */}
          <TierRail offer={bestOfferFor(50000, offers)} />

          {/* ── Check the date ────────────────────────────────────────
              The date was question two of a six-step form, so the single
              most useful thing an enquiry can carry sat behind a step most
              browsers never reached. Asking here is the fix — but as a
              question, not a month grid: a calendar is something you open,
              not something you live next to on a phone screen. */}
          <DateCheckCard />

          {/* ── The gifting film, for a signed-in customer ────────────
              Everything else on this page argues — a tier, a price, a
              coupon, a countdown. None of it shows what any of it is for.
              The film does, in five beats, and its tap target moves with
              the story: the planner on beat one, a hamper you can send
              tonight by beat five. It carries no section heading, unlike
              everything below it: the panel opens with its own chapter
              label, and a hero that has to be introduced isn't a hero.

              Where it sits depends on who is looking. Signed out it is
              welded to the deck as the hero pair above, because a cold
              visitor has to want the thing before being asked for a date.
              Signed in it waits until after the date check — they have
              already bought the pitch, and pushing their most useful
              control down to re-pitch them would be a straight loss. */}
          {user && <BrandFilm />}

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
              <h2 id="occasions-heading" className="text-[15px] font-extrabold text-ink">
                What are we celebrating?
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-mute">
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

          {/* ── Every offer, four at a time ───────────────────────────
              Was OffersRail, which showed SHOP COUPONS ONLY as a sideways
              drifting strip of 248px tiles. Two faults, one of them
              commercial:

              The four celebration savings — first booking 10%, early bird 7%,
              repeat 15%, the ₹1,000 referral — live in code rather than the
              `coupons` table, so they appeared nowhere on this screen. Those
              are the offers worth thousands of rupees, attached to the half of
              the business the revenue comes from, and Home was advertising
              none of them.

              And a 248px tile on a 390px phone means the second one is always
              cut in half, which reads as an overflow rather than as an
              invitation to swipe.

              A page of four fixes both: everything on screen is whole, one
              glance takes in four offers instead of one and a half, and the
              page swaps rather than slides so nothing moves while it is being
              read. See lib/allOffers for why the two kinds of promise get
              different controls. */}
          <OffersGrid />

          {/* ── Real products, priced, one tap from the front door ──── */}
          <ShopPicksRail />

          {/* ── Festivals, counting down ────────────────────────────── */}
          {upcoming.length > 0 && (
            <section aria-labelledby="festival-heading">
              <div className="px-4">
                <h2 id="festival-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
                  <CalendarHeart size={16} className="text-saffron-600" /> Coming up
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-mute">The calendar, with enough notice to do it properly.</p>
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
                    className="group relative h-36 w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-hairline/10"
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
                      {/* saffron-300, not saffron-700. The 700 is the shade
                          tuned to carry on a white card; on the near-solid
                          plum-950 floor directly above it measures 2.5:1 and
                          the call to action on every festival tile — the
                          only words telling you the tile is tappable — was
                          effectively not printed. */}
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
                      i === festivalRail.active ? 'w-4 bg-saffron-500' : 'w-1 bg-ink/20'
                    }`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── How this works ──────────────────────────────────────
              Signed-out visitors get the full explanation; signed-in
              customers have already been through it and get the support
              strip only.

              `pt-2` on top of the shared 24px is the one place the page
              deliberately opens up again: everything above is something to
              tap, and this is the explanatory tail. The extra breath is
              what marks the end of the shopping and the start of the
              reassurance. */}
          <div className="space-y-6 pt-2">
            {!user && <HowItWorks />}
            <SupportStrip />
          </div>
        </div>
      )}

      {/* ── One occupant of the bottom strip at a time ──────────────────
          Three separate components can float in this band on Home —
          ResumePrompt (App.jsx), StickyCartBar, and DateInterestBadge — and
          all three used to be z-40, in the same place, with no knowledge of
          each other. Which one you could actually read came down to DOM
          order, and with a cart AND an unfinished journey the corner was
          three cards stacked on top of one another.

          The order is by how much the customer has already committed:

            ResumePrompt      they started a celebration and stopped
            StickyCartBar     they have items waiting
            DateInterestBadge an ambient nudge, and the first to yield

          ResumePrompt self-gates to Home, so this file only has to arbitrate
          its own two — and the cart bar's condition is the same `productCount`
          it gates itself on, read here rather than duplicated. */}
      <StickyCartBar />
      {productCount === 0 && <DateInterestBadge />}
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
        <h2 id="how-heading" className="text-[15px] font-extrabold text-ink">How Sambramo works</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
          A human-assisted concierge — not a directory you have to phone yourself.
        </p>

        <ol className="relative mt-5 space-y-4">
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-saffron-400 via-accent/30 to-accent/10" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3.5">
              {/* Was a solid plum-800 disc. On a lit ground that reads as a
                  hole punched in the page; the emoji inside it is the subject
                  and it wants a surface behind it, not a shadow. */}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-lg ring-1 ring-accent/20">
                {s.emoji}
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-saffron-400 text-[9px] font-extrabold text-plum-950">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-ink">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{s.sub}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Raised to a white card rather than sunk further. It is inside a
            glass panel that is already a tint of the ground, and a second
            tint on top of the first is a smudge — the trust line is the one
            thing in this block someone actually needs to read. */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-surface p-3.5 ring-1 ring-hairline/[0.08]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest-600" />
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Nothing is charged until you approve a plan, and we're live in{' '}
            <span className="font-bold text-ink">{BRAND.pilotCities.join(' and ')}</span> today —
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl ring-1 ring-hairline/[0.08]">💬</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-ink">Talk to a person</p>
          <p className="text-[11px] text-ink-mute">Mon–Sat, 9am–8pm. A human, not a bot.</p>
        </div>
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition-transform active:scale-95"
        >
          <MessageCircle size={17} />
        </a>
        <a
          href={`tel:${BRAND.supportPhone}`}
          aria-label="Call support"
          className="tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
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
        <SearchX size={30} className="mx-auto text-ink-mute" />
        <p className="mt-3 text-sm font-bold text-ink">Nothing matches “{query}”</p>
        <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-ink-mute">
          Try a shorter word — or just tell us what you're celebrating and we'll
          arrange it, catalogue or not.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link to="/plan" className="rounded-xl bg-saffron-400 px-4 py-2.5 text-xs font-extrabold text-plum-950">
            Plan a celebration
          </Link>
          <button onClick={onClear} className="rounded-xl bg-surface px-4 py-2.5 text-xs font-bold text-ink ring-1 ring-hairline/10">
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
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-sunk/[0.07]" />)
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
        <h2 className="text-[13px] font-extrabold text-ink">{title}</h2>
        <span className="truncate text-[11px] text-ink-mute">{hint}</span>
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-base ring-1 ring-hairline/[0.08]">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">{label}</span>
        {sub && <span className="block truncate text-[11px] text-ink-mute">{sub}</span>}
      </span>
      <ChevronRight size={15} className="shrink-0 text-ink/40" />
    </button>
  )
}
