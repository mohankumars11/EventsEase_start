import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShoppingBag, Trash2, Minus, Plus, CheckCircle2, AlertCircle, ShieldAlert,
  Tag, X, CalendarDays, MapPin, Receipt, Wallet, Pencil, ArrowRight,
  PartyPopper, Truck, BadgePercent,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useCity } from '../../context/CityContext'
import { supabase } from '../../lib/supabase'
import { formatINR, todayISO, humanDate } from '../../utils/format'
// The delivery rule itself now lives in lib/savings, which applies it
// alongside the coupon rules so the two cannot disagree about what this
// basket is worth. Nothing in this file re-derives either any more.
import { createOrder as createTestOrder, initiatePayment, verifyPayment, IS_TEST_MODE } from '../../lib/payment/testPaymentProvider'
import { BRAND } from '../../config/sambramo'
import { friendlyError } from '../../context/ToastContext'
import { IS_CONFIGURED as UPI_CONFIGURED, UPI_ID, buildAppUpiLinks, generateQrDataUrl } from '../../lib/payment/upiProvider'
import DeliveryLocationPicker from '../../components/shop/DeliveryLocationPicker'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../../components/common/UpiAppIcons'
import { getAddressErrors, scrubDigits } from '../../utils/validators'
import FulfilmentNote from '../../components/shop/FulfilmentNote'
import RemoteImage from '../../components/common/RemoteImage'
import CheckoutHeader from '../../components/shop/CheckoutHeader'
import CheckoutFooter from '../../components/shop/CheckoutFooter'
import SavingsStack from '../../components/shop/SavingsStack'
import RecommendationRail from '../../components/shop/RecommendationRail'
import CartBridge from '../../components/common/CartBridge'
import { usePublicOffers } from '../../hooks/usePublicOffers'
import { basketSavings } from '../../lib/savings'
import { describeSelections, summaryLines } from '../../config/customizers'

const PAYMENT_METHODS = [
  { id: 'upi',       label: 'UPI' },
  { id: 'card',      label: 'Card' },
  { id: 'netbanking', label: 'Net Banking' },
]

/**
 * Section accents.
 *
 * Every panel on this page opens with the same header shape — tinted strip,
 * icon tile, tracked title, step number — and they are told apart by colour
 * alone. That is the point: a checkout is one long scroll of forms, and four
 * identical white cards is how someone loses their place in it. Each colour is
 * already load-bearing elsewhere in the app, so nothing new has to be learnt:
 * saffron is the brand's own accent, green is the storefront, plum is the
 * concierge side, and chilli is money off — never used here for anything that
 * is not a saving.
 */
const ACCENTS = {
  saffron: { strip: 'from-saffron-100/90',  rule: 'bg-saffron-400', tile: 'bg-saffron-500/15 text-saffron-700', num: 'bg-saffron-500 text-ink' },
  forest:  { strip: 'from-forest-100/90',   rule: 'bg-forest-500',  tile: 'bg-forest-500/15 text-forest-700',   num: 'bg-forest-600 text-white' },
  plum:    { strip: 'from-plum-100/90',     rule: 'bg-plum-500',    tile: 'bg-plum-500/15 text-plum-700',       num: 'bg-plum-600 text-ink' },
  chilli:  { strip: 'from-chilli-100/90',   rule: 'bg-chilli-500',  tile: 'bg-chilli-500/15 text-chilli-700',   num: 'bg-chilli-600 text-white' },
}

