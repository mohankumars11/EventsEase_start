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
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PlanProvider } from './state/PlanContext'
import { PlanBar, TabBar } from './ui/kit'
import Home from './screens/Home'
import Onboarding, { onboardFlags } from './screens/Onboarding'
import { savedWhere } from './lib/where'
import { loadRules } from './lib/eventPlans'
import { setActiveRules } from './lib/recommend360'
import { flushConsent } from './lib/rewards'
import './cx.css'

/* Screens load on their own, but never on the tap: right after Home has
   painted, each screen's code is fetched in the background, one after
   another in idle time, most-visited first. Once a screen's module is in,
   `screen()` renders it directly — no Suspense fallback, no spinner flash —
   so every tap opens its page in the same frame. */
const PRELOAD = []
function screen(factory, pick = m => m.default) {
  let Comp = null
  const load = () => factory().then(m => { Comp = pick(m); return m })
  const Lazy = lazy(() => load().then(() => ({ default: Comp })))
  /* Decided once per mount: a page that opened through Lazy stays on it, so
     the module arriving mid-visit never swaps the component and wipes the page. */
  function Screen(props) { const [Direct] = useState(() => Comp); return Direct ? <Direct {...props} /> : <Lazy {...props} /> }
  PRELOAD.push(load)
  return Screen
}
const Search = screen(() => import('./screens/Search'))
const Trade = screen(() => import('./screens/Trade'))
const Occasion = screen(() => import('./screens/Occasion'))
const Services = screen(() => import('./screens/Small'), m => m.Services)
const Plans = screen(() => import('./screens/Plans'))
const Account = screen(() => import('./screens/Account'))
const Category = screen(() => import('./screens/Category'))
const Recommend = screen(() => import('./screens/Recommend'))
const Needs = screen(() => import('./screens/Needs'))
const Brief = screen(() => import('./screens/Brief'))
const Match = screen(() => import('./screens/Match'))
const Partner = screen(() => import('./screens/Partner'))
const PlanReview = screen(() => import('./screens/PlanReview'))
const Checkout = screen(() => import('./screens/Checkout'))
const InvitesList = screen(() => import('./screens/Invites'), m => m.InvitesList)
const InviteNew = screen(() => import('./screens/InviteNew'))
const InviteHost = screen(() => import('./screens/InviteHost'))
const InviteEdit = screen(() => import('./screens/Invites'), m => m.InviteEdit)
const Explore = screen(() => import('./screens/Explore'))
const Family = screen(() => import('./screens/Family'))
const Notifications = screen(() => import('./screens/Small'), m => m.Notifications)
const Saved = screen(() => import('./screens/Small'), m => m.Saved)
const Help = screen(() => import('./screens/Help'))
const Wallet = screen(() => import('./screens/Wallet'))
const Negotiate = screen(() => import('./screens/Negotiate'))
const Refer = screen(() => import('./screens/Refer'))
const Legal = screen(() => import('./screens/Legal'))
const Rsvp = screen(() => import('./screens/Rsvp'))
const CircleWelcome = screen(() => import('./screens/CircleWelcome'))

/* One module per idle slot, so warming never competes with a scroll or a tap. */
function warmScreens() {
  const idle = window.requestIdleCallback ?? (f => setTimeout(() => f({ timeRemaining: () => 8 }), 120))
  let i = 0
  const step = () => { if (i >= PRELOAD.length) return; PRELOAD[i++]().catch(() => {}).finally(() => idle(step, { timeout: 1500 })) }
  setTimeout(() => idle(step, { timeout: 1500 }), 600)
}

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
  const step = !savedWhere() ? 'where' : !user ? 'signin' : !onboardFlags().rewards ? 'rewards' : null
  return { step, next: () => bump(n => n + 1) }
}

export default function CustomerApp() {
  /* The published 360° rule set, if one exists; the bundled rules until then. */
  useEffect(() => { loadRules().then(setActiveRules).catch(() => {}) }, [])
  useEffect(() => { warmScreens(); flushConsent().catch(() => {}) }, [])
  const { pathname } = useLocation()
  const { step, next } = useOnboarding()
  /* A guest opening their RSVP link needs no sign-in, location or alerts. */
  if (pathname.startsWith('/rsvp/')) {
    return <div className="cx" data-customer-app><Suspense fallback={<Loading />}><Routes><Route path="/rsvp/circle/:join" element={<CircleWelcome />} /><Route path="/rsvp/:token" element={<Rsvp />} /></Routes></Suspense></div>
  }
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
            <Route path="/o/:occasionId/needs" element={<Needs />} />
            <Route path="/brief/:tradeId" element={<Brief />} />
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
            <Route path="/invites" element={<InvitesList />} />
            <Route path="/invites/new" element={<InviteNew />} />
            <Route path="/invites/:id" element={<InviteHost />} />
            <Route path="/invites/:id/edit" element={<InviteEdit />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/rewards" element={<Wallet />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/legal/:doc" element={<Legal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[160] bg-white" style={{ height: 'env(safe-area-inset-top, 0px)' }} aria-hidden />
        {BAR_ROUTES(pathname) && <PlanBar />}
        {TAB_ROUTES(pathname) && <TabBar />}
      </div>
    </PlanProvider>
  )
}
