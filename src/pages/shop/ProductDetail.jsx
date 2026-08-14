import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Check, Minus, Plus, MessageSquareText, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import { CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import ShopAppBar from '../../components/shop/ShopAppBar'
import ProductImage from '../../components/shop/ProductImage'
import ImageSourceBadge from '../../components/shop/ImageSourceBadge'
import RatingBadge from '../../components/reviews/RatingBadge'
import RatingBreakdown from '../../components/reviews/RatingBreakdown'
import ReviewCard from '../../components/reviews/ReviewCard'
import ReviewModal from '../../components/reviews/ReviewModal'
import CustomizeModal from '../../components/shop/CustomizeModal'
import ProductCustomizeSheet, { VegMark } from '../../components/shop/ProductCustomizeSheet'
import FulfilmentNote from '../../components/shop/FulfilmentNote'
import BundleLadder from '../../components/shop/BundleLadder'
import RecommendationRail from '../../components/shop/RecommendationRail'
import { cakeFacts } from '../../data/cakeStyles'
import { isCustomizable } from '../../config/customizers'

export default function ProductDetail() {
  const { id } = useParams()
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

  // Both non-happy states keep the bar. Without it they were bare centred text
  // on an otherwise empty screen with no way out except the browser's own back
  // gesture — and on a cold open (a shared product link) there was no history
  // behind it either, so "Product not found" was a dead end.
  if (loading) {
    return (
      <div className="shop-canvas min-h-screen pb-bottom-nav">
        <ShopAppBar backTo="/shop" title="Loading…" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
          <div className="shop-card h-64 animate-pulse bg-surface-sunk/[0.07]" />
          <div className="shop-card h-40 animate-pulse bg-surface-sunk/[0.07]" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="shop-canvas min-h-screen pb-bottom-nav">
        <ShopAppBar backTo="/shop" title="Not found" />
        <div className="mx-auto max-w-3xl px-4 pt-5">
          <div className="shop-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="text-5xl">🔍</div>
            <h1 className="font-bold text-gray-800">We can't find that item</h1>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">
              It may have sold out or been renamed. The shelves below still have
              cakes, flowers, gifts and pooja essentials.
            </p>
            <Link
              to="/shop"
              className="mt-1 inline-block rounded-xl bg-saffron-500 px-6 py-3 font-bold text-plum-950 transition-colors hover:bg-saffron-600"
            >
              Back to the shop
            </Link>
          </div>
        </div>
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
    <div className="shop-canvas min-h-screen pb-bottom-nav">
      {/* The page's own back button is gone — it sat directly under the shell's
          "Back" link, two arrows eight pixels apart. The bar carries the one
          that survives, and it names the product so the screen has a title
          instead of an anonymous arrow. */}
      <ShopAppBar backTo="/shop" title={product.name} subtitle={product.category} />

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">
        {/* p-8 on a 360px phone spent 64px of a 328px card on padding, so the
            photo and the price sat in a 264px column. Padding steps up with
            the viewport now instead of being priced for a desktop. */}
        <div className="shop-card grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:gap-8 sm:p-8">
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
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                The photo shows a similar item. What you receive will match the
                name, size and description above — the exact decoration may vary.
              </p>
            )}

            <p className="text-3xl font-extrabold text-plum-700 mb-1">
              {configurable && <span className="text-base font-semibold text-gray-500 mr-1.5">from</span>}
              {formatINR(product.price)}
            </p>
            {configurable && (
              <p className="text-xs text-gray-500 mb-4">
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
                  className="w-full flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-plum-950 font-bold py-3.5 rounded-xl"
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
                className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-plum-950 font-bold py-3.5 rounded-xl"
              >
                <ShoppingCart size={17} /> Add to Cart
              </button>
            )}
          </div>
        </div>

        {/* ── The set, then the table it goes on ──────────────────────────
            Placed directly under the buy box because this is the one moment
            the customer has already decided about this item and has not yet
            left. Both surfaces answer questions the old page left hanging:
            "what else do I need for this" and "what does buying more get me".

            The rails carry `-mx-4` because they lay out their own px-4 gutter
            — a rail that stops at the page margin looks clipped rather than
            scrollable, so the tiles have to be able to run to the screen edge
            while the heading stays aligned with everything above it. */}
        <BundleLadder seed={product} className="mt-4" />

        <RecommendationRail
          seed={product}
          intent="complete"
          occasion={product.occasion}
          tone="light"
          className="-mx-4 mt-6"
        />

        <div className="shop-card mt-4 p-5 sm:p-8">
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
            <p className="text-sm text-gray-500 mt-5">No reviews yet — be the first once you've received this order.</p>
          )}
        </div>

        {/* Alternatives last, and only last. Above the fold they compete with
            the thing the customer came for; down here they catch the person
            who has read the whole page and decided this particular one is not
            it — which is the only point at which showing them a different cake
            is a service rather than a distraction. */}
        <RecommendationRail
          seed={product}
          intent="similar"
          tone="light"
          limit={6}
          className="-mx-4 mt-8"
        />
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
