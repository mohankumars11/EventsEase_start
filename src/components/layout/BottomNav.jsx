import { Link, useLocation } from 'react-router-dom'
import { Home, Store, Sparkles, CalendarHeart, ShoppingBag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

/**
 * Phone-first primary navigation.
 *
 * Every destination that mattered used to live behind a hamburger — two
 * taps and a memory test before you could reach the Shop or your own
 * celebrations. On a phone (which is essentially all of this audience)
 * a persistent tab bar makes the app's five real jobs visible at all
 * times and reachable with a thumb.
 *
 * "Plan" sits in the raised centre slot because it is the one action the
 * whole business runs on, and the centre of the bar is the easiest point
 * on the screen to hit.
 *
 * Hidden ≥ md, where the header already has room for the same links, and
 * hidden entirely for vendor/admin, who work inside dedicated dashboards
 * rather than the customer surface.
 */
export default function BottomNav() {
  const { user, profile } = useAuth()
  const { cartCount, cartPath } = useCart()
  const { pathname } = useLocation()

  const role = profile?.role
  if (role === 'vendor' || role === 'admin') return null

  // Full-screen focused flows own the whole viewport — a tab bar under a
  // multi-step wizard or a checkout invites people to abandon halfway.
  //
  // /plan is deliberately not in this list any more. It used to be the wizard,
  // but it is now the hub — a browsing page a phone visitor arrives at from the
  // Plan tab itself, and hiding the bar there would strand them with no way to
  // reach Home, Shop or Cart. The prefix match means listing '/plan/custom'
  // covers the wizard without covering its parent.
  const HIDDEN_ON = ['/plan/custom', '/plan/confirmation', '/login', '/signup', '/auth/callback', '/onboarding']
  if (HIDDEN_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  const home = user ? '/dashboard/customer' : '/'
  const celebrations = user ? '/dashboard/customer/events' : '/login'

  const tabs = [
    { to: home,            icon: Home,          label: 'Home' },
    { to: '/shop',         icon: Store,         label: 'Shop' },
    { to: '/plan',         icon: Sparkles,      label: 'Plan', primary: true },
    { to: celebrations,    icon: CalendarHeart, label: user ? 'Events' : 'Sign in' },
    { to: cartPath,        icon: ShoppingBag,   label: 'Cart', badge: cartCount },
  ]

  function isActive(to) {
    if (to === '/' || to === '/dashboard/customer') return pathname === to
    return pathname === to || pathname.startsWith(to + '/')
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around px-1">
        {tabs.map(({ to, icon: Icon, label, primary, badge }) => {
          const active = isActive(to)

          if (primary) {
            return (
              <li key={label} className="flex-1 flex justify-center">
                <Link
                  to={to}
                  className="flex flex-col items-center -mt-5"
                  aria-label="Plan my celebration"
                >
                  <span className="w-14 h-14 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-500 text-plum-950 flex items-center justify-center shadow-lg shadow-saffron-500/30 ring-4 ring-white active:scale-95 transition-transform">
                    <Icon size={22} strokeWidth={2.4} />
                  </span>
                  <span className="text-[10px] font-bold text-plum-800 mt-0.5">{label}</span>
                </Link>
              </li>
            )
          }

          return (
            <li key={label} className="flex-1">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 rounded-xl transition-colors ${
                  active ? 'text-plum-700' : 'text-gray-400 active:text-plum-600'
                }`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-berry-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-saffron-400" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
