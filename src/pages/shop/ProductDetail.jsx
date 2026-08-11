import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check, Minus, Plus, MessageSquareText, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import { CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import ProductImage from '../../components/shop/ProductImage'
import ImageSourceBadge from '../../components/shop/ImageSourceBadge'
import RatingBadge from '../../components/reviews/RatingBadge'
import RatingBreakdown from '../../components/reviews/RatingBreakdown'
import ReviewCard from '../../components/reviews/ReviewCard'
import ReviewModal from '../../components/reviews/ReviewModal'
import CustomizeModal from '../../components/shop/CustomizeModal'
import ProductCustomizeSheet, { VegMark } from '../../components/shop/ProductCustomizeSheet'
import FulfilmentNote from '../../components/shop/FulfilmentNote'
import { cakeFacts } from '../../data/cakeStyles'
import { isCustomizable } from '../../config/customizers'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dispatch, hasProduct, productLines, productQtyFor } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [eligibleOrderId, setEligibleOrderId] = useState(null) // a delivered order containing this product, not yet reviewed
  const [reviewing, setReviewing] = useState(false)
  const [customizing, setCustomizing] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [id])

  const loadReviews = useCallback(() => {
    supabase.from('reviews_catalog').select('*')
      .eq('subject_type', 'product').eq('subject_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data ?? []))
  }, [id])

  useEffect(() => { loadReviews() }, [loadReviews])

  // Can this customer review this product right now? — they need a
  // delivered order containing it that they haven't already reviewed.
  const checkEligibility = useCallback(() => {
    if (!user) { setEligibleOrderId(null); return }
    supabase.from('orders').select('id, status, order_items!inner(product_id)')
      .eq('customer_id', user.id).eq('status', 'delivered').eq('order_items.product_id', id)
      .then(({ data }) => {
        const alreadyReviewed = reviews.some(r => r.customer_id === user.id)
        setEligibleOrderId(!alreadyReviewed && data?.length > 0 ? data[0].id : null)
      })
  }, [user, id, reviews])

  useEffect(() => { checkEligibility() }, [checkEligibility])

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center text-gray-400 text-sm">Loading…</div>

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-2xl text-gray-400">Product not found.</p>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    )
  }

  const inCart   = hasProduct(product.id)
  const cartLine = productLines(product.id)[0]
  // Cakes, party decor, pooja kits and gifts all open the full sheet; a
  // category with no builder falls back to the simple message modal.
  const configurable = isCustomizable(product.category)
  const facts        = product.category === 'Cakes' ? cakeFacts(product) : null

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-6">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* The hero drifts continuously and carries the source badge —
              a customer decides here, so this is where the photo has to
              both look its best and say what it actually is. */}
          <ProductImage
            src={product.image_url}
            query={product.name}
            emoji={product.emoji}
            alt={product.image_alt || product.name}
            className="w-full h-64 sm:h-full rounded-2xl"
            drift
            scrim
            priority
          >
            <ImageSourceBadge
              source={product.image_source}
              className="absolute bottom-3 left-3"
            />
          </ProductImage>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-plum-600 uppercase tracking-wide mb-1">
              {product.occasion ? `${product.category} · ${product.occasion}` : product.category}
            </span>
            <div className="flex items-start gap-2 mb-2">
              {facts?.veg && <VegMark className="mt-2" />}
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            </div>
            <RatingBadge subjectType="product" subjectId={product.id} size="sm" className="mb-3" />
            <p className="text-sm text-gray-500 mb-3">{product.description}</p>

            {facts && (facts.serves || facts.diets.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {facts.serves && (
                  <span className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                    Serves {facts.serves}
                  </span>
                )}
                {facts.diets.map(d => (
                  <span key={d.id} className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                    {d.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* The badge on the photo says which kind of photo it is; this
                says what that means for the order. Stated before the price
                and the Add to Cart button, not after. */}
            {product.image_source !== 'actual' && (
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                The photo shows a similar item. What you receive will match the
                name, size and description above — the exact decoration may vary.
              </p>
            )}

            <p className="text-3xl font-extrabold text-plum-700 mb-1">
              {configurable && <span className="text-base font-semibold text-gray-400 mr-1.5">from</span>}
              {formatINR(product.price)}
            </p>
            {configurable && (
              <p className="text-xs text-gray-400 mb-4">
                Final price depends on the options and extras you pick.
              </p>
            )}

            {/* Who is responsible for the box, stated before the button that
                commits to it — not in a footer after the fact. */}
            <FulfilmentNote className="mb-4" />

            {configurable ? (
              // A cake with no weight or flavour chosen, a balloon arch with
              // nobody assigned to hang it, a havan kit with no tradition — none
              // of those is an order anyone can fulfil, so configurable products
              // have no bare "Add to cart" path. Already having one in the cart
              // doesn't change that: the second is usually configured
              // differently, which is exactly why it gets its own line.
              <div className="space-y-2">
                <button
                  onClick={() => setCustomizing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3.5 rounded-xl"
                >
                  <ShoppingCart size={17} /> {inCart ? 'Add another, your way' : 'Choose options'}
                </button>
                {inCart && (
                  <Link
                    to="/shop/cart"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-sm hover:bg-green-100"
                  >
                    <Check size={15} /> {productQtyFor(product.id)} in cart — view cart
                  </Link>
                )}
              </div>
            ) : inCart ? (
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
                onClick={() => CUSTOMIZABLE_CATEGORIES[product.category] ? setCustomizing(true) : dispatch({ type: 'ADD_PRODUCT', product })}
                className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3.5 rounded-xl"
              >
                <ShoppingCart size={17} /> Add to Cart
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 mt-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquareText size={18} className="text-plum-500" /> Customer Feedback
            </h2>
            {eligibleOrderId && (
              <button
                onClick={() => setReviewing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg"
              >
                <Star size={13} /> Rate &amp; Review
              </button>
            )}
          </div>
          <RatingBreakdown reviews={reviews} avgRating={avgRating} />
          {reviews.length > 0 && (
            <div className="mt-6 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
              {reviews.map(r => <ReviewCard key={r.id} review={r} onVoted={loadReviews} />)}
            </div>
          )}
          {reviews.length === 0 && (
            <p className="text-sm text-gray-400 mt-5">No reviews yet — be the first once you've received this order.</p>
          )}
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          subject={{ type: 'product', id: product.id, name: product.name }}
          source={{ orderId: eligibleOrderId }}
          onClose={() => setReviewing(false)}
          onSubmitted={() => { loadReviews(); checkEligibility() }}
        />
      )}

      {customizing && (configurable ? (
        <ProductCustomizeSheet
          product={product}
          onClose={() => setCustomizing(false)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            dispatch({ type: 'ADD_PRODUCT', product, qty, unitPrice, lines, signature })
            setCustomizing(false)
          }}
        />
      ) : (
        <CustomizeModal
          product={product}
          fieldConfig={CUSTOMIZABLE_CATEGORIES[product.category]}
          onClose={() => setCustomizing(false)}
          onConfirm={({ qty, customization }) => {
            dispatch({ type: 'ADD_PRODUCT', product, qty, customization })
            setCustomizing(false)
          }}
        />
      ))}
    </div>
  )
}
