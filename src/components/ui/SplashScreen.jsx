import { useEffect, useRef, useState } from 'react'
import './SplashScreen.css'

const HOLD_MS = 4600
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
    const particles = Array.from({ length: 190 }, (_, i) => ({
      angle: (i / 190) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.16,
      orbit: 0.29 + ((i * 37) % 68) / 100,
      speed: (0.16 + ((i * 19) % 100) / 240) * (i % 3 === 0 ? -1 : 1),
      size: 0.55 + ((i * 13) % 17) / 10,
      phase: (i * 7.13) % (Math.PI * 2),
      hue: i % 5 === 0 ? 48 : i % 3 === 0 ? 292 : 276,
      alpha: 0.28 + ((i * 23) % 65) / 100,
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time) => {
      if (!running) return
      frame = window.requestAnimationFrame(draw)
      if (time - last < 24) return
      last = time
      context.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height * 0.505
      const rx = Math.min(width * 0.49, 430)
      const ry = Math.min(height * 0.315, 285)
      const t = time / 1000

      // Multiple thin, luminous elliptical paths create the circling-light
      // silhouette from the approved reference while particles orbit at speed.
      context.save()
      context.translate(cx, cy)
      context.lineWidth = 1
      for (let ring = 0; ring < 4; ring += 1) {
        context.beginPath()
        context.ellipse(0, 0, rx * (0.78 + ring * 0.085), ry * (0.77 + ring * 0.105), (ring - 1.5) * 0.045, 0, Math.PI * 2)
        context.strokeStyle = `rgba(188, 92, 255, ${0.055 + ring * 0.012})`
        context.stroke()
      }
      context.restore()

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        const a = p.angle + (reducedMotion ? 0 : t * p.speed)
        const wobble = 1 + Math.sin(t * 1.7 + p.phase) * 0.025
        const x = cx + Math.cos(a) * rx * p.orbit * wobble
        const y = cy + Math.sin(a) * ry * p.orbit * wobble
        const pulse = 0.32 + (Math.sin(t * 3.2 + p.phase) + 1) * 0.34
        const alpha = p.alpha * pulse
        const radius = p.size * (0.55 + pulse * 0.75)

        context.beginPath()
        context.fillStyle = `hsla(${p.hue}, 100%, ${p.hue === 48 ? 76 : 72}%, ${alpha})`
        context.shadowColor = p.hue === 48 ? 'rgba(255,205,90,.95)' : 'rgba(228,85,255,.95)'
        context.shadowBlur = radius * 5
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()

        // Occasional comet streaks orbit with their spark, not as static dots.
        if (i % 13 === 0 && !reducedMotion) {
          context.beginPath()
          context.strokeStyle = `hsla(${p.hue}, 100%, 76%, ${alpha * 0.35})`
          context.lineWidth = radius * 0.8
          context.moveTo(x, y)
          context.lineTo(x - Math.sin(a) * 15, y + Math.cos(a) * 9)
          context.stroke()
        }
      }
      context.shadowBlur = 0

      // A few brighter traveling flares add the warm, premium glint.
      for (let i = 0; i < 5; i += 1) {
        const a = t * (0.45 + i * 0.09) + i * 1.256
        const x = cx + Math.cos(a) * rx * (0.83 + (i % 2) * 0.09)
        const y = cy + Math.sin(a) * ry * (0.84 + (i % 2) * 0.1)
        const glow = 0.35 + (Math.sin(t * 2.1 + i) + 1) * 0.45
        const g = context.createRadialGradient(x, y, 0, x, y, 17 + glow * 15)
        g.addColorStop(0, `rgba(255, 245, 220, ${glow})`)
        g.addColorStop(0.16, `rgba(255, 192, 72, ${glow * 0.65})`)
        g.addColorStop(1, 'rgba(255, 160, 40, 0)')
        context.fillStyle = g
        context.beginPath()
        context.arc(x, y, 17 + glow * 15, 0, Math.PI * 2)
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
