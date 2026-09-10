import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarCheck, IndianRupee, MapPin, Wallet, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth, PENDING_ROLE } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'
import PartnerFigure from '../../components/vendor/PartnerFigure'
import { LAUNCH_OFFER, LAUNCH_NOTE } from '../../config/partnerPlans'
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
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS PAGE IS NOW A THIRD OF ITS LENGTH
 * ══════════════════════════════════════════════════════════════════════
 *
 * It ran to about 2,200px — three and a half phone screens — and the
 * last 1,060px of that (four illustrated points, a pricing ladder, and a
 * three-step "what happens next") sat BELOW the only sign-up button that
 * a reader ever reached. Nobody scrolls past a decision they have
 * already made; that material was either read before the button, in
 * which case it should be above it, or never.
 *
 * All of it is still here, in one card that cycles. Six faces, four
 * seconds each, dots to jump between them, and it occupies 180px rather
 * than 1,060px. A partner standing in their own shop gets the whole
 * argument without a single scroll, and one who wants the detail can
 * sit on a face and read it.
 *
 * ── What is deliberately not promised ────────────────────────────────
 * No volume ("get 50 bookings a month"), no earnings figure beyond the
 * real median, no customer count. Every line below is either a mechanism
 * that exists or a fee that is real.
 */

const FACES = [
  {
    icon: MapPin,
    title: 'Jobs near you, not across the city',
    body: 'We only send work within the distance you set. You will never be asked to drive across Bengaluru for one setup.',
  },
  {
    icon: IndianRupee,
    title: 'The price is on the job before you accept',
    body: 'You see exactly what you earn, in rupees, before you say yes. Nothing is added afterwards and nothing is billed to you.',
  },
  {
    icon: CalendarCheck,
    title: 'Your calendar stays yours',
    body: 'Block the days you are busy and we will not offer you anything on them. Decline anything you do not want, no penalty.',
  },
  {
    icon: BadgeCheck,
    title: 'Paid once the event is done',
    body: 'The customer pays up front and Sambramo holds it, so the money exists before you set out. It reaches you once the event is completed.',
  },
  {
    /* The pricing ladder was three cards and a paragraph. It is one
       sentence, because "free, and here is what it would cost" is the
       whole of what it said. A partner who joins on "free" and later
       finds a ladder feels sold to; one told the ladder exists and that
       they are on top of it for nothing can see what they are given. */
    icon: Wallet,
    title: 'Free to join, free to stay',
    body: "No joining fee and no monthly charge while we build the Bengaluru network. Sambramo's share is already taken out of the earning you see — never billed to you, and set out in full in the terms you sign.",
  },
  {
    icon: ListChecks,
    title: 'Ten minutes to be listed',
    body: 'Tell us what you do and where. Somebody at Sambramo reads every application, usually the same day, and you are told the moment you are live.',
  },
]

const EVERY_MS = 4600

