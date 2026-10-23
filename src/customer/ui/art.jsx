/**
 * The illustrated cards: one size and one anatomy for categories,
 * occasions and services, on every screen (Mohan, 2026-10-23: "have a
 * consistent size of the card… everywhere").
 *
 *   ┌───────────────┐  the 3D art, untouched — the frame is wider than
 *   │   3D art      │  tall and anchored near the top, so only the white
 *   │               │  fade at the bottom of the square is trimmed
 *   ├───────────────┤
 *   │ Title, 2 lines│  amethyst ink
 *   │ ◦ Haldi →     │  a live line: a category's occasions pop in turn
 *   └───────────── ›┘
 *
 * The art is generated on pure white, so the card is white and the
 * image multiplies onto whatever ground it sits on. Until a picture is
 * generated, the slot shows that trade's 3D pictogram on a soft tone.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Plus } from 'lucide-react'
import { categoryArt, occasionArt, serviceArt } from '../data/art'
import { TRADE } from '../data/trades'

export function ArtFill({ art, tone = '#F3EDFF', className = '', inset = '14%', position = '50% 18%' }) {
  return (
    <div className={'relative overflow-hidden ' + className} style={{ background: art?.kind === 'art' && tone !== 'transparent' ? '#fff' : tone }}>
      {art?.src && (art.kind === 'art'
        ? <img src={art.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" style={{ objectPosition: position }} />
        : <span className="absolute" style={{ inset }}><img src={art.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(43,14,102,.18)]" /></span>)}
    </div>
  )
}

/** One line that changes on its own: each item pops in, holds, gives way. */
export function Rotator({ items, every = 2600, delay = 0, className = '', wrap = false }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    let iv
    const t = setTimeout(() => { setI(n => (n + 1) % items.length); iv = setInterval(() => setI(n => (n + 1) % items.length), every) }, every + delay)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [items.length, every, delay])
  return <span key={i} className={'cx-rise ' + (wrap ? 'line-clamp-2 ' : 'block truncate ') + className}>{items[i]}</span>
}

function Card({ to, art, tone, title, children, data }) {
  return (
    <Link to={to} className="cx-press cx-art-card relative flex flex-col overflow-hidden rounded-[20px]" {...data}>
      <div className="relative">
        <ArtFill art={art} tone={tone} className="aspect-[1.25/1]" inset="12%" />
        <span className="absolute bottom-1.5 right-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white/95 text-[var(--am-ink)] shadow-[0_4px_10px_-4px_rgba(58,18,144,.55)]"><ChevronRight size={14} strokeWidth={2.6} /></span>
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-1.5">
        <p className="line-clamp-2 min-h-[30px] break-words text-[12.5px] font-extrabold leading-[1.18] tracking-[-0.02em] text-[var(--am-ink)]">{title}</p>
        <div className="mt-0.5 min-h-[26px] text-[10.5px] font-bold leading-[1.25] text-[var(--ink-3)]">{children}</div>
      </div>
    </Link>
  )
}

/** A category: its occasions take turns in the live line. */
export function CategoryCard({ category, index = 0 }) {
  const names = (category.occasions ?? category.events ?? []).map(o => o.name)
  return (
    <Card to={`/c/${category.id}`} art={categoryArt(category)} tone={category.tone} title={category.short} data={{ 'data-category': category.id }}>
      <span className="flex items-start gap-1"><span className="mt-[4px] h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--ok)]" /><Rotator items={names} delay={index * 380} wrap className="text-[var(--ink-2)]" /></span>
    </Card>
  )
}

export function OccasionCard({ occasion }) {
  return (
    <Card to={`/o/${occasion.id}`} art={occasionArt(occasion)} tone={occasion.tone} title={occasion.name} data={{ 'data-occasion': occasion.id }}>
      <span className="line-clamp-2">{occasion.must.length + occasion.often.length} services · book now</span>
    </Card>
  )
}

export function ServiceCard({ tradeId, to = `/s/${tradeId}` }) {
  const t = TRADE[tradeId]
  return (
    <Card to={to} art={serviceArt(tradeId)} tone="#F6F1FF" title={t.label} data={{ 'data-trade': tradeId }}>
      <span className="line-clamp-2">{t.why}</span>
    </Card>
  )
}

/** An add-on: a square to tap, the + riding its corner. */
export function AddOnCard({ tradeId, why, on, onToggle }) {
  const t = TRADE[tradeId]
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} className={'cx-press cx-art-card relative block overflow-hidden rounded-[20px] text-left transition ' + (on ? 'ring-2 ring-[var(--brand)]' : '')} data-addon={tradeId} data-on={on}>
      <ArtFill art={serviceArt(tradeId)} className="aspect-[1.25/1]" tone="#F6F1FF" />
      <span className={'absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full shadow-[0_6px_14px_-8px_rgba(58,18,144,.8)] transition ' + (on ? 'cx-pop bg-[var(--brand-deep)] text-white' : 'bg-white text-[var(--am-ink)] ring-1 ring-[var(--am-300)]')}>
        {on ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
      </span>
      <div className="px-2.5 pb-2.5 pt-1.5">
        <p className="truncate text-[12.5px] font-extrabold tracking-[-0.015em] text-[var(--am-ink)]">{t.label}</p>
        <p className="mt-0.5 line-clamp-2 min-h-[26px] text-[10.5px] font-semibold leading-[1.25] text-[var(--ink-3)]">{why}</p>
      </div>
    </button>
  )
}
