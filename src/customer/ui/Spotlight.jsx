/**
 * "In the spotlight" — built to Mohan's reference (2026-11-14: "the white
 * clean background … exactly like the screenshot … make it Book, we are
 * here to convert the plan into a booking").
 *
 * White page, no panel: a purple kicker and a heavy deep-purple title with
 * a counter pill; one white card in the middle, the next ones peeking in
 * at the sides, faded and smaller; the name in display type under it, the
 * one-line hook in grey, a solid purple "Book now", and the dots.
 *
 * Cheap to paint on a budget phone: no blur, no backdrop-filter, and only
 * the cards near the middle load their picture (1024 px originals).
 *
 *   <Spotlight items={[{ id, to, title, hook, badge, art, tone }]} />
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronRight } from 'lucide-react'

const DISPLAY = { fontFamily: "'Sambramo Display', 'Archivo Black', 'Manrope', sans-serif" }

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
    <section className="bg-white pb-2 pt-5" data-spotlight>
      <div className="flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#6D28D9]">Handpicked for you</p>
          <h2 className="mt-1 text-[27px] leading-none tracking-[-0.025em] text-[#2E1065]" style={DISPLAY}>{title}</h2>
        </div>
        <span className="cx-num shrink-0 rounded-full bg-[#EFE7FF] px-3.5 py-1.5 text-[14px] font-extrabold text-[#2E1065]" data-spotlight-count>{at + 1}/{items.length}</span>
      </div>

      <div ref={track} onScroll={onScroll} onTouchStart={hold} onPointerDown={hold}
        className="cx-noscroll mt-4 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-3"
        style={{ '--w': 'min(58vw, 280px)', paddingInline: 'calc(50% - var(--w) / 2)' }} data-spotlight-track>
        {items.map((x, k) => {
          const on = k === at
          const near = Math.abs(k - at) <= 2
          return (
            <Link key={x.id} to={x.to} className="block shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out"
              style={{ width: 'var(--w)', transform: on ? 'scale(1)' : 'scale(.86)', opacity: on ? 1 : 0.55 }} aria-label={x.title} data-spotlight-card={x.id}>
              <span className="relative block aspect-[3/4] overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#ECE6F6,0_22px_40px_-24px_rgba(46,16,101,.45)]">
                {near && x.art && <img src={x.art} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_28%]" />}
                {x.badge && <span className="absolute left-3 top-3 rounded-full bg-[#2A1F3D]/75 px-3.5 py-1.5 text-[13px] font-extrabold text-white">{x.badge}</span>}
                <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-[12px] bg-[#2A1F3D]/70 text-white"><ArrowUpRight size={19} strokeWidth={2.4} /></span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-3 px-5 text-center">
        <p key={cur.id} className="cx-rise text-[30px] leading-[1.05] tracking-[-0.02em] text-[#2E1065]" style={DISPLAY} data-spotlight-title>{cur.title}</p>
        <p className="mt-2 text-[15px] font-semibold text-[#6B6480]">{cur.hook}</p>
        {/* Book, not plan (Mohan, 2026-11-14): the tap opens the occasion and books it. */}
        <Link to={cur.to} className="cx-press mx-auto mt-4 flex h-[52px] w-fit items-center gap-2 rounded-full bg-gradient-to-r from-[#5B21B6] to-[#6D28D9] px-8 text-[17px] font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(91,33,182,.9)]" data-spotlight-book>
          Book now<ChevronRight size={19} strokeWidth={3} />
        </Link>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {items.map((x, k) => <span key={x.id} className={'h-2 rounded-full transition-all duration-300 ' + (k === at ? 'w-7 bg-[#5B21B6]' : 'w-2 bg-[#C9C2D6]')} />)}
        </div>
      </div>
    </section>
  )
}
