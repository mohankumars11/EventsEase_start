import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A horizontally-sliding row of cards with scroll-snap (swipe on touch,
 * drag/scroll on desktop) plus a pair of arrow buttons so browsing
 * doesn't require scrolling the page — only this row slides.
 */
export default function SlideCarousel({ children, className = '' }) {
  const scrollRef = useRef(null)

  function slide(dir) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth pb-2"
      >
        {children}
      </div>

      <button
        onClick={() => slide(-1)}
        aria-label="Scroll left"
        className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-plum-700 hover:bg-plum-700 hover:text-white active:scale-95 transition-all z-10"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => slide(1)}
        aria-label="Scroll right"
        className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-500 shadow-lg flex items-center justify-center text-plum-950 hover:scale-110 active:scale-95 transition-transform z-10"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
