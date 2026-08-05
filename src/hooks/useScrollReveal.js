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
 *
 * The DOM is watched with a MutationObserver, not scanned once on mount.
 * `.reveal` starts at opacity 0, so anything rendered *after* the initial
 * pass — a section gated behind a Supabase fetch, a carousel that fills in
 * later — was never observed and therefore stayed invisible forever. The
 * landing page's "Real voices, real celebrations" reviews section was
 * exactly this: it always rendered, and was never once seen.
 */
export function useScrollReveal() {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))
      return
    }

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

    function observeAll(root = document) {
      root.querySelectorAll?.('.reveal:not(.visible)').forEach(el => observer.observe(el))
    }

    observeAll()

    const mutations = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.classList?.contains('reveal')) observer.observe(node)
          observeAll(node)
        }
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      mutations.disconnect()
      observer.disconnect()
    }
  }, [])
}
