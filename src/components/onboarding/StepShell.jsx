import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { STEPS } from '../../lib/partnerOnboarding'

/**
 * The frame every onboarding step sits in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO PROGRESS INDICATORS, AND THE OUTER ONE ALWAYS WINS
 * ══════════════════════════════════════════════════════════════════════
 *
 * §33: inside a trade questionnaire there are two things a partner
 * needs to know at once — which of the six steps they are in, and how
 * far through this particular trade they are. The failure mode is the
 * inner one replacing the outer, so a caterer eleven screens into
 * cuisines believes the eleven screens ARE the onboarding.
 *
 * So the outer position is stated first, in the header, on every step:
 *
 *   BUSINESS & SERVICES · STEP 1 OF 6
 *
 * and anything a step wants to say about its own internal progress goes
 * underneath, visibly subordinate.
 *
 * ── The CTA is sticky and the content scrolls under it ─────────────
 * A partner filling a form on a 360px phone with the keyboard up has
 * about 200px of usable height. The one button that moves them forward
 * must never be the thing that scrolled away.
 */
export default function StepShell({
  stepId,
  children,
  /* The primary action. Disabled until the step is satisfiable, so the
     partner is never invited to press something that will refuse. */
  cta = 'Save & continue',
  onContinue,
  canContinue = true,
  busy = false,
  /* Where back goes. Defaults to the six-step home, which is where
     every step belongs to — never to the previous step, because the
     partner may have arrived here by editing a finished one. */
  onBack,
  /* A step may put its own line under the header: "3 of 5 cuisines",
     "2 of 4 documents". Subordinate to the step counter above it. */
  subProgress = null,
  /* Opt-in. A disabled button cannot be pressed, so on a step where a
     required box has never been touched, Continue looked dead and no
     message ever appeared. A step that passes `onBlocked` keeps the
     button looking exactly as disabled, but a press runs onBlocked —
     which reveals every error and moves to the first — instead of
     doing nothing. Steps that do not pass it behave as before. */
  onBlocked,
}) {
  const navigate = useNavigate()
  const index = STEPS.findIndex(s => s.id === stepId)
  const step = STEPS[index]
  if (!step) return null

  return (
    <div className="partner-mobile native-screen flex flex-col bg-white">
      <div className="safe-top border-b border-ink/[0.06] bg-white px-4 pt-2 pb-2">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate('/partner/setup'))}
          aria-label="Back to setup"
          className="sp-touch flex h-11 w-11 items-center justify-center rounded-full text-ink/70 active:bg-ink/[0.04]"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
        {/* The outer position, always. */}
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-plum-600">
          {step.title} · Step {index + 1} of {STEPS.length}
        </p>

        {/* Six ticks, so "how much is left" is answered without reading. */}
        <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full ${
                i < index ? 'bg-plum-600' : i === index ? 'bg-plum-400' : 'bg-ink/[0.09]'
              }`}
            />
          ))}
        </div>

        {subProgress && (
          <p className="mt-2 text-[11.5px] font-semibold text-ink-mute">{subProgress}</p>
        )}

        <div className="pb-8 pt-5">{children}</div>
      </div>

      <div className="safe-cta border-t border-ink/[0.08] bg-white px-4 pt-3 sm:px-6">
        <button
          type="button"
          data-cta="step-continue"
          disabled={busy || (!canContinue && !onBlocked)}
          aria-disabled={!canContinue || busy ? true : undefined}
          data-blocked={!canContinue ? 'true' : undefined}
          onClick={!canContinue && onBlocked ? onBlocked : onContinue}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[15px]
                     bg-plum-700 text-[14px] font-extrabold
                     text-white transition active:scale-[0.99] disabled:opacity-40 aria-disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {cta}
        </button>
      </div>
    </div>
  )
}

/* Shared field chrome, so six screens do not each invent a label. */
export function Field({ label, hint, children }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-extrabold text-plum-950">{label}</span>
      {hint && <span className="mb-1.5 block text-[12px] leading-snug text-ink-mute">{hint}</span>}
      {children}
    </label>
  )
}

export const inputClass =
  'w-full min-h-[52px] rounded-[15px] bg-white px-4 py-3 text-[15px] font-semibold text-ink ' +
  'ring-1 ring-ink/[0.10] placeholder:font-normal placeholder:text-ink-mute ' +
  'focus:outline-none focus:ring-2 focus:ring-plum-500'
