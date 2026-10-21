/**
 * The splash, frozen at a chosen moment.
 *
 * `?at=` is milliseconds into the animation. A splash is a sequence, so
 * a single screenshot of it proves almost nothing — the interesting
 * question is what is on screen at 400ms (letters mid-flight), at
 * 1000ms (tagline arriving) and at 1500ms (everything, loader up).
 * negative animation-delay seeks each element to that point.
 */
import React from 'react'
import SplashScreen from '../../src/components/ui/SplashScreen'

const at = Number(new URLSearchParams(window.location.search).get('at') ?? 1600)

/* Seek every animation on the page to `at` milliseconds. */
const seek = () => {
  for (const el of document.querySelectorAll('.app-splash-wordmark span, .app-splash-tagline, .app-splash-loader, .app-splash-ring')) {
    const cs = getComputedStyle(el)
    const delay = parseFloat(cs.animationDelay) * (cs.animationDelay.includes('ms') ? 1 : 1000)
    el.style.animationDelay = `${-(at - (Number.isFinite(delay) ? delay : 0)) - (Number.isFinite(delay) ? 0 : 0)}ms`
    el.style.animationPlayState = 'paused'
  }
}

export default function Scene() {
  React.useEffect(() => {
    const t = setTimeout(seek, 150)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ position: 'relative', width: 430, height: 820, margin: '0 auto', overflow: 'hidden' }}>
      <SplashScreen />
      <p data-ready style={{ position: 'absolute', bottom: 2, left: 6, font: '700 10px system-ui', color: 'rgba(255,255,255,.5)' }}>
        t = {at}ms
      </p>
    </div>
  )
}
