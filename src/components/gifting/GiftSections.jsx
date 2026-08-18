import { Link } from 'react-router-dom'
import {
  ChevronRight, Camera, Clock, Receipt, Phone, ShieldCheck, RefreshCw,
} from 'lucide-react'
import { festivalPill } from '../../data/giftingHome'

/**
 * The storefront's repeating furniture — the section head, the horizontal
 * rail, the occasion mosaic, the shelf strip and the promise strip.
 *
 * They live in one file because they are one system: every section on the
 * home screen is built from these five, and keeping them together is what
 * stops the third rail from acquiring its own padding. If a section needs a
 * layout none of these provide, that is a sign it should be a new primitive
 * here rather than bespoke markup on the page.
 *
 * Everything is white-grounded. Tints appear only inside tiles, never behind
 * a section, because a page that alternates background panels reads as a
 * stack of unrelated widgets — and the photographs are meant to be the only
 * colour that carries weight.
 */

/** Section heading with an optional "see everything" link. */
export function SectionHead({ title, sub, to, action = 'See all', className = '' }) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-3 px-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{sub}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="shrink-0 inline-flex items-center gap-0.5 whitespace-nowrap text-[11.5px] font-extrabold text-forest-700"
        >
          {action} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  )
}

/**
 * A horizontal scroller.
 *
 * `snap` is on by default: a rail that stops between two cards leaves a
 * half-tile at each edge and reads as broken rather than as scrollable. The
 * trailing spacer is what lets the last card clear the screen edge — without
 * it the final tile sits flush against the bezel and looks cut off.
 */
export function Rail({ children, className = '' }) {
  return (
    <div className={`-mx-0 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide ${className}`}>
      {children}
      <span aria-hidden="true" className="w-1 shrink-0" />
    </div>
  )
}

/**
 * The circular shortcut rail under the search field.
 *
 * Circles rather than squares, and this is not arbitrary: these are not
 * products, and a round tile is how every interface in the category signals
 * "this is a filter, not a thing you can buy". Mixing round shortcuts with
 * square products means the two are never confused at a glance.
 */
export function QuickRail({ items }) {
  return (
    <Rail className="pt-1">
      {items.map(item => (
        <Link
          key={item.id}
          to={item.to}
          className="flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 pt-1"
        >
          <span
            className={`flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br text-[26px] ring-1 ring-hairline/[0.07] transition-transform active:scale-95 ${item.tint}`}
          >
            {item.emoji}
          </span>
          <span className="text-center text-[10.5px] font-bold leading-tight text-ink-soft">{item.label}</span>
        </Link>
      ))}
    </Rail>
  )
}

/**
 * The occasion mosaic — "what is this for?".
 *
 * A two-column grid where a tile may take the full width. The date pill is
 * driven by `festivalPill`, which returns null for anything without a date or
 * with one already passed, so the mosaic degrades to plain occasion tiles
 * rather than advertising a festival that has been and gone.
 */
