import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Bookings and their lifecycle.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE STATES ARE THE ONES THE DATABASE USES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 12 lists a long lifecycle — notified, accepted, negotiating,
 * trip started, venue reached, completed. The honest set is what
 * `booking_lines` actually records, which is a status column plus a row
 * of timestamps: dispatched_at, accepted_at, paid_at, delivered_at,
 * settled_at, cancelled_at. The timeline below is built from those
 * timestamps, so every step shown is a thing that demonstrably
 * happened, with the time it happened.
 *
 * Steps the schema cannot evidence — "partner reached venue" — are not
 * drawn as empty circles implying they are coming. They are absent.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TABLES ARE NEARLY EMPTY AND THE SCREEN SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * At the time of writing: `bookings` 0 rows, `booking_lines` 2 (both
 * cancelled), `escrow_ledger` 0, `payout_claims` 0. A console that
 * drew a funnel over that would be drawing fiction. Each panel names
 * the table it read and how many rows came back.
 */

const STEPS = [
  { k: 'created_at', label: 'Created' },
  { k: 'dispatched_at', label: 'Offered to partners' },
  { k: 'accepted_at', label: 'Accepted' },
  { k: 'paid_at', label: 'Paid' },
  { k: 'delivered_at', label: 'Delivered' },
  { k: 'settled_at', label: 'Settled' },
  { k: 'cancelled_at', label: 'Cancelled', bad: true },
]

