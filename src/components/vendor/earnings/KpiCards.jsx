import { ArrowDownRight, ArrowUpRight, CalendarCheck2, Clock3, IndianRupee, Minus, Send, Sparkles } from 'lucide-react'
import { formatINR } from '../../../utils/format'

const TONE = {
  plum:    'from-plum-50 to-fuchsia-50 text-plum-700 ring-plum-100',
  blue:    'from-blue-50 to-indigo-50 text-blue-700 ring-blue-100',
  saffron: 'from-amber-50 to-orange-50 text-amber-800 ring-amber-100',
  green:   'from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100',
}

const rupees = p => formatINR(Math.round(p / 100))

function Delta({ kpi, periodLabel, goodWhenUp = true }) {
  const { delta, reason } = kpi
  if (delta === null) {
    const words = {
      'no-prior': 'No earlier period to compare',
      'from-nothing': `Up from nothing ${periodLabel}`,
      'both-zero': `Nothing ${periodLabel} either`,
    }[reason] ?? 'No comparison'
    return <p className="mt-1 text-[10px] leading-snug text-ink-mute">{words}</p>
  }

  const flat = delta === 0
  const up = delta > 0
  const good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <p className={`mt-1 flex items-center gap-1 text-[10px] font-extrabold leading-snug ${flat ? 'text-ink-mute' : good ? 'text-forest-700' : 'text-saffron-800'}`}>
      <Icon size={10} strokeWidth={2.75} aria-hidden="true" />
      <span className="tabular-nums">{flat ? 'Level' : `${up ? '+' : ''}${delta}%`}</span>
      <span className="font-semibold text-ink-mute">{periodLabel}</span>
    </p>
  )
}

const cards = [
  { label: 'Earned', tone: 'plum', Icon: IndianRupee, iconBg: 'bg-plum-600 text-white', key: 'earned' },
  { label: 'Jobs done', tone: 'blue', Icon: CalendarCheck2, iconBg: 'bg-blue-600 text-white', key: 'jobs' },
  { label: 'Pending', tone: 'saffron', Icon: Clock3, iconBg: 'bg-amber-500 text-white', key: 'pending' },
  { label: 'Paid out', tone: 'green', Icon: Send, iconBg: 'bg-emerald-600 text-white', key: 'paid' },
]

export function KpiCard({ label, kpi, sub, tone = 'plum', periodLabel, goodWhenUp, format = rupees, Icon, iconBg }) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${TONE[tone]} p-3.5 ring-1 shadow-[0_9px_24px_rgba(42,8,92,0.06)]`}>
      <div className="absolute -right-5 -top-6 h-20 w-20 rounded-full bg-white/70 blur-xl" />
      <div className="relative flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-[13px] ${iconBg} shadow-sm`}>
          <Icon size={18} strokeWidth={2.4} />
        </span>
        <Sparkles size={14} className="mt-1 opacity-25" />
      </div>
      <p className="relative mt-2.5 inline-flex rounded-full bg-white/65 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.1em]">
        {label}
      </p>
      <p className="relative mt-1.5 font-serif text-[23px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
        {format(kpi.value)}
      </p>
      {sub && <p className="relative mt-1 text-[10px] leading-snug text-ink-mute">{sub}</p>}
      <Delta kpi={kpi} periodLabel={periodLabel} goodWhenUp={goodWhenUp} />
    </div>
  )
}

export default function KpiCards({ kpis, range, owedJobs = 0 }) {
  const periodLabel = {
    today: 'vs yesterday',
    week: 'vs last week',
    month: 'vs last month',
    'last-month': 'vs the month before',
    fy: 'vs last year',
  }[range?.id] ?? 'vs the period before'

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard label="Earned" kpi={kpis.earned} tone="plum" sub={`Net · ${range?.label ?? 'this range'}`} periodLabel={periodLabel} Icon={cards[0].Icon} iconBg={cards[0].iconBg} />
      <KpiCard label="Jobs done" kpi={kpis.jobs} tone="blue" format={n => String(n)} sub="Completed in this range" periodLabel={periodLabel} Icon={cards[1].Icon} iconBg={cards[1].iconBg} />
      <KpiCard label="Pending" kpi={kpis.pending} tone="saffron" sub={owedJobs ? `Across ${owedJobs} ${owedJobs === 1 ? 'job' : 'jobs'}, all time` : 'Nothing owed right now'} periodLabel={periodLabel} Icon={cards[2].Icon} iconBg={cards[2].iconBg} />
      <KpiCard label="Paid out" kpi={kpis.paid} tone="green" sub="Sent to your account" periodLabel={periodLabel} Icon={cards[3].Icon} iconBg={cards[3].iconBg} />
    </div>
  )
}
