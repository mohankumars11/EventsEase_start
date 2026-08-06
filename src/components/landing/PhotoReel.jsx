import { useState, useEffect, useRef } from 'react'

/**
 * A crossfading reel of catalogue photos with a caption that changes with the
 * picture.
 *
 * The fork's cards each showed one still, which answered the wrong question:
 * a photo of a cake says we sell cakes, not that we cover seven kinds of
 * occasion. Rotating the image *and* its label turns each card into a short
 * silent list of the range.
 *
 * Every frame is stacked and cross-faded rather than swapped in a single
 * <img>, because swapping the src leaves a blank frame while the next photo
 * decodes. All of them are in the DOM from the start; only opacity moves.
 */
export default function PhotoReel({
  frames,
  className = '',
  intervalMs = 3200,
  sizes,
  emoji = '🎊',
  tint = 'from-plum-800 to-berry-900',
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  }, [])

  useEffect(() => {
    // A reel that rewrites itself is exactly the motion this setting is for,
    // and a card paused under the pointer should stay on the frame someone
    // stopped to look at.
    if (reduced.current || paused || frames.length < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % frames.length), intervalMs)
    return () => clearInterval(t)
  }, [paused, frames.length, intervalMs])

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${tint} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-4xl opacity-70 select-none"
      >
        {emoji}
      </span>

      {frames.map((frame, i) => (
        <img
          key={frame.src}
          src={frame.src}
          alt={i === index ? frame.label : ''}
          // Only the opening frame is eager. The rest are lazy, so a card that
          // never scrolls into view costs one request instead of seven.
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] motion-reduce:transition-none ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Caption plate. Sits over a gradient rather than the bare photo so it
          stays legible whatever the frame underneath happens to be. */}
      <div className="absolute inset-x-0 bottom-0 pt-10 pb-3 px-4 bg-gradient-to-t from-black/75 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <span
            key={frames[index]?.label}
            className="text-white text-xs sm:text-sm font-semibold tracking-wide animate-fade-in"
          >
            {frames[index]?.label}
          </span>

          {/* Progress pips double as a hint that there is more than one frame,
              which a silent crossfade otherwise hides. */}
          <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
            {frames.map((frame, i) => (
              <span
                key={frame.src}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-4 bg-saffron-400' : 'w-1 bg-white/45'
                }`}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
