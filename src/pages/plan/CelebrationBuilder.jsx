import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Users, Palette, UtensilsCrossed, Sparkles, ListChecks, ShieldCheck, Receipt, Gift,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../context/ToastContext'
import { BRAND } from '../../config/sambramo'
import { EVENT_DATA, EVENT_LIST } from '../../data/eventServicesData'
import { CELEBRATION_TIERS, TIER_BY_ID, BOOKING_MODES, tierForGuests, LOCK_AMOUNT } from '../../data/celebrationTiers'
import { CUISINES, CUISINE_BY_ID, defaultMenu } from '../../data/cuisineMenus'
import { DECOR_LEVEL_BY_ID } from '../../data/decorPackages'
import { ALL_SERVICES } from '../../data/servicePricing'
import { OFFER_BY_ID, offerAvailability, offerToNote } from '../../data/celebrationOffers'
import { buildQuote, quoteToText, checkMinimums } from '../../utils/quote'
import { formatINR } from '../../utils/format'
import OccasionPicker from '../../components/plan/OccasionPicker'
import JourneyRail from '../../components/plan/JourneyRail'
import OffersRail from '../../components/plan/OffersRail'
import RewardsCard from '../../components/plan/RewardsCard'
import TierLadder from '../../components/plan/TierLadder'
import MenuBuilder from '../../components/plan/MenuBuilder'
import DecorChooser from '../../components/plan/DecorChooser'
import ServicePicker from '../../components/plan/ServicePicker'
import QuotePanel from '../../components/plan/QuotePanel'
import ReviewBoard from '../../components/plan/ReviewBoard'
import TierMatchDialog from '../../components/plan/TierMatchDialog'
import BuilderActionBar from '../../components/plan/BuilderActionBar'
import LockPayment from '../../components/plan/LockPayment'
// This page's own ground and its ticket/motion styles. Separate from
// index.css only because that file is carrying an unrelated in-flight change
// — see the header of planBuilder.css.
import '../../styles/planBuilder.css'

/**
 * Build a celebration and watch the price move.
 *
 * ── Why this page exists next to the wizard and the catalog ─────────────
 * /plan/custom asks six questions and promises a call back. /services shows
 * packages with ranges four times wider than the decision they are meant to
 * support. Neither lets somebody answer the question they actually came with:
 * *what will my event cost, and what do I get.*
 *
 * ── The mobile rules, which drove the layout ────────────────────────────
 * Nearly all of this traffic is a phone, mid-evening, one thumb. So:
 *
 *   Forward motion is pinned, not buried. The way to the next step is in a
 *   fixed bar at the bottom of the screen, always one thumb-reach away. It
 *   used to be a button under the step's content, which on the Food step
 *   meant scrolling past forty dish tiles after every single choice — and on
 *   the last step it did not exist at all, leaving Back as the only visible
 *   control on a screen whose job was to finish.
 *
 *   The price is never off screen, and never in the way. It shares that same
 *   bar as one line, and tapping it goes to the review STEP. Two earlier cuts
 *   got this wrong in opposite directions: a `position: fixed` desktop panel
 *   that ate half the screen, then a sheet that covered the page. A pinned
 *   element earns the height it needs to be glanced at, and no more.
 *
 *   Review is the last step, not a modal that can ambush you mid-flow. It is
 *   the longest content in the builder and it belongs on a page that scrolls
 *   normally with nothing behind it to hide. See ReviewBoard.
 *
 *   Anything the app decides on the customer's behalf gets stated and agreed
 *   to. The guest count picks the scale, and it used to do it silently: you
 *   tapped 220 and a highlight moved somewhere in a list you had scrolled
 *   past. Now it opens TierMatchDialog — this is your circle, here is what
 *   comes with it, here is the way on.
 *
 *   The estimate does not appear until an occasion is chosen. A quote object
 *   exists from the first render (the guest count defaults, the tier follows
 *   it), but a five-figure number shown to somebody who has answered nothing
 *   reads as invented.
 *
 *   Native <select> for every dropdown — Android opens its own picker, which
 *   is better than anything hand-rolled and already accessible.
 *
 *   Every tap target is at least 44–52px, and nothing depends on hover.
 *
 * ── On taking money ─────────────────────────────────────────────────────
 * The ₹1,000 hold is offered AFTER the enquiry is safely saved, never as a
 * gate in front of it. If the payment step fails, is skipped or is closed, the
 * enquiry still exists and a coordinator still calls — the customer cannot end
 * up having lost their work because a UPI deep link misbehaved.
 */

// A half-built celebration waiting out a login. Session-scoped, same rule as
// the wizard's draft and the catalog's cart intent: one visit's intent, not a
// standing order to be resurrected on another device three weeks later.
const DRAFT_KEY = 'sambramo_builder_draft'

