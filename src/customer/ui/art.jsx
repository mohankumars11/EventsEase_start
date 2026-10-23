/**
 * The illustrated cards: 3D art on a soft tone, the words underneath.
 *
 * One card anatomy for categories, occasions and services, so the three
 * grids read as one family: a rounded white card, the illustration filling
 * its top on the category's own pastel, and the name below in the ink
 * colour — never on the picture (Mohan, 2026-10-22: words below, the way
 * Zomato and Blinkit do it).
 *
 * Until an occasion or service has its generated illustration, the slot
 * shows that trade's 3D pictogram inset on the same pastel, so a missing
 * image is a different picture, never a hole.
 */
import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { categoryArt, occasionArt, serviceArt } from '../data/art'
import { TRADE } from '../data/trades'

export function ArtFill({ art, tone = '#F3EDFF', className = '', inset = '14%' }) {
  return (
    <div className={'relative overflow-hidden ' + className} style={{ background: tone }}>
      {art?.src && (art.kind === 'art'
        ? <img src={art.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
        : <span className="absolute" style={{ inset }}><img src={art.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(43,14,102,.18)]" /></span>)}
    </div>
  )
}

/** Home grid, four across: picture on top, the name in two short lines. */
export function CategoryCard({ category }) {
  return (
    <Link to={`/c/${category.id}`} className="cx-press cx-art-card block overflow-hidden rounded-[16px]" data-category={category.id}>
      <ArtFill art={categoryArt(category)} tone={category.tone} className="aspect-[5/4]" inset="10%" />
      <p className="flex min-h-[34px] items-center px-1.5 py-1.5 text-[10.5px] font-extrabold leading-[1.2] tracking-[-0.01em] text-[var(--ink)]">{category.short}</p>
    </Link>
  )
}

export function OccasionCard({ occasion }) {
  return (
    <Link to={`/o/${occasion.id}`} className="cx-press cx-art-card block overflow-hidden rounded-[18px]" data-occasion={occasion.id}>
      <ArtFill art={occasionArt(occasion)} tone={occasion.tone} className="aspect-square" />
      <div className="px-2 pb-2.5 pt-2">
        <p className="line-clamp-2 min-h-[30px] text-[12.5px] font-extrabold leading-[1.2] tracking-[-0.015em]">{occasion.name}</p>
        <p className="mt-0.5 truncate text-[10.5px] font-bold text-[var(--ink-3)]">{occasion.must.length + occasion.often.length} services</p>
      </div>
    </Link>
  )
}

export function ServiceCard({ tradeId, to = `/s/${tradeId}` }) {
  const t = TRADE[tradeId]
  return (
    <Link to={to} className="cx-press cx-art-card block overflow-hidden rounded-[16px]" data-trade={tradeId}>
      <ArtFill art={serviceArt(tradeId)} className="aspect-square" tone="#F6F1FF" />
      <p className="flex min-h-[34px] items-center px-1.5 py-1.5 text-[10.5px] font-extrabold leading-[1.2] tracking-[-0.01em]">{t.label}</p>
    </Link>
  )
}

/** An add-on: a square to tap, the + riding its corner. */
export function AddOnCard({ tradeId, why, on, onToggle }) {
  const t = TRADE[tradeId]
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} className={'cx-press cx-art-card relative block overflow-hidden rounded-[18px] text-left transition ' + (on ? 'ring-2 ring-[var(--brand)]' : '')} data-addon={tradeId} data-on={on}>
      <ArtFill art={serviceArt(tradeId)} className="aspect-square" tone="#F6F1FF" />
      <span className={'absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full shadow-[0_6px_14px_-8px_rgba(58,18,144,.8)] transition ' + (on ? 'cx-pop bg-[var(--brand-deep)] text-white' : 'bg-white text-[var(--am-ink)] ring-1 ring-[var(--am-300)]')}>
        {on ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
      </span>
      <div className="px-2 pb-2.5 pt-2">
        <p className="truncate text-[12.5px] font-extrabold tracking-[-0.015em]">{t.label}</p>
        <p className="mt-0.5 line-clamp-2 min-h-[26px] text-[10.5px] font-semibold leading-[1.25] text-[var(--ink-3)]">{why}</p>
      </div>
    </button>
  )
}
