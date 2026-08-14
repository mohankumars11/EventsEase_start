import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, X, ArrowLeft } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import CityButton from '../common/CityButton'
import ProfileDropdown from '../ui/ProfileDropdown'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The planner's app bar — the third and last of them, and deliberately the
 * same object as the other two.
 *
 * Home, the storefront and now the planner each own a sticky bar carrying the
 * same three things in the same order: where you are, what you're looking for,
 * what's in your bag. Only the ground colour changes, and it changes on a rule
 * the app already follows — plum for the concierge half, forest green for the
 * shop — so you can tell which half you are in from the colour alone without
 * the furniture moving.
 *
 * /plan previously had no bar at all. It rendered under the marketing navbar
 * with a pilot-city banner and a scrolling festival ticker above it, which
 * meant tapping "Plan a celebration" on a phone swapped the entire design
 * language mid-journey and asked for the city a second time.
 *
 * The back arrow is real navigation, not the old floating "Back to Home"
 * button: /plan is a destination people reach from a card on the home screen,
 * and a bar with no way back on a page with no footer is a trap.
 */
const SEARCH_HINTS = [
  'birthday party',
  'wedding decoration',
  'a cook for 40 people',
  'photographer',
  'housewarming pooja',
  'catering',
]

export default function PlanAppBar({ query = '', onQueryChange }) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { cartCount, cartPath } = useCart()
  const reduced = useReducedMotion()
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (reduced || focused || query) return
    const id = setInterval(() => setHint(h => (h + 1) % SEARCH_HINTS.length), 2600)
    return () => clearInterval(id)
  }, [reduced, focused, query])

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.name?.split(' ')[0] ??
    null

  function dashboardLinkFor(p) {
    if (!p) return '/dashboard'
    if (p.role === 'vendor') return '/dashboard/vendor'
    if (p.role === 'admin')  return '/dashboard/admin'
    return '/dashboard/customer'
  }

  return (
    <header className="home-appbar sticky top-0 z-40 pt-safe backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
        <div className="flex items-center gap-3">
          {/* Real back, with the cold-open guard the other bars already
              use: history.state.idx is React Router's position counter, and
              0 means this entry opened the session — a shared link, a
              refresh, a notification — so `navigate(-1)` would drop the
              visitor out of the app. Home is the honest fallback for that
              case only, not for every case. */}
          <button
            type="button"
            onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'))}
            aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors active:bg-surface-sunk/[0.07]"
          >
            <ArrowLeft size={20} />
          </button>

          <SambramoMark size={26} className="hidden shrink-0 sm:block" />

          {/* The city, from the same control the other two bars use — so it is
              stated once here rather than asked again by a banner. */}
          <CityButton
            subtitle={firstName ? `Let's plan something, ${firstName}` : 'Tell us what we’re celebrating'}
          />

          <Link
            to={cartPath}
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffron-400 px-1 text-[10px] font-extrabold text-plum-950 ring-2 ring-plum-950">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {user && (
            <ProfileDropdown
              profile={profile}
              onSignOut={signOut}
              dashboardLink={dashboardLinkFor(profile)}
            />
          )}
        </div>

        {onQueryChange && (
          <div className="relative mt-3">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-plum-600" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              type="search"
              enterKeyHint="search"
              aria-label="Search occasions and services"
              placeholder={focused ? 'Search occasions, services…' : `Search "${SEARCH_HINTS[hint]}"`}
              className="h-12 w-full rounded-2xl bg-white pl-11 pr-11 text-sm font-medium text-gray-900 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)] outline-none ring-2 ring-transparent placeholder:text-gray-400 focus:ring-saffron-400"
            />
            {query && (
              <button
                onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
