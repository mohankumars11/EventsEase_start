import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowRight, Sparkles, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_TYPES, EVENT_STATUSES, EVENT_TYPE_EMOJIS, STATUS_CSS, BRAND } from '../../config/sambramo'
import { FESTIVALS } from '../../data/festivals'
import { SHOP_CATEGORIES } from '../../config/shop'
import ProductImage from '../../components/shop/ProductImage'

const ACTIVE_STATUSES = ['REQUEST_RECEIVED','UNDER_REVIEW','CONTACTING_VENDORS','QUOTES_COLLECTED','PROPOSAL_PREPARED','PROPOSAL_SENT','CUSTOMER_REVIEW','APPROVED','CONFIRMED','IN_COORDINATION','EVENT_DAY']

export default function CustomerHome() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)

  const firstName = profile?.full_name?.split(' ')[0] ?? (user?.user_metadata?.name?.split(' ')[0]) ?? 'there'

  useEffect(() => {
    if (!user) return
    supabase
      .from('events')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { setEvents(data ?? []); setLoading(false) })
  }, [user])

  const activeEvents  = events.filter(e => ACTIVE_STATUSES.includes(e.status))
  const hasActive     = activeEvents.length > 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero greeting bar ─────────────────────────── */}
      <div className="bg-gradient-to-r from-plum-900 via-plum-800 to-plum-900 px-4 sm:px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-saffron-400 text-sm font-semibold mb-1">Welcome back</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Hello, {firstName}! ✨
            </h1>
            <p className="text-plum-300 text-sm mt-2">
              {hasActive
                ? `You have ${activeEvents.length} active celebration${activeEvents.length > 1 ? 's' : ''} in progress.`
                : 'Ready to plan your next unforgettable moment?'}
            </p>
          </div>
          <Link
            to="/plan"
            className="shrink-0 inline-flex items-center gap-2 bg-saffron-400 hover:bg-saffron-500 text-plum-950 font-bold px-6 py-3 rounded-2xl transition-all shadow-lg text-sm"
          >
            <Sparkles size={16} />
            Plan a Celebration
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Active celebrations ───────────────────────── */}
        {!loading && activeEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Active Celebrations</h2>
              <Link to="/dashboard/customer/events" className="text-sm text-plum-600 font-semibold hover:text-plum-700">
                View all →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeEvents.map(e => <ActiveEventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {/* ── Plan new / empty state ────────────────────── */}
        <section className="bg-gradient-to-br from-plum-900 to-plum-800 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-saffron-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-plum-600/30 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Plan Your Next Celebration
            </h2>
            <p className="text-plum-300 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Tell us what you're celebrating. Sambramo handles vendors, decoration, food, photography — everything.
            </p>
            <Link
              to="/plan"
              className="inline-flex items-center gap-2 bg-saffron-400 hover:bg-saffron-500 text-plum-950 font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg"
            >
              Start Planning <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* ── Celebration types ─────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">What are you celebrating?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {EVENT_TYPES.slice(0, 8).map(et => (
              <button
                key={et.id}
                onClick={() => navigate(`/plan?type=${et.id}`)}
                className="bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-plum-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{et.emoji}</div>
                <p className="font-semibold text-gray-800 text-sm">{et.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{et.tagline}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Individual services + pooja items shortcuts ─ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/dashboard/customer/services"
            className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
          >
            <ProductImage
              query="Indian event cooks decoration photography setup"
              emoji="🛍️"
              className="w-full h-36"
            />
            <div className="p-6 flex flex-col justify-between gap-4 flex-1">
              <div>
                <p className="font-bold text-gray-900 mb-1">Just need one thing, not a whole plan?</p>
                <p className="text-sm text-gray-500">Pick your function or festival and choose exactly what you need.</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-gray-400">
                  <span>🍳 Cooks</span>
                  <span>🎈 Decor</span>
                  <span>📸 Photography</span>
                  <span>🪔 Pooja</span>
                </div>
              </div>
              <span className="self-start inline-flex items-center gap-2 bg-plum-50 group-hover:bg-plum-100 text-plum-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                Browse services →
              </span>
            </div>
          </Link>
          <Link
            to="/shop/Pooja%20%26%20Essentials"
            className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
          >
            <ProductImage
              query="Indian pooja thali diya samagri ritual items"
              emoji="🪔"
              className="w-full h-36"
            />
            <div className="p-6 flex flex-col justify-between gap-4 flex-1">
              <div>
                <p className="font-bold text-gray-900 mb-1">Planning a pooja?</p>
                <p className="text-sm text-gray-500">Diyas, samagri, flowers, a pandit booking — everything needed for your ritual, delivered.</p>
              </div>
              <span className="self-start inline-flex items-center gap-2 bg-saffron-50 group-hover:bg-saffron-100 text-saffron-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                Browse pooja items →
              </span>
            </div>
          </Link>
        </section>

        {/* ── Shop teaser ────────────────────────────────── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Need something today?</h2>
              <p className="text-sm text-gray-500 mt-0.5">Cakes, gifts, flowers & hampers — delivered.</p>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-plum-600 hover:text-plum-700 shrink-0">
              Visit Shop →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {SHOP_CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                to={`/shop/${encodeURIComponent(cat.id)}`}
                className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                {cat.emoji} {cat.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Festival specials ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Festival Specials</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {FESTIVALS.slice(0, 5).map(f => (
              <Link
                key={f.id}
                to={`/festivals/${f.id}`}
                className="shrink-0 w-36 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all"
              >
                <div
                  className="h-20 flex items-center justify-center text-4xl"
                  style={{ background: `linear-gradient(135deg, ${f.gradientFrom}, ${f.gradientTo})` }}
                >
                  {f.emoji}
                </div>
                <div className="p-3 bg-white">
                  <p className="font-semibold text-xs text-gray-800">{f.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.month}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── How Sambramo works ────────────────────────── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">How Sambramo works</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { emoji: '✨', title: 'Tell us your dream', sub: 'Fill a quick 2-min form' },
              { emoji: '🔍', title: 'We plan everything', sub: 'Our team gets to work' },
              { emoji: '📋', title: 'You approve the plan', sub: 'Review & say yes' },
              { emoji: '🎉', title: 'Celebrate!', sub: 'We handle every detail' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-plum-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2">{s.emoji}</div>
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact support ───────────────────────────── */}
        <section className="bg-green-50 border border-green-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900 mb-1">Need help with your celebration?</p>
            <p className="text-sm text-gray-500">Our concierge team is available Mon–Sat, 9am–8pm.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a
              href={`https://wa.me/${BRAND.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`tel:${BRAND.supportPhone}`}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-plum-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Phone size={14} /> Call
            </a>
          </div>
        </section>

      </div>
    </div>
  )
}

function ActiveEventCard({ event }) {
  const navigate = useNavigate()
  const type     = EVENT_TYPES.find(et => et.id === event.event_type)
  const status   = EVENT_STATUSES[event.status]
  const css      = STATUS_CSS[event.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const emoji    = EVENT_TYPE_EMOJIS[event.event_type] ?? '🎊'

  return (
    <button
      onClick={() => navigate('/dashboard/customer/events')}
      className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-plum-200 transition-all w-full"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-plum-50 rounded-xl flex items-center justify-center text-xl shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm capitalize">{type?.label ?? event.event_type}</p>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${css.bg} ${css.text}`}>
            {status?.icon} {status?.label}
          </span>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-gray-400">
        {event.event_date && (
          <span className="flex items-center gap-1"><Calendar size={11} />{new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        )}
        {event.city && (
          <span className="flex items-center gap-1"><MapPin size={11} />{event.city}</span>
        )}
        {event.guest_count && (
          <span className="flex items-center gap-1"><Users size={11} />{event.guest_count}</span>
        )}
      </div>
    </button>
  )
}
