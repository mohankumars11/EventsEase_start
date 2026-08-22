import { useState, useEffect } from 'react'
import SambramoWordmark from './SambramoWordmark'
import { BRAND } from '../../config/sambramo'

const SEEN_KEY = 'sambramo_splash_v1'
const HOLD_MS = 1500
const FADE_MS = 420

/**
 * The mark, once, on the first open.
 *
 * ── Why it is gated and not shown every time ──────────────────────────────
 * A splash on every launch is a tax the customer pays forever for something
 * they learned in the first second. Native apps get away with it because
 * theirs covers a cold start that is happening anyway; this one covers
 * nothing — the app behind it is already rendered. So it runs once, keyed in
 * localStorage, and never again on that device.
 *
 * Capacitor's native splash (phase: the APK) hands over to the WebView at a
 * point the web build has no equivalent of, which is the other reason not to
 * put a permanent one here: the two would stack and the customer would watch
 * the logo twice.
 *
 * ── Why it never blocks ───────────────────────────────────────────────────
 * It is an overlay over a mounted, interactive app, not a gate in front of
 * one. If the timer never fires, if the font never loads, if a render throws
 * inside it — the app underneath is already there and a tap dismisses this.
 * A splash that can trap somebody on a logo is worse than no splash.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 * The wipe and the rise both start from an invisible state under `both`, so
 * the class is simply not applied when the preference is set, rather than
 * cancelled — cancelling a `both`-filled animation without restoring its end
 * state is how a screen ends up blank.
 */
export default function SplashScreen() {
  const [state, setState] = useState('checking')   // checking | showing | leaving | done

  useEffect(() => {
    let seen = true
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // Private mode, or storage disabled. Treat as seen: the failure mode
      // for guessing wrong is a splash on every single launch.
      seen = true
    }
    if (seen) { setState('done'); return }

    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* nothing to do */ }
    setState('showing')

    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone  = setTimeout(() => setState('done'),    HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [])

  if (state === 'checking' || state === 'done') return null

  return (
    <div
      role="presentation"
      onClick={() => setState('done')}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-[420ms]"
      style={{ opacity: state === 'leaving' ? 0 : 1 }}
    >
      {/* No background image, no gradient panel. The reference the brand
          supplied sets the mark on a blue field; on a product whose entire
          surface is pure white, a full-bleed blue splash is a door into a
          different app. The colour lives in the mark itself instead. */}
      <SambramoWordmark size={92} layout="stacked" registered />

      <div className="mt-5 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="brand-rule block h-px w-8 rounded-full bg-gradient-to-r from-transparent to-gold-400"
        />
        <p className="brand-wipe text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-royal-800/70">
          {BRAND.categoryLine}
        </p>
        <span
          aria-hidden="true"
          className="block h-px w-8 rounded-full bg-gradient-to-l from-transparent to-gold-400"
        />
      </div>

      <p className="absolute bottom-10 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
        {BRAND.pilotCities.join(' · ')}
      </p>
    </div>
  )
}
