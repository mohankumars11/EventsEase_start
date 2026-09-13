import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Mail, ShieldCheck, Check } from 'lucide-react'
import { useAuth, PENDING_ROLE } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'
import { PARTNER_TERMS_LONG, PARTNER_TERMS_VERSION } from '../../config/partnerTerms'
import PartnerCarousel from '../../components/partner/PartnerCarousel'
import PartnerLocationGate from '../../components/partner/PartnerLocationGate'

/**
 * The first screen of the partner app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE FRONT DOOR IS NOW A DOOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * `homeFor()` sends a signed-out partner here, so on the APK this is
 * literally the first thing anybody sees after installing. It used to be
 * the marketing landing: an earnings headline, three fact cards, a Why
 * card, most-booked trades, an install prompt — and somewhere in it, a
 * button that went to ANOTHER screen where signing in actually happened.
 *
 * A person who has just installed an app called Sambramo Partners has
 * already been sold. They tapped the icon to get in. Making them read a
 * pitch and then find the way in is asking them to be convinced twice.
 *
 * So the pitch moved to /partner — which is where a WhatsApp forward
 * lands, and where somebody who has NOT decided yet needs it — and this
 * route is the door: name, one field, one button.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EMAIL NOW, THE SAME TWO SCREENS AS SMS LATER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The shape is identifier → six digits → in, because that is the shape
 * every delivery and driver app in this market already taught its users,
 * and it is the shape phone OTP will need when there is an SMS provider
 * to pay for. `sendPhoneOtp` and `verifyPhoneOtp` are already written
 * beside the email pair in AuthContext for exactly that swap: when the
 * provider is live, this screen changes which function it calls and what
 * the field is labelled, and nothing else about it moves.
 *
 * Email costs nothing, needs no provider, and works on a phone with no
 * signal on a wifi connection — which is where a decorator being signed
 * up inside their own shop actually is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CONSENT IS A GATE, AND IT IS NOT PRE-TICKED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every app this is measured against ships these boxes ticked on
 * arrival. A pre-ticked consent is not consent — it is a record that the
 * screen was rendered — and the partner agreement here contains an
 * undertaking we may have to ACT on: take a listing down, hold a payout,
 * recover what a failed booking cost to put right.
 *
 * Acting on any of that in front of a partner who never actually ticked
 * the box is not a position worth being in to save one tap. So Continue
 * is dead until it is ticked, and the version is stamped with it.
 */
