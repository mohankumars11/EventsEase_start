import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Flame, ChevronRight, Camera, SearchX } from 'lucide-react'
import { SHOP_CATEGORIES, categoryQueryValues } from '../../config/shop'
import { supabase } from '../../lib/supabase'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import ProductImage from '../../components/shop/ProductImage'
import ShopAppBar from '../../components/shop/ShopAppBar'
import OffersRail from '../../components/shop/OffersRail'
import HowWeServe from '../../components/shop/HowWeServe'
import PaymentStrip from '../../components/shop/PaymentStrip'
import StickyCartBar from '../../components/shop/StickyCartBar'
import DeliverySlip from '../../components/shop/DeliverySlip'
import MarketProductCard from '../../components/shop/MarketProductCard'
import DetailRotator from '../../components/shop/DetailRotator'
import { useProductAdd } from '../../components/shop/useProductAdd'

// Independence Day (Aug 15) is real, near-term, and — unlike the rest
// of the festival calendar — had zero tagged products before this pass.
// A live countdown, not a static banner, is what makes "it's coming"
// actually true instead of a stale claim.
const INDEPENDENCE_DAY = '2026-08-15'
function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

// Real photo per category — same query set used by ShopMiniCard on the
// customer home page, kept consistent so the same category always shows
// the same photo everywhere it appears.
const CATEGORY_QUERIES = {
  'Cakes':              'chocolate birthday cake slice',
  'Gifts':               'wrapped gift box present ribbon',
  'Flowers':              'flower bouquet fresh',
  'Party Essentials':      'balloons party decoration',
  'Pooja & Essentials':     'pooja thali diya India',
}

// One emotional hook per category — a specific reason to tap in instead of
// a repeat of the tagline already shown underneath.
const CATEGORY_HOOKS = {
  'Cakes':              'Watch their face when the candles come out',
  'Gifts':               'Find the thing they’ll actually remember',
  'Flowers':              'Say it with a bouquet, delivered fresh today',
  'Party Essentials':      'Turn any room into a celebration',
  'Pooja & Essentials':     'Everything ready before the first diya is lit',
}

// Curated cross-category shortcuts — each maps straight into a specific
// (category, occasion) pair verified against the actual product rows
// (migrations 015/017), so every link lands on a populated results page,
// never an empty "no items tagged" screen.
const OCCASION_SHORTCUTS = [
  { label: 'Birthday',         emoji: '🎂', category: 'Cakes',              occasion: 'Birthday',         query: 'birthday cake celebration' },
  { label: 'Wedding',          emoji: '💍', category: 'Gifts',              occasion: 'Wedding',          query: 'indian wedding gift hamper' },
  { label: 'Rakhi',            emoji: '🎁', category: 'Gifts',              occasion: 'Rakhi',            query: 'rakhi raksha bandhan gift' },
  { label: 'Diwali',           emoji: '🪔', category: 'Gifts',              occasion: 'Diwali',           query: 'diwali diya lamp hamper' },
  { label: 'Anniversary',      emoji: '💐', category: 'Flowers',            occasion: 'Anniversary',      query: 'anniversary flower bouquet' },
  { label: 'Housewarming',     emoji: '🏠', category: 'Party Essentials',   occasion: 'Housewarming',     query: 'housewarming door decoration toran' },
  { label: 'Baby Shower',      emoji: '🍼', category: 'Party Essentials',   occasion: 'Baby Shower',      query: 'baby shower balloon decoration pastel' },
  { label: 'New Year',         emoji: '🎉', category: 'Gifts',              occasion: 'New Year',         query: 'new year hamper celebration' },
  { label: 'Ganesh Chaturthi', emoji: '🐘', category: 'Pooja & Essentials', occasion: 'Ganesh Chaturthi', query: 'ganesh chaturthi idol clay' },
  { label: 'Corporate',        emoji: '💼', category: 'Gifts',              occasion: 'Corporate',        query: 'corporate gift hamper premium' },
  { label: 'Independence Day', emoji: '🇮🇳', category: 'Gifts',              occasion: 'Independence Day', query: 'indian flag tricolor celebration' },
]

/**
 * The storefront home — an Android marketplace screen, not a web landing page.
 *
 * Read top to bottom it answers, in the order a first-time visitor asks them:
 * where does this deliver (app bar) → what can I save (offers) → what am I
 * shopping for (occasions) → what do you sell (categories) → what do other
 * people buy (best sellers) → who actually makes and delivers this, and how
 * do I pay (service model + payments).
 *
 * Everything on it is live data. The offers are rows from `coupons`, the best
 * sellers come from the same `get_product_order_counts` RPC the category
 * sorter uses, the category counts are a real `products` query, and the
 * countdown counts real days. There is no placeholder content on this page,
 * which is the point — a pre-launch shop that invents social proof is a shop
 * nobody can trust the second they notice.
 */
