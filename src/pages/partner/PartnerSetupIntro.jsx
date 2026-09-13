import { useNavigate } from 'react-router-dom'
import { Briefcase, User, MapPin, ShieldCheck, Landmark } from 'lucide-react'

/**
 * What setup is going to ask for, before it starts asking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SCREEN THAT COLLECTS NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who has just verified an email is one tap from a form, and a
 * form of unknown length is the point most people put the phone down.
 * Five named steps with an end in sight is a different proposition from
 * an open-ended questionnaire, and it costs one screen.
 *
 * ── The steps are described, not implemented, here ─────────────────
 * The real flow is VendorOnboarding, which has four steps of its own --
 * location, business, how you found us, the agreement -- plus the
 * verification and payout details it collects later. This screen is the
 * map, and "Start Setup" hands over to it. If those steps change, this
 * list has to change with them: it is a promise about what is coming, and
 * a promise that does not match the next screen is worse than no promise.
 */

const STEPS = [
  { icon: Briefcase,   title: 'Business / Service Type',  note: 'What you do, and the events you cover.' },
  { icon: User,        title: 'Partner Details',          note: 'Your name, contact and experience.' },
  { icon: MapPin,      title: 'Service Location',         note: 'Where you work, and how far you travel.' },
  { icon: ShieldCheck, title: 'Documents & Verification', note: 'So customers know you are the real thing.' },
  { icon: Landmark,    title: 'Bank & Payment Details',   note: 'Where your earnings are paid.' },
]

export default function PartnerSetupIntro() {
  const navigate = useNavigate()

  return (
    <div className="native-screen flex flex-col bg-white">
      <div className="safe-top min-h-0 flex-1 overflow-y-auto px-7 pt-9">
        <h1 className="text-[clamp(1.45rem,6.6vw,1.85rem)] font-extrabold leading-tight tracking-tight text-plum-950">
          Great! Let&apos;s get started
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink/70">
          Let&apos;s set up your partner profile to start receiving event opportunities.
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
          onClick={() => navigate('/onboarding/vendor')}
          className="min-h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500
                     text-[15.5px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Start Setup
        </button>
      </div>
    </div>
  )
}
