import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, ShoppingCart, Package, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../utils/format'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function Cart() {
  const { cart, dispatch, totalCount } = useCart()
  const navigate = useNavigate()
  const [checkoutDone, setCheckoutDone] = useState(false)

  const hasAnything = cart.items.length > 0 || cart.packages.length > 0

  // Group items by event
  const byEvent = {}
  cart.items.forEach(item => {
    if (!byEvent[item.eventId]) byEvent[item.eventId] = { name: item.eventName, services: [], packages: [] }
    byEvent[item.eventId].services.push(item)
  })
  cart.packages.forEach(p => {
    if (!byEvent[p.eventId]) byEvent[p.eventId] = { name: p.eventName, services: [], packages: [] }
    byEvent[p.eventId].packages.push(p)
  })

  function proceedToEnquiry() {
    setCheckoutDone(true)
  }

  if (checkoutDone) {
    return (
      <CustomerLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Enquiry sent! 🎉</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your service requirements have been submitted. Matched vendors will respond with quotes within 24 hours.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-1">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">What happens next</p>
            <p className="text-sm text-gray-600">① Vendors review your requirements</p>
            <p className="text-sm text-gray-600">② You receive quotes in My Bookings</p>
            <p className="text-sm text-gray-600">③ Confirm your favourite and book</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => { dispatch({ type: 'CLEAR' }); navigate('/dashboard/customer/bookings') }}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
            >
              Track in My Bookings
            </button>
            <button
              onClick={() => { dispatch({ type: 'CLEAR' }); navigate('/dashboard/customer') }}
              className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Back to home
            </button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={20} className="text-amber-500" /> My Cart
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{totalCount} item{totalCount !== 1 ? 's' : ''} selected</p>
          </div>
        </div>

        {!hasAnything ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🛒</div>
            <h3 className="font-bold text-gray-700">Your cart is empty</h3>
            <p className="text-sm text-gray-400">Browse events and add services or packages to get started.</p>
            <Link to="/dashboard/customer" className="inline-block mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              Explore events
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byEvent).map(([eventId, data]) => (
              <div key={eventId} className="card overflow-hidden">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                  <span className="font-bold text-amber-800 text-sm">{data.name}</span>
                  <span className="text-xs text-amber-600">{data.services.length + data.packages.length} item{data.services.length + data.packages.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Packages */}
                {data.packages.map(p => (
                  <div key={p.key} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 bg-purple-50/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                        <Package size={18} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{p.pkg.name}</p>
                        <p className="text-xs text-gray-400">Complete package · {p.pkg.includes.length} services included</p>
                        <p className="text-xs text-amber-600 font-semibold mt-0.5">
                          {formatINR(p.pkg.price_min)} – {formatINR(p.pkg.price_max)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_PACKAGE', key: p.key })}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {/* Individual services */}
                {data.services.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{item.service.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{item.service.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.service.desc}</p>
                        <p className="text-xs text-amber-600 font-medium mt-0.5">{item.service.priceHint}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_ITEM', key: item.key })}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {/* Event date per event */}
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">📅 Set your event date(s)</h3>
              {Object.entries(byEvent).map(([eventId, data]) => (
                <div key={eventId}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{data.name}</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => dispatch({ type: 'SET_EVENT_DATE', eventId, date: e.target.value })}
                    value={cart.eventDates[eventId] ?? ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card p-5 bg-amber-50 border-amber-200 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">📋 Summary</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Individual services</span>
                <span className="font-medium">{cart.items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Packages</span>
                <span className="font-medium">{cart.packages.length}</span>
              </div>
              <div className="border-t border-amber-200 pt-3">
                <p className="text-xs text-gray-500">
                  Final pricing is confirmed by vendors after reviewing your requirements.
                  You'll receive quotes within 24 hours.
                </p>
              </div>
            </div>

            <button
              onClick={proceedToEnquiry}
              className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-base hover:bg-amber-600 shadow-lg flex items-center justify-center gap-2"
            >
              Send Requirements to Vendors
              <ChevronRight size={18} />
            </button>
            <p className="text-xs text-center text-gray-400">
              No payment now — vendors will send quotes and you choose who to book.
            </p>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
