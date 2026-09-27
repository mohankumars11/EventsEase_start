import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { isPartnerSurface } from '../../config/surface'
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
  { to: '/dashboard/customer/events',   label: 'My Celebrations' },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { cartCount, cartPath } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
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

  /* The SURFACE, not the role. A customer signing into the partner
     app should still see the partner header — it is which app was
     installed, not who is holding it. */
  const isPartnerApp = isPartnerSurface()

  const isCustomer = profile?.role === 'customer'

  /* No shopping cart in the partner app.
   *
   * `!profile` was the hole: a signed-out visitor is treated as a
   * customer-in-waiting, which is right on the customer app and wrong on
   * the partner one. A decorator opening the partner link was shown a
   * shopping bag in the bar above a page asking them to sell — the first
   * icon on the screen belonged to the other product.
   *
   * Keyed on the surface, not the role, because the person this affects
   * most has no role yet. */
  const showCart   = !isPartnerSurface() && (!profile || isCustomer)

  /* ══════════════════════════════════════════════════════════════════
     THE PARTNER APP WEARS A DARK BAR
     ══════════════════════════════════════════════════════════════════

     The customer app is white and airy, which suits somebody browsing
     for a birthday. The partner app is a work tool, opened in a hurry
     and often outdoors, and a solid dark bar does two things a white one
     cannot: it is legible in sunlight, and it tells somebody which of
     the two Sambramos they have opened before they read a word.

     plum-950 rather than a new navy. It is the darkest colour the brand
     already has, it is what the saffron CTA sits on everywhere else, and
     inventing a second dark for one bar is how a palette stops being
     one. */
  const navClass = isPartnerApp
    ? 'bg-plum-950 border-b border-white/10'
    : scrolled
      ? 'bg-surface/90 backdrop-blur-md shadow-lg border-transparent'
      : 'bg-surface border-b border-hairline/10'

  const linkClass = 'text-ink-mute hover:text-ink hover:bg-surface-sunk/[0.07]'

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
            {/* ══════════════════════════════════════════════════════
                THE PARTNER APP SAYS WHAT IT IS
                ══════════════════════════════════════════════════════

                "Every emotion, valued" is the customer promise, and it is
                a good one. On the partner app it is the wrong sentence
                entirely: a decorator opening this at 7am to see whether
                there is work has no use for how the customer feels, and
                the two apps then wear the same header on the same phone.

                So the earning app is named as the earning app —
                "PARTNERS", in the saffron that is now its icon and its
                buttons. It also removes the one line that made a partner
                glancing at their home screen unsure which of the two
                Sambramos they had opened. */}
            {isPartnerApp ? (
              /* White on navy. The wordmark's own teal disappears against
                 plum-950, so the partner lockup is set as type — which is
                 also why PARTNERS can be the loud half here and the muted
                 half on white. */
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-[21px] font-extrabold leading-none tracking-tight text-white">
                  Sambramo
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/85">
                  Partners
                </span>
              </span>
            ) : (
              <SambramoLogo
                size={32}
                ground="onLight"
                caption="emotion"
                captionClassName="hidden min-[360px]:flex"
              />
            )}
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
                  className="text-sm font-medium text-ink-mute hover:text-ink px-3 py-2 rounded-lg transition-colors"
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
              className="p-2.5 rounded-lg text-ink-mute hover:text-ink hover:bg-surface-sunk/[0.07] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              /* Inherits ink on the customer's white bar; needs white on
                 the partner's navy one, or it is a dark icon on a dark
                 ground. */
              style={isPartnerApp ? { color: '#fff' } : undefined}
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
        <div className="border-t border-hairline/10 bg-surface px-4 py-4 flex flex-col gap-1">
          {!user && NAV_LINKS.map(({ label, hash, to }) => (
            to ? (
              <MobileLink key={label} to={to} onNavigate={closeMenu}>{label}</MobileLink>
            ) : (
              <button
                key={label}
                onClick={() => scrollToSection(hash)}
                className="text-sm font-medium text-ink-soft py-3 px-3 rounded-lg hover:bg-surface-sunk/[0.07] hover:text-ink transition-colors w-full text-left"
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
                  <p className="text-sm font-semibold text-ink truncate">{profile?.full_name ?? 'My Account'}</p>
                  <p className="text-xs text-ink-mute truncate">{profile?.email ?? profile?.phone ?? ''}</p>
                </div>
              </div>

              <div className="border-t border-hairline/10 my-1" />

              {isCustomer && (
                <>
                  <MobileLink to="/services" onNavigate={closeMenu}>Services &amp; packages</MobileLink>
                  <MobileLink to="/dashboard/customer/orders" onNavigate={closeMenu}>My Orders</MobileLink>
                  <MobileLink to="/dashboard/customer/requests" onNavigate={closeMenu}>My Requests</MobileLink>
                </>
              )}
              <MobileLink to={dashboardLink()} onNavigate={closeMenu}>Dashboard</MobileLink>

              <button
                onClick={() => { signOut(); navigate('/') }}
                className="w-full text-left text-sm font-medium text-rose-400 py-3 px-3 rounded-lg hover:bg-surface-sunk/[0.07] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="flex-1 text-sm font-medium text-center text-ink-soft border border-hairline/10 py-3 px-3 rounded-xl hover:bg-surface-sunk/[0.07] hover:text-ink transition-colors"
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

/* Closes the menu on tap, not on the route changing.
 *
 * The menu was dismissed by an effect watching location.pathname, which
 * works for every link EXCEPT the one pointing at the page you are
 * already on. Tapping "Dashboard" from /dashboard/vendor changed no
 * pathname, fired no effect, and left the panel sitting open over the
 * screen -- reported, accurately, as "the dashboard button does not
 * work". It navigated perfectly; it just never got out of the way. */
function MobileLink({ to, children, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="text-sm font-medium text-ink-soft py-3 px-3 rounded-lg hover:bg-surface-sunk/[0.07] hover:text-ink transition-colors"
    >
      {children}
    </Link>
  )
}

function CartButton({ to, count }) {
  return (
    <Link
      to={to}
      className="relative p-2.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-sunk/[0.07] transition-colors"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
    >
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-berry-500 text-ink text-[10px] font-bold flex items-center justify-center ring-2 ring-[color:var(--bar)]">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
