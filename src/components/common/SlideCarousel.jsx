import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A horizontally-sliding row of cards with scroll-snap (swipe on touch,
 * drag/scroll on desktop) plus a pair of arrow buttons so browsing
 * doesn't require scrolling the page — only this row slides.
 *
 * The arrows used to render unconditionally, permanently overlapping the
 * first and last card, giving no feedback at either end and appearing
 * even on rows with two items that don't scroll at all. They now:
 *   - stay hidden entirely when the content fits,
 *   - fade out individually once that end is reached,
 *   - hide on touch widths, where swiping is the natural gesture and the
 *     buttons only cover content.
 */
export default function SlideCarousel({ children, className = '' }) {
  const scrollRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [overflows, setOverflows] = useState(false)

  const sync = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // 2px slack absorbs sub-pixel rounding at the extremes.
    const max = el.scrollWidth - el.clientWidth
    setOverflows(max > 2)
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft >= max - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    // Cards frequently resolve their images after mount, changing the
    // scroll width, so a one-shot measurement on mount isn't enough.
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    Array.from(el.children).forEach(child => ro.observe(child))
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [sync, children])

  function slide(dir) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const arrowBase = 'hidden sm:flex absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center shadow-lg transition-all duration-200 z-10'

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth pb-2"
      >
        {children}
      </div>

      {overflows && (
        <>
          <button
            onClick={() => slide(-1)}
            aria-label="Scroll left"
            disabled={atStart}
            className={`${arrowBase} -left-4 bg-white border border-gray-100 text-plum-700 hover:bg-plum-700 hover:text-white active:scale-95 ${
              atStart ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => slide(1)}
            aria-label="Scroll right"
            disabled={atEnd}
            className={`${arrowBase} -right-4 bg-gradient-to-br from-saffron-400 to-saffron-500 text-plum-950 hover:scale-110 active:scale-95 ${
              atEnd ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  )
}
