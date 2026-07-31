import { Link, useLocation } from 'react-router-dom'
import { Home, Search, ClipboardList, ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const TABS = [
  { label: 'Home',     icon: Home,          path: '/dashboard/customer'          },
  { label: 'Browse',   icon: Search,        path: '/dashboard/customer/browse'   },
  { label: 'Bookings', icon: ClipboardList, path: '/dashboard/customer/bookings' },
  { label: 'Cart',     icon: ShoppingCart,  path: '/dashboard/customer/cart'     },
]

export default function CustomerLayout({ children }) {
  const { pathname } = useLocation()
  const { totalCount } = useCart()

  function isActive(path) {
    if (path === '/dashboard/customer') return pathname === path
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Desktop sub-nav */}
      <div className="hidden md:block bg-white border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-6 flex">
          {TABS.map(({ label, icon: Icon, path }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors relative ${
                isActive(path)
                  ? 'border-marigold-500 text-marigold-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} /> {label}
              {label === 'Cart' && totalCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {totalCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Content with bottom clearance for mobile nav */}
      <div className="pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-orange-100 shadow-lg z-40">
        <div className="flex h-full">
          {TABS.map(({ label, icon: Icon, path }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative ${
                  active ? 'text-marigold-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {label === 'Cart' && totalCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {totalCount > 9 ? '9+' : totalCount}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
