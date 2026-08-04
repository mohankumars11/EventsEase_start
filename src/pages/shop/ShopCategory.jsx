import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { SHOP_CATEGORIES } from '../../config/shop'
import { useCart } from '../../context/CartContext'
import ProductImage from '../../components/shop/ProductImage'
import RatingBadge from '../../components/reviews/RatingBadge'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'

export default function ShopCategory() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { dispatch, hasProduct, productCount } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [occasion, setOccasion] = useState(searchParams.get('occasion') ?? 'All')

  const meta = SHOP_CATEGORIES.find(c => c.id === category)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('category', category).order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [category])

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

  function selectOccasion(o) {
    setOccasion(o)
    setSearchParams(o === 'All' ? {} : { occasion: o }, { replace: true })
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
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No items tagged "{occasion}" yet in {meta?.label ?? category}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(p => {
              const inCart = hasProduct(p.id)
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                  <Link to={`/shop/product/${p.id}`}>
                    <ProductImage query={p.name} emoji={p.emoji} className="w-full h-36" />
                  </Link>
                  <div className="p-5 flex flex-col flex-1">
                  <Link to={`/shop/product/${p.id}`} className="font-semibold text-gray-900 text-sm mb-1 hover:text-plum-700">{p.name}</Link>
                  <RatingBadge subjectType="product" subjectId={p.id} className="mb-1.5" />
                  <p className="text-xs text-gray-500 mb-3 flex-1">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-plum-700 text-sm">{formatINR(p.price)}</span>
                    <button
                      onClick={() => dispatch({ type: 'ADD_PRODUCT', product: p })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-colors ${
                        inCart
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-saffron-500 text-white hover:bg-saffron-600'
                      }`}
                    >
                      {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
                      {inCart ? 'Added' : 'Add'}
                    </button>
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
    </div>
  )
}
