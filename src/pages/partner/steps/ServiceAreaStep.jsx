import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin } from 'lucide-react'
import StepShell, { Field, inputClass } from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'
import { readSavedAddress } from '../../../lib/partnerLocation'

/**
 * Step 3 · where they work and when.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FIX IS NOT ASKED FOR AGAIN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The GPS fix was taken before the login and confirmed on its own
 * screen. Asking a partner to type their city here would be the third
 * time the app has raised the subject, and the typed answer would be
 * worse than the one already held.
 *
 * So the confirmed location is shown as a fact, with a way to change
 * it, and this step asks the two things that are genuinely still
 * unknown: how far they will travel, and when they work.
 *
 * ── Radius is chips, and the range goes to 150 km ──────────────────
 * A slider gives about three pixels per kilometre on a 360px phone, so
 * somebody aiming for 25 lands on 23 and cannot tell. The range reaches
 * 150 because a partner in Mysuru who serves Bengaluru is a real case —
 * capping the honest answer at 60 would make them undispatchable.
 */
const RADII = [5, 10, 15, 25, 40, 60, 100, 150]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ServiceAreaStep() {
  const navigate = useNavigate()
  const { loading, account, refresh } = usePartnerOnboarding()
  const v = account.vendor
  const addr = readSavedAddress()

  const [radius, setRadius] = useState(15)
  const [offDays, setOffDays] = useState([])
  const [lead, setLead] = useState('2')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!v) return
    setRadius(Number(v.service_radius_km) || 15)
    setOffDays(Array.isArray(v.weekly_days_off) ? v.weekly_days_off : [])
    setLead(String(v.lead_time_days ?? 2))
  }, [v])

  const toggleDay = i => setOffDays(d => (d.includes(i) ? d.filter(x => x !== i) : [...d, i]))
  const located = !!v?.city && !!v?.pincode

  async function save() {
    if (!v?.id || busy) return
    setBusy(true); setError(null)
    try {
      const { error: err } = await supabase.from('vendors').update({
        service_radius_km: Math.min(200, Math.max(1, radius)),
        weekly_days_off: offDays,
        lead_time_days: Math.max(0, Number(lead) || 0),
      }).eq('id', v.id)
      if (err) throw err
      await refresh()
      navigate('/partner/setup/compliance')
    } catch (e) {
      setError(e?.message ?? 'Could not save. Try once more.')
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
    <StepShell stepId="area" canContinue={located} busy={busy} onContinue={save}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Service area &amp; availability
      </h1>
      <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        We only offer you jobs inside the circle you set here.
      </p>

      {/* The fix already taken, stated rather than re-asked. */}
      <div className="mb-6 rounded-[20px] bg-plum-50 p-4 ring-1 ring-plum-200">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-plum-600">
          Starting location
        </p>
        <p className="mt-1.5 flex items-start gap-1.5 text-[14.5px] font-extrabold leading-snug text-plum-950">
          <MapPin size={15} className="mt-0.5 shrink-0" />
          {addr?.line ?? (located ? `${v.city} ${v.pincode}` : 'Not set')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/partner/location')}
          className="mt-2 text-[12px] font-extrabold text-plum-700 underline"
        >
          Change location
        </button>
      </div>

      <Field label="How far will you travel?"
             hint="Widen it to see more work; narrow it to stop being sent across the city.">
        <div className="flex flex-wrap gap-2">
          {RADII.map(km => (
            <button
              key={km} type="button" data-radius={km}
              onClick={() => setRadius(km)}
              aria-pressed={radius === km}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ${
                radius === km
                  ? 'bg-plum-600 text-white'
                  : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </Field>

      <Field label="Days you do not work" hint="Leave all unticked if you work every day.">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button
              key={d} type="button"
              onClick={() => toggleDay(i)}
              aria-pressed={offDays.includes(i)}
              className={`rounded-full px-3 py-2 text-[12.5px] font-extrabold transition ${
                offDays.includes(i)
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Notice you need" hint="The shortest warning you can take a job on, in days.">
        <input className={inputClass} inputMode="numeric" value={lead}
          onChange={e => setLead(e.target.value.replace(/\D/g, ''))} placeholder="2" />
      </Field>

      {!located && (
        <p className="rounded-2xl bg-amber-50 px-3 py-2.5 text-[12.5px] font-semibold leading-snug text-amber-900">
          We do not have a confirmed location for you yet. Set it above — dispatch
          measures every job from that point.
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}
    </StepShell>
  )
}
