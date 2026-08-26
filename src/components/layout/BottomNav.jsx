import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Sparkles, Route, User, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useCustomerActivity } from '../../hooks/useCustomerActivity'
import { isFocusedRoute } from '../../config/chrome'

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
  const { cartPath } = useCart()
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
   * ── It is always `Track`, and that is deliberate ───────────────────────
   * It briefly changed identity — `Occasions` until you had an order, then
   * `Track` — and that was wrong twice over.
   *
   * Navigation that rearranges itself is disorienting: the tab a customer
   * learned in position four becomes a different destination the day they
   * order, so the one thing a tab bar is FOR — muscle memory — is exactly
   * what it breaks. And a tab nobody can see until they already need it can
   * never be discovered before then, so the promise it carries (every step,
   * every payment, in one place) never reaches the people still deciding
   * whether to trust us with a booking. That promise is worth more to
   * somebody who has not ordered than to somebody who has.
   *
   * So it is always here, always `/track`, and the screen itself explains
   * what it will hold when there is nothing in it yet.
   *
   * `Occasions` is gone rather than moved: it pointed at a third copy of the
   * occasion grid already on Home and inside Plan, so the slot was spending
   * primary navigation on a duplicate.
   *
   * "Track" over the alternatives: "Orders" excludes celebrations, "Events"
   * excludes the shop, and "Bookings" is the pre-pivot marketplace word this
   * codebase deliberately retired. It is also the verb this market already
   * uses, and it fits the 10px label.
   */
  const tracking = activity.total > 0

  /**
   * The sixth tab is Account, and it used to be Help.
   *
   * Help was here because the floating chat bubble it replaced covered the
   * cart bar's "View cart" and the builder's submit row — the buttons a thumb
   * reaches for in the corner it rests in. That fault was the bubble's
   * POSITION, not the fact that it floated: it now docks above the tab bar and
   * every full-width bottom bar reserves `pr-chat-dock` beside it, so it can
   * no longer sit on anything (see .chat-dock in index.css).
   *
   * Which frees the slot for the thing a phone customer actually reaches for
   * repeatedly. Every app of this shape ends its bar with the person's own
   * account, and Sambramo's was scattered: addresses lived in the checkout,
   * orders behind a dropdown in one app bar, celebrations behind another
   * entry in the same dropdown, and referrals nowhere reachable at all. A
   * dropdown in a header is a desktop control — on a phone it is a 32px
   * avatar hiding eight destinations.
   *
   * Signed out it is still Account rather than "Sign in", for the reason the
   * Track tab documents above: a permanent tab whose only function is to
   * interrupt contradicts an app that deliberately lets guests browse, plan
   * and fill a cart. The screen itself asks, once, when there is something to
   * save.
   */
  const tabs = [
    { to: home,            icon: Home,          label: 'Home' },
    // `icon` is the fallback for this row; a primary tab renders the
    // kolam instead and never reaches it.
    /* Plan carries the basket now. The Cart tab held `cart_items` and
       `cart_packages` — services and packages, not goods — and its terminal
       action is an enquiry with an estimate band, not a checkout. A bag icon
       in a tab bar is a promise of a till.

       The count is not on this tab. It briefly was, and it meant the tab bar
       and the app bar both carried the same number — two badges for one
       basket, which is one of them lying the moment they disagree. The app
       bar owns it; this tab owns the destination. */
    { to: '/plan',         icon: Sparkles,      label: 'Plan', primary: true },
    // The badge counts only what is WAITING ON THE CUSTOMER — a plan to
    // approve, an answered enquiry. An order awaiting payment confirmation is
    // our reconciliation backlog, not their task, and a badge that counts
    // everything is a badge people learn to ignore. The pulse covers the
    // other case: something is live, but nothing needs you.
    {
      to: '/track',
      icon: Route,
      label: 'Track',
      badge: activity.needsYou,
      pulse: tracking && activity.needsYou === 0 && activity.live > 0,
      // ── Greyed until there is something to track ──────────────────
      // The tab stays in position four and stays reachable — see the note
      // above for why it is never removed or renamed — but it is drawn as
      // what it is: a feature that does nothing for you yet. A live tab that
      // opens an empty screen reads as the app being broken; a locked tab
      // that says what unlocks it reads as a promise.
      //
      // `activity.loaded` matters here. Without it the tab flashes locked on
      // every cold render for a customer who has five live orders, which is
      // the one audience it must never tell "you have nothing with us".
      locked: activity.loaded && !tracking,
    },
    { to: '/account',      icon: User,          label: 'Account' },
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
  // `/services` moves under Plan now that Occasions is gone: it is the
  // occasion catalogue, reached from the Plan hub's own shelves, and it is
  // certainly not part of Track.
  const ADOPTED = [
    // `/dashboard/customer/cart` is on this list because the basket lives
    // under Plan now and its own tab is gone — without it, opening the
    // basket lights nothing at all.
    { tab: '/plan',  prefixes: ['/service/', '/festivals/', '/services', cartPath] },
  ]

  function isActive(to) {
    if (!to) return false
    // There used to be a guard here stopping Shop lighting up on /shop/cart,
    // because two tabs both had a claim on that URL. One tab owns the basket
    // now, so the ambiguity it existed for is gone.
    if (HOME_PATHS.includes(to)) return HOME_PATHS.includes(pathname)
    if (pathname === to || pathname.startsWith(to + '/')) return true
    const adopted = ADOPTED.find(a => a.tab === to)
    return !!adopted && adopted.prefixes.some(p => pathname.startsWith(p))
  }

  return (
    <nav
      ref={barRef}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-ink/[0.07] pb-safe shadow-[0_-4px_24px_-10px_rgba(70,30,120,0.18)]"
      aria-label="Primary"
    >
      {/* `flex-1 basis-0` on every item, not `justify-around`: equal columns
          regardless of how wide each label renders, so the six icons land on
          an even pitch and the row reads as a grid rather than as text that
          happens to be spaced out. */}
      <ul className="flex items-stretch px-0.5">
        {tabs.map(({ to, icon: Icon, label, primary, badge, pulse, locked }) => {
          const active = isActive(to)

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

                  The monogram is the product's own mark, and it is gold —
                  so the chip is navy, which is the ground the mark is drawn
                  to sit on. It also makes the one branded object in the
                  navigation the one dark object on a light bar, which is
                  exactly the weight a primary action wants, and it reads as
                  Sambramo rather than as a generic accent.

                  `solid` because below ~24px the monoline centre closes up;
                  the petals fill and the pulli is knocked out instead. The
                  knockout has to be the CHIP's colour, so it is passed here
                  rather than inherited from --bar (which is the app bar's
                  white and would punch a white hole in a plum disc). The
                  chip colour is the same in both states for that reason —
                  selection is carried by the ring and the lift, so the
                  knockout can never disagree with its ground. */}
              {/* ── The active pill ──────────────────────────────────────
                  Material 3's navigation bar marks the selected tab with a
                  filled pill behind its icon rather than a line above the
                  column, and the reason is mechanical: on a 6-tab bar at
                  phone width each column is ~62px, so a 32px underline is
                  reading as a mark on the BAR rather than on the tab. The
                  pill is attached to the thing it selects.

                  The primary tab keeps its navy disc — it is branded rather
                  than selected — so it never takes the pill. */}
              <span
                className={`flex h-8 w-11 items-center justify-center rounded-full transition-all ${
                  primary
                    ? active
                      ? 'brand-aqua-chip ring-2 ring-aqua-200 shadow-md shadow-aqua-900/35'
                      : 'brand-aqua-chip shadow-sm shadow-aqua-900/25'
                    : active && !locked
                      ? 'bg-accent/[0.12]'
                      : ''
                }`}
              >
                {/* The badge anchors to the icon, not to the 32px row, so it
                    sits on the bag's corner rather than floating above it. */}
                <span className="relative flex items-center justify-center">
                  {/* The primary tab used to hold a 22px Spencerian S. A
                      Spencerian capital is defined by its hairlines, and at
                      22px those fall below a device pixel — so the mark the
                      app showed on every screen was a gold smudge. The chip
                      carries the brand now (the aqua ground), and the tab
                      carries its own icon, white, like every other tab.
                      One system instead of one exception. */}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className={primary ? 'text-white' : undefined}
                  />
                  {/* A locked tab carries neither. Both are claims that
                      something is happening, and nothing is. */}
                  {!locked && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-berry-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  {/* A number means "do something". This dot means "something
                      is happening" — a live celebration or an order on its
                      way, with nothing owed by the customer. Keeping the two
                      apart is what stops the badge becoming wallpaper. */}
                  {!locked && !badge && pulse && (
                    <span aria-hidden="true" className="absolute -top-0.5 -right-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron-500" />
                    </span>
                  )}
                  {/* The grey pip. Small enough to read as a state rather
                      than as an error, and it sits where the badge would —
                      the same corner the eye already checks. */}
                  {locked && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink/[0.12] text-ink-mute ring-2 ring-white"
                    >
                      <Lock size={7} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
              </span>
              <span className={`whitespace-nowrap text-[10.5px] leading-none ${
                locked ? 'font-medium text-ink-mute/70'
                  : primary ? 'font-bold text-royal-800'
                  : active ? 'font-extrabold' : 'font-medium'
              }`}>
                {label}
              </span>
            </>
          )

          // One class for all six. The primary tab differs in what it paints
          // INSIDE this box, never in the box — which is what keeps the
          // baseline, the height and the tap target identical across the row.
          const tabClass = `relative flex h-full w-full flex-col items-center justify-center gap-1.5 min-h-[60px] py-2 rounded-xl transition-colors ${
            locked ? 'text-ink-mute/70'
              : active ? 'text-accent'
              : 'text-ink-mute active:text-accent'
          }`

          // Said rather than implied: a screen reader gets the same sentence
          // the screen behind the tab opens with, so the locked state is not
          // carried by colour alone.
          return (
            <li key={label} className="flex-1 basis-0">
              <Link
                to={to}
                aria-current={active && !locked ? 'page' : undefined}
                aria-label={
                  primary ? 'Plan my celebration'
                    : locked ? 'Track — unlocks once you book a celebration with us'
                    : undefined
                }
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
