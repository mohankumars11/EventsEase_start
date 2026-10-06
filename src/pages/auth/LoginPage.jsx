import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'
import SambramoLogo from '../../components/ui/SambramoLogo'
import { isPartnerSurface } from '../../config/surface'

const RESEND_SECONDS = 60

function otpErrorMessage(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('not allowed') || m.includes('not found'))
    return "No account found with this email. Try “Continue with Google” below, or sign up."
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('expired'))                         return 'This code has expired. Click "Resend code" to get a new one.'
  if (m.includes('invalid'))                          return 'Incorrect code. Please check your email and try again.'
  return msg || 'Something went wrong. Please try again.'
}

/**
 * Google sign-in is not offered inside the app, and that is deliberate.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OAUTH LEAVES THE APP AND DOES NOT COME BACK
 * ══════════════════════════════════════════════════════════════════════
 *
 * `signInWithOAuth` navigates to accounts.google.com. Capacitor hands
 * any off-origin navigation to the system browser, so the person ends
 * up in Chrome — and `redirectTo` is built from `window.location.origin`,
 * which inside a bundled app is `https://localhost`. Google rejects that
 * as a redirect URI, and even if it did not, the session would land in
 * Chrome and the app would still be signed out.
 *
 * The reported symptom was exactly this: "the app is installed, but when
 * I log in it opens in Chrome."
 *
 * Making it work natively means a custom URL scheme, a deep-link
 * handler, and another OAuth client in the Google console — a project in
 * itself. And it buys nothing, because the email code below has no
 * redirect at all: it is two API calls, it never leaves the WebView, and
 * it already works.
 *
 * So on native there is one way in, and it is the one that works.
 */
