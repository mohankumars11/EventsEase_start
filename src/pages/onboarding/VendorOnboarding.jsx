import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SambramoLogo from '../../components/ui/SambramoLogo'
import { BRAND } from '../../config/sambramo'
import { VENDOR_CATEGORIES } from '../../config/vendor'

const CATEGORIES = VENDOR_CATEGORIES

/**
 * Only the cities Sambramo actually operates in.
 *
 * This offered all ten of `servicedCities` — the roadmap list — so a decorator
 * in Surat could complete onboarding in full and then never be matched with
 * anything, because every customer-side city picker is restricted to the pilot
 * (see the note on BRAND.pilotCities). Recruiting a partner into a city you
 * cannot send them work in is worse than turning them away.
 */
const CITIES = BRAND.pilotCities

const TOTAL_STEPS = 3

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i + 1 < current  ? 'bg-plum-600 text-white' :
            i + 1 === current ? 'bg-saffron-400 text-plum-950' :
                                'bg-gray-200 text-gray-400'
          }`}>
            {i + 1 < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`flex-1 h-0.5 w-8 ${i + 1 < current ? 'bg-plum-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function VendorOnboarding() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const [form, setForm] = useState({
    business_name:    '',
    category:         '',
    description:      '',
    city:             '',
    area:             '',
    pincode:          '',
    years_experience: '',
    starting_price:   '',
    service_areas:    [],
    website_url:      '',
    instagram_url:    '',
  })

  /**
   * The existing row, if there is one — and whether we've looked yet.
   *
   * This form is no longer only a first-run wizard: the dashboard's Account tab
   * links here to edit. Without prefilling, "Edit" would open an empty form and
   * the upsert at the end would blank every field the vendor didn't retype.
   * `existing` is also what decides whether to touch `status` at all.
   */
  const [existing, setExisting] = useState(null)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!user?.id) { setHydrating(false); return }

    supabase
      .from('vendors')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setExisting(data)
          setForm({
            business_name:    data.business_name ?? '',
            category:         data.category ?? '',
            description:      data.description ?? '',
            // A city that is no longer in the pilot must not be preselected
            // into a <select> that has no such option — the field would look
            // filled while submitting an empty string.
            city:             CITIES.includes(data.city) ? data.city : '',
            area:             data.area ?? '',
            pincode:          data.pincode ?? '',
            years_experience: data.years_experience?.toString() ?? '',
            starting_price:   data.starting_price?.toString() ?? '',
            service_areas:    (data.service_areas ?? []).filter(c => CITIES.includes(c)),
            website_url:      data.website_url ?? '',
            instagram_url:    data.instagram_url ?? '',
          })
        }
        setHydrating(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  function toggleServiceArea(city) {
    setForm(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(city)
        ? prev.service_areas.filter(c => c !== city)
        : [...prev.service_areas, city],
    }))
  }

  function validateStep(s) {
    if (s === 1) {
      if (!form.business_name.trim()) return 'Please enter your business name.'
      if (!form.category)             return 'Please select a service category.'
      if (!form.description.trim() || form.description.length < 30)
        return 'Please describe your business (at least 30 characters).'
    }
    if (s === 2) {
      if (!form.city)          return 'Please select your primary city.'
      if (!form.area.trim())   return 'Please enter your area/locality.'
      if (!/^\d{6}$/.test(form.pincode)) return 'Enter a valid 6-digit pincode.'
    }
    if (s === 3) {
      if (!form.years_experience) return 'Please enter years of experience.'
      if (!form.starting_price)   return 'Please enter your starting price.'
    }
    return null
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validateStep(3)
    if (err) { setError(err); return }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        profile_id:       user.id,
        business_name:    form.business_name.trim(),
        category:         form.category,
        description:      form.description.trim(),
        city:             form.city,
        area:             form.area.trim(),
        pincode:          form.pincode,
        years_experience: parseInt(form.years_experience, 10) || 0,
        starting_price:   parseInt(form.starting_price, 10) || 0,
        service_areas:    form.service_areas,
        website_url:      form.website_url.trim() || null,
        instagram_url:    form.instagram_url.trim() || null,
        // Status is set on creation only. An approved partner editing their
        // area or adding an Instagram handle must not be knocked back to
        // PENDING_REVIEW — that would take their listing off the platform as a
        // side effect of fixing a typo, and nothing on screen would say so.
        // Re-review after a material change is a coordinator's call to make.
        ...(existing ? {} : { status: 'PENDING_REVIEW' }),
      }

      const { error: vendorErr } = await supabase
        .from('vendors')
        .upsert(payload, { onConflict: 'profile_id' })

      if (vendorErr) throw vendorErr

      navigate('/dashboard/vendor', { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <SambramoLogo size={36} ground="onLight" caption />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {existing ? 'Your partner profile' : 'Set up your partner profile'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {existing
              ? 'Change anything and save — your listing and calendar stay as they are.'
              : 'Our team will review and approve your profile within 24–48 hours.'}
          </p>
        </div>

        {hydrating ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="animate-spin text-plum-600" size={26} />
            <span className="text-sm">Loading your details…</span>
          </div>
        ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <StepIndicator current={step} total={TOTAL_STEPS} />

          <form onSubmit={handleSubmit}>

            {/* ── Step 1: Business basics ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Your business</h2>
                </div>

                <Field label="Business name">
                  <input type="text" value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                    className="input" placeholder="e.g. Royal Caterers" autoFocus />
                </Field>

                <Field label="Service category">
                  <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Describe your business" hint={`${form.description.length}/300`}>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value.slice(0, 300))}
                    className="input resize-none h-28"
                    placeholder="Tell customers what makes your service special, your specialties, signature offerings…"
                  />
                </Field>
              </div>
            )}

            {/* ── Step 2: Location ── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Your location</h2>

                <Field label="Primary city">
                  <select value={form.city} onChange={e => set('city', e.target.value)} className="input">
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Area / Locality">
                    <input type="text" value={form.area}
                      onChange={e => set('area', e.target.value)}
                      className="input" placeholder="Koramangala" />
                  </Field>
                  <Field label="Pincode">
                    <input type="text" value={form.pincode}
                      onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input" placeholder="560034" inputMode="numeric" />
                  </Field>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cities you serve <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => toggleServiceArea(c)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          form.service_areas.includes(c)
                            ? 'bg-plum-600 text-white border-plum-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-plum-300'
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Experience & pricing ── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Experience & pricing</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Years of experience">
                    <input type="number" min={0} max={50} value={form.years_experience}
                      onChange={e => set('years_experience', e.target.value)}
                      className="input" placeholder="5" />
                  </Field>
                  <Field label="Starting price (₹)">
                    <input type="number" min={0} value={form.starting_price}
                      onChange={e => set('starting_price', e.target.value)}
                      className="input" placeholder="25000" inputMode="numeric" />
                  </Field>
                </div>

                <Field label="Website URL" hint="optional">
                  <input type="url" value={form.website_url}
                    onChange={e => set('website_url', e.target.value)}
                    className="input" placeholder="https://yoursite.com" />
                </Field>

                <Field label="Instagram handle" hint="optional">
                  <input type="text" value={form.instagram_url}
                    onChange={e => set('instagram_url', e.target.value)}
                    className="input" placeholder="@yourbusiness" />
                </Field>

                <div className="bg-plum-50 border border-plum-100 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-plum-800 mb-1">
                    {existing ? 'Next: your list and your calendar' : 'What happens next?'}
                  </p>
                  <p className="text-xs text-plum-600 leading-relaxed">
                    {existing
                      ? 'Saving these details does not change your approval status. What you offer and when you can work are set on your dashboard.'
                      : "After you submit, our team reviews your profile within 24–48 hours. You can add what you offer and set your working days straight away — both go live the moment you're approved."}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button type="button" onClick={() => { setStep(s => s - 1); setError(null) }}
                  className="flex items-center gap-2 px-5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-plum-300 transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              {step < TOTAL_STEPS ? (
                <button type="button" onClick={handleNext}
                  className="flex-1 btn-plum py-3 text-sm flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex-1 btn-cta py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading
                    ? 'Saving…'
                    : existing ? 'Save changes' : 'Submit for review →'}
                </button>
              )}
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
