import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react'
import { POOJA_CATEGORIES } from '../../data/poojaItems'
import { formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useCart } from '../../context/CartContext'

const EVENT_ID   = 'pooja-items'
const EVENT_NAME = 'Pooja Items'

export default function PoojaItems() {
  const navigate = useNavigate()
  const { dispatch, hasItem, totalCount } = useCart()

  return (
    <CustomerLayout>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => navigate('/dashboard/customer')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5"
          >
            <ArrowLeft size={15} /> All events
          </button>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-6xl drop-shadow-lg">🪔</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold drop-shadow">Pooja Items</h1>
              <p className="text-white/80 mt-1 text-sm sm:text-base">Everything needed for your pooja, delivered</p>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-xl">
            From diyas to samagri kits to booking a pandit — pick exactly what you need for any festival or ritual.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {POOJA_CATEGORIES.map(cat => (
          <div key={cat.category} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-50">
              <span className="text-xl">{cat.emoji}</span>
              <span className="font-bold text-gray-800">{cat.category}</span>
              <span className="text-xs text-gray-400 font-medium">{cat.items.length} item{cat.items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {cat.items.map(item => {
                const inCart = hasItem(EVENT_ID, item.id)
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                        <p className="text-xs text-saffron-600 font-medium mt-0.5">
                          {formatINR(item.priceMin)} – {formatINR(item.priceMax)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => !inCart && dispatch({
                        type: 'ADD_SERVICE',
                        eventId: EVENT_ID,
                        eventName: EVENT_NAME,
                        service: { id: item.id, name: item.name, emoji: item.emoji, desc: item.desc, priceMin: item.priceMin, priceMax: item.priceMax, priceHint: `${formatINR(item.priceMin)} – ${formatINR(item.priceMax)}` },
                      })}
                      disabled={inCart}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-colors ${
                        inCart
                          ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                          : 'bg-saffron-500 text-white hover:bg-saffron-600'
                      }`}
                    >
                      {inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
                      {inCart ? 'Added' : 'Add to Cart'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {totalCount > 0 && (
          <div className="sticky bottom-20 md:bottom-4 flex justify-center pointer-events-none">
            <button
              onClick={() => navigate('/dashboard/customer/cart')}
              className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-plum-700 text-white font-bold text-base shadow-2xl hover:bg-plum-800"
            >
              <ShoppingCart size={18} />
              View Cart ({totalCount}) →
            </button>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
