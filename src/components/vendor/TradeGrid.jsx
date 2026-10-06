import React, { useMemo } from 'react'
import { Search, X, Check } from 'lucide-react'
import { TRADES, offeringsForTrade } from '../../data/partnerCatalogue'
import SambramoTradePictogram from './SambramoTradePictogram'

/**
 * Every trade, searchable, as the way in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS ITS OWN FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * It was the first screen of AddItemFlow and nothing else could reach it.
 * The Listing tab, which is the screen a partner actually opens, showed a
 * red card with a button that led here — so the twenty-six things this
 * platform can list were two taps and one decision away from somebody who
 * had opened the app specifically to list one.
 *
 * The grid IS the screen now, in both places. It serves the full 34-trade catalogue, so the
 * partner sees event and logistics work in one consistent taxonomy. One implementation, so the
 * search that already understands "biryani" cannot drift from the one on
 * the tab.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SEARCH LOOKS INSIDE A TRADE, NOT ONLY AT ITS NAME
 * ══════════════════════════════════════════════════════════════════════
 *
 * Somebody who runs a generator business does not think of themselves as
 * "Power & Cooling", and somebody who cooks does not search for
 * "Catering & Food". So typing "generator" or "biryani" finds the card
 * without knowing our word for the trade — matching every service inside
 * it as well as the trade's own name.
 */

export const iconForTrade = trade => props => <SambramoTradePictogram trade={trade} {...props} />


/** The trades matching a query, looking inside each one. */
export function tradesMatching(q) {
  const t = String(q ?? '').trim().toLowerCase()
  if (!t) return TRADES
  return TRADES.filter(tr =>
    tr.toLowerCase().includes(t)
    || offeringsForTrade(tr).some(o => o.name.toLowerCase().includes(t)))
}

/**
 * What a trade covers, in the partner's own words — "Floral decoration ·
 * Stage decoration · Mandap setup".
 *
 * Read off the catalogue rather than written by hand. A hand-written
 * line per trade is twenty-six sentences that start out true and drift
 * the first time somebody adds an offering, and drift silently.
 */
export function scanForTrade(trade, max = 3) {
  const names = offeringsForTrade(trade).map(o => o.name)
  if (!names.length) return null
  const head = names.slice(0, max).join(' · ')
  return names.length > max ? `${head} · +${names.length - max} more` : head
}

export default function TradeGrid({
  q, setQ, value = null, onPick,
  /* The tab wants a heading above the search; the flow already has one in
     its own header and would be saying it twice. */
  heading = null,
  placeholder = 'Search — catering, generator, mehendi…',
  /* ── Two layouts, one list ──────────────────────────────────────────
     'grid'  two compact cards a row. The Listing tab and the add flow,
             where a partner is picking ONE trade to work on now.
     'rows'  one full-width row each, with what the trade covers under
             the name. Setup, where somebody is deciding what their
             business IS and needs to read what is inside a trade before
             ticking it — and where a 12px half-width chip is not enough
             to decide on.
     Same search, same matching, same data-trade hook for the guards. */
  layout = 'grid',
  /* Multi-select. `selected` is an array of trade names; onPick is
     called with the trade either way, and the caller decides whether
     that means "go there" or "toggle it". */
  selected = null,
  disabledTrades = [],
}) {
  const list = useMemo(() => tradesMatching(q), [q])
  const isOn = t => (selected ? selected.includes(t) : value === t)

  return (
    <>
      {heading}

      {/* ══════════════════════════════════════════════════════════════
          THE SEARCH DOES NOT SCROLL AWAY
          ══════════════════════════════════════════════════════════════

          Thirty-four cards is about nine screens on a 360px phone. The
          search sat at the top of that column, so the moment a partner
          started scrolling to look for their trade the one control that
          would have found it in two letters was gone above the fold —
          and scrolling back up is exactly the thing nobody does.

          Sticky, so it is on screen for the whole length of the list.
          The blur is what keeps it readable while cards pass under it;
          a solid fill would need to know the tab's ground colour and
          would be wrong the moment that changes. */}
      <div className="sticky top-0 z-20 -mx-1 mb-3 bg-white/85 px-1 py-2 backdrop-blur-sm">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="Search every trade and service"
            className="w-full rounded-2xl bg-white py-3 pl-10 pr-9 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
          />
          {/* Clearing a search on a phone otherwise means holding
              backspace over a word somebody typed with one thumb. */}
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink/[0.06] text-ink-mute"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {q && (
          <p className="mt-1.5 pl-1 text-[11px] font-semibold text-ink-mute">
            {list.length} {list.length === 1 ? 'trade' : 'trades'} match “{q}”
          </p>
        )}
      </div>

      {/* ── Smaller cards, so more of the list is on screen ───────────
          A 40px icon block above two lines of text made each card about
          110px tall. The icon is what a partner recognises fastest, so
          it stays — beside the words rather than above them, which is
          the whole saving. Same two columns, roughly half the height,
          and the trade name still gets its own line at a readable
          weight. */}
      {layout === 'rows' ? (
        <ul className="flex flex-col gap-2">
          {list.map(t => {
            const on = isOn(t)
            const already = disabledTrades.includes(t)
            return (
              <li key={t}>
                <button
                  type="button"
                  data-trade={t}
                  aria-pressed={selected ? on : undefined}
                  onClick={() => onPick(t)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition active:scale-[0.99] ${
                    on ? 'bg-forest-50 ring-2 ring-forest-600' : 'bg-white ring-ink/[0.06]'
                  }`}
                >
                  <SambramoTradePictogram trade={t} size="sm" showSparkle={false} title={false} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[14px] font-extrabold leading-tight text-ink">{t}</span>
                      {/* Not a blocker: a partner who already has this
                          trade is taken to it rather than turned away.
                          Saying so on the row means they are not
                          surprised by where the tap lands. */}
                      {already && (
                        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-bold text-ink-mute">
                          Already added
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-ink-mute">
                      {scanForTrade(t)}
                    </span>
                  </span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${
                    on ? 'bg-forest-600 text-white ring-forest-600' : 'bg-white text-transparent ring-ink/15'
                  }`}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
      <div className="grid grid-cols-2 gap-2.5">
        {list.map((t, index) => {
          const n = offeringsForTrade(t).length
          const on = isOn(t)
          const already = disabledTrades.includes(t)
          return (
            <button
              key={t}
              type="button"
              data-trade={t}
              onClick={() => onPick(t)}
              className={`relative flex min-h-[146px] flex-col items-center justify-center rounded-[22px] p-3 text-center ring-1 transition active:scale-[0.98] ${
                on ? 'bg-forest-50 ring-2 ring-forest-600' : 'bg-white ring-ink/[0.07]'
              }`}
            >
              <span className="absolute left-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-plum-50 px-1.5 text-[9px] font-black text-plum-700 ring-1 ring-plum-100">
                {index + 1}
              </span>
              {already && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/[0.06] px-1.5 py-1 text-[8px] font-extrabold text-ink-mute">
                  Added
                </span>
              )}
              <SambramoTradePictogram trade={t} size="md" showSparkle={false} title={false} />
              <span className="mt-2 block w-full text-[12.5px] font-extrabold leading-tight text-ink">
                {t}
              </span>
              <span className="mt-1 block text-[9.5px] leading-tight text-ink-mute">
                {n} {n === 1 ? 'service' : 'services'}
              </span>
            </button>
          )
        })}
      </div>, { useMemo } from 'react'
      )}

      {!list.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          Nothing matches “{q}”. Try a shorter word, or tell us what you do
          and we will add it.
        </p>
      )}
    </>
  )
}
