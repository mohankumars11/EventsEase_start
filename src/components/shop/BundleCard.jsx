import { useMemo } from 'react'
import { Plus, Check, PackagePlus, Ticket, Truck } from 'lucide-react'
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
 * "Frequently bought together" — the set, and what the set is worth.
 *
 * ── The mechanic, and why it needed no new discount ─────────────────────
 * The obvious way to build this is to invent a bundle price: sum the items,
 * knock 12% off, print "BUNDLE SAVER". That would require a discount the
 * checkout has never heard of, enforced by nothing, and the first customer to
 * reach the payment screen would find the bundle price gone. This project
 * already learnt that lesson twice — it is why MarketProductCard has no
 * struck-through MRP and why OffersRail only renders coupons the RPC will
 * accept.
 *
 * The honest mechanic was already sitting in the coupon table. Every coupon in
 * `coupons` carries a `min_order_amount`, and most single items do not clear
 * it: a ₹899 cake qualifies for nothing, while the same cake plus balloons
 * plus a banner clears ₹1,499 and unlocks a real code worth real money. So the
 * saving this card advertises is not a new discount at all — it is the
 * existing one, becoming reachable.
 *
 * That makes every claim on this card verifiable by the customer: the code is
 * live in `coupons`, the total is arithmetic they can do, and `validate_coupon`
 * will return exactly the figure printed here because this computes it with
 * the same rules in the same order (see lib/savings).
 *
 * ── When there is nothing true to claim ─────────────────────────────────
 * If the combined total unlocks no coupon and no delivery waiver, the card
 * says nothing about money. It still shows the set, because "these three go
 * together" is useful on its own — but it does not manufacture a reason. A
 * bundle card that always finds a saving is a bundle card nobody reads.
 */
