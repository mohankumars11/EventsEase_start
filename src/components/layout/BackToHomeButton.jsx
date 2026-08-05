import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * A real back control, not a fixed "Back to Home" link.
 *
 * The old version always pointed at the role's home page, so browsing
 * Shop → Cakes → a product and tapping back threw you all the way out to
 * the dashboard instead of returning to Cakes. It also rendered on the
 * home page's own children and on auth screens, adding a stray link above
 * content that already had its own navigation.
 *
 * Now it steps back through history when there's somewhere to go back to,
 * and only falls back to home on a cold entry (shared link, refresh).
 */
export default function BackToHomeButton() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const homePath = profile?.role === 'vendor' ? '/dashboard/vendor'
    : profile?.role === 'admin' ? '/dashboard/admin'
    : profile?.role === 'customer' ? '/dashboard/customer'
    : '/'

  if (pathname === homePath || pathname === '/') return null

  // history.state.idx is React Router's own position counter; 0 means this
  // entry is the first in the session, so there is nothing behind it.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  const className = 'inline-flex items-center gap-1.5 -ml-1 px-2 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-plum-700 hover:bg-plum-50 transition-colors'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
      {canGoBack ? (
        <button onClick={() => navigate(-1)} className={className}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <Link to={homePath} className={className}>
          <ArrowLeft size={16} /> Home
        </Link>
      )}
    </div>
  )
}
