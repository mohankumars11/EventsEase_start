import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { TRADE_PROFILE_SCHEMA, schemaFor } from '../../config/tradeProfileSchema'

/**
 * A dedicated workspace per trade, reading its own typed table.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE TABLE PER TRADE, FROM AN ALLOWLIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Each trade has its own columns — a caterer has `max_guests`, a
 * videographer has `showreel` — so forcing one schema on all 34 is what
 * the JSONB blob was already doing badly. The table name comes from
 * `tradeProfileSchema.js`, which is generated server-side from the field
 * map. A trade absent from that map has no workspace. Nothing here
 * assembles a table name from anything a user typed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE LEGACY FALLBACK IS NOT OPTIONAL
 * ══════════════════════════════════════════════════════════════════════
 *
 * The typed tables are correct for new submissions and nearly empty
 * today: the answers already stored came from an older questionnaire, so
 * roughly 7% of them map to a column. 22 listings carry answers that no
 * typed column can hold.
 *
 * If this screen read only the typed table, those partners would render
 * as an empty workspace and an operator would conclude the partner never
 * answered. So a listing with no typed row still appears, marked
 * `legacy`, with its raw `specs` available. Saying "stored in the old
 * format" is honest; showing nothing is not.
 */

const CHIP = 'rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 transition'

/* A value is rendered by its declared type, not by guessing from the
   value — an empty array and a null are different facts and an operator
   reviewing a submission needs to tell them apart. */
function Cell({ value, type }) {
  if (value === null || value === undefined) {
    return <span className="text-[12px] text-gray-300">—</span>
  }
  if (type === 'TEXT[]') {
    if (!Array.isArray(value) || !value.length) {
      return <span className="text-[11px] italic text-gray-400">none selected</span>
    }
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-800">{String(v)}</span>
        ))}
      </span>
    )
  }
  if (type === 'BOOLEAN') {
    return (
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${value
        ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
      >{value ? 'Yes' : 'No'}</span>
    )
  }
  if (type === 'BIGINT') {
    /* money is integer paise everywhere in this repo */
    return <span className="text-[12px] font-semibold tabular-nums text-gray-900">₹{(Number(value) / 100).toLocaleString('en-IN')}</span>
  }
  if (type === 'JSONB') {
    return <span className="font-mono text-[11px] text-gray-600">{JSON.stringify(value)}</span>
  }
  return <span className="text-[12px] text-gray-900">{String(value)}</span>
}

