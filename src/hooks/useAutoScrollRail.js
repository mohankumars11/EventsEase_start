import { useState, useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * A horizontal rail that advances itself, one card at a time.
 *
 * A phone shows two cards of an eight-card rail and gives no hint the other
 * six exist — there is no scrollbar on touch and a right-hand edge is not an
 * affordance. Movement is what says "this is a deck": it demonstrates the
 * overflow instead of hoping somebody swipes to discover it.
 *
 * ── Why scrollTo and not a transform ───────────────────────────────────
 * The rail stays a real scroll container, so a swipe behaves exactly as it
 * always did and CSS snap points do the aligning. A translated track has to
 * reimplement dragging, momentum and snapping, and gets all three slightly
 * wrong.
 *
 * ── Why it never resumes ───────────────────────────────────────────────
 * The first pointer down stops the timer permanently. A deck that starts
 * moving again a few seconds after you touched it drags the card you were
 * reading out from under you, which is worse than one that never moved. One
 * deliberate swipe means the customer has taken over, and they keep it.
 *
 * Also stops under `prefers-reduced-motion`, where the rail is still fully
 * usable by hand.
 *
 * Returns `{ ref, active, handlers }` — spread `handlers` onto the scrolling
 * element and `active` drives the progress dots.
 */
export function useAutoScrollRail(count, { interval = 4200, gap = 12 } = {}) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const [taken, setTaken] = useState(false)

  useEffect(() => {
    if (reduced || taken || count < 2) return
    const id = setInterval(() => {
      const el = ref.current
      if (!el) return
      const next = (active + 1) % count
      const card = el.children[next]
      if (!card) return
      // offsetLeft is measured against the offsetParent, which is not
      // necessarily the rail — subtracting the rail's own offset keeps this
      // correct inside a positioned ancestor.
      el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' })
      setActive(next)
    }, interval)
    return () => clearInterval(id)
  }, [active, count, interval, reduced, taken])

  // Keep the dots truthful when the customer scrolls by hand.
  const onScroll = useCallback(e => {
    const el = e.currentTarget
    const first = el.children[0]
    if (!first) return
    setActive(Math.round(el.scrollLeft / (first.offsetWidth + gap)))
  }, [gap])

  const onPointerDown = useCallback(() => setTaken(true), [])

  return { ref, active, handlers: { onScroll, onPointerDown } }
}
