import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Flame, ChevronRight, Camera, SearchX } from 'lucide-react'
import { categoryQueryValues } from '../../config/shop'
import { useShopCategories } from '../../hooks/useShopCategories'
import { groupsForCategory } from '../../data/shopOccasions'
import { supabase } from '../../lib/supabase'
import { useAutoScrollRail } from '../../hooks/useAutoScrollRail'
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
  // The shelves come from the database (migration 051) merged over the config
  // list — NOT from the config list alone. A shelf an admin adds in the
  // Product Studio has to appear here, otherwise its products are unreachable
  // however correctly they were saved. See hooks/useShopCategories.
  const shopCategories = useShopCategories()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const daysToIndependenceDay = daysUntil(INDEPENDENCE_DAY)

  useEffect(() => {
    // `occasion` as well as `category` now. The tiles used to print a count
    // and a count is the one number this shop should not lead with — see the
    // note on CategoryTile.
    supabase.from('products').select('category, occasion, is_active').then(({ data }) => {
      if (!data) return
      setRows(data.filter(p => p.is_active !== false))
    })
  }, [])

  /**
   * Ways into each shelf, drawn from the taxonomy in data/shopOccasions.
   *
   * `groupsForCategory` already does the work and already guarantees the
   * thing that matters: it only returns occasions that have products behind
   * them, so no chip can land on an empty results page. Flattening the groups
   * here is deliberate — the grouped form is right for the category page's
   * filter sheet, where there is room for five labelled rows; on a tile there
   * is room for three or four chips, and what they need to be is the most
   * populated ones, whichever group they came from.
   */
  const waysIn = useMemo(() => {
    const out = {}
    for (const cat of shopCategories) {
      const values = new Set(categoryQueryValues(cat.id))
      const mine = rows.filter(p => values.has(p.category))
      out[cat.id] = groupsForCategory(cat.id, mine)
        .flatMap(g => g.occasions)
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .slice(0, 4)
    }
    return out
  }, [rows, shopCategories])

  const searching = query.trim().length >= 2

  return (
    <div className="shop-canvas min-h-screen pb-bottom-nav">
      <ShopAppBar query={query} onQueryChange={setQuery} />

      {searching ? (
        <SearchResults query={query.trim()} />
      ) : (
        /* ── The vertical rhythm ────────────────────────────────────────
           Was `space-y-8`: 32px between every neighbour, which on a phone
           reads as far more, because each neighbour is a rounded card with
           its own padding and a shadow, so the eye measures card-edge to
           card-edge. Six sections at a uniform 32px is not a rhythm, it is
           the absence of one, and it left this storefront looking like six
           unrelated banners rather than one shop.

           Now: 24px between sections that are different ideas, and the
           promise ticker and the festival countdown bound together at 10px,
           because they are one band — "here is what we promise, and here is
           what is happening this week". */
        <div className="mx-auto max-w-3xl space-y-6 pb-32 pt-3">

          {/* ── Where and when ─────────────────────────────────────────
              Above everything, because it qualifies everything below it.
              The shop was organised around occasions and never asked what
              day the occasion was, or let the shopper confirm the city it
              was delivering to — both were discovered after checkout. */}
          <DeliverySlip className="!mt-0" />

          {/* ── Shop by occasion ─────────────────────────────────────
              Moved to the top, directly under the delivery slip, and it is
              the most important change on this page. "What are we
              celebrating?" is the question a shopper actually arrives with:
              nobody opens a gifting app wanting "Category: Gifts", they want
              a birthday sorted. It used to sit fourth, behind a promise
              ticker, a festival banner and the coupon rail — three pieces of
              merchandising in front of the one piece of navigation.

              So the page now reads: where is this going → what is the
              occasion → what is on this week → what do you sell. */}
          <OccasionRail />

          {/* ── This week's band ──────────────────────────────────────
              The promise line and the countdown, tied together at 10px so
              they read as one strip of "what's true today" instead of two
              floating cards. */}
          <div className="space-y-2.5">
            {/* The three things the storefront guarantees, one at a time. A
                row of three grey badges is scenery; one line that keeps
                changing gets read. */}
            <PromiseTicker />

            {daysToIndependenceDay >= 0 && daysToIndependenceDay <= 21 && (
              <div className="px-4">
                <Link
                  to={`/shop/Gifts?occasion=${encodeURIComponent('Independence Day')}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF9933] via-white to-[#138808] px-4 py-3.5 shadow-lg ring-1 ring-hairline/10"
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
          </div>

          <OffersRail />

          {/* ── Categories ─────────────────────────────────────────── */}
          <section aria-labelledby="cat-heading" className="px-4">
            <h2 id="cat-heading" className="text-[15px] font-extrabold text-ink">Shop by category</h2>
            {/* Counted, not typed. It said "Five shelves" while six were
                rendered, and it would have gone on being wrong every time an
                admin added one. */}
            <p className="mt-0.5 text-[11px] text-ink-mute">
              {shopCategories.length} shelves — tap a shelf, or jump to the reason you're shopping.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {shopCategories.map((cat, i) => (
                <CategoryTile key={cat.id} cat={cat} wide={i === 0} waysIn={waysIn[cat.id] ?? []} />
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
            <p className="flex items-start gap-2 px-1 pb-2 text-[11px] leading-relaxed text-ink-mute">
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

/* ── Shop by occasion ─────────────────────────────────────────────────
   The page's primary navigation, and now its first thing.

   It advances itself, on the same contract as the home screen's tier and
   festival rails: on a 390px phone four and a bit of these eleven are on
   screen and nothing else says the rest exist, so a static rail is a rail
   most people see a third of. It stops for good at the first touch —
   pulling a shopper away from the tile they were reaching for is the
   classic carousel injury, and one that costs an order here.

   Dots underneath for the same reason they are on the other rails: they
   are the only thing that says how long this is. */
function OccasionRail() {
  const { ref, active, handlers } = useAutoScrollRail(OCCASION_SHORTCUTS.length)

  return (
    <section aria-labelledby="occasion-heading">
      <div className="px-4">
        <h2 id="occasion-heading" className="text-[15px] font-extrabold text-ink">What are we celebrating?</h2>
        <p className="mt-0.5 text-[11px] text-ink-mute">Jump straight to the shelf that fits the day.</p>
      </div>
      <div
        ref={ref}
        {...handlers}
        className="mt-3 flex gap-3.5 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x scroll-pl-4"
      >
        {OCCASION_SHORTCUTS.map(o => (
          <Link
            key={o.label}
            to={`/shop/${encodeURIComponent(o.category)}?occasion=${encodeURIComponent(o.occasion)}`}
            className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5"
          >
            <span className="relative block h-[68px] w-[68px] overflow-hidden rounded-2xl ring-2 ring-hairline/10 transition-all group-active:scale-95 group-hover:ring-saffron-400">
              <ProductImage query={o.query} emoji={o.emoji} className="h-full w-full" cinematic />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest-950/70 to-transparent" />
            </span>
            <span className="text-center text-[10px] font-bold leading-tight text-ink-soft">{o.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden="true">
        {OCCASION_SHORTCUTS.map((o, i) => (
          <span
            key={o.label}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? 'w-4 bg-saffron-500' : 'w-1 bg-ink/20'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

/* ── One shelf ────────────────────────────────────────────────────────
   ── Why there is no item count on here any more ──────────────────────
   The tile used to carry a "{n} items" badge, and a count is the one
   number a pre-launch catalogue should never lead with. It answers a
   question nobody asked with the single most discouraging fact available:
   "12 items" tells a shopper the shelf is nearly empty before they have
   seen one thing on it, and it is not even the truth about what Sambramo
   can supply — the shop sources per order, and plenty gets made that is
   not in the catalogue yet. It also invites a comparison against Amazon
   that this business cannot win and does not need to fight.

   What replaces it is navigation. Each tile now shows the real ways into
   that shelf, taken from the occasion taxonomy in data/shopOccasions that
   the category page's filter sheet already uses — so "Cakes" offers
   Birthday and Anniversary rather than a number, and the shopper picks the
   reason they came instead of counting stock. Every chip is guaranteed to
   have products behind it: `groupsForCategory` filters to occasions with a
   non-zero count, so none of them can land on an empty page.

   That is also why the chips are a `<span>` carrying an onClick and not a
   nested `<Link>`: this tile is already an anchor, and an anchor inside an
   anchor is invalid HTML that browsers resolve unpredictably. */
function CategoryTile({ cat, wide, waysIn }) {
  return (
    <Link
      to={`/shop/${encodeURIComponent(cat.id)}`}
      className={`shop-card group flex flex-col ${wide ? 'col-span-2' : ''}`}
    >
      <span className="relative block">
        {/* `hero_image_url` first: a shelf the admin created has no entry in
            CATEGORY_QUERIES below, and the picture they chose for it in the
            Shelf Manager is a better answer than an Unsplash guess at its
            name. Falls through to the curated query, then to the label. */}
        <ProductImage
          src={cat.hero_image_url || undefined}
          query={CATEGORY_QUERIES[cat.id] ?? cat.label}
          emoji={cat.emoji}
          className={wide ? 'h-36 w-full' : 'aspect-[4/3] w-full'}
          cinematic
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/10 to-transparent" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forest-950/85 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
          <span className="text-xl">{cat.emoji}</span>
          <span className="font-serif text-[17px] font-bold leading-tight text-white drop-shadow">{cat.label}</span>
        </span>
      </span>

      <span className="flex flex-1 flex-col p-3">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold leading-snug text-gray-600 line-clamp-2">
              {cat.blurb || CATEGORY_HOOKS[cat.id] || cat.tagline}
            </span>
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition-transform group-hover:translate-x-0.5">
            <ChevronRight size={15} strokeWidth={3} />
          </span>
        </span>

        {waysIn.length > 0 && (
          <span className={`mt-2.5 flex gap-1.5 ${wide ? 'flex-wrap' : 'flex-wrap'}`}>
            {waysIn.slice(0, wide ? 4 : 3).map(o => (
              <ShelfChip key={o.id} category={cat.id} occasion={o} />
            ))}
          </span>
        )}
      </span>
    </Link>
  )
}

/** One way into a shelf. See CategoryTile for why this is not a `<Link>`. */
function ShelfChip({ category, occasion }) {
  const navigate = useNavigate()
  const to = `/shop/${encodeURIComponent(category)}?occasion=${encodeURIComponent(occasion.id)}`

  function go(e) {
    // Stop the parent tile's navigation, which would drop the filter.
    e.preventDefault()
    e.stopPropagation()
    navigate(to)
  }

  return (
    <span
      role="link"
      tabIndex={0}
      aria-label={`${occasion.label} in ${category}`}
      onClick={go}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') go(e) }}
      className="inline-flex items-center gap-1 rounded-lg bg-forest-50 px-2 py-1 text-[10px] font-bold text-forest-800 ring-1 ring-forest-200/70 transition-colors hover:bg-forest-100 active:bg-forest-100"
    >
      <span aria-hidden="true">{occasion.emoji}</span>
      <span className="truncate">{occasion.label}</span>
    </span>
  )
}

/* ── The rotating promise line ───────────────────────────────────────── */
function PromiseTicker() {
  return (
    <div className="px-4">
      <div className="flex items-center gap-2.5 rounded-2xl bg-surface-sunk/[0.07] px-3.5 py-2.5 ring-1 ring-hairline/10">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-saffron-400 animate-pulse-ring" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron-400" />
        </span>
        <DetailRotator
          className="flex-1 [&_span]:!text-ink-soft"
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
        // in the order the ids were listed. Retired products drop out here —
        // `is_active` only exists after migration 037 (applied by hand), so
        // `!== false` is the form that is correct before and after it.
        setItems((products ?? [])
          .filter(p => p.is_active !== false)
          .sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0)))
      })
    })
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="best-heading">
      <div className="flex items-end justify-between px-4">
        <div>
          <h2 id="best-heading" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            <Flame size={16} className="text-chilli-400" /> Most ordered
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-mute">What people are actually buying this week.</p>
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
        // Retired products are not findable either — see the note above.
        .then(({ data }) => {
          if (id === reqId.current) setResults((data ?? []).filter(p => p.is_active !== false))
        })
    }, 260)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-5">
      {results === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-surface-sunk/[0.07]" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <SearchX size={30} className="mx-auto text-ink-mute" />
          <p className="mt-3 text-sm font-bold text-ink">Nothing matches “{query}”</p>
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-ink-mute">
            Try a shorter word, or browse a category — we make plenty to order that
            isn't in the catalogue yet.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-surface-sunk/[0.07] px-4 py-2.5 text-xs font-bold text-ink ring-1 ring-hairline/10"
          >
            Browse all categories <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px] font-semibold text-ink-mute">
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
