import { useEffect, useState } from 'react'
import { TRADE_FACE, SEARCH_LINES } from '../../config/instantBooking'

/**
 * The person, not the progress bar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SCREEN THAT IS CORRECT STILL READS AS BROKEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The matching screen tells the truth and updates the instant anything
 * changes. Between changes — which is most of the minute somebody spends
 * on it — nothing moves at all. A page that is not moving is a page that
 * has crashed, to anyone who has not read the code.
 *
 * A spinner does not fix this. A spinner is the universal symbol for
 * "this program is busy", and busy is not the message. The message is
 * "four photographers in Koramangala are looking at your job right now",
 * and the thing that carries it is a person, not a rotating arc.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS ANIMATED AND WHAT IS NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The motion is decoration; the STATE is data. The face bobs while a
 * line is searching and stops when it is confirmed — so the animation
 * never says anything the row underneath it does not already say. It
 * cannot show activity for a line that has none, because the same flag
 * drives both.
 *
 * That is the line between reassurance and a fake progress bar, and it
 * matters more here than anywhere else in the app: this is the screen
 * where somebody decides whether to trust the product with a wedding.
 *
 * ── Reduced motion ──────────────────────────────────────────────────
 * Honoured through `motion-reduce:` rather than by removing the sprite.
 * Somebody who has asked their phone to stop animating things still
 * needs to know a photographer is being asked.
 */
export default function TradeSprite({ trade, serviceId, active, size = 38 }) {
  const face = TRADE_FACE[trade] ?? TRADE_FACE[serviceId] ?? '✨'

  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* The sonar. Two rings, offset, so the pulse reads as continuous
          rather than as a single thump — this is the part that says
          "reaching outward", which is literally what dispatch is doing:
          5 km, then 10, then 15. */}
      {active && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-saffron-400/30 motion-reduce:hidden" />
          <span
            className="absolute inset-0 animate-ping rounded-full bg-saffron-400/20 motion-reduce:hidden"
            style={{ animationDelay: '0.9s' }}
          />
        </>
      )}

      <span
        className={`relative flex h-full w-full items-center justify-center rounded-full text-[19px] leading-none ${
          active ? 'bg-saffron-400/20' : 'bg-forest-100'
        } ${active ? 'sb-bob motion-reduce:animate-none' : ''}`}
        // Staggered per service so four sprites do not bob in lockstep,
        // which reads as one animation rather than four people.
        style={active ? { animationDelay: `${(hash(serviceId ?? trade) % 7) * 0.18}s` } : undefined}
      >
        {face}
      </span>
    </span>
  )
}

/** Stable per id, so a row does not re-stagger on every render. */
function hash(s) {
  let h = 0
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * A line of reassurance that changes every few seconds.
 *
 * The single most effective anti-"is it frozen?" device on the screen,
 * and the cheapest. Every line is a true statement about what dispatch
 * is actually doing — none of them is a countdown, a percentage, or an
 * estimate we cannot keep.
 *
 * `false_urgency` in config/legal.js is the pattern this must not
 * become: no invented scarcity, no "3 people are viewing this", no
 * timer against an empty pool.
 */
export function LiveLine({ area, notified }) {
  const lines = SEARCH_LINES(area, notified)
  const [i, setI] = useState(0)

  useEffect(() => {
    // 3.6s: long enough to read a sentence twice, short enough that the
    // screen is never still for as long as it takes to doubt it.
    const t = setInterval(() => setI(n => (n + 1) % lines.length), 3600)
    return () => clearInterval(t)
  }, [lines.length])

  return (
    <p
      key={i}
      className="sb-fade-in mt-3 flex items-center gap-2 text-[12.5px] font-semibold leading-snug text-ink-soft motion-reduce:animate-none"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-forest-600" />
      </span>
      {lines[i]}
    </p>
  )
}
