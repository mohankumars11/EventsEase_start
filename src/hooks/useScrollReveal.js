import { useEffect } from 'react'

/**
 * useScrollReveal
 * Attaches an IntersectionObserver to all elements that carry the `.reveal`
 * class. Once an element scrolls into view it receives the `.visible` class,
 * which triggers the CSS transition defined in index.css.
 *
 * Usage:
 *   1. Call `useScrollReveal()` at the top of the page component.
 *   2. Add className="reveal" (plus optional "reveal-delay-1/2/3/4") to any
 *      element you want to animate in.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            // Unobserve after first trigger so it only animates once
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    const elements = document.querySelectorAll('.reveal')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}
