import { useState, useEffect } from 'react'
import { Monogram } from './SambramoWordmark'
import { BRAND } from '../../config/sambramo'

const SEEN_KEY = 'sambramo_splash_v2'
const HOLD_MS = 3000
const FADE_MS = 480

/**
 * The mark, written, on the first open.
 *
 * ── The choreography ──────────────────────────────────────────────────────
 * Three seconds, and every one of them is doing something. A splash that
 * simply holds a static logo for three seconds is three seconds of nothing;
 * a splash that spends them assembling the mark is the brand introducing
 * itself, and it is the reason a script monogram is worth having at all.
 *
 *   0.18s  the S begins to arrive, top to bottom — the direction a
 *          Spencerian capital is actually written
 *   1.15s  the letter is complete; the wordmark rises under it
 *   1.25s  the light travels across the gilding, once
 *   1.50s  the category line
 *   1.62s  the rule opens outward from the centre
 *   3.00s  hold ends, 0.48s fade
 *
 * ── Navy, per the reference ───────────────────────────────────────────────
 * The app is pure white everywhere else and this is the one screen that is
 * not, deliberately: the reference sets the mark on deep blue, a splash is
 * the one moment a brand is allowed to be only itself, and coming out of it
 * into white makes the app feel like it opened rather than like it was
 * already there. It runs once per device, so the cost is paid once.
 *
 * ── Why it can never trap anyone ──────────────────────────────────────────
 * It is an overlay over a mounted, interactive app rather than a gate in
 * front of one. If the timer never fires, if the font never loads, if
 * something throws inside it — the app underneath is already rendered, and a
 * tap dismisses this. Three seconds is long enough that a tap-out matters.
 *
 * Gated in localStorage under a v2 key: v1 shipped with a different splash,
 * and somebody who saw that one has not seen this.
 */
/* ── One decision per page load, not one per mount ────────────────────────
 * The obvious implementation reads localStorage on mount and writes the flag
 * in the same breath. Under StrictMode that is broken: React deliberately
 * runs the effect twice in development, so the first pass writes "seen" and
 * the second pass reads it back and skips — the splash never appears in dev,
 * appears in production, and the difference is invisible until somebody
 * screenshots it.
 *
 * Holding the decision in a module variable makes the component idempotent:
 * the second mount, and any remount after it, get the same answer as the
 * first. The flag is persisted when the splash has actually finished rather
 * than when it starts, so a cold open that is killed at 0.4s shows it again
 * next time — which is the behaviour somebody would expect from a splash
 * they never saw.
 */
let decision = null   // null = not yet decided this page load

export default function SplashScreen() {
  const [state, setState] = useState('checking')   // checking | showing | leaving | done

  useEffect(() => {
    if (decision === null) {
      try {
        decision = localStorage.getItem(SEEN_KEY) === '1' ? 'skip' : 'show'
      } catch {
        // Private mode or storage disabled. Skip — the failure mode for
        // guessing wrong is a three-second splash on every single launch.
        decision = 'skip'
      }
    }
    if (decision === 'skip') { setState('done'); return }

    setState('showing')

    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone  = setTimeout(() => {
      setState('done')
      decision = 'skip'
      try { localStorage.setItem(SEEN_KEY, '1') } catch { /* nothing to do */ }
    }, HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [])

  function dismiss() {
    setState('done')
    decision = 'skip'
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* nothing to do */ }
  }

  if (state === 'checking' || state === 'done') return null

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

        <h1 className="ink-rise mt-1 font-display text-[42px] font-bold leading-none text-white">
          Sambramo
          <sup className="ml-1 align-super text-[0.3em] font-semibold text-white/60">®</sup>
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-r from-transparent to-gold-400/80" />
          <p className="ink-rise ink-rise-late text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/70">
            {BRAND.categoryLine}
          </p>
          <span aria-hidden="true" className="ink-rule block h-px w-9 rounded-full bg-gradient-to-l from-transparent to-gold-400/80" />
        </div>
      </div>

      <p className="absolute bottom-10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
        {BRAND.pilotCities.join(' · ')}
      </p>
    </div>
  )
}
