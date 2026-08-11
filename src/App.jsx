import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CityProvider } from './context/CityContext'
import { ToastProvider } from './context/ToastContext'
import { ChatProvider } from './context/ChatContext'
import CitySheet from './components/common/CitySheet'
import Navbar from './components/layout/Navbar'
import BackToHomeButton from './components/layout/BackToHomeButton'
import BottomNav from './components/layout/BottomNav'
import ScrollRestoration from './components/layout/ScrollRestoration'
import ErrorBoundary from './components/layout/ErrorBoundary'
import Footer from './components/layout/Footer'
import ChatWidget from './components/customer/ChatWidget'
import ServiceAreaBanner from './components/customer/ServiceAreaBanner'

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
 * Public / pre-login chrome: header, pilot-city bar, footer.
 * `pb-bottom-nav` reserves room for the fixed mobile tab bar so the last
 * row of a page is never hidden underneath it.
 *
 * The scrolling festival ticker used to sit between the two bars, on every
 * page in the app. It is gone. Home already runs a full festival rail — eight
 * occasions, each with a countdown, a photo and its own route — so the ticker
 * was the same content a second time, in a worse form: a 20s marquee is the
 * one element on a page that never stops moving, it sat directly above the
 * content on screens that had nothing to do with festivals, and a chip you
 * have to hit while it slides is a target that moves out from under the
 * thumb. Anything that needs a festival links to /festivals/:id directly.
 */
function AppShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen pb-bottom-nav">
      <Navbar />
      <ServiceAreaBanner />
      <BackToHomeButton />
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
      <Footer />
    </div>
  )
}

/**
 * Signed-in chrome — AppShell minus the marketing footer.
 *
 * The footer is a sales surface: a sitemap, two "call us" buttons, a list of
 * celebration types and the pilot-city notice. All of it exists to convince
 * someone who has not signed up yet. Past the login it is 400px of scroll at
 * the bottom of every screen, selling the product to the person already using
 * it — and worse, on the vendor and admin dashboards it hung "Plan a birthday"
 * links under an operations console, which is not what those two roles are
 * here to do.
 *
 * So the rule is the door, not the role: public browsing (landing, shop, plan
 * hub, catalog, festivals) keeps the footer because those pages still have to
 * sell and still need a sitemap. Everything under /dashboard drops it — the
 * header, the profile menu and the phone tab bar are the navigation once you
 * are inside, and contact details live in the profile menu and the chat widget
 * that stays on screen here.
 */
function DashboardShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen pb-bottom-nav">
      <Navbar />
      <ServiceAreaBanner />
      <BackToHomeButton />
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
    </div>
  )
}

/**
 * Auth screens draw their own full-height split layout, complete with
 * brand panel and logo. Wrapping them in AppShell stacked a second logo,
 * a festival ticker, a "Back to Home" link, a marketing footer and a chat
 * bubble around a screen whose entire job is a single focused decision.
 */
function BareShell({ children }) {
  return <div className="min-h-screen"><PageBoundary>{children}</PageBoundary></div>
}

/**
 * The app screens that draw their own chrome — home and the storefront.
 *
 * Same reasoning as BareShell, for the same symptom. /shop opens with a
 * sticky app bar carrying the delivery city, a search field and the cart —
 * and AppShell was stacking the marketing navbar, the pilot-city banner, the
 * festival ticker and a "Back to Home" link on top of it. That is roughly
 * 470px of chrome before the first product, two cart buttons, and the
 * delivery city stated twice in different words. It also broke the sticky
 * filter row, which positions itself against the top of the viewport.
 *
 * The footer goes too. Its job on a public page is a sitemap and a sales
 * pitch; the storefront now ends with the same information in its own voice
 * — how the service works, who delivers, how to pay — and the tab bar is the
 * navigation. ChatWidget stays: support is the one piece of global chrome a
 * shopper actually reaches for mid-purchase.
 *
 * Deliberately not applied to /shop/product/:id, which is still the
 * light-ground design and reads correctly inside the standard shell.
 *
 * Home joined it when the landing page and the customer dashboard collapsed
 * into one screen: it draws the same kind of sticky app bar, and stacking the
 * marketing navbar above a bar that already carries the city, the search and
 * the cart produced the identical duplication it does on /shop.
 *
 * The checkout joined it as well, for the strongest version of the same
 * reason — see the /shop/cart route.
 */
function ScreenShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col pb-bottom-nav">
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
    </div>
  )
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
      <Route path="/festivals/:id" element={<AppShell><FestivalDetailPage /></AppShell>} />

      {/* ── Shop (public browsing, checkout requires login) ── */}
      <Route path="/shop" element={<ScreenShell><Shop /></ScreenShell>} />
      {/* Public: a guest can build and review a cart, and is asked to sign
          in at checkout. Gating the cart page itself bounced anyone who
          tapped the cart icon straight to /login, which reads as "your
          items are gone" and is the classic way to lose a basket. */}
      <Route path="/shop/cart" element={<AppShell><ShopCart /></AppShell>} />
      <Route path="/shop/product/:id" element={<AppShell><ProductDetail /></AppShell>} />
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
          a coordinator, or browse the services and packages yourself. It
          gets AppShell because it is a browsing page and needs the header,
          footer and phone tab bar around it.

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
      <Route path="/plan/build" element={<AppShell><CelebrationBuilder /></AppShell>} />
      <Route path="/plan/build/:eventId" element={<AppShell><CelebrationBuilder /></AppShell>} />

      {/* ── Services & packages catalog (public) ────── */}
      <Route path="/services" element={<AppShell><ServicesPicker /></AppShell>} />
      <Route path="/services/:eventId" element={<AppShell><EventServices /></AppShell>} />
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
      {/* These two rendered bare — no header, no way out except the page's
          own in-content links. Same shell as every other customer page. */}
      <Route path="/dashboard/customer/orders" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <DashboardShell><MyOrders /></DashboardShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/requests" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <DashboardShell><MyRequests /></DashboardShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/cart" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <DashboardShell><Cart /></DashboardShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/events" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <DashboardShell><MyEvents /></DashboardShell>
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
              <AppRoutes />
              <BottomNav />
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
