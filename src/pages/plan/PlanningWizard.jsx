import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Sparkles, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EVENT_TYPES, BUDGET_OPTIONS, SERVICE_CATEGORIES, BRAND } from '../../config/sambramo'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../context/ToastContext'
import { isLiveCity, LIVE_CITIES } from '../../config/cities'
import { useCity } from '../../context/CityContext'
import ComingSoonCity from '../../components/common/ComingSoonCity'
import SambramoLogo from '../../components/ui/SambramoLogo'
import EventDateSheet from '../../components/plan/EventDateSheet'
import { useDateInterest } from '../../hooks/useDateDemand'
import { interestForDate, slotByKey, daysBetween } from '../../lib/demand'
import { todayISO } from '../../utils/format'

const TOTAL_STEPS = 6

const STEPS = [
  { title: 'What are you celebrating?',  sub: 'Every celebration is unique. Tell us what you have in mind.' },
  { title: 'When is the big day?',        sub: 'Give us the date so we can start planning early.' },
  { title: 'Where will it happen?',       sub: 'Help us find the right vendors in your area.' },
  { title: 'How many guests?',            sub: 'Knowing your guest count helps us get accurate quotes.' },
  { title: 'What do you need?',           sub: "Select all services you need. We'll handle the rest." },
  { title: 'Budget & contact',            sub: 'Your details stay private — only our team contacts you.' },
]

const GUEST_PRESETS = [
  { label: 'Intimate', range: '10–30',   value: '20',  emoji: '🤍' },
  { label: 'Small',    range: '30–75',   value: '50',  emoji: '💛' },
  { label: 'Medium',   range: '75–150',  value: '100', emoji: '🧡' },
  { label: 'Large',    range: '150–300', value: '200', emoji: '❤️' },
  { label: 'Grand',    range: '300+',    value: '350', emoji: '💜' },
]

const VENUE_OPTIONS = [
  { label: 'At home',            emoji: '🏠' },
  { label: 'Party hall',         emoji: '🏛️' },
  { label: 'Restaurant',         emoji: '🍽️' },
  { label: 'Resort / farmhouse', emoji: '🌿' },
  { label: 'Outdoor space',      emoji: '🌳' },
  { label: 'Not decided yet',    emoji: '💭' },
]

// Days until the event. Parsed field by field via demand.js rather than with
// `new Date('2026-11-22')`, which is read as UTC midnight and so counts a day
// short anywhere east of Greenwich — all of India included.
function daysUntil(dateStr) {
  if (!dateStr) return null
  return daysBetween(todayISO(), dateStr)
}

// Where a guest's half-finished answers wait while they sign in. Session
// scoped rather than localStorage: this is one visit's work in progress, not
// something to resurrect on a laptop three weeks later.
const DRAFT_KEY = 'sambramo_plan_draft'

