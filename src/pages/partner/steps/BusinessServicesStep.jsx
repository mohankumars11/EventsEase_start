import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Loader2, Check } from 'lucide-react'
import StepShell from '../../../components/onboarding/StepShell'
import { usePartnerOnboarding } from '../../../hooks/usePartnerOnboarding'
import { iconForTrade } from '../../../components/vendor/TradeGrid'

/**
 * Step 1 · the service hub.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHERE THE TRADE FLOW COMES BACK TO
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the screen the redesign holds together on: the twenty-six
 * trade picker and the trade questionnaire are SUB-FLOWS of this step,
 * and both return here. Neither decides anything about onboarding —
 * they add a service and hand back.
 *
 * Before, "Submit" at the end of a questionnaire went to the dashboard,
 * which is what taught partners that finishing one trade finished
 * everything.
 *
 * ── One complete service is enough to move on ──────────────────────
 * A partner who has finished Catering and left Photography half-built
 * is not held up: the finished one is what step 1 is for, and the draft
 * stays a draft rather than going live. The alternative is somebody
 * trapped by a trade they tapped by accident.
 */
export default function BusinessServicesStep() {
  const navigate = useNavigate()
  const { loading, account, steps } = usePartnerOnboarding()

  const listings = account.listings ?? []
  const configured = listings.filter(l => (l.offerings?.length ?? 0) > 0)
  const step = steps.find(s => s.id === 'business')

  if (loading) {
    return (
      <div className="native-screen flex items-center justify-center bg-white">
        <Loader2 size={26} className="animate-spin text-plum-600" />
      </div>
    )
  }

  return (
    <StepShell
      stepId="business"
      cta="Continue to partner details"
      canContinue={configured.length > 0}
      onContinue={() => navigate('/partner/setup/details')}
      subProgress={listings.length ? `${configured.length} of ${listings.length} configured` : null}
    >
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        What you offer
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">
        Select the services you provide on Sambramo. Each one has a few questions
        about how you work, so we can match you to the right jobs.
      </p>

      {!listings.length && (
        <div className="mt-6 rounded-[20px] bg-ink/[0.02] p-5 text-center">
          <p className="text-[13.5px] leading-relaxed text-ink-mute">
            You haven&apos;t added a service yet. Add the first one to get started.
          </p>
        </div>
      )}

      {!!listings.length && (
        <>
          <p className="mb-2 mt-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
            Your services
          </p>
          <ul className="flex flex-col gap-2">
            {listings.map(l => {
              const Icon = iconForTrade(l.trade)
              const done = (l.offerings?.length ?? 0) > 0
              return (
                <li key={l.trade}>
                  <button
                    type="button"
                    data-service={l.trade}
                    data-configured={done ? 'yes' : 'no'}
                    /* Straight into THIS trade's questionnaire, carrying
                       the marker that brings them back here afterwards.
                       It used to go to /partner/services?start=…, which
                       reads no search params — so tapping a draft trade
                       showed the 26-trade grid again, and finishing it
                       landed the partner on the dashboard. */
                    onClick={() => navigate(
                      `/dashboard/vendor?tab=list&start=${encodeURIComponent(l.trade)}&return=setup`)}
                    className={`flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left
                                ring-1 transition active:scale-[0.99]
                                ${done ? 'ring-forest-200' : 'ring-amber-200'}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                                     ${done ? 'bg-forest-600' : 'bg-plum-950'} text-white`}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-extrabold leading-tight text-ink">{l.trade}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                        {done
                          ? `${l.offerings.length} offering${l.offerings.length === 1 ? '' : 's'}`
                          : 'Not finished — tap to complete'}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide
                                      ${done ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800'}`}>
                      {done ? 'Complete' : 'Draft'}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-mute" />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <button
        type="button"
        data-add-service
        /* ?from=setup is what makes the trade flow hand the partner
           back to this hub. WhatYouOffer used to infer it from the
           pathname, which stopped being possible when step 1 became its
           own component — see the note there. */
        onClick={() => navigate('/partner/services?from=setup')}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl
                   bg-plum-50 text-[13.5px] font-extrabold text-plum-700 ring-1 ring-plum-200"
      >
        <Plus size={16} /> Add a service
      </button>

      {/* Says why the button below is dead, rather than leaving somebody
          tapping a disabled control and guessing. */}
      {!configured.length && (
        <p className="mt-4 text-center text-[12px] leading-snug text-ink-mute">
          Finish at least one service to continue. The others can stay as drafts.
        </p>
      )}

      {configured.length > 0 && step?.status === 'COMPLETE' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-bold text-forest-700">
          <Check size={13} /> Step 1 complete
        </p>
      )}
    </StepShell>
  )
}
