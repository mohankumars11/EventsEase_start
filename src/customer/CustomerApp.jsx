/**
 * The customer app.
 *
 * Built on the partner branch (6c450a8) and reading only what the partner
 * app publishes. The previous customer screens (pages/HomeScreen, /plan,
 * /celebrate, /services…) are not used on this surface: App.jsx sends
 * every customer path here except the shared doors listed in
 * LEGACY_PATHS — sign-in, the auth callback, the payment bridge, and the
 * partner and operator routes, which keep working on any host exactly as
 * before.
 *
 * Four tabs (Home, Services, My Bookings, Account). The plan bar floats above them
 * whenever a partner has been picked; focused screens (an occasion, a
 * partner, checkout) hide the tabs and carry their own action bar.
 */
import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PlanProvider } from './state/PlanContext'
import { PlanBar, TabBar } from './ui/kit'
import Home from './screens/Home'
import Onboarding, { onboardFlags } from './screens/Onboarding'
import { savedWhere } from './lib/where'
import './cx.css'

const Category = lazy(() => import('./screens/Category'))
const Occasion = lazy(() => import('./screens/Occasion'))
const Match = lazy(() => import('./screens/Match'))
const Recommend = lazy(() => import('./screens/Recommend'))
const Trade = lazy(() => import('./screens/Trade'))
const Partner = lazy(() => import('./screens/Partner'))
const PlanReview = lazy(() => import('./screens/PlanReview'))
const Checkout = lazy(() => import('./screens/Checkout'))
const Negotiate = lazy(() => import('./screens/Negotiate'))
const Plans = lazy(() => import('./screens/Plans'))
const Account = lazy(() => import('./screens/Account'))
const Search = lazy(() => import('./screens/Search'))
const Saved = lazy(() => import('./screens/Small').then(m => ({ default: m.Saved })))
const Notifications = lazy(() => import('./screens/Small').then(m => ({ default: m.Notifications })))
const Services = lazy(() => import('./screens/Small').then(m => ({ default: m.Services })))
const Explore = lazy(() => import('./screens/Explore'))
const Family = lazy(() => import('./screens/Family'))
const Help = lazy(() => import('./screens/Help'))
const Wallet = lazy(() => import('./screens/Wallet'))
const Refer = lazy(() => import('./screens/Refer'))

/** Paths that stay on the shared routes on every surface. */
export const LEGACY_PATHS = ['/partner', '/dashboard/vendor', '/dashboard/admin', '/admin', '/login', '/signup', '/auth', '/pay']
export const isLegacyPath = p => p === '/dashboard' || LEGACY_PATHS.some(x => p === x || p.startsWith(`${x}/`))

const TAB_ROUTES = p => p === '/' || p.startsWith('/c/') || p === '/s' || p.startsWith('/s/') || p.startsWith('/plans') || p.startsWith('/me') || p === '/explore' || p.startsWith('/f/')
const BAR_ROUTES = p => p === '/' || p.startsWith('/c/') || p === '/s' || p.startsWith('/plans') || p.startsWith('/me')

function Loading() {
  return <div className="grid min-h-[60dvh] place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" /></div>
}

/* A partner or operator who opens the customer host lands on their own
   work, as RootScreen did. Customers and visitors get Celebrate. */
function Root() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role === 'vendor') return <Navigate to="/dashboard/vendor" replace />
  if (profile?.role === 'admin') return <Navigate to="/dashboard/admin" replace />
  return <Home />
}

/* First run: location → sign in → notifications, before any screen of the
   app (screens/Onboarding.jsx). A signed-out customer always lands on
   sign-in again; location and the alerts ask happen once per device. */
function useOnboarding() {
  const { user, loading } = useAuth()
  const [, bump] = useState(0)
  if (loading) return { step: 'loading' }
  const step = !savedWhere() ? 'where' : !user ? 'signin' : !onboardFlags().alerts ? 'alerts' : null
  return { step, next: () => bump(n => n + 1) }
}

export default function CustomerApp() {
  const { pathname } = useLocation()
  const { step, next } = useOnboarding()
  if (step === 'loading') return <div className="cx" data-customer-app><Loading /></div>
  if (step) return <PlanProvider><div className="cx" data-customer-app><Onboarding step={step} onDone={next} /></div></PlanProvider>
  return (
    <PlanProvider>
      <div className="cx" data-customer-app>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="/search" element={<Search />} />
            <Route path="/c/:categoryId" element={<Category />} />
            <Route path="/o/:occasionId" element={<Occasion />} />
            <Route path="/o/:occasionId/plan" element={<Recommend />} />
            <Route path="/o/:occasionId/match" element={<Match />} />
            <Route path="/s" element={<Services />} />
            <Route path="/s/:tradeId" element={<Trade />} />
            <Route path="/p/:serviceId" element={<Partner />} />
            <Route path="/negotiate/:serviceId" element={<Negotiate />} />
            <Route path="/plan" element={<PlanReview />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/me" element={<Account />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/f/:familyId" element={<Family />} />
            <Route path="/help" element={<Help />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[160] bg-white/90 backdrop-blur-md" style={{ height: 'env(safe-area-inset-top, 0px)' }} aria-hidden />
        {BAR_ROUTES(pathname) && <PlanBar />}
        {TAB_ROUTES(pathname) && <TabBar />}
      </div>
    </PlanProvider>
  )
}
