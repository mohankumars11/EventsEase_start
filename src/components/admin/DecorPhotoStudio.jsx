import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Camera, ImageIcon, Upload, Trash2, Loader2, Check, AlertCircle, Search,
  Database, X, Sparkles,
} from 'lucide-react'
import { ALL_CATALOG_ITEMS, DECOR_CATEGORIES } from '../../data/decorCatalog'
import { EVENT_DATA } from '../../data/eventServicesData'
import { formatINR } from '../../utils/format'
import {
  fetchDecorPhotoRows, uploadDecorPhoto, removeDecorPhoto, updateDecorPhoto,
  isMissingTable,
} from '../../lib/decorPhotos'
import { invalidateDecorPhotos } from '../../hooks/useDecorPhotos'
import { useToast } from '../../context/ToastContext'

/**
 * Décor Photos — replacing sixty stock lookalikes with our own work.
 *
 * ── Why this screen exists ───────────────────────────────────────────────
 * Every one of the sixty décor setups in src/data/decorCatalog.js currently
 * shows a licensed Pexels photograph of the STYLE, badged "Representative
 * image" on the customer's card. That badge is not a legal footnote, it is a
 * promise the site keeps on every tile, and it is the correct thing to show
 * while Sambramo is pre-launch and has photographed nothing of its own.
 *
 * It is also the single biggest thing holding the storefront back. A customer
 * choosing a decorator is choosing between "here is roughly the style" and
 * "here is the hall we did last Saturday", and the second one wins every time
 * it is available. Until this screen, putting a real photograph on the site
 * meant editing a generated JavaScript file, committing, and redeploying —
 * which is to say it was never going to happen from the venue car park at
 * 11pm, which is exactly when the photograph exists.
 *
 * So: finish an install, photograph it on a phone, open this screen, upload.
 * The card changes for every visitor within the second, the badge flips from
 * "Representative image" to "Actual setup photo", and nothing was deployed.
 *
 * ── What it deliberately does not do ─────────────────────────────────────
 * It does not edit names, prices or inclusion lists. Those live in
 * decorCatalog.js and stay there — migration 044's header sets out the
 * argument in full, but the short version is that a price is researched
 * against the market and written down with its reasoning, not typed into a
 * phone. This screen owns the one field that genuinely arrives from a camera.
 *
 * ── The number at the top is the point ───────────────────────────────────
 * Coverage is stated first, as a share of the catalogue, because it is the
 * only metric this screen has and it moves in one direction. Twelve of sixty
 * is a business three-quarters of the way to competing on evidence rather than
 * on adjectives, and knowing that is what gets the next one photographed.
 */

const GRID_COLS = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

/** Occasion filter options, only for occasions that actually have décor items. */
function occasionOptions() {
  const counts = {}
  for (const item of ALL_CATALOG_ITEMS) {
    for (const occasion of item.occasions) counts[occasion] = (counts[occasion] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count, name: EVENT_DATA[id]?.name ?? id, emoji: EVENT_DATA[id]?.emoji ?? '🎉' }))
    .sort((a, b) => b.count - a.count)
}

