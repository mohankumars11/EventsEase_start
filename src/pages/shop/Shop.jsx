import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SearchX, Ticket, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePublicOffers, bestOfferFor } from '../../hooks/usePublicOffers'
import { useProductAdd } from '../../components/shop/useProductAdd'
import { canDeliverToday } from '../../lib/deliveryPromise'
import {
  QUICK_RAIL, OCCASION_TILES, SHELF_STRIPS, PROMISES, GUIDES,
} from '../../data/giftingHome'
import GiftAppBar from '../../components/gifting/GiftAppBar'
import GiftCard, { GiftCardRailItem } from '../../components/gifting/GiftCard'
import {
  SectionHead, Rail, QuickRail, OccasionMosaic, ShelfBanner, PromiseStrip, GuideRail,
} from '../../components/gifting/GiftSections'
import { formatINR } from '../../utils/format'

/**
 * The storefront.
 *
 * ── Read top to bottom, it answers the questions in the order asked ──────
 *   where does this go        the bar
 *   what do you have          the square shortcut rail
 *   what is this even for     the occasion mosaic
 *   can it get here in time   the "today" rail, which only exists when it can
 *   show me the shelves       the shelf banners, each with its ways in
 *   how do I choose           the guides
 *   why you                   the promises
 *
 * ── Everything here is filtered against real rows ────────────────────────
 * `giftingHome` is an editorial list, not a source of truth. Every tile,
 * banner and shortcut on this page is checked against a live `products` query
 * before it renders, and anything with nothing behind it is dropped. That is
 * what makes it safe for the data file to describe shelves whose migration
 * has not been pasted yet: the worst outcome is a section that has not
 * appeared, never a door into an empty results page.
 *
 * ── One product query, not seven ─────────────────────────────────────────
 * The page needs counts per shelf, counts per occasion, a "landing this week"
 * rail and a "can arrive today" rail. All four are views over the same rows,
 * so there is one select and the rest is done in memory. Seven queries on a
 * home screen is how a storefront takes two seconds to become useful on a
 * phone.
 */
