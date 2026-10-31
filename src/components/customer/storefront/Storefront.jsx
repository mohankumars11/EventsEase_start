/**
 * The storefront: one layout for every trade.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A CUSTOMER NEEDS FROM THE FIRST SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1. their work      a real photograph, large, before any words
 *   2. who they are    name, trade, where, how long, how highly rated
 *   3. what it costs   "from ₹…" and whether it can be booked now
 *
 * Everything else (packages, the detail of the answers, terms) is the
 * second screen, reached by the section bar, which stays pinned.
 *
 * The old card put a generic headline in that first position ("Make Your
 * Service Unforgettable", the same words for every trade on the app),
 * showed the work as a 154px rail below the fold, and set most of its
 * text at 8–9px. This one leads with the partner's own media in a mosaic,
 * keeps every line at 11px or larger, and gives every number the same
 * column so four facts can be read in one glance.
 *
 * ── Aligned media ───────────────────────────────────────────────────
 * Every gallery tile is the same square, cropped to cover, on one grid,
 * so a portrait phone photo and a landscape DSLR frame sit in the same
 * cell instead of stretching the row. Tapping one opens it whole, in a
 * viewer inside the app. It was an <a target="_blank">, which in the apk
 * threw the partner out to the system browser.
 *
 * No fabricated content: no stock imagery, no invented counts, no
 * "Most popular" unless the data says so. An empty section says what
 * will appear there.
 *
 * ── Only the partner's own pictures ─────────────────────────────────
 * With no photos uploaded, this used to show the trade's illustration
 * (a mehendi hand, a DJ deck) where the partner's work goes. A customer
 * reads that as the partner's work, and it is not. Now a customer sees
 * the partner's initials and "photos coming soon"; the partner, in the
 * preview, sees an invitation to add their own, one tap from the upload.
 *
 * ── Edit from where you are looking ─────────────────────────────────
 * Given `onEditSection`, every section carries an Edit that names the
 * section, and the preview opens the listing form at that section.
 * Customers never get it: the prop is only passed by the preview.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, CalendarClock, Camera, Check, ChevronLeft, ChevronRight, Clock3, CreditCard, Image as ImageIcon, Instagram, Languages, MapPin, Music2, Package, PlayCircle, ShieldCheck, Star, Users, X, Zap, BookOpen, Link2, ListChecks, Pencil } from 'lucide-react'
import { rupees } from '../../../lib/tierPackages'
import './storefront.css'

const money = p => (Number(p) > 0 ? rupees(p) : null)
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
const STATUS = {
  DRAFT: 'Draft preview', UNDER_REVIEW: 'In review', ACTION_REQUIRED: 'Changes needed',
  REJECTED: 'Changes needed', ARCHIVED: 'Hidden',
}

/* ── Media viewer ────────────────────────────────────────────────────── */
function MediaViewer({ media, index, onClose, onIndex }) {
  const start = useRef(null)
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex(i => Math.min(media.length - 1, i + 1))
      if (e.key === 'ArrowLeft') onIndex(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [media.length, onClose, onIndex])
  const item = media[index]
  if (!item) return null
  const go = d => onIndex(i => Math.min(media.length - 1, Math.max(0, i + d)))
  return (
    <div className="fixed inset-0 z-[320] flex flex-col bg-[#0b0814]/95 text-white backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Their work"
      onPointerDown={e => { start.current = e.clientX }}
      onPointerUp={e => { if (start.current == null) return; const dx = e.clientX - start.current; start.current = null; if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1) }}>
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold tabular-nums">{index + 1} / {media.length}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {item.kind === 'video'
          ? <video key={item.url} src={item.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-2xl" />
          : <img key={item.url} src={item.url} alt={item.caption || 'Their work'} className="max-h-full max-w-full rounded-2xl object-contain" />}
        {index > 0 && <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/12 backdrop-blur"><ChevronLeft size={22} /></button>}
        {index < media.length - 1 && <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/12 backdrop-blur"><ChevronRight size={22} /></button>}
      </div>
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-3 text-center">
        {item.caption ? <p className="text-[13px] font-semibold text-white/90">{item.caption}</p> : null}
        {item.review_status && item.review_status !== 'live'
          ? <p className="mt-1 text-[11.5px] font-bold text-amber-300">{item.review_status === 'rejected' ? 'Needs a change before customers see it' : 'In review · customers see it once approved'}</p> : null}
      </div>
    </div>
  )
}

/* `badge`: the per-photo review mark. Off in the hero, where the hero's
   own status chip already says the listing is in review and a mark per
   tile collided with it and with the trade chip. */
function Tile({ item, onOpen, className = '', more = 0, badge = true }) {
  return (
    <button type="button" onClick={onOpen} className={'sb-tile group relative overflow-hidden bg-[#EDE6FB] ' + className}
      aria-label={item.kind === 'video' ? 'Play video' : 'Open photo'}>
      {item.kind === 'video'
        ? <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        : <img src={item.url} alt={item.caption || ''} loading="lazy" className="h-full w-full object-cover transition duration-500 group-active:scale-[1.03]" />}
      {item.kind === 'video' && <span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur"><PlayCircle size={22} className="text-white" /></span></span>}
      {badge && item.review_status && item.review_status !== 'live' && <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-100/95 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">{item.review_status === 'rejected' ? 'Change' : 'In review'}</span>}
      {more > 0 && <span className="absolute inset-0 grid place-items-center bg-[#1B1433]/55 text-[18px] font-extrabold text-white">+{more}</span>}
    </button>
  )
}

/* ── Hero: their work first ──────────────────────────────────────────── */
function Hero({ model, onOpen, onEdit }) {
  const m = model.media
  const status = !model.isLive ? STATUS[model.status] : null
  const initials = String(model.name).split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
  return (
    <section className="relative px-3 pt-3">
      {m.length ? (
        <div className={'sb-mosaic grid h-[252px] gap-1 overflow-hidden rounded-[26px] ' + (m.length >= 3 ? 'grid-cols-3 grid-rows-2' : m.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          <Tile item={m[0]} onOpen={() => onOpen(0)} badge={false} className={m.length >= 3 ? 'col-span-2 row-span-2' : ''} />
          {m[1] && <Tile item={m[1]} onOpen={() => onOpen(1)} badge={false} />}
          {m[2] && <Tile item={m[2]} onOpen={() => onOpen(2)} badge={false} more={m.length > 3 ? m.length - 3 : 0} />}
        </div>
      ) : onEdit ? (
        <div className="sb-aurora relative flex h-[280px] items-start justify-center overflow-hidden rounded-[26px] px-6 pt-11 text-center" data-hero-empty="partner">
          <span className="sb-orb sb-orb-a" /><span className="sb-orb sb-orb-b" /><span className="sb-orb sb-orb-c" />
          <div className="relative flex flex-col items-center">
            <span className="sb-upload-ring grid h-16 w-16 place-items-center rounded-full bg-white/15 ring-1 ring-white/35 backdrop-blur-md">
              <Camera size={26} className="text-white" />
            </span>
            <p className="mt-3 text-[17px] font-extrabold leading-tight text-white">Your work goes here</p>
            <p className="mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/80">This is the first thing a customer sees. Add photos of jobs you have done, at least six.</p>
            <button type="button" onClick={() => onEdit('work')} className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#4B1D96] shadow-lg">
              <Camera size={15} />Add your photos
            </button>
          </div>
        </div>
      ) : (
        <div className="sb-aurora relative flex h-[236px] flex-col items-center justify-start overflow-hidden rounded-[26px] pt-14" data-hero-empty="customer">
          <span className="sb-orb sb-orb-a" /><span className="sb-orb sb-orb-b" /><span className="sb-orb sb-orb-c" />
          <span className="relative grid h-24 w-24 place-items-center rounded-full bg-white/14 text-[34px] font-extrabold tracking-[0.04em] text-white ring-1 ring-white/30 backdrop-blur-md">{initials}</span>
          <p className="relative mt-3 text-center text-[12px] font-semibold text-white/85">Photos of their work coming soon</p>
        </div>
      )}
      {m.length > 0 && onEdit && (
        <div className="absolute bottom-3 right-6"><EditPill onClick={() => onEdit('work')} label="Edit photos" /></div>
      )}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between p-3">
        <span className="rounded-full bg-[#1B1433]/45 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white ring-1 ring-white/20 backdrop-blur-md">{model.tradeName}</span>
        {status && <span className="rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-extrabold text-amber-900 ring-1 ring-amber-200">{status}</span>}
      </div>
    </section>
  )
}

/* ── Who they are, and the four numbers ──────────────────────────────── */
function Identity({ model, avatarSlot, onEdit, nearby = null }) {
  /* One word per label: four of them share 358px, and a label that
     truncates ("STARTING…") is a fact nobody can read. */
  /* Four coloured tiles, a number on each (2026-10-31: "coloured cards,
     numbers") — the facts a customer compares, in one glance. */
  const stats = [
    model.fromPaise ? { v: money(model.fromPaise), l: 'From', icon: CreditCard, tone: ['#F3ECFF', '#5B21A8'] } : null,
    model.years ? { v: `${model.years}+`, l: model.years === 1 ? 'Year' : 'Years', icon: Star, tone: ['#FFF4DC', '#9A5B00'] } : model.yearsBand ? { v: model.yearsBand, l: 'Years', icon: Star, tone: ['#FFF4DC', '#9A5B00'] } : null,
    model.capacity ? { v: Number(model.capacity.value).toLocaleString('en-IN'), l: model.capacity.unit[0].toUpperCase() + model.capacity.unit.slice(1), icon: Users, tone: ['#E9F8EF', '#0B6B3D'] }
      : model.team ? { v: String(model.team), l: 'Team', icon: Users, tone: ['#E9F8EF', '#0B6B3D'] } : null,
    model.instant === true ? { v: 'Fast', l: 'Accepts', icon: Zap, tone: ['#FDECF4', '#B0185E'] }
      : model.noticeDays != null ? { v: model.noticeDays === 0 ? 'Same day' : `${model.noticeDays} days`, l: 'Notice', icon: CalendarClock, tone: ['#FDECF4', '#B0185E'] } : null,
  ].filter(Boolean)
  const initials = String(model.name).split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
  return (
    <section className="relative z-10 mx-3 -mt-9 rounded-[26px] bg-white p-4 shadow-[0_22px_44px_-26px_rgba(91,33,168,.55)] ring-1 ring-[#EEE8F8]">
      {onEdit && <div className="absolute right-3 top-3"><EditPill onClick={() => onEdit('profile')} /></div>}
      <div className="flex items-start gap-3.5">
        <div className="sb-avatar shrink-0">
          {avatarSlot || (
            <span className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#EDE4FF] to-[#D9C8FF] text-[18px] font-extrabold text-[#5B21A8]">
              {initials}
              {model.avatarUrl ? <img src={model.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} /> : null}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className={'flex min-w-0 items-center gap-1.5 text-[19px] font-extrabold leading-tight tracking-[-0.02em] ' + (onEdit ? 'pr-16' : '')}>
            <span className="min-w-0 break-words">{model.name}</span>
            {/* Green, and only for a partner Sambramo has approved:
                the one mark on the card a customer should be able to
                trust at a glance, so it is the colour of "yes". */}
            {model.verified && <BadgeCheck size={21} className="shrink-0 fill-[#16A34A] text-white" aria-label="Verified partner" data-verified />}
          </h2>
          <p className="mt-1 text-[12.5px] font-semibold text-[#6E6787]">{model.tradeName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-[#4E4669]">
            {model.location && <span className="flex items-center gap-1"><MapPin size={13} className="text-[#7C3AED]" />{model.location}</span>}
            {model.rating ? <span className="flex items-center gap-1"><Star size={13} className="fill-[#F5B83D] text-[#F5B83D]" />{model.rating.toFixed(1)}{model.reviewCount ? <span className="text-[#8E87A6]">({model.reviewCount})</span> : null}</span> : null}
          </div>
        </div>
      </div>
      {model.tagline && <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-[#4E4669]">{model.tagline}</p>}
      {stats.length > 0 && (
        <div className={'mt-3.5 grid gap-1.5 ' + ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][stats.length]} data-stat-strip>
          {stats.map(s => (
            <div key={s.l} className="min-w-0 rounded-[16px] px-1.5 py-2.5 text-center" style={{ background: s.tone[0] }}>
              <s.icon size={14} className="mx-auto" style={{ color: s.tone[1] }} />
              <p className={'mt-1 truncate font-black tabular-nums tracking-[-0.02em] ' + (stats.length > 3 ? 'text-[14px]' : 'text-[15.5px]')} style={{ color: s.tone[1] }}>{s.v}</p>
              <p className="mt-0.5 truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6E6787]">{s.l}</p>
            </div>
          ))}
        </div>
      )}
      {nearby && (model.location || nearby.km != null) && (
        <div className="mt-2 flex items-center gap-2.5 rounded-[16px] bg-gradient-to-r from-[#EAF6FF] to-[#F3ECFF] px-3 py-2.5" data-nearby>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#2563EB] shadow-sm"><MapPin size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-extrabold text-[#1B1433]">{model.location ? `Based in ${model.location}` : 'Near you'}</span>
            {nearby.km != null && <span className="block text-[11.5px] font-bold text-[#4E4669]"><span className="tabular-nums">{nearby.km}</span> km from {nearby.area ? nearby.area : 'your venue'}</span>}
          </span>
        </div>
      )}
    </section>
  )
}

/* ── Section bar: pinned, and it follows the scroll ──────────────────── */
function SectionNav({ sections, active, onGo }) {
  return (
    <nav aria-label="Listing sections" className="sticky top-0 z-20 mt-3 bg-[#FBF9FF]/92 px-3 py-2 backdrop-blur-md">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map(s => (
          <button key={s.key} type="button" onClick={() => onGo(s.key)}
            className={'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' +
              (active === s.key ? 'bg-[#5B21A8] text-white shadow-[0_6px_16px_-8px_rgba(91,33,168,.8)]' : 'bg-white text-[#4E4669] ring-1 ring-[#EEE8F8]')}>
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function EditPill({ onClick, label = 'Edit' }) {
  return (
    <button type="button" onClick={onClick} data-edit-section
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F1EAFF] px-3 py-1.5 text-[12px] font-extrabold text-[#4B1D96] ring-1 ring-[#E2D5FB] active:scale-95">
      <Pencil size={12} strokeWidth={2.6} />{label}
    </button>
  )
}

const NUM = { about: 1, work: 2, offers: 3, pricing: 4, glance: 5, terms: 6, reviews: 7 }
const Order = createContext(null)
function Block({ id, title, aside, children, icon: Icon, onEdit }) {
  /* Numbered in reading order — 01 About, 02 Work … — counting only the
     sections this listing has, so the numbers never skip. */
  const key = String(id ?? '').split('-').pop()
  const order = useContext(Order)
  const n = order?.includes(key) ? order.indexOf(key) + 1 : NUM[key] ?? 0
  return (
    <section id={id} data-sb-section className="scroll-mt-16 px-3 pt-5">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <h3 className="flex min-w-0 items-center gap-2 text-[16px] font-extrabold tracking-[-0.01em]">
          <span className="sb-num grid h-7 min-w-[28px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#5B21A8] to-[#9F67FF] px-1 text-[11px] font-black tabular-nums text-white" data-sb-num>{String(n).padStart(2, '0')}</span>
          {Icon ? <Icon size={16} className="shrink-0 text-[#7C3AED]" /> : null}<span className="min-w-0 truncate">{title}</span>
        </h3>
        {onEdit ? <EditPill onClick={onEdit} /> : aside ? <span className="shrink-0 text-[11.5px] font-semibold text-[#8E87A6]">{aside}</span> : null}
      </div>
      {children}
    </section>
  )
}

const Chip = ({ children, tone = 'soft' }) => (
  <span className={'inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-[12px] font-bold leading-tight ' +
    (tone === 'soft' ? 'bg-[#F1EAFF] text-[#4B1D96]' : 'bg-white text-[#4E4669] ring-1 ring-[#E6DCFA]')}>
    <span className="truncate">{children}</span>
  </span>
)

function Chips({ items, max = 10, tone }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((x, i) => <Chip key={x + i} tone={tone}>{x}</Chip>)}
      {items.length > max && !all && <button type="button" onClick={() => setAll(true)} className="rounded-full px-3 py-1.5 text-[12px] font-extrabold text-[#5B21A8]">+{items.length - max} more</button>}
    </div>
  )
}

const LINK_ICON = { video: PlayCircle, gallery: ImageIcon, instagram: Instagram, catalog: BookOpen, audio: Music2 }

function About({ model, id, onEdit }) {
  const [open, setOpen] = useState(false)
  const long = model.bio.length > 160
  return (
    <Block id={id} title={`About ${model.name}`} onEdit={onEdit && (() => onEdit('about'))}>
      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">
        {model.bio
          ? <>
              <p className={'whitespace-pre-line text-[13.5px] leading-relaxed text-[#3F3858] ' + (!open && long ? 'line-clamp-3' : '')}>{model.bio}</p>
              {long && <button type="button" onClick={() => setOpen(v => !v)} className="mt-1.5 text-[12.5px] font-extrabold text-[#5B21A8]">{open ? 'Show less' : 'Read more'}</button>}
            </>
          : <p className="text-[13px] text-[#8E87A6]">Their introduction appears here.</p>}
        {model.highlights.length > 0 && <div className="mt-3.5"><Chips items={model.highlights} max={8} /></div>}
        {(model.languages.length > 0 || model.events.length > 0) && (
          <div className="mt-3.5 space-y-2.5 border-t border-[#F1ECFA] pt-3.5">
            {model.languages.length > 0 && (
              <p className="flex items-start gap-2 text-[12.5px] font-semibold text-[#4E4669]"><Languages size={15} className="mt-0.5 shrink-0 text-[#7C3AED]" /><span>{model.languages.join(' · ')}</span></p>
            )}
            {model.events.length > 0 && (
              <div><p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E87A6]">Perfect for</p><Chips items={model.events} max={8} tone="line" /></div>
            )}
          </div>
        )}
        {model.links.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {model.links.map(l => {
              const Icon = LINK_ICON[l.kind] ?? Link2
              return <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#1B1433] px-3.5 py-2 text-[12px] font-extrabold text-white"><Icon size={14} />{l.label}</a>
            })}
          </div>
        )}
      </div>
    </Block>
  )
}

function Work({ model, id, onOpen, onEdit }) {
  const photos = model.media.filter(m => m.kind === 'photo').length
  const videos = model.media.length - photos
  const [filter, setFilter] = useState('all')
  const shown = model.media.map((m, i) => ({ m, i })).filter(({ m }) => filter === 'all' || m.kind === filter)
  const visible = shown.slice(0, 9)
  return (
    <Block id={id} title="Their work" icon={Camera} onEdit={onEdit && (() => onEdit('work'))} aside={model.media.length ? [photos && plural(photos, 'photo'), videos && plural(videos, 'video')].filter(Boolean).join(' · ') : null}>
      {model.media.length ? (
        <>
          {photos > 0 && videos > 0 && (
            <div className="mb-2 flex gap-1.5 px-1">
              {[['all', 'All'], ['photo', 'Photos'], ['video', 'Videos']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={'rounded-full px-3 py-1.5 text-[12px] font-extrabold ' + (filter === k ? 'bg-[#1B1433] text-white' : 'bg-white text-[#4E4669] ring-1 ring-[#EEE8F8]')}>{l}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5" data-work-grid>
            {visible.map(({ m, i }, n) => (
              <Tile key={m.id || m.storage_path || m.url} item={m} onOpen={() => onOpen(i)} className="aspect-square rounded-[14px]"
                more={n === 8 && shown.length > 9 ? shown.length - 9 : 0} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-[22px] border border-dashed border-[#D9C8FF] bg-white p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F1EAFF] text-[#7C3AED]"><ImageIcon size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-snug text-[#6E6787]">{onEdit ? 'Add photos and videos of your own work. They show here once approved.' : 'Photos and videos of their work appear here once they are uploaded and approved.'}</p>
            {onEdit && <button type="button" onClick={() => onEdit('work')} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#5B21A8] px-3.5 text-[12.5px] font-extrabold text-white"><Camera size={14} />Add photos</button>}
          </div>
        </div>
      )}
    </Block>
  )
}

const PKG_TONE = [['#F3ECFF', '#5B21A8', '#9F67FF'], ['#FDECF4', '#B0185E', '#F472B6'], ['#FFF4DC', '#9A5B00', '#F5B83D'], ['#E9F8EF', '#0B6B3D', '#34D399']]
function PackageCard({ p, solo, selected, onPick, index = 0, icon: Logo = Package }) {
  const [tint, ink, glow] = PKG_TONE[index % PKG_TONE.length]
  return (
    <div className={'sb-package relative flex shrink-0 snap-center flex-col overflow-hidden rounded-[24px] bg-white p-4 ring-1 ' +
      (solo ? 'w-full ' : 'w-[78%] max-w-[300px] ') + (selected ? 'ring-2 ring-[#7C3AED]' : p.popular ? 'ring-[#C4A7FF] sb-package-glow' : 'ring-[#EEE8F8]')} data-package-card>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60" style={{ background: tint }} />
      <div className="relative flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-white shadow-[0_8px_16px_-10px_rgba(28,16,51,.7)]" style={{ background: `linear-gradient(135deg, ${ink}, ${glow})` }}><Logo size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] tabular-nums" style={{ color: ink }}>Package {String(index + 1).padStart(2, '0')}{p.popular ? ' · Most popular' : ''}</span>
          <span className="block truncate text-[14.5px] font-extrabold text-[#1B1433]">{p.name}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[25px] font-extrabold leading-none tracking-[-0.03em] text-[#1B1433]">{money(p.price) ?? <span className="text-[17px]">Price on request</span>}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-bold text-[#6E6787]">
        {p.unit && money(p.price) && <span>{p.unit}</span>}
        {p.hours ? <span className="flex items-center gap-1"><Clock3 size={12} />{p.hours} hours</span> : null}
        {p.guests ? <span className="flex items-center gap-1"><Users size={12} />{p.guests[0] ?? 0}{p.guests[1] ? '–' + p.guests[1] : '+'} guests</span> : null}
      </div>
      <ul className="mt-3 flex-1 space-y-1.5">
        {(p.inclusions.length ? p.inclusions.slice(0, 4) : [p.description || 'Details as listed']).map((x, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] font-semibold leading-snug text-[#3F3858]"><Check size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-[#16A34A]" /><span className="line-clamp-2">{x}</span></li>
        ))}
        {p.inclusions.length > 4 && <li className="pl-6 text-[12px] font-bold text-[#8E87A6]">+{p.inclusions.length - 4} more included</li>}
      </ul>
      {onPick && (
        <button type="button" onClick={() => onPick(p.raw)} className={'mt-3.5 flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold ' +
          (selected ? 'bg-[#16A34A] text-white' : 'bg-[#F1EAFF] text-[#4B1D96]')}>
          {selected ? <><Check size={15} strokeWidth={3} />Selected</> : <>View details<ChevronRight size={15} /></>}
        </button>
      )}
    </div>
  )
}

function MenuCard({ m, solo }) {
  return (
    <div className={'flex shrink-0 snap-center flex-col rounded-[24px] bg-white p-4 ring-1 ring-[#EEE8F8] ' + (solo ? 'w-full' : 'w-[78%] max-w-[300px]')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#7C3AED]">{m.name}</p>
        {m.diet && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-200">{m.diet}</span>}
      </div>
      <p className="mt-1.5 text-[25px] font-extrabold leading-none tracking-[-0.03em]">{money(m.price) ?? <span className="text-[17px]">Price on request</span>}<span className="ml-1 text-[12px] font-bold text-[#6E6787]">{money(m.price) ? m.unit : ''}</span></p>
      {m.guests && <p className="mt-1.5 text-[11.5px] font-bold text-[#6E6787]">{m.guests[0] ?? 0}{m.guests[1] ? '–' + m.guests[1] : '+'} guests</p>}
      <ul className="mt-3 space-y-1.5">
        {m.courses.slice(0, 5).map(c => (
          <li key={c.course} className="text-[12.5px] leading-snug text-[#3F3858]"><b className="font-extrabold">{c.course}</b> · {c.dishes.slice(0, 3).join(', ')}{c.dishes.length > 3 ? ` +${c.dishes.length - 3}` : ''}</li>
        ))}
      </ul>
    </div>
  )
}

function Offers({ model, id, onPick, selectedId, onEdit, tradeIcon = null }) {
  if (!model.packages.length && !model.menus.length) return null
  return (
    <Block id={id} title={model.menus.length ? 'Menus & packages' : 'Packages'} icon={Package} onEdit={onEdit && (() => onEdit('offers'))}
      aside={model.packages.length > 1 ? 'Swipe to compare' : null}>
      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {model.menus.map(m => <MenuCard key={m.name} m={m} solo={model.menus.length + model.packages.length === 1} />)}
        {model.packages.map((p, k) => <PackageCard key={p.id} p={p} index={k} icon={tradeIcon ?? Package} solo={model.menus.length + model.packages.length === 1}
          selected={selectedId != null && String(selectedId) === String(p.tier ?? p.id)} onPick={onPick} />)}
      </div>
    </Block>
  )
}

function PriceRow({ label, detail, price, priceText, unit, bare = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#F1ECFA] py-3 first:border-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold leading-snug text-[#1B1433]">{label}</p>
        {detail ? <p className="mt-0.5 text-[12px] leading-snug text-[#6E6787]">{detail}</p> : null}
      </div>
      {!bare && (
        <p className="shrink-0 rounded-full bg-[#F7F3FF] px-3 py-1.5 text-right text-[13px] font-extrabold tabular-nums text-[#2A1660]">
          {money(price) ?? (priceText || 'On request')}{money(price) && unit ? <span className="ml-1 text-[11px] font-bold text-[#8E87A6]">{unit}</span> : null}
        </p>
      )}
    </div>
  )
}

function Pricing({ model, id, onEdit }) {
  const { rules, items, extras } = model
  if (!rules.length && !items.length && !extras.length) return null
  return (
    <Block id={id} title="How pricing works" icon={CreditCard} onEdit={onEdit && (() => onEdit('pricing'))}>
      <div className="space-y-2.5">
        {rules.length > 0 && <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">{rules.map((r, i) => <PriceRow key={i} {...r} />)}</div>}
        {items.length > 0 && (
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E87A6]">What you can order</p>
            {items.map(x => (
              <div key={x.id} className="border-t border-[#F1ECFA] py-3 first:border-0 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[13.5px] font-extrabold leading-snug">{x.name}</p>
                  <p className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-[#2A1660]">{money(x.price) ?? 'On request'}{money(x.price) && x.unit ? <span className="ml-1 text-[11px] font-bold text-[#8E87A6]">{x.unit}</span> : null}</p>
                </div>
                {x.chips.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{x.chips.map(c => <span key={c} className="rounded-full bg-[#F7F3FF] px-2.5 py-1 text-[11px] font-bold text-[#4E4669]">{c}</span>)}</div>}
                {x.deposit ? <p className="mt-1 text-[11.5px] font-semibold text-[#6E6787]">Refundable deposit {money(x.deposit)}</p> : null}
              </div>
            ))}
          </div>
        )}
        {extras.length > 0 && (
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E87A6]">Add to your booking</p>
            <div className="grid grid-cols-2 gap-2">
              {extras.map((x, i) => (
                <div key={x.label + i} className="rounded-[16px] bg-[#F9F6FF] p-3 ring-1 ring-[#F0E9FC]">
                  <p className="line-clamp-2 text-[12.5px] font-extrabold leading-snug">{x.label}</p>
                  <p className="mt-1 text-[12.5px] font-extrabold tabular-nums text-[#5B21A8]">{money(x.price) ?? (x.priceText || 'As listed')}{money(x.price) && x.unit ? <span className="ml-1 text-[11px] font-bold text-[#8E87A6]">{x.unit}</span> : null}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Block>
  )
}

function Glance({ model, id, onEdit }) {
  if (!model.facts.length && !model.checks.length) return null
  return (
    <Block id={id} title="At a glance" icon={ListChecks} onEdit={onEdit && (() => onEdit('glance'))}>
      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">
        {model.checks.length > 0 && (
          <ul className="mb-1 grid grid-cols-1 gap-2">
            {model.checks.map(c => (
              <li key={c} className="flex items-start gap-2.5 text-[13px] font-semibold leading-snug text-[#3F3858]">
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-200"><Check size={12} strokeWidth={3} className="text-emerald-700" /></span>{c}
              </li>
            ))}
          </ul>
        )}
        {model.facts.length > 0 && (
          <dl className={'grid grid-cols-2 gap-x-4 gap-y-3.5 ' + (model.checks.length ? 'mt-3.5 border-t border-[#F1ECFA] pt-3.5' : '')} data-glance>
            {model.facts.map(f => (
              <div key={f.id} className={f.wide ? 'col-span-2' : ''}>
                <dt className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8E87A6]">{f.label}</dt>
                <dd className="mt-1">{Array.isArray(f.value) ? <Chips items={f.value} max={8} tone="line" /> : <span className="whitespace-pre-line text-[13.5px] font-semibold leading-snug text-[#1B1433]">{f.value}</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Block>
  )
}

function Terms({ model, id, onEdit, customer = null }) {
  const t = model.terms
  const tiles = [
    customer ? { icon: Zap, k: 'Booking', v: 'Request, then pay', d: 'They accept your request; you pay only then' }
      : model.instant != null && { icon: Zap, k: 'Booking', v: model.instant ? 'Instant Book & Pay' : 'Request & confirm', d: model.instant ? 'Book and pay in one step' : 'Availability confirmed before you pay' },
    t.advancePct && { icon: CreditCard, k: 'Advance', v: `${t.advancePct}% advance`, d: customer ? 'Paid after they accept' : 'Paid when you book' },
    model.noticeDays != null && { icon: CalendarClock, k: 'Notice', v: model.noticeDays === 0 ? 'Same day' : `${plural(model.noticeDays, 'day')} ahead`, d: 'Earliest you can book' },
    customer?.cancellation ? { icon: ShieldCheck, k: 'Cancellation', v: customer.cancellation.title, d: customer.cancellation.body }
      : t.cancellation && { icon: ShieldCheck, k: 'Cancellation', v: t.cancellation.title, d: t.cancellation.body },
  ].filter(Boolean)
  if (!tiles.length && !t.travel && !t.charges.length) return null
  return (
    <Block id={id} title="Booking & payment" icon={CalendarClock} onEdit={onEdit && (() => onEdit('terms'))}>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(x => (
          <div key={x.k} className="rounded-[20px] bg-white p-3.5 ring-1 ring-[#EEE8F8]">
            <x.icon size={17} className="text-[#7C3AED]" />
            <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8E87A6]">{x.k}</p>
            <p className="mt-0.5 text-[13.5px] font-extrabold leading-snug">{x.v}</p>
            {x.d && <p className="mt-1 line-clamp-3 text-[11.5px] leading-snug text-[#6E6787]">{x.d}</p>}
          </div>
        ))}
      </div>
      {(t.travel || t.charges.length > 0) && (
        <div className="mt-2 rounded-[20px] bg-white p-4 ring-1 ring-[#EEE8F8]">
          {t.travel && <PriceRow label="Travel" detail={t.travel} bare />}
          {t.charges.map((c, i) => <PriceRow key={i} label={c.label} price={c.price} unit={c.unit} />)}
        </div>
      )}
    </Block>
  )
}

function Reviews({ model, id }) {
  return (
    <Block id={id} title="Reviews" icon={Star} aside={model.rating ? `${model.rating.toFixed(1)} · ${plural(model.reviewCount || 0, 'review')}` : null}>
      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#EEE8F8]">
        {model.reviews.length ? model.reviews.slice(0, 3).map((r, i) => (
          <div key={r.id || i} className="border-t border-[#F1ECFA] py-3 first:border-0 first:pt-0 last:pb-0">
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold">{r.customer_name || r.title || 'Customer'}{r.rating ? <span className="flex items-center gap-0.5 text-[12px] text-[#B7791F]"><Star size={12} className="fill-current" />{r.rating}</span> : null}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#4E4669]">{r.comment || r.body || r.text || ''}</p>
          </div>
        )) : <p className="text-[12.5px] leading-relaxed text-[#6E6787]">{model.rating
          ? `Rated ${model.rating.toFixed(1)} by ${plural(model.reviewCount || 0, 'customer')}. Written reviews appear here as customers share them.`
          : 'No reviews yet. Reviews appear here after customers book and share their experience.'}</p>}
      </div>
    </Block>
  )
}

function Trust({ verified }) {
  const items = [
    [ShieldCheck, 'Clear pricing', 'Rates shown upfront'],
    [CreditCard, 'Secure checkout', 'Pay after they accept'],
    [BadgeCheck, verified ? 'Verified partner' : 'Reviewed listing', verified ? 'Verification complete' : 'Checked by Sambramo before it goes live'],
  ]
  return (
    <section className="mx-3 mt-4 grid grid-cols-3 gap-2 rounded-[22px] bg-gradient-to-br from-[#2A1660] via-[#4B1D96] to-[#6D28D9] p-3.5 text-white">
      {items.map(([Icon, t, d]) => (
        <div key={t} className="min-w-0 text-center">
          <Icon size={19} className={'mx-auto ' + (Icon === BadgeCheck && verified ? 'text-[#4ADE80]' : 'text-[#C4A7FF]')} />
          <p className="mt-1.5 text-[11.5px] font-extrabold leading-tight">{t}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/70">{d}</p>
        </div>
      ))}
    </section>
  )
}

export default function Storefront({
  model, avatarSlot = null, onPick, selectedId = null, showBookingCtaPreview = false, onEditSection = null,
  /* Only these sections (profile | about | work | offers | pricing |
     glance | terms), for the after-step pop-up. Null renders the lot. */
  focus = null,
  /* The live preview during onboarding: every amount is the partner's own
     rate, and this says so once, at the top. */
  rateNote = false,
  /* The customer app: the master's icon for package cards, how far they
     are, and Sambramo's booking flow and policy in place of the listing's. */
  tradeIcon = null, nearby = null, customerTerms = null,
}) {
  const edit = onEditSection || null
  const show = key => !focus || focus.includes(key)
  const prefix = useMemo(() => 'sb-' + Math.random().toString(36).slice(2, 8), [])
  const [viewer, setViewer] = useState(null)
  const sections = [
    { key: 'about', label: 'About' },
    { key: 'work', label: 'Work' },
    (model.packages.length || model.menus.length) && { key: 'offers', label: model.menus.length ? 'Menus' : 'Packages' },
    (model.rules.length || model.items.length || model.extras.length) && { key: 'pricing', label: 'Pricing' },
    (model.facts.length || model.checks.length) && { key: 'glance', label: 'Details' },
    { key: 'terms', label: 'Booking' },
    { key: 'reviews', label: 'Reviews' },
  ].filter(Boolean)
  const [active, setActive] = useState('about')
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id.replace(prefix + '-', ''))
    }, { rootMargin: '-30% 0px -60% 0px' })
    root.querySelectorAll('[data-sb-section]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [prefix, sections.length])

  const go = key => {
    setActive(key)
    document.getElementById(prefix + '-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Order.Provider value={sections.map(s => s.key)}>
    <article ref={ref} className="sb-store w-full bg-[#FBF9FF] pb-4 text-[#1B1433]" data-storefront>
      {rateNote && (
        <p className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-[#F1EAFF] px-3 py-2 text-[12px] font-bold leading-snug text-[#4B1D96]" data-rate-note>
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#16A34A]" />
          Live preview · amounts are shown at your rate
        </p>
      )}
      {show('profile') && <Hero model={model} onOpen={setViewer} onEdit={edit} />}
      {show('profile') && <Identity model={model} avatarSlot={avatarSlot} onEdit={edit} nearby={nearby} />}
      {!focus && <SectionNav sections={sections} active={active} onGo={go} />}
      {show('about') && <About model={model} id={prefix + '-about'} onEdit={edit} />}
      {show('work') && <Work model={model} id={prefix + '-work'} onOpen={setViewer} onEdit={edit} />}
      {show('offers') && <Offers model={model} id={prefix + '-offers'} onPick={onPick} selectedId={selectedId} onEdit={edit} tradeIcon={tradeIcon} />}
      {show('pricing') && <Pricing model={model} id={prefix + '-pricing'} onEdit={edit} />}
      {show('glance') && <Glance model={model} id={prefix + '-glance'} onEdit={edit} />}
      {show('terms') && <Terms model={model} id={prefix + '-terms'} onEdit={edit} customer={customerTerms} />}
      {!focus && <Trust verified={model.verified} />}
      {!focus && <Reviews model={model} id={prefix + '-reviews'} />}
      {showBookingCtaPreview && (
        <div className="mx-3 mt-4 rounded-[22px] bg-white p-3.5 ring-1 ring-[#EEE8F8]">
          <div aria-label="Customer action preview" className={'flex min-h-[50px] items-center justify-center gap-2 rounded-full px-4 text-[14px] font-extrabold text-white ' + (model.instant ? 'bg-gradient-to-r from-[#5B21A8] to-[#7C3AED]' : 'bg-[#4E4669]')}>
            {model.instant ? <><Zap size={16} className="fill-current" />Instant Book & Pay</> : 'Check availability & request a quote'}
          </div>
          <p className="mt-2 text-center text-[11px] text-[#8E87A6]">Preview only · availability and the final amount are confirmed before payment.</p>
        </div>
      )}
      {viewer != null && <MediaViewer media={model.media} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </article>
    </Order.Provider>
  )
}
