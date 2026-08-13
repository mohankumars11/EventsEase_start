import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowRight, Check } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * The bar that appears the moment something is chosen, and not before.
 *
 * ── One button, after shipping two ──────────────────────────────────────
 * It launched with "Add" and "Book this" side by side. That is two buttons
 * for one intention, and the difference between them — one keeps you here,
 * one goes to the cart — is a fact about our navigation, not about the
 * customer's decision. So at the exact moment somebody has finished choosing,
 * they were handed a second, smaller, entirely procedural choice to make, with
 * no information on screen to make it with. The reliable outcome of asking
 * that question is not a considered answer; it is a pause, and a pause at the
 * commit step is where carts are lost.
 *
 * There is now one primary action, and the *result* of pressing it carries the
 * next step:
 *
 *   before  [ Add to cart · ₹21,000 ]
 *   after   ✓ Added   [ View cart & send → ]
 *
 * Same two destinations, but sequenced instead of forked: decide first, then
 * be told what happened and offered somewhere to go. Nobody has to predict
 * which button they will want before they have pressed anything.
 *
 * It sits above the phone tab bar (`bottom-16`), not over it: the tab bar is
 * the app's navigation and covering it to sell something is the pattern that
 * makes people close a page rather than use it.
 */
export default function BookBar({
  total, lineLabel, detail, onAdd, added, cartPath, cartCount, disabled,
  estimateNote = true,
}) {
  return (
    <div className="animate-pop-in fixed inset-x-0 bottom-16 z-30 px-3 pb-2 md:bottom-3">
      <div className="mx-auto max-w-3xl rounded-3xl bg-plum-950/95 p-3 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/12 backdrop-blur-md">
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {added ? (
              <>
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-green-300">
                  <Check size={13} strokeWidth={3} /> Added to your cart
                </p>
                <p className="truncate text-[13px] font-bold leading-tight text-white">{lineLabel}</p>
                <p className="truncate text-[10.5px] leading-snug text-white/45">
                  Keep browsing — add as many services as you need, then send them together.
                </p>
              </>
            ) : (
              <>
                <p className="truncate text-[11px] font-bold text-white/55">{lineLabel}</p>
                <p className="text-[20px] font-extrabold leading-tight text-white">
                  {formatINR(total)}
                  {estimateNote && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-saffron-300">
                      estimate
                    </span>
                  )}
                </p>
                {detail && <p className="truncate text-[10.5px] leading-snug text-white/45">{detail}</p>}
              </>
            )}
          </div>

          {added ? (
            <Link
              to={cartPath}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-saffron-400 px-4 py-2.5 text-[13px] font-extrabold text-plum-950 transition-transform active:scale-95"
            >
              View cart{cartCount ? ` (${cartCount})` : ''} <ArrowRight size={14} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={disabled}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-saffron-400 px-4 py-3 text-[13.5px] font-extrabold text-plum-950 transition-transform active:scale-95 disabled:opacity-50"
            >
              <ShoppingCart size={15} /> Add to cart
            </button>
          )}
        </div>

        <p className="mt-1.5 px-1 text-[9.5px] leading-snug text-white/35">
          Nothing is charged now. A coordinator confirms availability and the final
          figure before anything is booked.
        </p>
      </div>
    </div>
  )
}
