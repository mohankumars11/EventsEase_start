import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingBag, X } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import CityButton from '../common/CityButton'
import ProfileDropdown from '../ui/ProfileDropdown'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { BRAND } from '../../config/sambramo'

/**
 * The home screen's app bar — the same bar signed in or signed out.
 *
 * What changes between the two is one line of text and one control: the
 * greeting becomes the customer's name, and the sign-in button becomes their
 * avatar. Everything else — the delivery city, the search field, the cart —
 * is identical, because it was always identical in substance and only ever
 * differed in styling across two separate screens.
 *
 * The rotating placeholder names things this app can actually do, drawn from
 * both halves of the business: a celebration to plan and a thing to buy. It
 * is the cheapest way to teach a first-time visitor what Sambramo is without
 * a paragraph of copy above the fold.
 */
/* Same mapping the navbar uses: the menu's "Dashboard" entry has to land on
   the console for whoever is signed in, and a vendor or admin who reaches home
   should not be sent to the customer one. */
function dashboardLinkFor(profile) {
  if (!profile) return '/dashboard'
  if (profile.role === 'vendor') return '/dashboard/vendor'
  if (profile.role === 'admin')  return '/dashboard/admin'
  return '/dashboard/customer'
}

const SEARCH_HINTS = [
  'birthday party',
  'chocolate cake',
  'housewarming pooja',
  'wedding decoration',
  'rose bouquet',
  'baby shower',
]

export default function HomeAppBar({ query = '', onQueryChange }) {
  const { user, profile, signOut } = useAuth()
  const { cartCount, cartPath } = useCart()
  const reduced = useReducedMotion()
  const [hint, setHint] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const barRef = useRef(null)

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.name?.split(' ')[0] ??
    null

  // Same measurement contract as ShopAppBar, so a sticky row underneath can
  // position against the bar's real height rather than a magic number.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty('--home-appbar-h', `${el.offsetHeight}px`)
    }
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => obs.disconnect()
  }, [firstName])

  useEffect(() => {
    if (reduced || focused || query) return
    const id = setInterval(() => setHint(h => (h + 1) % SEARCH_HINTS.length), 2600)
    return () => clearInterval(id)
  }, [reduced, focused, query])

  return (
    <header ref={barRef} className="home-appbar sticky top-0 z-40 pt-safe backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <SambramoMark size={30} className="shrink-0" />

          {/* The city, and now actually a control. This used to be a <p> with
              a ChevronDown drawn beside it — the icon promised a picker that
              did not exist, and the city itself was the hardcoded
              BRAND.primaryCity, so a Mysore customer was told "Bengaluru" on
              the app's front screen.

              The subtitle is still the greeting, which is this surface's line
              to give; CityButton overrides it only when the chosen city is
              one we cannot serve. */}
          <CityButton
            subtitle={
              firstName
                ? `Welcome back, ${firstName}`
                /* Short enough to survive a 360px screen. The long version
                   ("Arranging celebrations in Bengaluru & Mysore") truncated
                   mid-city, which turned a statement of coverage into a
                   statement of one city and an ellipsis. */
                : `Live in ${BRAND.pilotCities.join(' & ')}`
            }
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

          {user ? (
            /* ProfileDropdown takes all three of these — it calls `onSignOut`
               directly and reads `profile` for the initials and the role-based
               menu. Rendering it bare (as this did at first) hands a signed-in
               customer an avatar whose Sign out throws. */
            <ProfileDropdown
              profile={profile}
              onSignOut={signOut}
              dashboardLink={dashboardLinkFor(profile)}
            />
          ) : (
            <Link
              to="/login"
              className="shrink-0 rounded-full bg-surface-sunk/[0.07] px-3.5 py-2 text-xs font-bold text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
            >
              Sign in
            </Link>
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
              aria-label="Search celebrations and shop"
              placeholder={focused ? 'Search celebrations, cakes, decor…' : `Search "${SEARCH_HINTS[hint]}"`}
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
