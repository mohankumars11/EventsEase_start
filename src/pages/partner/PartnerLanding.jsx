import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarCheck, IndianRupee, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SambramoLogo from '../../components/ui/SambramoLogo'
import PartnerFigure from '../../components/vendor/PartnerFigure'
import { PARTNER_PLANS, LAUNCH_OFFER, LAUNCH_NOTE } from '../../config/partnerPlans'
import InstallTheApp from '../../components/vendor/InstallTheApp'

/**
 * The front door of the partner app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WRITTEN FOR SOMEBODY BEING SHOWN THIS ACROSS A COUNTER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The realistic first view of this page is a phone held out by somebody
 * from Sambramo, in a decorator's shop, mid-afternoon. The reader is
 * standing, possibly with a customer waiting, and is deciding in under a
 * minute whether this is worth their time.
 *
 * So: what they get, what it costs, what happens next. In that order,
 * and nothing else above the fold. No mission statement, no "trusted by",
 * no metrics we do not have — this is a pre-launch network with one real
 * partner and claiming otherwise to the second one would be a lie they
 * could check.
 *
 * ── What is deliberately not promised ────────────────────────────────
 * No volume ("get 50 bookings a month"), no earnings figure, no customer
 * count. We do not know any of them yet. Every line below is either a
 * mechanism that exists or a fee that is real.
 */

const POINTS = [
  {
    icon: MapPin,
    title: 'Jobs near you, not across the city',
    body: 'We only send work within the distance you set. You will never be asked to drive across Bengaluru for one setup.',
  },
  {
    icon: IndianRupee,
    title: 'The price is on the job before you accept',
    body: 'You see exactly what you earn — after our fee and taxes — before you say yes. No negotiating, no quoting, no haggling.',
  },
  {
    icon: CalendarCheck,
    title: 'Your calendar stays yours',
    body: 'Block the days you are busy and we will not offer you anything on them. Decline anything you do not want, with no penalty.',
  },
  {
    icon: BadgeCheck,
    title: 'Paid 24 hours after the event',
    body: 'The customer pays us up front and we hold it. Once the day is done and nothing is disputed, it comes to your account.',
  },
]

export default function PartnerLanding() {
  const { user, profile } = useAuth()
  const signedInAsPartner = !!user && profile?.role === 'vendor'

  return (
    <div className="a-canvas min-h-screen pb-16">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-6">
        {/* `ground` defaults to onDark — for the plum navbar. This header
            is white, so without it the wordmark is white on white and the
            page opens with an empty corner. `className` is not part of
            this component's API; it sizes from `size`. */}
        <SambramoLogo size={26} ground="onLight" />
        <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
          Partners
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        {/* A master, drawn. The first thing on the first screen a
            partner ever sees, because "is this app for me" is answered
            by a picture faster than by a sentence — and an illustration
            can say "somebody who does this work" without claiming to be
            a particular person. */}
        <div className="mt-6 flex justify-center">
          <PartnerFigure trade="Decoration & Floral" live size={148} />
        </div>

        <h1 className="mt-4 font-serif text-[32px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[38px]">
          Work that comes to you.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Families in Bengaluru book decorators, cooks, photographers and
          more through Sambramo. When one of them needs what you do, near
          where you are, your phone rings.
        </p>

        {signedInAsPartner ? (
          <Link
            to="/dashboard/vendor"
            className="mt-6 flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
          >
            Go to your jobs
            <ArrowRight size={17} />
          </Link>
        ) : (
          <div className="mt-6 space-y-2.5">
            <Link
              to="/signup?role=vendor"
              className="flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
            >
              Join as a partner
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08] transition active:scale-[0.99]"
            >
              I already have an account
            </Link>
          </div>
        )}

        {/* Also here, because a master who has not signed up yet is the
            one most likely to have arrived from a WhatsApp forward and
            never leave the browser. */}
        <div className="mt-6"><InstallTheApp /></div>

        {/* The launch offer, stated where somebody deciding will see it. */}
        {/* Sign-up carries the role in the URL.

            /partner and /partner/join both render THIS page, so the CTA
            used to link to the page it was already on and did nothing at
            all. The role has to travel because SignupPage opens on a
            "who are you?" step, and a master who has just read a page
            headed "Work that comes to you" has answered that question. */}
        {LAUNCH_OFFER && (
          <p className="mt-4 rounded-2xl bg-forest-50 p-3.5 text-[12.5px] font-semibold leading-relaxed text-forest-800 ring-1 ring-forest-200/60">
            {LAUNCH_NOTE}
          </p>
        )}

        <ul className="mt-9 space-y-5">
          {POINTS.map(p => {
            const Icon = p.icon
            return (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-400/15 text-saffron-700">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold leading-tight text-ink">{p.title}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* ── What it will cost ──────────────────────────────────────
            Shown even though everything is free today. A partner who
            joins on "free" and later discovers there was always a ladder
            feels sold to; one who is told the ladder exists and that they
            are on top of it for nothing can see what they are being
            given. */}
        <section className="mt-11">
          <h2 className="font-serif text-[22px] font-extrabold text-ink">
            What it costs
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            We take <strong className="font-extrabold text-ink">8%</strong> of
            each job, and nothing else. No joining fee, no monthly charge
            while we are building the network.
          </p>

          <div className="mt-4 space-y-2.5">
            {PARTNER_PLANS.map(plan => (
              <div
                key={plan.id}
                className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-extrabold text-ink">{plan.label}</h3>
                  <span className="text-[13px] font-extrabold text-ink-soft">
                    {LAUNCH_OFFER ? (
                      <>
                        <span className="mr-1.5 font-bold text-ink-mute line-through">{plan.price}</span>
                        Free
                      </>
                    ) : plan.price}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-mute">{plan.lede}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-11">
          <h2 className="font-serif text-[22px] font-extrabold text-ink">
            What happens after you sign up
          </h2>
          <ol className="mt-3 space-y-3">
            {[
              ['You tell us about your business', 'What you do, where you are, how far you travel. Ten minutes.'],
              ['We check the details', 'Somebody at Sambramo reads every application. Usually the same day.'],
              ['Jobs start arriving', 'You will be told the moment you are live, and the first job can come the same week.'],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-ink">{t}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Link
          to="/signup?role=vendor"
          className="mt-9 flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99]"
        >
          Join as a partner
          <ArrowRight size={17} />
        </Link>
      </main>
    </div>
  )
}
