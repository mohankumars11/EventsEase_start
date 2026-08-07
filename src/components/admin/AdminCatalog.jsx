import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, AlertCircle, Camera, Upload, RotateCcw, Search, Check, X, Pencil,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'
import { SHOP_CATEGORIES } from '../../config/shop'
import { formatINR } from '../../utils/format'
import { uploadProductImage, revertToStock, fetchImageCoverage } from '../../lib/productImages'
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
 */

const PAGE_SIZE = 60

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('products')
        .select('id,name,category,occasion,description,price,emoji,image_url,image_alt,image_source,image_updated_at')
        .order('category')
        .order('name')

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
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save.'))
    } finally {
      setBusyId(null)
    }
  }

  const visible = products.slice(0, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🖼️ Catalog</h2>
        <p className="text-sm text-gray-500 mt-1">
          Replace representative stock photos with pictures of the item you will
          actually deliver. Shoot straight from a phone — the photo is compressed
          in the browser before it uploads.
        </p>
      </div>

      <CoverageMeter totals={totals} pct={pct} coverage={coverage} />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>All categories</FilterChip>
        {SHOP_CATEGORIES.map(c => (
          <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            {c.emoji} {c.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === 'stock'}  onClick={() => setFilter('stock')}>Needs a real photo</FilterChip>
        <FilterChip active={filter === 'actual'} onClick={() => setFilter('actual')}>Has a real photo</FilterChip>
        <FilterChip active={filter === 'missing'} onClick={() => setFilter('missing')}>No photo at all</FilterChip>
        <FilterChip active={filter === 'all'}    onClick={() => setFilter('all')}>Everything</FilterChip>

        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
          <Loader2 className="animate-spin text-plum-600" size={28} />
          <span className="text-sm">Loading catalogue…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-semibold hover:underline">Retry</button>
        </div>
      ) : !products.length ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          Nothing matches this filter.
          {filter === 'stock' && ' Every product in this view already has a real photo. 🎉'}
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
                onEdit={() => setEditing(editing === p.id ? null : p.id)}
                onUpload={file => handleUpload(p, file)}
                onRevert={() => handleRevert(p)}
                onSave={patch => handleSaveDetails(p, patch)}
              />
            ))}
          </div>

          {visible.length < products.length && (
            <button
              onClick={() => setPage(n => n + 1)}
              className="w-full py-3 text-sm font-semibold text-plum-700 bg-white border border-gray-200 rounded-2xl hover:border-plum-300"
            >
              Show {Math.min(PAGE_SIZE, products.length - visible.length)} more
              <span className="text-gray-400 font-normal"> ({visible.length} of {products.length})</span>
            </button>
          )}
        </>
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
        <span className={`text-sm font-bold ${pct >= 100 ? 'text-green-600' : 'text-gray-400'}`}>{pct}%</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {coverage.map(c => (
          <span key={c.category} className="text-[11px] text-gray-400">
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

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-plum-700 border-plum-700 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
      }`}
    >
      {children}
    </button>
  )
}

/* ── One product ─────────────────────────────────────────────────────── */
function ProductRow({ product, busy, editing, onEdit, onUpload, onRevert, onSave }) {
  const fileRef = useRef(null)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (editing) {
      setDraft({
        name:        product.name ?? '',
        price:       product.price ?? '',
        description: product.description ?? '',
        image_alt:   product.image_alt ?? '',
      })
    }
  }, [editing, product])

  const isActual = product.image_source === 'actual'

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden flex ${isActual ? 'border-green-200' : 'border-gray-100'}`}>
      {/* Thumbnail doubles as the upload target. */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Upload a real photo"
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

      {/* capture="environment" opens the rear camera directly on a phone,
          which is the difference between "photograph the catalogue" being
          an afternoon and being a project. */}
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
            <input
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              placeholder="Product name"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={draft.price}
                onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
                className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="Price"
              />
              <input
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
                placeholder="Description"
              />
            </div>
            <input
              value={draft.image_alt}
              onChange={e => setDraft(d => ({ ...d, image_alt: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-plum-400"
              placeholder="Alt text — what a screen reader should say about the photo"
            />
            <div className="flex gap-2 pt-0.5">
              <button
                onClick={() => onSave({ ...draft, price: Number(draft.price) || 0 })}
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

            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {product.category}{product.occasion ? ` · ${product.occasion}` : ''}
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
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40"
                >
                  <RotateCcw size={11} /> Revert
                </button>
              )}

              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 ml-auto"
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
