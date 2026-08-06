import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { EVENT_TYPES, BUDGET_OPTIONS, SERVICE_CATEGORIES, BRAND } from '../../config/sambramo'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../context/ToastContext'
import { isPilotCity } from '../../utils/cityPilot'
import ComingSoonCity from '../../components/common/ComingSoonCity'
import SambramoLogo from '../../components/ui/SambramoLogo'

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

// Days until event date
function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

// Where a guest's half-finished answers wait while they sign in. Session
// scoped rather than localStorage: this is one visit's work in progress, not
// something to resurrect on a laptop three weeks later.
const DRAFT_KEY = 'sambramo_plan_draft'

export default function PlanningWizard() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()

  const [step, setStep]         = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)
  const [animating, setAnimating] = useState(false)

  // The landing page's eight budget chips navigate here as
  // `/plan?budget=<label>`, and its festival cards add `?festival=<id>`.
  // Only `type` was ever read, so a visitor who picked a budget bracket
  // watched that choice vanish and had to make it again at step 6 — the
  // exact re-work the pre-selection existed to avoid.
  const presetBudget = BUDGET_OPTIONS.find(b => b.label === searchParams.get('budget'))
  const presetFestival = searchParams.get('festival')

  const [form, setForm] = useState({
    event_type:        searchParams.get('type') || '',
    event_date:        '',
    start_time:        '',
    city:              profile?.city || '',
    style_preference:  '',
    guest_count:       '',
    services:          [],
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
    if (step === 2) return !!form.event_date
    if (step === 3) return isPilotCity(form.city)
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
      const payload = {
        event_type:           form.event_type,
        event_date:           form.event_date || null,
        start_time:           form.start_time || null,
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

      const { data, error: dbErr } = await supabase
        .from('events')
        .insert(payload)
        .select('id, event_code')
        .single()
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
                <div className="flex items-center gap-2 text-sm text-plum-200">
                  <span>📅</span>
                  <span>{new Date(form.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  {days !== null && days > 0 && (
                    <span className="text-saffron-400 text-xs font-semibold">{days}d away</span>
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
          {step === 2 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Event date *</label>
                <input
                  type="date"
                  value={form.event_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setField('event_date', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors text-lg"
                  autoFocus
                />
                {days !== null && days > 0 && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-saffron-50 rounded-xl border border-saffron-100">
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
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Preferred start time <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => setField('start_time', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div className="bg-plum-50 rounded-2xl p-4 text-sm text-plum-700">
                <span className="font-semibold">Pro tip:</span> Booking 2+ weeks in advance gives us more vendor options and better pricing.
              </div>
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
                  {BRAND.pilotCities.map(c => <option key={c} value={c}>{c}{c === 'Mysore' ? ' 🆕' : ''}</option>)}
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

        {/* ── Nav footer ─────────────────────────────────── */}
        <div className="border-t border-gray-100 px-8 lg:px-12 py-5 flex items-center justify-between bg-gray-50">
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
    </div>
  )
}
