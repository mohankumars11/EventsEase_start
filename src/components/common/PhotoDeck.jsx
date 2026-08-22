import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * Several real photographs of one celebration, dealt like a stack of prints.
 *
 * ── What this is instead of ──────────────────────────────────────────────
 * The pattern this market uses is a looping line-art animation per category —
 * a little drawn scooter, a drawn bouquet. It is charming and it has one
 * fatal property for a shop: it shows you a drawing of the thing instead of
 * the thing. A customer deciding what to send does not need an illustration
 * of a cake, they need to see four cakes.
 *
 * So the motion here carries photographs, and the gesture is a deal rather
 * than a crossfade. A crossfade between two photos of the same subject reads
 * as the image sharpening, not as a change — the motion is spent and nothing
 * is communicated. A card lifting off a stack says three things at once:
 * something moved, something was underneath, and there is more here than one
 * picture. The two static edges behind the live card make that last point
 * even while the tile is at rest.
 *
 * ── The three things that keep fifteen of these cheap ────────────────────
 *
 * **Two layers, never more.** Only the outgoing and incoming photographs are
 * mounted. A tile with four photos animates two elements, not four, and the
 * rest of the deck is a pair of borders.
 *
 * **Nothing animates off screen.** An IntersectionObserver stops the timer
 * when the tile scrolls away. Without it, fifteen tiles keep dealing while
 * somebody reads the bottom of the page, which on a low-end phone is the
 * difference between a smooth scroll and a stuttering one.
 *
 * **Every tile is on its own clock.** `stagger` offsets the first deal, so
 * the grid never flips as one block — which looks like a glitch rather than
 * like life.
 *
 * Under `prefers-reduced-motion` the deck renders the first photograph and
 * never moves. That is a complete tile, not a degraded one.
 */
export default function PhotoDeck({
  photos = [],
  emoji,
  alt = '',
  /** Milliseconds each photo rests before the next is dealt. */
  interval = 4200,
  /** Delay before this tile's first deal, so a grid does not move as one. */
  stagger = 0,
  /** Tile ground, shown wherever a photograph does not reach. */
  tint,
  className = '',
}) {
  const reduced = useReducedMotion()
  const list = photos.filter(Boolean)

  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState(null)
  const [visible, setVisible] = useState(false)
  const hostRef = useRef(null)

  // Only run while the tile is actually on screen.
  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || !visible || list.length < 2) return

    let intervalId
    const advance = () => setIndex(i => {
      setPrev(i)
      return (i + 1) % list.length
    })
    const startId = setTimeout(() => {
      advance()
      intervalId = setInterval(advance, interval)
    }, stagger)

    return () => { clearTimeout(startId); clearInterval(intervalId) }
  }, [reduced, visible, list.length, interval, stagger])

  if (!list.length) {
    return (
      <span className={`flex items-center justify-center ${className}`} style={{ backgroundColor: tint }}>
        <span className="text-[32px]">{emoji}</span>
      </span>
    )
  }

  const showStack = list.length > 1 && !reduced

  return (
    <span
      ref={hostRef}
      className={`relative block overflow-hidden ${className}`}
      style={{ backgroundColor: tint }}
    >
      {/* The emoji sits underneath everything, so a photograph that 404s
          leaves a composed tile rather than a coloured hole. */}
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[30px] opacity-60">
        {emoji}
      </span>

      {/* The card that is leaving. Keyed by its own index so React replaces
          the element on every deal and the animation restarts — without the
          key it would play once and never again. */}
      {prev !== null && prev !== index && !reduced && (
        <span key={`out-${prev}-${index}`} className="deck-layer deck-out" aria-hidden="true">
          <img src={list[prev]} alt="" className="h-full w-full object-cover" decoding="async" />
        </span>
      )}

      {/* The card on top. */}
      <span key={`in-${index}`} className={`deck-layer ${reduced ? '' : 'deck-in'}`}>
        <img
          src={list[index]}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover ${reduced ? '' : 'deck-drift'}`}
        />
      </span>

      {/* The rest of the stack, as two static edges tucked under the live
          card's bottom-right. This is the part that tells you there is more
          than one photograph before any motion has happened. */}
      {showStack && (
        <>
          <span
            aria-hidden="true"
            className="deck-edge"
            style={{ boxShadow: 'inset -3px -3px 0 -1px rgba(255,255,255,0.55)' }}
          />
          <span
            aria-hidden="true"
            className="deck-edge"
            style={{ boxShadow: 'inset -6px -6px 0 -2px rgba(255,255,255,0.30)' }}
          />
        </>
      )}

      {/* How many are in this deck, and which one you are looking at. Four
          two-pixel ticks, not a caption — it answers "is this still going?"
          at a glance and costs no reading. */}
      {showStack && (
        <span aria-hidden="true" className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                i === index ? 'w-3 bg-white' : 'w-[3px] bg-white/55'
              }`}
            />
          ))}
        </span>
      )}
    </span>
  )
}
