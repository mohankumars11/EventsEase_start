import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, User, MapPin, ShieldCheck, Landmark, Send,
  Check, Lock, Loader2, TriangleAlert, ArrowRight,
} from 'lucide-react'
import { usePartnerOnboarding } from '../../hooks/usePartnerOnboarding'
import { ensureVendorRow } from '../../lib/ensureVendor'

/**
 * The master onboarding home — "Great! Let's get started".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SCREEN IS NOW THE SPINE AND NOT A PREFACE
 * ══════════════════════════════════════════════════════════════════════
 *
 * It used to be a poster: six nice rows, one button, and everything
 * after it was the trade questionnaire. Saving a trade ended at the
 * dashboard, so a partner who answered forty questions about their
 * kitchen was shown the working app and concluded they were live. They
 * had no service area, no documents, no bank account and no operator
 * had read a word of it.
 *
 * So this is the controller now. It owns where a partner is, what is
 * open to them, and what happens next; every step screen returns HERE
 * rather than deciding for itself that onboarding is over. The trade
 * questionnaire is untouched and is step 1's sub-flow.
 *
 * ── Nothing here is skippable ──────────────────────────────────────
 * "Complete Later" is gone. It was the politest way to tell somebody
 * they were finished when they were not, and the partner who took it
 * ended up in exactly the state this redesign exists to prevent.
 *
 * ── Status is derived, never stored ────────────────────────────────
 * Each row's state comes from lib/partnerOnboarding.js reading the real
 * rows. A screen cannot mark itself done.
 */

const ICON = {
  business: Briefcase,
  details: User,
  area: MapPin,
  compliance: ShieldCheck,
  bank: Landmark,
  review: Send,
}

const ROUTE = {
  business: '/partner/setup/services',
  details: '/partner/setup/details',
  area: '/partner/setup/area',
  compliance: '/partner/setup/compliance',
  bank: '/partner/setup/bank',
  review: '/partner/setup/review',
}

/* Royal amethyst for the step in hand, green for done, grey for locked,
   amber for something sent back. One tone each, so the list is read at
   a glance rather than decoded. */
const TONE = {
  COMPLETE:        { ring: 'ring-forest-200', chip: 'bg-forest-50 text-forest-700', icon: 'bg-forest-600 text-white' },
  IN_PROGRESS:     { ring: 'ring-plum-300',   chip: 'bg-plum-50 text-plum-700',     icon: 'bg-plum-600 text-white' },
  AVAILABLE:       { ring: 'ring-plum-200',   chip: 'bg-plum-50 text-plum-700',     icon: 'bg-plum-600 text-white' },
  REQUIRES_ACTION: { ring: 'ring-amber-300',  chip: 'bg-amber-50 text-amber-800',   icon: 'bg-amber-500 text-white' },
  LOCKED:          { ring: 'ring-ink/[0.07]', chip: 'bg-ink/[0.05] text-ink-mute',  icon: 'bg-ink/[0.06] text-ink-mute' },
}

const LABEL = {
  COMPLETE: 'Done',
  IN_PROGRESS: 'In progress',
  AVAILABLE: 'Start',
  REQUIRES_ACTION: 'Action needed',
  LOCKED: 'Locked',
}

export default function PartnerSetupIntro() {
  const navigate = useNavigate()
  const { loading, steps, current, done, profile, account, refresh } = usePartnerOnboarding()

  /* ── The row every step after this one writes to ──────────────────
     Steps 2-6 all call `.update()` on `vendors`, so without a row they
     save nothing and say nothing. The deleted onboarding wizard used to
     create it; this door does now. Idempotent, and it only fires when
     there genuinely is no row, so returning partners pay one cached
     read. See lib/ensureVendor. */
  const ensuring = useRef(false)
  useEffect(() => {
    if (loading || ensuring.current || account?.vendor?.id) return
    ensuring.current = true
    ensureVendorRow({ profile })
      .then(r => { if (r.created) refresh() })
      .finally(() => { ensuring.current = false })
  }, [loading, account?.vendor?.id, profile, refresh])

  const returning = done > 0
  const firstName = profile?.full_name?.split(' ')[0]

  if (loading) {
    return (
      <div className="native-screen flex items-center justify-center bg-white">
        <Loader2 size={26} className="animate-spin text-plum-600" />
      </div>
    )
  }

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top min-h-0 flex-1 overflow-y-auto px-6 pt-8">

        <h1 className="text-[clamp(1.5rem,7vw,2rem)] font-extrabold leading-[1.05] tracking-tight text-plum-950">
          {returning ? <>Welcome back{firstName ? `, ${firstName}` : ''}<br />Let&apos;s finish setting up</>
                     : <>Great!<br />Let&apos;s get started</>}
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
          Your Sambramo partner profile is almost ready.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/55">
          Tell us about your business and the services you provide. We&apos;ll use this
          information to match you with the right customers and event opportunities.
        </p>

        {/* ── How much is left, said once ───────────────────────────
            A partner on step 4 of 6 is most of the way there, and a
            number is the cheapest way to say so. */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500 transition-all"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-ink-soft">
            {done} of {steps.length}
          </span>
        </div>

        <ol className="mt-6 flex flex-col gap-2.5 pb-4">
          {steps.map(step => {
            const Icon = ICON[step.id]
            const tone = TONE[step.status] ?? TONE.LOCKED
            const locked = step.status === 'LOCKED'
            const isCurrent = step.id === current.id

            return (
              <li key={step.id}>
                <button
                  type="button"
                  data-step={step.id}
                  data-status={step.status}
                  disabled={locked}
                  onClick={() => navigate(ROUTE[step.id])}
                  className={`flex w-full items-start gap-3.5 rounded-[20px] bg-white p-4 text-left
                              ring-1 transition active:scale-[0.99] disabled:active:scale-100
                              ${tone.ring} ${isCurrent ? 'ring-2' : ''} ${locked ? 'opacity-60' : ''}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                    {step.status === 'COMPLETE' ? <Check size={19} strokeWidth={3} />
                      : locked ? <Lock size={16} />
                      : step.status === 'REQUIRES_ACTION' ? <TriangleAlert size={18} />
                      : <Icon size={18} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] font-bold text-ink-mute">{step.n}</span>
                      <span className="text-[14.5px] font-extrabold leading-tight text-plum-950">
                        {step.title}
                      </span>
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-ink-mute">
                      {step.detail ?? step.blurb}
                    </span>
                  </span>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide ${tone.chip}`}>
                    {LABEL[step.status]}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* ── One way forward, and no way around ────────────────────────
          There is deliberately no "Complete Later" here. Every step is
          mandatory, so the only button is the one that opens whichever
          step is next. */}
      <div className="safe-cta px-6 pt-2">
        <button
          type="button"
          data-cta="continue"
          onClick={() => navigate(ROUTE[current.id])}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full
                     bg-gradient-to-r from-plum-700 to-plum-500 text-[15.5px] font-extrabold
                     text-white transition active:scale-[0.99]"
        >
          {returning ? `Continue — ${current.title}` : 'Start setup'}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}
