import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check, Minus, Plus, Heart, Flame, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { SHOP_CATEGORIES, CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import { useCart } from '../../context/CartContext'
import ProductImage from '../../components/shop/ProductImage'
import RatingBadge from '../../components/reviews/RatingBadge'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import CustomizeModal from '../../components/shop/CustomizeModal'

const SORTS = [
  { id: 'default', label: 'Featured',      icon: Sparkles },
  { id: 'loved',    label: 'Most Loved',    icon: Heart },
  { id: 'ordered',  label: 'Most Ordered',  icon: Flame },
]

export default function ShopCategory() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { dispatch, hasProduct, productLines, productCount } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [occasion, setOccasion] = useState(searchParams.get('occasion') ?? 'All')
  const [sort, setSort] = useState('default')
  const [ratings, setRatings] = useState({})   // product id -> avg_rating
  const [orders, setOrders]   = useState({})   // product id -> total_ordered
  const [customizeTarget, setCustomizeTarget] = useState(null) // product awaiting qty/message

  const meta = SHOP_CATEGORIES.find(c => c.id === category)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('category', category).order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [category])

  // Ratings + order-volume, fetched once the product set for this
  // category is known — powers the "Most Loved" / "Most Ordered" sort
  // chips. Missing data just sorts last, never hides a product.
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

  // Re-sync the occasion filter when arriving via a deep link (e.g. an
  // "upcoming festival" card routing straight into "Diwali" within Hampers).
  useEffect(() => {
    setOccasion(searchParams.get('occasion') ?? 'All')
  }, [category, searchParams])

  const occasions = useMemo(
    () => [...new Set(products.map(p => p.occasion).filter(Boolean))].sort(),
    [products]
  )
  const filteredProducts = occasion === 'All' ? products : products.filter(p => p.occasion === occasion)

  const sortedProducts = useMemo(() => {
    if (sort === 'default') return filteredProducts
    const list = [...filteredProducts]
    if (sort === 'loved') {
      list.sort((a, b) => (ratings[String(b.id)] ?? -1) - (ratings[String(a.id)] ?? -1))
    } else if (sort === 'ordered') {
      list.sort((a, b) => (orders[b.id] ?? -1) - (orders[a.id] ?? -1))
    }
    return list
  }, [filteredProducts, sort, ratings, orders])

  function selectOccasion(o) {
    setOccasion(o)
    setSearchParams(o === 'All' ? {} : { occasion: o }, { replace: true })
  }

  function handleAddClick(p) {
    const fieldConfig = CUSTOMIZABLE_CATEGORIES[p.category]
    if (fieldConfig) { setCustomizeTarget(p); return }
    dispatch({ type: 'ADD_PRODUCT', product: p })
  }

  function confirmCustomization({ qty, customization }) {
    dispatch({ type: 'ADD_PRODUCT', product: customizeTarget, qty, customization })
    setCustomizeTarget(null)
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate('/shop')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-5">
          <ArrowLeft size={15} /> All categories
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {meta?.emoji} {meta?.label ?? category}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{meta?.tagline}</p>
          </div>
          <Link to="/shop/cart" className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-plum-300">
            <ShoppingCart size={15} /> Cart {productCount > 0 && `(${productCount})`}
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                sort === s.id
                  ? 'bg-saffron-500 border-saffron-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-saffron-300'
              }`}
            >
              <s.icon size={12} /> {s.label}
            </button>
          ))}
        </div>

        {!loading && occasions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {['All', ...occasions].map(o => (
              <button
                key={o}
                onClick={() => selectOccasion(o)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  occasion === o
                    ? 'bg-plum-700 border-plum-700 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : sortedProducts.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No items tagged "{occasion}" yet in {meta?.label ?? category}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProducts.map(p => {
              const inCart = hasProduct(p.id)
              // One product can occupy several cart lines once it has been
              // configured (cakes), so the stepper drives the first line and
              // the cart page is where multiple configurations get managed.
              // Nothing in this category is configurable today, so in practice
              // there is exactly one.
              const cartLine = productLines(p.id)[0]
              // `group` drives the slow hover zoom inside ProductImage.
              return (
                <div key={p.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                  <Link to={`/shop/product/${p.id}`} className="block">
                    <ProductImage
                      src={p.image_url}
                      query={p.name}
                      emoji={p.emoji}
                      alt={p.image_alt}
                      className="w-full h-36"
                      cinematic
                    />
                  </Link>
                  <div className="p-5 flex flex-col flex-1">
                  <Link to={`/shop/product/${p.id}`} className="font-semibold text-gray-900 text-sm mb-1 hover:text-plum-700">{p.name}</Link>
                  <RatingBadge subjectType="product" subjectId={p.id} className="mb-1.5" />
                  <p className="text-xs text-gray-500 mb-3 flex-1">{p.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-plum-700 text-sm">{formatINR(p.price)}</span>
                    {inCart && cartLine ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: cartLine.key, qty: cartLine.qty - 1 })} disabled={cartLine.qty <= 1} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-semibold text-gray-700">{cartLine.qty}</span>
                          <button onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: cartLine.key, qty: cartLine.qty + 1 })} className="p-1.5 text-gray-500 hover:text-gray-800">
                            <Plus size={12} />
                          </button>
                        </div>
                        <Link to="/shop/cart" className="flex items-center gap-1 px-2.5 py-2 rounded-lg font-semibold text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                          <Check size={12} /> View Cart
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddClick(p)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs bg-saffron-500 text-white hover:bg-saffron-600 transition-colors"
                      >
                        <ShoppingCart size={13} /> Add to Cart
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="mt-6">
            <ReviewsScroller
              subjects={products.map(p => ({ type: 'product', id: p.id, name: p.name }))}
              title={`What customers say about ${meta?.label ?? category}`}
            />
          </div>
        )}
      </div>

      {customizeTarget && (
        <CustomizeModal
          product={customizeTarget}
          fieldConfig={CUSTOMIZABLE_CATEGORIES[customizeTarget.category]}
          onClose={() => setCustomizeTarget(null)}
          onConfirm={confirmCustomization}
        />
      )}
    </div>
  )
}
