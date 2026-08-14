import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Camera, Check, Clock, Maximize2, Sparkles, Plus, X, ChevronRight, ChevronLeft,
  Search, ShoppingCart, LayoutGrid, Rows3,
} from 'lucide-react'
import {
  CATALOG_BY_OCCASION, BUDGET_BANDS, categoriesForOccasion,
  catalogSummary, startingPointsFor,
} from '../../data/decorCatalog'
import { formatINR } from '../../utils/format'
import useDecorPhotos from '../../hooks/useDecorPhotos'
import ImageSourceBadge from '../shop/ImageSourceBadge'

/**
 * The décor catalogue, on the occasion's own page.
 *
 * ── What this replaced, twice ─────────────────────────────────────────────
 * First it replaced four sample photographs whose only forward action was a
 * link to /plan — a wizard, on another page, asking about guest counts.
 * Somebody who tapped a picture of a candlelight dinner because they wanted to
 * know what one costs was answered with a form.
 *
 * Then it replaced the thing that replaced it. The first catalogue rendered
 * every item for the occasion as one flat grid, which is fine at four and
 * wrong at twenty-nine: an anniversary became fifteen rows of cards inside a
 * page that already had a guest dial, two doors, eight priced tiers and a
 * service list under it. The section stopped being a catalogue and became a
 * wall. At the hundred items this catalogue is built to grow to, it would have
 * been unusable.
 *
 * ── The fix is that height stops depending on catalogue size ─────────────
 * Items are laid out as horizontal shelves, one per kind of décor, four
 * visible until the customer asks for more. A shelf is a fixed ~230px however
 * many setups are on it, so the section's height is a function of HOW MANY
 * KINDS OF THING WE SELL — which is about twelve and essentially fixed —
 * rather than of how many items are in the catalogue, which is meant to grow.
 * Adding fifty more setups makes the shelves longer, not the page.
 *
 * That is also how people actually shop this: nobody compares a mandap against
 * a photo string. They decide "I want the room done" and then compare the four
 * ways of doing a room, which is one shelf, side by side, with no scrolling
 * past anything irrelevant.
 *
 * ── Two modes, and the rule for which one is showing ─────────────────────
 * SHELVES while the customer is browsing — no search, no filter. GRID the
 * moment they narrow, because a narrowed set is small, and a person who has
 * just filtered to "under ₹2,500" wants to see all six of those at once rather
 * than hunt them across shelves. The mode is derived from the filters, not a
 * setting somebody has to find, and the toggle is there only to override.
 *
 * ── On the detail sheet, which reverses an earlier decision ──────────────
 * The flat-grid version expanded "what's in it" inline and its comment argued
 * against ever opening an overlay, because an earlier version had made the
 * whole card open a lightbox and turned every attempt to read a price into a
 * modal to dismiss.
 *
 * That argument was right about the cause and wrong about the fix. The problem
 * was that the PRICE was in the overlay. A 150px shelf card cannot hold a
 * five-line inclusion list, but it holds the photograph, the name and the price
 * comfortably — so everything needed to compare stays on the card, and the
 * sheet carries only the detail you go looking for. Comparing is free;
 * inspecting costs one tap and one Escape.
 */

/* ═══════════════════════════════════════════════════════════
   Photo — never collapses, never flashes
═══════════════════════════════════════════════════════════ */

/**
 * Same compositing contract as the gallery's SamplePhoto: the tinted plate and
 * the emoji sit underneath at all times and the photograph fades in on top, so
 * an item the resolver has not reached renders as a designed tile rather than
 * a hole in the shelf.
 */
