import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  X, Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, Star, Sparkles,
  Images, Film, HelpCircle, Clapperboard, SlidersHorizontal, Upload, Link2,
  Camera, Check, AlertTriangle, Eye, EyeOff, Wand2, MessageSquare,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import {
  saveProduct, fetchMedia, addMedia, updateMedia, deleteMedia, reorderMedia,
  uploadGalleryImage, uploadVideo, setPrimaryImage, VIDEO_WARN_BYTES,
  fetchFaqs, saveFaq, deleteFaq, parseFaqBulk, importFaqs,
  fetchStory, saveSlide, deleteSlide, storyTemplate, importSlides,
  SCENES, SCENE_BY_ID, ACCENTS,
  fetchProductReviews, replyToReview, setSeedRating,
} from '../../lib/productStudio'
import { enrichProduct } from '../../lib/aiCatalog'
import MediaGenerator from './MediaGenerator'

/**
 * Everything about one product, in one place.
 *
 * ── Why a full-screen sheet and not a page ───────────────────────────────
 * The work here is always "fix this product", never "browse products" — so it
 * opens over the list and closes back onto the same scroll position, the same
 * filters, the same place in the queue. A route would lose all three, and the
 * queue is the thing that gets a catalogue finished.
 *
 * ── The five tabs are five different jobs ────────────────────────────────
 *   Details   the row itself: name, price, shelf, description, specs
 *   Media     the photographs and the clips, in the order the customer sees
 *   Story     the slides — the part that says why this is worth buying
 *   Questions the FAQ, which can be answered once for a whole shelf
 *   Rating    real reviews and the reply to them, plus the launch baseline
 *
 * Each tab writes to a different table, and each one degrades on its own: on a
 * database without migration 051 the Details tab still saves a price and the
 * other four explain what to run. That is deliberate — the most common thing
 * an admin needs (fix a price) must never be blocked by the least common one.
 */

const TABS = [
  { id: 'details', label: 'Details',   icon: SlidersHorizontal },
  { id: 'media',   label: 'Photos & video', icon: Images },
  { id: 'story',   label: 'Story',     icon: Clapperboard },
  { id: 'faqs',    label: 'Questions', icon: HelpCircle },
  { id: 'rating',  label: 'Rating',    icon: Star },
]

