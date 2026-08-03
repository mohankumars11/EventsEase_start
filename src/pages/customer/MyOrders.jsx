import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'

const STATUS_CSS = {
  placed:     { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  processing: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'   },
}

export default function MyOrders() {
  const { user } = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [user])

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShoppingBag size={22} className="text-amber-500" /> My Orders
        </h1>
        <p className="text-sm text-gray-500 mb-6">Everything you've ordered from the Shop.</p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🛍️</div>
            <h3 className="font-bold text-gray-700">No orders yet</h3>
            <Link to="/shop" className="inline-block mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const css = STATUS_CSS[order.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
              return (
                <div key={order.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${css.bg} ${css.text}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {(order.order_items ?? []).map(item => (
                      <div key={item.id} className="flex justify-between text-sm text-gray-700">
                        <span>{item.product_name} × {item.qty}</span>
                        <span>{formatINR(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-400">
                      Payment: <span className={order.payment_status === 'paid' ? 'text-green-600 font-semibold' : ''}>{order.payment_status}</span>
                    </span>
                    <span className="font-bold text-gray-900">{formatINR(order.total)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
