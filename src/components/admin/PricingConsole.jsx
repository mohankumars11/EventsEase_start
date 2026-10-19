import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Partner packages and their prices.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE SCREEN WITH REAL DATA
 * ══════════════════════════════════════════════════════════════════════
 *
 * `sambramo_trade_packages` holds 30 live rows across UNDER_REVIEW,
 * LIVE, ACTION_REQUIRED and ARCHIVED — the only part of this console
 * that is not waiting for a first submission. So the review actions
 * here are the ones an operator can use today.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS NOT OFFERED, AND WHY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 11 allows an administrator to edit a price. This screen does
 * not offer free-form price editing, deliberately:
 *
 *   - the price a customer sees is derived from `commercial_inputs`
 *     through a rate rule and a calculation snapshot, so overwriting a
 *     number here would desynchronise the package from the engine that
 *     produced it;
 *   - a published price has a `price_locked_until`, and a booking taken
 *     against it carries its own snapshot. Editing in place would
 *     silently reprice history, which section 11 forbids in the same
 *     breath as it asks for editing.
 *
 * What an operator can do is decide: approve the revision, or send it
 * back with a reason. Both go through `review_sambramo_pricing_revision`
 * — the real signature, read off the live database — so the decision is
 * recorded where the partner app reads it. A price change is a partner
 * resubmission, not an admin overwrite.
 */

const STATES = ['UNDER_REVIEW', 'ACTION_REQUIRED', 'LIVE', 'ARCHIVED']

