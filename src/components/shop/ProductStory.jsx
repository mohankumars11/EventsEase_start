import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The slides — the part of a product page that is not a specification.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 * A photograph and a price answer "what is it" and "how much". They do not
 * answer the question somebody actually has, which is what it will be like
 * when it turns up: that it arrives wrapped by hand, that it is bought for the
 * ten seconds after a door opens, that it can be there this evening.
 *
 * Those are three separate beats and they do not fit in a description field.
 * They are slides, they are written per shelf or per product in the Product
 * Studio, and they are the reason this shop reads differently from the four
 * other apps selling the same cake.
 *
 * ── Why it scrolls rather than auto-plays ────────────────────────────────
 * Deliberately the opposite choice from `ProductGallery` above it. A gallery
 * advances by itself because photographs are glanced at; a slide has to be
 * *read*, and text that slides away mid-sentence is the most reliably hated
 * pattern on the web. So this moves only when the reader moves it — a native
 * scroll-snap strip, which is also what makes it work by thumb on a phone
 * without a single event handler.
 */

const ACCENTS = {
  saffron: {
    card: 'from-saffron-50 to-white border-saffron-200',
    kicker: 'text-saffron-700',
    glow: 'bg-saffron-200/50',
  },
  plum: {
    card: 'from-plum-50 to-white border-plum-200',
    kicker: 'text-plum-700',
    glow: 'bg-plum-200/50',
  },
  emerald: {
    card: 'from-emerald-50 to-white border-emerald-200',
    kicker: 'text-emerald-700',
    glow: 'bg-emerald-200/50',
  },
  rose: {
    card: 'from-rose-50 to-white border-rose-200',
    kicker: 'text-rose-700',
    glow: 'bg-rose-200/50',
  },
  ink: {
    card: 'from-gray-100 to-white border-gray-200',
    kicker: 'text-gray-600',
    glow: 'bg-gray-200/50',
  },
}

export default function ProductStory({ slides = [], productName }) {
  const strip = useRef(null)
  const [at, setAt] = useState(0)

  // Which card is centred, read off the scroll position rather than tracked in
  // state — the strip is a real scroll container, so the browser owns the
  // position and this only mirrors it for the dots.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const onScroll = () => {
      const card = el.firstElementChild?.getBoundingClientRect().width ?? 1
      setAt(Math.round(el.scrollLeft / (card + 12)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!slides.length) return null

  function nudge(direction) {
    const el = strip.current
    if (!el) return
    const card = el.firstElementChild?.getBoundingClientRect().width ?? 300
    el.scrollBy({ left: direction * (card + 12), behavior: 'smooth' })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-extrabold text-plum-950">Why this one</h2>
          <p className="text-xs text-gray-500">
            What it is actually like to send {productName ? `“${productName}”` : 'this'}.
          </p>
        </div>
        {slides.length > 1 && (
          <div className="hidden gap-1 sm:flex">
            <StripArrow onClick={() => nudge(-1)} dir="left"  disabled={at === 0} />
            <StripArrow onClick={() => nudge(1)}  dir="right" disabled={at >= slides.length - 1} />
          </div>
        )}
      </div>

      <div
        ref={strip}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((s, i) => {
          const tone = ACCENTS[s.accent] ?? ACCENTS.saffron
          return (
            <article
              key={s.id ?? i}
              className={`relative w-[78vw] max-w-sm shrink-0 snap-center overflow-hidden rounded-3xl border bg-gradient-to-br p-5 sm:w-72 ${tone.card}`}
            >
              {/* A soft bloom behind the icon so a card with no photograph is
                  still a designed object rather than a text box. */}
              <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${tone.glow}`} />

              {s.image_url && (
                <div className="mb-3 -mx-1 aspect-[4/3] overflow-hidden rounded-2xl">
                  <img src={s.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="relative">
                <span className="text-2xl">{s.icon ?? '✨'}</span>
                {s.kicker && (
                  <p className={`mt-2 text-[10px] font-extrabold uppercase tracking-wider ${tone.kicker}`}>
                    {s.kicker}
                  </p>
                )}
                <h3 className="mt-1 text-lg font-extrabold leading-snug text-plum-950">{s.title}</h3>
                {s.body && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 sm:hidden">
          {slides.map((s, i) => (
            <span
              key={s.id ?? i}
              className={`h-1.5 rounded-full transition-all ${
                i === at ? 'w-5 bg-plum-600' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function StripArrow({ onClick, dir, disabled }) {
  const Icon = dir === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous' : 'Next'}
      className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-plum-800 transition-colors hover:border-plum-300 disabled:opacity-30"
    >
      <Icon size={16} />
    </button>
  )
}
