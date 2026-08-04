import { useState, useEffect } from 'react'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

// Real product photo, with a graceful emoji-tile fallback while loading
// or if no image is available — never a broken image or blank space.
//
// Pass `src` when a URL is already known (e.g. products.image_url,
// pre-resolved offline — see migration 016/017) to render it directly
// with zero network calls. Falls back to a live per-instance Unsplash
// search via `query` only when `src` isn't provided — fine for a
// handful of images, but doesn't scale to a page rendering dozens of
// products at once (each would fire its own live search).
export default function ProductImage({ src, query, emoji, className = '' }) {
  const [photo, setPhoto] = useState(null)
  const [done, setDone]   = useState(false)

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

  if (src) {
    return <img src={src} alt="" className={`object-cover ${className}`} loading="lazy" />
  }

  if (photo) {
    return <img src={photo.url} alt={photo.alt} className={`object-cover ${className}`} loading="lazy" />
  }

  return (
    <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
      <span className={done ? 'opacity-100' : 'opacity-40 animate-pulse'}>
        <span className="text-4xl">{emoji}</span>
      </span>
    </div>
  )
}
