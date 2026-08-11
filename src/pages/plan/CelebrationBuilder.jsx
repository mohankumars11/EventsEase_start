import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Users, Palette, UtensilsCrossed, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../context/ToastContext'
import { BRAND } from '../../config/sambramo'
import { EVENT_DATA } from '../../data/eventServicesData'
import {
  CELEBRATION_TIERS, TIER_BY_ID, BOOKING_MODES, tierForGuests,
} from '../../data/celebrationTiers'
import { CUISINE_BY_ID, defaultMenu } from '../../data/cuisineMenus'
import { buildQuote, quoteToText, checkMinimums } from '../../utils/quote'
import TierLadder from '../../components/plan/TierLadder'
import MenuBuilder from '../../components/plan/MenuBuilder'
import DecorChooser from '../../components/plan/DecorChooser'
import QuotePanel from '../../components/plan/QuotePanel'

/**
 * Build a celebration and watch the price move.
 *
 * ── Why this page exists next to the wizard and the catalog ─────────────
 * /plan/custom asks six questions and promises a call back. /services shows
 * packages with ranges four times wider than the decision they are meant to
 * support. Neither lets somebody answer the question they actually came with:
 * *what will my event cost, and what do I get.*
 *
 * This page answers it in the order a person thinks: how many are coming, what
 * are we feeding them, what should it look like — with the number visible and
 * moving the whole way down. It is the same three inputs the pricing brief
 * calls for (guest count, cuisine tier, decor level), except the cuisine tier
 * is not a tier, it is the actual menu.
 *
 * ── What it does not do ─────────────────────────────────────────────────
 * It does not take money. The brief this was built from proposes a ₹5,000
 * "refundable token to lock the price", and that is a good mechanic for a
 * marketplace with signed vendors behind every listing. Sambramo has none yet.
 * Collecting a token against a price no supplier has agreed to is a refund
 * queue with extra steps, so the call to action sends the configured
 * celebration to a coordinator instead — free, no obligation, and it lands as
 * a normal enquiry alongside every other one.
 */

// A half-built celebration waiting out a login. Session-scoped, same rule as
// the wizard's draft and the catalog's cart intent: one visit's intent, not a
// standing order to be resurrected on another device three weeks later.
const DRAFT_KEY = 'sambramo_builder_draft'

const STEPS = [
  { id: 'scale', label: 'Scale', icon: Users },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'decor', label: 'Decor', icon: Palette },
]

