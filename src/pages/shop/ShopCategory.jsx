import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { SlidersHorizontal, ArrowUpDown, X, Check, MapPin, PackageOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { categoryQueryValues } from '../../config/shop'
import { groupsForCategory } from '../../data/shopOccasions'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { useProductAdd } from '../../components/shop/useProductAdd'
import { useCity } from '../../context/CityContext'
import { canDeliverToday, earliestPromise } from '../../lib/deliveryPromise'
import GiftAppBar from '../../components/gifting/GiftAppBar'
import GiftCard from '../../components/gifting/GiftCard'
import { formatINR } from '../../utils/format'

/**
 * The listing page — one shelf, or one filtered slice of it.
 *
 * ── It also serves /shop/today ───────────────────────────────────────────
 * "Today" is not a shelf, it is a constraint, and it was going to need this
 * whole screen anyway — the same grid, the same sorter, the same filter row.
 * So the route falls through to here with `TODAY` as its category and the
 * only difference is where `rows` comes from. A second near-identical page
 * would have drifted from this one inside a month.
 *
 * ── Sort defaults to "soonest", not "relevance" ──────────────────────────
 * Every competitor defaults to popularity, which on a pre-launch catalogue is
 * a number nobody earned, and which on any catalogue answers a question the
 * customer did not ask. The thing people are actually optimising for in a
 * gifting purchase is whether it arrives in time, so that is the default
 * order, and it is computed per row against the clock.
 */

const TODAY = 'today'

const SORTS = [
  { id: 'soonest', label: 'Arrives soonest' },
  { id: 'low',     label: 'Price: low to high' },
  { id: 'high',    label: 'Price: high to low' },
  { id: 'newest',  label: 'Newest first' },
]

const PRICE_BANDS = [
  { id: 'u500',   label: 'Under ₹500',        min: 0,    max: 500 },
  { id: '5001k',  label: '₹500 – ₹1,000',     min: 500,  max: 1000 },
  { id: '1k2k',   label: '₹1,000 – ₹2,500',   min: 1000, max: 2500 },
  { id: 'o2k',    label: 'Over ₹2,500',       min: 2500, max: Infinity },
]

export default function ShopCategory() {
  const { category: rawCategory, occasion: rawOccasion } = useParams()
  const category = decodeURIComponent(rawCategory ?? '')
  const isToday = category.toLowerCase() === TODAY

  // ── /shop/occasion/:occasion ────────────────────────────────────────
  // The third thing this screen serves, and the same kind of thing as
  // "today": a constraint on the whole catalogue rather than a shelf in
  // it. When the route carries an occasion, that occasion is fixed for
  // the page — it is what the customer asked for, so it is not one of the
  // filters they can clear.
  const routeOccasion = rawOccasion ? decodeURIComponent(rawOccasion) : null
  const isOccasion = !!routeOccasion

  const [params, setParams] = useSearchParams()
  // On an occasion route the path wins; the ?occasion= param is how the
  // per-shelf chips work and has no meaning here.
  const occasion = routeOccasion ?? params.get('occasion') ?? null

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('soonest')
  const [band, setBand] = useState(null)
  const [todayOnly, setTodayOnly] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(null)   // 'sort' | 'price' | 'occasion' | null

  const offers = usePublicOffers()
  const { addProduct, sheet } = useProductAdd()
  const { city, openCityPicker } = useCity()

  useEffect(() => {
    let alive = true
    setLoading(true)

    const select = 'id, name, subtitle, category, occasion, price, mrp, emoji, image_url, image_alt, badge, same_day, prep_hours, is_active, sort_order, created_at, seed_rating, seed_rating_count'

    const base = supabase.from('products').select(select).eq('is_active', true)

    const q = isToday
      // "Today" has to consider the whole catalogue, because whether a row
      // qualifies is decided in JS against its prep time and the clock —
      // there is no column to filter on that would give the right answer.
      ? base.limit(600)
      : isOccasion
        // Across every shelf, which is the entire point of the route: a
        // birthday is cakes AND flowers AND gifts, and answering it from
        // one category is what made the mosaic feel like a lie.
        ? base.eq('occasion', routeOccasion).limit(600)
        : base.in('category', categoryQueryValues(category)).limit(400)

    q.then(({ data }) => {
      if (!alive) return
      setRows(isToday ? (data ?? []).filter(p => canDeliverToday(p)) : (data ?? []))
      setLoading(false)
    })
    return () => { alive = false }
  }, [category, isToday, isOccasion, routeOccasion])

  /** The occasion chips, only ever showing tags with rows behind them.
   *  An occasion route has already answered this question, so it shows
   *  none — the alternative is a Birthday chip on the Birthday page. */
  const groups = useMemo(
    () => (isToday || isOccasion ? [] : groupsForCategory(category, rows)),
    [category, rows, isToday, isOccasion],
  )
  const chips = useMemo(() => groups.flatMap(g => g.occasions ?? []), [groups])

  /** How many distinct shelves this occasion actually spans. */
  const shelfCount = useMemo(
    () => new Set(rows.map(r => r.category).filter(Boolean)).size,
    [rows],
  )

  const filtered = useMemo(() => {
    let out = rows
    if (occasion) out = out.filter(p => p.occasion === occasion)
    if (band) {
      const b = PRICE_BANDS.find(x => x.id === band)
      if (b) out = out.filter(p => Number(p.price) >= b.min && Number(p.price) < b.max)
    }
    if (todayOnly && !isToday) out = out.filter(p => canDeliverToday(p))

    const sorted = [...out]
    if (sort === 'low')    sorted.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'high')   sorted.sort((a, b) => Number(b.price) - Number(a.price))
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
    if (sort === 'soonest') {
      // Rank by the actual minute the earliest slot opens. Two rows that can
      // both arrive today are then ordered by which arrives first, which is
      // the whole point of the sort.
      sorted.sort((a, b) => {
        const ea = earliestPromise(a), eb = earliestPromise(b)
        const ka = ea.day ? ea.day.offset * 1440 + (ea.slot?.fee === 0 ? 0 : 1) : 99999
        const kb = eb.day ? eb.day.offset * 1440 + (eb.slot?.fee === 0 ? 0 : 1) : 99999
        return ka - kb
      })
    }
    return sorted
  }, [rows, occasion, band, todayOnly, sort, isToday])

  // The route's own occasion is not a clearable filter — it is the page.
  const activeCount = [
    occasion && !isOccasion, band, todayOnly && !isToday,
  ].filter(Boolean).length

  const title = isToday ? 'Arriving today' : isOccasion ? routeOccasion : category
  const subtitle = isToday
    ? 'Every window checked against the clock'
    : isOccasion
      // Names the shelves it drew from, because the promise of this page is
      // that it is NOT one shelf — and the count is the proof.
      ? `${rows.length} ${rows.length === 1 ? 'piece' : 'pieces'} across ${shelfCount} ${shelfCount === 1 ? 'shelf' : 'shelves'}`
      : `${rows.length} ${rows.length === 1 ? 'piece' : 'pieces'} on this shelf`

  const setOccasion = next => {
    const p = new URLSearchParams(params)
    if (next) p.set('occasion', next); else p.delete('occasion')
    setParams(p, { replace: true })
  }

  const clearAll = () => {
    setBand(null); setTodayOnly(false)
    if (!isOccasion) setOccasion(null)
  }

  return (
    <div className="shop-canvas min-h-screen pb-28">
      <GiftAppBar backTo="/shop" title={title} subtitle={subtitle} compact />

      {/* ── Where it is going. Stated on the listing, because every delivery
             promise on every tile below is conditional on it. ── */}
      <button
        onClick={openCityPicker}
        className="flex w-full items-center gap-2 border-b border-hairline/[0.07] bg-surface-sunk/[0.03] px-4 py-2 text-left"
      >
        <MapPin size={13} className="shrink-0 text-chilli-600" />
        <span className="flex-1 truncate text-[11.5px] font-semibold text-ink-soft">
          Delivering to <span className="font-extrabold text-ink">{city}</span>
        </span>
        <span className="text-[11px] font-extrabold text-forest-700">Change</span>
      </button>

      {/* ── The occasion rail ── */}
      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-hairline/[0.07] px-4 py-2.5 scrollbar-hide">
          <button
            onClick={() => setOccasion(null)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
              !occasion ? 'bg-forest-800 text-white' : 'bg-white text-ink-soft ring-1 ring-hairline/[0.10]'
            }`}
          >
            Everything
          </button>
          {chips.map(c => (
            <button
              key={c.id}
              onClick={() => setOccasion(c.id === occasion ? null : c.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                c.id === occasion ? 'bg-forest-800 text-white' : 'bg-white text-ink-soft ring-1 ring-hairline/[0.10]'
              }`}
            >
              <span className="mr-1">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      )}

      {/* ── The filter bar ── */}
      <div className="sticky top-[var(--shop-appbar-h,3.5rem)] z-30 flex items-center gap-2 overflow-x-auto border-b border-hairline/[0.07] bg-white px-4 py-2 scrollbar-hide">
        <FilterChip
          icon={ArrowUpDown}
          label={SORTS.find(s => s.id === sort)?.label ?? 'Sort'}
          active={sort !== 'soonest'}
          onClick={() => setSheetOpen('sort')}
        />
        <FilterChip
          icon={SlidersHorizontal}
          label={band ? PRICE_BANDS.find(b => b.id === band)?.label : 'Price'}
          active={!!band}
          onClick={() => setSheetOpen('price')}
        />
        {!isToday && (
          <FilterChip
            label="Arrives today"
            active={todayOnly}
            onClick={() => setTodayOnly(t => !t)}
          />
        )}
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-chilli-50 px-3 py-1.5 text-[11.5px] font-bold text-chilli-700"
          >
            <X size={12} /> Clear {activeCount}
          </button>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-3">
        <p className="mb-3 text-[12px] font-semibold text-ink-mute">
          <span className="font-extrabold text-ink">{filtered.length}</span>
          {filtered.length === 1 ? ' result' : ' results'}
          {occasion && <> for <span className="font-extrabold text-ink">{occasion}</span></>}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-sunk/[0.06]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <PackageOpen size={24} className="mx-auto text-ink-mute" />
            <p className="mt-3 text-[13px] font-extrabold text-ink">Nothing here matches that.</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-soft">
              {activeCount > 0
                ? 'Loosen one of the filters — the shelf itself is not empty.'
                : isToday
                  ? 'Everything on the catalogue has passed its cut-off for today. Tomorrow morning is wide open.'
                  : 'This shelf has not been stocked yet. We would rather show it empty than fill it with things you cannot order.'}
            </p>
            {activeCount > 0 && (
              <button onClick={clearAll} className="mt-4 rounded-xl bg-forest-800 px-4 py-2 text-[12px] font-extrabold text-white">
                Clear the filters
              </button>
            )}
            {activeCount === 0 && (
              <Link to="/shop" className="mt-4 inline-block rounded-xl bg-forest-800 px-4 py-2 text-[12px] font-extrabold text-white">
                Back to the shop
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(p => (
              <GiftCard key={p.id} product={p} offer={bestOfferFor(p.price, offers)} onAdd={addProduct} />
            ))}
          </div>
        )}
      </main>

      {/* ── The option sheets ── */}
      {sheetOpen === 'sort' && (
        <OptionSheet title="Order these by" onClose={() => setSheetOpen(null)}>
          {SORTS.map(s => (
            <SheetRow key={s.id} label={s.label} active={s.id === sort} onClick={() => { setSort(s.id); setSheetOpen(null) }} />
          ))}
        </OptionSheet>
      )}
      {sheetOpen === 'price' && (
        <OptionSheet title="Price" onClose={() => setSheetOpen(null)}>
          <SheetRow label="Any price" active={!band} onClick={() => { setBand(null); setSheetOpen(null) }} />
          {PRICE_BANDS.map(b => (
            <SheetRow key={b.id} label={b.label} active={b.id === band} onClick={() => { setBand(b.id); setSheetOpen(null) }} />
          ))}
        </OptionSheet>
      )}

      {sheet}
    </div>
  )
}

function FilterChip({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
        active ? 'bg-forest-800 text-white' : 'bg-white text-ink-soft ring-1 ring-hairline/[0.12]'
      }`}
    >
      {Icon && <Icon size={12} />} {label}
    </button>
  )
}

/**
 * A bottom sheet.
 *
 * `position: fixed` and nothing above it in the tree carries a transform —
 * an ancestor with even an identity transform makes a fixed child position
 * against that ancestor instead of the viewport, which renders the sheet
 * somewhere off screen with no error to go on.
 */
function OptionSheet({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl bg-white pb-safe">
        <div className="flex items-center justify-between border-b border-hairline/[0.08] px-4 py-3.5">
          <h2 className="text-[14px] font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="tap-48 flex h-8 w-8 items-center justify-center rounded-full text-ink-mute">
            <X size={17} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  )
}

function SheetRow({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[13px] font-bold transition-colors ${
        active ? 'bg-forest-50 text-forest-800' : 'text-ink active:bg-surface-sunk/[0.05]'
      }`}
    >
      {label}
      {active && <Check size={15} />}
    </button>
  )
}
