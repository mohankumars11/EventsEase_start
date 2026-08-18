import { useState, useRef, useCallback } from 'react'
import { Loader2, Camera, Images, ClipboardPaste, Upload, X, Check } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import {
  uploadGalleryImages, fetchImageAsFile, imageUrlsFromText,
} from '../../lib/productStudio'
import { QUALITY_MODES, ORIGINAL_MAX_BYTES } from '../../lib/productImages'
import { usePasteImages } from '../../hooks/usePasteImages'

/**
 * One way to get a photograph onto a product, used by every screen that needs
 * one.
 *
 * ── What "give every option to paste it" actually means ──────────────────
 * Five routes, and the point is that none of them is the only one:
 *
 *   Ctrl+V         a screenshot, a copied image from a PDF or another site
 *   Paste button   the same thing when Ctrl+V never reaches the page — see
 *                  usePasteImages for the focus case that causes it
 *   drag & drop    a folder's worth at once
 *   Choose files   the picker, `multiple`
 *   Take a photo   the camera, and the ONLY place `capture` appears
 *
 * plus a pasted image address, downloaded and re-hosted.
 *
 * ── The provenance control is not optional ───────────────────────────────
 * Migration 023 made image provenance a column and the storefront prints it.
 * A screenshot of somebody else's product photo is a `stock` lookalike, not
 * an `actual` photo of the thing that will arrive, and pasting is exactly the
 * route by which those get mixed up — so the choice sits above the buttons and
 * travels with every upload, whichever route it came in by.
 */