export default function LoginPage() {
  /* Which of the two apps this bundle is. Stamped at build time by
     VITE_SURFACE, so it is a constant, not a guess about the URL. */
  const PARTNER = isPartnerSurface()
  const { sendEmailOtp, verifyEmailOtp, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  /* Where to go once signed in.
   *
   * Router state is how a redirected route asks for this, and it works
   * until the page is reloaded or arrived at cold, when state is gone and
   * a partner lands on the dashboard root instead of the tab they tapped.
   * `?next=` survives both, and is what the partner tab bar sends when a
   * signed out tap needs an account first.
   *
   * Same-origin paths only. An open redirect on a login page is how a
   * phishing link gets to wear your domain: sign in on the real site,
   * get bounced somewhere else entirely, with the trust already spent. */
  const rawNext = new URLSearchParams(location.search).get('next')
  const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : null
  const from = location.state?.from
    ?? (safeNext
      ? { pathname: safeNext.split('?')[0], search: safeNext.includes('?') ? `?${safeNext.split('?')[1]}` : '' }
      : null)

  const [step, setStep]               = useState('email')   // email | sent | otp
  const [email, setEmail]             = useState('')
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState(null)
  const [resendTimer, setResendTimer] = useState(0)
  const otpRefs = useRef([])

  // Only redirect if already signed-in when user FIRST lands on this page
  // Do NOT redirect during OTP flow (step !== 'email')
  useEffect(() => {
    if (user && profile && step === 'email') redirectByRole(profile.role)
  }, [user, profile])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  function redirectByRole(role) {
    if (from)                  navigate(from.pathname + (from.search ?? ''), { replace: true })
    else if (role === 'vendor') navigate('/dashboard/vendor',   { replace: true })
    else if (role === 'admin')  navigate('/dashboard/admin',    { replace: true })
    else                        navigate('/dashboard/customer', { replace: true })
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  async function handleSendOtp(e) {
    e?.preventDefault()
    setError(null)
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return }
    setLoading(true)
    try {
      await sendEmailOtp(email.trim().toLowerCase(), { shouldCreateUser: false })
      setStep('sent')
      setResendTimer(RESEND_SECONDS)
    } catch (err) {
      setError(otpErrorMessage(err?.message))
    } finally {
      setLoading(false)
    }
  }

  function handleEnterCode() {
    setStep('otp')
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    setError(null)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  async function handleVerifyOtp(e) {
    e?.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Please enter all 6 digits.'); return }
    setLoading(true)
    setError(null)
    try {
      /* The session comes back from the verify. Handing it straight to
         completeProfile removes a getUser round trip from the slowest
         moment in the whole app. */
      const verified = await verifyEmailOtp(email.trim().toLowerCase(), code)
      // If redirected here from a gated page (e.g. /plan), go back there.
      // Otherwise /dashboard — DashboardRedirect will route by role once profile loads.
      if (from) navigate(from.pathname + (from.search ?? ''), { replace: true })
      else      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(otpErrorMessage(err?.message))
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setLoading(true)
    setError(null)
    try {
      await sendEmailOtp(email.trim().toLowerCase(), { shouldCreateUser: false })
      setResendTimer(RESEND_SECONDS)
      setOtp(['', '', '', '', '', ''])
      if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err) {
      setError(otpErrorMessage(err?.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try { await signInWithGoogle() }
    catch (err) { setError(err?.message ?? 'Google sign-in failed.'); setGoogleLoading(false) }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left brand panel */}
      <div className="hidden md:flex md:w-5/12 flex-col justify-between p-12 bg-plum-900">
        <Link to="/" className="inline-flex items-center gap-3">
          <SambramoLogo size={40} ground="onDark" caption />
        </Link>
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-snug">
              {BRAND.signatureParts[0]}<br />{BRAND.signatureParts[1]}
            </h2>
            <p className="text-plum-300 mt-3 text-base leading-relaxed">{BRAND.descriptor}.</p>
          </div>
          <ul className="space-y-3">
            {['Human concierge team', 'Zero hassle planning', 'Every detail handled'].map(p => (
              <li key={p} className="flex items-center gap-3 text-plum-200 text-sm">
                <CheckCircle2 size={16} className="text-saffron-400 shrink-0" />{p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-plum-700 text-xs">&copy; {new Date().getFullYear()} Sambramo</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">

          {/* ══════════════════════════════════════════════════════════
              THE PARTNER APP SIGNS YOU IN AS THE PARTNER APP
              ══════════════════════════════════════════════════════════

              One codebase serves two apps, and this screen was showing
              both of them the customer's front door: the teal wordmark
              over "CELEBRATIONS, ARRANGED · NOTHING LEFT TO CHANCE". A
              decorator who downloaded Sambramo Partners, tapped the
              saffron icon and got that has every reason to think they
              opened the wrong app — and sign-in is the worst screen in
              the product to make somebody doubt where they are.

              So the partner app signs in under its own navy lockup, with
              a line about work rather than about celebrations. Same form,
              same Google button, same code path. Only the identity
              changes, because only the identity was wrong. */}
          {PARTNER ? (
            <div className="mb-8 rounded-[22px] bg-plum-950 px-5 py-5 text-center">
              <span className="flex items-baseline justify-center gap-2">
                <span className="font-serif text-[26px] font-extrabold leading-none tracking-tight text-white">
                  Sambramo
                </span>
                <span className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-white/85">
                  Partners
                </span>
              </span>
              <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-saffron-400">
                Work near you · Paid after every event
              </p>
            </div>
          ) : (
            <div className="flex md:hidden justify-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2">
                <SambramoLogo size={36} ground="onLight" caption />
              </Link>
            </div>
          )}

          {/* ── Step 1: Email input ── */}
          {step === 'email' && (
            <>
              {from?.pathname?.startsWith('/plan') && (
                <div className="mb-6 p-4 bg-saffron-50 border border-saffron-200 rounded-2xl">
                  <p className="text-sm font-semibold text-plum-900">
                    You're just a few steps from a seamless celebration. ✨
                  </p>
                  <p className="text-xs text-plum-700 mt-1">
                    Sign in and let's pick up right where you left off.
                  </p>
                </div>
              )}
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Welcome back.</h1>
              <p className="text-gray-500 text-sm mb-8">
                {PARTNER
                  ? 'Sign in to see the jobs near you.'
                  : "Enter your email — we'll send you a login code."}
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null) }}
                      className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400 text-base"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      inputMode="email"
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading}
                  /* Saffron on the partner app: it is the accept colour on
                     every job card, so the button that starts the session
                     matches the button that earns the money. */
                  className={`w-full py-3.5 text-base rounded-2xl font-extrabold disabled:opacity-60 disabled:cursor-not-allowed ${
                    PARTNER ? 'bg-saffron-400 text-plum-950' : 'btn-plum'
                  }`}>
                  {loading ? 'Sending code…' : 'Send OTP →'}
                </button>
              </form>

              {/* The divider belongs to the Google button, so it goes
                  with it. A rule saying "or" above nothing is a screen
                  that looks broken. */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} fullWidth label="Continue with Google" />

              <p className="text-center text-sm text-gray-500 mt-6">
                New to Sambramo?{' '}
                <Link to="/signup" className="text-plum-600 font-semibold hover:underline">Sign up</Link>
              </p>
            </>
          )}

          {/* ── Step 2: Email sent confirmation ── */}
          {step === 'sent' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-plum-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                <Mail size={36} className="text-plum-600" />
              </div>

              <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Check your email!</h1>
              <p className="text-gray-600 text-sm mb-1">We sent a login email to:</p>
              <p className="text-plum-700 font-semibold text-base mb-6 break-all">{email}</p>

              {/* Two-path instructions */}
              <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-4 mb-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Option A — Sign-in link</p>
                  <p className="text-sm text-gray-700">Click the <strong>"Sign in"</strong> button inside the email. Your browser will sign you in automatically.</p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Option B — 6-digit code</p>
                  <p className="text-sm text-gray-700">If the email shows a 6-digit number, copy it and click <strong>"I have the code"</strong> below.</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 mb-5">
                Didn't receive it? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </div>

              {error && <ErrorBox message={error} className="mb-4 text-left" />}

              <button
                onClick={handleEnterCode}
                className="btn-plum w-full py-3.5 text-base mb-3"
              >
                I have a 6-digit code →
              </button>

              <div className="flex items-center justify-between">
                <button onClick={() => { setStep('email'); setError(null) }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-plum-600 transition-colors">
                  <ArrowLeft size={14} /> Change email
                </button>
                {resendTimer > 0 ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw size={11} /> Resend in {resendTimer}s
                  </p>
                ) : (
                  <button onClick={handleResend} disabled={loading}
                    className="text-sm text-plum-600 font-semibold hover:underline disabled:opacity-50">
                    Resend email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: OTP input ── */}
          {step === 'otp' && (
            <>
              <button onClick={() => { setStep('sent'); setError(null) }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-plum-600 mb-6 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Enter the code.</h1>
              <p className="text-gray-500 text-sm mb-6">
                6-digit code sent to <span className="font-semibold text-gray-700">{email}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Verification code</label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="flex-1 max-w-[52px] h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-100 transition-all"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Tip: You can paste the code directly.</p>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading || otp.join('').length < 6}
                  className="btn-plum w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Verifying…
                    </span>
                  ) : 'Verify & Sign In →'}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button onClick={() => { setStep('sent'); setError(null) }}
                  className="text-sm text-gray-500 hover:text-plum-600 transition-colors">
                  ← Instructions
                </button>
                {resendTimer > 0 ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw size={11} /> Resend in {resendTimer}s
                  </p>
                ) : (
                  <button onClick={handleResend} disabled={loading}
                    className="text-sm text-plum-600 font-semibold hover:underline disabled:opacity-50">
                    Resend code
                  </button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function ErrorBox({ message, className = '' }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 ${className}`}>
      <AlertCircle size={15} className="mt-0.5 shrink-0" />{message}
    </div>
  )
}
