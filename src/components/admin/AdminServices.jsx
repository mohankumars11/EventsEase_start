import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Loader2, AlertCircle, Camera, Upload, Trash2, Plus, Check, X, Pencil,
  Search, RefreshCw, EyeOff, Eye,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { formatINR } from '../../utils/format'
import { INK, STATUS, CATEGORICAL } from '../../config/dataviz'
import { serviceDemand } from '../../lib/analytics'
import {
  fetchServices, syncBuiltIns, createService, updateService, setServiceActive,
  deleteService, uploadServiceImage, removeServiceImage, isMissingTable,
  slugify, SERVICE_GROUP_OPTIONS, UNIT_OPTIONS,
} from '../../lib/serviceCatalog'
import ImageSourceBadge from '../shop/ImageSourceBadge'
import { SectionHead, EmptyNote, Meter, StatTile } from './viz/Primitives'

/**
 * The event-service catalogue, made editable.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 * Sambramo sells two things. The shop half has been editable since migration
 * 025 — prices, descriptions and photographs all change from the Catalog tab.
 * The services half, which is the more expensive half of the business, could
 * only be changed by editing `src/data/servicePricing.js` and shipping a
 * build. Adding "Mehendi artist" was a deploy. Putting a real photograph of a
 * mandap on the mandap service was not possible at all: there was no column to
 * put it in.
 *
 * ── What is editable and what is not ─────────────────────────────────────
 * Everything descriptive: name, emoji, group, description, photograph, and
 * whether it is offered at all. Plus brand-new services, which are entirely
 * yours and have no code behind them.
 *
 * The pricing UNIT and BASE of a BUILT-IN service are shown but flagged,
 * because `servicePricing.js` is what the quote engine actually computes with
 * (`serviceCost()` runs through the builder, the tier ladder and every cart
 * total). Editing the number here would change what this screen displays and
 * not what a customer is quoted, which is worse than not being able to edit it
 * — so the field says so rather than silently lying.
 *
 * ── Before migration 037 ─────────────────────────────────────────────────
 * Migrations are applied by hand in the Supabase SQL editor and `git push`
 * does not run them, so this screen can legitimately load against a database
 * that has never heard of `service_catalog`. It says exactly that, names the
 * file, and does not pretend to be broken.
 */

