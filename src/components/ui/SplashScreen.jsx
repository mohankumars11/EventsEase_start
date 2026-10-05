import { useEffect, useState } from 'react'
import './SplashScreen.css'

const HOLD_MS = 2300
const FADE_MS = 220
const LETTERS = 'SAMBRAMO'.split('')

export default function SplashScreen() {
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), HOLD_MS)
    const gone = window.setTimeout(() => setDone(true), HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(gone)
    }
  }, [])

  if (done) return null

  return (
    <div className={`splash-ground fixed inset-0 z-[200] flex items-center justify-center ${leaving ? 'splash-is-leaving' : ''}`} role="presentation">
      <div className="splash-wordmark" aria-label="Sambramo">
        {LETTERS.map((letter, index) => (
          <span key={`${letter}-${index}`} style={{ '--i': index }}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  )
}
