import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toCatalogId } from '../../data/occasionMap'
import { useAuth } from '../../context/AuthContext'
import {
  BRAND, EVENT_TYPE_EMOJIS, EVENT_TYPE_GRADIENTS,
  STATUS_ORDER, EVENT_STATUSES,
} from '../../config/sambramo'
import { formatDate } from '../../utils/format'
import { friendlyError } from '../../context/ToastContext'
import AppBar from '../../components/layout/AppBar'

/* ── Status messages shown to customers ────────────────────────── */
const STATUS_MESSAGES = {
  REQUEST_RECEIVED:           'We\'ve received your request. Our team is reviewing it.',
  UNDER_REVIEW:               'Your Sambramo coordinator is reviewing your requirements.',
  CONTACTING_VENDORS:         'We\'re reaching out to vendors on your behalf.',
  QUOTES_COLLECTED:           'We\'ve collected quotes from vendors. Preparing your plan!',
  PROPOSAL_PREPARED:          'Your celebration plan is being finalised.',
  PROPOSAL_SENT:              'Your celebration plan is ready to review! 🎉',
  CUSTOMER_REVIEW:            'Your celebration plan is ready to review! 🎉',
  CUSTOMER_CHANGES_REQUESTED: 'We\'re working on your requested changes.',
  APPROVED:                   'Your celebration is confirmed. Let\'s make it magical!',
  CONFIRMED:                  'Your celebration is confirmed. Let\'s make it magical!',
  IN_COORDINATION:            'Everything is coming together beautifully.',
  EVENT_DAY:                  'Today is your big day! Enjoy every moment. 🌟',
  COMPLETED:                  'What a beautiful celebration! Thank you for celebrating with us.',
  CANCELLED:                  'This event was cancelled. Reach out if you need help.',
}

/* ── Workflow progress bar ─────────────────────────────────────── */
function StatusProgress({ status }) {
  const steps      = STATUS_ORDER // omit COMPLETED from steps count
  const currentIdx = steps.indexOf(status)
  const pct        = status === 'COMPLETED'
    ? 100
    : currentIdx < 0
      ? 0
      : Math.round(((currentIdx + 1) / steps.length) * 100)

  const label = EVENT_STATUSES[status]?.label ?? status

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px] font-medium text-gray-500">
        <span>Submitted</span>
        <span className="text-saffron-600 font-semibold">{label}</span>
        <span>Completed</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #7c3aed, #f59e0b)',
          }}
        />
      </div>
    </div>
  )
}

/* ── Event card ────────────────────────────────────────────────── */
function EventCard({ event }) {
  const navigate = useNavigate()

  const emoji     = EVENT_TYPE_EMOJIS[event.event_type] ?? '🎉'
  const gradient  = EVENT_TYPE_GRADIENTS[event.event_type] ?? 'from-indigo-500 to-purple-600'
  const message   = STATUS_MESSAGES[event.status] ?? 'Your Sambramo coordinator is on it.'
  const isAction  = ['PROPOSAL_SENT', 'CUSTOMER_REVIEW'].includes(event.status)
  const isDone    = event.status === 'COMPLETED'

  return (
    <div className="card overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${gradient} p-5 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="text-4xl drop-shadow-md">{emoji}</span>
            <h3 className="mt-2 text-white font-bold text-base leading-tight capitalize drop-shadow">
              {event.event_type?.replace(/-/g, ' ')}
            </h3>
          </div>
          <span className="shrink-0 font-mono text-xs bg-white/20 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
            #{event.event_code ?? event.id?.slice(0, 8)?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Info chips */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
          {event.event_date && (
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-gray-400" />
              {formatDate(event.event_date)}
            </span>
          )}
          {event.city && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />
              {event.city}
            </span>
          )}
          {event.guest_count && (
            <span className="flex items-center gap-1">
              <Users size={11} className="text-gray-400" />
              {event.guest_count} guests
            </span>
          )}
        </div>

        {/* Progress bar */}
        <StatusProgress status={event.status} />

        {/* Status message */}
        <p className={`text-xs leading-relaxed font-medium px-3 py-2 rounded-xl ${
          isAction
            ? 'bg-plum-50 text-plum-700'
            : isDone
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
        }`}>
          {message}
        </p>

        {/* CTA button */}
        <button
          // event_type holds a wizard id ('baby-shower'), while the catalog is
          // keyed by its own ('baby_shower') — so this used to route to a page
          // that rendered "Event not found". Occasions the catalog has no page
          // for fall back to its index rather than a dead URL.
          onClick={() => {
            const catalogId = toCatalogId(event.event_type)
            navigate(catalogId ? `/services/${catalogId}` : '/services')
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isAction
              ? 'bg-plum-600 text-white hover:bg-plum-700 shadow-md shadow-plum-200'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          {isAction ? 'Review Your Plan ✨' : 'View Celebration'}
          <ArrowRight size={14} />
        </button>

        {/* WhatsApp shortcut */}
        <a
          href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(`Hi Sambramo! I'd like an update on my celebration. Reference: ${event.event_code ?? event.id?.slice(0, 8)}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-green-700 font-medium hover:text-green-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Ask for an update on WhatsApp
        </a>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function MyEvents() {
  const { user, profile } = useAuth()
  const navigate          = useNavigate()

  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('events')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(friendlyError(err, "We couldn't load your celebrations just now."))
        else setEvents(data ?? [])
        setLoading(false)
      })
  }, [user?.id])

  // The bar renders in the loading state too. It used to be absent, so the
  // screen arrived with no title, no back control and no cart for however long
  // the query took, then the whole page jumped as the chrome appeared under it.
  const shell = children => (
    <div className="min-h-screen bg-cream pb-bottom-nav">
      <AppBar
        tone="plum"
        backTo="/dashboard/customer"
        title="My celebrations"
        subtitle={firstName ? `Welcome back, ${firstName}` : 'Everything we are arranging for you'}
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">{children}</div>
    </div>
  )

  if (loading) {
    return shell(
      <div className="space-y-4" aria-busy="true" aria-label="Loading your celebrations">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-36 animate-pulse bg-gray-100" />
        ))}
      </div>
    )
  }

  return shell(
    <div className="space-y-6">
        <h1 className="sr-only">My celebrations</h1>

        {/* Error */}
        {error && (
          <div className="card p-4 border-red-100 bg-red-50 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Plan a New Celebration CTA */}
        <div
          className="relative rounded-2xl p-6 sm:p-8 overflow-hidden cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f59e0b 100%)' }}
          onClick={() => navigate('/plan')}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform duration-300 shrink-0">✨</div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg sm:text-xl leading-tight">
                Plan a New Celebration
              </h2>
              <p className="text-white/75 text-sm mt-1">Tell us your dream — we'll handle the rest.</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); navigate('/plan') }}
              className="btn-cta self-start sm:self-center shrink-0"
            >
              <Sparkles size={14} /> Start Planning
            </button>
          </div>
        </div>

        {/* Events grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Your Celebrations
            {events.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({events.length})</span>
            )}
          </h2>

          {events.length === 0 ? (
            <div className="card py-16 px-6 text-center space-y-5">
              <div className="text-6xl">✨</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Your next celebration could start here.</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                  Every magical moment begins with a request. Let us plan something unforgettable for you.
                </p>
              </div>
              <button
                onClick={() => navigate('/plan')}
                className="btn-cta mx-auto"
              >
                <Sparkles size={15} /> Plan My Celebration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {events.map(ev => <EventCard key={ev.id} event={ev} />)}
            </div>
          )}
        </div>

      </div>
  )
}
