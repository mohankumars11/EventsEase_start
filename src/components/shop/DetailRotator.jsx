import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The line inside a storefront card that keeps moving.
 *
 * A product tile has more true things to say than it has room for: what the
 * offer is, who bakes it, who delivers it, how it's paid for, what it serves,
 * how many people ordered it. The usual answers are to pick one and lose the
 * rest, or to print all six at 10px and lose all six. This cycles them
 * through one well-set line instead, so the card is never a dead rectangle
 * and every fact gets its turn at full size.
 *
 * Three things keep it from being an irritant:
 *
 *   — It stops when it isn't being looked at. An IntersectionObserver pauses
 *     every card scrolled out of view, so a 40-product category page runs the
 *     handful of timers that are actually on screen rather than 40 of them.
 *   — Cards don't tick in lockstep. `stagger` offsets each card's first
 *     advance by its position in the grid; without it the whole page blinks
 *     at once, which reads as a glitch rather than as motion.
 *   — Under `prefers-reduced-motion` it doesn't rotate at all. It renders
 *     every fact stacked, because the alternative — freezing on line 1 —
 *     silently hides the other five from exactly the people who can't opt
 *     back in.
 *
 * `facts` entries: { key, icon?: LucideIcon, text, tone?: 'default'|'offer'|'trust' }
 * Falsy entries are dropped, so callers can inline conditionals.
 */
export default function DetailRotator({
  facts = [],
  interval = 2800,
  stagger = 0,
  className = '',
}) {
  const items = facts.filter(Boolean)
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  // Pause off-screen. `rootMargin` starts the rotation just before the card
  // scrolls in, so it is already mid-cycle rather than always showing fact 1
  // to anyone who scrolls at a normal speed.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || !visible || items.length < 2) return
    let id
    const start = setTimeout(() => {
      setI(n => (n + 1) % items.length)
      id = setInterval(() => setI(n => (n + 1) % items.length), interval)
    }, stagger % interval)
    return () => { clearTimeout(start); clearInterval(id) }
  }, [reduced, visible, items.length, interval, stagger])

  if (items.length === 0) return null

  if (reduced) {
    return (
      <ul className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
        {items.map(f => (
          <li key={f.key}><FactLine fact={f} /></li>
        ))}
      </ul>
    )
  }

  // Fixed height, so a two-word fact followed by a nine-word one can't make
  // the card — or the grid row it sits in — jump.
  const fact = items[i % items.length]
  return (
    <div ref={ref} className={`relative h-[18px] overflow-hidden ${className}`}>
      {/* The rotation is decoration over content that is stated elsewhere on
          the card or its product page; announcing every 2.8s tick would make
          the page unusable with a screen reader. */}
      <div key={fact.key} className="fact-swap absolute inset-0 flex items-center" aria-hidden="true">
        <FactLine fact={fact} />
      </div>
      <span className="sr-only">{items.map(f => f.text).join('. ')}</span>
    </div>
  )
}

const TONES = {
  default: 'text-gray-500',
  offer:   'text-chilli-600',
  trust:   'text-forest-600',
}

function FactLine({ fact }) {
  const Icon = fact.icon
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-semibold leading-none truncate ${TONES[fact.tone] ?? TONES.default}`}>
      {Icon && <Icon size={12} className="shrink-0" strokeWidth={2.4} />}
      <span className="truncate">{fact.text}</span>
    </span>
  )
}
