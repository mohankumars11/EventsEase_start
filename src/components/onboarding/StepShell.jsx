import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { STEPS } from '../../lib/partnerOnboarding'

/**
 * Shared mobile frame for every Partner onboarding step.
 * The step header, six-part progress, scrolling body and sticky action
 * are intentionally identical across the journey.
 */
export default function StepShell({
  stepId,
  children,
  cta = 'Save & continue',
  onContinue,
  canContinue = true,
  busy = false,
  onBack,
  subProgress = null,
  onBlocked,
}) {
  const navigate = useNavigate()
  const index = STEPS.findIndex(s => s.id === stepId)
  const step = STEPS[index]
  if (!step) return null

  return (
    <div className="native-screen partner-v2-screen flex min-h-[100dvh] flex-col bg-white">
      <header className="safe-top partner-v2-step-header">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate('/partner/setup'))}
          aria-label="Back to setup"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink ring-1 ring-ink/[0.08] shadow-sm active:bg-ink/[0.03]"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="pt-3">
          <p className="partner-v2-step-label">Partner setup · Step {index + 1} of {STEPS.length}</p>
          <h1 className="partner-v2-step-title">{step.title}</h1>
          {subProgress && <p className="mt-2 text-[12px] font-bold text-ink-mute">{subProgress}</p>}
          <div className="partner-v2-progress" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
            ))}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto partner-v2-container">
        <div className="pb-6 pt-5">{children}</div>
      </main>

      <div className="partner-v2-sticky-cta">
        <button
          type="button"
          data-cta="step-continue"
          disabled={busy || (!canContinue && !onBlocked)}
          aria-disabled={!canContinue || busy ? true : undefined}
          data-blocked={!canContinue ? 'true' : undefined}
          onClick={!canContinue && onBlocked ? onBlocked : onContinue}
          className="partner-v2-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          <span>{cta}</span>
        </button>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="mb-5 block">
      <span className="mb-1.5 block text-[13px] font-extrabold text-plum-950">{label}</span>
      {hint && <span className="mb-1.5 block text-[12px] leading-snug text-ink-mute">{hint}</span>}
      {children}
    </label>
  )
}

export const inputClass =
  'partner-v2-field w-full rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-ink ' +
  'placeholder:font-normal placeholder:text-ink-mute focus:outline-none'
