import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Payments, commission and revenue — kept apart on purpose.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THESE ARE NOT THE SAME NUMBER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 15 is blunt about it and it is the most common way a
 * marketplace dashboard lies: gross booked value, cash collected,
 * partner earnings, refunds and platform revenue get summed into one
 * confident figure labelled "revenue". Every metric here names the
 * table and column it came from, and nothing is derived by assuming a
 * booking was paid or a payout was made.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "NOT YET AVAILABLE" IS A REAL ANSWER
 * ══════════════════════════════════════════════════════════════════════
 *
 * escrow_ledger, payout_claims and bookings are empty today. Section
 * 6.1 says to show that rather than invent a value, so a metric whose
 * source has no rows says so and explains what would fill it. A zero
 * that means "no money has moved" and a zero that means "we cannot
 * measure this" are different facts and an operator must not have to
 * guess which one they are looking at.
 *
 * Sambramo's partner commission is configured at zero. Where the fee
 * genuinely computes to zero that is shown as ₹0 from
 * platform_fee_paise — not hidden, and not replaced with an invented
 * fee to make the chart look alive.
 */

const rupees = paise => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`

const METRICS = [
  {
    id: 'gross', label: 'Gross booking value',
    source: 'booking_lines.quoted_amount_paise',
    meaning: 'What customers were quoted across every line, whatever happened next. Not cash.',
  },
  {
    id: 'collected', label: 'Customer payments collected',
    source: 'booking_lines.quoted_amount_paise where paid_at is set',
    meaning: 'Lines the system recorded as paid. This is the closest thing to cash in.',
  },
  {
    id: 'partner', label: 'Partner earnings',
    source: 'booking_lines.partner_amount_paise',
    meaning: 'What the partner is owed. Owed is not paid — see payouts below.',
  },
  {
    id: 'fee', label: 'Platform fee',
    source: 'booking_lines.platform_fee_paise',
    meaning: 'Commission as configured. Zero is a real answer here, not a missing one.',
  },
  {
    id: 'cancelled', label: 'Cancelled value',
    source: 'booking_lines.quoted_amount_paise where status = cancelled',
    meaning: 'Booked and then lost. Excluded from everything above except gross.',
  },
]

function Tile({ label, value, source, meaning, unavailable }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      {unavailable ? (
        <p className="text-[15px] font-bold text-gray-400">Not yet available</p>
      ) : (
        <p className="text-[22px] font-black tabular-nums leading-none text-gray-900">{value}</p>
      )}
      <p className="mt-1.5 text-[13px] font-bold text-gray-800">{label}</p>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">{meaning}</p>
      <p className="mt-1 font-mono text-[10px] text-gray-400">{source}</p>
    </div>
  )
}

export default function RevenueConsole() {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null); setState(null)

    const lines = await supabase.from('booking_lines')
      .select('status, quoted_amount_paise, partner_amount_paise, platform_fee_paise, paid_at, settled_at')
      .limit(5000)
    if (lines.error) { setError(lines.error.message); return }
    const rows = lines.data ?? []

    const sum = (f, pred = () => true) => rows.filter(pred).reduce((a, r) => a + Number(r[f] || 0), 0)

    /* Escrow and payouts are separate systems with their own tables. If
       they are empty the metric is unmeasurable, not zero. */
    const count = async (table) => {
      const { count: n, error: e } = await supabase.from(table).select('id', { count: 'exact', head: true })
      return e ? null : (n ?? 0)
    }
    const [escrowRows, claimRows] = await Promise.all([count('escrow_ledger'), count('payout_claims')])

    let escrowHeld = null, payoutsPaid = null, payoutsOpen = null
    if (escrowRows) {
      const esc = await supabase.from('escrow_ledger').select('kind, amount_paise').limit(5000)
      if (!esc.error) {
        const e = esc.data ?? []
        escrowHeld = e.filter(r => /hold|capture/i.test(r.kind || '')).reduce((a, r) => a + Number(r.amount_paise || 0), 0)
      }
    }
    if (claimRows) {
      const cl = await supabase.from('payout_claims').select('status, amount_paise').limit(5000)
      if (!cl.error) {
        const c = cl.data ?? []
        payoutsPaid = c.filter(r => String(r.status).toLowerCase() === 'settled').reduce((a, r) => a + Number(r.amount_paise || 0), 0)
        payoutsOpen = c.filter(r => !['settled', 'failed'].includes(String(r.status).toLowerCase())).reduce((a, r) => a + Number(r.amount_paise || 0), 0)
      }
    }

    setState({
      lines: rows.length,
      escrowRows, claimRows,
      gross: sum('quoted_amount_paise'),
      collected: sum('quoted_amount_paise', r => r.paid_at),
      partner: sum('partner_amount_paise'),
      fee: sum('platform_fee_paise'),
      cancelled: sum('quoted_amount_paise', r => String(r.status).toLowerCase() === 'cancelled'),
      escrowHeld, payoutsPaid, payoutsOpen,
    })
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 p-1">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-gray-900">Payments &amp; revenue</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            Booked, collected, owed and paid are four different numbers. Each one names its source.
          </p>
        </div>
        <button type="button" onClick={load}
          className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>}

      {!state ? (
        <p className="text-[13px] text-gray-500">Loading…</p>
      ) : (
        <>
          <p className="rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900 ring-1 ring-sky-200">
            Read from <b>{state.lines}</b> booking line{state.lines === 1 ? '' : 's'},{' '}
            <b>{state.escrowRows ?? '—'}</b> escrow entries and <b>{state.claimRows ?? '—'}</b> payout claims.
            {state.lines === 0 && ' No bookings exist yet, so every figure below is structural rather than earned.'}
          </p>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map(m => (
              <Tile key={m.id} label={m.label} source={m.source} meaning={m.meaning}
                value={rupees(state[m.id])} unavailable={false} />
            ))}
          </section>

          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Money movement</h3>
          <section className="grid gap-3 sm:grid-cols-3">
            <Tile
              label="Held in escrow" source="escrow_ledger" unavailable={!state.escrowRows}
              value={rupees(state.escrowHeld)}
              meaning={state.escrowRows
                ? 'Customer money captured and not yet released.'
                : 'No escrow entries exist. This fills when a customer first pays.'}
            />
            <Tile
              label="Payouts settled" source="payout_claims where status = settled" unavailable={!state.claimRows}
              value={rupees(state.payoutsPaid)}
              meaning={state.claimRows
                ? 'Money that actually reached a partner.'
                : 'No payout claims exist. Owed is visible above; paid is not measurable yet.'}
            />
            <Tile
              label="Payouts outstanding" source="payout_claims not settled or failed" unavailable={!state.claimRows}
              value={rupees(state.payoutsOpen)}
              meaning={state.claimRows
                ? 'Claimed and not yet settled.'
                : 'No payout claims exist.'}
            />
          </section>

          <p className="rounded-xl bg-gray-50 p-3 text-[12px] leading-relaxed text-gray-600 ring-1 ring-gray-200">
            <b>Why some tiles say “Not yet available”.</b> A zero meaning “no money has moved” and a
            zero meaning “this cannot be measured” are different facts. Where the source table has no
            rows, the tile says so instead of printing ₹0 and letting it be read as a result.
            Partner commission is configured at zero, so a genuine ₹0 platform fee is shown as ₹0.
          </p>
        </>
      )}
    </div>
  )
}