export default function CelebrationBuilder() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const event = eventId ? EVENT_DATA[eventId] : null

  const [step, setStep] = useState('scale')
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
  const [includeCatering, setIncludeCatering] = useState(true)
  const [includeDecor, setIncludeDecor] = useState(true)
  const [eventDate, setEventDate] = useState('')
  const [city, setCity] = useState(BRAND.pilotCities[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

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

  // The decor level follows the tier the same way, and stops on the same rule.
  const [decorTouched, setDecorTouched] = useState(false)
  useEffect(() => {
    if (decorTouched || !tier) return
    setDecorLevelId(tier.defaultDecor)
  }, [tier, decorTouched])

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
    mode, includeCatering, includeDecor,
  }), [tierId, guestCount, cuisineId, vegOnly, menu, decorLevelId, themeId, addonIds, mode, includeCatering, includeDecor])

  const blocked = useMemo(() => {
    // An unfinished configuration is not a sendable one. Catering is on by
    // default, so without this a customer could send "Special Day, 220 guests,
    // no food" to a coordinator and get a call back asking the question the
    // page was supposed to have answered.
    if (includeCatering && !cuisineId) {
      return { rule: 'cuisine', message: 'Pick a cuisine under Food and the menu fills itself in — or switch off catering above if you only want décor.' }
    }
    if (includeDecor && !decorLevelId) {
      return { rule: 'decor', message: 'Choose how much decoration you want under Décor.' }
    }
    if (!includeCatering && !includeDecor) {
      return { rule: 'empty', message: 'Turn on catering or décor — there is nothing to price yet.' }
    }
    return checkMinimums({
      mode, guestCount, decorTotal: quote?.decor.total ?? 0, includeCatering, includeDecor,
    })
  }, [mode, guestCount, quote, includeCatering, includeDecor, cuisineId, decorLevelId])

  const submit = useCallback(async (draftOverride) => {
    const state = draftOverride ?? {
      eventId, mode, guestCount, tierId, cuisineId, vegOnly, menu, specialRequests,
      decorLevelId, themeId, addonIds, includeCatering, includeDecor, eventDate, city,
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
      const notes = [
        quoteToText(liveQuote, { menu: state.menu, cuisine, vegOnly: state.vegOnly }),
        state.specialRequests ? `\nSPECIAL REQUESTS\n  ${state.specialRequests}` : '',
        `\nBooked as: ${BOOKING_MODES[state.mode].name}`,
      ].join('\n')

      const { error: err } = await supabase.from('service_enquiries').insert({
        customer_id: user.id,
        event_id:    state.eventId || 'custom',
        event_name:  EVENT_DATA[state.eventId]?.name ?? 'Custom celebration',
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
            id: 'decor', name: `Decor — ${liveQuote.decor.level.name}`, emoji: liveQuote.decor.level.emoji,
            unit_price: liveQuote.decor.total, qty: 1,
            details: { level: liveQuote.decor.level.id, theme: state.themeId, addons: state.addonIds },
          },
        ].filter(Boolean),
        packages: [{
          id: liveQuote.tier.id,
          name: `${liveQuote.tier.name} (${liveQuote.tier.localName})`,
          price_min: liveQuote.range.low,
          price_max: liveQuote.range.high,
          details: { guests: state.guestCount, estimate: liveQuote.total, perGuest: liveQuote.perGuest },
        }],
        notes,
        status: 'open',
      })
      if (err) throw err
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(friendlyError(err, 'Could not send this just now. Please try again, or message us on WhatsApp.'))
    } finally {
      setSubmitting(false)
    }
  }, [user, navigate, location, eventId, mode, guestCount, tierId, cuisineId, vegOnly, menu,
      specialRequests, decorLevelId, themeId, addonIds, includeCatering, includeDecor, eventDate, city])

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
    setMode(draft.mode); setGuestCount(draft.guestCount); setTierId(draft.tierId)
    setCuisineId(draft.cuisineId); setVegOnly(draft.vegOnly); setMenu(draft.menu)
    setSpecialRequests(draft.specialRequests ?? ''); setDecorLevelId(draft.decorLevelId)
    setThemeId(draft.themeId); setAddonIds(draft.addonIds ?? [])
    setIncludeCatering(draft.includeCatering); setIncludeDecor(draft.includeDecor)
    setEventDate(draft.eventDate ?? ''); setCity(draft.city ?? BRAND.pilotCities[0])
    setTierTouched(true); setDecorTouched(true)
    submit(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sent to a coordinator 🎉</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Your {tier?.name} for {guestCount} guests — menu, decor and all — is with our team. They will confirm
          availability and the final number with you, and nothing gets booked until you say yes to it.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/dashboard/customer/requests" className="btn-primary">Track this request</Link>
          <Link to="/services" className="text-sm font-semibold text-plum-700 hover:text-plum-800">
            Browse services &amp; packages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen">
      {/* Hero */}
      <div className={`bg-gradient-to-r ${event?.heroGradient ?? 'from-plum-700 via-plum-600 to-saffron-500'} text-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <button
            onClick={() => navigate(event ? `/services/${eventId}` : '/plan')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4"
          >
            <ArrowLeft size={15} /> {event ? `Back to ${event.name}` : 'Back to planning'}
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow">
            Build your {event ? event.name.toLowerCase() : 'celebration'} — and see the price as you go
          </h1>
          <p className="text-white/80 mt-1.5 text-sm max-w-2xl">
            Six scales from an intimate house gathering to a palace-city reception. Pick yours, choose the food dish by
            dish, choose the look — the estimate updates on every tap. Free to send, nothing to pay here.
          </p>
        </div>
      </div>

      {/* Which door */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(BOOKING_MODES).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                  mode === m.id ? 'border-plum-600 bg-plum-50' : 'border-gray-200 hover:border-gray-300'
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

          {mode === 'individual' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIncludeCatering(v => !v)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 ${
                  includeCatering ? 'bg-saffron-50 border-saffron-300 text-saffron-800' : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {includeCatering ? '✓ ' : ''}Catering
              </button>
              <button
                type="button"
                onClick={() => setIncludeDecor(v => !v)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 ${
                  includeDecor ? 'bg-saffron-50 border-saffron-300 text-saffron-800' : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {includeDecor ? '✓ ' : ''}Decor
              </button>
              <span className="text-[11px] text-gray-400 self-center">
                Single services are self-service — no dedicated coordinator, and the whole-celebration saving does not apply.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex">
          {STEPS.map(s => {
            const Icon = s.icon
            const disabled = (s.id === 'food' && !includeCatering) || (s.id === 'decor' && !includeDecor)
            return (
              <button
                key={s.id}
                onClick={() => !disabled && setStep(s.id)}
                disabled={disabled}
                className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 disabled:opacity-30 ${
                  step === s.id ? 'border-saffron-500 text-saffron-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} /> {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {step === 'scale' && (
            <TierLadder
              guestCount={guestCount}
              onGuestCount={setGuestCount}
              selectedId={tierId}
              suggestedId={suggestedId}
              onSelect={id => { setTierId(id); setTierTouched(true) }}
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

          {/* When and where — asked once, at the bottom, because neither
              changes the price and putting them first is how a pricing page
              turns back into an enquiry form. */}
          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">Date (if you know it)</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:border-saffron-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">City</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm bg-white focus:border-saffron-400 focus:outline-none"
              >
                {BRAND.pilotCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                {BRAND.pilotCities.join(' and ')} only for now — elsewhere, join the waitlist from the home page.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Forward motion on mobile, where the quote panel sits below. */}
          <div className="flex justify-between gap-3 lg:hidden">
            {step !== 'scale' && (
              <button
                onClick={() => setStep(STEPS[STEPS.findIndex(s => s.id === step) - 1].id)}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600"
              >
                Back
              </button>
            )}
            {step !== 'decor' && (
              <button
                onClick={() => setStep(STEPS[STEPS.findIndex(s => s.id === step) + 1].id)}
                className="ml-auto px-5 py-2.5 rounded-xl bg-plum-700 text-white text-sm font-bold hover:bg-plum-800"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* The number, always on screen on desktop. */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-3">
            <QuotePanel
              quote={quote}
              blocked={blocked}
              submitting={submitting}
              onSubmit={() => submit()}
            />
            {quote && (
              <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                <Layers size={11} />
                {CELEBRATION_TIERS.length} scales · {quote.tier.name} selected
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
