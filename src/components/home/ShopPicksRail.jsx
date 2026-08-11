import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Ticket, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { FREE_DELIVERY_THRESHOLD } from '../../config/shop'
import ProductImage from '../shop/ProductImage'
import { formatINR } from '../../utils/format'

/**
 * Actual things you can buy, on the front screen.
 *
 * The home screen's shop presence was five category tiles — "Cakes",
 * "Flowers", "Gifts" — which is a table of contents, not a shop. Nothing with
 * a price on it appeared until you had tapped through into a category, so the
 * half of the business that can be bought in one tap was represented on the
 * front page by five words and no products.
 *
 * That is the wrong way round for the cheapest thing Sambramo sells. A ₹899
 * cake is the transaction most likely to be somebody's first, and a first
 * transaction is what makes the second one — the celebration — possible. It
 * should be visible, priced, and one tap from the front door.
 *
 * ── Real data only ─────────────────────────────────────────────────────
 * Products come from the `products` table and prices are theirs. The discount
 * ribbon is a live coupon from the `coupons` table, matched to each item's own
 * price by bestOfferFor — the same helper, the same rule and the same visual
 * language the storefront's own cards use, so a red badge means one thing
 * everywhere in the app. No coupon, no ribbon.
 *
 * Sorted by price ascending: the rail's job is to show that this is
 * affordable and immediate, which the cheapest four items do better than the
 * most expensive four.
 */
export default function ShopPicksRail({ limit = 8 }) {
  const [products, setProducts] = useState([])
  const offers = usePublicOffers()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('products')
      .select('id, name, category, price, image_url, occasion')
      .order('price', { ascending: true })
      .limit(limit)
      .then(({ data }) => { if (!cancelled) setProducts(data ?? []) })
    return () => { cancelled = true }
  }, [limit])

  // Renders nothing rather than an empty shelf: a heading over a blank strip
  // reads as a broken page, and this is the one section whose contents depend
  // on a network call that can legitimately return nothing.
  if (products.length === 0) return null

  return (
    <section aria-labelledby="picks-heading">
      <div className="flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2 id="picks-heading" className="text-[15px] font-extrabold text-white">
            Delivered to your door
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">
            Cakes, flowers and gifts — order one on its own, no celebration required.
          </p>
        </div>
        <Link
          to="/shop"
          className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-saffron-300"
        >
          All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x scroll-pl-4">
        {products.map(p => {
          const offer = bestOfferFor(p.price, offers)
          const offerLabel = offer
            ? offer.discount_type === 'percent'
              ? `${Number(offer.discount_value)}% OFF`
              : `${formatINR(offer.discount_value)} OFF`
            : null

          return (
            <Link
              key={p.id}
              to={`/shop/product/${p.id}`}
              className="home-card flex w-[142px] shrink-0 snap-start flex-col"
            >
              <span className="relative block">
                <ProductImage
                  src={p.image_url}
                  query={`${p.name} ${p.category}`}
                  className="aspect-square w-full"
                />
                {offerLabel && (
                  <span className="absolute left-0 top-2 rounded-r-md bg-chilli-600 py-0.5 pl-1.5 pr-2 text-[9px] font-extrabold text-white shadow">
                    {offerLabel}
                  </span>
                )}
              </span>

              <span className="flex flex-1 flex-col p-2.5">
                <span className="block text-[11.5px] font-bold leading-snug text-gray-900 line-clamp-2">
                  {p.name}
                </span>

                <span className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-[14px] font-extrabold leading-none text-gray-900">
                    {formatINR(p.price)}
                  </span>
                </span>

                {offer ? (
                  <span className="mt-1.5 flex items-center gap-1 text-[9.5px] font-bold text-chilli-700">
                    <Ticket size={9} className="shrink-0" />
                    <span className="truncate">Code {offer.code}</span>
                  </span>
                ) : (
                  <span className="mt-1.5 flex items-center gap-1 text-[9.5px] font-semibold text-gray-400">
                    <Truck size={9} className="shrink-0" />
                    <span className="truncate">Free over {formatINR(FREE_DELIVERY_THRESHOLD)}</span>
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
