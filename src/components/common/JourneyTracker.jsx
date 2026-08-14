import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { recordVisit } from '../../lib/journey'

/**
 * Records every navigation. One effect, no render.
 *
 * Mounted once beside ScrollRestoration rather than folded into it: that
 * component's job is where the viewport sits, this one's is where the customer
 * has been, and a component that does two unrelated things on the same effect
 * is a component nobody can change safely.
 *
 * The query string is recorded with the path because it is frequently the
 * whole answer — `/shop/Cakes?occasion=Birthday` is a different place from the
 * cake shop, and resuming to the bare path would drop the filter the customer
 * chose. `lib/journey` decides what is worth keeping; this only reports.
 */
export default function JourneyTracker() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    recordVisit(pathname, search)
  }, [pathname, search])

  return null
}
