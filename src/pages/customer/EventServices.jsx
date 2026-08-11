import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, ShoppingCart, Sparkles, Users, Pencil, LayoutGrid, Package,
  Search, ChevronRight, MapPin, ShieldCheck, X,
} from 'lucide-react'
import { EVENT_DATA } from '../../data/eventServicesData'
import { toWizardType } from '../../data/occasionMap'
import { tiersForOccasion, profileFor, tierAsPackage, BESPOKE_TIER } from '../../data/occasionPackages'
import { tierForGuests } from '../../data/celebrationTiers'
import { occasionThemeVars } from '../../config/occasionTheme'
import { formatINR } from '../../utils/format'
import BookingDetailsModal from '../../components/customer/BookingDetailsModal'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import ReviewModal from '../../components/reviews/ReviewModal'
import { EventDecorSamples } from '../../components/landing/DecorSampleGallery'
import ServiceOptionCard from '../../components/event/ServiceOptionCard'
import TierPackageCard from '../../components/event/TierPackageCard'
import EventFooter from '../../components/layout/EventFooter'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useCity } from '../../context/CityContext'
import { supabase } from '../../lib/supabase'

/**
 * One occasion — everything we can do for it, and what it costs.
 *
 * ── What this page was, and why it is not that any more ─────────────────
 * It was the generic catalogue page wearing an occasion's name. Four faults,
 * all reported from the live site after tapping "Birthday" on the home screen:
 *
 *   · It arrived wrapped in the marketing site: the navbar, a "Pilot —
 *     Bengaluru — somewhere else? [notify me]" bar, a "Back to Home" link, and
 *     a 400px sitemap footer offering cakes and pooja samagri. A visitor who
 *     had just said "I am planning a birthday" was invited to register
 *     interest in a different city. That chrome is gone; the page draws its
 *     own, exactly as home, /shop and /plan already do.
 *
 *   · It opened on "24 services available · 5 ready packages · Sambramo
 *     organizes everything" — three facts about the catalogue, none about the
 *     birthday. It opens on the occasion now: its own colour, its own
 *     photographs, its own promise, and a guest-count control, because the
 *     headcount is the one number that decides everything below it.
 *
 *   · The services tab was a list of rows with an Add button. A row cannot
 *     express a caterer. Every service opens now — see ServiceOptionCard.
 *
 *   · The packages tab sold "Essential Birthday" and "Grand Celebration",
 *     hand-written flat ranges from before the tier ladder existed, plus two
 *     gift hampers that belong in the shop. They are deleted. An occasion's
 *     packages are the eight scales, priced for this occasion through the same
 *     engine the builder uses — see data/occasionPackages.js.
 *
 * Everything here is generic over EVENT_DATA, so all fifteen occasions get it.
 * Nothing on this page is birthday-specific in code; it is birthday-specific in
 * data, which is the only way fifteen pages stay in step.
 */

// Where a guest's pending add waits while they sign in. Session scoped: one
// visit's intent, not a standing order.
const CART_INTENT_KEY = 'sambramo_cart_intent'

/** The headcount the page opens on before anyone has said anything. */
const DEFAULT_GUESTS = 120

