import { useState, useEffect } from 'react'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

// Real product photo via Unsplash, with a graceful emoji-tile fallback
// while loading or if no key is configured / the fetch fails — never
// a broken image or blank space.
export default function ProductImage({ query, emoji, className = '' }) {
  const [photo, setPhoto] = useState(null)
  const [done, setDone]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setPhoto(null)
    setDone(false)
    fetchUnsplashPhoto(query).then(p => {
      if (cancelled) return
      setPhoto(p)
      setDone(true)
    })
    return () => { cancelled = true }
  }, [query])

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