export default function DecorPhotoStudio() {
  const toast = useToast()

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [absent, setAbsent]     = useState(false)   // migration 044 not applied
  const [error, setError]       = useState(null)
  const [busyId, setBusyId]     = useState(null)

  const [query, setQuery]       = useState('')
  const [occasion, setOccasion] = useState('all')
  const [only, setOnly]         = useState('all')   // all | missing | done

  const occasions = useMemo(occasionOptions, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchDecorPhotoRows())
      setAbsent(false)
    } catch (err) {
      // A missing table is not an error state — it is "you have not run the
      // migration yet", which is a normal condition in this project because
      // migrations are applied by hand. It gets its own explanatory panel
      // rather than a red banner blaming the person reading it.
      if (isMissingTable(err)) { setAbsent(true); setRows([]) }
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** itemId → uploaded row, for O(1) lookup while rendering sixty cards. */
  const byItem = useMemo(
    () => Object.fromEntries(rows.map(r => [r.item_id, r])),
    [rows]
  )

  /**
   * Rows whose catalogue item no longer exists.
   *
   * Migration 044 deliberately has no foreign key — the thing it references is
   * a JavaScript array — so renaming an id in decorCatalog.js orphans its row.
   * Surfacing them here is the only place that can be caught, and an orphan
   * left alone is a storage object nobody will ever find again.
   */
  const orphans = useMemo(() => {
    const known = new Set(ALL_CATALOG_ITEMS.map(i => i.id))
    return rows.filter(r => !known.has(r.item_id))
  }, [rows])

  const covered = ALL_CATALOG_ITEMS.filter(i => byItem[i.id]?.image_source === 'actual').length
  const total   = ALL_CATALOG_ITEMS.length
  const pct     = Math.round((covered / total) * 100)

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ALL_CATALOG_ITEMS.filter(item => {
      if (occasion !== 'all' && !item.occasions.includes(occasion)) return false
      const has = Boolean(byItem[item.id])
      if (only === 'missing' && has) return false
      if (only === 'done' && !has) return false
      if (!needle) return true
      return (
        item.name.toLowerCase().includes(needle) ||
        item.blurb.toLowerCase().includes(needle) ||
        item.id.includes(needle)
      )
    })
  }, [query, occasion, only, byItem])

  async function handleUpload(item, file) {
    if (!file) return
    setBusyId(item.id)
    try {
      const saved = await uploadDecorPhoto(item.id, file, {
        alt: `${item.name} — a setup Sambramo installed`,
        source: 'actual',
      })
      setRows(prev => [saved, ...prev.filter(r => r.item_id !== item.id)])
      // The storefront caches the override map for the session. Without this,
      // the founder uploads a photograph, opens the customer page to admire it
      // and sees the old stock one — and reasonably concludes the upload failed.
      invalidateDecorPhotos()
      toast.success(`${item.name} now shows your own photograph`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(item) {
    setBusyId(item.id)
    try {
      await removeDecorPhoto(item.id)
      setRows(prev => prev.filter(r => r.item_id !== item.id))
      invalidateDecorPhotos()
      toast.info(`${item.name} is back to its reference photograph`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  /** Flip an uploaded photo between "our own work" and "a stock replacement". */
  async function handleSource(item, source) {
    setBusyId(item.id)
    try {
      const saved = await updateDecorPhoto(item.id, {
        image_source: source,
        image_credit: source === 'actual' ? null : byItem[item.id]?.image_credit ?? null,
      })
      setRows(prev => prev.map(r => (r.item_id === item.id ? saved : r)))
      invalidateDecorPhotos()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleOrphan(row) {
    setBusyId(row.item_id)
    try {
      await removeDecorPhoto(row.item_id)
      setRows(prev => prev.filter(r => r.item_id !== row.item_id))
      invalidateDecorPhotos()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="animate-spin text-plum-600" size={28} />
        <span className="text-sm">Reading the décor catalogue…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Coverage ──────────────────────────────────────────
          One number, stated first. It is the only metric this screen has and
          it only moves one way. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-plum-600">
              Our own photographs
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">
              {covered}
              <span className="text-lg font-semibold text-gray-400"> / {total}</span>
              <span className="ml-2 text-base font-bold text-plum-600">{pct}%</span>
            </p>
            <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-gray-500">
              {covered === 0
                ? 'Every card on the storefront currently says “Representative image”. The first real photograph you upload changes that card to “Actual setup photo” for every visitor, instantly.'
                : `${total - covered} setup${total - covered === 1 ? '' : 's'} still show a licensed reference photograph. Each one you replace is a card that stops describing the style and starts showing the work.`}
            </p>
          </div>

          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="text-xl font-bold tabular-nums text-emerald-600">{covered}</p>
              <p className="text-[10.5px] font-semibold text-gray-400">Ours</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-gray-400">{total - covered}</p>
              <p className="text-[10.5px] font-semibold text-gray-400">Reference</p>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-plum-500 to-emerald-500 transition-[width] duration-500"
            style={{ width: `${Math.max(pct, covered > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* ── Migration not applied ─────────────────────────────
          Not an error. Migrations in this project are pasted into the Supabase
          SQL editor by hand, so "deployed but not applied" is a normal state
          with a normal fix, and the screen says what the fix is. */}
      {absent && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 text-[12.5px] leading-relaxed text-amber-900">
            <p className="font-bold">One step before this screen can save anything.</p>
            <p className="mt-1">
              The <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">decor_photos</code> table
              does not exist yet. Open the Supabase dashboard → SQL Editor, paste{' '}
              <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">supabase/migrations/044_decor_photos.sql</code>{' '}
              and run it, then refresh this page.
            </p>
            <p className="mt-1 text-amber-800/80">
              Nothing is broken in the meantime — the storefront shows the reference photographs
              it ships with, exactly as it does today.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* ── Orphans ───────────────────────────────────────────
          A photo whose catalogue item was renamed or deleted. Nothing renders
          it any more and its file sits in the bucket costing storage; this is
          the only place it can be found. */}
      {orphans.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-[12.5px] font-bold text-gray-900">
            {orphans.length} photograph{orphans.length === 1 ? '' : 's'} no longer used by any setup
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">
            These were uploaded against a catalogue entry that has since been renamed or removed.
            Nothing on the site shows them and their files still take up storage.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {orphans.map(row => (
              <button
                key={row.item_id}
                onClick={() => handleOrphan(row)}
                disabled={busyId === row.item_id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                {busyId === row.item_id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {row.item_id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────
          "Still needs a photo" first among the state filters, because it is
          the working queue and everything else is browsing. */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a setup — candlelight, mandap, balloon arch…"
            aria-label="Search décor setups"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-9 text-[13px] focus:border-plum-400 focus:outline-none focus:ring-2 focus:ring-plum-100"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all',     label: `All ${total}` },
            { id: 'missing', label: `Still needs a photo (${total - rows.filter(r => ALL_CATALOG_ITEMS.some(i => i.id === r.item_id)).length})` },
            { id: 'done',    label: 'Already photographed' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setOnly(f.id)}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                only === f.id
                  ? 'bg-plum-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-plum-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setOccasion('all')}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
              occasion === 'all'
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            Every occasion
          </button>
          {occasions.map(o => (
            <button
              key={o.id}
              onClick={() => setOccasion(o.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                occasion === o.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <span aria-hidden="true">{o.emoji}</span> {o.name}
              <span className={occasion === o.id ? 'ml-1 text-white/50' : 'ml-1 text-gray-400'}>{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11.5px] text-gray-400" aria-live="polite">
        Showing {shown.length} of {total} setups
      </p>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <p className="text-[13px] font-bold text-gray-900">Nothing matches that</p>
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-gray-500">
            {only === 'missing'
              ? 'Every setup in this filter already has a photograph of our own. That is the whole job done.'
              : 'Try a shorter word, or widen the occasion filter.'}
          </p>
        </div>
      ) : (
        <div className={`grid ${GRID_COLS} gap-3`}>
          {shown.map(item => (
            <DecorPhotoCard
              key={item.id}
              item={item}
              row={byItem[item.id]}
              busy={busyId === item.id}
              disabled={absent}
              onUpload={file => handleUpload(item, file)}
              onRemove={() => handleRemove(item)}
              onSource={src => handleSource(item, src)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   One setup
═══════════════════════════════════════════════════════════ */

/**
 * The card shows what the CUSTOMER currently sees, not what is in the table.
 *
 * That distinction is the whole design of this tile. An admin screen that
 * showed an empty frame for every un-uploaded setup would be showing sixty
 * blanks and hiding the thing being replaced — and the decision "is this worth
 * photographing next" is entirely a judgement about how weak the current
 * picture is. So the reference photograph renders at full size, with its badge,
 * exactly as it does on the storefront, and uploading swaps it in place.
 */
function DecorPhotoCard({ item, row, busy, disabled, onUpload, onRemove, onSource }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const live   = row ?? null
  const url    = live?.image_url ?? item.photo
  const source = live?.image_source ?? item.source
  const ours   = source === 'actual'

  const category = DECOR_CATEGORIES.find(c => c.id === item.category)

  function pick(files) {
    const file = files?.[0]
    if (file) onUpload(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files) }}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
        dragging ? 'border-plum-400 ring-2 ring-plum-200' : ours ? 'border-emerald-200' : 'border-gray-100'
      }`}
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-plum-800 to-berry-900">
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-4xl opacity-60">
          {item.emoji}
        </span>
        {url && (
          <img
            src={url}
            alt={live?.image_alt ?? item.alt}
            loading="lazy"
            decoding="async"
            className="relative h-full w-full object-cover"
          />
        )}

        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
            ours ? 'bg-emerald-500/90 text-white' : 'bg-white/85 text-gray-600'
          }`}
        >
          {ours ? <Camera size={10} /> : <ImageIcon size={10} />}
          {ours ? 'Our photograph' : 'Reference photo'}
        </span>

        {item.popular && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            <Sparkles size={9} /> Our pick
          </span>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-gray-900">{item.name}</h3>
            <p className="mt-0.5 truncate text-[10.5px] text-gray-400">
              {category?.emoji} {category?.name} · from {formatINR(item.price)}
            </p>
          </div>
          {ours && <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />}
        </div>

        {/* Which occasion pages this photograph will appear on. A décor item is
            tagged to several, so an admin about to replace one needs to know
            they are changing four pages and not one. */}
        <p className="mt-1.5 truncate text-[10px] text-gray-400">
          Appears on: {item.occasions.map(o => EVENT_DATA[o]?.name ?? o).join(', ')}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          /* `capture` is deliberately absent. Adding it forces the camera and
             blocks the gallery on Android, and the photograph of last night's
             hall is already in the gallery — which is the common case by a
             wide margin. */
          className="hidden"
          onChange={e => { pick(e.target.files); e.target.value = '' }}
        />

        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || disabled}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-plum-600 px-3 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-plum-700 disabled:opacity-40"
          >
            <Upload size={12} /> {live ? 'Replace' : 'Upload the real one'}
          </button>

          {live && (
            <button
              onClick={onRemove}
              disabled={busy}
              title="Delete the photograph and go back to the reference image"
              aria-label={`Remove the photograph for ${item.name}`}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* The honesty flag, editable, only once there is a photograph to flag.
            The case it exists for: a better STOCK photograph than the resolver
            found — legitimate, common, and it must not be allowed to claim to
            be our own work. */}
        {live && (
          <div className="mt-2 flex items-center gap-1.5">
            {[
              { id: 'actual', label: 'Our own work' },
              { id: 'stock',  label: 'A stock replacement' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => onSource(opt.id)}
                disabled={busy || source === opt.id}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10.5px] font-semibold transition-colors ${
                  source === opt.id
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {!live && (
          <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-gray-400">
            <Sparkles size={10} className="mt-0.5 shrink-0" />
            Drop a photo here, or tap above. It is compressed on this device before it uploads.
          </p>
        )}
      </div>
    </div>
  )
}
