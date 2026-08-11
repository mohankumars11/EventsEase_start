import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../utils/format'
import { FREE_DELIVERY_THRESHOLD } from '../../config/shop'

/**
 * The bar that rises over the tab bar once there's something in the cart.
 *
 * A phone storefront has no persistent cart column, so without this the only
 * route to checkout is a 16px icon in the app bar — and the cart total, the
 * one number that decides whether someone keeps shopping, is invisible while
 * they shop. It sits directly above BottomNav rather than replacing it, so
 * the app's navigation never disappears mid-flow.
 *
 * The free-delivery meter is the real threshold from config/shop, driven by
 * the real running total. It is the honest version of an upsell: it states
 * the rule and the gap, and it stops nagging the moment the rule is met.
 */
export default function StickyCartBar() {
  const { productCount, productTotal, cartPath } = useCart()
  if (productCount === 0) return null

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - productTotal)
  const progress  = Math.min(100, (productTotal / FREE_DELIVERY_THRESHOLD) * 100)

  return (
    <div
      // `pr-chat-dock` is the clearance the chat launcher owns in this
      // corner (index.css). Without it the launcher sat squarely on top of
      // the "View cart" button — the one tap this bar exists for.
      className="animate-pop-in fixed inset-x-0 z-40 pl-3 md:pl-4 pr-chat-dock bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-5"
      role="region"
      aria-label="Cart summary"
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-forest-800 shadow-[0_16px_40px_-16px_rgba(4,26,20,0.9)] ring-1 ring-white/10">
        {remaining > 0 ? (
          <div className="px-3.5 pt-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-saffron-200">
              <Truck size={12} />
              Add {formatINR(remaining)} more for free delivery
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-saffron-300 transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 px-3.5 pt-2.5 text-[11px] font-semibold text-forest-200">
            <Truck size={12} /> Free delivery unlocked
          </p>
        )}

        <Link to={cartPath} className="flex items-center gap-3 px-3.5 py-3 active:bg-white/5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <ShoppingBag size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold leading-tight text-white">
              {productCount} item{productCount === 1 ? '' : 's'} · {formatINR(productTotal)}
            </span>
            <span className="block text-[11px] text-white/50">Taxes & delivery calculated at checkout</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-xl bg-chilli-600 px-3.5 py-2.5 text-xs font-extrabold text-white">
            View cart <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  )
}
