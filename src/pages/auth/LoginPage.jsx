import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'

const RESEND_SECONDS = 30

function phoneOtpErrorMessage(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('unsupported') || m.includes('not supported') || m.includes('provider') || m.includes('disabled'))
    return 'Phone OTP is not configured on this project yet. Please use "Continue with Google" to sign in, or ask the admin to enable SMS in Supabase.'
  if (m.includes('rate') || m.includes('too many'))
    return 'Too many OTP requests. Please wait a few minutes and try again.'
  if (m.includes('invalid') || m.includes('format'))
    return 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number.'
  return msg || 'Could not send OTP. Please try again.'
}

function normalizePhone(raw) {
  return `+91${raw.replace(/\D/g, '').slice(-10)}`
}

export default function LoginPage() {
  const { sendPhoneOtp, verifyPhoneOtp, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]               = useState('phone') // phone | otp
  const [phone, setPhone]             = useState('')
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
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

  function redirectByRole(role) {
    if (role === 'vendor')     navigate('/dashboard/vendor',   { replace: true })
    else if (role === 'admin') navigate('/dashboard/admin',    { replace: true })
    else                       navigate('/dashboard/customer', { replace: true })
  }

  function validatePhone(val) {
    return /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''))
  }

  async function handleSendOtp(e) {
    e?.preventDefault()
    setError(null)
    const digits = phone.replace(/\D/g, '')
    if (!validatePhone(digits)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    setLoading(true)
    try {
      await sendPhoneOtp(normalizePhone(digits))
      setStep('otp')
      setResendTimer(RESEND_SECONDS)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(phoneOtpErrorMessage(err?.message))
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
      // onAuthStateChange will fire and fetchProfile → redirect happens via useEffect
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.includes('expired'))     setError('This code has expired. Please request a new one.')
      else if (msg.includes('invalid')) setError("That code doesn't look right. Please try again.")
      else setError('Verification failed. Please try again.')
      setOtp(['', '', '', '', '', ''])
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

      {/* Left brand panel (desktop) */}
      <div className="hidden md:flex md:w-5/12 flex-col justify-between p-12 bg-plum-900">
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="w-10 h-10 bg-saffron-400 rounded-xl flex items-center justify-center font-bold text-xl text-plum-950 font-display">S</span>
          <span className="text-2xl font-bold text-white font-display">Sambr<span className="text-saffron-400">amo</span></span>
        </Link>
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-snug">Your Moment.<br />Our Magic.</h2>
            <p className="text-plum-300 mt-3 text-base leading-relaxed">India's human-assisted concierge celebration service.</p>
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

          {/* Mobile logo */}
          <div className="flex md:hidden justify-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="w-9 h-9 bg-saffron-400 rounded-xl flex items-center justify-center font-bold text-lg text-plum-950 font-display">S</span>
              <span className="text-xl font-bold text-gray-900 font-display">Sambr<span className="text-plum-600">amo</span></span>
            </Link>
          </div>

          {step === 'phone' && (
            <>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Welcome back.</h1>
              <p className="text-gray-500 text-sm mb-8">Let's get you back to your celebration.</p>

              <form onSubmit={handleSendOtp} className="space-y-4">
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
                      autoComplete="tel"
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading} className="btn-plum w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} fullWidth label="Continue with Google" />

              <p className="text-center text-sm text-gray-500 mt-6">
                New to Sambramo?{' '}
                <Link to="/signup" className="text-plum-600 font-semibold hover:underline">Sign up</Link>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              <button onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(null) }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-plum-600 mb-6 transition-colors">
                <ArrowLeft size={15} /> Change number
              </button>

              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Check your phone.</h1>
              <p className="text-gray-500 text-sm mb-8">
                We've sent a 6-digit code to <span className="font-semibold text-gray-700">{maskedPhone}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Enter verification code</label>
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

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />{message}
    </div>
  )
}
