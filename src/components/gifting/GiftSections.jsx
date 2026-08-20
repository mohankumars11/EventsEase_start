import { Link } from 'react-router-dom'
import {
  ChevronRight, Camera, Clock, Receipt, Phone, ShieldCheck, RefreshCw,
} from 'lucide-react'
import ProductImage from '../shop/ProductImage'
import PhotoDeck from './PhotoDeck'
import { festivalPill, TILE_COLOURS } from '../../data/giftingHome'

/**
 * The storefront's repeating furniture — the section head, the rail, the
 * square tile, the occasion mosaic, the shelf banner and the promise strip.
 *
 * They live in one file because they are one system: every section on the
 * home screen is built from these, and keeping them together is what stops
 * the third rail from acquiring its own padding. If a section needs a layout
 * none of these provide, that is a sign it should be a new primitive here
 * rather than bespoke markup on the page.
 *
 * ── Two rules the whole page obeys ───────────────────────────────────────
 *
 * **The ground is pure white and nothing tints it.** Colour appears only
 * inside a tile. A page that alternates background panels reads as a stack of
 * unrelated widgets, and it makes the photographs — the only thing on a
 * gifting page that actually sells anything — compete with their own backing.
 *
 * **A tile is square and its name sits underneath it.** Not over the photo,
 * not inside the card. A caption laid over an image is legible only if the
 * image cooperates, which across a catalogue of hundreds of supplier
 * photographs it does not; a scrim dark enough to fix that hides the product.
 * Underneath, every label in a row shares a baseline, long names wrap instead
 * of truncating, and the photo is never covered.
 */

/** Resolve a palette token to its `{ bg, ink }` pair, with a safe default. */
const paletteOf = key => TILE_COLOURS[key] ?? TILE_COLOURS.sand