export default function TradeWorkspaces() {
  const tradeIds = useMemo(() => Object.keys(TRADE_PROFILE_SCHEMA).sort(), [])
  const [tradeId, setTradeId] = useState(tradeIds[0])
  const [names, setNames] = useState({})
  const [rows, setRows] = useState(null)
  const [legacy, setLegacy] = useState([])
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [onlyFilled, setOnlyFilled] = useState(false)

  const schema = schemaFor(tradeId)

  /* Trade display names come from the registry rather than being
     re-spelled here, so a rename lands in one place. */
  useEffect(() => {
    let live = true
    supabase.from('sambramo_trade_registry').select('id, name').then(({ data, error: e }) => {
      if (!live || e || !data) return
      setNames(Object.fromEntries(data.map(r => [r.id, r.name])))
    })
    return () => { live = false }
  }, [])

  const load = useCallback(async () => {
    if (!schema) return
    setRows(null); setLegacy([]); setError(null)

    const typed = await supabase
      .from(schema.table)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)

    if (typed.error) {
      setError(
        /does not exist/i.test(typed.error.message || '')
          ? `${schema.table} is not in the database yet — migrations 173-178 create it.`
          : typed.error.message,
      )
      setRows([])
      return
    }
    const profiles = typed.data ?? []
    setRows(profiles)

    /* Listings in this trade with answers but no typed row. The registry
       translates the trade id into the category label vendor_services
       actually stores. */
    const reg = await supabase.from('sambramo_trade_registry').select('id, name').eq('id', tradeId).maybeSingle()
    const label = reg.data?.name
    if (!label) return
    const svc = await supabase
      .from('vendor_services')
      .select('id, vendor_id, name, category, specs, review_status, updated_at')
      .eq('category', label)
      .limit(500)
    if (svc.error || !svc.data) return
    const haveTyped = new Set(profiles.map(p => p.service_id).filter(Boolean))
    setLegacy(svc.data.filter(s => !haveTyped.has(s.id) && s.specs && Object.keys(s.specs).length))
  }, [schema, tradeId])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter(r => {
      if (onlyFilled) {
        const filled = schema.columns.some(c => {
          const v = r[c.k]
          return v !== null && v !== undefined && (!Array.isArray(v) || v.length)
        })
        if (!filled) return false
      }
      if (!needle) return true
      return JSON.stringify(r).toLowerCase().includes(needle)
    })
  }, [rows, q, onlyFilled, schema])

  if (!schema) return <p className="p-6 text-sm text-gray-500">No workspace is defined for this trade.</p>

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Trade workspaces</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Every trade reads its own typed table. {tradeIds.length} trades have one;
          Anchor &amp; MC runs the legacy flow and is reviewed in the Partner console.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tradeIds.map(id => {
          const on = id === tradeId
          return (
            <button
              key={id} type="button" onClick={() => setTradeId(id)}
              className={`${CHIP} ${on
                ? 'bg-violet-50 text-violet-900 ring-violet-300'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
            >{names[id] ?? id}</button>
          )
        })}
      </nav>

      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {names[tradeId] ?? tradeId}
            </h3>
            <p className="mt-0.5 text-[12px] text-gray-500">
              <code className="rounded bg-gray-100 px-1">{schema.table}</code> ·{' '}
              {schema.columns.length} typed columns
              {schema.itemsTable && <> · catalogue in <code className="rounded bg-gray-100 px-1">{schema.itemsTable}</code></>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
              <input type="checkbox" checked={onlyFilled} onChange={e => setOnlyFilled(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
              Only rows with answers
            </label>
            <input
              value={q} onChange={e => setQ(e.target.value)} placeholder="Search this trade…"
              className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
            />
            <button type="button" onClick={load}
              className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
          </div>
        </div>

        {rows === null ? (
          <p className="mt-3 text-[13px] text-gray-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-500 ring-1 ring-gray-200">
            No typed profiles for this trade yet. The columns exist; they fill from the next
            submission a partner makes in this trade.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Partner</th>
                  {schema.columns.map(c => (
                    <th key={c.k} title={c.label}
                      className="whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {c.label.length > 28 ? `${c.label.slice(0, 28)}…` : c.label}
                      {c.req && <span className="ml-1 text-rose-500">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 align-top hover:bg-gray-50/60">
                    <td className="px-2 py-2">
                      <span className="block font-mono text-[10px] text-gray-400">{String(r.vendor_id).slice(0, 8)}</span>
                      <span className="block font-mono text-[10px] text-gray-400">{r.service_id ? String(r.service_id).slice(0, 8) : 'draft'}</span>
                    </td>
                    {schema.columns.map(c => (
                      <td key={c.k} className="px-2 py-2"><Cell value={r[c.k]} type={c.type} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {legacy.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Stored in the old format ({legacy.length})
          </h3>
          <p className="mt-1 text-[12px] text-amber-900">
            These listings answered an earlier version of this questionnaire, so their answers
            do not fit the typed columns above. They are shown raw rather than hidden — a blank
            workspace would read as “this partner never answered”.
          </p>
          <ul className="mt-2 space-y-2">
            {legacy.map(s => (
              <li key={s.id} className="rounded-xl bg-white p-3 ring-1 ring-amber-200">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[13px] font-bold text-gray-900">{s.name || 'Unnamed listing'}</b>
                  <span className="font-mono text-[10px] text-gray-400">{String(s.id).slice(0, 8)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Object.keys(s.specs).slice(0, 18).map(k => (
                    <span key={k} className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-900">{k}</span>
                  ))}
                  {Object.keys(s.specs).length > 18 && (
                    <span className="text-[10px] text-amber-800">+{Object.keys(s.specs).length - 18} more</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
