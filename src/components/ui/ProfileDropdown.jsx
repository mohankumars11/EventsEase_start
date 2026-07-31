import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarCheck, Settings, LogOut, ChevronDown, User } from 'lucide-react'

/**
 * ProfileDropdown
 *
 * Props:
 *   profile       — user profile object { full_name, email, role }
 *   onSignOut     — async function to sign the user out
 *   dashboardLink — path to the user's dashboard (e.g. "/dashboard/customer")
 */
export default function ProfileDropdown({ profile, onSignOut, dashboardLink }) {
  const [open, setOpen]   = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref               = useRef(null)
  const navigate          = useNavigate()

  /* ── Close on outside click ────────────────────────── */
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* ── Close on Escape ───────────────────────────────── */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await onSignOut()
      navigate('/')
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  /* ── Avatar helpers ────────────────────────────────── */
  const initials = profile?.full_name
    ? profile.full_name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null

  const avatarColors = [
    'bg-marigold-500', 'bg-crimson-600', 'bg-indigo-500',
    'bg-emerald-500',  'bg-violet-500',  'bg-rose-500',
  ]
  const colorIndex = (profile?.full_name?.charCodeAt(0) ?? 0) % avatarColors.length
  const avatarBg   = avatarColors[colorIndex]

  const isCustomer = profile?.role === 'customer'
  const isVendor   = profile?.role === 'vendor'

  return (
    <div className="relative" ref={ref}>
      {/* ── Avatar trigger button ─────────────────────── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-orange-50 transition-colors duration-150 group"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarBg} ring-2 ring-white shadow-sm`}
        >
          {initials ?? <User size={14} />}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown panel ────────────────────────────── */}
      <div
        className="absolute right-0 mt-2 w-64 z-[100] transition-all duration-150 origin-top-right"
        style={{
          opacity:          open ? 1 : 0,
          transform:        open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-6px)',
          pointerEvents:    open ? 'auto' : 'none',
        }}
        role="menu"
        aria-orientation="vertical"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">

          {/* ── User header ─────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base ${avatarBg} ring-2 ring-white shadow`}
            >
              {initials ?? <User size={16} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {profile?.full_name ?? 'My Account'}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              {profile?.role && (
                <span className="inline-block mt-0.5 text-[10px] font-medium text-marigold-700 bg-marigold-100 px-1.5 py-0.5 rounded-full capitalize">
                  {profile.role}
                </span>
              )}
            </div>
          </div>

          {/* ── Menu items ──────────────────────────── */}
          <nav className="py-1" role="menu">
            <DropdownItem
              to={dashboardLink}
              icon={<LayoutDashboard size={15} />}
              label="My Dashboard"
              onClick={() => setOpen(false)}
            />

            {isCustomer && (
              <DropdownItem
                to="/dashboard/customer/bookings"
                icon={<CalendarCheck size={15} />}
                label="My Bookings"
                onClick={() => setOpen(false)}
              />
            )}

            {isVendor && (
              <DropdownItem
                to="/dashboard/vendor"
                icon={<CalendarCheck size={15} />}
                label="My Inquiries"
                onClick={() => setOpen(false)}
              />
            )}

            <DropdownItem
              to="#"
              icon={<Settings size={15} />}
              label="Settings"
              onClick={() => setOpen(false)}
              muted
            />
          </nav>

          {/* ── Divider ─────────────────────────────── */}
          <div className="border-t border-gray-100 mx-3" />

          {/* ── Sign out ────────────────────────────── */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-crimson-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              role="menuitem"
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

/* ── Small internal component ─────────────────────────── */
function DropdownItem({ to, icon, label, onClick, muted = false }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        muted
          ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          : 'text-gray-700 hover:bg-orange-50 hover:text-marigold-700'
      }`}
      role="menuitem"
    >
      <span className={muted ? 'text-gray-400' : 'text-gray-500'}>{icon}</span>
      {label}
    </Link>
  )
}