function SectionCard({ icon: Icon, title, subtitle, accent = 'forest', badge, action, children, className = '' }) {
  const a = ACCENTS[accent] ?? ACCENTS.forest
  return (
    <section className={`checkout-card ${className}`}>
      <header className={`checkout-head bg-gradient-to-r ${a.strip} via-white/70 to-white`}>
        {/* The one vertical stroke that turns a tinted band into a header
            rather than a highlighted row. */}
        <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-1 ${a.rule}`} />
        <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.tile}`}>
          <Icon size={17} />
        </span>
        <div className="relative z-10 min-w-0 flex-1">
          <h3 className="truncate text-[12.5px] font-extrabold uppercase tracking-[0.09em] text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-mute">{subtitle}</p>}
        </div>
        {action && <div className="relative z-10 shrink-0">{action}</div>}
        {badge && (
          <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${a.num}`}>
            {badge}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

export default function ShopCart() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, dispatch, productCount, productTotal, lineUnitPrice } = useCart()
  // `chosen` gates the seed below: an unchosen city is the app's fallback
  // guess, and silently pre-filling a delivery address with a guess is how a
  // parcel goes to the wrong city with the customer's own name on it.
  //
  // Serviceability deliberately is not read here. getAddressErrors already
  // validates the address's own city against the live list, and the address is
  // where the parcel actually goes. Guarding on the *preference* too would
  // block a Bengaluru customer from sending a gift to a Bengaluru address
  // because they had set their own city to somewhere we don't cover yet.
  const { city: chosenCity, chosen: citySeeded } = useCity()

  const [step, setStep] = useState('cart') // cart | payment | done
  /**
   * The city is seeded from the customer's chosen city rather than starting
   * blank. They told the app where they are — in the app bar, in the delivery
   * slip, or by letting it find them — and asking again at checkout is asking
   * a question we already have the answer to, at the exact point where extra
   * fields cost orders. Still fully editable: the delivery address is not
   * always the address you live at, which is especially true of a shop that
   * sells gifts.
   */
  const [address, setAddress] = useState(() => ({
    name: '', phone: '', line: '',
    city: chosenCity && citySeeded ? chosenCity : '',
    pincode: '', lat: null, lon: null,
  }))
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

  // Every live coupon this visitor could use — the same list the storefront's
  // offers rail advertises, so the cart can never fail to mention a code the
  // shop just showed them two screens ago.
  const offers = usePublicOffers()

  /**
   * What this basket saves, and what it is still leaving on the table.
   *
   * The delivery rule, the coupon cap and the first-order condition all used
   * to be re-derived here in three separate expressions. They now come from
   * lib/savings, which applies exactly the rules `validate_coupon` applies —
   * so the figure beside the total and the figure the RPC returns are computed
   * the same way, and a percent coupon that hits its ceiling says so instead
   * of silently paying out less than the badge promised.
   *
   * `appliedCoupon` is passed through so the server's own number wins the
   * moment there is one. Ours is only ever used to describe what is available.
   */
  const valueStack = basketSavings({
    subtotal: productTotal,
    coupons: offers,
    isFirstOrder,
    appliedCoupon: coupon,
  })

  const deliveryFee = productTotal === 0 ? 0 : valueStack.delivery.fee
  const discountAmount = coupon?.discount_amount ?? 0
  const total = Math.max(0, productTotal + deliveryFee - discountAmount)
  const addressErrors = getAddressErrors(address)
  // Only what is actually off the bill. Never includes a coupon the customer
  // has not applied — see SavingsStack for why those two must stay apart.
  const savings = valueStack.saved

  /**
   * The gap the recommendation rail should aim at.
   *
   * Whichever threshold is nearest and real: free delivery, or the next coupon
   * worth crossing to. Handed to the ranker, which boosts items priced to
   * close it — so "add ₹212 more" is followed by something that actually costs
   * about ₹212, rather than leaving the customer to go and find one.
   */
  const budgetGap = valueStack.delivery.shortfall ?? valueStack.unlock?.shortfall ?? null

  /**
   * One-tap claim from the savings stack.
   *
   * Applies straight away rather than filling the field and waiting: the code
   * came from `coupons` and the basket already clears its minimum, so there is
   * nothing for the customer to decide. The field is filled too, so that if
   * the RPC does refuse it — an exhausted `max_uses`, say — they are left
   * looking at the code and the reason rather than at an empty box.
   */
  function useSuggestedCode(code) {
    if (!code) return
    setCouponInput(code)
    applyCoupon(code)
  }

  // When the order is needed. Captured on the storefront by DeliverySlip and
  // confirmed here, because it is the one delivery fact this shop never asked
  // for: the whole catalogue is occasions — birthdays, festivals, anniversaries
  // — and an occasion without a date cannot be fulfilled. It was previously
  // chased down over WhatsApp after the customer had already paid.
  const neededOn = cart.deliveryDate ?? ''
  const dateError = !neededOn
    ? 'Tell us the date you need this'
    : neededOn < todayISO()
      ? 'That date has already passed'
      : null

  const addressValid = Object.keys(addressErrors).length === 0 && !dateError

  /**
   * One delivery payload, used by both payment paths — the same reasoning
   * buildOrderItems already carries: these two had drifted apart once, and an
   * order must serialise identically whether it was paid by UPI or the test
   * gateway.
   *
   * `neededOn` rides inside the existing `address` JSONB column rather than a
   * new one. orders.address is already JSONB (migration 009), so this ships
   * without a schema change — which matters, because migrations here are
   * applied by hand and code that depends on an unapplied one is code that
   * breaks in production only.
   */
  const deliveryAddress = { ...address, neededOn: neededOn || null }

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

  /**
   * `codeArg` lets the savings stack claim a code in one tap rather than
   * filling a field the customer then has to find and submit. Defaulting to
   * the input keeps the Apply button's behaviour identical — but note the
   * button must now call this through an arrow, since a bare onClick would
   * hand it the click event as the code.
   */
  async function applyCoupon(codeArg) {
    const code = (typeof codeArg === 'string' ? codeArg : couponInput).trim()
    if (!code) return
    setApplyingCoupon(true)
    setCouponError(null)
    try {
      const { data, error: err } = await supabase.rpc('validate_coupon', {
        p_code: code,
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

  // One definition of an order line, used by both payment paths — they had
  // drifted apart already once, and a configured cake has to serialise
  // identically whether it was paid for by UPI or by the test gateway.
  //
  // `unit_price` is the price actually charged: for a configured cake that is
  // the chosen weight's price plus every add-on, not the catalogue price. The
  // choices themselves go into `customization` (TEXT, migration 019) as plain
  // readable lines, because the reader is whoever is packing the box. A
  // free-text gift message from CustomizeModal lands in the same column, so
  // the two are joined rather than one overwriting the other.
  function buildOrderItems(orderId) {
    return cart.products.map(p => {
      const unitPrice = lineUnitPrice(p)
      const configured = p.optionLines ? describeSelections(p.optionLines) : null
      const customization = [configured, p.customization].filter(Boolean).join('\n') || null

      return {
        order_id:      orderId,
        product_id:    p.product.id,
        product_name:  p.product.name,
        category:      p.product.category ?? null,
        occasion:      p.product.occasion ?? null,
        unit_price:    unitPrice,
        qty:           p.qty,
        subtotal:      unitPrice * p.qty,
        customization,
      }
    })
  }

  async function createPendingOrder(paymentStatus) {
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: user.id,
      status: 'placed',
      subtotal: productTotal,
      delivery_fee: deliveryFee,
      discount: discountAmount,
      total,
      address: deliveryAddress,
      payment_status: paymentStatus,
    }).select('id').single()
    if (orderErr) throw orderErr

    const { error: itemsErr } = await supabase.from('order_items').insert(buildOrderItems(order.id))
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
        address: deliveryAddress,
        payment_status: 'paid',
        payment_ref: result.paymentRef,
      }).select('id').single()
      if (orderErr) throw orderErr

      const { error: itemsErr } = await supabase.from('order_items').insert(buildOrderItems(order.id))
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

  // ── Placed ────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="checkout-canvas a-shop flex min-h-screen flex-col">
        <CheckoutHeader step="done" itemCount={0} />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
          <div className="checkout-card p-7 text-center sm:p-9">
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-forest-100" />
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-forest-400/30 animate-pulse-ring" />
              <CheckCircle2 size={40} className="relative text-forest-600" />
            </div>
            <h2 className="font-serif text-[26px] font-bold leading-tight text-ink">
              {pendingConfirmation ? 'Order received' : 'Order placed'}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-mute">
              {pendingConfirmation
                ? "We'll confirm your UPI payment shortly and get it ready for delivery."
                : "We'll get it ready for delivery and keep you posted."}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink/[0.03] px-4 py-2.5 ring-1 ring-ink/[0.07]">
              <Receipt size={14} className="text-ink-mute" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Order</span>
              <span className="font-mono text-sm font-bold text-ink">
                #{placedOrderId?.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <FulfilmentNote variant="card" className="mt-6 text-left" />

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/dashboard/customer/orders')}
                className="w-full rounded-2xl bg-forest-800 py-3.5 font-bold text-white shadow-lg shadow-forest-900/20 transition-colors hover:bg-forest-900"
              >
                Track my order
              </button>
              <button
                onClick={() => navigate('/shop')}
                className="w-full rounded-2xl border border-ink/10 bg-white py-3.5 font-semibold text-ink-soft transition-colors hover:bg-ink/[0.03]"
              >
                Continue shopping
              </button>
            </div>
          </div>
        </main>
        <CheckoutFooter />
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────────────
  if (cart.products.length === 0) {
    return (
      <div className="checkout-canvas a-shop flex min-h-screen flex-col">
        <CheckoutHeader step="cart" itemCount={0} />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
          <div className="checkout-card px-6 py-12 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-saffron-100 to-saffron-50 text-4xl ring-1 ring-saffron-200/70">
              🛍️
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink">Your bag is empty</h2>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-mute">
              Cakes, gifts, flowers, decor and pooja essentials — all delivered for the day you need them.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-forest-800 px-7 py-3.5 font-bold text-white shadow-lg shadow-forest-900/20 transition-colors hover:bg-forest-900"
            >
              Start shopping <ArrowRight size={16} />
            </Link>
          </div>

          {/* The empty state is the exact screen where the two-cart split did
              its damage: somebody who has just added a photographer reads
              "Your bag is empty" and concludes the add failed. It did not —
              their service is one tap away, and now it says so. */}
          <CartBridge side="shop" className="mt-4" />
        </main>
        <CheckoutFooter />
      </div>
    )
  }

  // ── The order summary, shared by the desktop rail and nothing else ──
  const summaryCard = (
    <SectionCard icon={Receipt} title="Order summary" accent="saffron">
      <div className="space-y-2.5 p-4 sm:p-5">
        <div className="flex justify-between text-sm text-ink-soft">
          <span>Subtotal · {productCount} item{productCount !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-ink">{formatINR(productTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-ink-soft">
          <span className="flex items-center gap-1.5"><Truck size={13} className="text-ink-mute" /> Delivery</span>
          {deliveryFee === 0
            ? <span className="font-bold text-forest-600">FREE</span>
            : <span className="font-semibold text-ink">{formatINR(deliveryFee)}</span>}
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm font-medium text-forest-600">
            <span className="flex items-center gap-1.5"><BadgePercent size={13} /> {coupon.code}</span>
            <span>−{formatINR(discountAmount)}</span>
          </div>
        )}

        {/* Every saving on this order, itemised, plus the single most
            valuable thing still worth doing. Replaces the lone "add ₹X for
            free delivery" line, which knew about exactly one of the four
            mechanisms that can take money off this bill. Only shown while
            there is still something to change — on the payment step the
            decisions are made and this becomes noise over a total. */}
        {step === 'cart' && (
          <SavingsStack savings={valueStack} onUseCode={user ? useSuggestedCode : undefined} className="!mt-3.5" />
        )}

        {deliveryFee > 0 && isFirstOrder === false && (
          <p className="text-[11px] text-ink-mute">Free delivery is a first-order welcome offer.</p>
        )}

        {/* The total, on the storefront's own ground. A checkout has exactly
            one number people are looking for, and on a white card it was
            competing with five others set in the same weight. */}
        <div className="!mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-forest-800 to-forest-700 px-4 py-3.5 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">To pay</p>
            <p className="text-xl font-extrabold leading-tight">{formatINR(total)}</p>
          </div>
          {savings > 0 && (
            <span className="rounded-full bg-saffron-400 px-2.5 py-1 text-[11px] font-extrabold text-forest-900">
              Saved {formatINR(savings)}
            </span>
          )}
        </div>

        {step === 'cart' && (
          user ? (
            <button
              onClick={handleProceed}
              className="!mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl bg-saffron-500 py-3.5 text-[15px] font-extrabold text-ink shadow-lg shadow-black/10 transition-colors hover:bg-saffron-400 lg:flex"
            >
              Pay online by UPI <ArrowRight size={16} />
            </button>
          ) : (
            <Link
              to="/login"
              state={{ from: signInToCheckout }}
              className="!mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl bg-saffron-500 py-3.5 text-[15px] font-extrabold text-ink shadow-lg shadow-black/10 transition-colors hover:bg-saffron-400 lg:flex"
            >
              Sign in to checkout <ArrowRight size={16} />
            </Link>
          )
        )}

        <FulfilmentNote variant="card" className="!mt-4" />
      </div>
    </SectionCard>
  )

  return (
    /* The bottom padding clears the phone's fixed pay bar. It sits on the
       page root rather than on the content column, because the last thing
       the bar overlaps once you have scrolled all the way down is the
       footer, not the form. */
    <div className={`checkout-canvas a-shop flex min-h-screen flex-col ${step === 'cart' ? 'pb-24 lg:pb-0' : ''}`}>
      {/* `addressValid` is what makes the middle dot mean something: the bag
          and the details are one scroll, so the rail has to advance on the
          form rather than on the screen change. */}
      <CheckoutHeader step={step} itemCount={productCount} detailsDone={addressValid} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-5 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">

          {/* ══ Left rail: the bag, then everything we still need to know ══ */}
          <div className="min-w-0 space-y-5">

            {/* ── The bag ── */}
            <SectionCard
              icon={ShoppingBag}
              title="Your bag"
              subtitle={`${productCount} item${productCount !== 1 ? 's' : ''} · delivered by Sambramo`}
              accent="saffron"
              badge="1"
              action={
                <Link
                  to="/shop"
                  className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-forest-700 ring-1 ring-forest-200 transition-colors hover:bg-white"
                >
                  + Add more
                </Link>
              }
            >
              <ul className="divide-y divide-ink/[0.07]">
                {cart.products.map(p => (
                  <li key={p.key} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                    <RemoteImage
                      src={p.product.image_url}
                      emoji={p.product.emoji}
                      alt={p.product.name}
                      className="h-16 w-16 shrink-0 rounded-xl ring-1 ring-black/5"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug text-ink">{p.product.name}</p>
                      <p className="mt-0.5 text-[13px] font-bold text-forest-700">
                        {formatINR(lineUnitPrice(p))}
                        {/* Two lines of the same cake, configured differently,
                            look like a duplicate unless the difference is on
                            screen — and the price difference is the part that
                            gets queried. */}
                        {p.unitPrice != null && p.unitPrice !== p.product.price && (
                          <span className="font-normal text-ink-mute"> · {formatINR(p.product.price)} + extras</span>
                        )}
                      </p>

                      {p.optionLines && (
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {/* summaryLines picks by role, not by a hard-coded
                              list of cake group ids — a party setup choice and
                              a pooja tradition are just as much part of what
                              was ordered. */}
                          {summaryLines(p.optionLines).map((l, i) => (
                            <li
                              key={`${l.groupId}-${i}`}
                              className="rounded-md bg-ink/[0.03] px-1.5 py-0.5 text-[11px] leading-snug text-ink-soft ring-1 ring-ink/[0.07]"
                            >
                              {l.isText ? <span className="italic">“{l.label}”</span> : l.label}
                              {l.price > 0 && <span className="text-ink-mute"> +{formatINR(l.price)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.customization && (
                        <p className="mt-1 line-clamp-2 text-[11px] italic text-ink-mute">"{p.customization}"</p>
                      )}

                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-xl bg-ink/[0.03] ring-1 ring-ink/10">
                          <button
                            onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: p.key, qty: p.qty - 1 })}
                            disabled={p.qty <= 1}
                            aria-label={`Reduce quantity of ${p.product.name}`}
                            className="p-2 text-ink-mute transition-colors hover:text-ink disabled:opacity-30"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-sm font-extrabold text-ink">{p.qty}</span>
                          <button
                            onClick={() => dispatch({ type: 'SET_PRODUCT_QTY', key: p.key, qty: p.qty + 1 })}
                            aria-label={`Increase quantity of ${p.product.name}`}
                            className="p-2 text-ink-mute transition-colors hover:text-ink"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_PRODUCT', key: p.key })}
                          aria-label={`Remove ${p.product.name}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink-mute transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                        <span className="ml-auto text-sm font-extrabold text-ink">
                          {formatINR(lineUnitPrice(p) * p.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Directly under the bag's own contents, because that is where
                somebody counts what they have and compares it against the
                badge. Anywhere lower and they have already decided two items
                went missing. */}
            {step === 'cart' && <CartBridge side="shop" />}

            {/* ── Where it goes ── */}
            {step === 'cart' && (
              <SectionCard
                icon={MapPin}
                title="Delivery address"
                subtitle="Where should we bring it?"
                accent="forest"
                badge="2"
              >
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label text-[12px]" htmlFor="addr-name">Full name</label>
                      <input id="addr-name" placeholder="Who's receiving it?" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className="input" />
                      {addressTouched && addressErrors.name && <p className="mt-1 text-xs text-red-600">{addressErrors.name}</p>}
                    </div>
                    <div>
                      <label className="label text-[12px]" htmlFor="addr-phone">Phone number</label>
                      <input id="addr-phone" placeholder="10-digit mobile" inputMode="numeric" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: scrubDigits(e.target.value, 10) }))} className="input" />
                      {addressTouched && addressErrors.phone && <p className="mt-1 text-xs text-red-600">{addressErrors.phone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label text-[12px]" htmlFor="addr-line">Address</label>
                      <input id="addr-line" placeholder="House / flat, street, landmark" value={address.line} onChange={e => setAddress(a => ({ ...a, line: e.target.value }))} className="input" />
                      {addressTouched && addressErrors.line && <p className="mt-1 text-xs text-red-600">{addressErrors.line}</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-ink/[0.03]/80 p-3 ring-1 ring-ink/[0.07]">
                    <DeliveryLocationPicker
                      value={{ lat: address.lat, lon: address.lon, city: address.city, pincode: address.pincode, line: address.line }}
                      onChange={patch => setAddress(a => ({ ...a, ...patch }))}
                    />
                  </div>
                  {addressTouched && (addressErrors.city || addressErrors.pincode) && (
                    <p className="text-xs text-red-600">{addressErrors.city || addressErrors.pincode}</p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* ── When it's needed ──────────────────────────────────
                The question this shop never asked. Every item in it is
                for an occasion on a specific day, and the date was
                previously chased over WhatsApp after payment — by which
                point "I needed it yesterday" is not a solvable problem.

                Pre-filled from the storefront's delivery slip when they
                set it there, so most people arrive with this answered
                and simply see it confirmed. Its own panel now rather than
                a field at the bottom of the address form: on this
                catalogue the date is as load-bearing as the address, and
                it was the one thing on the old page that could be
                scrolled past without being noticed. */}
            {step === 'cart' && (
              <SectionCard
                icon={CalendarDays}
                title="When do you need it?"
                subtitle="Every order here is for a day that matters"
                accent="plum"
                badge="3"
              >
                <div className="p-4 sm:p-5">
                  <input
                    id="needed-on"
                    type="date"
                    aria-label="Delivery date"
                    value={neededOn}
                    min={todayISO()}
                    onChange={e => dispatch({ type: 'SET_DELIVERY_DATE', date: e.target.value || null })}
                    className="input max-w-xs"
                  />
                  {neededOn && !dateError && (
                    <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-plum-50 px-3 py-2.5 text-xs leading-relaxed text-plum-800">
                      <PartyPopper size={14} className="mt-px shrink-0 text-plum-500" />
                      <span>
                        Needed <span className="font-bold">{humanDate(neededOn)}</span> — we'll confirm the delivery
                        window with you once the order is in.
                      </span>
                    </p>
                  )}
                  {addressTouched && dateError && (
                    <p className="mt-2 text-xs text-red-600">{dateError}</p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Coupon validation is per-customer (validate_coupon takes
                p_customer_id), so it can't run for a guest — offering the
                field anyway would just produce an error on Apply. */}
            {step === 'cart' && user && (
              <SectionCard icon={Tag} title="Coupon" subtitle="Have a code? Apply it before you pay" accent="chilli" badge="4">
                <div className="space-y-3 p-4 sm:p-5">
                  {coupon ? (
                    <div className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-forest-300 bg-forest-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-extrabold tracking-wide text-forest-700">{coupon.code}</p>
                        <p className="text-xs text-forest-600">{coupon.message} — you save {formatINR(coupon.discount_amount)}</p>
                      </div>
                      <button onClick={removeCoupon} aria-label="Remove coupon" className="shrink-0 rounded-lg p-1.5 text-forest-600 transition-colors hover:bg-forest-100 hover:text-forest-800">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                        placeholder="ENTER CODE"
                        aria-label="Coupon code"
                        className="input flex-1 font-mono uppercase tracking-wider"
                      />
                      <button
                        onClick={() => applyCoupon()}
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="shrink-0 rounded-xl bg-chilli-600 px-5 text-sm font-bold text-white transition-colors hover:bg-chilli-700 disabled:opacity-40"
                      >
                        {applyingCoupon ? 'Checking…' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                </div>
              </SectionCard>
            )}

            {/* ── Deliver-to recap, once the address step is behind them ──
                Standard on every checkout that has more than one step, and
                for a reason: the address is the single most expensive thing
                to get wrong, and the last chance to notice a typo is the
                screen where you are about to pay. */}
            {step === 'payment' && (
              <SectionCard
                icon={MapPin}
                title="Delivering to"
                accent="forest"
                action={
                  <button
                    onClick={() => setStep('cart')}
                    className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-forest-700 ring-1 ring-forest-200 transition-colors hover:bg-white"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                }
              >
                <div className="p-4 text-sm leading-relaxed text-ink-soft sm:p-5">
                  <p className="font-bold text-ink">{address.name} · {address.phone}</p>
                  <p className="mt-0.5">{address.line}</p>
                  <p>{[address.city, address.pincode].filter(Boolean).join(' ')}</p>
                  {neededOn && (
                    <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs font-semibold text-plum-800">
                      <CalendarDays size={13} className="text-plum-500" /> Needed {humanDate(neededOn)}
                    </p>
                  )}
                </div>
              </SectionCard>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            {/* ══ Payment ══════════════════════════════════════════ */}
            {step === 'payment' && UPI_CONFIGURED && !upiOrderId && (
              <SectionCard icon={Wallet} title="Payment" subtitle="UPI — Google Pay, PhonePe, Paytm or any app" accent="forest">
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-center gap-2 rounded-xl border border-forest-200 bg-forest-50 p-3 text-xs font-semibold text-forest-700">
                    <ShieldAlert size={15} className="shrink-0" /> Paid straight to Sambramo's verified UPI account
                  </div>
                  <button
                    onClick={startUpiPayment}
                    disabled={paying}
                    className="w-full rounded-2xl bg-forest-600 py-4 text-base font-bold text-white shadow-lg shadow-forest-900/20 transition-colors hover:bg-forest-700 disabled:opacity-50"
                  >
                    {paying ? 'Preparing payment…' : `Pay ${formatINR(total)}`}
                  </button>
                  <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-ink-mute transition-colors hover:text-ink-soft">
                    ← Back to address
                  </button>
                </div>
              </SectionCard>
            )}

            {step === 'payment' && UPI_CONFIGURED && upiOrderId && upiLinks && (
              <SectionCard icon={Wallet} title="Pay by UPI" subtitle={`Step 1 — pay ${formatINR(total)} to Sambramo`} accent="forest">
                <div className="space-y-4 p-4 sm:p-5">
                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-ink/[0.03] py-4 ring-1 ring-ink/[0.07]">
                      <img src={qrDataUrl} alt="UPI QR code" className="h-44 w-44 rounded-xl bg-white p-2 ring-1 ring-ink/10" />
                      <p className="text-xs text-ink-mute">Scan with any UPI app</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={upiLinks.gpay}
                      onClick={() => openUpiApp('Google Pay')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold text-ink-soft transition-colors ${tappedApp === 'Google Pay' ? 'border-forest-500 bg-forest-50' : 'border-ink/10 hover:border-forest-400'}`}
                    >
                      <GooglePayIcon className="h-9 w-9" /> Google Pay
                    </a>
                    <a
                      href={upiLinks.phonepe}
                      onClick={() => openUpiApp('PhonePe')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold text-ink-soft transition-colors ${tappedApp === 'PhonePe' ? 'border-forest-500 bg-forest-50' : 'border-ink/10 hover:border-forest-400'}`}
                    >
                      <PhonePeIcon className="h-9 w-9" /> PhonePe
                    </a>
                    <a
                      href={upiLinks.paytm}
                      onClick={() => openUpiApp('Paytm')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold text-ink-soft transition-colors ${tappedApp === 'Paytm' ? 'border-forest-500 bg-forest-50' : 'border-ink/10 hover:border-forest-400'}`}
                    >
                      <PaytmIcon className="h-9 w-9" /> Paytm
                    </a>
                  </div>
                  <a
                    href={upiLinks.upi}
                    onClick={() => openUpiApp('your UPI app')}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${tappedApp === 'your UPI app' ? 'border-forest-500 bg-forest-50 text-forest-700' : 'border-ink/10 text-ink-mute hover:bg-ink/[0.03]'}`}
                  >
                    <UpiIcon className="h-6 w-6" /> Other UPI app (BHIM & more)
                  </a>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-ink/[0.03] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-ink-mute">Or pay manually to UPI ID</p>
                      <p className="truncate font-mono text-sm font-semibold text-ink">{UPI_ID}</p>
                    </div>
                    <button onClick={copyUpiId} className="shrink-0 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-ink/[0.06]">
                      {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  <div className={`space-y-3 rounded-2xl border p-4 ${tappedApp ? 'border-plum-200 bg-plum-50' : 'border-ink/[0.07] bg-ink/[0.03]'}`}>
                    <p className={`text-xs font-semibold ${tappedApp ? 'text-plum-700' : 'text-ink-mute'}`}>
                      {tappedApp
                        ? `Step 2 — You've been redirected to ${tappedApp}. Complete the payment there, then come back to this tab.`
                        : 'Step 2 — After you pay, come back to this tab.'}
                    </p>
                    <button
                      onClick={confirmUpiPaymentDone}
                      disabled={!tappedApp}
                      className="w-full rounded-2xl bg-plum-700 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      I've completed the payment
                    </button>
                    <p className="text-center text-[11px] text-ink-mute">We'll confirm your payment against our UPI account and update your order shortly.</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Production build with no payment method configured. Tell
                the customer the truth and give them a human to talk to —
                the alternative that used to render here was the test
                harness's "Simulate Success" button, which would have
                created a genuine paid order for free. */}
            {step === 'payment' && !UPI_CONFIGURED && !IS_TEST_MODE && (
              <SectionCard icon={Wallet} title="Payment" accent="chilli">
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-start gap-2 rounded-xl border border-saffron-200 bg-saffron-50 p-3 text-xs text-saffron-800">
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
                    className="flex w-full items-center justify-center rounded-xl bg-forest-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-forest-700"
                  >
                    Complete my order on WhatsApp
                  </a>
                  <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-ink-mute transition-colors hover:text-ink-soft">
                    ← Back to address
                  </button>
                </div>
              </SectionCard>
            )}

            {step === 'payment' && !UPI_CONFIGURED && IS_TEST_MODE && (
              <SectionCard icon={Wallet} title="Payment" subtitle="Test harness — dev build only" accent="plum">
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-700">
                    <ShieldAlert size={15} /> TEST PAYMENT — no real money is charged
                  </div>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                          method === m.id ? 'border-plum-500 bg-plum-50 text-plum-700' : 'border-ink/10 text-ink-mute'
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
                      className="flex-1 rounded-xl bg-forest-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-forest-700 disabled:opacity-50"
                    >
                      {paying ? 'Processing…' : 'Simulate Success'}
                    </button>
                    <button
                      onClick={() => runPayment('failure')}
                      disabled={paying}
                      className="flex-1 rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      Simulate Failure
                    </button>
                  </div>
                  <button onClick={() => setStep('cart')} className="w-full text-center text-xs text-ink-mute transition-colors hover:text-ink-soft">
                    ← Back to address
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── What else goes on the table ────────────────────────────
                Seeded from the whole basket rather than one item, and aimed
                at `budgetGap` — so when the summary above says "add ₹212 more
                for free delivery", the tiles under it are things that cost
                about ₹212. The old cart said the sentence and left the
                customer to go and find one, which is most of the reason that
                nudge never worked.

                Cart step only. On the payment step the basket is settled and
                a rail of more things to buy is an interruption between a
                customer and a UPI app. */}
            {step === 'cart' && (
              <RecommendationRail
                cart={cart.products}
                intent="complete"
                budgetGap={budgetGap}
                limit={8}
                tone="light"
                title="Goes with your order"
                subtitle={budgetGap ? `Anything from ${formatINR(budgetGap)} closes the gap above` : 'Delivered together, one trip'}
                className="-mx-1 pt-1"
              />
            )}

            {/* The summary reads inline on a phone, where there is no rail to
                pin it to — placed after the forms, which is where a single
                column wants it. */}
            <div className="lg:hidden">{summaryCard}</div>
          </div>

          {/* ══ Right rail: the price, pinned ══
              The pattern every large storefront converged on, because the
              total is the one thing a customer re-checks continuously while
              filling a long form, and scrolling back up to find it is where
              carts get abandoned. */}
          <aside className="hidden min-w-0 lg:sticky lg:top-[8.5rem] lg:block">
            {summaryCard}
          </aside>
        </div>
      </main>

      <CheckoutFooter />

      {/* ══ The phone's pay bar ══
          Fixed, above the tab bar, clear of the chat launcher. On a phone the
          CTA was previously below the fold under an address form, a map and a
          coupon field — reachable only by scrolling past everything, which is
          the single most common reason a mobile checkout stalls. */}
      {step === 'cart' && (
        <div className="pr-chat-dock above-bottom-nav fixed inset-x-0 z-40 lg:hidden">
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.5)] ring-1 ring-black/10">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-mute">To pay online</p>
              <p className="text-lg font-extrabold leading-tight text-ink">{formatINR(total)}</p>
            </div>
            {user ? (
              /* "Pay by UPI", not "Continue". The next screen is a payment
                 screen and nothing else, so naming it here is the last
                 chance to correct anyone still expecting to pay the rider —
                 there is no cash-on-delivery path in this app. */
              <button
                onClick={handleProceed}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-saffron-500 px-5 py-3 text-sm font-extrabold text-ink transition-colors active:bg-saffron-600"
              >
                Pay by UPI <ArrowRight size={15} />
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: signInToCheckout }}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-saffron-500 px-5 py-3 text-sm font-extrabold text-ink transition-colors active:bg-saffron-600"
              >
                Sign in <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
