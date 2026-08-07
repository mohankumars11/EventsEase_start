import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Truck, ShieldCheck, Sparkles } from 'lucide-react'
import { SHOP_CATEGORIES } from '../../config/shop'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'
import ProductImage from '../../components/shop/ProductImage'

// Independence Day (Aug 15) is real, near-term, and — unlike the rest
// of the festival calendar — had zero tagged products before this pass.
// A live countdown, not a static banner, is what makes "it's coming"
// actually true instead of a stale claim.
const INDEPENDENCE_DAY = '2026-08-15'
function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

// Real photo per category — same query set used by ShopMiniCard on the
// customer home page, kept consistent so the same category always shows
// the same photo everywhere it appears.
const CATEGORY_QUERIES = {
  'Cakes':              'chocolate birthday cake slice',
  'Gifts':               'wrapped gift box present ribbon',
  'Flowers':              'flower bouquet fresh',
  'Hampers':              'wicker gift basket fruit',
  'Party Essentials':      'balloons party decoration',
  'Pooja & Essentials':     'pooja thali diya India',
}

// One emotional hook per category — a specific reason to click "Shop
// now" instead of a repeat of the tagline already shown underneath.
const CATEGORY_HOOKS = {
  'Cakes':              'Watch their face when the candles come out',
  'Gifts':               'Find the thing they’ll actually remember',
  'Flowers':              'Say it with a bouquet, delivered fresh today',
  'Hampers':              'One box, everything they need to feel spoiled',
  'Party Essentials':      'Turn any room into a celebration',
  'Pooja & Essentials':     'Everything ready before the first diya is lit',
}

// Curated cross-category shortcuts — each maps straight into a specific
// (category, occasion) pair verified against the actual product rows
// (migrations 015/017), so every link lands on a populated results page,
// never an empty "no items tagged" screen.
const OCCASION_SHORTCUTS = [
  { label: 'Birthday',         emoji: '🎂', category: 'Cakes',              occasion: 'Birthday',         query: 'birthday cake celebration' },
  { label: 'Wedding',          emoji: '💍', category: 'Hampers',            occasion: 'Wedding',          query: 'indian wedding gift hamper' },
  { label: 'Rakhi',            emoji: '🎁', category: 'Gifts',              occasion: 'Rakhi',            query: 'rakhi raksha bandhan gift' },
  { label: 'Diwali',           emoji: '🪔', category: 'Hampers',            occasion: 'Diwali',           query: 'diwali diya lamp hamper' },
  { label: 'Anniversary',      emoji: '💐', category: 'Flowers',            occasion: 'Anniversary',      query: 'anniversary flower bouquet' },
  { label: 'Housewarming',     emoji: '🏠', category: 'Party Essentials',   occasion: 'Housewarming',     query: 'housewarming door decoration toran' },
  { label: 'Baby Shower',      emoji: '🍼', category: 'Party Essentials',   occasion: 'Baby Shower',      query: 'baby shower balloon decoration pastel' },
  { label: 'New Year',         emoji: '🎉', category: 'Hampers',            occasion: 'New Year',         query: 'new year hamper celebration' },
  { label: 'Ganesh Chaturthi', emoji: '🐘', category: 'Pooja & Essentials', occasion: 'Ganesh Chaturthi', query: 'ganesh chaturthi idol clay' },
  { label: 'Corporate',        emoji: '💼', category: 'Hampers',            occasion: 'Corporate',        query: 'corporate gift hamper premium' },
  { label: 'Independence Day', emoji: '🇮🇳', category: 'Hampers',            occasion: 'Independence Day', query: 'indian flag tricolor celebration' },
]

