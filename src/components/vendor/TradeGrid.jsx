import React, { useMemo } from 'react'
import {
  Search, X, UtensilsCrossed, Camera, Video, Flower2, Building2, Music,
  Sparkles, Brush, Hand, Tent, Printer, Truck, Lightbulb, CakeSlice, Mic,
  Speaker, ParkingSquare, Shield, Wine, HandHeart, Zap, HeartPulse, Flame,
  Gift, Package, ClipboardList, PackageOpen,
} from 'lucide-react'
import { TRADES, offeringsForTrade } from '../../data/partnerCatalogue'

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
 * The grid IS the screen now, in both places. One implementation, so the
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

const TRADE_ICON = {
  'Anchor & MC': Mic,
  'Bar & Beverages': Wine,
  'Bridal Makeup & Hair': Brush,
  'Cake & Desserts': CakeSlice,
  'Catering & Food': UtensilsCrossed,
  'DJ & Music': Music,
  'Decoration & Floral': Flower2,
  'Event Lighting': Lightbulb,
  'Gifts & Favours': Gift,
  'Guest Services': HandHeart,
  'Invitation & Printing': Printer,
  'Live Entertainment': Sparkles,
  'Mehendi Artist': Hand,
  'Photography': Camera,
  'Power & Cooling': Zap,
  'Priest & Rituals': Flame,
  'Safety & Facilities': HeartPulse,
  'Security Services': Shield,
  'Sound & AV': Speaker,
  'Tent & Furniture': Tent,
  'Transportation': Truck,
  'Valet Parking': ParkingSquare,
  'Venue': Building2,
  'Videography': Video,
  /* Two trades added later had no icon and fell back to a generic box —
     on a grid where every other card is a picture of the work, that reads
     as "we have not thought about you yet". */
  'Wedding Planning': ClipboardList,
  'Trousseau & Gift Packing': PackageOpen,
}

export const iconForTrade = t => TRADE_ICON[t] ?? Package

/** The trades matching a query, looking inside each one. */
export function tradesMatching(q) {
  const t = String(q ?? '').trim().toLowerCase()
  if (!t) return TRADES
  return TRADES.filter(tr =>
    tr.toLowerCase().includes(t)
    || offeringsForTrade(tr).some(o => o.name.toLowerCase().includes(t)))
}

export default function TradeGrid({
  q, setQ, value = null, onPick,
  /* The tab wants a heading above the search; the flow already has one in
     its own header and would be saying it twice. */
  heading = null,
  placeholder = 'Search — catering, generator, mehendi…',
}) {
  const list = useMemo(() => tradesMatching(q), [q])

  return (
    <>
      {heading}

      {/* ══════════════════════════════════════════════════════════════
          THE SEARCH DOES NOT SCROLL AWAY
          ══════════════════════════════════════════════════════════════

          Twenty-six cards is about nine screens on a 360px phone. The
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
      <div className="grid grid-cols-2 gap-2">
        {list.map(t => {
          const Icon = iconForTrade(t)
          const n = offeringsForTrade(t).length
          const on = value === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left ring-1 transition active:scale-[0.98] ${
                on ? 'bg-forest-50 ring-2 ring-forest-600' : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-plum-950 text-white">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-extrabold leading-tight text-ink">{t}</span>
                <span className="block text-[10.5px] leading-tight text-ink-mute">
                  {n} {n === 1 ? 'thing' : 'things'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {!list.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          Nothing matches “{q}”. Try a shorter word, or tell us what you do
          and we will add it.
        </p>
      )}
    </>
  )
}