const rupees = paise => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`
const when = v => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null)

function StatusPill({ value }) {
  const v = String(value ?? '').toLowerCase()
  const tone = v === 'paid' || v === 'settled' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : v === 'cancelled' ? 'bg-rose-50 text-rose-800 ring-rose-200'
      : v === 'accepted' ? 'bg-sky-50 text-sky-800 ring-sky-200'
        : 'bg-amber-50 text-amber-900 ring-amber-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{value || '—'}</span>
}

export default function OrdersConsole() {
  const [lines, setLines] = useState(null)
  const [counts, setCounts] = useState({})
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setError(null); setLines(null)

    const head = async (table) => {
      const { count, error: e } = await supabase.from(table).select('id', { count: 'exact', head: true })
      return e ? null : (count ?? 0)
    }
    const [bookings, bl, escrow, claims] = await Promise.all([
      head('bookings'), head('booking_lines'), head('escrow_ledger'), head('payout_claims'),
    ])
    setCounts({ bookings, booking_lines: bl, escrow_ledger: escrow, payout_claims: claims })

    let qy = supabase.from('booking_lines').select('*').order('created_at', { ascending: false }).limit(200)
    if (status) qy = qy.eq('status', status)
    const { data, error: e } = await qy
    if (e) { setError(e.message); setLines([]); return }
    setLines(data ?? [])
  }, [status])

  useEffect(() => { load() }, [load])

  const statuses = useMemo(() => [...new Set((lines ?? []).map(l => l.status).filter(Boolean))], [lines])

  const money = useMemo(() => {
    const rows = lines ?? []
    /* Gross booked is not revenue and is not collected cash. Each is
       summed from its own column and labelled as itself. */
    return {
      gross: rows.reduce((a, r) => a + Number(r.quoted_amount_paise || 0), 0),
      partner: rows.reduce((a, r) => a + Number(r.partner_amount_paise || 0), 0),
      fee: rows.reduce((a, r) => a + Number(r.platform_fee_paise || 0), 0),
      paid: rows.filter(r => r.paid_at).reduce((a, r) => a + Number(r.quoted_amount_paise || 0), 0),
    }
  }, [lines])

  return (
    <div className="space-y-5 p-1">
      <header>
        <h2 className="text-[20px] font-bold text-gray-900">Bookings &amp; orders</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Every booking line, its lifecycle and its money, read from the tables that record them.
        </p>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Booking lines', n: counts.booking_lines, src: 'booking_lines' },
          { label: 'Bookings', n: counts.bookings, src: 'bookings' },
          { label: 'Escrow entries', n: counts.escrow_ledger, src: 'escrow_ledger' },
          { label: 'Payout claims', n: counts.payout_claims, src: 'payout_claims' },
        ].map(c => (
          <div key={c.src} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
            <p className="text-[24px] font-black leading-none text-gray-900">
              {c.n === null ? <span className="text-[14px] font-bold text-gray-400">unavailable</span> : c.n}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-gray-700">{c.label}</p>
            <p className="text-[11px] text-gray-400"><code>{c.src}</code></p>
          </div>
        ))}
      </section>

      {counts.booking_lines === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900 ring-1 ring-amber-200">
          No booking lines exist yet, so there is no order history, no escrow movement and no payout
          to show. These panels fill from the first real booking — nothing here is simulated.
        </p>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Booking lines {lines ? `(${lines.length})` : ''}
          </h3>
          <div className="flex items-center gap-2">
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-gray-200">
              <option value="">All states</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={load}
              className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
          </div>
        </div>

        {lines === null ? (
          <p className="mt-3 text-[13px] text-gray-500">Loading…</p>
        ) : lines.length === 0 ? (
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-500 ring-1 ring-gray-200">
            No booking lines match.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Line', 'Service', 'Trade', 'State', 'Quoted', 'Partner', 'Fee', 'Created'].map(h => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50/70"
                    onClick={() => setOpen(o => (o?.id === l.id ? null : l))}>
                    <td className="px-2 py-2 font-mono text-[10px] text-gray-500">{String(l.id).slice(0, 8)}</td>
                    <td className="px-2 py-2 text-[12px] font-semibold text-gray-900">{l.service_name || '—'}</td>
                    <td className="px-2 py-2 text-[12px] text-gray-700">{l.trade || '—'}</td>
                    <td className="px-2 py-2"><StatusPill value={l.status} /></td>
                    <td className="px-2 py-2 text-[12px] tabular-nums text-gray-900">{rupees(l.quoted_amount_paise)}</td>
                    <td className="px-2 py-2 text-[12px] tabular-nums text-gray-700">{rupees(l.partner_amount_paise)}</td>
                    <td className="px-2 py-2 text-[12px] tabular-nums text-gray-700">{rupees(l.platform_fee_paise)}</td>
                    <td className="px-2 py-2 text-[12px] text-gray-500">{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lines?.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Gross booked', v: money.gross, note: 'sum of quoted_amount_paise' },
              { label: 'Of which paid', v: money.paid, note: 'lines with paid_at set' },
              { label: 'Partner share', v: money.partner, note: 'partner_amount_paise' },
              { label: 'Platform fee', v: money.fee, note: 'platform_fee_paise' },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                <p className="text-[16px] font-black tabular-nums text-gray-900">{rupees(m.v)}</p>
                <p className="text-[12px] font-semibold text-gray-700">{m.label}</p>
                <p className="text-[10px] text-gray-400">{m.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {open && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">{open.service_name || 'Booking line'}</h3>
              <p className="mt-0.5 font-mono text-[11px] text-gray-400">{open.id}</p>
            </div>
            <button type="button" onClick={() => setOpen(null)}
              className="text-[12px] font-bold text-gray-500 hover:text-gray-800">Close</button>
          </div>

          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Lifecycle</h4>
          <ol className="mt-2 space-y-1.5">
            {STEPS.map(s => {
              const at = open[s.k]
              return (
                <li key={s.k} className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${at ? (s.bad ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-gray-200'}`} />
                  <span className={`w-44 text-[12px] font-semibold ${at ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                  <span className="text-[12px] text-gray-500">{when(at) ?? 'not recorded'}</span>
                </li>
              )
            })}
          </ol>
          {open.cancellation_reason && (
            <p className="mt-3 rounded-xl bg-rose-50 p-2.5 text-[12px] text-rose-900 ring-1 ring-rose-200">
              Cancelled: {open.cancellation_reason}
            </p>
          )}

          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Money on this line</h4>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ['Quoted to customer', rupees(open.quoted_amount_paise)],
              ['Partner amount', rupees(open.partner_amount_paise)],
              ['Platform fee', rupees(open.platform_fee_paise)],
              ['Fee rate', open.platform_fee_rate ?? '—'],
              ['Price basis', open.price_basis ?? '—'],
              ['Pricing state', open.pricing_state ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
                <dt className="text-[12px] text-gray-600">{k}</dt>
                <dd className="text-[12px] font-semibold text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
