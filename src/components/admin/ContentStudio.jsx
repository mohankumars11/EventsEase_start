import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Loader2, AlertCircle, Camera, Upload, Trash2, Plus, Check, X, Pencil,
  Search, RefreshCw, EyeOff, Eye, ArrowLeft, ChevronUp, ChevronDown,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { INK, STATUS, CATEGORICAL } from '../../config/dataviz'
import {
  CONTENT_KINDS, KIND_BY_ID, fetchKind, fetchKindCounts, syncKind,
  createItem, updateItem, setActive, deleteItem, reorder,
  uploadItemImage, removeItemImage, isMissingTable, isMissingKindColumn, slugify,
} from '../../lib/contentStudio'
import ImageSourceBadge from '../shop/ImageSourceBadge'
import { SectionHead, EmptyNote, Meter, StatTile } from './viz/Primitives'

/**
 * One screen for everything a customer can see.
 *
 * ── Why it exists ────────────────────────────────────────────────────────
 * The shop became editable in migration 025 and event services in 037. Six
 * content types were still frozen in JavaScript: the decor themes, the decor
 * levels, the cuisines, the eight celebration tiers, the festival pages and
 * the offers rail. Every one of them is customer-facing, and every one of them
 * needed a developer and a deploy to change a word or add a photograph.
 *
 * ── One screen, seven kinds ──────────────────────────────────────────────
 * Driven by the registry in lib/contentStudio, not by seven bespoke editors.
 * They are all the same shape underneath — name, emoji, copy, picture, price,
 * order, on/off — and the parts that differ are declared as `fields` and
 * stored in `payload`. Seven screens would have been seven things to keep in
 * step; this is one, and adding an eighth kind is a registry entry.
 *
 * ── It says what it does not own ─────────────────────────────────────────
 * Some numbers here are computed with by the quote engine and read from code,
 * not from this table. Rather than making those fields look editable and
 * quietly ignoring the edit, each kind declares `engineOwns` and the editor
 * prints the warning inline, naming the file. A field that lies about being
 * editable is worse than a field that is missing.
 */

