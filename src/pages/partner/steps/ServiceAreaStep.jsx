import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Loader2, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StepShell, { Field } from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import { readSavedAddress } from '../../../lib/partnerLocation'

const RADII = [5, 10, 15, 25, 40, 60, 100, 150]

export default function ServiceAreaStep() {
  const navigate = useNavigate()
  const { loading, account, refresh } = usePartnerOnboarding()
  const vendor = account.vendor
  const availability = account.availability ?? {}
  const weeklyRules = account.weeklyRules ?? []
  const address = readSavedAddress()

  const [radius, setRadius] = useState(15)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vendor?.service_radius_km) setRadius(Number(vendor.service_radius_km))
  }, [vendor?.service_radius_km])

  const calendarConfigured = useMemo(() => (
    weeklyRules.length > 0
    || Object.keys(availability).length > 0
    || !!vendor?.calendar_reviewed_through
  ), [weeklyRules.length, availability, vendor?.calendar_reviewed_through])

  async function saveAreaAndContinue() {
    if (!vendor?.id || saving) return
    if (!Number.isFinite(Number(radius)) || Number(radius) < 1) {
      setError('Choose a service radius before continuing.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('vendors')
        .update({ service_radius_km: Math.min(150, Math.max(1, Number(radius))) })
        .eq('id', vendor.id)
      if (err) throw err
      await refresh()

      if (calendarConfigured) {
        navigate('/partner/setup/compliance')
      } else {
        navigate('/dashboard/vendor?tab=availability&return=setup')
      }
    } catch (e) {
      setError(e?.message ?? 'Could not save your service area.')
    } finally {
      setSaving(false)
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
    <StepShell
      stepId="area"
      cta={calendarConfigured ? 'Continue to verification' : 'Open Calendar & set availability'}
      canContinue={!!vendor}
      busy={saving}
      onContinue={saveAreaAndContinue}
    >
      <div className="partner-v2-feature p-4">
        <p className="partner-v2-meta">Step 3 · service area & availability</p>
        <h2 className="mt-1 partner-v2-section-title">Where and when do you work?</h2>
        <p className="mt-1.5 partner-v2-body">Set your travel radius here. Your Calendar controls the dates and capacity Sambramo can offer.</p>
      </div>

      <section className="mt-4 partner-v2-card p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-plum-600">Starting location</p>
        <p className="mt-2 flex items-start gap-1.5 text-[14px] font-extrabold leading-snug text-plum-950">
          <MapPin size={15} className="mt-0.5 shrink-0" />
          {address?.line ?? ([vendor?.city, vendor?.pincode].filter(Boolean).join(' ') || 'Location not set')}
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">
          This is the location Sambramo uses when checking which jobs are within your service radius.
        </p>
      </section>

      <section className="mt-3 partner-v2-card p-4">
        <Field
          label="How far will you travel?"
          hint="Only jobs within this radius can be offered to you."
        >
          <div className="flex flex-wrap gap-2">
            {RADII.map(km => (
              <button
                key={km}
                type="button"
                onClick={() => { setRadius(km); setError('') }}
                aria-pressed={radius === km}
                className={'rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' +
                  (radius === km
                    ? 'bg-plum-600 text-white'
                    : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]')}
              >
                {km} km
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="mt-3 partner-v2-feature overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A085C] text-white">
            <CalendarDays size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-black text-plum-950">Your calendar controls your jobs.</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink/70">
              Set your usual working week once in Calendar, then block busy dates or open exceptions.
              Sambramo only offers scheduled work when your calendar and capacity allow it.
            </p>
            <p className="mt-2 text-[10.5px] font-extrabold text-plum-700">
              You do not need to manually fill every day. The standing week covers the normal pattern; the calendar is for exceptions and real bookings.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={saveAreaAndContinue}
          disabled={!vendor || saving}
          className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-plum-700 text-[13px] font-extrabold text-white disabled:opacity-45"
        >
          <CalendarDays size={15} />
          {calendarConfigured ? 'Review calendar' : 'Open Calendar now'}
        </button>
      </section>

      {calendarConfigured && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-forest-50 px-3.5 py-3 text-[12px] font-bold text-forest-800 ring-1 ring-forest-200">
          <CheckCircle2 size={15} />
          Availability has been configured. Sambramo will use it when matching scheduled jobs.
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-3.5 py-3 text-[12px] font-bold text-rose-700">
          {error}
        </p>
      )}
    </StepShell>
  )
}
