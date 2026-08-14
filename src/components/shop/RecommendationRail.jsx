import { Sparkles, Users, TrendingUp } from 'lucide-react'
import MarketProductCard from './MarketProductCard'
import { useProductAdd } from './useProductAdd'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { useRecommendations } from '../../hooks/useRecommendations'
import { reasonFor } from '../../lib/recommend'

/**
 * "Goes with this" — one rail of ranked products.
 *
 * ── The heading is decided by the data, not by the caller ───────────────
 * A recommendation rail's heading is a claim about other customers, and it is
 * the easiest claim in e-commerce to make falsely. "Customers also bought" over
 * a content-matched guess is a lie a shop tells before it has any customers,
 * and it is the specific lie that makes every other number on the page
 * suspect once somebody works it out.
 *
 * So the heading here is not a prop. `learned` comes back from the ranker and
 * is true only when `get_copurchase_counts` returned real pairings past the
 * support floor — and even then, the social-proof heading is only used when
 * the top result is itself one of those measured pairings. Otherwise the rail
 * says what it actually is: things that go together. Both are worth showing;
 * only one of them is worth claiming.
 *
 * ── Why it reuses MarketProductCard ─────────────────────────────────────
 * A rail with its own smaller tile is how a shop ends up with two products
 * cards that drift — one gets the coupon ribbon and the veg mark, the other
 * does not, and the same cake looks cheaper on one screen than another. This
 * wraps the catalogue's card at a fixed width and adds only the one thing a
 * rail needs that a grid does not: why this item is here.
 */
export default function RecommendationRail({
  seed = null,
  cart = [],
  intent = 'complete',
  occasion = null,
  budgetGap = null,
  limit = 8,
  title,
  subtitle,
  tone = 'dark',              // 'dark' on the storefront ground, 'light' inside a card
  className = '',
}) {
  const { items, learned } = useRecommendations({ seed, cart, intent, occasion, budgetGap, limit })
  const { addProduct, sheet } = useProductAdd()
  const offers = usePublicOffers()

  // Fewer than two tiles is not a rail — it is one tile with a heading over
  // it, which reads as the shop having run out of things to sell.
  if (items.length < 2) return null

  // Social proof only when the strongest thing on the rail is genuinely
  // social. One measured pair among eight guesses does not make the rail
  // "what customers bought".
  const proven = items.filter(r => r.alsoBought).length
  const socialProof = learned && proven >= 2 && items[0].alsoBought

  const heading = title ?? (
    socialProof ? 'Customers bought these together'
      : intent === 'similar' ? 'You might also like'
        : 'Completes the celebration'
  )
  const sub = subtitle ?? (
    socialProof ? `From ${proven} real pairings in past orders`
      : intent === 'similar' ? 'Same shelf, similar price'
        : 'Picked to go with what you’re buying'
  )
  const Icon = socialProof ? Users : intent === 'similar' ? TrendingUp : Sparkles

  const dark = tone === 'dark'

  return (
    <section aria-labelledby={`rec-${intent}-${seed?.id ?? 'cart'}`} className={className}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2
            id={`rec-${intent}-${seed?.id ?? 'cart'}`}
            className={`flex items-center gap-2 text-[15px] font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}
          >
            <Icon size={16} className={dark ? 'text-saffron-300' : 'text-plum-500'} />
            {heading}
          </h2>
          <p className={`mt-0.5 truncate text-[11px] ${dark ? 'text-white/50' : 'text-gray-500'}`}>{sub}</p>
        </div>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 scrollbar-hide">
        {items.map((rec, i) => {
          const reason = reasonFor(rec)
          return (
            <div key={rec.product.id} className="w-[168px] shrink-0 snap-start sm:w-[184px]">
              {/* The reason sits above the tile rather than inside it. Inside,
                  it would compete with the price for the one line the card has
                  left; above, it reads as a caption on the whole tile, which is
                  what it is. */}
              {reason && (
                <p
                  className={`mb-1.5 flex items-center gap-1 truncate rounded-lg px-2 py-1 text-[10px] font-bold ${
                    reason.strong
                      ? 'bg-saffron-400 text-forest-900'
                      : dark
                        ? 'bg-white/10 text-white/70'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {reason.text}
                </p>
              )}
              <MarketProductCard
                product={rec.product}
                offer={bestOfferFor(rec.product.price, offers)}
                stagger={i}
                onAdd={() => addProduct(rec.product)}
              />
            </div>
          )
        })}
      </div>

      {sheet}
    </section>
  )
}
