import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Store, Sparkles, CalendarHeart, Route, ShoppingBag, MessageCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useChat } from '../../context/ChatContext'
import { useCustomerActivity } from '../../hooks/useCustomerActivity'
import { isFocusedRoute } from '../../config/chrome'
import SambramoMark from '../ui/SambramoMark'

/**
 * Phone-first primary navigation.
 *
 * Every destination that mattered used to live behind a hamburger — two
 * taps and a memory test before you could reach the Shop or your own
 * celebrations. On a phone (which is essentially all of this audience)
 * a persistent tab bar makes the app's five real jobs visible at all
 * times and reachable with a thumb.
 *
 * ── Why "Plan" is no longer a raised FAB ────────────────────────────
 * It used to be a 56px saffron circle pulled up out of the bar with
 * `-mt-5`, and that cost more than it bought:
 *
 *   It hung over the page. The circle plus its 4px white ring sat about
 *   24px above the bar's own top edge, in a strip nothing reserves
 *   padding for — `pb-bottom-nav` clears the BAR, not something floating
 *   over it. So on every screen it covered a slice of whatever was
 *   underneath: the last row of a product grid, the bottom of a sticky
 *   quote panel, the corner of a card. That is the same fault the
 *   floating help bubble was removed for, still in the bar that
 *   replaced it.
 *
 *   It never actually sat in the middle. It is the third of six tabs, so
 *   its slot spans 33–50% of the width and it centres near 42% — visibly
 *   left of the bar's midpoint. Raising it drew the eye straight to that
 *   asymmetry, so the one element treated as the centrepiece was the one
 *   thing obviously off-centre.
 *
 * So all six tabs now sit on one baseline in six equal columns, and
 * nothing leaves the bar's own box. Plan keeps its prominence the way a
 * tab bar is supposed to give it — a filled chip behind the mark, a bolder
 * label, a wider tap target — rather than by climbing out of the bar and
 * standing on the content.
 *
 * That chip carries the kolam rather than a generic sparkle, on plum: it is
 * the only branded object in the navigation and the only dark one on a light
 * bar, which is the weight the primary action wants. See the render below.
 *
 * Hidden ≥ md, where the header already has room for the same links, and
 * hidden entirely for vendor/admin, who work inside dedicated dashboards
 * rather than the customer surface.
 */
/**
 * Publish the bar's real height as `--bottom-nav-h`.
 *
 * Everything that floats above this bar needs to know how tall it is, and
 * until now every one of them guessed. The literal `4.25rem` was written into
 * `.pb-bottom-nav`, `.above-bottom-nav`, both ChatWidget offsets, and then
 * re-derived by eye as `bottom-16` in BookBar, `bottom-20` in ServiceShelf and
 * `pb-36` in CelebrationBuilder. The bar actually measures ~63px — 32px icon
 * row + 4px gap + 10px label + 16px padding + 1px border — so every one of
 * those numbers was wrong, and the 5px difference showed as a live, tappable
 * strip of page content between each floating bar and the tab bar.
 *
 * The bar already carries `pb-safe`, so `offsetHeight` INCLUDES the notch
 * inset. Consumers therefore use the variable directly and must not add
 * `env(safe-area-inset-bottom)` on top of it — doing so is what made
 * BuilderActionBar render ~34px too tall on iOS.
 *
 * Same pattern, and the same reasoning, as `--shop-appbar-h` in ShopAppBar.
 */
function usePublishedHeight(ref, enabled) {
  useLayoutEffect(() => {
    const root = document.documentElement
    // The component returns null on focused routes and for vendor/admin, so
    // the element simply is not there. Without this the variable would keep
    // whatever the last mounted bar measured, and a checkout would reserve
    // 63px of padding for a bar that is not on screen.
    if (!enabled || !ref.current) {
      root.style.setProperty('--bottom-nav-h', '0px')
      return
    }
    const el = ref.current
    const publish = () => {
      // At `md` and up the bar is `display:none`, so this is 0 — which is
      // exactly right, and is why the utilities no longer need an @screen md
      // override to zero themselves.
      root.style.setProperty('--bottom-nav-h', `${el.offsetHeight}px`)
    }
    publish()
    if (typeof ResizeObserver === 'undefined') return () => root.style.setProperty('--bottom-nav-h', '0px')
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => { obs.disconnect(); root.style.setProperty('--bottom-nav-h', '0px') }
  }, [ref, enabled])
}

