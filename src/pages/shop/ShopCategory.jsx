import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Heart, Flame, Sparkles, ArrowDownNarrowWide, SlidersHorizontal, X, PackageOpen, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SHOP_CATEGORIES, categoryQueryValues } from '../../config/shop'
import { groupsForCategory, occasionMetaFor } from '../../data/shopOccasions'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import ShopAppBar from '../../components/shop/ShopAppBar'
import StickyCartBar from '../../components/shop/StickyCartBar'
import MarketProductCard from '../../components/shop/MarketProductCard'
import HowWeServe from '../../components/shop/HowWeServe'
import ReviewsScroller from '../../components/reviews/ReviewsScroller'
import { useProductAdd } from '../../components/shop/useProductAdd'

const SORTS = [
  { id: 'default', label: 'Featured',     icon: Sparkles },
  { id: 'loved',   label: 'Most Loved',   icon: Heart },
  { id: 'ordered', label: 'Most Ordered', icon: Flame },
  { id: 'price',   label: 'Price: low to high', icon: ArrowDownNarrowWide },
]

/**
 * One category shelf, as a phone screen.
 *
 * The data layer is untouched — same alias-aware query, same ratings and
 * order-count lookups behind the sort chips, same grouped occasion taxonomy
 * from data/shopOccasions. What changed is the shape of the page:
 *
 *   — The filter row is sticky and the page header is not. Scrolling past 60
 *     products and having to scroll all the way back up to swap "Birthday"
 *     for "Anniversary" is the defining annoyance of a long catalogue.
 *   — The occasion groups moved into a bottom sheet. Eight groups of chips
 *     rendered inline is a screen and a half of filters before the first
 *     product on a 360px phone; as a sheet the taxonomy survives intact and
 *     costs one tap.
 *   — Products are a two-up grid of MarketProductCard, so the ADD button is
 *     in the same place here, on the home rail, and in search results.
 */
