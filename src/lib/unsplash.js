// Fetches a real photo for a given search query via Unsplash's free
// Search Photos API, caching results in localStorage (7-day TTL) to
// stay well inside the free tier's 50 req/hr rate limit.
//
// Degrades gracefully: returns null if no key is configured, the
// request fails, or nothing matches — callers must fall back to the
// existing emoji/gradient look, never show a broken image.

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
const CACHE_PREFIX = 'ee_unsplash_v1__'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function fetchUnsplashPhoto(query) {
  if (!ACCESS_KEY) return null

  const cacheKey = CACHE_PREFIX + query.toLowerCase().trim()
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.photo
    }
  } catch {
    // ignore corrupt cache entry, fall through to a fresh fetch
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.results?.[0]
    if (!result) return null

    const photo = {
      url: result.urls.regular,
      alt: result.alt_description || query,
      // Required attribution per Unsplash API guidelines
      photographerName: result.user.name,
      photographerUrl: `${result.user.links.html}?utm_source=sambramo&utm_medium=referral`,
    }

    localStorage.setItem(cacheKey, JSON.stringify({ photo, fetchedAt: Date.now() }))
    return photo
  } catch {
    return null
  }
}
