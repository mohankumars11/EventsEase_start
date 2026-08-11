import { useEffect } from 'react'
import { Info, TrendingDown, ChevronUp, X, Receipt } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { quoteLines } from '../../utils/quote'
import { BRAND } from '../../config/sambramo'

/**
 * The number, and every line that made it.
 *
 * Three decisions are the reason this panel is worth building:
 *
 *   The headline is a RANGE, not a figure to the rupee. Sambramo is
 *   pre-launch with no signed caterer or decorator; a number stated exactly
 *   implies a rate card that does not exist yet, and the first time a real
 *   quote came back ₹4,000 higher the customer would be right to be angry.
 *
 *   The platform fee is a LINE, not a markup hidden in the plate rate.
 *
 *   Tax is shown per slab, because catering and services are not taxed at the
 *   same rate and a single "GST 18%" line would be wrong on the largest
 *   component of most quotes. See data/taxes.js — those rates still need a CA.
 *
 * ── Two variants, and why the phone one is not just the panel ───────────
 * `panel` is the desktop column: everything visible, nothing to dismiss,
 * because there is room beside the choices for it.
 *
 * `sheet` is the phone. It shipped as the panel wearing `position: fixed` and
 * that was a bug worth naming, because it is the classic one: only the line
 * items were hidden when collapsed, so the "collapsed" bar still carried the
 * header, a four-line disclaimer, the submit button and a footnote — about
 * 300px nailed across the bottom of a 640px screen, permanently, with its only
 * toggle buried in the header and no close button anywhere. Half the phone was
 * gone and there was no way to get it back.
 *
 * So the collapsed sheet is now ONE ROW: the price, and a way in. Everything
 * else — the breakdown, the disclaimer, the call to action — lives in the
 * expanded state, which is dismissable three ways (the X, the backdrop, and
 * Escape) because a thing that covers content must always be closable by
 * whichever gesture the user reaches for first.
 */
export default function QuotePanel({
  quote, blocked, onSubmit, submitting,
  variant = 'panel', expanded = true, onToggleExpanded, onClose,
}) {
  const isSheet = variant === 'sheet'

  // Escape closes it, and while it is open the page behind does not scroll.
  // Both are table stakes for anything that covers the screen; without the
  // scroll lock, dragging the sheet's breakdown drags the page underneath it.
  useEffect(() => {
    if (!isSheet || !expanded) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [isSheet, expanded, onClose])

  if (!quote) {
    // Only the desktop column has room to explain itself. On a phone the
    // caller hides this entirely until there is something to price — see the
    // `showQuote` gate in CelebrationBuilder.
    if (isSheet) return null
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-gray-500">
          Choose an occasion, a scale and a guest count — the estimate appears here instantly, no waiting for a call back.
        </p>
      </div>
    )
  }

  /* ── Phone, collapsed: one row and nothing else ──────────────────── */
  if (isSheet && !expanded) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 pb-safe">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={false}
          className="min-w-0 flex-1 text-left py-1"
        >
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            Estimated total · incl. taxes
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-gray-900 truncate">
              {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
            </span>
            <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-plum-700">
              Details <ChevronUp size={12} />
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="shrink-0 min-h-[44px] px-5 rounded-xl bg-saffron-500 text-white font-bold text-sm active:bg-saffron-600"
        >
          Review
        </button>
      </div>
    )
  }

  const lines = quoteLines(quote)

  const body = (
    <>
      <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-plum-700 to-plum-800 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">
              Estimated total · incl. taxes
            </p>
            <p className="text-2xl font-extrabold mt-0.5">
              {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
            </p>
            <p className="text-xs text-white/70 mt-1">
              About {formatINR(quote.perGuest)} per guest · {quote.tier.name} · {quote.guests} guests
            </p>
          </div>
          {isSheet && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the estimate"
              className="shrink-0 -mr-1 -mt-1 w-11 h-11 rounded-full flex items-center justify-center text-white/80 active:bg-white/15"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* The breakdown is the ONLY part that scrolls. It used to be capped at
          45vh inside a sheet that was itself anchored above the tab bar with
          no ceiling, so on a phone the total, the header and — depending on
          how many lines the quote had — the "Get this confirmed" button were
          pushed off the top of the screen with no way to scroll to them.
          Header and footer are pinned now and this takes what is left. */}
      <div className={`divide-y divide-gray-100 overflow-y-auto ${isSheet ? 'min-h-0 flex-1' : ''}`}>
        {lines.map(line => (
          <div key={line.key} className="flex items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">{line.label}</p>
              <p className="text-xs text-gray-500">{line.detail}</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(line.amount)}</p>
          </div>
        ))}

        <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-600">Subtotal</p>
          <p className="text-sm font-bold text-gray-900">{formatINR(quote.subtotal)}</p>
        </div>

        {quote.bundle.applied && (
          <div className="flex items-start justify-between gap-3 px-5 py-3 bg-green-50">
            <div>
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                <TrendingDown size={14} /> Whole-celebration saving
              </p>
              <p className="text-xs text-green-700">
                {Math.round(quote.bundle.rate * 100)}% off for booking food, décor and coordination together
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold text-green-700">−{formatINR(quote.bundle.amount)}</p>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Sambramo platform fee</p>
            <p className="text-xs text-gray-500">
              {Math.round(quote.platformFee.rate * 100)}% — sourcing, negotiating and standing behind the booking
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(quote.platformFee.amount)}</p>
        </div>

        {quote.tax.parts.length > 0 && (
          <div className="px-5 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Receipt size={14} /> {quote.tax.label}
              </p>
              <p className="text-sm font-bold text-gray-900">{formatINR(quote.tax.total)}</p>
            </div>
            {quote.tax.parts.map(part => (
              <div key={part.key} className="flex items-center justify-between text-xs text-gray-500">
                <span>{part.label} @ {Math.round(part.rate * 100)}%</span>
                <span>{formatINR(part.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 py-4 space-y-3 border-t border-gray-100 pb-safe">
        <p className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            <strong className="text-gray-700">This is an estimate, not a final quote — it can vary slightly.</strong>{' '}
            Built from current {BRAND.pilotCities.join(' and ')} market rates. A coordinator confirms venue access,
            date and vendor availability, then sends you a final figure to approve. Nothing is booked until you do.
          </span>
        </p>

        {blocked && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            {blocked.message}
          </p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !!blocked}
          className="w-full min-h-[52px] rounded-xl bg-saffron-500 text-white font-bold text-base active:bg-saffron-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Get this confirmed →'}
        </button>
        <p className="text-[11px] text-center text-gray-400">
          Free to send. Nothing to pay to get a confirmed quote.
        </p>
      </div>
    </>
  )

  if (!isSheet) return <div className="card overflow-hidden">{body}</div>

  /* The expanded sheet owns the whole viewport, not a slot above the tab bar.
     It is a modal dialog, so it covers the tab bar (z-50) and the desktop
     chat dock (z-45) rather than leaving live buttons lit around its edges,
     and it is capped at 92dvh so the grab handle and the price are always on
     screen no matter how long the breakdown gets. */
  return (
    <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        aria-label="Close the estimate"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Estimated total"
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl bg-white overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
      >
        {/* A grab handle. It does nothing on its own, and that is fine — it is
            the universal "this panel moves" signal, and it makes the header
            read as dismissable before anybody hunts for the X. */}
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        {body}
      </div>
    </div>
  )
}