export default function Shop() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const offers = usePublicOffers()
  const { addProduct, sheet } = useProductAdd()

  useEffect(() => {
    let alive = true
    supabase
      .from('products')
      .select('id, name, subtitle, category, occasion, price, mrp, emoji, image_url, image_alt, badge, same_day, prep_hours, is_active, sort_order, created_at, seed_rating, seed_rating_count')
      .eq('is_active', true)
      .order('sort_order')
      .limit(600)
      .then(({ data }) => {
        if (!alive) return
        setRows(data ?? [])
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  /** How many live products sit on each shelf, and under each occasion tag. */
  const counts = useMemo(() => {
    const byCategory = new Map()
    const byPair = new Map()
    for (const p of rows) {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1)
      if (p.occasion) {
        const key = `${p.category}|${p.occasion}`
        byPair.set(key, (byPair.get(key) ?? 0) + 1)
      }
    }
    return { byCategory, byPair }
  }, [rows])

  /**
   * A real photograph for a (shelf, occasion) pair.
   *
   * Every tile on this page is a square that wants a picture in it, and the
   * catalogue already has one: `products.image_url` was resolved per row by
   * scripts/resolve-product-images.mjs. Borrowing the first one on the shelf
   * beats a live Unsplash search per tile — the free tier allows about 24 of
   * those per page load, and this page would want thirty on its own.
   *
   * The row is picked by `sort_order`, which is the order an admin arranged
   * the shelf in, so the tile shows the item they chose to lead with rather
   * than whichever row the database handed back first.
   */
  const photoFor = useMemo(() => {
    const byPair = new Map()
    const byCat = new Map()
    for (const p of rows) {
      if (!p.image_url) continue
      if (!byCat.has(p.category)) byCat.set(p.category, p.image_url)
      if (p.occasion) {
        const key = `${p.category}|${p.occasion}`
        if (!byPair.has(key)) byPair.set(key, p.image_url)
      }
    }
    return (category, occasion) =>
      (occasion && byPair.get(`${category}|${occasion}`)) || byCat.get(category) || null
  }, [rows])

  /** Occasion tiles that actually lead somewhere, each with a real photo. */
  const tiles = useMemo(
    () => OCCASION_TILES
      .filter(t => (counts.byPair.get(`${t.category}|${t.occasion}`) ?? 0) > 0)
      .map(t => ({ ...t, photo: photoFor(t.category, t.occasion) })),
    [counts, photoFor],
  )

  /** Shelf banners for shelves that exist, with their empty ways removed. */
  const strips = useMemo(
    () => SHELF_STRIPS
      .filter(s => (counts.byCategory.get(s.category) ?? 0) > 0)
      .map(s => ({
        ...s,
        ways: s.ways
          .filter(w => (counts.byPair.get(`${s.category}|${w.occasion}`) ?? 0) > 0)
          .map(w => ({ ...w, photo: photoFor(s.category, w.occasion) })),
      })),
    [counts, photoFor],
  )

  /** Quick-rail entries whose shelf has stock. 'today' and filtered links always stay. */
  const quick = useMemo(() => QUICK_RAIL.filter(item => {
    const m = item.to.match(/^\/shop\/([^?]+)/)
    if (!m || m[1] === 'today') return true
    return (counts.byCategory.get(decodeURIComponent(m[1])) ?? 0) > 0
  }), [counts])

  /**
   * What can still arrive today.
   *
   * Computed at render against the clock, so this rail empties itself through
   * the evening rather than advertising a same-day delivery the slot picker
   * would then refuse. An empty rail is not rendered at all — the honest
   * answer at 11 PM is silence, not a section reading "0 items".
   */
  const todayItems = useMemo(
    () => rows.filter(p => canDeliverToday(p)).slice(0, 12),
    [rows],
  )

  /** Newest rows first. `created_at` is on every row since migration 009. */
  const fresh = useMemo(
    () => [...rows]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 12),
    [rows],
  )

  /** Search runs over the rows already loaded — no round trip per keystroke. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return null
    return rows.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.subtitle?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.occasion?.toLowerCase().includes(q),
    ).slice(0, 40)
  }, [query, rows])

  return (
    <div className="shop-canvas a-shop min-h-screen pb-28">
      <GiftAppBar query={query} onQueryChange={setQuery} />

      {results ? (
        <SearchResults query={query} results={results} offers={offers} onAdd={addProduct} />
      ) : (
        <main className="mx-auto max-w-6xl space-y-9 pt-3">
          {/* ── The occasion mosaic, first ────────────────────────────────
              Nobody arrives at a gift shop wanting a category. They arrive
              because something is happening — a birthday, a housewarming,
              a festival next week — and the shelf a thing sits on is our
              filing system, not their reason.

              So the moment leads and the shelves follow it. The rail below
              is still the fastest route for somebody who knows they want
              flowers, which is why it stays; it just no longer stands in
              front of the question most people came in with. */}
          {tiles.length > 0 && (
            <section>
              <SectionHead
                title="What are you shopping for?"
                sub="Pick the moment — we will show you everything for it, from every shelf."
              />
              <OccasionMosaic tiles={tiles} />
            </section>
          )}

          {/* ── The shelves, for people who already know ── */}
          <section>
            <SectionHead
              title="Or go straight to a shelf"
              sub="Flowers, cakes, gifts, pooja essentials."
            />
            <QuickRail items={quick} />
          </section>

          {/* ── Still possible today ── */}
          {todayItems.length > 0 && (
            <section>
              <SectionHead
                title="Still possible today"
                sub="Checked against the clock, not a badge — these have a delivery window left."
                to="/shop/today"
              />
              <Rail>
                {todayItems.map(p => (
                  <GiftCardRailItem
                    key={p.id}
                    product={p}
                    offer={bestOfferFor(p.price, offers)}
                    onAdd={addProduct}
                    className="snap-start"
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* ── The shelves ── */}
          <div className="space-y-7">
            {strips.map(s => <ShelfBanner key={s.id} strip={s} />)}
          </div>

          {/* ── Offers ── */}
          {offers?.length > 0 && (
            <section>
              <SectionHead title="Codes that work today" sub="Applied at the bag. Nothing is hidden behind a minimum you find out later." />
              <Rail>
                {offers.slice(0, 8).map(o => (
                  <div
                    key={o.code}
                    className="flex w-[228px] shrink-0 snap-start flex-col justify-between rounded-2xl border border-dashed border-chilli-300 bg-chilli-50 p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <Ticket size={16} className="mt-0.5 shrink-0 text-chilli-600" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold leading-tight text-chilli-700">
                          {o.discount_type === 'percent' ? `${o.discount_value}% off` : `${formatINR(o.discount_value)} off`}
                        </p>
                        <p className="mt-0.5 text-[10.5px] leading-snug text-ink-soft">
                          {o.min_order_amount > 0 ? `On bags over ${formatINR(o.min_order_amount)}` : 'On any bag'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg bg-white px-2 py-1.5 text-center text-[12px] font-extrabold tracking-widest text-ink">
                      {o.code}
                    </p>
                  </div>
                ))}
              </Rail>
            </section>
          )}

          {/* ── Newest ── */}
          {fresh.length > 0 && (
            <section>
              <SectionHead
                title="Just added"
                sub="The most recent things to reach the catalogue."
              />
              <Rail>
                {fresh.map(p => (
                  <GiftCardRailItem
                    key={p.id}
                    product={p}
                    offer={bestOfferFor(p.price, offers)}
                    onAdd={addProduct}
                    className="snap-start"
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* ── Guides ── */}
          <section>
            <SectionHead
              title="Not sure what to send?"
              sub="Short guides, written by the people who pack these."
            />
            <GuideRail guides={GUIDES} />
          </section>

          <PromiseStrip promises={PROMISES} />

          {loading && (
            <p className="px-4 text-center text-[12px] font-semibold text-ink-mute">Loading the catalogue…</p>
          )}

          {!loading && rows.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Sparkles size={22} className="mx-auto text-ink-mute" />
              <p className="mt-3 text-[13px] font-extrabold text-ink">The shelves are being stocked.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                Nothing is live in this catalogue yet. We would rather show you an empty shop than a
                grid of things you cannot actually order.
              </p>
            </div>
          )}
        </main>
      )}

      {sheet}
    </div>
  )
}

/** Search results, in the same grid the listing page uses. */
function SearchResults({ query, results, offers, onAdd }) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-4">
      <p className="mb-3 text-[12.5px] font-semibold text-ink-soft">
        <span className="font-extrabold text-ink">{results.length}</span>
        {results.length === 1 ? ' match for ' : ' matches for '}
        <span className="font-extrabold text-ink">“{query.trim()}”</span>
      </p>

      {results.length === 0 ? (
        <div className="py-14 text-center">
          <SearchX size={24} className="mx-auto text-ink-mute" />
          <p className="mt-3 text-[13px] font-extrabold text-ink">Nothing matches that.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            Try a shorter word — “roses” rather than “red rose bouquet delivery”.
          </p>
          <Link to="/shop" className="mt-4 inline-block rounded-xl bg-forest-800 px-4 py-2 text-[12px] font-extrabold text-white">
            Back to the shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {results.map(p => (
            <GiftCard key={p.id} product={p} offer={bestOfferFor(p.price, offers)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </main>
  )
}