function WhyCard() {
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)

  /* Honoured, because movement nobody can stop is a bug for anybody who
     gets motion sick reading it — and a reader who taps a dot has said
     which face they want, so stop moving it out from under them. */
  const still = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (still || held) return
    const t = setInterval(() => setI(n => (n + 1) % FACES.length), EVERY_MS)
    return () => clearInterval(t)
  }, [still, held])

  const face = FACES[i]
  const Icon = face.icon

  return (
    <div className="mt-6 rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
      {/* Fixed height so the page does not jump as the text changes
          length. 132px holds the longest body at 360px wide. */}
      <div className="flex min-h-[122px] gap-3.5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-400/15 text-saffron-700">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold leading-tight text-ink">{face.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{face.body}</p>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-center gap-1.5">
        {FACES.map((f, n) => (
          <button
            key={f.title}
            type="button"
            aria-label={f.title}
            aria-current={n === i}
            onClick={() => { setI(n); setHeld(true) }}
            className={`h-1.5 rounded-full transition-all ${
              n === i ? 'w-5 bg-saffron-500' : 'w-1.5 bg-ink/15'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function PartnerLanding() {
  const { user, profile, signInWithGoogle } = useAuth()
  const signedInAsPartner = !!user && profile?.role === 'vendor'

  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState(null)

  async function handleGoogle() {
    setGoogleBusy(true)
    setGoogleError(null)
    /* ══════════════════════════════════════════════════════════════════
       THIS LINE IS WHY GOOGLE SIGN-IN MADE CUSTOMERS
       ══════════════════════════════════════════════════════════════════

       An OAuth round trip loses everything the page knew — the redirect
       leaves and comes back as a fresh load, so the only thing that
       survives is what was written down first. AuthContext reads this
       key when the session lands and defaults to 'customer' when it is
       missing.

       It was missing. A decorator who tapped Continue with Google on the
       PARTNER landing page got a customer profile, and ProtectedRoute
       then bounced them out of /dashboard/vendor — the one place the
       button was meant to take them. SignupPage:92 has always written
       it; this copy of the same button never did. */
    try { localStorage.setItem(PENDING_ROLE, 'vendor') } catch { /* storage off */ }
    try {
      await signInWithGoogle()
      /* On the web the line above navigates away, so nothing after it
         runs. On native it returns as soon as the Custom Tab is open and
         the session arrives later through the deep link, which is why the
         spinner is cleared here rather than left spinning forever. */
    } catch (err) {
      setGoogleError(err?.message ?? 'Google sign-in failed. Try email instead.')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    /* pb-28 reserved 112px for a bottom nav that PartnerBottomNav returns
       null for on this route — 112px of nothing under the last element. */
    <div className="a-canvas min-h-screen pb-10">
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

      <main className="mx-auto max-w-2xl px-5 pt-5">
        {/* A master, drawn. The first thing on the first screen a
            partner ever sees, because "is this app for me" is answered
            by a picture faster than by a sentence — and an illustration
            can say "somebody who does this work" without claiming to be
            a particular person. */}
        <div className="flex justify-center">
          <PartnerFigure trade="Decoration & Floral" live size={124} />
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
            seeded network. */}
        <p className="mt-4 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-saffron-800">
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
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {[
            /* No commission on this page.
             *
             * A percentage in a signup hero is the number a decorator
             * decides on before reading anything else, and it is not the
             * number that matters — what reaches them is, and that is the
             * headline above. It is set out in full in the partner terms,
             * which must be signed before any work is taken, so nobody
             * finds out at their first payout. */
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

        {/* ══════════════════════════════════════════════════════════════
            ONE WAY IN, NOT FOUR
            ══════════════════════════════════════════════════════════════

            There were two identical /signup?role=vendor buttons on this
            page — this one and another at the very bottom, 1,000px below
            it — and the second had no signed-in guard, so a partner who
            was already signed in was invited to join again underneath
            their own dashboard link. Two routes, /partner and
            /partner/join, render this same page, so that lower CTA could
            also link to the page it was already on.

            One primary action, Google beside it, and email sign-in for
            somebody who already has an account. Nothing repeated. */}
        {signedInAsPartner ? (
          <Link
            to="/dashboard/vendor"
            className="mt-5 flex items-center justify-between rounded-2xl bg-saffron-400 px-5 py-4 text-[16px] font-extrabold text-plum-950 transition active:scale-[0.99]"
          >
            Go to your jobs
            <ArrowRight size={18} />
          </Link>
        ) : (
          <div className="mt-5 space-y-2.5">
            {/* "Join as a partner" was accurate and asked nothing. This
                says what happens next and how long it takes, which is
                the actual objection. */}
            {/* /partner/join, not /signup?role=vendor. The partner door
                is its own screen now and it parks the vendor role itself
                — routing through the shared customer signup was how the
                role got lost in the first place. */}
            <Link
              to="/partner/join"
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
            {/* ══════════════════════════════════════════════════════════
                GOOGLE, ON THE FIRST SCREEN
                ══════════════════════════════════════════════════════════

                It was two taps away: reach the landing, tap Sign in, and
                only then find "Continue with Google". Every app this one
                is judged against puts it on the door, because for most
                people it IS the fastest way in: no email to type, no code
                to wait for, no password to invent. Asking a decorator on
                a building site to switch to their inbox for a six digit
                code is where a sign-up is lost.

                Same handler as the login page, and in the APK it now
                opens a Custom Tab rather than being hidden. See
                lib/googleAuth.js. */}
            <GoogleSignInButton
              onClick={handleGoogle}
              loading={googleBusy}
              fullWidth
              label="Continue with Google"
            />

            {googleError && (
              <p className="text-center text-[12px] font-semibold text-rose-700">
                {googleError}
              </p>
            )}

            {/* Sign in stays, quietly, for somebody who already has an
                account and did not use Google to make it. */}
            <Link
              to="/login"
              className="flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[13.5px] font-extrabold text-ink-mute ring-1 ring-ink/[0.08] transition active:scale-[0.99]"
            >
              Sign in with email
            </Link>
          </div>
        )}

        {/* Everything that used to be 1,060px of scroll, in one card. */}
        <WhyCard />

        {/* ── What is being booked right now ───────────────────────────
            The most persuasive thing on this page is that the demand is
            specific. "Photography, Videography, Cake" is a stronger
            argument than any adjective. */}
        <div className="mt-3 rounded-2xl bg-ink/[0.03] p-4 text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
            Most asked for in Bengaluru
          </p>
          <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-ink">
            Photography · Videography · Cake · Decoration · DJ &amp; sound
          </p>
        </div>

        {LAUNCH_OFFER && (
          <p className="mt-3 rounded-2xl bg-forest-50 p-3.5 text-[12.5px] font-semibold leading-relaxed text-forest-800 ring-1 ring-forest-200/60">
            {LAUNCH_NOTE}
          </p>
        )}

        {/* Also here, because a master who has not signed up yet is the
            one most likely to have arrived from a WhatsApp forward and
            never leave the browser. */}
        <div className="mt-3"><InstallTheApp /></div>
      </main>
    </div>
  )
}
