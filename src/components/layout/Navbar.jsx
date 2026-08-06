import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import ProfileDropdown from '../ui/ProfileDropdown'
import SambramoLogo from '../ui/SambramoLogo'
import { CTA } from '../../config/sambramo'

// "Services" used to scroll to a section of the landing page. Now that the
// catalog is a real public page, two things called Services in one header
// would be exactly the ambiguity this header is meant to remove — so the
// label owns the destination and the landing section keeps its anchor for
// anyone who scrolls to it.
const NAV_LINKS = [
  { label: 'Celebrations', hash: 'celebrations' },
  { label: 'How It Works',  hash: 'how-it-works'  },
  { label: 'Services',      to:   '/services'     },
  { label: 'Inspiration',   hash: 'festivals'      },
]

// A signed-in customer used to get six equal-weight links in the header
// (Shop, My Celebrations, Browse Services, My Orders, My Requests,
// Dashboard) plus a CTA plus an avatar — nine targets competing at once,
// which overflowed below ~1100px and gave no clue which one mattered.
//
// Only the two the customer uses repeatedly stay in the bar. The
// account-scoped history pages moved into the profile menu, where people
// already look for "my stuff", and Dashboard is the logo/home tap.
const CUSTOMER_LINKS = [
  { to: '/shop',                        label: 'Shop' },
  { to: '/dashboard/customer/events',   label: 'My Celebrations' },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { cartCount, cartPath } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate   = useNavigate()
  const location   = useLocation()

  function scrollToSection(hash) {
    setMenuOpen(false)
    if (location.pathname !== '/') {
      // Let ScrollRestoration handle the scroll once the landing page has
      // mounted — the old fixed 100ms setTimeout raced the render and
      // silently did nothing whenever the page was slower than that.
      navigate('/#' + hash)
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on navigation — otherwise it stayed open,
  // covering the page you'd just asked for.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  function dashboardLink() {
    if (!profile) return '/dashboard'
    if (profile.role === 'vendor') return '/dashboard/vendor'
    if (profile.role === 'admin')  return '/dashboard/admin'
    return '/dashboard/customer'
  }

  const isCustomer = profile?.role === 'customer'
  const showCart   = !profile || isCustomer

  const navClass = scrolled
    ? 'bg-plum-950/90 backdrop-blur-md shadow-lg border-transparent'
    : 'bg-plum-950 border-b border-plum-800'

  const linkClass = 'text-plum-300 hover:text-white hover:bg-plum-800'

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${navClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* Logo */}
          <Link to={user ? dashboardLink() : '/'} className="shrink-0">
            {/* The emotional line, not the descriptor. This bar is on every
                screen of the product, and by the second visit the "what is
                this?" line is 45 characters you read past — the footer and the
                auth panels still carry it for the people who need it.
                Being a fifth as long, it also stops being the thing that
                overflowed: it was hidden below 640px, and now only the very
                narrowest phones, where the bar also holds the cart and the
                menu button, have to drop it. */}
            <SambramoLogo
              size={32}
              ground="onDark"
              caption="emotion"
              captionClassName="hidden min-[360px]:flex"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {!user && NAV_LINKS.map(({ label, hash, to }) => (
              to ? (
                <Link key={label} to={to} className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}>
                  {label}
                </Link>
              ) : (
                <button
                  key={label}
                  onClick={() => scrollToSection(hash)}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}
                >
                  {label}
                </button>
              )
            ))}
            {!user && (
              <Link to="/shop" className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}>
                Shop
              </Link>
            )}
            {isCustomer && CUSTOMER_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${linkClass}`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {showCart && <CartButton to={cartPath} count={cartCount} />}
            {user ? (
              <>
                <Link to="/plan" className="btn-cta text-sm px-5 py-2.5">
                  {CTA.planNav}
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
                <Link to="/plan" className="btn-cta text-sm px-5 py-2.5">
                  {CTA.planNav}
                </Link>
              </>
            )}
          </div>

          {/* Mobile right — cart stays in the bar, everything else is
              either a bottom tab or lives in this menu. */}
          <div className="flex md:hidden items-center gap-1">
            {showCart && <CartButton to={cartPath} count={cartCount} />}
            <button
              className="p-2.5 rounded-lg text-plum-300 hover:text-white hover:bg-plum-800 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${
        menuOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="border-t border-plum-800 bg-plum-900 px-4 py-4 flex flex-col gap-1">
          {!user && NAV_LINKS.map(({ label, hash, to }) => (
            to ? (
              <MobileLink key={label} to={to}>{label}</MobileLink>
            ) : (
              <button
                key={label}
                onClick={() => scrollToSection(hash)}
                className="text-sm font-medium text-plum-200 py-3 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors w-full text-left"
              >
                {label}
              </button>
            )
          ))}

          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-saffron-400 flex items-center justify-center text-plum-950 text-sm font-bold font-display">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{profile?.full_name ?? 'My Account'}</p>
                  <p className="text-xs text-plum-400 truncate">{profile?.email ?? profile?.phone ?? ''}</p>
                </div>
              </div>

              <div className="border-t border-plum-800 my-1" />

              {isCustomer && (
                <>
                  <MobileLink to="/services">Services &amp; packages</MobileLink>
                  <MobileLink to="/dashboard/customer/orders">My Orders</MobileLink>
                  <MobileLink to="/dashboard/customer/requests">My Requests</MobileLink>
                </>
              )}
              <MobileLink to={dashboardLink()}>Dashboard</MobileLink>

              <button
                onClick={() => { signOut(); navigate('/') }}
                className="w-full text-left text-sm font-medium text-rose-400 py-3 px-3 rounded-lg hover:bg-plum-800 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <MobileLink to="/shop">Shop</MobileLink>
              <div className="border-t border-plum-800 my-2" />
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="flex-1 text-sm font-medium text-center text-plum-200 border border-plum-700 py-3 px-3 rounded-xl hover:bg-plum-800 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 text-sm font-semibold text-center text-plum-950 bg-saffron-400 hover:bg-saffron-500 py-3 px-3 rounded-xl transition-colors"
                >
                  Sign Up
                </Link>
              </div>
              <Link to="/plan" className="btn-cta text-sm w-full mt-1">
                Plan My Celebration
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function MobileLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-sm font-medium text-plum-200 py-3 px-3 rounded-lg hover:bg-plum-800 hover:text-white transition-colors"
    >
      {children}
    </Link>
  )
}

function CartButton({ to, count }) {
  return (
    <Link
      to={to}
      className="relative p-2.5 rounded-lg text-plum-200 hover:text-white hover:bg-plum-800 transition-colors"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
    >
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-berry-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-plum-950">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
