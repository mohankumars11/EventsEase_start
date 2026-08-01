import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'

const TRUST_POINTS = [
  'Human concierge team',
  'Zero hassle planning',
  'Every detail handled',
]

export default function LoginPage() {
  const { signIn, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]                   = useState({ email: '', password: '' })
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    if (user && profile) redirectByRole(profile.role)
  }, [user, profile])

  function redirectByRole(role) {
    if (role === 'vendor')      navigate('/dashboard/vendor',   { replace: true })
    else if (role === 'admin')  navigate('/dashboard/admin',    { replace: true })
    else                        navigate('/dashboard/customer', { replace: true })
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(form)
      // redirect handled via useEffect once profile loads
    } catch {
      setError('Invalid email or password. Please try again.')
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
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

          <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to continue your celebration journey</p>

          {/* ── Google sign-in ──────────────────────────────── */}
          <div className="mb-5">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              fullWidth={true}
              label="Continue with Google"
            />
          </div>

          {/* ── OR divider ──────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email / password form ───────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                placeholder="priya@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-plum-400 text-gray-900 placeholder-gray-400"
                  placeholder="Your password"
                  autoComplete="current-password"
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

            {/* ── Error message ───────────────────────────── */}
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* ── Footer link ─────────────────────────────────── */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-plum-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
