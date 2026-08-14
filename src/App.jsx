import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CityProvider } from './context/CityContext'
import { ToastProvider } from './context/ToastContext'
import { ChatProvider } from './context/ChatContext'
import CitySheet from './components/common/CitySheet'
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'
import ScrollRestoration from './components/layout/ScrollRestoration'
import ErrorBoundary from './components/layout/ErrorBoundary'
import ChatWidget from './components/customer/ChatWidget'
import JourneyTracker from './components/common/JourneyTracker'
import ResumePrompt from './components/common/ResumePrompt'

// The landing page is the entry point for essentially all first-time
// traffic, so it stays in the main bundle — code-splitting it would only
// add a round-trip before anything renders.
import HomeScreen from './pages/HomeScreen'

// Everything else is split per route. Previously all 25 pages shipped in
// one ~1 MB bundle: a first-time visitor on a phone downloaded the entire
// admin operations console, the vendor dashboard and the checkout flow
// before they could read the headline. Each of these now loads only when
// someone actually navigates to it.
const SignupPage         = lazy(() => import('./pages/auth/SignupPage'))
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const AuthCallbackPage   = lazy(() => import('./pages/auth/AuthCallbackPage'))
const FestivalDetailPage = lazy(() => import('./pages/FestivalDetailPage'))
const PlanHub            = lazy(() => import('./pages/plan/PlanHub'))
const PlanningWizard     = lazy(() => import('./pages/plan/PlanningWizard'))
const CelebrationBuilder = lazy(() => import('./pages/plan/CelebrationBuilder'))
const PlanConfirmation   = lazy(() => import('./pages/plan/PlanConfirmation'))
const ServiceDetail      = lazy(() => import('./pages/services/ServiceDetail'))
const Shop               = lazy(() => import('./pages/shop/Shop'))
const ShopCategory       = lazy(() => import('./pages/shop/ShopCategory'))
const CakeShop           = lazy(() => import('./pages/shop/CakeShop'))
const ProductDetail      = lazy(() => import('./pages/shop/ProductDetail'))
const ShopCart           = lazy(() => import('./pages/shop/ShopCart'))

// Customer
const MyEvents       = lazy(() => import('./pages/customer/MyEvents'))
const ServicesPicker = lazy(() => import('./pages/customer/ServicesPicker'))
const EventServices  = lazy(() => import('./pages/customer/EventServices'))
const MyOrders       = lazy(() => import('./pages/customer/MyOrders'))
const MyRequests     = lazy(() => import('./pages/customer/MyRequests'))
const Cart           = lazy(() => import('./pages/customer/Cart'))

// Vendor & Admin
const VendorOnboarding = lazy(() => import('./pages/onboarding/VendorOnboarding'))
const VendorDashboard  = lazy(() => import('./pages/dashboard/VendorDashboard'))
const AdminDashboard   = lazy(() => import('./pages/dashboard/AdminDashboard'))
const AdminEventDetail = lazy(() => import('./pages/admin/AdminEventDetail'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-4 border-saffron-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )
}

// ── Route guard ─────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'vendor') return <Navigate to="/dashboard/vendor"   replace />
    if (profile.role === 'admin')  return <Navigate to="/dashboard/admin"    replace />
    return <Navigate to="/dashboard/customer" replace />
  }

  return children
}

function DashboardRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'vendor') return <Navigate to="/dashboard/vendor"   replace />
  if (profile.role === 'admin')  return <Navigate to="/dashboard/admin"    replace />
  return <Navigate to="/dashboard/customer" replace />
}

/**
 * Keeps old /dashboard/customer/events/:eventId links working now that the
 * catalog lives at /services/:eventId. A bare <Navigate> cannot interpolate a
 * route param, so this reads it and rebuilds the path.
 *
 * Note the sibling /dashboard/customer/events (MyEvents) still resolves: React
 * Router ranks a static segment above a dynamic one, so the two coexist exactly
 * as they did before.
 */
function LegacyEventRedirect() {
  const { eventId } = useParams()
  return <Navigate to={`/services/${eventId}`} replace />
}

/**
 * Wraps page content so a crash inside one page doesn't take the header,
 * navigation and footer down with it — the customer keeps a way out.
 *
 * Keyed by pathname so the boundary remounts on navigation: without that,
 * once a route errored the boundary would stay in its error state and
 * every subsequent page would render the fallback too.
 */
function PageBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
}

/**
 * ── The end of the marketing shell ──────────────────────────────────────
 *
 * There used to be an AppShell here: marketing navbar, pilot-city banner,
 * "Back to Home" link, page, 400px marketing footer. Screens moved off it one
 * at a time as each grew its own app bar — home, the storefront, the planner,
 * the checkout, the occasion page, the single-service page — and the five that
 * never made the move are the ones this pass finished: the occasions
 * catalogue, the product page, festival pages, the builder, and the four
 * signed-in customer screens.
 *
 * Nothing renders it now, so it is gone rather than left as a fourth option
 * somebody adds a route to next month. What it was stacking, and why each
 * piece had to stop:
 *
 *   · **the navbar** — a second logo above a bar that already carried one, and
 *     a second cart button next to the bar's own. Two carts on one screen is
 *     not a redundancy, it is a question about which one is real.
 *   · **ServiceAreaBanner** — a "Pilot — Bengaluru — Somewhere else? [notify
 *     me]" strip on every screen including the checkout, inviting a customer
 *     mid-purchase to register interest in a city we do not serve. The city
 *     control it also carried now lives in every app bar (CityButton), which
 *     is where it was already duplicated *from*.
 *   · **BackToHomeButton** — a back link floating in its own padded row, on
 *     four screens directly above the page's own back button. Eight pixels
 *     apart, pointing at different places.
 *   · **the marketing footer** — a sitemap, a celebrations directory, "Track
 *     an order" and "Sign in", hung under a page where somebody had just been
 *     told what their wedding costs. Every screen that carried it now ends in
 *     something written for that screen: EventFooter on the occasion page,
 *     HowWeServe in the shop, CheckoutFooter at the till, HowItWorks and the
 *     support strip on home.
 *
 * Two shells remain.
 */

/**
 * Every customer-facing screen. The page owns its own bar, its own ground and
 * its own height; this supplies the landmark and the crash boundary.
 *
 * ── Why it reserves nothing ─────────────────────────────────────────────
 * It used to be `min-h-screen flex-col pb-bottom-nav`, wrapping pages that are
 * themselves `min-h-screen pb-bottom-nav` — every one of the sixteen screens
 * on this shell declares both. Nesting them doubled the reservation: the tab
 * bar's strip was paid for twice, ~136px instead of ~68px, and because the
 * inner page was already a full 100vh the outer padding sat *below* it. So
 * every app screen in the product scrolled roughly 68px past its own last
 * element into empty ground, and every screen showed a scrollbar even when its
 * content fitted the viewport. That dead strip under the content — reported as
 * blank space at the bottom of "every page" — is this, and only this.
 *
 * The rule now: the page owns its canvas, because the page is the thing that
 * knows what colour the ground is and what fixed furniture it has to clear.
 * ShopCart clears its own checkout bar, the builder clears its action bar, and
 * everything else clears the tab bar with `pb-bottom-nav`. The shell adds
 * nothing on top of that.
 */
function ScreenShell({ children }) {
  return <main><PageBoundary>{children}</PageBoundary></main>
}

/**
 * Vendors and admins, who work inside an operations console rather than the
 * customer surface.
 *
 * They keep the navbar because it carries the profile menu and the sign-out,
 * and BottomNav deliberately returns null for both roles — so without it these
 * two screens would have no chrome at all. They do *not* keep the pilot-city
 * banner: which cities the pilot covers is not a fact an admin reconciling
 * shop orders needs restated above every table, and the "notify me when you
 * launch in my city" form underneath it was addressed to a customer who is not
 * the person reading this screen.
 */
function DashboardShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
    </div>
  )
}

/**
 * Auth screens draw their own full-height split layout, complete with
 * brand panel and logo. Wrapping them in a shell stacked a second logo,
 * a "Back to Home" link, a marketing footer and a chat bubble around a
 * screen whose entire job is a single focused decision.
 */
