import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Trash2, Minus, Plus, CheckCircle2, AlertCircle, ShieldAlert, Tag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../config/shop'
import { createOrder as createTestOrder, initiatePayment, verifyPayment, IS_TEST_MODE } from '../../lib/payment/testPaymentProvider'
import { BRAND } from '../../config/sambramo'
import { friendlyError } from '../../context/ToastContext'
import { IS_CONFIGURED as UPI_CONFIGURED, UPI_ID, buildAppUpiLinks, generateQrDataUrl } from '../../lib/payment/upiProvider'
import DeliveryLocationPicker from '../../components/shop/DeliveryLocationPicker'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../../components/shop/UpiAppIcons'
import { getAddressErrors, scrubDigits } from '../../utils/validators'

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
  const [address, setAddress] = useState({ name: '', phone: '', line: '', city: '', pincode: '', lat: null, lon: null })
  const [addressTouched, setAddressTouched] = useState(false)
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
  const [tappedApp, setTappedApp] = useState(null)

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null) // { coupon_id, code, discount_amount, message }
  const [couponError, setCouponError] = useState(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

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
  const discountAmount = coupon?.discount_amount ?? 0
  const total = Math.max(0, productTotal + deliveryFee - discountAmount)
  const addressErrors = getAddressErrors(address)
  const addressValid = Object.keys(addressErrors).length === 0

  function handleProceed() {
    if (!addressValid) { setAddressTouched(true); return }
    setStep('payment')
  }

  // The cart page is public so a guest never loses a basket at the door,
  // but an order needs an account — it's written against `user.id`, and
  // the customer has to be able to find it again under My Orders. The ask
  // happens here, at the last possible moment, with the cart preserved
  // (it lives in localStorage) and the return trip already set up.
  const signInToCheckout = { pathname: '/shop/cart', search: '' }

  async function applyCoupon() {
    if (!couponInput.trim()) return
    setApplyingCoupon(true)
    setCouponError(null)
    try {
      const { data, error: err } = await supabase.rpc('validate_coupon', {
        p_code: couponInput.trim(),
        p_order_total: productTotal,
        p_customer_id: user.id,
      })
      if (err) throw err
      if (!data?.valid) { setCouponError(data?.message || 'Invalid coupon code.'); setCoupon(null); return }
      setCoupon(data)
    } catch (err) {
      setCouponError(friendlyError(err, 'Could not validate this coupon.'))
      setCoupon(null)
    } finally {
      setApplyingCoupon(false)
    }
  }

  function removeCoupon() {
    setCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  // Redemption only happens once an order is actually placed — an
  // abandoned cart never burns a coupon's use.
  async function redeemAppliedCoupon() {
    if (!coupon) return
    await supabase.rpc('redeem_coupon', { p_coupon_id: coupon.coupon_id })
  }

  async function createPendingOrder(paymentStatus) {
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: user.id,
      status: 'placed',
      subtotal: productTotal,
      delivery_fee: deliveryFee,
      discount: discountAmount,
      total,
      address,
      payment_status: paymentStatus,
    }).select('id').single()
    if (orderErr) throw orderErr

    const items = cart.products.map(p => ({
      order_id: order.id,
      product_id: p.product.id,
      product_name: p.product.name,
      category: p.product.category ?? null,
      occasion: p.product.occasion ?? null,
      unit_price: p.product.price,
      qty: p.qty,
      subtotal: p.product.price * p.qty,
      customization: p.customization ?? null,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(items)
    if (itemsErr) throw itemsErr
    await redeemAppliedCoupon()
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
      setError(friendlyError(err, 'Could not start payment. Please try again.'))
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

  function openUpiApp(appName) {
    setTappedApp(appName)
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
        discount: discountAmount,
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
        category: p.product.category ?? null,
        occasion: p.product.occasion ?? null,
        unit_price: p.product.price,
        qty: p.qty,
        subtotal: p.product.price * p.qty,
        customization: p.customization ?? null,
      }))
      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw itemsErr
      await redeemAppliedCoupon()

      dispatch({ type: 'CLEAR_PRODUCTS' })
      setPlacedOrderId(order.id)
      setStep('done')
    } catch (err) {
      // Raw Postgres text ("null value in column … violates not-null
      // constraint") at the moment someone is trying to pay is the worst
      // place in the product to leak an implementation detail.
      setError(friendlyError(err, 'Something went wrong placing your order. No payment was taken.'))
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
                      {p.customization && (
                        <p className="text-xs text-gray-400 mt-1 italic truncate max-w-[220px]">"{p.customization}"</p>
                      )}
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
                  <div>
                    <input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {addressTouched && addressErrors.name && <p className="text-xs text-red-600 mt-1">{addressErrors.name}</p>}
                  </div>
                  <div>
                    <input placeholder="Phone number" inputMode="numeric" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: scrubDigits(e.target.value, 10) }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {addressTouched && addressErrors.phone && <p className="text-xs text-red-600 mt-1">{addressErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <input placeholder="Address line (house/flat, street)" value={address.line} onChange={e => setAddress(a => ({ ...a, line: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {addressTouched && addressErrors.line && <p className="text-xs text-red-600 mt-1">{addressErrors.line}</p>}
                  </div>
                </div>
                <DeliveryLocationPicker
                  value={{ lat: address.lat, lon: address.lon, city: address.city, pincode: address.pincode, line: address.line }}
                  onChange={patch => setAddress(a => ({ ...a, ...patch }))}
                />
                {addressTouched && (addressErrors.city || addressErrors.pincode) && (
                  <p className="text-xs text-red-600">{addressErrors.city || addressErrors.pincode}</p>
                )}
              </div>
            )}

            {/* Coupon validation is per-customer (validate_coupon takes
                p_customer_id), so it can't run for a guest — offering the
                field anyway would just produce an error on Apply. */}
            {step === 'cart' && user && (
              <div className="card p-5 space-y-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Tag size={14} className="text-amber-500" /> Have a coupon?</h3>
                {coupon ? (
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-green-700">{coupon.code}</p>
                      <p className="text-xs text-green-600">{coupon.message} — you save {formatINR(coupon.discount_amount)}</p>
                    </div>
                    <button onClick={removeCoupon} className="shrink-0 p-1.5 text-green-600 hover:text-green-800">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-plum-700 hover:bg-plum-800 disabled:opacity-40 text-white font-semibold text-sm"
                    >
                      {applyingCoupon ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-600">{couponError}</p>}
              </div>
            )}

            <div className="card p-5 bg-amber-50 border-amber-200 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatINR(productTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Coupon ({coupon.code})</span><span>-{formatINR(discountAmount)}</span>
                </div>
              )}
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
              user ? (
                <button
                  onClick={handleProceed}
                  className="w-full py-4 rounded-2xl bg-plum-700 text-white font-bold text-base hover:bg-plum-800 shadow-lg"
                >
                  Proceed to Payment
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    state={{ from: signInToCheckout }}
                    className="flex w-full items-center justify-center py-4 rounded-2xl bg-plum-700 text-white font-bold text-base hover:bg-plum-800 shadow-lg"
                  >
                    Sign in to checkout
                  </Link>
                  <p className="text-center text-xs text-gray-400">
                    Your cart is saved — you'll come straight back here.
                  </p>
                </div>
              )
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
                  <ShieldAlert size={15} /> Step 1 — Tap an app below to pay {formatINR(total)} to Sambramo
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <img src={qrDataUrl} alt="UPI QR code" className="w-48 h-48 rounded-xl border border-gray-200" />
                    <p className="text-xs text-gray-400">Or scan with any UPI app</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={upiLinks.gpay}
                    onClick={() => openUpiApp('Google Pay')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold text-gray-700 ${tappedApp === 'Google Pay' ? 'border-plum-500 bg-plum-50' : 'border-gray-200 hover:border-plum-400'}`}
                  >
                    <GooglePayIcon className="w-9 h-9" /> Google Pay
                  </a>
                  <a
                    href={upiLinks.phonepe}
                    onClick={() => openUpiApp('PhonePe')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold text-gray-700 ${tappedApp === 'PhonePe' ? 'border-plum-500 bg-plum-50' : 'border-gray-200 hover:border-plum-400'}`}
                  >
                    <PhonePeIcon className="w-9 h-9" /> PhonePe
                  </a>
                  <a
                    href={upiLinks.paytm}
                    onClick={() => openUpiApp('Paytm')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold text-gray-700 ${tappedApp === 'Paytm' ? 'border-plum-500 bg-plum-50' : 'border-gray-200 hover:border-plum-400'}`}
                  >
                    <PaytmIcon className="w-9 h-9" /> Paytm
                  </a>
                </div>
                <a
                  href={upiLinks.upi}
                  onClick={() => openUpiApp('your UPI app')}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-xs font-semibold ${tappedApp === 'your UPI app' ? 'border-plum-500 bg-plum-50 text-plum-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <UpiIcon className="w-6 h-6" /> Other UPI app (BHIM & more)
                </a>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">Or pay manually to UPI ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 truncate">{UPI_ID}</p>
                  </div>
                  <button onClick={copyUpiId} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div className={`rounded-xl border p-4 space-y-3 ${tappedApp ? 'border-plum-200 bg-plum-50' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold ${tappedApp ? 'text-plum-700' : 'text-gray-400'}`}>
                    {tappedApp
                      ? `Step 2 — You've been redirected to ${tappedApp}. Complete the payment there, then come back to this tab.`
                      : 'Step 2 — After you pay, come back to this tab.'}
                  </p>
                  <button
                    onClick={confirmUpiPaymentDone}
                    disabled={!tappedApp}
                    className="w-full py-4 rounded-2xl bg-plum-700 hover:bg-plum-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg"
                  >
                    Payment Completed
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">We'll confirm your payment against our UPI account and update your order shortly.</p>
                </div>
              </div>
            )}

            {/* Production build with no payment method configured. Tell
                the customer the truth and give them a human to talk to —
                the alternative that used to render here was the test
                harness's "Simulate Success" button, which would have
                created a genuine paid order for free. */}
            {step === 'payment' && !UPI_CONFIGURED && !IS_TEST_MODE && (
              <div className="card p-5 space-y-4">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Online payment is temporarily unavailable. Your cart is saved —
                    message us and we'll complete this order with you directly.
                  </span>
                </div>
                <a
                  href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(`Hi Sambramo — I'd like to place a shop order for ${formatINR(total)}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm"
                >
                  Complete my order on WhatsApp
                </a>
                <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  ← Back to address
                </button>
              </div>
            )}

            {step === 'payment' && !UPI_CONFIGURED && IS_TEST_MODE && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
                  <ShieldAlert size={15} /> TEST PAYMENT — dev build only, no real money is charged
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
