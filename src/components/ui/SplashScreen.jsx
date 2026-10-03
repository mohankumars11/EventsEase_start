import { useEffect, useRef, useState } from 'react'
import './SplashScreen.css'

const HOLD_MS = 5000
const FADE_MS = 420

function SparkField({ reducedMotion = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return undefined

    let frame = 0
    let width = 0
    let height = 0
    let dpr = 1
    let last = 0
    let running = true
    const particles = Array.from({ length: 250 }, (_, i) => ({
      angle: (i / 250) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.13,
      orbit: 0.57 + ((i * 37) % 42) / 100,
      speed: (0.19 + ((i * 19) % 100) / 210) * (i % 3 === 0 ? -1 : 1),
      size: 0.45 + ((i * 13) % 15) / 10,
      phase: (i * 7.13) % (Math.PI * 2),
      hue: i % 6 === 0 ? 45 : i % 3 === 0 ? 288 : 275,
      alpha: 0.38 + ((i * 23) % 55) / 100,
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      // Higher backing resolution keeps particle cores and orbital strokes crisp on
      // modern high-density Android displays while capping GPU/memory cost.
      dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time) => {
      if (!running) return
      frame = window.requestAnimationFrame(draw)
      if (time - last < 30) return
      last = time
      context.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height * 0.49
      const rx = Math.min(width * 0.51, 440)
      const ry = Math.min(height * 0.30, 330)
      const t = time / 1000

      // Clean, precise concentric orbital paths: a crisp hairline plus a
      // restrained colored edge, rather than a broad blurry ring.
      context.save()
      context.translate(cx, cy)
      for (let ring = 0; ring < 5; ring += 1) {
        const scaleX = 0.72 + ring * 0.075
        const scaleY = 0.72 + ring * 0.075
        const tilt = (ring - 2) * 0.035
        context.beginPath()
        context.ellipse(0, 0, rx * scaleX, ry * scaleY, tilt, 0, Math.PI * 2)
        context.lineWidth = ring === 2 ? 1.35 : 0.8
        context.strokeStyle = ring === 2
          ? 'rgba(210,142,255,.25)'
          : `rgba(191,117,255,${0.075 + ring * 0.012})`
        context.stroke()
      }
      context.restore()

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        const a = p.angle + (reducedMotion ? 0 : t * p.speed)
        const breathing = 1 + Math.sin(t * 1.15 + p.phase) * 0.035
        const x = cx + Math.cos(a) * rx * p.orbit * breathing
        const y = cy + Math.sin(a) * ry * p.orbit * breathing
        const pulse = 0.38 + (Math.sin(t * 2.6 + p.phase) + 1) * 0.29
        const radius = p.size * (0.55 + pulse * 0.62)
        const gold = p.hue === 45

        // Subtle halo, then a sharp bright core for a polished glass-like spark.
        context.beginPath()
        context.fillStyle = gold ? `rgba(255,190,68,${pulse * .18})` : `rgba(218,112,255,${pulse * .17})`
        context.arc(x, y, radius * 4.2, 0, Math.PI * 2)
        context.fill()
        context.beginPath()
        context.fillStyle = gold ? `rgba(255,226,151,${p.alpha * pulse})` : `rgba(249,222,255,${p.alpha * pulse})`
        context.arc(x, y, Math.max(.65, radius * .52), 0, Math.PI * 2)
        context.fill()

        if (i % 17 === 0 && !reducedMotion) {
          const tail = 10 + (i % 5) * 3
          const grad = context.createLinearGradient(x, y, x - Math.sin(a) * tail, y + Math.cos(a) * tail * .58)
          grad.addColorStop(0, gold ? 'rgba(255,216,128,.7)' : 'rgba(240,174,255,.68)')
          grad.addColorStop(1, 'rgba(218,100,255,0)')
          context.strokeStyle = grad
          context.lineWidth = 0.8
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(x - Math.sin(a) * tail, y + Math.cos(a) * tail * .58)
          context.stroke()
        }
      }

      // Five traveling specular flares follow the orbital geometry.
      for (let i = 0; i < 5; i += 1) {
        const a = t * (0.38 + i * 0.075) + i * 1.256
        const x = cx + Math.cos(a) * rx * (0.81 + (i % 2) * 0.1)
        const y = cy + Math.sin(a) * ry * (0.81 + (i % 2) * 0.1)
        const pulse = 0.5 + (Math.sin(t * 1.8 + i * 1.7) + 1) * 0.25
        const radius = 11 + pulse * 13
        const g = context.createRadialGradient(x, y, 0, x, y, radius)
        g.addColorStop(0, `rgba(255,255,240,${pulse})`)
        g.addColorStop(0.12, `rgba(255,211,111,${pulse * .65})`)
        g.addColorStop(0.42, `rgba(237,99,255,${pulse * .14})`)
        g.addColorStop(1, 'rgba(225,90,255,0)')
        context.fillStyle = g
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = 'rgba(255,255,255,.94)'
        context.beginPath()
        context.arc(x, y, 1.5, 0, Math.PI * 2)
        context.fill()
      }
    }

    resize()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    observer?.observe(canvas)
    if (!reducedMotion) frame = window.requestAnimationFrame(draw)
    else draw(0)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className="splash-particle-canvas" aria-hidden="true" />
}

export default function SplashScreen() {
  const [state, setState] = useState('showing')
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener?.('change', sync)
    const leave = window.setTimeout(() => setState('leaving'), HOLD_MS)
    const gone = window.setTimeout(() => setState('done'), HOLD_MS + FADE_MS)
    return () => {
      media.removeEventListener?.('change', sync)
      window.clearTimeout(leave)
      window.clearTimeout(gone)
    }
  }, [])

  if (state === 'done') return null

  return (
    <div
      role="presentation"
      data-splash=""
      className={`splash-ground fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center ${state === 'leaving' ? 'splash-is-leaving' : ''}`}
    >
      <div className="splash-atmosphere" aria-hidden="true">
        <div className="splash-horizon-glow" />
        <SparkField reducedMotion={reducedMotion} />
      </div>

      <div className="splash-product-lockup">
        <div className="splash-minimal-wordmark" aria-label="Sambramo" role="img">
          SAMBRAMO
        </div>
        <div className="splash-reveal-line" aria-hidden="true"><span /></div>
        <div className="splash-minimal-tagline">
          EVENT SUPPLY CHAIN &amp; LOGISTICS APP
        </div>
      </div>

      <div className="splash-partner-signoff">
        <span>MADE EXCLUSIVELY</span>
        <strong>FOR PARTNERS</strong>
        <i aria-hidden="true" />
      </div>
    </div>
  )
}
