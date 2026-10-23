/**
 * The customer app's small parts. Everything here is shared by at least
 * two screens; anything used once lives with its screen.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Gift, House, LayoutGrid, PartyPopper, ShoppingBag, Star, UserRound, X, Zap } from 'lucide-react'
import { usePlan } from '../state/PlanContext'
import { rupees, plural } from '../lib/format'
import { planFloor } from '../lib/estimate'

/* ── A photograph that never shows a broken-image icon ─────────────── */
export function Photo({ src, alt = '', className = '', eager = false }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} onError={() => setOk(false)} />
}

/* ── The navigation: a floating bar with a living centre ─────────────
 * Four places (Home, Services, My Bookings, Account) on a white pill that
 * floats off the bottom edge, and between them an amethyst orb ringed by
 * a slow band of light. The orb is the fastest way to start anything —
 * plan a celebration, book one master, pick up the plan in progress,
 * invite a friend — so it opens a sheet of exactly those, never a fifth
 * page. The basket is still not a tab: it is the bar above this one. */
const TABS = [
  { to: '/', label: 'Home', icon: House, match: p => p === '/' || p.startsWith('/c/') || p === '/explore' },
  { to: '/s', label: 'Services', icon: LayoutGrid, match: p => p === '/s' || p.startsWith('/s/') },
  null,
  { to: '/plans', label: 'My Bookings', icon: CalendarDays, match: p => p.startsWith('/plans') },
  { to: '/me', label: 'Account', icon: UserRound, match: p => p.startsWith('/me') },
]
export function TabBar() {
  const { pathname } = useLocation()
  const [quick, setQuick] = useState(false)
  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] px-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }} aria-label="Main">
        <div className="pointer-events-auto relative mx-auto grid h-[66px] max-w-[540px] grid-cols-5 items-center rounded-[26px] bg-white/95 px-1 shadow-[0_0_0_1px_#EEE6FA,0_18px_40px_-18px_rgba(58,18,144,.55)] backdrop-blur-xl">
          {TABS.map((t, i) => t ? (
            <Link key={t.to} to={t.to} className="cx-press relative flex flex-col items-center gap-0.5" aria-current={t.match(pathname) ? 'page' : undefined} data-tab={t.label}>
              <span className={'grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ' + (t.match(pathname) ? 'bg-[var(--am-100)] text-[var(--brand)]' : 'text-[#A49DB8]')}>
                <t.icon size={21} strokeWidth={t.match(pathname) ? 2.5 : 2} />
              </span>
              <span className={'text-[10.5px] font-extrabold tracking-[-0.01em] ' + (t.match(pathname) ? 'text-[var(--brand)]' : 'text-[#A49DB8]')}>{t.label}</span>
            </Link>
          ) : (
            <div key={i} className="relative flex justify-center">
              <button type="button" onClick={() => setQuick(true)} aria-label="Start something" data-orb
                className="cx-press cx-orb absolute -top-[42px] h-[60px] w-[60px] rounded-full ring-[5px] ring-white">
                <span className="cx-orb-track" aria-hidden />
                <span className="cx-orb-ring" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </nav>
      <QuickSheet open={quick} onClose={() => setQuick(false)} />
    </>
  )
}

function QuickSheet({ open, onClose }) {
  const navigate = useNavigate()
  const { basket } = usePlan()
  const go = to => { onClose(); navigate(to) }
  const items = [
    { icon: PartyPopper, title: 'Plan a celebration', sub: '438 occasions, every master it needs', to: '/explore#celebrations' },
    { icon: Zap, title: 'Book one master now', sub: 'A photographer, a cook, a DJ — instantly', to: '/s' },
    ...(basket.length ? [{ icon: ShoppingBag, title: `Your plan · ${plural(basket.length, 'master')}`, sub: 'Review, negotiate and pay', to: '/plan' }] : []),
    { icon: Gift, title: 'Invite a friend', sub: 'Celebrate together', to: '/refer' },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="What shall we start?">
      <div className="grid gap-2.5 pb-3">
        {items.map(x => (
          <button key={x.title} type="button" onClick={() => go(x.to)} className="cx-press flex items-center gap-3 rounded-[20px] bg-[var(--am-50)] p-3.5 text-left ring-1 ring-[var(--am-200)]" data-quick={x.title}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white text-[var(--brand)] shadow-[0_8px_18px_-12px_rgba(58,18,144,.8)]"><x.icon size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold tracking-[-0.02em]">{x.title}</span>
              <span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">{x.sub}</span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-[var(--am-ink)]" />
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ── The plan bar: what is chosen, what it comes to, one tap to review ── */
export function PlanBar({ withTabs = true }) {
  const { basket, event } = usePlan()
  const navigate = useNavigate()
  if (!basket.length) return null
  const { paise: total } = planFloor(basket, event)
  const instant = basket.filter(l => l.instant).length
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[140] px-3" style={{ bottom: withTabs ? 'calc(env(safe-area-inset-bottom, 0px) + 88px)' : 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <button type="button" onClick={() => navigate('/plan')} data-plan-bar
        className="cx-press cx-pop pointer-events-auto mx-auto flex w-full max-w-[540px] items-center gap-3 rounded-[22px] bg-gradient-to-b from-[#F1E9FF] to-[#E2D2FF] p-2 pr-2.5 text-left text-[var(--am-ink)] shadow-[0_0_0_1px_#D6C2FF,0_18px_36px_-16px_rgba(58,18,144,.75)]">
        <span className="flex shrink-0 -space-x-3 pl-1">
          {basket.slice(0, 3).map(l => (
            <span key={l.key} className="relative h-9 w-9 overflow-hidden rounded-[13px] bg-white ring-2 ring-[#EAE0FF]">
              <Photo src={l.cover} className="h-full w-full object-cover" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-extrabold">{plural(basket.length, 'service')} picked</span>
          <span className="block truncate text-[12px] font-bold text-[#5B3FA0]">
            {total ? <><span className="cx-num">{rupees(total)}</span> onwards</> : 'Quotes on the way'}{instant ? ` · ${instant} instant` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-[13px] font-extrabold text-[var(--am-ink)] shadow-[0_4px_10px_-6px_rgba(58,18,144,.6)]">Review <ArrowRight size={15} /></span>
      </button>
    </div>
  )
}

/* ── Sheets render into <body>, never inside a page that might animate ── */
export function Sheet({ open, onClose, title, children, footer = null }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) { setMounted(true); const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); return () => cancelAnimationFrame(r) }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 320)
    return () => clearTimeout(t)
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = e => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!mounted) return null
  return createPortal(
    <div className="cx">
      <div className="cx-sheet-back" data-open={shown} onClick={onClose} />
      <section className="cx-sheet" data-open={shown} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sticky top-0 z-10 bg-white/95 px-5 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#E3DEEE]" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="cx-press cx-btn grid h-9 w-9 place-items-center rounded-full"><X size={18} /></button>
          </div>
        </div>
        <div className="px-5">{children}</div>
        {footer && <div className="sticky bottom-0 mt-4 bg-white px-5 pt-3">{footer}</div>}
      </section>
    </div>,
    document.body,
  )
}

/* ── A header for every screen below the tabs ──────────────────────── */
export function BackHeader({ title, sub = null, right = null, onBack, transparent = false }) {
  const navigate = useNavigate()
  const back = onBack ?? (() => (window.history.length > 1 ? navigate(-1) : navigate('/')))
  return (
    <header className={'cx-safe-top sticky top-0 z-[120] px-3 pb-2 ' + (transparent ? '' : 'bg-white/95 backdrop-blur-xl')}>
      <div className="flex min-h-[44px] items-center gap-2">
        <button type="button" onClick={back} aria-label="Back" className={'cx-press grid h-11 w-11 shrink-0 place-items-center rounded-full ' + (transparent ? 'cx-glass-light' : 'cx-btn')}><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1 px-1">
          {title && <h1 className="truncate text-[17px] font-extrabold tracking-[-0.02em]">{title}</h1>}
          {sub && <p className="truncate text-[12px] font-semibold text-[var(--ink-3)]">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

export function SectionHead({ title, sub = null, action = null, className = '' }) {
  return (
    <div className={'flex items-end justify-between gap-3 px-4 pb-3 ' + className}>
      <div className="min-w-0">
        <h2 className="text-[20px] font-extrabold tracking-[-0.03em]">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function InstantBadge({ glass = true, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ' + (glass ? 'cx-glass ' : 'bg-[#FFF4DA] text-[#7A4B00] ') + className}>
      <Zap size={12} className="fill-[var(--gold)] text-[var(--gold)]" />Instant
    </span>
  )
}

export function RatingChip({ rating, reviews, glass = true }) {
  if (!rating) return <span className={'rounded-full px-2 py-1 text-[11px] font-extrabold ' + (glass ? 'cx-glass' : 'bg-[var(--soft)]')}>New</span>
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ' + (glass ? 'cx-glass' : 'bg-[var(--soft)] text-[var(--ink)]')}>
      <Star size={11} className="fill-[var(--gold)] text-[var(--gold)]" />
      <span className="cx-num">{rating.toFixed(1)}</span>
      {reviews ? <span className="cx-num font-bold opacity-75">({reviews})</span> : null}
    </span>
  )
}

export function Chip({ on, children, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={'cx-press shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold transition ' +
        (on ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn') + ' ' + className}>
      {children}
    </button>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="relative grid rounded-[18px] bg-[var(--soft)] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="tablist">
      <span className="absolute bottom-1 top-1 rounded-[14px] bg-white shadow-[0_6px_16px_-8px_rgba(43,14,102,.35)] transition-all duration-300"
        style={{ left: `calc(${(100 / options.length) * options.findIndex(o => o.value === value)}% + 4px)`, width: `calc(${100 / options.length}% - 8px)` }} />
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={'relative z-10 flex items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-[13.5px] font-extrabold transition ' + (o.value === value ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]')}>
          {o.icon && <o.icon size={16} />}{o.label}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={'cx-shimmer rounded-[22px] ' + className} />
}

export function Empty({ title, body, action = null }) {
  return (
    <div className="mx-4 rounded-[24px] bg-[var(--soft)] px-5 py-8 text-center">
      <p className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-[var(--ink-2)]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** The pinned primary action at the foot of a focused screen. */
export function ActionBar({ children, note = null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-[var(--line)] bg-white/95 px-4 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <div className="mx-auto max-w-[540px]">
        {children}
        {note && <p className="mt-2 text-center text-[11.5px] font-semibold text-[var(--ink-3)]">{note}</p>}
      </div>
    </div>
  )
}
