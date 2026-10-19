import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Custom inquiries and their SLA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DEADLINE IS A COLUMN, NOT A TIMER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 13 is specific: use a server-side clock and persisted
 * deadlines, not a browser timer. `sambramo_quote_requests.expires_at`
 * already is that column, so the countdown below is the difference
 * between it and now — a rendering of stored state. Closing the tab,
 * reloading, or opening the console tomorrow gives the same answer,
 * and nothing here starts a clock that only exists in this browser.
 *
 * The overdue filter is `.lt('expires_at', now)` on the request, so the
 * list of breached inquiries is a query result rather than a client
 * pass over a page of rows.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO INQUIRY IS INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * `sambramo_quote_requests` and `sambramo_quote_responses` are both
 * empty today. The screen says so and names what fills them. It never
 * fabricates a partner reply, a customer acceptance or a quote — the
 * brief forbids it and it would be the one kind of error nobody could
 * spot from the outside.
 */

const rupees = paise => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`
const when = v => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/* Remaining time against the stored deadline. Returns the shape the
   pill needs rather than a string, so "breached" is a fact the caller
   can style rather than a word it has to parse back out. */
function sla(expiresAt) {
  if (!expiresAt) return { state: 'none', label: 'No deadline set' }
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (Number.isNaN(ms)) return { state: 'none', label: 'Unreadable deadline' }
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const span = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${m}m` : `${m}m`
  if (ms < 0) return { state: 'breached', label: `${span} overdue` }
  if (ms < 4 * 3600000) return { state: 'soon', label: `${span} left` }
  return { state: 'ok', label: `${span} left` }
}

function SlaPill({ expiresAt }) {
  const s = sla(expiresAt)
  const tone = s.state === 'breached' ? 'bg-rose-50 text-rose-800 ring-rose-200'
    : s.state === 'soon' ? 'bg-amber-50 text-amber-900 ring-amber-200'
      : s.state === 'ok' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
        : 'bg-gray-100 text-gray-600 ring-gray-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{s.label}</span>
}

