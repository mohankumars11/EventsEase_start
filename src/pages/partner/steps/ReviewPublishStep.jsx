import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, Pencil, ShieldCheck } from 'lucide-react'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { supabase } from '../../../lib/supabase'

/**
 * Step 6 · review, then ask to be looked at.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SUBMITTING IS A REQUEST, NOT AN OUTCOME
 * ══════════════════════════════════════════════════════════════════════
 *
 * The button says "Submit for review" and it sets
 * `verification_status = 'submitted'`. It does not set `is_verified`,
 * it does not set `status = APPROVED`, and it cannot: 067's trigger
 * reverts any partner-side attempt at those, and 075 leaves exactly one
 * transition open to a partner — draft/rejected -> submitted.
 *
 * That constraint is the product rule, not an obstacle to it. A partner
 * who could publish themselves is a marketplace where "verified" means
 * nothing.
 */
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
  const [error, setError] = useState(null)

  const v = account.vendor
  const earlier = steps.filter(s => s.id !== 'review')
  const allDone = earlier.every(s => s.status === 'COMPLETE')
  const already = ['submitted', 'approved'].includes(v?.verification_status)

  async function submit() {
    if (!v?.id || busy) return
    setBusy(true); setError(null)
    try {
      /* ── submit_for_review(), not a raw UPDATE ──────────────────────
         The update wrote `verification_status` and nothing else, so
         there was no deadline anywhere and "under review" had no end to
         it. The RPC (migration 142) stamps `review_due_at` 24 hours out
         in the same statement, which is what the countdown on the Jobs
         tab reads.

         It also refuses to restart a clock that is already running —
         re-submitting is a replay, not a fresh 24 hours — and that rule
         belongs in the database rather than in whichever screen happens
         to call it. */
      const { data, error: err } = await supabase.rpc('submit_for_review')
      if (err) {
        /* 142 not pasted yet. Fall back to what the screen did before,
           so a device ahead of the database still works — it simply has
           no countdown until the migration lands. */
        const missing = err.code === 'PGRST202' || /Could not find the function/i.test(err.message ?? '')
        if (!missing) throw err
        const { error: e2 } = await supabase.from('vendors')
          .update({ verification_status: 'submitted' }).eq('id', v.id)
        if (e2) throw e2
      } else if (data && data.ok === false) {
        throw new Error(data.says ?? 'We could not send this for review just now.')
      }
      await refresh()
      navigate('/dashboard/vendor')
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
      cta={already ? 'View your status' : 'Submit for review'}
      canContinue={allDone}
      busy={busy}
      onContinue={already ? () => navigate('/dashboard/vendor') : submit}
    >
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Review &amp; publish
      </h1>
      <p className="mb-5 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        Check everything over. You can still change any of it after submitting.
      </p>

      <ul className="mb-5 flex flex-col gap-2">
        {earlier.map(s => (
          <li key={s.id}>
            <button
              type="button"
              data-review-row={s.id}
              onClick={() => navigate(ROUTES[s.id])}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.07]"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                s.status === 'COMPLETE' ? 'bg-forest-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
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

      {/* What the customer will actually see, assembled from the rows
          rather than described — a preview that does not match the
          listing is worse than none. */}
      <div className="mb-5 rounded-[20px] bg-plum-950 p-4 text-white">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-plum-300">
          How customers will see you
        </p>
        <p className="mt-2 text-[17px] font-extrabold leading-tight">
          {v?.business_name ?? 'Your business'}
        </p>
        <p className="mt-1 text-[12.5px] text-white/70">
          {[v?.city, v?.service_radius_km ? `within ${v.service_radius_km} km` : null]
            .filter(Boolean).join(' · ')}
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-white/80">
          {v?.description ?? 'Your description will appear here.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(account.listings ?? []).map(l => (
            <span key={l.trade} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
              {l.trade}
            </span>
          ))}
        </div>
      </div>

      {/* White, not forest-50. The partner app has one ground colour
          (#FFFFFF, index.css) and a tinted panel here was a plane
          against it. The ring carries the boundary instead.

          The wording no longer says "Your profile is with our team" --
          that sentence was removed everywhere it appeared. */}
      {already ? (
        <p className="flex items-start gap-2 rounded-2xl bg-white px-3.5 py-3 text-[12.5px] leading-snug text-ink ring-1 ring-ink/[0.08]">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest-600" />
          <span>
            {v.verification_status === 'approved'
              ? 'Your profile has been approved. You are live.'
              : 'Submitted. We will let you know as soon as it is checked.'}
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-2xl bg-ink/[0.03] px-3.5 py-3 text-[12.5px] leading-snug text-ink-soft">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            Your profile and services will be reviewed by the Sambramo team before
            they go live. Submitting does not make you verified — a person reads it.
          </span>
        </p>
      )}

      {!allDone && (
        <p className="mt-3 text-center text-[12px] text-ink-mute">
          Finish the steps above before submitting.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-700">{error}</p>
      )}
    </StepShell>
  )
}
