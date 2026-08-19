import { Link } from 'react-router-dom'
import { festivalTag } from '../../data/giftingHome'

/**
 * The storefront strip, directly under the search field.
 *
 * These are not categories — the circle row below does categories. Each pill
 * is a different *proposition*, i.e. a different reason to be in this app at
 * all: buy a thing, book a whole celebration, hire one service, or browse the
 * craft shelf that is the reason to choose Sambramo over a national gifting
 * app. Somebody arriving for a ₹499 bouquet and somebody arriving for a
 * ₹4,00,000 wedding both land on this screen, and this row is where the
 * screen forks for them, above the fold, before either has scrolled.
 *
 * ── Why each pill looks different ───────────────────────────────────────
 * Deliberately, and it is the one place in the app where that is allowed. A
 * row of six identically-styled chips is read as one control with six
 * settings — a filter. These are six doors to six different rooms, and giving
 * each its own weight and colour is what stops the row being scanned as a
 * filter bar and skipped. The variation is bounded: every pill draws from the
 * same brand palette, and only `accent` decides which.
 *
 * The `tag` is live where it can be — Heritage carries a standing NEW because
 * the shelf genuinely opened this month, and anything with a festival behind
 * it gets its date from `festivalTag`, which expires on its own.
 */

/* Each accent is [background, ink]. All six are brand tokens; none is
   invented at the call site, which is what keeps the row from drifting into
   six unrelated pinks the next time an entry is added. */
const ACCENT = {
  plum:    ['#F0E7FF', '#5B21B6'],
  saffron: ['#FFF0CC', '#92400E'],
  chilli:  ['#FFE1E1', '#9B1A2A'],
  sage:    ['#E4EFD4', '#3F5B21'],
  sand:    ['#F3E7D6', '#6B4423'],
}

export default function StorefrontPillRail({ items }) {
  if (!items?.length) return null

  return (
    <nav aria-label="Ways to shop">
      <ul className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-1">
        {items.map(item => {
          const [bg, ink] = ACCENT[item.accent] ?? ACCENT.plum
          const tag = item.tag ?? festivalTag(item.occasion)

          return (
            <li key={item.id} className="shrink-0">
              <Link
                to={item.to}
                className="relative flex h-9 items-center rounded-xl px-3.5 transition-transform duration-200 active:scale-95"
                style={{ backgroundColor: bg, boxShadow: `inset 0 0 0 1px ${ink}1F` }}
              >
                <span
                  className={`whitespace-nowrap text-[12.5px] leading-none ${
                    item.weight === 'display'
                      ? 'font-black uppercase tracking-[0.14em]'
                      : 'font-extrabold tracking-tight'
                  }`}
                  style={{ color: ink }}
                >
                  {item.label}
                </span>

                {tag && (
                  <span className="pointer-events-none absolute -right-1 -top-1.5 rounded-full bg-chilli-600 px-1.5 py-[1px] text-[8px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                    {tag}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