export default function ShopCategory() {
  const { category } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [occasion, setOccasion] = useState(searchParams.get('occasion') ?? 'All')
  const [sort, setSort] = useState('default')
  const [query, setQuery] = useState('')
  const [ratings, setRatings] = useState({})   // product id -> avg_rating
  const [orders, setOrders]   = useState({})   // product id -> total_ordered
  const [filtersOpen, setFiltersOpen] = useState(false)

  const offers = usePublicOffers()
  const { addProduct, sheet } = useProductAdd()
  const meta = SHOP_CATEGORIES.find(c => c.id === category)

  useEffect(() => {
    setLoading(true)
    // `in` rather than `eq`: Gifts absorbs Hampers (migration 031), and this
    // page has to render the merged shelf whether or not that migration has
    // been applied yet. For every other category the alias list is just the
    // category itself.
    supabase.from('products').select('*').in('category', categoryQueryValues(category)).order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [category])

  // Ratings + order-volume, fetched once the product set for this
  // category is known — powers the "Most Loved" / "Most Ordered" sort
  // chips. Missing data just sorts last, never hides a product.
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

  // Re-sync the occasion filter when arriving via a deep link (e.g. an
  // "upcoming festival" card routing straight into "Diwali" within Gifts).
  useEffect(() => {
    setOccasion(searchParams.get('occasion') ?? 'All')
  }, [category, searchParams])

  // Occasions grouped by the reason someone is shopping, rather than one flat
  // alphabetical row — Gifts alone carries 16 tags after the Hampers merge,
  // and at that size a single row of chips is a wall nobody reads.
  const occasionGroups = useMemo(() => groupsForCategory(category, products), [category, products])

  const sortedProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = products.filter(p => {
      if (occasion !== 'All' && p.occasion !== occasion) return false
      if (needle && !`${p.name} ${p.description ?? ''} ${p.occasion ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })
    if (sort === 'loved')   list = [...list].sort((a, b) => (ratings[String(b.id)] ?? -1) - (ratings[String(a.id)] ?? -1))
    if (sort === 'ordered') list = [...list].sort((a, b) => (orders[b.id] ?? -1) - (orders[a.id] ?? -1))
    if (sort === 'price')   list = [...list].sort((a, b) => a.price - b.price)
    return list
  }, [products, occasion, query, sort, ratings, orders])

  function selectOccasion(o) {
    setOccasion(o)
    setSearchParams(o === 'All' ? {} : { occasion: o }, { replace: true })
  }

  const occasionLabel = occasion === 'All' ? null : occasionMetaFor(category, occasion).label
  const filtered = occasion !== 'All' || query.trim().length > 0

  return (
    <div className="shop-canvas min-h-screen pb-bottom-nav">
      <ShopAppBar
        backTo="/shop"
        title={`${meta?.emoji ?? ''} ${meta?.label ?? category}`}
        subtitle={loading ? 'Loading…' : `${products.length} items · ${meta?.tagline ?? ''}`}
        query={query}
        onQueryChange={setQuery}
      />

      {/* ── Sticky filter row ───────────────────────────────────────────
          `top` is the app bar's own height so the two stack rather than
          overlap. Horizontally scrollable: four sorts plus an occasion pill
          do not fit across a 360px screen and wrapping them would push the
          first product below the fold. */}
      <div className="sticky top-[7.25rem] z-30 border-b border-white/5 bg-forest-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide">
          {occasionGroups.length > 0 && (
            <button
              onClick={() => setFiltersOpen(true)}
              className={`shop-chip ${
                occasion !== 'All'
                  ? 'border-white bg-white text-forest-900'
                  : 'border-white/15 bg-white/5 text-white/70'
              }`}
            >
              <SlidersHorizontal size={12} strokeWidth={2.6} />
              {occasionLabel ?? 'Occasion'}
            </button>
          )}
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
              className={`shop-chip ${
                sort === s.id
                  ? 'border-saffron-400 bg-saffron-400 text-forest-900'
                  : 'border-white/15 bg-white/5 text-white/70'
              }`}
            >
              <s.icon size={12} strokeWidth={2.6} /> {s.label}
            </button>
          ))}
          {filtered && (
            <button
              onClick={() => { selectOccasion('All'); setQuery('') }}
              className="shop-chip border-chilli-400/40 bg-chilli-500/15 text-chilli-200"
            >
              <X size={12} strokeWidth={2.6} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        <p className="mb-3 text-[11px] font-semibold text-white/45">
          {loading
            ? 'Loading…'
            : `${sortedProducts.length} item${sortedProducts.length === 1 ? '' : 's'}${occasionLabel ? ` in ${occasionLabel}` : ''}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-16 text-center">
            <PackageOpen size={30} className="mx-auto text-white/25" />
            <p className="mt-3 text-sm font-bold text-white">
              Nothing matches that yet in {meta?.label ?? category}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-white/45">
              Try another occasion or a shorter word — plenty gets made to order that
              isn't in the catalogue yet.
            </p>
            {filtered && (
              <button
                onClick={() => { selectOccasion('All'); setQuery('') }}
                className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15"
              >
                Show everything in {meta?.label ?? category}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sortedProducts.map((p, i) => (
              <MarketProductCard
                key={p.id}
                product={p}
                offer={bestOfferFor(p.price, offers)}
                orderCount={orders[p.id] ?? 0}
                stagger={i * 260}
                onAdd={() => addProduct(p)}
              />
            ))}
          </div>
        )}

        <HowWeServe className="mt-8" />

        {!loading && products.length > 0 && (
          <div className="mt-6">
            <ReviewsScroller
              subjects={products.map(p => ({ type: 'product', id: p.id, name: p.name }))}
              title={`What customers say about ${meta?.label ?? category}`}
            />
          </div>
        )}
      </div>

      {filtersOpen && (
        <OccasionSheet
          groups={occasionGroups}
          active={occasion}
          categoryLabel={meta?.label ?? category}
          onPick={o => { selectOccasion(o); setFiltersOpen(false) }}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {sheet}
      <StickyCartBar />
    </div>
  )
}

/* ── Occasion filter sheet ───────────────────────────────────────────────
   The full grouped taxonomy, one tap away, as a bottom sheet — the Android
   convention for a filter that is too big to live inline. Counts come from
   the same grouping pass as the labels, so a chip never offers a filter that
   returns nothing. */
function OccasionSheet({ groups, active, categoryLabel, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Filter by occasion">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close filters" onClick={onClose} />

      <div className="animate-pop-in relative max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white pb-8">
        {/* Grab handle + a header that stays put while the list scrolls. */}
        <div className="sticky top-0 z-10 bg-white/95 px-5 pb-3 pt-3 backdrop-blur">
          <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-gray-200" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold text-gray-900">What's the occasion?</h2>
              <p className="text-[11px] text-gray-400">Filtering {categoryLabel}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 pt-2">
          <button
            onClick={() => onPick('All')}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
              active === 'All'
                ? 'border-forest-700 bg-forest-50 text-forest-800'
                : 'border-gray-200 text-gray-700'
            }`}
          >
            Everything in {categoryLabel}
            {active === 'All' && <Check size={16} className="text-forest-700" strokeWidth={3} />}
          </button>

          {groups.map(group => (
            <div key={group.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-[13px] font-extrabold text-gray-900">{group.label}</h3>
                {group.blurb && <span className="truncate text-[11px] text-gray-400">{group.blurb}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.occasions.map(o => {
                  const isActive = active === o.id
                  return (
                    <button
                      key={o.id}
                      onClick={() => onPick(isActive ? 'All' : o.id)}
                      className={`shop-chip ${
                        isActive
                          ? 'border-forest-700 bg-forest-700 text-white'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <span aria-hidden="true">{o.emoji}</span> {o.label}
                      <span className={isActive ? 'text-white/60' : 'text-gray-300'}>{o.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