const rupees = paise => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`
const when = v => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

function StatePill({ value }) {
  const v = String(value ?? '').toUpperCase()
  const tone = v === 'LIVE' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : v === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-900 ring-amber-200'
      : v === 'ACTION_REQUIRED' ? 'bg-rose-50 text-rose-800 ring-rose-200'
        : 'bg-gray-100 text-gray-600 ring-gray-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{value || '—'}</span>
}

/* commercial_inputs is a jsonb bag whose shape varies by trade. Rather
   than guess at keys, show what is there — an operator reviewing a
   price needs the inputs that produced it, whatever they are called. */
function Inputs({ data }) {
  if (!data || typeof data !== 'object') return <p className="text-[12px] text-gray-400">No inputs recorded.</p>
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== '')
  if (!entries.length) return <p className="text-[12px] text-gray-400">No inputs recorded.</p>
  return (
    <dl className="grid gap-1.5 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 rounded-lg bg-gray-50 px-2.5 py-1.5 ring-1 ring-gray-200">
          <dt className="font-mono text-[11px] text-gray-500">{k}</dt>
          <dd className="text-right text-[12px] font-semibold text-gray-900">
            {typeof v === 'object' ? JSON.stringify(v) : /paise$/i.test(k) ? rupees(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function PricingConsole() {
  const [rows, setRows] = useState(null)
  const [vendors, setVendors] = useState({})
  const [state, setState] = useState('UNDER_REVIEW')
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const load = useCallback(async () => {
    setRows(null); setError(null)
    let qy = supabase.from('sambramo_trade_packages')
      .select('*')
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(300)
    if (state) qy = qy.eq('status', state)
    const { data, error: e } = await qy
    if (e) { setError(e.message); setRows([]); return }
    setRows(data ?? [])

    const ids = [...new Set((data ?? []).map(r => r.vendor_id).filter(Boolean))]
    if (ids.length) {
      const v = await supabase.from('vendors').select('id, business_name, category').in('id', ids)
      if (!v.error) setVendors(Object.fromEntries((v.data ?? []).map(x => [x.id, x])))
    }
  }, [state])

  useEffect(() => { load() }, [load])

  async function decide(pkg, decision) {
    if (decision !== 'approve' && !note.trim()) {
      setError('A reason is required when sending a package back.')
      return
    }
    setBusy(pkg.id); setError(null); setDone(null)
    const { error: e } = await supabase.rpc('review_sambramo_pricing_revision', {
      p_package_id: pkg.id,
      p_package_type: 'trade',
      p_decision: decision,
      p_note: note.trim() || null,
    })
    setBusy(null)
    if (e) { setError(e.message); return }
    setDone(`${decision === 'approve' ? 'Approved' : 'Sent back'}: ${pkg.name}`)
    setNote(''); setOpen(null); load()
  }

  const counts = useMemo(() => {
    const c = {}
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Pricing &amp; packages</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Partner-submitted packages, the inputs that produced each price, and the review decision.
        </p>
      </header>

      <p className="rounded-xl bg-sky-50 p-3 text-[13px] leading-relaxed text-sky-900 ring-1 ring-sky-200">
        <b>Prices are not edited here.</b> A customer price is derived from the package inputs through
        a rate rule and a calculation snapshot, and a published price carries a lock plus per-booking
        snapshots. Overwriting a number would desynchronise the package from the engine and reprice
        history. An operator approves a revision or sends it back; the partner resubmits.
      </p>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900 ring-1 ring-emerald-200">{done}</p>}

      <nav className="flex flex-wrap gap-2">
        {STATES.map(s => (
          <button key={s} type="button" onClick={() => { setState(s); setOpen(null) }}
            className={`rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 transition ${state === s
              ? 'bg-violet-50 text-violet-900 ring-violet-300'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
          >{s.replace('_', ' ').toLowerCase()}{counts[s] ? ` (${counts[s]})` : ''}</button>
        ))}
        <button type="button" onClick={() => { setState(''); setOpen(null) }}
          className="rounded-xl px-3 py-2 text-[12px] font-semibold text-gray-500 hover:text-gray-800">All</button>
      </nav>

      <section className="rounded-2xl bg-white ring-1 ring-gray-200">
        {rows === null ? (
          <p className="p-4 text-[13px] text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-[13px] text-gray-500">No packages in this state.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                {['Package', 'Partner', 'Source', 'State', 'Round', 'Submitted', ''].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/70">
                  <td className="px-3 py-2.5">
                    <span className="block text-[13px] font-bold text-gray-900">{p.name || 'Unnamed'}</span>
                    {p.description && <span className="block max-w-[320px] truncate text-[11px] text-gray-500">{p.description}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-700">
                    {vendors[p.vendor_id]?.business_name || String(p.vendor_id ?? '').slice(0, 8)}
                    <span className="block text-[11px] text-gray-400">{vendors[p.vendor_id]?.category || ''}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{p.source || '—'}</td>
                  <td className="px-3 py-2.5"><StatePill value={p.status} /></td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-600">{p.revision_round ?? 0}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{when(p.submitted_at)}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => { setOpen(o => (o?.id === p.id ? null : p)); setNote('') }}
                      className="text-[12px] font-bold text-violet-700 hover:text-violet-900">
                      {open?.id === p.id ? 'Close' : 'Review'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">{open.name}</h3>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {vendors[open.vendor_id]?.business_name || open.vendor_id} · round {open.revision_round ?? 0} · <StatePill value={open.status} />
              </p>
            </div>
            {open.price_locked_until && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                Price locked until {when(open.price_locked_until)}
              </p>
            )}
          </div>

          {open.review_note && (
            <p className="mt-3 rounded-xl bg-gray-50 p-2.5 text-[12px] text-gray-700 ring-1 ring-gray-200">
              Last note: {open.review_note}
            </p>
          )}

          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Commercial inputs</h4>
          <div className="mt-2"><Inputs data={open.commercial_inputs} /></div>

          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Trade inputs</h4>
          <div className="mt-2"><Inputs data={open.trade_inputs} /></div>

          {open.calculation_snapshot && (
            <>
              <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                What the engine calculated
              </h4>
              <div className="mt-2"><Inputs data={open.calculation_snapshot} /></div>
            </>
          )}

          {['UNDER_REVIEW', 'ACTION_REQUIRED'].includes(String(open.status).toUpperCase()) ? (
            <div className="mt-4 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <textarea
                value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Reason — required when sending a package back. The partner is shown this."
                className="w-full rounded-xl bg-white px-3 py-2 text-[13px] text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={busy === open.id} onClick={() => decide(open, 'approve')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:bg-gray-300">
                  {busy === open.id ? 'Saving…' : 'Approve revision'}
                </button>
                <button type="button" disabled={busy === open.id} onClick={() => decide(open, 'request_changes')}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-700 disabled:bg-gray-300">
                  Send back for changes
                </button>
                <span className="ml-auto self-center text-[11px] text-gray-500">
                  via <code>review_sambramo_pricing_revision</code>
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-[12px] text-gray-600 ring-1 ring-gray-200">
              This package is {String(open.status).toLowerCase()} — there is no decision to make on it.
              A change starts with the partner resubmitting.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
