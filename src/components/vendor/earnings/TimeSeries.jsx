import { useMemo } from 'react'
import { formatINR } from '../../../utils/format'

/**
 * Earnings over time, drawn by hand.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT RECHARTS, WHICH IS ALREADY IN package.json
 * ══════════════════════════════════════════════════════════════════════
 *
 * Four reasons, the last one decisive.
 *
 * 1  It is ~376 KB and Earnings is one of four tabs. A chunk that
 *    downloads the moment a partner taps the tab they tap daily is not
 *    lazily loaded, it is deferred by one tap — and in the Capacitor APK
 *    it is not even deferred, it is install size on a cheap Android.
 * 2  There is no cost to amortise: nothing in src/ imports ChartKit, so
 *    recharts is currently dead weight rather than a paid-for dependency.
 * 3  A bar chart of at most 31 points is this file. It is not a saving
 *    worth a library.
 * 4  ChartKit's own header records that `ResponsiveContainer` measures
 *    its parent, and a headless CDP capture with `captureBeyondViewport`
 *    renders every plot EMPTY. `shoot-components.mjs` captures exactly
 *    that way, and with no Playwright in this project a screenshot is
 *    the only proof a screen works. A chart the one harness cannot
 *    photograph is a chart nobody has seen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FLEXBOX, NOT AN SVG viewBox
 * ══════════════════════════════════════════════════════════════════════
 *
 * This was an SVG in a fixed 320x120 viewBox, and that is a trap worth
 * recording rather than quietly fixing.
 *
 * An `<svg viewBox="0 0 320 120" width="100%">` with a fixed height
 * LETTERBOXES: the default `preserveAspectRatio` of `xMidYMid meet`
 * scales the box to fit the shorter axis and centres it, so on a wide
 * card the plot sat in a 480px island with dead space either side.
 * Letting the height follow the width instead fills the card — and then
 * scales the whole coordinate space by 4x on a desktop, so a 9px axis
 * label renders at 35px. `preserveAspectRatio="none"` fills the box and
 * stretches the type horizontally.
 *
 * All three are the same underlying fact: a fixed viewBox scaled to a
 * fluid width scales everything in it, including the things that should
 * not scale. Percentage heights in flexbox have no coordinate space to
 * scale, so bars stretch and text does not, which is what a chart wants
 * at every width.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GROUPING, AND WHY THE TOTAL SURVIVES IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A financial year is 365 points on a 390px screen — a bar per pixel.
 * Past `MAX_BARS` the days are folded into equal buckets and the bucket
 * carries the SUM, never an average, so the bars still add up to the
 * figure on the card above them. `check-earnings-period.mjs` asserts
 * that sum.
 */

const MAX_BARS = 31

/** Fold a dense day series into at most MAX_BARS buckets, summing. */
function bucket(series, key) {
  if (series.length <= MAX_BARS) {
    return series.map(d => ({ label: d.date, value: d[key] ?? 0, from: d.date, to: d.date }))
  }
  const size = Math.ceil(series.length / MAX_BARS)
  const out = []
  for (let i = 0; i < series.length; i += size) {
    const slice = series.slice(i, i + size)
    out.push({
      label: slice[0].date,
      from: slice[0].date,
      to: slice[slice.length - 1].date,
      value: slice.reduce((n, d) => n + (d[key] ?? 0), 0),
    })
  }
  return out
}

const shortDay = iso => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

export default function TimeSeries({
  series = [],
  metric = 'net',
  format = p => formatINR(Math.round(p / 100)),
  height = 180,
  label = 'Earnings',
}) {
  const bars = useMemo(() => bucket(series, metric), [series, metric])
  const max = useMemo(() => Math.max(1, ...bars.map(b => b.value)), [bars])

  /* Every bar zero is not the same as no bars. A flat axis with the
     dates still on it says "these days happened and nothing came in",
     which is the honest reading of a quiet fortnight. */
  const allZero = bars.every(b => b.value === 0)

  const ticks = [0, Math.floor(bars.length / 2), bars.length - 1]
    .filter((v, i, a) => bars[v] && a.indexOf(v) === i)

  return (
    <div>
      <div
        className="relative"
        style={{ height }}
        role="img"
        aria-label={`${label} over ${bars.length} periods. ${
          allZero ? 'Nothing in this range.' : `Highest ${format(max)}.`}`}
      >
        {/* Horizontal hairlines only. A vertical grid on a bar chart
            draws a box around every bar and reads as a table. */}
        {[0, 0.5, 1].map(f => (
          <span
            key={f}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-ink/[0.08]"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}

        <div className="absolute inset-0 flex items-stretch justify-between gap-[2px]">
          {bars.map(b => {
            const pct = allZero ? 0 : (b.value / max) * 100
            return (
              <div
                key={b.label}
                title={`${b.from === b.to ? b.from : `${b.from} to ${b.to}`}: ${format(b.value)}`}
                /* `h-full` is load-bearing, not tidiness: a percentage
                   height resolves against the parent's DEFINITE height,
                   and under `items-end` the column is content-sized, so
                   every bar computed against auto and collapsed to the
                   2px stub. The column must fill the plot for the bar to
                   be a percentage of it.

                   24px cap, in the same spirit as the admin primitives:
                   four data points should not draw four billboards. */
                className="flex h-full min-w-0 flex-1 items-end justify-center"
              >
                <span
                  className={`block w-full max-w-[24px] rounded-t-[3px] ${
                    pct > 0 ? 'bg-plum-600' : 'bg-ink/[0.12]'
                  }`}
                  /* A 2px stub under a zero bar, so the day is visibly
                     present rather than missing. */
                  style={{ height: pct > 0 ? `${Math.max(pct, 1.5)}%` : '2px' }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* First, middle and last only. Thirty-one dates at phone width
          overlap into a grey smear. */}
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-ink-mute">
        {ticks.map((i, n) => (
          <span key={i} className={n === 1 ? 'flex-1 text-center' : ''}>
            {shortDay(bars[i].label)}
          </span>
        ))}
      </div>

      <p className="mt-1 text-center text-[11px] font-semibold text-ink-mute">
        {allZero ? 'Nothing in this range' : `Highest ${format(max)}`}
      </p>
    </div>
  )
}

/**
 * The table twin.
 *
 * Not decoration and not an accessibility afterthought: the categorical
 * palette this screen draws from carries a documented contrast WARN
 * against white, and the palette file states plainly that the warning is
 * "not dismissable — it is an obligation. Every chart using these hues
 * MUST carry visible labels or a table twin." This is that twin.
 */
export function TimeSeriesTable({ series = [], metric = 'net', format }) {
  const rows = useMemo(
    () => bucket(series, metric).filter(b => b.value !== 0), [series, metric])

  if (!rows.length) {
    return <p className="px-1 py-3 text-[12.5px] text-ink-mute">Nothing in this range.</p>
  }

  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-mute">
          <th className="py-1.5 font-extrabold">Period</th>
          <th className="py-1.5 text-right font-extrabold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label} className="border-t border-ink/[0.06]">
            <td className="py-1.5 text-ink-soft">
              {r.from === r.to ? r.from : `${r.from} – ${r.to}`}
            </td>
            <td className="py-1.5 text-right font-extrabold tabular-nums text-ink">
              {format(r.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
