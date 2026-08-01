import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { EVENT_TYPES, BUDGET_OPTIONS, SERVICE_CATEGORIES, BRAND } from '../../config/sambramo'

const TOTAL_STEPS = 6

const stepTitles = [
  'What are you celebrating?',
  'When is the big day?',
  'Where will it happen?',
  'How many guests?',
  'What do you need?',
  'Budget & how to reach you',
]

const stepSubs = [
  'Every celebration is unique. Tell us what you have in mind.',
  'Give us the date so we can start planning early.',
  'Help us find the right vendors in your area.',
  'Knowing your guest count helps us get accurate quotes.',
  'Select all services you need. We'll handle the rest.',
  'Your details stay private — only our team contacts you.',
]

export default function PlanningWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    event_type: '',
    event_date: '',
    event_time: '',
    city: '',
    venue_preference: '',
    guest_count: '',
    services: [],
    budget_label: '',
    budget_min: null,
    budget_max: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    special_notes: '',
  })

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleService(service) {
    setForm(f => {
      const exists = f.services.includes(service)
      return { ...f, services: exists ? f.services.filter(s => s !== service) : [...f.services, service] }
    })
  }

  function canNext() {
    if (step === 1) return !!form.event_type
    if (step === 2) return !!form.event_date
    if (step === 3) return !!form.city
    if (step === 4) return !!form.guest_count
    if (step === 5) return true
    if (step === 6) return form.customer_name && form.customer_phone && form.budget_label
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        event_type:         form.event_type,
        event_date:         form.event_date || null,
        event_time:         form.event_time || null,
        city:               form.city,
        venue_preference:   form.venue_preference || null,
        guest_count:        parseInt(form.guest_count) || null,
        budget_label:       form.budget_label,
        budget_min:         form.budget_min,
        budget_max:         form.budget_max,
        customer_name:      form.customer_name,
        customer_phone:     form.customer_phone,
        customer_email:     form.customer_email || (user?.email ?? null),
        special_notes:      form.special_notes || null,
        status:             'REQUEST_RECEIVED',
        services_requested: form.services,
        user_id:            user?.id ?? null,
      }

      const { data, error: dbError } = await supabase.from('events').insert(payload).select('id').single()
      if (dbError) throw dbError

      if (form.services.length > 0) {
        const svcRows = form.services.map(s => ({ event_id: data.id, service_name: s }))
        await supabase.from('event_service_selections').insert(svcRows)
      }

      navigate(`/plan/confirmation?eventId=${data.id}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="min-h-screen bg-plum-950 flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="lg:w-2/5 bg-gradient-to-br from-plum-900 to-plum-950 p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <div className="text-saffron-400 font-display text-2xl font-bold mb-2">Sambramo</div>
          <p className="text-plum-300 text-sm">Your Moment. Our Magic.</p>
        </div>
        <div className="my-8">
          <div className="text-plum-400 text-xs font-body uppercase tracking-widest mb-4">
            Step {step} of {TOTAL_STEPS}
          </div>
          <h1 className="text-white font-display text-3xl lg:text-4xl font-bold leading-tight mb-3">
            {stepTitles[step - 1]}
          </h1>
          <p className="text-plum-300 text-base leading-relaxed">
            {stepSubs[step - 1]}
          </p>
          {/* Progress bar */}
          <div className="mt-8">
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < step ? 'bg-saffron-400' : 'bg-plum-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-plum-500 text-xs">
          Need help? Call us at {BRAND.supportPhone}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex flex-col">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
              {EVENT_TYPES.map(et => (
                <button
                  key={et.id}
                  onClick={() => setField('event_type', et.id)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    form.event_type === et.id
                      ? 'border-saffron-400 bg-saffron-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-plum-300 hover:bg-plum-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{et.emoji}</div>
                  <div className="font-semibold text-sm text-plum-900">{et.label}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">{et.tagline}</div>
                  {form.event_type === et.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-saffron-400 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Event Date *</label>
                <input
                  type="date"
                  value={form.event_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setField('event_date', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Preferred Start Time (optional)</label>
                <input
                  type="time"
                  value={form.event_time}
                  onChange={e => setField('event_time', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div className="bg-plum-50 rounded-2xl p-4 text-sm text-plum-700">
                <span className="font-semibold">Pro tip:</span> Booking at least 2 weeks in advance gives us more vendor options for you.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">City *</label>
                <select
                  value={form.city}
                  onChange={e => setField('city', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors bg-white"
                >
                  <option value="">Select your city</option>
                  {BRAND.servicedCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other city</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Venue type in mind? (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {['At home', 'Party hall', 'Restaurant', 'Resort / farmhouse', 'Outdoor space', 'Not decided yet'].map(v => (
                    <button
                      key={v}
                      onClick={() => setField('venue_preference', form.venue_preference === v ? '' : v)}
                      className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.venue_preference === v
                          ? 'border-saffron-400 bg-saffron-50 text-plum-900'
                          : 'border-gray-200 text-gray-600 hover:border-plum-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Expected guest count *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={form.guest_count}
                  onChange={e => setField('guest_count', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors text-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['10–20', '20–50', '50–100', '100–200', '200–500', '500+'].map(range => (
                  <button
                    key={range}
                    onClick={() => setField('guest_count', range.split('–')[0])}
                    className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm text-gray-600 hover:border-plum-300 hover:bg-plum-50 transition-all"
                  >
                    {range}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Approximate is fine — we'll confirm details later.</p>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-2xl">
              <p className="text-gray-500 text-sm mb-6">Select everything you need. Don't worry if you're unsure — our team will help you finalize.</p>
              <div className="space-y-4">
                {SERVICE_CATEGORIES.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-semibold text-plum-800 text-sm">{cat.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.services.map(svc => (
                        <button
                          key={svc}
                          onClick={() => toggleService(svc)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                            form.services.includes(svc)
                              ? 'border-saffron-400 bg-saffron-50 text-plum-900'
                              : 'border-gray-200 text-gray-600 hover:border-plum-200'
                          }`}
                        >
                          {form.services.includes(svc) ? '✓ ' : ''}{svc}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {form.services.length > 0 && (
                <div className="mt-6 bg-saffron-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-plum-700 mb-1">{form.services.length} service{form.services.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-plum-600">{form.services.join(' · ')}</p>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="max-w-md space-y-5">
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Your budget *</label>
                <div className="grid grid-cols-1 gap-2">
                  {BUDGET_OPTIONS.map(b => (
                    <button
                      key={b.label}
                      onClick={() => setForm(f => ({ ...f, budget_label: b.label, budget_min: b.min, budget_max: b.max }))}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                        form.budget_label === b.label
                          ? 'border-saffron-400 bg-saffron-50 text-plum-900'
                          : 'border-gray-200 text-gray-600 hover:border-plum-200'
                      }`}
                    >
                      {form.budget_label === b.label ? '✓ ' : ''}{b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Your name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.customer_name}
                  onChange={e => setField('customer_name', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Mobile number *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.customer_phone}
                  onChange={e => setField('customer_phone', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Email (optional)</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.customer_email}
                  onChange={e => setField('customer_email', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-plum-800 mb-2">Anything specific we should know? (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Theme ideas, special requirements, dietary needs..."
                  value={form.special_notes}
                  onChange={e => setField('special_notes', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-plum-900 focus:outline-none focus:border-saffron-400 transition-colors resize-none"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="border-t border-gray-100 px-8 lg:px-12 py-5 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-plum-300 hover:text-plum-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Back
          </button>

          <div className="text-xs text-gray-400">{step}/{TOTAL_STEPS}</div>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
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
              ) : 'Plan My Celebration'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