export default function Shop() {
  const [counts, setCounts] = useState({})
  const [query, setQuery] = useState('')
  const daysToIndependenceDay = daysUntil(INDEPENDENCE_DAY)

  useEffect(() => {
    supabase.from('products').select('category').then(({ data }) => {
      if (!data) return
      // Count by raw category, then fold the aliases in — a 'Gifts & Hampers'
      // tile that reads 63 while the page shows 122 is worse than no count.
      const raw = {}
      data.forEach(p => { raw[p.category] = (raw[p.category] ?? 0) + 1 })
      const next = {}
      SHOP_CATEGORIES.forEach(c => {
        next[c.id] = categoryQueryValues(c.id).reduce((sum, v) => sum + (raw[v] ?? 0), 0)
      })
      setCounts(next)
    })
  }, [])

  const searching = query.trim().length >= 2

  return (
    <div className="shop-canvas min-h-screen pb-bottom-nav">
      <ShopAppBar query={query} onQueryChange={setQuery} />

      {searching ? (
        <SearchResults query={query.trim()} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-8 pb-32 pt-4">

          {/* ── Where and when ─────────────────────────────────────────
              Above everything, because it qualifies everything below it.
              The shop was organised around occasions and never asked what
              day the occasion was, or let the shopper confirm the city it
              was delivering to — both were discovered after checkout. */}
          <DeliverySlip className="!mt-0" />

          {/* ── Live promise ticker ────────────────────────────────────
              The three things the storefront guarantees, one at a time.
              A row of three grey badges is scenery; one line that keeps
              changing gets read. */}
          <PromiseTicker />

          {/* ── Independence Day countdown ─────────────────────────── */}
          {daysToIndependenceDay >= 0 && daysToIndependenceDay <= 21 && (
            <div className="px-4">
              <Link
                to={`/shop/Gifts?occasion=${encodeURIComponent('Independence Day')}`}
                className="group relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF9933] via-white to-[#138808] px-4 py-3.5 shadow-lg ring-1 ring-white/20"
              >
                <span className="text-3xl">🇮🇳</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold leading-tight text-gray-900">
                    {daysToIndependenceDay === 0
                      ? "It's Independence Day today!"
                      : `Independence Day in ${daysToIndependenceDay} day${daysToIndependenceDay === 1 ? '' : 's'}`}
                  </p>
                  <p className="text-[11px] font-medium text-gray-700">
                    Tricolour cakes, hampers & decor — shop patriotic picks
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-xl bg-forest-800 px-3 py-2 text-[11px] font-extrabold text-white transition-transform group-active:scale-95">
                  Shop <ArrowRight size={12} />
                </span>
              </Link>
            </div>
          )}

          <OffersRail />

          {/* ── Shop by occasion ───────────────────────────────────── */}
          <section aria-labelledby="occasion-heading">
            <div className="px-4">
              <h2 id="occasion-heading" className="text-[15px] font-extrabold text-white">What are we celebrating?</h2>
              <p className="mt-0.5 text-[11px] text-white/50">Jump straight to the shelf that fits the day.</p>
            </div>
            <div className="mt-3 flex gap-3.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {OCCASION_SHORTCUTS.map(o => (
                <Link
                  key={o.label}
                  to={`/shop/${encodeURIComponent(o.category)}?occasion=${encodeURIComponent(o.occasion)}`}
                  className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="relative block h-[68px] w-[68px] overflow-hidden rounded-2xl ring-2 ring-white/15 transition-all group-active:scale-95 group-hover:ring-saffron-400">
                    <ProductImage query={o.query} emoji={o.emoji} className="h-full w-full" cinematic />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest-950/70 to-transparent" />
                  </span>
                  <span className="text-center text-[10px] font-bold leading-tight text-white/80">{o.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Categories ─────────────────────────────────────────── */}
          <section aria-labelledby="cat-heading" className="px-4">
            <h2 id="cat-heading" className="text-[15px] font-extrabold text-white">Shop by category</h2>
            <p className="mt-0.5 text-[11px] text-white/50">Everything Sambramo delivers, in five shelves.</p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {SHOP_CATEGORIES.map((cat, i) => (
                <Link
                  key={cat.id}
                  to={`/shop/${encodeURIComponent(cat.id)}`}
                  className={`shop-card group flex flex-col ${i === 0 ? 'col-span-2' : ''}`}
                >
                  <span className="relative block">
                    <ProductImage
                      query={CATEGORY_QUERIES[cat.id] ?? cat.label}
                      emoji={cat.emoji}
                      className={i === 0 ? 'h-36 w-full' : 'aspect-[4/3] w-full'}
                      cinematic
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/10 to-transparent" />
                    {counts[cat.id] > 0 && (
                      <span className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-forest-800 backdrop-blur-sm">
                        {counts[cat.id]} items
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-serif text-[17px] font-bold leading-tight text-white drop-shadow">{cat.label}</span>
                    </span>
                  </span>

                  <span className="flex flex-1 items-center gap-2 p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold leading-snug text-gray-600 line-clamp-2">
                        {CATEGORY_HOOKS[cat.id] ?? cat.tagline}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={15} strokeWidth={3} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Best sellers ───────────────────────────────────────── */}
          <BestSellersRail />

          <div className="space-y-4 px-4">
            <HowWeServe />
            <PaymentStrip />

            {/* The photo disclaimer, kept where someone browsing can see it
                rather than only on the product page. Sambramo is pre-launch
                and sources per order — the photo is the style, not the
                specific box that arrives, and saying so here costs one line. */}
            <p className="flex items-start gap-2 px-1 pb-2 text-[11px] leading-relaxed text-white/40">
              <Camera size={13} className="mt-0.5 shrink-0" />
              Photos are representative of the style and finish. Your order is made
              fresh, so small differences are normal.
            </p>
          </div>
        </div>
      )}

      <StickyCartBar />
    </div>
  )
}

/* ── The rotating promise line ───────────────────────────────────────── */
function PromiseTicker() {
  return (
    <div className="px-4">
      <div className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron-400" />
        </span>
        <DetailRotator
          className="flex-1 [&_span]:!text-white/75"
          interval={3200}
          facts={[
            { key: 'p1', text: 'Delivered by Sambramo — one number to call, whoever made it' },
            { key: 'p2', text: 'Made fresh per order, never pulled off a shelf' },
            { key: 'p3', text: 'Pay by UPI — Google Pay, PhonePe, Paytm or any app' },
            { key: 'p4', text: 'Free delivery on orders above ₹999' },
          ]}
        />
      </div>
    </div>
  )
}

/* ── Best sellers ────────────────────────────────────────────────────── */
function BestSellersRail() {
  const [items, setItems] = useState([])
  const { addProduct, sheet } = useProductAdd()
  const offers = usePublicOffers()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    // Order volume first, then fetch only those product rows. The ordering
    // is real — the same RPC the category page sorts "Most Ordered" by — so
    // this rail is empty rather than fabricated on a shop with no orders yet.
    supabase.rpc('get_product_order_counts').then(({ data }) => {
      const rows = (data ?? []).filter(r => r.total_ordered > 0)
      if (rows.length === 0 || cancelled) return
      const map = {}
      rows.forEach(r => { map[r.product_id] = r.total_ordered })
      const ids = rows.sort((a, b) => b.total_ordered - a.total_ordered).slice(0, 10).map(r => r.product_id)
      supabase.from('products').select('*').in('id', ids).then(({ data: products }) => {
        if (cancelled) return
        setCounts(map)
        // Re-apply the RPC's ranking: `in` returns rows in table order, not
        // in the order the ids were listed.
        setItems((products ?? []).sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0)))
      })
    })
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="best-heading">
      <div className="flex items-end justify-between px-4">
        <div>
          <h2 id="best-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-white">
            <Flame size={16} className="text-chilli-400" /> Most ordered
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">What people are actually buying this week.</p>
        </div>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-3 pt-5 scrollbar-hide snap-x">
        {items.map((p, i) => (
          <div key={p.id} className="w-[170px] shrink-0 snap-start">
            <MarketProductCard
              product={p}
              offer={bestOfferFor(p.price, offers)}
              orderCount={counts[p.id] ?? 0}
              stagger={i * 450}
              onAdd={() => addProduct(p)}
            />
          </div>
        ))}
      </div>
      {sheet}
    </section>
  )
}

/* ── Search ──────────────────────────────────────────────────────────── */
function SearchResults({ query }) {
  const [results, setResults] = useState(null)   // null = still searching
  const offers = usePublicOffers()
  const { addProduct, sheet } = useProductAdd()
  const reqId = useRef(0)

  useEffect(() => {
    const id = ++reqId.current
    setResults(null)
    // Debounced, and every response checked against the request that asked
    // for it — typing "cake" fires four queries and they do not come back in
    // order, so without the guard the results for "ca" can land last and win.
    const t = setTimeout(() => {
      const term = query.replace(/[%,]/g, ' ')
      supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${term}%,description.ilike.%${term}%,occasion.ilike.%${term}%`)
        .limit(40)
        .then(({ data }) => { if (id === reqId.current) setResults(data ?? []) })
    }, 260)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-5">
      {results === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <SearchX size={30} className="mx-auto text-white/25" />
          <p className="mt-3 text-sm font-bold text-white">Nothing matches “{query}”</p>
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-white/45">
            Try a shorter word, or browse a category — we make plenty to order that
            isn't in the catalogue yet.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15"
          >
            Browse all categories <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px] font-semibold text-white/50">
            {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((p, i) => (
              <MarketProductCard
                key={p.id}
                product={p}
                offer={bestOfferFor(p.price, offers)}
                stagger={i * 300}
                onAdd={() => addProduct(p)}
              />
            ))}
          </div>
        </>
      )}
      {sheet}
    </div>
  )
}
