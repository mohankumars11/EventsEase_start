import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import CityButton from '../common/CityButton'
import ProfileDropdown from '../ui/ProfileDropdown'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

/**
 * One app bar for every screen that did not already own one.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * Home, the storefront and the planner each grew their own sticky bar, and
 * each time a screen moved onto one it stopped stacking the marketing navbar,
 * the pilot-city banner and the "Back to Home" link on top of itself. Eight
 * screens never made that move — the occasions catalogue, the product page,
 * festival pages, the builder, and the four signed-in customer pages — so they
 * still opened with, in this order:
 *
 *   · the marketing navbar (logo, hamburger, a second cart button)
 *   · a "Pilot — Bengaluru — Somewhere else? [notify me]" bar, which asks a
 *     customer already inside a purchase to register interest in a city we do
 *     not serve
 *   · a "Back" link floating in its own padded row above the content
 *   · and on four of them, the page's *own* back button directly under it
 *
 * That is roughly 210px of furniture, two cart icons, two back controls and
 * two city statements before the first word of the page. It is also why the
 * app read as several different websites stitched together: half the screens
 * spoke Android app bar, half spoke marketing site header.
 *
 * Rather than build a fourth near-copy of the same bar, this is the one both
 * the new screens and (eventually) the old three can share. The geometry is
 * lifted verbatim from ShopAppBar so a screen switching between them cannot
 * shift by a pixel: 9×9 back control, 10×10 cart, `max-w-3xl px-4`, and the
 * same sticky/safe-area treatment.
 *
 * ── The two grounds ─────────────────────────────────────────────────────
 * `tone` is the app's existing rule, not a new one: plum is the concierge
 * half, forest green is the shop. A customer should know which half they are
 * in from the colour before they read a word, and the saffron accent is shared
 * so the two read as one brand rather than two apps.
 *
 * ── The middle slot holds exactly one thing ─────────────────────────────
 * A title *or* the city, never both and never neither. On a page about one
 * subject (a product, a festival, your orders) the subject is what the bar is
 * for; on a browsing surface the city is, because everything below it — price,
 * availability, whether we deliver at all — is conditional on it. Two of them
 * in one 360px row is what pushed the cart badge off the edge on a small phone.
 */
export default function AppBar({
  tone = 'plum',
  backTo,
  title,
  subtitle,
  citySubtitle,
  cart = true,
  children,
}) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { cartCount, cartPath } = useCart()
  // history.state.idx is React Router's own position counter; 0 means this
  // entry opened the session, so there is nothing behind it and `navigate(-1)`
  // would drop the visitor out of the app entirely. `backTo` is the honest
  // destination for that case — a shared link, a refresh, a push notification.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  const barClass = tone === 'forest' ? 'shop-appbar' : 'home-appbar'
  // The cart badge overlaps the bag icon, and the ring is what separates the
  // two — it has to be painted the BAR's colour so the badge reads as cut out
  // of it rather than as a coloured donut sitting on top.
  //
  // It used to name that colour twice, by hand, per tone (`ring-forest-800` /
  // `ring-plum-950`) — two more copies of a value the bar itself owns, which
  // is why both were wrong the moment the bars stopped being dark. Naming the
  // token means the ring cannot drift from the bar again, whatever either
  // becomes next. `ShopAppBar` has the identical line for the identical reason.
  const badgeRing = 'ring-[color:var(--bar)]'
  const badgeTone = tone === 'forest'
    ? 'bg-chilli-500 text-white'
    : 'bg-saffron-400 text-plum-950'

  const controlClass =
    '-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors active:bg-surface-sunk/[0.08]'

  function dashboardLinkFor(p) {
    if (!p) return '/dashboard'
    if (p.role === 'vendor') return '/dashboard/vendor'
    if (p.role === 'admin')  return '/dashboard/admin'
    return '/dashboard/customer'
  }

  return (
    <header className={`${barClass} sticky top-0 z-40 pt-safe backdrop-blur-md`}>
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
        <div className="flex items-center gap-3">

          {/* One back control, and it is real navigation. The old floating
              "Back to Home" always pointed at the role's home page, so Shop →
              Cakes → a product and back threw you out to the dashboard
              instead of returning to Cakes. */}
          {backTo ? (
            canGoBack ? (
              <button onClick={() => navigate(-1)} aria-label="Back" className={controlClass}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Link to={backTo} aria-label="Back" className={controlClass}>
                <ArrowLeft size={20} />
              </Link>
            )
          ) : (
            <SambramoMark size={30} className="shrink-0" />
          )}

          {title ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold leading-tight text-ink">{title}</p>
              {subtitle && <p className="truncate text-[11px] leading-tight text-ink-mute">{subtitle}</p>}
            </div>
          ) : (
            <CityButton subtitle={citySubtitle} />
          )}

          {cart && (
            <Link
              to={cartPath}
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className={`absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ring-2 ${badgeTone} ${badgeRing}`}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* The account menu is the only route to Orders, Requests and sign
              out once the marketing navbar is gone, so it cannot be optional
              on a signed-in screen. */}
          {user && (
            <ProfileDropdown
              profile={profile}
              onSignOut={signOut}
              dashboardLink={dashboardLinkFor(profile)}
            />
          )}
        </div>

        {/* A caller's second row — a search field, a filter strip. It lives
            inside the bar's padding so it scrolls and sticks with it rather
            than fighting it for the same 12px. */}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </header>
  )
}
