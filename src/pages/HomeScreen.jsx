import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Clock, ChevronRight, PhoneCall,
  MessageCircle, SearchX, CalendarHeart, ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BRAND, CTA, EVENT_TYPES } from '../config/sambramo'
import { FESTIVALS } from '../data/festivals'
import { UPCOMING_FESTIVALS } from '../data/eventServicesData'
import { OCCASIONS, CATALOG_STATS } from '../data/planCatalog'
import { ALL_SERVICES } from '../data/servicePricing'
import { allOffers } from '../lib/allOffers'
import { OFFER_BY_ID } from '../data/celebrationOffers'
import { useAutoScrollRail } from '../hooks/useAutoScrollRail'
import OccasionCard from '../components/home/OccasionCard'
import IntroCards from '../components/home/IntroCards'
import DateCheckCard from '../components/home/DateCheckCard'
import DateInterestBadge from '../components/home/DateInterestBadge'
import { formatINR } from '../utils/format'
import RemoteImage from '../components/common/RemoteImage'
import OffersGrid from '../components/home/OffersGrid'
import HomeAppBar from '../components/home/HomeAppBar'
import LiveEventStrip from '../components/home/LiveEventStrip'
import { fetchCelebrations, isLive } from '../lib/celebrations'
import PromoDeck from '../components/home/PromoDeck'
import TierRail from '../components/home/TierRail'

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

/* Every festival goes to its own page, and every one of those pages is a
   locked door that asks whether the customer is waiting for it.

   This forked twice before. First it sent five of the eight into shop
   shelves, because they had no detail page and Gifts was somewhere to put
   them. Then, with the shop gone, it sent those five to the planner — which
   was honest but threw away the reason they tapped: they wanted Diwali, and
   the planner does not know what Diwali is.

   There is no fork now. FestivalDetailPage handles a festival it has content
   for and one it does not identically, because the answer is the same for
   both — we are not open for this yet — and it captures the intent either
   way. See the page for why the question has a NO button. */
function festivalHref(f) {
  return `/festivals/${f.id}`
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
  const offers = allOffers()

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
  // The claimable one leads — an offer that applies itself is not news.
  const bestOffer = offers.find(o => o.action === 'claim') ?? offers[0]

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
      body: 'Decor, catering, priest and photography — arranged before the day arrives.',
      cta: 'Plan this festival',
      to: festivalHref(nextFestival),
      art: nextFestival.emoji,
      background: 'linear-gradient(120deg,#b45309 0%,#d97706 45%,#c62828 100%)',
    },
    bestOffer && {
      key: `offer-${bestOffer.id}`,
      eyebrow: 'Live offer',
      title: `${bestOffer.headline} your celebration`,
      body: `${bestOffer.condition} Quote the code ${bestOffer.code} on your enquiry.`,
      cta: 'Start planning',
      to: bestOffer.to,
      art: '🎁',
      background: 'linear-gradient(120deg,#4c1d95 0%,#6d28d9 50%,#7c3aed 100%)',
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
    <div className="a-canvas min-h-screen pb-bottom-nav">
      <HomeAppBar query={query} onQueryChange={setQuery} />

      {searching ? (
        <SearchResults query={query.trim()} onClear={() => setQuery('')} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4 pt-0 pb-8">

          {activeEvents.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="px-4 text-[15px] font-extrabold text-ink">
                {firstName ? `${firstName}, here's where things stand` : 'Your celebrations'}
              </h2>
              <LiveEventStrip celebrations={activeEvents} />
            </div>
          )}

          {/* ── The hero ──────────────────────────────────────────────
              What is live right now: the festival closest to today, the
              best coupon checkout will honour, the planner. Three slides
              that rotate, all of them time-sensitive — see PromoDeck for
              why nothing permanent is allowed in here.

              The brand film used to be welded underneath it for signed-out
              visitors. It now sits below the catalogue with the rest of
              the story, so this is one panel for everyone. */}
          <PromoDeck slides={slides} />

          {/* ══ COMMERCE, THEN STORY ══════════════════════════════════
              The order below is the one change on this page that is worth
              more than all the styling.

              It used to run: brand banner → quick rail → hero → service
              mosaic → photo film → tier rail → date check → brand film →
              occasion grid → offers → priced products. So a customer had to
              scroll past FOUR editorial panels — two of them full-bleed
              films — before this app showed them a single thing they could
              buy at a stated price. Every storefront that sells anything
              does the opposite, and not for fashion reasons: the panels
              that convert are the ones carrying a price, a discount or a
              date, and on a phone each film costs roughly a screen height
              of everything underneath it.

              Commerce first now — what you are shopping for, what is
              discounted, what you can buy right now — and the story after
              it, for the people still reading. Nothing is deleted; the
              films still do their job, one screen further down, for an
              audience that has already seen the goods. ══════════════ */}

          {/* ── Every celebration we arrange ─────────────────────────
              The whole point of the screen. Fifteen occasions, each its own
              card: four real photographs of that occasion cross-fading, the
              honest entry price, what it includes, and the offer that
              applies — the same OccasionCard the planner uses, so one
              occasion does not look like two different products depending on
              which screen you met it on.

              This used to be a tile grid of names on colour, sitting fourth
              behind a shortcut rail of shop shelves, a promo deck and a
              banner. It is first now, and it is cards rather than tiles,
              because a photographed card with a price on it is the thing a
              customer is here to browse. Two to a row on a phone, which is
              what every catalogue app settled on — three made the
              photographs too small to be evidence of anything. */}
          <section aria-labelledby="occasions-heading">
            <div className="px-5">
              <h2 id="occasions-heading" className="text-[19px] font-extrabold tracking-tight text-ink">
                What are we celebrating?
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-mute">
                {CATALOG_STATS.occasions} occasions, arranged end to end — every price real.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-3.5 px-4">
              {OCCASIONS.map((o, i) => (
                <OccasionCard
                  key={o.id}
                  occasion={o}
                  stagger={i * 260}
                />
              ))}
            </div>
          </section>

          {/* ── What this app is ─────────────────────────────────────
              Under the grid rather than above it. A first-time visitor
              scrolls the merchandise first whatever the page says, so the
              explanation sits where they arrive after it has raised the
              question. */}
          <IntroCards />

          {/* ── Every offer, four at a time ───────────────────────────
              Moved up with the rest of commerce. The four celebration
              savings live in code rather than the `coupons` table, so
              before OffersGrid existed they appeared nowhere on this
              screen at all — those are the offers worth thousands of
              rupees, on the half of the business the revenue comes from.
              See lib/allOffers for why the two kinds of promise get
              different controls. */}
          <OffersGrid />

          {/* ── The six scales of celebration ─────────────────────────
              The tiers are the axis customers actually start on: nobody
              thinks "I want the premium package", they think "there'll be
              about sixty people". One rail serves every occasion, and it
              carries a real scale, a real price and a live coupon. */}
          <TierRail offer={OFFER_BY_ID.first_booking} />

          {/* ── Check the date ────────────────────────────────────────
              The date was question two of a six-step form, so the single
              most useful thing an enquiry can carry sat behind a step most
              browsers never reached. Asking here is the fix — but as a
              question, not a month grid: a calendar is something you open,
              not something you live next to on a phone screen. */}
          <DateCheckCard />

          {/* ══ THE STORY ═════════════════════════════════════════════
              Everything below carries no price and no date. It is the
              argument for the brand rather than the catalogue, and it now
              runs after the catalogue rather than in front of it. ══ */}


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
                    <RemoteImage
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
                        Tell us you want it
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

      {/* ── The bottom strip ────────────────────────────────────────
          Three components used to float in this band — ResumePrompt
          (App.jsx), StickyCartBar and DateInterestBadge — all at z-40, in the
          same place, with no knowledge of each other. Which one you could
          actually read came down to DOM order.

          The cart bar left with the shop, so the arbitration is gone too:
          ResumePrompt self-gates to Home, and the badge is the only other
          occupant. It no longer waits for an empty cart, because there is no
          cart on this screen to be full. */}
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
      <div className="a-card p-5">
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
        <div className="a-well mt-5 flex items-start gap-2.5 p-4">
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
      <div className="a-card flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.05] text-xl">💬</span>
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
          className="tap-48 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink transition-transform active:scale-95"
        >
          <PhoneCall size={16} />
        </a>
      </div>
    </section>
  )
}

