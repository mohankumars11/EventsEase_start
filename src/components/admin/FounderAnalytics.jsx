import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * The founder's view: supply, demand, conversion and attention.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY NUMBER CARRIES ITS DEFINITION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Section 6.1 asks for the metric definition, period and source beside
 * the figure. That is not decoration here: "partners" can mean rows in
 * `vendors`, rows that are not synthetic, approved ones, or ones
 * actually taking work, and those four numbers differ by two orders of
 * magnitude on this database — 229, 8, and single digits. A dashboard
 * that prints one of them as "Partners" is not reporting, it is
 * picking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SYNTHETIC SUPPLY IS EXCLUDED AND SAID SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * 221 of 229 vendor rows are seeded test supply. Every count here is
 * `is_synthetic = false`, and the header states both numbers so nobody
 * reconciles this screen against a raw table count and concludes the
 * console is broken.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FUNNEL OVER NO DEMAND IS A DRAWING
 * ══════════════════════════════════════════════════════════════════════
 *
 * There are no bookings and no escrow entries. Conversion, revenue and
 * acceptance rate therefore have no denominator, and the tiles say
 * "Not yet available" with the reason rather than rendering 0% and
 * letting it read as a result.
 */

function Metric({ label, value, definition, source, unavailable, reason }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      {unavailable ? (
        <p className="text-[15px] font-bold text-gray-400">Not yet available</p>
      ) : (
        <p className="text-[26px] font-black leading-none tabular-nums text-gray-900">{value}</p>
      )}
      <p className="mt-1.5 text-[13px] font-bold text-gray-800">{label}</p>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">{unavailable ? reason : definition}</p>
      <p className="mt-1 font-mono text-[10px] text-gray-400">{source}</p>
    </div>
  )
}

/* A bar per trade, scaled to the largest. Deliberately not a chart
   library: the question is "which trades have supply and which have
   none", and a sorted bar answers it at a glance without a legend. */
function TradeBars({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.n))
  return (
    <ul className="space-y-1.5">
      {rows.map(r => (
        <li key={r.trade} className="flex items-center gap-3">
          <span className="w-52 shrink-0 truncate text-[12px] text-gray-700" title={r.trade}>{r.trade}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <span className={`block h-full rounded-full ${r.n ? 'bg-violet-500' : 'bg-gray-200'}`}
              style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="w-8 shrink-0 text-right text-[12px] font-bold tabular-nums text-gray-900">{r.n}</span>
        </li>
      ))}
    </ul>
  )
}

