import { useState, useEffect } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * Several real photographs of one occasion, cross-fading.
 *
 * A single still of "Baby Shower" tells you we have a stock photo. Four of
 * them — the swing, the pastel arch, the godh bharai, the reveal — tell you we
 * have actually done this, and that is the difference between a card someone
 * scrolls past and a card that makes them picture their own day. That
 * recognition is the whole job of imagery on this screen.
 *
 * ── Why this can exist at all ──────────────────────────────────────────
 * The photos are already resolved and committed: GENERATED_DECOR_PHOTOS holds
 * exactly four per occasion for all fifteen, as static Pexels URLs. So the
 * rotation costs nothing at runtime.
 *
 * Doing the same through ProductImage's `query` prop would not have worked —
 * that fires a live Unsplash search per instance and the app caps those at 24
 * per page load. Fifteen occasions times four frames is sixty searches, so
 * roughly two-thirds of the grid would have quietly fallen back to emoji
 * tiles, and the feature would have looked broken rather than absent.
 *
 * ── The motion ─────────────────────────────────────────────────────────
 * Every frame is stacked and only opacity changes, so the browser composites
 * it and never re-lays-out — fifteen of these on one screen stay smooth.
 *
 * `stagger` offsets each card's first advance. Without it fifteen cards flip
 * in perfect unison, which reads as the page glitching rather than as
 * photographs changing.
 *
 * Frames after the first are lazy and low priority: the first frame is what
 * the customer sees, the rest can arrive whenever. Under
 * prefers-reduced-motion nothing advances and only the first frame renders,
 * which is a complete card rather than a degraded one.
 */
export default function RotatingPhoto({
  photos = [],
  emoji,
  alt = '',
  className = '',
  interval = 3800,
  stagger = 0,
}) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)

  const frames = photos.filter(Boolean)

  useEffect(() => {
    if (reduced || frames.length < 2) return
    let tick
    // The offset runs once, then the interval takes over — so the cards drift
    // apart permanently rather than re-syncing after the first cycle.
    const start = setTimeout(() => {
      setIndex(i => (i + 1) % frames.length)
      tick = setInterval(() => setIndex(i => (i + 1) % frames.length), interval)
    }, stagger + interval)
    return () => { clearTimeout(start); clearInterval(tick) }
  }, [reduced, frames.length, interval, stagger])

  return (
    <span className={`relative block overflow-hidden bg-plum-100 ${className}`}>
      {/* The emoji sits underneath permanently, so a photo that fails to load
          leaves a finished tile instead of a hole. Same contract as
          ProductImage. */}
      {emoji && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-3xl opacity-60"
        >
          {emoji}
        </span>
      )}

      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? alt : ''}
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchpriority={i === 0 ? 'auto' : 'low'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </span>
  )
}