export default function PlanningWizard() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { city: chosenCity, chosen: cityChosen } = useCity()

  const [step, setStep]         = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)
  const [animating, setAnimating] = useState(false)
  const [dateSheetOpen, setDateSheetOpen] = useState(false)

  // The landing page's eight budget chips navigate here as
  // `/plan?budget=<label>`, and its festival cards add `?festival=<id>`.
  // Only `type` was ever read, so a visitor who picked a budget bracket
  // watched that choice vanish and had to make it again at step 6 — the
  // exact re-work the pre-selection existed to avoid.
  const presetBudget = BUDGET_OPTIONS.find(b => b.label === searchParams.get('budget'))
  const presetFestival = searchParams.get('festival')

  /**
   * Services chosen before arriving here.
   *
   * The plan hub now lets somebody pick individual services — a cook, a
   * decorator, a photographer — without committing to an occasion, and sends
   * them here to turn that into a request. Those picks arrive as
   * `?services=Personal Cooks,Theme Decoration`.
   *
   * Names, not catalogue ids, because `form.services` is a list of display
   * strings that gets written to the enquiry and read by a human coordinator.
   * Passing `cooks,decor` would have stored two slugs nobody outside the
   * codebase can interpret.
   *
   * Anything not in SERVICE_CATEGORIES still round-trips: step 5 renders the
   * extras as their own group (see "Already chosen" there), so a customer can
   * always see and remove what they arrived with.
   */
  const presetServices = (searchParams.get('services') ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const [form, setForm] = useState({
    event_type:        searchParams.get('type') || '',
    // The home screen's plan card and the floating date badge both link here
    // with the day already chosen, so somebody who picked a Saturday on the
    // front door does not have to find it again.
    event_date:        searchParams.get('date') || '',
    start_time:        '',
    // Time of day as a bucket the customer actually thinks in. start_time and
    // end_time are derived from it at submit so everything already reading
    // those columns keeps working.
    time_slot:         searchParams.get('slot') || '',
    flexible_date:     false,
    date_window_days:  null,
    /**
     * The chosen city wins over the profile's.
     *
     * `profile.city` is whatever was captured at signup and may be months
     * old; the picker is a deliberate statement the customer made in this
     * app, possibly seconds ago, and it is what every other screen is
     * currently showing them. Making them re-select it here — on a wizard
     * step that blocks progress until a live city is chosen — is asking a
     * question the app bar above already displays the answer to.
     *
     * Gated on `chosen` so an unpicked fallback never silently becomes the
     * customer's stated event city.
     */
    city:              (cityChosen ? chosenCity : '') || profile?.city || '',
    style_preference:  '',
    guest_count:       '',
    services:          presetServices,
    budget_text:       presetBudget?.label ?? '',
    budget_min:        presetBudget?.min ?? null,
    budget_max:        presetBudget?.max ?? null,
    customer_name:     profile?.full_name || '',
    customer_phone:    profile?.phone?.replace('+91', '') || '',
    customer_email:    profile?.email || '',
    // Carry the festival through so the coordinator sees which one this
    // request came from instead of a bare "Festival" event type.
    special_requirements: presetFestival
      ? `Festival: ${presetFestival.replace(/-/g, ' ')}`
      : '',
  })

  // Put a guest's answers back after they have signed in.
  //
  // Runs before the profile prefill below can matter, and clears the draft
  // immediately so a later visit in the same tab starts clean rather than
  // reopening someone's last request. Restoring the step too means they land
  // on the review screen they were already looking at, not back at step 1.
  useEffect(() => {
    if (!user) return
    let draft
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      draft = JSON.parse(raw)
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      return
    }
    if (draft?.form) setForm(f => ({ ...f, ...draft.form }))
    if (draft?.step) setStep(draft.step)
  }, [user])

  // Pre-fill from profile when it loads
  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        customer_name:  f.customer_name  || profile.full_name || '',
        customer_phone: f.customer_phone || profile.phone?.replace('+91', '') || '',
        customer_email: f.customer_email || profile.email || '',
        city:           f.city           || profile.city  || '',
      }))
    }
  }, [profile])

  // Auto-advance step 1 if type pre-selected from URL
  useEffect(() => {
    if (searchParams.get('type') && step === 1) {
      setTimeout(() => goNext(), 600)
    }
  }, [])

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })) }

  // Selected services with no chip of their own in SERVICE_CATEGORIES —
  // i.e. anything that arrived from the plan hub's wider catalogue.
  const CHIP_SERVICES = new Set(SERVICE_CATEGORIES.flatMap(c => c.services))
  const extraServices = form.services.filter(s => !CHIP_SERVICES.has(s))

  function toggleService(svc) {
    setForm(f => ({
      ...f,
      services: f.services.includes(svc)
        ? f.services.filter(s => s !== svc)
        : [...f.services, svc],
    }))
  }

  // An Indian mobile number is 10 digits starting 6–9. The old check was
  // just `!!form.customer_phone`, so a single stray digit passed and the
  // request was saved as "+915". For a business whose entire promise is
  // "a coordinator will call you", an unreachable number isn't a
  // validation nicety — it's a lead that can never be served.
  const phoneDigits = form.customer_phone.replace(/\D/g, '').slice(-10)
  const phoneValid  = /^[6-9]\d{9}$/.test(phoneDigits)
  const emailValid  = !form.customer_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())
  const nameValid   = form.customer_name.trim().length >= 2

  function canNext() {
    if (step === 1) return !!form.event_type
    // Both, not just the date. A request that says "the 22nd" without saying
    // morning or evening cannot be quoted without a phone call first.
    if (step === 2) return !!form.event_date && !!form.time_slot
    if (step === 3) return isLiveCity(form.city)
    if (step === 4) return !!form.guest_count
    if (step === 5) return true
    if (step === 6) return nameValid && phoneValid && emailValid && !!form.budget_text
    return true
  }

  function goNext() {
    if (!canNext() || animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setError(null)
      setAnimating(false)
    }, 200)
  }

  function goBack() {
    if (step === 1 || animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s - 1)
      setError(null)
      setAnimating(false)
    }, 150)
  }

  const selectedType = EVENT_TYPES.find(et => et.id === form.event_type)
  const days         = daysUntil(form.event_date)

  const { interestByDate } = useDateInterest(form.city || null)
  const interestCtx = useMemo(
    () => ({ interestByDate, city: form.city }),
    [interestByDate, form.city],
  )
  const dateInfo = form.event_date ? interestForDate(form.event_date, interestCtx) : null

  async function handleSubmit() {
    if (!canNext() || submitting) return

    // A guest has just filled in six steps. Rather than lose that, park it
    // and send them to sign in — LoginPage already knows how to resume a
    // `from` location, and the effect above puts the answers back.
    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }))
      } catch {
        // Storage unavailable — sign-in still works, the answers are just
        // not recoverable, so don't block the flow on it.
      }
      // Must be '/plan/custom', not '/plan'. Sending them back to the hub
      // would mean this component never remounts, the restore effect above
      // never runs, and six steps of answers look lost.
      navigate('/login', {
        state: { from: { pathname: '/plan/custom', search: searchParams.toString() ? `?${searchParams}` : '' } },
      })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const slot = slotByKey(form.time_slot)

      const payload = {
        event_type:           form.event_type,
        event_date:           form.event_date || null,
        start_time:           slot?.start ?? form.start_time ?? null,
        end_time:             slot?.end ?? null,
        time_slot:            form.time_slot || null,
        flexible_date:        !!form.flexible_date,
        date_window_days:     form.flexible_date ? (form.date_window_days ?? null) : null,
        city:                 form.city,
        style_preference:     form.style_preference || null,
        guest_count:          parseInt(form.guest_count) || null,
        budget_text:          form.budget_text,
        budget_min:           form.budget_min,
        budget_max:           form.budget_max,
        customer_name:        form.customer_name,
        customer_phone:       form.customer_phone.startsWith('+')
                                ? form.customer_phone
                                : `+91${form.customer_phone}`,
        customer_email:       form.customer_email || (user?.email ?? null),
        special_requirements: form.special_requirements || null,
        status:               'REQUEST_RECEIVED',
        customer_id:          user?.id ?? null,
      }

      // Migration 035 is applied by hand in the Supabase SQL editor, and
      // `git push` does not run it. If the code lands first, the columns
      // below don't exist yet and Postgres answers 42703 — so retry once
      // without them rather than failing a completed six-step form. The
      // request still arrives; it just carries less until 035 is applied.
      const NEW_COLUMNS = ['time_slot', 'end_time', 'flexible_date', 'date_window_days']
      let { data, error: dbErr } = await supabase
        .from('events')
        .insert(payload)
        .select('id, event_code')
        .single()
      if (dbErr?.code === '42703') {
        const fallback = { ...payload }
        for (const col of NEW_COLUMNS) delete fallback[col]
        console.warn('events is missing migration 035 columns — submitting without them.')
        ;({ data, error: dbErr } = await supabase
          .from('events')
          .insert(fallback)
          .select('id, event_code')
          .single())
      }
      if (dbErr) throw dbErr

      // Save services to event_services table
      if (form.services.length > 0) {
        const svcRows = form.services.map(s => ({
          event_id:         data.id,
          service_name:     s,
          service_category: s,
          status:           'REQUIRED',
        }))
        const { error: svcErr } = await supabase.from('event_services').insert(svcRows)
        if (svcErr) console.error('Failed to save selected services:', svcErr)
      }

      navigate(`/plan/confirmation?eventId=${data.id}`)
    } catch (err) {
      // Raw Postgres text ("null value in column … violates not-null
      // constraint") is not something to show a customer at the end of a
      // six-step form.
      setError(friendlyError(err, "We couldn't submit your request just now. Please try again."))
      setSubmitting(false)
    }
  }

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="min-h-screen bg-plum-950 flex flex-col lg:flex-row">

      {/* ── Left panel ─────────────────────────────────── */}
      {/* On a phone this panel stacks above the form, so everything in it
          is height the customer must scroll past before reaching the first
          option. Padding is tightened and the running summary is hidden
          below lg — it duplicates what the form already shows, and pushing
          the actual questions below the fold on the primary conversion
          flow is the costliest place in the app to waste a screen. */}
      <div className="lg:w-2/5 bg-gradient-to-br from-plum-900 to-plum-950 px-5 py-5 lg:p-12 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          {/* Same choice as the navbar: this is chrome above a form someone is
              already filling in, so the line under the name is the feeling,
              not the explanation. */}
          <SambramoLogo
            size={32}
            ground="onDark"
            caption="emotion"
            captionClassName="hidden min-[360px]:flex"
          />
          {/* Only on the first step, before any answers exist. The hub is a
              choice between this and browsing the catalog yourself, and
              someone who realises one question in that they picked the wrong
              door should not have to use the browser's back button. */}
          {step === 1 && (
            <Link
              to="/plan"
              className="shrink-0 text-plum-400 hover:text-white text-xs font-medium transition-colors"
            >
              ← Other ways to plan
            </Link>
          )}
        </div>

        <div className="mt-4 lg:my-8 space-y-3 lg:space-y-6">
          {/* Step counter */}
          <div className="text-plum-400 text-xs font-body uppercase tracking-widest">
            Step {step} of {TOTAL_STEPS}
          </div>

          {/* Step title */}
          <div>
            <h1 className="text-white font-display text-2xl lg:text-4xl font-bold leading-tight mb-1.5 lg:mb-3">
              {STEPS[step - 1].title}
            </h1>
            <p className="text-plum-300 text-sm lg:text-base leading-relaxed">
              {STEPS[step - 1].sub}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i < step ? 'bg-saffron-400' : 'bg-plum-700'
                }`} />
              ))}
            </div>
            <p className="text-plum-500 text-xs">{Math.round(progressPct)}% complete</p>
          </div>

          {/* Live summary of choices */}
          {(selectedType || form.event_date || form.city || form.guest_count) && (
            <div className="hidden lg:block bg-white/5 rounded-2xl p-4 space-y-2 border border-white/10">
              <p className="text-plum-400 text-xs uppercase tracking-wider mb-2">Your celebration</p>
              {selectedType && (
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>{selectedType.emoji}</span>
                  <span className="font-medium">{selectedType.label}</span>
                </div>
              )}
              {form.event_date && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-plum-200">
                    <span>📅</span>
                    <span>{new Date(form.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {days !== null && days > 0 && (
                      <span className="text-saffron-400 text-xs font-semibold">{days}d away</span>
                    )}
                  </div>
                  {/* The reason to hurry, carried through the remaining four
                      steps rather than left behind on step 2. */}
                  {dateInfo?.showCount && (
                    <p className="text-xs text-saffron-300 pl-6">
                      {dateInfo.headline} already
                    </p>
                  )}
                  {form.time_slot && (
                    <p className="text-xs text-plum-300 pl-6">{slotByKey(form.time_slot)?.label}</p>
                  )}
                </div>
              )}
              {form.city && (
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>📍</span><span>{form.city}</span>
                </div>
              )}
              {form.guest_count && (
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>👥</span><span>~{form.guest_count} guests</span>
                </div>
              )}
              {form.services.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>✨</span><span>{form.services.length} service{form.services.length !== 1 ? 's' : ''} selected</span>
                </div>
              )}
              {form.budget_text && (
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>💰</span><span>{form.budget_text}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <a
          href={`tel:${BRAND.supportPhone}`}
          className="hidden lg:block text-plum-600 hover:text-plum-400 text-xs transition-colors"
        >
          Need help? {BRAND.supportPhone}
        </a>
      </div>

      {/* ── Right panel ─────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col">
        <div className={`flex-1 p-8 lg:p-12 overflow-y-auto transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>

          {/* Step 1: Event type */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
              {EVENT_TYPES.map(et => {
                const selected = form.event_type === et.id
                return (
                  <button
                    key={et.id}
                    onClick={() => { setField('event_type', et.id); setTimeout(goNext, 300) }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group ${
                      selected
                        ? 'border-saffron-400 bg-saffron-50 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-plum-300 hover:bg-plum-50 hover:scale-[1.01] hover:shadow-md'
                    }`}
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">{et.emoji}</div>
                    <div className="font-semibold text-sm text-plum-900">{et.label}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-tight">{et.tagline}</div>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-saffron-400 rounded-full flex items-center justify-center animate-fade-in">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Date */}
          {/* The date and the part of the day are both required here. Without
              a date a coordinator cannot check a single vendor, and "start
              time (optional)" meant most requests arrived without one — so
              "morning or evening?" became a phone call before any real work
              could start. */}
          {step === 2 && (
            <div className="max-w-md space-y-5">
              <button
                type="button"
                onClick={() => setDateSheetOpen(true)}
                className={[
                  'w-full text-left rounded-2xl border-2 px-4 py-4 transition-colors',
                  form.event_date
                    ? 'border-saffron-300 bg-saffron-50 hover:border-saffron-400'
                    : 'border-dashed border-gray-300 hover:border-plum-400 bg-white',
                ].join(' ')}
              >
                {form.event_date ? (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-plum-900">
                        {new Date(form.event_date).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs font-semibold text-plum-600 underline shrink-0">Change</span>
                    </span>
                    <span className="block text-sm text-plum-600 mt-0.5">
                      {slotByKey(form.time_slot)?.label ?? 'Pick a time of day'}
                      {form.flexible_date && form.date_window_days
                        ? ` · flexible ± ${form.date_window_days} days`
                        : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-lg font-bold text-plum-900">
                      <CalendarDays size={20} className="text-plum-600" />
                      Choose your date
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5">
                      See which dates are filling up before you pick
                    </span>
                  </>
                )}
              </button>

              {/* Restated here so the reason to hurry survives closing the
                  sheet. Only ever appears when real enquiries back it. */}
              {dateInfo?.showCount && (
                <div className={`rounded-2xl border p-4 ${dateInfo.level.chip}`}>
                  <p className="text-sm font-bold mb-0.5">{dateInfo.headline} for this date</p>
                  <p className="text-xs leading-relaxed opacity-90">{dateInfo.subtext}</p>
                </div>
              )}

              {!form.time_slot && form.event_date && (
                <p className="text-sm text-crimson-600 font-medium">
                  Pick a time of day to continue — it decides which vendors we can even ask.
                </p>
              )}

              {days !== null && days > 0 && (
                <div className="flex items-center gap-3 p-3 bg-plum-50 rounded-xl border border-plum-100">
                  <span className="text-2xl">🗓️</span>
                  <div>
                    <p className="text-sm font-semibold text-plum-800">
                      {days} day{days !== 1 ? 's' : ''} to plan
                    </p>
                    <p className="text-xs text-plum-500">
                      {days >= 30
                        ? 'Great — plenty of time to make it perfect!'
                        : days >= 14
                          ? 'Good lead time — we\'ll get right on it.'
                          : 'Tight timeline — we\'ll fast-track this for you.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">City *</label>
                <select
                  value={form.city}
                  onChange={e => setField('city', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors bg-white text-base"
                  autoFocus
                >
                  <option value="">Select your city</option>
                  {/* Was `BRAND.pilotCities` with a ` 🆕` hardcoded onto
                      whichever entry equalled 'Mysore' — a fact about the
                      launch written into a JSX conditional, where it would
                      still be labelling Mysore "new" a year from now and
                      would never label the actual next city. The list reads
                      from cities.js like everything else does now. */}
                  {LIVE_CITIES.map(c => (
                    <option key={c.slug} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Other">My city isn't listed</option>
                </select>
              </div>
              {form.city === 'Other' && (
                <ComingSoonCity source="plan_wizard" />
              )}
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Venue type in mind? <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {VENUE_OPTIONS.map(({ label, emoji }) => (
                    <button
                      key={label}
                      onClick={() => setField('style_preference', form.style_preference === label ? '' : label)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.style_preference === label
                          ? 'border-saffron-400 bg-saffron-50 text-plum-900'
                          : 'border-gray-200 text-gray-600 hover:border-plum-200 hover:bg-plum-50'
                      }`}
                    >
                      <span className="text-xl">{emoji}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Guest count */}
          {step === 4 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-4">Select a range or type your own *</label>
                <div className="grid grid-cols-1 gap-2 mb-5">
                  {GUEST_PRESETS.map(({ label, range, value, emoji }) => (
                    <button
                      key={label}
                      onClick={() => setField('guest_count', value)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.guest_count === value
                          ? 'border-saffron-400 bg-saffron-50 text-plum-900 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-plum-200 hover:bg-plum-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{emoji}</span>
                        <div className="text-left">
                          <div className="font-semibold text-sm">{label}</div>
                          <div className="text-xs text-gray-400">{range} guests</div>
                        </div>
                      </div>
                      {form.guest_count === value && <CheckCircle2 size={16} className="text-saffron-500" />}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or type exact number</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 120"
                    value={form.guest_count}
                    onChange={e => setField('guest_count', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors text-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Approximate is fine — we'll confirm details later.</p>
            </div>
          )}

          {/* Step 5: Services */}
          {step === 5 && (
            <div className="max-w-2xl">
              <p className="text-gray-500 text-sm mb-5">
                Select everything you need. Don't worry if you're unsure — our team will help you finalize.
              </p>
              <div className="space-y-5">
                {/* What they picked on the plan hub.
                    SERVICE_CATEGORIES is a curated chip list and the hub's
                    catalogue is wider, so a service like "Personal Cooks"
                    arrives selected but has no chip to render it. Without this
                    group it would be invisible here and still submitted — the
                    customer would see "1 service selected" and no way to tell
                    which, or to remove it. */}
                {extraServices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">✅</span>
                      <span className="font-semibold text-plum-800 text-sm">Already chosen</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extraServices.map(svc => (
                        <button
                          key={svc}
                          onClick={() => toggleService(svc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-saffron-400 bg-saffron-400 text-plum-950 text-xs font-medium shadow-sm transition-all duration-150"
                        >
                          <CheckCircle2 size={11} />{svc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {SERVICE_CATEGORIES.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-semibold text-plum-800 text-sm">{cat.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.services.map(svc => {
                        const sel = form.services.includes(svc)
                        return (
                          <button
                            key={svc}
                            onClick={() => toggleService(svc)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                              sel
                                ? 'border-saffron-400 bg-saffron-400 text-plum-950 shadow-sm scale-[1.03]'
                                : 'border-gray-200 text-gray-600 hover:border-plum-300 hover:bg-plum-50'
                            }`}
                          >
                            {sel && <CheckCircle2 size={11} />}{svc}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {form.services.length > 0 && (
                <div className="mt-6 bg-saffron-50 rounded-2xl p-4 border border-saffron-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-saffron-600" />
                    <p className="text-xs font-semibold text-plum-700">{form.services.length} service{form.services.length !== 1 ? 's' : ''} selected</p>
                  </div>
                  <p className="text-xs text-plum-600 leading-relaxed">{form.services.join(' · ')}</p>
                </div>
              )}
              {form.services.length === 0 && (
                <div className="mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-400">You can skip this — our team will recommend the right services.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Budget + contact */}
          {step === 6 && (
            <div className="max-w-md space-y-5">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Your budget *</label>
                <div className="space-y-2">
                  {BUDGET_OPTIONS.map(b => (
                    <button
                      key={b.label}
                      onClick={() => setForm(f => ({ ...f, budget_text: b.label, budget_min: b.min, budget_max: b.max }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                        form.budget_text === b.label
                          ? 'border-saffron-400 bg-saffron-50 text-plum-900'
                          : 'border-gray-200 text-gray-600 hover:border-plum-200 hover:bg-plum-50'
                      }`}
                    >
                      <span>{b.label}</span>
                      {form.budget_text === b.label && <CheckCircle2 size={15} className="text-saffron-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 space-y-4">
                <p className="text-sm font-semibold text-plum-800">How should we reach you?</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.customer_name}
                    onChange={e => setField('customer_name', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile number *</label>
                  <div className="flex gap-2">
                    <span className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm bg-gray-50 shrink-0 flex items-center">+91</span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={form.customer_phone.replace('+91', '')}
                      onChange={e => setField('customer_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`flex-1 border-2 rounded-xl px-4 py-3 text-plum-900 focus:outline-none transition-colors ${
                        phoneDigits.length > 0 && !phoneValid
                          ? 'border-red-300 focus:border-red-400'
                          : 'border-gray-200 focus:border-saffron-400'
                      }`}
                      inputMode="numeric"
                      autoComplete="tel-national"
                    />
                  </div>
                  {phoneDigits.length > 0 && !phoneValid && (
                    <p className="text-xs text-red-600 mt-1.5">
                      Enter a 10-digit Indian mobile number so our coordinator can reach you.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.customer_email}
                    onChange={e => setField('customer_email', e.target.value)}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-plum-900 focus:outline-none transition-colors ${
                      emailValid ? 'border-gray-200 focus:border-saffron-400' : 'border-red-300 focus:border-red-400'
                    }`}
                    autoComplete="email"
                  />
                  {!emailValid && (
                    <p className="text-xs text-red-600 mt-1.5">That email doesn't look right — check for a typo.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Anything specific? <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea
                    rows={3}
                    placeholder="Theme ideas, dietary needs, special requirements…"
                    value={form.special_requirements}
                    onChange={e => setField('special_requirements', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Summary before submit */}
              {form.customer_name && form.budget_text && (
                <div className="bg-plum-50 rounded-2xl p-4 border border-plum-100 space-y-1.5">
                  <p className="text-xs font-semibold text-plum-700 mb-2">✨ Your celebration summary</p>
                  {selectedType   && <p className="text-xs text-plum-600">{selectedType.emoji} {selectedType.label}</p>}
                  {form.event_date && <p className="text-xs text-plum-600">📅 {new Date(form.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                  {form.city      && <p className="text-xs text-plum-600">📍 {form.city}</p>}
                  {form.guest_count && <p className="text-xs text-plum-600">👥 ~{form.guest_count} guests</p>}
                  <p className="text-xs text-plum-600">💰 {form.budget_text}</p>
                  {form.services.length > 0 && <p className="text-xs text-plum-600">✅ {form.services.length} services selected</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Nav footer ─────────────────────────────────────
            Sticky on a phone. Steps 5 and 6 are a screen and a half of chips
            and fields, and a static footer meant Continue sat below all of
            it — so the way forward was invisible exactly when the step looked
            most like a wall. It stays in the flow on desktop, where the panel
            is already the height of the viewport. */}
        <div className="sticky bottom-0 z-10 border-t border-gray-100 px-8 lg:px-12 py-4 lg:py-5 pb-safe flex items-center justify-between bg-gray-50/95 backdrop-blur">
          <button
            onClick={goBack}
            disabled={step === 1 || animating}
            className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-plum-300 hover:text-plum-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Back
          </button>

          <div className="text-xs text-gray-400">{step}/{TOTAL_STEPS}</div>

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={!canNext() || animating}
              className="px-8 py-2.5 rounded-xl bg-saffron-500 text-white text-sm font-semibold hover:bg-saffron-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="px-8 py-2.5 rounded-xl bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Plan My Celebration
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <EventDateSheet
        open={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        city={form.city || null}
        value={form}
        onConfirm={picked => setForm(f => ({ ...f, ...picked }))}
      />
    </div>
  )
}