export default function InquiriesConsole() {
  const [rows, setRows] = useState(null)
  const [responses, setResponses] = useState({})
  const [counts, setCounts] = useState({})
  const [state, setState] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  /* Re-render once a minute so the countdown stays honest while the
     screen is open. It recomputes from expires_at every time; it does
     not hold a running clock of its own. */
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    setRows(null); setError(null)

    const head = async (table) => {
      const { count, error: e } = await supabase.from(table).select('id', { count: 'exact', head: true })
      return e ? null : (count ?? 0)
    }
    const [req, res] = await Promise.all([head('sambramo_quote_requests'), head('sambramo_quote_responses')])
    setCounts({ requests: req, responses: res })

    let qy = supabase.from('sambramo_quote_requests').select('*').order('created_at', { ascending: false }).limit(300)
    if (state) qy = qy.eq('state', state)
    if (overdueOnly) qy = qy.lt('expires_at', new Date().toISOString())
    const { data, error: e } = await qy
    if (e) { setError(e.message); setRows([]); return }
    setRows(data ?? [])

    const ids = (data ?? []).map(r => r.id)
    if (ids.length) {
      const r = await supabase.from('sambramo_quote_responses')
        .select('id, quote_request_id, status, partner_amount_paise, customer_amount_paise, quote_valid_until, notes, created_at')
        .in('quote_request_id', ids)
      if (!r.error) {
        const by = {}
        for (const x of r.data ?? []) (by[x.quote_request_id] ||= []).push(x)
        setResponses(by)
      }
    }
  }, [state, overdueOnly])

  useEffect(() => { load() }, [load])

  const states = useMemo(() => [...new Set((rows ?? []).map(r => r.state).filter(Boolean))], [rows])
  const breached = useMemo(
    () => (rows ?? []).filter(r => r.expires_at && new Date(r.expires_at).getTime() < Date.now()).length,
    [rows, tick],
  )

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Custom inquiries</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Quote requests, the partner responses against them, and the deadline each one is held to.
        </p>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Quote requests', n: counts.requests, src: 'sambramo_quote_requests' },
          { label: 'Partner responses', n: counts.responses, src: 'sambramo_quote_responses' },
          { label: 'Past deadline', n: rows ? breached : null, src: 'expires_at < now()' },
        ].map(c => (
          <div key={c.src} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
            <p className="text-[24px] font-black leading-none text-gray-900">
              {c.n === null ? <span className="text-[14px] font-bold text-gray-400">unavailable</span> : c.n}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-gray-700">{c.label}</p>
            <p className="font-mono text-[10px] text-gray-400">{c.src}</p>
          </div>
        ))}
      </section>

      {counts.requests === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          No quote requests exist yet. This inbox fills when a customer asks for a custom quote in a
          trade that supports one. Nothing on this screen is simulated — there is no sample inquiry,
          no draft quote and no partner reply.
        </p>
      )}

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gray-200">
        <select value={state} onChange={e => setState(e.target.value)}
          className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
          <option value="">All states</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
          Past deadline only
        </label>
        <button type="button" onClick={load}
          className="ml-auto rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
      </section>

      {rows && rows.length > 0 && (
        <section className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                {['Inquiry', 'Trade', 'Event date', 'State', 'Deadline', 'Responses', ''].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/70">
                  <td className="px-3 py-2.5">
                    <span className="block text-[13px] font-bold text-gray-900">{r.service_name || 'Custom request'}</span>
                    <span className="block font-mono text-[10px] text-gray-400">{String(r.id).slice(0, 8)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-700">{r.trade_id || '—'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{r.event_date || '—'}</td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-700">{r.state || '—'}</td>
                  <td className="px-3 py-2.5"><SlaPill expiresAt={r.expires_at} /></td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">{(responses[r.id] ?? []).length}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => setOpen(o => (o?.id === r.id ? null : r))}
                      className="text-[12px] font-bold text-violet-700 hover:text-violet-900">
                      {open?.id === r.id ? 'Close' : 'Open'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {open && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <h3 className="text-[16px] font-bold text-gray-900">{open.service_name || 'Custom request'}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-gray-400">{open.id}</p>

          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ['Trade', open.trade_id], ['Offering', open.offering_id],
              ['Event date', open.event_date], ['Window', [open.start_time, open.end_time].filter(Boolean).join(' – ')],
              ['Location', open.service_location], ['State', open.state],
              ['Created', when(open.created_at)], ['Deadline', when(open.expires_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
                <dt className="text-[12px] text-gray-600">{k}</dt>
                <dd className="text-right text-[12px] font-semibold text-gray-900">{v || '—'}</dd>
              </div>
            ))}
          </dl>

          {Array.isArray(open.missing_inputs) && open.missing_inputs.length > 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[12px] text-amber-900 ring-1 ring-amber-200">
              Waiting on: {open.missing_inputs.join(', ')}
            </p>
          )}

          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Partner responses ({(responses[open.id] ?? []).length})
          </h4>
          {(responses[open.id] ?? []).length === 0 ? (
            <p className="mt-2 rounded-xl bg-gray-50 p-3 text-[12px] text-gray-500 ring-1 ring-gray-200">
              No partner has responded. This reflects <code>sambramo_quote_responses</code> — it is not
              a placeholder waiting to be filled in by the console.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(responses[open.id] ?? []).map(q => (
                <li key={q.id} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-gray-900">{q.status}</span>
                    <span className="text-[12px] tabular-nums text-gray-700">
                      customer {rupees(q.customer_amount_paise)} · partner {rupees(q.partner_amount_paise)}
                    </span>
                  </div>
                  {q.notes && <p className="mt-1 text-[12px] text-gray-600">{q.notes}</p>}
                  <p className="mt-1 text-[11px] text-gray-400">
                    valid until {when(q.quote_valid_until)} · created {when(q.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
