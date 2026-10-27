/**
 * "In the spotlight" (Mohan, 2026-10-27, after District's home): one big
 * celebration card in the middle, the next ones peeking in at the sides,
 * the name in heavy display type underneath. The stage is a dark aurora
 * panel set INTO the cream page like the other cards — rounded, inset,
 * glowing violet and rose at its corners, tinted by the card in front —
 * so it reads as a highlight of the page, not a stripe across it.
 *
 * Cheap to paint on a budget phone, on purpose: no CSS blur and no
 * backdrop-filter anywhere (a 64 px blur here once starved the GPU enough
 * that the tab bar lost tiles), and only the cards near the middle load
 * their picture. Pictures are the 1024 px originals (art/hd), never a
 * thumbnail stretched.
 *
 *   <Spotlight items={[{ id, to, title, hook, badge, art, tone }]} />
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

const hex = c => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : '#A78BFA')

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
    const t = setInterval(() => { if (Date.now() > held.current) center((at + 1) % items.length) }, 3800)
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
    <section className="bg-[#FFF7EE] px-3 pb-1 pt-4" data-spotlight>
      <div className="relative overflow-hidden rounded-[28px] pb-5 pt-5 shadow-[0_26px_50px_-30px_rgba(28,16,51,.9),0_0_0_1px_rgba(124,58,237,.18)]"
        style={{ background: `radial-gradient(110% 65% at 0% 0%, rgba(124,58,237,.55) 0%, transparent 58%), radial-gradient(90% 55% at 100% 100%, rgba(219,39,119,.42) 0%, transparent 62%), radial-gradient(75% 45% at 50% 52%, ${hex(cur.tone)}38 0%, transparent 72%), linear-gradient(160deg, #1C0B36 0%, #120726 55%, #0A0416 100%)` }}>
        {/* A faint grid and a lit top edge: the "futuristic" stage. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        <div className="relative flex items-end justify-between px-4">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[#C4B5FD]">✦ Handpicked for you</p>
            <h2 className="mt-0.5 text-[22px] leading-none tracking-[-0.02em] text-white" style={{ fontFamily: "'Sambramo Display', 'Archivo Black', 'Manrope', sans-serif" }}>{title}</h2>
          </div>
          <span className="cx-num rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-extrabold text-white/80 ring-1 ring-white/15">{at + 1}/{items.length}</span>
        </div>

        <div ref={track} onScroll={onScroll} onTouchStart={hold} onPointerDown={hold}
          className="cx-noscroll relative mt-3.5 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-2"
          style={{ '--w': 'min(60vw, 280px)', paddingInline: 'calc(50% - var(--w) / 2)' }} data-spotlight-track>
          {items.map((x, k) => {
            const on = k === at
            const near = Math.abs(k - at) <= 2
            return (
              <Link key={x.id} to={x.to} className="block shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out"
                style={{ width: 'var(--w)', transform: on ? 'scale(1)' : 'scale(.86)', opacity: on ? 1 : 0.5 }} aria-label={x.title} data-spotlight-card={x.id}>
                <span className="relative block aspect-[3/4] overflow-hidden rounded-[22px] shadow-[0_24px_44px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/15" style={{ background: x.tone }}>
                  {near && x.art && <img src={x.art} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_28%]" />}
                  <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  {x.badge && <span className="absolute left-3 top-3 rounded-full bg-[#140A24]/75 px-3 py-1.5 text-[12px] font-extrabold text-white ring-1 ring-white/20">{x.badge}</span>}
                  <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-[11px] bg-[#140A24]/65 text-white ring-1 ring-white/20"><ArrowUpRight size={17} /></span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#1C1033] shadow-[0_6px_14px_-6px_rgba(0,0,0,.6)]">Plan it →</span>
                </span>
              </Link>
            )
          })}
        </div>

        <div className="relative mt-3 px-5 text-center">
          <p key={cur.id} className="cx-rise text-[26px] leading-[1.05] tracking-[-0.02em] text-white [text-shadow:0_2px_18px_rgba(167,139,250,.55)]"
            style={{ fontFamily: "'Sambramo Display', 'Archivo Black', 'Manrope', sans-serif" }} data-spotlight-title>{cur.title}</p>
          <p className="mt-1.5 text-[13.5px] font-bold text-white/75">{cur.hook}</p>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {items.map((x, k) => <span key={x.id} className={'h-1.5 rounded-full transition-all duration-300 ' + (k === at ? 'w-5 bg-gradient-to-r from-[#C4B5FD] to-[#F9A8D4]' : 'w-1.5 bg-white/30')} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
