import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, ShoppingCart, Sparkles, Pencil, LayoutGrid, Package,
  Search, ChevronRight, MapPin, ShieldCheck, X,
} from 'lucide-react'
import { EVENT_DATA } from '../../data/eventServicesData'
import { toWizardType } from '../../data/occasionMap'
import {
  tiersForOccasion, profileFor, tierAsPackage, quoteForOccasion, BESPOKE_TIER,
} from '../../data/occasionPackages'
import { tierForGuests } from '../../data/celebrationTiers'
import { occasionThemeVars } from '../../config/occasionTheme'
import BookingDetailsModal from '../../components/customer/BookingDetailsModal'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import ReviewModal from '../../components/reviews/ReviewModal'
import DecorCatalog from '../../components/event/DecorCatalog'
import { decorAsService } from '../../data/decorCatalog'
import ServiceOptionCard from '../../components/event/ServiceOptionCard'
import TierPackageCard from '../../components/event/TierPackageCard'
import OccasionPulse from '../../components/event/OccasionPulse'
import GuestScaleDial from '../../components/event/GuestScaleDial'
import ScaleVerdict from '../../components/event/ScaleVerdict'
import TwoDoors from '../../components/event/TwoDoors'
import TierMatchDialog from '../../components/plan/TierMatchDialog'
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
 * ── The second pass: it had stopped being static and started being dead ──
 * The redesign above fixed what the page *said*. It did not fix that, having
 * said it, the page then sat there. Four things followed from that:
 *
 *   · The header's three tiles — eight scales, "starting at ₹26,750", a
 *     service count — were constants. They were the same figures for a
 *     customer planning for twenty people and one planning for two thousand,
 *     which means they answered neither. They are now one live block that
 *     reprices against the headcount through the same buildQuote() the builder
 *     runs. See OccasionPulse.
 *
 *   · The three signature moments cost two or three wrapped rows to say three
 *     things. They now share one rotating line with everything else the header
 *     wants to claim — eight facts in the height of one.
 *
 *   · The guest control told you your scale in a grey sentence, referring to
 *     one of eight cards you had not scrolled to yet. The ladder is drawn now,
 *     with your rung lit and every rung tappable, and crossing a boundary
 *     opens TierMatchDialog — the same "this is your circle, here is what
 *     comes with it, here is the way on" the builder uses. It fires on
 *     deliberate acts only, never between "2" and "220".
 *
 *   · Complete-celebration versus individual-service is the decision this page
 *     exists to put in front of somebody, and it was a 56px tab strip three
 *     screens down. It is now stated at the front as two offers, the primary
 *     one carrying the live estimate. See TwoDoors. The sticky strip survives
 *     as a switch for when you are deep in a list.
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

