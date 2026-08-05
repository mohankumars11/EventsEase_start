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

// The free tier allows 50 requests/hour. A single render of the landing
// page asks for well over a hundred photos (the service roller alone
// duplicates ~46 items), so without the three guards below the page
// burns the whole hourly quota on first paint and every subsequent
// visitor sees emoji fallbacks:
//
//   1. `memory`   — a process-lifetime cache, so the same query resolved
//                   once is free for every other component on the page.
//   2. `inFlight` — de-duplicates concurrent callers. Twenty components
//                   mounting at once with the same query previously fired
//                   twenty identical requests, because none of them had
//                   written to localStorage yet.
//   3. `BUDGET`   — a hard ceiling on live searches per page load. Once
//                   spent, unknown queries resolve to null immediately
//                   and the caller shows its emoji fallback, which is a
//                   perfectly good result and costs nothing.
const memory = new Map()
const inFlight = new Map()

const BUDGET = 24
let spent = 0

function readCache(cacheKey) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.photo
  } catch {
    // ignore corrupt cache entry, fall through to a fresh fetch
  }
  return undefined
}

export async function fetchUnsplashPhoto(query) {
  if (!ACCESS_KEY || !query) return null

  const key = String(query).toLowerCase().trim()
  if (memory.has(key)) return memory.get(key)

  const cacheKey = CACHE_PREFIX + key
  const cached = readCache(cacheKey)
  if (cached !== undefined) {
    memory.set(key, cached)
    return cached
  }

  if (inFlight.has(key)) return inFlight.get(key)

  if (spent >= BUDGET) return null
  spent++

  const promise = (async () => {
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

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ photo, fetchedAt: Date.now() }))
      } catch {
        // Quota exceeded — the in-memory cache still covers this session.
      }
      return photo
    } catch {
      return null
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)
  const photo = await promise
  // Only remember successes. A null from a transient network blip
  // shouldn't poison the query for the rest of the session.
  if (photo) memory.set(key, photo)
  return photo
}