/** Section heading with an optional "see everything" link. */
export function SectionHead({ title, sub, to, action = 'See all', className = '' }) {
  return (
    <div className={`mb-3.5 flex items-end justify-between gap-3 px-5 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[18px] font-extrabold leading-tight tracking-tight text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[12px] leading-snug text-ink-mute">{sub}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="shrink-0 inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-extrabold text-accent"
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
    <div className={`flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-1 scrollbar-hide ${className}`}>
      {children}
      <span aria-hidden="true" className="w-1 shrink-0" />
    </div>
  )
}

/**
 * One square tile with its name underneath — the unit the whole page is
 * built from.
 *
 * The photo sits in a coloured square. That colour is not decoration: most of
 * these products are photographed on white, so a white tile behind a white
 * cut-out gives a floating object with no edge, and the row loses its rhythm.
 * The tint is the tile's own ground and it shows through wherever the
 * photograph does not reach.
 *
 * The emoji underneath the photo is the fallback, not an alternative. It is
 * always mounted and the photograph fades in on top of it, so a shelf with no
 * imagery yet still renders a complete, coloured, legible row — which on a
 * pre-launch catalogue is most of them.
 */
export function SquareTile({ to, label, sub, emoji, colour, photo, query, size = 'md' }) {
  const { bg, ink } = paletteOf(colour)
  const width = size === 'lg' ? 'w-[128px]' : size === 'sm' ? 'w-[82px]' : 'w-[98px]'

  return (
    <Link to={to} className={`group flex shrink-0 snap-start flex-col ${width}`}>
      {/* Slightly bigger radius and a real lift on press, rather than the flat
          ring the tile used to rely on alone to separate itself from the
          page — a soft shadow is what makes a photo tile read as an object
          sitting above the ground instead of a cutout pasted onto it. */}
      <span
        className="relative block aspect-square w-full overflow-hidden rounded-[22px] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.04] transition-transform duration-200 group-active:scale-[0.94]"
        style={{ backgroundColor: bg }}
      >
        {photo || query ? (
          <ProductImage
            src={photo}
            query={photo ? undefined : query}
            emoji={emoji}
            alt=""
            className="!bg-transparent h-full w-full"
            cinematic
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[32px]">{emoji}</span>
        )}
      </span>

      {/* The name, underneath, on the page's own ground — never over the photo. */}
      <span className="mt-2.5 block text-center text-[12px] font-bold leading-tight text-ink">
        {label}
      </span>
      {sub && (
        <span className="mt-0.5 block text-center text-[10px] font-semibold leading-tight" style={{ color: ink }}>
          {sub}
        </span>
      )}
    </Link>
  )
}

/**
 * The shortcut rail under the search field — squares, names below.
 */
export function QuickRail({ items }) {
  return (
    <Rail className="pt-1">
      {items.map(item => (
        <SquareTile
          key={item.id}
          to={item.to}
          label={item.label}
          emoji={item.emoji}
          colour={item.colour}
          query={item.query}
        />
      ))}
    </Rail>
  )
}

/**
 * A rail of square product-photo tiles with names underneath — "Plants for
 * every corner", "Ways into birthdays".
 *
 * Takes already-resolved entries so the page decides what belongs in it; this
 * component only knows how to lay out squares.
 */
export function TileRail({ items, size = 'lg' }) {
  if (!items?.length) return null
  return (
    <Rail>
      {items.map(t => (
        <SquareTile
          key={t.id}
          to={t.to}
          label={t.label}
          sub={t.sub}
          emoji={t.emoji}
          colour={t.colour}
          photo={t.photo}
          query={t.query}
          size={size}
        />
      ))}
    </Rail>
  )
}

/**
 * A grid of square tiles with their names underneath.
 *
 * The rail's layout, wrapped instead of scrolled. A rail is right when the
 * row is a sample of something larger and the first three entries are the
 * important ones; a grid is right when the set is finite and every member
 * matters equally, because everything in it is reachable by scrolling the
 * page the reader is already scrolling rather than by a sideways swipe most
 * people never make.
 *
 * `meta` is the optional third line — a from-price, a count. It sits under
 * the name in the tile's own ink so it reads as belonging to that tile rather
 * than as body copy that happens to be nearby.
 */
export function SquareGrid({ items, cols = 3, className = '' }) {
  if (!items?.length) return null
  const grid = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <div className={`grid ${grid} gap-x-3 gap-y-4 px-4 ${className}`}>
      {items.map((t, i) => {
        const { bg, ink } = paletteOf(t.colour)
        // An item carrying several photographs gets the deck; one photograph
        // stays a still. The stagger is derived from the position rather than
        // stored, so a grid of any length still deals out of step.
        const deck = Array.isArray(t.photos) ? t.photos.filter(Boolean) : []

        return (
          <Link key={t.id} to={t.to} className="group flex flex-col">
            <span className="relative block aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-hairline/[0.06] transition-transform duration-200 active:scale-95">
              {deck.length > 1 ? (
                <PhotoDeck
                  photos={deck}
                  emoji={t.emoji}
                  alt={t.label}
                  tint={bg}
                  stagger={i * 430}
                  className="h-full w-full rounded-2xl"
                />
              ) : (
                <span className="block h-full w-full" style={{ backgroundColor: bg }}>
                  {t.photo || deck[0] || t.query ? (
                    <ProductImage
                      src={t.photo ?? deck[0]}
                      query={(t.photo ?? deck[0]) ? undefined : t.query}
                      emoji={t.emoji}
                      alt=""
                      className="!bg-transparent h-full w-full"
                      cinematic
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[32px]">{t.emoji}</span>
                  )}
                </span>
              )}
            </span>

            <span className="mt-2 block text-center text-[11.5px] font-bold leading-tight text-ink">
              {t.label}
            </span>
            {t.meta && (
              <span
                className="mt-0.5 block text-center text-[10px] font-extrabold leading-tight"
                style={{ color: ink }}
              >
                {t.meta}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * The occasion mosaic — "what is this for?".
 *
 * A two-column grid of coloured tiles. The label and its reason sit top-left
 * on the flat colour where they are always legible; the photograph fills the
 * bottom-right and bleeds off the corner, so the tile has a subject without
 * ever putting type over an image.
 *
 * The date pill comes from `festivalPill`, which returns null for anything
 * without a date or with one already passed — so the mosaic degrades to plain
 * occasion tiles rather than advertising a festival that has been and gone.
 */
export function OccasionMosaic({ tiles }) {
  return (
    <div className="a-stagger grid grid-cols-2 gap-3.5 px-5">
      {tiles.map(t => {
        const pill = festivalPill(t.occasion)
        const { bg, ink } = paletteOf(t.colour)
        const wide = t.span === 'wide'

        return (
          <Link
            key={t.id}
            // The occasion route, not one shelf filtered by it. A birthday is
            // cakes AND flowers AND gifts; sending this tile to
            // /shop/Cakes?occasion=Birthday answered a question about the whole
            // catalogue with a single shelf's contents, which is what made the
            // mosaic feel like a menu of categories wearing occasion names.
            to={`/shop/occasion/${encodeURIComponent(t.occasion)}`}
            // Hero framing: this is the lead section of the shop now, so its
            // tiles get the largest radius in the system and a real shadow —
            // the flat ring these used to carry was sized for a secondary
            // strip, and a secondary strip is no longer what this is.
            className={[
              'relative flex min-h-[148px] flex-col overflow-hidden rounded-[28px] p-4',
              'shadow-[0_16px_34px_-18px_rgba(0,0,0,0.32)] transition-transform active:scale-[0.98]',
              wide ? 'col-span-2 min-h-[126px]' : '',
            ].filter(Boolean).join(' ')}
            style={{ backgroundColor: bg }}
          >
            <div className={`relative z-10 ${wide ? 'max-w-[62%]' : 'max-w-[74%]'}`}>
              {pill && (
                <span
                  className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                    pill.urgent ? 'bg-chilli-600 text-white' : 'bg-white/70'
                  }`}
                  style={pill.urgent ? undefined : { color: ink }}
                >
                  {pill.text}
                </span>
              )}
              <p className="flex items-center gap-1 text-[16px] font-extrabold leading-tight tracking-tight" style={{ color: ink }}>
                {t.label} <ChevronRight size={15} />
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-snug opacity-80" style={{ color: ink }}>
                {t.sub}
              </p>
            </div>

            {/* The subject, bleeding off the bottom-right corner. A real
                photograph when the shelf has one, the emoji when it does not
                — and the emoji is sized and faded so an unphotographed tile
                still looks composed rather than unfinished. */}
            {t.photo ? (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-0 right-0 overflow-hidden rounded-tl-[28px] ${
                  wide ? 'h-[92%] w-[34%]' : 'h-[54%] w-[58%]'
                }`}
              >
                <ProductImage src={t.photo} emoji={t.emoji} alt="" className="!bg-transparent h-full w-full" />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -right-2 select-none text-[68px] opacity-25"
              >
                {t.emoji}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * One shelf, as a banner with the ways into it underneath.
 *
 * This replaces a plain category grid. A grid of six shelf names asks the
 * customer to translate what they want ("roses") into our filing system
 * ("Flowers"); the banner does the translation for them and lands them in a
 * filtered listing in one tap rather than three.
 *
 * The ways in sit on white BELOW the coloured banner rather than on top of
 * it, as square photo tiles with their names underneath — the same unit the
 * rest of the page is built from. On the banner they had to be semi-opaque
 * white to stay readable, which made every shelf's chips a slightly different
 * colour depending on the tint behind them.
 */
export function ShelfBanner({ strip }) {
  const to = `/shop/${encodeURIComponent(strip.category)}`
  const { bg, ink } = paletteOf(strip.colour)

  return (
    <section className="px-4">
      <Link
        to={to}
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-4 ring-1 ring-hairline/[0.05] transition-transform active:scale-[0.99]"
        style={{ backgroundColor: bg }}
      >
        <span aria-hidden="true" className="text-[30px] leading-none">{strip.emoji}</span>
        {/* A real <h3>, not a styled span. These are the page's shelf names,
            so they have to appear in the document outline — a screen-reader
            user navigating by heading should be able to jump between shelves,
            and with spans there is nothing to jump to. A heading inside an
            anchor is valid. */}
        <span className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold leading-tight" style={{ color: ink }}>
            {strip.title}
          </h3>
          <span className="mt-0.5 block text-[11px] font-semibold leading-snug opacity-80" style={{ color: ink }}>
            {strip.blurb}
          </span>
        </span>
        <ChevronRight size={17} className="shrink-0" style={{ color: ink }} />
      </Link>

      {strip.ways.length > 0 && (
        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
          {strip.ways.map(w => (
            <SquareTile
              key={w.label}
              to={`${to}?occasion=${encodeURIComponent(w.occasion)}`}
              label={w.label}
              emoji={w.emoji ?? strip.emoji}
              colour={w.colour ?? strip.colour}
              photo={w.photo}
              query={w.photo ? undefined : `${w.label} ${strip.category}`}
            />
          ))}
          {/* "Everything on this shelf" is the same shape as its neighbours
              rather than a chip, so the row has one rhythm and the last tile
              is not a different kind of object from the ones before it. */}
          <Link to={to} className="flex w-[96px] shrink-0 snap-start flex-col">
            <span className="flex aspect-square w-full items-center justify-center rounded-2xl bg-forest-800 text-white ring-1 ring-hairline/[0.06] transition-transform active:scale-95">
              <ChevronRight size={26} />
            </span>
            <span className="mt-2 block text-center text-[11.5px] font-bold leading-tight text-ink">
              See all
            </span>
          </Link>
        </div>
      )}
    </section>
  )
}

/** Kept as the previous name so nothing that imported it breaks. */
export const ShelfStrip = ShelfBanner

const PROMISE_ICONS = {
  camera: Camera, clock: Clock, receipt: Receipt,
  phone: Phone, shield: ShieldCheck, refresh: RefreshCw,
}

/**
 * The six promises.
 *
 * Placed low on the page deliberately. It is not a hero — somebody who
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
      {guides.map(g => {
        const { bg, ink } = paletteOf(g.colour)
        return (
          <Link
            key={g.id}
            to={g.to}
            className="flex w-[218px] shrink-0 snap-start flex-col justify-between rounded-2xl p-3.5 ring-1 ring-hairline/[0.05] transition-transform active:scale-[0.98]"
            style={{ backgroundColor: bg }}
          >
            <span aria-hidden="true" className="text-[24px] leading-none">{g.emoji}</span>
            <span className="mt-3 block">
              <span className="block text-[13px] font-extrabold leading-tight" style={{ color: ink }}>{g.title}</span>
              <span className="mt-1 block text-[10.5px] font-semibold leading-snug opacity-80" style={{ color: ink }}>{g.sub}</span>
            </span>
            <span className="mt-3 inline-flex items-center gap-0.5 text-[11px] font-extrabold" style={{ color: ink }}>
              Read <ChevronRight size={12} />
            </span>
          </Link>
        )
      })}
    </Rail>
  )
}
