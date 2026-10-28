/**
 * The tiles.
 *
 * Quick-commerce anatomy (Mohan, 2026-10-22): the photograph is a clean
 * square that carries only small glass marks — why this one, whether it
 * books instantly, the heart — and every word sits BELOW it, where it can
 * be read at a glance on any photo. The add control is a light-amethyst
 * pill that rides the photo's bottom edge, so it belongs to the card
 * without covering the work.
 *
 * A partner card shows only that partner's own photographs. With none, it
 * shows their initials on the brand gradient — a stock image there would
 * read as their work, and is not.
 */
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Heart, Plus, Star, Zap } from 'lucide-react'
import { Photo } from './kit'
import { photoFor } from '../data/photos.generated'
import { TRADE } from '../data/trades'
import { occasionLine } from '../data/occasions'
import { rupees } from '../lib/format'

const photoOf = o => photoFor(o.id) ?? photoFor(`cat:${o.category}`)

/* The square itself: photo, a hairline, the violet-tinted lift. */
function Frame({ photo, children, className = '' }) {
  return (
    <div className={'cx-frame relative aspect-square overflow-hidden ' + className} style={{ '--tone': photo?.tone }}>
      <Photo src={photo?.url} alt={photo?.alt} className="absolute inset-0 h-full w-full object-cover" />
      {children}
    </div>
  )
}

export function OccasionTile({ occasion, size = 'md', className = '' }) {
  const p = photoOf(occasion)
  return (
    <Link to={`/o/${occasion.id}`} className={'cx-press group block ' + className} data-occasion={occasion.id}>
      <Frame photo={p} className="rounded-[22px]" />
      <p className={(size === 'lg' ? 'text-[16.5px]' : 'text-[14.5px]') + ' mt-2.5 line-clamp-2 px-0.5 font-extrabold leading-[1.15] tracking-[-0.02em]'}>{occasion.name}</p>
      <p className="mt-0.5 truncate px-0.5 text-[11.5px] font-bold text-[var(--ink-3)]">{occasionLine(occasion)}</p>
    </Link>
  )
}

export function CategoryTile({ category }) {
  const p = photoFor(`cat:${category.id}`)
  return (
    <Link to={`/c/${category.id}`} className="cx-press block" data-category={category.id}>
      <Frame photo={p} className="rounded-[22px]">
        <span className="cx-glass absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full"><ArrowUpRight size={15} /></span>
        <span className="cx-glass absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold">{category.events.length}</span>
      </Frame>
      <p className="mt-2.5 line-clamp-2 px-0.5 text-[14.5px] font-extrabold leading-[1.15] tracking-[-0.02em]">{category.label}</p>
      <p className="mt-0.5 line-clamp-1 px-0.5 text-[11.5px] font-bold text-[var(--ink-3)]">{category.line}</p>
    </Link>
  )
}

export function TradeTile({ tradeId, to = `/s/${tradeId}`, className = '' }) {
  const t = TRADE[tradeId], p = photoFor(`trade:${tradeId}`)
  return (
    <Link to={to} className={'cx-press block ' + className} data-trade={tradeId}>
      <Frame photo={p} className="rounded-[20px]">
        <span className="cx-glass-light absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full"><t.icon size={14} className="text-[var(--brand-deep)]" /></span>
      </Frame>
      <p className="mt-2 line-clamp-2 px-0.5 text-[12.5px] font-extrabold leading-tight tracking-[-0.01em]">{t.label}</p>
    </Link>
  )
}

const initials = name => String(name).split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

/**
 * A partner, as a quick-commerce card. Tap the card to see them; tap the
 * pill to put them in the plan without leaving the list.
 */