export default function AdminServices({ data }) {
  const toast = useToast()
  const { enquiries = [] } = data

  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [tableMissing, setTableMissing] = useState(false)

  const [group, setGroup]   = useState('all')
  const [search, setSearch] = useState('')
  const [showRetired, setShowRetired] = useState(false)

  const [busyId, setBusyId]   = useState(null)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [syncing, setSyncing] = useState(false)

  const demand = useMemo(() => {
    const { services: rows } = serviceDemand(enquiries)
    return Object.fromEntries(rows.map(r => [r.id, r]))
  }, [enquiries])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setServices(await fetchServices())
      setTableMissing(false)
    } catch (err) {
      if (isMissingTable(err)) { setTableMissing(true); setServices([]) }
      else setError(friendlyError(err, 'Could not load the service catalogue.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    try {
      const rows = await syncBuiltIns()
      toast.success(`${rows.length} built-in services synced. Your photos and edits were kept.`)
      await load()
    } catch (err) {
      toast.error(isMissingTable(err)
        ? 'Run migration 037 first — the service_catalog table does not exist yet.'
        : friendlyError(err, 'Could not sync the built-in services.'))
    } finally {
      setSyncing(false)
    }
  }

  async function handleSave(service, patch) {
    setBusyId(service.id)
    try {
      const updated = await updateService(service.id, patch)
      setServices(list => list.map(s => (s.id === service.id ? updated : s)))
      setEditing(null)
      toast.success('Saved.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save.'))
    } finally { setBusyId(null) }
  }

  async function handleUpload(service, file) {
    if (!file) return
    setBusyId(service.id)
    try {
      const updated = await uploadServiceImage(service, file)
      setServices(list => list.map(s => (s.id === service.id ? updated : s)))
      toast.success(`Photo saved for ${service.name}.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Upload failed.'))
    } finally { setBusyId(null) }
  }

  async function handleRemoveImage(service) {
    setBusyId(service.id)
    try {
      const updated = await removeServiceImage(service)
      setServices(list => list.map(s => (s.id === service.id ? updated : s)))
      toast.info(`Photo removed from ${service.name}.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not remove the photo.'))
    } finally { setBusyId(null) }
  }

  async function handleToggleActive(service) {
    setBusyId(service.id)
    try {
      const updated = await setServiceActive(service.id, !service.active)
      setServices(list => list.map(s => (s.id === service.id ? updated : s)))
      toast.success(updated.active ? `${service.name} is offered again.` : `${service.name} is no longer offered.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change this service.'))
    } finally { setBusyId(null) }
  }

  async function handleDelete(service) {
    if (!confirm(`Delete "${service.name}" completely? Retiring it instead keeps it out of the storefront and preserves its enquiry history.`)) return
    setBusyId(service.id)
    try {
      await deleteService(service.id)
      setServices(list => list.filter(s => s.id !== service.id))
      toast.success(`${service.name} deleted.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not delete this service.'))
    } finally { setBusyId(null) }
  }

  async function handleCreate(patch) {
    setBusyId('new')
    try {
      const created = await createService(patch)
      setServices(list => [...list, created])
      setAdding(false)
      toast.success(`${created.name} added. It will need a photograph.`)
    } catch (err) {
      toast.error(isMissingTable(err)
        ? 'Run migration 037 first — the service_catalog table does not exist yet.'
        : friendlyError(err, 'Could not add this service.'))
    } finally { setBusyId(null) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter(s => {
      if (!showRetired && !s.active) return false
      if (group !== 'all' && s.group_id !== group) return false
      if (q && !(s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))) return false
      return true
    })
  }, [services, group, search, showRetired])

  const withPhotos = services.filter(s => s.image_url).length
  const realPhotos = services.filter(s => s.image_source === 'actual').length
  const custom     = services.filter(s => s.source === 'custom').length
  const retired    = services.filter(s => !s.active).length

  /* ── The pre-migration state ──────────────────────────────────────── */
  if (tableMissing) {
    return (
      <div className="space-y-5">
        <Header onAdd={null} onSync={null} />
        <div className="card p-6 border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">One migration away.</h3>
              <p className="text-sm text-gray-700 mt-1.5 max-w-prose">
                This screen needs the <code className="px-1 py-0.5 rounded bg-white border border-amber-200 text-[12px]">service_catalog</code> table,
                which does not exist in the database yet. Migrations here are applied by hand and
                <strong> a deploy does not run them</strong>.
              </p>
              <ol className="text-sm text-gray-700 mt-3 space-y-1.5 list-decimal list-inside">
                <li>Open <strong>Supabase Dashboard → SQL Editor</strong>.</li>
                <li>
                  Paste the contents of{' '}
                  <code className="px-1 py-0.5 rounded bg-white border border-amber-200 text-[12px]">
                    supabase/migrations/037_service_catalog_and_product_lifecycle.sql
                  </code>
                  {' '}and run it. It is safe to re-run.
                </li>
                <li>Come back here and press <strong>Sync built-in services</strong> to pull in all thirty-nine.</li>
              </ol>
              <button
                onClick={load}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-white text-xs font-semibold hover:bg-plum-700"
              >
                <RefreshCw size={12} /> Check again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Header onAdd={() => setAdding(true)} onSync={handleSync} syncing={syncing} />

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* ── Coverage ─────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Services offered" value={services.length - retired} sub={`${custom} added by you`} />
          <StatTile label="With a photograph" value={withPhotos} sub={`of ${services.length}`}
                    tone={withPhotos === 0 ? STATUS.serious : undefined} />
          <StatTile label="Real work, photographed" value={realPhotos} sub="not a stock lookalike" />
          <StatTile label="Retired" value={retired} sub="kept for their history" />
        </div>
      )}

      {services.length > 0 && (
        <div className="card p-5">
          <Meter
            value={withPhotos} max={services.length}
            label="Services showing a photograph"
            caption={`${withPhotos} of ${services.length}`}
            fill={withPhotos === services.length ? STATUS.good : withPhotos > services.length / 2 ? STATUS.warning : CATEGORICAL[0]}
          />
          <p className="text-[11px] mt-2 max-w-prose" style={{ color: INK.muted }}>
            A service with no picture is a line of text on a page of pictures. This is the
            single biggest lever on whether a celebration enquiry gets sent.
          </p>
        </div>
      )}

      {/* ── Empty (table exists, nothing in it) ──────────────────────── */}
      {!loading && services.length === 0 && !error && (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🎪</span>
            <div>
              <h3 className="font-bold text-gray-900">The catalogue is empty — and that is expected.</h3>
              <p className="text-sm text-gray-600 mt-1.5 max-w-prose">
                The thirty-nine built-in services live in code, where the quote engine reads
                their prices. Press the button below to copy them in here so you can photograph,
                rewrite and extend them. It is safe to run again later — your photos and edits
                are never overwritten.
              </p>
              <button
                onClick={handleSync} disabled={syncing}
                className="mt-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sync built-in services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add form ─────────────────────────────────────────────────── */}
      {adding && (
        <ServiceForm
          title="Add a service"
          busy={busyId === 'new'}
          onCancel={() => setAdding(false)}
          onSave={handleCreate}
        />
      )}

      {/* ── Filters ──────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={group === 'all'} onClick={() => setGroup('all')}>All groups</Chip>
          {SERVICE_GROUP_OPTIONS.map(g => (
            <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} title={g.hint}>
              {g.label}
            </Chip>
          ))}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search services…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-56 focus:outline-none focus:border-plum-400"
            />
          </div>
          <button
            onClick={() => setShowRetired(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              showRetired ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
            }`}
          >
            {showRetired ? <Eye size={12} /> : <EyeOff size={12} />}
            {showRetired ? 'Showing retired' : `Hiding ${retired} retired`}
          </button>
        </div>
      )}

      {/* ── The list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
          <Loader2 className="animate-spin text-plum-600" size={28} />
          <span className="text-sm">Loading services…</span>
        </div>
      ) : filtered.length === 0 && services.length > 0 ? (
        <EmptyNote icon="🔍">Nothing matches this filter.</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(s => (
            <ServiceCard
              key={s.id}
              service={s}
              demand={demand[s.slug]}
              busy={busyId === s.id}
              editing={editing === s.id}
              onEdit={() => setEditing(editing === s.id ? null : s.id)}
              onSave={patch => handleSave(s, patch)}
              onUpload={file => handleUpload(s, file)}
              onRemoveImage={() => handleRemoveImage(s)}
              onToggleActive={() => handleToggleActive(s)}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Header ────────────────────────────────────────────────────────────── */

function Header({ onAdd, onSync, syncing }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🎪 Event Services</h2>
        <p className="text-sm text-gray-500 mt-0.5 max-w-prose">
          Everything Sambramo offers for a celebration. Photograph it, rewrite it, retire it,
          or add something entirely new.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onSync && (
          <button
            onClick={onSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:border-plum-300 hover:text-plum-700 disabled:opacity-50"
            title="Copy the built-in services from code into this table. Never overwrites your photos or edits."
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync built-ins
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-600 text-white text-sm font-semibold hover:bg-plum-700"
          >
            <Plus size={14} /> Add a service
          </button>
        )}
      </div>
    </div>
  )
}

/* ── One service ───────────────────────────────────────────────────────── */

function ServiceCard({ service: s, demand, busy, editing, onEdit, onSave, onUpload, onRemoveImage, onToggleActive, onDelete }) {
  const fileRef = useRef(null)

  if (editing) {
    return (
      <ServiceForm
        title={`Edit ${s.name}`}
        initial={s}
        busy={busy}
        isBuiltIn={s.source === 'seed'}
        onCancel={onEdit}
        onSave={onSave}
      />
    )
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden flex ${s.active ? 'border-gray-100' : 'border-gray-200 opacity-70'}`}>
      {/* The thumbnail is the upload target — capture="environment" opens the
          rear camera straight away on a phone, which is the difference between
          "photograph the catalogue" being an afternoon and being a project. */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Upload a photograph"
        className="relative w-28 shrink-0 bg-gray-50 group"
      >
        {s.image_url ? (
          <img src={s.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden="true">
            {s.emoji ?? '🎪'}
          </span>
        )}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {busy ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
        </span>
      </button>
      <input
        ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; onUpload(f) }}
      />

      <div className="flex-1 min-w-0 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 truncate">
            <span aria-hidden="true">{s.emoji} </span>{s.name}
          </p>
          <span className="text-xs font-bold text-plum-700 shrink-0">{priceLabel(s)}</span>
        </div>

        <p className="text-[11px] mt-0.5 truncate" style={{ color: INK.muted }}>
          {SERVICE_GROUP_OPTIONS.find(g => g.id === s.group_id)?.label ?? s.group_id ?? 'Ungrouped'}
          {s.source === 'custom' ? ' · added by you' : ''}
          {!s.active ? ' · retired' : ''}
        </p>

        {s.description && (
          <p className="text-[11px] mt-1 line-clamp-2" style={{ color: INK.secondary }}>{s.description}</p>
        )}

        {demand && (
          <p className="text-[11px] mt-1.5 font-semibold" style={{ color: CATEGORICAL[2] }}>
            {demand.enquiries} enquir{demand.enquiries === 1 ? 'y' : 'ies'} · {demand.quoted} quoted · {demand.won} closed
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {s.image_url && <ImageSourceBadge source={s.image_source} size="sm" />}

          <button
            onClick={() => fileRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-plum-700 hover:text-plum-800 disabled:opacity-40"
          >
            <Upload size={11} /> {s.image_url ? 'Replace photo' : 'Add a photo'}
          </button>

          {s.image_url && (
            <button
              onClick={onRemoveImage} disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <Trash2 size={11} /> Remove
            </button>
          )}

          <button
            onClick={onToggleActive} disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            {s.active ? <><EyeOff size={11} /> Retire</> : <><Eye size={11} /> Offer again</>}
          </button>

          <button onClick={onEdit} className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 ml-auto">
            <Pencil size={11} /> Edit
          </button>

          {/* Deleting is only offered for rows this screen created — a
              built-in would simply reappear on the next sync, so offering it
              would be a button that undoes itself. */}
          {s.source === 'custom' && (
            <button onClick={onDelete} disabled={busy}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 disabled:opacity-40">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Add / edit form ───────────────────────────────────────────────────── */

function ServiceForm({ title, initial, busy, isBuiltIn, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({
    name:        initial?.name ?? '',
    emoji:       initial?.emoji ?? '🎪',
    group_id:    initial?.group_id ?? SERVICE_GROUP_OPTIONS[0]?.id ?? 'core',
    description: initial?.description ?? '',
    unit:        initial?.unit ?? 'fixed',
    base:        initial?.base ?? '',
    scales:      Boolean(initial?.scales),
    price_hint:  initial?.price_hint ?? '',
    image_alt:   initial?.image_alt ?? '',
    active:      initial?.active ?? true,
  }))

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const valid = draft.name.trim().length > 1

  function submit() {
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price_hint: draft.price_hint.trim() || null,
      image_alt: draft.image_alt.trim() || null,
      base: draft.base === '' ? null : Number(draft.base),
    })
  }

  return (
    <div className="card p-5 border-plum-200 lg:col-span-2">
      <SectionHead title={title} sub={initial ? null : 'It appears in the catalogue as soon as you save. Give it a photograph next.'} />

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <label className="sm:col-span-1">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Emoji</span>
          <input value={draft.emoji} onChange={e => set('emoji', e.target.value.slice(0, 4))}
                 className="input py-2 text-center text-lg" />
        </label>
        <label className="sm:col-span-3">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Name</span>
          <input value={draft.name} onChange={e => set('name', e.target.value)}
                 placeholder="Mehendi artist" className="input py-2 text-sm" />
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Group</span>
          <select value={draft.group_id} onChange={e => set('group_id', e.target.value)} className="input py-2 text-sm">
            {SERVICE_GROUP_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>

        <label className="sm:col-span-6">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">What it is</span>
          <input value={draft.description} onChange={e => set('description', e.target.value)}
                 placeholder="Bridal and guest mehendi, cones included, three hours on site"
                 className="input py-2 text-sm" />
        </label>

        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Priced</span>
          <select value={draft.unit} onChange={e => set('unit', e.target.value)} className="input py-2 text-sm">
            {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Base rate (₹)</span>
          <input type="number" min="0" value={draft.base} onChange={e => set('base', e.target.value)}
                 placeholder="12000" className="input py-2 text-sm" />
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">Price note (optional)</span>
          <input value={draft.price_hint} onChange={e => set('price_hint', e.target.value)}
                 placeholder="₹8,000 – ₹25,000" className="input py-2 text-sm" />
        </label>

        <label className="sm:col-span-6 flex items-start gap-2.5 py-1">
          <input type="checkbox" checked={draft.scales} onChange={e => set('scales', e.target.checked)}
                 className="mt-0.5 w-4 h-4 accent-plum-600" />
          <span className="text-xs text-gray-700">
            <strong>Costs more for a bigger event.</strong>{' '}
            <span style={{ color: INK.muted }}>
              A photographer at a 600-guest wedding is two shooters and a longer day. A priest
              performs the same rite for thirty guests or three hundred — leave this off for them.
            </span>
          </span>
        </label>

        <label className="sm:col-span-6">
          <span className="block text-[11px] font-semibold text-gray-500 mb-1">
            Photo description — what a screen reader should say
          </span>
          <input value={draft.image_alt} onChange={e => set('image_alt', e.target.value)}
                 placeholder="A marigold and rose mandap under evening lights"
                 className="input py-2 text-sm" />
        </label>
      </div>

      {isBuiltIn && (
        <p className="text-[11px] mt-3 flex items-start gap-1.5 max-w-prose" style={{ color: STATUS.serious }}>
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>
            This is one of the built-in services. Its name, description and photograph are yours to
            change — but the <strong>base rate and pricing unit shown here are display copies</strong>.
            What a customer is actually quoted comes from <code>src/data/servicePricing.js</code>,
            because that is what the quote engine computes with. Change it there, then press
            “Sync built-ins”.
          </span>
        </p>
      )}

      {!initial && draft.name.trim() && (
        <p className="text-[11px] mt-3" style={{ color: INK.muted }}>
          Saved as <code>{slugify(draft.name)}</code>.
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={submit} disabled={busy || !valid}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plum-700 text-white text-sm font-semibold hover:bg-plum-800 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function priceLabel(s) {
  if (s.price_hint) return s.price_hint
  if (s.base == null) return 'On request'
  const suffix = s.unit === 'per_guest' ? '/guest' : s.unit === 'per_unit' ? '/unit' : ''
  return `${formatINR(s.base)}${suffix}`
}

function Chip({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick} title={title} aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? 'bg-plum-700 border-plum-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
      }`}
    >
      {children}
    </button>
  )
}