function BareShell({ children }) {
  return <div className="min-h-screen"><PageBoundary>{children}</PageBoundary></div>
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* ── Public ─────────────────────────────────── */}
      {/* One home, signed in or signed out.
          `/` and `/dashboard/customer` render the same screen: the two used to
          be a marketing landing page and a "customer home" that sold the
          planner, listed celebration types, pushed the shop and ran a festival
          rail — the same four things in two layouts. Signing in replaced the
          app you had just learned with another one doing the same job.
          HomeScreen changes its contents by auth state instead.

          /dashboard/customer stays routed rather than redirecting: it is in
          the wild in the tab bar, in post-login redirects, in the profile menu
          and in anything a customer has bookmarked. It keeps its guard, so the
          signed-out variant is only ever reachable at `/`. */}
      <Route path="/"       element={<ScreenShell><HomeScreen /></ScreenShell>} />
      <Route path="/signup"         element={<BareShell><SignupPage /></BareShell>} />
      <Route path="/login"          element={<BareShell><LoginPage /></BareShell>} />
      <Route path="/auth/callback"  element={<BareShell><AuthCallbackPage /></BareShell>} />

      {/* ── Festival detail (public) ────────────────── */}
      <Route path="/festivals/:id" element={<ScreenShell><FestivalDetailPage /></ScreenShell>} />

      {/* ── Shop (public browsing, checkout requires login) ── */}
      <Route path="/shop" element={<ScreenShell><Shop /></ScreenShell>} />
      {/* Public: a guest can build and review a cart, and is asked to sign
          in at checkout. Gating the cart page itself bounced anyone who
          tapped the cart icon straight to /login, which reads as "your
          items are gone" and is the classic way to lose a basket.

          ── Why the checkout has no site chrome ──────────────────────
          It was on AppShell, so a customer one tap from paying got, stacked
          above the thing they came to do: the marketing navbar, a "Pilot —
          Bengaluru — somewhere else? [notify me]" bar, a marquee of festivals
          sliding sideways, a "Back to Home" link — and beneath it a 400px
          footer offering birthdays, weddings, baby showers, a sitemap, two
          contact buttons and the pilot notice a second time.

          Every one of those is a way out of a checkout, and two actively
          argued with it: the banner invited someone mid-purchase to register
          interest in a city we don't serve, and the ticker moved continuously
          beside a form they were typing an address into. No storefront of any
          size ships its full site header on its checkout, and this is why.

          The page draws its own instead — CheckoutHeader (one exit, the
          brand, a padlock, a three-step rail) and CheckoutFooter (payment
          methods, the refund promise, a human to call). The tab bar stays: it
          is the app's navigation, not the marketing site's. */}
      <Route path="/shop/cart" element={<ScreenShell><ShopCart /></ScreenShell>} />
      <Route path="/shop/product/:id" element={<ScreenShell><ProductDetail /></ScreenShell>} />
      {/* Cakes get their own storefront: the category carries 50-odd occasion
          tags and every item is configurable, neither of which ShopCategory's
          flat chip row and one-tap Add can express. Listed before the generic
          route for readability — React Router ranks the static segment above
          the dynamic one regardless of order. Existing deep links of the form
          /shop/Cakes?occasion=Birthday still work; CakeShop reads the same
          search param. */}
      <Route path="/shop/Cakes" element={<ScreenShell><CakeShop /></ScreenShell>} />
      {/* Hampers merged into Gifts (migration 031). The old URL is in the wild —
          festival banners, the chat widget, anything a customer bookmarked — so
          it redirects rather than falling through to an empty category page. */}
      <Route path="/shop/Hampers" element={<Navigate to="/shop/Gifts" replace />} />
      <Route path="/shop/:category" element={<ScreenShell><ShopCategory /></ScreenShell>} />

      {/* ── Planning ────────────────────────────────────
          /plan is the hub every "plan" button in the app lands on, and it
          offers the two ways to actually engage: hand the occasion over to
          a coordinator, or browse the services and packages yourself.

          /plan/custom is the six-step wizard, which keeps BareShell — it is
          a focused flow and the chrome would only compete with it.

          Both are open to guests on purpose. Asking someone to make an
          account before they have been told what it costs — on a page whose
          whole argument is "free to ask, no obligation" — is the most
          expensive door in the funnel, and it was inconsistent besides: the
          shop lets you browse and fill a cart unauthenticated. Login is
          requested at submit, where there is something to save and a reason
          a person can see.
      ══════════════════════════════════════════════ */}
      {/* /plan draws its own app bar, exactly as home and the storefront do.
          It was on AppShell, which stacked the marketing navbar, the pilot-city
          banner, a scrolling festival ticker, a "Back to Home" link and a 400px
          marketing footer around it. Three specific faults, all reported from
          the live site:

            · the city appeared twice — once in the banner's "Set your city",
              once again inside the page — and the banner's notify-me form
              invited a customer who had just tapped "Plan a celebration" to
              sign up for a different city instead;
            · the festival ticker scrolled Independence Day and Raksha Bandhan
              across the top of a page about planning a wedding;
            · and because home and /shop had already moved to app bars, tapping
              "Plan a celebration" swapped one design language for another
              mid-journey, which reads as landing on a different website.

          ScreenShell keeps the phone tab bar and the chat widget and nothing
          else. */}
      <Route path="/plan" element={<ScreenShell><PlanHub /></ScreenShell>} />
      <Route path="/plan/custom" element={<BareShell><PlanningWizard /></BareShell>} />
      {/* The third door, and the only one that answers "what will this cost"
          before a human is involved: pick a scale, build the menu dish by
          dish, pick the decor, and watch the estimate move. Public for the
          same reason the wizard and the catalog are — a price behind a login
          is a price nobody sees. Login is asked at send, where there is
          something to save. */}
      <Route path="/plan/build" element={<ScreenShell><CelebrationBuilder /></ScreenShell>} />
      <Route path="/plan/build/:eventId" element={<ScreenShell><CelebrationBuilder /></ScreenShell>} />

      {/* ── Services & packages catalog (public) ──────
          The last screen inside CustomerLayout, which for a signed-in customer
          drew a second five-tab bar fixed to the bottom of the phone
          underneath the app's real one, in the palette the pivot retired.
          It carries the shared app bar now, search included. */}
      <Route path="/services" element={<ScreenShell><ServicesPicker /></ScreenShell>} />
      {/* One service, bought end to end — singular `/service/:id`, distinct
          from the plural `/services/:eventId` occasion page beside it.

          This is the page the "Need just one thing?" shelf always implied and
          never had: tapping a service there used to select a chip whose only
          exit was /plan/custom, the celebration wizard, which opens by asking
          which occasion you are planning. Somebody who wants a cook for Sunday
          was answered with a form about their wedding.

          Public, like the shop and the rest of the planner — a price behind a
          login is a price nobody sees. Sign-in is asked at add-to-cart, where
          there is something to save. ScreenShell because the page draws its own
          bar and its own footer, the same as /shop, /plan and the occasion
          page; stacking the marketing navbar over a bar that already carries
          the back arrow, the service and the cart is the duplication those
          three moved off AppShell to escape. */}
      <Route path="/service/:serviceId" element={<ScreenShell><ServiceDetail /></ScreenShell>} />
      {/* The occasion page draws its own chrome, the same as home, /shop and
          /plan. On AppShell it arrived under the marketing navbar, a "Pilot —
          Bengaluru — somewhere else? [notify me]" bar, a "Back to Home" link
          and a 400px sitemap footer — so somebody who had just tapped
          "Birthday" on the home screen was met with a form inviting them to
          register interest in a different city, and a footer selling cakes and
          pooja samagri under a page about their party.

          It now carries its own bar (one exit, the occasion, the city, the
          cart) and its own footer (EventFooter: what we commit to, what
          happens after you send it, a human to call) — the reassurance that
          page actually needs, rather than a sitemap. */}
      <Route path="/services/:eventId" element={<ScreenShell><EventServices /></ScreenShell>} />
      <Route path="/plan/confirmation" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <BareShell><PlanConfirmation /></BareShell>
        </ProtectedRoute>
      } />

      {/* ── Customer ───────────────────────────────── */}
      <Route path="/dashboard/customer" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <ScreenShell><HomeScreen /></ScreenShell>
        </ProtectedRoute>
      } />
      {/* /dashboard/customer/browse, /vendors/:id, /vendors/:id/quote and
          /bookings are gone, along with the four pages behind them.

          They were the pre-pivot marketplace: browse vendors → open a vendor
          profile → request a quote → track the booking. Sambramo stopped being
          that at the concierge pivot — a coordinator sources vendors now, and
          the customer never picks one — so the flow contradicted the product it
          shipped alongside, still wearing the old marigold palette.

          Nothing anywhere linked into it. The four pages linked only to each
          other, a closed island you could reach solely by typing a URL, which
          is exactly why it survived unnoticed. Redirecting to /services (the
          catalog that replaced it) so any bookmarked link still lands somewhere
          true rather than on the landing page's catch-all. */}
      <Route path="/dashboard/customer/browse"   element={<Navigate to="/services" replace />} />
      <Route path="/dashboard/customer/bookings" element={<Navigate to="/dashboard/customer/events" replace />} />
      <Route path="/dashboard/customer/vendors/*" element={<Navigate to="/services" replace />} />
      {/* The catalog used to live under /dashboard/customer behind a login, so
          15 occasions, 39 services and every priced package were unreachable
          from the public site — half the business, invisible. Same rule as the
          shop now: browse freely, sign in when you add something. */}
      <Route path="/dashboard/customer/services" element={<Navigate to="/services" replace />} />
      <Route path="/dashboard/customer/events/:eventId" element={<LegacyEventRedirect />} />
      {/* Pooja items moved into the real Shop/payment flow — redirect the old link */}
      <Route path="/dashboard/customer/pooja-items" element={<Navigate to="/shop/Pooja%20%26%20Essentials" replace />} />
      {/* The four signed-in customer screens. They were on the dashboard
          shell, which is now vendor/admin only: a customer checking an order
          does not need an operations navbar, and the pilot-city notify-me form
          above it was addressed to somebody who has already bought. Each draws
          the shared app bar instead — one back control, the screen's name, the
          cart and the account menu. */}
      <Route path="/dashboard/customer/orders" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <ScreenShell><MyOrders /></ScreenShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/requests" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <ScreenShell><MyRequests /></ScreenShell>
        </ProtectedRoute>
      } />
      {/* Public, like the shop's checkout beside it.
          It was customer-only, and that guard is what made the single-service
          door feel broken: a guest who chose a decoration setup and pressed
          "Add to cart" was thrown to /login mid-decision, and the cart icon
          they tapped afterwards pointed at the *shop* basket, which was empty.
          Two different screens both telling them the add had failed.
          The page asks for sign-in at "send", where there is something to save
          and a reason a person can see — the same rule the wizard and the
          storefront already follow. */}
      <Route path="/dashboard/customer/cart" element={<ScreenShell><Cart /></ScreenShell>} />
      <Route path="/dashboard/customer/events" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <ScreenShell><MyEvents /></ScreenShell>
        </ProtectedRoute>
      } />

      {/* ── Vendor onboarding ──────────────────────── */}
      <Route path="/onboarding/vendor" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <BareShell><VendorOnboarding /></BareShell>
        </ProtectedRoute>
      } />

      {/* ── Vendor ─────────────────────────────────── */}
      <Route path="/dashboard/vendor" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <DashboardShell><VendorDashboard /></DashboardShell>
        </ProtectedRoute>
      } />

      {/* ── Admin ──────────────────────────────────── */}
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardShell><AdminDashboard /></DashboardShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin/events/:eventId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardShell><AdminEventDetail /></DashboardShell>
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* City wraps the cart, not the other way round: what is deliverable,
            what it costs and who fulfils it are all functions of the city, so
            the cart may need to read it. Nothing in CityProvider reads the
            cart. */}
        <CityProvider>
          <CartProvider>
            <ToastProvider>
              <ChatProvider>
              <ScrollRestoration />
              {/* Records every navigation, so the app can answer "was this
                  customer in the middle of something?" — see lib/journey. It
                  renders nothing and writes to sessionStorage only. */}
              <JourneyTracker />
              <AppRoutes />
              <BottomNav />
              {/* The offer to go back to unfinished work. It shows itself only
                  on home, which is where an interrupted customer lands, and
                  only when there is genuinely something to return to. Mounted
                  here rather than inside HomeScreen because `/` and
                  /dashboard/customer are two routes onto one screen and the
                  card belongs to neither of them in particular. */}
              <ResumePrompt />
              {/* One assistant for the whole app, opened by the Help tab in
                  BottomNav. It used to be mounted inside three separate
                  shells, which is why it floated over the page: a component
                  living inside the layout it must not disturb has nowhere to
                  go but on top of it. */}
              <ChatWidget />
              {/* One sheet for the whole app, mounted above the routes. Any
                  surface raises it through `openCityPicker()` — the two app
                  bars, the storefront's serviceability strip, the plan hub —
                  so the control is identical everywhere and no page has to
                  own a copy of it. */}
              <CitySheet />
              </ChatProvider>
            </ToastProvider>
          </CartProvider>
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
