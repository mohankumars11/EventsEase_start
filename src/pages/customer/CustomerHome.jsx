import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowRight, Phone, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_TYPES, EVENT_STATUSES, EVENT_TYPE_EMOJIS, STATUS_CSS, BRAND } from '../../config/sambramo'
import { FESTIVALS } from '../../data/festivals'
import { UPCOMING_FESTIVALS } from '../../data/eventServicesData'
import { SHOP_CATEGORIES } from '../../config/shop'
import ProductImage from '../../components/shop/ProductImage'
import SlideCarousel from '../../components/common/SlideCarousel'
import ReferAndEarn from '../../components/customer/ReferAndEarn'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

const ACTIVE_STATUSES = ['REQUEST_RECEIVED','UNDER_REVIEW','CONTACTING_VENDORS','QUOTES_COLLECTED','PROPOSAL_PREPARED','PROPOSAL_SENT','CUSTOMER_REVIEW','APPROVED','CONFIRMED','IN_COORDINATION','EVENT_DAY']

// Festivals with a real detail page (same mapping as FestivalBanner.jsx) get
// routed there; everything else routes to the most relevant Shop category —
// e.g. Raksha Bandhan -> Gifts, since there's no dedicated Rakhi page.
const FESTIVAL_DETAIL_IDS = new Set(['ganesh-chaturthi', 'navratri', 'diwali', 'christmas'])
const FESTIVAL_SHOP_ROUTE = {
  'independence-day': { category: 'Party Essentials', occasion: 'Independence Day' },
  'raksha-bandhan':    { category: 'Gifts', occasion: 'Rakhi' },
  'janmashtami':       { category: 'Pooja & Essentials', occasion: 'Janmashtami' },
  'dussehra':          { category: 'Pooja & Essentials', occasion: 'Navratri' },
  'new-years-eve':     { category: 'Hampers', occasion: 'New Year' },
}
function festivalHref(f) {
  if (FESTIVAL_DETAIL_IDS.has(f.id)) return `/festivals/${f.id}`
  const route = FESTIVAL_SHOP_ROUTE[f.id] ?? { category: 'Gifts' }
  const qs = route.occasion ? `?occasion=${encodeURIComponent(route.occasion)}` : ''
  return `/shop/${encodeURIComponent(route.category)}${qs}`
}
function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

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

  const upcoming = UPCOMING_FESTIVALS
    .map(f => ({ ...f, days: daysUntil(f.date) }))
    .filter(f => f.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero greeting bar ─────────────────────────── */}
      <div className="bg-gradient-to-r from-plum-900 via-plum-800 to-plum-900 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-saffron-400 text-sm font-semibold mb-1">Welcome back</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Hello, {firstName}! ✨
          </h1>
          <p className="text-plum-300 text-sm mt-2 mb-6">
            {hasActive
              ? `You have ${activeEvents.length} active celebration${activeEvents.length > 1 ? 's' : ''} in progress.`
              : 'Ready to plan your next unforgettable moment?'}
          </p>

          {upcoming.length > 0 && (
            <>
              <p className="text-plum-300 text-xs font-semibold uppercase tracking-wider mb-3">Coming up on the calendar</p>
              <SlideCarousel>
                {upcoming.map(f => (
                  <div key={f.id} className="shrink-0 w-48 sm:w-56 snap-center">
                    <UpcomingCard festival={f} />
                  </div>
                ))}
              </SlideCarousel>
            </>
          )}
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
            <SlideCarousel>
              {activeEvents.map(e => (
                <div key={e.id} className="shrink-0 w-72 snap-center">
                  <ActiveEventCard event={e} />
                </div>
              ))}
            </SlideCarousel>
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                to="/plan"
                className="inline-flex items-center justify-center gap-2 bg-saffron-400 hover:bg-saffron-500 text-plum-950 font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg"
              >
                Start Planning <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard/customer/services"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold px-8 py-3.5 rounded-2xl transition-all backdrop-blur-sm"
              >
                🛍️ Individual Services &amp; Packages
              </Link>
            </div>
          </div>
        </section>

        {/* ── Celebration types ─────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">What are you celebrating?</h2>
          <SlideCarousel>
            {EVENT_TYPES.slice(0, 8).map(et => (
              <div key={et.id} className="shrink-0 w-40 sm:w-44 snap-center">
                <button
                  onClick={() => navigate(`/plan?type=${et.id}`)}
                  className="w-full bg-white rounded-2xl overflow-hidden text-left border border-gray-100 hover:border-plum-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <ProductImage query={`Indian ${et.label} celebration`} emoji={et.emoji} className="w-full h-24" />
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm">{et.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{et.tagline}</p>
                  </div>
                </button>
              </div>
            ))}
          </SlideCarousel>
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

        <ReferAndEarn />

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
          <SlideCarousel>
            {SHOP_CATEGORIES.map(cat => (
              <div key={cat.id} className="shrink-0 w-32 sm:w-36 snap-center">
                <ShopMiniCard category={cat} />
              </div>
            ))}
          </SlideCarousel>
        </section>

        {/* ── Festival specials ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Festival Specials</h2>
          </div>
          <SlideCarousel>
            {FESTIVALS.map(f => (
              <div key={f.id} className="shrink-0 w-36 snap-center">
                <Link
                  to={`/festivals/${f.id}`}
                  className="block rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <ProductImage query={`${f.name} festival India celebration`} emoji={f.emoji} className="w-full h-20" />
                  <div className="p-3 bg-white">
                    <p className="font-semibold text-xs text-gray-800">{f.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.month}</p>
                  </div>
                </Link>
              </div>
            ))}
          </SlideCarousel>
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

function urgencyLabel(days) {
  if (days === 0) return 'Today!'
  if (days === 1) return 'Tomorrow!'
  return `${days} days to go`
}

/* Hero's "Coming up on the calendar" card — real photo, dark overlay for
   legible text (same compositing pattern used on the landing page), a
   live days-to-go badge, and a CTA routed to whichever destination
   actually makes sense for that festival (detail page or Shop). */
function UpcomingCard({ festival }) {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchUnsplashPhoto(`${festival.name} festival India celebration`).then(p => { if (!cancelled) setPhoto(p) })
    return () => { cancelled = true }
  }, [festival.id])

  const isDetailPage = FESTIVAL_DETAIL_IDS.has(festival.id)

  return (
    <button
      onClick={() => navigate(festivalHref(festival))}
      className="group relative w-full h-44 rounded-2xl overflow-hidden text-left transition-transform duration-300 hover:scale-[1.02]"
      style={photo ? { backgroundImage: `url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg,#3b0764,#7c3aed)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
      <div className="relative h-full flex flex-col justify-between p-3.5">
        <span className="self-start inline-flex items-center gap-1 bg-saffron-400 text-plum-950 text-[11px] font-bold px-2.5 py-1 rounded-full">
          <Clock size={11} /> {urgencyLabel(festival.days)}
        </span>
        <div>
          <p className="text-white font-bold text-base leading-tight flex items-center gap-1.5">
            <span>{festival.emoji}</span> {festival.name}
          </p>
          <span className="inline-flex items-center gap-1 text-saffron-300 text-xs font-semibold mt-1.5 group-hover:gap-2 transition-all">
            {isDetailPage ? 'Plan this festival' : 'Shop now'} <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </button>
  )
}

/* Light-themed real-photo card for the "Need something today?" Shop strip. */
const SHOP_MINI_QUERIES = {
  'Cakes':              'chocolate birthday cake slice',
  'Gifts':               'wrapped gift box present ribbon',
  'Flowers':              'flower bouquet fresh',
  'Hampers':              'wicker gift basket fruit',
  'Party Essentials':      'balloons party decoration',
  'Pooja & Essentials':     'pooja thali diya India',
}
function ShopMiniCard({ category }) {
  return (
    <Link
      to={`/shop/${encodeURIComponent(category.id)}`}
      className="group flex flex-col h-32 bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <ProductImage query={SHOP_MINI_QUERIES[category.id] ?? category.label} emoji={category.emoji} className="w-full flex-1 min-h-0" />
      <div className="px-2 py-2 text-center shrink-0">
        <p className="text-gray-700 text-xs font-semibold group-hover:text-plum-700 transition-colors truncate">{category.label}</p>
      </div>
    </Link>
  )
}
