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
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('expired'))                         return 'This code has expired. Please request a new one.'
  if (m.includes('invalid') || m.includes('wrong'))  return "That code doesn't look right. Please try again."
  return msg || 'Something went wrong. Please try again.'
}

const TRUST_POINTS = [
  'Human concierge team manages every detail',
  'Vetted vendors across India',
  'Transparent pricing, zero hidden fees',
]

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
export default function SignupPage() {
  /* Which of the two apps this bundle is. Stamped at build time by
     VITE_SURFACE, so it is a constant, not a guess about the URL. */
  const PARTNER = isPartnerSurface()
  const { sendEmailOtp, verifyEmailOtp, completeProfile, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  // Capture a referral code from a shared link (?ref=CODE) before the
  // signup flow (email OTP or Google) navigates away from this URL —
  // AuthContext resolves and applies it once the profile is created.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref')
    if (ref) localStorage.setItem('ee_pending_ref', ref.toUpperCase())
  }, [location.search])

  /* The role can arrive in the URL, and then the chooser is skipped.

     A master reaching this from the partner landing page has already
     answered "who are you?" — by reading a page headed "Work that comes
     to you" and pressing "Join as a partner". Asking again is a step
     that can only be got wrong, and getting it wrong here creates a
     CUSTOMER account for somebody who came to sell. That is not visible
     to them until the dashboard is empty.

     Read once, at mount. Not a live read of the query string: changing
     it mid-signup would move somebody between forms. */
  const roleFromUrl = (() => {
    const r = new URLSearchParams(location.search).get('role')
    return r === 'vendor' || r === 'customer' ? r : null
  })()

  /* Parked before any button can leave this origin.

     "Continue with Google" navigates to accounts.google.com and comes
     back to /auth/callback, where the profile row is created. Nothing
     in React state crosses that, so the intent has to be written down
     somewhere the return trip can read it. */
  useEffect(() => {
    if (!roleFromUrl) return
    try { localStorage.setItem('ee_pending_role', roleFromUrl) } catch { /* storage off */ }
  }, [roleFromUrl])

  // steps: role → info → otp
  const [step, setStep]               = useState(roleFromUrl ? 'info' : 'role')
  const [role, setRole]               = useState(roleFromUrl)
  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')          // optional, for profile only
  const [otp, setOtp]                 = useState(['','','','','',''])
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState(null)
  const [resendTimer, setResendTimer] = useState(0)
  const [resendSent, setResendSent]   = useState(false)
  const otpRefs = useRef([])

  // Only auto-redirect if they land here already authenticated
  // Don't redirect mid-OTP flow
  useEffect(() => {
    // 'info' as well as 'role'. Keying this on 'role' alone meant a
    // signed-in partner arriving from /partner/join — who now skips
    // straight to 'info' — was shown a signup form for the account they
    // already have, instead of being sent to their dashboard.
    if (user && profile && (step === 'role' || step === 'info')) redirectByRole(profile.role)
  }, [user, profile])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  function redirectByRole(r) {
    /* A vendor goes to their DASHBOARD, not to the onboarding form.
     *
     * Onboarding prefills from the existing row, so sending an
     * established partner there is not destructive — it is just wrong.
     * They came to work, and they are shown a form asking for a
     * business name they entered weeks ago.
     *
     * The dashboard is right for both cases: a partner with no vendor
     * row gets its "Set up my profile" door, which is the same
     * onboarding one tap further on. */
    if (r === 'vendor')     navigate('/dashboard/vendor', { replace: true })
    else if (r === 'admin') navigate('/dashboard/admin',   { replace: true })
    else if (from)          navigate(from.pathname + (from.search ?? ''), { replace: true })
    else                    navigate('/dashboard/customer', { replace: true })
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  function handleRoleSelect(r) {
    setRole(r)
    // Parked for the same reason as roleFromUrl above: the very next
    // thing this person may press is "Continue with Google", which
    // leaves the origin and comes back to a callback that has no idea
    // what they chose.
    try { localStorage.setItem('ee_pending_role', r) } catch { /* storage off */ }
    setStep('info')
    setError(null)
  }

  async function handleSendOtp(e) {
    e?.preventDefault()
    setError(null)
    if (!fullName.trim())        return setError('Please enter your full name.')
    if (!isValidEmail(email))    return setError('Please enter a valid email address.')
    setLoading(true)
    try {
      await sendEmailOtp(email.trim().toLowerCase())
      setStep('otp')
      setResendTimer(RESEND_SECONDS)
      setResendSent(false)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(otpErrorMessage(err?.message))
    } finally {
      setLoading(false)
    }
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
      const phoneFormatted = phone.trim()
        ? (phone.trim().startsWith('+') ? phone.trim() : `+91${phone.replace(/\D/g, '')}`)
        : null
      await completeProfile({ fullName, role, phone: phoneFormatted, user: verified?.user ?? verified?.data?.user })
      // Explicit redirect — don't wait for useEffect
      const target = role === 'vendor' ? '/onboarding/vendor'
                   : role === 'admin'  ? '/dashboard/admin'
                   : from              ? from.pathname + (from.search ?? '')
                   :                     '/dashboard/customer'
      navigate(target, { replace: true })
    } catch (err) {
      setError(otpErrorMessage(err?.message))
      setOtp(['','','','','',''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setLoading(true)
    setError(null)
    try {
      await sendEmailOtp(email.trim().toLowerCase())
      setResendTimer(RESEND_SECONDS)
      setResendSent(true)
      setOtp(['','','','','',''])
      otpRefs.current[0]?.focus()
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
            {/* Was "…celebration marketplace" — the word the business stopped
                being at the concierge pivot, still selling the old company to
                every brand-new customer at the exact moment they sign up. */}
            <p className="text-plum-300 mt-3 text-base leading-relaxed">{BRAND.descriptor}.</p>
          </div>
          <ul className="space-y-3">
            {TRUST_POINTS.map(p => (
              <li key={p} className="flex items-start gap-3 text-plum-200 text-sm">
                <CheckCircle2 size={16} className="text-saffron-400 shrink-0 mt-0.5" />{p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-plum-700 text-xs">&copy; {new Date().getFullYear()} Sambramo</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Signing up wears the same identity as signing in. See
              LoginPage for why the customer lockup was the wrong thing to
              show somebody who deliberately installed the partner app. */}
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
                Free to join · Free to stay
              </p>
            </div>
          ) : (
            <div className="flex md:hidden justify-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2">
                <SambramoLogo size={36} ground="onLight" caption />
              </Link>
            </div>
          )}

          {/* ── Step: Role selection ── */}
          {step === 'role' && (
            <>
              {from?.pathname?.startsWith('/plan') && (
                <div className="mb-6 p-4 bg-saffron-50 border border-saffron-200 rounded-2xl">
                  <p className="text-sm font-semibold text-plum-900">
                    You're a few steps closer to your seamless celebration. ✨
                  </p>
                  <p className="text-xs text-plum-700 mt-1">
                    Create your account — it takes a minute, and we handle everything from here.
                  </p>
                </div>
              )}
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Join Sambramo.</h1>
              <p className="text-gray-500 text-sm mb-8">How would you like to get started?</p>

              <div className="space-y-3 mb-8">
                <button onClick={() => handleRoleSelect('customer')}
                  className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-plum-400 hover:bg-plum-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🎉</span>
                    <div>
                      <p className="font-bold text-gray-900 text-base group-hover:text-plum-700">I want to plan a celebration</p>
                      <p className="text-sm text-gray-500 mt-0.5">Weddings, birthdays, corporate events & more</p>
                    </div>
                  </div>
                </button>

                <button onClick={() => handleRoleSelect('vendor')}
                  className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-saffron-400 hover:bg-saffron-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🤝</span>
                    <div>
                      <p className="font-bold text-gray-900 text-base group-hover:text-saffron-700">I am an event professional</p>
                      <p className="text-sm text-gray-500 mt-0.5">Caterers, decorators, photographers, venues</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} fullWidth label="Continue with Google" />

              {error && <ErrorBox message={error} className="mt-4" />}

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-plum-600 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step: Name + Email ── */}
          {step === 'info' && (
            <>
              <button onClick={() => { setStep('role'); setError(null) }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-plum-600 mb-6 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">
                {role === 'vendor' ? 'Create your partner account.' : 'Create your account.'}
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                We'll send a verification code to your email.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); setError(null) }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                    placeholder="Priya Sharma"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null) }}
                      className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                      placeholder="priya@example.com"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile number <span className="font-normal text-gray-500">(optional — for WhatsApp updates)</span>
                  </label>
                  <div className="flex gap-2">
                    <span className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm bg-gray-50 shrink-0 flex items-center">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null) }}
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                      placeholder="98765 43210"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading}
                  className="btn-plum w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Sending code…' : 'Send OTP →'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-plum-600 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step: OTP verification ── */}
          {step === 'otp' && (
            <>
              <button onClick={() => { setStep('info'); setOtp(['','','','','','']); setError(null) }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-plum-600 mb-6 transition-colors">
                <ArrowLeft size={15} /> Change email
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-plum-50 rounded-full flex items-center justify-center shrink-0">
                  <Mail size={22} className="text-plum-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-gray-900">Check your inbox!</h1>
                  <p className="text-gray-500 text-xs mt-0.5">6-digit code sent to <span className="font-semibold text-gray-700">{email}</span></p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 mb-6">
                Didn't receive it? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </div>

              {resendSent && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 mb-4">
                  <CheckCircle2 size={14} /> New code sent! Check your inbox.
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">6-digit verification code</label>
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
                        className="flex-1 max-w-[52px] h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-100 transition-all"
                      />
                    ))}
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading || otp.join('').length < 6}
                  className="btn-plum w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Verifying…' : 'Verify & Continue →'}
                </button>
              </form>

              <div className="text-center mt-4">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                    <RefreshCw size={13} /> Resend in {resendTimer}s
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
