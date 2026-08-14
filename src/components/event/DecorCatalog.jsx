import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Camera, Check, ChevronDown, Clock, Maximize2, Sparkles, Plus, X,
  SlidersHorizontal, ShoppingCart,
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
 * ── What this replaced ────────────────────────────────────────────────────
 * A 2×2 grid of four "samples". Tapping one opened a photograph whose only
 * forward action was a button that navigated to /plan — a wizard, on another
 * page, asking about guest counts. Somebody who tapped a picture of a
 * candlelight dinner because they wanted to know what one costs was answered
 * with a form.
 *
 * That navigation is deleted. Everything the customer came for now happens
 * inside this section: the whole list rather than four of it, filterable,
 * priced, with what is physically in each setup one tap away, and selection
 * that lands in the enquiry they already have open.
 *
 * ── Three rules this component is built around ────────────────────────────
 *
 * 1. NOTHING NAVIGATES. Not the card, not the photograph, not the price. A
 *    person browsing décor is comparing, and comparing means going back and
 *    forth between six of them — every navigation is a lost comparison. The
 *    only thing that leaves this section is the enquiry itself.
 *
 * 2. THE PRICE IS ON THE CARD. See the header of data/decorCatalog.js for the
 *    full argument. Short version: these are absolute figures for one
 *    installed setup at a stated size, not the per-plate strings
 *    SHOW_SERVICE_PRICES exists to hide, and every operator this business
 *    competes with prints them.
 *
 * 3. SELECTING IS NOT BUYING, AND IT SAYS SO. Ticking a card adds nothing
 *    anywhere. The tray states the count and the running total, and one
 *    explicit button moves the lot into the enquiry — which is itself still an
 *    enquiry, not an order. Two deliberate acts before anything is committed,
 *    said in words at both of them.
 *
 * Generic over the occasion, like everything else on this page: an anniversary
 * gets twenty-eight setups and a corporate event gets six, from the same code.
 */

/* ═══════════════════════════════════════════════════════════
   Photo — never collapses, never flashes
═══════════════════════════════════════════════════════════ */

/**
 * Same compositing contract as the gallery's SamplePhoto: the tinted plate and
 * the emoji sit underneath at all times and the photograph fades in on top, so
 * an item the resolver has not reached renders as a designed tile rather than a
 * hole in the grid.
 */
