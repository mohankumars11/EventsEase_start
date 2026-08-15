import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  X, Sparkles, Heart, Flame, ArrowDownNarrowWide, MessageCircle, ChevronRight,
  Check, Plus, Ticket, BadgeCheck, Users, Leaf, PenLine,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'
import { useCart } from '../../context/CartContext'
import { BRAND } from '../../config/sambramo'
import { FULFILMENT } from '../../config/shop'
import { CAKE_OCCASION_PHOTOS } from '../../config/generatedCakeOccasionPhotos'
import { buildOccasionGroups, occasionLabel, occasionEmoji } from '../../data/cakeOccasions'
import { cakeFacts, CAKE_STYLES } from '../../data/cakeStyles'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { useIncremental } from '../../components/shop/useIncremental'
import ProductImage from '../../components/shop/ProductImage'
import RatingBadge from '../../components/reviews/RatingBadge'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import ProductCustomizeSheet, { VegMark } from '../../components/shop/ProductCustomizeSheet'
import ShopAppBar from '../../components/shop/ShopAppBar'
import StickyCartBar from '../../components/shop/StickyCartBar'
import HowWeServe from '../../components/shop/HowWeServe'
import DetailRotator from '../../components/shop/DetailRotator'

/**
 * The cake storefront.
 *
 * Cakes get their own page rather than sharing ShopCategory with balloons and
 * diyas, for two reasons that only apply here:
 *
 *   1. Occasion is the whole navigation. Nobody browses "all cakes" — they
 *      arrive knowing it is a first birthday, a haldi, or an apology, and the
 *      catalogue now carries 50-odd occasion tags. ShopCategory renders those
 *      as one flat row of chips, which at this size is a wall nobody reads.
 *      Here they are grouped by life stage (src/data/cakeOccasions.js).
 *   2. Every cake is configurable, so the card's job is to open the
 *      customiser, not to add a fixed thing to a cart.
 *
 * Everything else — ratings, order counts, deep links via ?occasion= —
 * behaves exactly as it does in ShopCategory, so an existing link like
 * /shop/Cakes?occasion=Birthday from the shop home still lands correctly.
 */

const SORTS = [
  { id: 'default', label: 'Featured',     icon: Sparkles },
  { id: 'loved',   label: 'Most loved',   icon: Heart },
  { id: 'ordered', label: 'Most ordered', icon: Flame },
  { id: 'price',   label: 'Price: low to high', icon: ArrowDownNarrowWide },
]

