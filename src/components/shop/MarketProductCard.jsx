import { Link } from 'react-router-dom'
import { Plus, Minus, BadgeCheck, Truck, Smartphone, Flame, CalendarHeart, Ticket, PenLine } from 'lucide-react'
import ProductImage from './ProductImage'
import DetailRotator from './DetailRotator'
import RatingBadge from '../reviews/RatingBadge'
import { formatINR } from '../../utils/format'
import { FULFILMENT, FREE_DELIVERY_THRESHOLD, CUSTOMIZABLE_CATEGORIES } from '../../config/shop'
import { isCustomizable } from '../../config/customizers'
import { useCartLine } from './useProductAdd'

/**
 * One product, as the storefront shows it everywhere.
 *
 * Two decisions carry this card:
 *
 * 1. The ADD button hangs off the bottom edge of the photo, not below the
 *    price. On a phone it lands under the thumb without covering the name or
 *    the price, it is in the same place on every card so the eye stops
 *    hunting for it down a scrolling grid, and it cannot be pushed off the
 *    fold by a long product name the way a bottom-of-card button can.
 *
 * 2. The line under the price rotates (see DetailRotator). Everything it
 *    cycles through is derived from the row or from config — the occasion
 *    tag, who is answerable for delivery, the free-delivery threshold, the
 *    live coupon this item's price already qualifies for, whether it takes a
 *    message. Nothing on this card is written to sound good; if the data
 *    isn't there the line simply doesn't appear.
 *
 * On price: the catalogue has one price column and no MRP, so there is no
 * struck-through "was ₹1,299" here. That number would have to be invented,
 * and an invented anchor price is the single most common lie in Indian
 * e-commerce UI. The saving shown is the coupon, which is real and which the
 * checkout will honour.
 */
export default function MarketProductCard({
  product,
  offer,              // best live coupon this product's price already qualifies for
  orderCount = 0,
  stagger = 0,
  onAdd,
  ctaLabel = 'ADD',
}) {
  const p = product
  // The card binds itself to the cart rather than taking qty and two
  // handlers from every caller. Six call sites passing the same three props
  // is six chances for one of them to wire "−" to the wrong line.
  const { qty, inc, dec } = useCartLine(p.id)
  const messageField = CUSTOMIZABLE_CATEGORIES[p.category]
  const configurable = isCustomizable(p.category)   // has a full option builder

  const facts = [
    offer && {
      key: 'offer',
      icon: Ticket,
      tone: 'offer',
      text: offer.discount_type === 'percent'
        ? `${Number(offer.discount_value)}% off with ${offer.code}`
        : `${formatINR(offer.discount_value)} off with ${offer.code}`,
    },
    { key: 'fulfil', icon: BadgeCheck, tone: 'trust', text: FULFILMENT.short },
    orderCount > 0 && {
      key: 'orders', icon: Flame, tone: 'offer',
      text: `Ordered ${orderCount} ${orderCount === 1 ? 'time' : 'times'}`,
    },
    p.occasion && { key: 'occasion', icon: CalendarHeart, text: `Made for ${p.occasion}` },
    { key: 'delivery', icon: Truck, text: `Free delivery over ${formatINR(FREE_DELIVERY_THRESHOLD)}` },
    messageField && { key: 'custom', icon: PenLine, text: messageField.label },
    { key: 'pay', icon: Smartphone, text: 'Pay by any UPI app' },
  ]

  return (
    <article className="shop-card group flex flex-col">
      <Link to={`/shop/product/${p.id}`} className="block relative">
        <ProductImage
          src={p.image_url}
          query={p.name}
          emoji={p.emoji}
          alt={p.image_alt}
          className="w-full aspect-[4/3]"
          cinematic
        />
        {/* Bottom scrim: the ADD button and any badge sit on top of a photo
            we don't control the brightness of. */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />

        {offer && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-chilli-600 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            {offer.discount_type === 'percent'
              ? `${Number(offer.discount_value)}% off`
              : `${formatINR(offer.discount_value)} off`}
          </span>
        )}
        {p.occasion && (
          <span className="absolute top-2 right-2 max-w-[55%] truncate rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-forest-800 backdrop-blur-sm">
            {p.occasion}
          </span>
        )}
      </Link>

      {/* ── The button, at the seam ─────────────────────────────────────
          Absolutely positioned against the card so the stepper can swap in
          at exactly the same spot — a control that moves when you use it is
          how you get double taps and accidental quantity-3 orders. */}
      <div className="relative">
        <div className="absolute -top-5 right-3 z-10">
          {qty > 0 && configurable ? (
            /* A configurable product doesn't get a stepper. The second cake
               someone adds is almost never the same cake — same weight, same
               flavour, same message — so "+1" would silently duplicate a
               configuration nobody chose twice. This re-opens the sheet and
               shows what's already in the cart. */
            <button
              onClick={onAdd}
              className="shop-add-btn ring-forest-200 text-forest-700"
              aria-label={`Add another ${p.name}, ${qty} already in cart`}
            >
              {qty} in cart · ADD
            </button>
          ) : qty > 0 ? (
            <div className="flex items-center overflow-hidden rounded-xl bg-chilli-600 shadow-[0_6px_16px_-6px_rgba(198,40,40,0.6)] ring-1 ring-chilli-700">
              <button
                onClick={dec}
                aria-label={qty === 1 ? `Remove ${p.name} from cart` : `Remove one ${p.name}`}
                className="px-2.5 py-2 text-white/90 active:scale-90 transition-transform"
              >
                <Minus size={13} strokeWidth={3} />
              </button>
              <span className="min-w-[18px] text-center text-xs font-extrabold text-white">{qty}</span>
              <button
                onClick={inc}
                aria-label={`Add one more ${p.name}`}
                className="px-2.5 py-2 text-white active:scale-90 transition-transform"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button onClick={onAdd} className="shop-add-btn" aria-label={`Add ${p.name} to cart`}>
              {ctaLabel} <Plus size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2.5">
        <Link
          to={`/shop/product/${p.id}`}
          className="line-clamp-2 pr-16 text-[13px] font-bold leading-snug text-gray-900 hover:text-forest-700"
        >
          {p.name}
        </Link>

        <RatingBadge subjectType="product" subjectId={p.id} className="mt-1" />

        <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-snug text-gray-400">{p.description}</p>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-forest-800">{formatINR(p.price)}</span>
          {configurable && <span className="text-[10px] font-semibold text-gray-400">onwards</span>}
        </div>

        <DetailRotator facts={facts} stagger={stagger} className="mt-1.5" />
      </div>
    </article>
  )
}
