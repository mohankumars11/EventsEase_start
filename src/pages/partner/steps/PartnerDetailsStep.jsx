import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import StepShell, { Field, inputClass } from '../../../components/onboarding/StepShell'
import ValidatedField from '../../../components/partner/ValidatedField'
import { useServerErrors, focusFirstInvalid } from '../../../components/partner/FieldCheck'
import { asFormError } from '../../../lib/validation/serverError'
import { validateStep, normalise } from '../../../lib/validation/fieldRules'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'

/**
 * Step 1 · business profile.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONLY WHAT WE DO NOT ALREADY KNOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * The email is verified, the name may be on the profile and the
 * business name was typed during sign-up. Asking for them again is how
 * a form teaches somebody it is not paying attention — so the known
 * values are shown, filled in, and the partner only completes what is
 * genuinely missing.
 *
 * Four fields decide whether this step is done, and each earns its
 * place by being something a coordinator needs on the day:
 *
 *   business name   what the customer is told is coming
 *   phone           how they are reached when something changes
 *   description     what they actually do, in their words
 *   years           how long they have been doing it
 *
 * Website and social are collected and never required: a decorator who
 * works entirely through WhatsApp is not a worse partner.
 */
export default function PartnerDetailsStep() {
  const navigate = useNavigate()
  const { loading, account, refresh, profile } = usePartnerOnboarding()
  const v = account.vendor

  const [form, setForm] = useState({
    business_name: '', contact_phone: '', description: '',
    years_active: '', website_url: '', instagram_url: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!v) return
    setForm(f => ({
      business_name: v.business_name ?? f.business_name,
      contact_phone: v.contact_phone ?? profile?.phone ?? f.contact_phone,
      description: v.description ?? f.description,
      years_active: String(v.years_active ?? v.years_experience ?? '') || '',
      website_url: v.website_url ?? '',
      instagram_url: v.instagram_url ?? '',
    }))
  }, [v, profile])

  const server = useServerErrors()
  const set = (k, val) => { server.clear(k); setForm(f => ({ ...f, [k]: val })) }
  /* Continue asks the rule engine, not a list of non-empty strings.
     The old test passed for a business_name of "1" and a phone of
     "hello" -- present is not the same as correct. */
  const check = validateStep('details', form)
  const ready = check.canContinue
  const [showAll, setShowAll] = useState(false)

  /* Every problem at once, and the first one in view. */
  const reveal = () => { setShowAll(true); setTimeout(() => focusFirstInvalid(), 0) }

  async function save() {
    if (!v?.id || busy) return
    /* Continue is disabled when this is false, but a form can also be
       submitted by a keyboard. The gate belongs here too. */
    if (!validateStep('details', form).canContinue) { reveal(); return }
    setBusy(true); setError(null)
    try {
      const { error: err } = await supabase.from('vendors').update({
        business_name: normalise('business_name', form.business_name),
        contact_phone: normalise('contact_phone', form.contact_phone),
        description: normalise('description', form.description),
        years_active: form.years_active === '' ? 0 : Number(normalise('years_active', form.years_active)),
        website_url: normalise('website_url', form.website_url) || null,
        instagram_url: normalise('instagram_url', form.instagram_url) || null,
      }).eq('id', v.id)
      if (err) throw asFormError(err)
      await refresh()
      navigate('/partner/setup/services')
    } catch (e) {
      /* A refusal from the server goes under its box; only a network or
         other failure uses the banner. */
      if (!server.take(e)) setError(e?.message ?? 'Could not save. Try once more.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="native-screen flex items-center justify-center bg-white">
        <Loader2 size={26} className="animate-spin text-plum-600" />
      </div>
    )
  }

  return (
    <StepShell stepId="business" canContinue={ready} busy={busy}
      onBlocked={reveal}
      onContinue={() => { setShowAll(true); save() }}>
      <div className="partner-v2-feature mb-5 p-4">
        <p className="partner-v2-meta">Step 1 · business profile</p>
        <h2 className="mt-1 partner-v2-section-title">Tell us about your business</h2>
        <p className="mt-1.5 partner-v2-body">These details become the foundation of your public partner profile.</p>
      </div>
      <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        This is what a customer and our coordinators see about your business.
      </p>

      {/* Already known, and shown rather than asked for again. */}
      {(profile?.email || profile?.full_name) && (
        <div className="mb-5 rounded-2xl bg-forest-50 p-3.5 ring-1 ring-forest-200">
          <p className="text-[12px] font-extrabold text-forest-800">Already verified</p>
          {profile?.full_name && <p className="mt-1 text-[12.5px] text-forest-900">{profile.full_name}</p>}
          {profile?.email && <p className="text-[12.5px] text-forest-900">{profile.email}</p>}
        </div>
      )}

      <ValidatedField
        field="business_name" value={form.business_name} showAll={showAll}
        serverError={server.errors.business_name}
        onChange={val => set('business_name', val)}
        hint="What customers will see on your offer."
        placeholder="Anna Ruchi Caterers" autoComplete="organization" />

      <ValidatedField
        field="contact_phone" value={form.contact_phone} showAll={showAll}
        serverError={server.errors.contact_phone}
        onChange={val => set('contact_phone', val)}
        label="Contact number" inputMode="tel" autoComplete="tel"
        hint="The number we ring on the day of an event."
        placeholder="98450 00000" />

      <ValidatedField
        field="years_active" value={form.years_active} showAll={showAll}
        serverError={server.errors.years_active}
        onChange={val => set('years_active', val)}
        inputMode="numeric" placeholder="12" />

      <ValidatedField
        field="description" value={form.description} showAll={showAll}
        serverError={server.errors.description}
        onChange={val => set('description', val)}
        label="About your business" multiline
        hint="A few lines in your own words. Contact details are shared once a job is confirmed, so they do not go here."
        placeholder="Pure vegetarian catering for weddings and house functions since 2011." />

      <ValidatedField
        field="instagram_url" value={form.instagram_url} showAll={showAll}
        serverError={server.errors.instagram_url}
        onChange={val => set('instagram_url', val)}
        label="Instagram" placeholder="instagram.com/yourwork" />

      {error && (
        <p className="rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}
    </StepShell>
  )
}
