import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart3, CalendarDays, CheckCircle2, Clock3, FileText,
  Landmark, Search, ShieldCheck, Sparkles, WalletCards,
} from 'lucide-react'
import { useEarnings } from '../../hooks/useEarnings'
import { statement, financialYear, annualGrossInr } from '../../lib/earningsStatement'
import { buildRange, hasPriorData } from '../../lib/earningsRange'
import { earningsSeries } from '../../lib/earningsSeries'
import { OWED_STATES } from '../../lib/payoutState'
import ScreenState from '../ui/ScreenState'
import EarningsStatement from './EarningsStatement'
import BankPanel from './earnings/BankPanel'
import DocumentsSection from './earnings/DocumentsSection'
import EarningsChart from './earnings/EarningsChart'
import EarningsMarketingCarousel from './EarningsMarketingCarousel'

const money = paise => `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`

function RangeTabs({ rangeId, onChange }) {
  const [customOpen, setCustomOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const tabs = [
    ['today', 'Today'],
    ['week', 'Week'],
    ['month', 'Month'],
    ['last-month', 'Last month'],
    ['fy', 'This year'],
  ]
  const customSelected = typeof rangeId === 'string' && rangeId.includes('..')

  return (
    <div className="rounded-[18px] bg-white p-1 shadow-sm ring-1 ring-ink/[0.06]">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setCustomOpen(false); onChange(id) }}
            className={`min-h-[38px] shrink-0 rounded-full px-3 text-[11px] font-extrabold transition-colors ${rangeId === id ? 'bg-plum-600 text-white shadow-sm' : 'text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(v => !v)}
          className={`min-h-[38px] shrink-0 rounded-full px-3 text-[11px] font-extrabold transition-colors ${customSelected ? 'bg-plum-600 text-white shadow-sm' : 'text-ink-soft'}`}
        >
          Custom
        </button>
      </div>
      {customOpen && (
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2 border-t border-ink/[0.06] px-1 pt-2">
          <label className="text-[9px] font-extrabold text-ink-mute">
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 h-9 w-full rounded-[10px] bg-ink/[0.035] px-2 text-[10px] font-semibold text-ink outline-none ring-1 ring-ink/[0.06]" />
          </label>
          <label className="text-[9px] font-extrabold text-ink-mute">
            To
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className="mt-1 h-9 w-full rounded-[10px] bg-ink/[0.035] px-2 text-[10px] font-semibold text-ink outline-none ring-1 ring-ink/[0.06]" />
          </label>
          <button type="button" disabled={!from || !to} onClick={() => { onChange(`${from}..${to}`); setCustomOpen(false) }} className="h-9 rounded-[10px] bg-plum-600 px-3 text-[10px] font-extrabold text-white disabled:opacity-40">
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

function MiniKpi({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    earned: 'bg-[#f7f0ff] text-plum-700',
    jobs: 'bg-[#eef7ff] text-blue-700',
    pending: 'bg-[#fff8e9] text-amber-700',
    paid: 'bg-[#edf9f3] text-emerald-700',
  }
  return (
    <div className="min-h-[92px] rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-ink/[0.05]">
      <div className="flex items-start gap-2.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${tones[tone]}`}>
          <Icon size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.08em] ${tones[tone]}`}>{label}</span>
          <p className="mt-1 font-extrabold leading-none text-ink">{value}</p>
          <p className="mt-1 text-[9.5px] leading-tight text-ink-mute">{sub}</p>
        </div>
      </div>
    </div>
  )
}

export default function Earnings({ vendorId, vendor, onAddPayout }) {
  const { jobs, payout, claims, adjustments, loading, error, retry, stale } = useEarnings(vendorId)
  const [params, setParams] = useSearchParams()
  const rangeId = params.get('range') ?? 'month'
  const [query, setQuery] = useState('')

  const fy = useMemo(() => financialYear(), [])
  const hasPan = !!payout?.pan
  const annualInr = useMemo(() => annualGrossInr(jobs, fy), [jobs, fy])
  const range = useMemo(() => buildRange(rangeId), [rangeId])
  const hasPrev = useMemo(() => hasPriorData(jobs, range), [jobs, range])
  const claimBy = useMemo(() => Object.fromEntries((claims ?? []).map(c => [c.line_id, c])), [claims])
  const series = useMemo(
    () => earningsSeries(jobs, range, { hasPan, annualGrossInr: annualInr, claimBy, hasPrev }),
    [jobs, range, hasPan, annualInr, claimBy, hasPrev],
  )
  const fyStatement = useMemo(
    () => statement(jobs, { fy, hasPan, annualGrossInr: annualInr }),
    [jobs, fy, hasPan, annualInr],
  )

  const ready = series.byState.ready ?? { net: 0, count: 0 }
  const owedJobs = OWED_STATES.reduce((n, s) => n + (series.byState[s]?.count ?? 0), 0)
  const visibleJobs = useMemo(
    () => series.rows
      .filter(x => x.state !== 'cancelled')
      .filter(x => !query || [x.row.occasion_name, x.row.area_label, x.row.service_name, x.row.trade]
        .filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
    [series.rows, query],
  )

  if (loading) return <ScreenState loading rows={4} what="your earnings" />
  if (error && jobs.length === 0) return <ScreenState error what="your earnings" onRetry={retry} />

  const destination = payout?.account_number
    ? `Account ending ${String(payout.account_number).slice(-4)}`
    : 'your bank account'

  return (
    <div className="space-y-2.5 pb-4">
      {stale && (
        <div className="rounded-[14px] bg-saffron-400/10 px-3 py-2 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-300/50">
          Showing your last known figures. <button type="button" onClick={retry} className="underline">Try again</button>
        </div>
      )}

      <EarningsMarketingCarousel />

      {/* Reference-design hero */}
      <section className="relative min-h-[158px] overflow-hidden rounded-[20px] bg-gradient-to-br from-[#32105f] via-[#5c18b5] to-[#7b2cff] px-4 py-3.5 text-white shadow-sm">
        <div className="absolute -right-5 top-3 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-5 top-10 flex h-20 w-24 items-center justify-center rounded-[20px] border border-white/25 bg-white/10 shadow-[0_15px_40px_rgba(0,0,0,.2)]">
          <WalletCards size={48} className="text-white/90" strokeWidth={1.5} />
          <span className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[18px] font-black text-plum-700 shadow-lg">₹</span>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/75">Ready to claim</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[8.5px] font-bold">
              <ShieldCheck size={11} /> Payouts go directly to your bank
            </span>
          </div>
          <p className="mt-1 font-serif text-[31px] font-extrabold leading-none">{money(ready.net)}</p>
          <p className="mt-1.5 max-w-[230px] text-[10.5px] font-semibold leading-snug text-white/80">
            {ready.net > 0 ? `${ready.count} completed ${ready.count === 1 ? 'job' : 'jobs'} are ready.` : 'Nothing is claimable yet. Money becomes yours a day after the event.'}
          </p>
          <div className="absolute left-0 right-0 bottom-0 flex items-center gap-1.5 border-t border-white/15 pt-2 text-[10px] text-white/75">
            <Landmark size={12} />
            <span>Paid straight to {destination}</span>
            <ArrowRight size={11} className="ml-auto" />
          </div>
        </div>
      </section>

      <RangeTabs rangeId={rangeId} onChange={id => setParams(prev => { const n = new URLSearchParams(prev); n.set('range', id); return n }, { replace: true })} />

      <div className="grid grid-cols-2 gap-2.5">
        <MiniKpi icon={BarChart3} label="Earned" value={money(series.kpis.earned.value)} sub={`Net · ${range.label}`} tone="earned" />
        <MiniKpi icon={CalendarDays} label="Jobs done" value={series.kpis.jobs.value} sub="Completed in this range" tone="jobs" />
        <MiniKpi icon={Clock3} label="Pending" value={money(series.kpis.pending.value)} sub={owedJobs ? `${owedJobs} jobs across all time` : 'Nothing owed right now'} tone="pending" />
        <MiniKpi icon={WalletCards} label="Paid out" value={money(series.kpis.paid.value)} sub="Sent to your account" tone="paid" />
      </div>

      <div id="earnings-over-time"><EarningsChart series={series.series} range={range} /></div>


      <section className="rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-ink/[0.06]">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-plum-600" />
          <div>
            <h2 className="text-[13px] font-extrabold text-ink">Earnings by service</h2>
            <p className="text-[10px] text-ink-mute">{range.label}</p>
          </div>
        </div>
        {series.byTrade.length === 0 ? (
          <div className="mt-3 flex min-h-[62px] items-center justify-center rounded-[14px] bg-[#faf8ff] text-center text-[10.5px] text-ink-mute">
            <span><Sparkles size={15} className="mx-auto mb-1 text-plum-600" />Nothing in this range yet. Your trades appear here once a job in the window has been paid for.</span>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {series.byTrade.slice(0, 4).map(item => (
              <li key={item.trade} className="flex items-center gap-2 text-[10.5px]">
                <span className="h-2.5 w-2.5 rounded-full bg-plum-500" />
                <span className="min-w-0 flex-1 truncate font-semibold">{item.trade}</span>
                <span className="font-extrabold">{money(item.net)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="your-work" className="rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-ink/[0.06]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-plum-600" />
            <h2 className="text-[13px] font-extrabold">Your work</h2>
          </div>
          <span className="text-[10px] text-ink-mute">{visibleJobs.length} jobs</span>
        </div>
        <div className="flex h-9 items-center gap-2 rounded-[12px] bg-ink/[0.035] px-2.5 ring-1 ring-ink/[0.05]">
          <Search size={14} className="text-ink-mute" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a job, occasion or area" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-ink-mute" />
        </div>
        <div className="mt-2 space-y-1.5">
          {visibleJobs.slice(0, 4).map(x => (
            <div key={x.row.line_id} className="flex items-center gap-2 rounded-[12px] bg-[#faf9fd] px-2.5 py-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-extrabold">{x.row.occasion_name || x.row.service_name || x.row.trade || 'Job'}</p>
                <p className="truncate text-[9px] text-ink-mute">{x.row.area_label || x.date || 'Completed job'}</p>
              </div>
              <span className="text-[10.5px] font-extrabold">{money(x.money.netPaise)}</span>
            </div>
          ))}
          {visibleJobs.length === 0 && <div className="py-3 text-center text-[10.5px] text-ink-mute">No jobs match this filter.</div>}
        </div>
      </section>

      <div id="your-statement"><EarningsStatement statement={fyStatement} /></div>

      <div id="your-account"><BankPanel payout={payout} onAddPayout={onAddPayout} /></div>
      <DocumentsSection statement={fyStatement} fy={fy} partner={vendor ?? {}} />

      {jobs.length === 0 && (
        <div className="rounded-[18px] bg-[#faf8ff] px-4 py-3 text-center ring-1 ring-plum-100">
          <Sparkles size={18} className="mx-auto text-plum-600" />
          <p className="mt-1 text-[12px] font-extrabold text-ink">No earnings yet</p>
          <p className="text-[10px] text-ink-mute">Keep your list and your calendar current — that is what decides how often you are matched.</p>
        </div>
      )}
    </div>
  )
}
