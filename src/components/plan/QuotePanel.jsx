import { Info, TrendingDown, ChevronUp, ChevronDown, Receipt } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { quoteLines } from '../../utils/quote'
import { BRAND } from '../../config/sambramo'

/**
 * The number, and every line that made it.
 *
 * Three decisions here are the reason this panel is worth building:
 *
 *   The headline is a RANGE, not a figure to the rupee. Sambramo is
 *   pre-launch with no signed caterer or decorator; a number stated exactly
 *   implies a rate card that does not exist yet, and the first time a real
 *   quote came back ₹4,000 higher the customer would be right to be angry.
 *   "Contact us for pricing" kills conversion — a range does not.
 *
 *   The platform fee is a LINE, not a markup hidden in the plate rate. The
 *   pitch is that we negotiate and coordinate on the customer's behalf; a fee
 *   buried inside the food price makes that pitch a lie the first time
 *   somebody rings a caterer directly to compare.
 *
 *   Tax is shown per slab, because catering and services are not taxed at the
 *   same rate and a single "GST 18%" line would be wrong on the largest
 *   component of most quotes. See data/taxes.js — those rates still need a CA.
 */
export default function QuotePanel({
  quote, blocked, onSubmit, submitting, expanded = true, onToggleExpanded,
}) {
  if (!quote) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-gray-500">
          Choose an occasion, a scale and a guest count — the estimate appears here instantly, no waiting for a call back.
        </p>
      </div>
    )
  }

  const lines = quoteLines(quote)
  const collapsible = typeof onToggleExpanded === 'function'

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={collapsible ? onToggleExpanded : undefined}
        disabled={!collapsible}
        className="w-full text-left px-5 py-4 bg-gradient-to-br from-plum-700 to-plum-800 text-white disabled:cursor-default"
      >
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
          {collapsible && (
            <span className="shrink-0 mt-1 flex items-center gap-1 text-[11px] font-bold text-white/70">
              {expanded ? <>Hide <ChevronDown size={14} /></> : <>Breakdown <ChevronUp size={14} /></>}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100 max-h-[46vh] lg:max-h-none overflow-y-auto">
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
      )}

      <div className="px-5 py-4 space-y-3 border-t border-gray-100">
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
    </div>
  )
}
