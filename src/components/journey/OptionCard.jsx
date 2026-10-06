import { Check, Minus, Plus, Star } from 'lucide-react'

/**
 * One choice, as a card you can actually read.
 *
 * ── Why a card and not a row ────────────────────────────────────────────
 * A row can hold a name and a tick. It cannot hold the difference between
 * "one photographer for four hours" and "two shooters for ten, one on candids
 * and one on the traditional coverage families expect" — and that difference
 * is the entire decision. The catalogue already knows it: every pack in
 * `servicePacks.js` carries a blurb, a list of what is delivered, and the
 * honest small print about what is not. Rows threw all of it away and left
 * the customer choosing between two names and two numbers, which is how you
 * get somebody picking the cheap one and being disappointed on the day.
 *
 * ── Why there is no price on it ─────────────────────────────────────────
 * Because a price next to "Half day" and "Full day" makes the decision about
 * money before it has been about the celebration. What is on the card is what
 * you get, and the customer picks on that. The total arrives once, at the
 * end, itemised — and by then every line on it is something they chose for a
 * reason they can still remember.
 *
 * The reason a price here would be actively misleading, not merely early:
 * these are estimates against no signed supplier, and a number shown beside
 * a choice reads as a quote in a way the same number in a labelled estimate
 * does not.
 */
export default function OptionCard({
  emoji,
  name,
  desc,
  includes,
  note,
  selected,
  recommended,
  multi = false,
  onToggle,
  qty,
  qtyLabel,
  onQty,
  qtyMin = 1,
  qtyMax = 99,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] transition-all ${
        selected
          ? 'bg-white shadow-[0_10px_30px_-16px_rgba(42,30,20,0.45)] ring-2 ring-saffron-400'
          : 'bg-white ring-1 ring-hairline/[0.12]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.995]"
      >
        <span
          aria-hidden="true"
          className={`grid h-11 w-11 shrink-0 place-items-center text-[21px] ${
            multi ? 'rounded-xl' : 'rounded-full'
          } ${selected ? 'bg-saffron-400/20' : 'bg-surface-sunk/[0.06]'}`}
        >
          {emoji ?? '•'}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14.5px] font-extrabold leading-snug text-ink">{name}</span>
            {recommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700 ring-1 ring-teal-200">
                <Star size={9} strokeWidth={3} /> Most chosen
              </span>
            )}
          </span>
          {desc && (
            <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-soft">{desc}</span>
          )}

          {/* What you actually get. Two lines when unselected so the card
              stays scannable, all of it once chosen — at which point the
              customer has stopped comparing and started checking. */}
          {includes?.length > 0 && (
            <span className="mt-2 block space-y-1">
              {(selected ? includes : includes.slice(0, 2)).map(line => (
                <span key={line} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-mute">
                  <Check size={11} className="mt-[3px] shrink-0 text-teal-600" strokeWidth={3} />
                  <span>{line}</span>
                </span>
              ))}
              {!selected && includes.length > 2 && (
                <span className="block pl-[18px] text-[11.5px] font-semibold text-ink-mute">
                  +{includes.length - 2} more
                </span>
              )}
            </span>
          )}

          {/* The honest small print — what needs permission, what is not
              included, what changes on the day. On the card rather than in a
              terms page, because this is the sentence that stops a booking
              being renegotiated at the venue. */}
          {note && selected && (
            <span className="mt-2 block rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800 ring-1 ring-amber-100">
              {note}
            </span>
          )}
        </span>

        <span
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center ${
            multi ? 'rounded-md' : 'rounded-full'
          } ${selected ? 'bg-saffron-500 text-white' : 'ring-2 ring-hairline/20'}`}
        >
          {selected && <Check size={14} strokeWidth={3.2} />}
        </span>
      </button>

      {/* How many. Only for the packs that are genuinely countable — guards,
          artists, buses, kilos of cake — and only once the pack is chosen, so
          a stepper never appears next to something nobody has picked. */}
      {selected && onQty && (
        <div className="flex items-center justify-between gap-3 border-t border-hairline/[0.08] bg-surface-sunk/[0.03] px-4 py-2.5">
          <span className="text-[12px] font-bold text-ink-soft">
            How many {qtyLabel ?? 'units'}?
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="One fewer"
              onClick={() => onQty(Math.max(qtyMin, (qty ?? 1) - 1))}
              disabled={(qty ?? 1) <= qtyMin}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-soft ring-1 ring-hairline/15 disabled:opacity-35"
            >
              <Minus size={15} />
            </button>
            <span className="min-w-[2.5rem] text-center text-[15px] font-extrabold tabular-nums text-ink">
              {qty ?? 1}
            </span>
            <button
              type="button"
              aria-label="One more"
              onClick={() => onQty(Math.min(qtyMax, (qty ?? 1) + 1))}
              disabled={(qty ?? 1) >= qtyMax}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-soft ring-1 ring-hairline/15 disabled:opacity-35"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
