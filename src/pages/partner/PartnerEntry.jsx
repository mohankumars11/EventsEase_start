import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Mail, ShieldCheck, Check } from 'lucide-react'
import { useAuth, PENDING_ROLE } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'
import { PARTNER_TERMS_LONG, PARTNER_TERMS_VERSION } from '../../config/partnerTerms'

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
      {/* ══════════════════════════════════════════════════════════════
          THE NAME, WITH ROOM AROUND IT
          ══════════════════════════════════════════════════════════════

          Deliberately not a white page with a logo at the top. Two apps
          ship from this one bundle and a partner has both on their phone
          more often than not; the moment the partner app opens it should
          not be mistakable for the customer one. A dark ground and the
          serif wordmark does that in the half second before anything is
          read. */}
      <header className="px-7 pb-9 pt-14 text-center">
        <p className="font-serif text-[34px] font-extrabold leading-none tracking-tight text-white">
          Sambramo
        </p>
        <p className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.34em] text-saffron-400">
          Partners
        </p>
        {/* The one line the app gets to explain itself, and it has to do
            it to somebody who has just installed it and is deciding
            whether to type an email.

            "Work that comes to you" described the mechanism. This
            describes the outcome, and inverts the thing a supplier
            spends their life doing — chasing enquiries. They stop
            looking; the celebrations arrive. Same promise, and it is
            the sentence a decorator would repeat to another decorator. */}
        <p className="mx-auto mt-4 max-w-[17rem] text-[14px] font-semibold leading-snug text-white/65">
          Where the city’s celebrations find you.
        </p>
      </header>

      {/* The sheet. Rounded off the dark ground rather than a card
          floating on white — it reads as the app opening rather than as
          a form dropped onto a page. */}
      <main className="flex-1 rounded-t-[30px] bg-white px-6 pb-10 pt-7">
        {stage === 'email' ? (
          <>
            {/* Two words, decided before anything is typed. */}
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

            <h1 className="mt-5 text-[19px] font-extrabold leading-tight text-ink">
              {isNew ? 'Join as a partner' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-ink-mute">
              {isNew
                ? 'One address, a six-digit code, and you are in. No password to invent.'
                : 'The email you signed up with. We send a six-digit code.'}
            </p>

            <label className="mt-6 block">
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
                  className="w-full rounded-2xl bg-ink/[0.03] py-3.5 pl-10 pr-4 text-[15px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute focus:bg-white focus:ring-2 focus:ring-royal-500"
                />
              </div>
            </label>

            {/* Not pre-ticked, and only asked of somebody signing up. */}
            {isNew && (<>
            <button
              type="button"
              onClick={() => { setAgreed(a => !a); setError(null) }}
              className="mt-5 flex w-full items-start gap-3 text-left"
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] ring-1 transition ${
                  agreed ? 'bg-forest-600 ring-forest-600' : 'bg-white ring-ink/20'
                }`}
              >
                {agreed && <Check size={13} className="text-white" strokeWidth={3.5} />}
              </span>
              <span className="text-[12.5px] leading-snug text-ink-soft">
                I have read and agree to the Partner Terms.
              </span>
            </button>

            {/* ══════════════════════════════════════════════════════════
                THE TERMS ARE ON THIS SCREEN, NOT BEHIND A LINK
                ══════════════════════════════════════════════════════════

                There is no public terms route — PARTNER_TERMS_LONG has
                only ever rendered inside the signed-in account page and
                the onboarding gate. Linking to one would have been a
                dead link under a box somebody is being asked to tick,
                which is the worst version of this pattern.

                Inline and expanding, rather than a fixed overlay: an
                ancestor with a transform breaks `position: fixed`, and
                this screen has active:scale on its buttons. A
                disclosure cannot be trapped that way.

                It is also simply better. Nobody who leaves a sign-up to
                read terms comes back to finish it. */}
            <button
              type="button"
              onClick={() => setShowTerms(s => !s)}
              className="mt-2 pl-8 text-[11.5px] font-extrabold text-royal-700 underline"
            >
              {showTerms ? 'Hide the terms' : 'Read them first'}
            </button>

            {showTerms && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl bg-ink/[0.02] p-3.5 ring-1 ring-ink/[0.07]">
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

            <button
              type="button"
              onClick={requestCode}
              disabled={!canContinue || busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-4 text-[15.5px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:bg-ink/[0.08] disabled:text-ink-mute"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : null}
              {busy ? 'Sending…' : isNew ? 'Sign up' : 'Log in'}
              {!busy && <ArrowRight size={17} />}
            </button>

            {/* Why the button is dead, said once it can actually be the
                reason — never before they have typed anything. */}
            {isNew && emailOk && !agreed && (
              <p className="mt-2 text-center text-[11.5px] font-semibold text-amber-700">
                Tick the box above to continue.
              </p>
            )}

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/[0.08]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">or</span>
              <span className="h-px flex-1 bg-ink/[0.08]" />
            </div>

            <GoogleSignInButton
              onClick={handleGoogle}
              loading={googleBusy}
              fullWidth
              label="Continue with Google"
            />
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

        <p className="mt-4 text-center text-[11px] text-ink-mute">
          Not a partner yet?{' '}
          <Link to="/partner" className="font-extrabold text-royal-700 underline">
            See what Sambramo pays
          </Link>
        </p>

        {/* Stamped so a signature written later can be compared against
            what was actually on screen at this moment. */}
        <p className="mt-2 text-center text-[10px] text-ink-mute/70">
          Partner terms {PARTNER_TERMS_VERSION}
        </p>
      </main>
    </div>
  )
}
