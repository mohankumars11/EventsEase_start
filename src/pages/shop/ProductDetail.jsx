import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Check, Star, MessageSquareText, FileText, ListTree,
  Sparkles, Truck, PackageSearch,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../utils/format'
import { productCopy } from '../../lib/productCopy'
import { addOnsFor } from '../../data/giftAddOns'
import { slotFee, describeSlotChoice } from '../../lib/deliveryPromise'
import { useProductOptionGroups } from '../../hooks/useProductOptions'
import { fetchMedia, fetchStory, fetchFaqs } from '../../lib/productStudio'
import GiftAppBar from '../../components/gifting/GiftAppBar'
import DeliveryPicker from '../../components/gifting/DeliveryPicker'
import {
  Accordion, CopyList, SpecTable, GuardNote, AddOnShelf,
} from '../../components/gifting/ProductSections'
import ProductGallery from '../../components/shop/ProductGallery'
import ProductFaqs from '../../components/shop/ProductFaqs'
import RecommendationRail from '../../components/shop/RecommendationRail'
import RatingBreakdown from '../../components/reviews/RatingBreakdown'
import ReviewCard from '../../components/reviews/ReviewCard'
import ReviewModal from '../../components/reviews/ReviewModal'
import ProductCustomizeSheet from '../../components/shop/ProductCustomizeSheet'

/**
 * The product page.
 *
 * ── The order of the page is the order of the decision ───────────────────
 *   what is it        photo, name, price
 *   when can it come  the slot picker, before anything else
 *   what else         the add-on shelf, inline and skippable
 *   tell me more      four accordions, all of them written for THIS product
 *   what do others say reviews
 *
 * Putting the slot picker above the description is the one ordering choice
 * worth defending. On a gifting purchase the date is not a detail, it is the
 * whole constraint — a perfect gift that arrives the day after the birthday
 * is a failed order — and every competitor puts it below the fold, after the
 * marketing copy, sometimes after the reviews.
 *
 * ── The four accordions come from `productCopy` ──────────────────────────
 * Description, details, care and delivery are generated per product from what
 * the row actually is, so a bouquet and a silk saree on the same site do not
 * print the same paragraph. Where a human has written a description, that
 * wins. See lib/productCopy.js for the reasoning.
 */