/* ── Search ───────────────────────────────────────────────────────────── */
/**
 * One search box over everything we arrange.
 *
 * This used to answer for both halves of the business — a debounced `products`
 * query alongside the local matches, because somebody typing "birthday" might
 * have wanted a cake tomorrow or a party next month.
 *
 * With the shop gone the obvious move is to delete the query and keep the
 * local lists, and that would have been a mistake: it leaves a search box on
 * the front door matching eleven occasions and eight festivals, so "catering",
 * "photographer", "mehendi" and "mandap" all return nothing. A search that
 * finds nothing is worse than no search.
 *
 * So it searches the services too. They are local — SERVICE_GROUPS is what the
 * quote engine itself prices from — which means no query, no debounce, no
 * loading state and no dependency on a migration having been applied.
 */
function SearchResults({ query, onClear }) {
  const navigate = useNavigate()
  const needle = query.toLowerCase()

  const occasions = EVENT_TYPES.filter(t => t.label.toLowerCase().includes(needle) || t.tagline?.toLowerCase().includes(needle))
  const festivals = FESTIVALS.filter(f => f.name.toLowerCase().includes(needle))
  const services = ALL_SERVICES.filter(
    v => v.name.toLowerCase().includes(needle) || v.desc?.toLowerCase().includes(needle),
  ).slice(0, 8)


  const nothing =
    occasions.length === 0 && festivals.length === 0 && services.length === 0

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
          <button onClick={onClear} className="a-chip">
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

      {services.length > 0 && (
        <Group title="Book just this one thing" hint="No whole celebration required">
          {services.map(v => (
            <Row key={v.id} emoji={v.emoji} label={v.name} sub={v.desc}
                 onClick={() => navigate(`/service/${v.id}`)} />
          ))}
        </Group>
      )}

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
      className="a-card flex w-full items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.05] text-base">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">{label}</span>
        {sub && <span className="block truncate text-[11px] text-ink-mute">{sub}</span>}
      </span>
      <ChevronRight size={15} className="shrink-0 text-ink/40" />
    </button>
  )
}