export default function Shop() {
  const navigate = useNavigate()
  const { productCount } = useCart()
  const [counts, setCounts] = useState({})
  const daysToIndependenceDay = daysUntil(INDEPENDENCE_DAY)

  useEffect(() => {
    supabase.from('products').select('category').then(({ data }) => {
      if (!data) return
      const next = {}
      data.forEach(p => { next[p.category] = (next[p.category] ?? 0) + 1 })
      setCounts(next)
    })
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-plum-950 via-plum-900 to-berry-900 pt-16 pb-14 px-4">
        <div className="absolute top-8 right-10 w-72 h-72 bg-white/5 blob pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-white/5 blob pointer-events-none" style={{ animationDelay: '3s' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-semibold rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm">
            <Sparkles size={13} className="text-saffron-400" /> 600+ items, ready to order
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-extrabold text-white mb-4">
            Make Someone's Day
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-7">
            Big moments or little surprises — find something worth celebrating, delivered to their door.
          </p>
          <button
            onClick={() => navigate('/shop/cart')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <ShoppingBag size={16} />
            View Cart {productCount > 0 && `(${productCount})`}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ── Independence Day countdown ────────────────── */}
        {daysToIndependenceDay >= 0 && daysToIndependenceDay <= 21 && (
          <Link
            to={`/shop/Hampers?occasion=${encodeURIComponent('Independence Day')}`}
            className="group flex items-center justify-between gap-4 bg-gradient-to-r from-orange-500 via-white to-green-600 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0">🇮🇳</span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm sm:text-base">
                  {daysToIndependenceDay === 0 ? "It's Independence Day today!" : `Independence Day is in ${daysToIndependenceDay} day${daysToIndependenceDay === 1 ? '' : 's'}`}
                </p>
                <p className="text-xs sm:text-sm text-gray-700">Tricolor cakes, hampers, decor & more — shop patriotic favourites</p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 text-plum-900 text-xs sm:text-sm font-bold bg-white/70 group-hover:bg-white px-3 py-2 rounded-xl transition-colors">
              Shop now <ArrowRight size={14} />
            </span>
          </Link>
        )}

        {/* ── Shop by occasion ─────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Shop by occasion</h2>
          <p className="text-sm text-gray-500 mb-4">Know what you're celebrating? Jump straight there.</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {OCCASION_SHORTCUTS.map(o => (
              <Link
                key={o.label}
                to={`/shop/${encodeURIComponent(o.category)}?occasion=${encodeURIComponent(o.occasion)}`}
                className="group shrink-0 w-24 flex flex-col items-center gap-2"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-saffron-400 transition-colors shadow-sm">
                  <ProductImage query={o.query} emoji={o.emoji} className="w-full h-full" cinematic />
                </div>
                <p className="text-xs font-semibold text-gray-700 text-center leading-tight group-hover:text-plum-700 transition-colors">{o.label}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Category grid ─────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Browse everything</h2>
          <p className="text-sm text-gray-500 mb-4">Every category, stocked and ready.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SHOP_CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                to={`/shop/${encodeURIComponent(cat.id)}`}
                className="group relative h-48 rounded-3xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <ProductImage query={CATEGORY_QUERIES[cat.id] ?? cat.label} emoji={cat.emoji} className="absolute inset-0 w-full h-full" cinematic />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0 group-hover:from-black/90 transition-colors" />

                {counts[cat.id] && (
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-plum-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {counts[cat.id]}+ items
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="text-2xl block mb-1">{cat.emoji}</span>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">{cat.label}</h3>
                  <p className="text-white/70 text-xs leading-relaxed mb-2">{CATEGORY_HOOKS[cat.id] ?? cat.tagline}</p>
                  <span className="inline-flex items-center gap-1 text-saffron-300 text-xs font-bold group-hover:gap-2 transition-all">
                    Shop now <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Trust strip ───────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Truck,       title: 'Fast delivery',    desc: 'Same-day in most areas' },
            { icon: ShieldCheck, title: 'Secure UPI',       desc: 'Pay via Google Pay, PhonePe & more' },
            { icon: Sparkles,    title: 'Real products',    desc: 'What you see is what arrives' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-10 h-10 rounded-xl bg-plum-50 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-plum-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
