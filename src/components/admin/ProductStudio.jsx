import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import {
  Loader2, Search, Plus, X, Check, AlertTriangle, ClipboardPaste, Layers,
  IndianRupee, Tag, EyeOff, Eye, Images, Film, Star, HelpCircle, Sparkles,
  ChevronRight, PackageOpen, Store, ArrowRight, ExternalLink, CheckCircle2, Camera,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { fetchCategories, FALLBACK_CATEGORIES } from '../../lib/shopCategories'
import { invalidateShopCategories } from '../../hooks/useShopCategories'
import { QuickPhotoSheet } from './PhotoIntake'
import {
  parseBulk, importProducts, bulkUpdate, saveProduct, publishProducts,
  fetchMediaCounts, fetchRatings, isNotInstalled,
} from '../../lib/productStudio'

const ProductWorkbench = lazy(() => import('./ProductWorkbench'))
const ShelfManager     = lazy(() => import('./ShelfManager'))
const AiImport         = lazy(() => import('./AiImport'))

/**
 * The Product Studio — one screen that owns everything a customer sees about
 * everything we sell.
 *
 * ── Why this exists next to AdminCatalog ─────────────────────────────────
 * `AdminCatalog` answers one question extremely well: which products still
 * have a stock lookalike instead of a real photograph. It is a camera
 * workflow, opened on a phone, and it should stay that.
 *
 * This answers a different question — "everything about this product is wrong
 * or missing, and I want to fix all of it now": the gallery, the clip, the
 * story, the questions people ask, the price, the shelf it sits on, the rating
 * beside it. Those live in five tables, and making somebody visit five screens
 * to fill in one product is how a catalogue stays half-written.
 *
 * ── Built for somebody who does not write code ───────────────────────────
 * Two constraints follow from that, and they shape most of what is here:
 *
 *   · Nothing is one-at-a-time if it does not have to be. A shop is filled in
 *     by pasting a spreadsheet, not by opening a form three hundred times, and
 *     a price rise is applied to a shelf, not to forty products in sequence.
 *     Hence the paste importer and the bulk bar.
 *   · Nothing fails silently or in a language about databases. Every empty
 *     state says what to do next, and the one error this screen genuinely
 *     cannot work around — migration 051 not applied — names the file to run
 *     rather than showing a Postgres code.
 */

const PAGE_SIZE = 48

export default function ProductStudio() {
  const toast = useToast()

  const [tab, setTab] = useState('products')   // 'products' | 'shelves'
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [media, setMedia] = useState({})
  const [ratings, setRatings] = useState({})
  const [installed, setInstalled] = useState(true)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [gaps, setGaps] = useState('all')      // see GAP_FILTERS
  // Separate from `gaps` on purpose: "show me what is off sale" is a different
  // question from "show me what is missing a photo", and folding them into one
  // chip row would make them mutually exclusive when an admin most often wants
  // both ("what is live and still has no picture").
  const [live, setLive] = useState('all')      // 'all' | 'on' | 'off'
  const [page, setPage] = useState(0)

  const [selected, setSelected] = useState(() => new Set())
  const [openId, setOpenId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  // The receipt shown after publishing. Not a toast: a toast disappears, and
  // the whole point of it is that the admin can click through and SEE the
  // product on the storefront.
  const [published, setPublished] = useState(null)
  // Which product's photo sheet is open. Clicking any thumbnail in the list
  // opens it — that is the gesture people already try, and it used to do
  // nothing at all.
  const [photoFor, setPhotoFor] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // `select('*')` for the same reason AdminCatalog does it: naming a column
      // migration 051 adds would 400 the entire query on a database that has
      // not run it, and this screen has to keep working there.
      // allSettled, not all. The product list is the screen; the media counts
      // and the ratings are decoration on it. A rejection in either of those —
      // a view that does not exist yet, a network blip — must not take the
      // catalogue down with it, which is exactly what `Promise.all` did.
      const [prod, cats, mc, rt] = await Promise.allSettled([
        supabase.from('products').select('*').order('category').order('name'),
        fetchCategories({ kind: 'all', includeInactive: true }),
        fetchMediaCounts(),
        fetchRatings(),
      ])

      if (prod.status === 'rejected') throw prod.reason
      if (prod.value.error) throw prod.value.error

      const data = prod.value.data ?? []
      setProducts(data)
      setCategories(cats.status === 'fulfilled' ? cats.value.categories : FALLBACK_CATEGORIES)
      setMedia(mc.status === 'fulfilled' ? mc.value.counts : {})
      setRatings(rt.status === 'fulfilled' ? rt.value.ratings : {})
      // The studio tables and the studio columns arrive in the same migration,
      // so either signal is enough to know.
      setInstalled(
        mc.status === 'fulfilled' && mc.value.installed && data.some(p => 'highlights' in p)
      )
      setPage(0)
      // The storefront caches the shelf list for the life of the tab. Without
      // this, an admin adds a shelf here, taps through to /shop in the same
      // tab, and sees the old list — which is indistinguishable from the save
      // having failed.
      invalidateShopCategories()
    } catch (err) {
      setError(friendlyError(err, 'Could not load the catalogue.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const shopCategories = useMemo(
    () => categories.filter(c => (c.kind ?? 'shop') === 'shop'),
    [categories]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (category !== 'all' && p.category !== category) return false
      // `!== false` rather than `=== true`: the column defaults to TRUE and is
      // absent altogether on a database behind on migration 037, where every
      // product is on sale.
      if (live === 'on'  && p.is_active === false) return false
      if (live === 'off' && p.is_active !== false) return false
      if (q && !(`${p.name} ${p.occasion ?? ''} ${p.description ?? ''}`.toLowerCase().includes(q))) return false

      const m = media[p.id]
      if (gaps === 'nogallery' && (m?.image ?? 0) + (m?.video ?? 0) > 0) return false
      if (gaps === 'novideo'   && (m?.video ?? 0) > 0) return false
      if (gaps === 'norating'  && ratings[p.id]?.rating) return false
      if (gaps === 'noprice'   && Number(p.price) > 0) return false
      return true
    })
  }, [products, category, search, gaps, live, media, ratings])

  const shown = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const allShownSelected = shown.length > 0 && shown.every(p => selected.has(p.id))

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllShown() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allShownSelected) shown.forEach(p => next.delete(p.id))
      else shown.forEach(p => next.add(p.id))
      return next
    })
  }

  /**
   * Put things on sale, from anywhere on this screen, with one confirmation.
   *
   * Every route to "make this live" — the row toggle, the bulk bar — comes
   * through here so the admin gets the same verified answer each time rather
   * than a toast from one path and nothing from another.
   */
  const publish = useCallback(async (ids, active) => {
    const result = await publishProducts(ids, { active })

    if (!active) {
      toast.success(
        result.confirmed.length === 1
          ? `“${result.confirmed[0].name}” is off sale — customers can no longer see it.`
          : `${result.confirmed.length} products taken off sale.`
      )
      await load()
      return result
    }

    if (result.failed.length) {
      toast.error(
        `${result.failed.length} product${result.failed.length === 1 ? '' : 's'} did not go live. ` +
        'Your account may not have permission to publish.'
      )
    }
    if (result.confirmed.length) setPublished(result)
    await load()
    return result
  }, [load, toast])

  const openProduct = products.find(p => p.id === openId) ?? null

  /* ── Counts for the header ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const withGallery = products.filter(p => (media[p.id]?.image ?? 0) + (media[p.id]?.video ?? 0) > 0).length
    const withVideo   = products.filter(p => (media[p.id]?.video ?? 0) > 0).length
    const withRating  = products.filter(p => ratings[p.id]?.rating).length
    return { total: products.length, withGallery, withVideo, withRating }
  }, [products, media, ratings])

  return (
    <div className="space-y-4">
      {!installed && <MigrationBanner />}

      {/* Tabs — the shelves and the things on them are one subject, so they
          are one screen with two views rather than two nav entries that make
          somebody remember which console holds which. */}
      <div className="flex items-center gap-2">
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={PackageOpen}
          label="Products" count={products.length} />
        <TabButton active={tab === 'shelves'} onClick={() => setTab('shelves')} icon={Store}
          label="Shelves & categories" count={categories.filter(c => c.is_active !== false).length} />
      </div>

      {tab === 'shelves' ? (
        <Suspense fallback={<Skeleton />}>
          <ShelfManager
            categories={categories}
            products={products}
            onChanged={load}
          />
        </Suspense>
      ) : (
        <>
          <StudioHeader
            stats={stats}
            onImport={() => setImporting(true)}
            onCreate={() => setCreating(true)}
            onAi={() => setAiOpen(true)}
          />

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={load} className="font-semibold hover:underline">Retry</button>
            </div>
          )}

          <Filters
            categories={shopCategories}
            category={category} onCategory={c => { setCategory(c); setPage(0) }}
            search={search} onSearch={s => { setSearch(s); setPage(0) }}
            gaps={gaps} onGaps={g => { setGaps(g); setPage(0) }}
            live={live} onLive={v => { setLive(v); setPage(0) }}
            offCount={products.filter(p => p.is_active === false).length}
            count={filtered.length}
          />

          {selected.size > 0 && (
            <BulkBar
              ids={[...selected]}
              selectedProducts={products.filter(p => selected.has(p.id))}
              categories={shopCategories}
              onPublish={async (active) => { await publish([...selected], active); setSelected(new Set()) }}
              onDone={async (msg) => { toast.success(msg); setSelected(new Set()); await load() }}
              onCancel={() => setSelected(new Set())}
            />
          )}

          {loading ? (
            <Skeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasProducts={products.length > 0}
              onImport={() => setImporting(true)}
              onCreate={() => setCreating(true)}
              onAi={() => setAiOpen(true)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={toggleAllShown}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-plum-700"
                >
                  <span className={`grid h-4 w-4 place-items-center rounded border ${
                    allShownSelected ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {allShownSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  Select all {shown.length} shown
                </button>
                {selected.size > 0 && (
                  <span className="text-xs font-semibold text-plum-700">{selected.size} selected</span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map(p => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    media={media[p.id]}
                    rating={ratings[p.id]}
                    selected={selected.has(p.id)}
                    categories={shopCategories}
                    onToggle={() => toggle(p.id)}
                    onOpen={() => setOpenId(p.id)}
                    onPublish={active => publish([p.id], active)}
                    onPhoto={() => setPhotoFor(p)}
                    onMove={async to => {
                      const from = p.category
                      await bulkUpdate([p.id], { field: 'category', value: to })
                      const label = shopCategories.find(c => c.id === to)?.label ?? to
                      toast.success(`“${p.name}” moved from ${from} to ${label}.`)
                      await load()
                    }}
                  />
                ))}
              </div>

              {shown.length < filtered.length && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:border-plum-300 hover:text-plum-700"
                >
                  Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more
                  <span className="ml-1 text-gray-400">({filtered.length - shown.length} left)</span>
                </button>
              )}
            </>
          )}
        </>
      )}

      {importing && (
        <BulkImport
          categories={shopCategories}
          onClose={() => setImporting(false)}
          onDone={async (n) => { setImporting(false); toast.success(`${n} product${n === 1 ? '' : 's'} added.`); await load() }}
        />
      )}

      {aiOpen && (
        <Suspense fallback={null}>
          <AiImport
            categories={shopCategories}
            onClose={() => setAiOpen(false)}
            onDone={async (n) => {
              setAiOpen(false)
              toast.success(`${n} product${n === 1 ? '' : 's'} added. Now give them photos.`)
              await load()
            }}
          />
        </Suspense>
      )}

      {creating && (
        <QuickCreate
          categories={shopCategories}
          onClose={() => setCreating(false)}
          onCreated={async (p) => { setCreating(false); await load(); setOpenId(p.id) }}
        />
      )}

      {photoFor && (
        <QuickPhotoSheet
          product={photoFor}
          onClose={() => setPhotoFor(null)}
          onDone={load}
        />
      )}

      {published && (
        <LiveReceipt
          result={published}
          categories={categories}
          onClose={() => setPublished(null)}
        />
      )}

      {openProduct && (
        <Suspense fallback={null}>
          <ProductWorkbench
            product={openProduct}
            categories={shopCategories}
            installed={installed}
            onClose={() => setOpenId(null)}
            onSaved={load}
          />
        </Suspense>
      )}
    </div>
  )
}

/* ── Header ──────────────────────────────────────────────────────────── */

function StudioHeader({ stats, onImport, onCreate, onAi }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-plum-50/60 to-transparent p-5">
        <div>
          <h2 className="text-lg font-extrabold text-plum-950">Everything we sell</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Photos, clips, the story, the questions, the price and the rating — all of it, from here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* First, and visually loudest, because it is the one that turns an
              afternoon of typing into a minute of reviewing — and the person
              this console is for does not have the afternoon. */}
          <button
            onClick={onAi}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-plum-600 to-plum-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:from-plum-700 hover:to-plum-600"
          >
            <Sparkles size={15} /> Fill with AI
          </button>
          <button
            onClick={onImport}
            className="flex items-center gap-1.5 rounded-xl border border-plum-200 bg-white px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400"
          >
            <ClipboardPaste size={15} /> Paste many
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-plum-700"
          >
            <Plus size={15} /> Add product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4">
        <Stat label="Products" value={stats.total} />
        <Stat label="With a gallery" value={stats.withGallery} of={stats.total} />
        <Stat label="With a clip" value={stats.withVideo} of={stats.total} />
        <Stat label="With a rating" value={stats.withRating} of={stats.total} />
      </div>
    </div>
  )
}

function Stat({ label, value, of }) {
  const pct = of ? Math.round((value / Math.max(of, 1)) * 100) : null
  return (
    <div className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold text-plum-950">
        {value}
        {of != null && <span className="ml-1 text-sm font-bold text-gray-400">/ {of}</span>}
      </p>
      {pct != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-plum-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-plum-600 bg-plum-600 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300 hover:text-plum-700'
      }`}
    >
      <Icon size={15} />
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
      }`}>{count}</span>
    </button>
  )
}

function MigrationBanner() {
  return (
    <div className="card border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-bold text-amber-900">The studio tables are not in the database yet</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            Prices, names and photos still save normally. Galleries, clips, the story, the FAQs
            and launch ratings need one file run once: open the Supabase dashboard → SQL Editor,
            paste <code className="rounded bg-amber-100 px-1 font-mono text-xs">supabase/migrations/051_product_studio.sql</code>,
            and run it. Nothing breaks until you do — those sections simply stay empty.
          </p>
        </div>
      </div>
    </div>
  )
}


/* ── The "it's live" receipt ──────────────────────────────────────────── */

/**
 * What the admin sees after publishing.
 *
 * ── Why this is a panel and not a toast ──────────────────────────────────
 * The complaint that started this was "I clicked put on sale and it never went
 * to the front end". A toast saying "1 product updated" cannot answer that,
 * because it reports what the console TRIED to do. This reports what is now
 * true — the rows were re-read after the write (see `publishProducts`) — and
 * then hands over the one thing that settles it either way: a link straight to
 * the shelf the customer would land on.
 *
 * It also names the two states that hide a correctly-published product, since
 * both are invisible from the product row itself:
 *
 *   · the SHELF is retired, so there is no tile to reach the product through;
 *   · the product has no photograph, so it renders as an emoji plate and the
 *     admin scrolls straight past the thing they just published.
 */
function LiveReceipt({ result, categories, onClose }) {
  const { confirmed, shelves, withoutPhoto } = result
  const one = confirmed.length === 1 ? confirmed[0] : null

  // A shelf switched off in the Shelves tab still holds its products, and they
  // are still `is_active`. They are simply unreachable, which looks exactly
  // like the publish having failed.
  const hiddenShelves = shelves.filter(id => {
    const cat = categories.find(c => c.id === id)
    return cat && cat.is_active === false
  })

  return (
    <Modal title={one ? 'It is live' : `${confirmed.length} products are live`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0 text-sm">
            {one ? (
              <>
                <p className="font-bold text-emerald-900">
                  “{one.name}” is on sale in {one.category}.
                </p>
                <p className="mt-1 leading-relaxed text-emerald-800">
                  Customers can see it and add it to a basket right now, at {formatINR(one.price)}.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-emerald-900">
                  {confirmed.length} products are on sale across {shelves.length} shelf{shelves.length === 1 ? '' : 'ves'}.
                </p>
                <p className="mt-1 leading-relaxed text-emerald-800">{shelves.join(' · ')}</p>
              </>
            )}
            {/* Checked, not claimed. The row was read back out of the database
                after the write — this line is the difference between a
                confirmation and a hopeful message. */}
            <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">
              Confirmed by re-reading {confirmed.length === 1 ? 'the row' : 'the rows'} after saving.
            </p>
          </div>
        </div>

        {/* The link that actually settles it. New tab, because the admin is
            mid-queue in the studio and closing it to look would lose their
            filters and their scroll position. */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700">See it the way a customer does</p>
          {shelves.map(id => {
            const cat = categories.find(c => c.id === id)
            return (
              <a
                key={id}
                href={`/shop/${encodeURIComponent(id)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-plum-200 px-3 py-2.5 text-sm font-semibold text-plum-700 hover:border-plum-400 hover:bg-plum-50/50"
              >
                <span className="text-lg">{cat?.emoji ?? '🛍️'}</span>
                <span className="flex-1">Open the {cat?.label ?? id} shelf</span>
                <ExternalLink size={15} />
              </a>
            )
          })}
        </div>

        {hiddenShelves.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-amber-900">
                {hiddenShelves.join(', ')} {hiddenShelves.length === 1 ? 'is' : 'are'} switched off
              </p>
              <p className="mt-1 leading-relaxed text-amber-800">
                The product is on sale, but that shelf is hidden from the storefront, so there is
                no tile leading to it. Turn the shelf back on under{' '}
                <strong>Shelves &amp; categories</strong>, or move the product to a live shelf.
              </p>
            </div>
          </div>
        )}

        {withoutPhoto > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-sm">
            <Images size={17} className="mt-0.5 shrink-0 text-gray-500" />
            <div>
              <p className="font-bold text-gray-800">
                {withoutPhoto === 1 ? 'It has no photograph yet' : `${withoutPhoto} of them have no photograph yet`}
              </p>
              <p className="mt-1 leading-relaxed text-gray-600">
                {withoutPhoto === 1 ? 'It shows' : 'They show'} as an emoji tile until you add one — open
                the product and use <strong>Photos &amp; video</strong>. You can paste a screenshot
                straight in.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button onClick={onClose}
            className="rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Filters ─────────────────────────────────────────────────────────── */

const GAP_FILTERS = [
  { id: 'all',       label: 'Everything' },
  { id: 'nogallery', label: 'No gallery' },
  { id: 'novideo',   label: 'No clip' },
  { id: 'norating',  label: 'No rating' },
  { id: 'noprice',   label: 'No price' },
]

function Filters({ categories, category, onCategory, search, onSearch, gaps, onGaps, live, onLive, offCount, count }) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search products…"
            className="w-64 rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-plum-400 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={e => onCategory(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 focus:border-plum-400 focus:outline-none"
        >
          <option value="all">All shelves</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
        {/* On sale / off sale. This is the control an admin reaches for after
            "I put it live and it isn't on the site" — it answers, in one tap,
            whether the flag is actually set. */}
        <div className="flex overflow-hidden rounded-xl border border-gray-200">
          {[
            ['all', 'All'],
            ['on',  'On sale'],
            ['off', `Off sale${offCount ? ` (${offCount})` : ''}`],
          ].map(([id, label]) => (
            <button
              key={id} onClick={() => onLive(id)}
              className={`px-2.5 py-2 text-xs font-semibold transition-colors ${
                live === id ? 'bg-plum-600 text-white' : 'bg-white text-gray-600 hover:text-plum-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs font-semibold text-gray-400">{count} shown</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {GAP_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onGaps(f.id)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
              gaps === f.id
                ? 'border-plum-600 bg-plum-600 text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:border-plum-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── One product in the list ─────────────────────────────────────────── */

function ProductRow({ product: p, media: m, rating, categories = [], selected, onToggle, onOpen, onPublish, onMove, onPhoto }) {
  const images = m?.image ?? 0
  const videos = m?.video ?? 0
  const [publishing, setPublishing] = useState(false)
  const [moving, setMoving] = useState(false)
  const live = p.is_active !== false

  async function togglePublish(e) {
    e.stopPropagation()
    setPublishing(true)
    try { await onPublish(!live) } finally { setPublishing(false) }
  }

  return (
    <div className={`card overflow-hidden transition-shadow ${selected ? 'ring-2 ring-plum-500' : 'hover:shadow-md'}`}>
      <div className="flex gap-3 p-3">
        <button
          onClick={onToggle}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center self-start rounded border transition-colors ${
            selected ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-300 bg-white hover:border-plum-400'
          }`}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </button>

        {/* The thumbnail is the photo button. Clicking a picture to change it
            is what everyone tries first; it used to be inert, so the only way
            in was open product → Photos tab. */}
        <button
          onClick={onPhoto}
          title={p.image_url ? 'Add or replace photos — paste, drop or choose' : 'Add a photo — paste, drop or choose'}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100"
        >
          {p.image_url
            ? <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <span className="grid h-full w-full place-items-center text-2xl">{p.emoji ?? '🎁'}</span>}
          <span className="absolute inset-0 grid place-items-center bg-plum-950/55 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={16} className="text-white" />
          </span>
          {p.is_active === false && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/80 text-center text-[9px] font-extrabold uppercase text-gray-500">
              Off
            </span>
          )}
        </button>

        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold text-plum-950">{p.name}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {p.category}{p.occasion ? ` · ${p.occasion}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-extrabold text-plum-700">{formatINR(p.price)}</span>
            {p.mrp > p.price && (
              <span className="text-xs text-gray-400 line-through">{formatINR(p.mrp)}</span>
            )}
          </div>
        </button>

        {/* One tap to publish, from the list. It used to take selecting the
            row and finding the bulk bar, or opening the workbench and hunting
            for a toggle inside a tab — three steps for the single most common
            action in this console. */}
        <div className="flex flex-col items-center gap-1 self-center">
          <button
            onClick={togglePublish}
            disabled={publishing}
            title={live ? 'Take it off sale' : 'Put it on sale — customers will see it'}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
              live
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400'
                : 'border-gray-200 bg-white text-gray-500 hover:border-plum-400 hover:text-plum-700'
            }`}
          >
            {publishing
              ? <Loader2 size={11} className="animate-spin" />
              : live ? <Eye size={11} /> : <EyeOff size={11} />}
            {live ? 'Live' : 'Off'}
          </button>
          <button onClick={onOpen} className="rounded-lg p-0.5 text-gray-300 hover:text-plum-700" aria-label="Open">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* What is filled in and what is not, at a glance. The whole point of
          the list view: an admin should be able to see the holes without
          opening anything. */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50/60 px-3 py-2">
        <Chip icon={Images} count={images} label="photos" />
        <Chip icon={Film} count={videos} label="clips" />

        {/* Move shelf, without opening the product. The dropdown holds the
            destination; the shelf it is leaving is the label beside it, so the
            control reads as "Cakes → …" rather than as an unlabelled picker
            that silently reassigns whatever is selected. */}
        <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
          <span className="max-w-[6rem] truncate" title={`Currently on ${p.category}`}>{p.category}</span>
          <ArrowRight size={11} />
          <select
            value=""
            disabled={moving}
            onChange={async e => {
              const to = e.target.value
              if (!to || to === p.category) return
              setMoving(true)
              try { await onMove(to) } finally { setMoving(false) }
            }}
            className="max-w-[5.5rem] rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] font-semibold text-gray-600 disabled:opacity-50"
            aria-label={`Move ${p.name} to another shelf`}
          >
            <option value="">Move…</option>
            {categories.filter(c => c.id !== p.category).map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={onOpen}
          className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
            rating?.rating
              ? 'text-amber-600'
              : 'text-gray-400 hover:text-plum-700'
          }`}
        >
          <Star size={12} className={rating?.rating ? 'fill-amber-400 text-amber-400' : ''} />
          {rating?.rating
            ? <>{Number(rating.rating).toFixed(1)}
                <span className="font-semibold text-gray-400">
                  {rating.rating_source === 'editorial' ? ' editorial' : ` (${rating.review_count})`}
                </span>
              </>
            : 'No rating'}
        </button>
      </div>
    </div>
  )
}

