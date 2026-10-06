import React, { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * The reason to list, in one line, above the trades.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SHRANK FROM A FULL SCREEN TO A BANNER
 * ══════════════════════════════════════════════════════════════════════
 *
 * It was a full-bleed red card carrying a headline, a paragraph, three
 * promises and a button — and the twenty-six trades a partner came to
 * list were behind that button. The pitch was standing in front of the
 * thing it was pitching.
 *
 * A partner who opens the Listing tab has already been persuaded; that
 * is why they opened it. What they need is the list. So the argument
 * keeps its best line and gives up the screen, and tapping any trade is
 * the way in — there is no second button to decide about.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT CYCLES, AND EVERY LINE IS TRUE
 * ══════════════════════════════════════════════════════════════════════
 *
 * One fixed sentence becomes furniture by the third visit. Rotating
 * them means a partner who comes back four times is told four different
 * true things instead of the same one four times.
 *
 * Every number is one this repo can produce. ₹6,587 is the figure the
 * partner landing page quotes and it comes from accepted lines. The
 * trade and service counts are read from the catalogue, not typed here,
 * so they cannot go stale. No countdowns, no "3 partners joined this
 * hour" — a partner who catches one invented number stops believing the
 * ₹6,587 too, and that one is real and is the best thing we have to say.
 *
 * ── It changes once there is a listing ──────────────────────────────
 * "Nobody can book what they cannot see" is the right thing to say to
 * somebody with nothing listed and slightly insulting to somebody with
 * six. The second set is about adding the next one.
 */
import { TRADES, offeringsForTrade } from '../../data/partnerCatalogue'

const SERVICES = TRADES.reduce((n, t) => n + offeringsForTrade(t).length, 0)

const EMPTY = [
  'Nobody can book what they cannot see.',
  `A typical job on Sambramo pays ₹6,587.`,
  `${TRADES.length} trades, ${SERVICES} things you can list. Pick yours.`,
  'Ten minutes, once. Nothing is charged, ever.',
  'You choose every job. Decline anything, no penalty.',
]

const HAS_SOME = [
  'The more you list, the more you are offered.',
  'Most partners do more than one thing. Say so.',
  'A job goes to whoever said they can do it.',
  'Anything you add is live the day we read it.',
]

const EVERY_MS = 4200

export default function ListingPitch({ empty = true, className = '' }) {
  const lines = empty ? EMPTY : HAS_SOME
  const [i, setI] = useState(0)

  /* Honoured, because movement nobody can stop is a bug for anybody who
     gets motion sick reading it. */
  const still = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (still) return
    const t = setInterval(() => setI(n => (n + 1) % lines.length), EVERY_MS)
    return () => clearInterval(t)
  }, [still, lines.length])

  return (
    <div className={`mb-3 flex items-center gap-2.5 rounded-[18px] bg-kumkuma-600 px-3.5 py-2.5 text-white ${className}`}>
      <Sparkles size={15} className="shrink-0 opacity-90" />
      {/* Keyed on the index so React swaps the node and the animation
          replays. Without the key it is one node whose text changes and
          nothing moves. */}
      <p key={i} className="animate-fade-in min-w-0 text-[12.5px] font-extrabold leading-snug">
        {lines[i]}
      </p>
    </div>
  )
}
