import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast, friendlyError } from '../../context/ToastContext'

/**
 * The shared dish catalogue, and the queue nobody could reach.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SCREEN EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1,764 of the 2,742 master dishes carry review_status `needs_review`,
 * and until this screen there was nowhere in the admin to review one.
 * They are visible to partners — an empty course is the worse failure —
 * so "flagged for review" meant flagged for nobody.
 *
 * Roughly 500 of them are the Part J seeding, written against the gaps
 * in the cuisine-by-course matrix. The rest predate it. Both need the
 * same thing: somebody who knows the food saying yes, or fixing the
 * spelling, or saying this is not a dish.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REJECT HIDES, IT DOES NOT DELETE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A dish id is load-bearing: a partner's listing stores it and bookings
 * reference it. Deleting one would strand whatever points at it, and
 * freeing the id would let it be handed to a different dish later, which
 * is the same bug with an extra step. So rejecting sets review_status to
 * 'rejected', which the search already excludes, and the row stays.
 */

const PAGE = 40

const Pill = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
      on ? 'bg-plum-700 text-white' : 'bg-ink/[0.04] text-ink/70 ring-1 ring-ink/[0.06]'}`}>
    {children}
  </button>
)

export default function FoodCatalogueReview() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('needs_review')
  const [provenance, setProvenance] = useState(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState('')
  const [counts, setCounts] = useState({})
  const [cats, setCats] = useState({})

  useEffect(() => {
    supabase.from('sambramo_food_categories').select('id, name, course_group')
      .then(({ data }) => setCats(Object.fromEntries((data ?? []).map(c => [c.id, c]))))
  }, [])

  const loadCounts = useCallback(async () => {
    const out = {}
    for (const s of ['needs_review', 'reviewed', 'rejected']) {
      const { count } = await supabase.from('sambramo_master_dishes')
        .select('id', { count: 'exact', head: true }).eq('review_status', s)
      out[s] = count ?? 0
    }
    setCounts(out)
  }, [])

  const load = useCallback(async () => {
    setBusy(true); setErr('')
    let sel = supabase.from('sambramo_master_dishes')
      .select('id, name, aliases, cuisine_ids, category_id, suggested_diet, review_status, provenance', { count: 'exact' })
      .eq('review_status', status)
      .order('name')
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (provenance) sel = sel.like('provenance', `${provenance}%`)
    if (q.trim()) sel = sel.ilike('name', `%${q.trim()}%`)
    const { data, error, count } = await sel
    setBusy(false)
    if (error) { setErr(friendlyError(error)); setRows([]); return }
    setRows(data ?? []); setTotal(count ?? 0)
  }, [status, provenance, q, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCounts() }, [loadCounts])
  useEffect(() => { setPage(0) }, [status, provenance, q])

  async function decide(id, next) {
    const { error } = await supabase.from('sambramo_master_dishes')
      .update({ review_status: next }).eq('id', id)
    if (error) { toast.error(friendlyError(error)); return }
    setRows(r => r.filter(x => x.id !== id))
    setTotal(t => Math.max(0, t - 1))
    loadCounts()
    toast.success(next === 'reviewed' ? 'Approved' : 'Hidden from the catalogue')
  }

  async function rename(row) {
    const name = window.prompt('Dish name', row.name)
    if (name == null || !name.trim() || name === row.name) return
    const { error } = await supabase.from('sambramo_master_dishes')
      .update({ name: name.trim() }).eq('id', row.id)
    if (error) { toast.error(friendlyError(error)); return }
    setRows(r => r.map(x => (x.id === row.id ? { ...x, name: name.trim() } : x)))
    toast.success('Renamed')
  }

  const sources = useMemo(() => ([
    [null, 'Every source'],
    ['sambramo-curated:partJ-supplies', 'Water, salt & supplies'],
    ['sambramo-curated:partJ', 'Part J dishes'],
    ['sambramo:', 'Original catalogue'],
  ]), [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <h1 className="text-[22px] font-extrabold text-plum-950">Food catalogue review</h1>
      <p className="mt-1 text-[13px] leading-snug text-ink/60">
        Every dish a caterer can pick from. A dish waiting for review is already visible to
        partners — an empty course is the worse failure — so this queue is what stands between
        a seeded guess and a catalogue somebody trusts.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[['needs_review', 'Needs review'], ['reviewed', 'Approved'], ['rejected', 'Hidden']].map(([id, label]) => (
          <Pill key={id} on={status === id} onClick={() => setStatus(id)}>
            {label}{counts[id] != null ? ` · ${counts[id].toLocaleString('en-IN')}` : ''}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.map(([id, label]) => (
          <Pill key={String(id)} on={provenance === id} onClick={() => setProvenance(id)}>{label}</Pill>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name"
        className="mt-3 h-11 w-full rounded-2xl bg-ink/[0.03] px-4 text-[14px] font-semibold text-ink outline-none ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink/35" />

      {err && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[12.5px] font-bold text-amber-900">{err}</p>}
      <p className="mt-3 text-[12px] font-bold text-ink/50">
        {busy ? 'Loading…' : `${total.toLocaleString('en-IN')} dish${total === 1 ? '' : 'es'}`}
      </p>

      <div className="mt-2 space-y-1.5">
        {rows.map(d => {
          const cat = cats[d.category_id]
          return (
            <div key={d.id} className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-extrabold text-ink">{d.name}</p>
                  <p className="truncate text-[11.5px] font-semibold text-ink/50">
                    {cat ? `${cat.name} · ${cat.course_group}` : <span className="text-rose-600">no category — invisible to every course filter</span>}
                    {d.suggested_diet ? ` · ${d.suggested_diet}` : ''}
                    {d.cuisine_ids?.length ? ` · ${d.cuisine_ids.slice(0, 3).join(', ')}` : ' · universal (every cuisine)'}
                  </p>
                  {d.aliases?.length > 0 && (
                    <p className="truncate text-[11px] text-ink/40">also “{d.aliases.join('”, “')}”</p>
                  )}
                  <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">{d.provenance}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {status !== 'reviewed' && (
                    <button type="button" onClick={() => decide(d.id, 'reviewed')}
                      className="rounded-full bg-forest-700 px-3 py-1.5 text-[11.5px] font-extrabold text-white">Approve</button>
                  )}
                  <button type="button" onClick={() => rename(d)}
                    className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-[11.5px] font-extrabold text-ink ring-1 ring-ink/[0.07]">Rename</button>
                  {status !== 'rejected' && (
                    <button type="button" onClick={() => decide(d.id, 'rejected')}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-[11.5px] font-extrabold text-rose-700 ring-1 ring-rose-200">Hide</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!busy && !rows.length && (
          <p className="rounded-2xl bg-ink/[0.02] p-4 text-[13px] text-ink/50">Nothing here.</p>
        )}
      </div>

      {total > PAGE && (
        <div className="mt-4 flex items-center justify-between">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-full bg-ink/[0.05] px-4 py-2 text-[12.5px] font-extrabold text-ink disabled:opacity-40">Back</button>
          <span className="text-[12px] font-bold text-ink/50">{page + 1} of {Math.ceil(total / PAGE)}</span>
          <button type="button" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}
            className="rounded-full bg-ink/[0.05] px-4 py-2 text-[12.5px] font-extrabold text-ink disabled:opacity-40">Next</button>
        </div>
      )}

      <p className="mt-5 text-[11.5px] leading-relaxed text-ink/45">
        Hiding a dish sets its status to rejected and keeps the row. A dish id is load-bearing —
        a partner's listing stores it and bookings reference it — so deleting one would strand
        whatever points at it, and freeing the id would let it be handed to a different dish later.
      </p>
    </div>
  )
}
