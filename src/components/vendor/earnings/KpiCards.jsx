import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatINR } from '../../../utils/format'

/**
 * Four figures, each with an honest account of what it is being
 * compared against.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THING THIS SCREEN IS NOT ALLOWED TO DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design shows "+18% vs last month" under every card. A
 * partner in their first month has no last month, and printing +100%
 * (or +∞, or a bare dash that reads as a broken value) against a period
 * they were not on the platform for is a number the app made up.
 *
 * `earningsSeries` therefore returns a `reason` alongside every delta,
 * and this component renders four genuinely different things:
 *
 *   delta a number   "+18% vs last month", with an arrow
 *   no-prior         "No earlier period to compare" — there was no then
 *   from-nothing     "Up from nothing last month" — there was, and it
 *                    was empty, which is a fact but not a percentage
 *   both-zero        "Nothing either period"
 *
 * The distinction between the middle two is the whole point. Zero means
 * you earned nothing; absent means there was nothing to earn in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ARROW IS NOT DECORATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * Green-up and red-down carry the direction on colour alone, which fails
 * for the ~8% of men with a red-green deficiency and for anyone reading
 * a printed slip. The arrow glyph says the same thing in shape, which is
 * the rule `config/dataviz.js` sets for every measure in this app.
 */

const TONE = {
  plum:    'bg-plum-50 text-plum-700 ring-plum-200',
  forest:  'bg-forest-50 text-forest-700 ring-forest-200',
  saffron: 'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  ink:     'bg-ink/[0.03] text-ink-mute ring-ink/[0.07]',
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
    return (
      <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">{words}</p>
    )
  }

  const flat = delta === 0
  const up = delta > 0
  const good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <p className={`mt-1 flex items-center gap-1 text-[10.5px] font-extrabold leading-snug ${
      flat ? 'text-ink-mute' : good ? 'text-forest-700' : 'text-saffron-800'
    }`}>
      <Icon size={11} strokeWidth={2.75} aria-hidden="true" />
      <span className="tabular-nums">{flat ? 'Level' : `${up ? '+' : ''}${delta}%`}</span>
      <span className="font-semibold text-ink-mute">{periodLabel}</span>
    </p>
  )
}

export function KpiCard({ label, kpi, sub, tone = 'ink', periodLabel, goodWhenUp, format = rupees }) {
  return (
    <div className="rounded-[18px] bg-white p-3 ring-1 ring-ink/[0.06]">
      <p className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] ring-1 ${TONE[tone]}`}>
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[21px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
        {format(kpi.value)}
      </p>
      {sub && <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">{sub}</p>}
      <Delta kpi={kpi} periodLabel={periodLabel} goodWhenUp={goodWhenUp} />
    </div>
  )
}

/**
 * @param kpis      from earningsSeries()
 * @param range     from buildRange(), for the comparison wording
 * @param owedJobs  how many jobs make up the pending figure
 */
export default function KpiCards({ kpis, range, owedJobs = 0 }) {
  /* The comparison period, said the way a person would. "vs last month"
     under a card filtered to last month would be wrong — that card is
     compared against the month before it. */
  const periodLabel = {
    today: 'vs yesterday',
    week: 'vs last week',
    month: 'vs last month',
    'last-month': 'vs the month before',
    fy: 'vs last year',
  }[range?.id] ?? 'vs the period before'

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="Earned"
        kpi={kpis.earned}
        tone="plum"
        sub={`Net · ${range?.label ?? 'this range'}`}
        periodLabel={periodLabel}
      />
      <KpiCard
        label="Jobs done"
        kpi={kpis.jobs}
        tone="ink"
        format={n => String(n)}
        sub="Completed in this range"
        periodLabel={periodLabel}
      />
      <KpiCard
        label="Pending"
        kpi={kpis.pending}
        tone="saffron"
        /* Deliberately not range-scoped, and said out loud. Money owed
           is owed whatever chip is selected; hiding claimable money
           behind a date filter is the opposite of what this screen is
           for. */
        sub={owedJobs ? `Across ${owedJobs} ${owedJobs === 1 ? 'job' : 'jobs'}, all time` : 'Nothing owed right now'}
        periodLabel={periodLabel}
      />
      <KpiCard
        label="Paid out"
        kpi={kpis.paid}
        tone="forest"
        sub="Sent to your account"
        periodLabel={periodLabel}
      />
    </div>
  )
}
