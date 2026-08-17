import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import {
  Loader2, Search, Plus, X, Check, AlertTriangle, ClipboardPaste, Layers,
  IndianRupee, Tag, EyeOff, Eye, Images, Film, Star, HelpCircle, Sparkles,
  ChevronRight, PackageOpen, Store, ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { fetchCategories, FALLBACK_CATEGORIES } from '../../lib/shopCategories'
import {
  parseBulk, importProducts, bulkUpdate, saveProduct,
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
  const [gaps, setGaps] = useState('all')      // 'all' | 'nogallery' | 'nostory' | 'nofaq' | 'norating'
  const [page, setPage] = useState(0)

  const [selected, setSelected] = useState(() => new Set())
  const [openId, setOpenId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

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
      if (q && !(`${p.name} ${p.occasion ?? ''} ${p.description ?? ''}`.toLowerCase().includes(q))) return false

      const m = media[p.id]
      if (gaps === 'nogallery' && (m?.image ?? 0) + (m?.video ?? 0) > 0) return false
      if (gaps === 'novideo'   && (m?.video ?? 0) > 0) return false
      if (gaps === 'norating'  && ratings[p.id]?.rating) return false
      if (gaps === 'noprice'   && Number(p.price) > 0) return false
      return true
    })
  }, [products, category, search, gaps, media, ratings])

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
            count={filtered.length}
          />

          {selected.size > 0 && (
            <BulkBar
              ids={[...selected]}
              categories={shopCategories}
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
                    onToggle={() => toggle(p.id)}
                    onOpen={() => setOpenId(p.id)}
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

/* ── Filters ─────────────────────────────────────────────────────────── */

const GAP_FILTERS = [
  { id: 'all',       label: 'Everything' },
  { id: 'nogallery', label: 'No gallery' },
  { id: 'novideo',   label: 'No clip' },
  { id: 'norating',  label: 'No rating' },
  { id: 'noprice',   label: 'No price' },
]

function Filters({ categories, category, onCategory, search, onSearch, gaps, onGaps, count }) {
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

function ProductRow({ product: p, media: m, rating, selected, onToggle, onOpen }) {
  const images = m?.image ?? 0
  const videos = m?.video ?? 0

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

        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {p.image_url
            ? <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <span className="grid h-full w-full place-items-center text-2xl">{p.emoji ?? '🎁'}</span>}
          {p.is_active === false && (
            <span className="absolute inset-0 grid place-items-center bg-white/70 text-[9px] font-extrabold uppercase text-gray-500">
              Off
            </span>
          )}
        </div>

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

        <button onClick={onOpen} className="self-center rounded-lg p-1 text-gray-300 hover:text-plum-700" aria-label="Open">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* What is filled in and what is not, at a glance. The whole point of
          the list view: an admin should be able to see the holes without
          opening anything. */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50/60 px-3 py-2">
        <Chip icon={Images} count={images} label="photos" />
        <Chip icon={Film} count={videos} label="clips" />
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
function BulkBar({ ids, categories, onDone, onCancel }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null)     // 'price' | 'category' | 'badge'
  const [priceMode, setPriceMode] = useState('percent')
  const [value, setValue] = useState('')

  async function run(action) {
    setBusy(true)
    try {
      const res = await action()
      if (res?.degraded) {
        toast.error(`"${res.field}" needs migration 051 — nothing was changed.`)
      } else {
        await onDone(`${res?.updated ?? ids.length} product${(res?.updated ?? ids.length) === 1 ? '' : 's'} updated.`)
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
        <button disabled={busy} onClick={() => run(() => bulkUpdate(ids, { field: 'is_active', value: false }))}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50">
          <EyeOff size={13} /> Take off sale
        </button>
        <button disabled={busy} onClick={() => run(() => bulkUpdate(ids, { field: 'is_active', value: true }))}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50">
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
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-plum-200 pt-3">
          <select value={value} onChange={e => setValue(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold">
            <option value="">Choose a shelf…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <button
            disabled={busy || !value}
            onClick={() => run(() => bulkUpdate(ids, { field: 'category', value }))}
            className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Move {ids.length}
          </button>
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
