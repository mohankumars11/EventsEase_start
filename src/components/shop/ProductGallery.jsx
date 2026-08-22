import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import RemoteImage from '../common/RemoteImage'

/**
 * The photographs and the clip, as one thing that moves.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * One square image. Every product page in the shop showed exactly one
 * photograph, because `products.image_url` is a single column — so the detail
 * of the weave, the box it arrives in, and the fifteen seconds of a hamper
 * being opened had nowhere to go. Migration 051 gives them a table; this is
 * where a customer meets them.
 *
 * ── Why it advances on its own ───────────────────────────────────────────
 * Because most people never touch the arrows. A gallery that waits to be
 * clicked shows its second photo to a small minority of visitors, which makes
 * the effort of taking the second photo mostly wasted. Advancing on its own
 * shows all of them and still lets anyone take over.
 *
 * Four things keep that from being an irritant, and they are the whole design:
 *
 *   · It stops the moment somebody interacts. One tap on a dot, one swipe, one
 *     arrow — the timer is off for good, not for a few seconds. Motion that
 *     fights the person controlling it is worse than no motion.
 *   · It pauses off-screen and while the tab is hidden, so a page left open in
 *     a background tab is not running a timer and repainting forever.
 *   · A video slide never auto-advances. Sliding away from a clip somebody is
 *     watching is the single most annoying thing this component could do.
 *   · Under `prefers-reduced-motion` it does not advance at all and the
 *     transition is a fade rather than a slide — and because freezing on slide
 *     one would silently hide the rest from exactly the people who cannot opt
 *     back in, the thumbnails become the way through.
 *
 * The same rules `DetailRotator` follows for the line inside a card, applied
 * to a bigger surface.
 */

const INTERVAL = 4200

/* ── No badge over the photograph ─────────────────────────────────────────
   An earlier version of this printed a small caption over the image saying
   where it came from — "Representative image", "Illustration". That is gone,
   by the owner's decision: a label stamped across the product shot is the
   first thing a customer's eye lands on, and it undercuts the picture before
   they have even read the name.

   The provenance itself is NOT gone. `product_media.source` still records it
   on every row, the studio still shows it, and the product page still carries
   the plain-English line about representative photos in its body copy where
   it belongs. What changed is that it stopped being a watermark. */

export default function ProductGallery({
  media = [],
  fallbackUrl,
  fallbackSource,
  emoji,
  alt = '',
  query,
}) {
  const reduced = useReducedMotion()

  /**
   * The single tile image is slide one when it is not already in the gallery.
   * Without this, a product whose photo was set before migration 051 — which is
   * every product today — would show an empty gallery on its own detail page.
   */
  const slides = useMemo(() => {
    const list = media.filter(m => m?.url)
    if (fallbackUrl && !list.some(m => m.url === fallbackUrl)) {
      list.unshift({
        id: 'primary',
        kind: 'image',
        url: fallbackUrl,
        source: fallbackSource ?? 'stock',
        alt,
      })
    }
    return list
  }, [media, fallbackUrl, fallbackSource, alt])

  const [i, setI] = useState(0)
  const [taken, setTaken] = useState(false)   // has a person taken control?
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  const touchX = useRef(null)

  const count = slides.length
  const current = slides[Math.min(i, Math.max(count - 1, 0))]
  const isVideo = current?.kind === 'video'
  const auto = !reduced && !taken && count > 1 && !isVideo

  // Pause off-screen. Same reason DetailRotator does it: a category page with
  // twenty of these should run the timers that are actually being looked at.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!auto || !visible) return
    // A hidden tab still fires intervals in most browsers; this is what stops
    // a page left open all afternoon from advancing three thousand times.
    const tick = () => { if (!document.hidden) setI(n => (n + 1) % count) }
    const id = setInterval(tick, INTERVAL)
    return () => clearInterval(id)
  }, [auto, visible, count])

  function go(next, byPerson = true) {
    if (byPerson) setTaken(true)
    setI(((next % count) + count) % count)
  }

  if (count === 0) {
    return (
      <div className="shop-card aspect-square overflow-hidden">
        <RemoteImage query={query} emoji={emoji} alt={alt} className="h-full w-full" drift priority />
      </div>
    )
  }

  return (
    <div ref={ref} className="space-y-2">
      <div
        className="shop-card relative aspect-square overflow-hidden"
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1)
          touchX.current = null
        }}
      >
        {slides.map((m, n) => (
          <div
            key={m.id ?? n}
            aria-hidden={n !== i}
            className={`absolute inset-0 transition-opacity duration-500 ${n === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {m.kind === 'video' ? (
              <video
                src={m.url}
                poster={m.poster_url ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full bg-black object-cover"
              />
            ) : (
              <img
                src={m.url}
                alt={m.alt || alt}
                loading={n === 0 ? 'eager' : 'lazy'}
                fetchpriority={n === 0 ? 'high' : undefined}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}

        {count > 1 && (
          <>
            <GalleryArrow side="left"  onClick={() => go(i - 1)} />
            <GalleryArrow side="right" onClick={() => go(i + 1)} />

            {/* Dots sit above a scrim rather than on the photo — a white dot on
                a white cake is invisible, and a lot of this shop is white. */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1.5 bg-gradient-to-t from-black/40 to-transparent p-3">
              {slides.map((m, n) => (
                <button
                  key={m.id ?? n}
                  onClick={() => go(n)}
                  aria-label={`Show ${m.kind === 'video' ? 'the clip' : `photo ${n + 1}`}`}
                  aria-current={n === i}
                  className={`h-1.5 rounded-full transition-all ${
                    n === i ? 'w-6 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* The only thing that still sits on the image is the clip marker, and
            that is a control rather than a caption — it tells somebody there
            is something to press. */}
        {isVideo && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-plum-950/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Play size={9} className="fill-white" /> Clip
          </span>
        )}
      </div>

      {current?.caption && (
        <p className="px-1 text-xs leading-relaxed text-gray-500">{current.caption}</p>
      )}

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((m, n) => (
            <button
              key={m.id ?? n}
              onClick={() => go(n)}
              aria-label={`Show ${n + 1} of ${count}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                n === i ? 'border-saffron-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={m.kind === 'video' ? (m.poster_url ?? m.url) : m.url}
                alt="" loading="lazy" className="h-full w-full bg-gray-100 object-cover"
              />
              {m.kind === 'video' && (
                <span className="absolute inset-0 grid place-items-center bg-black/30">
                  <Play size={12} className="fill-white text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GalleryArrow({ side, onClick }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-2' : 'right-2'}
        grid h-9 w-9 place-items-center rounded-full bg-white/85 text-plum-900 shadow-md
        backdrop-blur-sm transition-colors hover:bg-white`}
    >
      <Icon size={18} />
    </button>
  )
}
