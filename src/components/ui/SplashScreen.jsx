import { useEffect, useState } from 'react'

const HOLD_MS = 2600
const FADE_MS = 360

/**
 * Minimal Sambramo launch screen.
 *
 * The app beneath it is mounted before this overlay appears, so the splash
 * cannot trap the partner. A tap dismisses it immediately; the timer is only
 * the normal cold-open handoff.
 */
export default function SplashScreen() {
  const [state, setState] = useState('showing')

  useEffect(() => {
    const leave = setTimeout(() => setState('leaving'), HOLD_MS)
    const gone = setTimeout(() => setState('done'), HOLD_MS + FADE_MS)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [])

  if (state === 'done') return null

  return (
    <div
      role="presentation"
      data-splash=""
      onClick={() => setState('done')}
      className="splash-ground fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center"
      style={{ opacity: state === 'leaving' ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div className="splash-minimal-lockup">
        <div className="splash-minimal-wordmark" aria-label="Sambramo" role="img">
          SAMBRAMO
        </div>
        <div className="splash-minimal-tagline">
          Event Supply Chain &amp; Logistics App
        </div>
      </div>
    </div>
  )
}
