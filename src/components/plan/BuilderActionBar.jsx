import { ArrowLeft, ArrowRight, Receipt } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * Forward motion, always within reach.
 *
 * ── The problem this replaces ───────────────────────────────────────────
 * "Next" was a button at the bottom of the step's content. On a step like
 * Food — a cuisine dropdown, seven courses, forty dish tiles and a notes
 * box — that is several screens of scrolling to reach a control you need
 * after every single choice. Worse, the last step had no Next at all: the
 * only button left was Back, and the actual way forward was a "Review"
 * chip inside a price bar that looked like part of the price. People got
 * to the end of the flow and could not find the end of the flow.
 *
 * So the step controls are pinned instead, and there is exactly one primary
 * action on screen at any moment. It says where it goes ("Next: Décor"),
 * and on the final step it is the thing that sends the request. Nothing
 * else in the bar competes with it.
 *
 * ── Why the price shares the bar ────────────────────────────────────────
 * The number has to stay visible — watching it move is the whole point of
 * the builder — but it earns one line, not a panel. It is a link to the
 * review step rather than a control that opens something over the page: a
 * pinned element may occupy the height it needs to be *glanced* at, and no
 * more. This bar is ~64px against the old sheet's ~300px.
 *
 * `above-bottom-nav` clears the app's tab bar and `pr-chat-dock` clears the
 * chat launcher in the md–lg band where both are on screen together.
 */
export default function BuilderActionBar({
  variant = 'fixed',
  canGoBack, onBack,
  primaryLabel, onPrimary, primaryDisabled,
  quote, onOpenReview, hint,
}) {
  const isFixed = variant === 'fixed'

  const back = canGoBack && (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back a step"
      className={
        isFixed
          ? 'shrink-0 w-11 h-11 rounded-xl ring-1 ring-white/15 bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20'
          : 'shrink-0 px-5 min-h-[52px] rounded-xl ring-1 ring-white/15 bg-white/10 text-sm font-semibold text-white/80 active:bg-white/20'
      }
    >
      {isFixed ? <ArrowLeft size={18} /> : 'Back'}
    </button>
  )

  const primary = (
    <button
      type="button"
      onClick={onPrimary}
      disabled={primaryDisabled}
      className={`min-h-[52px] rounded-xl bg-gradient-to-r from-saffron-500 to-amber-500 text-white font-bold flex items-center justify-center gap-1.5 px-4 shadow-lg shadow-amber-900/30 active:from-saffron-600 active:to-amber-600 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all ${
        isFixed ? 'shrink-0 text-sm' : 'flex-1 text-base'
      }`}
    >
      <span className="truncate">{primaryLabel}</span>
      <ArrowRight size={16} className="shrink-0" />
    </button>
  )

  if (!isFixed) {
    return (
      <div className="hidden lg:flex gap-3">
        {back}
        {primary}
      </div>
    )
  }

  return (
    <div className="plan-bar lg:hidden fixed inset-x-0 z-30 above-bottom-nav pr-chat-dock border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 px-3 py-2.5 pb-safe">
        {back}

        {quote ? (
          /* The price is a link to the review, not a disclosure widget. One
             destination, no state to be in the wrong one. */
          <button
            type="button"
            onClick={onOpenReview}
            className="min-w-0 flex-1 text-left py-1 active:opacity-70"
          >
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/45 font-bold">
              <Receipt size={10} /> Estimate · incl. taxes
            </span>
            <span className="block text-sm font-extrabold text-white truncate">
              {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
            </span>
          </button>
        ) : (
          <span className="min-w-0 flex-1 text-[11px] leading-snug text-white/45">
            {hint ?? 'The estimate appears here once you pick an occasion.'}
          </span>
        )}

        {primary}
      </div>
    </div>
  )
}
