import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Every file a partner has uploaded, in one place, reviewable.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE TABLES ALREADY HOLD MEDIA — THIS UNIFIES, IT DOES NOT REPLACE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 10 asks for a structured media model keyed to partner and
 * trade. Most of it exists:
 *
 *   partner_work       portfolio and testimonials, with review_status
 *   vendor_documents   KYC and compliance, with status and rich metadata
 *   vendor_photos      listing photos
 *
 * Adding a fourth table would mean migrating three live ones and
 * leaving every existing uploader writing to the old place. So this
 * screen reads all three, normalises them into one shape, and writes
 * review decisions back to whichever table the item came from.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PRIVATE STAYS PRIVATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `partner-documents` and `partner-uploads` are private buckets, and
 * the brief is explicit that KYC must not be exposed through a public
 * URL. Nothing here builds a public URL for them: each item is fetched
 * through a short-lived signed URL, created on demand and never stored.
 * `partner-avatars` is public and is treated as public.
 */

const SOURCES = [
  { id: 'work', label: 'Portfolio & work', table: 'partner_work', statusCol: 'review_status' },
  { id: 'documents', label: 'Documents & compliance', table: 'vendor_documents', statusCol: 'status' },
  { id: 'photos', label: 'Listing photos', table: 'vendor_photos', statusCol: null },
]

/* Buckets a storage_path might live in, tried in order. The repo keys
   partner media by vendor id in one bucket and by auth user id in
   another, so a single guess is wrong often enough to matter. */
const PRIVATE_BUCKETS = ['partner-documents', 'partner-uploads']

const DECISIONS = {
  work: [
    { to: 'live', label: 'Publish', tone: 'text-emerald-700' },
    { to: 'rejected', label: 'Reject', tone: 'text-rose-700' },
  ],
  documents: [
    { to: 'accepted', label: 'Accept', tone: 'text-emerald-700' },
    { to: 'rejected', label: 'Reject', tone: 'text-rose-700' },
  ],
}

const prettyBytes = n => (!n ? null : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

function StatusPill({ value }) {
  const v = String(value ?? '').toLowerCase()
  const tone = ['live', 'accepted'].includes(v) ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : ['rejected'].includes(v) ? 'bg-rose-50 text-rose-800 ring-rose-200'
      : ['pending', 'under_review'].includes(v) ? 'bg-amber-50 text-amber-900 ring-amber-200'
        : 'bg-gray-100 text-gray-600 ring-gray-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{value || 'no status'}</span>
}

/* A private file is shown through a signed URL that expires. It is
   resolved lazily, per tile, so opening the library does not mint a
   hundred URLs for files nobody looks at. */
function Thumb({ item }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      if (item.publicUrl) { setUrl(item.publicUrl); return }
      if (!item.path) { setFailed(true); return }
      for (const bucket of PRIVATE_BUCKETS) {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(item.path, 600)
        if (data?.signedUrl) { if (live) setUrl(data.signedUrl); return }
      }
      if (live) setFailed(true)
    })()
    return () => { live = false }
  }, [item.path, item.publicUrl])

  const isImage = !item.mime || /^image\//.test(item.mime)

  if (failed || !url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-gray-100 text-center">
        <span className="px-2 text-[11px] font-semibold text-gray-500">
          {failed ? 'Not retrievable' : 'Loading…'}
        </span>
      </div>
    )
  }
  if (!isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer"
        className="flex aspect-square items-center justify-center rounded-xl bg-violet-50 text-center ring-1 ring-violet-200">
        <span className="px-2 text-[11px] font-bold text-violet-800">Open file<br />{item.mime}</span>
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={item.caption || item.kind || 'upload'}
        className="aspect-square w-full rounded-xl object-cover ring-1 ring-gray-200" />
    </a>
  )
}

