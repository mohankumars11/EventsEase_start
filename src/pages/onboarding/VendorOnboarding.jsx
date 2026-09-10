import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Navigation, Check, ShieldCheck, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SambramoLogo from '../../components/ui/SambramoLogo'
import { BRAND } from '../../config/sambramo'
import {
  lookupPincode, currentPosition, nearestServed, reverseCity,
} from '../../lib/pincodeDirectory'
import CityInterestForm from '../../components/common/CityInterestForm'
import HoldToSign from '../../components/vendor/HoldToSign'
import {
  PARTNER_RULES, PARTNER_TERMS_LONG, PARTNER_TERMS_VERSION,
} from '../../config/partnerTerms'
import { HEARD_FROM, heardFrom } from '../../config/heardFrom'

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

/* ══════════════════════════════════════════════════════════════════════
   LOCATION FIRST, AND THE TRADE IS NOT ASKED HERE AT ALL
   ══════════════════════════════════════════════════════════════════════

   Two changes, and they are the same change.

   ── Why location moved to the front ─────────────────────────────────
   It is the only step with a permission dialog in it, and the only one
   that can end the conversation: a partner outside the served set needs
   to be told so BEFORE they type a business name, a description and a
   category for a city we cannot send them work in. Asking three
   questions and then saying "we are not in Mysuru yet" wastes their
   time and reads as a bait.

   It is also the answer everything else depends on — dispatch is
   distance first — so it should be the thing we are surest of.

   ── Why the category select is gone ─────────────────────────────────
   It asked a partner to pick one trade from twenty-six, in a dropdown,
   before they had seen what any of them contain. Then the last button
   of onboarding used that answer to open the listing flow ALREADY ON
   that trade — so somebody who picked Photography because it was
   nearest the top landed in the photo-booth questions and had to work
   out how to get back.

   `vendors.category` was never load-bearing: match_partners joins on
   `vendor_services.category`, which is set by the listing flow itself.
   The column was display only, and asking for it here bought a wrong
   default and nothing else. Now the trade grid opens on all twenty-six
   and the partner chooses having seen them. */
