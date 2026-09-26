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
import EarningsMarketingCarousel from './EarningsMarketingCarousel'
import {
  TransactionList, TransactionTable, TransactionFilters, filterRows,
} from './earnings/Transactions'

export default function Earnings({ vendorId, vendor, onAddPayout }) {
  const { jobs, payout, claims, adjustments, loading, error, retry, stale } = useEarnings(vendorId)
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

  const claimBy = useMemo(
    () => Object.fromEntries((claims ?? []).map(c => [c.line_id, c])), [claims])
  const fy = useMemo(() => financialYear(), [])
  const hasPan = !!payout?.pan
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

  const visible = useMemo(() => (
    filterRows(series.rows, filters)
      .filter(e => e.state !== 'cancelled')
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
  ), [series.rows, filters])

  const open = useMemo(
    () => series.rows.find(e => e.row.line_id === openId) ?? null,
    [series.rows, openId])

  if (loading) return <ScreenState loading rows={4} what="your earnings" />
  if (error && jobs.length === 0) {
    return <ScreenState error what="your earnings" onRetry={retry} />
  }

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
            <button type="button" onClick={retry} className="underline underline-offset-2">Try again</button>
          </p>
        </div>
      )}

      <div className="space-y-3.5 lg:col-span-8">
        <div className="lg:hidden">
          <EarningsHero readyPaise={ready.net} readyCount={ready.count} payout={payout} onAddPayout={onAddPayout} />
        </div>

        <RangeFilter range={range} onChange={id => setParam('range', id)} />
        <KpiCards kpis={series.kpis} range={range} owedJobs={owedJobs} />

        <section id="earnings-over-time">
          <EarningsChart series={series.series} range={range} />
        </section>

        <EarningsMarketingCarousel />

        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <h2 className="text-[13.5px] font-extrabold text-ink">Earnings by service</h2>
          <p className="mb-3 text-[11px] text-ink-mute">{range.label}</p>
          <Donut slices={series.byTrade} total={series.kpis.earned.value} centreLabel={range.label} />
        </section>

        <section id="your-work" className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <h2 className="text-[13.5px] font-extrabold text-ink">Your work</h2>
            <p className="text-[11px] text-ink-mute">{visible.length} {visible.length === 1 ? 'job' : 'jobs'}</p>
          </div>
          <TransactionFilters rows={series.rows} value={filters} onChange={setFilters} />
          <div className="mt-3 lg:hidden"><TransactionList rows={visible} onOpen={id => setParam('txn', id)} /></div>
          <div className="mt-3 hidden lg:block"><TransactionTable rows={visible} onOpen={id => setParam('txn', id)} /></div>
        </section>

        <div className="lg:hidden">
          <PayoutHistory claims={claims} jobsByLine={Object.fromEntries(jobs.map(j => [j.line_id, j]))} hasPan={hasPan} annualGrossInr={annualInr} />
        </div>
        <EarningsStatement statement={fyStatement} />
      </div>

      <div className="space-y-3.5 lg:col-span-4 lg:sticky lg:top-4">
        <div className="hidden lg:block">
          <EarningsHero readyPaise={ready.net} readyCount={ready.count} payout={payout} onAddPayout={onAddPayout} />
        </div>
        {detail}
        {!open && (
          <>
            <div className="hidden lg:block">
              <PayoutHistory claims={claims} jobsByLine={Object.fromEntries(jobs.map(j => [j.line_id, j]))} hasPan={hasPan} annualGrossInr={annualInr} />
            </div>
            <AdjustmentsPanel adjustments={(adjustments ?? []).filter(a => !a.line_id)} />
            <BankPanel payout={payout} onAddPayout={onAddPayout} />
            <DocumentsSection statement={fyStatement} fy={fy} partner={vendor ?? {}} />
          </>
        )}
      </div>

      {jobs.length === 0 && (
        <div className="lg:col-span-12">
          <ScreenState empty title="No earnings yet" message="Keep your list and your calendar current — that is what decides how often you are matched." />
        </div>
      )}
    </div>
  )
}
