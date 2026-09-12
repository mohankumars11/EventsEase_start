import { useState, useEffect } from 'react'

/* Three seconds, both apps.
 *
 * The owner's call, and it is the length most consumer apps in this
 * category hold a branded launch screen for. The platform guidance is
 * shorter -- under 1.5s, no artificial timer -- and the trade is real:
 * roughly 8% more first-open abandonment per additional second. It is
 * recorded here so the number is a decision rather than an accident, and
 * so the cost is known if retention is ever the thing being chased.
 *
 * The two surfaces used to differ (4000 customer, 1500 partner). They no
 * longer do: the artwork is the same on both, so a partner watching a
 * shorter version of the same picture would only look like a bug. */
const HOLD_MS = 3000
const FADE_MS = 480

/**
 * The launch screen: one piece of artwork, full bleed, on every cold open.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS AN IMAGE AND NOT A COMPOSITION
 * ══════════════════════════════════════════════════════════════════════
 *
 * It used to be live text -- a wordmark, a rule and a category line, each
 * animating in on a gradient. This is a single rendered picture supplied by
 * the owner: the name, the category line, the trades the app covers and the
 * promise underneath, all in one file.
 *
 * That is a deliberate trade and worth being honest about. What it costs:
 * the type no longer resizes per handset, so the small labels are fixed at
 * whatever size the artwork gives them, and the trade names inside the
 * picture are baked in -- they cannot follow TRADE_FOR_SERVICE, and today
 * they do not match it. What it buys: one asset, no font dependency at the
 * one moment a font cannot be late, and a launch screen that is exactly
 * what was designed rather than an approximation of it in CSS.
 *
 * ── Letterboxed, not cropped ────────────────────────────────────────
 * The artwork is 887x1774, an aspect of 0.50. Handsets in this market are
 * nearer 0.45. `cover` would fill the screen and crop about 44px off each
 * side of the source, which is exactly where the outermost trade labels
 * sit -- Live Counters and Cake Providers would lose their first letters.
 *
 * So it is `contain`, and the bands above and below are painted with the
 * artwork's own edge colours. scripts/render-splash-art.mjs samples those
 * corners on every run and prints them; if they drift from the gradient
 * below, the join becomes visible and that script is where it shows up.
 *
 * ── Why it can never trap anyone ────────────────────────────────────
 * It is an overlay over a mounted, interactive app rather than a gate in
 * front of one. If a timer never fires, if the image 404s, if something
 * throws inside it -- the app underneath is already rendered, and a tap
 * dismisses it. Three seconds on every launch is a brand moment only for
 * as long as it stays skippable.
 */
export default function SplashScreen() {
  const [state, setState] = useState('showing')

  useEffect(() => {
    // Without this guard the timers would drag a splash that never showed
    // back onto the screen three seconds in -- `done` is terminal for the
    // render, but not for a setTimeout already scheduled.
    if (state === 'done') return
    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone  = setTimeout(() => setState('done'),    HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
    // Deliberately mount-only. `state` is read once to decide whether the
    // timers are needed at all; re-running on every transition would
    // restart the hold each time it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = () => setState('done')

  if (state === 'done') return null

  return (
    <div
      role="presentation"
      onClick={dismiss}
      /* data-splash, and it is not decoration. Six QA scripts used to find
         this element by the class `brand-aqua`, which meant the test
         harness broke whenever the brand changed colour -- and it has now
         changed colour. The selector says "the splash" instead. */
      data-splash=""
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity"
      style={{
        opacity: state === 'leaving' ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        /* The artwork's own top and bottom edge colours, so the letterbox
           bands read as part of the picture rather than as a border round
           it. Sampled, not guessed: see render-splash-art.mjs. */
        background: 'linear-gradient(180deg, #25034B 0%, #1B0240 52%, #110033 100%)',
      }}
    >
      <img
        src="/splash/splash-720.webp"
        srcSet="/splash/splash-720.webp 720w, /splash/splash-1080.webp 1080w"
        sizes="100vw"
        alt="Sambramo — Event delivery app. You pick the occasion, we deliver the celebration."
        /* eager + high, because this is the only thing on the screen and
           every millisecond it is late is a millisecond of empty purple. */
        loading="eager"
        fetchpriority="high"
        decoding="sync"
        draggable="false"
        className="h-full w-full select-none object-contain"
      />
    </div>
  )
}
