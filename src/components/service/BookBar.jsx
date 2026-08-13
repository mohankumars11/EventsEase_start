import { ShoppingCart, ArrowRight, Check } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * The bar that appears the moment something is chosen, and not before.
 *
 * ── Two buttons, deliberately ───────────────────────────────────────────
 * "Add to cart" keeps the customer on the page — the common case is somebody
 * booking decoration who then wants a photographer, and sending them to a cart
 * after every single pick is how a two-item booking becomes a one-item booking.
 * "Book now" goes straight to the cart for the person who came for one thing
 * and is finished.
 *
 * ── Why the total is itemised in one line ───────────────────────────────
 * A sticky bar showing only "₹42,600" invites the question it cannot answer.
 * The line under it names what is in the number — the setup, the scale, the
 * extras — so a customer can tell at a glance whether the figure includes the
 * add-on they just ticked, which is the moment most carts get abandoned.
 *
 * It sits above the phone tab bar (`bottom-20`), not over it: the tab bar is
 * the app's navigation and covering it to sell something is the pattern that
 * makes people close a page rather than use it.
 */
export default function BookBar({
  total, lineLabel, detail, onAdd, onBook, added, disabled, estimateNote = true,
}) {
  return (
    <div className="animate-pop-in fixed inset-x-0 bottom-16 z-30 px-3 pb-2 md:bottom-3">
      <div className="mx-auto max-w-3xl rounded-3xl bg-plum-950/95 p-3 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/12 backdrop-blur-md">
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-white/55">{lineLabel}</p>
            <p className="text-[20px] font-extrabold leading-tight text-white">
              {formatINR(total)}
              {estimateNote && (
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-saffron-300">
                  estimate
                </span>
              )}
            </p>
            {detail && (
              <p className="truncate text-[10.5px] leading-snug text-white/45">{detail}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              disabled={disabled || added}
              className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-[12px] font-extrabold transition-transform active:scale-95 ${
                added
                  ? 'cursor-default bg-green-500/15 text-green-300 ring-1 ring-green-400/30'
                  : 'bg-white/10 text-white ring-1 ring-white/20'
              }`}
            >
              {added ? <Check size={14} /> : <ShoppingCart size={14} />}
              {added ? 'Added' : 'Add'}
            </button>

            <button
              type="button"
              onClick={onBook}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-saffron-400 px-4 py-2.5 text-[13px] font-extrabold text-plum-950 transition-transform active:scale-95 disabled:opacity-50"
            >
              Book this <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <p className="mt-1.5 px-1 text-[9.5px] leading-snug text-white/35">
          Nothing is charged now. A coordinator confirms availability and the final
          figure before anything is booked.
        </p>
      </div>
    </div>
  )
}