export default function BundleCard({ seed, className = '', size = 2 }) {
  const { recommend, ready } = useRecommender()
  const { hasProduct } = useCart()
  const { addProduct, sheet } = useProductAdd()
  const offers = usePublicOffers()

  // Complements only — a bundle of two cakes is not a bundle, it is two cakes.
  // Deliberately ignores what is already in the cart as an exclusion here: the
  // set is a statement about the seed, and it should not lose a member and
  // re-flow because the customer added one of them.
  const picks = useMemo(() => {
    if (!ready || !seed) return []
    return recommend({ seed, intent: 'complete', limit: size })
      .map(r => r.product)
      .filter(Boolean)
  }, [ready, seed, recommend, size])

  const items = seed ? [seed, ...picks] : []

  const value = useMemo(() => {
    if (items.length < 2) return null
    const total = items.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
    const seedPrice = Number(seed.price) || 0

    // What the seed could claim alone, versus what the set can claim. The
    // difference is the part that is genuinely caused by bundling; quoting the
    // whole coupon as "what the bundle saves" would be counting a saving the
    // customer might already have had.
    const alone = bestCouponValue(seedPrice, offers)
    const together = bestCouponValue(total, offers)

    // Delivery is first-order-only, and this card is shown to signed-out
    // visitors too, so it is stated as a threshold the set crosses rather than
    // as money in hand. `deliverySavings` refuses to promise it otherwise.
    const deliveryAlone = seedPrice >= FREE_DELIVERY_THRESHOLD
    const deliveryTogether = total >= FREE_DELIVERY_THRESHOLD

    const couponGain = (together?.amount ?? 0) - (alone?.amount ?? 0)
    const unlocksDelivery = deliveryTogether && !deliveryAlone

    return {
      total,
      together,
      couponGain: couponGain > 0 ? couponGain : 0,
      unlocksDelivery,
      // Only claim the delivery fee alongside the coupon when the set is what
      // crossed the line.
      saving: (couponGain > 0 ? couponGain : 0) + (unlocksDelivery ? DELIVERY_FEE : 0),
      payable: total - (together?.amount ?? 0),
    }
  }, [items, offers, seed])

  if (!ready || items.length < 2 || !value) return null

  // A configurable product (a cake, a pooja kit) cannot be added blind — it
  // has no orderable form until weight, flavour or tradition are chosen. So
  // "add all" opens each sheet in turn rather than silently ordering a
  // default nobody picked. Handled by useProductAdd, which is the one place
  // that decision lives.
  function addAll() {
    items.filter(p => !hasProduct(p.id)).forEach(addProduct)
  }

  const missing = items.filter(p => !hasProduct(p.id))
  const allIn = missing.length === 0
  const needsChoices = missing.some(p => isCustomizable(p.category))

  return (
    <section className={`shop-card p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-500/10 text-plum-600">
          <PackagePlus size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-gray-900">
            Buy the set
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
            {value.saving > 0
              ? 'Together these clear an offer none of them reaches alone'
              : 'What people put on the same table'}
          </p>
        </div>
      </header>

      {/* ── The set ──
          Laid out as a sum with real plus signs, because that is the claim:
          these, added up, come to this. A row of tiles with a price under each
          is a shelf; a sum is an argument. */}
      <div className="flex flex-wrap items-center gap-2">
        {items.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            {i > 0 && <Plus size={13} className="shrink-0 text-gray-300" />}
            <div className="w-[86px] text-center">
              <div className="relative">
                <ProductImage
                  src={p.image_url}
                  emoji={p.emoji}
                  alt={p.image_alt || p.name}
                  className="h-[86px] w-[86px] rounded-xl ring-1 ring-black/5"
                />
                {hasProduct(p.id) && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    This
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[10.5px] font-semibold leading-tight text-gray-700">
                {p.name}
              </p>
              <p className="text-[11px] font-extrabold text-forest-800">{formatINR(p.price)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── The money ── */}
      <div className="mt-4 rounded-2xl bg-gray-50 p-3.5 ring-1 ring-gray-100">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {items.length} items
          </span>
          <span className="text-lg font-extrabold text-gray-900">{formatINR(value.total)}</span>
        </div>

        {value.couponGain > 0 && value.together && (
          <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-chilli-50 px-3 py-2.5 ring-1 ring-chilli-100">
            <Ticket size={14} className="mt-px shrink-0 text-chilli-600" />
            <p className="text-[11.5px] leading-relaxed text-chilli-800">
              This total unlocks{' '}
              <span className="font-mono font-extrabold">{value.together.code}</span> —{' '}
              <span className="font-extrabold">{formatINR(value.together.amount)} off</span>,{' '}
              {formatINR(value.couponGain)} more than {seed.name.split('(')[0].trim()} qualifies for on
              its own. Apply it in the cart.
            </p>
          </div>
        )}

        {value.unlocksDelivery && (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
            <Truck size={14} className="mt-px shrink-0 text-emerald-600" />
            <p className="text-[11.5px] leading-relaxed text-emerald-800">
              Past {formatINR(FREE_DELIVERY_THRESHOLD)} — delivery is free on your first order,{' '}
              <span className="font-extrabold">{formatINR(DELIVERY_FEE)} saved</span>.
            </p>
          </div>
        )}

        {value.saving > 0 && (
          <p className="mt-2.5 text-center text-[11px] font-bold text-emerald-700">
            You save {formatINR(value.saving)} by buying these together
          </p>
        )}
      </div>

      <button
        onClick={addAll}
        disabled={allIn}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-700 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-plum-800 disabled:bg-emerald-600 disabled:opacity-100"
      >
        {allIn ? (
          <><Check size={16} strokeWidth={3} /> All {items.length} in your bag</>
        ) : (
          <><PackagePlus size={16} /> Add {missing.length === items.length ? `all ${items.length}` : `the other ${missing.length}`}</>
        )}
      </button>

      {/* Said before the tap, not discovered after it. A cake needs a weight
          and a flavour before anyone can bake it, so "add all" opens a sheet
          rather than adding a guess. */}
      {!allIn && needsChoices && (
        <p className="mt-2 text-center text-[10.5px] text-gray-400">
          We’ll ask for size, flavour and message where they’re needed.
        </p>
      )}

      {sheet}
    </section>
  )
}
