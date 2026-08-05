import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Trash2, Minus, Plus, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../config/shop'
import { createOrder as createTestOrder, initiatePayment, verifyPayment } from '../../lib/payment/testPaymentProvider'
import { IS_CONFIGURED as UPI_CONFIGURED, UPI_ID, buildAppUpiLinks, generateQrDataUrl } from '../../lib/payment/upiProvider'
import LocationAutocomplete from '../../components/common/LocationAutocomplete'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../../components/shop/UpiAppIcons'

const PAYMENT_METHODS = [
  { id: 'upi',       label: 'UPI' },
  { id: 'card',      label: 'Card' },
  { id: 'netbanking', label: 'Net Banking' },
]

export default function ShopCart() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, dispatch, productCount, productTotal } = useCart()

  const [step, setStep] = useState('cart') // cart | payment | done
  const [address, setAddress] = useState({ name: '', phone: '', line: '', city: '', area: '', pincode: '', lat: null, lon: null })
  const [method, setMethod] = useState('upi')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)
  const [placedOrderId, setPlacedOrderId] = useState(null)
  const [isFirstOrder, setIsFirstOrder] = useState(null) // null = still checking
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

  const [upiOrderId, setUpiOrderId] = useState(null)
  const [upiLinks, setUpiLinks] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  // Free delivery is a first-order acquisition offer, not a blanket
  // subsidy (a flat "always free above ₹999" erodes margin on every
  // repeat order with no incremental benefit — the discount only needs
  // to do its job once, to get someone to try the Shop).
  useEffect(() => {
    if (!user) return
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id).eq('payment_status', 'paid')
      .then(({ count }) => setIsFirstOrder((count ?? 0) === 0))
  }, [user])

  const qualifiesForFreeDelivery = isFirstOrder && productTotal >= FREE_DELIVERY_THRESHOLD
  const deliveryFee = productTotal === 0 || qualifiesForFreeDelivery ? 0 : DELIVERY_FEE
  const total = productTotal + deliveryFee
  const addressValid = address.name && address.phone && address.line && address.city && address.pincode

  async function createPendingOrder(paymentStatus) {
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: user.id,
      status: 'placed',
      subtotal: productTotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      address,
      payment_status: paymentStatus,
    }).select('id').single()
    if (orderErr) throw orderErr

    const items = cart.products.map(p => ({
      order_id: order.id,
      product_id: p.product.id,
      product_name: p.product.name,
      unit_price: p.product.price,
      qty: p.qty,
      subtotal: p.product.price * p.qty,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(items)
    if (itemsErr) throw itemsErr
    return order.id
  }

  // Direct UPI: no gateway involved. We create the order first (so there's
  // a real ID to use as the transaction reference), then build deep links
  // straight into Google Pay, PhonePe, Paytm, and any other UPI app —
  // pointed at Sambramo's own UPI ID — plus a QR code for desktop. There's
  // no callback to confirm success, so the order sits as payment_status
  // 'pending' until an admin checks their UPI app/bank and marks it paid.
  async function startUpiPayment() {
    setPaying(true)
    setError(null)
    try {
      const orderId = await createPendingOrder('pending')
      setUpiOrderId(orderId)
      const links = buildAppUpiLinks({
        amount: total,
        note: `Sambramo order ${orderId.slice(0, 8).toUpperCase()}`,
        txnRef: orderId,
      })
      setUpiLinks(links)
      setQrDataUrl(await generateQrDataUrl(links.upi))
    } catch (err) {
      setError(err.message || 'Could not start payment.')
    } finally {
      setPaying(false)
    }
  }

  function confirmUpiPaymentDone() {
    dispatch({ type: 'CLEAR_PRODUCTS' })
    setPlacedOrderId(upiOrderId)
    setPendingConfirmation(true)
    setStep('done')
  }

  function copyUpiId() {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function runPayment(outcome) {
    setPaying(true)
    setError(null)
    try {
      const { orderId } = await createTestOrder({ amount: total })
      const result = await initiatePayment({ orderId, method, outcome })
      if (result.status !== 'success') {
        setError('Payment failed. No charge was made — you can try again.')
        setPaying(false)
        return
      }
      const { verified } = await verifyPayment({ paymentRef: result.paymentRef })
      if (!verified) {
        setError('Payment could not be verified. No order was created.')
        setPaying(false)
        return
      }

      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        customer_id: user.id,
        status: 'placed',
        subtotal: productTotal,
        delivery_fee: deliveryFee,
        discount: 0,
        total,
        address,
        payment_status: 'paid',
        payment_ref: result.paymentRef,
      }).select('id').single()
      if (orderErr) throw orderErr

      const items = cart.products.map(p => ({
        order_id: order.id,
        product_id: p.product.id,
        product_name: p.product.name,
        unit_price: p.product.price,
        qty: p.qty,
        subtotal: p.product.price * p.qty,
      }))
      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw itemsErr

      dispatch({ type: 'CLEAR_PRODUCTS' })
      setPlacedOrderId(order.id)
      setStep('done')
    } catch (err) {
      setError(err.message || 'Something went wrong placing your order.')
    } finally {
      setPaying(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5 py-16">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{pendingConfirmation ? 'Order received! 🎉' : 'Order placed! 🎉'}</h2>
          <p className="text-gray-500 text-sm">
            Order #{placedOrderId?.slice(0, 8).toUpperCase()}
            {pendingConfirmation
              ? " — we'll confirm your UPI payment shortly and get it ready for delivery."
              : " — we'll get it ready for delivery."}
          </p>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => navigate('/dashboard/customer/orders')} className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              View My Orders
            </button>
            <button onClick={() => navigate('/shop')} className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={20} className="text-amber-500" /> Shop Cart
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{productCount} item{productCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {cart.products.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🛍️</div>
            <h3 className="font-bold text-gray-700">Your cart is empty</h3>
            <Link to="/shop" className="inline-block mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card overflow-hidden">
              {cart.products.map(p => (
                <div key={p.key} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{p.product.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{p.product.name}</p>
                      <p className="text-xs text-amber-600 font-medium mt-0.5">{formatINR(p.product.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: p.key, qty: p.qty - 1 })} disabled={p.qty <= 1} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-gray-700">{p.qty}</span>
                      <button onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: p.key, qty: p.qty + 1 })} className="p-1.5 text-gray-500 hover:text-gray-800">
                        <Plus size={13} />
                      </button>
                    </div>
                    <button onClick={() => dispatch({ type: 'REMOVE_PRODUCT', key: p.key })} className="p-2 text-gray-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {step === 'cart' && (
              <div className="card p-5 space-y-4">
                <h3 className="font-bold text-gray-800 text-sm">📍 Delivery Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <input placeholder="Phone number" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <input placeholder="Address line (house/flat, street)" value={address.line} onChange={e => setAddress(a => ({ ...a, line: e.target.value }))} className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <LocationAutocomplete
                  value={{ city: address.city, area: address.area, pincode: address.pincode }}
                  onChange={loc => setAddress(a => ({ ...a, city: loc.city, area: loc.area, pincode: loc.pincode || a.pincode, lat: loc.lat, lon: loc.lon }))}
                />
              </div>
            )}

            <div className="card p-5 bg-amber-50 border-amber-200 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatINR(productTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}</span>
              </div>
              {deliveryFee > 0 && isFirstOrder && (
                <p className="text-xs text-gray-400">Free delivery on your first order above {formatINR(FREE_DELIVERY_THRESHOLD)} — add {formatINR(FREE_DELIVERY_THRESHOLD - productTotal)} more to qualify</p>
              )}
              {deliveryFee === 0 && qualifiesForFreeDelivery && (
                <p className="text-xs text-green-600 font-medium">🎉 Free delivery unlocked on your first order!</p>
              )}
              {deliveryFee > 0 && isFirstOrder === false && (
                <p className="text-xs text-gray-400">Free delivery is a first-order welcome offer</p>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-amber-200 pt-2">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            {step === 'cart' && (
              <button
                onClick={() => addressValid && setStep('payment')}
                disabled={!addressValid}
                className="w-full py-4 rounded-2xl bg-plum-700 disabled:opacity-40 text-white font-bold text-base hover:bg-plum-800 shadow-lg"
              >
                Proceed to Payment
              </button>
            )}

            {step === 'payment' && UPI_CONFIGURED && !upiOrderId && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
                  <ShieldAlert size={15} /> Pay directly via UPI — Google Pay, PhonePe, Paytm or any UPI app
                </div>
                <button
                  onClick={startUpiPayment}
                  disabled={paying}
                  className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-base shadow-lg"
                >
                  {paying ? 'Preparing payment…' : `Pay ${formatINR(total)}`}
                </button>
                <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  ← Back to address
                </button>
              </div>
            )}

            {step === 'payment' && UPI_CONFIGURED && upiOrderId && upiLinks && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
                  <ShieldAlert size={15} /> Scan or tap to pay {formatINR(total)} to Sambramo
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <img src={qrDataUrl} alt="UPI QR code" className="w-48 h-48 rounded-xl border border-gray-200" />
                    <p className="text-xs text-gray-400">Scan with any UPI app</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <a href={upiLinks.gpay} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-plum-400 text-xs font-semibold text-gray-700">
                    <GooglePayIcon className="w-9 h-9" /> Google Pay
                  </a>
                  <a href={upiLinks.phonepe} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-plum-400 text-xs font-semibold text-gray-700">
                    <PhonePeIcon className="w-9 h-9" /> PhonePe
                  </a>
                  <a href={upiLinks.paytm} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-plum-400 text-xs font-semibold text-gray-700">
                    <PaytmIcon className="w-9 h-9" /> Paytm
                  </a>
                </div>
                <a href={upiLinks.upi} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                  <UpiIcon className="w-6 h-6" /> Other UPI app (BHIM & more)
                </a>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">Pay manually to UPI ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 truncate">{UPI_ID}</p>
                  </div>
                  <button onClick={copyUpiId} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <button
                  onClick={confirmUpiPaymentDone}
                  className="w-full py-4 rounded-2xl bg-plum-700 hover:bg-plum-800 text-white font-bold text-base shadow-lg"
                >
                  I've completed the payment
                </button>
                <p className="text-[11px] text-gray-400 text-center">We'll confirm your payment against our UPI account and update your order shortly.</p>
              </div>
            )}

            {step === 'payment' && !UPI_CONFIGURED && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
                  <ShieldAlert size={15} /> TEST PAYMENT — no real money is charged
                </div>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        method === m.id ? 'border-plum-500 bg-plum-50 text-plum-700' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => runPayment('success')}
                    disabled={paying}
                    className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm"
                  >
                    {paying ? 'Processing…' : 'Simulate Success'}
                  </button>
                  <button
                    onClick={() => runPayment('failure')}
                    disabled={paying}
                    className="flex-1 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-bold text-sm border border-red-200"
                  >
                    Simulate Failure
                  </button>
                </div>
                <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  ← Back to address
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
