import { Info, TrendingDown, Receipt, ArrowRight } from 'lucide-react'
import { formatINR } from '../../utils/format'
import { BRAND } from '../../config/sambramo'

/**
 * The running total, beside the choices. Desktop only.
 *
 * ── What this used to be, and why it is smaller now ─────────────────────
 * It was one component doing two jobs: a sticky desktop column AND a phone
 * sheet that covered the page. The phone half is gone — review is its own
 * step now (see ReviewBoard), which is a page rather than a modal and
 * therefore hides nothing. What is left is the job the desktop column was
 * always good at: a number that moves while you work, close enough to the
 * choices that cause and effect are visible in one glance.
 *
 * So this is deliberately a SUMMARY and not the full breakdown. It groups
 * the quote into its four real components — food, décor, everything else,
 * coordination — then shows the arithmetic that turns them into the
 * headline. Every dish name, every unit calculation and every tax slab
 * lives on the review step; printing them twice would mean two places to
 * keep honest and two places to get it wrong.
 *
 * The headline stays a RANGE. Sambramo has no signed caterer behind this
 * catalogue yet, and a number stated to the rupee implies a rate card that
 * does not exist. See utils/quote.js.
 */
export default function QuotePanel({
  quote, savings, blocked, primaryLabel, onPrimary, primaryDisabled, footnote,
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

  const groups = [
    quote.cuisine && {
      key: 'food',
      label: 'Food',
      detail: `${quote.cuisine.name} · ₹${quote.plate.perPlate}/plate × ${quote.guests}`,
      amount: quote.catering.total,
    },
    quote.decor.level && quote.decor.level.id !== 'none' && {
      key: 'decor',
      label: 'Décor',
      detail: quote.decor.level.name,
      amount: quote.decor.total,
    },
    quote.services.length > 0 && {
      key: 'services',
      label: 'Everything else',
      detail: `${quote.services.length} service${quote.services.length === 1 ? '' : 's'}`,
      amount: quote.servicesTotal,
    },
    {
      key: 'coordination',
      label: 'Coordination',
      detail: quote.tier.name,
      amount: quote.coordination,
    },
  ].filter(Boolean)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-br from-plum-700 to-plum-800 text-white">
        <p className="text-[11px] uppercase tracking-wider text-ink-mute font-semibold">
          Estimated total · incl. taxes
        </p>
        <p className="text-2xl font-extrabold mt-0.5 leading-tight">
          {formatINR(quote.range.low)}
          <span className="text-ink-mute"> – </span>
          {formatINR(quote.range.high)}
        </p>
        <p className="text-xs text-ink-soft mt-1">
          About {formatINR(quote.perGuest)} per guest · {quote.tier.name} · {quote.guests} guests
        </p>
      </div>

      {/* ── What booking it together is worth ────────────────────────────
          Sat inside the breakdown as "Booked together (10%)" and nowhere
          else, which is a rate next to a line item — the last place anybody
          reads a benefit. It is now stated in rupees, directly under the
          headline, because ₹18,400 is an argument and 10% is a footnote.

          The wording turns on `active`, which is the whole reason lib/savings
          returns that flag: on the single-service door this same number is
          money the customer *would* get, and calling it a saving they have
          would be claiming a discount that is not on their quote. */}
      {savings && (
        <div className={`flex items-start gap-2.5 px-5 py-3 border-b ${
          savings.active
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-amber-50 border-amber-100'
        }`}>
          <TrendingDown
            size={15}
            className={`mt-0.5 shrink-0 ${savings.active ? 'text-emerald-600' : 'text-amber-600'}`}
          />
          <div className="min-w-0">
            <p className={`text-[13px] font-extrabold leading-tight ${
              savings.active ? 'text-emerald-800' : 'text-amber-900'
            }`}>
              {savings.active
                ? `You're saving ${formatINR(savings.total)}`
                : `Book it together and save ${formatINR(savings.total)}`}
            </p>
            <p className={`mt-0.5 text-[11px] leading-relaxed ${
              savings.active ? 'text-emerald-700/90' : 'text-amber-800/90'
            }`}>
              {savings.active
                ? <>Against {formatINR(savings.separately)} for the same pieces booked one at a time — about {formatINR(savings.perGuest)} a guest.</>
                : <>One coordinator, one negotiation, one delivery window instead of several.</>}
            </p>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {groups.map(g => (
          <div key={g.key} className="flex items-start justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">{g.label}</p>
              <p className="text-xs text-gray-500 truncate">{g.detail}</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(g.amount)}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
        <Line label="Subtotal" value={quote.subtotal} strong />
        {quote.bundle.applied && (
          <Line
            label={
              <span className="inline-flex items-center gap-1 text-green-700">
                <TrendingDown size={12} /> Booked together ({Math.round(quote.bundle.rate * 100)}%)
              </span>
            }
            value={-quote.bundle.amount}
            tone="green"
          />
        )}
        <Line label={`Platform fee ${Math.round(quote.platformFee.rate * 100)}%`} value={quote.platformFee.amount} />
        {quote.tax.parts.map(part => (
          <Line
            key={part.key}
            label={
              <span className="inline-flex items-center gap-1">
                <Receipt size={12} className="text-gray-500" />
                {part.label} @ {Math.round(part.rate * 100)}%
              </span>
            }
            value={part.amount}
          />
        ))}
      </div>

      <div className="px-5 py-4 space-y-3 border-t border-gray-100">
        <p className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />
          <span>
            <strong className="text-gray-700">An estimate, not a final quote.</strong>{' '}
            Built from current {BRAND.pilotCities.join(' and ')} market rates. A coordinator confirms availability and
            sends a final figure to approve — nothing is booked until you do.
          </span>
        </p>

        {blocked && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            {blocked.message}
          </p>
        )}

        {onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="w-full min-h-[52px] rounded-xl bg-saffron-500 text-ink font-bold text-base flex items-center justify-center gap-1.5 active:bg-saffron-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {primaryLabel} <ArrowRight size={17} />
          </button>
        )}

        {footnote && <p className="text-[11px] text-center text-gray-500">{footnote}</p>}
      </div>
    </div>
  )
}

function Line({ label, value, strong, tone }) {
  const negative = value < 0
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`min-w-0 text-xs ${strong ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{label}</span>
      <span className={`shrink-0 text-xs font-bold ${tone === 'green' ? 'text-green-700' : 'text-gray-800'}`}>
        {negative ? '−' : ''}{formatINR(Math.abs(value))}
      </span>
    </div>
  )
}