const STEPS = [
  { id: 'location',  label: 'Your location' },
  { id: 'business',  label: 'Your business' },
  { id: 'heard',     label: 'How you found us' },
  { id: 'agreement', label: 'The agreement' },
]

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i + 1 < current  ? 'bg-plum-600 text-white' :
            i + 1 === current ? 'bg-saffron-400 text-plum-950' :
                                'bg-gray-200 text-gray-500'
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
    /* Dispatch's hardest filter, and it has never been on this form. */
    service_radius_km: 15,
    /* Asked once, answerable only now. See config/heardFrom.js. */
    heard_from:        '',
    heard_from_detail: '',
    website_url:      '',
    instagram_url:    '',
  })

  /* An exact pin beats a pincode centroid by about two kilometres, and
     the radius filter measures from it. Null until they tap. */
  const [pinned, setPinned] = useState(null)
  const [locating, setLocating] = useState(false)

  /* Where they are, when it is somewhere we do not serve yet. Holds the
     town name so the screen can say "Mysuru" rather than "not here" —
     `{ city, state }`, or `{ city: null }` when the geocoder was
     unreachable and we know only that it was outside. */
  const [outside, setOutside] = useState(null)

  /* The permission is asked ONCE per visit to this step. Without this
     the effect below re-fires on every re-render the form causes, and a
     partner typing their pincode gets the dialog again mid-keystroke. */
  const [locationAsked, setLocationAsked] = useState(false)

  /* The agreement. Held in state until submit, then written by
     sign_partner_terms — the server stamps the moment, not this device. */
  const [signature, setSignature] = useState(null)
  const [openLong, setOpenLong] = useState(false)

  async function useMyLocation() {
    setLocating(true)
    setError(null)
    setOutside(null)
    try {
      const pos = await currentPosition({ timeout: 12000 })
      if (pos.status !== 'ok') {
        /* ── Every reason gets its own sentence ────────────────────────
           These four failures are not the same problem and do not have
           the same fix, and a partner told "could not find you" when the
           real answer is "you turned this off in Settings" will tap the
           button again forever. */
        setError({
          denied: 'Location is switched off for Sambramo. Turn it on in your phone settings, or just type your pincode below — it works, it is only less exact.',
          timeout: 'That took too long — usually a weak signal indoors. Step outside and try again, or type your pincode below.',
          unavailable: 'Your phone could not get a fix just now. Type your pincode below instead.',
          unsupported: 'This device cannot share a location. Type your pincode below instead.',
        }[pos.status] ?? 'Could not find you. Type your pincode below instead.')
        return
      }
      /* Names the place from centroids we already hold, so it costs no
         external call and fills the pincode and area boxes for them. */
      const near = await nearestServed(pos.lat, pos.lng)

      /* ── Outside the served set is an ANSWER, not a failure ─────────
         This used to fall through: `near.pincode` and `near.area` are
         undefined on a miss, so both boxes kept their old value, and
         `city: f.city || 'Bengaluru'` then stamped Bengaluru on a
         partner standing in Mysuru — while the tick below told them the
         area and pincode "were filled in from it". Nothing had been.
         They were pinned to a city 140 km away that they never chose,
         and the first thing the form did was lie about it.

         A place we do not serve gets named and offered a way to say so.
         Nothing is pinned and nothing is filled in, because there is
         genuinely nothing to fill in. */
      if (near?.status !== 'served') {
        setPinned(null)
        /* Answered at once, named a moment later. `nearestServed` is
           local — the served set is already in memory — so we know we
           are outside before any network call. Awaiting the geocoder
           here made the screen sit on "Finding you…" for the round trip
           as well, to deliver a word. Say the thing that matters now;
           the town name fills in when it arrives. */
        setOutside({ city: null, state: null })
        reverseCity(pos.lat, pos.lng).then(w => { if (w) setOutside(w) })
        return
      }

      setOutside(null)
      setPinned({ lat: pos.lat, lng: pos.lng })
      setForm(f => ({
        ...f,
        pincode: near.pincode ?? f.pincode,
        area: near.area ?? f.area,
        /* Only when it is a city we actually run in -- the picker below
           offers the pilot list, and writing anything else into it
           selects nothing and looks broken. */
        city: f.city || (CITIES.includes(near.district) ? near.district : f.city),
      }))
      setError(null)
    } catch {
      setError('Could not find you. Type your pincode below instead.')
    } finally {
      setLocating(false)
    }
  }

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
            service_radius_km: data.service_radius_km ?? 15,
            heard_from:        data.heard_from ?? '',
            heard_from_detail: data.heard_from_detail ?? '',
            website_url:      data.website_url ?? '',
            instagram_url:    data.instagram_url ?? '',
          })
        }
        setHydrating(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  /**
   * ══════════════════════════════════════════════════════════════════
   * A PARTNER WHO HAS ALREADY SIGNED IS NOT ASKED AGAIN
   * ══════════════════════════════════════════════════════════════════
   *
   * This form is also the Account tab's "edit your profile", and putting
   * a signature page in front of somebody changing their opening hours
   * would teach them that the signature means nothing.
   *
   * It IS asked again when the version has moved on, which is the whole
   * point of stamping a version: v1 said nothing about genuineness and
   * cannot be relied on to act on it.
   */
  const needsAgreement = !existing?.terms_accepted_at
    || existing?.terms_version !== PARTNER_TERMS_VERSION

  const steps = useMemo(
    () => STEPS.filter(s => s.id !== 'agreement' || needsAgreement),
    [needsAgreement],
  )
  const total = steps.length
  const stepId = steps[step - 1]?.id
  const isLast = step === total

  /**
   * ══════════════════════════════════════════════════════════════════
   * THE PERMISSION IS ASKED BY ARRIVING, NOT BY TAPPING
   * ══════════════════════════════════════════════════════════════════
   *
   * The button stays -- it is how somebody retries after stepping
   * outside, and how they correct a pin -- but nobody should have to
   * find it. Landing on a screen headed "Your location" IS the consent
   * moment: the reason has been given, and the OS dialog arriving right
   * then is what a person expects. Making them hunt for a button first
   * is the step where onboarding was being abandoned.
   *
   * Everything the earlier note argued for is preserved. This still does
   * not fire on the splash screen or at first launch, where a refusal is
   * near-certain and permanent -- only on the one screen that has
   * already explained why it is being asked.
   *
   * It runs once. `nativePosition` calls checkPermissions() before
   * requestPermissions(), so a partner who has already granted it gets a
   * silent fix rather than a second dialog, and one who has already
   * refused is not asked again on every keystroke.
   */
  useEffect(() => {
    if (stepId !== 'location') return
    if (locationAsked || pinned || locating) return
    setLocationAsked(true)
    useMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

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

  function validateStep(id) {
    if (id === 'business') {
      if (!form.business_name.trim()) return 'Please enter your business name.'
      if (!form.description.trim() || form.description.length < 30)
        return 'Please describe your business (at least 30 characters).'
      if (!form.years_experience) return 'Please enter years of experience.'
      if (!form.starting_price)   return 'Please enter your starting price.'
    }
    if (id === 'location') {
      if (!form.city)          return 'Please select your primary city.'
      if (!form.area.trim())   return 'Please enter your area/locality.'
      if (!/^\d{6}$/.test(form.pincode)) return 'Enter a valid 6-digit pincode.'
    }
    if (id === 'heard') {
      if (!form.heard_from) return 'Pick one — it takes a second, and it decides where we look for the next partner.'
    }
    if (id === 'agreement') {
      if (!signature) return 'Type your name and hold the bar to sign.'
    }
    return null
  }

  function handleNext() {
    const err = validateStep(stepId)
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    /* Every step, not only the last one. A partner who used Back to fix
       something and then came forward again could otherwise submit a
       form an earlier step would have refused. */
    for (const s of steps) {
      const err = validateStep(s.id)
      if (err) { setError(err); setStep(steps.indexOf(s) + 1); return }
    }

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
        /* Written here or it is not written at all: nothing else on
           this form touches it and the Account fold is the only other
           place it has ever been editable. */
        service_radius_km: Math.min(100, Math.max(1,
          parseInt(form.service_radius_km, 10) || 15)),
        heard_from:        form.heard_from || null,
        heard_from_detail: form.heard_from_detail.trim() || null,
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

      /* ── Turn the pincode into a point, or the partner is invisible ──
       *
       * This is the step that was missing, and it fails in the worst
       * possible way: silently. match_partners() requires
       * vendors.location, PostgREST cannot write a geography column,
       * and the form only ever stored six digits of text. So a master
       * could finish signup, be approved, list their trades, and never
       * receive a single job — with every screen showing them fully
       * onboarded and nothing anywhere reporting a problem.
       *
       * It happened to the only real partner in the database, and took
       * an hour to find. partner_readiness() (migration 079) now
       * reports it, and this stops it happening.
       */
      const { data: saved } = await supabase
        .from('vendors').select('id').eq('profile_id', user.id).maybeSingle()

      if (!saved?.id) {
        throw new Error('We saved your details but could not read them back. Please try once more.')
      }

      /* Asked of the DATABASE, not of the bundle.
       *
       * This used to call resolvePincode, which reads the 88 pincodes
       * compiled into the JavaScript. After migration 085 that is the
       * offline fallback and not the truth — so a master in an area we
       * activated last week would have been told we do not serve them,
       * by a table baked into the APK they installed a month ago. The
       * partner side has to read the same switch the customer side
       * does. */
      const place = await lookupPincode(form.pincode)

      if (place.status !== 'served') {
        /* Saved, but not dispatchable. Said plainly rather than letting
           them walk away believing they are live — and the two reasons
           get different words, because one of them is a typo.

           The line that stood here was setSaving(false). There has never
           been a setSaving on this component; the setter is setLoading.
           The ReferenceError was caught by the handler at the bottom and
           shown to the partner as "setSaving is not defined", in place
           of the sentence written for this exact moment. It failed on
           the one path nobody tests: a pincode we do not serve. */
        setError(
          place.status === 'unknown'
            ? `We cannot find the pincode ${form.pincode}. Worth checking those six digits.`
            : `We have your details, but we are not matching masters in ${form.pincode} yet. `
              + `We will be in touch when we reach your area.`,
        )
        setStep(steps.findIndex(s => s.id === 'location') + 1)
        return
      }

      /* ══════════════════════════════════════════════════════════════
         THE ERROR THIS THREW AWAY
         ══════════════════════════════════════════════════════════════

         This was `const { data: located } = await supabase.rpc(...)`
         and then, for anything that went wrong, "We could not place your
         business on the map. Please check the pincode." — one sentence
         for a network failure, an RLS refusal, a missing function, a
         PostGIS error, and an actually-bad pincode alike. Four of those
         five are not the pincode, and no amount of checking it would
         have helped.

         The pin if they gave one, the pincode centroid otherwise. A
         centroid is roughly 2 km out — fine for a city-wide list, and
         wrong for the radius test match_partners actually runs. */
      const { data: located, error: locErr } = await supabase.rpc('set_partner_location', {
        p_vendor_id: saved.id,
        p_pincode: form.pincode,
        p_lat: pinned?.lat ?? place.lat,
        p_lng: pinned?.lng ?? place.lng,
        p_area: place.area,
      })

      if (locErr) {
        setError(`Your details are saved, but we could not put you on the map: ${locErr.message}. Tell us and we will fix it — nothing you typed is lost.`)
        return
      }
      if (!located?.ok) {
        setError(located?.reason
          ? `We could not place your business: ${located.reason}.`
          : 'We could not place your business on the map. Please check the pincode.')
        setStep(steps.findIndex(s => s.id === 'location') + 1)
        return
      }

      /* ── The signature ────────────────────────────────────────────
         Last, and through an RPC. Last because it must attach to a
         vendor row that exists; through an RPC because a consent record
         composed by the consenting device is not a record. */
      if (needsAgreement) {
        const { data: signed, error: signErr } = await supabase.rpc('sign_partner_terms', {
          p_vendor_id: saved.id,
          p_version: PARTNER_TERMS_VERSION,
          p_signature: signature,
        })
        if (signErr) { setError(`We could not record your signature: ${signErr.message}`); return }
        if (!signed?.ok) {
          setError(signed?.reason === 'no_name'
            ? 'Please type your full name before signing.'
            : 'We could not record your signature. Please try once more.')
          return
        }
      }

      /* ══════════════════════════════════════════════════════════════
         INTO THE LISTING TAB, WITH THEIR TRADE ALREADY OPEN
         ══════════════════════════════════════════════════════════════

         This went to /dashboard/vendor, which opens on Jobs — so a
         partner who had just finished describing their business met an
         empty list. Empty because there are no jobs, because there are
         no listings, because they have not made one yet, and nothing on
         that screen was going to tell them so.

         It used to carry `start=<category>`, opening the add-item flow
         already on whichever trade they picked from a dropdown before
         seeing what any of them contained -- so a partner who chose
         Photography because it was near the top of an alphabetical list
         arrived in the photo-booth questions. The grid of twenty-six is
         the right screen: it is the one place that shows what this
         platform can actually list. An existing partner editing their
         profile goes back to Account, which is where they came from. */
      navigate(
        existing
          ? '/dashboard/vendor?tab=account'
          : '/dashboard/vendor?tab=list',
        { replace: true },
      )
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
              : `${total} short steps, then you can start listing what you do.`}
          </p>
        </div>

        {hydrating ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin text-plum-600" size={26} />
            <span className="text-sm">Loading your details…</span>
          </div>
        ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <StepIndicator current={step} total={total} />

          <form onSubmit={handleSubmit}>

            {/* ── Your business ── */}
            {stepId === 'business' && (
              <div className="space-y-5" data-step="business">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Your business</h2>
                </div>

                <Field label="Business name">
                  <input type="text" value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                    className="input" placeholder="e.g. Royal Caterers" autoFocus />
                </Field>

                <Field label="Describe your business" hint={`${form.description.length}/300`}>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value.slice(0, 300))}
                    className="input resize-none h-28"
                    placeholder="Tell customers what makes your service special, your specialties, signature offerings…"
                  />
                </Field>

                {/* Experience and price had a step to themselves. Two
                    number fields are not a step; they are the bottom of
                    this one, and cutting it is one whole screen a partner
                    no longer has to travel through. */}
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
              </div>
            )}

            {/* ── Your location ── */}
            {stepId === 'location' && (
              <div className="space-y-5" data-step="location">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Your location</h2>
                <p className="mb-4 text-[12.5px] leading-snug text-gray-500">
                  Jobs are matched by distance, so this decides what you are
                  offered more than anything else on this form.
                </p>

                {/* ══════════════════════════════════════════════════════
                    CAPTURED HERE, NOT ON THE SPLASH SCREEN
                    ══════════════════════════════════════════════════════

                    A location prompt on first launch is refused more than
                    anywhere else — nothing has been explained yet — and an
                    Android refusal is sticky: getting it back needs a trip
                    to Settings that nobody makes. Asking once, on the
                    screen headed "Your location", is the moment somebody
                    has already agreed to answer it.

                    A pincode centroid is roughly 2 km out. That is fine for
                    appearing in a city-wide list and wrong for a radius
                    filter, which is what dispatch actually runs. One tap
                    here replaces two kilometres of error with ten metres. */}
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-plum-200 bg-plum-50 py-3 text-[13.5px] font-extrabold text-plum-800 disabled:opacity-60"
                >
                  {locating
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Navigation size={15} />}
                  {locating ? 'Finding you…'
                    : pinned ? 'Update my location'
                    : 'Use my location'}
                </button>
                {pinned && (
                  <p className="-mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-forest-700">
                    <Check size={13} className="mt-0.5 shrink-0" />
                    <span>
                      Pinned to where you are now. The area and pincode below
                      were filled in from it — change either if they are not
                      right.
                    </span>
                  </p>
                )}

                {/* ══════════════════════════════════════════════════════
                    SOMEWHERE WE DO NOT SERVE IS NOT AN ERROR
                    ══════════════════════════════════════════════════════

                    A caterer in Mysuru has done nothing wrong and their
                    phone worked perfectly. Telling them "could not find
                    you" would be false, and stamping them Bengaluru so
                    the form can continue is worse — it puts a partner in
                    a dispatch pool 140 km from where they cook.

                    So: name the place, say plainly that we are not open
                    there, and take their interest. That row is the only
                    evidence that decides which city opens next. */}
                {outside && (
                  <div className="-mt-1 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <p className="text-[13.5px] font-extrabold text-amber-900">
                      {outside.city
                        ? `We are not in ${outside.city} yet`
                        : 'We are not in your area yet'}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-snug text-amber-800">
                      Your phone found you{outside.city ? ` in ${outside.city}` : ''} —
                      it is just outside the areas Sambramo covers today. We are
                      opening new cities steadily, and partners already waiting
                      is the main thing that decides which one is next.
                    </p>
                    <div className="mt-3">
                      <CityInterestForm
                        city={outside.city ?? ''}
                        locked={!!outside.city}
                        source="partner_onboarding"
                        prompt="Your city"
                      />
                    </div>
                    <p className="mt-3 text-[11.5px] leading-snug text-amber-700">
                      You can still finish this form with a pincode we do cover —
                      only do that if you genuinely travel there for work, because
                      it is where your jobs will come from.
                    </p>
                  </div>
                )}

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

                {/* service_radius_km has existed since 057 and has only
                    ever been editable in a fold on the Account tab, which
                    almost nobody opens. It is a hard filter in
                    match_partners: the default silently decides that a
                    partner never hears about a job 12 km away. */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    How far will you travel?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 25, 40, 60].map(km => (
                      <button key={km} type="button"
                        onClick={() => set('service_radius_km', km)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                          Number(form.service_radius_km) === km
                            ? 'border-plum-600 bg-plum-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
                        }`}>
                        {km} km
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">
                    You will not be offered jobs further out than this. It can
                    be changed any time.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cities you serve <span className="font-normal text-gray-500">(optional)</span>
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

            {/* ── How you found us ── */}
            {stepId === 'heard' && (
              <div className="space-y-5" data-step="heard">
                <div>
                  <h2 className="text-lg font-bold leading-tight text-gray-900">
                    How did you hear about Sambramo?
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-snug text-gray-500">
                    One tap. It decides where we look for the next partner —
                    and if somebody sent you, we would like to thank them.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HEARD_FROM.map(h => {
                    const Icon = h.icon
                    const on = form.heard_from === h.id
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => set('heard_from', h.id)}
                        aria-pressed={on}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13px] font-bold transition-colors ${
                          on
                            ? 'border-plum-600 bg-plum-50 text-plum-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-plum-300'
                        }`}
                      >
                        <Icon size={16} className={`shrink-0 ${on ? 'text-plum-600' : 'text-gray-400'}`} />
                        <span className="min-w-0">{h.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* The follow-up is the point of the referral options: "a
                    partner referred me" with no name is a statistic, and
                    with a name it is somebody to ring. */}
                {heardFrom(form.heard_from)?.detail && (
                  <Field label={heardFrom(form.heard_from).detail} hint="optional">
                    <input type="text" value={form.heard_from_detail}
                      onChange={e => set('heard_from_detail', e.target.value.slice(0, 120))}
                      className="input" placeholder="A name, a shop, an event…" autoFocus />
                  </Field>
                )}
              </div>
            )}

            {/* ── The agreement ── */}
            {stepId === 'agreement' && (
              <div className="space-y-4" data-step="agreement">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 rounded-xl bg-forest-50 p-2 text-forest-700">
                    <ShieldCheck size={17} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold leading-tight text-gray-900">
                      What you are agreeing to
                    </h2>
                    <p className="mt-1 text-[12.5px] leading-snug text-gray-500">
                      Everything here costs you money or your standing if it
                      takes you by surprise. Read it once, then sign it.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {PARTNER_RULES.map((r, i) => (
                    <li key={r.id} className="rounded-2xl bg-gray-50 p-3.5">
                      <p className="text-[13.5px] font-extrabold leading-snug text-gray-900">
                        <span className="text-gray-400">{i + 1}. </span>{r.title}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-gray-600">{r.body}</p>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setOpenLong(v => !v)}
                  aria-expanded={openLong}
                  className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-left"
                >
                  <span className="text-[13px] font-extrabold text-gray-900">
                    Read the full agreement
                  </span>
                  <ChevronDown size={16}
                    className={`text-gray-400 transition-transform ${openLong ? 'rotate-180' : ''}`} />
                </button>

                {openLong && (
                  <div className="space-y-3.5 rounded-2xl bg-gray-50/70 p-4">
                    {PARTNER_TERMS_LONG.map(sec => (
                      <div key={sec.heading}>
                        <h3 className="text-[12.5px] font-extrabold text-gray-900">{sec.heading}</h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{sec.text}</p>
                      </div>
                    ))}
                    <p className="pt-1 text-[11px] font-semibold text-gray-400">
                      Version {PARTNER_TERMS_VERSION}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900">
                    I have read these and I agree to work by them. I understand
                    that everything I list must be work I have really done.
                  </p>
                  <HoldToSign
                    value={signature}
                    onChange={setSignature}
                    label="Sign with your full name"
                    placeholder="As it appears on your ID"
                  />
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

              {!isLast ? (
                <button type="button" onClick={handleNext}
                  className="flex-1 btn-plum py-3 text-sm flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex-1 btn-cta py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading
                    ? 'Saving…'
                    : existing ? 'Save changes' : 'Sign and start listing →'}
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
        {hint && <span className="text-xs font-normal text-gray-500">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
