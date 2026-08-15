import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Users, Palette, UtensilsCrossed,
  Sparkles, ListChecks, Receipt, Gift, Pencil,
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
import { celebrationSavings } from '../../lib/savings'
import { formatINR } from '../../utils/format'
import OccasionPicker from '../../components/plan/OccasionPicker'
import JourneyRail from '../../components/plan/JourneyRail'
import OffersRail from '../../components/plan/OffersRail'
import RewardsCard from '../../components/plan/RewardsCard'
import TierLadder from '../../components/plan/TierLadder'
import MenuBuilder from '../../components/plan/MenuBuilder'
import DecorChooser from '../../components/plan/DecorChooser'
import ServicePicker from '../../components/plan/ServicePicker'
import ServiceSuggestions from '../../components/plan/ServiceSuggestions'
import QuotePanel from '../../components/plan/QuotePanel'
import ReviewBoard from '../../components/plan/ReviewBoard'
import TierMatchDialog from '../../components/plan/TierMatchDialog'
import BuilderActionBar from '../../components/plan/BuilderActionBar'
import { contactBlocked, eventDateBlocked, phoneDigitsOf } from '../../components/plan/ContactBlock'
import { slotByKey } from '../../lib/demand'
import { saveDraft, loadDraft, clearDraft } from '../../lib/draftStore'
import { noteDetail } from '../../lib/journey'
import PriceLock from '../../components/plan/PriceLock'
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
 * A half-built celebration waiting out an interruption, which is a different
 * thing entirely.
 *
 * DRAFT_KEY above is read by an effect that puts the configuration back and
 * then *submits it* — correct for its one trigger (a guest pressed send and
 * went to sign in), catastrophic for any other. Restoring that key because
 * somebody wandered back to this page would fire an enquiry at a coordinator
 * nobody asked to send.
 *
 * So the autosave gets its own key and its own restore, which only ever puts
 * the work back on screen. See lib/draftStore.
 */
