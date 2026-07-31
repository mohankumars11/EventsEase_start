import { Users, Store, CalendarCheck, TrendingUp, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const STAT_CARDS = [
  { label: 'Total customers',  value: '—', icon: Users,         color: 'bg-blue-50   text-blue-600'   },
  { label: 'Total vendors',    value: '—', icon: Store,         color: 'bg-marigold-50 text-marigold-600' },
  { label: 'Active bookings',  value: '—', icon: CalendarCheck, color: 'bg-green-50  text-green-600'  },
  { label: 'Revenue (est.)',   value: '—', icon: TrendingUp,    color: 'bg-purple-50 text-purple-600' },
]

const ADMIN_SECTIONS = [
  {
    title:   'Vendor approvals',
    desc:    'Review and verify vendor applications',
    icon:    ShieldCheck,
    badge:   '0 pending',
    color:   'bg-marigold-50 text-marigold-600',
  },
  {
    title:   'Reported issues',
    desc:    'Customer & vendor support tickets',
    icon:    AlertTriangle,
    badge:   '0 open',
    color:   'bg-red-50 text-red-500',
  },
  {
    title:   'Manage users',
    desc:    'View, suspend, or promote users',
    icon:    Users,
    badge:   null,
    color:   'bg-blue-50 text-blue-600',
  },
  {
    title:   'Booking oversight',
    desc:    'Monitor all platform bookings',
    icon:    CalendarCheck,
    badge:   null,
    color:   'bg-green-50 text-green-600',
  },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin panel</h1>
          <p className="text-gray-500 text-sm mt-1">Hi {firstName} — here's a platform overview.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-crimson-100 text-crimson-700 rounded-full text-xs font-semibold self-start sm:self-auto">
          Admin access
        </span>
      </div>

      {/* Stat cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Platform overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-0.5">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin sections */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_SECTIONS.map(({ title, desc, icon: Icon, badge, color }) => (
            <div key={title} className="card p-5 flex items-center gap-4 opacity-70 cursor-not-allowed">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{title}</span>
                  {badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{badge}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Admin management tools coming soon</p>
      </section>

      {/* Quick DB info */}
      <section className="card p-6 bg-gray-900 border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Assign admin role</h2>
        <p className="text-sm text-gray-300 leading-relaxed mb-3">
          To grant admin access to a user, run this SQL in your Supabase dashboard:
        </p>
        <pre className="bg-gray-800 rounded-xl p-4 text-xs text-green-400 overflow-x-auto font-mono">
{`UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';`}
        </pre>
      </section>

      {/* Account details */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Name</span>
            <span className="font-medium text-gray-800">{profile?.full_name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Email</span>
            <span className="font-medium text-gray-800 truncate">{profile?.email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Role</span>
            <span className="font-medium text-crimson-600">admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">City</span>
            <span className="font-medium text-gray-800">{profile?.city ?? '—'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