function Chip({ icon: Icon, count, label }) {
  return (
    <span className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold ${
      count > 0 ? 'bg-plum-100 text-plum-700' : 'bg-gray-100 text-gray-400'
    }`}>
      <Icon size={12} /> {count} <span className="font-semibold opacity-70">{label}</span>
    </span>
  )
}

/* ── Bulk bar ────────────────────────────────────────────────────────── */

/**
 * What to do to many products at once.
 *
 * The price control offers percent and delta as well as a flat set, because
 * the request is never "make all forty cakes ₹599" — it is "put the cakes up
 * ten percent". Without those two modes, "bulk edit" is a feature that reads
 * well in a list and gets used once.
 */
function BulkBar({ ids, selectedProducts = [], categories, onPublish, onDone, onCancel }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null)     // 'price' | 'category' | 'badge'
  const [priceMode, setPriceMode] = useState('percent')
  const [value, setValue] = useState('')

  /** Which shelves the selection currently sits on, and how many from each. */
  const fromShelves = useMemo(() => {
    const counts = {}
    for (const p of selectedProducts) counts[p.category] = (counts[p.category] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [selectedProducts])

  async function publish(active) {
    setBusy(true)
    try { await onPublish(active) }
    catch (err) { toast.error(friendlyError(err, 'Could not change that.')) }
    finally { setBusy(false) }
  }

  async function run(action, successMessage) {
    setBusy(true)
    try {
      const res = await action()
      if (res?.degraded) {
        toast.error(`"${res.field}" needs migration 051 — nothing was changed.`)
      } else {
        await onDone(successMessage ?? `${res?.updated ?? ids.length} product${(res?.updated ?? ids.length) === 1 ? '' : 's'} updated.`)
        setMode(null); setValue('')
      }
    } catch (err) {
      toast.error(friendlyError(err, 'Could not apply that change.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card sticky top-2 z-20 border-plum-300 bg-plum-50/80 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-2.5 py-1 text-xs font-extrabold text-white">
          <Layers size={13} /> {ids.length} selected
        </span>

        <button onClick={() => setMode(mode === 'price' ? null : 'price')}
          className="flex items-center gap-1.5 rounded-lg border border-plum-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-plum-700 hover:border-plum-400">
          <IndianRupee size={13} /> Change price
        </button>
        <button onClick={() => setMode(mode === 'category' ? null : 'category')}
          className="flex items-center gap-1.5 rounded-lg border border-plum-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-plum-700 hover:border-plum-400">
          <ArrowRight size={13} /> Move shelf
        </button>
        <button onClick={() => setMode(mode === 'badge' ? null : 'badge')}
          className="flex items-center gap-1.5 rounded-lg border border-plum-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-plum-700 hover:border-plum-400">
          <Tag size={13} /> Set badge
        </button>
        {/* Through `onPublish`, not `bulkUpdate`, so these two get the same
            verified confirmation as the row toggle — see `publish` above. */}
        <button disabled={busy} onClick={() => publish(false)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50">
          <EyeOff size={13} /> Take off sale
        </button>
        <button disabled={busy} onClick={() => publish(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:border-emerald-400 disabled:opacity-50">
          <Eye size={13} /> Put on sale
        </button>

        <button onClick={onCancel} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:text-gray-700" aria-label="Clear selection">
          <X size={16} />
        </button>
      </div>

      {mode === 'price' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-plum-200 pt-3">
          <select value={priceMode} onChange={e => setPriceMode(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold">
            <option value="percent">Change by %</option>
            <option value="delta">Add / subtract ₹</option>
            <option value="set">Set all to ₹</option>
          </select>
          <input
            value={value} onChange={e => setValue(e.target.value)} type="number"
            placeholder={priceMode === 'percent' ? 'e.g. 10 or -5' : 'e.g. 100'}
            className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
          />
          <button
            disabled={busy || value === ''}
            onClick={() => run(() => bulkUpdate(ids, { field: 'price', value: Number(value), mode: priceMode }))}
            className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Apply to {ids.length}
          </button>
          <span className="text-[11px] text-gray-500">
            {priceMode === 'percent' ? 'Rounded to the nearest rupee.' : priceMode === 'set' ? 'Every selected product gets this exact price.' : 'Added to each current price.'}
          </span>
        </div>
      )}

      {mode === 'category' && (
        <div className="mt-3 space-y-2 border-t border-plum-200 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* The FROM side, spelled out. A bulk move whose source is invisible
                is how forty products leave a shelf nobody meant to empty —
                especially when the selection spans more than one. */}
            <span className="text-xs font-semibold text-gray-600">From</span>
            <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
              {fromShelves.length === 0
                ? '—'
                : fromShelves.length <= 3
                  ? fromShelves.map(([id, n]) => `${id} (${n})`).join(', ')
                  : `${fromShelves.length} shelves`}
            </span>
            <ArrowRight size={14} className="text-plum-500" />
            <span className="text-xs font-semibold text-gray-600">To</span>
            <select value={value} onChange={e => setValue(e.target.value)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold">
              <option value="">Choose a shelf…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
            <button
              disabled={busy || !value}
              onClick={() => run(
                () => bulkUpdate(ids, { field: 'category', value }),
                `Moved ${ids.length} product${ids.length === 1 ? '' : 's'} to ${categories.find(c => c.id === value)?.label ?? value}.`
              )}
              className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Move {ids.length}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            They leave those shelves and appear on the new one immediately. Past orders keep the
            shelf they were bought under.
          </p>
        </div>
      )}

      {mode === 'badge' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-plum-200 pt-3">
          <input
            value={value} onChange={e => setValue(e.target.value)}
            placeholder='e.g. "Bestseller", "New", "Festive"'
            className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
          />
          <button
            disabled={busy}
            onClick={() => run(() => bulkUpdate(ids, { field: 'badge', value: value.trim() || null }))}
            className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Apply
          </button>
          <span className="text-[11px] text-gray-500">Leave blank to remove the badge.</span>
        </div>
      )}
    </div>
  )
}

/* ── Paste many ──────────────────────────────────────────────────────── */

/**
 * The importer.
 *
 * It parses on every keystroke and shows the result as a table, because the
 * failure mode of a paste box that only validates on submit is 300 rows in and
 * one unexplained error. Bad lines are marked and kept out; good lines import.
 */
function BulkImport({ categories, onClose, onDone }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  const parsed = useMemo(
    () => parseBulk(text, { defaultCategory: defaultCategory || null }),
    [text, defaultCategory]
  )
  const good = parsed.rows.filter(r => !r.errors.length)
  const bad  = parsed.rows.filter(r => r.errors.length)

  async function submit() {
    setBusy(true)
    try {
      const { inserted, failures, skipped } = await importProducts(parsed.rows)
      if (failures.length) {
        toast.error(`${inserted.length} added, but rows ${failures[0].from}–${failures[0].to} failed: ${failures[0].message}`)
      }
      if (skipped) toast.info(`${skipped} line${skipped === 1 ? '' : 's'} skipped — see the marked rows.`)
      await onDone(inserted.length)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not import those products.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add many products at once" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="rounded-xl border border-plum-100 bg-plum-50/50 p-3 text-xs leading-relaxed text-plum-900">
          <p className="font-bold">Paste one product per line.</p>
          <p className="mt-1">
            Copy straight out of Excel or Google Sheets, or type it with <code className="font-mono">|</code> between
            the fields. A header row is optional — if there isn't one, the order is
            assumed to be <strong>Name, Price, Shelf, Description</strong>.
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-plum-700">
            Rose &amp; Chocolate Hamper | 1499 | Gifts | Twelve roses, Belgian truffles, hand-tied
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Shelf for rows that don't name one:</label>
          <select value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold">
            <option value="">— none, require it —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder="Paste here…"
          className="w-full rounded-xl border border-gray-200 p-3 font-mono text-xs leading-relaxed focus:border-plum-400 focus:outline-none"
        />

        {parsed.rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700">{good.length} ready</span>
              {bad.length > 0 && <span className="rounded-lg bg-red-100 px-2 py-1 text-red-700">{bad.length} need fixing</span>}
              {parsed.hadHeader && <span className="text-gray-400">Header row detected and skipped</span>}
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">Name</th>
                    <th className="px-3 py-2 font-bold">Price</th>
                    <th className="px-3 py-2 font-bold">Shelf</th>
                    <th className="px-3 py-2 font-bold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsed.rows.slice(0, 80).map(r => (
                    <tr key={r._line} className={r.errors.length ? 'bg-red-50/60' : ''}>
                      <td className="px-3 py-1.5 font-semibold text-gray-800">
                        {r.name ?? <em className="text-red-600">missing</em>}
                        {r.errors.length > 0 && (
                          <span className="ml-2 font-normal text-[11px] text-red-600">{r.errors.join(' · ')}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-gray-600">{typeof r.price === 'number' ? formatINR(r.price) : '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600">{r.category ?? '—'}</td>
                      <td className="max-w-xs truncate px-3 py-1.5 text-gray-500">{r.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 80 && (
                <p className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
                  Showing the first 80 of {parsed.rows.length}. All of them import.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || good.length === 0}
            className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add {good.length} product{good.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Quick create ────────────────────────────────────────────────────── */

/**
 * The minimum a product needs to exist, and nothing more — it opens straight
 * into the workbench afterwards, where the rest belongs. A single form asking
 * for twenty fields before anything is saved is how half-entered products get
 * abandoned.
 */
function QuickCreate({ categories, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: '', price: '', category: categories[0]?.id ?? 'Cakes', emoji: '🎁', description: '',
  })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const { product } = await saveProduct({
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        emoji: form.emoji || '🎁',
        description: form.description.trim() || null,
      })
      toast.success('Product added — now give it photos and a story.')
      await onCreated(product)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add that product.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add a product" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input autoFocus required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Mysore Silk Saree — Peacock Border"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)">
            <input required type="number" min="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
          </Field>
          <Field label="Emoji" hint="Shown when there is no photo yet">
            <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} maxLength={4}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center text-lg focus:border-plum-400 focus:outline-none" />
          </Field>
        </div>

        <Field label="Shelf">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-plum-400 focus:outline-none">
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </Field>

        <Field label="Description" hint="Optional — you can write it properly in the next step">
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
        </Field>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Add and open
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Shared bits ─────────────────────────────────────────────────────── */

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // The console's own body scroll would otherwise run underneath the sheet.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
         onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <h3 className="text-base font-extrabold text-plum-950">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-gray-50" />
      ))}
    </div>
  )
}

function EmptyState({ hasProducts, onImport, onCreate, onAi }) {
  return (
    <div className="card p-14 text-center">
      <div className="text-4xl">{hasProducts ? '🔍' : '🏬'}</div>
      <p className="mt-3 font-bold text-gray-800">
        {hasProducts ? 'Nothing matches those filters' : 'The shop is empty'}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
        {hasProducts
          ? 'Try a different shelf, or clear the search.'
          : 'Hand it a supplier PDF or a photo of a price list and it fills itself in. Or paste a spreadsheet, or add one by hand.'}
      </p>
      {!hasProducts && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={onAi} className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-plum-700">
            <Sparkles size={15} /> Fill with AI
          </button>
          <button onClick={onImport} className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400">
            <ClipboardPaste size={15} /> Paste many
          </button>
          <button onClick={onCreate} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300">
            <Plus size={15} /> Add one
          </button>
        </div>
      )}
    </div>
  )
}
