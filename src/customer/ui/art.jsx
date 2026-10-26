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
import { FAMILIES } from '../data/families'

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

/* The card (Mohan's reference, 2026-10-26): the picture on a soft warm
   ground — the 3D art is drawn on white, so it multiplies straight onto
   it — and a white name strip with a chevron, lifted on a warm shadow. */
const groundOf = tone => `radial-gradient(130% 100% at 50% 25%, #FFFFFF 0%, ${tone} 45%, color-mix(in srgb, ${tone} 55%, #F2B9A6 45%) 100%)`

export function Card({ to, art, tone = '#FBE9F0', title, children, data }) {
  return (
    <Link to={to} className="cx-press cx-card2 relative flex flex-col overflow-hidden rounded-[20px]" {...data}>
      <div className="relative aspect-[1/0.9]" style={{ background: groundOf(tone) }}>
        {art?.src && (art.kind === 'art'
          ? <img src={art.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_18%] mix-blend-multiply" />
          : <span className="absolute inset-[14%]"><img src={art.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(120,60,40,.2)]" /></span>)}
      </div>
      <div className="relative -mt-2.5 flex flex-1 flex-col rounded-t-[14px] bg-white px-2.5 pb-2.5 pt-2">
        <p className="flex items-start justify-between gap-1">
          <span className="line-clamp-2 text-[12.5px] font-extrabold leading-[1.18] tracking-[-0.02em] text-[#1C1033]">{title}</span>
          <ChevronRight size={15} strokeWidth={2.8} className="mt-[1px] shrink-0 text-[#1C1033]" />
        </p>
        {children && <div className="mt-1 text-[10.5px] font-bold leading-[1.25] text-[var(--ink-3)]">{children}</div>}
      </div>
    </Link>
  )
}

/** A category: its occasions take turns in the live line. */
export function CategoryCard({ category, index = 0 }) {
  const names = (category.occasions ?? category.events ?? []).map(o => o.name)
  return (
    <Card to={`/c/${category.id}`} art={categoryArt(category)} tone={category.tone} title={category.short} data={{ 'data-category': category.id }}>
      <span className="flex items-start gap-1"><span className="mt-[4px] h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--ok)]" /><Rotator items={names} delay={index * 380} wrap className="text-[#0B7A45]" /></span>
    </Card>
  )
}

/** A service family: its masters' trades take turns in the live line. */
export function FamilyCard({ family, index = 0 }) {
  const to = family.trades.length === 1 ? `/s/${family.trades[0]}` : `/f/${family.id}`
  return (
    <Card to={to} art={serviceArt(family.trades[0])} tone={family.tone} title={family.label} data={{ 'data-family': family.id }}>
      <span className="flex items-start gap-1"><span className="mt-[4px] h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--ok)]" /><Rotator items={family.trades.length > 1 ? family.trades.map(t => TRADE[t].label) : family.line.split(' · ')} delay={index * 380} wrap className="text-[#0B7A45]" /></span>
    </Card>
  )
}

/* The line under an occasion: short, true, and it moves — staggered so a
   grid of them ripples instead of flashing together. */
const HOOKS = ['Ready to book', 'Book in minutes', '10% off first', 'Masters ready', 'Enjoy it all']
export function OccasionCard({ occasion, index = 0 }) {
  return (
    <Card to={`/o/${occasion.id}`} art={occasionArt(occasion)} tone={occasion.tone} title={occasion.name} data={{ 'data-occasion': occasion.id }}>
      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--ok)]" /><Rotator items={HOOKS} delay={(index % 6) * 420} every={2400} className="text-[#0B7A45]" /></span>
    </Card>
  )
}

export function ServiceCard({ tradeId, to = `/s/${tradeId}` }) {
  const t = TRADE[tradeId]
  return (
    <Card to={to} art={serviceArt(tradeId)} tone={FAMILIES.find(x => x.trades.includes(tradeId))?.tone ?? '#F3ECFF'} title={t.label} data={{ 'data-trade': tradeId }}>
      <span className="line-clamp-1">{t.why}</span>
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
