import { useState, useEffect } from 'react'
import SambramoWordmark from './SambramoWordmark'
import { BRAND } from '../../config/sambramo'
import { isPartnerSurface } from '../../config/surface'

/* Four seconds for a customer, one and a half for a partner.
 *
 * A customer opens the app to browse and the mark is worth the beat. A
 * partner opens it because a job is waiting, and every second of logo
 * comes out of a clock somebody else is racing too. */
const HOLD_MS = 4000
const PARTNER_HOLD_MS = 1500
const FADE_MS = 480

/**
 * The name, on the brand's own ground, every time the app opens.
 *
 * ── What changed, and why the choreography changed with it ────────────────
 * This used to write a gold Spencerian S onto navy, top to bottom, and rise
 * the wordmark under it. The S is retired — it was illegible at the sizes the
 * rest of the app draws the mark at, and it made the brand a letter rather
 * than a name nobody has heard yet. So there is no letter to write.
 *
 * A wipe-on effect applied to a word rather than a letterform reads as a
 * loading bar, not as handwriting. The word arrives instead: it rises and
 * settles, once, and the ground behind it is what carries the brand.
 *
 *   0.10s  the wordmark rises
 *   0.55s  the category line
 *   0.70s  the rules open outward from the centre
 *   1.40s  the composition is complete
 *   4.00s  hold ends, 0.48s fade
 *
 * The stillness on the finished lockup is the point rather than slack: an
 * animation that ends at the same instant the screen leaves reads as a
 * glitch, and the eye needs a beat on the completed mark for that, rather
 * than the motion, to be the thing remembered.
 *
 * ── Every open, not once per device ───────────────────────────────────────
 * This was gated in localStorage and shown once. It is now shown on every
 * cold open, which is the owner's call and the conventional one — most
 * consumer apps in the category do the same.
 *
 * "Every open" means every page load, not every navigation: the component is
 * mounted once in App, outside the router, so moving between screens does
 * not re-trigger it. In the Capacitor build that maps to a cold start —
 * resuming from background does not reload the WebView, so somebody
 * switching apps is not made to watch it again.
 *
 * ── Why it starts in `showing` ────────────────────────────────────────────
 * Rather than deciding in an effect. There is nothing to decide any more, and
 * a first render that returns null would flash the app underneath for a frame
 * before the splash covered it — which is worse than no splash.
 *
 * ── Why it can never trap anyone ──────────────────────────────────────────
 * It is an overlay over a mounted, interactive app rather than a gate in
 * front of one. If a timer never fires, if the font never loads, if
 * something throws inside it — the app underneath is already rendered, and a
 * tap dismisses it. That matters more now, not less: four seconds on every
 * single launch is only a brand moment for as long as it stays skippable.
 */
export default function SplashScreen() {
  /* ── The partner app shows it too, briefly ───────────────────────────
   * This was disabled outright for partners, and the reasoning was sound
   * then: the app is opened by a push about a job, and four seconds of
   * logo came out of a 45-second offer window while the same job sat on
   * four other phones.
   *
   * The window is not 45 seconds any more. OFFER_WINDOW_SECONDS is
   * overridden to 900 on the server, so the number that decision rested
   * on is off by a factor of twenty, and a second and a half now costs a
   * master nothing measurable.
   *
   * What it buys is real: an earning app that opens on a blank white
   * flash looks unfinished, and this is the app somebody is deciding
   * whether to trust with their Saturdays.
   *
   * Shorter, though. The reasoning is retired, not reversed. */
  const hold = isPartnerSurface() ? PARTNER_HOLD_MS : HOLD_MS

  const [state, setState] = useState("showing")

  useEffect(() => {
    // Without this guard the timers would drag a splash that never showed
    // back onto the screen four seconds in — `done` is a terminal state
    // for the render, but not for a setTimeout that has already been
    // scheduled.
    if (state === 'done') return
    const leave = setTimeout(() => setState('leaving'), hold)
    const gone  = setTimeout(() => setState('done'),    hold + FADE_MS)
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
      className="brand-aqua fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden px-8 transition-opacity"
      style={{ opacity: state === 'leaving' ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      {/* A soft bloom behind the mark, so the word sits in light rather than
          on a slab. `.brand-aqua` already pools its own highlight toward the
          bottom-right corner; this one is centred on the LOCKUP, which is
          what stops the wordmark reading as pasted onto the gradient.

          White at 14%, not a blue radial — the old one was tuned to lift a
          gold letter off navy, and the same blue over the aqua ramp turns
          the middle of the screen grey. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)' }}
      />

      {/* ── The lockup ────────────────────────────────────────────────
          Centred on both axes, and sized against the VIEWPORT rather than at
          a fixed px — see `.brand-wordmark-fit`. A 42px wordmark is
          comfortable on a 412px Pixel and cramped on a 360px Galaxy, which
          is most of this market; one hard-coded number picks a winner
          between the two. `w-full` with `max-w-md` gives the word the whole
          screen to be centred in while keeping it off the edges on a
          tablet. */}
      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="ink-rise w-full">
          <SambramoWordmark fit onLight={false} registered />
        </div>

        {/* The category line, under a pair of rules that open from the
            centre. The rules were gold, which was the S's colour and has no
            job here; white at 45% is the same gesture in the ground's own
            light. */}
        <div className="mt-3.5 flex w-full items-center justify-center gap-3">
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-r from-transparent to-white/45" />
          <p className="ink-rise ink-rise-late text-center text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
            {BRAND.categoryLine}
          </p>
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-l from-transparent to-white/45" />
        </div>
      </div>
    </div>
  )
}
