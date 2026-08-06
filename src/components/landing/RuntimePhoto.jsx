import { useState, useEffect } from 'react'
import { fetchUnsplashPhoto } from '../../lib/unsplash'

/**
 * A photo resolved at runtime, for the handful of cards with no catalogue
 * image behind them (Party Essentials and Pooja & Essentials — migration 017
 * ran out of rate-limit budget before reaching those two).
 *
 * Kept separate from the plain `Photo` in StorefrontSections so the common
 * case stays a bare <img> with no effect and no state machine: the runtime
 * fetch shares a per-page budget of 24 searches across the whole app, and
 * every card that can avoid spending one should.
 */
export default function RuntimePhoto({ query, alt, emoji, className = '', tint = 'from-plum-800 to-plum-950' }) {
  const [photo, setPhoto] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!query) return
    fetchUnsplashPhoto(query).then(p => {
      if (!cancelled && p) setPhoto(p)
    })
    return () => { cancelled = true }
  }, [query])

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${tint} ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-4xl opacity-70 select-none"
      >
        {emoji}
      </span>

      {photo && (
        <img
          src={photo.url}
          alt={photo.alt || alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`relative w-full h-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
