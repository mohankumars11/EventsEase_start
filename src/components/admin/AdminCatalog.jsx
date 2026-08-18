import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Loader2, AlertCircle, Camera, Upload, RotateCcw, Search, Check, X, Pencil,
  Plus, EyeOff, Eye,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SHOP_CATEGORIES } from '../../config/shop'
import { formatINR } from '../../utils/format'
import { INK, STATUS, shopCategoryColor } from '../../config/dataviz'
import { uploadProductImage, revertToStock, fetchImageCoverage } from '../../lib/productImages'
import { QuickPhotoSheet } from './PhotoIntake'
import ImageSourceBadge from '../shop/ImageSourceBadge'

/**
 * The shop catalogue, and the screen that makes "you get what you saw" true.
 *
 * Every product photo in the shop today is a licensed lookalike: migrations
 * 017 and 021 assigned them per (category, occasion), so a whole shelf of
 * birthday cakes shared one stock image, and migration 024 replaced that with
 * one distinct stock photo each. Distinct is better than identical, but it is
 * still not the cake that will arrive.
 *
 * This is where that gets fixed, one product at a time. The upload input takes
 * `capture="environment"`, so the intended workflow is an admin standing in the
 * bakery with a phone: tap the row, shoot the cake, done — the row flips to
 * 'actual' and the customer-facing badge changes from "Representative image"
 * to "Actual product photo" on the next page load.
 *
 * Until migration 025 there was no write policy on `products` at all, so this
 * component is also the first time the catalogue has been editable outside the
 * Supabase SQL editor. Hence the inline name/price/description editor: if an
 * admin is already here fixing a photo, making them open a database console to
 * fix the typo underneath it is how the typo survives.
 *
 * ── Adding and retiring (migration 037) ──────────────────────────────────
 * Editing an existing product was only half of "manage the catalogue". The
 * other half is putting something new on the shelf and taking something off
 * it, and both used to mean hand-written SQL.
 *
 * Taking something off is `is_active = false`, never DELETE.
 * `order_items.product_id` references `products(id)` with no ON DELETE clause,
 * so deleting a product that has ever sold is either refused by the foreign
 * key or detaches the line from the catalogue. Migration 022 snapshots
 * category and occasion onto the order line precisely so past revenue survives
 * catalogue changes; a flag keeps that intact and still takes the product off
 * the shelf.
 *
 * The `is_active` controls only appear when the column exists. Migrations here
 * are applied by hand and a deploy does not run them, so this screen has to
 * work against a database that is one migration behind — it detects the column
 * from the rows it already fetched rather than probing for it.
 */

const PAGE_SIZE = 60

/** Blank product. `category` is a CHECK constraint, so it starts on a real one. */
const BLANK = {
  name: '', category: SHOP_CATEGORIES[0]?.id ?? 'Cakes', occasion: '',
  price: '', description: '', emoji: '🎁',
}

