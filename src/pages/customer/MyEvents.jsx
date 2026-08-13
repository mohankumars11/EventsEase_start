import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sparkles, Calendar, MapPin, Users, ArrowRight, Clock3, Hash, Phone,
  ShieldCheck, AlertTriangle, ListChecks, Inbox,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../config/sambramo'
import { fetchCelebrations, isLive, needsYou, JOURNEY } from '../../lib/celebrations'
import { formatDate, formatINR } from '../../utils/format'
import AppBar from '../../components/layout/AppBar'

/**
 * My celebrations — every request, from every door, in one place.
 *
 * This page used to read the `events` table alone, which meant it could only
 * ever show requests raised through the six-step wizard. A celebration built in
 * /plan/build or sent from the services cart writes to `service_enquiries`, so
 * it landed in the database, went to a coordinator, and was invisible here —
 * the customer saw "you have no celebrations yet" on a screen whose whole job
 * is to prove otherwise. See lib/celebrations.js for the join.
 *
 * The grouping is by who is holding the request, not by table and not by date:
 * things waiting on the customer first, because that is the only group with an
 * action in it, then everything in progress, then the archive.
 */

/* ── Filters ───────────────────────────────────────────────────────── */
const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'live',   label: 'In progress' },
  { id: 'action', label: 'Needs you' },
  { id: 'past',   label: 'Past' },
]

