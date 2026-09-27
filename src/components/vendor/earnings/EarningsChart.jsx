import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import TimeSeries, { TimeSeriesTable } from './TimeSeries'
import { formatINR } from '../../../utils/format'

/**
 * The chart card: one plot, three measures, and a table twin.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE MEASURES, NOT THREE SCALES ON ONE PLOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design overlays rupees and a job count on one pair of
 * axes. Two measures at different scales on one plot is a chart that can
 * be made to say anything by choosing the axis maxima, and the reader
 * has no way to tell which crossing is real. ChartKit's header states
 * the house rule outright — "two measures at different scales get two
 * charts, never two scales on one plot" — and a toggle is the mobile
 * form of two charts.
 *
 * So: Earnings (rupees), Bookings (a count), Payouts (rupees that have
 * actually arrived). One at a time, each with its own axis.
 *
 * ── Payouts is not a duplicate of Earnings ───────────────────────────
 * Earnings is what the work was worth, filed under the day it was done.
 * Payouts is what reached the bank. They are different numbers on
 * different days and the gap between them is the question this whole
 * screen exists to answer, so both are drawn.
 */

const METRICS = [
  { id: 'net',   label: 'Earnings', key: 'net',   money: true },
  { id: 'count', label: 'Bookings', key: 'count', money: false },
  { id: 'paid',  label: 'Payouts',  key: 'paid',  money: true },
]

export default function EarningsChart({ series = [], range }) {
  const [metric, setMetric] = useState('net')
  const [asTable, setAsTable] = useState(false)
  const m = METRICS.find(x => x.id === metric) ?? METRICS[0]

  const format = m.money
    ? p => formatINR(Math.round(p / 100))
    : n => String(n)

  return (
    <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-extrabold leading-tight text-ink">
            {m.label} over time
          </h2>
          <p className="text-[11px] text-ink-mute">{range?.label}</p>
        </div>

        <button
          type="button"
          onClick={() => setAsTable(t => !t)}
          aria-pressed={asTable}
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-ink/[0.04] px-3 text-[11.5px] font-extrabold text-ink-soft"
        >
          {asTable ? <BarChart3 size={12} /> : <Table2 size={12} />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {METRICS.map(x => {
          const on = x.id === metric
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setMetric(x.id)}
              aria-pressed={on}
              className={`min-h-[30px] flex-1 rounded-full px-2 text-[11.5px] font-extrabold transition-colors ${
                on ? 'bg-plum-600 text-white' : 'bg-ink/[0.04] text-ink-soft'
              }`}
            >
              {x.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3">
        {asTable
          ? <TimeSeriesTable series={series} metric={m.key} format={format} />
          : <TimeSeries series={series} metric={m.key} format={format}
                        label={m.label} height={180} />}
      </div>
    </section>
  )
}