export default function EventServices() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { city, openCityPicker, servable, chosen } = useCity()
  const { cart, dispatch, hasItem, hasPkg, totalCount, getEventDetails } = useCart()

  const event = EVENT_DATA[eventId]

  // `?tab=services` opens straight on the service list. Worth honouring rather
  // than always landing on the ladder: somebody who was sent a link because
  // they wanted a cook for Sunday should not have to dismiss eight wedding-
  // sized packages first.
  const [activeTab, setActiveTab] = useState(
    () => (new URLSearchParams(location.search).get('tab') === 'services' ? 'services' : 'packages')
  ) // 'packages' | 'services'
  const [guestCount, setGuestCount] = useState(DEFAULT_GUESTS)
  const [tierTouched, setTierTouched] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [query, setQuery]           = useState('')
  const [pendingAdd, setPendingAdd] = useState(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [reviewing, setReviewing]   = useState(null)
  const [eligible, setEligible]     = useState({})

  const profile = useMemo(() => profileFor(eventId), [eventId])
  const tiers   = useMemo(() => (event ? tiersForOccasion(eventId) : []), [event, eventId])
  const suggestedTierId = useMemo(() => tierForGuests(guestCount)?.id ?? null, [guestCount])

  // The guest count picks the scale until the customer overrides it, and then
  // it stops. Somebody who deliberately chose Close Circle for ninety guests
  // because they want a small setup at a big function should not have that
  // undone by typing one more digit into the field.
  useEffect(() => {
    if (tierTouched) return
    if (suggestedTierId && suggestedTierId !== BESPOKE_TIER.id) setSelectedTier(suggestedTierId)
  }, [suggestedTierId, tierTouched])

  /**
   * The one place anything reaches the cart from this page.
   *
   * Both entry points funnel through here so the signed-out check lives in a
   * single spot — this page is public, and a guard duplicated across two
   * handlers is a guard that will eventually disagree with itself.
   */
  const commitAdd = useCallback((kind, payload, details) => {
    // The prompt fires here rather than on the button, deliberately: by this
    // point the visitor has given us the date and the venue, so it reads as
    // "sign in to save this" rather than "prove who you are before you may
    // look". Same reasoning as the wizard, which asks at submit.
    if (!user) {
      try {
        sessionStorage.setItem(CART_INTENT_KEY, JSON.stringify({ eventId, kind, payload, details }))
      } catch {
        // Storage unavailable — signing in still works, the item just is not
        // recoverable. Not worth blocking the journey over.
      }
      navigate('/login', {
        state: { from: { pathname: location.pathname, search: location.search } },
      })
      return
    }

    if (kind === 'service') {
      dispatch({ type: 'ADD_SERVICE', eventId, eventName: event.name, service: payload, details })
    } else {
      dispatch({ type: 'ADD_PACKAGE', eventId, eventName: event.name, pkg: payload, details })
    }
    // The complimentary-hamper auto-attach that used to live here is gone with
    // the hampers themselves: a gift box is a shop product, and attaching one
    // to a celebration enquiry that has no checkout only ever produced a line
    // item nobody could pay for or remove.
  }, [user, eventId, event, dispatch, navigate, location])

  // Booking details are asked once per event. getEventDetails(eventId) is
  // non-null the moment this event's first item has them, so it doubles as
  // "has this event been set up" without a separate tracked flag.
  function handleAdd(kind, payload) {
    const existing = getEventDetails(eventId)
    if (!existing) { setPendingAdd({ kind, payload }); return }
    commitAdd(kind, payload, existing)
  }

  function confirmAdd(details) {
    if (!pendingAdd) return
    commitAdd(pendingAdd.kind, pendingAdd.payload, details)
    setPendingAdd(null)
  }

  // Finish what a guest started, once they come back signed in. Guarded on the
  // event id because the intent is keyed to this page: signing in from
  // somewhere else should not drop a stranger's item into this cart.
  useEffect(() => {
    if (!user || !event) return
    let intent
    try {
      const raw = sessionStorage.getItem(CART_INTENT_KEY)
      if (!raw) return
      intent = JSON.parse(raw)
      sessionStorage.removeItem(CART_INTENT_KEY)
    } catch {
      return
    }
    if (intent?.eventId !== eventId) return
    commitAdd(intent.kind, intent.payload, intent.details)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId, event])

  function handleUpdateDetails(details) {
    ;[...cart.items, ...cart.packages]
      .filter(i => i.eventId === eventId)
      .forEach(i => dispatch({ type: 'SET_ITEM_DETAILS', key: i.key, details }))
    setEditingDetails(false)
  }

  // Can this customer review a given service or scale right now? — they need a
  // closed enquiry that included it, not yet reviewed.
  const checkEligibility = useCallback(async () => {
    if (!user) { setEligible({}); return }
    const [{ data: enquiries }, { data: myReviews }] = await Promise.all([
      supabase.from('service_enquiries').select('id, services, packages').eq('customer_id', user.id).eq('status', 'closed'),
      supabase.from('reviews_catalog').select('subject_type, subject_id').eq('customer_id', user.id).in('subject_type', ['service', 'package']),
    ])
    const map = {}
    for (const enq of enquiries ?? []) {
      for (const svc of enq.services ?? []) map[`service__${svc.id}`] = enq.id
      for (const pkg of enq.packages ?? []) map[`package__${pkg.id}`] = enq.id
    }
    for (const r of myReviews ?? []) delete map[`${r.subject_type}__${r.subject_id}`]
    setEligible(map)
  }, [user])

  useEffect(() => { checkEligibility() }, [checkEligibility])

  // Restart the page when the occasion changes under it — the footer links
  // between occasions, and carrying a birthday's open tab and guest count into
  // a griha pravesh would be quietly wrong.
  useEffect(() => {
    setQuery('')
    setTierTouched(false)
    setGuestCount(DEFAULT_GUESTS)
  }, [eventId])

  if (!event) {
    return (
      <div className="event-canvas flex min-h-screen items-center justify-center px-4">
        <div className="event-glass max-w-sm p-8 text-center">
          <div className="mb-3 text-5xl">🤔</div>
          <h2 className="text-lg font-extrabold text-white">We do not have a page for that yet</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
            The occasion in the address does not match anything in the catalogue.
          </p>
          <Link
            to="/services"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-saffron-400 px-4 py-2.5 text-[13px] font-extrabold text-plum-950"
          >
            Browse every occasion <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  const themeVars = occasionThemeVars(eventId)
  const details   = getEventDetails(eventId)

  // Services, grouped the way they are shopped for, and filtered by the search.
  const needle = query.trim().toLowerCase()
  const matching = needle
    ? event.services.filter(s =>
        s.name.toLowerCase().includes(needle) ||
        s.desc.toLowerCase().includes(needle) ||
        s.category.toLowerCase().includes(needle))
    : event.services

  const byCategory = matching.reduce((acc, svc) => {
    (acc[svc.category] ??= []).push(svc)
    return acc
  }, {})
  const categories = Object.keys(byCategory)

  const feedbackSubjects = [
    ...event.services.map(s => ({ type: 'service', id: s.id, name: s.name })),
    ...tiers.map(t => ({ type: 'package', id: t.id, name: t.name })),
  ]

  const entryPrice = tiers.length ? Math.min(...tiers.map(t => t.from).filter(Number.isFinite)) : null

  return (
    <div className="event-canvas min-h-screen pb-bottom-nav" style={themeVars}>

      {/* ── The page's own bar ──────────────────────────────────
          Replaces the marketing navbar, the pilot-city notify bar and the
          "Back to Home" link that used to stack above this page. One exit,
          the occasion's name, the city and the cart. */}
      <header className="event-appbar sticky top-0 z-30 pt-safe">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
          <button
            onClick={() => navigate('/services')}
            aria-label="All occasions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition-transform active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold leading-tight text-white">
              {event.emoji} {event.name}
            </p>
            <button
              onClick={openCityPicker}
              className="flex items-center gap-1 text-[10.5px] text-white/55 transition-colors hover:text-white"
            >
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{chosen ? city : 'Set your city'}</span>
              {chosen && !servable && <span className="text-amber-300">· not live yet</span>}
            </button>
          </div>

          {user && (
            <button
              onClick={() => navigate('/dashboard/customer/cart')}
              aria-label="Your enquiry cart"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition-transform active:scale-95"
            >
              <ShoppingCart size={16} />
              {totalCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">

        {/* ── The occasion, as itself ───────────────────────── */}
        <section className="pt-5">
          <div className="rise-in">
            <p
              className="text-[10px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: 'var(--event-glow)' }}
            >
              {event.tagline}
            </p>
            <h1 className="mt-1.5 font-serif text-[30px] font-bold leading-[1.1] text-white sm:text-[36px]">
              {event.name}
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60">
              {profile.promise}
            </p>
          </div>

          {/* Three facts about this celebration, not about the catalogue.
              The old strip said "24 services available · 5 ready packages ·
              Sambramo organizes everything", which is a description of a
              database. */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Fact
              label="Scales to pick from"
              value={String(tiers.length)}
              sub={`${tiers[0]?.guests.min ?? 10}–${tiers[tiers.length - 1]?.guests.max ?? 3500} guests`}
              delay={60}
            />
            <Fact
              label="Starting at"
              value={Number.isFinite(entryPrice) ? formatINR(entryPrice) : '—'}
              sub="incl. taxes, all in"
              delay={120}
            />
            <Fact
              label="Services we arrange"
              value={String(event.services.length)}
              sub="each one bookable alone"
              delay={180}
            />
          </div>

          {/* The three things somebody planning this occasion is picturing. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.signature.map((s, i) => (
              <span
                key={s}
                className="rise-in inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11.5px] font-semibold text-white/75 ring-1 ring-white/10"
                style={{ '--rise-delay': `${220 + i * 70}ms` }}
              >
                <Sparkles size={10} style={{ color: 'var(--event-glow)' }} />
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* ── The one number that decides everything below ──── */}
        <section className="event-glass rise-in mt-5 p-4" style={{ '--rise-delay': '260ms' }}>
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: 'var(--event-glow)' }} />
            <p className="text-[13px] font-extrabold text-white">How many people are coming?</p>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
            A rough number is enough. It is the single thing that moves the price most, and every
            figure on this page recalculates as you change it.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={guestCount || ''}
              onChange={e => setGuestCount(Math.max(0, Number(e.target.value) || 0))}
              aria-label="Expected guest count"
              className="w-24 rounded-xl bg-white/10 px-3 py-2 text-[15px] font-extrabold text-white ring-1 ring-white/15 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--event-glow)' }}
            />
            <div className="flex flex-wrap gap-1.5">
              {[25, 60, 120, 220, 450, 800].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setGuestCount(n); setTierTouched(false) }}
                  className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-extrabold transition-colors ${
                    guestCount === n
                      ? 'text-gray-900'
                      : 'bg-white/10 text-white/70 ring-1 ring-white/10 hover:bg-white/20'
                  }`}
                  style={guestCount === n ? { background: 'var(--event-glow)' } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {suggestedTierId && (
            <p className="mt-2.5 text-[11px] text-white/55">
              {guestCount} guests puts you in{' '}
              <strong className="font-extrabold text-white">
                {tiers.find(t => t.id === suggestedTierId)?.name ?? BESPOKE_TIER.name}
              </strong>
              {tierTouched && selectedTier !== suggestedTierId && (
                <>
                  {' '}— you have chosen{' '}
                  <strong className="font-extrabold text-white">
                    {tiers.find(t => t.id === selectedTier)?.name}
                  </strong>{' '}
                  instead, which is fine.
                </>
              )}
            </p>
          )}
        </section>

        {/* ── See it before you book it ──────────────────────
            "What does it look like" is the question people ask before "what
            is in it", and the tabs below answer only the second one. */}
        <section className="rise-in mt-6" style={{ '--rise-delay': '300ms' }}>
          <div className="event-glass overflow-hidden p-4">
            {/* EventDecorSamples was written for a white page, so its own
                heading and caption are near-black. Recoloured by direct-child
                selector rather than a descendant one: `[&_h2]` would also
                repaint the text inside the sample cards, which are white
                tiles, and white-on-white is worse than dark-on-dark. */}
            <EventDecorSamples
              eventId={eventId}
              className="[&>div>h2]:text-white [&>p]:text-white/55"
            />
          </div>
        </section>
      </div>

      {/* ── The two doors ───────────────────────────────────── */}
      {/* Sticks directly under the app bar, which is 56px tall (a 36px control
          plus its 10px padding either side). */}
      <div className="sticky top-[56px] z-20 mt-6 border-y border-white/10 bg-[#180529]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-1 px-4 py-2">
          <TabButton
            active={activeTab === 'packages'}
            onClick={() => setActiveTab('packages')}
            icon={Package}
            label="Complete celebrations"
            sub={`${tiers.length} scales`}
          />
          <TabButton
            active={activeTab === 'services'}
            onClick={() => setActiveTab('services')}
            icon={LayoutGrid}
            label="Individual services"
            sub={`${event.services.length} to choose from`}
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-5">

        {details && (
          <button
            onClick={() => setEditingDetails(true)}
            className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-white/45 hover:text-white"
          >
            <Pencil size={11} /> Change the date, time or venue for this celebration
          </button>
        )}

        {/* ══ COMPLETE CELEBRATIONS ═══════════════════════════ */}
        {activeTab === 'packages' && (
          <div className="space-y-3">
            <div className="event-glass p-4">
              <p className="text-[12.5px] leading-relaxed text-white/70">
                Every one of these is the <strong className="font-extrabold text-white">whole celebration</strong> —
                food, decor, coordination and the services this occasion needs — arranged by one team
                for one price. They are named for the size of the gathering, never for a budget, and the
                only difference between them is how many people are in the room.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                Prices are estimates for{' '}
                <button
                  onClick={openCityPicker}
                  className="font-bold underline decoration-white/30 underline-offset-2 hover:text-white"
                >
                  {city}
                </button>
                , computed for {profile.vegOnly ? 'a pure-veg' : 'a mixed'}{' '}
                {tiers[0]?.cuisine?.name ?? 'traditional'} spread. Your final number is confirmed once we
                know your date and venue — and you approve it before anything is booked.
              </p>
            </div>

            {tiers.map((tier, i) => (
              <TierPackageCard
                key={tier.id}
                tier={tier}
                eventId={eventId}
                index={i}
                selected={selectedTier === tier.id}
                suggested={suggestedTierId === tier.id}
                onSelect={() => { setSelectedTier(tier.id); setTierTouched(true); setGuestCount(tier.typicalGuests) }}
                inCart={hasPkg(eventId, tier.id)}
                onAdd={() => handleAdd('package', tierAsPackage(tier))}
                reviewEnquiryId={eligible[`package__${tier.id}`]}
                onReview={() => setReviewing({
                  subject: { type: 'package', id: tier.id, name: tier.name },
                  source: { enquiryId: eligible[`package__${tier.id}`] },
                })}
              />
            ))}

            {/* The honest exit past the top rung. No price, on purpose. */}
            <div className="event-glass p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{BESPOKE_TIER.emoji}</span>
                <h3 className="text-[16px] font-extrabold text-white">{BESPOKE_TIER.name}</h3>
                <span className="text-[11px] font-medium italic text-white/40">{BESPOKE_TIER.localName}</span>
              </div>
              <p className="mt-1 text-[12.5px] font-semibold text-white/75">{BESPOKE_TIER.tagline}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">{BESPOKE_TIER.description}</p>
              <Link
                to={`/plan/custom?type=${toWizardType(eventId)}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold"
                style={{ color: 'var(--event-glow)' }}
              >
                <Sparkles size={13} /> Tell us about it instead <ChevronRight size={13} />
              </Link>
            </div>

            <div className="event-glass p-5 text-center">
              <p className="text-[13px] font-extrabold text-white">Want only one piece of it?</p>
              <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-white/50">
                Book just the catering, just the decor, just the photographer — every service is
                available on its own, with all of its options.
              </p>
              <button
                onClick={() => setActiveTab('services')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold text-gray-900 transition-transform active:scale-95"
                style={{ background: 'var(--event-glow)' }}
              >
                Browse the {event.services.length} services <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ══ INDIVIDUAL SERVICES ═════════════════════════════ */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="event-glass p-4">
              <p className="text-[12.5px] leading-relaxed text-white/70">
                Every service opens. Tap one and you get what is actually inside it — the cuisines
                and every dish under them, the decor levels and what each installs, what a
                photographer hands back — priced at your{' '}
                <strong className="font-extrabold text-white">{guestCount} guests</strong>.
              </p>
            </div>

            {/* Twenty-four services is a lot to scroll past to reach the one
                you came for. */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find a service — cook, decor, photographer…"
                aria-label="Search services"
                className="w-full rounded-2xl bg-white/[0.07] py-2.5 pl-9 pr-9 text-[13px] text-white ring-1 ring-white/10 placeholder:text-white/35 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--event-glow)' }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {categories.length === 0 ? (
              <div className="event-glass p-8 text-center">
                <p className="text-[13px] font-bold text-white">Nothing here matches “{query}”</p>
                <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-white/50">
                  Try a shorter word — or ask us anyway. Plenty of what we arrange never made it
                  onto a list.
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-[12px] font-bold text-white ring-1 ring-white/15"
                >
                  Show all {event.services.length}
                </button>
              </div>
            ) : (
              categories.map(cat => (
                <section key={cat} aria-labelledby={`cat-${cat}`}>
                  <h2
                    id={`cat-${cat}`}
                    className="mb-2 flex items-baseline gap-2 px-1 text-[13px] font-extrabold text-white"
                  >
                    {cat}
                    <span className="text-[11px] font-medium text-white/35">
                      {byCategory[cat].length} service{byCategory[cat].length > 1 ? 's' : ''}
                    </span>
                  </h2>
                  <div className="space-y-2.5">
                    {byCategory[cat].map((svc, i) => (
                      <ServiceOptionCard
                        key={svc.id}
                        service={svc}
                        eventId={eventId}
                        guestCount={guestCount || DEFAULT_GUESTS}
                        vegOnly={profile.vegOnly}
                        index={i}
                        inCart={hasItem(eventId, svc.id)}
                        onAdd={() => handleAdd('service', svc)}
                        reviewEnquiryId={eligible[`service__${svc.id}`]}
                        onReview={() => setReviewing({
                          subject: { type: 'service', id: svc.id, name: svc.name },
                          source: { enquiryId: eligible[`service__${svc.id}`] },
                        })}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}

            <div className="event-glass flex items-start gap-2.5 p-4">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <p className="text-[11.5px] leading-relaxed text-white/55">
                Adding a service here starts an <strong className="font-bold text-white">enquiry</strong>,
                not an order. A coordinator prices it against your date and venue and comes back to
                you. Nothing is charged and no vendor is held until you approve it.
              </p>
            </div>
          </div>
        )}

        {/* ── What customers say ─────────────────────────────── */}
        {/* Left in its own white panel on purpose. It is somebody else's words
            about us, and a white card on the dark ground is what makes it read
            as quoted rather than as more of our own copy. */}
        <div className="mt-8">
          <ReviewsScroller
            subjects={feedbackSubjects}
            title={`What customers say about ${event.name}`}
          />
        </div>
      </div>

      <EventFooter eventId={eventId} />

      {/* The cart bar, only once there is something in it. */}
      {user && totalCount > 0 && (
        <div className="above-bottom-nav pointer-events-none sticky z-30 flex justify-center px-4 pb-3">
          <button
            onClick={() => navigate('/dashboard/customer/cart')}
            className="pointer-events-auto flex items-center gap-2 rounded-2xl px-6 py-3 text-[14px] font-extrabold text-gray-900 shadow-2xl transition-transform active:scale-95"
            style={{ background: 'var(--event-glow)' }}
          >
            <ShoppingCart size={17} />
            Review your enquiry ({totalCount})
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {pendingAdd && (
        <BookingDetailsModal
          itemLabel={pendingAdd.payload.name}
          defaults={details}
          onConfirm={confirmAdd}
          onClose={() => setPendingAdd(null)}
        />
      )}

      {editingDetails && (
        <BookingDetailsModal
          itemLabel={event.name}
          defaults={details}
          onConfirm={handleUpdateDetails}
          onClose={() => setEditingDetails(false)}
        />
      )}

      {reviewing && (
        <ReviewModal
          subject={reviewing.subject}
          source={reviewing.source}
          onClose={() => setReviewing(null)}
          onSubmitted={checkEligibility}
        />
      )}
    </div>
  )
}

/* ── Small pieces ─────────────────────────────────────────────────────── */

function Fact({ label, value, sub, delay = 0 }) {
  return (
    <div className="event-glass rise-in p-3" style={{ '--rise-delay': `${delay}ms` }}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 text-[17px] font-extrabold leading-tight text-white">{value}</p>
      <p className="text-[9.5px] leading-tight text-white/40">{sub}</p>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
        active ? 'text-gray-900' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
      style={active ? { background: 'var(--event-glow)' } : undefined}
    >
      <Icon size={15} className="shrink-0" />
      <span className="min-w-0 text-left">
        <span className="block truncate text-[12.5px] font-extrabold leading-tight">{label}</span>
        <span className={`block truncate text-[10px] leading-tight ${active ? 'text-gray-900/60' : 'text-white/35'}`}>
          {sub}
        </span>
      </span>
    </button>
  )
}