/* ── The journey bar ───────────────────────────────────────────────── */
function JourneyBar({ celebration }) {
  const { stage, progress, stageLabel } = celebration
  const cancelled = stage === 'cancelled'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-gray-500">
        <span>Raised</span>
        <span className={`font-bold ${cancelled ? 'text-red-600' : 'text-saffron-600'}`}>
          {stageLabel}
        </span>
        <span>Celebrated</span>
      </div>
      <div
        className="h-1.5 bg-gray-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${stageLabel}`}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${cancelled ? 100 : progress}%`,
            background: cancelled
              ? 'linear-gradient(90deg,#f87171,#dc2626)'
              : progress >= 100
                ? 'linear-gradient(90deg,#10b981,#059669)'
                : 'linear-gradient(90deg,#7c3aed,#f59e0b)',
          }}
        />
      </div>
      {/* The named stops, so "60%" means something. Hidden on the narrowest
          phones, where five labels across 320px is illegible rather than
          informative. */}
      <div className="hidden min-[380px]:flex justify-between gap-1">
        {JOURNEY.map((s, i) => {
          const reached = !cancelled && progress >= Math.round(((i + 1) / JOURNEY.length) * 100)
          return (
            <span
              key={s.key}
              className={`text-[9px] leading-tight text-center flex-1 ${
                reached ? 'text-plum-600 font-semibold' : 'text-gray-300'
              }`}
            >
              {s.label.split(' ')[0]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ── One celebration ───────────────────────────────────────────────── */
function CelebrationCard({ celebration: c }) {
  const navigate = useNavigate()
  const action = needsYou(c)
  const done = c.stage === 'done'
  const cancelled = c.stage === 'cancelled'

  const whatsapp = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
    `Hi Sambramo! I'd like an update on my celebration. Reference: ${c.reference}.`
  )}`

  return (
    <article className={`card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
      action ? 'ring-2 ring-saffron-400' : ''
    }`}>
      {/* Header */}
      <div className={`bg-gradient-to-br ${c.gradient} p-5 relative overflow-hidden ${cancelled ? 'grayscale' : ''}`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-4xl drop-shadow-md">{c.emoji}</span>
            <h3 className="mt-2 text-white font-bold text-base leading-tight capitalize drop-shadow">
              {c.title}
            </h3>
            {/* Which door this came through. A customer who used the builder
                and the wizard in the same week has two rows that would
                otherwise be indistinguishable. */}
            <p className="mt-0.5 text-[11px] text-white/70">{c.source}</p>
          </div>
          <span className="shrink-0 font-mono text-[11px] bg-white/20 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
            {c.reference}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Every date this request carries ──────────────────────────
            When it was raised is as much a fact of the request as when the
            event is, and it is the one the customer uses to decide whether
            it is fair to chase us yet. It was previously recorded and never
            shown. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock3 size={11} className="text-gray-400" />
            Raised {formatDate(c.raisedAt)}
          </span>
          {c.eventDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-gray-400" />
              {formatDate(c.eventDate)}
              {c.timeSlot ? ` · ${String(c.timeSlot).replace(/_/g, ' ')}` : ''}
            </span>
          )}
          {c.city && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />{c.city}
            </span>
          )}
          {c.guestCount && (
            <span className="flex items-center gap-1">
              <Users size={11} className="text-gray-400" />{c.guestCount} guests
            </span>
          )}
          {c.lineCount > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks size={11} className="text-gray-400" />{c.lineCount} item{c.lineCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* The number we quoted, if there is one */}
        {(c.quoted || c.estimate) && (
          <p className="text-sm font-bold text-gray-900">
            {c.quoted
              ? <>Quoted <span className="text-plum-700">{formatINR(c.quoted)}</span></>
              : <>Estimated <span className="text-plum-700">
                  {formatINR(c.estimate.low)}
                  {c.estimate.high !== c.estimate.low ? ` – ${formatINR(c.estimate.high)}` : ''}
                </span></>}
          </p>
        )}

        <JourneyBar celebration={c} />

        <p className={`text-xs leading-relaxed font-medium px-3 py-2 rounded-xl ${
          cancelled ? 'bg-red-50 text-red-700'
            : action ? 'bg-plum-50 text-plum-700'
              : done ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
        }`}>
          {c.message}
          {cancelled && c.cancelReason ? ` — ${c.cancelReason}` : ''}
        </p>

        {/* The hold, when one was claimed */}
        {c.lockStatus === 'claimed' && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            <span>
              <strong>{formatINR(c.lockAmount ?? 0)} hold recorded.</strong> A person is matching it
              against the bank — you'll get a message once it is confirmed.
            </span>
          </p>
        )}
        {c.lockStatus === 'confirmed' && (
          <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] leading-relaxed text-green-800">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            <span><strong>Your date is held.</strong> Adjusted against your final invoice.</span>
          </p>
        )}

        {/* How we will reach them, stated back. Somebody who mistyped a digit
            can only find out here — nothing else in the app shows them the
            number the coordinator is about to ring. */}
        {c.contact.phone ? (
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Phone size={11} /> We'll call you on {c.contact.phone}
          </p>
        ) : (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>
              No phone number on this request — message us on WhatsApp so a coordinator can reach you.
            </span>
          </p>
        )}

        <button
          onClick={() => navigate(c.href)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            action
              ? 'bg-plum-600 text-white hover:bg-plum-700 shadow-md shadow-plum-200'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          {action ? 'Review your plan ✨' : 'Open this celebration'}
          <ArrowRight size={14} />
        </button>

        <a
          href={whatsapp}
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
    </article>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function MyEvents() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [celebrations, setCelebrations] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const load = useCallback(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    fetchCelebrations(user.id).then(res => {
      if (cancelled) return
      setCelebrations(res.celebrations)
      setErrors(res.errors)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => load(), [load])

  const counts = useMemo(() => ({
    all:    celebrations.length,
    live:   celebrations.filter(isLive).length,
    action: celebrations.filter(needsYou).length,
    past:   celebrations.filter(c => !isLive(c)).length,
  }), [celebrations])

  const shown = useMemo(() => {
    if (filter === 'live')   return celebrations.filter(isLive)
    if (filter === 'action') return celebrations.filter(needsYou)
    if (filter === 'past')   return celebrations.filter(c => !isLive(c))
    return celebrations
  }, [celebrations, filter])

  const shell = children => (
    <div className="min-h-screen bg-cream pb-bottom-nav">
      <AppBar
        tone="plum"
        backTo="/dashboard/customer"
        title="My celebrations"
        subtitle={`Welcome back, ${firstName}`}
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

      {/* A half-loaded list is worse than a named failure — see
          lib/celebrations.js. */}
      {errors.map(({ source, error }) => (
        <div key={source} className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium">
          We couldn't load your {source} just now ({error.message}). Everything else is below —
          pull down to retry, or message us if something you sent is missing.
        </div>
      ))}

      {/* Needs-you banner. The one interruption this page earns. */}
      {counts.action > 0 && filter !== 'action' && (
        <button
          onClick={() => setFilter('action')}
          className="w-full flex items-center gap-3 rounded-2xl border border-saffron-300 bg-saffron-50 px-4 py-3 text-left transition-colors hover:border-saffron-400"
        >
          <Sparkles size={18} className="shrink-0 text-saffron-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-plum-900">
              {counts.action} plan{counts.action === 1 ? '' : 's'} waiting for you
            </span>
            <span className="block text-xs text-plum-600">Tap to see what needs your yes.</span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-saffron-600" />
        </button>
      )}

      {/* Plan a new celebration */}
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
            <h2 className="text-white font-bold text-lg sm:text-xl leading-tight">Plan a New Celebration</h2>
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

      {/* Filters. Only once there is enough to be worth filtering. */}
      {counts.all > 1 && (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`shrink-0 min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-plum-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-plum-300'
              }`}
            >
              {f.label}
              <span className={filter === f.id ? 'ml-1.5 text-white/60' : 'ml-1.5 text-gray-400'}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Your Celebrations
          {shown.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({shown.length})</span>
          )}
        </h2>

        {shown.length === 0 ? (
          counts.all === 0 ? (
            <div className="card py-16 px-6 text-center space-y-5">
              <div className="text-6xl">✨</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Your next celebration could start here.</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                  Every magical moment begins with a request. Let us plan something unforgettable for you.
                </p>
              </div>
              <button onClick={() => navigate('/plan')} className="btn-cta mx-auto">
                <Sparkles size={15} /> Plan My Celebration
              </button>
            </div>
          ) : (
            <div className="card py-12 px-6 text-center space-y-3">
              <Inbox size={32} className="mx-auto text-gray-300" />
              <p className="text-sm text-gray-500">Nothing in this list right now.</p>
              <button
                onClick={() => setFilter('all')}
                className="text-sm font-semibold text-plum-700 hover:text-plum-800"
              >
                Show all {counts.all}
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {shown.map(c => <CelebrationCard key={c.key} celebration={c} />)}
          </div>
        )}
      </div>

      {/* The other list is still its own page — it carries per-line reviews,
          cancellation and the price hold, none of which belong on a summary
          card. Linked rather than duplicated. */}
      <p className="text-center text-xs text-gray-400">
        Looking for line-by-line detail, reviews or cancellation?{' '}
        <Link to="/dashboard/customer/requests" className="font-semibold text-plum-600 hover:text-plum-700">
          Open My requests
        </Link>
        <span className="mx-1.5">·</span>
        <Hash size={11} className="inline -mt-0.5" /> quote your reference when you message us
      </p>
    </div>
  )
}
