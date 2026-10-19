import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * The global partner directory.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FILTERS ARE QUERIES, NOT A BROWSER SIEVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 7.1 is explicit that filters must operate on real query
 * results. Every control here becomes `.eq`, `.ilike`, `.in`, `.order`
 * or `.range` on the request, and the row count comes from PostgREST's
 * exact count rather than `rows.length` — fetching everything and
 * hiding some of it in the browser gives a count that lies the moment
 * the table outgrows one page.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SYNTHETIC PARTNERS ARE HIDDEN BY DEFAULT
 * ══════════════════════════════════════════════════════════════════════
 *
 * 221 of 229 vendor rows carry `is_synthetic`. They are seeded test
 * supply, and a directory that opens on them makes every count on this
 * screen meaningless — "229 partners" is a number nobody can act on.
 * They are one checkbox away, never silently merged.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAVED VIEWS ARE THE QUESTION, NOT A FILTER PRESET
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Approved but not live" is a real operational question — supply that
 * has been paid for in review time and earns nothing. Each view sets
 * the filters that answer it and names what it is looking for.
 */

const PAGE = 25

const VERIFICATION = ['draft', 'submitted', 'approved', 'rejected', 'suspended']

/* Every column the table can show. `sortable` is false where the value
   is derived in the client and sorting it would silently sort the page
   rather than the table. */
const COLUMNS = [
  { k: 'business_name', label: 'Partner', always: true, sortable: true },
  { k: 'partner_code', label: 'Code', sortable: true },
  { k: 'category', label: 'Trade', sortable: true },
  { k: 'city', label: 'City', sortable: true },
  { k: 'verification_status', label: 'Review', sortable: true },
  { k: 'onboarding_status', label: 'Onboarding', sortable: true },
  { k: 'accepting_jobs', label: 'Accepting jobs', sortable: true },
  { k: 'is_verified', label: 'Verified', sortable: true },
  { k: 'submitted_at', label: 'Submitted', sortable: true },
  { k: 'created_at', label: 'Joined', sortable: true },
  { k: 'review_due_at', label: 'Review due', sortable: true },
  { k: 'contact_phone', label: 'Phone' },
]

const VIEWS = [
  { id: 'pending', label: 'Pending review', hint: 'Submitted and waiting on a decision',
    patch: { verification: 'submitted', accepting: '', overdue: false } },
  { id: 'approved_dark', label: 'Approved but not live', hint: 'Review time spent, earning nothing',
    patch: { verification: 'approved', accepting: 'false', overdue: false } },
  { id: 'overdue', label: 'Overdue reviews', hint: 'Past the review deadline on file',
    patch: { verification: 'submitted', accepting: '', overdue: true } },
  { id: 'suspended', label: 'Suspended', hint: 'Account stopped',
    patch: { verification: 'suspended', accepting: '', overdue: false } },
  { id: 'live', label: 'Live partners', hint: 'Approved and taking work',
    patch: { verification: 'approved', accepting: 'true', overdue: false } },
]

const fmtDate = v => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')

function Pill({ value }) {
  const v = String(value ?? '').toLowerCase()
  const tone = v === 'approved' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : v === 'submitted' ? 'bg-amber-50 text-amber-900 ring-amber-200'
      : v === 'rejected' ? 'bg-rose-50 text-rose-800 ring-rose-200'
        : v === 'suspended' ? 'bg-gray-800 text-white ring-gray-700'
          : 'bg-gray-100 text-gray-600 ring-gray-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{value || '—'}</span>
}

