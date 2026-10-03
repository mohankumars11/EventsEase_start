import { useEffect, useState } from 'react'
import './SplashScreen.css'

const HOLD_MS = 2400
const FADE_MS = 420

/**
 * Animated Sambramo launch lockup.
 * The brand stays on a flat Royal Amethyst ground; motion is carried by the
 * supplied bundled display face and a restrained wordmark/tagline entrance.
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
      className="splash-ground fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center"
      style={{ opacity: state === 'leaving' ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div className="splash-minimal-lockup">
        <div className="splash-minimal-wordmark" aria-label="Sambramo" role="img">
          SAMBRAMO
        </div>
        <div className="splash-minimal-tagline">
          EVENT SUPPLY CHAIN &amp; LOGISTICS
        </div>
      </div>
    </div>
  )
}
