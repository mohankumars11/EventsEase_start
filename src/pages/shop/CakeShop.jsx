import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ShoppingCart, Search, X, Sparkles, Heart, Flame, ArrowDownNarrowWide,
  MessageCircle, ChevronRight, Check, Plus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import { BRAND } from '../../config/sambramo'
import { CAKE_OCCASION_PHOTOS } from '../../config/generatedCakeOccasionPhotos'
import { buildOccasionGroups, occasionLabel, occasionEmoji } from '../../data/cakeOccasions'
import { cakeFacts, CAKE_STYLES } from '../../data/cakeStyles'
import ProductImage from '../../components/shop/ProductImage'
import RatingBadge from '../../components/reviews/RatingBadge'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import ProductCustomizeSheet, { VegMark } from '../../components/shop/ProductCustomizeSheet'
import FulfilmentNote from '../../components/shop/FulfilmentNote'

/**
 * The cake storefront.
 *
 * Cakes get their own page rather than sharing ShopCategory with balloons and
 * diyas, for two reasons that only apply here:
 *
 *   1. Occasion is the whole navigation. Nobody browses "all cakes" — they
 *      arrive knowing it is a first birthday, a haldi, or an apology, and the
 *      catalogue now carries 50-odd occasion tags. ShopCategory renders those
 *      as one flat row of chips, which at this size is a wall nobody reads.
 *      Here they are grouped by life stage (src/data/cakeOccasions.js).
 *   2. Every cake is configurable, so the card's job is to open the
 *      customiser, not to add a fixed thing to a cart.
 *
 * Everything else — ratings, order counts, deep links via ?occasion= —
 * behaves exactly as it does in ShopCategory, so an existing link like
 * /shop/Cakes?occasion=Birthday from the shop home still lands correctly.
 */

const SORTS = [
  { id: 'default', label: 'Featured',     icon: Sparkles },
  { id: 'loved',   label: 'Most loved',   icon: Heart },
  { id: 'ordered', label: 'Most ordered', icon: Flame },
  { id: 'price',   label: 'Price: low to high', icon: ArrowDownNarrowWide },
]