export default function ProductWorkbench({ product, categories, installed, onClose, onSaved }) {
  const [tab, setTab] = useState('details')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-plum-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-white shadow-2xl lg:max-w-4xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-3.5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {product.image_url
              ? <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-xl">{product.emoji ?? '🎁'}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-plum-950">{product.name}</h2>
            <p className="text-xs text-gray-500">
              {product.category} · {formatINR(product.price)}
              {product.is_active === false && <span className="ml-2 font-bold text-gray-400">Off sale</span>}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border-plum-600 text-plum-700'
                  : 'border-transparent text-gray-500 hover:text-plum-600'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' && <DetailsTab product={product} categories={categories} onSaved={onSaved} />}
          {tab === 'media'   && <MediaTab   product={product} installed={installed} onSaved={onSaved} />}
          {tab === 'story'   && <StoryTab   product={product} installed={installed} />}
          {tab === 'faqs'    && <FaqTab     product={product} installed={installed} />}
          {tab === 'rating'  && <RatingTab  product={product} installed={installed} onSaved={onSaved} />}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Details
   ══════════════════════════════════════════════════════════════════════ */

function DetailsTab({ product, categories, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(() => ({
    name: product.name ?? '',
    subtitle: product.subtitle ?? '',
    category: product.category ?? categories[0]?.id ?? '',
    occasion: product.occasion ?? '',
    price: product.price ?? '',
    mrp: product.mrp ?? '',
    badge: product.badge ?? '',
    emoji: product.emoji ?? '🎁',
    description: product.description ?? '',
    same_day: product.same_day !== false,
    prep_hours: product.prep_hours ?? '',
    is_active: product.is_active !== false,
    highlights: Array.isArray(product.highlights) ? product.highlights : [],
    specs: product.specs && typeof product.specs === 'object' ? product.specs : {},
  }))
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)

  const set = patch => setForm(f => ({ ...f, ...patch }))

  async function save() {
    setBusy(true)
    try {
      const { degraded } = await saveProduct({
        name: form.name.trim(),
        subtitle: form.subtitle.trim() || null,
        category: form.category,
        occasion: form.occasion.trim() || null,
        price: form.price,
        mrp: form.mrp === '' ? null : form.mrp,
        badge: form.badge.trim() || null,
        emoji: form.emoji || '🎁',
        description: form.description.trim() || null,
        same_day: form.same_day,
        prep_hours: form.prep_hours === '' ? null : form.prep_hours,
        is_active: form.is_active,
        highlights: form.highlights.filter(Boolean),
        specs: form.specs,
      }, { id: product.id })

      if (degraded) toast.info('Saved the basics. The rest needs migration 051.')
      else toast.success('Saved.')
      await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that.'))
    } finally {
      setBusy(false)
    }
  }

  async function writeWithAi() {
    setAiBusy(true)
    try {
      const result = await enrichProduct({
        product: {
          name: form.name, category: form.category, occasion: form.occasion,
          price: form.price, description: form.description,
          highlights: form.highlights, specs: form.specs,
        },
      })
      setAi(result)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not write that.'))
    } finally {
      setAiBusy(false)
    }
  }

  /* The AI writes into the form, not into the database — the admin still has
     to look at it and press Save, exactly like text they typed themselves. */
  function applyAi(fields) {
    const patch = {}
    if (fields.includes('description') && ai.description) patch.description = ai.description
    if (fields.includes('subtitle') && ai.subtitle) patch.subtitle = ai.subtitle
    if (fields.includes('highlights') && ai.highlights?.length) patch.highlights = ai.highlights
    if (fields.includes('specs') && ai.specs?.length) {
      patch.specs = Object.fromEntries(ai.specs.map(s => [s.label, s.value]))
    }
    set(patch)
    toast.success('Put into the form — check it, then Save.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-plum-100 bg-plum-50/40 p-3">
        <p className="text-xs text-plum-900">
          <strong>Stuck for words?</strong> It will draft the description, the bullets, the spec table,
          the questions and the story from what is already here.
        </p>
        <button
          onClick={writeWithAi} disabled={aiBusy || !form.name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Write it for me
        </button>
      </div>

      {ai && <AiDraft draft={ai} onApply={applyAi} onDismiss={() => setAi(null)} productId={product.id} category={form.category} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" full>
          <input value={form.name} onChange={e => set({ name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="One line under the name" hint="Optional" full>
          <input value={form.subtitle} onChange={e => set({ subtitle: e.target.value })}
            placeholder="e.g. Hand-woven in Molakalmuru, with a temple border" className={inputCls} />
        </Field>

        <Field label="Price (₹)">
          <input type="number" value={form.price} onChange={e => set({ price: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Was (₹)" hint="Leave blank for no strike-through">
          <input type="number" value={form.mrp} onChange={e => set({ mrp: e.target.value })} className={inputCls} />
        </Field>

        <Field label="Shelf">
          <select value={form.category} onChange={e => set({ category: e.target.value })} className={inputCls}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </Field>
        <Field label="Occasion" hint="Optional — birthday, Diwali, wedding…">
          <input value={form.occasion} onChange={e => set({ occasion: e.target.value })} className={inputCls} />
        </Field>

        <Field label="Badge" hint="Small label on the tile">
          <input value={form.badge} onChange={e => set({ badge: e.target.value })} placeholder="e.g. New, Festive" className={inputCls} />
        </Field>
        <Field label="Emoji" hint="Shown when there is no photo">
          <input value={form.emoji} onChange={e => set({ emoji: e.target.value })} maxLength={4} className={`${inputCls} text-center text-lg`} />
        </Field>
      </div>

      <Field label="Description">
        <textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={4} className={inputCls} />
      </Field>

      <ListEditor
        label="Highlights"
        hint="Short bullets under the price — “Serves 8–10”, “100% eggless”"
        items={form.highlights}
        onChange={highlights => set({ highlights })}
        placeholder="Add a highlight…"
      />

      <SpecEditor specs={form.specs} onChange={specs => set({ specs })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 p-3">
          <input type="checkbox" checked={form.same_day} onChange={e => set({ same_day: e.target.checked })}
            className="h-4 w-4 accent-plum-600" />
          <span className="text-sm font-semibold text-gray-700">Can be delivered same day</span>
        </label>
        <Field label="Hours needed to make it" hint="Optional — shown as a preparation time">
          <input type="number" value={form.prep_hours} onChange={e => set({ prep_hours: e.target.value })} className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={() => set({ is_active: !form.is_active })}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
            form.is_active
              ? 'border-gray-200 text-gray-600 hover:border-gray-300'
              : 'border-amber-300 bg-amber-50 text-amber-800'
          }`}
        >
          {form.is_active ? <><Eye size={15} /> On sale</> : <><EyeOff size={15} /> Off sale</>}
        </button>
        {/* Never a delete button. `order_items.product_id` points here with no
            ON DELETE clause, so removing a product that has ever sold either
            fails or detaches the line from past revenue — migration 037 added
            the flag for exactly this reason. */}
        <p className="text-[11px] text-gray-400">
          Taking it off sale hides it from customers and keeps every past order intact.
        </p>
        <button
          onClick={save} disabled={busy || !form.name.trim()}
          className="ml-auto flex items-center gap-2 rounded-xl bg-plum-600 px-5 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
      </div>
    </div>
  )
}

function AiDraft({ draft, onApply, onDismiss, productId, category }) {
  const toast = useToast()
  const [saving, setSaving] = useState(null)

  async function saveFaqs() {
    setSaving('faqs')
    try {
      await importFaqs(draft.faqs, { product_id: productId })
      toast.success(`${draft.faqs.length} questions added.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save those questions.'))
    } finally { setSaving(null) }
  }

  async function saveSlides() {
    setSaving('slides')
    try {
      await importSlides(draft.slides.map((s, i) => ({
        ...s, product_id: productId, category: null, sort_order: (i + 1) * 10,
        icon: s.icon || SCENE_BY_ID[s.scene]?.icon || null,
        accent: ACCENTS.includes(s.accent) ? s.accent : 'saffron',
      })))
      toast.success(`${draft.slides.length} slides added.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save those slides.'))
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-plum-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-plum-900">
          <Sparkles size={15} /> A draft — nothing is saved yet
        </h4>
        <button onClick={onDismiss} className="rounded p-1 text-gray-400 hover:text-gray-700"><X size={15} /></button>
      </div>

      {draft.warnings?.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900">{draft.warnings.join(' · ')}</p>
      )}

      {draft.description && (
        <DraftBlock title="Description" onUse={() => onApply(['description', 'subtitle'])}>
          {draft.subtitle && <p className="mb-1 font-semibold text-gray-700">{draft.subtitle}</p>}
          <p>{draft.description}</p>
        </DraftBlock>
      )}

      {draft.highlights?.length > 0 && (
        <DraftBlock title="Highlights" onUse={() => onApply(['highlights'])}>
          <ul className="list-inside list-disc">{draft.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </DraftBlock>
      )}

      {draft.specs?.length > 0 && (
        <DraftBlock title="Spec table" onUse={() => onApply(['specs'])}>
          {draft.specs.map((s, i) => <p key={i}><strong>{s.label}:</strong> {s.value}</p>)}
        </DraftBlock>
      )}

      {draft.faqs?.length > 0 && (
        <DraftBlock title={`${draft.faqs.length} questions`} onUse={saveFaqs} busy={saving === 'faqs'} label="Save to Questions">
          {draft.faqs.slice(0, 3).map((f, i) => <p key={i} className="mb-1"><strong>{f.question}</strong> {f.answer}</p>)}
          {draft.faqs.length > 3 && <p className="text-gray-400">…and {draft.faqs.length - 3} more</p>}
        </DraftBlock>
      )}

      {draft.slides?.length > 0 && (
        <DraftBlock title={`${draft.slides.length} story slides`} onUse={saveSlides} busy={saving === 'slides'} label="Save to Story">
          {draft.slides.map((s, i) => (
            <p key={i} className="mb-1">{s.icon} <strong>{s.title}</strong> — {s.body}</p>
          ))}
        </DraftBlock>
      )}
    </div>
  )
}

function DraftBlock({ title, children, onUse, busy, label = 'Put in the form' }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{title}</span>
        <button
          onClick={onUse} disabled={busy}
          className="flex items-center gap-1 rounded-lg bg-plum-100 px-2 py-1 text-[11px] font-bold text-plum-700 hover:bg-plum-200 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {label}
        </button>
      </div>
      <div className="space-y-0.5 text-xs leading-relaxed text-gray-600">{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Media
   ══════════════════════════════════════════════════════════════════════ */

function MediaTab({ product, installed, onSaved }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(true)
  const [busy, setBusy] = useState(null)
  const [adding, setAdding] = useState(false)

  const imageInput = useRef(null)
  const videoInput = useRef(null)
  const [pendingSource, setPendingSource] = useState('actual')
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { rows, installed: ok } = await fetchMedia(product.id)
    setItems(rows)
    setReady(ok)
    setLoading(false)
  }, [product.id])

  useEffect(() => { load() }, [load])

  async function handleImage(file) {
    if (!file) return
    setBusy('upload')
    try {
      await uploadGalleryImage(product.id, file, {
        source: pendingSource,
        makePrimary: items.filter(m => m.kind === 'image').length === 0,
      })
      toast.success('Photo added.')
      await load(); await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not upload that photo.'))
    } finally { setBusy(null) }
  }

  async function handleVideo(file) {
    if (!file) return
    if (file.size > VIDEO_WARN_BYTES) {
      toast.info('That is a big clip — customers on mobile data will wait for it. 15 seconds at 720p is plenty.')
    }
    setBusy('upload')
    try {
      await uploadVideo(product.id, file, { source: pendingSource, onProgress: msg => setBusy(msg) })
      toast.success('Clip added.')
      await load(); await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not upload that clip.'))
    } finally { setBusy(null) }
  }

  if (!installed || !ready) return <NeedsMigration what="Photo galleries and clips" />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 p-4">
        <h4 className="text-sm font-extrabold text-plum-950">Add a photo or a clip</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          The first photo becomes the one on the shelf tile. The rest slide behind it.
        </p>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Where is this from?</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['actual', 'A photo of the real thing', 'Shows as “Actual product photo”'],
              ['vendor', 'From the maker', 'Their photo of the item they make'],
              ['stock',  'A stock lookalike', 'Shows as “Representative image”'],
              ['ai',     'Made with AI', 'Labelled as generated, so nobody is misled'],
            ].map(([id, label, hint]) => (
              <button
                key={id} onClick={() => setPendingSource(id)} title={hint}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  pendingSource === id
                    ? 'border-plum-600 bg-plum-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Not decoration. Migration 023 made image provenance a column and
              the storefront prints it; a generated clip sitting unlabelled next
              to a real one is the thing this control exists to prevent. */}
          <p className="mt-1.5 text-[11px] text-gray-400">
            {{
              actual: 'Customers will be told this is the real item.',
              vendor: 'Shown as the maker’s own photo.',
              stock:  'Shown as “Representative image” — a lookalike, not this exact item.',
              ai:     'Shown as generated. Fine for a mood shot; not for “this is what arrives”.',
            }[pendingSource]}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => imageInput.current?.click()} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-plum-700 disabled:opacity-50"
          >
            {busy === 'upload' ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Photo
          </button>
          <button
            onClick={() => videoInput.current?.click()} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400 disabled:opacity-50"
          >
            <Film size={15} /> Clip
          </button>
          <button
            onClick={() => setGenerating(g => !g)} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400 disabled:opacity-50"
          >
            <Wand2 size={15} /> Make one with AI
          </button>
          <button
            onClick={() => setAdding(true)} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300"
          >
            <Link2 size={15} /> From a link
          </button>
          {busy && busy !== 'upload' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-plum-700">
              <Loader2 size={13} className="animate-spin" /> {busy}
            </span>
          )}
        </div>

        {/* `capture="environment"` so tapping this on a phone opens the camera
            rather than the photo library — the workflow is somebody standing in
            the shop with the thing in front of them. */}
        <input ref={imageInput} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { handleImage(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={videoInput} type="file" accept="video/*" className="hidden"
          onChange={e => { handleVideo(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {generating && (
        <MediaGenerator
          productId={product.id}
          onClose={() => setGenerating(false)}
          onDone={async () => { await load(); await onSaved() }}
        />
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Images size={26} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm font-bold text-gray-700">No photos yet</p>
          <p className="mt-1 text-xs text-gray-500">
            One good photo does more for this product than anything else on this screen.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((m, i) => (
            <MediaCard
              key={m.id} media={m} index={i} total={items.length} isPrimary={product.image_url === m.url}
              onUp={async () => { setItems(await reorderMedia(items, m.id, 'up')) }}
              onDown={async () => { setItems(await reorderMedia(items, m.id, 'down')) }}
              onPrimary={async () => {
                await setPrimaryImage(product.id, m.url, m.source)
                toast.success('That is the tile photo now.')
                await onSaved()
              }}
              onCaption={async caption => { await updateMedia(m.id, { caption }); await load() }}
              onDelete={async () => { await deleteMedia(m.id); toast.success('Removed.'); await load(); await onSaved() }}
            />
          ))}
        </div>
      )}

      {adding && (
        <LinkMedia
          onClose={() => setAdding(false)}
          onAdd={async payload => {
            await addMedia(product.id, payload)
            setAdding(false)
            toast.success('Added.')
            await load()
          }}
        />
      )}
    </div>
  )
}

const SOURCE_BADGE = {
  actual: ['bg-emerald-100 text-emerald-700', 'Real photo'],
  vendor: ['bg-blue-100 text-blue-700', 'From the maker'],
  stock:  ['bg-gray-100 text-gray-600', 'Lookalike'],
  ai:     ['bg-purple-100 text-purple-700', 'AI-made'],
  link:   ['bg-gray-100 text-gray-600', 'Linked'],
}

function MediaCard({ media: m, index, total, isPrimary, onUp, onDown, onPrimary, onCaption, onDelete }) {
  const [caption, setCaption] = useState(m.caption ?? '')
  const [badge, label] = SOURCE_BADGE[m.source] ?? SOURCE_BADGE.stock

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="relative aspect-video bg-gray-900">
        {m.kind === 'video' ? (
          <video src={m.url} poster={m.poster_url ?? undefined} controls preload="metadata"
            className="h-full w-full object-cover" />
        ) : (
          <img src={m.url} alt={m.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
        )}
        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${badge}`}>
          {m.kind === 'video' ? '▶ ' : ''}{label}
        </span>
        {isPrimary && (
          <span className="absolute right-2 top-2 rounded bg-plum-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            Tile photo
          </span>
        )}
      </div>

      <div className="space-y-2 p-2.5">
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onBlur={() => caption !== (m.caption ?? '') && onCaption(caption.trim() || null)}
          placeholder="Caption (optional)"
          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-plum-400 focus:outline-none"
        />
        <div className="flex items-center gap-1">
          <button onClick={onUp} disabled={index === 0}
            className="rounded p-1 text-gray-400 hover:text-plum-700 disabled:opacity-25" aria-label="Move earlier">
            <ChevronUp size={14} />
          </button>
          <button onClick={onDown} disabled={index === total - 1}
            className="rounded p-1 text-gray-400 hover:text-plum-700 disabled:opacity-25" aria-label="Move later">
            <ChevronDown size={14} />
          </button>
          {m.kind === 'image' && !isPrimary && (
            <button onClick={onPrimary} className="ml-1 text-[11px] font-bold text-plum-700 hover:underline">
              Use as tile photo
            </button>
          )}
          <button onClick={onDelete} className="ml-auto rounded p-1 text-gray-300 hover:text-red-600" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function LinkMedia({ onClose, onAdd }) {
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState('image')
  const [source, setSource] = useState('link')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-2xl border border-plum-200 bg-plum-50/40 p-4">
      <h4 className="text-sm font-extrabold text-plum-950">Add from a link</h4>
      <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">
        Only use a link you have the right to publish — the maker's own photo, or something
        you've bought. A picture taken from another shop's website is theirs, not ours.
      </p>
      <div className="mt-3 space-y-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={e => setKind(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold">
            <option value="image">Photo</option>
            <option value="video">Clip</option>
          </select>
          <select value={source} onChange={e => setSource(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold">
            <option value="link">Linked elsewhere</option>
            <option value="vendor">From the maker</option>
            <option value="stock">Stock lookalike</option>
            <option value="ai">Made with AI</option>
          </select>
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption"
            className="min-w-32 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500">Cancel</button>
          <button
            disabled={busy || !/^https?:\/\//.test(url)}
            onClick={async () => {
              setBusy(true)
              await onAdd({ kind, url: url.trim(), source, caption: caption.trim() || null })
              setBusy(false)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Story
   ══════════════════════════════════════════════════════════════════════ */

function StoryTab({ product, installed }) {
  const toast = useToast()
  const [own, setOwn] = useState([])
  const [inherited, setInherited] = useState([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [mine, resolved] = await Promise.all([
      fetchStory({ productId: product.id, scope: 'product' }),
      fetchStory({ productId: product.id, category: product.category, scope: 'resolved' }),
    ])
    setOwn(mine.slides)
    setInherited(resolved.slides.filter(s => s.product_id !== product.id))
    setReady(mine.installed)
    setLoading(false)
  }, [product.id, product.category])

  useEffect(() => { load() }, [load])

  if (!installed || !ready) return <NeedsMigration what="The story slides" />

  const usedScenes = new Set(own.map(s => s.scene))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-plum-100 bg-plum-50/40 p-3 text-xs leading-relaxed text-plum-900">
        <strong>This is the part that sells it.</strong> A photograph says what the thing is; these
        slides say what it is like to receive it — how it arrives wrapped, the face of the person it
        was for, that it can be there this evening. The customer swipes through them on the product page.
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          {inherited.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Inherited — written once for the whole shelf or shop
              </p>
              <div className="space-y-2">
                {inherited.map(s => <SlideRow key={s.id} slide={s} inherited />)}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Written for this product
              </p>
              {own.length === 0 && (
                <button
                  onClick={async () => {
                    try {
                      await importSlides(storyTemplate({ productId: product.id, productName: product.name }))
                      toast.success('Three slides to edit — change the words to fit this product.')
                      await load()
                    } catch (err) { toast.error(friendlyError(err, 'Could not add those.')) }
                  }}
                  className="text-[11px] font-bold text-plum-700 hover:underline"
                >
                  Start from a template
                </button>
              )}
            </div>

            {own.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                Nothing yet. This product shows the inherited slides above.
              </p>
            ) : (
              <div className="space-y-2">
                {own.map(s => (
                  <SlideRow
                    key={s.id} slide={s}
                    onEdit={() => setEditing(s)}
                    onDelete={async () => { await deleteSlide(s.id); toast.success('Removed.'); await load() }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SCENES.filter(s => s.id === 'custom' || !usedScenes.has(s.id)).map(s => (
              <button
                key={s.id}
                onClick={() => setEditing({ scene: s.id, icon: s.icon, accent: s.accent, product_id: product.id, sort_order: (own.length + 1) * 10 })}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-plum-400 hover:text-plum-700"
              >
                <Plus size={12} /> {s.icon} {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <SlideEditor
          slide={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load() }}
        />
      )}
    </div>
  )
}

const ACCENT_DOT = {
  saffron: 'bg-saffron-400', plum: 'bg-plum-500', emerald: 'bg-emerald-500',
  rose: 'bg-rose-400', ink: 'bg-gray-700',
}

function SlideRow({ slide, inherited, onEdit, onDelete }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${inherited ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200 bg-white'}`}>
      <span className="text-xl">{slide.icon ?? SCENE_BY_ID[slide.scene]?.icon ?? '✨'}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {slide.kicker && <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{slide.kicker}</span>}
          <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[slide.accent] ?? 'bg-gray-300'}`} />
        </div>
        <p className="text-sm font-bold text-plum-950">{slide.title}</p>
        {slide.body && <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{slide.body}</p>}
      </div>
      {inherited ? (
        <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
          {slide.category ? 'Shelf' : 'Shop'}
        </span>
      ) : (
        <div className="flex shrink-0 gap-0.5">
          <button onClick={onEdit} className="rounded p-1 text-gray-400 hover:text-plum-700" aria-label="Edit"><SlidersHorizontal size={13} /></button>
          <button onClick={onDelete} className="rounded p-1 text-gray-300 hover:text-red-600" aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  )
}

function SlideEditor({ slide, onClose, onSaved }) {
  const toast = useToast()
  const scene = SCENE_BY_ID[slide.scene] ?? SCENE_BY_ID.custom
  const [form, setForm] = useState({
    kicker: slide.kicker ?? '', title: slide.title ?? '', body: slide.body ?? '',
    icon: slide.icon ?? scene.icon, accent: slide.accent ?? scene.accent,
    image_url: slide.image_url ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [makingArt, setMakingArt] = useState(false)

  return (
    <div className="rounded-2xl border border-plum-300 bg-white p-4 shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-extrabold text-plum-950">{scene.icon} {scene.label}</h4>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700"><X size={15} /></button>
      </div>
      {/* The prompt is the whole reason the scenes are named. A blank box gets
          left blank; a box that asks a question gets answered. */}
      <p className="mb-3 rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">{scene.prompt}</p>

      <div className="space-y-2.5">
        <Field label="Small line above the title" hint="Optional">
          <input value={form.kicker} onChange={e => setForm({ ...form, kicker: e.target.value })}
            placeholder="e.g. Before it leaves us" className={inputCls} />
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Wrapped like it matters" className={inputCls} />
        </Field>
        <Field label="The two or three lines under it">
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Icon">
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} maxLength={4}
              className={`${inputCls} text-center text-lg`} />
          </Field>
          <Field label="Colour">
            <select value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} className={inputCls}>
              {ACCENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Background photo" hint="Optional — paste the URL of a photo you already uploaded">
          <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className={inputCls} />
        </Field>

        {/* A story slide is the one place a generated picture is exactly
            right: it illustrates a feeling, not a product. */}
        {!makingArt ? (
          <button
            onClick={() => setMakingArt(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-plum-700 hover:underline"
          >
            <Wand2 size={13} /> Make a background with AI
          </button>
        ) : (
          <MediaGenerator
            compact
            allowVideo={false}
            aspect="4:5"
            onClose={() => setMakingArt(false)}
            onDone={async ({ url }) => { setForm(f => ({ ...f, image_url: url })); setMakingArt(false) }}
          />
        )}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-500">Cancel</button>
        <button
          disabled={busy || !form.title.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              await saveSlide({ ...slide, ...form })
              toast.success('Saved.')
              await onSaved()
            } catch (err) {
              toast.error(friendlyError(err, 'Could not save that slide.'))
            } finally { setBusy(false) }
          }}
          className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save slide
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Questions
   ══════════════════════════════════════════════════════════════════════ */

function FaqTab({ product, installed }) {
  const toast = useToast()
  const [own, setOwn] = useState([])
  const [inherited, setInherited] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [bulk, setBulk] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [mine, all] = await Promise.all([
      fetchFaqs({ productId: product.id, scope: 'product' }),
      fetchFaqs({ productId: product.id, category: product.category, scope: 'resolved' }),
    ])
    setOwn(mine.faqs)
    setInherited(all.faqs.filter(f => f.product_id !== product.id))
    setReady(mine.installed)
    setLoading(false)
  }, [product.id, product.category])

  useEffect(() => { load() }, [load])

  if (!installed || !ready) return <NeedsMigration what="The questions block" />

  const parsed = parseFaqBulk(bulk)

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">About this product</p>
              <button
                onClick={() => setEditing({ product_id: product.id, sort_order: (own.length + 1) * 10 })}
                className="flex items-center gap-1 text-[11px] font-bold text-plum-700 hover:underline"
              >
                <Plus size={12} /> Add a question
              </button>
            </div>
            {own.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-xs text-gray-500">
                None yet. The answers below apply to this product already.
              </p>
            ) : (
              <div className="space-y-2">
                {own.map(f => (
                  <FaqRow key={f.id} faq={f} onEdit={() => setEditing(f)}
                    onDelete={async () => { await deleteFaq(f.id); await load() }} />
                ))}
              </div>
            )}
          </div>

          {inherited.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Answered once, for the whole shelf or shop
              </p>
              <div className="space-y-2">
                {inherited.map(f => <FaqRow key={f.id} faq={f} inherited />)}
              </div>
            </div>
          )}

          <details className="rounded-xl border border-gray-200 p-3">
            <summary className="cursor-pointer text-xs font-bold text-gray-600">
              Paste several at once
            </summary>
            <p className="mt-2 text-[11px] text-gray-500">
              One per line as <code className="font-mono">Question | Answer</code>, or a blank line
              between each with the question on the first line.
            </p>
            <textarea
              value={bulk} onChange={e => setBulk(e.target.value)} rows={5}
              placeholder="Is it eggless? | Every cake can be made eggless — choose it at checkout."
              className="mt-2 w-full rounded-lg border border-gray-200 p-2 font-mono text-[11px] focus:border-plum-400 focus:outline-none"
            />
            {parsed.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    await importFaqs(parsed, { product_id: product.id })
                    toast.success(`${parsed.length} added.`)
                    setBulk('')
                    await load()
                  } catch (err) { toast.error(friendlyError(err, 'Could not add those.')) }
                }}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-plum-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-plum-700"
              >
                <Plus size={12} /> Add {parsed.length}
              </button>
            )}
          </details>
        </>
      )}

      {editing && (
        <FaqEditor
          faq={editing}
          category={product.category}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load() }}
        />
      )}
    </div>
  )
}

function FaqRow({ faq, inherited, onEdit, onDelete }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${inherited ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200'}`}>
      <MessageSquare size={14} className="mt-0.5 shrink-0 text-plum-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-plum-950">{faq.question}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{faq.answer}</p>
      </div>
      {inherited ? (
        <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
          {faq.category ? 'Shelf' : 'Shop'}
        </span>
      ) : (
        <div className="flex shrink-0 gap-0.5">
          <button onClick={onEdit} className="rounded p-1 text-gray-400 hover:text-plum-700"><SlidersHorizontal size={13} /></button>
          <button onClick={onDelete} className="rounded p-1 text-gray-300 hover:text-red-600"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  )
}

function FaqEditor({ faq, category, onClose, onSaved }) {
  const toast = useToast()
  const [question, setQuestion] = useState(faq.question ?? '')
  const [answer, setAnswer] = useState(faq.answer ?? '')
  // Whether this answer belongs to the product or to its whole shelf. Offered
  // here because "is it eggless?" is a cake question, not a question about one
  // cake — and answering it forty times is how it stops getting answered.
  const [scope, setScope] = useState(faq.category ? 'category' : 'product')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-2xl border border-plum-300 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-extrabold text-plum-950">{faq.id ? 'Edit' : 'New'} question</h4>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700"><X size={15} /></button>
      </div>
      <div className="space-y-2.5">
        <Field label="Question">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="What a customer would actually type" className={inputCls} />
        </Field>
        <Field label="Answer">
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="Where does this apply?">
          <select value={scope} onChange={e => setScope(e.target.value)} className={inputCls}>
            <option value="product">Only this product</option>
            <option value="category">Every product on the {category} shelf</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-500">Cancel</button>
        <button
          disabled={busy || !question.trim() || !answer.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              await saveFaq({
                ...faq, question, answer,
                product_id: scope === 'product' ? (faq.product_id ?? null) : null,
                category: scope === 'category' ? category : null,
              })
              toast.success('Saved.')
              await onSaved()
            } catch (err) {
              toast.error(friendlyError(err, 'Could not save that.'))
            } finally { setBusy(false) }
          }}
          className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Rating
   ══════════════════════════════════════════════════════════════════════ */

function RatingTab({ product, installed, onSaved }) {
  const toast = useToast()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [seed, setSeed] = useState(product.seed_rating ?? '')
  const [seedCount, setSeedCount] = useState(product.seed_rating_count ?? '')
  const [busy, setBusy] = useState(false)
  const [replyingId, setReplyingId] = useState(null)
  const [reply, setReply] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setReviews(await fetchProductReviews(product.id)) }
    catch { setReviews([]) }
    setLoading(false)
  }, [product.id])

  useEffect(() => { load() }, [load])

  const real = reviews.length
  const avg = real ? reviews.reduce((s, r) => s + r.rating, 0) / real : 0

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">What customers said</p>
        {real > 0 ? (
          <p className="mt-1 text-2xl font-extrabold text-plum-950">
            {avg.toFixed(1)} <span className="text-amber-400">★</span>
            <span className="ml-2 text-sm font-bold text-gray-400">from {real} review{real === 1 ? '' : 's'}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">No reviews yet — nothing has been delivered and rated.</p>
        )}
      </div>

      {/* The honest version of "let the admin set a rating". */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
        <h4 className="text-sm font-extrabold text-amber-900">Starting rating, before there are customers</h4>
        <p className="mt-1 text-xs leading-relaxed text-amber-900">
          A brand-new shop shows no stars, and an empty rating reads as "nobody liked this" rather than
          "nobody has bought this yet". You can set a starting number here. It shows on the storefront
          labelled <strong>Editorial rating</strong>, not as customer reviews — and the moment one real
          review arrives, that real average replaces it completely.
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-amber-800">
          It is deliberately not possible to write a fake customer review here. A made-up review with a
          name and a date on it can't be told apart from a real one afterwards — not by a customer, and
          not by you.
        </p>

        {real > 0 && (
          <p className="mt-2 rounded-lg bg-white/70 p-2 text-[11px] font-semibold text-amber-900">
            This product has real reviews now, so the starting rating is no longer shown anywhere.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Stars (1–5)">
            <input type="number" min="1" max="5" step="0.1" value={seed}
              onChange={e => setSeed(e.target.value)} className={`${inputCls} w-24`} />
          </Field>
          <Field label="Shown as" hint="Optional count beside it">
            <input type="number" min="0" value={seedCount}
              onChange={e => setSeedCount(e.target.value)} className={`${inputCls} w-24`} />
          </Field>
          <button
            disabled={busy || !installed}
            onClick={async () => {
              setBusy(true)
              try {
                await setSeedRating(product.id, seed === '' ? null : seed, seedCount === '' ? null : seedCount)
                toast.success(seed === '' ? 'Starting rating removed.' : 'Saved.')
                await onSaved()
              } catch (err) {
                toast.error(friendlyError(err, 'Could not save that.'))
              } finally { setBusy(false) }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          {seed !== '' && (
            <button onClick={() => { setSeed(''); setSeedCount('') }}
              className="text-xs font-semibold text-amber-800 hover:underline">Clear</button>
          )}
        </div>
        {!installed && <p className="mt-2 text-[11px] font-semibold text-amber-800">Needs migration 051.</p>}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Reviews & your replies</p>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ) : reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
            Nothing to reply to yet.
          </p>
        ) : (
          <div className="space-y-2">
            {reviews.map(r => (
              <div key={r.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{r.customer_name}</p>
                  <span className="shrink-0 text-sm font-bold text-amber-500">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-xs leading-relaxed text-gray-700">{r.comment}</p>}

                {r.admin_reply && replyingId !== r.id && (
                  <div className="mt-2 rounded-r-lg border-l-2 border-plum-200 bg-plum-50/50 py-1.5 pl-3 pr-2">
                    <p className="text-[10px] font-bold text-plum-700">Your reply</p>
                    <p className="text-xs text-gray-600">{r.admin_reply}</p>
                  </div>
                )}

                {replyingId === r.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-plum-400 focus:outline-none" />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await replyToReview(r.id, reply)
                            toast.success('Reply published.')
                            setReplyingId(null)
                            await load()
                          } catch (err) { toast.error(friendlyError(err, 'Could not save the reply.')) }
                        }}
                        className="rounded-lg bg-plum-600 px-3 py-1 text-xs font-bold text-white hover:bg-plum-700"
                      >Publish</button>
                      <button onClick={() => setReplyingId(null)} className="text-xs font-semibold text-gray-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingId(r.id); setReply(r.admin_reply ?? '') }}
                    className="mt-2 text-[11px] font-bold text-plum-700 hover:underline"
                  >
                    {r.admin_reply ? 'Edit your reply' : 'Reply'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shared ──────────────────────────────────────────────────────────── */

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none'

function Field({ label, hint, children, full }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  )
}

function ListEditor({ label, hint, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-700">{label}</p>
      {hint && <p className="mb-2 text-[11px] text-gray-400">{hint}</p>}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={e => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
              className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
            />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded p-1 text-gray-300 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault(); onChange([...items, draft.trim()]); setDraft('')
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
          />
          <button
            onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft('') } }}
            className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-plum-100 hover:text-plum-700"
          ><Plus size={14} /></button>
        </div>
      </div>
    </div>
  )
}

function SpecEditor({ specs, onChange }) {
  const entries = Object.entries(specs ?? {})
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-700">Spec table</p>
      <p className="mb-2 text-[11px] text-gray-400">
        Whatever this product needs — “Weight: 1 kg”, “Loom: Molakalmuru”, “Serves: 8–10”.
      </p>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <input
              value={k} readOnly
              className="w-40 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm font-semibold text-gray-600"
            />
            <input
              value={v}
              onChange={e => onChange({ ...specs, [k]: e.target.value })}
              className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none"
            />
            <button
              onClick={() => { const next = { ...specs }; delete next[k]; onChange(next) }}
              className="rounded p-1 text-gray-300 hover:text-red-600"
            ><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label"
            className="w-40 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none" />
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="Value"
            className="flex-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none" />
          <button
            onClick={() => {
              if (label.trim() && value.trim()) {
                onChange({ ...specs, [label.trim()]: value.trim() }); setLabel(''); setValue('')
              }
            }}
            className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-plum-100 hover:text-plum-700"
          ><Plus size={14} /></button>
        </div>
      </div>
    </div>
  )
}

function NeedsMigration({ what }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center">
      <AlertTriangle size={22} className="mx-auto text-amber-600" />
      <p className="mt-2 text-sm font-bold text-amber-900">{what} needs one file run once</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-amber-800">
        Open the Supabase dashboard → SQL Editor, paste the contents of{' '}
        <code className="rounded bg-amber-100 px-1 font-mono">supabase/migrations/051_product_studio.sql</code>{' '}
        and run it. Everything else on this screen keeps working until you do.
      </p>
    </div>
  )
}
