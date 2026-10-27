/**
 * "In the spotlight" (Mohan, 2026-10-27, after District's home): one big
 * celebration card in the middle, the next ones peeking in at the sides,
 * the name and a one-line hook underneath, on a deep band that glows in
 * the colour of the card in front. It moves on its own every few seconds
 * and rests while a finger is on it; tap a card to plan it.
 *
 *   <Spotlight items={[{ id, to, title, hook, badge, art, tone }]} />
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function Spotlight({ title = 'In the spotlight', items }) {
  const track = useRef(null)
  const raf = useRef(0)
  const held = useRef(0)
  const [at, setAt] = useState(0)
  const center = (k, smooth = true) => {
    const el = track.current, c = el?.children[k]
    if (c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => {
    const t = setInterval(() => { if (Date.now() > held.current) center((at + 1) % items.length) }, 3600)
    return () => clearInterval(t)
  }, [at, items.length])
  const onScroll = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const el = track.current
      if (!el) return
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0, d = Infinity
      for (let k = 0; k < el.children.length; k++) {
        const c = el.children[k], dd = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid)
        if (dd < d) { d = dd; best = k }
      }
      setAt(best)
    })
  }
  const hold = () => { held.current = Date.now() + 6000 }
  if (!items.length) return null
  const cur = items[at] ?? items[0]

  return (
    <section className="relative mt-3 overflow-hidden bg-[#150A26] pb-5 pt-5" data-spotlight>
      <div aria-hidden className="pointer-events-none absolute -left-1/4 top-10 h-[62%] w-[150%] opacity-45 blur-[64px] transition-[background] duration-700" style={{ background: cur.tone }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#150A26]/40 via-transparent to-[#150A26]/80" />
      <h2 className="relative px-4 text-[20px] font-black tracking-[-0.03em] text-white">{title}</h2>

      <div ref={track} onScroll={onScroll} onTouchStart={hold} onPointerDown={hold}
        className="cx-noscroll relative mt-3 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-2"
        style={{ '--w': 'min(62vw, 300px)', paddingInline: 'calc(50% - var(--w) / 2)' }} data-spotlight-track>
        {items.map((x, k) => {
          const on = k === at
          return (
            <Link key={x.id} to={x.to} className="block shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out"
              style={{ width: 'var(--w)', transform: on ? 'scale(1)' : 'scale(.86)', opacity: on ? 1 : 0.55 }} aria-label={x.title} data-spotlight-card={x.id}>
              <span className="relative block aspect-[3/4] overflow-hidden rounded-[22px] shadow-[0_26px_50px_-22px_rgba(0,0,0,.9)]" style={{ background: x.tone }}>
                {x.art && <img src={x.art} alt="" loading={k < 3 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_28%]" />}
                <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                {x.badge && <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-extrabold text-white backdrop-blur-md">{x.badge}</span>}
                <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-[11px] bg-black/40 text-white backdrop-blur-md"><ArrowUpRight size={17} /></span>
                <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                  <span className="truncate text-left text-[19px] font-black leading-tight tracking-[-0.03em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]">{x.title}</span>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#1C1033]">Plan it</span>
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="relative mt-3 px-6 text-center">
        <p key={cur.id} className="cx-rise text-[17px] font-black tracking-[-0.02em] text-white">{cur.title}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-white/70">{cur.hook}</p>
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
          {items.map((x, k) => <span key={x.id} className={'h-1.5 rounded-full transition-all duration-300 ' + (k === at ? 'w-4 bg-white' : 'w-1.5 bg-white/35')} />)}
        </div>
      </div>
    </section>
  )
}
