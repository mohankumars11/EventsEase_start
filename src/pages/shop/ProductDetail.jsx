import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check, Minus, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import ProductImage from '../../components/shop/ProductImage'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dispatch, hasProduct, cart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center text-gray-400 text-sm">Loading…</div>

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-2xl text-gray-400">Product not found.</p>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    )
  }

  const inCart = hasProduct(product.id)
  const cartLine = cart.products.find(p => p.key === `prod__${product.id}`)

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-6">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <ProductImage query={product.name} emoji={product.emoji} className="w-full h-64 sm:h-full rounded-2xl" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-plum-600 uppercase tracking-wide mb-1">{product.category}</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-sm text-gray-500 mb-4 flex-1">{product.description}</p>
            <p className="text-3xl font-extrabold text-plum-700 mb-6">{formatINR(product.price)}</p>

            {inCart ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-gray-200 rounded-xl">
                  <button
                    onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: cartLine.key, qty: cartLine.qty - 1 })}
                    disabled={cartLine.qty <= 1}
                    className="p-3 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-semibold">{cartLine.qty}</span>
                  <button
                    onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: cartLine.key, qty: cartLine.qty + 1 })}
                    className="p-3 text-gray-500 hover:text-gray-800"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <Link to="/shop/cart" className="flex-1 flex items-center justify-center gap-2 bg-plum-700 hover:bg-plum-800 text-white font-bold py-3 rounded-xl">
                  <Check size={16} /> View Cart
                </Link>
              </div>
            ) : (
              <button
                onClick={() => dispatch({ type: 'ADD_PRODUCT', product })}
                className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3.5 rounded-xl"
              >
                <ShoppingCart size={17} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