export default function PhotoIntake({
  productId,
  hasPhoto = false,
  compact = false,
  defaultSource = 'actual',
  onDone,
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [source, setSource] = useState(defaultSource)
  // Defaults to 'original', because the route that brought people here is a
  // pasted screenshot and re-encoding one is exactly the complaint. A
  // photograph is better off 'balanced', which is one click away.
  const [quality, setQuality] = useState('original')
  const [lastResult, setLastResult] = useState(null)
  const [urlText, setUrlText] = useState('')
  const filesInput = useRef(null)
  const cameraInput = useRef(null)
  const sourceRef = useRef(source)
  sourceRef.current = source
  const qualityRef = useRef(quality)
  qualityRef.current = quality

  const ingest = useCallback(async (files, { label = 'Photo' } = {}) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const { added, failures } = await uploadGalleryImages(productId, files, {
        source: sourceRef.current,
        quality: qualityRef.current,
        // Only claims the tile when there is nothing there. Pasting more
        // photos onto a product whose tile photo was chosen deliberately must
        // not silently replace it.
        makePrimaryIfFirst: !hasPhoto,
        onProgress: setProgress,
      })
      if (added.length) {
        // Reported from what actually happened to the bytes, not from what was
        // requested — `_kept` is set by prepareImage only when the original was
        // uploaded untouched.
        const kept = added.filter(a => a._kept).length
        const first = added[0]
        const dims = first?._width ? ` ${first._width}x${first._height}` : ''
        setLastResult({
          kept,
          total: added.length,
          dims,
          reason: added.find(a => a._reason)?._reason ?? null,
        })
        toast.success(added.length === 1
          ? `${label} added${kept ? ` at full quality${dims}` : dims}.${!hasPhoto ? ' It is now the tile photo.' : ''}`
          : `${added.length} photos added${kept === added.length ? ' at full quality' : ''}.${!hasPhoto ? ' The first is now the tile photo.' : ''}`)
      }
      for (const f of failures.slice(0, 3)) toast.error(`${f.name}: ${f.message}`)
      if (failures.length > 3) toast.error(`…and ${failures.length - 3} more failed.`)
      if (added.length) await onDone?.()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add those photos.'))
    } finally {
      setProgress(null)
      setBusy(false)
    }
  }, [productId, hasPhoto, toast, onDone])

  const ingestUrls = useCallback(async (urls) => {
    setBusy(true)
    setProgress({ index: 0, total: urls.length, name: 'downloading…', phase: 'fetching' })
    const files = []
    const failed = []
    for (const url of urls) {
      try { files.push(await fetchImageAsFile(url)) }
      catch (err) { failed.push(err.message) }
    }
    setProgress(null)
    setBusy(false)
    for (const f of failed.slice(0, 2)) toast.error(f)
    if (files.length) await ingest(files, { label: 'Image' })
  }, [ingest, toast])

  const { dragging, dropHandlers, pasteFromClipboard } = usePasteImages({
    onImages: files => ingest(files, { label: 'Screenshot' }),
    onUrls: ingestUrls,
  })

  async function onPasteClick() {
    const res = await pasteFromClipboard()
    if (!res.ok) toast.info(res.reason)
  }

  return (
    <div
      {...dropHandlers}
      // Focusable, so clicking the panel gives it keyboard focus and the very
      // next Ctrl+V is guaranteed to land on this document.
      tabIndex={0}
      className={`relative rounded-2xl border outline-none transition-colors ${compact ? 'p-3' : 'p-4'} ${
        dragging
          ? 'border-dashed border-plum-500 bg-plum-50/70'
          : 'border-gray-200 focus:border-plum-400'
      }`}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-plum-50/85">
          <p className="flex items-center gap-2 text-sm font-extrabold text-plum-700">
            <Upload size={18} /> Drop to add
          </p>
        </div>
      )}

      {!compact && (
        <>
          <h4 className="text-sm font-extrabold text-plum-950">Add photos</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            Take a screenshot and press <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>, drag files in, or choose
            them. Several at once is fine.
          </p>
        </>
      )}

      <div className={compact ? '' : 'mt-3'}>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Where is this from?</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['actual', 'A photo of the real thing'],
            ['vendor', 'From the maker'],
            ['stock',  'A lookalike'],
            ['ai',     'Made with AI'],
          ].map(([id, label]) => (
            <button
              key={id} onClick={() => setSource(id)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                source === id
                  ? 'border-plum-600 bg-plum-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {{
            actual: 'Customers will be told this is the real item.',
            vendor: 'Shown as the maker’s own photo.',
            stock:  'Shown as “Representative image”. Use this for a screenshot taken from another site.',
            ai:     'Shown as generated. Fine for a mood shot; not for “this is what arrives”.',
          }[source]}
        </p>
      </div>

      {/* ── Quality ─────────────────────────────────────────────────────
          The pixels that arrive are the pixels that were on the clipboard —
          'Original quality' does not re-encode at a higher setting, it does
          not re-encode at all. Every canvas round-trip costs something, and a
          screenshot of a PDF is text and hard edges, which is exactly what
          lossy WebP at 0.82 smears. */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Quality</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(QUALITY_MODES).map(mode => (
            <button
              key={mode.id} onClick={() => setQuality(mode.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                quality === mode.id
                  ? 'border-plum-600 bg-plum-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {QUALITY_MODES[quality]?.hint}
          {quality === 'original' && ` Up to ${ORIGINAL_MAX_BYTES / 1048576} MB stays byte-for-byte; anything larger is resaved at high quality.`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* First and loudest: it is the one the whole complaint was about, and
            it works even when Ctrl+V never reaches the page. */}
        <button
          onClick={onPasteClick} disabled={busy}
          className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardPaste size={15} />}
          Paste image
        </button>
        <button
          onClick={() => filesInput.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400 disabled:opacity-50"
        >
          <Images size={15} /> Choose files
        </button>
        <button
          onClick={() => cameraInput.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400 disabled:opacity-50"
        >
          <Camera size={15} /> Take a photo
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          value={urlText}
          onChange={e => setUrlText(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const urls = imageUrlsFromText(urlText)
            if (urls.length) { setUrlText(''); ingestUrls(urls) }
          }}
          placeholder="…or paste an image address"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
        />
        <button
          disabled={busy || imageUrlsFromText(urlText).length === 0}
          onClick={() => { const u = imageUrlsFromText(urlText); setUrlText(''); ingestUrls(u) }}
          className="rounded-xl border border-plum-200 px-3 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400 disabled:opacity-40"
        >
          Fetch
        </button>
      </div>

      {/* What happened to the bytes, reported rather than assumed. */}
      {lastResult && !progress && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-[11px] ${
          lastResult.kept === lastResult.total
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-amber-50 text-amber-800'
        }`}>
          {lastResult.kept === lastResult.total ? (
            <p className="font-semibold">
              Uploaded untouched{lastResult.dims} — identical to the original, no re-encoding.
            </p>
          ) : (
            <p className="font-semibold">
              {lastResult.kept} of {lastResult.total} kept at original quality.
              {lastResult.reason ? ` ${lastResult.reason}` : ''}
            </p>
          )}
        </div>
      )}

      {progress && (
        <div className="mt-3 rounded-xl bg-plum-50 px-3 py-2">
          <p className="flex items-center gap-2 text-xs font-bold text-plum-800">
            <Loader2 size={13} className="animate-spin" />
            {progress.phase === 'fetching' ? 'Downloading' : 'Uploading'} {progress.index + 1} of {progress.total}
            <span className="truncate font-semibold text-plum-600">{progress.name}</span>
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-plum-200">
            <div className="h-full rounded-full bg-plum-600 transition-all"
              style={{ width: `${Math.round((progress.index / Math.max(progress.total, 1)) * 100)}%` }} />
          </div>
        </div>
      )}

      <input ref={filesInput} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { ingest([...(e.target.files ?? [])]); e.target.value = '' }} />
      {/* The ONLY `capture` in the console. On Android it removes the gallery
          option entirely, so on the general picker above it meant an admin with
          the photo already on their phone could not select it. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { ingest([...(e.target.files ?? [])]); e.target.value = '' }} />
    </div>
  )
}

export function Kbd({ children }) {
  return (
    <kbd className="rounded border border-gray-300 bg-gray-50 px-1 py-px font-sans text-[10px] font-bold text-gray-600">
      {children}
    </kbd>
  )
}

/**
 * The same panel as a sheet, for screens that only have room for a thumbnail.
 *
 * Opened by clicking a product's photo anywhere in the console — which is the
 * gesture people already try, and which previously either did nothing or went
 * straight to a camera-only file picker.
 */
export function QuickPhotoSheet({ product, onClose, onDone }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-plum-950/40 backdrop-blur-sm sm:items-center sm:p-6"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {product.image_url
              ? <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-xl">{product.emoji ?? '🎁'}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-extrabold text-plum-950">{product.name}</h3>
            <p className="truncate text-[11px] text-gray-500">{product.category}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <PhotoIntake
            productId={product.id}
            hasPhoto={Boolean(product.image_url)}
            onDone={onDone}
          />
          <button onClick={onClose}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-plum-600 py-2.5 text-sm font-bold text-white hover:bg-plum-700">
            <Check size={15} /> Done
          </button>
        </div>
      </div>
    </div>
  )
}