export default function PartnerEntry() {
  const navigate = useNavigate()
  const { user, profile, sendEmailOtp, verifyEmailOtp, signInWithGoogle } = useAuth()

  const [stage, setStage]   = useState('email')   // 'email' | 'code'
  const [email, setEmail]   = useState('')
  const [code, setCode]     = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [showTerms, setShowTerms] = useState(false)
  /* Email is the fallback route now, folded away until asked for. */
  const [emailOpen, setEmailOpen] = useState(false)

  /* ══════════════════════════════════════════════════════════════════
     NEW OR RETURNING, ASKED OUTRIGHT
     ══════════════════════════════════════════════════════════════════

     One "Continue" served both, which is tidy and is not what somebody
     standing in their shop is looking for. A person opening this the
     first time is looking for the word "sign up"; a person who has been
     here before is looking for "log in". Not finding either reads as
     the wrong screen, and the commonest thing they do next is close it.

     It is also not only wording. `shouldCreateUser` changes with it:

       new        create the account if the address is unknown
       returning  do NOT create one -- so a typo in a known address
                  says "we do not have that" instead of silently
                  starting a second, empty partner account beside the
                  real one, which is the failure that is expensive
                  later and invisible now.

     Consent is only asked of somebody signing up. Making a returning
     partner re-tick the terms every time they log in would teach them
     the tick means nothing -- they signed it once, and that signature
     is stamped with its version. */
  const [mode, setMode] = useState('new')   // 'new' | 'returning'
  const isNew = mode === 'new'
  const codeRef = useRef(null)

  /* Already in? Do not make somebody who is signed in look at a sign-in
     screen — the APK reopens on this route every cold start. */
  useEffect(() => {
    if (user && profile?.role === 'vendor') navigate('/dashboard/vendor', { replace: true })
  }, [user, profile, navigate])

  /* A resend that is available instantly invites a second tap before the
     first mail has landed, and two codes in an inbox is how somebody
     types the dead one. */
  useEffect(() => {
    if (!resendIn) return
    const t = setTimeout(() => setResendIn(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => { if (stage === 'code') codeRef.current?.focus() }, [stage])

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  /* Written down BEFORE any auth leaves this screen. AuthContext reads
     it when the session lands and defaults to 'customer' without it —
     which is how the partner landing's Google button spent its whole
     life making customer accounts. */
  const parkRole = () => {
    try { localStorage.setItem(PENDING_ROLE, 'vendor') } catch { /* storage off */ }
  }

  /* Consent gates signing up only. A returning partner signed it once,
     and that signature is stamped with the version they signed. */
  const canContinue = emailOk && (isNew ? agreed : true)

  async function requestCode() {
    if (!canContinue || busy) return
    setBusy(true); setError(null)
    parkRole()
    try {
      await sendEmailOtp(email.trim().toLowerCase(), { shouldCreateUser: isNew })
      setStage('code')
      setResendIn(30)
    } catch (err) {
      /* Supabase says "Signups not allowed for otp" when
         shouldCreateUser is false and the address is unknown. That is
         not an error the partner can act on as written -- it is us
         telling them, in our words, that they have not signed up yet. */
      const raw = String(err?.message ?? '')
      const unknown = /signup|not allowed|user not found/i.test(raw)
      setError(
        !isNew && unknown
          ? 'We do not have that email yet. Tap "I am new here" above to sign up.'
          : raw || 'Could not send the code. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (code.length < 6 || busy) return
    setBusy(true); setError(null)
    parkRole()
    try {
      await verifyEmailOtp(email.trim().toLowerCase(), code)
      /* Where they land is decided by role once the profile exists —
         RootScreen and ProtectedRoute already own that. */
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.message ?? 'That code did not work. Check it, or send a new one.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true); setError(null)
    parkRole()
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err?.message ?? 'Google sign-in failed. Use your email instead.')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-plum-950">
      {/* Location, asked once, straight after the launch screen.

          It renders over this page rather than being a route of its own,
          which matters: the login is already mounted behind it, so a
          partner who taps Allow lands on the field with nothing to load.
          It removes itself when the question is settled -- granted,
          refused, or already answered on a previous launch -- and it
          never blocks anybody. See PartnerLocationGate. */}
      <PartnerLocationGate />
      {/* ==============================================================
          THE CARDS ARE THE HEADER
          ==============================================================

          There was a dark panel here: the wordmark, PARTNERS, and the line
          "Where the city's celebrations find you." It said what the first
          card says, in less detail, directly above it -- so the brand was
          read twice before anything could be acted on, and the login was
          pushed off the bottom of the screen.

          The cards carry it now. Each is a full composition with the
          wordmark already in it, so nothing is lost by removing the panel,
          and about 290px of the first screen goes back to the thing that
          actually explains the app.

          Full bleed, outside the padded sheet below: a hero with margins
          reads as an advertisement pasted into a page rather than as the
          top of the app. */}
      <PartnerCarousel />

      {/* The sheet. Rounded off the dark ground rather than a card
          floating on white — it reads as the app opening rather than as
          a form dropped onto a page. */}
      {/* Flush under the hero, and flat.

          It pulled up 20px over the artwork so its rounded corners read
          as the app rising over the card. That overlap clipped the bottom
          of every poster, which is the one thing these cards must not
          have done to them -- each is a finished composition and the
          brief was to show it whole.

          So no overlap, and no top radius either: the hero already curves
          at its bottom edge, and two opposing curves meeting would pinch.
          One rounded edge, one flat, which is how the reference does it. */}
      <main className="relative z-10 flex-1 bg-white px-6 pb-10 pt-6">
        {stage === 'email' ? (
          <>
            {/* Two words, decided before anything is typed. Kept because
                the terms only apply to somebody signing UP, and a
                returning partner has to be able to say so. */}
            <div className="flex rounded-2xl bg-ink/[0.05] p-1">
              {[
                { id: 'new',       label: 'I am new here' },
                { id: 'returning', label: 'I have an account' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setMode(t.id); setError(null) }}
                  className={`flex-1 rounded-[13px] py-2.5 text-[12.5px] font-extrabold transition ${
                    mode === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-mute'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════
                CONSENT FIRST, THEN THE BUTTON IT GATES
                ══════════════════════════════════════════════════════════

                It used to sit under the email field, which put it below
                one sign-in route and above the other -- so somebody
                continuing with Google passed the agreement on their way
                past rather than on their way through.

                Above both buttons now, gating both. Still not pre-ticked:
                a pre-ticked consent is a record that the screen rendered,
                not a record that anybody agreed, and this agreement has
                undertakings we may have to act on. */}
            {isNew && (<>
            {/* The row toggles the box; the link inside it does not.

                This was one <button> wrapping both the box and the text,
                which is why "Partner Terms" could not be a link -- a
                button inside a button is invalid HTML and React will not
                render it. So the row is a div with a handler, the box is
                the real control (role=checkbox, so a screen reader
                announces its state), and the link stops the click from
                reaching the row. Tapping anywhere else still ticks it. */}
            <div
              onClick={() => { setAgreed(a => !a); setError(null) }}
              className="mt-5 flex w-full cursor-pointer items-start gap-3 text-left"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={agreed}
                aria-label="I have read and agree to the Partner Terms"
                onClick={e => { e.stopPropagation(); setAgreed(a => !a); setError(null) }}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] ring-1 transition ${
                  agreed ? 'bg-forest-600 ring-forest-600' : 'bg-white ring-ink/20'
                }`}
              >
                {agreed && <Check size={13} className="text-white" strokeWidth={3.5} />}
              </button>
              <span className="text-[12.5px] leading-snug text-ink-soft">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setShowTerms(true) }}
                  className="font-extrabold text-sky-600 underline underline-offset-2"
                >
                  Partner Terms
                </button>
                .
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowTerms(s => !s)}
              className="mt-2 pl-8 text-[11.5px] font-extrabold text-sky-600 underline underline-offset-2"
            >
              {showTerms ? 'Hide the terms' : 'Read them first'}
            </button>

            {showTerms && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl bg-ink/[0.02] p-3.5 ring-1 ring-ink/[0.07]">
                {PARTNER_TERMS_LONG.map(s => (
                  <div key={s.heading} className="mb-3 last:mb-0">
                    <p className="text-[11.5px] font-extrabold leading-snug text-ink">{s.heading}</p>
                    <p className="mt-1 text-[11px] leading-snug text-ink-mute">{s.text}</p>
                  </div>
                ))}
                <p className="mt-3 border-t border-ink/[0.07] pt-2 text-[10.5px] text-ink-mute/80">
                  The full agreement, including the genuineness undertaking, is
                  signed properly during onboarding — this is the same text.
                </p>
              </div>
            )}
            </>)}

            {/* ══════════════════════════════════════════════════════════
                GOOGLE IS THE BUTTON NOW
                ══════════════════════════════════════════════════════════

                It was below an email field and an "or" rule, which made
                typing an address the default and tapping a name the
                afterthought. For a decorator on a phone that is backwards:
                Google is one tap with no address to spell, no inbox to
                switch to and no six digits to copy back.

                Email has not gone anywhere -- it is the fallback below,
                one tap away, and it is still the only route that works for
                somebody whose phone has no Google account on it. It just
                is not the thing being offered first. */}
            <div className="mt-6">
              <GoogleSignInButton
                onClick={handleGoogle}
                loading={googleBusy}
                disabled={isNew && !agreed}
                fullWidth
                label="Continue with Google"
              />
            </div>

            {/* Said once it can actually be the reason. */}
            {isNew && !agreed && (
              <p className="mt-2 text-center text-[11.5px] font-semibold text-amber-700">
                Tick the box above to continue.
              </p>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/[0.08]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">or</span>
              <span className="h-px flex-1 bg-ink/[0.08]" />
            </div>

            {!emailOpen ? (
              <button
                type="button"
                onClick={() => setEmailOpen(true)}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl
                           bg-ink/[0.04] text-[14px] font-extrabold text-ink ring-1 ring-ink/[0.08]
                           transition active:scale-[0.99]"
              >
                <Mail size={16} />
                Continue with email
              </button>
            ) : (
              <>
                <p className="text-[13px] leading-snug text-ink-mute">
                  {isNew
                    ? 'One address, a six-digit code, and you are in. No password to invent.'
                    : 'The email you signed up with. We send a six-digit code.'}
                </p>

                <label className="mt-4 block">
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">
                    Your email
                  </span>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null) }}
                      onKeyDown={e => e.key === 'Enter' && requestCode()}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      autoFocus
                      className="w-full rounded-2xl bg-ink/[0.03] py-3.5 pl-10 pr-4 text-[15px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute focus:bg-white focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={requestCode}
                  disabled={!canContinue || busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-4 text-[15.5px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:bg-ink/[0.08] disabled:text-ink-mute"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                  {busy ? 'Sending…' : isNew ? 'Sign up' : 'Log in'}
                  {!busy && <ArrowRight size={17} />}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="text-[19px] font-extrabold leading-tight text-ink">
              Enter the code
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-ink-mute">
              Sent to <span className="font-extrabold text-ink">{email.trim().toLowerCase()}</span>
              {' · '}
              <button
                type="button"
                onClick={() => { setStage('email'); setCode(''); setError(null) }}
                className="font-extrabold text-royal-700 underline"
              >
                Change
              </button>
            </p>

            <input
              ref={codeRef}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && submitCode()}
              placeholder="······"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Six-digit code"
              className="mt-6 w-full rounded-2xl bg-ink/[0.03] py-4 text-center text-[26px] font-extrabold tracking-[0.5em] text-ink ring-1 ring-ink/[0.08] placeholder:tracking-[0.4em] placeholder:text-ink-mute/40 focus:bg-white focus:ring-2 focus:ring-royal-500"
            />

            <button
              type="button"
              onClick={submitCode}
              disabled={code.length < 6 || busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-4 text-[15.5px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:bg-ink/[0.08] disabled:text-ink-mute"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : null}
              {busy ? 'Checking…' : 'Verify and continue'}
            </button>

            {/* The consent, restated at the moment it takes effect.

                The box was ticked on the previous screen, which for a
                new partner was possibly a minute and one app-switch to
                their mail ago. Saying it again here is not paperwork:
                verifying is the act that creates the account, and the
                agreement should be in front of somebody at the instant
                they are bound by it rather than only at the instant they
                ticked a box. */}
            {isNew && (
              <p className="mt-3 text-center text-[11px] leading-snug text-ink-mute">
                By verifying you confirm you agree to the{' '}
                <button
                  type="button"
                  onClick={() => { setStage('email'); setShowTerms(true) }}
                  className="font-extrabold text-sky-600 underline underline-offset-2"
                >
                  Partner Terms
                </button>
                {' '}({PARTNER_TERMS_VERSION}).
              </p>
            )}

            <button
              type="button"
              disabled={resendIn > 0 || busy}
              onClick={requestCode}
              className="mt-3 w-full text-center text-[12.5px] font-extrabold text-royal-700 disabled:text-ink-mute"
            >
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </button>

            {/* ══════════════════════════════════════════════════════════
                TYPE THE CODE — DO NOT TAP THE LINK
                ══════════════════════════════════════════════════════════

                The mail carries both a six-digit token and a link, and
                they take completely different routes home.

                The CODE is verified by verifyOtp() straight from this
                origin: no redirect, nothing to allow-list, and the
                parked vendor role is still in this origin's localStorage
                when the profile row is written. It cannot be misrouted.

                The LINK goes out to Supabase and comes back to
                emailRedirectTo, which must be on the project's redirect
                list or it silently lands on the Site URL instead — a
                different origin, where the parked role does not exist
                and the partner is quietly made a customer.

                Saying which one to use costs a sentence and removes the
                whole dependency. It is not a substitute for putting the
                host on the list, which is still the right fix. */}
            <p className="mt-5 text-center text-[11.5px] leading-snug text-ink-mute">
              Type the six digits from the mail — that is the quickest way
              back. It can take a minute, and it sometimes lands in spam.
            </p>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold leading-snug text-rose-800 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {/* ── The one thing worth saying on a sign-in screen ──────────
            Not a pitch. A person who has installed this and is typing
            their address is asking one silent question — what is this
            going to cost me — and the answer is short enough to fit
            here. Everything else lives on /partner. */}
        <div className="mt-7 flex items-start gap-2.5 rounded-2xl bg-forest-50 p-3.5 ring-1 ring-forest-200/60">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-forest-700" />
          <p className="text-[12px] font-semibold leading-snug text-forest-900">
            Free to join and free to stay. You are paid once the work is done,
            and you can decline any job without a penalty.
          </p>
        </div>

        {/* Stamped so a signature written later can be compared against
            what was actually on screen at this moment. */}
        <p className="mt-2 text-center text-[10px] text-ink-mute/70">
          Partner terms {PARTNER_TERMS_VERSION}
        </p>
      </main>
    </div>
  )
}
