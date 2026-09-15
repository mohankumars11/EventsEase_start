import { useNavigate } from 'react-router-dom'
import { Briefcase, User, MapPin, ShieldCheck, Landmark, Send, Loader2 } from 'lucide-react'
import { usePartnerStage } from '../../hooks/usePartnerStage'
import { deferSetup, readLocalDeferral } from '../../lib/partnerStage'

/**
 * What setup is going to ask for, before it starts asking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SCREEN THAT COLLECTS NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who has just verified an email is one tap from a form, and a
 * form of unknown length is the point most people put the phone down.
 * Six named steps with an end in sight is a different proposition from
 * an open-ended questionnaire, and it costs one screen.
 *
 * ── It was unreachable ─────────────────────────────────────────────
 * Until the stage gate went in, nothing in the app navigated here.
 * `homeFor()`, `RootScreen` and the sign-in screen all sent a signed-in
 * vendor to `/dashboard/vendor`, and the dashboard drew its own smaller
 * copy of this screen for a partner with no vendors row. So the real
 * one was reachable only by typing the URL. See lib/partnerStage.js.
 *
 * ── The steps are described, not implemented, here ─────────────────
 * The flow behind "Start Setup" is VendorOnboarding, and the steps after
 * it are the listing flow, the service area, verification and payout
 * details the partner reaches in order. This screen is the map, and a
 * map that does not match the road is worse than no map: if those steps
 * change, this list changes with them.
 */

const STEPS = [
  { icon: Briefcase,   title: 'Business & Services',      note: 'What you do, and the events you cover.' },
  { icon: User,        title: 'Partner Details',          note: 'Your name, contact and experience.' },
  { icon: MapPin,      title: 'Service Area & Availability', note: 'Where you work, how far you travel, and when.' },
  { icon: ShieldCheck, title: 'Verification & Compliance', note: 'So customers know you are the real thing.' },
  { icon: Landmark,    title: 'Bank & Payments',          note: 'Where your earnings are paid.' },
  { icon: Send,        title: 'Review & Publish',         note: 'We read it, then your listing goes live.' },
]

export default function PartnerSetupIntro() {
  const navigate = useNavigate()
  const { account, loading } = usePartnerStage()

  /* Returning, not new. A partner who tapped Complete Later — or who
     closed the app on this screen — is met by name for what they did,
     not by a greeting that pretends this is the first time. */
  const returning = !!account?.vendor || readLocalDeferral()

  async function completeLater() {
    /* Written down before leaving. Without this the next sign-in has no
       way to tell "started and stepped away" from "never arrived", and
       the partner is asked to start over — which is the thing they
       declined to do. Best-effort: a partner who taps Complete Later
       with no signal still gets to leave. */
    await deferSetup(account?.vendor?.id)
    /* /partner, not /dashboard/vendor. A partner with no vendors row has
       no dashboard — the dashboard sends them straight back here, and
       "Complete Later" that returns you to the screen you left is a
       button that does nothing. The partner landing is the one
       signed-in-safe screen behind this point. */
    navigate('/partner', { replace: true })
  }

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top min-h-0 flex-1 overflow-y-auto px-7 pt-9">
        <h1 className="text-[clamp(1.45rem,6.6vw,1.85rem)] font-extrabold leading-tight tracking-tight text-plum-950">
          {returning ? 'Welcome back' : 'Great!'}
          <br />
          {returning ? "Let's finish setting up" : "Let's get started"}
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink/70">
          Your Sambramo partner profile is almost ready.
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">
          Tell us about your business and the services you provide. We&apos;ll use this
          information to match you with the right customers and event opportunities.
        </p>

        <ol className="relative mt-7 pb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const last = i === STEPS.length - 1
            return (
              <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                {/* The spine. Drawn behind each row rather than as one
                    element, so it stops at the last step instead of
                    running past it into the button. */}
                {!last && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px bg-plum-200"
                  />
                )}
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center
                                 rounded-full bg-plum-50 ring-1 ring-plum-200">
                  <Icon size={17} className="text-plum-600" strokeWidth={2.2} />
                </span>
                <div className="pt-0.5">
                  <p className="text-[14px] font-extrabold leading-tight text-plum-950">
                    <span className="text-plum-500">{i + 1}. </span>{s.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-mute">{s.note}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="safe-cta px-7 pt-2">
        {/* Into the flow that already exists, not a new one. */}
        <button
          type="button"
          onClick={() => navigate('/partner/services')}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full
                     bg-gradient-to-r from-plum-700 to-plum-500
                     text-[15.5px] font-extrabold text-white transition active:scale-[0.99]"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {returning ? 'Continue Setup' : 'Start Setup'} &rarr;
        </button>
        <button
          type="button"
          onClick={completeLater}
          className="mt-2 min-h-[46px] w-full text-[13.5px] font-bold text-ink/55"
        >
          Complete Later
        </button>
      </div>
    </div>
  )
}
