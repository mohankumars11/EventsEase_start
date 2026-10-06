import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ImageSourceBadge from './ImageSourceBadge'

/**
 * Several photographs of one thing, swiped through.
 *
 * ── Why a scroller and not a fading stack ─────────────────────────────────
 * `RotatingPhoto` on the home screen cross-fades frames on a timer, and that is
 * right there: those are decorative tiles nobody is inspecting, and a timer
 * shows you the range without asking for a gesture.
 *
 * This is the opposite job. When somebody has opened a specific decor setup or
 * a specific saree, the photographs are the thing they came to study, and a
 * timer becomes actively hostile — the frame you were looking at leaves while
 * you are looking at it. So this is driven by the customer only: a native
 * horizontal scroller with CSS snap points, which on a phone is the one
 * interaction that needs no JavaScript to feel right and cannot fight the
 * browser's own momentum.
 *
 * `scroll-snap-type: x mandatory` plus one full-width child per frame is the
 * whole mechanism. The dots and arrows are reporting on it, not driving it.
 *
 * ── The count is stated, not implied ──────────────────────────────────────
 * A "1 / 6" pill in the corner, and it is there because a snap scroller with no
 * affordance is invisible — this codebase has already been through that with the
 * occasion rail on Home, where eleven of fifteen items sat behind a swipe most
 * people never made. Dots alone say "there is more" only once you have noticed
 * them; a number says how much more before you have touched anything.
 *
 * With one photograph there are no dots, no arrows and no counter. A slider
 * advertising a single frame is a control that lies about what it holds.
 *
 * ── Every frame keeps its own provenance ──────────────────────────────────
 * `source` is per-frame, not per-item, because a genuinely mixed gallery is the
 * normal case here: an admin photographs the real setup and leaves the three
 * resolver-assigned lookalikes in place behind it. The badge therefore has to
 * change as you swipe, or frame one truthfully says "Actual setup photo" and
 * frames two to four inherit a claim nobody made about them. That is the exact
 * failure ImageSourceBadge exists to prevent, so it is tracked per index.
 */
export default function PhotoSlider({
  photos = [],
  alt = '',
  className = '',
  /** 'product' | 'setup' — only changes the 'actual' wording. See the badge. */
  subject = 'product',
  /** Hide the provenance badge where the surrounding card already states it. */
  showBadge = true,
  children,
}) {
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)

  const frames = photos
    .map(p => (typeof p === 'string' ? { url: p } : p))
    .filter(f => f?.url)
  // Same reason RotatingPhoto dedupes: `key={url}` makes a repeat an invalid
  // duplicate React key, and the same photograph twice in a gallery reads as a
  // broken swipe rather than as two angles.
  const unique = [...new Map(frames.map(f => [f.url, f])).values()]

  /* Which frame is showing, derived from the scroll position rather than
     tracked as state the scroller has to be kept in step with. Rounding on
     the rail's own width means it stays correct at any viewport, and mid-drag
     rather than only after the snap settles. */
  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(i => (next === i ? i : Math.max(0, Math.min(unique.length - 1, next))))
  }, [unique.length])

  const goTo = useCallback(i => {
    const el = railRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  // Arrow keys, once the rail has focus. It is a scroller, so the browser
  // already does this — but only when the rail itself is the scroll target,
  // and `tabIndex` is what makes that reachable without a pointer.
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    function onKey(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(index + 1, unique.length - 1)) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(Math.max(index - 1, 0)) }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [index, unique.length, goTo])

  if (unique.length === 0) return null

  const many = unique.length > 1
  const current = unique[index] ?? unique[0]

  return (
    <div className={`relative overflow-hidden bg-plum-100 ${className}`}>
      <div
        ref={railRef}
        onScroll={onScroll}
        tabIndex={many ? 0 : -1}
        role={many ? 'group' : undefined}
        aria-label={many ? `${alt || 'Photographs'} — ${unique.length} photos` : undefined}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide outline-none"
      >
        {unique.map((f, i) => (
          <div key={f.url} className="relative h-full w-full shrink-0 grow-0 basis-full snap-start">
            <img
              src={f.url}
              alt={i === 0 ? alt : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'low'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {showBadge && current.source && (
        <span className="pointer-events-none absolute left-2 top-2">
          <ImageSourceBadge source={current.source} size="sm" subject={subject} />
        </span>
      )}

      {many && (
        <>
          {/* The count. Top-right so it never collides with the badge. */}
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-plum-950/70 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-[2px]">
            {index + 1} / {unique.length}
          </span>

          {/* Arrows are `hidden sm:flex`. On a phone the gesture IS the control
              and a pair of 32px buttons would sit on the photograph a thumb is
              already swiping; on a pointer device there is no gesture, so
              without these a desktop visitor has a scrollbar-less rail and no
              visible way to advance it. */}
          <button
            type="button"
            onClick={() => goTo(Math.max(index - 1, 0))}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-plum-950 shadow-md transition-opacity disabled:opacity-0 sm:flex"
          >
            <ChevronLeft size={16} strokeWidth={2.8} />
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(index + 1, unique.length - 1))}
            disabled={index === unique.length - 1}
            aria-label="Next photo"
            className="absolute right-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-plum-950 shadow-md transition-opacity disabled:opacity-0 sm:flex"
          >
            <ChevronRight size={16} strokeWidth={2.8} />
          </button>

          <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            {unique.map((f, i) => (
              <span
                key={f.url}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-4 bg-white' : 'w-1 bg-white/55'
                }`}
              />
            ))}
          </span>
        </>
      )}

      {children}
    </div>
  )
}
