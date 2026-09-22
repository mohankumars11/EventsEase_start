import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CloudOff } from 'lucide-react'
import { useEarnings } from '../../hooks/useEarnings'
import { statement, financialYear, annualGrossInr } from '../../lib/earningsStatement'
import { buildRange, hasPriorData } from '../../lib/earningsRange'
import { earningsSeries } from '../../lib/earningsSeries'
import { OWED_STATES } from '../../lib/payoutState'
import ScreenState from '../ui/ScreenState'
import PayoutHistory from './PayoutHistory'
import EarningsStatement from './EarningsStatement'
import EarningsHero from './earnings/EarningsHero'
import RangeFilter from './earnings/RangeFilter'
import KpiCards from './earnings/KpiCards'
import EarningsChart from './earnings/EarningsChart'
import Donut from './earnings/Donut'
import BankPanel from './earnings/BankPanel'
import DocumentsSection from './earnings/DocumentsSection'
import AdjustmentsPanel from './earnings/AdjustmentsPanel'
import TransactionDetail from './earnings/TransactionDetail'
import {
  TransactionList, TransactionTable, TransactionFilters, filterRows,
} from './earnings/Transactions'

/**
 * What this partner has earned, where each rupee is, and the proof.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS FILE ORCHESTRATES. IT DOES NOT DO ARITHMETIC.
 * ══════════════════════════════════════════════════════════════════════
 *
 * It used to derive five buckets inline, re-implement the claim window
 * in JS, and sum three different ways in three places — which is how the
 * screen came to show a total that its own rows did not add up to, and
 * how one job read "Ready to claim" here and "Delivered" on the Jobs
 * tab.
 *
 * Now: one read (`useEarnings`), one ladder (`payoutState`), one pass
 * (`earningsSeries`), one money function (`jobMoney`, called once per
 * job inside that pass). Every figure below is a property of that
 * result. If the headline and the list ever disagree again, the bug is
 * in `earningsSeries.js` and nowhere else — and
 * `check-earnings-period.mjs` asserts they cannot.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FILTERS RUN OVER FETCHED ROWS, NOT OVER THE NETWORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner has tens of jobs a year, not thousands. Round-tripping on
 * every chip tap would make the filter feel broken on 3G, and the
 * period-over-period comparison needs the PREVIOUS window resident
 * anyway — so a server-side range query would be two queries per tap to
 * produce something already in memory.
 *
 * ── The trap, written down because it has teeth ─────────────────────
 * `annualGrossInr` is computed over the WHOLE row set, never the
 * filtered range, and threaded down. It drives the s.194-O TDS waiver:
 * computed over "Today" it falls under the threshold, TDS vanishes, and
 * every net on screen jumps when somebody taps a chip — the same job
 * worth two different amounts depending on a filter.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FIRST lg: BREAKPOINTS IN src/components/vendor
 * ══════════════════════════════════════════════════════════════════════
 *
 * Deliberate, and the only screen in the partner app that has them. The
 * phone is the unprefixed layout — it is what the Capacitor APK ships
 * and how partners actually work — and `lg:` adds a second column for a
 * laptop. The bottom tab bar stays put at every width: moving navigation
 * at 1024px would give the partner app two navigation models, which is
 * the duplicate-navigation defect `check-one-partner-ui` exists to stop.
 */
