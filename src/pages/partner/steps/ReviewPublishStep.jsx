import { useState } from 'react'
import { Check, ChevronRight, Clock3, Edit3, Loader2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'

const ROUTES = {
  business: '/partner/setup/details',
  services: '/partner/setup/services',
  area: '/partner/setup/area',
  compliance: '/partner/setup/compliance',
  bank: '/partner/setup/bank',
}

export default function ReviewPublishStep() {
  const navigate = useNavigate()
  const { loading, account, steps, refresh } = usePartnerOnboarding()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const vendor = account.vendor
  const earlier = steps.filter(s => s.id !== 'review')
  const allDone = earlier.every(s => s.status === 'COMPLETE')
  const submitted = ['submitted','approved'].includes(vendor?.verification_status)
  const pricing = account.pricing?.byService ?? {}
  const listings = account.listings ?? []
  const serviceRows = listings.flatMap(l => (l.offerings ?? []).map(o => ({ listing: l, offering: o, pricing: pricing[o.id] ?? {} })))

  async function submit() {
    if (busy || submitted || !vendor?.id) return
    if (!allDone) { setError('Complete every required section before submitting.'); return }
    setBusy(true); setError('')
    try {
      const { data, error: err } = await supabase.rpc('submit_sambramo_partner_application')
      if (err) throw err
      if (data?.ok === false) {
        const missing = Array.isArray(data.missing) ? data.missing.join(', ') : ''
        throw new Error(missing ? 'Still missing: ' + missing : data.reason || 'Application could not be submitted.')
      }
      await refresh()
      navigate('/dashboard/vendor')
    } catch (e) {
      setError(e?.message ?? 'Could not submit your Sambramo application.')
    } finally { setBusy(false) }
  }

  if (loading) return <div className="native-screen flex items-center justify-center bg-white"><Loader2 size={26} className="animate-spin text-plum-600" /></div>

  return (
    <StepShell stepId="review" cta={submitted ? 'View partner dashboard' : 'Review & submit application'} canContinue={submitted || allDone} busy={busy} onContinue={submitted ? () => navigate('/dashboard/vendor') : submit}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">Review &amp; submit</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">One final review. Your business, services, pricing, calendar, verification and payout are submitted together.</p>

      <div className="mt-5 space-y-2.5">
        {earlier.map(s => {
          const tone = s.status === 'COMPLETE' ? 'bg-forest-50 text-forest-800 ring-forest-200' : s.status === 'REQUIRES_ACTION' ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-white text-ink ring-ink/[0.08]'
          return <button key={s.id} type="button" onClick={() => ROUTES[s.id] && navigate(ROUTES[s.id])} className={'flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 ' + tone}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70">{s.status === 'COMPLETE' ? <Check size={16} strokeWidth={3} /> : <Edit3 size={15} />}</span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-extrabold">{s.title}</span><span className="mt-0.5 block text-[11px] opacity-75">{s.detail || s.blurb}</span></span>{s.id !== 'review' && <ChevronRight size={16} className="shrink-0" />}</button>
        })}
      </div>

      <section className="mt-5 rounded-[24px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-plum-600">Customer-ready services</p><h2 className="mt-1 text-[18px] font-extrabold text-ink">{serviceRows.length} service{serviceRows.length === 1 ? '' : 's'}</h2></div><ShieldCheck size={19} className="text-plum-700" /></div>
        <ul className="mt-3 space-y-2">
          {serviceRows.map(row => <li key={row.offering.id} className="rounded-2xl bg-surface p-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-600 text-white"><Check size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-extrabold text-ink">{row.offering.name || row.listing.trade}</p><p className="text-[10.5px] text-ink-mute">{row.listing.trade} · {row.pricing.live ? 'Live' : row.pricing.review ? 'Pricing ready for review' : 'Pricing ready'}</p></div></div></li>)}
        </ul>
        {!serviceRows.length && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11.5px] font-bold text-amber-900">Add at least one service and one customer-ready pricing package.</p>}
      </section>

      <section className="mt-4 rounded-[24px] bg-plum-950 p-4 text-white">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-plum-300">Availability controls dispatch</p>
        <p className="mt-2 text-[14px] font-extrabold">{account.vendor?.city || 'Your service area'} · {account.vendor?.service_radius_km || '—'} km</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/70">Your Calendar is the availability authority. Sambramo only offers scheduled work when the partner is available and capacity permits.</p>
        <button type="button" onClick={() => navigate('/dashboard/vendor?tab=availability')} className="mt-3 flex items-center gap-1 text-[11.5px] font-extrabold text-white underline"><Clock3 size={13} /> Review Calendar</button>
      </section>

      <section className="mt-4 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">What happens after submit</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold text-ink-soft"><span className="rounded-full bg-plum-50 px-2.5 py-1">Application submitted</span><span>→</span><span className="rounded-full bg-amber-50 px-2.5 py-1">Sambramo review</span><span>→</span><span className="rounded-full bg-forest-50 px-2.5 py-1">Approved &amp; live</span></div>
        {submitted && <p className="mt-3 rounded-2xl bg-forest-50 p-3 text-[11.5px] font-bold leading-relaxed text-forest-800">{vendor?.verification_status === 'approved' ? 'Approved. Your live services can receive eligible jobs.' : 'Submitted. New jobs and services open after Sambramo approval.'}</p>}
      </section>

      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-3.5 py-3 text-[12px] font-bold text-rose-700">{error}</p>}
    </StepShell>
  )
}