export default function CakeShop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasProduct, productQtyFor, dispatch } = useCart()
  const offers = usePublicOffers()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [ratings, setRatings]   = useState({})
  const [orders, setOrders]     = useState({})

  const [occasion, setOccasion] = useState(searchParams.get('occasion') ?? 'All')
  const [style, setStyle]       = useState('All')
  const [sort, setSort]         = useState('default')
  const [vegOnly, setVegOnly]   = useState(false)
  const [query, setQuery]       = useState('')

  const [customizing, setCustomizing] = useState(null)
  const gridRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').eq('category', 'Cakes').order('name')
      // Retired products dropped client-side — see the note in ShopCategory:
      // `is_active` only exists after migration 037, which is applied by hand.
      .then(({ data }) => { setProducts((data ?? []).filter(p => p.is_active !== false)); setLoading(false) })
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    const ids = products.map(p => String(p.id))
    supabase.from('review_aggregates').select('subject_id, avg_rating')
      .eq('subject_type', 'product').in('subject_id', ids)
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(r => { map[r.subject_id] = r.avg_rating })
        setRatings(map)
      })
    supabase.rpc('get_product_order_counts').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(r => { map[r.product_id] = r.total_ordered })
      setOrders(map)
    })
  }, [products])

  // Deep links (an occasion card on the shop home, a festival page) set the
  // filter without a reload.
  useEffect(() => { setOccasion(searchParams.get('occasion') ?? 'All') }, [searchParams])

  // Facts are parsed from the product name, so cache them per row rather than
  // re-deriving on every filter keystroke.
  const enriched = useMemo(
    () => products.map(p => ({ ...p, facts: cakeFacts(p) })),
    [products]
  )

  const occasionGroups = useMemo(() => buildOccasionGroups(products), [products])
  const availableStyles = useMemo(() => {
    const present = new Set(enriched.map(p => p.facts.style.id))
    return CAKE_STYLES.filter(s => present.has(s.id))
  }, [enriched])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = enriched.filter(p => {
      if (occasion !== 'All' && p.occasion !== occasion) return false
      if (style !== 'All' && p.facts.style.id !== style) return false
      if (vegOnly && !p.facts.veg) return false
      if (needle && !`${p.name} ${p.description ?? ''} ${p.occasion ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })

    if (sort === 'loved')   list = [...list].sort((a, b) => (ratings[String(b.id)] ?? -1) - (ratings[String(a.id)] ?? -1))
    if (sort === 'ordered') list = [...list].sort((a, b) => (orders[b.id] ?? -1) - (orders[a.id] ?? -1))
    if (sort === 'price')   list = [...list].sort((a, b) => a.price - b.price)
    return list
  }, [enriched, occasion, style, vegOnly, query, sort, ratings, orders])

  // 215 cakes is not a first paint. Render a screenful and extend on scroll.
  const { items: shown, hasMore, showMore, remaining, sentinelRef } = useIncremental(visible)

  function selectOccasion(next) {
    setOccasion(next)
    setSearchParams(next === 'All' ? {} : { occasion: next }, { replace: true })
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filtersActive = occasion !== 'All' || style !== 'All' || vegOnly || query.trim()

  function clearFilters() {
    setOccasion('All'); setStyle('All'); setVegOnly(false); setQuery('')
    setSearchParams({}, { replace: true })
  }

  const whatsappHref = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
    "Hi Sambramo — I'd like a fully custom cake. Here's what I have in mind:"
  )}`

  return (
    <div className="shop-canvas min-h-screen pb-bottom-nav">
      <ShopAppBar
        backTo="/shop"
        title="🎂 Cakes"
        subtitle={loading ? 'Loading…' : `${products.length} cakes · made to order`}
        query={query}
        onQueryChange={setQuery}
      />

      {/* ── Sticky filter row ──────────────────────────────────────────
          Eggless keeps its place of honour — it is the first question at any
          Indian bakery counter — but as the leading chip of the filter row
          rather than a cramped icon in the header, where at 360px it had to
          hide its own label. `top` is the app bar's measured height. */}
      <div
        className="sticky z-30 border-b border-hairline/10 bg-surface/90 backdrop-blur-md"
        style={{ top: 'var(--shop-appbar-h, 7.75rem)' }}
      >
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide">
          <button
            onClick={() => setVegOnly(v => !v)}
            aria-pressed={vegOnly}
            className={`tap-tall shop-chip ${
              vegOnly ? 'border-green-400 bg-green-50 text-green-800' : 'border-hairline/10 bg-surface-sunk/[0.06] text-ink-soft'
            }`}
          >
            <VegMark /> Eggless
          </button>
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
              className={`tap-tall shop-chip ${
                sort === s.id
                  ? 'border-saffron-400 bg-saffron-400 text-forest-900'
                  : 'border-hairline/10 bg-surface-sunk/[0.07] text-ink-soft'
              }`}
            >
              <s.icon size={12} strokeWidth={2.6} /> {s.label}
            </button>
          ))}
          {filtersActive && (
            <button onClick={clearFilters} className="tap-tall shop-chip border-chilli-400/40 bg-chilli-500/15 text-chilli-200">
              <X size={12} strokeWidth={2.6} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-10">

        {/* ── Two promises, side by side ─────────────────────────────
            Left: the catalogue can do more than a round sponge.
            Right: if it can't, a human will. Sambramo is a concierge
            business — the escape hatch to a person is the product, not an
            admission that the catalogue failed. */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => { setStyle('designer'); gridRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="group relative h-40 rounded-3xl overflow-hidden text-left border border-gray-100"
          >
            <ProductImage
              query="designer fondant celebration cake"
              src={CAKE_OCCASION_PHOTOS['Kids & Theme']}
              emoji="🎨"
              alt=""
              className="absolute inset-0 w-full h-full"
              cinematic
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest-950/95 via-forest-950/72 to-forest-950/10" />
            {/* Absolute, not `relative h-full`. ProductImage hard-codes
                `relative` on its own wrapper and that wins over any position
                class passed in, so the photo sits in normal flow and takes the
                banner's full height — a flow sibling after it gets pushed clean
                out of the overflow-hidden box. Every other overlay in this shop
                is absolutely positioned for the same reason. */}
            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h3 className="font-serif text-xl font-bold text-white leading-tight">Designer<br />cakes</h3>
              <p className="text-white/85 text-xs mt-1.5 max-w-[60%]">Fondant, sculpted and tiered — built to a brief</p>
              <span className="mt-3 inline-flex items-center gap-1 self-start bg-white text-forest-800 text-xs font-bold px-3.5 py-1.5 rounded-full group-hover:gap-2 transition-all">
                Explore <ChevronRight size={13} />
              </span>
            </div>
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative h-40 rounded-3xl overflow-hidden border border-gray-100"
          >
            <ProductImage
              query="custom cake decorating piping bag baker"
              src={CAKE_OCCASION_PHOTOS['Wedding']}
              emoji="🧁"
              alt=""
              className="absolute inset-0 w-full h-full"
              cinematic
            />
            <div className="absolute inset-0 bg-gradient-to-r from-chilli-900/95 via-chilli-900/70 to-chilli-900/10" />
            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h3 className="font-serif text-xl font-bold text-white leading-tight">Something<br />entirely yours</h3>
              <p className="text-white/85 text-xs mt-1.5 max-w-[62%]">Describe it to us and we'll have it made</p>
              <span className="mt-3 inline-flex items-center gap-1.5 self-start bg-green-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full group-hover:gap-2.5 transition-all">
                <MessageCircle size={13} /> Chat with our expert
              </span>
            </div>
          </a>
        </section>

        {/* ── Occasions, by life stage ───────────────────────────────── */}
        {!loading && occasionGroups.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-3 mb-1">
              <h2 className="text-[15px] font-extrabold text-ink">Cakes for every celebration</h2>
              {occasion !== 'All' && (
                <button onClick={() => selectOccasion('All')} className="shrink-0 text-[11px] font-bold text-saffron-700">
                  Show all
                </button>
              )}
            </div>
            <p className="mb-5 text-[11px] text-ink-mute">
              Every moment worth marking — from a first birthday to an apology.
            </p>

            <div className="space-y-6">
              {occasionGroups.map(group => (
                <div key={group.id}>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <h3 className="text-[13px] font-extrabold text-ink">{group.label}</h3>
                    <span className="truncate text-[11px] text-ink-mute">{group.blurb}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                    {group.occasions.map(o => {
                      const active = occasion === o.id
                      return (
                        <button
                          key={o.id}
                          onClick={() => selectOccasion(active ? 'All' : o.id)}
                          className="group shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5"
                        >
                          <span className={`relative w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden ring-2 transition-all group-active:scale-95 ${
                            active ? 'ring-saffron-400' : 'ring-hairline/10 group-hover:ring-saffron-300'
                          }`}>
                            <ProductImage
                              src={CAKE_OCCASION_PHOTOS[o.id]}
                              query={`${o.label} cake`}
                              emoji={o.emoji}
                              alt=""
                              className="w-full h-full"
                              cinematic
                            />
                            {active && (
                              <span className="absolute inset-0 bg-saffron-500/25 flex items-center justify-center">
                                <span className="w-6 h-6 rounded-full bg-saffron-500 text-plum-950 flex items-center justify-center">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              </span>
                            )}
                          </span>
                          <span className={`text-center text-[10px] font-bold leading-tight ${
                            active ? 'text-saffron-700' : 'text-ink-soft'
                          }`}>
                            {o.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Results ────────────────────────────────────────────────── */}
        <section ref={gridRef} className="scroll-mt-20">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-extrabold text-ink">
                {occasion === 'All' ? 'All cakes' : `${occasionEmoji(occasion)} ${occasionLabel(occasion)}`}
              </h2>
              <p className="text-[11px] text-ink-mute">
                {loading ? 'Loading…' : `${visible.length} cake${visible.length === 1 ? '' : 's'}`}
                {vegOnly && ' · eggless only'}
              </p>
            </div>
          </div>

          {/* Style is a second axis on top of occasion, so it stays with the
              results rather than joining the sticky bar — that row is already
              at its width budget on a 360px screen. */}
          {availableStyles.length > 1 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[{ id: 'All', label: 'Every style', emoji: '✨' }, ...availableStyles].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  aria-pressed={style === s.id}
                  className={`tap-tall shop-chip ${
                    style === s.id
                      ? 'border-white bg-white text-forest-900'
                      : 'border-hairline/10 bg-surface-sunk/[0.07] text-ink-soft'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-60 animate-pulse rounded-3xl bg-surface-sunk/[0.07]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <div className="text-4xl">🎂</div>
              <p className="text-sm text-ink-mute">Nothing matches that combination yet.</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button onClick={clearFilters} className="rounded-xl bg-surface-sunk/[0.07] px-4 py-2 text-xs font-bold text-ink ring-1 ring-hairline/10">
                  Clear filters
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                >
                  Ask us to make it
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shown.map((p, i) => (
                <CakeCard
                  key={p.id}
                  cake={p}
                  offer={bestOfferFor(p.price, offers)}
                  orderCount={orders[p.id] ?? 0}
                  stagger={i * 260}
                  inCartQty={hasProduct(p.id) ? productQtyFor(p.id) : 0}
                  onCustomize={() => setCustomizing(p)}
                />
              ))}
            </div>
          )}

        {hasMore && (
          <div ref={sentinelRef} className="pt-5 text-center">
            <button
              onClick={showMore}
              className="rounded-xl bg-surface-sunk/[0.07] px-5 py-3 text-xs font-bold text-ink ring-1 ring-hairline/10 active:scale-95 transition-transform"
            >
              Show {Math.min(remaining, 24)} more
            </button>
          </div>
        )}
        </section>

        <HowWeServe />

        {!loading && products.length > 0 && (
          <ReviewsScroller
            subjects={products.slice(0, 40).map(p => ({ type: 'product', id: p.id, name: p.name }))}
            title="What customers say about our cakes"
          />
        )}
      </div>

      {customizing && (
        <ProductCustomizeSheet
          product={customizing}
          onClose={() => setCustomizing(null)}
          onConfirm={({ qty, unitPrice, lines, signature }) => {
            dispatch({
              type: 'ADD_PRODUCT',
              product: customizing,
              qty,
              unitPrice,
              lines,
              signature,
            })
            setCustomizing(null)
          }}
        />
      )}

      <StickyCartBar />
    </div>
  )
}

/* ── One cake ─────────────────────────────────────────────────────────── */
function CakeCard({ cake, offer, orderCount = 0, stagger = 0, inCartQty, onCustomize }) {
  const { facts } = cake

  // The same rotating line as every other card in the shop, carrying the
  // facts only a cake has — what it serves, whether it's eggless, which
  // style it is — instead of the three grey pills that used to sit under
  // the description and push the price below the fold on a two-up grid.
  const rotatorFacts = [
    offer && {
      key: 'offer', icon: Ticket, tone: 'offer',
      text: `Use code ${offer.code}`,
    },
    { key: 'fulfil', icon: BadgeCheck, tone: 'trust', text: FULFILMENT.short },
    orderCount > 0 && {
      key: 'orders', icon: Flame, tone: 'offer',
      text: `Ordered ${orderCount} ${orderCount === 1 ? 'time' : 'times'}`,
    },
    facts.serves && { key: 'serves', icon: Users, text: `Serves ${facts.serves.replace(' people', '')}` },
    ...facts.diets.map(d => ({ key: `diet-${d.id}`, icon: Leaf, tone: 'trust', text: d.short })),
    { key: 'custom', icon: PenLine, text: 'Weight, flavour & message — your call' },
  ]

  return (
    <article className="shop-card group flex flex-col">
      <Link to={`/shop/product/${cake.id}`} className="block relative">
        <ProductImage
          src={cake.image_url}
          query={cake.name}
          emoji={cake.emoji}
          alt={cake.image_alt}
          className="w-full aspect-[4/3]"
          cinematic
        />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />

        {offer && (
          <span className="absolute left-2 top-2 rounded-lg bg-chilli-600 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            {offer.discount_type === 'percent'
              ? `${Number(offer.discount_value)}% off`
              : `${formatINR(offer.discount_value)} off`}
          </span>
        )}
        {facts.style.id !== 'classic' && (
          <span className="absolute right-2 top-2 max-w-[55%] truncate rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-forest-800 backdrop-blur-sm">
            {facts.style.emoji} {facts.style.label}
          </span>
        )}
      </Link>

      {/* Always the customiser, never a bare add — a cake with no weight,
          flavour or egg preference chosen is not an order anyone can bake.
          Once one is in the cart the button keeps letting you configure
          another, because the second cake is usually a different one. */}
      <div className="relative">
        <div className="absolute -top-5 right-3 z-10">
          <button
            onClick={onCustomize}
            className={`shop-add-btn ${inCartQty > 0 ? 'text-forest-700 ring-forest-200' : ''}`}
            aria-label={inCartQty > 0 ? `Add another ${cake.name}, ${inCartQty} already in cart` : `Choose options for ${cake.name}`}
          >
            {inCartQty > 0 ? <>{inCartQty} in cart · ADD</> : <>ADD <Plus size={12} strokeWidth={3} /></>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 pt-5">
        <div className="flex items-start gap-1.5">
          {facts.veg && <VegMark className="mt-0.5 shrink-0" />}
          <Link
            to={`/shop/product/${cake.id}`}
            className="line-clamp-2 text-[13px] font-bold leading-snug text-gray-900 hover:text-forest-700"
          >
            {cake.name}
          </Link>
        </div>

        <RatingBadge subjectType="product" subjectId={cake.id} className="mt-1" />

        <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-snug text-gray-500">{cake.description}</p>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-forest-800">{formatINR(cake.price)}</span>
          <span className="text-[10px] font-semibold text-gray-500">onwards</span>
        </div>

        <DetailRotator facts={rotatorFacts} stagger={stagger} className="mt-1.5" />
      </div>
    </article>
  )
}