function ItemPhoto({ item, className = '', sizes, eager = false }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-plum-800 to-berry-900 ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex select-none items-center justify-center text-3xl opacity-60"
      >
        {item.emoji}
      </span>

      {item.photo && !failed && (
        <img
          src={item.photo}
          alt={item.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`relative h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   One setup — the same card on a shelf and in a grid
═══════════════════════════════════════════════════════════ */

/**
 * One component for both layouts, sized by its container rather than by a
 * `variant` prop.
 *
 * Two card components drift. The shelf one gets a price format the grid one
 * does not, somebody fixes the selected state in one place, and the two
 * versions of the same setup start disagreeing about what they cost. The only
 * real difference between the layouts is width, and width is the parent's
 * business.
 *
 * The whole tile is one button that opens the sheet, with the select control
 * layered above it as a separate button — so a tap anywhere reads the setup and
 * the deliberate act of choosing it has its own target. `stopPropagation` on
 * the tick is what keeps selecting from also opening the sheet.
 */
function DecorCard({ item, selected, onToggle, onOpen, inCart, eager = false }) {
  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface-sunk/[0.06] text-left ring-1 transition-[background-color,box-shadow] ${
        selected ? 'bg-surface-sunk/[0.06] shadow-lg ring-2' : 'ring-hairline/10 hover:bg-surface-sunk/[0.06]'
      }`}
      style={selected ? { '--tw-ring-color': 'var(--event-glow-line)' } : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-hairline/10"
        aria-label={`${item.name} — from ${formatINR(item.price)}. See what is included.`}
      >
        <div className="relative w-full">
          <ItemPhoto
            item={item}
            className="h-28 w-full sm:h-32"
            sizes="(min-width: 1024px) 220px, 160px"
            eager={eager}
          />

          {/* "Our pick", never "Most booked". Sambramo is pre-launch and has no
              booking history — `popular` is a recommendation from market
              research, and a badge claiming otherwise would be the same lie as
              captioning a stock photograph "our recent work". */}
          {item.popular && (
            <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
              <Sparkles size={8} /> Our pick
            </span>
          )}

          {inCart && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white backdrop-blur-sm">
              <Check size={8} /> In cart
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5">
          <h3 className="line-clamp-2 text-[12px] font-extrabold leading-tight text-ink">
            {item.name}
          </h3>
          {/* Price and the size it buys, on the card, always. This is the pair
              that makes comparison possible without opening anything — and the
              reason the sheet is allowed to exist at all. */}
          <p className="mt-1 text-[13px] font-extrabold leading-none" style={{ color: 'var(--event-glow-ink)' }}>
            from {formatINR(item.price)}
          </p>
          <p className="mt-1 line-clamp-1 text-[9.5px] text-ink-mute">{item.where}</p>
        </div>
      </button>

      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle(item) }}
        aria-pressed={selected}
        aria-label={selected ? `Remove ${item.name}` : `Select ${item.name}`}
        className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full transition-transform active:scale-90 ${
          selected ? 'text-gray-900 shadow-lg' : 'bg-black/45 text-white backdrop-blur-sm hover:bg-black/70'
        }`}
        style={selected ? { background: 'var(--event-glow)' } : undefined}
      >
        {selected ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   The detail sheet
═══════════════════════════════════════════════════════════ */

/**
 * Everything that will not fit on a 150px card.
 *
 * A bottom sheet rather than a centred dialog: this section is read on a phone
 * with one thumb, and the controls that matter — select, close — belong within
 * reach of it rather than at the top of a box in the middle of the screen. On
 * a wide viewport it centres, because a sheet pinned to the bottom of a 1400px
 * window is a strip of content the eye has to travel to.
 *
 * Escape closes, the backdrop closes, and body scroll is restored to whatever
 * it was rather than blanked — another overlay on this page may already own
 * the lock and clearing it here would unlock the page behind theirs.
 */
function DecorSheet({ item, selected, onToggle, onClose }) {
  const closeRef = useRef(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-plum-950/80 backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#1b0733] shadow-2xl ring-1 ring-hairline/10 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none sm:max-w-lg sm:rounded-3xl ${
          entered ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-5 opacity-0 sm:translate-y-0 sm:scale-[0.98]'
        }`}
      >
        <div className="relative shrink-0">
          <ItemPhoto item={item} className="h-44 w-full sm:h-52" sizes="(min-width: 640px) 512px, 100vw" eager />
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={17} />
          </button>
          <ImageSourceBadge source={item.source} size="sm" subject="setup" className="absolute bottom-3 left-3" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h2 className="text-[18px] font-extrabold leading-tight text-ink">{item.name}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">{item.blurb}</p>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[22px] font-extrabold leading-none" style={{ color: 'var(--event-glow-ink)' }}>
              from {formatINR(item.price)}
            </span>
            <span className="text-[11px] text-ink-mute">{item.where}</span>
          </div>

          <div className="mt-4 rounded-2xl bg-black/25 p-3.5 ring-1 ring-white/10">
            <p className="mb-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
              What gets installed
            </p>
            <ul className="space-y-2">
              {item.includes.map(line => (
                <li key={line} className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
                  <Check size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--event-glow-ink)' }} />
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline/10 pt-2.5 text-[10.5px] text-ink-mute">
              <span className="inline-flex items-center gap-1"><Clock size={11} /> {item.setup} to install</span>
              <span className="inline-flex items-center gap-1"><Maximize2 size={11} /> {item.where}</span>
            </div>
          </div>

          {/* The top of the band, stated only where there is room to explain
              what moves it. On the card it would read as a second price. */}
          {item.priceTo > item.price && (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
              {formatINR(item.price)} is this setup at the size above. A bigger space, fresher
              flowers or a longer install takes it toward {formatINR(item.priceTo)} — your quote
              says which and why.
            </p>
          )}

          {item.credit && <p className="mt-2 text-[9.5px] text-ink-mute">{item.credit}</p>}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black/25 p-3.5">
          <button
            onClick={() => { onToggle(item); onClose() }}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-extrabold transition-transform active:scale-[0.98] ${
              selected ? 'bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10' : 'text-gray-900'
            }`}
            style={selected ? undefined : { background: 'var(--event-glow)' }}
          >
            {selected
              ? <><X size={15} /> Remove from selection</>
              : <><Plus size={15} /> Select this setup</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   A shelf
═══════════════════════════════════════════════════════════ */

/**
 * One kind of décor, horizontally.
 *
 * Capped at TEN cards with a "see all" tile at the end rather than rendering
 * the whole category: a shelf you can flick for thirty seconds is a shelf
 * nobody reaches the end of, and the tile turns "there is more here" into one
 * tap that filters to exactly that kind. It is also what keeps the DOM bounded
 * — twelve shelves × ten is a hundred and twenty cards at absolute worst, and
 * the images below the fold are lazy.
 *
 * The arrows are rendered on wide viewports only. A phone flicks; a mouse has
 * nothing to flick with and a trackpad's horizontal scroll is a gesture most
 * people do not know they have.
 */
const SHELF_CAP = 10

function Shelf({ category, items, total, selected, onToggle, onOpen, hasItem, eventId, onSeeAll }) {
  const railRef = useRef(null)

  const page = dir => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 160), behavior: 'smooth' })
  }

  const shown = items.slice(0, SHELF_CAP)
  const more  = total - shown.length

  return (
    <section aria-labelledby={`shelf-${category.id}`} className="min-w-0">
      <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 id={`shelf-${category.id}`} className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-ink">
            <span aria-hidden="true">{category.emoji}</span>
            <span className="truncate">{category.name}</span>
            <span className="shrink-0 text-[11px] font-bold text-ink-mute">{total}</span>
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[10.5px] text-ink-mute">{category.blurb}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* A label, not a button. It read as one for a draft — "From ₹1,999 ›"
              with a chevron — and tapping a price to get a filtered list is a
              result nobody predicts from that wording. Filtering to one kind is
              already the category chip above and the "+N more" tile at the end
              of the rail, both of which say what they do. This just answers
              "what does this kind start at", which is the question somebody
              scanning eleven shelves is actually asking. */}
          <span className="whitespace-nowrap text-[11px] font-bold" style={{ color: 'var(--event-glow-ink)' }}>
            from {formatINR(category.from)}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            <button
              onClick={() => page(-1)}
              aria-label={`Scroll ${category.name} left`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink-soft transition-colors hover:bg-surface-sunk/[0.07] hover:text-ink"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => page(1)}
              aria-label={`Scroll ${category.name} right`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunk/[0.07] text-ink-soft transition-colors hover:bg-surface-sunk/[0.07] hover:text-ink"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1"
      >
        {shown.map((item, i) => (
          <div key={item.id} className="w-[148px] shrink-0 snap-start sm:w-[168px]">
            <DecorCard
              item={item}
              selected={selected.has(item.id)}
              onToggle={onToggle}
              onOpen={() => onOpen(item)}
              inCart={hasItem?.(eventId, item.id) ?? false}
              eager={i < 2}
            />
          </div>
        ))}

        {more > 0 && (
          <button
            onClick={onSeeAll}
            className="flex w-[148px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface-sunk/[0.06] text-ink-soft ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.07] hover:text-ink sm:w-[168px]"
          >
            <span className="text-[19px] font-extrabold" style={{ color: 'var(--event-glow-ink)' }}>+{more}</span>
            <span className="text-[11px] font-bold">more {category.name.toLowerCase()}</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-mute">
              See all <ChevronRight size={10} />
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   The section
═══════════════════════════════════════════════════════════ */

const CHIP = 'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold whitespace-nowrap transition-colors'

const SORTS = [
  { id: 'popular', label: 'Our picks first' },
  { id: 'low',     label: 'Price: low first' },
  { id: 'high',    label: 'Price: high first' },
]

/** Shelves revealed at a time, before and after "show more kinds". */
const SHELF_STEP = 4

/**
 * Below this many setups, shelves are the wrong answer and a grid is shown.
 *
 * Shelves buy their keep by capping height when there is far more catalogue
 * than screen. A corporate event has six setups across four kinds, which
 * renders as four rows holding one or two cards each — a lot of section
 * furniture and a lot of empty rail for six things that fit in a single grid
 * three rows tall. Twelve is where the two layouts cost about the same height
 * and above which shelves start winning by a widening margin.
 *
 * Anniversary (29) gets shelves; a corporate event (6) gets a grid; both from
 * the same code, and the customer never sees a control asking them to decide.
 */
const SHELF_MIN = 12

export default function DecorCatalog({ eventId, eventName, onAddSelected, hasItem }) {
  // Photographs an admin has uploaded of our OWN work, laid over the licensed
  // lookalikes the catalogue ships with. Resolves to {} when nothing has been
  // uploaded and when migration 044 has not been applied — both normal states,
  // and in both the shipped photographs render unchanged.
  //
  // The point of the overlay is `source`: it carries through to
  // ImageSourceBadge, so an uploaded photograph changes the card's claim from
  // "Representative image" to "Actual setup photo" with no other edit anywhere.
  const overrides = useDecorPhotos()

  const base = CATALOG_BY_OCCASION[eventId] ?? []
  const items = useMemo(
    () => base.map(item => {
      const over = overrides[item.id]
      if (!over) return item
      return {
        ...item,
        photo:  over.url,
        // Falling back to the item's own alt rather than to the stock
        // photograph's caption: that caption describes somebody else's picture
        // and would now be attached to ours. `resolve()` already put a truthful
        // generic in `item.alt`, which is the right thing to inherit.
        alt:    over.alt || `${item.name} — a setup we installed`,
        credit: over.credit,
        source: over.source,
      }
    }),
    [base, overrides]
  )

  const summary    = useMemo(() => catalogSummary(eventId), [eventId])
  const categories = useMemo(() => categoriesForOccasion(eventId), [eventId])
  const starts     = useMemo(() => startingPointsFor(eventId), [eventId])

  const [category, setCategory] = useState('all')
  const [band, setBand]         = useState('all')
  const [sort, setSort]         = useState('popular')
  const [query, setQuery]       = useState('')
  const [shelves, setShelves]   = useState(SHELF_STEP)
  // null means "use the size-derived default" — see `mode` below. Only a
  // deliberate tap on the layout toggle pins it to a value, and changing
  // occasion releases it again, because the right default for an anniversary
  // is not the right default for a corporate event.
  const [layout, setLayout] = useState(null)
  const [sheetId, setSheetId]   = useState(null)
  // Ids, not items. The item objects are rebuilt whenever the photo overrides
  // resolve, and holding the objects would make "is this selected" an identity
  // test that silently starts failing the moment that fetch returns.
  const [selected, setSelected] = useState(() => new Set())

  const bodyRef = useRef(null)

  // Everything here is scoped to one occasion. Carrying a filter, an expanded
  // shelf count or a selection from an anniversary into a corporate event
  // lands on a category that occasion does not have and shows an empty result
  // for a filter the customer never chose. Same restart the page does for its
  // guest count.
  useEffect(() => {
    setCategory('all')
    setBand('all')
    setQuery('')
    setShelves(SHELF_STEP)
    setLayout(null)
    setSheetId(null)
    setSelected(new Set())
  }, [eventId])

  const toggle = useCallback(item => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }, [])

  /**
   * A shortcut ticks real cards — it does not create a hidden bundle.
   *
   * Additive rather than replacing, so tapping it after choosing two things by
   * hand keeps those two. The customer's own choices outrank our suggestion; a
   * shortcut that wipes them is a shortcut people learn not to touch.
   *
   * Filters are cleared at the same time and the view is forced to a grid —
   * otherwise four ticked items land across four different shelves, three of
   * them below the fold, and the shortcut looks like it did almost nothing.
   */
  const applyStart = useCallback(point => {
    setCategory('all')
    setBand('all')
    setQuery('')
    setLayout('grid')
    setSelected(prev => {
      const next = new Set(prev)
      for (const item of point.items) next.add(item.id)
      return next
    })
    requestAnimationFrame(() =>
      bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    )
  }, [])

  const seeCategory = useCallback(id => {
    setCategory(id)
    requestAnimationFrame(() =>
      bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    )
  }, [])

  const narrowed = category !== 'all' || band !== 'all' || query.trim() !== ''

  /**
   * SHELVES while browsing a large catalogue, GRID otherwise.
   *
   * Three rules, in order:
   *   1. Narrowed by a filter or a search → always a grid. A narrowed set is
   *      small, and somebody who has just filtered to "under ₹2,500" wants to
   *      see all six at once rather than hunt them across shelves.
   *   2. The customer tapped the layout toggle → whatever they picked.
   *   3. Otherwise → shelves only if there is enough catalogue to be worth
   *      organising. See SHELF_MIN.
   *
   * Derived rather than a stored preference, because the right answer is
   * knowable from the data. A toggle exists to override a derivation, never to
   * make somebody configure a layout before they are allowed to look at
   * anything.
   */
  const mode = narrowed
    ? 'grid'
    : layout ?? (items.length > SHELF_MIN ? 'shelves' : 'grid')

  const filtered = useMemo(() => {
    const bandDef = BUDGET_BANDS.find(b => b.id === band)
    const needle = query.trim().toLowerCase()
    const list = items.filter(i =>
      (category === 'all' || i.category === category) &&
      (!bandDef || (i.price >= bandDef.min && i.price < bandDef.max)) &&
      (!needle ||
        i.name.toLowerCase().includes(needle) ||
        i.blurb.toLowerCase().includes(needle))
    )
    // `items` arrives cheapest-first from the data module, so 'low' is already
    // correct and the other two sort a COPY — never the shared array, which
    // every occasion's card list is a live reference to.
    if (sort === 'high')    return [...list].reverse()
    if (sort === 'popular') return [...list].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
    return list
  }, [items, category, band, query, sort])

  /** Items per shelf, in DECOR_CATEGORIES order, sorted the way the grid is. */
  const shelfData = useMemo(
    () => categories.map(cat => ({
      category: cat,
      items: filtered.filter(i => i.category === cat.id),
    })).filter(s => s.items.length > 0),
    [categories, filtered]
  )

  /** The tray's numbers, over the whole selection — not just what is on screen. */
  const chosen = useMemo(() => items.filter(i => selected.has(i.id)), [items, selected])
  const total  = chosen.reduce((sum, i) => sum + i.price, 0)
  const sheetItem = sheetId ? items.find(i => i.id === sheetId) : null

  // An occasion with no décor entries renders nothing rather than an empty
  // heading, the same rule CustomerVoices follows for zero reviews.
  if (!items.length) return null

  const clearAll = () => { setCategory('all'); setBand('all'); setQuery(''); setLayout(null) }

  return (
    <section id="decor-catalog" aria-labelledby="decor-catalog-heading">

      {/* ── What this section is ────────────────────────────── */}
      <div className="mb-3.5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--event-glow-ink)' }}>
          Decoration catalogue
        </p>
        {/* The event name verbatim, never lowercased. EVENT_DATA carries
            "Housewarming (Griha Pravesh)" and "Sangeet / Mehendi Night", and a
            blanket toLowerCase() sets those as "griha pravesh" mid-sentence. */}
        <h2 id="decor-catalog-heading" className="mt-1 text-[19px] font-extrabold leading-tight text-ink sm:text-[22px]">
          Every {eventName} setup we install
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">
          {summary.count} setups in {summary.categories} kinds, from{' '}
          <strong className="font-extrabold text-ink">{formatINR(summary.from)}</strong>. Flick a
          row, tap anything to see what goes into it, and pick without leaving this page.
        </p>
      </div>

      {/* Both halves of the honesty owed here — whose photographs these are and
          what kind of number sits under them — said once, before anything is
          priced. Compact, because it is read once and then scrolled past
          forever, and this section is fighting for height. */}
      <div className="mb-3.5 flex items-start gap-2 rounded-xl bg-surface-sunk/[0.06] px-3 py-2.5 ring-1 ring-hairline/10">
        <Camera size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--event-glow-ink)' }} />
        <p className="text-[10.5px] leading-relaxed text-ink-mute">
          <strong className="font-bold text-ink-soft">Reference photographs of the style we build</strong>,
          not our own past events — we are new and would rather say so. Prices are indicative
          starting rates for the size shown on each card; your quote confirms them against your
          space and date, and you approve it before anything is booked.
        </p>
      </div>

      {/* ── Three ways in ───────────────────────────────────────
          A horizontal rail rather than a stacked grid: three full-width cards
          cost 270px on a phone before the customer has seen a single setup,
          which is exactly the budget this redesign is trying to win back. */}
      {starts.length > 0 && (
        <div className="mb-3.5">
          <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10.5px] font-bold text-ink-mute">
            <Sparkles size={11} /> Not sure where to start? Tap one — it ticks real cards you can untick.
          </p>
          <div className="scrollbar-hide -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {starts.map(point => (
              <button
                key={point.id}
                type="button"
                onClick={() => applyStart(point)}
                className="w-[210px] shrink-0 snap-start rounded-xl bg-surface-sunk/[0.06] p-2.5 text-left ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.06] active:scale-[0.98]"
              >
                <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink">
                  <span aria-hidden="true">{point.emoji}</span> {point.name}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-mute">{point.blurb}</span>
                <span className="mt-1 block text-[10.5px] font-extrabold" style={{ color: 'var(--event-glow-ink)' }}>
                  {point.items.length} setups · from {formatINR(point.from)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Find and narrow ─────────────────────────────────────
          Search first. At a hundred setups it stops being a convenience and
          becomes the primary way in for anybody who arrived with a word in
          mind — "canopy", "mandap", "candlelight". */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${items.length} setups — canopy, candlelight, stage…`}
            aria-label="Search décor setups"
            className="w-full rounded-xl bg-surface-sunk/[0.06] py-2 pl-9 pr-9 text-[12.5px] text-ink ring-1 ring-hairline/10 placeholder:text-ink-mute focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--event-glow-line)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => { setCategory('all'); setLayout(null) }}
            className={`${CHIP} ${category === 'all' ? 'text-gray-900' : 'bg-surface-sunk/[0.06] text-ink-mute ring-1 ring-hairline/10 hover:text-ink'}`}
            style={category === 'all' ? { background: 'var(--event-glow)' } : undefined}
          >
            All {items.length}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              title={cat.blurb}
              className={`${CHIP} ${category === cat.id ? 'text-gray-900' : 'bg-surface-sunk/[0.06] text-ink-mute ring-1 ring-hairline/10 hover:text-ink'}`}
              style={category === cat.id ? { background: 'var(--event-glow)' } : undefined}
            >
              <span aria-hidden="true">{cat.emoji}</span> {cat.name}
              <span className={category === cat.id ? 'text-gray-900/55' : 'text-ink-mute'}>{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setBand('all')}
            className={`${CHIP} ${band === 'all' ? 'bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10' : 'bg-surface-sunk/[0.06] text-ink-mute ring-1 ring-hairline/10 hover:text-ink'}`}
          >
            Any budget
          </button>
          {/* Only bands this occasion can fill. A "₹15,000+" chip on a
              catalogue whose dearest item is ₹9,000 can only return nothing. */}
          {BUDGET_BANDS.filter(b => items.some(i => i.price >= b.min && i.price < b.max)).map(b => (
            <button
              key={b.id}
              onClick={() => setBand(b.id)}
              className={`${CHIP} ${band === b.id ? 'bg-surface-sunk/[0.07] text-ink ring-1 ring-hairline/10' : 'bg-surface-sunk/[0.06] text-ink-mute ring-1 ring-hairline/10 hover:text-ink'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── The selection tray ──────────────────────────────────
          Sticky under the app bar rather than pinned to the bottom of the
          viewport: this page already stacks a cart bar and the tab bar down
          there, and a third floating bar would cover the cards it is counting.
          Mounted only once something is selected, so it costs nothing until it
          means something. */}
      {chosen.length > 0 && (
        <div className="sticky top-[56px] z-20 mt-3" style={{ scrollMarginTop: '56px' }}>
          <div className="rounded-2xl p-2.5 shadow-2xl ring-1 ring-black/10" style={{ background: 'var(--event-glow)' }}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-tight text-gray-900">
                  {chosen.length} setup{chosen.length > 1 ? 's' : ''} selected
                  <span className="mx-1.5 opacity-40">·</span>
                  from {formatINR(total)}
                </p>
                {/* The single most important line here. Adding to the cart has
                    to be reversible and free, and obviously so, or people stop
                    adding — and "cart" is a word that carries a checkout with
                    it everywhere else on the internet, so the sentence has to
                    say plainly that this one does not. */}
                <p className="text-[10px] leading-snug text-gray-900/60">
                  Nothing is charged — the cart becomes an enquiry a coordinator prices and comes back on.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded-lg px-2 py-2 text-[11.5px] font-bold text-gray-900/55 transition-colors hover:bg-black/10 hover:text-gray-900"
                >
                  Clear
                </button>
                <button
                  onClick={() => { onAddSelected(chosen); setSelected(new Set()) }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2.5 text-[12.5px] font-extrabold text-ink transition-transform active:scale-95"
                >
                  <ShoppingCart size={14} /> Add to cart
                </button>
              </div>
            </div>

            {/* Named, not just counted. "4 setups selected" three screens below
                where they were ticked is a number the customer has to scroll to
                verify; the names are the verification. */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chosen.map(i => (
                <button
                  key={i.id}
                  onClick={() => toggle(i)}
                  aria-label={`Remove ${i.name}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[9.5px] font-bold text-gray-900 transition-colors hover:bg-black/20"
                >
                  {i.name} <X size={8} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Result line and the layout override ───────────────── */}
      <div ref={bodyRef} className="mt-3.5 flex items-center justify-between gap-3" style={{ scrollMarginTop: '64px' }}>
        <p className="min-w-0 text-[10.5px] text-ink-mute" aria-live="polite">
          {narrowed
            ? <>Showing {filtered.length} of {items.length}{' '}
                <button onClick={clearAll} className="font-bold underline decoration-hairline/20 underline-offset-2 hover:text-ink">
                  Clear
                </button></>
            : `${items.length} setups in ${shelfData.length} kinds`}
        </p>

        {/* Only offered when it is a real choice. While narrowed the layout is
            already a grid and a toggle that cannot do anything is furniture. */}
        {!narrowed && (
          <button
            onClick={() => setLayout(mode === 'grid' ? 'shelves' : 'grid')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-sunk/[0.06] px-2.5 py-1.5 text-[10.5px] font-bold text-ink-mute ring-1 ring-hairline/10 transition-colors hover:text-ink"
          >
            {mode === 'grid' ? <><Rows3 size={11} /> Group by kind</> : <><LayoutGrid size={11} /> See all at once</>}
          </button>
        )}
      </div>

      {/* ── The catalogue ─────────────────────────────────────── */}
      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-surface-sunk/[0.06] p-7 text-center ring-1 ring-hairline/10">
            <p className="text-[13px] font-bold text-ink">Nothing in that combination</p>
            <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-ink-mute">
              Widen the budget or pick another kind — and if what you have in mind is not on this
              list at all, ask anyway. Plenty of what we build never made it onto a card.
            </p>
            <button
              onClick={clearAll}
              className="mt-3 rounded-xl bg-surface-sunk/[0.07] px-4 py-2 text-[12px] font-bold text-ink ring-1 ring-hairline/10"
            >
              Show all {items.length}
            </button>
          </div>
        ) : mode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item, i) => (
              <DecorCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggle={toggle}
                onOpen={() => setSheetId(item.id)}
                inCart={hasItem?.(eventId, item.id) ?? false}
                eager={i < 2}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {shelfData.slice(0, shelves).map(shelf => (
              <Shelf
                key={shelf.category.id}
                category={shelf.category}
                items={shelf.items}
                total={shelf.items.length}
                selected={selected}
                onToggle={toggle}
                onOpen={item => setSheetId(item.id)}
                hasItem={hasItem}
                eventId={eventId}
                onSeeAll={() => seeCategory(shelf.category.id)}
              />
            ))}

            {/* The height cap. Four shelves is roughly one screen of catalogue
                on a phone — enough to see that this is organised and worth
                exploring, not so much that it buries the tabs below. The rest
                is one tap away and stays open once asked for. */}
            {shelves < shelfData.length && (
              <button
                onClick={() => setShelves(n => n + SHELF_STEP)}
                className="w-full rounded-2xl bg-surface-sunk/[0.06] px-4 py-3 text-[12px] font-extrabold text-ink ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.06]"
              >
                Show {Math.min(SHELF_STEP, shelfData.length - shelves)} more kind
                {Math.min(SHELF_STEP, shelfData.length - shelves) > 1 ? 's' : ''} of décor
                <span className="ml-1.5 font-bold text-ink-mute">
                  {shelfData.slice(shelves).reduce((n, s) => n + s.items.length, 0)} setups
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {sheetItem && (
        <DecorSheet
          item={sheetItem}
          selected={selected.has(sheetItem.id)}
          onToggle={toggle}
          onClose={() => setSheetId(null)}
        />
      )}
    </section>
  )
}
