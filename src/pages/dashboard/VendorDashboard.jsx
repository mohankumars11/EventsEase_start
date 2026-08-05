import { ImagePlus, ClipboardList, Star, TrendingUp, ChevronRight, CheckCircle2, AlertCircle, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'

// Every card and plan button on this page used to be `disabled` with
// `cursor-not-allowed` — seven controls a vendor could see, want, and
// never press, under a "coming soon" caption. Sambramo runs a
// human-assisted concierge model today, so the honest version of each of
// these actions is a real conversation with the team. Each now opens
// WhatsApp with the request already written, which is exactly how the
// business services vendors right now.
function whatsappHref(message) {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
}

const QUICK_ACTIONS = [
  {
    title:    'Complete your profile',
    desc:     'Send us photos, description & pricing — we set it up for you',
    icon:     ImagePlus,
    color:    'bg-saffron-50 text-saffron-600',
    badge:    'Important',
    badgeColor: 'bg-crimson-100 text-crimson-600',
    message:  "Hi Sambramo — I'd like to complete my vendor profile. I have photos, pricing and a description ready.",
  },
  {
    title:    'View enquiries',
    desc:     'Ask the team for any customer requests waiting on you',
    icon:     ClipboardList,
    color:    'bg-blue-50 text-blue-600',
    badge:    null,
    message:  'Hi Sambramo — are there any customer enquiries waiting for my business?',
  },
  {
    title:    'My reviews',
    desc:     'Hear what customers said about your last events',
    icon:     Star,
    color:    'bg-yellow-50 text-yellow-600',
    badge:    null,
    message:  'Hi Sambramo — could you share the customer feedback from my recent events?',
  },
  {
    title:    'Upgrade plan',
    desc:     'Get featured and reach more customers',
    icon:     TrendingUp,
    color:    'bg-green-50 text-green-600',
    badge:    'Free now',
    badgeColor: 'bg-green-100 text-green-700',
    message:  "Hi Sambramo — I'd like to hear about upgrading my vendor plan.",
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
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const businessName = profile?.business_name ?? profile?.company_name ?? profile?.full_name ?? 'Your Business'
  const completedSteps = ONBOARDING_STEPS.filter(s => s.done).length

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName} 🏪</h1>
          <p className="text-plum-700 font-semibold text-base mt-0.5">{businessName}</p>
          <p className="text-gray-500 text-sm mt-1">
            Your Sambramo vendor dashboard — manage your profile, enquiries, and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-plum-100 text-plum-700 rounded-full text-xs font-semibold">
            Vendor account
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
            Free plan
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-full text-xs font-semibold transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      {/* Onboarding checklist */}
      <section className="card p-6 border-saffron-200 bg-saffron-50/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Get your profile ready</h2>
          <span className="text-xs font-semibold text-saffron-700">{completedSteps}/{ONBOARDING_STEPS.length} done</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-saffron-100 rounded-full h-2 mb-5">
          <div
            className="bg-saffron-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedSteps / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2.5">
          {ONBOARDING_STEPS.map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-3 text-sm ${done ? 'text-gray-500' : 'text-gray-800'}`}>
              {done
                ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                : <AlertCircle  size={16} className="text-saffron-400 shrink-0" />
              }
              <span className={done ? 'line-through' : ''}>{label}</span>
              {!done && (
                <span className="ml-auto text-xs px-2 py-0.5 bg-saffron-100 text-saffron-700 rounded-full cursor-not-allowed opacity-60">
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
          {QUICK_ACTIONS.map(({ title, desc, icon: Icon, color, badge, badgeColor, message }) => (
            <a
              key={title}
              href={whatsappHref(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-5 flex items-center gap-4 hover:border-plum-200 hover:shadow-md transition-all group"
            >
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
              <ChevronRight size={16} className="text-gray-300 group-hover:text-plum-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Self-serve vendor tools are on the way — until then your Sambramo coordinator handles these directly on WhatsApp.
        </p>
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
            <div key={plan} className={`card p-5 ${plan === 'Growth' ? 'border-saffron-400 ring-2 ring-saffron-200' : ''}`}>
              {plan === 'Growth' && (
                <span className="inline-block text-xs font-bold bg-saffron-500 text-white px-2 py-0.5 rounded-full mb-3">
                  Popular
                </span>
              )}
              <div className="font-bold text-gray-900 text-lg">{plan}</div>
              <div className="text-saffron-600 font-semibold mt-1 mb-4">{price}</div>
              <ul className="space-y-1.5">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan === 'Free' ? (
                <div className="w-full mt-5 text-xs font-semibold text-center text-gray-400 border border-gray-100 rounded-xl py-2.5">
                  Current plan
                </div>
              ) : (
                <a
                  href={whatsappHref(`Hi Sambramo — I'd like to upgrade my vendor plan to ${plan} (${price}).`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full mt-5 text-xs"
                >
                  Upgrade to {plan}
                </a>
              )}
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
