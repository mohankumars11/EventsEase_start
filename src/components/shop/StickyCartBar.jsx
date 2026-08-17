import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Truck, ChevronDown } from 'lucide-react'
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
 *
 * ── It can be minimised, and that is not a nicety ─────────────────────────
 * Full height this bar is ~104px of a phone screen, permanently, on top of the
 * tab bar. Somebody who has added one thing and wants to keep browsing is
 * looking at a product grid through a letterbox — and the bar is most in the
 * way precisely when it is least useful, because the decision it exists for
 * (checkout) is one they have already declined for now.
 *
 * So it collapses to a small puck: item count, total, and the same tap target
 * to expand it again. Nothing is lost — the count and the total are the two
 * numbers people actually track while shopping, and both survive the collapse.
 *
 * It deliberately does NOT dismiss entirely. A cart bar that can be closed
 * outright is a cart somebody forgets they have, and the recovery is a 16px
 * icon most people never look at.
 *
 * ── It reopens when the cart changes ──────────────────────────────────────
 * Adding another item expands it again. Minimising means "not now, I'm still
 * shopping"; adding a thing is new information about the cart, and the total
 * they were tracking has just changed. Staying collapsed through that would
 * hide the one update they asked for by adding it.
 */
export default function StickyCartBar() {
  const { productCount, productTotal, cartPath } = useCart()
  const [minimised, setMinimised] = useState(false)
  const lastCount = useRef(productCount)

  useEffect(() => {
    if (productCount > lastCount.current) setMinimised(false)
    lastCount.current = productCount
  }, [productCount])

  if (productCount === 0) return null

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - productTotal)
  const progress  = Math.min(100, (productTotal / FREE_DELIVERY_THRESHOLD) * 100)
  const summary   = `${productCount} item${productCount === 1 ? '' : 's'} · ${formatINR(productTotal)}`

  return (
    <div
      // `pr-chat-dock` is the clearance the chat launcher owns in this
      // corner (index.css). Without it the launcher sat squarely on top of
      // the "View cart" button — the one tap this bar exists for.
      className="animate-pop-in above-bottom-nav fixed inset-x-0 z-40 pl-3 md:pl-4 pr-chat-dock md:bottom-5"
      role="region"
      aria-label="Cart summary"
    >
      {minimised ? (
        /* ── Collapsed ──────────────────────────────────────────────
           A puck rather than a full-width bar, left-aligned so it clears
           the chat launcher on the right. It carries the two numbers
           somebody tracks while shopping and expands on tap. */
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setMinimised(false)}
            aria-expanded="false"
            aria-label={`Expand cart — ${summary}`}
            className="flex items-center gap-2 rounded-full bg-chilli-600 py-2 pl-2.5 pr-4 text-white shadow-[var(--shadow-2)] transition-transform active:scale-95"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <ShoppingBag size={14} />
            </span>
            <span className="text-[12px] font-extrabold">{summary}</span>
          </button>
        </div>
      ) : (
        /* A white card, like every other floating bar. It was `bg-forest-800`
           — the storefront's old ground — which made sense while the page
           behind it was the same green and stopped making sense the moment it
           was not: a dark slab with the app's ink colour written on it. */
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-2)] ring-1 ring-hairline/10">
          <div className="flex items-start gap-2 px-3.5 pt-2.5">
            <div className="min-w-0 flex-1">
              {remaining > 0 ? (
                <>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-saffron-700">
                    <Truck size={12} />
                    Add {formatINR(remaining)} more for free delivery
                  </p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-sunk/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-saffron-300 transition-[width] duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-forest-700">
                  <Truck size={12} /> Free delivery unlocked
                </p>
              )}
            </div>

            {/* Minimise. A chevron rather than an ×, because × means "get rid
                of this" and this cannot be got rid of — it folds down to a
                puck and the cart is still there. */}
            <button
              type="button"
              onClick={() => setMinimised(true)}
              aria-expanded="true"
              aria-label="Minimise the cart bar and keep shopping"
              className="tap-tall -mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-ink/35 transition-colors hover:text-ink"
            >
              <ChevronDown size={16} strokeWidth={2.5} />
            </button>
          </div>

          <Link to={cartPath} className="flex items-center gap-3 px-3.5 py-3 active:bg-surface-sunk/[0.07]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-ink">
              <ShoppingBag size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold leading-tight text-ink">{summary}</span>
              <span className="block text-[11px] text-ink-mute">Taxes &amp; delivery calculated at checkout</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-xl bg-chilli-600 px-3.5 py-2.5 text-xs font-extrabold text-white">
              View cart <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