/** Run once the state change that preceded it has been committed and painted. */
function afterPaint(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

export default function EventServices() {
  const barRef = useRef(null)
  // See the header below: publishes --event-appbar-h for the sticky rows.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty(
      '--event-appbar-h', `${el.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

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
  // Seeded from the default headcount rather than left null for the effect
  // below to fill in. Null meant the header rendered "tell us the headcount"
  // for one frame before the estimate replaced it — a flash of the empty
  // state on a page that already knows the answer.
  const [selectedTier, setSelectedTier] = useState(() => tierForGuests(DEFAULT_GUESTS)?.id ?? null)
  const [tierPrompt, setTierPrompt]  = useState(null)
  const [query, setQuery]           = useState('')
  const [pendingAdd, setPendingAdd] = useState(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [reviewing, setReviewing]   = useState(null)
  const [eligible, setEligible]     = useState({})

  // Where "see the scales" and "browse the services" actually land. Without
  // it, choosing a door from the top of the page swaps content two screens
  // below the viewport and looks like nothing happened.
  const contentRef = useRef(null)

  const profile = useMemo(() => profileFor(eventId), [eventId])
  const tiers   = useMemo(() => (event ? tiersForOccasion(eventId) : []), [event, eventId])
  const suggestedTierId = useMemo(() => tierForGuests(guestCount)?.id ?? null, [guestCount])
  const bespoke = suggestedTierId === BESPOKE_TIER.id

  // The guest count picks the scale until the customer overrides it, and then
  // it stops. Somebody who deliberately chose Close Circle for ninety guests
  // because they want a small setup at a big function should not have that
  // undone by typing one more digit into the field.
  useEffect(() => {
    if (tierTouched) return
    if (suggestedTierId && suggestedTierId !== BESPOKE_TIER.id) setSelectedTier(suggestedTierId)
  }, [suggestedTierId, tierTouched])

  /** The rung the header, the doors and the dialog are all talking about. */
  const activeTier = useMemo(
    () => tiers.find(t => t.id === selectedTier) ?? null,
    [tiers, selectedTier]
  )

  /**
   * The estimate, at the headcount actually typed.
   *
   * The priced ladder quotes each rung at its own typical count, which is the
   * only thing a card can do before the customer has said anything. Once they
   * have, quoting them the typical is quoting somebody else's event — so the
   * header and the primary door reprice against the real number. Memoised on
   * the three inputs because this is a full buildQuote() pass and the guest
   * field re-renders the page on every keystroke.
   */
  const liveQuote = useMemo(
    () => (activeTier && !bespoke ? quoteForOccasion(eventId, activeTier.id, guestCount) : null),
    [eventId, activeTier, guestCount, bespoke]
  )

  /**
   * A deliberate act on the guest control — released slider, stepper, blur, or
   * a tapped rung.
   *
   * The dialog fires only when the scale actually moves, or when a rung was
   * tapped by name. Stepping 120 → 145 → 170 stays inside The Full Celebration
   * and says nothing; crossing 150 changes what is on the plate, what decor
   * comes as standard and which services are pre-ticked, and a change of that
   * size made on the customer's behalf has to be stated rather than inferred
   * from a highlight moving in a list they have not scrolled to. Same rule the
   * builder follows — see TierMatchDialog.
   */
  const commitGuests = useCallback((next, explicitTierId) => {
    const n = Math.max(0, Math.round(next) || 0)
    setGuestCount(n)
    // Only a rung tapped BY NAME opens the dialog now. Crossing a boundary
    // used to open it too, which was the old answer to "the page picked my
    // scale silently" — but it fires mid-decision, covers the ladder being
    // read, and by the third one it is dismissed unread. ScaleVerdict states
    // the same thing permanently, in words, under the control that caused it,
    // so there is no longer a silence for a modal to fill.
    if (!explicitTierId || explicitTierId === BESPOKE_TIER.id) { setTierPrompt(null); return }
    setTierPrompt(explicitTierId)
  }, [])

  /** Agreeing to a scale: adopt it, show it, and get out of the way. */
  const confirmTier = useCallback(tierId => {
    setSelectedTier(tierId)
    // Only counts as an override if it is NOT what the headcount suggested.
    // Marking it touched after somebody agreed with the suggestion would
    // freeze the ladder for the rest of the visit.
    setTierTouched(tierId !== (tierForGuests(guestCount)?.id ?? null))
    setTierPrompt(null)
    setActiveTab('packages')
    // Two frames, not one. The rung being scrolled to may not exist yet — the
    // services tab was possibly open — and TierMatchDialog pins `body`
    // overflow while it is mounted. One frame gets React's commit; the second
    // guarantees the dialog's cleanup has released the scroll before we ask
    // the page to move.
    afterPaint(() => {
      document.getElementById(`tier-${tierId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [guestCount])

  /**
   * Show me that scale, without adopting it.
   *
   * The verdict's "See what's included" — the half of the audience that wants
   * to read the detail before committing to anything. Separate from
   * confirmTier() on purpose: looking at a rung is not choosing it, and a page
   * that treats a glance as a decision is a page people stop glancing at.
   */
  const showTier = useCallback(tierId => {
    setActiveTab('packages')
    afterPaint(() => {
      document
        .getElementById(tierId ? `tier-${tierId}` : 'tier-bespoke')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  /** Picking a door from the top of the page. */
  const chooseDoor = useCallback(tab => {
    setActiveTab(tab)
    afterPaint(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [])

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

    // A décor selection is a LIST — the catalogue's tray adds everything that
    // was ticked in one act. Routed through the same funnel rather than given
    // its own handler so the signed-out check above cannot end up duplicated
    // and disagreeing with itself, which is the whole reason this function
    // exists. Each item was already put in service shape by decorAsService().
    if (kind === 'decor') {
      for (const service of payload) {
        dispatch({ type: 'ADD_SERVICE', eventId, eventName: event.name, service, details })
      }
    } else if (kind === 'service') {
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

  /**
   * `?see=decor` lands on the décor catalogue instead of the top of the page.
   *
   * Same convention as `?tab=services` above, and it exists for the same
   * reason: the landing gallery sends people here specifically to see the
   * priced décor list, and dropping them at the hero means scrolling past the
   * guest dial and both doors to find what they clicked for.
   *
   * A query param rather than a `#decor-catalog` hash because this is a SPA
   * with no hash-scroll handling — a fragment would land at the top of the page
   * and look like the link was broken.
   */
  useEffect(() => {
    if (new URLSearchParams(location.search).get('see') !== 'decor') return
    afterPaint(() => {
      document.getElementById('decor-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [eventId, location.search])

  // Restart the page when the occasion changes under it — the footer links
  // between occasions, and carrying a birthday's open tab and guest count into
  // a griha pravesh would be quietly wrong.
  useEffect(() => {
    setQuery('')
    setTierTouched(false)
    setGuestCount(DEFAULT_GUESTS)
    // A scale dialog left open across an occasion change would be asking the
    // customer to agree to a griha pravesh's Special Day while the page
    // behind it has become a birthday.
    setTierPrompt(null)
  }, [eventId])

  if (!event) {
    return (
      <div className="event-canvas flex min-h-screen items-center justify-center px-4">
        <div className="event-glass max-w-sm p-8 text-center">
          <div className="mb-3 text-5xl">🤔</div>
          <h2 className="text-lg font-extrabold text-ink">We do not have a page for that yet</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">
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

  // Mirror the occasion theme onto the document root. The décor sheet renders
  // through a portal (see DecorCatalog) so it sits under <body>, outside the
  // element these are set on — without this it would fall back to the house
  // plum and a birthday sheet would price in the wrong colour.
  useEffect(() => {
    const root = document.documentElement
    const keys = Object.keys(themeVars)
    keys.forEach(k => root.style.setProperty(k, themeVars[k]))
    return () => keys.forEach(k => root.style.removeProperty(k))
  }, [themeVars])
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
      <header ref={barRef} className="event-appbar sticky top-0 z-40 pt-safe">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
          <button
            onClick={() => navigate('/services')}
            aria-label="All occasions"
            className="tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold leading-tight text-ink">
              {event.emoji} {event.name}
            </p>
            <button
              onClick={openCityPicker}
              className="tap-tall flex items-center gap-1 text-[10.5px] text-ink-mute transition-colors hover:text-ink"
            >
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{chosen ? city : 'Set your city'}</span>
              {chosen && !servable && <span className="text-amber-700">· not live yet</span>}
            </button>
          </div>

          {user && (
            <button
              onClick={() => navigate('/dashboard/customer/cart')}
              aria-label="Your enquiry cart"
              className="relative tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
            >
              <ShoppingCart size={16} />
              {totalCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-ink">
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
              style={{ color: 'var(--event-glow-ink)' }}
            >
              {event.tagline}
            </p>
            <h1 className="mt-1.5 font-serif text-[30px] font-bold leading-[1.1] text-ink sm:text-[36px]">
              {event.name}
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-mute">
              {profile.promise}
            </p>
          </div>

          {/* ── The live answer ─────────────────────────────
              Three static tiles used to sit here — eight scales, a floor
              price, a service count — under three signature pills that
              wrapped to two or three rows on a phone. Six lines of the most
              valuable space on the page, none of which changed no matter
              what the customer did. This is the same space, repriced against
              the headcount below it, with the signature moments folded into
              its rotating line. See OccasionPulse. */}
          <div className="rise-in mt-4" style={{ '--rise-delay': '160ms' }}>
            <OccasionPulse
              event={event}
              profile={profile}
              tier={bespoke ? BESPOKE_TIER : activeTier}
              tierCount={tiers.length}
              guestCount={guestCount}
              quote={liveQuote}
              entryPrice={entryPrice}
              bespoke={bespoke}
            />
          </div>
        </section>

        {/* ── The one number that decides everything below ────
            The number field, six arbitrary preset chips and a sentence
            naming the resulting scale are now one control that draws the
            ladder and lights the rung you are standing on. See
            GuestScaleDial; the quiet/committed split is what keeps the
            scale dialog from firing between "2" and "220". */}
        <div className="mt-5">
          <GuestScaleDial
            guestCount={guestCount}
            tiers={tiers}
            matchedTierId={suggestedTierId}
            selectedTierId={selectedTier}
            bespoke={bespoke}
            onQuietChange={setGuestCount}
            onCommit={commitGuests}
            verdict={
              <ScaleVerdict
                tier={bespoke ? BESPOKE_TIER : activeTier}
                quote={liveQuote}
                guestCount={guestCount}
                eventId={eventId}
                bespoke={bespoke}
                suggested={bespoke ? null : tiers.find(t => t.id === suggestedTierId) ?? null}
                onAdoptSuggested={() => confirmTier(suggestedTierId)}
                onSeeDetails={() => showTier(bespoke ? null : activeTier?.id)}
              />
            }
          />
        </div>

        {/* ── The two doors, at the front ────────────────────
            This is the decision the page exists to put in front of somebody,
            and it used to be a 56px tab strip three screens down. Stated
            here as two offers, the primary one carrying the live estimate.
            The sticky strip below survives for flipping between them once
            you are deep in a list. */}
        <div className="rise-in mt-5" style={{ '--rise-delay': '320ms' }}>
          <TwoDoors
            event={event}
            tiers={tiers}
            tier={activeTier}
            quote={liveQuote}
            entryPrice={entryPrice}
            guestCount={guestCount}
            bespoke={bespoke}
            active={activeTab}
            onChoose={chooseDoor}
          />
        </div>

        {/* ── The third door, for the customer who has not decided ──
            TwoDoors above asks "the whole celebration, or just one thing?"
            and both of its answers assume somebody who already knows roughly
            what they want. Most people arriving on this page do not: they
            tapped an occasion because a birthday is coming, and the first
            thing this screen does is quote them.

            Occasion cards on home and /plan open the guided journey now, so
            this page is reached mainly by people who came looking for the
            catalogue — but it is also where EventFooter's occasion links and
            every old bookmark land, and those visitors deserve the same door.
            One quiet line, under the two that were already here rather than
            above them: somebody who came to browse prices should not have a
            nine-minute flow put in front of the prices. */}
        <Link
          to={`/celebrate/${event.id}`}
          className="rise-in mt-3 flex items-center gap-3 rounded-[22px] bg-surface-sunk/[0.05] px-4 py-3.5 transition-transform active:scale-[0.99]"
          style={{ '--rise-delay': '360ms' }}
        >
          <span aria-hidden="true" className="text-[20px] leading-none">🧭</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold leading-snug text-ink">
              Not sure where to start?
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">
              We'll walk you through it one question at a time — the food, the look, the
              photographs — and show you the price at the end.
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-ink-mute" />
        </Link>

        {/* ── See it, price it, pick it ──────────────────────
            "What does it look like and what does it cost" is the question
            people ask before "what is in the package", and the tabs below
            answer only the second one.

            This was four sample photographs whose only forward action was a
            link to /plan. Tapping a picture of a candlelight dinner navigated
            to a wizard about guest counts — the customer asked what it looks
            like and was handed a form. That link is gone and so is the teaser:
            the whole décor list is here, priced, filterable, and selectable
            without leaving the page. See components/event/DecorCatalog.

            Deliberately NOT wrapped in `event-glass overflow-hidden` the way
            the samples were. `overflow-hidden` on any ancestor kills
            `position: sticky` in the descendant, and the catalogue's selection
            tray is sticky — it would have silently scrolled away with the
            grid, taking the running total with it. */}
        <section className="rise-in mt-6" style={{ '--rise-delay': '360ms' }}>
          <DecorCatalog
            eventId={eventId}
            eventName={event.name}
            hasItem={hasItem}
            onAddSelected={chosen => handleAdd('decor', chosen.map(decorAsService))}
          />
        </section>
      </div>

      {/* ── The doors again, as a switch ─────────────────────
          Sticks directly under the app bar, which is 56px tall (a 36px control
          plus its 10px padding either side). */}
      <div
        ref={contentRef}
        className="sticky z-20 mt-6 border-y border-hairline/10 bg-surface/90 backdrop-blur"
        style={{ top: 'var(--event-appbar-h, 3.5rem)' }}
        style={{ scrollMarginTop: '56px' }}
      >
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
            className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-ink-mute hover:text-ink"
          >
            <Pencil size={11} /> Change the date, time or venue for this celebration
          </button>
        )}

        {/* ══ COMPLETE CELEBRATIONS ═══════════════════════════ */}
        {activeTab === 'packages' && (
          <div className="space-y-3">
            <div className="event-glass p-4">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Every one of these is the <strong className="font-extrabold text-ink">whole celebration</strong> —
                food, decor, coordination and the services this occasion needs — arranged by one team
                for one price. They are named for the size of the gathering, never for a budget, and the
                only difference between them is how many people are in the room.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
                Prices are estimates for{' '}
                <button
                  onClick={openCityPicker}
                  className="font-bold underline decoration-hairline/20 underline-offset-2 hover:text-ink"
                >
                  {city}
                </button>
                , computed for {profile.vegOnly ? 'a pure-veg' : 'a mixed'}{' '}
                {tiers[0]?.cuisine?.name ?? 'traditional'} spread. Your final number is confirmed once we
                know your date and venue — and you approve it before anything is booked.
              </p>
            </div>

            {/* The anchor lives on a wrapper rather than on the card so
                TierPackageCard stays a presentational component. The scroll
                margin clears the app bar and the sticky tab strip stacked
                above it — 56px each — or the rung the customer just agreed
                to lands underneath both of them. */}
            {tiers.map((tier, i) => (
              <div key={tier.id} id={`tier-${tier.id}`} style={{ scrollMarginTop: '116px' }}>
                <TierPackageCard
                  tier={tier}
                  eventId={eventId}
                  index={i}
                  selected={selectedTier === tier.id}
                  suggested={suggestedTierId === tier.id}
                  onSelect={() => commitGuests(tier.typicalGuests, tier.id)}
                  inCart={hasPkg(eventId, tier.id)}
                  onAdd={() => handleAdd('package', tierAsPackage(tier))}
                  reviewEnquiryId={eligible[`package__${tier.id}`]}
                  onReview={() => setReviewing({
                    subject: { type: 'package', id: tier.id, name: tier.name },
                    source: { enquiryId: eligible[`package__${tier.id}`] },
                  })}
                />
              </div>
            ))}

            {/* The honest exit past the top rung. No price, on purpose.
                Anchored so the verdict can scroll a customer past the ladder
                to it, which is where a 6,000-guest count belongs. */}
            <div id="tier-bespoke" style={{ scrollMarginTop: '116px' }} className="event-glass p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{BESPOKE_TIER.emoji}</span>
                <h3 className="text-[16px] font-extrabold text-ink">{BESPOKE_TIER.name}</h3>
                <span className="text-[11px] font-medium italic text-ink-mute">{BESPOKE_TIER.localName}</span>
              </div>
              <p className="mt-1 text-[12.5px] font-semibold text-ink-soft">{BESPOKE_TIER.tagline}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{BESPOKE_TIER.description}</p>
              <Link
                to={`/plan/custom?type=${toWizardType(eventId)}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold"
                style={{ color: 'var(--event-glow-ink)' }}
              >
                <Sparkles size={13} /> Tell us about it instead <ChevronRight size={13} />
              </Link>
            </div>

            <div className="event-glass p-5 text-center">
              <p className="text-[13px] font-extrabold text-ink">Want only one piece of it?</p>
              <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-ink-mute">
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
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Every service opens. Tap one and you get what is actually inside it — the cuisines
                and every dish under them, the decor levels and what each installs, what a
                photographer hands back — priced at your{' '}
                <strong className="font-extrabold text-ink">{guestCount} guests</strong>.
              </p>
            </div>

            {/* Twenty-four services is a lot to scroll past to reach the one
                you came for. */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find a service — cook, decor, photographer…"
                aria-label="Search services"
                className="w-full rounded-2xl bg-surface-sunk/[0.06] py-2.5 pl-9 pr-9 text-[13px] text-ink ring-1 ring-hairline/10 placeholder:text-ink-mute focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--event-glow-line)' }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {categories.length === 0 ? (
              <div className="event-glass p-8 text-center">
                <p className="text-[13px] font-bold text-ink">Nothing here matches “{query}”</p>
                <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-ink-mute">
                  Try a shorter word — or ask us anyway. Plenty of what we arrange never made it
                  onto a list.
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 rounded-xl bg-surface-sunk/[0.07] px-4 py-2 text-[12px] font-bold text-ink ring-1 ring-hairline/10"
                >
                  Show all {event.services.length}
                </button>
              </div>
            ) : (
              categories.map(cat => (
                <section key={cat} aria-labelledby={`cat-${cat}`}>
                  <h2
                    id={`cat-${cat}`}
                    className="mb-2 flex items-baseline gap-2 px-1 text-[13px] font-extrabold text-ink"
                  >
                    {cat}
                    <span className="text-[11px] font-medium text-ink-mute">
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
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="text-[11.5px] leading-relaxed text-ink-mute">
                Adding a service here starts an <strong className="font-bold text-ink">enquiry</strong>,
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
          /* A décor add carries a list, so there is no single `.name` to read.
             Naming the count rather than the first item: "Romantic Room Décor"
             over a form that is about to attach the date to four setups is a
             label that misstates what is being confirmed. */
          itemLabel={
            Array.isArray(pendingAdd.payload)
              ? `${pendingAdd.payload.length} décor setup${pendingAdd.payload.length > 1 ? 's' : ''}`
              : pendingAdd.payload.name
          }
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

      {/* ── "You're in this circle" ─────────────────────────
          The same dialog the builder uses, on the page most customers reach
          first. The guest count decides the scale, and a decision that sets
          the dish allowance, the decor level and the pre-ticked services is
          not something to make on somebody's behalf in silence — it gets
          named, shown, and agreed to, with the way onward on the button.
          Occasion-aware, so a baby shower that lands on Royal Mysuru is not
          told its scale brings a mandap. */}
      {tierPrompt && (
        <TierMatchDialog
          tierId={tierPrompt}
          eventId={eventId}
          currentTierId={selectedTier}
          guestCount={guestCount}
          nextLabel="See what is in it"
          onConfirm={confirmTier}
          onDismiss={() => setTierPrompt(null)}
        />
      )}
    </div>
  )
}

/* ── Small pieces ─────────────────────────────────────────────────────── */

function TabButton({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
        active ? 'text-gray-900' : 'text-ink-mute hover:bg-surface-sunk/[0.07] hover:text-ink'
      }`}
      style={active ? { background: 'var(--event-glow)' } : undefined}
    >
      <Icon size={15} className="shrink-0" />
      <span className="min-w-0 text-left">
        <span className="block truncate text-[12.5px] font-extrabold leading-tight">{label}</span>
        <span className={`block truncate text-[10px] leading-tight ${active ? 'text-gray-900/60' : 'text-ink-mute'}`}>
          {sub}
        </span>
      </span>
    </button>
  )
}
