/**
 * A scratch card you scratch with your finger (Zepto-style).
 *
 * The reward is rendered underneath; a canvas on top is painted with the
 * cover (amethyst to rose, "Scratch here", a pointing hand, sparkles) and
 * erased wherever the finger goes. When about 45% is cleared the cover
 * fades away, `onReveal` fires and a burst of confetti goes off. A tap on
 * "Tap to reveal" does the same for anyone who prefers not to scratch.
 */
import { useEffect, useRef, useState } from 'react'

export default function ScratchCard({ children, onReveal, className = '' }) {
  const box = useRef(null)
  const cv = useRef(null)
  const [done, setDone] = useState(false)
  const moves = useRef(0)

  useEffect(() => {
    const el = box.current, c = cv.current
    if (!el || !c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = el.clientWidth, h = el.clientHeight
    c.width = w * dpr; c.height = h * dpr
    const g = c.getContext('2d')
    g.scale(dpr, dpr)
    const bg = g.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#6D28D9'); bg.addColorStop(.55, '#9333EA'); bg.addColorStop(1, '#DB2777')
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    /* confetti dots and stars on the cover */
    const marks = ['#F9A8D4', '#C4B5FD', '#FDE68A', '#FFFFFF']
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.35
      g.fillStyle = marks[i % marks.length]
      const x = (i * 97) % w, y = (i * 53) % h
      if (i % 3) { g.beginPath(); g.arc(x, y, 3 + (i % 4), 0, Math.PI * 2); g.fill() } else g.fillRect(x, y, 9, 4)
    }
    g.globalAlpha = 1
    g.fillStyle = 'rgba(255,255,255,.92)'
    g.textAlign = 'center'
    g.font = `italic 800 ${Math.round(w * 0.16)}px "Playfair Display", Georgia, serif`
    g.fillText('Scratch', w / 2, h * 0.42)
    g.font = `900 ${Math.round(w * 0.12)}px Manrope, system-ui, sans-serif`
    g.fillText('HERE', w / 2 + w * 0.12, h * 0.58)
    g.font = `${Math.round(w * 0.16)}px system-ui`
    g.fillText('👆', w * 0.26, h * 0.62)
    g.font = `800 ${Math.round(w * 0.045)}px Manrope, system-ui, sans-serif`
    g.fillStyle = 'rgba(255,255,255,.75)'
    g.fillText('Your welcome gift from Sambramo', w / 2, h * 0.86)
  }, [])

  const reveal = () => { if (done) return; setDone(true); onReveal?.() }
  const scratch = e => {
    if (done || !(e.buttons & 1 || e.pointerType === 'touch')) return
    const c = cv.current, r = c.getBoundingClientRect()
    const g = c.getContext('2d')
    g.globalCompositeOperation = 'destination-out'
    g.beginPath(); g.arc(e.clientX - r.left, e.clientY - r.top, 24, 0, Math.PI * 2); g.fill()
    if (++moves.current % 12 === 0) {
      const { data } = g.getImageData(0, 0, c.width, c.height)
      let clear = 0, n = 0
      for (let i = 3; i < data.length; i += 4 * 37) { n++; if (data[i] === 0) clear++ }
      if (clear / n > 0.45) reveal()
    }
  }

  return (
    <div ref={box} className={'relative overflow-hidden rounded-[26px] shadow-[0_30px_60px_-24px_rgba(0,0,0,.7)] ' + className} data-scratch={done ? 'open' : 'covered'}>
      <div className="absolute inset-0">{children}</div>
      <canvas ref={cv} onPointerDown={scratch} onPointerMove={scratch} className={'absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ' + (done ? 'pointer-events-none opacity-0' : 'opacity-100')} aria-label="Scratch to reveal your reward" />
      {done && <Burst />}
      {!done && <button type="button" onClick={reveal} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-[11.5px] font-extrabold text-white ring-1 ring-white/40" data-reveal>Tap to reveal</button>}
    </div>
  )
}

/* A one-off burst of confetti from the middle of the card. */
function Burst() {
  const C = ['#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#FDE68A']
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 28 }, (_, k) => {
        const a = (k / 28) * Math.PI * 2, d = 90 + (k % 5) * 26
        return <span key={k} className="cx-burst absolute left-1/2 top-1/2 block h-2.5 w-1.5 rounded-[2px]" style={{ background: C[k % C.length], '--x': `${Math.cos(a) * d}px`, '--y': `${Math.sin(a) * d - 30}px`, '--r': `${k * 47}deg`, animationDelay: `${(k % 4) * 0.03}s` }} />
      })}
    </div>
  )
}