export default function FounderAnalytics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [showEmptyTrades, setShowEmptyTrades] = useState(false)

  const load = useCallback(async () => {
    setData(null); setError(null)
    try {
      const countOf = async (table, build = q => q) => {
        const { count, error: e } = await build(supabase.from(table).select('id', { count: 'exact', head: true }))
        if (e) return null
        return count ?? 0
      }

      const [
        allVendors, realVendors, approved, acceptingJobs, submitted, suspended,
        liveListings, pendingListings, bookingLines, escrowRows, quoteRequests, docsPending,
      ] = await Promise.all([
        countOf('vendors'),
        countOf('vendors', q => q.eq('is_synthetic', false)),
        countOf('vendors', q => q.eq('is_synthetic', false).eq('verification_status', 'approved')),
        countOf('vendors', q => q.eq('is_synthetic', false).eq('accepting_jobs', true)),
        countOf('vendors', q => q.eq('is_synthetic', false).eq('verification_status', 'submitted')),
        countOf('vendors', q => q.eq('is_synthetic', false).eq('verification_status', 'suspended')),
        /* Joined to vendors so seeded supply does not dominate. Counting
           vendor_services alone gave 496 live cards against 8 real
           partners — a number that describes the test fixture, not the
           marketplace. */
        countOf('vendor_services', q => q.eq('review_status', 'live').eq('vendors.is_synthetic', false).select('id, vendors!inner(is_synthetic)', { count: 'exact', head: true })),
        countOf('vendor_services', q => q.eq('review_status', 'under_review').eq('vendors.is_synthetic', false).select('id, vendors!inner(is_synthetic)', { count: 'exact', head: true })),
        countOf('booking_lines'),
        countOf('escrow_ledger'),
        countOf('sambramo_quote_requests'),
        countOf('vendor_documents', q => q.eq('status', 'pending')),
      ])

      /* Supply per trade, counted from real partners only. The registry
         supplies the full trade list so a trade with zero supply is
         visible as a zero rather than missing from the chart. */
      /* The trade is on the LISTING, not the partner. Every one of the 8
         real vendors has a null or empty `vendors.category`; the trade
         they work in is `vendor_services.category`. Counting the vendor
         column returned zero supply for all 34 trades while nine trades
         plainly had listings. */
      const [reg, svc] = await Promise.all([
        supabase.from('sambramo_trade_registry').select('id, name').order('sort_order'),
        supabase.from('vendor_services')
          .select('vendor_id, category, vendors!inner(is_synthetic)')
          .eq('vendors.is_synthetic', false)
          .limit(5000),
      ])
      /* Distinct partners per trade, not listings per trade — a partner
         with four cards in one trade is one unit of supply. */
      const seen = {}
      for (const r of svc.data ?? []) {
        if (!r.category) continue
        ;(seen[r.category] ||= new Set()).add(r.vendor_id)
      }
      const byTrade = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, v.size]))
      const trades = (reg.data ?? []).map(t => ({ trade: t.name, n: byTrade[t.name] ?? 0 }))
        .sort((a, b) => b.n - a.n)

      setData({
        allVendors, realVendors, approved, acceptingJobs, submitted, suspended,
        liveListings, pendingListings, bookingLines, escrowRows, quoteRequests, docsPending,
        trades,
      })
    } catch (e) {
      setError(String(e?.message ?? e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tradesShown = useMemo(() => {
    if (!data) return []
    return showEmptyTrades ? data.trades : data.trades.filter(t => t.n > 0)
  }, [data, showEmptyTrades])

  if (error) return <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200">{error}</p>
  if (!data) return <p className="p-6 text-[13px] text-gray-500">Loading…</p>

  const noDemand = !data.bookingLines

  return (
    <div className="space-y-5 p-1">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-gray-900">Founder analytics</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            Supply, demand and where the marketplace is stuck. Every figure names its definition and source.
          </p>
        </div>
        <button type="button" onClick={load}
          className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
      </header>

      <p className="rounded-xl bg-sky-50 p-3 text-[13px] leading-relaxed text-sky-900 ring-1 ring-sky-200">
        <b>Test supply is excluded.</b> {data.allVendors} rows exist in <code>vendors</code>;{' '}
        {data.realVendors} are real and {data.allVendors - data.realVendors} are seeded test partners.
        Every count below is real partners only, so this screen will not reconcile against a raw
        table count — by design.
      </p>

      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Supply</h3>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Real partners" value={data.realVendors}
          definition="Vendor rows that are not seeded test supply, in any state."
          source="vendors where is_synthetic = false" />
        <Metric label="Approved" value={data.approved}
          definition="Passed review. Approved is not live — see next."
          source="verification_status = approved" />
        <Metric label="Taking work" value={data.acceptingJobs}
          definition="Approved and switched on. This is the number that can actually serve a booking."
          source="accepting_jobs = true" />
        <Metric label="Waiting on review" value={data.submitted}
          definition="Submitted and undecided. Each one is review time owed."
          source="verification_status = submitted" />
        <Metric label="Suspended" value={data.suspended}
          definition="Stopped accounts, excluded from supply."
          source="verification_status = suspended" />
        <Metric label="Documents pending" value={data.docsPending}
          definition="Uploaded compliance files awaiting a decision."
          source="vendor_documents where status = pending" />
      </section>

      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Listings</h3>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Live service cards" value={data.liveListings}
          definition="Listings a customer can actually find and book."
          source="vendor_services where review_status = live" />
        <Metric label="Listings in review" value={data.pendingListings}
          definition="Submitted cards blocking their partner from earning."
          source="vendor_services where review_status = under_review" />
        <Metric label="Approved but not live"
          value={Math.max(0, data.approved - data.acceptingJobs)}
          definition="Partners who passed review and are not taking work. Review time spent, nothing earned."
          source="approved − accepting_jobs" />
      </section>

      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Demand &amp; conversion</h3>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Booking lines" value={data.bookingLines}
          definition="Every line ever created, in any state."
          source="booking_lines" />
        <Metric label="Custom inquiries" value={data.quoteRequests ?? 0}
          definition="Quote requests raised by customers."
          source="sambramo_quote_requests" />
        {/* Lines ÷ listings is not a conversion rate and rendered 200%,
            which is the giveaway: a rate cannot exceed 100%. A real
            conversion needs a funnel — requests raised against requests
            that became bookings — and booking_requests carries no
            outcome column to measure it with. Saying so beats printing
            a confident number that means nothing. */}
        <Metric label="Booking conversion" unavailable
          value="—"
          reason="Not measurable yet: there is no request-to-booking funnel. booking_requests records no outcome, so bookings cannot be divided by anything meaningful."
          definition="Requests that became bookings."
          source="needs an outcome on booking_requests" />
        <Metric label="Money in escrow" unavailable={!data.escrowRows} value="—"
          reason="escrow_ledger is empty. This fills the first time a customer pays."
          definition="Customer money captured and not yet released."
          source="escrow_ledger" />
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-bold text-gray-900">Supply by trade</h3>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Distinct real partners per trade, counted from their listings. {data.trades.filter(t => !t.n).length} of {data.trades.length} trades
              have no supply at all.
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
            <input type="checkbox" checked={showEmptyTrades} onChange={e => setShowEmptyTrades(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
            Show empty trades
          </label>
        </div>
        <div className="mt-3">
          {tradesShown.length === 0
            ? <p className="text-[13px] text-gray-500">No trade has a real partner yet.</p>
            : <TradeBars rows={tradesShown} />}
        </div>
      </section>

      <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <h3 className="text-[13px] font-bold text-amber-900">Where it is stuck</h3>
        <ul className="mt-2 space-y-1 text-[13px] text-amber-900">
          {data.submitted > 0 && <li>• {data.submitted} partner{data.submitted === 1 ? '' : 's'} waiting on a review decision.</li>}
          {data.pendingListings > 0 && <li>• {data.pendingListings} listing{data.pendingListings === 1 ? '' : 's'} in review, each blocking a partner from earning.</li>}
          {data.docsPending > 0 && <li>• {data.docsPending} document{data.docsPending === 1 ? '' : 's'} awaiting a compliance decision.</li>}
          {Math.max(0, data.approved - data.acceptingJobs) > 0 && (
            <li>• {data.approved - data.acceptingJobs} approved partner(s) not taking work — supply paid for and idle.</li>
          )}
          {noDemand && <li>• No bookings exist. Supply work is ahead of demand; nothing downstream can be measured yet.</li>}
          {data.acceptingJobs > data.approved && (
            /* Not a metric — a contradiction. Accepting work without
               having passed review means dispatch can reach a partner
               nobody approved, so it is surfaced rather than smoothed
               over by the max(0, …) above. */
            <li>• <b>{data.acceptingJobs - data.approved} partner(s) are accepting work without an approved
              verification status.</b> Worth checking: approved is {data.approved}, accepting is {data.acceptingJobs}.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
