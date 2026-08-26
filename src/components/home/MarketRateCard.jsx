import { useState } from 'react'
import { ChevronDown, TrendingDown, TrendingUp, Minus, ShieldCheck } from 'lucide-react'
import { marketNote, marketIndex, COMPONENTS } from '../../data/marketRates'

/**
 * What our prices are actually pegged to, said on the front page.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS PHRASED SO CAREFULLY
 * ══════════════════════════════════════════════════════════════════════
 *
 * The temptation is a card that says "prices update live with the market",
 * because it sounds modern and it sounds fair. It would also be false in a
 * way that is easy to catch. Exactly one input to this app's pricing has a
 * live public feed — Agmarknet mandi rates for the commodities that make up
 * a catering plate. Nothing published anywhere tells us what a decorator
 * charges for drape work in Bengaluru this week.
 *
 * A customer who reads "everything is live" and later notices the
 * photography rate has not moved in a month concludes the whole thing is
 * theatre — and then disbelieves the part that was true. So this card says
 * precisely what moves, precisely what does not, and when the number was
 * last read. It is a smaller claim and a durable one.
 *
 * ── And when nothing has been refreshed ─────────────────────────────────
 * It does not hide. `marketNote()` returns a baseline state that says we
 * price at published researched rates and a coordinator confirms against
 * live vendor quotes — which is exactly what happens, and is a perfectly
 * good thing to tell somebody. The dishonest option would be rendering a
 * "live" badge over a static file.
 */
export default function MarketRateCard() {
  const [open, setOpen] = useState(false)
  const note = marketNote()
  const index = marketIndex()

  const move = index.live ? Math.round((index.multipliers.provisions - 1) * 100) : 0
  const Trend = move > 0 ? TrendingUp : move < 0 ? TrendingDown : Minus
  const trendTone = move > 0 ? 'text-amber-700' : move < 0 ? 'text-teal-700' : 'text-ink-mute'

  return (
    <section className="px-4">
      <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-hairline/[0.12]">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.995]"
        >
          <span
            aria-hidden="true"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              note.tone === 'live' ? 'bg-teal-50' : 'bg-surface-sunk/[0.06]'
            }`}
          >
            {note.tone === 'live'
              ? <Trend size={18} className={trendTone} />
              : <ShieldCheck size={18} className="text-ink-mute" />}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-extrabold leading-snug text-ink">
                {note.headline}
              </span>
              {note.tone === 'live' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700 ring-1 ring-teal-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Live
                </span>
              )}
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft">
              {note.detail}
            </span>
          </span>

          <ChevronDown
            size={17}
            className={`mt-1 shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="border-t border-hairline/[0.08] bg-surface-sunk/[0.02] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
              What moves, and what does not
            </p>
            <ul className="mt-2.5 space-y-2">
              {Object.entries(COMPONENTS).map(([key, c]) => (
                <li key={key} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      c.tracked && index.live ? 'bg-teal-500' : 'bg-hairline/30'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-ink">{c.label}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-mute">{c.source}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-ink-soft">
                    {index.live && c.tracked
                      ? `${index.multipliers[key] >= 1 ? '+' : ''}${Math.round((index.multipliers[key] - 1) * 100)}%`
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>

            {/* The actual commodities, when there are any. A claim about
                grocery prices is only checkable if the basket is visible. */}
            {index.live && index.basket.length > 0 && (
              <>
                <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
                  Today’s basket
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[280px] text-left">
                    <tbody>
                      {index.basket.map(item => (
                        <tr key={item.key} className="border-t border-hairline/[0.06] first:border-0">
                          <td className="py-1.5 pr-3 text-[12px] font-bold text-ink">{item.label}</td>
                          <td className="py-1.5 pr-3 text-[11.5px] tabular-nums text-ink-mute">
                            {item.modal ? `₹${item.modal.toLocaleString('en-IN')}/qtl` : 'no print today'}
                          </td>
                          <td className="py-1.5 text-right text-[11.5px] font-extrabold tabular-nums text-ink-soft">
                            {item.modal ? `${item.ratio >= 1 ? '+' : ''}${Math.round((item.ratio - 1) * 100)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="mt-3.5 text-[11.5px] leading-relaxed text-ink-mute">
              Every figure in this app is an estimate until a coordinator confirms it against a
              live vendor quote. Nothing is booked and nothing is owed on an estimate.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
