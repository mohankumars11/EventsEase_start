import { useLayoutEffect, useRef } from 'react'
import { Home, Route, Sparkles, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { currentSurface, SURFACE } from '../../config/surface'
import { isFocusedRoute } from '../../config/chrome'

const TABS = [
  { id: 'home', label: 'Home', to: '/', icon: Home },
  { id: 'book', label: 'Book', to: '/book/instant', icon: Sparkles },
  { id: 'track', label: 'Track', to: '/dashboard/customer/bookings', icon: Route },
  { id: 'account', label: 'Account', to: '/account', icon: UserRound },
]

const HOME_PATHS = ['/', '/dashboard/customer']

function activeTab(pathname) {
  if (HOME_PATHS.includes(pathname)) return 'home'
  if (pathname.startsWith('/book') || pathname.startsWith('/service/') || pathname.startsWith('/services')) return 'book'
  if (pathname.startsWith('/track') || pathname.startsWith('/dashboard/customer/events') || pathname.startsWith('/dashboard/customer/requests') || pathname.startsWith('/dashboard/customer/bookings')) return 'track'
  if (pathname.startsWith('/account')) return 'account'
  return null
}

function usePublishedHeight(ref, enabled) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!enabled || !ref.current) {
      root.style.setProperty('--bottom-nav-h', '0px')
      return undefined
    }
    const el = ref.current
    const publish = () => root.style.setProperty('--bottom-nav-h', el.offsetHeight + 'px')
    publish()
    if (typeof ResizeObserver === 'undefined') return () => root.style.setProperty('--bottom-nav-h', '0px')
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => { observer.disconnect(); root.style.setProperty('--bottom-nav-h', '0px') }
  }, [ref, enabled])
}

/** Customer counterpart to PartnerBottomNav. */
export default function CustomerBottomNav() {
  const { user, profile } = useAuth()
  const { pathname } = useLocation()
  const barRef = useRef(null)
  const isCustomer = currentSurface() === SURFACE.customer
  const hidden = !isCustomer || profile?.role === 'vendor' || profile?.role === 'admin' || isFocusedRoute(pathname)

  usePublishedHeight(barRef, !hidden)

  if (hidden) return null

  const selected = activeTab(pathname)
  const homeTo = user ? '/dashboard/customer' : '/'

  return (
    <nav
      ref={barRef}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-ink/[0.07] bg-white/95 backdrop-blur-lg pb-safe shadow-[0_-4px_24px_-10px_rgba(70,30,120,0.18)]"
      aria-label="Customer primary"
    >
      <ul className="flex items-stretch">
        {TABS.map(({ id, label, to, icon: Icon }) => {
          const destination = id === 'home' ? homeTo : to
          const active = selected === id
          return (
            <li key={id} className="flex-1">
              <Link
                to={destination}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-[10.5px] font-extrabold transition-colors"
                style={{ color: active ? 'var(--accent)' : 'var(--ink-mute)' }}
              >
                <span
                  className="flex h-8 w-11 items-center justify-center rounded-full transition-all"
                  style={active ? { background: 'rgba(76, 29, 149, 0.10)' } : undefined}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