export function PartnerCard({ partner, added = false, onAdd, saved = false, onSave, selectable = false, selected = false, onSelect, className = '', href, compact = false }) {
  const p = partner
  const link = href ?? `/p/${p.serviceId}?t=${p.tradeId}`
  const unit = p.fromKind === 'package' ? (p.fromLabel ? `${p.fromLabel} package` : 'package') : (p.fromUnit ?? 'onwards')
  return (
    <div className={'relative ' + className} data-partner={p.serviceId}>
      <Link to={link} className="cx-press block" aria-label={p.name}>
        <div className={'cx-frame relative aspect-square overflow-hidden rounded-[22px] transition ' + (selected ? 'ring-[3px] ring-[var(--brand)] ring-offset-2' : '')}>
          {p.cover ? <Photo src={p.cover} alt={`${p.name} — their work`} className="absolute inset-0 h-full w-full object-cover" />
            : <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#3B1295] via-[#6A2BD9] to-[#A77BFF]">
                <span className="text-[40px] font-extrabold tracking-[-0.04em] text-white/90">{initials(p.name)}</span>
              </span>}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
          {/* Top-left, stacked: why this one, then whether it books now. The
              bottom edge belongs to the Add pill and nothing else. */}
          <span className="absolute left-2 top-2 flex max-w-[calc(100%-56px)] flex-col items-start gap-1">
            {p.reason && <span className="cx-glass-light max-w-full truncate rounded-full px-2 py-1 text-[11px] font-extrabold">{p.reason}</span>}
            {p.instant && (
              <span className="cx-glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold" aria-label="Books instantly">
                <Zap size={12} className="fill-[var(--gold)] text-[var(--gold)]" />Instant
              </span>
            )}
          </span>
        </div>
        <div className={compact ? 'px-0.5 pt-3.5' : 'px-0.5 pt-4'}>
          <p className={'line-clamp-2 font-extrabold leading-[1.18] tracking-[-0.02em] ' + (compact ? 'text-[12.5px]' : 'text-[14.5px]')}>{p.name}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-[12px] font-bold text-[var(--ink-2)]">
            {p.rating
              ? <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--ok)] px-1.5 py-[1px] text-[11px] font-extrabold text-white"><span className="cx-num">{p.rating.toFixed(1)}</span><Star size={9} className="fill-white text-white" /></span>
              : <span className="rounded-md bg-[var(--am-100)] px-1.5 py-[1px] text-[11px] font-extrabold text-[var(--am-ink)]">New</span>}
            {p.reviews ? <span className="cx-num text-[var(--ink-3)]">({p.reviews})</span> : null}
            <span className="text-[var(--ink-3)]">·</span>
            <span className="truncate">{p.distanceKm != null ? `${p.distanceKm} km` : p.area}</span>
          </p>
          {p.quote ? (
            <>
              <p className="mt-1 flex items-baseline gap-1 overflow-hidden whitespace-nowrap" data-quote>
                <span className={'cx-num font-extrabold tracking-[-0.02em] ' + (compact ? 'text-[13.5px]' : 'text-[15.5px]')}>{rupees(p.quote.paise)}</span>
                <span className="truncate text-[11px] font-extrabold text-[#0B7A45]">your price</span>
              </p>
              <p className="truncate text-[10.5px] font-bold text-[var(--ink-3)]">{p.quote.note}</p>
            </>
          ) : p.fromPaise ? (
            <p className="mt-1 flex items-baseline gap-1 overflow-hidden whitespace-nowrap">
              <span className={'cx-num font-extrabold tracking-[-0.02em] ' + (compact ? 'text-[13.5px]' : 'text-[15.5px]')}>{rupees(p.fromPaise)}</span>
              <span className="truncate text-[11px] font-bold text-[var(--ink-3)]">{unit}</span>
            </p>
          ) : <p className="mt-1 text-[12.5px] font-bold text-[var(--ink-3)]">Price on request</p>}
        </div>
      </Link>

      {onSave && (
        <button type="button" onClick={() => onSave(p)} aria-label={saved ? 'Remove from saved' : 'Save'} aria-pressed={saved}
          className="cx-press cx-glass absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full">
          <Heart size={16} className={saved ? 'fill-[#FF4D7E] text-[#FF4D7E]' : 'text-white'} />
        </button>
      )}
      {/* Rides the photo's bottom edge: half on the picture, half on the page.
          The invisible square is the photo's footprint, so the pill finds the
          edge at any card width. */}
      {(selectable || onAdd) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          {selectable ? (
            <button type="button" onClick={() => onSelect(p)} aria-pressed={selected} aria-label={selected ? 'Remove from compare' : 'Add to compare'} data-edge
              className={'cx-press pointer-events-auto absolute bottom-0 right-2.5 flex h-9 translate-y-1/2 items-center gap-1 rounded-full px-3 text-[12.5px] font-extrabold shadow-[0_8px_18px_-10px_rgba(58,18,144,.7)] ' + (selected ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn ring-1 ring-[var(--am-300)]')}>
              {selected ? <><Check size={14} strokeWidth={3} />Picked</> : 'Compare'}
            </button>
          ) : (
            <button type="button" onClick={() => onAdd(p)} aria-pressed={added} aria-label={added ? 'In your plan' : 'Add to plan'} data-add data-edge
              className={'cx-press pointer-events-auto absolute bottom-0 flex translate-y-1/2 items-center gap-1 rounded-full font-extrabold shadow-[0_8px_18px_-10px_rgba(58,18,144,.7)] transition ' + (compact ? 'right-1.5 h-8 px-2.5 text-[11.5px] ' : 'right-2.5 h-9 px-3.5 text-[12.5px] ') +
                (added ? 'cx-pop bg-[var(--ok)] text-white' : 'cx-btn ring-1 ring-[var(--am-300)]')}>
              {added ? <><Check size={14} strokeWidth={3} />Added</> : <><Plus size={14} strokeWidth={3} />Add</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function PartnerCardSkeleton({ className = '' }) {
  return (
    <div className={className}>
      <div className="cx-shimmer aspect-square rounded-[22px]" />
      <div className="cx-shimmer mt-4 h-3.5 w-4/5 rounded-full" />
      <div className="cx-shimmer mt-2 h-3 w-3/5 rounded-full" />
      <div className="cx-shimmer mt-2 h-3.5 w-2/5 rounded-full" />
    </div>
  )
}
