import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Ticket, Truck, Heart, BadgeCheck, ChevronRight } from 'lucide-react'
import { selectActive } from '../../lib/activeProducts'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { FREE_DELIVERY_THRESHOLD } from '../../config/shop'
import { useShopCategories } from '../../hooks/useShopCategories'
import ProductImage from '../shop/ProductImage'
import { formatINR } from '../../utils/format'

/**
 * The shop, on the front screen — as a shelf you can buy from.
 *
 * Two rewrites' worth of problems, both about honesty of representation:
 *
 * First it was five category tiles. A table of contents with no prices, so
 * the half of the business you can buy in one tap was represented by five
 * words and nothing to buy.
 *
 * Then it was a rail sorted by price ascending — which is how it ended up
 * being *entirely pooja essentials*. Those are genuinely the cheapest things
 * in the catalogue, so "cheapest first" quietly turned a general shop into a
 * pooja shop, and a customer looking for a cake concluded we do not sell one.
 * That is the trap with any single-axis sort over a mixed catalogue: it looks
 * like a ranking and behaves like a filter.
 *
 * So the shelf is now built per category — the cheapest item from Cakes,
 * Gifts, Flowers, Pooja and Party Essentials — which guarantees the grid
 * shows the *range* of the shop rather than one corner of it, whatever the
 * price data does later.
 *
 * ── The grid, not the rail ─────────────────────────────────────────────
 * Two per row, same as the occasions above it. A horizontal scroller hides
 * everything past the second card behind a swipe; the grid puts the whole
 * shelf on the screen you are already scrolling, and the two sections then
 * read as one page instead of two different widgets.
 *
 * ── What each card says ────────────────────────────────────────────────
 * Price, a live coupon if one applies, and how far the order is from free
 * delivery — computed against the real FREE_DELIVERY_THRESHOLD, not asserted.
 * Everything on the card is a fact from the database or from config; nothing
 * is decorative.
 */
