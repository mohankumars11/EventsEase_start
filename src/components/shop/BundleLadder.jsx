import { useMemo } from 'react'
import { Check, Plus, Ticket, Truck, TrendingUp } from 'lucide-react'
import ProductImage from './ProductImage'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import { useProductAdd } from './useProductAdd'
import { usePublicOffers } from '../../hooks/usePublicOffers'
import { useRecommender } from '../../hooks/useRecommendations'
import { bestCouponValue } from '../../lib/savings'
import { isCustomizable } from '../../config/customizers'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../../config/shop'

/**
 * "Add 2 and save ₹200. Add 4 and save ₹400." — the whole ladder, at once.
 *
 * Replaces BundleCard, which showed one fixed set of three and one saving.
 * That answered "what goes with this" and stopped there; a customer looking at
 * ₹200 off had no way to see that two more items were worth ₹400, so the only
 * offer they ever met was the smallest one we could find for them.
 *
 * ── Where the rungs come from, and why they are not invented ────────────
 * This is the part that matters. The obvious way to build a "buy more, save
 * more" ladder is to make up tiers — 5% off three, 10% off five — which
 * requires a discount the checkout has never heard of. The first customer to
 * reach the payment screen finds it gone, and this project has already learnt
 * that lesson twice (it is why MarketProductCard has no struck-through MRP).
 *
 * The rungs here are the `min_order_amount` values already sitting in the
 * `coupons` table. Today that is a genuine four-step ladder — ₹499, ₹799,
 * ₹999, ₹1,499 — plus the free-delivery line. Every figure printed below is
 * what `validate_coupon` will actually return, computed with the same rules in
 * the same order via lib/savings, so a customer can check any of it by
 * applying the code. Add a coupon in admin and a rung appears; retire one and
 * it goes. Nothing here needs a new discount mechanism because the mechanism
 * was already there and nothing was reading it.
 *
 * ── Why a rung must beat the one below it ───────────────────────────────
 * A ladder that lists every set size is a list, not an argument. `rungs` keeps
 * a size only when its saving strictly improves on the best available below —
 * so a fourth item that adds ₹250 to the basket and nothing to the discount
 * never appears, because suggesting it would be asking somebody to spend money
 * for our benefit and calling it an offer. That single rule is the difference
 * between this and every "frequently bought together" strip that pads itself.
 *
 * ── And why it can show nothing ─────────────────────────────────────────
 * If no reachable set clears a threshold the seed does not already clear, this
 * renders null. A bundle card that always finds a saving is a bundle card
 * nobody reads.
 */