export default function BottomNav() {
  const { user, profile } = useAuth()
  const { cartCount, cartPath } = useCart()
  const { open: chatOpen, toggleChat } = useChat()
  const { pathname } = useLocation()
  const barRef = useRef(null)
  // Three counts, no row payload — see the hook. It self-gates on role, so
  // this costs a vendor or an admin nothing.
  const activity = useCustomerActivity()

  const role = profile?.role
  const hidden = role === 'vendor' || role === 'admin' || isFocusedRoute(pathname)
  // Hooks cannot sit behind the early returns below, so the visibility test is
  // computed first and passed in.
  usePublishedHeight(barRef, !hidden)

  if (role === 'vendor' || role === 'admin') return null

  // Full-screen focused flows own the whole viewport — a tab bar under a
  // multi-step wizard or a checkout invites people to abandon halfway.
  //
  // /plan is deliberately not in this list any more. It used to be the wizard,
  // but it is now the hub — a browsing page a phone visitor arrives at from the
  // Plan tab itself, and hiding the bar there would strand them with no way to
  // reach Home, Shop or Cart. The prefix match means listing '/plan/custom'
  // covers the wizard without covering its parent.
  // The list is shared with the chat panel now — see config/chrome.js.
  if (isFocusedRoute(pathname)) return null

  const home = user ? '/dashboard/customer' : '/'

  /**
   * The fourth tab is a destination, never a login.
   *
   * It used to read "Sign in" for signed-out visitors and route to /login —
   * a permanent tab, in the primary navigation, on every screen, whose only
   * function was to interrupt. It also contradicted the rest of the app: the
   * shop, the planner and the catalogue are all deliberately open to guests,
   * and login is asked at the one moment there is something to save. A tab
   * bar advertising the door is the opposite of that decision.
   *
   * ── It now changes identity once there is something to track ───────────
   * Before an order exists it is `Occasions`, pointing at the catalogue — a
   * real place, and the thing a calendar icon suggests.
   *
   * The moment a customer has ANY order, event or enquiry it becomes `Track`:
   * one screen carrying every celebration and every order, with the steps and
   * the payments. That is the thing somebody actually returns to the app for,
   * and it was previously reachable only from a card on Home.
   *
   * "Track" over the alternatives: "Orders" excludes celebrations, "Events"
   * excludes the shop, and "Bookings" is the pre-pivot marketplace word this
   * codebase deliberately retired. It is also the verb this market already
   * uses, and it fits the 10px label.
   */
  const tracking = activity.total > 0
  const celebrations = user
    ? (tracking ? '/track' : '/services')
    : '/services'

  /**
   * Help is a tab, not a floating bubble.
   *
   * It used to be a 56px circle pinned over the bottom-right of every screen,
   * which meant it covered the cart bar's "View cart", the builder's submit
   * row and the corner of every modal — the exact buttons a thumb reaches for
   * in the corner it rests in. In the bar it is in a strip the app already
   * reserves, so it can never sit on top of anything, and it is still one tap
   * from wherever you are.
   */
  const tabs = [
    { to: home,            icon: Home,          label: 'Home' },
    { to: '/shop',         icon: Store,         label: 'Shop' },
    // `icon` is the fallback for this row; a primary tab renders the
    // kolam instead and never reaches it.
    { to: '/plan',         icon: Sparkles,      label: 'Plan', primary: true },
    // The badge counts only what is WAITING ON THE CUSTOMER — a plan to
    // approve, an answered enquiry. An order awaiting payment confirmation is
    // our reconciliation backlog, not their task, and a badge that counts
    // everything is a badge people learn to ignore. The pulse covers the
    // other case: something is live, but nothing needs you.
    {
      to: celebrations,
      icon: tracking ? Route : CalendarHeart,
      label: tracking ? 'Track' : 'Occasions',
      badge: activity.needsYou,
      pulse: tracking && activity.needsYou === 0 && activity.live > 0,
    },
    { to: cartPath,        icon: ShoppingBag,   label: 'Cart', badge: cartCount },
    { action: toggleChat,  icon: MessageCircle, label: 'Help', active: chatOpen },
  ]

  /**
   * Exactly one tab is lit, on every route.
   *
   * The plain prefix match this used to be got three cases wrong, and each of
   * them is the kind of thing that quietly tells somebody the app is broken:
   *
   *   /shop/cart      lit TWO tabs. Shop matched by prefix and Cart matched
   *                   exactly, so there were two saffron underlines and two
   *                   elements claiming aria-current="page".
   *   /               lit NOTHING for a signed-in customer, because their Home
   *                   tab points at /dashboard/customer while `/` still renders
   *                   HomeScreen for everyone. A whole grey bar, nothing selected.
   *   /service/:id    lit nothing, and neither did /festivals/:id — they are
   *   /festivals/:id  reachable from the rails on Home but belong to no tab.
   *
   * So: the cart owns its own path outright, home means either address, and
   * the strays are mapped to the tab they were reached from.
   */
  const HOME_PATHS = ['/', '/dashboard/customer']
  // Routes that are not a tab's own path but belong under one.
  const ADOPTED = [
    { tab: '/plan',     prefixes: ['/service/', '/festivals/'] },
    { tab: celebrations, prefixes: ['/services'] },
  ]

  function isActive(to) {
    if (!to) return false
    // The cart is the most specific claim on its own URL; nothing else may
    // match it, which is what stops Shop lighting up on /shop/cart.
    if (to !== cartPath && (pathname === cartPath || pathname.startsWith(cartPath + '/'))) {
      return false
    }
    if (HOME_PATHS.includes(to)) return HOME_PATHS.includes(pathname)
    if (pathname === to || pathname.startsWith(to + '/')) return true
    const adopted = ADOPTED.find(a => a.tab === to)
    return !!adopted && adopted.prefixes.some(p => pathname.startsWith(p))
  }

  return (
    <nav
      ref={barRef}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]"
      aria-label="Primary"
    >
      {/* `flex-1 basis-0` on every item, not `justify-around`: equal columns
          regardless of how wide each label renders, so the six icons land on
          an even pitch and the row reads as a grid rather than as text that
          happens to be spaced out. */}
      <ul className="flex items-stretch px-0.5">
        {tabs.map(({ to, icon: Icon, label, primary, badge, pulse, action, active: forcedActive }) => {
          const active = forcedActive ?? isActive(to)

          // What every tab looks like inside, whether it navigates or opens
          // the assistant — so the one button in this bar can never drift
          // away from the five links beside it.
          const inner = (
            <>
              {/* Fixed 32px icon row on ALL six tabs, chip or no chip. Sizing
                  this off the content instead let Plan's chip make its column
                  62px against everyone else's 56, which put its icon 3px below
                  the other five — the row was evenly spaced horizontally and
                  still visibly out of line. */}
              {/* ── The Plan tab wears the brand ─────────────────────────
                  The primary tab used to be a saffron chip with a generic
                  sparkle in it. On a light bar that chip was the only
                  saturated thing on screen and it was saying nothing — a
                  sparkle is what every app puts on its "magic" button.

                  The kolam is the product's own mark, and its ramp was
                  drawn to sit on plum (see SambramoMark) — so the chip is
                  plum, which makes the one branded object in the navigation
                  also the one dark object on a light bar. That is exactly
                  the weight a primary action wants, and it reads as
                  Sambramo rather than as a generic accent.

                  `solid` because below ~24px the monoline centre closes up;
                  the petals fill and the pulli is knocked out instead. The
                  knockout has to be the CHIP's colour, so it is passed here
                  rather than inherited from --bar (which is the app bar's
                  white and would punch a white hole in a plum disc). The
                  chip colour is the same in both states for that reason —
                  selection is carried by the ring and the lift, so the
                  knockout can never disagree with its ground. */}
              <span
                className={`flex h-8 w-11 items-center justify-center rounded-full transition-all ${
                  primary
                    ? active
                      ? 'bg-plum-700 ring-2 ring-saffron-400 shadow-md shadow-plum-700/35'
                      : 'bg-plum-700 shadow-sm shadow-plum-700/25'
                    : ''
                }`}
                style={primary ? { '--sambramo-knockout': '#6d28d9' } : undefined}
              >
                {/* The badge anchors to the icon, not to the 32px row, so it
                    sits on the bag's corner rather than floating above it. */}
                <span className="relative flex items-center justify-center">
                  {primary
                    ? <SambramoMark size={21} variant="solid" title="" />
                    : <Icon size={20} strokeWidth={active ? 2.4 : 2} />}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-berry-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  {/* A number means "do something". This dot means "something
                      is happening" — a live celebration or an order on its
                      way, with nothing owed by the customer. Keeping the two
                      apart is what stops the badge becoming wallpaper. */}
                  {!badge && pulse && (
                    <span aria-hidden="true" className="absolute -top-0.5 -right-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron-500" />
                    </span>
                  )}
                </span>
              </span>
              <span className={`whitespace-nowrap text-[10px] leading-none ${
                primary ? 'font-bold text-plum-700' : active ? 'font-bold' : 'font-medium'
              }`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-saffron-400" />
              )}
            </>
          )

          // One class for all six. The primary tab differs in what it paints
          // INSIDE this box, never in the box — which is what keeps the
          // baseline, the height and the tap target identical across the row.
          const tabClass = `relative flex h-full w-full flex-col items-center justify-center gap-1 min-h-[58px] py-2 rounded-xl transition-colors ${
            active ? 'text-plum-700' : 'text-gray-500 active:text-plum-600'
          }`

          if (action) {
            return (
              <li key={label} className="flex-1 basis-0">
                <button
                  type="button"
                  onClick={action}
                  aria-expanded={active}
                  aria-label={active ? 'Close the assistant' : 'Open the assistant'}
                  className={tabClass}
                >
                  {inner}
                </button>
              </li>
            )
          }

          return (
            <li key={label} className="flex-1 basis-0">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                aria-label={primary ? 'Plan my celebration' : undefined}
                className={tabClass}
              >
                {inner}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