export default function ShopPicksRail() {
  // Live shelves, so a category added in the Product Studio gets sampled
  // here too instead of only the six that ship in config/shop.js.
  const shopCategories = useShopCategories()
  const [picks, setPicks] = useState([])
  const offers = usePublicOffers()

  useEffect(() => {
    let cancelled = false

    /**
     * One representative per category, so the shelf spans the shop.
     *
     * Queried per category rather than with a single `limit(8)`: one query
     * ordered by price returns whichever category happens to be cheapest,
     * which is exactly the failure this component had. Five small indexed
     * lookups are worth a grid that actually represents the catalogue.
     */
    Promise.all(
      shopCategories.map(cat =>
        // Retired products used to reach this rail: the select named its
        // columns and `is_active` was not among them. See lib/activeProducts
        // for why it could not simply be added.
        selectActive(
          'id, name, category, price, image_url, occasion',
          q => q
            .eq('category', cat.id)
            .order('price', { ascending: true })
            .limit(1)
        ).then(({ data }) => data?.[0] ?? null)
      )
    ).then(rows => {
      if (!cancelled) setPicks(rows.filter(Boolean))
    })

    return () => { cancelled = true }
    // Re-samples when the live shelf list arrives, so a shelf added in the
    // console is represented here on the same visit rather than after a reload.
  }, [shopCategories])

  // Nothing rather than an empty shelf: a heading over a blank strip reads as
  // a broken page, and this is the one section whose contents depend on a
  // network call that can legitimately come back empty.
  if (picks.length === 0) return null

  return (
    <section aria-labelledby="picks-heading">
      <div className="flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2 id="picks-heading" className="text-[15px] font-extrabold text-ink">
            Delivered to your door
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-mute">
            Cakes, gifts, flowers, pooja and party — order one on its own, no celebration required.
          </p>
        </div>
        <Link
          to="/shop"
          className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-saffron-700"
        >
          All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        {picks.map(p => {
          const offer = bestOfferFor(p.price, offers)
          const offerLabel = offer
            ? offer.discount_type === 'percent'
              ? `${Number(offer.discount_value)}% OFF`
              : `${formatINR(offer.discount_value)} OFF`
            : null
          const toFreeDelivery = FREE_DELIVERY_THRESHOLD - Number(p.price)

          return (
            <Link
              key={p.id}
              to={`/shop/product/${p.id}`}
              className="home-card group flex flex-col"
            >
              <span className="relative block">
                <ProductImage
                  src={p.image_url}
                  query={`${p.name} ${p.category}`}
                  className="aspect-square w-full"
                  cinematic
                />
                {offerLabel && (
                  <span className="absolute left-0 top-2.5 rounded-r-lg bg-chilli-600 py-1 pl-2 pr-2.5 text-[10px] font-extrabold text-white shadow-lg">
                    {offerLabel}
                  </span>
                )}
                {/* Which shelf this came from — the point of the grid is that
                    all five are represented, which only reads if each card
                    says which one it is. */}
                <span className="absolute right-2 top-2 rounded-lg bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {p.category}
                </span>
              </span>

              <span className="flex flex-1 flex-col p-2.5">
                <span className="block text-[12px] font-bold leading-snug text-gray-900 line-clamp-2">
                  {p.name}
                </span>

                <span className="mt-1 flex items-center gap-1 text-[9.5px] font-bold text-plum-600">
                  <BadgeCheck size={10} className="shrink-0" />
                  Delivered by Sambramo
                </span>

                <span className="mt-2 flex items-end justify-between gap-1">
                  <span className="text-[15px] font-extrabold leading-none text-gray-900">
                    {formatINR(p.price)}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white transition-transform group-hover:translate-x-0.5">
                    <ChevronRight size={14} strokeWidth={2.8} />
                  </span>
                </span>

                {offer ? (
                  <span className="mt-2 flex items-center gap-1 rounded-lg bg-chilli-50 px-2 py-1 text-[9.5px] font-bold text-chilli-700">
                    <Ticket size={10} className="shrink-0" />
                    <span className="truncate">Use code {offer.code}</span>
                  </span>
                ) : toFreeDelivery > 0 ? (
                  <span className="mt-2 flex items-center gap-1 rounded-lg bg-forest-50 px-2 py-1 text-[9.5px] font-bold text-forest-700">
                    <Truck size={10} className="shrink-0" />
                    <span className="truncate">{formatINR(toFreeDelivery)} more, free delivery</span>
                  </span>
                ) : (
                  <span className="mt-2 flex items-center gap-1 rounded-lg bg-forest-50 px-2 py-1 text-[9.5px] font-bold text-forest-700">
                    <Truck size={10} className="shrink-0" />
                    <span className="truncate">Free delivery</span>
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Every shelf, still one tap away.
          This replaces the separate "Need it today?" block of five photo
          tiles that used to sit further down the page. That section showed
          the same five categories this grid already samples, with no prices —
          so the page named the shop twice and sold from it once. Chips keep
          the direct route to a category without spending another screen of
          height repeating what is directly above them. */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {shopCategories.map(cat => (
          <Link
            key={cat.id}
            to={`/shop/${encodeURIComponent(cat.id)}`}
            className="tap-tall home-chip shrink-0 bg-surface text-ink-soft ring-1 ring-hairline/10"
          >
            <span aria-hidden="true">{cat.emoji}</span> {cat.label}
          </Link>
        ))}
        <Link
          to="/shop"
          className="tap-tall home-chip shrink-0 bg-saffron-400 text-plum-950"
        >
          See all <ArrowRight size={11} />
        </Link>
      </div>

      {/* The line that says who packs it. The shop's whole pitch on this
          screen is that a person handles the order rather than a warehouse,
          and that is the reason to buy a cake here instead of anywhere else. */}
      <div className="mt-3 px-4">
        <p className="flex items-start gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-soft ring-1 ring-hairline/[0.08]">
          <Heart size={13} className="mt-0.5 shrink-0 text-saffron-700" />
          <span>
            Packed by hand by our team, checked before it leaves, and delivered on the
            day you asked for — with a note if you want one.
          </span>
        </p>
      </div>
    </section>
  )
}
