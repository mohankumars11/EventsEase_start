import { useState, useEffect } from 'react'
import { Monogram } from './SambramoWordmark'
import { BRAND } from '../../config/sambramo'

const HOLD_MS = 4000
const FADE_MS = 480

/**
 * The mark, written, every time the app opens.
 *
 * ── The choreography ──────────────────────────────────────────────────────
 * Four seconds, and the first 2.3 of them are doing something:
 *
 *   0.18s  the S begins to arrive, top to bottom — the direction a
 *          Spencerian capital is actually written
 *   1.15s  the letter is complete; the wordmark rises under it
 *   1.50s  the category line
 *   1.62s  the rules open outward from the centre
 *   2.32s  the composition is complete
 *   4.00s  hold ends, 0.48s fade
 *
 * The ~1.7s of stillness on the finished mark is the point rather than
 * slack: an animation that ends at the same instant the screen leaves reads
 * as a glitch, and the eye needs a beat on the completed lockup for that,
 * rather than the motion, to be the thing remembered.
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
  const [state, setState] = useState('showing')   // showing | leaving | done

  useEffect(() => {
    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone  = setTimeout(() => setState('done'),    HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [])

  const dismiss = () => setState('done')

  if (state === 'done') return null

  return (
    <div
      role="presentation"
      onClick={dismiss}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-royal-950 transition-opacity"
      style={{ opacity: state === 'leaving' ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      {/* A single soft bloom behind the mark. The reference photographs the S
          on velvet, which has a sheen; a flat navy rectangle does not. One
          radial at low opacity is the whole of that — a texture image would
          be a download on the first screen anybody ever sees. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(96,140,250,0.16) 0%, rgba(6,20,72,0) 68%)' }}
      />

      <div className="relative flex flex-col items-center">
        {/* The mark, written.

            No margin between this and the wordmark beyond a negative nudge.
            The gap that used to sit here was not spacing — it was empty
            viewBox inside the SVG, because the glyph was sized against its
            layout box rather than its ink. Fixing the fit closed it, and the
            -1 takes up the last of the letter's own bottom bearing so the
            wordmark sits under the S rather than below its box.

            There was a shine here — a pale band sweeping across on the same
            diagonal as the gold, meant to read as light catching the gilding.
            It did not. The band was bounded by the letter's BOX rather than
            its ink, so it swept over the navy either side of the S and read
            as exactly what it was: a grey rectangle passing over the logo.

            Clipping it to the glyph would mean masking with the letter, and
            the letter is live type — the mask would need the outline the
            whole design is deliberately not committing to. So it is gone.
            The gradient already carries a highlight, and a mark being
            written is enough of a moment without a second effect arguing
            with it. */}
        <div className="ink-write">
          <Monogram size={132} />
        </div>

        <h1 className="ink-rise -mt-1 font-display text-[42px] font-bold leading-none text-white">
          Sambramo
          <sup className="ml-1 align-super text-[0.3em] font-semibold text-white/60">®</sup>
        </h1>

        <div className="mt-2.5 flex items-center gap-3">
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-r from-transparent to-gold-400/80" />
          <p className="ink-rise ink-rise-late text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/70">
            {BRAND.categoryLine}
          </p>
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-l from-transparent to-gold-400/80" />
        </div>
      </div>
    </div>
  )
}
