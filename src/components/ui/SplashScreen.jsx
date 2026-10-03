import { useEffect, useState } from 'react'
import './SplashScreen.css'

const HOLD_MS = 3600
const FADE_MS = 420

/**
 * A short, product-led brand reveal: subtle light trails, a soft wordmark
 * entrance, then the partner-only sign-off. The canvas remains Royal Amethyst.
 */
export default function SplashScreen() {
  const [state, setState] = useState('showing')

  useEffect(() => {
    const leave = window.setTimeout(() => setState('leaving'), HOLD_MS)
    const gone = window.setTimeout(() => setState('done'), HOLD_MS + FADE_MS)
    return () => { window.clearTimeout(leave); window.clearTimeout(gone) }
  }, [])

  if (state === 'done') return null

  return (
    <div
      role="presentation"
      data-splash=""
      className={`splash-ground fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center ${state === 'leaving' ? 'splash-is-leaving' : ''}`}
    >
      <div className="splash-atmosphere" aria-hidden="true">
        <span className="splash-orbit splash-orbit-one" />
        <span className="splash-orbit splash-orbit-two" />
        <span className="splash-spark splash-spark-one" />
        <span className="splash-spark splash-spark-two" />
        <span className="splash-spark splash-spark-three" />
        <span className="splash-spark splash-spark-four" />
        <span className="splash-spark splash-spark-five" />
        <span className="splash-spark splash-spark-six" />
      </div>

      <div className="splash-product-lockup">
        <div className="splash-eyebrow">THE EVENT EXPERIENCE, REIMAGINED</div>
        <div className="splash-minimal-wordmark" aria-label="Sambramo" role="img">
          SAMBRAMO
        </div>
        <div className="splash-reveal-line" aria-hidden="true"><span /></div>
        <div className="splash-minimal-tagline">
          EVENT SUPPLY CHAIN &amp; LOGISTICS
        </div>
        <div className="splash-partner-signoff">Made exclusively for partners</div>
      </div>
    </div>
  )
}
