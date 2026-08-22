import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ShoppingBag } from 'lucide-react'
import SambramoWordmark from '../ui/SambramoWordmark'
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
  'wedding decoration',
  'housewarming pooja',
  'naming ceremony',
  'catering for 200',
  'mehendi artist',
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
    <header ref={barRef} className="home-appbar a-appbar sticky top-0 z-40 pt-safe backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
        {/* ── The lockup, top left ─────────────────────────────────────
            The brand goes where a brand goes. It used to be a 30px kolam
            glyph sharing a row with the city, the cart and the account menu
            — four controls of equal weight, none of which was the name of
            the app.

            Now the identity owns the first line on its own, and the
            wayfinding sits under it. That ordering is what every consumer
            app converges on for the same reason: the first thing a person
            who arrived from a link needs is to know whose app this is. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SambramoWordmark size={30} layout="inline" />

            {/* ── The caption, revealed left to right ──────────────────
                It said "Every emotion, valued", which is a feeling and not
                an answer. Nobody has heard of Sambramo yet, so the one line
                under the name has to say what the app IS before it says how
                it feels — the feeling is already carried by the photography
                on every card below.

                "India's event booking app" and not "India's FIRST event
                booking app": the superlative is the kind of claim a
                competitor screenshots, and it is not needed. Naming the
                category is the whole job.

                The gold rule travels with it, so the reveal reads as one
                gesture rather than two things arriving at once. */}
            <div className="mt-1.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="brand-rule block h-px w-5 shrink-0 rounded-full bg-gradient-to-r from-gold-400 to-gold-200"
              />
              <p className="brand-wipe truncate text-[10px] font-extrabold uppercase tracking-[0.16em] text-royal-800/75">
                {BRAND.categoryLine}
              </p>
            </div>
          </div>

          {/* ── The basket ───────────────────────────────────────────
              This was folded into the Plan tab when the shop left, on the
              argument that a bag icon is a promise of a till and what is left
              is an enquiry. That was half right and the wrong half won:
              services ARE bought one at a time here — somebody short only a
              photographer adds one thing and checks out — and hiding the
              basket behind a tab labelled "Plan" hides it from exactly that
              person.

              So it comes back, in the app bar rather than as a fifth tab.
              A tab bar holds places; a basket is a state, and every catalogue
              app in the country puts it top right. It renders only when there
              is something in it: a permanently visible empty bag teaches the
              eye to skip the spot, so it is not there on the day it finally
              has a number in it. */}
          {cartCount > 0 && (
            <Link
              to={cartPath}
              aria-label={`Your basket, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
              className="relative tap-48 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink outline outline-1 -outline-offset-1 outline-ink/12 transition-transform active:scale-95"
            >
              <ShoppingBag size={18} />
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-royal-800 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            </Link>
          )}

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
              className="tap-tall shrink-0 rounded-full bg-royal-800 px-4 py-2 text-xs font-extrabold text-white shadow-[0_6px_16px_-8px_rgba(16,42,143,0.9)] transition-transform active:scale-95"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* ── The city, on its own line under the brand ─────────────────
            It was competing with the wordmark for the same row and losing —
            truncated to an ellipsis on a 360px screen the moment a name was
            long. Given the full width it is a real control again.

            The cart that used to sit beside it is gone with the shop. What
            is left is one basket of services reached from Plan, and a bag
            icon in the app bar for it would be the e-commerce metaphor
            surviving the commerce. */}
        <div className="mt-2.5">
          <CityButton
            subtitle={
              firstName
                ? `Welcome back, ${firstName}`
                : `Live in ${BRAND.pilotCities.join(' & ')}`
            }
          />
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
              aria-label="Search celebrations and services"
              placeholder={focused ? 'Search celebrations, services, festivals…' : `Search "${SEARCH_HINTS[hint]}"`}
              className="a-field h-12 pl-11 pr-11 font-medium"
            />
            {query && (
              <button
                onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink/[0.08] text-ink-mute"
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
