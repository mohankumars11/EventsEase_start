import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, Pencil, ShieldCheck, Eye, Send, Clock3, AlertTriangle } from 'lucide-react'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'

const ROUTES = {
  business: '/partner/setup/services',
  details: '/partner/setup/details',
  area: '/partner/setup/area',
  compliance: '/partner/setup/compliance',
  bank: '/partner/setup/bank',
}

export default function ReviewPublishStep() {
  const navigate = useNavigate()
  const { loading, account, steps, refresh } = usePartnerOnboarding()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const v = account.vendor
  const earlier = steps.filter(s => s.id !== 'review')
  const allDone = earlier.every(s => s.status === 'COMPLETE')
  const status = v?.verification_status
  const submitted = status === 'submitted'
  const live = status === 'approved' && v?.is_verified && v?.status === 'APPROVED'
  const actionRequired = status === 'rejected'
  const canSubmit = allDone && !submitted && !live

  async function submit() {
    if (!v?.id || busy || !canSubmit) return
    setBusy(true); setError('')
    try {
      const { data, error: err } = await supabase.rpc('submit_sambramo_business')
      if (err) throw err
      if (data && data.ok === false) throw new Error(data.says ?? data.reason ?? 'Could not submit this business.')
      await refresh()
    } catch (e) {
      setError(e?.message ?? 'Could not submit. Try once more.')
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
    <StepShell
      stepId="review"
      cta={submitted || live ? 'View customer preview' : actionRequired ? 'Open customer preview' : 'Submit for Sambramo review'}
      canContinue={submitted || live || actionRequired ? true : canSubmit}
      busy={busy}
      onContinue={() => {
        if (submitted || live || actionRequired) navigate('/partner/setup/preview')
        else submit()
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.15em] text-plum-600">Final launch gate</p>
          <h1 className="mt-1 text-[clamp(1.4rem,6vw,1.8rem)] font-extrabold leading-tight tracking-tight text-plum-950">
            Review &amp; publish
          </h1>
          <p className="mb-4 mt-2 text-[13.5px] leading-relaxed text-ink/65">
            See exactly what customers will see, fix anything you want, then send this version to Sambramo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/partner/setup/preview')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-plum-950 text-white shadow-[0_8px_20px_rgba(42,8,92,0.16)]"
          aria-label="Open customer preview"
        >
          <Eye size={17} />
        </button>
      </div>

      <div className="mb-4 rounded-[20px] bg-plum-950 p-4 text-white">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-plum-200">Partner profile preview</p>
        <p className="mt-1 text-[14px] font-extrabold">Review the information you have added. Pricing, verification and customer visibility follow their actual saved status.</p>
        <button
          type="button"
          onClick={() => navigate('/partner/setup/preview')}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-extrabold text-plum-950"
        >
          <Eye size={13} /> Open Business Preview
        </button>
      </div>

      <ul className="mb-4 flex flex-col gap-2">
        {earlier.map(s => (
          <li key={s.id}>
            <button
              type="button"
              data-review-row={s.id}
              onClick={() => navigate(ROUTES[s.id])}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.07]"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${s.status === 'COMPLETE' ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {s.status === 'COMPLETE' ? <Check size={15} strokeWidth={3} /> : <Pencil size={13} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold leading-tight text-ink">{s.title}</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                  {s.detail ?? (s.status === 'COMPLETE' ? 'Complete' : 'Still to finish')}
                </span>
              </span>
              <Pencil size={14} className="shrink-0 text-ink-mute" />
            </button>
          </li>
        ))}
      </ul>

      {submitted && (
        <div className="mb-3 flex items-start gap-2.5 rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-[13.5px] font-extrabold text-amber-950">Sambramo is reviewing your business</p>
            <p className="mt-1 text-[12px] leading-relaxed text-amber-900/75">
              Minimum review window: 2 hours. Publishing is controlled by the Sambramo team.
            </p>
          </div>
        </div>
      )}

      {live && (
        <div className="mb-3 flex items-start gap-2.5 rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest-700" />
          <div>
            <p className="text-[13.5px] font-extrabold text-forest-950">Your business is LIVE</p>
            <p className="mt-1 text-[12px] leading-relaxed text-forest-800/75">Customers can see the approved version. Material future edits create a new reviewable version.</p>
          </div>
        </div>
      )}

      {actionRequired && (
        <div className="mb-3 flex items-start gap-2.5 rounded-[20px] bg-rose-50 p-4 ring-1 ring-rose-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-700" />
          <div>
            <p className="text-[13.5px] font-extrabold text-rose-950">Correction required</p>
            <p className="mt-1 text-[12px] leading-relaxed text-rose-800">
              Sambramo sent this version back. Fix the requested details, preview again and resubmit within the controlled review-round limit.
            </p>
            {v?.verification_note && (
              <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11.5px] font-semibold text-rose-900">{v.verification_note}</p>
            )}
          </div>
        </div>
      )}

      {!submitted && !live && !actionRequired && (
        <div className="flex items-start gap-2 rounded-[20px] bg-ink/[0.03] px-3.5 py-3 text-[12px] leading-snug text-ink-soft ring-1 ring-ink/[0.06]">
          <Send size={14} className="mt-0.5 shrink-0 text-plum-700" />
          <span>
            Submit creates an immutable review version. The Sambramo team reviews that exact version before it can appear to customers.
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}

      <button
        type="button"
        data-review-home="true"
        onClick={() => navigate('/dashboard/vendor?tab=jobs')}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-plum-200 bg-white px-4 text-[13.5px] font-extrabold text-plum-700"
      >
        Go to Partner Home
      </button>

      {!allDone && !submitted && !live && !actionRequired && (
        <p className="mt-3 text-center text-[12px] text-ink-mute">
          Finish the steps above before submitting.
        </p>
      )}
    </StepShell>
  )
}
