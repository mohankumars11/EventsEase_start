import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, ChevronRight, Sparkles, Star } from 'lucide-react'
import { FESTIVALS } from '../data/festivals'
import { useScrollReveal } from '../hooks/useScrollReveal'

export default function FestivalDetailPage() {
  useScrollReveal()
  const { id }   = useParams()
  const navigate = useNavigate()

  const festival = FESTIVALS.find(f => f.id === id)

  if (!festival) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream">
        <p className="text-2xl text-gray-400">Festival not found.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    )
  }

  const {
    name, tagline, emoji, gradientFrom, gradientTo, accentHex,
    month, duration, region, description, emotionalHook,
    foods, rituals, services, menuPackages, customizationOptions,
  } = festival

  const heroGradient = `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`

  return (
    <div className="min-h-screen bg-cream">

      {/* ═══════════════════════════════════════════════
          SECTION 1 — Emotional Hero
      ═══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden pt-16 pb-20 px-4"
        style={{ background: heroGradient }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: '#ffffff' }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: '#000000' }}
        />

        {/* Back button */}
        <div className="relative max-w-5xl mx-auto mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Big emoji */}
          <div className="text-7xl sm:text-8xl mb-5 float inline-block">{emoji}</div>

          {/* Name */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            {name}
          </h1>

          {/* Tagline */}
          <p className="text-white/90 text-lg sm:text-xl font-medium mb-6 max-w-2xl mx-auto">
            {tagline}
          </p>

          {/* Emotional hook */}
          <blockquote className="text-white/80 text-base sm:text-lg italic max-w-2xl mx-auto mb-8 leading-relaxed border-l-4 border-white/40 pl-4 text-left">
            "{emotionalHook}"
          </blockquote>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Calendar size={13} /> {month}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Clock size={13} /> {duration}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full backdrop-blur-sm">
              <MapPin size={13} /> {region}
            </span>
          </div>

          {/* CTA */}
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white font-bold px-8 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 text-base"
            style={{ color: gradientFrom }}
          >
            <Sparkles size={18} /> Plan This {name}
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — Foods
      ═══════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal">
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
            >
              {emoji} Festival Flavors
            </span>
            <h2 className="section-title">Traditional Foods &amp; Flavors</h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              Every dish tells a story — recipes passed down through generations, cooked with love and served with joy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {foods.map((food, i) => (
              <FoodCard key={food.name} food={food} accentHex={accentHex} delay={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — Rituals
      ═══════════════════════════════════════════════ */}
      <section className="py-16 px-4" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal">
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
            >
              🙏 Sacred Traditions
            </span>
            <h2 className="section-title">Sacred Rituals &amp; Traditions</h2>
            <p className="section-subtitle">
              The rituals that give {name} its heart — moments that connect generations
            </p>
          </div>

          <div className="relative">
            {/* Vertical connector line */}
            <div
              className="absolute left-6 top-0 bottom-0 w-0.5 hidden sm:block"
              style={{ backgroundColor: `${accentHex}30` }}
            />

            <div className="space-y-6">
              {rituals.map((ritual, i) => (
                <div key={ritual.name} className={`reveal reveal-delay-${Math.min(i + 1, 4)}`}>
                  <div className="flex gap-5">
                    {/* Timeline dot */}
                    <div
                      className="hidden sm:flex w-12 h-12 rounded-full items-center justify-center text-xl shrink-0 shadow-md z-10"
                      style={{ backgroundColor: accentHex }}
                    >
                      {ritual.emoji}
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white rounded-2xl border border-orange-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl sm:hidden">{ritual.emoji}</span>
                          <h3 className="font-bold text-gray-900 text-lg">{ritual.name}</h3>
                        </div>
                        {ritual.timing && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                            <Clock size={10} className="inline mr-1" />{ritual.timing}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">{ritual.description}</p>
                      {ritual.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items needed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ritual.items.map(item => (
                              <span
                                key={item}
                                className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — Menu Packages
      ═══════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
            >
              🍽️ Menu Packages
            </span>
            <h2 className="section-title">Curated Menu Packages</h2>
            <p className="section-subtitle">
              Thoughtfully designed menus for every budget and guest count
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuPackages.map((pkg, i) => (
              <div
                key={pkg.name}
                className={`reveal reveal-delay-${i + 1} relative rounded-2xl border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  pkg.highlight
                    ? 'border-transparent shadow-lg'
                    : 'border-orange-100 bg-white shadow-sm'
                }`}
                style={pkg.highlight ? { background: heroGradient } : {}}
              >
                {pkg.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-xs font-bold px-3 py-1 rounded-full shadow"
                    style={{ color: gradientFrom }}>
                    ★ {pkg.highlight}
                  </span>
                )}

                <h3
                  className={`font-bold text-xl mb-1 ${pkg.highlight ? 'text-white' : 'text-gray-900'}`}
                >
                  {pkg.name}
                </h3>
                <p
                  className={`text-sm font-semibold mb-4 ${pkg.highlight ? 'text-white/80' : 'text-marigold-600'}`}
                >
                  {pkg.price}
                </p>

                <ul className="space-y-2 mb-6">
                  {pkg.items.map(item => (
                    <li key={item} className={`flex items-center gap-2 text-sm ${pkg.highlight ? 'text-white/90' : 'text-gray-600'}`}>
                      <CheckCircle
                        size={14}
                        className="shrink-0"
                        style={{ color: pkg.highlight ? 'white' : accentHex }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    pkg.highlight
                      ? 'bg-white hover:bg-orange-50'
                      : 'border-2 hover:bg-orange-50'
                  }`}
                  style={pkg.highlight ? { color: gradientFrom } : { borderColor: accentHex, color: accentHex }}
                >
                  Book This Menu <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 5 — Customization
      ═══════════════════════════════════════════════ */}
      <section className="py-16 px-4" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-10">
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
            >
              ✨ Personalize
            </span>
            <h2 className="section-title">Make It Yours</h2>
            <p className="section-subtitle">
              Every family celebrates differently — we customize every detail to match your vision
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8 reveal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {customizationOptions.map((option, i) => (
                <label key={option} className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: accentHex }}
                  >
                    <CheckCircle size={12} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    {option}
                  </span>
                </label>
              ))}
            </div>

            <div className="border-t border-orange-100 pt-6 text-center">
              <p className="text-gray-500 text-sm mb-4">
                Have something specific in mind? Our event experts will make it happen.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: heroGradient }}
              >
                Request Custom Menu <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 6 — Services
      ═══════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 reveal">
            <h2 className="section-title">Services You'll Need</h2>
            <p className="section-subtitle">Everything to make your {name} celebration complete</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 reveal">
            {services.map(service => (
              <Link
                key={service}
                to="/signup"
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-medium text-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: accentHex, color: accentHex }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = accentHex
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = accentHex
                }}
              >
                {service} <ChevronRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 7 — Bottom CTA
      ═══════════════════════════════════════════════ */}
      <section
        className="py-20 px-4 relative overflow-hidden"
        style={{ background: heroGradient }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="text-9xl absolute top-4 right-8 select-none">{emoji}</div>
          <div className="text-7xl absolute bottom-4 left-8 select-none">{emoji}</div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            Make This {name} the One <br className="hidden sm:block" />
            They'll Always Remember
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white font-bold px-8 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all text-base"
              style={{ color: gradientFrom }}
            >
              <Sparkles size={18} /> Plan This {name}
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border-2 border-white/40 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/20 transition-all text-base backdrop-blur-sm"
            >
              Talk to an Expert
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Food card subcomponent ──────────────────────────────── */
function FoodCard({ food, accentHex, delay }) {
  return (
    <div className={`reveal reveal-delay-${Math.min(delay + 1, 4)} group relative bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300`}>
      {/* Gradient header */}
      <div
        className="h-20 flex items-center justify-center text-4xl"
        style={{ backgroundColor: `${accentHex}15` }}
      >
        {food.emoji}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{food.name}</h3>
          {food.customizable && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
              style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
            >
              Customizable
            </span>
          )}
        </div>

        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{food.category}</span>

        <p className="text-xs text-gray-500 leading-relaxed mt-2 mb-3">{food.description}</p>

        <p className="text-sm font-semibold" style={{ color: accentHex }}>{food.price}</p>

        {/* Custom options — revealed on hover */}
        {food.customizable && food.customOptions?.length > 0 && (
          <div className="mt-3 max-h-0 overflow-hidden group-hover:max-h-40 transition-all duration-300">
            <div className="border-t border-orange-100 pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Options</p>
              <div className="flex flex-col gap-1">
                {food.customOptions.map(opt => (
                  <span key={opt} className="text-xs text-gray-600 flex items-center gap-1">
                    <span style={{ color: accentHex }}>•</span> {opt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