export default function BundleLadder({ seed, className = '', maxAdd = 5 }) {
  const { recommend, ready } = useRecommender()
  const { hasProduct } = useCart()
  const { addProduct, sheet } = useProductAdd()
  const offers = usePublicOffers()

  // Complements only — a ladder of five cakes is not a bundle, it is five
  // cakes. Ranked once; the ladder walks this order cumulatively, so rung n is
  // always rung n−1 plus the next best match rather than a different set.
  // That is what lets the card say "add one more" and mean it.
  const picks = useMemo(() => {
    if (!ready || !seed) return []
    return recommend({ seed, intent: 'complete', limit: maxAdd })
      .map(r => r.product)
      .filter(Boolean)
  }, [ready, seed, recommend, maxAdd])

  const ladder = useMemo(() => {
    if (!seed || picks.length === 0) return null

    const seedPrice = Number(seed.price) || 0
    // What the seed can claim on its own. Every saving below is stated against
    // this, because quoting the whole coupon as "what the bundle saves" would
    // count a discount the customer might already have had.
    const alone = bestCouponValue(seedPrice, offers)?.amount ?? 0
    const deliveryAlone = seedPrice >= FREE_DELIVERY_THRESHOLD

    const rungs = []
    let bestSoFar = 0
    let running = seedPrice

    for (let i = 0; i < picks.length; i++) {
      running += Number(picks[i].price) || 0
      const items = [seed, ...picks.slice(0, i + 1)]

      const coupon = bestCouponValue(running, offers)
      const couponGain = Math.max(0, (coupon?.amount ?? 0) - alone)

      // Delivery is a first-order offer, so it is stated as a threshold the
      // set crosses rather than as money in hand — deliverySavings refuses to
      // promise it to a returning customer and this card is shown to
      // signed-out visitors too.
      const unlocksDelivery = running >= FREE_DELIVERY_THRESHOLD && !deliveryAlone
      const saving = couponGain + (unlocksDelivery ? DELIVERY_FEE : 0)

      // Only a rung if it genuinely beats everything below it.
      if (saving > bestSoFar) {
        bestSoFar = saving
        rungs.push({
          size: items.length,
          adds: i + 1,
          items,
          total: running,
          coupon,
          couponGain,
          unlocksDelivery,
          saving,
          payable: running - (coupon?.amount ?? 0) + (unlocksDelivery ? 0 : DELIVERY_FEE),
        })
      }
    }

    return rungs.length ? rungs : null
  }, [seed, picks, offers])

  if (!ready || !ladder) return null

  // The deepest rung is the headline — it is the largest true number on the
  // card — but every rung stays tappable, because "the best offer" and "the
  // offer this person wants" are not the same thing and the card should not
  // decide that for them.
  const best = ladder[ladder.length - 1]

  return (
    <section className={`shop-card overflow-hidden ${className}`}>
      <header className="flex items-start gap-2.5 border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white px-4 py-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <TrendingUp size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-gray-900">
            Buy more, save more
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
            Save up to{' '}
            <span className="font-extrabold text-emerald-700">{formatINR(best.saving)}</span>{' '}
            — real codes, applied in the cart
          </p>
        </div>
      </header>

      <ul className="divide-y divide-gray-100">
        {ladder.map(rung => {
          const missing = rung.items.filter(p => !hasProduct(p.id))
          const allIn = missing.length === 0
          const needsChoices = missing.some(p => isCustomizable(p.category))

          return (
            <li key={rung.size} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold leading-tight text-gray-900">
                    These {rung.size} together
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {formatINR(rung.total)} · pay {formatINR(rung.payable)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-extrabold text-white">
                  Save {formatINR(rung.saving)}
                </span>
              </div>

              {/* The set, as a row of faces. Small, because at this size the
                  tiles are a reminder of what the rung contains — the customer
                  has already seen these products on the rail below. */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {rung.items.map((p, i) => (
                  <span key={p.id} className="flex items-center gap-1.5">
                    {i > 0 && <Plus size={10} className="text-gray-300" />}
                    <span className="relative">
                      <ProductImage
                        src={p.image_url}
                        emoji={p.emoji}
                        alt={p.image_alt || p.name}
                        className="h-11 w-11 rounded-lg ring-1 ring-black/5"
                      />
                      {hasProduct(p.id) && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                  </span>
                ))}
              </div>

              {/* What the saving is actually made of. Named, because "save
                  ₹400" that cannot be traced to a code is the kind of claim
                  that makes every other number on the page suspect. */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {rung.couponGain > 0 && rung.coupon && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-chilli-50 px-2 py-1 text-[10.5px] font-bold text-chilli-800 ring-1 ring-chilli-100">
                    <Ticket size={11} />
                    <span className="font-mono">{rung.coupon.code}</span> · {formatINR(rung.couponGain)} more off
                  </span>
                )}
                {rung.unlocksDelivery && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                    <Truck size={11} /> Free delivery · {formatINR(DELIVERY_FEE)}
                  </span>
                )}
              </div>

              <button
                onClick={() => missing.forEach(addProduct)}
                disabled={allIn}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-700 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-plum-800 disabled:bg-emerald-600 disabled:opacity-100"
              >
                {allIn
                  ? <><Check size={15} strokeWidth={3} /> All {rung.size} in your bag</>
                  : <><Plus size={15} strokeWidth={3} /> Add {missing.length === rung.items.length ? `all ${rung.size}` : `the other ${missing.length}`}</>}
              </button>

              {/* Said before the tap, not discovered after it. A cake needs a
                  weight and a flavour before anybody can bake it, so this
                  opens a sheet rather than adding a guess. */}
              {!allIn && needsChoices && (
                <p className="mt-1.5 text-center text-[10px] text-gray-400">
                  We’ll ask for size, flavour and message where they’re needed.
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {sheet}
    </section>
  )
}