const RESUME_KEY = 'sambramo_builder_resume'

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
  const { user, profile } = useAuth()

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
  const [timeSlot, setTimeSlot] = useState('')
  const [city, setCity] = useState(BRAND.pilotCities[0])
  // Who to call about this. Seeded from the profile where there is one, because
  // re-typing a name the app is already displaying in the header reads as the
  // app not listening — but it is a seed, not a lock: a celebration is often
  // arranged by one person for another, and the number to ring on the day may
  // not be the number that signed up.
  const [contact, setContact] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [enquiryId, setEnquiryId] = useState(null)
  const [lockClaimed, setLockClaimed] = useState(false)

  /**
   * The id of a request that has already been sent and is now being edited.
   *
   * ── Why this exists ─────────────────────────────────────────────────────
   * Once the confirmation screen appeared there was no way back into the
   * plan at all — the only exits were "Track this celebration" and a link to
   * the services catalogue. Somebody who noticed the wrong guest count a
   * second after pressing send had to rebuild all six steps in an empty
   * builder, and the coordinator would then hold two unrelated enquiries
   * with nothing to say which one the customer meant.
   *
   * The whole configuration is still in component state here, so "change
   * something" is a step change rather than a reload: every answer is
   * already on screen and any of them can be edited before re-sending.
   *
   * ── Why a revision replaces rather than edits in place ──────────────────
   * The obvious implementation is `UPDATE service_enquiries SET …`. The
   * database refuses it. `enforce_enquiry_self_update` (migrations 013/034)
   * is a BEFORE UPDATE trigger that allows a customer exactly two things —
   * claim the price lock, or move an `open` request to `cancelled` — and
   * raises on any statement that touches `services`, `packages`,
   * `event_date` or `event_name`. An in-place edit would therefore fail for
   * every customer, every time, and surface as "could not send this just
   * now" at the end of a six-step form.
   *
   * That trigger is right, and working around it with a migration that lets
   * customers rewrite sent enquiries would be the wrong fix: the row is what
   * a coordinator is working from, and it should not change under them
   * silently. So a revision does what the trigger already permits — send the
   * corrected plan as a new request, then cancel the superseded one, with
   * each pointing at the other in `notes`.
   *
   * New request first, cancel second, and the cancel is best-effort. The
   * other order risks a cancelled request and a failed insert, which is the
   * one outcome where the customer ends up with nothing.
   */
  const [revisingId, setRevisingId] = useState(null)
  // Whether the confirmation screen is reporting a first send or an edit.
  // `revisingId` is cleared on success, so it cannot answer this — and a
  // screen that says "Sent to a coordinator" after an update would leave the
  // customer wondering whether they have just raised a duplicate.
  const [wasRevision, setWasRevision] = useState(false)

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

  // Seed the contact from the profile once it arrives, without ever overwriting
  // something the customer has already typed.
  useEffect(() => {
    if (!profile) return
    setContact(c => ({
      name:  c.name  || profile.full_name || '',
      phone: c.phone || (profile.phone ?? '').replace('+91', '').replace(/\D/g, '').slice(-10),
      email: c.email || profile.email || '',
    }))
  }, [profile])

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

  /**
   * What booking it all together is worth, in rupees.
   *
   * Not `quote.bundle.amount`. That is the discount line, and it understates
   * the saving: the discount comes off before the platform fee and before tax
   * is applied to the components, so both shrink with it. lib/savings prices
   * the identical configuration under both booking modes and subtracts, which
   * is the only way to get the real figure — and it stays right if the order
   * of operations in the quote engine ever changes.
   *
   * Carries `active`, because on the single-service door the same number is an
   * argument for switching rather than a saving already earned.
   */
  const savings = useMemo(() => celebrationSavings({
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
    const minimums = checkMinimums({
      mode, guestCount, decorTotal: quote?.decor.total ?? 0, includeCatering, includeDecor,
    })
    if (minimums) return minimums
    // Then the date. Ahead of the contact block because it is a fact about the
    // celebration rather than about the person, and because it is the one
    // answer without which none of the follow-up works: a coordinator cannot
    // check who is free, cannot price a peak weekend, and cannot hold anything.
    const dateMessage = eventDateBlocked(eventDate)
    if (dateMessage) return { rule: 'date', message: dateMessage }
    // Last, because it is the only rule about the customer rather than the
    // configuration — and because a contact prompt raised before the quote is
    // even valid is answering a question nobody has reached yet.
    const contactMessage = contactBlocked(contact)
    if (contactMessage) return { rule: 'contact', message: contactMessage }
    return null
  }, [eventId, otherOccasion, mode, guestCount, quote, includeCatering, includeDecor, cuisineId, decorLevelId, serviceIds, eventDate, contact])

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
      appliedOfferId, contact, timeSlot,
      // Carried into the enquiry so the recommender can tell a customer's
      // choice from our own pre-tick. See the `picked_by` stamp below. It
      // rides in `state` rather than being read from the closure so that it
      // survives the sessionStorage draft round-trip with everything else.
      servicesTouched,
    }
    const liveQuote = buildQuote(state)
    if (!liveQuote) return

    // Re-checked against the state actually being submitted, not against the
    // render that drew the button. A restored draft goes straight through
    // `submit(draft)` without passing the disabled check on the review screen,
    // so this is the only place the guarantee can actually be made.
    const dateMessage = eventDateBlocked(state.eventDate)
    if (dateMessage) {
      setStep('review')
      setError(dateMessage)
      return
    }

    const contactMessage = contactBlocked(state.contact)
    if (contactMessage) {
      setStep('review')
      setError(contactMessage)
      return
    }

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

      // The contact goes at the TOP of the note, not the bottom. A coordinator
      // opens this on a phone at 9am with thirty of them to work through, and
      // the number they have to call should not be under an itemised menu.
      const phone = `+91${phoneDigitsOf(state.contact?.phone)}`
      const slot = slotByKey(state.timeSlot)
      const contactLines = [
        'CONTACT',
        `  Name:  ${state.contact?.name?.trim()}`,
        `  Phone: ${phone}`,
        state.contact?.email?.trim() ? `  Email: ${state.contact.email.trim()}` : '',
        // No "date not fixed" fallback any more: nothing reaches this line
        // without one, because eventDateBlocked() above refuses to submit
        // without one. A fallback for an impossible case is a lie waiting for
        // the day somebody removes the gate.
        `  When:  ${state.eventDate}${slot ? ` · ${slot.label} (${slot.hint})` : ''}`,
        `  Where: ${state.city}`,
      ].filter(Boolean).join('\n')

      const notes = [
        contactLines,
        '',
        quoteToText(liveQuote, { menu: state.menu, cuisine, vegOnly: state.vegOnly }),
        state.specialRequests ? `\nSPECIAL REQUESTS\n  ${state.specialRequests}` : '',
        `\nBooked as: ${BOOKING_MODES[state.mode].name}`,
        offerIsValid ? offerToNote(offer) : '',
        // Stamped in the notes because that is the field a coordinator
        // actually reads on their phone, and it names the reference they
        // will already have in their list.
        revisingId
          ? `\nREVISED BY THE CUSTOMER on ${new Date().toLocaleString('en-IN')} — this replaces SR-${revisingId.slice(0, 8).toUpperCase()}, which has been cancelled. Re-read the whole plan above; do not work from the earlier one.`
          : '',
      ].join('\n')

      // Only columns that exist before migration 034 go in this insert. The
      // lock fields are written by a separate, best-effort update below, so a
      // migration that has not been applied yet costs the customer a payment
      // option — never their enquiry.
      //
      // The contact rides in `location` (JSONB) and in `notes` because
      // `service_enquiries` has no contact columns on the live database today.
      // That is the same place the enquiry cart has always put it, so one admin
      // screen reads both. Migration 041 adds real columns; until it is applied
      // by hand these two are the storage, and after it is applied they are
      // still written, so nothing has to be backfilled to stay readable.
      // One payload, written by either path. A revision updates the row the
      // customer is editing; anything else inserts a new one. Splitting the
      // payload between the two would be the obvious way to end up with a
      // revised enquiry that quietly stopped carrying, say, `packages`.
      const payload = {
        customer_id: user.id,
        event_id:    state.eventId || 'custom',
        event_name:  name,
        event_date:  state.eventDate || null,
        start_time:  slot?.start ?? null,
        guest_count: state.guestCount,
        location: {
          city:  state.city,
          slot:  state.timeSlot || null,
          name:  state.contact?.name?.trim() || null,
          phone,
          email: state.contact?.email?.trim() || null,
        },
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
          // ── `picked_by`, and why a recommender needs it ────────────────
          // The tier pre-ticks its own service list the moment a scale is
          // chosen, so an enquiry from somebody who never opened this step
          // records OUR suggestion, not their decision. Counting those as
          // evidence would teach the recommender its own prior back — it
          // would "learn" that photography goes with videography because we
          // ticked both, and every measurement would confirm the guess it was
          // supposed to correct.
          //
          // `servicesTouched` is already tracked here to stop the tier from
          // overwriting an edited list, and it answers exactly the right
          // question: has a human been through this list at all. Stamping it
          // per line rather than per enquiry keeps the distinction readable
          // even if a future step lets one service be edited without the
          // others. get_service_cobooking_counts() (migration 043) counts
          // only the 'customer' ones.
          ...liveQuote.services.map(({ service, qty, amount }) => ({
            id: service.id, name: service.name, emoji: service.emoji,
            unit_price: service.base, qty,
            details: {
              unit: service.unit,
              amount,
              picked_by: state.servicesTouched ? 'customer' : 'tier',
            },
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
      }

      const { data, error: err } = await supabase
        .from('service_enquiries').insert(payload).select('id').single()
      if (err) throw err

      // Retire the superseded request, now that its replacement is safely
      // stored. `status: 'open' → 'cancelled'` with nothing else touched is
      // precisely the one edit enforce_enquiry_self_update() permits a
      // customer, so this is the supported path and not a workaround of the
      // trigger.
      //
      // Best-effort, and deliberately so: the customer's corrected plan is
      // already saved by this point. A coordinator seeing one stale open
      // request that says which enquiry replaced it is a far better failure
      // than an error thrown over a request that did in fact go through.
      if (revisingId) {
        const { error: cancelErr } = await supabase.from('service_enquiries')
          .update({ status: 'cancelled' })
          .eq('id', revisingId).eq('customer_id', user.id).eq('status', 'open')
        if (cancelErr) {
          console.warn('Superseded enquiry not cancelled:', cancelErr.message)
        }
      }

      // With a coordinator now holding this, the work is finished rather than
      // paused — home must stop offering to "finish" it.
      clearDraft(RESUME_KEY)

      setEnquiryId(data.id)
      setWasRevision(!!revisingId)
      setRevisingId(null)
      setStep('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(friendlyError(err, 'Could not send this just now. Please try again, or message us on WhatsApp.'))
    } finally {
      setSubmitting(false)
    }
  }, [user, navigate, location, eventId, otherOccasion, mode, guestCount, tierId, cuisineId, vegOnly, menu,
      specialRequests, decorLevelId, themeId, addonIds, serviceIds, serviceQty, includeCatering, includeDecor,
      eventDate, city, appliedOfferId, contact, timeSlot, servicesTouched, revisingId])

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

  /**
   * Autosave, and tell the journey what has been built so far.
   *
   * Keyed off the occasion: before one is chosen there is nothing but
   * defaults on screen — a guest count of 120 and a tier that followed it —
   * and saving that would have home offering to restore a page the customer
   * never actually engaged with.
   *
   * `step` rides along so returning lands on the node they were on rather than
   * back at the occasion picker, which for this flow is most of the point.
   */
  useEffect(() => {
    if (!eventId || step === 'done') return
    saveDraft(RESUME_KEY, {
      step,
      eventId, otherOccasion, mode, guestCount, tierId, cuisineId, vegOnly, menu, specialRequests,
      decorLevelId, themeId, addonIds, serviceIds, serviceQty, includeCatering, includeDecor,
      eventDate, city, appliedOfferId, contact, timeSlot, servicesTouched,
      // Carried so an interrupted revision resumes as a revision. Without it,
      // somebody who edits a sent request, wanders off and comes back through
      // the resume prompt would send the corrected plan as a second request
      // and leave the original one open — the exact duplicate this flow
      // exists to prevent, reintroduced by the recovery path.
      revisingId,
    })
    noteDetail(`${occasionName} · ${guestCount} guests`)
  }, [step, eventId, otherOccasion, mode, guestCount, tierId, cuisineId, vegOnly, menu,
      specialRequests, decorLevelId, themeId, addonIds, serviceIds, serviceQty,
      includeCatering, includeDecor, eventDate, city, appliedOfferId, contact, timeSlot,
      servicesTouched, occasionName, revisingId])

  /**
   * Put it back after an interruption — and only put it back.
   *
   * The contrast with the effect below is the whole reason this is separate
   * code: that one restores and sends, this one restores and stops. It also
   * leaves the draft in place, because being interrupted twice is normal.
   *
   * Skipped when the URL names a different occasion: `/plan/build/wedding` is
   * somebody starting a wedding, and answering that with last hour's abandoned
   * birthday is the app overruling a choice just made in front of it.
   */
  useEffect(() => {
    const draft = loadDraft(RESUME_KEY)
    if (!draft?.eventId) return
    if (routeEventId && routeEventId !== draft.eventId) return

    setEventId(draft.eventId); setOtherOccasion(draft.otherOccasion ?? '')
    setMode(draft.mode); setGuestCount(draft.guestCount); setTierId(draft.tierId)
    setCuisineId(draft.cuisineId); setVegOnly(draft.vegOnly); setMenu(draft.menu ?? {})
    setSpecialRequests(draft.specialRequests ?? ''); setDecorLevelId(draft.decorLevelId)
    setThemeId(draft.themeId); setAddonIds(draft.addonIds ?? [])
    setServiceIds(draft.serviceIds ?? []); setServiceQty(draft.serviceQty ?? {})
    setIncludeCatering(draft.includeCatering); setIncludeDecor(draft.includeDecor)
    setEventDate(draft.eventDate ?? ''); setCity(draft.city ?? BRAND.pilotCities[0])
    setTimeSlot(draft.timeSlot ?? '')
    setContact(draft.contact ?? { name: '', phone: '', email: '' })
    setAppliedOfferId(draft.appliedOfferId ?? null)
    // The same three "the customer has been here" flags the login restore sets:
    // without them the tier ladder, the décor chooser and the service shelf
    // treat a restored configuration as untouched and re-apply their defaults
    // over the top of it.
    setTierTouched(true); setDecorTouched(true); setServicesTouched(!!draft.servicesTouched)
    setRevisingId(draft.revisingId ?? null)
    if (draft.step) setStep(draft.step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setTimeSlot(draft.timeSlot ?? '')
    setContact(draft.contact ?? { name: '', phone: '', email: '' })
    setAppliedOfferId(draft.appliedOfferId ?? null)
    setTierTouched(true); setDecorTouched(true); setServicesTouched(true)
    submit(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /**
   * Reopen a sent request at question one, with every answer still on it.
   *
   * No refetch and no reload: the configuration never left component state,
   * so this is a step change. `revisingId` is what turns the next send into
   * an update of this row rather than a second enquiry, and the autosave
   * effect starts writing again by itself the moment `step` stops being
   * 'done' — so an interruption mid-revision is recoverable like any other.
   */
  const reviseFromStart = useCallback(() => {
    setRevisingId(enquiryId)
    setStep(flow[0]?.id ?? 'occasion')
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [enquiryId, flow])

  /* ── Sent ─────────────────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <div className="plan-canvas min-h-screen pb-bottom-nav">
        <div className="mx-auto max-w-lg space-y-5 px-4 py-10">
          <div className="plan-rise text-center space-y-3">
            <div className="w-20 h-20 bg-emerald-400/15 ring-1 ring-emerald-400/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={44} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-ink">
              {wasRevision ? 'Your changes are in 🎉' : 'Sent to a coordinator 🎉'}
            </h2>
            <p className="text-ink-mute text-sm leading-relaxed">
              {wasRevision
                ? <>Your corrected {occasionName.toLowerCase()} — {tier?.name}, {guestCount} guests, menu, décor and services — is with our team, and the earlier request has been cancelled so nobody works from it. Note the new reference below. Nothing gets booked until you approve the confirmed quote.</>
                : <>Your {occasionName.toLowerCase()} — {tier?.name}, {guestCount} guests, menu, décor and services — is with our team. Nothing gets booked until you approve the confirmed quote.</>}
            </p>
            {quote && (
              <p className="plan-glass inline-block rounded-xl px-4 py-2 text-sm font-bold text-ink">
                {formatINR(quote.range.low)} – {formatINR(quote.range.high)} incl. taxes
              </p>
            )}
            {/* Read the number back. A wrong digit is the one failure this
                flow cannot recover from on its own, and the only moment the
                customer can still catch it is now, while they remember
                typing it. */}
            <p className="text-xs text-ink-mute">
              Reference <span className="font-mono font-bold text-ink-soft">
                SR-{enquiryId?.slice(0, 8)?.toUpperCase()}
              </span>
              {contact.phone && <> · we'll call <span className="font-bold text-ink-soft">+91 {phoneDigitsOf(contact.phone)}</span></>}
            </p>
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

          <PriceLock
            reference={enquiryId}
            quote={quote}
            claimed={lockClaimed}
            onClaim={claimLock}
            onSkip={() => navigate('/dashboard/customer/events')}
            whatsappText={`Hi Sambramo, I'd like to hold my quote (ref ${enquiryId?.slice(0, 8)?.toUpperCase() ?? ''}) — ${tier?.name ?? ''} for ${guestCount} guests.`}
          />

          <RewardsCard occasionName={occasionName} />

          {/* ── Change it ────────────────────────────────────────────
              The way back into the plan, and the reason it is here rather
              than only in a WhatsApp thread: the second after pressing send
              is exactly when somebody spots the wrong guest count, and until
              now this screen had no route back at all. The two exits were
              "track this" and the services catalogue, so the only way to
              correct a digit was to rebuild all six steps from an empty
              builder — and the coordinator would then hold two enquiries
              with nothing to say which one was meant.

              Every answer is still in component state, so this is a step
              change rather than a reload: the builder reopens at question
              one with the whole plan filled in, anything can be edited, and
              re-sending updates this same request instead of raising a
              second one. */}
          {/* Not offered once the price lock is paid. That ₹1,000 was taken
              against this specific quote, and replacing the enquiry it is
              attached to would strand the payment on a cancelled request.
              Changing a locked plan is a conversation, and the WhatsApp
              thread on the card above is where it belongs. */}
          {!lockClaimed && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-hairline/[0.08]">
              <p className="text-[13px] font-extrabold text-ink">Need to change something?</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">
                Nothing is booked yet. Go back through it from the start — every answer
                is still here — and send us the corrected plan. We'll cancel this one so
                your coordinator only ever works from the latest.
              </p>
              <button
                type="button"
                onClick={reviseFromStart}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-surface-sunk/[0.07] py-3 text-[13px] font-extrabold text-ink ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.1]"
              >
                <Pencil size={14} strokeWidth={2.6} />
                Start again from the beginning
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {/* My celebrations, not My requests. It is the screen the bottom
                bar's own tab goes to, and since lib/celebrations.js it shows
                this enquiry alongside everything else the customer has asked
                for — which is what "track this" has to mean. */}
            <Link to="/dashboard/customer/events" className="btn-primary text-center">Track this celebration</Link>
            <Link to="/services" className="text-sm font-semibold text-center text-saffron-700">
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
  // A revision says so on the button. "Get this confirmed" on a request that
  // is already with a coordinator reads as sending a second one, which is
  // the exact fear this flow exists to remove.
  const primaryLabel = isReview
    ? (submitting ? 'Sending…' : (revisingId ? 'Send corrected plan' : 'Get this confirmed'))
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

  // Clearance for TWO stacked things, not one: the tab bar (measured, via
  // --bottom-nav-h) plus BuilderActionBar floating above it (~5rem). The old
  // `pb-36` was a flat 144px guess that came up ~56px short on a notched
  // phone, so this page's last line sat under its own submit bar — while the
  // `done` branch above used pb-bottom-nav and disagreed with it.
  return (
    <div className="plan-canvas min-h-screen pb-[calc(var(--bottom-nav-h,4.25rem)+5rem)] lg:pb-8">
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
          className={`absolute inset-0 bg-gradient-to-br opacity-[0.16] [mask-image:linear-gradient(180deg,#000_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(180deg,#000_58%,transparent_100%)] ${
            event?.heroGradient ?? 'from-plum-700 via-plum-600 to-saffron-500'
          }`}
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(routeEventId ? `/services/${routeEventId}` : '/plan')}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-ink-soft text-[13px] min-h-[34px] ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.06]"
            >
              <ArrowLeft size={14} /> {routeEventId && event ? `Back to ${event.name}` : 'Back'}
            </button>
            <p className="plan-rise inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft ring-1 ring-hairline/10">
              <Sparkles size={12} className="text-saffron-300" />
              {occasionEmoji} {eventId ? occasionName : 'Live estimate'}
            </p>
          </div>

          <h1 className="plan-rise mt-2.5 text-xl sm:text-3xl font-extrabold text-ink leading-[1.15] max-w-3xl" style={{ '--rise-delay': '60ms' }}>
            {eventId ? `Build your ${occasionName.toLowerCase()}` : 'Build your celebration'}{' '}
            <span className="bg-gradient-to-r from-saffron-600 via-amber-600 to-chilli-600 bg-clip-text text-transparent">
              and watch the price move.
            </span>
          </h1>
          <p className="plan-rise mt-1.5 max-w-2xl text-[12px] sm:text-sm text-ink-mute" style={{ '--rise-delay': '120ms' }}>
            {flow.length} quick steps · taxes included · nothing to pay to see your number.
          </p>

          {/* ── Editing a request that has already gone out ────────────
              Without this the builder is indistinguishable from a fresh
              one, and somebody halfway through a revision has no way to
              tell whether they are about to update their request or raise
              a second. It names the reference so the thing on screen and
              the thing in their inbox are visibly the same request. */}
          {revisingId && (
            <div className="plan-rise mt-3 flex items-start gap-2.5 rounded-2xl bg-saffron-400/15 px-3.5 py-2.5 ring-1 ring-saffron-400/40">
              <Pencil size={14} className="mt-0.5 shrink-0 text-saffron-700" strokeWidth={2.6} />
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                <span className="font-extrabold text-ink">Editing your sent request</span>
                {' '}(SR-{revisingId.slice(0, 8).toUpperCase()}). Change anything you like —
                when you send, that one is cancelled and your coordinator works from the
                corrected plan only.
              </p>
            </div>
          )}
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
            <div className="space-y-4">
              {/* Above the list, because a suggestion on a row nobody scrolls
                  to is not a suggestion. See ServiceSuggestions. */}
              <ServiceSuggestions
                occasion={eventId}
                occasionName={occasionName}
                chosenIds={serviceIds}
                guestCount={guestCount}
                quoteTotal={quote?.total ?? 0}
                onAdd={toggleService}
              />
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
            </div>
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
              revising={!!revisingId}
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
              timeSlot={timeSlot}
              onTimeSlot={setTimeSlot}
              city={city}
              onCity={setCity}
              contact={contact}
              onContact={setContact}
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
                savings={showQuote ? savings : null}
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
          // The real figure, not the discount line — see the `savings` memo.
          // The rail was understating what booking together is worth by the
          // platform fee and the tax that shrink along with it.
          bundleSaving={showQuote && savings?.active ? savings.total : 0}
        />

        {/* ── The two doors ───────────────────────────────────────────
            These were a pair of radio buttons wearing the clothes of a
            navigation choice, and "Just one thing" was the broken half of
            it: tapping it set `mode` to `individual`, which removed the 10%
            bundle from the estimate and changed nothing else. The customer
            was still standing in a six-step builder that asks which
            occasion they are planning, how many guests, which cuisine and
            which décor level — for a cook on Sunday. Nothing moved, nothing
            navigated, and there was no way from here to actually book one
            service.

            The app has had the right shelf for that all along, and it is
            the "Need just one thing?" section on /plan — the one that says
            in its own words that you don't have to book a whole
            celebration, and lists every service bookable on its own. So
            this half is a door to exactly that, by hash: ScrollRestoration
            already listens for `#` targets, and `services-heading` is the
            id the shelf's own aria-labelledby points at, so the customer
            lands on the shelf rather than at the top of /plan with the
            thing they asked for somewhere below the fold.

            The other half stays a button, because the whole celebration is
            not somewhere else: it is this page. Pressing it confirms the
            mode and carries you back up to the step you are on, which is
            the honest answer to "take me to the whole thing" when you are
            already inside it. */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            What are you booking?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('full')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              aria-pressed={mode === 'full'}
              className={`plan-rise text-left px-4 py-3.5 min-h-[76px] rounded-2xl transition-all ${
                mode === 'full'
                  ? 'bg-white shadow-lg ring-2 ring-saffron-400'
                  : 'plan-glass text-ink hover:bg-surface-sunk/[0.08]'
              }`}
            >
              <p className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                {BOOKING_MODES.full.emoji} {BOOKING_MODES.full.name}
                {mode === 'full' && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-saffron-400/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-saffron-700">
                    <Check size={10} strokeWidth={3} /> You're here
                  </span>
                )}
              </p>
              <p className="text-xs mt-0.5 text-gray-500">{BOOKING_MODES.full.blurb}</p>
              <p className="text-[11px] font-bold mt-1 text-emerald-700">
                Saves {Math.round(BOOKING_MODES.full.bundleDiscount * 100)}% against booking the same pieces separately
              </p>
            </button>

            <Link
              to="/plan#services-heading"
              style={{ '--rise-delay': '70ms' }}
              className="plan-rise plan-glass group flex min-h-[76px] flex-col justify-center rounded-2xl px-4 py-3.5 text-left text-ink transition-all hover:bg-surface-sunk/[0.08]"
            >
              <p className="flex items-center gap-1.5 font-bold text-sm text-ink">
                {BOOKING_MODES.individual.emoji} {BOOKING_MODES.individual.name}
                <ArrowRight size={14} className="ml-auto shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="text-xs mt-0.5 text-ink-mute">{BOOKING_MODES.individual.blurb}</p>
              <p className="mt-1 text-[11px] font-bold text-accent">
                Takes you to “Need just one thing?”
              </p>
            </Link>
          </div>
        </div>

        {/* The catalogue's size, where it means something: at the bottom of
            a build, as the answer to "is this all there is?". These were
            four chips in the hero, above the first question. */}
        <p className="text-center text-[11px] text-ink-mute">
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
