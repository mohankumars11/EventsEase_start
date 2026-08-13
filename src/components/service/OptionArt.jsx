import { useState } from 'react'

/**
 * The picture on a card: a photograph where we have one, drawn art where we
 * do not — and the drawn art underneath either way.
 *
 * ── Why the gradient still exists ───────────────────────────────────────
 * Every decoration setup, cuisine and package now has a committed, distinct,
 * deduplicated photograph (see scripts/resolve-service-photos.mjs). The
 * gradient is no longer the picture; it is what the picture loads *over*.
 *
 * That matters more than it sounds on the grid this renders. /service/decor
 * shows 89 cards, and 89 remote images on a phone means a screen of grey
 * rectangles filling in one by one for a second or two. Painting each card's
 * own palette first means the grid is legible and correctly colour-coded from
 * the first frame, the photo fades in over it, and a photo that never arrives
 * — flaky network, a dead URL, an item the resolver has not reached yet —
 * degrades to something deliberate rather than to a broken-image icon.
 *
 * ── What the photographs are ────────────────────────────────────────────
 * Licensed stock photographs of similar work, never photographs of anything
 * Sambramo has delivered. `source` is carried through to ImageSourceBadge so
 * the card says so, in the same words the product tiles use. A customer must
 * never be able to mistake a reference photo for a portfolio.
 */
export default function OptionArt({
  tint, emoji, height = 96, seed = 0, photo, alt, children,
}) {
  const [from, to] = tint ?? ['#7c3aed', '#f59e0b']
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const showPhoto = !!photo?.url && !failed

  // Two lights, placed from the seed so a row of cards does not repeat. Kept
  // inside the middle of the box: a light at the very edge reads as a
  // rendering error rather than as depth.
  const x1 = 18 + ((seed * 37) % 55)
  const y1 = 12 + ((seed * 23) % 40)
  const x2 = 55 + ((seed * 17) % 35)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height,
        backgroundImage: `
          radial-gradient(58% 70% at ${x1}% ${y1}%, rgba(255,255,255,0.34) 0%, transparent 62%),
          radial-gradient(46% 58% at ${x2}% 96%, rgba(0,0,0,0.24) 0%, transparent 60%),
          linear-gradient(128deg, ${from} 0%, ${to} 100%)
        `,
      }}
    >
      {/* Texture. A 6px dot lattice at 14% white — visible as a surface,
          invisible as a pattern, and it survives being scaled down to a
          two-column phone grid. */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.6px)',
            backgroundSize: '7px 7px',
          }}
        />
      )}

      {/* The photograph. `loading="lazy"` matters here: this component renders
          89 times on the decoration grid, and eagerly fetching all of them
          would spend a phone's connection on cards eight screens down. */}
      {showPhoto && (
        <img
          src={photo.url}
          alt={alt ?? photo.alt ?? ''}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* The emoji, large, tilted and bled off the bottom-right corner so the
          card has a subject rather than a centred sticker. It steps back once
          a photograph has arrived — the photo is the subject then, and a 54px
          emoji sitting on top of it reads as a sticker slapped on a picture. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute select-none leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-all duration-500 ${
          loaded
            ? 'bottom-1.5 right-2 text-[22px] opacity-95'
            : '-bottom-2 right-1 text-[54px] opacity-90'
        }`}
        style={{ transform: `rotate(${(seed % 5) - 2}deg)` }}
      >
        {emoji}
      </span>

      {/* A soft shelf at the base, so white text on a light tint stays legible
          without darkening the whole picture. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: 'linear-gradient(180deg, transparent, rgba(12,4,22,0.42))' }}
      />

      {children}
    </div>
  )
}
