import { Link } from 'react-router-dom'
import { ArrowRight, CalendarHeart, ShoppingBag } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../utils/format'

/**
 * "Your other basket has things in it."
 *
 * ── The bug this closes ─────────────────────────────────────────────────
 * This app has two genuinely different carts, and that is the right design:
 * shop products are goods that get delivered and paid for now, event services
 * are quoted work a coordinator prices and confirms later. They check out
 * differently because they are different transactions.
 *
 * What was wrong is that they shared one cart icon and one badge —
 * `cartCount = totalCount + productCount` — while neither cart page
 * acknowledged the other's existence. ShopCart mentioned services zero times;
 * the services cart mentioned products zero times. So:
 *
 *   A customer with a cake in their bag adds a photographer. The badge goes to
 *   2. They tap it. `cartPath` prefers the shop cart whenever a product is
 *   present, so they land on a page showing one cake and no photographer.
 *
 * From the customer's side the add silently failed, and the badge is calling
 * them a liar about it. There is no error to report and nothing in the console
 * — the item is stored correctly and rendered correctly on a page they were
 * never sent to. That is the worst shape a bug can have, because everybody who
 * hits it concludes the feature is broken and stops using it.
 *
 * ── Why a bridge and not one merged cart ────────────────────────────────
 * Merging them is the obvious fix and the wrong one. It would put a ₹799 cake
 * that is paid for on UPI today in the same total as a ₹35,000 photographer
 * that is an estimate pending a coordinator's confirmation, under one
 * "Checkout" button that cannot mean the same thing for both. The two-total
 * problem is exactly why they were separated.
 *
 * So the carts stay apart and each one stops pretending the other is empty.
 * The badge is honest again because tapping through now always reaches
 * everything, in at most one more tap, with the count and the money stated
 * before the tap so nothing is a surprise.
 *
 * @param side  which cart is rendering this — 'shop' or 'services'
 */
export default function CartBridge({ side, className = '' }) {
  const { productCount, productTotal, totalCount, total } = useCart()

  const onShop = side === 'shop'
  // What the OTHER cart holds.
  const count = onShop ? totalCount : productCount
  const amount = onShop ? total : productTotal

  // Nothing over there — say nothing. A permanent strip advertising an empty
  // basket is how a customer learns to stop reading this row.
  if (!count) return null

  const to = onShop ? '/dashboard/customer/cart' : '/shop/cart'
  const Icon = onShop ? CalendarHeart : ShoppingBag

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl bg-plum-50 px-4 py-3.5 ring-1 ring-plum-200/70 active:bg-plum-100 ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-600 text-white">
        <Icon size={16} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold leading-tight text-plum-900">
          {onShop
            ? `${count} ${count === 1 ? 'service' : 'services'} in your celebration cart`
            : `${count} ${count === 1 ? 'item' : 'items'} in your shopping bag`}
        </span>
        {/* The amount is labelled differently on each side because it means
            different things: the shop total is payable today, the services
            total is an estimate a coordinator still has to confirm. Printing
            one word for both is how the ₹35,000 estimate starts reading like
            a charge. */}
        <span className="mt-0.5 block text-[11px] leading-snug text-plum-700/80">
          {onShop
            ? `Estimated ${formatINR(amount)} — quoted separately, nothing charged yet`
            : `${formatINR(amount)} — delivered goods, paid at checkout`}
        </span>
      </span>

      <ArrowRight size={16} className="shrink-0 text-plum-500" />
    </Link>
  )
}
