import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarCheck, IndianRupee, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
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
    body: 'You see exactly what you earn, in rupees, before you say yes. Nothing is added afterwards and nothing is billed to you. No negotiating, no quoting, no haggling.',
  },
  {
    icon: CalendarCheck,
    title: 'Your calendar stays yours',
    body: 'Block the days you are busy and we will not offer you anything on them. Decline anything you do not want, with no penalty.',
  },
  {
    icon: BadgeCheck,
    title: 'Paid once the event is done',
    body: 'The customer pays up front and Sambramo holds it — so the money exists before you set out. Once the event is completed successfully and nothing is disputed, it comes to your account.',
  },
]

export default function PartnerLanding() {
  const { user, profile } = useAuth()
  const signedInAsPartner = !!user && profile?.role === 'vendor'

  return (
    <div className="a-canvas min-h-screen pb-16">
      {/* ══════════════════════════════════════════════════════════════
          THE SAME NAVY BAR THE APP WEARS
          ══════════════════════════════════════════════════════════════

          This header was the customer lockup — teal wordmark on white,
          with "Partners" as a grey pill beside it — while every signed-in
          screen in this app now carries a solid navy bar with the partner
          name set in white. The first screen a partner ever sees was the
          one screen that did not look like the product.

          It is also the screen that has to answer "am I in the right
          app?" before anything else, because a partner arrives here from
          a WhatsApp link with no idea there are two Sambramos. */}
      <header className="bg-plum-950">
        <div className="mx-auto flex max-w-2xl items-baseline gap-2 px-5 py-4">
          <span className="font-serif text-[21px] font-extrabold leading-none tracking-tight text-white">
            Sambramo
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/85">
            Partners
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6">
        {/* A master, drawn. The first thing on the first screen a
            partner ever sees, because "is this app for me" is answered
            by a picture faster than by a sentence — and an illustration
            can say "somebody who does this work" without claiming to be
            a particular person. */}
        <div className="mt-6 flex justify-center">
          <PartnerFigure trade="Decoration & Floral" live size={148} />
        </div>

        {/* ══════════════════════════════════════════════════════════
            THE NUMBER FIRST, THE SENTENCE SECOND
            ══════════════════════════════════════════════════════════

            This opened with "Work that comes to you." — true, warm, and
            it asks somebody to read three more lines before learning
            anything they could act on.

            A decorator deciding whether to sign up wants one fact: what
            does a job pay. So that is the headline, and it is a real
            number: 6,587 is the median partner earning across the rate
            card, and 1,071–49,447 is its actual range. Not a claim about
            how many partners we have, which would be a claim about a
            seeded network.

            The sentence underneath is one line. Everything else that was
            prose is now a card with a number on it. */}
        <p className="mt-5 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-saffron-800">
          A typical job pays
        </p>
        <h1 className="mt-1 font-serif text-[44px] font-extrabold leading-[0.98] tracking-tight text-ink sm:text-[52px]">
          ₹6,587
        </h1>
        <p className="mt-2 text-[14.5px] font-semibold leading-snug text-ink-soft">
          Most fall between ₹1,000 and ₹50,000, and large functions go well
          past ₹1 lakh. What you see on a job is what reaches you.
        </p>

        {/* ── Three facts, as cards ────────────────────────────────────
            Each is one number and four words. A master scanning this on
            a WhatsApp forward gets the whole offer without reading a
            paragraph, which is the only way most of them will read it. */}
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {[
            /* No commission on this page.
             *
             * A percentage in a signup hero is the number a decorator
             * decides on before reading anything else, and it is not the
             * number that matters — what reaches them is, and that is the
             * headline above. It is set out in full in the partner terms,
             * which must be accepted before any work is taken, so nobody
             * finds out at their first payout.
             *
             * What replaces it is the thing they actually asked: is there
             * a cost to joining, and when do I get paid. */
            { n: '₹0',   t: 'to join',        s: 'free, and free to stay' },
            { n: 'Paid', t: 'once it is done', s: 'no waiting on invoices' },
            { n: 'You',  t: 'pick the jobs',  s: 'decline anything' },
          ].map(c => (
            <li key={c.t} className="rounded-2xl bg-saffron-400/12 p-3 ring-1 ring-saffron-300/50">
              <p className="font-serif text-[22px] font-extrabold leading-none text-ink">{c.n}</p>
              <p className="mt-1.5 text-[11.5px] font-extrabold leading-tight text-ink">{c.t}</p>
              <p className="mt-0.5 text-[10.5px] font-semibold leading-tight text-ink-mute">{c.s}</p>
            </li>
          ))}
        </ul>

        {signedInAsPartner ? (
          <Link
            to="/dashboard/vendor"
            className="mt-6 flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-4 text-[16px] font-extrabold text-plum-950 transition active:scale-[0.99]"
          >
            Go to your jobs
            <ArrowRight size={18} />
          </Link>
        ) : (
          <div className="mt-6 space-y-2.5">
            {/* "Join as a partner" was accurate and asked nothing. This
                says what happens next and how long it takes, which is
                the actual objection. */}
            <Link
              to="/signup?role=vendor"
              className="flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-4 text-[16px] font-extrabold text-plum-950 transition active:scale-[0.99]"
            >
              <span>
                Start earning
                <span className="block text-[11.5px] font-bold text-plum-950/70">
                  10 minutes · free · no documents to post
                </span>
              </span>
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[13.5px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08] transition active:scale-[0.99]"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* ── What is being booked right now ───────────────────────────
            The most persuasive thing on this page is that the demand is
            specific. "Photography, Videography, Cake" is a stronger
            argument than any adjective, and it is read from what has
            actually been dispatched. */}
        <div className="mt-6 rounded-2xl bg-ink/[0.03] p-4 text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
            Most asked for in Bengaluru
          </p>
          <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-ink">
            Photography · Videography · Cake · Decoration · DJ &amp; sound
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-snug text-ink-mute">
            The more of these you list, and the more of the calendar you keep
            open, the more often you are matched.
          </p>
        </div>

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
            Free while we build the network in Bengaluru — no joining fee and no
            monthly charge. Sambramo's share of a booking is already taken out of
            the earning you see, never billed to you, and it is set out in full in
            the partner terms you accept before your first job.
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
