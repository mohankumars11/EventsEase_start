import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Two things a single-page app has to do by hand, and this one wasn't:
 *
 *  1. Reset scroll on navigation. React Router keeps the window where it
 *     was, so tapping a product halfway down the Shop dropped you into
 *     the middle of the product page. Back/forward is left alone — the
 *     browser restores those positions itself and overriding it is worse.
 *
 *  2. Scroll to `#hash` targets. The footer links to `/#how-it-works`,
 *     `/#celebrations` and `/#festivals`; from any other page those did
 *     nothing but land you at the top of the landing page, because
 *     nothing was listening for the hash.
 */
export default function ScrollRestoration() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (hash) {
      // The target section may not be mounted on the very first frame.
      const id = decodeURIComponent(hash.slice(1))
      let attempts = 0
      const timer = setInterval(() => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          clearInterval(timer)
        } else if (++attempts > 20) {
          clearInterval(timer)
        }
      }, 50)
      return () => clearInterval(timer)
    }

    if (navigationType === 'POP') return
    // `auto` rather than the smooth default from index.css — a page you
    // just opened should already be at the top, not visibly gliding there.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash, navigationType])

  return null
}
