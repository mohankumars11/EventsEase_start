import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { EVENT_LIST, UPCOMING_FESTIVALS } from '../../data/eventServicesData'
import VendorCard from '../../components/customer/VendorCard'
import FestivalBanner from '../../components/customer/FestivalBanner'
import CustomerLayout from '../../components/customer/CustomerLayout'

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

const nextFest = [...UPCOMING_FESTIVALS]
  .map(f => ({ ...f, days: daysUntil(f.date) }))
  .filter(f => f.days >= 0)
  .sort((a, b) => a.days - b.days)[0]

export default function CustomerHome() {
  const { profile } = useAuth()
  const { totalCount } = useCart()
  const navigate = useNavigate()

  const [featured, setFeatured] = useState([])
  const [topRated, setTopRated] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('*, vendor_photos(photo_url, is_cover)').eq('is_featured', true).limit(6),
      supabase.from('vendors').select('*, vendor_photos(photo_url, is_cover)').gt('rating_avg', 0).order('rating_avg', { ascending: false }).limit(6),
    ]).then(([f, r]) => {
      setFeatured(f.data ?? [])
      setTopRated(r.data ?? [])
      setLoading(false)
    })
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <CustomerLayout>
      <FestivalBanner />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-10">

        {/* ── Greeting + festival alert ───────────────────── */}
        <section>
          {nextFest && nextFest.days <= 30 && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg">
              <span className="text-3xl animate-bounce">{nextFest.emoji}</span>
              <div>
                <p className="font-bold text-sm">{nextFest.name} is in {nextFest.days} day{nextFest.days !== 1 ? 's' : ''}!</p>
                <p className="text-white/80 text-xs">Book your vendors now before they fill up.</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/customer/browse')}
                className="ml-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold whitespace-nowrap"
              >
                Book now →
              </button>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
            Hello, {firstName}! 👋
          </h1>
          <p className="text-gray-500 text-base">What are you celebrating? We'll take care of the rest.</p>

          <button
            onClick={() => navigate('/dashboard/customer/browse')}
            className="mt-4 w-full flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border-2 border-orange-100 shadow-sm text-gray-400 text-sm hover:border-amber-300 hover:shadow-md transition-all text-left"
          >
            <Search size={18} className="text-amber-400 shrink-0" />
            Search by vendor name, city, or service…
            <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-400">Browse all</span>
          </button>
        </section>

        {/* ── EVENT CARDS ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Book Your Celebration</h2>
              <p className="text-sm text-gray-400 mt-0.5">Click an event — see all services, packages & vendors</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
              <Sparkles size={13} /> {EVENT_LIST.length} events
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {EVENT_LIST.map(ev => (
              <button
                key={ev.id}
                onClick={() => navigate(`/dashboard/customer/events/${ev.id}`)}
                className="group relative overflow-hidden rounded-2xl text-left cursor-pointer hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <div className={`bg-gradient-to-br ${ev.gradient} p-5 sm:p-6 min-h-[130px] flex flex-col justify-between`}>
                  {/* Decorative blobs */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                  <div className="relative text-5xl sm:text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg self-start">
                    {ev.emoji}
                  </div>

                  <div className="relative mt-3">
                    <p className="font-extrabold text-white text-sm sm:text-base leading-tight drop-shadow">
                      {ev.name}
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">
                      {ev.services.length} services · {ev.packages.length} packages
                    </p>
                  </div>

                  <div className="absolute bottom-3 right-3 w-7 h-7 bg-white/25 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
          <h3 className="text-xs font-bold text-amber-700 mb-4 uppercase tracking-wider">How it works</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '🎯', title: 'Pick your event', sub: 'Choose from 6 event types' },
              { icon: '🛒', title: 'Add services', sub: 'Individual or full packages' },
              { icon: '🎉', title: 'We handle the rest', sub: 'Vendors quote within 24h' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURED VENDORS ────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">⭐ Featured Vendors</h2>
              <p className="text-sm text-gray-400">Handpicked for quality and reliability</p>
            </div>
            <button onClick={() => navigate('/dashboard/customer/browse')} className="text-sm text-amber-600 font-semibold hover:text-amber-700">See all →</button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="card h-64 animate-pulse">
                  <div className="h-44 bg-gray-100 rounded-t-2xl" />
                  <div className="p-4 space-y-2"><div className="h-3 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map(v => <VendorCard key={v.id} vendor={v} />)}
            </div>
          ) : (
            <div className="text-center py-10 card">
              <p className="text-gray-400 text-sm">Featured vendors coming soon</p>
              <button onClick={() => navigate('/dashboard/customer/browse')} className="mt-2 text-amber-600 text-sm font-semibold">Browse all vendors →</button>
            </div>
          )}
        </section>

        {/* ── TOP RATED ───────────────────────────────────── */}
        {!loading && topRated.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">🏆 Top Rated</h2>
                <p className="text-sm text-gray-400">Highest customer ratings this month</p>
              </div>
              <button onClick={() => navigate('/dashboard/customer/browse')} className="text-sm text-amber-600 font-semibold hover:text-amber-700">See all →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {topRated.map(v => <VendorCard key={v.id} vendor={v} />)}
            </div>
          </section>
        )}

      </div>

      {/* Floating cart button */}
      {totalCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30">
          <button
            onClick={() => navigate('/dashboard/customer/cart')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 text-white font-bold shadow-2xl hover:bg-amber-600 animate-bounce"
          >
            🛒 Cart ({totalCount})
          </button>
        </div>
      )}
    </CustomerLayout>
  )
}