export default function AdminCatalog() {
  const toast = useToast()

  const [products, setProducts] = useState([])
  const [coverage, setCoverage] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const [category, setCategory] = useState('all')
  // 'stock' is the default view because the only question this screen exists
  // to answer is "what still needs a real photo".
  const [filter,   setFilter]   = useState('stock')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(0)

  const [busyId,   setBusyId]   = useState(null)
  const [editing,  setEditing]  = useState(null)
  const [adding,   setAdding]   = useState(false)

  /**
   * Whether this database has migration 037. Read off the rows themselves:
   * `select('*')` returns whatever columns exist, so the presence of the key
   * is the answer. No extra round trip, and no crash if it is absent.
   */
  const hasLifecycle = useMemo(() => products.some(p => 'is_active' in p), [products])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // `select('*')` rather than a column list: naming `is_active` explicitly
      // would 400 the whole query on a database that has not run 037 yet, and
      // this screen has to keep working there.
      let query = supabase.from('products').select('*').order('category').order('name')

      if (category !== 'all')   query = query.eq('category', category)
      if (filter === 'stock')   query = query.or('image_source.is.null,image_source.eq.stock')
      if (filter === 'actual')  query = query.eq('image_source', 'actual')
      if (filter === 'missing') query = query.is('image_url', null)
      if (search.trim())        query = query.ilike('name', `%${search.trim()}%`)

      const { data, error: err } = await query
      if (err) throw err
      setProducts(data ?? [])
      setPage(0)
    } catch (err) {
      setError(friendlyError(err, 'Could not load the catalogue.'))
    } finally {
      setLoading(false)
    }
  }, [category, filter, search])

  useEffect(() => { load() }, [load])

  // Coverage is deliberately independent of the filters above: "48 of 341"
  // has to describe the whole shop, not the 12 rows currently on screen.
  const refreshCoverage = useCallback(async () => {
    try {
      setCoverage(await fetchImageCoverage())
    } catch {
      // A missing view (migration 025 not yet applied) shouldn't take the
      // whole screen down — the product list is still usable without it.
      setCoverage([])
    }
  }, [])

  useEffect(() => { refreshCoverage() }, [refreshCoverage])

  const totals = coverage.reduce(
    (acc, c) => ({ total: acc.total + Number(c.total), actual: acc.actual + Number(c.actual_photos) }),
    { total: 0, actual: 0 }
  )
  const pct = totals.total ? Math.round((totals.actual / totals.total) * 100) : 0

  async function handleUpload(product, file) {
    if (!file) return
    setBusyId(product.id)
    try {
      const updated = await uploadProductImage(product.id, file, { alt: product.image_alt })
      setProducts(list => list.map(p => (p.id === product.id ? { ...p, ...updated } : p)))
      toast.success(`Real photo saved for ${product.name}.`)
      refreshCoverage()
    } catch (err) {
      toast.error(friendlyError(err, 'Upload failed.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevert(product) {
    setBusyId(product.id)
    try {
      const updated = await revertToStock(product.id, null)
      setProducts(list => list.map(p => (p.id === product.id ? { ...p, ...updated } : p)))
      toast.info(`${product.name} is back to a representative image.`)
      refreshCoverage()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not revert.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveDetails(product, patch) {
    setBusyId(product.id)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .update(patch)
        .eq('id', product.id)
        .select()
        .single()
      if (err) throw err
      setProducts(list => list.map(p => (p.id === product.id ? { ...p, ...data } : p)))
      setEditing(null)
      toast.success('Saved.')
      // The category may have moved, which changes the per-shelf counts.
      refreshCoverage()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save.'))
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Retire, don't delete. See the note at the top of this file: an order line
   * points at this row, and past revenue has to keep resolving.
   */
  async function handleToggleActive(product) {
    setBusyId(product.id)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .update({ is_active: product.is_active === false })
        .eq('id', product.id)
        .select()
        .single()
      if (err) throw err
      setProducts(list => list.map(p => (p.id === product.id ? { ...p, ...data } : p)))
      toast.success(data.is_active ? `${product.name} is back on sale.` : `${product.name} is off the shelf.`)
      refreshCoverage()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change this product.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate(patch) {
    setBusyId('new')
    try {
      const { data, error: err } = await supabase
        .from('products')
        .insert({
          ...patch,
          price: Number(patch.price) || 0,
          occasion: patch.occasion?.trim() || null,
          description: patch.description?.trim() || null,
        })
        .select()
        .single()
      if (err) throw err
      setProducts(list => [data, ...list])
      setAdding(false)
      toast.success(`${data.name} added. Photograph it next — an emoji tile does not sell.`)
      refreshCoverage()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add this product.'))
    } finally {
      setBusyId(null)
    }
  }

  // 'retired' is applied client-side rather than in the query, so the filter
  // works identically before and after migration 037.
  const listed = filter === 'retired'
    ? products.filter(p => p.is_active === false)
    : products.filter(p => p.is_active !== false || filter === 'all')

  const visible = listed.slice(0, (page + 1) * PAGE_SIZE)
  const retiredCount = products.filter(p => p.is_active === false).length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-[12px] max-w-prose" style={{ color: INK.muted }}>
          Shoot straight from a phone — the photo is compressed in the browser before it uploads.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700 shrink-0"
        >
          <Plus size={14} /> Add a product
        </button>
      </div>

      <CoverageMeter totals={totals} pct={pct} coverage={coverage} />

      {adding && (
        <NewProductForm
          busy={busyId === 'new'}
          onCancel={() => setAdding(false)}
          onSave={handleCreate}
        />
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>All categories</FilterChip>
        {SHOP_CATEGORIES.map(c => (
          <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}
                      dot={shopCategoryColor(c.id)}>
            {c.emoji} {c.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === 'stock'}  onClick={() => setFilter('stock')}>Needs a real photo</FilterChip>
        <FilterChip active={filter === 'actual'} onClick={() => setFilter('actual')}>Has a real photo</FilterChip>
        <FilterChip active={filter === 'missing'} onClick={() => setFilter('missing')}>No photo at all</FilterChip>
        {hasLifecycle && (
          <FilterChip active={filter === 'retired'} onClick={() => setFilter('retired')}>
            Retired {retiredCount > 0 && <span className="opacity-60">{retiredCount}</span>}
          </FilterChip>
        )}
        <FilterChip active={filter === 'all'}    onClick={() => setFilter('all')}>Everything</FilterChip>

        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-56 focus:outline-none focus:border-plum-400"
          />
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
          <Loader2 className="animate-spin text-plum-600" size={28} />
          <span className="text-sm">Loading catalogue…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-semibold hover:underline">Retry</button>
        </div>
      ) : !listed.length ? (
        <p className="text-sm text-gray-500 py-10 text-center">
          Nothing matches this filter.
          {filter === 'stock'   && ' Every product in this view already has a real photo. 🎉'}
          {filter === 'retired' && ' Nothing has been taken off the shelf.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visible.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                busy={busyId === p.id}
                editing={editing === p.id}
                canRetire={hasLifecycle}
                onEdit={() => setEditing(editing === p.id ? null : p.id)}
                onUpload={file => handleUpload(p, file)}
                onPhoto={() => setPhotoFor(p)}
                onRevert={() => handleRevert(p)}
                onSave={patch => handleSaveDetails(p, patch)}
                onToggleActive={() => handleToggleActive(p)}
              />
            ))}
          </div>

          {visible.length < listed.length && (
            <button
              onClick={() => setPage(n => n + 1)}
              className="w-full py-3 text-sm font-semibold text-plum-700 bg-white border border-gray-200 rounded-2xl hover:border-plum-300"
            >
              Show {Math.min(PAGE_SIZE, listed.length - visible.length)} more
              <span className="text-gray-500 font-normal"> ({visible.length} of {listed.length})</span>
            </button>
          )}
        </>
      )}

      {!hasLifecycle && !loading && products.length > 0 && (
        <p className="text-[11px] flex items-start gap-1.5 max-w-prose" style={{ color: INK.muted }}>
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>
            Taking a product off the shelf needs migration&nbsp;037
            (<code>037_service_catalog_and_product_lifecycle.sql</code>), which has not been
            applied to this database. Everything else on this screen works without it.
          </span>
        </p>
      )}

      {photoFor && (
        <QuickPhotoSheet
          product={photoFor}
          onClose={() => setPhotoFor(null)}
          onDone={load}
        />
      )}
    </div>
  )
}

/* ── Coverage ──────────────────────────────────────────────────────────
 * The single number that tracks whether the promise is real yet. Left
 * deliberately blunt: 12 of 341 should look like 12 of 341.
 */
function CoverageMeter({ totals, pct, coverage }) {
  if (!totals.total) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-extrabold text-gray-900">
            {totals.actual}
            <span className="text-gray-300 font-bold"> / {totals.total}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">products photographed for real</p>
        </div>
        <span className={`text-sm font-bold ${pct >= 100 ? 'text-green-600' : 'text-gray-500'}`}>{pct}%</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: pct >= 100 ? STATUS.good : '#2a78d6' }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {coverage.map(c => (
          <span key={c.category} className="text-[11px] text-gray-500">
            {c.category}{' '}
            <span className={Number(c.actual_photos) ? 'text-gray-700 font-semibold' : ''}>
              {c.actual_photos}/{c.total}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children, dot }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-plum-700 border-plum-700 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
      }`}
    >
      {dot && <span className="w-2 h-2 rounded-sm" style={{ background: active ? '#fff' : dot }} aria-hidden="true" />}
      {children}
    </button>
  )
}

/* ── Add a product ─────────────────────────────────────────────────────── */

/**
 * The first way to put something on the shelf without opening a SQL console.
 *
 * `category` is a dropdown and not free text because `products_category_check`
 * is a real CHECK constraint (migration 031) — a typed value that is not one of
 * the five would be rejected by Postgres with a message no shopkeeper should
 * have to read.
 */
function NewProductForm({ busy, onCancel, onSave }) {
  const [draft, setDraft] = useState(BLANK)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const valid = draft.name.trim().length > 1 && Number(draft.price) > 0

  return (
    <div className="card p-5 border-plum-200">
      <h3 className="font-bold text-gray-900">Add a product</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        It goes on the shelf as soon as you save. Photograph it straight after — an emoji tile
        is a listing customers scroll past.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <label className="sm:col-span-1">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Emoji</span>
          <input value={draft.emoji} onChange={e => set('emoji', e.target.value.slice(0, 4))}
                 className="input py-2 text-center text-lg" />
        </label>
        <label className="sm:col-span-3">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Name</span>
          <input value={draft.name} onChange={e => set('name', e.target.value)}
                 placeholder="Rasmalai Cake (1kg)" className="input py-2 text-sm" />
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Price (₹)</span>
          <input type="number" min="1" value={draft.price} onChange={e => set('price', e.target.value)}
                 placeholder="1099" className="input py-2 text-sm" />
        </label>

        <label className="sm:col-span-3">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Shelf</span>
          <select value={draft.category} onChange={e => set('category', e.target.value)} className="input py-2 text-sm">
            {SHOP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </label>
        <label className="sm:col-span-3">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">
            Occasion <span className="font-normal text-gray-500">— optional, drives the festival pages</span>
          </span>
          <input value={draft.occasion} onChange={e => set('occasion', e.target.value)}
                 placeholder="Diwali" className="input py-2 text-sm" />
        </label>

        <label className="sm:col-span-6">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Description</span>
          <input value={draft.description} onChange={e => set('description', e.target.value)}
                 placeholder="Saffron-soaked rasmalai sponge, serves 8–10" className="input py-2 text-sm" />
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(draft)} disabled={busy || !valid}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Add to the shelf
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

/* ── One product ─────────────────────────────────────────────────────── */
function ProductRow({ product, busy, editing, canRetire, onEdit, onUpload, onPhoto, onRevert, onSave, onToggleActive }) {
  const fileRef = useRef(null)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (editing) {
      setDraft({
        name:        product.name ?? '',
        price:       product.price ?? '',
        category:    product.category ?? SHOP_CATEGORIES[0]?.id,
        occasion:    product.occasion ?? '',
        description: product.description ?? '',
        emoji:       product.emoji ?? '',
        image_alt:   product.image_alt ?? '',
      })
    }
  }, [editing, product])

  const isActual  = product.image_source === 'actual'
  const isRetired = product.is_active === false

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden flex ${
      isRetired ? 'border-gray-200 opacity-70' : isActual ? 'border-green-200' : 'border-gray-100'
    }`}>
      {/* Thumbnail doubles as the upload target. */}
      <button
        onClick={onPhoto}
        disabled={busy}
        title="Add photos — paste a screenshot, drag files in, choose them, or use the camera"
        className="relative w-28 shrink-0 bg-gray-50 group"
      >
        {product.image_url ? (
          <img src={product.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl">{product.emoji}</span>
        )}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {busy
            ? <Loader2 size={18} className="animate-spin text-white" />
            : <Camera size={18} className="text-white" />}
        </span>
      </button>

      {/* The camera shortcut, kept for the "standing in the shop with the
          thing in front of you" workflow. It is no longer the ONLY way in —
          `capture="environment"` removes the gallery option on Android, so as
          the sole picker it blocked every photo an admin already had. The
          thumbnail above opens the full intake. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''   // re-selecting the same file must re-fire
          onUpload(file)
        }}
      />

      <div className="flex-1 min-w-0 p-3.5">
        {editing && draft ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={draft.emoji}
                onChange={e => setDraft(d => ({ ...d, emoji: e.target.value.slice(0, 4) }))}
                className="w-14 px-2 py-1.5 text-center text-base border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="🎁"
              />
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="Product name"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={draft.price}
                onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
                className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="Price"
              />
              {/* Moving a product between shelves used to require SQL. It is
                  a dropdown because products_category_check will reject
                  anything that is not one of the five. */}
              <select
                value={draft.category}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              >
                {SHOP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <input
                value={draft.occasion}
                onChange={e => setDraft(d => ({ ...d, occasion: e.target.value }))}
                className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="Occasion"
              />
            </div>
            <input
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              placeholder="Description"
            />
            <input
              value={draft.image_alt}
              onChange={e => setDraft(d => ({ ...d, image_alt: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              placeholder="Alt text — what a screen reader should say about the photo"
            />
            <div className="flex gap-2 pt-0.5">
              <button
                onClick={() => onSave({
                  ...draft,
                  price: Number(draft.price) || 0,
                  occasion: draft.occasion.trim() || null,
                  description: draft.description.trim() || null,
                })}
                disabled={busy || !draft.name.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-plum-700 text-white hover:bg-plum-800 disabled:opacity-40"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-300"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
              <span className="text-sm font-bold text-plum-700 shrink-0">{formatINR(product.price)}</span>
            </div>

            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {product.category}{product.occasion ? ` · ${product.occasion}` : ''}
              {isRetired ? ' · off the shelf' : ''}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <ImageSourceBadge source={product.image_source} size="sm" />

              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-plum-700 hover:text-plum-800 disabled:opacity-40"
              >
                <Upload size={11} /> {isActual ? 'Replace' : 'Upload real photo'}
              </button>

              {isActual && (
                <button
                  onClick={onRevert}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-600 disabled:opacity-40"
                >
                  <RotateCcw size={11} /> Revert
                </button>
              )}

              {canRetire && (
                <button
                  onClick={onToggleActive}
                  disabled={busy}
                  title={isRetired ? 'Put it back on the shelf' : 'Take it off the shelf — its order history is kept'}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-600 disabled:opacity-40"
                >
                  {isRetired ? <><Eye size={11} /> Restore</> : <><EyeOff size={11} /> Retire</>}
                </button>
              )}

              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-600 ml-auto"
              >
                <Pencil size={11} /> Edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