export default function ContentStudio({ onNavigate }) {
  const [kind, setKind] = useState(null)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [kindMissing, setKindMissing] = useState(false)

  const loadCounts = useCallback(async () => {
    setLoading(true)
    try {
      setCounts(await fetchKindCounts())
      setTableMissing(false)
      setKindMissing(false)
    } catch (err) {
      if (isMissingTable(err)) setTableMissing(true)
      else if (isMissingKindColumn(err)) setKindMissing(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCounts() }, [loadCounts])

  if (tableMissing || kindMissing) {
    return <MigrationNotice kindMissing={kindMissing} onRetry={loadCounts} />
  }

  if (kind) {
    return (
      <KindEditor
        kind={kind}
        onBack={() => { setKind(null); loadCounts() }}
      />
    )
  }

  const totals = Object.values(counts).reduce(
    (a, c) => ({ total: a.total + c.total, photos: a.photos + c.photos, real: a.real + c.real }),
    { total: 0, photos: 0, real: 0 },
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Things you can edit" value={totals.total} sub="across every kind" />
        <StatTile label="With a photograph" value={totals.photos} sub={`of ${totals.total}`}
                  tone={totals.photos === 0 ? STATUS.serious : undefined} />
        <StatTile label="Real work, photographed" value={totals.real} sub="not a stock lookalike" />
        <StatTile label="Kinds of content" value={CONTENT_KINDS.length}
                  onClick={() => onNavigate?.('catalog')} sub="shop products are separate →" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
          <Loader2 className="animate-spin text-plum-600" size={24} />
          <span className="text-sm">Counting…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {CONTENT_KINDS.map(k => {
            const c = counts[k.id] ?? { total: 0, active: 0, photos: 0, real: 0 }
            return (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className="card p-4 text-left hover:border-plum-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl" aria-hidden="true">{k.emoji}</span>
                  <span className="text-lg font-bold" style={{ color: INK.primary }}>
                    {c.total}
                    {c.total > 0 && c.active < c.total && (
                      <span className="text-xs font-medium" style={{ color: INK.muted }}> · {c.active} live</span>
                    )}
                  </span>
                </div>
                <p className="font-bold text-gray-900 text-sm mt-2">{k.label}</p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: INK.secondary }}>{k.blurb}</p>
                <p className="text-[10px] mt-2" style={{ color: INK.muted }}>Seen on: {k.surface}</p>

                {c.total === 0 ? (
                  <p className="text-[11px] mt-2 font-semibold" style={{ color: STATUS.serious }}>
                    Not imported yet — open to bring in the built-ins.
                  </p>
                ) : (
                  <div className="mt-2.5">
                    <Meter
                      value={c.photos} max={c.total}
                      caption={`${c.photos}/${c.total} photographed`}
                      fill={c.photos === c.total ? STATUS.good : CATEGORICAL[0]}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── The pre-migration state ───────────────────────────────────────────── */

function MigrationNotice({ kindMissing, onRetry }) {
  return (
    <div className="space-y-5">
      <div className="card p-6 border-amber-200 bg-amber-50/40">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">
              {kindMissing ? 'One more migration.' : 'Two migrations away.'}
            </h3>
            <p className="text-sm text-gray-700 mt-1.5 max-w-prose">
              {kindMissing
                ? <>The content table exists but has no <code className="px-1 rounded bg-white border border-amber-200 text-[12px]">kind</code> column yet, so it can still only hold event services.</>
                : <>This screen needs the <code className="px-1 rounded bg-white border border-amber-200 text-[12px]">service_catalog</code> table and its <code className="px-1 rounded bg-white border border-amber-200 text-[12px]">kind</code> column.</>}
              {' '}Migrations run by hand here and <strong>a deploy does not run them</strong>.
            </p>
            <ol className="text-sm text-gray-700 mt-3 space-y-1.5 list-decimal list-inside">
              <li>Open <strong>Supabase Dashboard → SQL Editor</strong>.</li>
              {!kindMissing && (
                <li>Run <code className="px-1 rounded bg-white border border-amber-200 text-[12px]">037_service_catalog_and_product_lifecycle.sql</code>.</li>
              )}
              <li>Run <code className="px-1 rounded bg-white border border-amber-200 text-[12px]">040_content_catalog.sql</code>. Both are safe to re-run.</li>
              <li>Come back and press <strong>Import the built-ins</strong> on each kind.</li>
            </ol>
            <button onClick={onRetry}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-white text-xs font-semibold hover:bg-plum-700">
              <RefreshCw size={12} /> Check again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Editing one kind ──────────────────────────────────────────────────── */

function KindEditor({ kind, onBack }) {
  const toast = useToast()
  const meta = KIND_BY_ID[kind]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [group, setGroup] = useState('all')
  const [search, setSearch] = useState('')
  const [showRetired, setShowRetired] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await fetchKind(kind)) }
    catch (err) { setError(friendlyError(err, 'Could not load this.')) }
    finally { setLoading(false) }
  }, [kind])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    try {
      const rows = await syncKind(kind)
      toast.success(`${rows.length} ${meta.label.toLowerCase()} imported. Your photos and edits were kept.`)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not import the built-ins.'))
    } finally { setSyncing(false) }
  }

  async function withBusy(id, fn, message) {
    setBusyId(id)
    try {
      const updated = await fn()
      if (updated?.id) setItems(list => list.map(i => (i.id === updated.id ? updated : i)))
      if (message) toast.success(message)
      return updated
    } catch (err) {
      toast.error(friendlyError(err, 'That did not save.'))
    } finally { setBusyId(null) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      if (!showRetired && i.active === false) return false
      if (group !== 'all' && i.group_id !== group) return false
      if (q && !(i.name?.toLowerCase().includes(q) || i.tagline?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, group, search, showRetired])

  const withPhoto = items.filter(i => i.image_url).length
  const retired   = items.filter(i => i.active === false).length
  const custom    = items.filter(i => i.source === 'custom').length

  async function move(item, direction) {
    const ordered = [...filtered]
    const idx = ordered.findIndex(i => i.id === item.id)
    const swapWith = idx + direction
    if (swapWith < 0 || swapWith >= ordered.length) return
    ;[ordered[idx], ordered[swapWith]] = [ordered[swapWith], ordered[idx]]
    setBusyId(item.id)
    try {
      await reorder(ordered)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not reorder.'))
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-plum-700">
        <ArrowLeft size={13} /> All content
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{meta.emoji} {meta.label}</h2>
          <p className="text-sm text-gray-500 mt-0.5 max-w-prose">{meta.blurb}</p>
          <p className="text-[11px] mt-1" style={{ color: INK.muted }}>Customers see this on: {meta.surface}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing}
            title="Copy the built-ins from code. Never overwrites your photos or edits."
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:border-plum-300 hover:text-plum-700 disabled:opacity-50">
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Import the built-ins
          </button>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700">
            <Plus size={14} /> Add a {meta.singular}
          </button>
        </div>
      </div>

      {meta.engineNote && (
        <p className="flex items-start gap-2 text-[11px] rounded-xl px-3 py-2 max-w-prose"
           style={{ background: INK.plane, color: INK.secondary }}>
          <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: STATUS.serious }} />
          <span>{meta.engineNote}</span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-semibold hover:underline">Retry</button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Live" value={items.length - retired} sub={`${custom} added by you`} />
            <StatTile label="Photographed" value={withPhoto} sub={`of ${items.length}`}
                      tone={withPhoto === 0 ? STATUS.serious : undefined} />
            <StatTile label="Retired" value={retired} sub="kept, not deleted" />
            <StatTile label="Groups" value={meta.groups.length} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip active={group === 'all'} onClick={() => setGroup('all')}>All</Chip>
            {meta.groups.map(g => (
              <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</Chip>
            ))}
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                     placeholder={`Search ${meta.label.toLowerCase()}…`}
                     className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-56 focus:outline-none focus:border-plum-400" />
            </div>
            <button onClick={() => setShowRetired(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                showRetired ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
              }`}>
              {showRetired ? <Eye size={12} /> : <EyeOff size={12} />}
              {showRetired ? 'Showing retired' : `Hiding ${retired} retired`}
            </button>
          </div>
        </>
      )}

      {adding && (
        <ItemForm
          meta={meta} title={`Add a ${meta.singular}`} busy={busyId === 'new'}
          onCancel={() => setAdding(false)}
          onSave={async patch => {
            setBusyId('new')
            try {
              const created = await createItem(kind, patch)
              setItems(list => [...list, created])
              setAdding(false)
              toast.success(`${created.name} added. Give it a photograph next.`)
            } catch (err) {
              toast.error(friendlyError(err, 'Could not add this.'))
            } finally { setBusyId(null) }
          }}
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
          <Loader2 className="animate-spin text-plum-600" size={26} />
          <span className="text-sm">Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">{meta.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900">Nothing imported yet — and that is expected.</h3>
              <p className="text-sm text-gray-600 mt-1.5 max-w-prose">
                The built-in {meta.label.toLowerCase()} live in code. Import them here so you can
                photograph, rewrite and extend them. Safe to run again later — your photos and edits
                are never overwritten.
              </p>
              <button onClick={handleSync} disabled={syncing}
                className="mt-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700 disabled:opacity-50">
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Import the built-ins
              </button>
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyNote icon="🔍">Nothing matches this filter.</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((item, i) => (
            editing === item.id ? (
              <ItemForm
                key={item.id} meta={meta} initial={item} busy={busyId === item.id}
                title={`Edit ${item.name}`}
                onCancel={() => setEditing(null)}
                onSave={async patch => {
                  const updated = await withBusy(item.id, () => updateItem(item.id, patch), 'Saved.')
                  if (updated) setEditing(null)
                }}
              />
            ) : (
              <ItemCard
                key={item.id} item={item} meta={meta} busy={busyId === item.id}
                first={i === 0} last={i === filtered.length - 1}
                onEdit={() => setEditing(item.id)}
                onUpload={file => withBusy(item.id, () => uploadItemImage(item, file), `Photo saved for ${item.name}.`)}
                onRemoveImage={() => withBusy(item.id, () => removeItemImage(item), `Photo removed.`)}
                onToggle={() => withBusy(item.id, () => setActive(item.id, item.active === false),
                                         item.active === false ? `${item.name} is live again.` : `${item.name} is no longer shown.`)}
                onDelete={async () => {
                  if (!confirm(`Delete "${item.name}" completely? Retiring it instead keeps it out of the app and preserves the record.`)) return
                  setBusyId(item.id)
                  try {
                    await deleteItem(item.id)
                    setItems(list => list.filter(x => x.id !== item.id))
                    toast.success(`${item.name} deleted.`)
                  } catch (err) { toast.error(friendlyError(err, 'Could not delete.')) }
                  finally { setBusyId(null) }
                }}
                onMove={dir => move(item, dir)}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}

/* ── One item ──────────────────────────────────────────────────────────── */

function ItemCard({ item, meta, busy, first, last, onEdit, onUpload, onRemoveImage, onToggle, onDelete, onMove }) {
  const fileRef = useRef(null)
  const payload = item.payload ?? {}

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden flex ${item.active === false ? 'border-gray-200 opacity-70' : 'border-gray-100'}`}>
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        title="Upload a photograph" className="relative w-28 shrink-0 bg-gray-50 group">
        {item.image_url ? (
          <img src={item.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden="true">
            {item.emoji ?? meta.emoji}
          </span>
        )}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {busy ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
             onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f) }} />

      <div className="flex-1 min-w-0 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 truncate">
            <span aria-hidden="true">{item.emoji} </span>{item.name}
          </p>
          <span className="text-xs font-bold text-plum-700 shrink-0">{priceLabel(item)}</span>
        </div>

        <p className="text-[11px] mt-0.5 truncate" style={{ color: INK.muted }}>
          {meta.groups.find(g => g.id === item.group_id)?.label ?? item.group_id ?? '—'}
          {item.source === 'custom' ? ' · added by you' : ''}
          {item.active === false ? ' · retired' : ''}
        </p>

        {(item.tagline || item.description) && (
          <p className="text-[11px] mt-1 line-clamp-2" style={{ color: INK.secondary }}>
            {item.tagline || item.description}
          </p>
        )}

        {/* A one-line summary of whatever is in payload, so the card is not a
            lie of omission about how much this item actually carries. */}
        {payloadSummary(item, meta) && (
          <p className="text-[11px] mt-1 font-semibold" style={{ color: CATEGORICAL[2] }}>
            {payloadSummary(item, meta)}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {item.image_url && <ImageSourceBadge source={item.image_source} size="sm" />}
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-plum-700 hover:text-plum-800 disabled:opacity-40">
            <Upload size={11} /> {item.image_url ? 'Replace' : 'Add a photo'}
          </button>
          {item.image_url && (
            <button onClick={onRemoveImage} disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40">
              <Trash2 size={11} /> Remove
            </button>
          )}
          <button onClick={onToggle} disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40">
            {item.active === false ? <><Eye size={11} /> Show again</> : <><EyeOff size={11} /> Retire</>}
          </button>

          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={() => onMove(-1)} disabled={busy || first} title="Move up"
              className="p-1 text-gray-300 hover:text-plum-700 disabled:opacity-30">
              <ChevronUp size={13} />
            </button>
            <button onClick={() => onMove(1)} disabled={busy || last} title="Move down"
              className="p-1 text-gray-300 hover:text-plum-700 disabled:opacity-30">
              <ChevronDown size={13} />
            </button>
            <button onClick={onEdit} className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 px-1">
              <Pencil size={11} /> Edit
            </button>
            {/* Deleting a built-in is a button that undoes itself — the next
                sync brings it straight back. Retire is the real control. */}
            {item.source === 'custom' && (
              <button onClick={onDelete} disabled={busy}
                className="p-1 text-red-300 hover:text-red-600 disabled:opacity-40" title="Delete">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Add / edit ────────────────────────────────────────────────────────── */

function ItemForm({ meta, initial, title, busy, onCancel, onSave }) {
  const payload = initial?.payload ?? {}
  const [draft, setDraft] = useState(() => {
    const base = {
      name: initial?.name ?? '',
      emoji: initial?.emoji ?? meta.emoji,
      group_id: initial?.group_id ?? meta.groups[0]?.id ?? null,
      tagline: initial?.tagline ?? '',
      description: initial?.description ?? '',
      base: initial?.base ?? '',
      per_guest: initial?.per_guest ?? '',
      image_alt: initial?.image_alt ?? '',
    }
    // Payload-backed fields are edited flat and folded back on save.
    for (const f of meta.fields) {
      if (f.key in base) continue
      const v = payload[f.key]
      base[f.key] = f.type === 'list' ? (Array.isArray(v) ? v.join('\n') : '') : (v ?? '')
    }
    return base
  })

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const valid = draft.name.trim().length > 1

  function submit() {
    const nextPayload = { ...payload }
    const row = {
      name: draft.name.trim(),
      emoji: draft.emoji || null,
      group_id: draft.group_id || null,
      image_alt: draft.image_alt.trim() || null,
    }

    for (const f of meta.fields) {
      const raw = draft[f.key]
      if (f.key === 'tagline' || f.key === 'description') {
        row[f.key] = String(raw ?? '').trim() || null
      } else if (f.key === 'base' || f.key === 'per_guest') {
        row[f.key] = raw === '' ? null : Number(raw)
      } else if (f.type === 'list') {
        nextPayload[f.key] = String(raw ?? '').split('\n').map(s => s.trim()).filter(Boolean)
      } else {
        nextPayload[f.key] = String(raw ?? '').trim() || null
      }
    }
    row.payload = nextPayload
    onSave(row)
  }

  const isBuiltIn = initial?.source === 'seed'

  return (
    <div className="card p-5 border-plum-200 lg:col-span-2">
      <SectionHead title={title} sub={initial ? null : `It appears wherever ${meta.label.toLowerCase()} are shown as soon as you save.`} />

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <label className="sm:col-span-1">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Emoji</span>
          <input value={draft.emoji} onChange={e => set('emoji', e.target.value.slice(0, 4))}
                 className="input py-2 text-center text-lg" />
        </label>
        <label className="sm:col-span-3">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Name</span>
          <input value={draft.name} onChange={e => set('name', e.target.value)}
                 placeholder={`New ${meta.singular}`} className="input py-2 text-sm" />
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Group</span>
          <select value={draft.group_id ?? ''} onChange={e => set('group_id', e.target.value)} className="input py-2 text-sm">
            {meta.groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>

        {meta.fields.map(f => {
          const engineOwned = meta.engineOwns.includes(f.key)
          const span = f.type === 'textarea' || f.type === 'list' ? 'sm:col-span-6' : 'sm:col-span-3'
          return (
            <label key={f.key} className={span}>
              <span className="block text-[11px] font-semibold text-gray-500 mb-1">
                {f.label}
                {engineOwned && <span className="ml-1 font-normal" style={{ color: STATUS.serious }}>· display copy only</span>}
                {f.hint && <span className="ml-1 font-normal text-gray-400">— {f.hint}</span>}
              </span>
              {f.type === 'textarea' ? (
                <textarea value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                          rows={2} className="input py-2 text-sm resize-y" />
              ) : f.type === 'list' ? (
                <textarea value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                          rows={4} placeholder="One per line"
                          className="input py-2 text-sm resize-y font-mono text-[12px]" />
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined}
                       value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                       className="input py-2 text-sm" />
              )}
            </label>
          )
        })}

        <label className="sm:col-span-6">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">
            Photo description — what a screen reader should say
          </span>
          <input value={draft.image_alt} onChange={e => set('image_alt', e.target.value)}
                 placeholder="A marigold and rose mandap under evening lights"
                 className="input py-2 text-sm" />
        </label>
      </div>

      {isBuiltIn && meta.engineNote && (
        <p className="text-[11px] mt-3 flex items-start gap-1.5 max-w-prose" style={{ color: STATUS.serious }}>
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{meta.engineNote}</span>
        </p>
      )}

      {!initial && draft.name.trim() && (
        <p className="text-[11px] mt-3" style={{ color: INK.muted }}>
          Saved as <code>{slugify(draft.name)}</code>.
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={submit} disabled={busy || !valid}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function priceLabel(item) {
  const parts = []
  if (item.base != null)      parts.push(formatINR(item.base))
  if (item.per_guest != null) parts.push(`${formatINR(item.per_guest)}/guest`)
  return parts.join(' + ') || '—'
}

/** One line about whatever the payload carries, so the card is honest about depth. */
function payloadSummary(item, meta) {
  const p = item.payload ?? {}
  switch (meta.id) {
    case 'decor_theme': return p.includes?.length ? `${p.includes.length} things installed` : null
    case 'decor_level': return p.inclusions?.length ? `${p.inclusions.length} inclusions` : null
    case 'tier':        return p.guests ? `${p.guests.min}–${p.guests.max} guests` : null
    case 'cuisine': {
      const n = Object.values(p.courseCounts ?? {}).reduce((s, v) => s + v, 0)
      return n ? `${n} dishes across ${Object.keys(p.courseCounts).length} courses` : null
    }
    case 'festival':    return p.month ? `${p.month}${p.duration ? ` · ${p.duration}` : ''}` : null
    case 'offer':       return p.code ? `Code ${p.code}` : null
    default:            return null
  }
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? 'bg-plum-700 border-plum-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
      }`}>
      {children}
    </button>
  )
}
