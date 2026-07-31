import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Sparkles, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import GoogleSignInButton from '../ui/GoogleSignInButton'
import ProfileDropdown from '../ui/ProfileDropdown'

const NAV_LINKS = [
  { label: 'Browse',        to: '/signup' },
  { label: 'Categories',    to: '/signup' },
  { label: 'How It Works',  to: '/#how-it-works' },
  { label: 'For Providers', to: '/signup?role=vendor' },
]

export default function Navbar() {
  const { user, profile, signOut, signInWithGoogle } = useAuth()
  const { totalCount }  = useCart()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()

  /* ── Scroll listener for glassmorphism ────────────── */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Helpers ──────────────────────────────────────── */
  function dashboardLink() {
    if (!profile) return '/dashboard'
    if (profile.role === 'vendor') return '/dashboard/vendor'
    if (profile.role === 'admin')  return '/dashboard/admin'
    return '/dashboard/customer'
  }

  const isCustomer = profile?.role === 'customer'

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
    } finally {
      setGoogleLoading(false)
    }
  }

  /* ── Dynamic nav classes ──────────────────────────── */
  const navClass = scrolled
    ? 'bg-white/80 backdrop-blur-md shadow-md border-transparent'
    : 'bg-white border-b border-orange-100 shadow-sm'

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${navClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 shrink-0">
            <span className="w-8 h-8 bg-marigold-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Sparkles size={16} />
            </span>
            Event<span className="text-marigold-600">Ease</span>
          </Link>

          {/* ── Desktop nav links ──────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-sm font-medium text-gray-600 hover:text-marigold-600 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Desktop right section ─────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Cart — customers only */}
                {isCustomer && (
                  <Link
                    to="/dashboard/customer/cart"
                    className="relative p-2 text-gray-500 hover:text-marigold-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Cart"
                  >
                    <ShoppingCart size={20} />
                    {totalCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crimson-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalCount > 9 ? '9+' : totalCount}
                      </span>
                    )}
                  </Link>
                )}

                <ProfileDropdown
                  profile={profile}
                  onSignOut={signOut}
                  dashboardLink={dashboardLink()}
                />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-marigold-600 px-3 py-2 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  loading={googleLoading}
                  fullWidth={false}
                  label="Sign in with Google"
                />
                <Link to="/signup" className="btn-primary text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile: cart + hamburger ───────────────── */}
          <div className="flex items-center gap-2 md:hidden">
            {isCustomer && (
              <Link
                to="/dashboard/customer/cart"
                className="relative p-2 text-gray-500 hover:text-marigold-600"
              >
                <ShoppingCart size={20} />
                {totalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crimson-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalCount > 9 ? '9+' : totalCount}
                  </span>
                )}
              </Link>
            )}
            <button
              className="p-2 rounded-lg text-gray-500 hover:bg-orange-50 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ───────────────────────────────── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-orange-100 bg-white/95 backdrop-blur-sm px-4 py-4 flex flex-col gap-2">
          {/* Nav links */}
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-orange-50 hover:text-marigold-700 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}

          <div className="border-t border-gray-100 my-1" />

          {user ? (
            <>
              {/* User info strip */}
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="w-9 h-9 rounded-full bg-marigold-500 flex items-center justify-center text-white text-sm font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name ?? 'My Account'}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>
              </div>

              <Link
                to={dashboardLink()}
                className="btn-secondary w-full justify-start"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>

              {isCustomer && (
                <Link
                  to="/dashboard/customer/bookings"
                  className="text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-orange-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  My Bookings
                </Link>
              )}

              <button
                onClick={() => { signOut(); navigate('/'); setMenuOpen(false) }}
                className="w-full text-left text-sm font-medium text-crimson-600 py-2.5 px-3 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <GoogleSignInButton
                onClick={() => { handleGoogleSignIn(); setMenuOpen(false) }}
                loading={googleLoading}
                fullWidth={true}
              />
              <div className="flex gap-2 mt-1">
                <Link
                  to="/login"
                  className="btn-secondary flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
