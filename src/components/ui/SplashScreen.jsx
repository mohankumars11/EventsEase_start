import { useState, useEffect } from 'react'
import { BRAND } from '../../config/sambramo'

/* Four and a half seconds.
 *
 * The owner's call, and longer than the platform advises: the guidance is
 * under 1.5s with no artificial timer, and the cost is roughly 8% more
 * first-open abandonment per additional second. Recorded here so the
 * number stays a decision rather than an accident.
 *
 * The composition finishes at about 3.2s, which leaves 1.3s of stillness
 * on the completed screen. That beat is the reason for the length: an
 * animation that ends at the instant the screen leaves reads as a glitch.
 *
 * Both surfaces are the same. A partner watching a shorter cut of the same
 * screen would only look like a bug. */
const HOLD_MS = 4500
const FADE_MS = 520

const WORD = 'Sambramo'
const TAGLINE = 'EVENT DELIVERY APP'

/**
 * The launch screen: live type over the illustration, on every cold open.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE TEXT IS NOT PART OF THE PICTURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * brand/splash-source.png arrives with the wordmark, the category line and
 * both promise lines baked into it. Shipping that whole image was the first
 * version of this screen and it had three problems that no amount of
 * compression fixes:
 *
 *   It could not move. A single flat export reads exactly like what it is,
 *   which is a picture somebody pasted in front of the app.
 *
 *   It could not fit. Baked type is one size. On a 320px handset the trade
 *   labels were four pixels tall; on a tablet the whole thing floated.
 *
 *   It could not be corrected. Changing a word meant re-rendering the
 *   artwork, which is not something this repository can do.
 *
 * So scripts/render-splash-art.mjs crops the source to the illustration
 * alone and the four lines are set here, in the app's own face, sized
 * against the viewport, and animated in. See `.splash-mark` in index.css
 * for the arithmetic that makes the word span 86% of any screen.
 *
 * ── Why one span per letter ─────────────────────────────────────────
 * The stagger is the animation. Eight letters rising 45ms apart reads as a
 * word being set; the same word fading in as one block reads as an image
 * finishing its download, which is the impression this screen exists to
 * avoid. aria-label carries the real word so a screen reader says
 * "Sambramo" rather than spelling out eight capitals.
 *
 * ── Why it can never trap anyone ────────────────────────────────────
 * It is an overlay over a mounted, interactive app rather than a gate in
 * front of one. If a timer never fires, if the artwork 404s, if something
 * throws inside it, the app underneath is already rendered and a tap
 * dismisses it. Four and a half seconds on every launch is a brand moment
 * only for as long as it stays skippable.
 */
export default function SplashScreen() {
  const [state, setState] = useState('showing')

  useEffect(() => {
    // Without this guard the timers would drag a splash that never showed
    // back onto the screen, seconds in: `done` is terminal for the render
    // but not for a setTimeout already scheduled.
    if (state === 'done') return
    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone  = setTimeout(() => setState('done'),    HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
    // Deliberately mount-only. `state` is read once to decide whether the
    // timers are needed; re-running on every transition would restart the
    // hold each time it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = () => setState('done')
  if (state === 'done') return null

  return (
    <div
      role="presentation"
      onClick={dismiss}
      /* data-splash, not a colour class. Six QA scripts used to find this
         element by `.brand-aqua`, which broke the moment the brand changed
         colour -- and it has. */
      data-splash=""
      className="splash-ground fixed inset-0 z-[200] flex flex-col items-center justify-center gap-[3vh] overflow-hidden px-5 py-[4vh] transition-opacity"
      style={{ opacity: state === 'leaving' ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      {/* The lockup. `relative` so the shine can sit over exactly this and
          not over the illustration, which does not want a highlight
          sweeping across it. */}
      <div className="relative">
        {/* Wordmark and category line are SIBLINGS inside the lockup, not
            parent and child -- see the note on `.splash-lockup`. */}
        <div className="splash-lockup">
          <div className="splash-mark" aria-label={BRAND.name} role="img">
            {[...WORD].map((ch, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${120 + i * 45}ms` }}>
                {ch.toUpperCase()}
              </span>
            ))}
          </div>
          <div className="splash-tagline" aria-label={TAGLINE} role="img">
            {[...TAGLINE].map((ch, i) =>
              ch === ' '
                ? <span key={i} className="sp" aria-hidden="true" />
                : <span key={i} aria-hidden="true">{ch}</span>
            )}
          </div>
        </div>
        <span aria-hidden="true" className="splash-shine" />
      </div>

      <img
        src="/splash/splash-art-720.webp"
        srcSet="/splash/splash-art-720.webp 720w, /splash/splash-art-1080.webp 1080w, /splash/splash-art-1440.webp 1440w"
        sizes="100vw"
        alt=""
        /* eager and high: this is the only thing on the screen, and every
           millisecond it is late is a millisecond of empty purple. */
        loading="eager"
        fetchpriority="high"
        decoding="sync"
        draggable="false"
        className="splash-art select-none"
      />

      <div className="flex flex-col items-center gap-[0.35em] text-center">
        <p className="splash-promise-1 text-[clamp(0.95rem,4.4vw,1.4rem)] font-semibold text-white/95">
          You Pick the Occasion.
        </p>
        <p className="splash-promise-2 text-[clamp(1.05rem,5vw,1.6rem)] font-extrabold text-[#F5C24C]">
          We Deliver the Celebration.
        </p>
        <span aria-hidden="true" className="splash-rule mt-[0.5em] flex items-center gap-2 text-[#F5C24C]">
          <i className="block h-px w-10 bg-gradient-to-r from-transparent to-[#F5C24C]/55" />
          <i className="text-[0.7em] not-italic">&#9829;</i>
          <i className="block h-px w-10 bg-gradient-to-l from-transparent to-[#F5C24C]/55" />
        </span>
      </div>
    </div>
  )
}
