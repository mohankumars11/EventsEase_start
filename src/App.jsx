import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/layout/Navbar'
import BackToHomeButton from './components/layout/BackToHomeButton'
import BottomNav from './components/layout/BottomNav'
import ScrollRestoration from './components/layout/ScrollRestoration'
import ErrorBoundary from './components/layout/ErrorBoundary'
import Footer from './components/layout/Footer'
import ChatWidget from './components/customer/ChatWidget'
import FestivalBanner from './components/customer/FestivalBanner'

// The landing page is the entry point for essentially all first-time
// traffic, so it stays in the main bundle — code-splitting it would only
// add a round-trip before anything renders.
import LandingPage from './pages/LandingPage'

// Everything else is split per route. Previously all 25 pages shipped in
// one ~1 MB bundle: a first-time visitor on a phone downloaded the entire
// admin operations console, the vendor dashboard and the checkout flow
// before they could read the headline. Each of these now loads only when
// someone actually navigates to it.
const SignupPage         = lazy(() => import('./pages/auth/SignupPage'))
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const AuthCallbackPage   = lazy(() => import('./pages/auth/AuthCallbackPage'))
const FestivalDetailPage = lazy(() => import('./pages/FestivalDetailPage'))
const PlanningWizard     = lazy(() => import('./pages/plan/PlanningWizard'))
const PlanConfirmation   = lazy(() => import('./pages/plan/PlanConfirmation'))
const Shop               = lazy(() => import('./pages/shop/Shop'))
const ShopCategory       = lazy(() => import('./pages/shop/ShopCategory'))
const ProductDetail      = lazy(() => import('./pages/shop/ProductDetail'))
const ShopCart           = lazy(() => import('./pages/shop/ShopCart'))

// Customer
const MyEvents       = lazy(() => import('./pages/customer/MyEvents'))
const CustomerHome   = lazy(() => import('./pages/customer/CustomerHome'))
const BrowseVendors  = lazy(() => import('./pages/customer/BrowseVendors'))
const VendorProfile  = lazy(() => import('./pages/customer/VendorProfile'))
const RequestQuote   = lazy(() => import('./pages/customer/RequestQuote'))
const MyBookings     = lazy(() => import('./pages/customer/MyBookings'))
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
 * Marketing / browsing chrome: header, festival ticker, footer, chat.
 * `pb-bottom-nav` reserves room for the fixed mobile tab bar so the last
 * row of a page is never hidden underneath it.
 */
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

function AppShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen pb-bottom-nav">
      <Navbar />
      <FestivalBanner />
      <BackToHomeButton />
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

/** Signed-in customer chrome — same as AppShell minus the marketing footer. */
function CustomerShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen pb-bottom-nav">
      <Navbar />
      <FestivalBanner />
      <BackToHomeButton />
      <main className="flex-1"><PageBoundary>{children}</PageBoundary></main>
      <ChatWidget />
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

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* ── Public ─────────────────────────────────── */}
      <Route path="/"       element={<AppShell><LandingPage /></AppShell>} />
      <Route path="/signup"         element={<BareShell><SignupPage /></BareShell>} />
      <Route path="/login"          element={<BareShell><LoginPage /></BareShell>} />
      <Route path="/auth/callback"  element={<BareShell><AuthCallbackPage /></BareShell>} />

      {/* ── Festival detail (public) ────────────────── */}
      <Route path="/festivals/:id" element={<AppShell><FestivalDetailPage /></AppShell>} />

      {/* ── Shop (public browsing, checkout requires login) ── */}
      <Route path="/shop" element={<AppShell><Shop /></AppShell>} />
      {/* Public: a guest can build and review a cart, and is asked to sign
          in at checkout. Gating the cart page itself bounced anyone who
          tapped the cart icon straight to /login, which reads as "your
          items are gone" and is the classic way to lose a basket. */}
      <Route path="/shop/cart" element={<AppShell><ShopCart /></AppShell>} />
      <Route path="/shop/product/:id" element={<AppShell><ProductDetail /></AppShell>} />
      <Route path="/shop/:category" element={<AppShell><ShopCategory /></AppShell>} />

      {/* ── Planning wizard (requires login) ────────── */}
      <Route path="/plan" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <BareShell><PlanningWizard /></BareShell>
        </ProtectedRoute>
      } />
      <Route path="/plan/confirmation" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <BareShell><PlanConfirmation /></BareShell>
        </ProtectedRoute>
      } />

      {/* ── Customer ───────────────────────────────── */}
      <Route path="/dashboard/customer" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><CustomerHome /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/browse" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><BrowseVendors /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/vendors/:vendorId" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><VendorProfile /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/vendors/:vendorId/quote" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><RequestQuote /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/bookings" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><MyBookings /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/services" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><ServicesPicker /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/events/:eventId" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><EventServices /></CustomerShell>
        </ProtectedRoute>
      } />
      {/* Pooja items moved into the real Shop/payment flow — redirect the old link */}
      <Route path="/dashboard/customer/pooja-items" element={<Navigate to="/shop/Pooja%20%26%20Essentials" replace />} />
      {/* These two rendered bare — no header, no way out except the page's
          own in-content links. Same shell as every other customer page. */}
      <Route path="/dashboard/customer/orders" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><MyOrders /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/requests" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><MyRequests /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/cart" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><Cart /></CustomerShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/events" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><MyEvents /></CustomerShell>
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
          <AppShell><VendorDashboard /></AppShell>
        </ProtectedRoute>
      } />

      {/* ── Admin ──────────────────────────────────── */}
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AppShell><AdminDashboard /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin/events/:eventId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AppShell><AdminEventDetail /></AppShell>
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
        <CartProvider>
          <ToastProvider>
            <ScrollRestoration />
            <AppRoutes />
            <BottomNav />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
