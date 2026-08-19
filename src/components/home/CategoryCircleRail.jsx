import { Link } from 'react-router-dom'
import ProductImage from '../shop/ProductImage'
import { festivalTag, TILE_COLOURS } from '../../data/giftingHome'

/**
 * The category row under the search field — round photo discs, name beneath,
 * and a date tag on anything with a deadline.
 *
 * ── Why circles here and squares everywhere else ────────────────────────
 * The rest of the app is square tiles, and that rule is not being relaxed:
 * a square tile is a *card*, a thing you are being sold, and the photograph
 * inside it is the product. This row is not that. It is the toolbar — seven
 * doors, always in the same order, tapped by position long before they are
 * read. A circle is the right shape for that job precisely because it is not
 * the card shape: it tells the eye "this is navigation, keep going" instead
 * of competing with the occasion grid two sections down for the same glance.
 *
 * ── The date tag ────────────────────────────────────────────────────────
 * It sits ABOVE the disc, overlapping it, rather than under the name. Under
 * the name it would be the third line of a 96px-wide column and would push
 * the row's height by a whole text line for the sake of one entry; above, it
 * costs 6px of the gap that was already there and it lands in the corner the
 * eye arrives at first.
 *
 * It comes from `festivalTag`, which returns null past the date and null
 * beyond three weeks — so this decoration removes itself. Nothing here is a
 * permanent "NEW" sticker.
 */
export default function CategoryCircleRail({ items }) {
  if (!items?.length) return null

  return (
    <nav aria-label="Shop by category">
      {/* No scroll snapping. Snap points are for a carousel, where each stop
          is a thing you are meant to look at; this is a toolbar you scan.
          With `snap-mandatory` the container is entitled to snap to the
          nearest point on its own, and on the shop — where an item can be
          filtered out and the row re-lays out after the counts arrive — it
          did exactly that, opening one circle in from the left with the
          first category already cut off the edge. */}
      <ul className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-1 pt-2">
        {items.map(item => {
          const tag = festivalTag(item.occasion)
          const { bg, ink } = TILE_COLOURS[item.colour] ?? TILE_COLOURS.sand

          return (
            <li key={item.id} className="shrink-0 snap-start">
              <Link
                to={item.to}
                className="group flex w-[68px] flex-col items-center"
              >
                {/* The disc is 64px, which is the smallest a photograph can be
                    and still read as a photograph rather than a colour. The
                    ring is the tile ink at 10% rather than the page hairline:
                    on a saffron disc a neutral hairline reads as a smudge. */}
                <span className="relative block">
                  <span
                    className="block h-16 w-16 overflow-hidden rounded-full transition-transform duration-200 active:scale-90"
                    style={{ backgroundColor: bg, boxShadow: `inset 0 0 0 1px ${ink}1A` }}
                  >
                    <ProductImage
                      src={item.photo}
                      query={item.photo ? undefined : item.query}
                      alt=""
                      className="!bg-transparent h-full w-full"
                      cinematic
                    />
                  </span>

                  {tag && (
                    <span
                      className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-chilli-600 px-1.5 py-[1px] text-[8.5px] font-extrabold uppercase tracking-wide text-white shadow-sm"
                    >
                      {tag}
                    </span>
                  )}
                </span>

                <span className="mt-1.5 block text-center text-[10.5px] font-bold leading-tight text-ink">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
