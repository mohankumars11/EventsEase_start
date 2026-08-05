import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function BackToHomeButton() {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const homePath = profile?.role === 'vendor' ? '/dashboard/vendor'
    : profile?.role === 'admin' ? '/dashboard/admin'
    : profile?.role === 'customer' ? '/dashboard/customer'
    : '/'

  if (pathname === homePath) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
      <Link
        to={homePath}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Home
      </Link>
    </div>
  )
}
