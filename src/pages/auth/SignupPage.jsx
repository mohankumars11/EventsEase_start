import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'

const RESEND_SECONDS = 30

function normalizePhone(raw) {
  return `+91${raw.replace(/\D/g, '').slice(-10)}`
}

const TRUST_POINTS = [
  'Human concierge team manages every detail',
  'Vetted vendors across India',
  'Transparent pricing, zero hidden fees',
]

export default function SignupPage() {
  const { sendPhoneOtp, verifyPhoneOtp, completeProfile, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()

  // steps: role → info → otp
  const [step, setStep]               = useState('role')
  const [role, setRole]               = useState(null)          // 'customer' | 'vendor'
  const [fullName, setFullName]       = useState('')
  const [phone, setPhone]             = useState('')
  const [otp, setOtp]                 = useState(['','','','','',''])
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState(null)
  const [resendTimer, setResendTimer] = useState(0)
  const otpRefs = useRef([])

  useEffect(() => {
    if (user && profile) redirectByRole(profile.role)
  }, [user, profile])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  function redirectByRole(r) {
    if (r === 'vendor')     navigate('/onboarding/vendor', { replace: true })
    else if (r === 'admin') navigate('/dashboard/admin',   { replace: true })
    else                    navigate('/dashboard/customer', { replace: true })
  }

  function handleRoleSelect(r) {
    setRole(r)
    setStep('info')
    setError(null)
  }

  async function handleSendOtp(e) {
    e?.preventDefault()
    setError(null)
    if (!fullName.trim())               return setError('Please enter your full name.')
    const digits = phone.replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(digits))  return setError('Enter a valid 10-digit Indian mobile number.')
    setLoading(true)
    try {
      await sendPhoneOtp(normalizePhone(digits))
      setStep('otp')
      setResendTimer(RESEND_SECONDS)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err?.message ?? 'Could not send OTP. Please try again.')
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
      const digits = phone.replace(/\D/g, '')
      await verifyPhoneOtp(normalizePhone(digits), code)
      // OTP verified → create/update profile with name + role
      await completeProfile({ fullName, role, phone: normalizePhone(digits) })
      // redirect happens via useEffect after profile is set
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.includes('expired'))      setError('This code has expired. Please request a new one.')
      else if (msg.includes('invalid')) setError("That code doesn't look right. Please try again.")
      else setError('Verification failed. Please try again.')
      setOtp(['','','','','',''])
      otpRefs.current[0]?.focus()
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

  const maskedPhone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`

  return (
    <div className="min-h-screen flex">

      {/* Left brand panel */}
      <div className="hidden md:flex md:w-5/12 flex-col justify-between p-12 bg-plum-900">
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="w-10 h-10 bg-saffron-400 rounded-xl flex items-center justify-center font-bold text-xl text-plum-950 font-display">S</span>
          <span className="text-2xl font-bold text-white font-display">Sambr<span className="text-saffron-400">amo</span></span>
        </Link>
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-snug">Your Moment.<br />Our Magic.</h2>
            <p className="text-plum-300 mt-3 text-base leading-relaxed">India's human-assisted concierge celebration marketplace.</p>
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

          {/* Mobile logo */}
          <div className="flex md:hidden justify-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="w-9 h-9 bg-saffron-400 rounded-xl flex items-center justify-center font-bold text-lg text-plum-950 font-display">S</span>
              <span className="text-xl font-bold text-gray-900 font-display">Sambr<span className="text-plum-600">amo</span></span>
            </Link>
          </div>

          {/* ── Step: Role selection ── */}
          {step === 'role' && (
            <>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Join Sambramo.</h1>
              <p className="text-gray-500 text-sm mb-8">How would you like to get started?</p>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => handleRoleSelect('customer')}
                  className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-plum-400 hover:bg-plum-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🎉</span>
                    <div>
                      <p className="font-bold text-gray-900 text-base group-hover:text-plum-700">I want to plan a celebration</p>
                      <p className="text-sm text-gray-500 mt-0.5">Weddings, birthdays, corporate events & more</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('vendor')}
                  className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-saffron-400 hover:bg-saffron-50 transition-all group"
                >
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
                <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
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

          {/* ── Step: Name + Phone ── */}
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
                {role === 'vendor'
                  ? "You'll complete your business profile after verifying your number."
                  : "We'll send a verification code to your mobile."}
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {role === 'vendor' ? 'Your name' : 'Full name'}
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile number</label>
                  <div className="flex gap-2">
                    <span className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm bg-gray-50 shrink-0 flex items-center">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null) }}
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400 text-lg tracking-wider"
                      placeholder="98765 43210"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading}
                  className="btn-plum w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
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
                <ArrowLeft size={15} /> Change number
              </button>

              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Check your phone.</h1>
              <p className="text-gray-500 text-sm mb-8">
                We've sent a 6-digit code to <span className="font-semibold text-gray-700">{maskedPhone}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Verification code</label>
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
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
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-100 transition-all"
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
                  <p className="text-sm text-gray-400 flex items-center justify-center gap-1.5">
                    <RefreshCw size={13} /> Resend code in {resendTimer}s
                  </p>
                ) : (
                  <button onClick={handleSendOtp} disabled={loading}
                    className="text-sm text-plum-600 font-semibold hover:underline disabled:opacity-50">
                    Resend OTP
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
