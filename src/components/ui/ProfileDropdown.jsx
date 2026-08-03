import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, ClipboardList, LogOut, ChevronDown, User, Star } from 'lucide-react'

export default function ProfileDropdown({ profile, onSignOut, dashboardLink }) {
  const [open, setOpen]         = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref                     = useRef(null)
  const navigate                = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try { await onSignOut(); navigate('/') }
    finally { setSigningOut(false); setOpen(false) }
  }

  const initials = profile?.full_name
    ? profile.full_name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null

  const isCustomer = profile?.role === 'customer'
  const isAdmin    = profile?.role === 'admin'
  const isVendor   = profile?.role === 'vendor'

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Account'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-plum-800 transition-colors group"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-saffron-400 flex items-center justify-center text-plum-950 text-sm font-bold font-display ring-2 ring-plum-700">
          {initials ?? <User size={14} />}
        </div>
        <span className="text-sm text-white font-medium hidden sm:block">{firstName}</span>
        <ChevronDown
          size={14}
          className={`text-plum-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <div
        className="absolute right-0 mt-2 w-64 z-[100] transition-all duration-150 origin-top-right"
        style={{
          opacity:       open ? 1 : 0,
          transform:     open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-6px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
      >
        <div className="bg-plum-900 rounded-2xl shadow-2xl border border-plum-700 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-br from-plum-800 to-plum-900 border-b border-plum-700">
            <div className="w-10 h-10 rounded-full bg-saffron-400 flex items-center justify-center text-plum-950 font-bold text-base font-display ring-2 ring-plum-600">
              {initials ?? <User size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {profile?.full_name ?? 'My Account'}
              </p>
              <p className="text-xs text-plum-400 truncate">{profile?.email}</p>
              {profile?.role && (
                <span className="inline-block mt-0.5 text-[10px] font-semibold text-saffron-300 bg-saffron-400/10 px-1.5 py-0.5 rounded-full capitalize">
                  {profile.role}
                </span>
              )}
            </div>
          </div>

          {/* Menu */}
          <nav className="py-1.5">
            <Item to={dashboardLink} icon={<LayoutDashboard size={15} />} label="Dashboard" onClick={() => setOpen(false)} />

            {isCustomer && (
              <>
                <Item to="/dashboard/customer/events" icon={<Calendar size={15} />} label="My Celebrations" onClick={() => setOpen(false)} />
                <Item to="/dashboard/customer/requests" icon={<ClipboardList size={15} />} label="My Requests" onClick={() => setOpen(false)} />
              </>
            )}
            {isAdmin && (
              <Item to="/dashboard/admin" icon={<Star size={15} />} label="Operations" onClick={() => setOpen(false)} />
            )}
            {isVendor && (
              <Item to="/dashboard/vendor" icon={<Star size={15} />} label="My Dashboard" onClick={() => setOpen(false)} />
            )}
          </nav>

          <div className="border-t border-plum-700 mx-3" />

          <div className="py-1.5">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-plum-800 transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Item({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-plum-200 hover:bg-plum-800 hover:text-white transition-colors"
      role="menuitem"
    >
      <span className="text-plum-400">{icon}</span>
      {label}
    </Link>
  )
}