export default function CakeShop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { productCount, hasProduct, productQtyFor, dispatch } = useCart()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [ratings, setRatings]   = useState({})
  const [orders, setOrders]     = useState({})

  const [occasion, setOccasion] = useState(searchParams.get('occasion') ?? 'All')
  const [style, setStyle]       = useState('All')
  const [sort, setSort]         = useState('default')
  const [vegOnly, setVegOnly]   = useState(false)
  const [query, setQuery]       = useState('')

  const [customizing, setCustomizing] = useState(null)
  const gridRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('category', 'Cakes').order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    const ids = products.map(p => String(p.id))
    supabase.from('review_aggregates').select('subject_id, avg_rating')
      .eq('subject_type', 'product').in('subject_id', ids)
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(r => { map[r.subject_id] = r.avg_rating })
        setRatings(map)
      })
    supabase.rpc('get_product_order_counts').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(r => { map[r.product_id] = r.total_ordered })
      setOrders(map)
    })
  }, [products])

  // Deep links (an occasion card on the shop home, a festival page) set the
  // filter without a reload.
  useEffect(() => { setOccasion(searchParams.get('occasion') ?? 'All') }, [searchParams])

  // Facts are parsed from the product name, so cache them per row rather than
  // re-deriving on every filter keystroke.
  const enriched = useMemo(
    () => products.map(p => ({ ...p, facts: cakeFacts(p) })),
    [products]
  )

  const occasionGroups = useMemo(() => buildOccasionGroups(products), [products])
  const availableStyles = useMemo(() => {
    const present = new Set(enriched.map(p => p.facts.style.id))
    return CAKE_STYLES.filter(s => present.has(s.id))
  }, [enriched])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = enriched.filter(p => {
      if (occasion !== 'All' && p.occasion !== occasion) return false
      if (style !== 'All' && p.facts.style.id !== style) return false
      if (vegOnly && !p.facts.veg) return false
      if (needle && !`${p.name} ${p.description ?? ''} ${p.occasion ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })

    if (sort === 'loved')   list = [...list].sort((a, b) => (ratings[String(b.id)] ?? -1) - (ratings[String(a.id)] ?? -1))
    if (sort === 'ordered') list = [...list].sort((a, b) => (orders[b.id] ?? -1) - (orders[a.id] ?? -1))
    if (sort === 'price')   list = [...list].sort((a, b) => a.price - b.price)
    return list
  }, [enriched, occasion, style, vegOnly, query, sort, ratings, orders])

  function selectOccasion(next) {
    setOccasion(next)
    setSearchParams(next === 'All' ? {} : { occasion: next }, { replace: true })
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filtersActive = occasion !== 'All' || style !== 'All' || vegOnly || query.trim()

  function clearFilters() {
    setOccasion('All'); setStyle('All'); setVegOnly(false); setQuery('')
    setSearchParams({}, { replace: true })
  }

  const whatsappHref = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
    "Hi Sambramo — I'd like a fully custom cake. Here's what I have in mind:"
  )}`

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Sticky search bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2.5">
          <button
            onClick={() => navigate('/shop')}
            aria-label="All categories"
            className="shrink-0 text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search cakes, flavours, occasions"
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Eggless is the first question at any Indian bakery counter, so it
              is a switch in the header rather than a filter three taps down. */}
          <button
            onClick={() => setVegOnly(v => !v)}
            aria-pressed={vegOnly}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors ${
              vegOnly ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            <VegMark /> <span className="hidden sm:inline">Eggless</span>
          </button>

          <Link
            to="/shop/cart"
            aria-label="Cart"
            className="shrink-0 relative p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-plum-300"
          >
            <ShoppingCart size={16} />
            {productCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-saffron-500 text-white text-[10px] font-bold flex items-center justify-center">
                {productCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-10">

        {/* ── Two promises, side by side ─────────────────────────────
            Left: the catalogue can do more than a round sponge.
            Right: if it can't, a human will. Sambramo is a concierge
            business — the escape hatch to a person is the product, not an
            admission that the catalogue failed. */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => { setStyle('designer'); gridRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="group relative h-40 rounded-3xl overflow-hidden text-left border border-gray-100"
          >
            <ProductImage
              query="designer fondant celebration cake"
              src={CAKE_OCCASION_PHOTOS['Kids & Theme']}
              emoji="🎨"
              alt=""
              className="absolute inset-0 w-full h-full"
              cinematic
            />
            <div className="absolute inset-0 bg-gradient-to-r from-plum-950/90 via-plum-900/60 to-transparent" />
            {/* Absolute, not `relative h-full`. ProductImage hard-codes
                `relative` on its own wrapper and that wins over any position
                class passed in, so the photo sits in normal flow and takes the
                banner's full height — a flow sibling after it gets pushed clean
                out of the overflow-hidden box. Every other overlay in this shop
                is absolutely positioned for the same reason. */}
            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h3 className="font-serif text-xl font-bold text-white leading-tight">Designer<br />cakes</h3>
              <p className="text-white/70 text-xs mt-1.5 max-w-[60%]">Fondant, sculpted and tiered — built to a brief</p>
              <span className="mt-3 inline-flex items-center gap-1 self-start bg-white text-plum-900 text-xs font-bold px-3.5 py-1.5 rounded-full group-hover:gap-2 transition-all">
                Explore <ChevronRight size={13} />
              </span>
            </div>
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative h-40 rounded-3xl overflow-hidden border border-gray-100"
          >
            <ProductImage
              query="custom cake decorating piping bag baker"
              src={CAKE_OCCASION_PHOTOS['Wedding']}
              emoji="🧁"
              alt=""
              className="absolute inset-0 w-full h-full"
              cinematic
            />
            <div className="absolute inset-0 bg-gradient-to-r from-berry-900/90 via-berry-900/60 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h3 className="font-serif text-xl font-bold text-white leading-tight">Something<br />entirely yours</h3>
              <p className="text-white/70 text-xs mt-1.5 max-w-[62%]">Describe it to us and we'll have it made</p>
              <span className="mt-3 inline-flex items-center gap-1.5 self-start bg-green-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full group-hover:gap-2.5 transition-all">
                <MessageCircle size={13} /> Chat with our expert
              </span>
            </div>
          </a>
        </section>

        {/* ── Occasions, by life stage ───────────────────────────────── */}
        {!loading && occasionGroups.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-900">Cakes for every celebration</h2>
              {occasion !== 'All' && (
                <button onClick={() => selectOccasion('All')} className="text-xs font-semibold text-plum-600 hover:text-plum-800 shrink-0">
                  Show all
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Every moment worth marking — from a first birthday to an apology.
            </p>

            <div className="space-y-6">
              {occasionGroups.map(group => (
                <div key={group.id}>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <h3 className="text-sm font-bold text-gray-800">{group.label}</h3>
                    <span className="text-xs text-gray-400 truncate">{group.blurb}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                    {group.occasions.map(o => {
                      const active = occasion === o.id
                      return (
                        <button
                          key={o.id}
                          onClick={() => selectOccasion(active ? 'All' : o.id)}
                          className="group shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5"
                        >
                          <span className={`relative w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden border-2 transition-colors ${
                            active ? 'border-saffron-500' : 'border-gray-100 group-hover:border-saffron-300'
                          }`}>
                            <ProductImage
                              src={CAKE_OCCASION_PHOTOS[o.id]}
                              query={`${o.label} cake`}
                              emoji={o.emoji}
                              alt=""
                              className="w-full h-full"
                              cinematic
                            />
                            {active && (
                              <span className="absolute inset-0 bg-saffron-500/25 flex items-center justify-center">
                                <span className="w-6 h-6 rounded-full bg-saffron-500 text-white flex items-center justify-center">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              </span>
                            )}
                          </span>
                          <span className={`text-[11px] font-semibold text-center leading-tight ${
                            active ? 'text-saffron-700' : 'text-gray-600 group-hover:text-plum-700'
                          }`}>
                            {o.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Results ────────────────────────────────────────────────── */}
        <section ref={gridRef} className="scroll-mt-20">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {occasion === 'All' ? 'All cakes' : `${occasionEmoji(occasion)} ${occasionLabel(occasion)}`}
              </h2>
              <p className="text-sm text-gray-500">
                {loading ? 'Loading…' : `${visible.length} cake${visible.length === 1 ? '' : 's'}`}
                {vegOnly && ' · eggless only'}
              </p>
            </div>
            {filtersActive && (
              <button onClick={clearFilters} className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {SORTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  sort === s.id ? 'bg-saffron-500 border-saffron-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-saffron-300'
                }`}
              >
                <s.icon size={12} /> {s.label}
              </button>
            ))}
          </div>

          {availableStyles.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {[{ id: 'All', label: 'Every style', emoji: '✨' }, ...availableStyles].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    style === s.id ? 'bg-plum-700 border-plum-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 py-10 text-center">Loading cakes…</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <div className="text-4xl">🎂</div>
              <p className="text-sm text-gray-500">Nothing matches that combination yet.</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Clear filters
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                >
                  Ask us to make it
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(p => (
                <CakeCard
                  key={p.id}
                  cake={p}
                  inCartQty={hasProduct(p.id) ? productQtyFor(p.id) : 0}
                  onCustomize={() => setCustomizing(p)}
                />
              ))}
            </div>
          )}
        </section>

        <FulfilmentNote variant="card" />

        {!loading && products.length > 0 && (
          <ReviewsScroller
            subjects={products.slice(0, 40).map(p => ({ type: 'product', id: p.id, name: p.name }))}
            title="What customers say about our cakes"
          />
        )}
      </div>

      {customizing && (
        <ProductCustomizeSheet
          product={customizing}
          onClose={() => setCustomizing(null)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            dispatch({
              type: 'ADD_PRODUCT',
              product: customizing,
              qty,
              unitPrice,
              lines,
              signature,
            })
            setCustomizing(null)
          }}
        />
      )}
    </div>
  )
}

/* ── One cake ─────────────────────────────────────────────────────────── */
function CakeCard({ cake, inCartQty, onCustomize }) {
  const { facts } = cake

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
      <Link to={`/shop/product/${cake.id}`} className="block relative">
        <ProductImage
          src={cake.image_url}
          query={cake.name}
          emoji={cake.emoji}
          alt={cake.image_alt}
          className="w-full h-36"
          cinematic
        />
        {facts.style.id !== 'classic' && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-plum-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {facts.style.emoji} {facts.style.label}
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-1.5 mb-1">
          {facts.veg && <VegMark className="mt-1" />}
          <Link to={`/shop/product/${cake.id}`} className="font-semibold text-gray-900 text-sm leading-snug hover:text-plum-700">
            {cake.name}
          </Link>
        </div>

        <RatingBadge subjectType="product" subjectId={cake.id} className="mb-1.5" />

        <p className="text-xs text-gray-500 mb-2 flex-1">{cake.description}</p>

        {(facts.serves || facts.diets.length > 0) && (
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {facts.serves && (
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                Serves {facts.serves.replace(' people', '')}
              </span>
            )}
            {facts.diets.map(d => (
              <span key={d.id} className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                {d.short}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="block font-bold text-plum-700 text-sm">{formatINR(cake.price)}</span>
            <span className="block text-[10px] text-gray-400 leading-tight">customisable</span>
          </div>
          {/* Always the customiser, never a bare add — a cake with no weight,
              flavour or egg preference chosen is not an order anyone can bake.
              Once one is in the cart the button keeps letting you configure
              another, because the second cake is usually a different one. */}
          <button
            onClick={onCustomize}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border-2 transition-colors ${
              inCartQty > 0
                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-saffron-500 bg-saffron-500 text-white hover:bg-saffron-600'
            }`}
          >
            {inCartQty > 0 ? <>{inCartQty} in cart · Add</> : <>ADD <Plus size={12} strokeWidth={3} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
