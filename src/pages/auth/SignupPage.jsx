import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'
import { BRAND } from '../../config/sambramo'

const TRUST_POINTS = [
  'Human concierge team',
  'Zero hassle planning',
  'Every detail handled',
]

export default function SignupPage() {
  const { signUp, signInWithGoogle, user, profile } = useAuth()
  const navigate         = useNavigate()

  const [form, setForm] = useState({
    fullName:  '',
    email:     '',
    phone:     '',
    password:  '',
    role:      'customer',
    city:      '',
  })
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    if (user && profile) redirectByRole(profile.role)
  }, [user, profile])

  function redirectByRole(role) {
    if (role === 'vendor')     navigate('/dashboard/vendor',   { replace: true })
    else if (role === 'admin') navigate('/dashboard/admin',    { replace: true })
    else                       navigate('/dashboard/customer', { replace: true })
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.fullName.trim())             return setError('Please enter your full name.')
    if (!form.phone.match(/^[6-9]\d{9}$/)) return setError('Enter a valid 10-digit Indian mobile number.')
    if (form.password.length < 6)          return setError('Password must be at least 6 characters.')
    if (!form.city)                        return setError('Please select your city.')

    setLoading(true)
    try {
      await signUp(form)
      // redirect happens via useEffect when profile loads
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      // Supabase redirects the browser — execution stops here
    } catch (err) {
      setError(err?.message ?? 'Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop only) ──────────────────────── */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-plum-900">

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="w-10 h-10 bg-saffron-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            S
          </span>
          <span className="text-2xl font-bold text-white font-display">
            Sambr<span className="text-saffron-400">amo</span>
          </span>
        </Link>

        {/* Tagline + trust points */}
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-snug">
              Your Moment.<br />Our Magic.
            </h2>
            <p className="text-plum-300 mt-3 text-lg">
              India's human-assisted concierge celebration marketplace.
            </p>
          </div>
          <ul className="space-y-4">
            {TRUST_POINTS.map(point => (
              <li key={point} className="flex items-center gap-3 text-plum-200">
                <CheckCircle2 size={18} className="text-saffron-400 shrink-0" />
                <span className="text-base">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-plum-600 text-xs">
          &copy; {new Date().getFullYear()} Sambramo. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex md:hidden justify-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="w-9 h-9 bg-saffron-400 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow">
                S
              </span>
              <span className="text-xl font-bold text-gray-900 font-display">
                Sambr<span className="text-plum-600">amo</span>
              </span>
            </Link>
          </div>

          <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">
            Start your celebration journey
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Create your account and let us handle the rest
          </p>

          {/* ── Google sign-in ──────────────────────────────── */}
          <div className="mb-5">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              fullWidth={true}
              label="Sign up with Google"
            />
          </div>

          {/* ── OR divider ──────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Form ────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                placeholder="Priya Sharma"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                placeholder="priya@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile number</label>
              <div className="flex gap-2">
                <span className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm shrink-0 bg-gray-50">
                  +91
                </span>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                  placeholder="9876543210"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900"
                required
              >
                <option value="">Select your city</option>
                {BRAND.servicedCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                  placeholder="Min. 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ── Error ───────────────────────────────────── */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-plum w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {/* ── Footer link ─────────────────────────────────── */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-plum-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
