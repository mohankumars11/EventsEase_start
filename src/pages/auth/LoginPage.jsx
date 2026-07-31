import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'

export default function LoginPage() {
  const { signIn, signInWithGoogle, user, profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]                 = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]               = useState(null)

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
    <div className="min-h-screen bg-gradient-to-br from-marigold-50 via-cream to-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* ── Logo ─────────────────────────────────────── */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-gray-900">
            <span className="w-9 h-9 bg-marigold-500 rounded-xl flex items-center justify-center text-white shadow">
              <Sparkles size={18} />
            </span>
            Event<span className="text-marigold-600">Ease</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Welcome back — log in to your account</p>
        </div>

        <div className="card p-7 shadow-lg">

          {/* ── Google sign-in (primary CTA) ─────────────── */}
          <div className="mb-5">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              fullWidth={true}
              label="Continue with Google"
            />
          </div>

          {/* ── OR divider ───────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email / password form ─────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="priya@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-10"
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

            {/* ── Error message ─────────────────────────── */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? 'Logging in…' : 'Log in with email'}
            </button>
          </form>

          {/* ── Footer links ──────────────────────────────── */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-marigold-600 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
