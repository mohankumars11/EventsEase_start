import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AuthCallbackPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (user && profile) {
      const role = profile.role
      if (role === 'vendor')     navigate('/dashboard/vendor',   { replace: true })
      else if (role === 'admin') navigate('/dashboard/admin',    { replace: true })
      else                       navigate('/dashboard/customer', { replace: true })
    } else if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, profile, loading])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-4 border-plum-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-600">Signing you in…</p>
        <p className="text-xs text-gray-400">Please wait a moment</p>
      </div>
    </div>
  )
}