export default function PartnerDirectory({ onOpenPartner }) {
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [q, setQ] = useState('')
  const [trade, setTrade] = useState('')
  const [city, setCity] = useState('')
  const [verification, setVerification] = useState('')
  const [accepting, setAccepting] = useState('')
  const [overdue, setOverdue] = useState(false)
  const [includeSynthetic, setIncludeSynthetic] = useState(false)
  const [activeView, setActiveView] = useState(null)

  const [sort, setSort] = useState({ k: 'created_at', asc: false })
  const [shown, setShown] = useState(() => new Set(['business_name', 'partner_code', 'category', 'city', 'verification_status', 'accepting_jobs', 'submitted_at']))
  const [pickerOpen, setPickerOpen] = useState(false)

  const [trades, setTrades] = useState([])
  const [cities, setCities] = useState([])

  /* Debounced, because a keystroke per request turns a search box into
     a load generator and the results race each other back. */
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let live = true
    supabase.from('sambramo_trade_registry').select('id, name').order('sort_order').then(({ data }) => {
      if (live && data) setTrades(data)
    })
    /* The city list is what partners actually registered in, not a
       hardcoded market list that would offer empty filters. */
    supabase.from('vendors').select('city').not('city', 'is', null).limit(2000).then(({ data }) => {
      if (live && data) setCities([...new Set(data.map(r => r.city).filter(Boolean))].sort())
    })
    return () => { live = false }
  }, [])

  const seq = useRef(0)

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true); setError(null)

    /* A partner's trade lives on their LISTINGS. vendors.category is
       null or empty for every real partner, so filtering it returned
       nothing and looked like "no partners in this trade". The inner
       join is only added when a trade is chosen, so the unfiltered
       list still includes partners who have no listing yet. */
    let qy = trade
      ? supabase.from('vendors').select('*, vendor_services!inner(category)', { count: 'exact' }).eq('vendor_services.category', trade)
      : supabase.from('vendors').select('*', { count: 'exact' })
    if (!includeSynthetic) qy = qy.eq('is_synthetic', false)
    if (city) qy = qy.eq('city', city)
    if (verification) qy = qy.eq('verification_status', verification)
    if (accepting) qy = qy.eq('accepting_jobs', accepting === 'true')
    if (overdue) qy = qy.lt('review_due_at', new Date().toISOString())
    if (debouncedQ.trim()) {
      const n = debouncedQ.trim()
      qy = qy.or(`business_name.ilike.%${n}%,partner_code.ilike.%${n}%,contact_phone.ilike.%${n}%`)
    }
    qy = qy.order(sort.k, { ascending: sort.asc, nullsFirst: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    const { data, error: e, count } = await qy
    /* A slower earlier request must not overwrite a newer result. */
    if (mine !== seq.current) return
    setBusy(false)
    if (e) { setError(e.message); setRows([]); setTotal(0); return }
    setRows(data ?? [])
    setTotal(count ?? 0)
  }, [includeSynthetic, trade, city, verification, accepting, overdue, debouncedQ, sort, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [includeSynthetic, trade, city, verification, accepting, overdue, debouncedQ])

  function applyView(v) {
    setActiveView(v.id)
    setVerification(v.patch.verification)
    setAccepting(v.patch.accepting)
    setOverdue(v.patch.overdue)
    setTrade(''); setCity(''); setQ('')
  }
  function clearAll() {
    setActiveView(null); setVerification(''); setAccepting(''); setOverdue(false)
    setTrade(''); setCity(''); setQ('')
  }

  const cols = useMemo(() => COLUMNS.filter(c => c.always || shown.has(c.k)), [shown])
  const pages = Math.max(1, Math.ceil(total / PAGE))

  /* Exports what is on screen, and says so. An export labelled "all
     partners" that silently holds one page is worse than no export. */
  function exportCsv() {
    if (!rows?.length) return
    const head = cols.map(c => c.label)
    const body = rows.map(r => cols.map(c => {
      const v = r[c.k]
      return `"${String(v ?? '').replace(/"/g, '""')}"`
    }))
    const csv = [head.join(','), ...body.map(b => b.join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `partners-page-${page + 1}-of-${pages}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 p-1">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-gray-900">Partner directory</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            Every partner on the marketplace. Filters and sorting run on the server.
          </p>
        </div>
        <p className="text-[13px] text-gray-500">
          {rows === null ? 'Loading…' : (
            <>
              <b className="text-gray-900">{total.toLocaleString('en-IN')}</b> matching
              {busy && <span className="ml-2 text-gray-400">updating…</span>}
            </>
          )}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <button
            key={v.id} type="button" onClick={() => applyView(v)} title={v.hint}
            className={`rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 transition ${activeView === v.id
              ? 'bg-violet-50 text-violet-900 ring-violet-300'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
          >{v.label}</button>
        ))}
        <button type="button" onClick={clearAll}
          className="rounded-xl px-3 py-2 text-[12px] font-semibold text-gray-500 hover:text-gray-800">Clear</button>
      </nav>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gray-200">
        <input
          value={q} onChange={e => { setQ(e.target.value); setActiveView(null) }}
          placeholder="Name, partner code or phone…"
          className="min-w-[220px] flex-1 rounded-xl bg-gray-50 px-3 py-2 text-[13px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
        />
        <select value={trade} onChange={e => { setTrade(e.target.value); setActiveView(null) }}
          className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">All trades</option>
          {trades.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select value={city} onChange={e => { setCity(e.target.value); setActiveView(null) }}
          className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={verification} onChange={e => { setVerification(e.target.value); setActiveView(null) }}
          className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">Any review state</option>
          {VERIFICATION.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={accepting} onChange={e => { setAccepting(e.target.value); setActiveView(null) }}
          className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">Jobs: any</option>
          <option value="true">Accepting jobs</option>
          <option value="false">Not accepting</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
          <input type="checkbox" checked={overdue} onChange={e => { setOverdue(e.target.checked); setActiveView(null) }}
            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
          Overdue only
        </label>
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600" title="221 of 229 vendor rows are seeded test supply">
          <input type="checkbox" checked={includeSynthetic} onChange={e => setIncludeSynthetic(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
          Include test partners
        </label>

        <div className="relative">
          <button type="button" onClick={() => setPickerOpen(o => !o)}
            className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Columns</button>
          {pickerOpen && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl bg-white p-2 shadow-lg ring-1 ring-gray-200">
              {COLUMNS.map(c => (
                <label key={c.k} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] ${c.always ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox" disabled={c.always} checked={c.always || shown.has(c.k)}
                    onChange={e => setShown(s => {
                      const n = new Set(s)
                      e.target.checked ? n.add(c.k) : n.delete(c.k)
                      return n
                    })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={exportCsv} disabled={!rows?.length}
          className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200 disabled:text-gray-400">
          Export page
        </button>
      </section>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200">
              {cols.map(c => (
                <th key={c.k} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {c.sortable ? (
                    <button type="button"
                      onClick={() => setSort(s => ({ k: c.k, asc: s.k === c.k ? !s.asc : false }))}
                      className="inline-flex items-center gap-1 hover:text-gray-900">
                      {c.label}
                      {sort.k === c.k && <span className="text-violet-600">{sort.asc ? '▲' : '▼'}</span>}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td colSpan={cols.length} className="px-3 py-6 text-[13px] text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-3 py-6 text-[13px] text-gray-500">
                No partner matches these filters.{!includeSynthetic && ' Test partners are excluded — tick “Include test partners” if you expected seeded supply.'}
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/70">
                {cols.map(c => (
                  <td key={c.k} className="px-3 py-2.5 align-top">
                    {c.k === 'business_name' ? (
                      <button type="button" onClick={() => onOpenPartner?.(r)} className="text-left">
                        <span className="block text-[13px] font-bold text-gray-900 hover:text-violet-700">{r.business_name || 'Unnamed'}</span>
                        <span className="block font-mono text-[10px] text-gray-400">{String(r.id).slice(0, 8)}</span>
                        {r.is_synthetic && <span className="mt-0.5 inline-block rounded bg-gray-100 px-1 text-[10px] font-bold text-gray-500">test</span>}
                      </button>
                    ) : c.k === 'verification_status' || c.k === 'onboarding_status' ? (
                      <Pill value={r[c.k]} />
                    ) : c.k === 'accepting_jobs' || c.k === 'is_verified' ? (
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${r[c.k] ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {r[c.k] ? 'Yes' : 'No'}
                      </span>
                    ) : c.k.endsWith('_at') ? (
                      <span className="text-[12px] tabular-nums text-gray-600">{fmtDate(r[c.k])}</span>
                    ) : (
                      <span className="text-[12px] text-gray-700">{r[c.k] ?? '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-gray-500">
          Page {page + 1} of {pages} · {PAGE} per page
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 disabled:text-gray-300">Previous</button>
          <button type="button" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
            className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 disabled:text-gray-300">Next</button>
        </div>
      </footer>
    </div>
  )
}
