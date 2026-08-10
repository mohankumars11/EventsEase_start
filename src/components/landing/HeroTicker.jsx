import { useState, useEffect } from 'react'

/**
 * The rotating prompt at the top of the hero card.
 *
 * It replaced a static "India's Celebration Concierge" chip, which said what
 * we call ourselves rather than anything the reader wants. The rotation is
 * deliberately mixed — three occasions you would plan, three things you would
 * simply buy — so the hero teaches the shape of the business in the first few
 * seconds without a line of explanation. Somebody who only came for a cake
 * sees a cake go past.
 */
const PROMPTS = [
  { emoji: '🎂', text: 'Planning a birthday?' },
  { emoji: '💐', text: 'Need flowers by tomorrow?' },
  { emoji: '💍', text: 'Planning a wedding?' },
  { emoji: '🎁', text: 'Sending a gift today?' },
  { emoji: '🪔', text: 'Getting ready for Diwali?' },
  { emoji: '🏠', text: 'Warming a new home?' },
]

const INTERVAL_MS = 2600

export default function HeroTicker() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Someone who has asked for less motion gets the first prompt, held. A
    // sentence that rewrites itself every few seconds is exactly the kind of
    // movement that setting is for.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let swapTimer
    const tick = setInterval(() => {
      setVisible(false)
      // Swap the text while it is invisible, so the change is never seen
      // mid-fade as a cross-dissolve of two different sentences.
      swapTimer = setTimeout(() => {
        setIndex(i => (i + 1) % PROMPTS.length)
        setVisible(true)
      }, 260)
    }, INTERVAL_MS)

    return () => {
      clearInterval(tick)
      clearTimeout(swapTimer)
    }
  }, [])

  const prompt = PROMPTS[index]

  return (
    <div className="relative inline-flex items-center justify-center mb-3 sm:mb-4">
      <span
        className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm font-semibold rounded-full px-4 py-1.5 backdrop-blur-sm"
        // The live region is polite and the whole chip is one atomic update,
        // so a screen reader hears a complete prompt rather than a stream of
        // half-swapped fragments.
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          <span aria-hidden="true">{prompt.emoji}</span> {prompt.text}
        </span>
      </span>
    </div>
  )
}
