import { useState, useEffect } from 'react'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

// Real product photo, with a graceful emoji-tile fallback while loading
// or if no image is available — never a broken image or blank space.
//
// Pass `src` when a URL is already known (products.image_url, resolved
// per product by scripts/resolve-product-images.mjs — see migration 024)
// to render it directly with zero network calls. Falls back to a live
// per-instance Unsplash search via `query` only when `src` isn't provided
// — fine for a handful of images, but doesn't scale to a page rendering
// dozens of products at once (each would fire its own live search).
//
// ── On the motion ──────────────────────────────────────────────────────
// The emoji tile is always mounted underneath and the photo fades in on
// top of it. That ordering is the point: the tile is never a "loading
// state" that gets swapped out, so there is no blank frame, no layout
// shift, and a failed image just leaves the tile showing.
//
//   cinematic  slow zoom while the parent card is hovered. Requires the
//              parent to carry Tailwind's `group` class.
//   drift      always-on Ken Burns push-in (see .ken-burns in index.css).
//              For the detail hero only — a grid of drifting thumbnails
//              is a nightmare, not a shop.
//   priority   eager + high fetch priority. Above-the-fold heroes only;
//              setting it on grid cards defeats lazy loading.
//
// Every zoom is disabled under `prefers-reduced-motion: reduce` via the
// `.product-photo` / `.ken-burns` rules in index.css. The opacity fade
// survives, because removing it would reintroduce the blank-frame flash.
export default function ProductImage({
  src,
  query,
  emoji,
  alt = '',
  className = '',
  cinematic = false,
  drift = false,
  scrim = false,
  priority = false,
  children,
}) {
  const [photo, setPhoto] = useState(null)
  const [done, setDone]   = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (src) return
    let cancelled = false
    setPhoto(null)
    setDone(false)
    fetchUnsplashPhoto(query).then(p => {
      if (cancelled) return
      setPhoto(p)
      setDone(true)
    })
    return () => { cancelled = true }
  }, [src, query])

  const url     = src || photo?.url || null
  const altText = alt || photo?.alt || ''

  return (
    <div className={`relative overflow-hidden bg-gray-50 ${className}`}>
      {/* Emoji tile — always present, revealed wherever a photo isn't. */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className={done || url ? 'opacity-100' : 'opacity-40 animate-pulse'}>
          <span className="text-4xl">{emoji}</span>
        </span>
      </div>

      {url && (
        <img
          src={url}
          alt={altText}
          onLoad={() => setLoaded(true)}
          // An image that 404s stays at opacity-0, leaving the emoji tile
          // visible — the "never a broken image" guarantee, preserved.
          onError={() => setLoaded(false)}
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={[
            'product-photo absolute inset-0 h-full w-full object-cover',
            'transition-[opacity,transform] duration-700 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
            loaded ? 'scale-100' : 'scale-105',
            cinematic && loaded ? 'group-hover:scale-[1.08]' : '',
            drift && loaded ? 'ken-burns' : '',
          ].filter(Boolean).join(' ')}
        />
      )}

      {/* Scrim for anything overlaid on the photo (badges, captions). */}
      {scrim && url && (
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}

      {children}
    </div>
  )
}