function ItemPhoto({ item, className = '', eager = false }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-plum-800 to-berry-900 ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex select-none items-center justify-center text-4xl opacity-60"
      >
        {item.emoji}
      </span>

      {item.photo && !failed && (
        <img
          src={item.photo}
          alt={item.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
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
   One setup
═══════════════════════════════════════════════════════════ */

/**
 * A card that does two things and refuses to do a third.
 *
 * "What's included" expands in place; "Select" ticks it. There is deliberately
 * no third control and no whole-card click target — an earlier version made the
 * card itself open a lightbox, which meant every attempt to read the price list
 * became a modal the customer had to dismiss.
 *
 * The expansion is uncontrolled and local. Lifting it into the parent would let
 * the grid close a card the customer is mid-read of whenever a filter changed,
 * and there is no reason for two cards not to be open at once — comparing two
 * inclusion lists side by side is the single most useful thing this section
 * does.
 */
function DecorItemCard({ item, selected, onToggle, inCart, index }) {
  const [open, setOpen] = useState(false)
  const panelId = `decor-includes-${item.id}`

  return (
    <div
      className={`rise-in group relative flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] ring-1 backdrop-blur transition-[box-shadow,background-color] ${
        selected
          ? 'bg-white/[0.09] ring-2 shadow-lg'
          : 'ring-white/10 hover:bg-white/[0.07]'
      }`}
      style={{
        '--rise-delay': `${Math.min(index, 10) * 40}ms`,
        ...(selected ? { '--tw-ring-color': 'var(--event-glow)' } : null),
      }}
    >
      <div className="relative">
        <ItemPhoto item={item} className="h-36 sm:h-40" eager={index < 2} />

        {/* Honesty label, on the image, in the same words the shop uses.
            Bottom-left rather than top-right: on a two-up phone grid a card is
            about 165px wide, and "Representative image" beside "MOST BOOKED"
            on the same row overlapped into "MOST BOOKEDpresentative image" —
            which reads as neither. The two claims get their own corners, and
            the badge that must always be legible gets the emptier one. */}
        <ImageSourceBadge source={item.source} size="sm" subject="setup" className="absolute bottom-2 left-2" />

        {/* "Our pick", never "Most booked". Sambramo is pre-launch and has no
            booking history — `popular` is a recommendation drawn from market
            research, and a badge claiming otherwise would be the same lie as
            captioning a stock photograph "our recent work". See decorCatalog.js. */}
        {item.popular && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
            <Sparkles size={9} /> Our pick
          </span>
        )}

        {/* The tick lives on the photograph so the selected state survives a
            long card being scrolled past its own footer. */}
        {selected && (
          <span
            aria-hidden="true"
            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-900 shadow-lg"
            style={{ background: 'var(--event-glow)' }}
          >
            <Check size={15} strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <h3 className="text-[13.5px] font-extrabold leading-tight text-white">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">{item.blurb}</p>

        {/* The price, and immediately under it the size it buys. A figure with
            no scale attached is the thing that produces "why is my quote
            double the website" three weeks later. */}
        <div className="mt-2.5">
          <span className="text-[15px] font-extrabold" style={{ color: 'var(--event-glow)' }}>
            from {formatINR(item.price)}
          </span>
          <span className="ml-1.5 text-[10.5px] text-white/40">{item.where}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(item)}
            aria-pressed={selected}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-extrabold transition-transform active:scale-95 ${
              selected ? 'text-gray-900' : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/[0.16]'
            }`}
            style={selected ? { background: 'var(--event-glow)' } : undefined}
          >
            {selected ? <><Check size={13} /> Selected</> : <><Plus size={13} /> Select</>}
          </button>

          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-bold text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            What&apos;s in it
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {inCart && (
          <p className="mt-2 flex items-center gap-1 text-[10.5px] font-bold text-emerald-300">
            <Check size={11} /> Already in your enquiry
          </p>
        )}

        {open && (
          <div id={panelId} className="mt-3 rounded-xl bg-black/25 p-3 ring-1 ring-white/10">
            <p className="mb-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/40">
              What gets installed
            </p>
            <ul className="space-y-1.5">
              {item.includes.map(line => (
                <li key={line} className="flex items-start gap-2 text-[11.5px] leading-snug text-white/70">
                  <Check size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--event-glow)' }} />
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/10 pt-2.5 text-[10.5px] text-white/45">
              <span className="inline-flex items-center gap-1"><Clock size={10} /> {item.setup} to install</span>
              <span className="inline-flex items-center gap-1"><Maximize2 size={10} /> {item.where}</span>
            </div>

            {/* The top of the band, stated only where there is room to explain
                what moves it. On the card it would read as a second price. */}
            {item.priceTo > item.price && (
              <p className="mt-2 text-[10.5px] leading-relaxed text-white/45">
                {formatINR(item.price)} is this setup at the size above. A bigger space, fresher
                flowers or a longer install takes it toward {formatINR(item.priceTo)} — your quote
                says which and why.
              </p>
            )}

            {item.credit && (
              <p className="mt-2 text-[9.5px] text-white/25">{item.credit}</p>
            )}
          </div>
        )}
      </div>
    </div>
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

export default function DecorCatalog({ eventId, eventName, onAddSelected, hasItem }) {
  // Photographs an admin has uploaded of our OWN work, laid over the licensed
  // lookalikes the catalogue ships with. Resolves to {} when nothing has been
  // uploaded and when migration 044 has not been applied — both of which are
  // normal states, and in both the shipped photographs render unchanged.
  //
  // The whole point of the overlay is `source`: it carries through to
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
  // Ids, not items. The item objects are recreated on every module evaluation
  // and holding them here would make "is this selected" an identity test that
  // silently starts failing after a hot reload.
  const [selected, setSelected] = useState(() => new Set())

  const gridRef = useRef(null)

  // A filter row is scoped to one occasion's catalogue. Carrying "Room & home
  // setups" from an anniversary into a corporate event lands on a category that
  // occasion does not have, and the grid renders empty for a filter the
  // customer never chose. Same restart the page does for its guest count.
  useEffect(() => {
    setCategory('all')
    setBand('all')
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
   * Additive rather than replacing, so tapping "The full evening" after having
   * chosen two things by hand keeps those two. The customer's own choices
   * outrank our suggestion; a shortcut that wipes them is a shortcut people
   * learn not to touch.
   *
   * The filters are cleared at the same time. Without that, ticking four items
   * while a category filter is up shows the customer one of them and appears to
   * have lost the other three.
   */
  const applyStart = useCallback(point => {
    setCategory('all')
    setBand('all')
    setSelected(prev => {
      const next = new Set(prev)
      for (const item of point.items) next.add(item.id)
      return next
    })
    requestAnimationFrame(() =>
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    )
  }, [])

  const shown = useMemo(() => {
    const bandDef = BUDGET_BANDS.find(b => b.id === band)
    const filtered = items.filter(i =>
      (category === 'all' || i.category === category) &&
      (!bandDef || (i.price >= bandDef.min && i.price < bandDef.max))
    )
    // `items` arrives cheapest-first from the data module, so 'low' is already
    // correct and the other two sort a copy — never the shared array, which
    // every occasion's card list is a live reference to.
    if (sort === 'high')    return [...filtered].reverse()
    if (sort === 'popular') return [...filtered].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
    return filtered
  }, [items, category, band, sort])

  /** The tray's numbers, over the whole selection — not just what is on screen. */
  const chosen = useMemo(() => items.filter(i => selected.has(i.id)), [items, selected])
  const total  = chosen.reduce((sum, i) => sum + i.price, 0)

  // An occasion with no décor entries renders nothing rather than an empty
  // heading, the same rule EventDecorSamples and CustomerVoices follow.
  if (!items.length) return null

  const filtersOn = category !== 'all' || band !== 'all'

  return (
    <section id="decor-catalog" aria-labelledby="decor-catalog-heading">

      {/* ── What this section is ────────────────────────────── */}
      <div className="mb-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--event-glow)' }}>
          Decoration catalogue
        </p>
        {/* The event name verbatim, never lowercased. EVENT_DATA carries
            "Housewarming (Griha Pravesh)" and "Sangeet / Mehendi Night", and a
            blanket toLowerCase() sets those as "griha pravesh" mid-sentence —
            the same trap decorSamples' per-event strip flagged. */}
        <h2 id="decor-catalog-heading" className="mt-1 text-[19px] font-extrabold leading-tight text-white sm:text-[22px]">
          Every {eventName} setup we install
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
          {summary.count} décor setups across {summary.categories} kinds, from{' '}
          <strong className="font-extrabold text-white">{formatINR(summary.from)}</strong>. Tick
          whatever you want — see what goes into it, what it costs and what size that price buys,
          all without leaving this page.
        </p>
      </div>

      {/* Said once, plainly, before anything is priced. Both halves of the
          honesty owed here: whose photographs these are, and what kind of
          number is printed under them. */}
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-3 ring-1 ring-white/10">
        <Camera size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--event-glow)' }} />
        <p className="text-[11px] leading-relaxed text-white/55">
          <strong className="font-bold text-white">Reference photographs of the style we build</strong>,
          not our own past events — we are new, and we would rather say so. Prices are indicative
          starting rates for the size printed on each card; your quote confirms them against your
          space and date, and you approve it before anything is booked.
        </p>
      </div>

      {/* ── Three ways in ───────────────────────────────────────
          Twenty-eight cards is the right amount of choice for somebody who
          knows what they want and the wrong amount for somebody who does not.
          These tick real cards below rather than hiding a bundle — see
          startingPointsFor(). */}
      {starts.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-bold text-white/45">
            <Sparkles size={12} /> Not sure where to start? Tap one — it ticks the cards below, and
            you can untick any of them.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {starts.map(point => (
              <button
                key={point.id}
                type="button"
                onClick={() => applyStart(point)}
                className="rounded-2xl bg-white/[0.05] p-3 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.09] active:scale-[0.98]"
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-white">
                  <span aria-hidden="true">{point.emoji}</span> {point.name}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-white/45">{point.blurb}</span>
                <span className="mt-1.5 block text-[11px] font-extrabold" style={{ color: 'var(--event-glow)' }}>
                  {point.items.length} setups · from {formatINR(point.from)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────
          Kind, then budget, then order. Three rows rather than one control,
          because they answer three unrelated questions and folding them into a
          single dropdown makes the second and third invisible. */}
      <div className="space-y-2">
        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setCategory('all')}
            className={`${CHIP} ${category === 'all' ? 'text-gray-900' : 'bg-white/[0.07] text-white/65 ring-1 ring-white/10 hover:text-white'}`}
            style={category === 'all' ? { background: 'var(--event-glow)' } : undefined}
          >
            <SlidersHorizontal size={11} /> All {items.length}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              title={cat.blurb}
              className={`${CHIP} ${category === cat.id ? 'text-gray-900' : 'bg-white/[0.07] text-white/65 ring-1 ring-white/10 hover:text-white'}`}
              style={category === cat.id ? { background: 'var(--event-glow)' } : undefined}
            >
              <span aria-hidden="true">{cat.emoji}</span> {cat.name}
              <span className={category === cat.id ? 'text-gray-900/55' : 'text-white/35'}>{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setBand('all')}
            className={`${CHIP} ${band === 'all' ? 'bg-white/20 text-white ring-1 ring-white/25' : 'bg-white/[0.07] text-white/55 ring-1 ring-white/10 hover:text-white'}`}
          >
            Any budget
          </button>
          {/* Only the bands this occasion can actually fill. A "₹15,000+" chip
              on a catalogue whose dearest item is ₹9,000 is a chip that can
              only ever return nothing. */}
          {BUDGET_BANDS.filter(b => items.some(i => i.price >= b.min && i.price < b.max)).map(b => (
            <button
              key={b.id}
              onClick={() => setBand(b.id)}
              className={`${CHIP} ${band === b.id ? 'bg-white/20 text-white ring-1 ring-white/25' : 'bg-white/[0.07] text-white/55 ring-1 ring-white/10 hover:text-white'}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hide -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-white/30">Order</span>
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`${CHIP} ${sort === s.id ? 'bg-white/20 text-white ring-1 ring-white/25' : 'bg-white/[0.07] text-white/55 ring-1 ring-white/10 hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── The selection tray ──────────────────────────────────
          Sticky under the app bar rather than pinned to the bottom of the
          viewport: this page already stacks a cart bar and the tab bar down
          there, and a third floating bar would cover the cards it is counting.
          Only mounted once something is selected, so it costs nothing until it
          means something. */}
      {chosen.length > 0 && (
        <div className="sticky top-[56px] z-20 mt-4" style={{ scrollMarginTop: '56px' }}>
          <div
            className="rounded-2xl p-3 shadow-2xl ring-1 ring-black/10"
            style={{ background: 'var(--event-glow)' }}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-tight text-gray-900">
                  {chosen.length} setup{chosen.length > 1 ? 's' : ''} selected
                  <span className="mx-1.5 opacity-40">·</span>
                  from {formatINR(total)}
                </p>
                {/* The single most important line in this component. Ticking
                    cards has to be reversible and free, and it has to be
                    obviously so, or people stop ticking. */}
                <p className="text-[10.5px] leading-snug text-gray-900/60">
                  Nothing is booked or charged — this starts an enquiry a coordinator prices and
                  comes back on.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded-xl px-2.5 py-2 text-[11.5px] font-bold text-gray-900/55 transition-colors hover:bg-black/10 hover:text-gray-900"
                >
                  Clear
                </button>
                <button
                  onClick={() => { onAddSelected(chosen); setSelected(new Set()) }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2.5 text-[12.5px] font-extrabold text-white transition-transform active:scale-95"
                >
                  <ShoppingCart size={14} /> Add to my enquiry
                </button>
              </div>
            </div>

            {/* Named, not just counted. "3 setups selected" three screens below
                where they were ticked is a number the customer has to scroll to
                verify; the names are the verification. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chosen.map(i => (
                <button
                  key={i.id}
                  onClick={() => toggle(i)}
                  aria-label={`Remove ${i.name}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-gray-900 transition-colors hover:bg-black/20"
                >
                  {i.name} <X size={9} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── The grid ────────────────────────────────────────── */}
      <div ref={gridRef} className="mt-4" style={{ scrollMarginTop: '70px' }}>
        <p className="mb-2.5 px-0.5 text-[11px] text-white/40" aria-live="polite">
          Showing {shown.length} of {items.length}
          {filtersOn && (
            <button
              onClick={() => { setCategory('all'); setBand('all') }}
              className="ml-2 font-bold underline decoration-white/25 underline-offset-2 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </p>

        {shown.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] p-7 text-center ring-1 ring-white/10">
            <p className="text-[13px] font-bold text-white">Nothing in that combination</p>
            <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-white/50">
              Widen the budget or pick another kind — and if what you have in mind is not on this
              list at all, ask anyway. Plenty of what we build never made it onto a card.
            </p>
            <button
              onClick={() => { setCategory('all'); setBand('all') }}
              className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-[12px] font-bold text-white ring-1 ring-white/15"
            >
              Show all {items.length}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
            {shown.map((item, i) => (
              <DecorItemCard
                key={item.id}
                item={item}
                index={i}
                selected={selected.has(item.id)}
                onToggle={toggle}
                inCart={hasItem?.(eventId, item.id) ?? false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
