import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Package, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { EVENT_DATA } from '../../data/eventServicesData'
import { formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function EventServices() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const event = EVENT_DATA[eventId]
  const [activeTab, setActiveTab]     = useState('services') // 'services' | 'packages'
  const [expandedCat, setExpandedCat] = useState(null)

  if (!event) {
    return (
      <CustomerLayout>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🤔</div>
          <h2 className="font-bold text-gray-700 mb-2">Event not found</h2>
          <Link to="/dashboard/customer" className="btn-primary">Go back home</Link>
        </div>
      </CustomerLayout>
    )
  }

  // Group services by category
  const byCategory = event.services.reduce((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = []
    acc[svc.category].push(svc)
    return acc
  }, {})

  const categories = Object.keys(byCategory)

  return (
    <CustomerLayout>
      {/* Hero banner */}
      <div className={`bg-gradient-to-r ${event.heroGradient} text-white`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => navigate('/dashboard/customer')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5"
          >
            <ArrowLeft size={15} /> All events
          </button>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-6xl drop-shadow-lg">{event.emoji}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold drop-shadow">{event.name}</h1>
              <p className="text-white/80 mt-1 text-sm sm:text-base">{event.tagline}</p>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-xl">{event.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              {event.services.length} services available
            </span>
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              {event.packages.length} ready packages
            </span>
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur">
              Sambramo organizes everything
            </span>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-saffron-500 text-saffron-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🛍️ Individual Services
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'packages'
                  ? 'border-saffron-500 text-saffron-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Package size={14} /> Complete Packages
                <span className="ml-1 px-1.5 py-0.5 bg-saffron-100 text-saffron-700 rounded text-[10px] font-bold">Save more</span>
              </span>
            </button>
          </div>
          <button
            onClick={() => navigate('/plan?type=' + eventId)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-plum-700 text-white font-semibold text-sm hover:bg-plum-800"
          >
            <Sparkles size={15} />
            Plan with Sambramo
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── INDIVIDUAL SERVICES TAB ─────────────────────── */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Pick exactly what you need — mix and match from any category. Sambramo will organize this for you.
            </p>

            {categories.map(cat => {
              const svcs = byCategory[cat]
              const isOpen = expandedCat === null || expandedCat === cat
              return (
                <div key={cat} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedCat(isOpen && expandedCat === cat ? null : cat)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{svcs[0].emoji}</span>
                      <span className="font-bold text-gray-800">{cat}</span>
                      <span className="text-xs text-gray-400 font-medium">{svcs.length} service{svcs.length > 1 ? 's' : ''}</span>
                    </div>
                    {expandedCat === cat
                      ? <ChevronUp size={16} className="text-gray-400" />
                      : <ChevronDown size={16} className="text-gray-400" />
                    }
                  </button>

                  {expandedCat !== cat && (
                    <div className="divide-y divide-gray-50">
                      {svcs.map(svc => {
                        return (
                          <div key={svc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl shrink-0">{svc.emoji}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{svc.name}</p>
                                <p className="text-xs text-gray-500 truncate">{svc.desc}</p>
                                <p className="text-xs text-saffron-600 font-medium mt-0.5">{svc.priceHint}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate('/plan?type=' + eventId)}
                              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-saffron-500 text-white font-semibold text-xs hover:bg-saffron-600 transition-colors"
                            >
                              <Sparkles size={13} />
                              Plan with Sambramo
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="sticky bottom-20 md:bottom-4 flex justify-center pointer-events-none">
              <button
                onClick={() => navigate('/plan?type=' + eventId)}
                className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-plum-700 text-white font-bold text-base shadow-2xl hover:bg-plum-800"
              >
                <Sparkles size={18} />
                Plan with Sambramo →
              </button>
            </div>
          </div>
        )}

        {/* ── PACKAGES TAB ────────────────────────────────── */}
        {activeTab === 'packages' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500 mb-2">
              Pre-curated bundles — save time, save money, and Sambramo handles every detail.
            </p>

            {event.packages.map(pkg => {
              const pkgServices = event.services.filter(s => pkg.includes.includes(s.id))

              return (
                <div key={pkg.id} className={`card p-6 ${pkg.color}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{pkg.emoji}</span>
                        <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                        {pkg.popular && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${pkg.badge}`}>
                            ★ Most popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{pkg.tagline}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 mb-0.5">Starts from</p>
                      <p className="text-xl font-extrabold text-saffron-700">{formatINR(pkg.price_min)}</p>
                      <p className="text-xs text-gray-400">up to {formatINR(pkg.price_max)}</p>
                    </div>
                  </div>

                  {/* Services included */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {pkgServices.map(s => (
                      <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 bg-white/70 border border-white rounded-full text-xs font-medium text-gray-700">
                        {s.emoji} {s.name}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/plan?type=' + eventId)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-plum-700 text-white font-bold hover:bg-plum-800 transition-colors"
                  >
                    <Sparkles size={16} /> Plan this with Sambramo
                  </button>
                </div>
              )
            })}

            <div className="card p-5 border-dashed border-2 border-saffron-300 bg-saffron-50 text-center">
              <Sparkles size={24} className="text-saffron-500 mx-auto mb-2" />
              <h4 className="font-bold text-gray-800 mb-1">Need something custom?</h4>
              <p className="text-sm text-gray-500 mb-4">Can't find the right package? Browse individual services and build your own combination.</p>
              <button
                onClick={() => setActiveTab('services')}
                className="px-6 py-2.5 rounded-xl bg-saffron-500 text-white font-semibold text-sm hover:bg-saffron-600"
              >
                Browse individual services →
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
