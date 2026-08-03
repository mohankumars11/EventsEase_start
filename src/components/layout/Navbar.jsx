import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ProfileDropdown from '../ui/ProfileDropdown'

const NAV_LINKS = [
  { label: 'Celebrations', hash: 'celebrations' },
  { label: 'How It Works',  hash: 'how-it-works'  },
  { label: 'Services',      hash: 'services'       },
  { label: 'Inspiration',   hash: 'festivals'      },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate   = useNavigate()
  const location   = useLocation()

  function scrollToSection(hash) {
    setMenuOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      // after navigation, wait for render then scroll
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function dashboardLink() {
    if (!profile) return '/dashboard'
    if (profile.role === 'vendor') return '/dashboard/vendor'
    if (profile.role === 'admin')  return '/dashboard/admin'
    return '/dashboard/customer'
  }

  const isCustomer = profile?.role === 'customer'

  const navClass = scrolled
    ? 'bg-plum-950/90 backdrop-blur-md shadow-lg border-transparent'
    : 'bg-plum-950 border-b border-plum-800'

  const linkClass = 'text-plum-300 hover:text-white hover:bg-plum-800'

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${navClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-saffron-400 rounded-lg flex items-center justify-center">
              <span className="text-plum-950 font-display font-black text-sm leading-none">S</span>
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Sambr<span className="text-saffron-400">amo</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, hash }) => (
              <button
                key={label}
                onClick={() => scrollToSection(hash)}
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}
              >
                {label}
              </button>
            ))}
            <Link to="/shop" className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}>
              Shop
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isCustomer && (
                  <>
                    <Link
                      to="/dashboard/customer/events"
                      className="text-sm font-medium text-plum-300 hover:text-white px-3 py-2 rounded-lg hover:bg-plum-800 transition-colors"
                    >
                      My Celebrations
                    </Link>
                    <Link
                      to="/dashboard/customer/services"
                      className="text-sm font-medium text-plum-300 hover:text-white px-3 py-2 rounded-lg hover:bg-plum-800 transition-colors"
                    >
                      Browse Services
                    </Link>
                    <Link
                      to="/dashboard/customer/pooja-items"
                      className="text-sm font-medium text-plum-300 hover:text-white px-3 py-2 rounded-lg hover:bg-plum-800 transition-colors"
                    >
                      Pooja Items
                    </Link>
                  </>
                )}
                <Link to="/plan" className="btn-cta text-sm">
                  Plan a Celebration
                </Link>
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
                  className="text-sm font-medium text-plum-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-semibold text-plum-950 bg-saffron-400 hover:bg-saffron-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
                <Link to="/plan" className="btn-cta text-sm">
                  Plan a Celebration
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-plum-300 hover:text-white hover:bg-plum-800 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${
        menuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="border-t border-plum-800 bg-plum-900 px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, hash }) => (
            <button
              key={label}
              onClick={() => scrollToSection(hash)}
              className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors w-full text-left"
            >
              {label}
            </button>
          ))}
          <Link
            to="/shop"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors w-full text-left"
          >
            Shop
          </Link>

          <div className="border-t border-plum-800 my-2" />

          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-saffron-400 flex items-center justify-center text-plum-950 text-sm font-bold font-display">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{profile?.full_name ?? 'My Account'}</p>
                  <p className="text-xs text-plum-400">{profile?.email ?? profile?.phone ?? ''}</p>
                </div>
              </div>
              {isCustomer && (
                <>
                  <Link
                    to="/dashboard/customer/events"
                    className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Celebrations
                  </Link>
                  <Link
                    to="/dashboard/customer/services"
                    className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Browse Services
                  </Link>
                  <Link
                    to="/dashboard/customer/pooja-items"
                    className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Pooja Items
                  </Link>
                </>
              )}
              <Link
                to={dashboardLink()}
                className="text-sm font-medium text-plum-200 py-2.5 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/plan"
                className="btn-cta text-sm w-full text-center mt-1"
                onClick={() => setMenuOpen(false)}
              >
                Plan a Celebration
              </Link>
              <button
                onClick={() => { signOut(); navigate('/'); setMenuOpen(false) }}
                className="w-full text-left text-sm font-medium text-rose-400 py-2.5 px-3 rounded-lg hover:bg-plum-800 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="flex-1 text-sm font-medium text-center text-plum-200 border border-plum-700 py-2.5 px-3 rounded-xl hover:bg-plum-800 hover:text-white transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 text-sm font-semibold text-center text-plum-950 bg-saffron-400 hover:bg-saffron-500 py-2.5 px-3 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
              <Link
                to="/plan"
                className="btn-cta text-sm w-full text-center mt-1"
                onClick={() => setMenuOpen(false)}
              >
                Plan a Celebration
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
