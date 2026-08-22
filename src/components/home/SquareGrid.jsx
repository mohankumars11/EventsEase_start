import { Link } from 'react-router-dom'
import RemoteImage from '../common/RemoteImage'
import PhotoDeck from '../common/PhotoDeck'

/**
 * The square photo tile, and the grid it lives in.
 *
 * Two rules the whole page obeys, carried over from the storefront these
 * were written for — they were the best thing about it and they are just as
 * true of an occasion grid:
 *
 * **The ground is pure white and nothing tints it.** Colour appears only
 * inside a tile. A page that alternates background panels reads as a stack
 * of unrelated widgets, and it makes the photographs compete with their own
 * backing.
 *
 * **A tile is square and its name sits underneath it.** Not over the photo.
 * A caption laid over an image is legible only if the image cooperates,
 * which across a catalogue of supplier photographs it does not; a scrim dark
 * enough to fix that hides the subject. Underneath, every label in a row
 * shares a baseline, long names wrap instead of truncating, and the photo is
 * never covered.
 *
 * These lived in components/gifting/GiftSections with the storefront's other
 * furniture. HomeScreen renders the occasion grid with them, so they outlived
 * the shop; the rest of that file went with it.
 */

/** The nine tile palettes. `bg` backs the photo, `ink` sets the sub-label. */
export const TILE_COLOURS = {
  blush:   { bg: '#FBD9D3', ink: '#7A2E22' },
  coral:   { bg: '#F9A98C', ink: '#7C2D12' },
  amber:   { bg: '#F7D774', ink: '#78350F' },
  sky:     { bg: '#C3DCF2', ink: '#1E3A5F' },
  mint:    { bg: '#BFE3CB', ink: '#14532D' },
  lilac:   { bg: '#DCD0F5', ink: '#4C1D95' },
  sand:    { bg: '#EFE0C9', ink: '#6B4423' },
  rose:    { bg: '#F6C6D9', ink: '#831843' },
  sage:    { bg: '#D6E3C3', ink: '#3F5B21' },
}

/** Resolve a palette token to its `{ bg, ink }` pair, with a safe default. */
const paletteOf = key => TILE_COLOURS[key] ?? TILE_COLOURS.sand

export function SquareGrid({ items, cols = 3, className = '' }) {
  if (!items?.length) return null
  const grid = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <div className={`grid ${grid} gap-x-3 gap-y-4 px-4 ${className}`}>
      {items.map((t, i) => {
        const { bg, ink } = paletteOf(t.colour)
        // An item carrying several photographs gets the deck; one photograph
        // stays a still. The stagger is derived from the position rather than
        // stored, so a grid of any length still deals out of step.
        const deck = Array.isArray(t.photos) ? t.photos.filter(Boolean) : []

        return (
          <Link key={t.id} to={t.to} className="group flex flex-col">
            <span className="relative block aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-hairline/[0.06] transition-transform duration-200 active:scale-95">
              {deck.length > 1 ? (
                <PhotoDeck
                  photos={deck}
                  emoji={t.emoji}
                  alt={t.label}
                  tint={bg}
                  stagger={i * 430}
                  className="h-full w-full rounded-2xl"
                />
              ) : (
                <span className="block h-full w-full" style={{ backgroundColor: bg }}>
                  {t.photo || deck[0] || t.query ? (
                    <RemoteImage
                      src={t.photo ?? deck[0]}
                      query={(t.photo ?? deck[0]) ? undefined : t.query}
                      emoji={t.emoji}
                      alt=""
                      className="!bg-transparent h-full w-full"
                      cinematic
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[32px]">{t.emoji}</span>
                  )}
                </span>
              )}
            </span>

            <span className="mt-2 block text-center text-[11.5px] font-bold leading-tight text-ink">
              {t.label}
            </span>
            {t.meta && (
              <span
                className="mt-0.5 block text-center text-[10px] font-extrabold leading-tight"
                style={{ color: ink }}
              >
                {t.meta}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
