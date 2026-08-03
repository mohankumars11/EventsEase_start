import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { SHOP_CATEGORIES } from '../../config/shop'
import { useCart } from '../../context/CartContext'

export default function Shop() {
  const navigate = useNavigate()
  const { productCount } = useCart()

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-gradient-to-br from-plum-950 via-plum-900 to-berry-900 pt-16 pb-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-extrabold text-white mb-4">
            Make Someone's Day
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-6">
            Big moments or little surprises — find something worth celebrating.
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SHOP_CATEGORIES.map(cat => (
            <Link
              key={cat.id}
              to={`/shop/${encodeURIComponent(cat.id)}`}
              className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:border-plum-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.emoji}</div>
              <p className="font-bold text-gray-900 text-sm">{cat.label}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{cat.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
