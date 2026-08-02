import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ChatWidget from './components/customer/ChatWidget'

// Public
import LandingPage        from './pages/LandingPage'
import SignupPage          from './pages/auth/SignupPage'
import LoginPage           from './pages/auth/LoginPage'
import AuthCallbackPage    from './pages/auth/AuthCallbackPage'
import FestivalDetailPage  from './pages/FestivalDetailPage'
import PlanningWizard      from './pages/plan/PlanningWizard'
import PlanConfirmation    from './pages/plan/PlanConfirmation'

// Customer
import MyEvents       from './pages/customer/MyEvents'
import CustomerHome   from './pages/customer/CustomerHome'
import BrowseVendors  from './pages/customer/BrowseVendors'
import VendorProfile  from './pages/customer/VendorProfile'
import RequestQuote   from './pages/customer/RequestQuote'
import MyBookings     from './pages/customer/MyBookings'
import ServicesPicker from './pages/customer/ServicesPicker'
import EventServices  from './pages/customer/EventServices'
import PoojaItems     from './pages/customer/PoojaItems'
import Cart           from './pages/customer/Cart'

// Vendor & Admin
import VendorOnboarding from './pages/onboarding/VendorOnboarding'
import VendorDashboard  from './pages/dashboard/VendorDashboard'
import AdminDashboard   from './pages/dashboard/AdminDashboard'
import AdminEventDetail from './pages/admin/AdminEventDetail'

// ── Route guard ─────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-4 border-marigold-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

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

function AppShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function CustomerShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <ChatWidget />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────── */}
      <Route path="/"       element={<AppShell><LandingPage /></AppShell>} />
      <Route path="/signup"         element={<AppShell><SignupPage /></AppShell>} />
      <Route path="/login"          element={<AppShell><LoginPage /></AppShell>} />
      <Route path="/auth/callback"  element={<AuthCallbackPage />} />

      {/* ── Festival detail (public) ────────────────── */}
      <Route path="/festivals/:id" element={<AppShell><FestivalDetailPage /></AppShell>} />

      {/* ── Planning wizard (requires login) ────────── */}
      <Route path="/plan" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <PlanningWizard />
        </ProtectedRoute>
      } />
      <Route path="/plan/confirmation" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <PlanConfirmation />
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
      <Route path="/dashboard/customer/pooja-items" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerShell><PoojaItems /></CustomerShell>
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
          <VendorOnboarding />
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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
