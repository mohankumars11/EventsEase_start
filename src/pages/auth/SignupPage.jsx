import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton'

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Nagpur',
  'Coimbatore', 'Kochi', 'Visakhapatnam', 'Indore', 'Bhopal', 'Patna',
  'Vadodara', 'Thiruvananthapuram',
]

export default function SignupPage() {
  const [searchParams]   = useSearchParams()
  const { signUp, signInWithGoogle, user, profile } = useAuth()
  const navigate         = useNavigate()

  const [form, setForm] = useState({
    fullName:  '',
    email:     '',
    phone:     '',
    password:  '',
    role:      searchParams.get('role') === 'vendor' ? 'vendor' : 'customer',
    city:      '',
  })
  const [showPassword, setShowPassword]     = useState(false)
  const [loading, setLoading]               = useState(false)
  const [googleLoading, setGoogleLoading]   = useState(false)
  const [error, setError]                   = useState(null)

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

    if (!form.fullName.trim())                      return setError('Please enter your full name.')
    if (!form.phone.match(/^[6-9]\d{9}$/))          return setError('Enter a valid 10-digit Indian mobile number.')
    if (form.password.length < 6)                   return setError('Password must be at least 6 characters.')
    if (!form.city)                                  return setError('Please select your city.')

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
    <div className="min-h-screen bg-gradient-to-br from-marigold-50 via-cream to-orange-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* ── Logo ─────────────────────────────────────── */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-gray-900">
            <span className="w-9 h-9 bg-marigold-500 rounded-xl flex items-center justify-center text-white shadow">
              <Sparkles size={18} />
            </span>
            Event<span className="text-marigold-600">Ease</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Create your account to get started</p>
        </div>

        <div className="card p-7 shadow-lg">

          {/* ── Role toggle ───────────────────────────────── */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, role: 'customer' }))}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                form.role === 'customer'
                  ? 'bg-white shadow text-marigold-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🛍️ I want to book services
            </button>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, role: 'vendor' }))}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                form.role === 'vendor'
                  ? 'bg-white shadow text-marigold-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏪 I'm a service provider
            </button>
          </div>

          {/* ── Google sign-in (quick option) ─────────────── */}
          <div className="mb-4">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              fullWidth={true}
              label={`Sign up with Google as ${form.role === 'vendor' ? 'Vendor' : 'Customer'}`}
            />
          </div>

          {/* ── Google note ───────────────────────────────── */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-5 text-xs text-blue-700">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              With Google sign-in we'll set up your profile after sign-in.
              You can choose your role and complete your details on the next step.
            </span>
          </div>

          {/* ── OR divider ───────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email form ───────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="input"
                placeholder="Priya Sharma"
                required
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="priya@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Mobile number</label>
              <div className="flex gap-2">
                <span className="input w-14 text-center text-gray-500 shrink-0">+91</span>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="9876543210"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">City</label>
              <select name="city" value={form.city} onChange={handleChange} className="input" required>
                <option value="">Select your city</option>
                {INDIAN_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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

            {/* ── Error ────────────────────────────────── */}
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
              {loading
                ? 'Creating account…'
                : `Create ${form.role === 'vendor' ? 'vendor' : 'customer'} account`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-marigold-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
