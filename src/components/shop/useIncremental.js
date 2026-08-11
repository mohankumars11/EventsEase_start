import { useState, useEffect, useRef } from 'react'

/**
 * Render a long catalogue a screenful at a time.
 *
 * Cakes is 215 rows and Gifts is 122, and both pages rendered every one of
 * them on first paint. Each card carries a photo, and every product without a
 * resolved `image_url` fires its own live Unsplash search from ProductImage —
 * so the page opened with a couple of hundred concurrent requests and the
 * browser started failing them outright with ERR_INSUFFICIENT_RESOURCES. On a
 * phone on mobile data it is worse: hundreds of images paid for, to show the
 * six that fit on screen.
 *
 * This renders `step` items and extends when a sentinel near the bottom of
 * the list scrolls into view — infinite scroll without a library, and without
 * the pagination controls that would make a browsing shelf feel like a table.
 * The button stays as the fallback for anyone whose browser has no
 * IntersectionObserver, and as a target for keyboard users who never trigger
 * a scroll sentinel.
 *
 * The window resets whenever the list identity changes, so switching from
 * "Birthday" to "Anniversary" starts at the top of the new results instead of
 * showing 200 items of a 12-item filter.
 */
export function useIncremental(list, step = 24) {
  const [count, setCount] = useState(step)
  const sentinelRef = useRef(null)

  useEffect(() => { setCount(step) }, [list, step])

  const hasMore = count < list.length

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCount(c => c + step) },
      // Extend before the sentinel is actually visible, so the next batch is
      // already there by the time the current one runs out.
      { rootMargin: '600px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, step, count])

  return {
    items: hasMore ? list.slice(0, count) : list,
    hasMore,
    showMore: () => setCount(c => c + step),
    remaining: Math.max(0, list.length - count),
    sentinelRef,
  }
}

export default useIncremental
