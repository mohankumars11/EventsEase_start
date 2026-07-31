import { CalendarCheck, Search, Star, Bell, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const QUICK_ACTIONS = [
  {
    title:    'Browse vendors',
    desc:     'Explore verified vendors in your city',
    icon:     Search,
    color:    'bg-blue-50 text-blue-600',
    href:     '#',
    disabled: true,
  },
  {
    title:    'Plan an event',
    desc:     'Start a new event booking enquiry',
    icon:     CalendarCheck,
    color:    'bg-marigold-50 text-marigold-600',
    href:     '#',
    disabled: true,
  },
  {
    title:    'My bookings',
    desc:     'Track all your current bookings',
    icon:     Bell,
    color:    'bg-purple-50 text-purple-600',
    href:     '#',
    disabled: true,
  },
  {
    title:    'Write a review',
    desc:     'Share your experience with a vendor',
    icon:     Star,
    color:    'bg-green-50 text-green-600',
    href:     '#',
    disabled: true,
  },
]

const UPCOMING_EVENTS = [
  { emoji: '🎂', name: 'Birthday Party' },
  { emoji: '👶', name: 'Baby Shower'   },
  { emoji: '💍', name: 'Anniversary'   },
  { emoji: '🏠', name: 'Housewarming'  },
]

export default function CustomerDashboard() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hello, {firstName} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">
            What are we celebrating? Let's find the perfect vendors for your next event.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-marigold-100 text-marigold-700 rounded-full text-xs font-semibold self-start sm:self-auto">
          Customer account
        </span>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_ACTIONS.map(({ title, desc, icon: Icon, color, href, disabled }) => (
            <div
              key={title}
              className={`card p-5 flex items-center gap-4 transition-all ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Start planning CTA */}
      <section className="card bg-gradient-to-r from-marigold-50 to-orange-50 border-marigold-200 p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg mb-1">Ready to start planning?</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Choose an event type, set your date and budget, and we'll connect you with the best vendors near you.
          </p>
        </div>
        <button disabled className="btn-primary shrink-0 opacity-60 cursor-not-allowed">
          Find vendors — coming soon
        </button>
      </section>

      {/* Event types teaser */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Popular events near you</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {UPCOMING_EVENTS.map(({ emoji, name }) => (
            <div key={name} className="card p-4 text-center hover:shadow-md transition-shadow cursor-not-allowed opacity-70">
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-xs font-semibold text-gray-700">{name}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Vendor browse & booking coming soon</p>
      </section>

      {/* Profile snippet */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your profile</h2>
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
