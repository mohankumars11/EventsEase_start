import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The hero deck — the panel at the top of home that keeps changing.
 *
 * The reference for this shape is the promo banner every delivery app runs
 * above the fold, and the reason they all run one is that a home screen has
 * exactly one piece of prime real estate and more than one thing worth
 * putting in it. A static hero picks a winner forever; this one rotates
 * through the three that are actually live right now — plan a celebration,
 * the festival that is closest, the best coupon the checkout will honour.
 *
 * Rules it follows so it doesn't become the thing people scroll past:
 *   — Slides are passed in, never invented here. A caller that has no
 *     festival within range or no live coupon passes two slides and the deck
 *     shows two.
 *   — It stops advancing the moment it is touched. Swiping back to a slide
 *     the deck then pulls away from is the classic carousel injury.
 *   — Under reduced motion it does not auto-advance at all; the dots still
 *     work, so nothing is unreachable.
 */
export default function PromoDeck({ slides = [], interval = 5000 }) {
  const items = slides.filter(Boolean)
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const touch = useRef(null)

  useEffect(() => {
    if (reduced || held || items.length < 2) return
    const id = setInterval(() => setI(n => (n + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [reduced, held, items.length, interval])

  if (items.length === 0) return null
  const slide = items[i % items.length]

  // Swipe, because a deck on a phone that only responds to dots is a deck
  // most people never reach slide two of.
  function onTouchStart(e) { touch.current = e.touches[0].clientX; setHeld(true) }
  function onTouchEnd(e) {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (Math.abs(dx) > 45) {
      setI(n => (n + (dx < 0 ? 1 : -1) + items.length) % items.length)
    }
    touch.current = null
  }

  return (
    <div className="px-4">
      <div
        className="relative overflow-hidden rounded-3xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
      >
        <Link
          key={slide.key}
          to={slide.to}
          className="animate-fade-in block"
          style={{ background: slide.background }}
        >
          <div className="relative flex min-h-[142px] items-center gap-3 px-5 py-5">
            {/* The art is a big soft emoji rather than a photograph: this deck
                changes every five seconds and a stock photo that swaps that
                often reads as a slideshow of adverts. */}
            <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 text-[104px] leading-none opacity-25 blur-[0.5px]">
              {slide.art}
            </span>

            <div className="relative min-w-0 flex-1">
              {slide.eyebrow && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                  {slide.eyebrow}
                </span>
              )}
              <p className="mt-2 font-serif text-[26px] font-extrabold leading-[1.05] text-white drop-shadow-sm">
                {slide.title}
              </p>
              <p className="mt-1.5 max-w-[85%] text-[12px] font-medium leading-snug text-white/80">
                {slide.body}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-extrabold text-plum-900 shadow-sm">
                {slide.cta} <ArrowRight size={13} strokeWidth={3} />
              </span>
            </div>
          </div>
        </Link>

        {items.length > 1 && (
          <div className="pointer-events-auto absolute bottom-3 right-4 flex items-center gap-1.5">
            {items.map((s, n) => (
              <button
                key={s.key}
                onClick={() => { setI(n); setHeld(true) }}
                aria-label={`Show slide ${n + 1}: ${s.title}`}
                aria-current={n === i}
                className={`h-1.5 rounded-full transition-all ${
                  n === i ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
