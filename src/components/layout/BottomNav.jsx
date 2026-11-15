import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Grid2X2, CalendarDays, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isPartnerSurface } from '../../config/surface'
import { isFocusedRoute } from '../../config/chrome'

function usePublishedHeight(ref, enabled) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!enabled || !ref.current) {
      root.style.setProperty('--bottom-nav-h', '0px')
      return
    }
    const element = ref.current
    const publish = () => root.style.setProperty('--bottom-nav-h', `${element.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.setProperty('--bottom-nav-h', '0px')
    }
  }, [ref, enabled])
}

export default function BottomNav() {
  const { user, profile } = useAuth()
  const { pathname } = useLocation()
  const barRef = useRef(null)
  const hidden = isPartnerSurface() || profile?.role === 'vendor' || profile?.role === 'admin' || isFocusedRoute(pathname)
  usePublishedHeight(barRef, !hidden)

  if (hidden) return null

  const home = user ? '/dashboard/customer' : '/'
  const tabs = [
    { to: home, icon: Home, label: 'Home', matches: ['/', '/dashboard/customer'] },
    { to: '/services', icon: Grid2X2, label: 'Services', prefixes: ['/services', '/service/', '/festivals/'] },
    { to: '/track', icon: CalendarDays, label: 'My Bookings', prefixes: ['/track', '/dashboard/customer/events', '/dashboard/customer/requests'] },
    { to: '/account', icon: UserRound, label: 'Account', prefixes: ['/account'] },
  ]

  const isActive = tab => {
    if (tab.matches?.includes(pathname)) return true
    if (tab.prefixes?.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) return true
    if (tab.to === home && (pathname === '/' || pathname === '/dashboard/customer')) return true
    return pathname === tab.to
  }

  return (
    <nav
      ref={barRef}
      className="sambramo-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-violet-100 pb-safe"
      aria-label="Primary navigation"
    >
      <ul className="flex items-stretch justify-between px-2">
        {tabs.map(({ to, icon: Icon, label, ...tab }) => {
          const active = isActive({ to, ...tab })
          return (
            <li key={label} className="flex-1 basis-0">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`sambramo-bottom-nav-item flex h-full w-full flex-col items-center justify-center gap-1 min-h-[64px] py-2 rounded-xl transition-colors ${active ? 'is-active text-violet-800' : 'text-slate-400 active:text-violet-700'}`}
              >
                <span className={`sambramo-bottom-nav-icon flex items-center justify-center h-8 w-11 rounded-full transition-all ${active ? 'bg-violet-100 text-violet-800' : ''}`}>
                  <Icon size={21} strokeWidth={active ? 2.5 : 1.9} />
                </span>
                <span className={`whitespace-nowrap text-[10px] leading-none ${active ? 'font-extrabold' : 'font-semibold'}`}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