export function OccasionMosaic({ tiles }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4">
      {tiles.map(t => {
        const pill = festivalPill(t.occasion)
        return (
          <Link
            key={t.id}
            to={`/shop/${encodeURIComponent(t.category)}?occasion=${encodeURIComponent(t.occasion)}`}
            className={[
              'relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl',
              'bg-gradient-to-br p-3 ring-1 ring-hairline/[0.07]',
              'transition-transform active:scale-[0.985]',
              t.tint,
              t.span === 'wide' ? 'col-span-2 min-h-[100px]' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="relative z-10 max-w-[80%]">
              {pill && (
                <span
                  className={`mb-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                    pill.urgent ? 'bg-chilli-600 text-white' : 'bg-white/80 text-ink-soft'
                  }`}
                >
                  {pill.text}
                </span>
              )}
              <p className={`text-[14px] font-extrabold leading-tight ${t.accent ?? 'text-ink'}`}>{t.label}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-ink-soft">{t.sub}</p>
            </div>

            <span className="relative z-10 mt-2 inline-flex items-center gap-0.5 text-[11px] font-extrabold text-ink">
              Browse <ChevronRight size={12} />
            </span>

            {/* The emoji is scenery: oversized, low-contrast, bleeding off the
                corner. It gives the tile a subject without a photograph,
                which matters on a shelf whose products have no shot yet. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-2 select-none text-[62px] opacity-[0.18]"
            >
              {t.emoji}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

/**
 * One shelf, as a strip: a headline, a reason, and the four ways people
 * actually ask for it.
 *
 * This replaces the plain category grid. A grid of six shelf names asks the
 * customer to translate what they want ("roses") into our filing system
 * ("Flowers"); the strip does the translation for them and gets them into a
 * filtered listing in one tap rather than three.
 */
export function ShelfStrip({ strip }) {
  const to = `/shop/${encodeURIComponent(strip.category)}`
  return (
    <section className="px-4">
      <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ring-1 ring-hairline/[0.07] ${strip.tint}`}>
        <Link to={to} className="block px-4 pb-3 pt-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-[30px] leading-none">{strip.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-extrabold leading-tight text-ink">{strip.title}</h3>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{strip.blurb}</p>
            </div>
            <ChevronRight size={16} className="mt-1 shrink-0 text-ink-mute" />
          </div>
        </Link>

        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {strip.ways.map(w => (
            <Link
              key={w.label}
              to={`${to}?occasion=${encodeURIComponent(w.occasion)}`}
              className="shrink-0 whitespace-nowrap rounded-full bg-white/85 px-3 py-1.5 text-[11.5px] font-bold text-ink ring-1 ring-hairline/[0.08] transition-transform active:scale-95"
            >
              {w.label}
            </Link>
          ))}
          <Link
            to={to}
            className="shrink-0 whitespace-nowrap rounded-full bg-forest-800 px-3 py-1.5 text-[11.5px] font-bold text-white transition-transform active:scale-95"
          >
            All →
          </Link>
        </div>
      </div>
    </section>
  )
}

const PROMISE_ICONS = {
  camera: Camera, clock: Clock, receipt: Receipt,
  phone: Phone, shield: ShieldCheck, refresh: RefreshCw,
}

/**
 * The six promises.
 *
 * Placed low on the home screen deliberately. It is not a hero — somebody who
 * arrived to buy a cake should reach the cakes first — but it is the section
 * that answers "why you and not the one I already have installed", and that
 * question gets asked on the way back up, not on the way down.
 */
export function PromiseStrip({ promises }) {
  return (
    <section className="px-4">
      <div className="rounded-2xl bg-forest-800 p-4 text-white">
        <h2 className="text-[16px] font-extrabold leading-tight">What we will not do to you</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-forest-100">
          Six things this category gets wrong often enough that people have stopped expecting better.
          Each of these is something we actually do, not something we say.
        </p>

        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {promises.map(p => {
            const Icon = PROMISE_ICONS[p.icon] ?? ShieldCheck
            return (
              <div key={p.id} className="flex gap-2.5 rounded-xl bg-white/[0.07] p-3">
                <Icon size={16} className="mt-0.5 shrink-0 text-forest-200" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold leading-tight">{p.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-forest-100">{p.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** The editorial guide cards — "how do I choose", answered rather than filtered. */
export function GuideRail({ guides }) {
  return (
    <Rail>
      {guides.map(g => (
        <Link
          key={g.id}
          to={g.to}
          className={`flex w-[214px] shrink-0 snap-start flex-col justify-between rounded-2xl bg-gradient-to-br p-3.5 ring-1 ring-hairline/[0.07] transition-transform active:scale-[0.98] ${g.tint}`}
        >
          <span aria-hidden="true" className="text-[24px] leading-none">{g.emoji}</span>
          <div className="mt-3">
            <p className="text-[13px] font-extrabold leading-tight text-ink">{g.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-ink-soft">{g.sub}</p>
          </div>
          <span className="mt-3 inline-flex items-center gap-0.5 text-[11px] font-extrabold text-forest-800">
            Read <ChevronRight size={12} />
          </span>
        </Link>
      ))}
    </Rail>
  )
}