export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dispatch, productQtyFor } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [eligibleOrderId, setEligibleOrderId] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [customizing, setCustomizing] = useState(false)

  // Migration 051's extras. All three stay empty on a database that has not
  // run it, which is exactly what the sections treat as "nothing to show".
  const [media, setMedia] = useState([])
  const [story, setStory] = useState([])
  const [faqs, setFaqs] = useState([])

  const [slot, setSlot] = useState(null)          // { date, slot }
  const [addOns, setAddOns] = useState([])        // ids

  useEffect(() => {
    setLoading(true)
    // Reset the per-product choices. Without this, navigating from one
    // product to another through a recommendation rail carries the previous
    // item's slot and add-ons onto a product that may not even offer them.
    setSlot(null)
    setAddOns([])
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!product?.id) return
    let cancelled = false
    const scope = { productId: product.id, category: product.category }
    Promise.all([fetchMedia(product.id), fetchStory(scope), fetchFaqs(scope)])
      .then(([m, st, f]) => {
        if (cancelled) return
        setMedia(m.rows); setStory(st.slides); setFaqs(f.faqs)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [product?.id, product?.category])

  const loadReviews = useCallback(() => {
    supabase.from('reviews_catalog').select('*')
      .eq('subject_type', 'product').eq('subject_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data ?? []))
  }, [id])
  useEffect(() => { loadReviews() }, [loadReviews])

  const checkEligibility = useCallback(() => {
    if (!user) { setEligibleOrderId(null); return }
    supabase.from('orders').select('id, status, order_items!inner(product_id)')
      .eq('customer_id', user.id).eq('status', 'delivered').eq('order_items.product_id', id)
      .then(({ data }) => {
        const already = reviews.some(r => r.customer_id === user.id)
        setEligibleOrderId(!already && data?.length > 0 ? data[0].id : null)
      })
  }, [user, id, reviews])
  useEffect(() => { checkEligibility() }, [checkEligibility])

  // Hooks must run before any early return — calling them after `loading`
  // flips is the "rendered fewer hooks than expected" crash. Both tolerate a
  // null product.
  const optionGroups = useProductOptionGroups(product)
  const copy = useMemo(() => productCopy(product), [product])
  const shelf = useMemo(() => (copy ? addOnsFor(copy.kind) : []), [copy])

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const addOnTotal = useMemo(
    () => shelf.filter(a => addOns.includes(a.id)).reduce((s, a) => s + a.price, 0),
    [shelf, addOns],
  )
  const slotCharge = slot?.slot ? slotFee(slot.slot).fee : 0

  if (loading) {
    return (
      <div className="shop-canvas min-h-screen">
        <GiftAppBar backTo="/shop" title="Loading…" compact />
        <div className="mx-auto max-w-6xl p-4">
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-sunk/[0.06]" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="shop-canvas min-h-screen">
        <GiftAppBar backTo="/shop" title="Not found" compact />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <PackageSearch size={26} className="mx-auto text-ink-mute" />
          <p className="mt-3 text-[14px] font-extrabold text-ink">This product is no longer listed.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            It may have been retired, or the link may be mistyped.
          </p>
          <Link to="/shop" className="mt-5 inline-block rounded-xl bg-forest-800 px-5 py-2.5 text-[12.5px] font-extrabold text-white">
            Back to the shop
          </Link>
        </div>
      </div>
    )
  }

  const price = Number(product.price) || 0
  const mrp = Number(product.mrp) || 0
  const hasAnchor = mrp > price && mrp - price >= 1
  const offPct = hasAnchor ? Math.round(((mrp - price) / mrp) * 100) : 0
  const inCartQty = productQtyFor(product.id)
  const configurable = optionGroups.length > 0


  /**
   * Put this product in the bag, with whatever was chosen on this page.
   *
   * Two things here are load-bearing and both were wrong in the obvious
   * implementation:
   *
   * **The add-ons have to reach `unitPrice`.** The cart, the order totals and
   * `order_items.unit_price` all read that field; anything not in it is shown
   * on this page and then silently not charged. So the chosen add-ons are
   * added to the per-unit price — on top of the configured price when the
   * options sheet produced one, not instead of it.
   *
   * **The signature has to include the choices.** A cart line's key is
   * `prod__<id>__<signature>`, and with no signature it is just `prod__<id>`
   * — so a bouquet ordered for Friday and the same bouquet ordered for Sunday
   * would collapse into one line of quantity two, keeping whichever
   * customisation was dispatched last. Anything that makes two orders of the
   * same product genuinely different has to be in the key.
   *
   * **`customization` is TEXT, not an object.** It is one column
   * (migration 019), the cart renders it directly and `buildOrderItems`
   * joins it with the configured option lines — so an object here would put
   * "[object Object]" on the packing note and throw in the cart's render.
   * The slot and the add-ons are written as readable lines instead, for the
   * person who has to put the vase in the box.
   */
  function commitAdd({ qty = 1, unitPrice, lines, signature } = {}) {
    const chosen = shelf.filter(a => addOns.includes(a.id))
    const extras = chosen.reduce((s, a) => s + a.price, 0)
    const base = unitPrice ?? price

    const parts = [
      signature,
      slot?.date ? `d:${slot.date}` : null,
      slot?.slot ? `s:${slot.slot}` : null,
      chosen.length ? `a:${chosen.map(a => a.id).sort().join('+')}` : null,
    ].filter(Boolean)

    dispatch({
      type: 'ADD_PRODUCT',
      product,
      qty,
      // Only send a price when it actually differs from the row's own, so an
      // ordinary add stays a null unitPrice and keeps reading the catalogue
      // price if that price is later corrected.
      unitPrice: extras > 0 || unitPrice != null ? base + extras : undefined,
      lines,
      signature: parts.length ? parts.join('|') : undefined,
      customization: [
        describeSlotChoice(slot ?? {}),
        chosen.length
          ? `Add: ${chosen.map(a => `${a.name}${a.price ? ` (${formatINR(a.price)})` : ' (free)'}`).join(', ')}`
          : null,
      ].filter(Boolean).join('\n') || null,
    })
  }

  const handleAdd = () => {
    if (configurable) { setCustomizing(true); return }
    commitAdd()
  }

  const handleBuyNow = () => {
    if (configurable) { setCustomizing(true); return }
    commitAdd()
    navigate('/shop/cart')
  }

  return (
    <div className="shop-canvas min-h-screen pb-28">
      <GiftAppBar backTo="/shop" title={product.name} subtitle={product.category} compact />

      <main className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:gap-8 lg:px-4 lg:pt-4">
        {/* ── The photograph ── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            media={media}
            fallbackUrl={product.image_url}
            fallbackSource={product.image_source}
            emoji={product.emoji}
            alt={product.image_alt || product.name}
            query={`${product.name} ${product.category}`}
          />
        </div>

        <div>
          {/* ── Identity and price ── */}
          <section className="px-4 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-forest-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-forest-700">
                  {copy.kindLabel}
                </span>
                <h1 className="mt-1.5 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-ink">
                  {product.name}
                </h1>
                {product.subtitle && (
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{product.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 pt-1 text-[10px] font-semibold tracking-wide text-ink-mute">
                {copy.sku}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[22px] font-extrabold text-ink">{formatINR(price)}</span>
              {hasAnchor && (
                <>
                  <span className="text-[13px] font-semibold text-ink-mute line-through">{formatINR(mrp)}</span>
                  <span className="rounded-md bg-chilli-600 px-1.5 py-0.5 text-[10.5px] font-extrabold text-white">
                    {offPct}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-ink-mute">
              Inclusive of all taxes · delivery shown below, before the bag
            </p>

            {reviews.length > 0 && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-forest-50 px-1.5 py-0.5 text-[11px] font-bold text-forest-700">
                <Star size={10} className="fill-current" /> {avgRating.toFixed(1)}
                <span className="font-semibold">({reviews.length})</span>
              </span>
            )}

            {copy.highlights.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {copy.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-soft">
                    <Check size={13} className="mt-0.5 shrink-0 text-forest-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── When ── */}
          <div className="px-4 pt-4">
            <DeliveryPicker product={product} value={slot} onChange={setSlot} />
            <p className="mt-2 text-[11px] font-semibold text-ink-mute">{copy.window}</p>
          </div>

          {/* ── Add something small ── */}
          <div className="pt-6">
            <AddOnShelf
              addOns={shelf}
              selected={addOns}
              onToggle={id => setAddOns(a => (a.includes(id) ? a.filter(x => x !== id) : [...a, id]))}
            />
          </div>

          {/* ── The four blocks, written for this product ── */}
          <section className="mt-6 px-4">
            <h2 className="mb-1 text-[15px] font-extrabold text-ink">About this one</h2>

            <Accordion title="Description" icon={FileText} defaultOpen>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">{copy.description}</p>
            </Accordion>

            <Accordion title="Details" icon={ListTree} badge={`${copy.details.length}`}>
              <SpecTable rows={copy.details} />
            </Accordion>

            <Accordion title="Care and handling" icon={Sparkles}>
              <CopyList items={copy.instructions} />
            </Accordion>

            <Accordion title="Delivery and what we promise" icon={Truck} defaultOpen>
              <CopyList items={copy.delivery} />
              <div className="mt-3">
                <GuardNote text={copy.guard} />
              </div>
            </Accordion>
          </section>

          {faqs?.length > 0 && (
            <div className="mt-5 px-4">
              <ProductFaqs faqs={faqs} />
            </div>
          )}

          {/* ── Reviews ── */}
          <section className="mt-6 px-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
                <MessageSquareText size={16} className="text-forest-700" /> What buyers said
              </h2>
              {eligibleOrderId && (
                <button
                  onClick={() => setReviewing(true)}
                  className="shrink-0 rounded-lg bg-forest-800 px-3 py-1.5 text-[11.5px] font-extrabold text-white"
                >
                  Write one
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              /* An empty state that says so. A pre-launch catalogue that
                 prints invented stars is the fastest way to lose the trust
                 the rest of this page is built to earn. */
              <p className="rounded-xl border border-hairline/[0.09] bg-surface-sunk/[0.03] p-3.5 text-[12px] leading-relaxed text-ink-soft">
                Nobody has reviewed this yet, and we have not written any for it. When somebody who
                actually received it says something, it will appear here.
              </p>
            ) : (
              <>
                <RatingBreakdown reviews={reviews} avgRating={avgRating} />
                <div className="mt-3 space-y-2.5">
                  {reviews.map(r => <ReviewCard key={r.id} review={r} onVoted={loadReviews} />)}
                </div>
              </>
            )}
          </section>

          <div className="mt-6">
            <RecommendationRail
              seed={product}
              intent="complete"
              occasion={product.occasion}
              title="Often sent together"
              tone="light"
            />
          </div>
        </div>
      </main>

      {/* ── The bar ──
          The number here is the LINE's price — the product plus any add-ons
          chosen above — because that is what this button is about to put in
          the bag, and a CTA sitting beside a figure the cart then disagrees
          with is the exact moment trust goes.

          The slot charge is deliberately not folded into it. It is an
          order-level fee, charged once however many things are in the bag, so
          adding it to a per-item price would overstate a two-item order. It
          gets its own line instead, which is still before the bag and still
          before any money — the whole point being that nothing new appears
          later. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline/[0.08] bg-white/95 pb-safe backdrop-blur-md">
        {slotCharge > 0 && (
          <p className="border-b border-hairline/[0.06] bg-amber-50 px-4 py-1 text-[10.5px] font-semibold text-amber-900">
            + {formatINR(slotCharge)} for the window you picked — {slotFee(slot.slot).reason} Charged once per order.
          </p>
        )}
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 shrink-0">
            <p className="text-[16px] font-extrabold leading-tight text-ink">{formatINR(price + addOnTotal)}</p>
            <p className="text-[10px] font-semibold leading-tight text-ink-mute">
              {addOnTotal > 0 ? `incl. ${formatINR(addOnTotal)} extras` : 'incl. all taxes'}
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-forest-700 bg-white text-[12.5px] font-extrabold text-forest-700 active:bg-forest-50"
          >
            <ShoppingCart size={15} />
            {inCartQty > 0 ? `In bag (${inCartQty})` : configurable ? 'Choose options' : 'Add to bag'}
          </button>

          <button
            onClick={handleBuyNow}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-forest-800 text-[12.5px] font-extrabold text-white active:bg-forest-900"
          >
            Buy now
          </button>
        </div>
      </div>

      {customizing && (
        <ProductCustomizeSheet
          product={product}
          groups={optionGroups}
          onClose={() => setCustomizing(false)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            commitAdd({ qty, unitPrice, lines, signature })
            setCustomizing(false)
          }}
        />
      )}

      {reviewing && (
        <ReviewModal
          subject={{ type: 'product', id: product.id, name: product.name }}
          source={{ orderId: eligibleOrderId }}
          onClose={() => setReviewing(false)}
          onSubmitted={() => { setReviewing(false); loadReviews(); checkEligibility() }}
        />
      )}
    </div>
  )
}