export default function MediaLibrary() {
  const [partners, setPartners] = useState([])
  const [vendorId, setVendorId] = useState('')
  const [source, setSource] = useState('work')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    let live = true
    supabase.from('vendors')
      .select('id, business_name, category')
      .eq('is_synthetic', false)
      .order('business_name')
      .limit(300)
      .then(({ data }) => { if (live && data) setPartners(data) })
    return () => { live = false }
  }, [])

  const src = useMemo(() => SOURCES.find(s => s.id === source), [source])

  const load = useCallback(async () => {
    setItems(null); setError(null); setDone(null)
    let qy = supabase.from(src.table).select('*').limit(300)
    if (vendorId) qy = qy.eq('vendor_id', vendorId)
    const { data, error: e } = await qy
    if (e) { setError(e.message); setItems([]); return }

    /* One shape, whichever table it came from, so the gallery below
       does not branch on the source three times per tile. */
    const norm = (data ?? []).map(r => ({
      id: r.id,
      vendor_id: r.vendor_id,
      path: r.storage_path ?? null,
      publicUrl: r.photo_url ?? null,
      kind: r.kind ?? (source === 'photos' ? 'listing photo' : null),
      caption: r.caption ?? r.file_name ?? null,
      mime: r.mime_type ?? null,
      bytes: r.byte_size ?? null,
      status: src.statusCol ? r[src.statusCol] : null,
      note: r.review_note ?? null,
      at: r.created_at ?? r.uploaded_at ?? null,
      raw: r,
    }))
    setItems(norm)
  }, [src, vendorId, source])

  useEffect(() => { load() }, [load])

  async function decide(item, to) {
    if (!src.statusCol) return
    setBusy(item.id); setError(null); setDone(null)
    const patch = { [src.statusCol]: to }
    if (src.table === 'vendor_documents') patch.reviewed_at = new Date().toISOString()
    const { error: e } = await supabase.from(src.table).update(patch).eq('id', item.id)
    setBusy(null)
    if (e) { setError(e.message); return }
    setDone(`Marked ${to}.`)
    load()
  }

  const byPartner = useMemo(() => Object.fromEntries(partners.map(p => [p.id, p])), [partners])

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Media library</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Portfolio work, compliance documents and listing photos, with the review decision on each.
        </p>
      </header>

      <p className="rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900 ring-1 ring-sky-200">
        Documents live in private buckets and are opened through short-lived signed links.
        Nothing on this screen builds a public URL for identity or compliance files.
      </p>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 ring-1 ring-emerald-200">{done}</p>}

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gray-200">
        {SOURCES.map(s => (
          <button key={s.id} type="button" onClick={() => setSource(s.id)}
            className={`rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 transition ${source === s.id
              ? 'bg-violet-50 text-violet-900 ring-violet-300'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
          >{s.label}</button>
        ))}
        <select value={vendorId} onChange={e => setVendorId(e.target.value)}
          className="ml-auto rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">All partners</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.business_name || p.id.slice(0, 8)}</option>)}
        </select>
        <button type="button" onClick={load}
          className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
      </section>

      {items === null ? (
        <p className="text-[13px] text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-4 text-[13px] text-gray-500 ring-1 ring-gray-200">
          Nothing uploaded in this category{vendorId ? ' for this partner' : ''} yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(it => (
            <li key={it.id} className="overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-gray-200">
              <Thumb item={it} />
              <div className="space-y-1 px-1 pt-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[12px] font-bold text-gray-900">{it.kind || 'upload'}</span>
                  {it.status && <StatusPill value={it.status} />}
                </div>
                {!vendorId && (
                  <p className="truncate text-[11px] text-gray-500">
                    {byPartner[it.vendor_id]?.business_name || String(it.vendor_id).slice(0, 8)}
                  </p>
                )}
                {it.caption && <p className="truncate text-[11px] text-gray-500" title={it.caption}>{it.caption}</p>}
                <p className="text-[10px] text-gray-400">
                  {[prettyBytes(it.bytes), it.mime, it.at ? new Date(it.at).toLocaleDateString('en-IN') : null]
                    .filter(Boolean).join(' · ')}
                </p>
                {it.note && <p className="text-[11px] text-rose-700">{it.note}</p>}
                {DECISIONS[source] && (
                  <div className="flex gap-2 pt-1">
                    {DECISIONS[source].map(d => (
                      <button key={d.to} type="button" disabled={busy === it.id}
                        onClick={() => decide(it, d.to)}
                        className={`text-[11px] font-bold disabled:text-gray-300 ${d.tone}`}
                      >{busy === it.id ? '…' : d.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
