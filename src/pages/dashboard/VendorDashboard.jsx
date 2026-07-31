import { ImagePlus, ClipboardList, Star, TrendingUp, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const QUICK_ACTIONS = [
  {
    title:    'Complete your profile',
    desc:     'Add photos, description & pricing',
    icon:     ImagePlus,
    color:    'bg-marigold-50 text-marigold-600',
    badge:    'Important',
    badgeColor: 'bg-crimson-100 text-crimson-600',
  },
  {
    title:    'View enquiries',
    desc:     'Respond to customer booking requests',
    icon:     ClipboardList,
    color:    'bg-blue-50 text-blue-600',
    badge:    null,
  },
  {
    title:    'My reviews',
    desc:     'See what customers are saying',
    icon:     Star,
    color:    'bg-yellow-50 text-yellow-600',
    badge:    null,
  },
  {
    title:    'Upgrade plan',
    desc:     'Get featured and reach more customers',
    icon:     TrendingUp,
    color:    'bg-green-50 text-green-600',
    badge:    'Free now',
    badgeColor: 'bg-green-100 text-green-700',
  },
]

const ONBOARDING_STEPS = [
  { label: 'Create account',         done: true  },
  { label: 'Complete business profile', done: false },
  { label: 'Upload portfolio photos', done: false },
  { label: 'Set pricing & availability', done: false },
  { label: 'Get first enquiry',       done: false },
]

const PLAN_FEATURES = [
  { plan: 'Free',   price: '₹0/mo',   features: ['Listed in search', 'Up to 3 photos', 'Receive 5 enquiries/mo'] },
  { plan: 'Growth', price: '₹499/mo', features: ['Priority listing', 'Up to 15 photos', 'Unlimited enquiries', 'Featured badge'] },
  { plan: 'Pro',    price: '₹999/mo', features: ['Top of search', 'Unlimited photos', 'Unlimited enquiries', 'Featured + Verified badge', 'Analytics'] },
]

export default function VendorDashboard() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const completedSteps = ONBOARDING_STEPS.filter(s => s.done).length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName} 🏪</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your vendor dashboard — manage your profile, enquiries, and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            Vendor account
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
            Free plan
          </span>
        </div>
      </div>

      {/* Onboarding checklist */}
      <section className="card p-6 border-marigold-200 bg-marigold-50/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Get your profile ready</h2>
          <span className="text-xs font-semibold text-marigold-700">{completedSteps}/{ONBOARDING_STEPS.length} done</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-marigold-100 rounded-full h-2 mb-5">
          <div
            className="bg-marigold-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedSteps / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2.5">
          {ONBOARDING_STEPS.map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-3 text-sm ${done ? 'text-gray-500' : 'text-gray-800'}`}>
              {done
                ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                : <AlertCircle  size={16} className="text-marigold-400 shrink-0" />
              }
              <span className={done ? 'line-through' : ''}>{label}</span>
              {!done && (
                <span className="ml-auto text-xs px-2 py-0.5 bg-marigold-100 text-marigold-700 rounded-full cursor-not-allowed opacity-60">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_ACTIONS.map(({ title, desc, icon: Icon, color, badge, badgeColor }) => (
            <div key={title} className="card p-5 flex items-center gap-4 opacity-70 cursor-not-allowed">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{title}</span>
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Full vendor tools coming soon</p>
      </section>

      {/* Stats placeholder */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Your stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Profile views', value: '—' },
            { label: 'Enquiries',     value: '0'  },
            { label: 'Bookings',      value: '0'  },
            { label: 'Avg. rating',   value: '—'  },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-700 mb-1">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Subscription plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLAN_FEATURES.map(({ plan, price, features }) => (
            <div key={plan} className={`card p-5 ${plan === 'Growth' ? 'border-marigold-400 ring-2 ring-marigold-200' : ''}`}>
              {plan === 'Growth' && (
                <span className="inline-block text-xs font-bold bg-marigold-500 text-white px-2 py-0.5 rounded-full mb-3">
                  Popular
                </span>
              )}
              <div className="font-bold text-gray-900 text-lg">{plan}</div>
              <div className="text-marigold-600 font-semibold mt-1 mb-4">{price}</div>
              <ul className="space-y-1.5">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button disabled className="btn-secondary w-full mt-5 text-xs opacity-50 cursor-not-allowed">
                {plan === 'Free' ? 'Current plan' : 'Upgrade — coming soon'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Profile snippet */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Account details</h2>
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
            <span className="text-gray-400">Phone</span>
            <span className="font-medium text-gray-800">+91 {profile?.phone ?? '—'}</span>
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
