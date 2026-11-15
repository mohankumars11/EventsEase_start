/**
 * A scratch card that scratches itself (Mohan, 2026-10-28: "the hand
 * should move here and there instead of the person doing it").
 *
 * The reward is rendered underneath; a canvas on top is painted as
 * holographic foil — deep plum, iridescent bands, a fine grain, the
 * SAMBRAMO wordmark — with a band of light that keeps sweeping across it.
 * After a beat, a glowing hand zig-zags over the card and erases the foil
 * as it goes; a finger can scratch too, at any time. When about 45% is
 * clear the foil fades, `onReveal` fires and confetti bursts. "Tap to
 * reveal" stays for anyone in a hurry; with reduced motion the hand does
 * not run.
 */
import { useEffect, useRef, useState } from 'react'
import Twinkle from './Twinkle'

export default function ScratchCard({ children, onReveal, className = '', auto = true }) {
  const box = useRef(null)
  const cv = useRef(null)
  const hand = useRef(null)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const moves = useRef(0)

  const reveal = () => { if (doneRef.current) return; doneRef.current = true; setDone(true); onReveal?.() }
  const cleared = () => {
    const c = cv.current, g = c.getContext('2d')
    const { data } = g.getImageData(0, 0, c.width, c.height)
    let clear = 0, n = 0
    for (let i = 3; i < data.length; i += 4 * 37) { n++; if (data[i] === 0) clear++ }
    return clear / n
  }
  const erase = (x, y, r) => {
    const g = cv.current.getContext('2d')
    g.globalCompositeOperation = 'destination-out'
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  }

  /* The foil */
  useEffect(() => {
    const el = box.current, c = cv.current
    if (!el || !c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = el.clientWidth, h = el.clientHeight
    c.width = w * dpr; c.height = h * dpr
    const g = c.getContext('2d')
    g.scale(dpr, dpr)
    const base = g.createLinearGradient(0, 0, w, h)
    base.addColorStop(0, '#1B0B33'); base.addColorStop(0.5, '#3B1670'); base.addColorStop(1, '#5B21A8')
    g.fillStyle = base; g.fillRect(0, 0, w, h)
    /* iridescent bands, laid diagonally */
    const bands = [['rgba(124,240,192,.30)', 0.18], ['rgba(255,194,75,.26)', 0.42], ['rgba(244,114,182,.30)', 0.64], ['rgba(167,139,250,.34)', 0.86]]
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.translate(-w, -h)
    for (const [col, at] of bands) {
      const y = at * h * 2, lg = g.createLinearGradient(0, y - h * 0.22, 0, y + h * 0.22)
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, col); lg.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = lg; g.fillRect(0, y - h * 0.22, w * 2, h * 0.44)
    }
    g.restore()
    /* grain */
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${(i % 7) * 0.012})`
      g.fillRect((i * 73.3) % w, (i * 37.7) % h, 1.2, 1.2)
    }
    /* sparkles */
    g.fillStyle = 'rgba(255,255,255,.85)'
    for (const [fx, fy, s] of [[0.14, 0.16, 5], [0.86, 0.22, 4], [0.78, 0.78, 6], [0.2, 0.82, 3.5], [0.52, 0.12, 3]]) {
      const x = fx * w, y = fy * h
      g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y - s * 0.5); g.lineTo(x + s * 2, y); g.lineTo(x + s * 0.5, y + s * 0.5)
      g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.5, y + s * 0.5); g.lineTo(x - s * 2, y); g.lineTo(x - s * 0.5, y - s * 0.5); g.closePath(); g.fill()
    }
    g.textAlign = 'center'
    /* the wordmark exactly as the splash sets it: Manrope 900, 0.06em */
    const wf = Math.round(w * 0.06)
    g.fillStyle = 'rgba(255,255,255,.82)'
    g.font = `900 ${wf}px Manrope, system-ui, sans-serif`
    if ('letterSpacing' in g) g.letterSpacing = `${(wf * 0.06).toFixed(1)}px`
    g.fillText('SAMBRAMO', w / 2, h * 0.2)
    const tg = g.createLinearGradient(w * 0.2, 0, w * 0.8, 0)
    tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.5, '#FDE68A'); tg.addColorStop(1, '#F9A8D4')
    g.fillStyle = tg
    if ('letterSpacing' in g) g.letterSpacing = '0px'
    g.font = `900 ${Math.round(w * 0.15)}px Manrope, system-ui, sans-serif`
    g.fillText('SCRATCH', w / 2, h * 0.54)
    g.fillStyle = 'rgba(255,255,255,.78)'
    g.font = `800 ${Math.round(w * 0.045)}px Manrope, system-ui, sans-serif`
    g.fillText('A welcome gift is hiding here', w / 2, h * 0.66)
  }, [])

  /* The hand that scratches by itself */
  useEffect(() => {
    if (!auto) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const el = box.current, hd = hand.current
    if (!el || !hd) return
    const w = el.clientWidth, h = el.clientHeight
    /* here and there: a zig-zag down the card, then a loop back up through the middle */
    const pts = [[0.18, 0.24], [0.82, 0.3], [0.2, 0.42], [0.84, 0.5], [0.16, 0.6], [0.8, 0.7], [0.24, 0.82], [0.7, 0.86], [0.5, 0.52], [0.3, 0.3], [0.68, 0.2]]
      .map(([x, y]) => [x * w, y * h])
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
    const len = seg.reduce((a, b) => a + b, 0)
    /* slow enough to enjoy: ~3.4 s of hand, and it uncovers most of the card before it lifts */
    const dur = 3400, startAt = 600, r = Math.max(20, w * 0.085)
    let raf = 0, t0 = 0, last = null, checks = 0
    const at = d => {
      let i = 0
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++ }
      const f = Math.min(1, d / seg[i]), a = pts[i], b = pts[i + 1]
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    }
    const step = now => {
      if (doneRef.current) { hd.style.opacity = '0'; return }
      if (!t0) t0 = now
      const e = now - t0 - startAt
      if (e < 0) { raf = requestAnimationFrame(step); return }
      const k = Math.min(1, e / dur), ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      const [x, y] = at(ease * len)
      hd.style.opacity = '1'
      hd.style.transform = `translate(${x - 18}px, ${y - 6}px) rotate(${Math.sin(e / 140) * 12}deg)`
      /* a continuous stroke: fill the gap since the last frame */
      if (last) { const steps = Math.ceil(Math.hypot(x - last[0], y - last[1]) / (r * 0.4)); for (let s = 1; s <= steps; s++) erase(last[0] + ((x - last[0]) * s) / steps, last[1] + ((y - last[1]) * s) / steps, r) }
      else erase(x, y, r)
      last = [x, y]
      if (++checks % 10 === 0 && cleared() > 0.7) { reveal(); hd.style.opacity = '0'; return }
      if (k < 1) raf = requestAnimationFrame(step)
      else { hd.style.opacity = '0'; reveal() }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  const scratch = e => {
    if (doneRef.current || !(e.buttons & 1 || e.pointerType === 'touch')) return
    const r = cv.current.getBoundingClientRect()
    erase(e.clientX - r.left, e.clientY - r.top, 24)
    if (++moves.current % 12 === 0 && cleared() > 0.45) reveal()
  }

  return (
    <div ref={box} className={'relative overflow-hidden rounded-[26px] shadow-[0_30px_60px_-24px_rgba(27,11,51,.85)] ' + className} data-scratch={done ? 'open' : 'covered'}>
      <div className="absolute inset-0">{children}</div>
      <canvas ref={cv} onPointerDown={scratch} onPointerMove={scratch} className={'absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ' + (done ? 'pointer-events-none opacity-0' : 'opacity-100')} aria-label="Scratch to reveal your reward" />
      {!done && <Twinkle color="#F9A8D4" accent="#FDE68A" />}
      {!done && <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><span className="cx-foil-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" /></span>}
      <span ref={hand} aria-hidden className="pointer-events-none absolute left-0 top-0 z-[2] opacity-0 transition-opacity duration-200" style={{ willChange: 'transform' }}>
        <span className="relative block text-[36px] leading-none drop-shadow-[0_6px_10px_rgba(0,0,0,.45)]">
          <span className="absolute -left-2 -top-2 h-[52px] w-[52px] rounded-full bg-[#FDE68A]/30 blur-[10px]" />
          <span className="relative">👆</span>
        </span>
      </span>
      {done && <Burst />}
      {!done && <button type="button" onClick={reveal} className="absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-extrabold text-white ring-1 ring-white/35" data-reveal>Tap to reveal</button>}
    </div>
  )
}

/* A one-off burst of confetti from the middle of the card. */
function Burst() {
  const C = ['#F43F5E', '#F59E0B', '#22C55E', '#A855F7', '#EC4899', '#FDE68A', '#7CF0C0']
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 28 }, (_, k) => {
        const a = (k / 28) * Math.PI * 2, d = 90 + (k % 5) * 26
        return <span key={k} className="cx-burst absolute left-1/2 top-1/2 block h-2.5 w-1.5 rounded-[2px]" style={{ background: C[k % C.length], '--x': `${Math.cos(a) * d}px`, '--y': `${Math.sin(a) * d - 30}px`, '--r': `${k * 47}deg`, animationDelay: `${(k % 4) * 0.03}s` }} />
      })}
    </div>
  )
}
