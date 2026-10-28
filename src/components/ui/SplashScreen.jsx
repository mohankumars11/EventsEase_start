import { useEffect, useState } from 'react'
import './SplashScreen.css'

/**
 * The first second of the app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE EVERY GOOD ONE USES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Zomato, Swiggy, Airbnb and Uber all open the same way, and the order
 * matters more than the effect:
 *
 *   1. the brand ground fills instantly — no white frame, ever
 *   2. the wordmark reveals over about a second
 *   3. the tagline arrives AFTER the name has settled, not with it
 *   4. a loader, if there is one at all, sits low and small
 *
 * Three is the part people get wrong. A tagline animating alongside the
 * wordmark gives the eye two things to read at once and it reads
 * neither; arriving after, it is the second beat of a sentence. Uber
 * skips the loader entirely and the others keep it at the bottom edge,
 * because a spinner in the middle of a splash says "waiting" when the
 * screen is meant to say "arriving".
 *
 * ══════════════════════════════════════════════════════════════════════
 * TIMING
 * ══════════════════════════════════════════════════════════════════════
 *
 *   0 ms      amethyst ground
 *   90 ms     letters begin, 85 ms apart
 *   ~790 ms   last letter lands
 *   950 ms    tagline rises  ← the delay, deliberate
 *   1250 ms   loader fades in
 *   2850 ms   the whole thing leaves over 260 ms
 *
 * Under three seconds in total. A splash is a cost paid on every cold
 * start; the brand gets one second of it and the partner gets the rest
 * of their day.
 */

const HOLD_MS = 2850
const FADE_MS = 260

export default function SplashScreen() {
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), HOLD_MS)
    const gone = window.setTimeout(() => {
      setDone(true)
      /* The customer app's first-run location prompt waits for this. */
      window.__sbmSplashGone = true
      window.dispatchEvent(new Event('sbm:splash-gone'))
    }, HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(gone)
    }
  }, [])

  if (done) return null

  return (
    <div
      className={`app-splash fixed inset-0 z-[200] flex flex-col items-center justify-center ${leaving ? 'app-splash-is-leaving' : ''}`}
      role="presentation"
    >
      {/* The whole name at once, bold (Mohan, 2026-10-28) — not letter by letter. */}
      <div className="app-splash-wordmark app-splash-word" aria-label="Sambramo">SAMBRAMO</div>

      {/* ── The tagline, as the reference sets it ────────────────────
          Blinkit puts "India's Last Minute App" directly under the
          wordmark: sentence case, ordinary weight, large enough to
          read at a glance, tight to the name so the two are one
          lockup. That is a PRODUCT tagline and it is what this is.

          Both references then carry a rule and "AN ETERNAL COMPANY"
          beneath it — a parent-company signature. Sambramo does not
          have one, and inventing a corporate line for a splash screen
          would be putting a claim on the first screen anybody sees. So
          the rule goes with it: a hairline under a tagline with
          nothing beneath it is a line that dangles. */}
      <p className="app-splash-tagline"><span className="app-splash-hl">Event Booking</span> Done In Minutes</p>

      {/* The reference has NO loader — Zomato shows the lockup and
          nothing else. Asked for one, so it is here, but kept at the
          bottom edge and brought in last so it never competes with the
          name. See the CSS for why the arc is the light end of the
          amethyst ramp rather than amethyst itself. */}
      <div className="app-splash-loader" role="status" aria-label="Loading">
        {/* Three circles, not one. The two echoes expand and fade out
            from under the spinning arc, which is what makes a loader
            read as a pulse rather than a widget. They are behind it and
            staggered, so at any moment there is one ring leaving and
            one arriving. */}
        <span className="app-splash-echo" />
        <span className="app-splash-echo app-splash-echo-2" />
        <span className="app-splash-ring" />
      </div>
    </div>
  )
}