export default function Earnings({ vendorId, vendor, onAddPayout }) {
  const { jobs, payout, claims, adjustments, loading, error, retry, stale } = useEarnings(vendorId)

  /* Sub-state on the same route, so back works, a deep link survives and
     a partner can be sent to one job. `?tab=` is untouched — the tab bar
     reads only that, and a second URL for this screen would be the
     duplicate-navigation defect above. */
  const [params, setParams] = useSearchParams()
  const rangeId = params.get('range') ?? 'month'
  const openId = params.get('txn')
  const [filters, setFilters] = useState({ q: '', state: null })

  const setParam = useCallback((key, value) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (value == null) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }, [setParams])

  /* line_id -> claim. A claim is the partner having asked; `paid` is us
     having sent it. */
  const claimBy = useMemo(
    () => Object.fromEntries((claims ?? []).map(c => [c.line_id, c])), [claims])

  const fy = useMemo(() => financialYear(), [])
  const hasPan = !!payout?.pan
  /* Over every row, never over the range. See the trap above. */
  const annualInr = useMemo(() => annualGrossInr(jobs, fy), [jobs, fy])

  const range = useMemo(() => buildRange(rangeId), [rangeId])
  const hasPrev = useMemo(() => hasPriorData(jobs, range), [jobs, range])

  const series = useMemo(
    () => earningsSeries(jobs, range, { hasPan, annualGrossInr: annualInr, claimBy, hasPrev }),
    [jobs, range, hasPan, annualInr, claimBy, hasPrev])

  const fyStatement = useMemo(
    () => statement(jobs, { fy, hasPan, annualGrossInr: annualInr }),
    [jobs, fy, hasPan, annualInr])

  const ready = series.byState.ready ?? { net: 0, count: 0 }
  const owedJobs = OWED_STATES.reduce((n, s) => n + (series.byState[s]?.count ?? 0), 0)

  const visible = useMemo(() => {
    /* Sorted newest first, which is the order the underlying read
       already asks for; re-stated here because filtering does not
       promise to preserve it. */
    return filterRows(series.rows, filters)
      .filter(e => e.state !== 'cancelled')
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
  }, [series.rows, filters])

  const open = useMemo(
    () => series.rows.find(e => e.row.line_id === openId) ?? null,
    [series.rows, openId])

  /* ── The three states, in the order they can occur ────────────────
     `loading` is true only on the first read, so the screen does not
     flash a skeleton every twenty seconds. The error branch fires only
     when there is nothing to show: a failed poll with figures already up
     leaves them there and marks them stale, because replacing a
     partner's earnings with an error card is worse than saying "these
     are from a minute ago". */
  if (loading) return <ScreenState loading rows={4} what="your earnings" />
  if (error && jobs.length === 0) {
    return <ScreenState error what="your earnings" onRetry={retry} />
  }

  /* Adjustments attached to THIS job go on its slip, below the net.
     Account-level ones (line_id null) belong to the panel instead —
     putting them on one job's slip would say a booking earned money it
     had nothing to do with. */
  const detail = open && (
    <TransactionDetail
      entry={open}
      claim={claimBy[open.row.line_id] ?? null}
      payout={payout}
      partner={vendor ?? {}}
      hasPan={hasPan}
      annualGrossInr={annualInr}
      adjustments={(adjustments ?? []).filter(a => a.line_id === open.row.line_id)}
      onClaimed={retry}
      onClose={() => setParam('txn', null)}
    />
  )

  return (
    <div className="space-y-3.5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
      {stale && (
        <div className="flex items-start gap-2 rounded-[16px] bg-saffron-400/10 px-3.5 py-2.5 ring-1 ring-saffron-300/50 lg:col-span-12">
          <CloudOff size={14} className="mt-0.5 shrink-0 text-saffron-800" />
          <p className="text-[12px] font-semibold leading-snug text-saffron-800">
            Showing your last known figures. We could not refresh just now.{' '}
            <button type="button" onClick={retry} className="underline underline-offset-2">
              Try again
            </button>
          </p>
        </div>
      )}

      {/* ── Left: the analysis ────────────────────────────────────── */}
      <div className="space-y-3.5 lg:col-span-8">
        {/* On a phone the hero leads, because "what is mine now" is the
            question. On a desktop it moves to the rail and the analysis
            leads, because there is room for both and the eye starts left. */}
        <div className="lg:hidden">
          <EarningsHero
            readyPaise={ready.net} readyCount={ready.count}
            payout={payout} onAddPayout={onAddPayout}
          />
        </div>

        <RangeFilter range={range} onChange={id => setParam('range', id)} />

        <KpiCards kpis={series.kpis} range={range} owedJobs={owedJobs} />

        <EarningsChart series={series.series} range={range} />

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <h2 className="text-[13.5px] font-extrabold text-ink">Earnings by service</h2>
          <p className="mb-3 text-[11px] text-ink-mute">{range.label}</p>
          <Donut
            slices={series.byTrade}
            total={series.kpis.earned.value}
            centreLabel={range.label}
          />
        </section>

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <h2 className="text-[13.5px] font-extrabold text-ink">Your work</h2>
            <p className="text-[11px] text-ink-mute">
              {visible.length} {visible.length === 1 ? 'job' : 'jobs'}
            </p>
          </div>

          <TransactionFilters rows={series.rows} value={filters} onChange={setFilters} />

          <div className="mt-3 lg:hidden">
            <TransactionList rows={visible} onOpen={id => setParam('txn', id)} />
          </div>
          <div className="mt-3 hidden lg:block">
            <TransactionTable rows={visible} onOpen={id => setParam('txn', id)} />
          </div>
        </section>

        <div className="lg:hidden">
          <PayoutHistory
            claims={claims} jobsByLine={Object.fromEntries(jobs.map(j => [j.line_id, j]))}
            hasPan={hasPan} annualGrossInr={annualInr}
          />
        </div>

        <EarningsStatement statement={fyStatement} />
      </div>

      {/* ── Right: what is mine, and where it goes ────────────────── */}
      <div className="space-y-3.5 lg:col-span-4 lg:sticky lg:top-4">
        <div className="hidden lg:block">
          <EarningsHero
            readyPaise={ready.net} readyCount={ready.count}
            payout={payout} onAddPayout={onAddPayout}
          />
        </div>

        {/* The detail replaces the rail's contents at lg, and is a sheet
            over the screen below it. One component, two placements. */}
        {detail}

        {!open && (
          <>
            <div className="hidden lg:block">
              <PayoutHistory
                claims={claims} jobsByLine={Object.fromEntries(jobs.map(j => [j.line_id, j]))}
                hasPan={hasPan} annualGrossInr={annualInr}
              />
            </div>
            <AdjustmentsPanel
              adjustments={(adjustments ?? []).filter(a => !a.line_id)} />
            <BankPanel payout={payout} onAddPayout={onAddPayout} />
            <DocumentsSection statement={fyStatement} fy={fy} partner={vendor ?? {}} />
          </>
        )}
      </div>

      {jobs.length === 0 && (
        <div className="lg:col-span-12">
          <ScreenState
            empty
            title="No earnings yet"
            message="Keep your list and your calendar current — that is what decides how often you are matched."
          />
        </div>
      )}
    </div>
  )
}
