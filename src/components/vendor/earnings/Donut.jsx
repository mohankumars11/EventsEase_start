import { useMemo } from 'react'
import { categoricalFor, OTHER } from '../../../config/dataviz'
import { formatINR } from '../../../utils/format'

/**
 * A share breakdown, drawn as arcs, with the numbers beside it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE NUMBERS ARE NOT OPTIONAL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `src/config/dataviz.js` records that the categorical palette passes
 * lightness, chroma and CVD separation but WARNS on contrast against
 * white — aqua 2.82, yellow 2.17, magenta 2.69 — and states that the
 * warning "is not dismissable, it is an obligation. Every chart using
 * these hues MUST carry visible labels or a table twin, so no value is
 * carried by colour alone."
 *
 * So the legend beside the ring carries the trade, the amount, the
 * percentage and the job count as text. The ring is the quick read; the
 * list is the actual answer. Removing the list to make the card shorter
 * would break the obligation, not just the layout.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARCS FROM stroke-dasharray, NOT FROM PATHS
 * ══════════════════════════════════════════════════════════════════════
 *
 * One circle per slice, each with a dash pattern and an offset, which is
 * a few lines of arithmetic instead of a polar-to-cartesian path builder
 * with a large-arc flag to get wrong. It also degrades correctly: a
 * single 100% slice draws a full ring rather than a zero-length arc,
 * which the path version famously does not.
 */

const SIZE = 120
const STROKE = 18
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

export function colourFor(index, trade) {
  return trade === 'Other' ? OTHER : categoricalFor(index)
}

export default function Donut({
  slices = [],
  total = 0,
  format = p => formatINR(Math.round(p / 100)),
  centreLabel = 'In this range',
}) {
  const arcs = useMemo(() => {
    let acc = 0
    return slices.map((s, i) => {
      const share = total > 0 ? s.net / total : 0
      const arc = { ...s, share, offset: acc, colour: colourFor(i, s.trade) }
      acc += share
      return arc
    })
  }, [slices, total])

  if (!slices.length || total <= 0) {
    return (
      <p className="py-4 text-center text-[12.5px] leading-relaxed text-ink-mute">
        Nothing in this range yet. Your trades appear here once a job in
        the window has been paid for.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE} height={SIZE}
        role="img"
        aria-label={`Earnings by service. ${arcs.map(a => `${a.trade} ${Math.round(a.share * 100)}%`).join(', ')}.`}
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {/* The track, so a rounding gap reads as part of the ring
              rather than as a hole in it. */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" strokeWidth={STROKE}
            stroke="currentColor" className="text-ink/[0.06]"
          />
          {arcs.map(a => (
            <circle
              key={a.trade}
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={a.colour}
              strokeWidth={STROKE}
              strokeDasharray={`${a.share * CIRC} ${CIRC}`}
              strokeDashoffset={-a.offset * CIRC}
            >
              <title>{`${a.trade}: ${format(a.net)} (${Math.round(a.share * 100)}%)`}</title>
            </circle>
          ))}
        </g>
        <text
          x={SIZE / 2} y={SIZE / 2 - 2}
          textAnchor="middle" fontSize={15} fontWeight={800}
          fill="currentColor" className="text-ink"
        >
          {format(total)}
        </text>
        <text
          x={SIZE / 2} y={SIZE / 2 + 11}
          textAnchor="middle" fontSize={7.5}
          fill="currentColor" className="text-ink-mute"
        >
          {centreLabel}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map(a => (
          <li key={a.trade} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: a.colour }}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-soft">
              {a.trade}
              {a.folded ? (
                <span className="text-ink-mute"> · {a.folded} more</span>
              ) : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[12.5px] font-extrabold tabular-nums text-ink">
                {format(a.net)}
              </span>
              <span className="block text-[10.5px] tabular-nums text-ink-mute">
                {Math.round(a.share * 100)}% · {a.count} {a.count === 1 ? 'job' : 'jobs'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
