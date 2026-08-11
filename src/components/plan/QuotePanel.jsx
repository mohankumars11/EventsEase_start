import { Info, TrendingDown } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { quoteLines } from '../../utils/quote'
import { BRAND } from '../../config/sambramo'

/**
 * The number, and every line that made it.
 *
 * Two decisions here are the whole reason this panel is worth building:
 *
 *   The headline is a RANGE, not a figure to the rupee. Sambramo is
 *   pre-launch with no signed caterer or decorator; a number stated exactly
 *   implies a rate card that does not exist yet, and the first time a real
 *   quote came back ₹4,000 higher the customer would be right to be angry.
 *   The brief this was built from is correct that "contact us for pricing"
 *   kills conversion — a range does not.
 *
 *   The platform fee is a LINE, not a markup hidden in the plate rate. The
 *   pitch is that we negotiate and coordinate on the customer's behalf; a fee
 *   buried inside the food price makes that pitch a lie the first time
 *   somebody rings a caterer directly to compare.
 */
export default function QuotePanel({ quote, blocked, onSubmit, submitting, compact = false }) {
  if (!quote) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-gray-500">
          Choose a scale and a guest count and the estimate appears here — instantly, no waiting for a call back.
        </p>
      </div>
    )
  }

  const lines = quoteLines(quote)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-5 bg-gradient-to-br from-plum-700 to-plum-800 text-white">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Estimated total</p>
        <p className="text-2xl sm:text-3xl font-extrabold mt-0.5">
          {formatINR(quote.range.low)} – {formatINR(quote.range.high)}
        </p>
        <p className="text-xs text-white/70 mt-1">
          About {formatINR(quote.perGuest)} per guest · {quote.tier.name} · {quote.guests} guests
        </p>
      </div>

      {!compact && (
        <div className="divide-y divide-gray-100">
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
                  {Math.round(quote.bundle.rate * 100)}% off for booking food, decor and coordination together
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
        </div>
      )}

      <div className="px-5 py-4 space-y-3 border-t border-gray-100">
        <p className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            An estimate for {BRAND.pilotCities.join(' and ')}, built from current market rates — not a locked quote.
            A coordinator confirms availability, venue access and the final number with you before anything is booked,
            and you approve it first. Taxes extra where they apply.
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
          className="w-full py-3.5 rounded-xl bg-saffron-500 text-white font-bold hover:bg-saffron-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Send this to a coordinator →'}
        </button>
        <p className="text-[11px] text-center text-gray-400">
          Free to send. No payment now, no obligation.
        </p>
      </div>
    </div>
  )
}
