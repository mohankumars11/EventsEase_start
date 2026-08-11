import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Users, Palette, UtensilsCrossed, Sparkles, ListChecks, ShieldCheck, Receipt,
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
import { buildQuote, quoteToText, checkMinimums } from '../../utils/quote'
import { formatINR } from '../../utils/format'
import OccasionPicker from '../../components/plan/OccasionPicker'
import TierLadder from '../../components/plan/TierLadder'
import MenuBuilder from '../../components/plan/MenuBuilder'
import DecorChooser from '../../components/plan/DecorChooser'
import ServicePicker from '../../components/plan/ServicePicker'
import QuotePanel from '../../components/plan/QuotePanel'
import ReviewBoard from '../../components/plan/ReviewBoard'
import TierMatchDialog from '../../components/plan/TierMatchDialog'
import BuilderActionBar from '../../components/plan/BuilderActionBar'
import LockPayment from '../../components/plan/LockPayment'

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
  const [tierId, setTierId] = useState(null)
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
  const [tierTouched, setTierTouched] = useState(false)
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
   * A guest count arriving from a chip is a completed decision and opens the
   * confirmation; one arriving from the keyboard is not, and does not. Both
   * update the price immediately either way.
   */
  const handleGuestCount = useCallback((n, discrete = false) => {
    setGuestCount(n)
    if (!discrete) return
    const suggestion = tierForGuests(n)
    if (suggestion && suggestion.id !== 'bespoke') setTierPrompt(suggestion.id)
  }, [])

  const handleTierSelect = useCallback(id => {
    setTierId(id)
    setTierTouched(true)
    setTierPrompt(id)
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

      const notes = [
        quoteToText(liveQuote, { menu: state.menu, cuisine, vegOnly: state.vegOnly }),
        state.specialRequests ? `\nSPECIAL REQUESTS\n  ${state.specialRequests}` : '',
        `\nBooked as: ${BOOKING_MODES[state.mode].name}`,
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
      specialRequests, decorLevelId, themeId, addonIds, serviceIds, serviceQty, includeCatering, includeDecor, eventDate, city])

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
    setTierTouched(true); setDecorTouched(true); setServicesTouched(true)
    submit(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Sent ─────────────────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <div className="bg-cream min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={44} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Sent to a coordinator 🎉</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your {occasionName.toLowerCase()} — {tier?.name}, {guestCount} guests, menu, décor and services — is with
              our team. Nothing gets booked until you approve the confirmed quote.
            </p>
            {quote && (
              <p className="text-sm font-bold text-gray-800">
                Estimate: {formatINR(quote.range.low)} – {formatINR(quote.range.high)} incl. taxes
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

          <div className="flex flex-col gap-2 pt-2">
            <Link to="/dashboard/customer/requests" className="btn-primary text-center">Track this request</Link>
            <Link to="/services" className="text-sm font-semibold text-center text-plum-700">
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

  return (
    <div className="bg-cream min-h-screen pb-28 lg:pb-8">
      {/* Hero */}
      <div className={`bg-gradient-to-r ${event?.heroGradient ?? 'from-plum-700 via-plum-600 to-saffron-500'} text-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
          <button
            onClick={() => navigate(routeEventId ? `/services/${routeEventId}` : '/plan')}
            className="flex items-center gap-1.5 text-white/70 text-sm mb-3 min-h-[36px]"
          >
            <ArrowLeft size={15} /> {routeEventId && event ? `Back to ${event.name}` : 'Back to planning'}
          </button>
          <h1 className="text-xl sm:text-3xl font-extrabold drop-shadow">
            {eventId ? `Build your ${occasionName.toLowerCase()}` : 'Build your celebration'} — see the price as you go
          </h1>
          {/* Counts derived, never typed. Three of these numbers were already
              wrong once between writing the copy and adding a service. */}
          <p className="text-white/80 mt-1.5 text-sm max-w-2xl">
            {EVENT_LIST.length} occasions, {CELEBRATION_TIERS.length} scales, {CUISINES.length} cuisines
            and {ALL_SERVICES.length} services. Choose yours and the estimate updates on every tap — taxes
            included, nothing hidden.
          </p>
        </div>
      </div>

      {/* Which door */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(BOOKING_MODES).map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`text-left px-4 py-3 min-h-[72px] rounded-xl border-2 transition-colors ${
                mode === m.id ? 'border-plum-600 bg-plum-50' : 'border-gray-200'
              }`}
            >
              <p className="font-bold text-gray-900 text-sm">{m.emoji} {m.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.blurb}</p>
              {m.bundleDiscount > 0 && (
                <p className="text-[11px] font-bold text-green-700 mt-1">
                  Saves {Math.round(m.bundleDiscount * 100)}% against booking the same pieces separately
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step bar — scrolls sideways rather than shrinking to unreadable.
          Each chip carries what was decided there, so the bar doubles as a
          running summary and "where am I / what have I answered" needs no
          scrolling to answer. */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto flex overflow-x-auto scrollbar-hide">
          {STEPS.map(s => {
            const Icon = s.icon
            const off = !flow.some(f => f.id === s.id)
            const locked = s.id === 'review' && !showQuote
            const disabled = off || locked
            const active = step === s.id
            const complete = done[s.id]
            return (
              <button
                key={s.id}
                onClick={() => !disabled && goTo(s.id)}
                disabled={disabled}
                aria-current={active ? 'step' : undefined}
                className={`shrink-0 px-4 py-2.5 min-h-[56px] text-left border-b-2 disabled:opacity-30 ${
                  active ? 'border-saffron-500 bg-saffron-50/60' : 'border-transparent'
                } ${s.id === 'review' ? 'border-l border-l-gray-200 ml-1' : ''}`}
              >
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${
                  active ? 'text-saffron-700' : complete ? 'text-gray-700' : 'text-gray-500'
                }`}>
                  {complete && !active
                    ? <CheckCircle2 size={14} className="text-green-600" />
                    : <Icon size={14} />}
                  {s.label}
                </span>
                <span className="block text-[10px] font-medium text-gray-400 truncate max-w-[130px]">
                  {off ? 'switched off' : summary[s.id] ?? '—'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        ref={contentRef}
        className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6"
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
              guestCount={guestCount}
              onGuestCount={handleGuestCount}
              selectedId={tierId}
              suggestedId={suggestedId}
              onSelect={handleTierSelect}
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
            <div className="lg:sticky lg:top-24">
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
      />

      {tierPrompt && (
        <TierMatchDialog
          tierId={tierPrompt}
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
