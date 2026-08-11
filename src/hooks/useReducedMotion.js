import { useState, useEffect } from 'react'

/**
 * The OS-level "reduce motion" preference, as a boolean that updates live.
 *
 * index.css already honours the preference for anything animated in CSS.
 * This is for the cases CSS can't reach: animation driven by a JS timer,
 * where the right response is to stop the timer and show the content
 * differently, not to freeze a rotator on whichever line it happened to be
 * displaying when the preference was read.
 *
 * SSR/very old Safari safe — falls back to "no preference" if matchMedia
 * or addEventListener isn't available.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = e => setReduced(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  return reduced
}

export default useReducedMotion
