import { useState, useMemo } from 'react'
import {
  Plus, Save, Loader2, X, Store, PartyPopper, Eye, EyeOff, ChevronUp, ChevronDown,
  AlertTriangle, Sparkles, Check, Database,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { saveCategory, renameCategory } from '../../lib/shopCategories'
import { suggestShelves } from '../../lib/aiCatalog'
import { Modal, Field } from './ProductStudio'

/**
 * The shelves — the shop's, and the celebration side's.
 *
 * ── Why this screen is possible at all ───────────────────────────────────
 * Until migration 051 the category list was two things at once: a constant in
 * `config/shop.js` and a CHECK constraint on `products.category`. Adding a
 * shelf meant editing both and deploying — which is to say it was not
 * something the person running the shop could do. 051 turns the list into a
 * table and drops the constraint, and this is the form over it.
 *
 * ── The one irreversible field ───────────────────────────────────────────
 * A shelf's id is the literal string stored on every product, on every past
 * order line, and in every /shop/:category URL. Renaming it is a data
 * migration, not an edit — so the name is set once at creation, shown as
 * fixed afterwards, and moved only through the deliberate "rename everything"
 * path, which says out loud how many products it is about to move.
 */

export default function ShelfManager({ categories, products, onChanged }) {
  const toast = useToast()
  const [kind, setKind] = useState('shop')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  const counts = useMemo(() => {
    const out = {}
    for (const p of products) out[p.category] = (out[p.category] ?? 0) + 1
    return out
  }, [products])

  const shown = categories
    .filter(c => (c.kind ?? 'shop') === kind)
    .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100))

  const unsaved = shown.filter(c => c._source === 'config').length

  async function move(cat, direction) {
    const i = shown.findIndex(c => c.id === cat.id)
    const j = direction === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= shown.length) return
    try {
      // Both rows are written because a config-only shelf has no sort_order in
      // the database yet — swapping one would leave the pair equal and the
      // order decided by the tie-break on label.
      await saveCategory({ ...cat, sort_order: (shown[j].sort_order ?? (j + 1) * 10) })
      await saveCategory({ ...shown[j], sort_order: (cat.sort_order ?? (i + 1) * 10) })
      await onChanged()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not reorder those.'))
    }
  }

  async function toggleActive(cat) {
    try {
      await saveCategory({ ...cat, is_active: cat.is_active === false })
      toast.success(cat.is_active === false ? 'Back on the storefront.' : 'Hidden from the storefront.')
      await onChanged()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change that.'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-plum-50/60 to-transparent p-5">
          <div>
            <h2 className="text-lg font-extrabold text-plum-950">Shelves</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              The sections a customer browses. Add one, rename it, reorder them, take one down for a season.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSuggesting(true)}
              className="flex items-center gap-1.5 rounded-xl border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-700 hover:border-plum-400"
            >
              <Sparkles size={15} /> Suggest shelves
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-plum-700"
            >
              <Plus size={15} /> Add a shelf
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-4">
          <KindTab active={kind === 'shop'} onClick={() => setKind('shop')} icon={Store} label="Shop shelves" />
          <KindTab active={kind === 'celebration'} onClick={() => setKind('celebration')} icon={PartyPopper} label="Celebration categories" />
        </div>
      </div>

      {unsaved > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
          <Database size={16} className="mt-0.5 shrink-0 text-blue-600" />
          <p className="text-xs leading-relaxed text-blue-900">
            {unsaved} of these {unsaved === 1 ? 'shelf is' : 'shelves are'} still defined in code rather
            than in the database. They work exactly as they always have — editing one here writes it to
            the database for the first time, and nothing changes for customers.
          </p>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-3xl">{kind === 'shop' ? '🏬' : '🎉'}</p>
          <p className="mt-2 font-bold text-gray-800">No {kind === 'shop' ? 'shop shelves' : 'celebration categories'} yet</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-sm font-bold text-plum-700 hover:underline">
            Add the first one
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((c, i) => (
            <div
              key={c.id}
              className={`card flex items-center gap-3 p-3 ${c.is_active === false ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-col">
                <button onClick={() => move(c, 'up')} disabled={i === 0}
                  className="rounded p-0.5 text-gray-300 hover:text-plum-700 disabled:opacity-25" aria-label="Move up">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => move(c, 'down')} disabled={i === shown.length - 1}
                  className="rounded p-0.5 text-gray-300 hover:text-plum-700 disabled:opacity-25" aria-label="Move down">
                  <ChevronDown size={14} />
                </button>
              </div>

              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-50 text-xl">
                {c.emoji ?? '🛍️'}
              </span>

              <button onClick={() => setEditing(c)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-2 text-sm font-bold text-plum-950">
                  {c.label}
                  {c.is_active === false && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-extrabold text-gray-500">Hidden</span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500">{c.tagline ?? 'No tagline yet'}</p>
              </button>

              <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
                {counts[c.id] ?? 0} items
              </span>

              <button
                onClick={() => toggleActive(c)}
                className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-plum-700"
                aria-label={c.is_active === false ? 'Show' : 'Hide'}
                title={c.is_active === false ? 'Put back on the storefront' : 'Hide from the storefront'}
              >
                {c.is_active === false ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ShelfEditor
          shelf={editing ?? { kind, sort_order: (shown.length + 1) * 10 }}
          isNew={creating}
          productCount={editing ? (counts[editing.id] ?? 0) : 0}
          existingIds={categories.map(c => c.id)}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={async () => { setEditing(null); setCreating(false); await onChanged() }}
        />
      )}

      {suggesting && (
        <SuggestShelves
          categories={categories}
          onClose={() => setSuggesting(false)}
          onSaved={async n => {
            setSuggesting(false)
            toast.success(`${n} shelf${n === 1 ? '' : 'ves'} added.`)
            await onChanged()
          }}
        />
      )}
    </div>
  )
}

function KindTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${
        active ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-200 text-gray-600 hover:border-plum-300'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  )
}

function ShelfEditor({ shelf, isNew, productCount, existingIds, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    id: shelf.id ?? '',
    label: shelf.label ?? '',
    emoji: shelf.emoji ?? '🛍️',
    tagline: shelf.tagline ?? '',
    blurb: shelf.blurb ?? '',
    kind: shelf.kind ?? 'shop',
    is_active: shelf.is_active !== false,
    sort_order: shelf.sort_order ?? 100,
  })
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newId, setNewId] = useState('')

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const idTaken = isNew && existingIds.includes(form.id.trim())

  async function save() {
    setBusy(true)
    try {
      await saveCategory({ ...shelf, ...form, id: (isNew ? form.id : shelf.id).trim() })
      toast.success(isNew ? 'Shelf added.' : 'Saved.')
      await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save that shelf.'))
    } finally { setBusy(false) }
  }

  async function doRename() {
    setBusy(true)
    try {
      await renameCategory(shelf.id, newId.trim(), { label: form.label })
      toast.success(`Moved ${productCount} product${productCount === 1 ? '' : 's'} onto "${newId.trim()}".`)
      await onSaved()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not rename that shelf.'))
    } finally { setBusy(false) }
  }

  return (
    <Modal title={isNew ? 'Add a shelf' : `Edit “${shelf.label}”`} onClose={onClose}>
      <div className="space-y-3">
        {isNew ? (
          <Field
            label="Name"
            hint="This is permanent — it becomes the web address and is stored on every product filed under it."
          >
            <input
              autoFocus value={form.id}
              onChange={e => set({ id: e.target.value, label: form.label || e.target.value })}
              placeholder="e.g. Wedding Trousseau"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none"
            />
            {idTaken && <span className="mt-1 block text-[11px] font-semibold text-red-600">There is already a shelf with that name.</span>}
          </Field>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Name</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-gray-700">{shelf.id}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              Fixed, because it is written on {productCount} product{productCount === 1 ? '' : 's'}, on
              every past order line, and in the web address customers may have bookmarked. Changing the
              display name below is safe and is usually what you want.
            </p>
            {!renaming ? (
              <button onClick={() => { setRenaming(true); setNewId(shelf.id) }}
                className="mt-1.5 text-[11px] font-bold text-plum-700 hover:underline">
                I really do need to rename it
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <input value={newId} onChange={e => setNewId(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-sm focus:border-plum-400 focus:outline-none" />
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  This moves all {productCount} product{productCount === 1 ? '' : 's'} onto the new name and
                  changes the shelf's web address. Past orders keep the name they were bought under, so your
                  old numbers still add up.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={doRename}
                    disabled={busy || !newId.trim() || newId.trim() === shelf.id}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40"
                  >
                    {busy ? 'Moving…' : 'Rename and move everything'}
                  </button>
                  <button onClick={() => setRenaming(false)} className="text-xs font-semibold text-gray-500">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Field label="Display name" hint="What customers actually read">
            <input value={form.label} onChange={e => set({ label: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
          </Field>
          <Field label="Emoji">
            <input value={form.emoji} onChange={e => set({ emoji: e.target.value })} maxLength={4}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center text-lg focus:border-plum-400 focus:outline-none" />
          </Field>
        </div>

        <Field label="Tagline" hint="One line under the shelf's heading">
          <input value={form.tagline} onChange={e => set({ tagline: e.target.value })}
            placeholder="e.g. Fresh bouquets, delivered same-day"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
        </Field>

        <Field label="Longer description" hint="Optional">
          <textarea value={form.blurb} onChange={e => set({ blurb: e.target.value })} rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-plum-400 focus:outline-none" />
        </Field>

        {isNew && (
          <Field label="Where does it live?">
            <select value={form.kind} onChange={e => set({ kind: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-plum-400 focus:outline-none">
              <option value="shop">The shop — things people buy</option>
              <option value="celebration">The planning side — things people book</option>
            </select>
          </Field>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || !(isNew ? form.id.trim() : true) || idTaken || !form.label.trim()}
            className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SuggestShelves({ categories, onClose, onSaved }) {
  const toast = useToast()
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [picked, setPicked] = useState(() => new Set())

  async function run() {
    setBusy(true)
    try {
      const res = await suggestShelves({ instructions, categories: categories.map(c => c.id) })
      setResult(res)
      setPicked(new Set())
    } catch (err) {
      toast.error(friendlyError(err, 'Could not suggest anything.'))
    } finally { setBusy(false) }
  }

  async function add() {
    setBusy(true)
    try {
      const chosen = result.categories.filter(c => picked.has(c.id))
      for (const [i, c] of chosen.entries()) {
        await saveCategory({ ...c, sort_order: (categories.length + i + 1) * 10, is_active: true })
      }
      await onSaved(chosen.length)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not add those.'))
    } finally { setBusy(false) }
  }

  return (
    <Modal title="Suggest shelves" onClose={onClose} wide>
      <div className="space-y-3">
        {!result ? (
          <>
            <p className="rounded-xl border border-plum-100 bg-plum-50/50 p-3 text-xs leading-relaxed text-plum-900">
              Describe what the business sells, or what you want to start selling. It will propose shelves
              that don't already exist — and you pick which ones are worth having.
            </p>
            <textarea
              value={instructions} onChange={e => setInstructions(e.target.value)} rows={4}
              placeholder="e.g. We want to move into wedding trousseau and corporate gifting for Bengaluru tech offices."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-plum-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              <button
                onClick={run} disabled={busy || !instructions.trim()}
                className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Suggest
              </button>
            </div>
          </>
        ) : (
          <>
            {result.warnings?.length > 0 && (
              <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900">{result.warnings.join(' · ')}</p>
            )}
            <div className="space-y-2">
              {result.categories.map(c => {
                const on = picked.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => setPicked(prev => {
                      const next = new Set(prev)
                      next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                      return next
                    })}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      on ? 'border-plum-500 bg-plum-50' : 'border-gray-200 hover:border-plum-300'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${
                      on ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-300'
                    }`}>{on && <Check size={12} strokeWidth={3} />}</span>
                    <span className="text-xl">{c.emoji ?? '🛍️'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-plum-950">
                        {c.label}
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                          {c.kind === 'celebration' ? 'Planning' : 'Shop'}
                        </span>
                      </span>
                      {c.tagline && <span className="block text-xs text-gray-600">{c.tagline}</span>}
                      {c.reason && <span className="mt-1 block text-[11px] leading-relaxed text-gray-500">{c.reason}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button onClick={() => setResult(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500">
                ← Ask again
              </button>
              <button
                onClick={add} disabled={busy || picked.size === 0}
                className="flex items-center gap-2 rounded-xl bg-plum-600 px-4 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add {picked.size}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