/**
 * The steps, in order, ending at review.
 *
 * `short` is what the forward button says ("Next: Décor"), because "Next:
 * Everything else" sets two lines on a 360px phone and the arrow stops
 * looking like part of the same control.
 */
const STEPS = [
  { id: 'occasion', label: 'Occasion',        short: 'Occasion', icon: Sparkles },
  { id: 'scale',    label: 'Scale',           short: 'Scale',    icon: Users },
  { id: 'food',     label: 'Food',            short: 'Food',     icon: UtensilsCrossed },
  { id: 'decor',    label: 'Décor',           short: 'Décor',    icon: Palette },
  { id: 'services', label: 'Everything else', short: 'Extras',   icon: ListChecks },
  { id: 'review',   label: 'Review & send',   short: 'Review',   icon: Receipt },
]

export default function CelebrationBuilder() {
  const { eventId: routeEventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [step, setStep] = useState(routeEventId ? 'scale' : 'occasion')
  const [eventId, setEventId] = useState(routeEventId ?? '')
  const [otherOccasion, setOtherOccasion] = useState('')
  const [mode, setMode] = useState(searchParams.get('mode') === 'individual' ? 'individual' : 'full')
  const [guestCount, setGuestCount] = useState(Number(searchParams.get('guests')) || 120)
  // Whether the headcount arrived with the customer. The occasion page has a
  // whole control for it, so re-asking "how many guests are you expecting?" on
  // arrival reads as the last screen having been ignored. Held in state rather
  // than read live so that editing the number here does not turn the step back
  // into the question the customer already answered.
  const [guestsPrefilled] = useState(() => Number(searchParams.get('guests')) > 0)
  // `?tier=` arrives from the occasion page, where the customer has already
  // chosen a scale off the priced ladder. Landing them on the builder and
  // silently re-deriving the tier from the guest count would undo a decision
  // they just made — see `tierTouched` below, which is seeded true for exactly
  // that reason.
  const [tierId, setTierId] = useState(() => {
    const requested = searchParams.get('tier')
    return requested && TIER_BY_ID[requested] ? requested : null
  })
  const [cuisineId, setCuisineId] = useState(null)
  const [vegOnly, setVegOnly] = useState(true)
  const [menu, setMenu] = useState({})
  const [specialRequests, setSpecialRequests] = useState('')
  const [decorLevelId, setDecorLevelId] = useState(null)
  const [themeId, setThemeId] = useState('traditional_red_gold')
  const [addonIds, setAddonIds] = useState([])
  const [serviceIds, setServiceIds] = useState([])
  const [serviceQty, setServiceQty] = useState({})
  const [includeCatering, setIncludeCatering] = useState(true)
  const [includeDecor, setIncludeDecor] = useState(true)
  const [eventDate, setEventDate] = useState('')
  const [city, setCity] = useState(BRAND.pilotCities[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [enquiryId, setEnquiryId] = useState(null)
  const [lockClaimed, setLockClaimed] = useState(false)

  // The one coupon claimed, by id. One at a time on purpose: the terms say
  // so, and two stacked percentages on an estimate nobody has confirmed is a
  // promise this business cannot keep. It changes no number on this page —
  // it rides along in the coordinator's note and comes off the confirmed
  // quote. See data/celebrationOffers.js.
  const [appliedOfferId, setAppliedOfferId] = useState(null)

  // The scale waiting to be agreed to. Holds an id rather than a boolean so
  // the dialog can offer a switch ("your 450 guests suggest Grand") without
  // having already applied it behind the customer's back.
  const [tierPrompt, setTierPrompt] = useState(null)

  const event = EVENT_DATA[eventId]
  const occasionName = eventId === 'other'
    ? (otherOccasion.trim() || 'Custom celebration')
    : event?.name ?? 'Celebration'
  const occasionEmoji = eventId === 'other' ? '✏️' : event?.emoji ?? '🎊'

  const suggestedId = useMemo(() => tierForGuests(guestCount)?.id, [guestCount])
  const tier = TIER_BY_ID[tierId]

  // The guest count picks the tier until the customer overrides it, and then
  // it stops — somebody who deliberately chose Close Circle for 90 guests
  // because they want a small setup at a big function should not have that
  // undone by typing one more digit into the guest field.
  const [tierTouched, setTierTouched] = useState(() => !!tierId)
  useEffect(() => {
    if (tierTouched) return
    if (suggestedId && suggestedId !== 'bespoke') setTierId(suggestedId)
  }, [suggestedId, tierTouched])

  // Décor level and the service list both follow the tier, and both stop
  // following the moment the customer edits them. A tier is a starting point,
  // not a cage.
  const [decorTouched, setDecorTouched] = useState(false)
  useEffect(() => {
    if (decorTouched || !tier) return
    setDecorLevelId(tier.defaultDecor)
  }, [tier, decorTouched])

  const [servicesTouched, setServicesTouched] = useState(false)
  useEffect(() => {
    if (servicesTouched || !tier) return
    setServiceIds(tier.includedServices ?? [])
  }, [tier, servicesTouched])

  // The tier decides how many dishes are included, so changing tier has to
  // re-fill the menu — otherwise moving up from Close Circle to Grand leaves
  // the customer on a four-dish menu that their new tier already paid for.
  useEffect(() => {
    if (!cuisineId || !tier) return
    setMenu(defaultMenu(CUISINE_BY_ID[cuisineId], tier.menuAllowance, { vegOnly }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierId])

  const quote = useMemo(() => buildQuote({
    tierId, guestCount, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds,
    serviceIds, serviceQty, mode, includeCatering, includeDecor,
  }), [tierId, guestCount, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds,
      serviceIds, serviceQty, mode, includeCatering, includeDecor])

  const blocked = useMemo(() => {
    if (!eventId) return { rule: 'occasion', message: 'Pick what you are celebrating first — it is the top step.' }
    if (eventId === 'other' && !otherOccasion.trim()) {
      return { rule: 'occasion', message: 'Tell us what the occasion is and we can send this on.' }
    }
    // An unfinished configuration is not a sendable one. Catering is on by
    // default, so without this a customer could send "Special Day, 220 guests,
    // no food" to a coordinator and get a call back asking the question the
    // page was supposed to have answered.
    if (includeCatering && !cuisineId) {
      return { rule: 'cuisine', message: 'Pick a cuisine under Food and the menu fills itself in — or switch catering off under "Everything else".' }
    }
    if (includeDecor && !decorLevelId) {
      return { rule: 'decor', message: 'Choose how much decoration you want under Décor.' }
    }
    if (!includeCatering && !includeDecor && serviceIds.length === 0) {
      return { rule: 'empty', message: 'Nothing is selected yet — add food, décor or any service under "Everything else".' }
    }
    return checkMinimums({
      mode, guestCount, decorTotal: quote?.decor.total ?? 0, includeCatering, includeDecor,
    })
  }, [eventId, otherOccasion, mode, guestCount, quote, includeCatering, includeDecor, cuisineId, decorLevelId, serviceIds])

  /**
   * When the price is allowed on screen at all.
   *
   * The guest count defaults to 120 and the tier auto-follows it, so a quote
   * object exists on the very first render — before the customer has told us
   * what they are even celebrating. Showing a five-figure estimate to somebody
   * who has not answered a single question makes the number look invented,
   * which is the opposite of what a transparent price is for. On a phone it was
   * also parking a panel over the first question being asked.
   *
   * So the estimate waits for the one prerequisite that makes it meaningful:
   * an occasion. Everything after that (scale, menu, decor, services) refines a
   * number that is already on screen and already moving.
   */
  const occasionAnswered = !!eventId && (eventId !== 'other' || !!otherOccasion.trim())
  const showQuote = !!quote && occasionAnswered

  /**
   * The steps that actually apply to this configuration.
   *
   * Turning catering off does not grey out Food, it removes it — so "next"
   * means the next real question rather than the next array index, and the
   * old `while (disabled) next++` walk disappears along with the off-by-one
   * it was one edit away from.
   */
  const flow = useMemo(
    () => STEPS.filter(s =>
      !(s.id === 'food' && !includeCatering) && !(s.id === 'decor' && !includeDecor)),
    [includeCatering, includeDecor],
  )
  const flowIndex = flow.findIndex(s => s.id === step)

  // Standing on a step that just left the flow (catering switched off while
  // reading the menu) is a blank screen with no way out. Land on Extras,
  // which is where the switch that caused it lives.
  useEffect(() => {
    if (step === 'done') return
    if (!flow.some(s => s.id === step)) setStep('services')
  }, [flow, step])

  // An offer can stop qualifying after it was claimed — claim the early bird,
  // then move the date inside sixty days. Leaving the ticket showing "Claimed"
  // would send a coordinator a discount the customer is no longer owed, and
  // they would be the one to take that conversation. It releases itself.
  useEffect(() => {
    if (!appliedOfferId) return
    const offer = OFFER_BY_ID[appliedOfferId]
    if (offer && !offerAvailability(offer, { eventDate }).ok) setAppliedOfferId(null)
  }, [appliedOfferId, eventDate])

  /* ── Moving between steps ─────────────────────────────────────────── */

  // Each step is a fresh question, so it starts at the top of itself rather
  // than wherever the previous step's scroll position happened to be.
  // `scroll-mt` on the anchor keeps the sticky step bar from covering the
  // first card.
  const contentRef = useRef(null)
  const lastStep = useRef(step)
  useEffect(() => {
    // Compares the step rather than counting renders, so StrictMode's second
    // mount in development does not scroll a page nobody has moved through.
    if (lastStep.current === step) return
    lastStep.current = step
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const goTo = useCallback(id => setStep(id), [])

  const goNext = useCallback((fromId) => {
    const i = flow.findIndex(s => s.id === (fromId ?? step))
    const next = flow[i + 1]
    if (next) setStep(next.id)
  }, [flow, step])

  const goBack = useCallback(() => {
    const previous = flow[flowIndex - 1]
    if (previous) setStep(previous.id)
  }, [flow, flowIndex])

  /* ── Scale, decided out loud ──────────────────────────────────────── */

  /**
   * When a guest count is allowed to interrupt.
   *
   * It used to be: any discrete act (a preset chip, a tier tap) opened the
   * confirmation dialog. That was the right instinct against the original bug
   * — a scale being chosen for you, silently, by a highlight moving somewhere
   * off screen — but it is the wrong mechanism now that the scale states
   * itself in words at the top of the step, priced, with the way on attached.
   * A modal that repeats what is already on screen is a modal people learn to
   * dismiss without reading.
   *
   * So the interruption is reserved for the one case where something the
   * customer decided is about to be contradicted: they picked a scale
   * deliberately, and the new headcount suggests a different one. Everything
   * else moves the banner and the price, quietly, in place.
   */
  const handleGuestCount = useCallback((n, discrete = false) => {
    setGuestCount(n)
    if (!discrete || !tierTouched) return
    const suggestion = tierForGuests(n)
    if (suggestion && suggestion.id !== 'bespoke' && suggestion.id !== tierId) {
      setTierPrompt(suggestion.id)
    }
  }, [tierTouched, tierId])

  // Choosing a rung from the ladder is already its own confirmation: the card
  // banners itself where the thumb landed, and the summary above rewrites to
  // match. Nothing is decided on the customer's behalf here, so nothing needs
  // agreeing to.
  const handleTierSelect = useCallback(id => {
    setTierId(id)
    setTierTouched(true)
  }, [])

  const confirmTier = useCallback(id => {
    setTierId(id)
    setTierTouched(true)
    setTierPrompt(null)
    goNext('scale')
  }, [goNext])

  function toggleService(id) {
    setServicesTouched(true)
    setServiceIds(cur => cur.includes(id) ? cur.filter(s => s !== id) : [...cur, id])
  }

  const submit = useCallback(async (draftOverride) => {
    const state = draftOverride ?? {
      eventId, otherOccasion, mode, guestCount, tierId, cuisineId, vegOnly, menu, specialRequests,
      decorLevelId, themeId, addonIds, serviceIds, serviceQty, includeCatering, includeDecor, eventDate, city,
      appliedOfferId,
    }
    const liveQuote = buildQuote(state)
    if (!liveQuote) return

    // Same rule as the catalog: ask at the point where there is something to
    // save. A visitor who has just spent four minutes building a menu has
    // earned an explanation for the login, and "so we can send this to a
    // coordinator" is one.
    if (!user) {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state)) } catch { /* storage off — the login still works */ }
      navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const cuisine = CUISINE_BY_ID[state.cuisineId]
      const name = state.eventId === 'other'
        ? (state.otherOccasion?.trim() || 'Custom celebration')
        : EVENT_DATA[state.eventId]?.name ?? 'Custom celebration'

      // A claimed coupon becomes real HERE and nowhere else — the note is the
      // whole mechanism, so it carries the code and the instruction to apply
      // it rather than just the name. Re-checked against the state actually
      // being submitted, so an early-bird claimed and then invalidated by a
      // date change cannot reach a coordinator as a live discount.
      const offer = OFFER_BY_ID[state.appliedOfferId]
      const offerIsValid = offer && offerAvailability(offer, { eventDate: state.eventDate }).ok

      const notes = [
        quoteToText(liveQuote, { menu: state.menu, cuisine, vegOnly: state.vegOnly }),
        state.specialRequests ? `\nSPECIAL REQUESTS\n  ${state.specialRequests}` : '',
        `\nBooked as: ${BOOKING_MODES[state.mode].name}`,
        offerIsValid ? offerToNote(offer) : '',
      ].join('\n')

      // Only columns that exist before migration 034 go in this insert. The
      // lock fields are written by a separate, best-effort update below, so a
      // migration that has not been applied yet costs the customer a payment
      // option — never their enquiry.
      const { data, error: err } = await supabase.from('service_enquiries').insert({
        customer_id: user.id,
        event_id:    state.eventId || 'custom',
        event_name:  name,
        event_date:  state.eventDate || null,
        guest_count: state.guestCount,
        location:    { city: state.city },
        services: [
          state.includeCatering && cuisine && {
            id: 'catering', name: `Catering — ${cuisine.name}`, emoji: cuisine.emoji,
            unit_price: liveQuote.plate.perPlate, qty: state.guestCount,
            details: { cuisine: cuisine.id, vegOnly: state.vegOnly, menu: state.menu },
          },
          state.includeDecor && liveQuote.decor.level && {
            id: 'decor', name: `Décor — ${liveQuote.decor.level.name}`, emoji: liveQuote.decor.level.emoji,
            unit_price: liveQuote.decor.total, qty: 1,
            details: { level: liveQuote.decor.level.id, theme: state.themeId, addons: state.addonIds },
          },
          ...liveQuote.services.map(({ service, qty, amount }) => ({
            id: service.id, name: service.name, emoji: service.emoji,
            unit_price: service.base, qty, details: { unit: service.unit, amount },
          })),
        ].filter(Boolean),
        packages: [{
          id: liveQuote.tier.id,
          name: `${liveQuote.tier.name} (${liveQuote.tier.localName})`,
          price_min: liveQuote.range.low,
          price_max: liveQuote.range.high,
          details: {
            guests: state.guestCount, estimate: liveQuote.total, perGuest: liveQuote.perGuest,
            tax: liveQuote.tax.total, preTax: liveQuote.preTax,
          },
        }],
        notes,
        status: 'open',
      }).select('id').single()
      if (err) throw err

      setEnquiryId(data.id)
      setStep('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(friendlyError(err, 'Could not send this just now. Please try again, or message us on WhatsApp.'))
    } finally {
      setSubmitting(false)
    }
  }, [user, navigate, location, eventId, otherOccasion, mode, guestCount, tierId, cuisineId, vegOnly, menu,
      specialRequests, decorLevelId, themeId, addonIds, serviceIds, serviceQty, includeCatering, includeDecor,
      eventDate, city, appliedOfferId])

  /**
   * Record that the customer says they paid.
   *
   * Deliberately swallows its own failure. This runs after the enquiry is
   * already safely stored, so the worst case is a coordinator who has to ask
   * about the payment by hand — which is what happens anyway, since UPI gives
   * this app no confirmation. Throwing here would show an error over a
   * successfully-saved request and make somebody who has just paid think they
   * had not. Also the graceful path when migration 034 is not yet applied.
   */
  const claimLock = useCallback(async () => {
    setLockClaimed(true)
    if (!enquiryId) return
    const { error: err } = await supabase.from('service_enquiries').update({
      lock_payment_status: 'claimed',
      lock_payment_amount: LOCK_AMOUNT,
      lock_payment_ref: enquiryId,
      lock_claimed_at: new Date().toISOString(),
    }).eq('id', enquiryId)
    if (err) console.warn('Price-lock claim not recorded (migration 034 applied?):', err.message)
  }, [enquiryId])

  // Finish what a guest started, once they come back signed in.
  useEffect(() => {
    if (!user) return
    let draft
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      draft = JSON.parse(raw)
      sessionStorage.removeItem(DRAFT_KEY)
    } catch { return }
    if (!draft) return
    // Put the configuration back on screen first, so the customer sees what is
    // about to be sent rather than a success message for something they can no
    // longer inspect.
    setEventId(draft.eventId); setOtherOccasion(draft.otherOccasion ?? '')
    setMode(draft.mode); setGuestCount(draft.guestCount); setTierId(draft.tierId)
    setCuisineId(draft.cuisineId); setVegOnly(draft.vegOnly); setMenu(draft.menu)
    setSpecialRequests(draft.specialRequests ?? ''); setDecorLevelId(draft.decorLevelId)
    setThemeId(draft.themeId); setAddonIds(draft.addonIds ?? [])
    setServiceIds(draft.serviceIds ?? []); setServiceQty(draft.serviceQty ?? {})
    setIncludeCatering(draft.includeCatering); setIncludeDecor(draft.includeDecor)
    setEventDate(draft.eventDate ?? ''); setCity(draft.city ?? BRAND.pilotCities[0])
    setAppliedOfferId(draft.appliedOfferId ?? null)
    setTierTouched(true); setDecorTouched(true); setServicesTouched(true)
    submit(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Sent ─────────────────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <div className="plan-canvas min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
          <div className="plan-rise text-center space-y-3">
            <div className="w-20 h-20 bg-emerald-400/15 ring-1 ring-emerald-400/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={44} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Sent to a coordinator 🎉</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Your {occasionName.toLowerCase()} — {tier?.name}, {guestCount} guests, menu, décor and services — is with
              our team. Nothing gets booked until you approve the confirmed quote.
            </p>
            {quote && (
              <p className="plan-glass inline-block rounded-xl px-4 py-2 text-sm font-bold text-white">
                {formatINR(quote.range.low)} – {formatINR(quote.range.high)} incl. taxes
              </p>
            )}
            {/* The coupon is restated after sending, because "did my discount
                actually go through" is the first thing somebody wonders once
                the form is gone. */}
            {OFFER_BY_ID[appliedOfferId] && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400/15 px-3 py-1.5 text-xs font-bold text-saffron-300 ring-1 ring-saffron-400/30">
                <Gift size={13} />
                {OFFER_BY_ID[appliedOfferId].headline} sent with your request
              </p>
            )}
          </div>

          {lockClaimed ? (
            <div className="card p-5 text-center space-y-2 border-2 border-green-200 bg-green-50">
              <ShieldCheck size={28} className="text-green-600 mx-auto" />
              <p className="font-bold text-gray-900">Payment noted — we are checking for it now</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                UPI does not tell us automatically when money arrives, so a person is matching your{' '}
                {formatINR(LOCK_AMOUNT)} against the bank. You will get a message once it is confirmed and your date is
                held. It is adjusted against your final invoice, and refundable.
              </p>
            </div>
          ) : (
            <LockPayment
              enquiryId={enquiryId}
              quote={quote}
              onClaimed={claimLock}
              onSkip={() => navigate('/dashboard/customer/requests')}
            />
          )}

          <RewardsCard occasionName={occasionName} />

          <div className="flex flex-col gap-2 pt-2">
            <Link to="/dashboard/customer/requests" className="btn-primary text-center">Track this request</Link>
            <Link to="/services" className="text-sm font-semibold text-center text-saffron-300">
              Browse services &amp; packages
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── What each step has to show for itself ───────────────────────── */
  const level = DECOR_LEVEL_BY_ID[decorLevelId]
  const cuisine = CUISINE_BY_ID[cuisineId]
  const done = {
    occasion: occasionAnswered,
    scale:    !!tier,
    food:     !!cuisine,
    decor:    !!level,
    services: serviceIds.length > 0,
    review:   false,
  }
  const summary = {
    occasion: occasionAnswered ? occasionName : null,
    scale:    tier ? `${tier.name} · ${guestCount}` : null,
    food:     cuisine ? cuisine.name : null,
    decor:    level ? level.name : null,
    services: serviceIds.length ? `${serviceIds.length} picked` : null,
    review:   showQuote ? `${formatINR(quote.range.low)}+` : null,
  }

  const isReview = step === 'review'
  const nextStep = flow[flowIndex + 1]
  const primaryLabel = isReview
    ? (submitting ? 'Sending…' : 'Get this confirmed')
    : nextStep ? `Next: ${nextStep.short}` : 'Review'
  const primaryDisabled = isReview
    ? (submitting || !!blocked)
    : (step === 'occasion' && !occasionAnswered)
  const onPrimary = isReview ? () => submit() : () => goNext()
  // "This step is answered — the forward button is now the thing to press."
  // Drives the pulse in both bars, which is the only signal on the page that
  // distinguishes an available control from the next move.
  const primaryReady = !primaryDisabled && (isReview ? !blocked : !!done[step])

  const doneCount = flow.filter(s => done[s.id]).length
  const progressPct = Math.round((doneCount / Math.max(1, flow.length - 1)) * 100)

  return (
    <div className="plan-canvas min-h-screen pb-28 lg:pb-8">
      {/* ── Hero ───────────────────────────────────────────────────────
          The occasion's own gradient rides as a translucent wash over the
          page's ground rather than as an opaque band across it. An opaque
          band is what made the old header read as a separate website stacked
          on top of the builder; at 55% the canvas shows through and the two
          are one room with a lit end.

          Deliberately short. It used to run a badge, a two-line headline,
          four stat chips and a paragraph — about 400px of phone before the
          first question, with the step rail below the offers and the mode
          cards after that. Everything a customer needs in order to *start*
          is now above the fold, and the counts that were in the chips live
          on the sections that actually use them. */}
      <div className="relative overflow-hidden">
        {/* Faded out at the bottom rather than stopped. A wash that simply
            ends draws a hard horizontal rule across the page and puts the
            header back in its own box, which is the thing the translucency
            was for in the first place. */}
        <div
          className={`absolute inset-0 bg-gradient-to-br opacity-55 [mask-image:linear-gradient(180deg,#000_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(180deg,#000_58%,transparent_100%)] ${
            event?.heroGradient ?? 'from-plum-700 via-plum-600 to-saffron-500'
          }`}
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(routeEventId ? `/services/${routeEventId}` : '/plan')}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-white/80 text-[13px] min-h-[34px] ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-black/30"
            >
              <ArrowLeft size={14} /> {routeEventId && event ? `Back to ${event.name}` : 'Back'}
            </button>
            <p className="plan-rise inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75 ring-1 ring-white/15">
              <Sparkles size={12} className="text-saffron-300" />
              {occasionEmoji} {eventId ? occasionName : 'Live estimate'}
            </p>
          </div>

          <h1 className="plan-rise mt-2.5 text-xl sm:text-3xl font-extrabold text-white leading-[1.15] max-w-3xl" style={{ '--rise-delay': '60ms' }}>
            {eventId ? `Build your ${occasionName.toLowerCase()}` : 'Build your celebration'}{' '}
            <span className="bg-gradient-to-r from-saffron-300 via-amber-200 to-saffron-400 bg-clip-text text-transparent">
              and watch the price move.
            </span>
          </h1>
          <p className="plan-rise mt-1.5 max-w-2xl text-[12px] sm:text-sm text-white/55" style={{ '--rise-delay': '120ms' }}>
            {flow.length} quick steps · taxes included · nothing to pay to see your number.
          </p>
        </div>
      </div>

      {/* ── The journey ────────────────────────────────────────────────
          Directly under the title and sticky from there: the steps, the
          running estimate and the way on, all above the fold. See
          JourneyRail for why all three belong in one band. */}
      <JourneyRail
        steps={STEPS}
        current={step}
        flow={flow}
        done={done}
        summary={summary}
        showQuote={showQuote}
        quote={quote}
        onGoTo={goTo}
        onOpenReview={() => goTo('review')}
        primaryLabel={primaryLabel}
        onPrimary={onPrimary}
        primaryDisabled={primaryDisabled}
        primaryReady={primaryReady}
        progressPct={progressPct}
        settled={!blocked}
      />

      <div
        ref={contentRef}
        /* Clears both sticky bands — the 64px navbar and the journey rail
           under it — so the first card of a step is never delivered behind
           the navigation that just took you there. */
        className="scroll-mt-32 max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className={isReview ? 'lg:col-span-3 space-y-5' : 'lg:col-span-2 space-y-5'}>
          {step === 'occasion' && (
            <>
              <OccasionPicker
                eventId={eventId}
                onEvent={id => { setEventId(id); if (id && id !== 'other') goNext('occasion') }}
                otherText={otherOccasion}
                onOtherText={setOtherOccasion}
              />
              {event && (
                <div className="card p-5">
                  <p className="text-sm font-bold text-gray-900 mb-1">{event.emoji} {event.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{event.description}</p>
                </div>
              )}
            </>
          )}

          {step === 'scale' && (
            <TierLadder
              eventId={eventId}
              guestCount={guestCount}
              onGuestCount={handleGuestCount}
              selectedId={tierId}
              suggestedId={suggestedId}
              onSelect={handleTierSelect}
              prefilled={guestsPrefilled}
              nextLabel={nextStep?.short ?? 'Review'}
              onContinue={() => goNext('scale')}
            />
          )}

          {step === 'food' && includeCatering && (
            <MenuBuilder
              cuisineId={cuisineId}
              onCuisine={setCuisineId}
              vegOnly={vegOnly}
              onVegOnly={setVegOnly}
              menu={menu}
              onMenu={setMenu}
              menuAllowance={tier?.menuAllowance}
              specialRequests={specialRequests}
              onSpecialRequests={setSpecialRequests}
            />
          )}

          {step === 'decor' && includeDecor && (
            <DecorChooser
              levelId={decorLevelId}
              onLevel={id => { setDecorLevelId(id); setDecorTouched(true) }}
              themeId={themeId}
              onTheme={setThemeId}
              addonIds={addonIds}
              onAddons={setAddonIds}
              guestCount={guestCount}
            />
          )}

          {step === 'services' && (
            <ServicePicker
              selectedIds={serviceIds}
              onToggle={toggleService}
              serviceQty={serviceQty}
              onQty={(id, qty) => { setServicesTouched(true); setServiceQty(q => ({ ...q, [id]: qty })) }}
              guestCount={guestCount}
              includedByTier={tier?.includedServices ?? []}
              includeCatering={includeCatering}
              onIncludeCatering={setIncludeCatering}
              includeDecor={includeDecor}
              onIncludeDecor={setIncludeDecor}
              cateringTotal={quote?.catering.total ?? 0}
              decorTotal={quote?.decor.total ?? 0}
            />
          )}

          {/* Date and city live on the review, not on a build step — neither
              changes the price, and asking them first is how a pricing page
              turns back into an enquiry form. */}
          {isReview && <RewardsCard occasionName={occasionName} />}

          {isReview && (
            <ReviewBoard
              quote={showQuote ? quote : null}
              blocked={blocked}
              submitting={submitting}
              onSubmit={() => submit()}
              onEdit={goTo}
              occasionName={occasionName}
              occasionEmoji={occasionEmoji}
              mode={mode}
              cuisine={includeCatering ? cuisine : null}
              menu={menu}
              vegOnly={vegOnly}
              specialRequests={specialRequests}
              cateringOn={includeCatering}
              decorOn={includeDecor}
              offer={OFFER_BY_ID[appliedOfferId] ?? null}
              onClearOffer={() => setAppliedOfferId(null)}
              eventDate={eventDate}
              onEventDate={setEventDate}
              city={city}
              onCity={setCity}
            />
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Desktop keeps an inline pair as well as the sticky column —
              the phone gets the fixed bar below. */}
          <BuilderActionBar
            variant="inline"
            canGoBack={flowIndex > 0}
            onBack={goBack}
            primaryLabel={primaryLabel}
            onPrimary={onPrimary}
            primaryDisabled={primaryDisabled}
          />
        </div>

        {/* Desktop: the number stays beside the choices — except on review,
            which already is the number, itemised. */}
        {!isReview && (
          <div className="hidden lg:block lg:col-span-1">
            <div className="lg:sticky lg:top-36">
              <QuotePanel
                quote={showQuote ? quote : null}
                blocked={blocked}
                primaryLabel="Review everything"
                onPrimary={() => goTo('review')}
                primaryDisabled={!showQuote}
                footnote="Free to send. Nothing to pay to get a confirmed quote."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Offers, and which door ─────────────────────────────────────
          Both used to sit between the hero and the step rail, which put two
          marketing surfaces in front of the question the customer came to
          answer and pushed the navigation two screens down. They are worth
          showing — a saving does change whether somebody finishes — so they
          stay on the page, under the step they are decorating rather than
          on top of it, and both remain live at every step. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 space-y-5">
        <OffersRail
          appliedId={appliedOfferId}
          onApply={setAppliedOfferId}
          eventDate={eventDate}
          bundleSaving={showQuote && quote.bundle.applied ? quote.bundle.amount : 0}
        />

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
            How you are booking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(BOOKING_MODES).map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                style={{ '--rise-delay': `${i * 70}ms` }}
                className={`plan-rise text-left px-4 py-3.5 min-h-[76px] rounded-2xl transition-all ${
                  mode === m.id
                    ? 'bg-white shadow-lg ring-2 ring-saffron-400'
                    : 'plan-glass text-white hover:bg-white/10'
                }`}
              >
                <p className={`font-bold text-sm ${mode === m.id ? 'text-gray-900' : 'text-white'}`}>
                  {m.emoji} {m.name}
                </p>
                <p className={`text-xs mt-0.5 ${mode === m.id ? 'text-gray-500' : 'text-white/55'}`}>{m.blurb}</p>
                {m.bundleDiscount > 0 && (
                  <p className={`text-[11px] font-bold mt-1 ${mode === m.id ? 'text-emerald-700' : 'text-emerald-300'}`}>
                    Saves {Math.round(m.bundleDiscount * 100)}% against booking the same pieces separately
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* The catalogue's size, where it means something: at the bottom of
            a build, as the answer to "is this all there is?". These were
            four chips in the hero, above the first question. */}
        <p className="text-center text-[11px] text-white/35">
          {EVENT_LIST.length} occasions · {CELEBRATION_TIERS.length} scales ·{' '}
          {CUISINES.length} cuisines · {ALL_SERVICES.length} services, all priced the same way.
        </p>
      </div>

      <BuilderActionBar
        variant="fixed"
        canGoBack={flowIndex > 0}
        onBack={goBack}
        primaryLabel={primaryLabel}
        onPrimary={onPrimary}
        primaryDisabled={primaryDisabled}
        quote={isReview ? null : (showQuote ? quote : null)}
        onOpenReview={() => goTo('review')}
        hint={isReview ? 'Check it over, then send it.' : undefined}
        ready={primaryReady}
        settled={!blocked}
      />

      {tierPrompt && (
        <TierMatchDialog
          tierId={tierPrompt}
          eventId={eventId}
          currentTierId={tierId}
          guestCount={guestCount}
          nextLabel={(flow[flow.findIndex(s => s.id === 'scale') + 1] ?? {}).short ?? 'Review'}
          onConfirm={confirmTier}
          onDismiss={() => setTierPrompt(null)}
        />
      )}
    </div>
  )
}
