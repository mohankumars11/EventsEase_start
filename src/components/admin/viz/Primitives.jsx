import { useState, useId } from 'react'
import { TrendingUp, TrendingDown, Minus, Table2, BarChart3 } from 'lucide-react'
import { INK, DELTA_INK, SEQUENTIAL_BLUE, ORDINAL_BLUE, sequentialStep, compactCount } from '../../../config/dataviz'

/**
 * The small charts, drawn by hand in SVG and CSS.
 *
 * ── Why not recharts for these ───────────────────────────────────────────
 * `recharts` is 376 KB and is already lazy-loaded behind the one view that
 * needs a real cartesian plot. A stat tile's sparkline, a horizontal bar list
 * and a 7×12 grid of coloured squares are eighty lines of SVG each; pulling a
 * charting library in to draw them would make every operator download a
 * third of a megabyte to see a row of numbers.
 *
 * So the split is: anything with axes, tooltips and a scale goes in
 * charts/ChartKit (lazy). Anything that is a shape next to a number lives
 * here, in the main chunk, and costs nothing.
 *
 * ── The rules these all follow ───────────────────────────────────────────
 * Every spec below is from the dataviz reference, and each one is load-bearing
 * rather than taste:
 *
 *  · Bars are capped at 24px and carry a 4px rounded data-end, square at the
 *    baseline — so the end that means something looks different from the end
 *    that is just where the axis is.
 *  · Touching marks are separated by a 2px gap in the SURFACE colour, never by
 *    a stroke. A border around a mark is ink that isn't data.
 *  · Gridlines are solid hairlines one step off the surface. Never dashed —
 *    dashing reads as "projection" or "threshold" when it is just a grid.
 *  · Labels are selective. A number on every point is chaos and goes unread.
 *  · Text wears INK tokens, never the series colour. Three of the six
 *    categorical hues sit below 3:1 on white; as text they would be illegible.
 *    Identity comes from the coloured swatch BESIDE the text.
 *  · Every chart built on those hues ships a table twin (see ChartCard), which
 *    is the relief the palette's contrast WARN obligates. It is not optional.
 */

/* ── Section heading ───────────────────────────────────────────────────── */

export function SectionHead({ title, sub, children }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-500 mt-0.5 max-w-prose">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/* ── Card with a table twin ────────────────────────────────────────────── */

/**
 * A chart card that can always be read as a table.
 *
 * The toggle is the accessibility contract, not a nicety: on a white surface
 * the aqua, yellow and magenta categorical slots measure 2.82, 2.17 and 2.69
 * against the card, below the 3:1 bar. The palette permits them anyway *on
 * condition* that no value is reachable by colour alone. This is that
 * condition, discharged once, for every chart that opts in.
 */
export function ChartCard({ title, sub, table, actions, children, className = '' }) {
  const [asTable, setAsTable] = useState(false)
  const showToggle = Boolean(table?.rows?.length)

  return (
    <div className={`card p-5 ${className}`}>
      <SectionHead title={title} sub={sub}>
        <div className="flex items-center gap-2">
          {actions}
          {showToggle && (
            <button
              onClick={() => setAsTable(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-500 border border-gray-200 hover:border-plum-300 hover:text-plum-700 transition-colors"
              aria-pressed={asTable}
            >
              {asTable ? <><BarChart3 size={12} /> Chart</> : <><Table2 size={12} /> Table</>}
            </button>
          )}
        </div>
      </SectionHead>

      {asTable && showToggle ? <DataTable {...table} /> : children}
    </div>
  )
}

export function DataTable({ columns = [], rows = [] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((c, i) => (
              <th
                key={c.key ?? i}
                className={`px-2 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, ri) => (
            <tr key={r.key ?? ri}>
              {columns.map((c, ci) => (
                <td
                  key={c.key ?? ci}
                  // tabular-nums only in columns that must align vertically —
                  // never on the big standalone figures above.
                  className={`px-2 py-2 whitespace-nowrap ${ci ? 'text-right tabular-nums text-gray-700' : 'text-left font-medium text-gray-900'}`}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Deltas ────────────────────────────────────────────────────────────── */

/**
 * A signed change against a named period.
 *
 * `goodWhenUp` exists because a rising number is not always good news — the
 * "awaiting payment confirmation" tile going up is a growing backlog. The icon
 * always follows the direction of the number; only the colour follows whether
 * that direction is welcome, so an arrow never lies about which way it went.
 */
export function DeltaBadge({ value, period, goodWhenUp = true, className = '' }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const up = value > 0
  const flat = value === 0
  const good = flat ? null : up === goodWhenUp
  const color = flat ? DELTA_INK.flat : good ? DELTA_INK.up : DELTA_INK.down
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${className}`} style={{ color }}>
      <Icon size={12} aria-hidden="true" />
      {flat ? 'flat' : `${up ? '+' : '−'}${Math.abs(value)}%`}
      {period && <span className="font-normal" style={{ color: INK.muted }}>{period}</span>}
    </span>
  )
}

/* ── Sparkline ─────────────────────────────────────────────────────────── */

/**
 * Twelve-ish points of context under a stat tile. Deliberately unlabelled and
 * unaxed — it carries shape, and the tile above it carries the number.
 */
export function Sparkline({ data = [], accent = '#2a78d6', height = 28, width = 96 }) {
  const values = data.map(d => (typeof d === 'number' ? d : d.value ?? 0))
  if (values.length < 2) return <div style={{ height }} aria-hidden="true" />

  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const y = v => height - 3 - ((v - min) / span) * (height - 6)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`)
  const last = values.at(-1)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label={`Trend, latest ${compactCount(last)}`} className="overflow-visible">
      {/* The wash is the series hue at ~10% — never a saturated block. */}
      <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill={accent} opacity="0.10" />
      <polyline points={points.join(' ')} fill="none" stroke={accent} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
      {/* End marker with a 2px surface ring so it stays legible over the line. */}
      <circle cx={width} cy={y(last)} r="3" fill={accent} stroke={INK.surface} strokeWidth="2" />
    </svg>
  )
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */

/**
 * label · value · delta · sparkline. The form for a single current number —
 * a one-bar bar chart with extra steps is the anti-pattern this replaces.
 *
 * The value uses the font's proportional figures, not tabular: equal-width
 * digits make `121` look loose at display sizes. tabular-nums is for columns.
 */
export function StatTile({ label, value, sub, delta, deltaPeriod, goodWhenUp = true, spark, accent = '#2a78d6', tone, onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`card p-4 text-left w-full ${onClick ? 'hover:border-plum-200 hover:shadow-md transition-all cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Not truncated. Six tiles across a laptop leaves each one narrow,
              and with a sparkline beside it "Orders" was rendering as
              "ORDE…" — a label clipped to the point of unreadability is
              worse than one that wraps. The sparkline gives up the width
              instead: it carries shape, and shape survives being smaller. */}
          <div className="text-[11px] font-semibold uppercase tracking-wide leading-tight" style={{ color: INK.muted }}>
            {label}
          </div>
          <div className="text-2xl font-bold mt-1 leading-none" style={{ color: tone ?? INK.primary }}>
            {value}
          </div>
        </div>
        {spark && <Sparkline data={spark} accent={accent} width={64} />}
      </div>
      <div className="flex items-center gap-2 mt-2 min-h-[16px] flex-wrap">
        <DeltaBadge value={delta} period={deltaPeriod} goodWhenUp={goodWhenUp} />
        {sub && <span className="text-[11px]" style={{ color: INK.muted }}>{sub}</span>}
      </div>
    </Wrapper>
  )
}

/**
 * The one number a view leads with. Exactly one per screen — a second hero
 * figure means neither is the headline.
 */
export function HeroFigure({ label, value, delta, deltaPeriod, sub, spark, accent = '#2a78d6' }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: INK.muted }}>{label}</div>
      <div className="flex items-end gap-4 flex-wrap mt-1">
        {/* ≥48px, same sans as everything else — a display face here reads as
            off-brand decoration. */}
        <span className="text-[44px] sm:text-5xl font-bold leading-none tracking-tight" style={{ color: INK.primary }}>
          {value}
        </span>
        <div className="flex items-center gap-3 pb-1.5">
          <DeltaBadge value={delta} period={deltaPeriod} />
          {spark && <Sparkline data={spark} accent={accent} width={120} height={34} />}
        </div>
      </div>
      {sub && <p className="text-xs mt-1.5" style={{ color: INK.secondary }}>{sub}</p>}
    </div>
  )
}

/* ── Horizontal bar list ───────────────────────────────────────────────── */

/**
 * Ranked magnitude with the label and the value written out beside every bar.
 *
 * Horizontal because the categories have long names ("Pooja & Essentials"),
 * and rotated x-axis labels are how a column chart becomes unreadable. The
 * inline value at the tip is also what discharges the contrast relief for the
 * lighter hues: the number never depends on being able to see the bar.
 */
export function BarRows({ rows = [], valueKey = 'value', labelKey = 'label', format = v => v, max, emptyNote = 'Nothing yet.', accent }) {
  if (!rows.length) return <EmptyNote>{emptyNote}</EmptyNote>
  const peak = max ?? Math.max(1, ...rows.map(r => Number(r[valueKey]) || 0))

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0
        const pct = Math.max(v > 0 ? 2 : 0, Math.round((v / peak) * 100))
        return (
          <div key={r.id ?? r.key ?? i}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="flex items-center gap-1.5 min-w-0 text-xs font-medium text-gray-700 truncate">
                {r.emoji && <span aria-hidden="true">{r.emoji}</span>}
                <span className="truncate">{r[labelKey]}</span>
              </span>
              <span className="text-xs font-bold text-gray-900 shrink-0 tabular-nums">{format(v)}</span>
            </div>
            {/* Track is the plane colour; the bar's 4px rounded end is on the
                data side only, square where it meets the baseline. */}
            <div className="h-2 rounded-sm overflow-hidden" style={{ background: INK.plane }}>
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: r.color ?? accent ?? '#2a78d6',
                  borderTopRightRadius: 4, borderBottomRightRadius: 4,
                }}
              />
            </div>
            {r.note && <p className="text-[11px] mt-0.5" style={{ color: INK.muted }}>{r.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Share bar (part-to-whole) ─────────────────────────────────────────── */

/**
 * One stacked bar for part-to-whole, with a legend underneath.
 *
 * A stacked bar rather than a donut: a donut can only be read at a glance for
 * gross differences, and these categories are close enough that a reader would
 * be comparing arc lengths. Segments are separated by a 2px surface gap, and
 * anything under 8% is left unlabelled inside — a clipped label is worse than
 * no label, and the legend and table carry the value regardless.
 */
export function ShareBar({ segments = [], total, format = v => v }) {
  const sum = total ?? segments.reduce((s, x) => s + (Number(x.value) || 0), 0)
  if (!sum) return <EmptyNote>No sales to split yet.</EmptyNote>

  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden" style={{ background: INK.plane, gap: 2 }}>
        {segments.filter(s => s.value > 0).map(s => {
          const pct = (s.value / sum) * 100
          return (
            <div
              key={s.id}
              className="flex items-center justify-center relative group"
              style={{ width: `${pct}%`, background: s.color, minWidth: 2 }}
              title={`${s.label}: ${format(s.value)} (${Math.round(pct)}%)`}
            >
              {/* Only label inside when it genuinely fits. White ink because
                  every categorical slot is dark enough to carry it. */}
              {pct >= 12 && (
                <span className="text-[10px] font-bold text-white px-1 truncate">{Math.round(pct)}%</span>
              )}
            </div>
          )
        })}
      </div>
      <Legend items={segments.map(s => ({ ...s, note: format(s.value) }))} />
    </div>
  )
}

/* ── Legend ────────────────────────────────────────────────────────────── */

/** Always present for two or more series — identity is never colour alone. */
export function Legend({ items = [] }) {
  if (items.length < 2) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
      {items.map(it => (
        <span key={it.id ?? it.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: INK.secondary }}>
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: it.color }} aria-hidden="true" />
          {it.label}
          {it.note && <span style={{ color: INK.muted }}>{it.note}</span>}
        </span>
      ))}
    </div>
  )
}

/* ── Funnel ────────────────────────────────────────────────────────────── */

/**
 * A stage funnel drawn as nested horizontal bars.
 *
 * The stages are an ORDERED scale, so they take the ordinal ramp — one hue,
 * darkening with depth — rather than categorical hues, which would imply the
 * five stages are five unrelated things. The ramp starts at step 250 because
 * anything lighter fails 2:1 against a white card and stage one would be a
 * ghost.
 *
 * Width is drawn from `reached` (arrivals), while the big number is `at`
 * (residents). Drawing residents as the funnel width is the classic version of
 * this chart that is simply wrong: an empty middle stage would pinch the
 * funnel shut and then the last stage would flare back out.
 */
export function Funnel({ stages = [], labelKey = 'label', valueKey = 'reached', atKey = 'at', format = v => v, footnote }) {
  const top = Math.max(1, ...stages.map(s => Number(s[valueKey]) || 0))
  return (
    <div>
      <div className="space-y-1.5">
        {stages.map((s, i) => {
          const reached = Number(s[valueKey]) || 0
          const pct = Math.max(reached > 0 ? 4 : 0, Math.round((reached / top) * 100))
          const dropoff = i > 0 ? (Number(stages[i - 1][valueKey]) || 0) - reached : null
          return (
            <div key={s.id ?? s.status ?? i} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-gray-700 capitalize truncate">
                {s[labelKey] ?? s.status}
              </span>
              <div className="flex-1 h-6 rounded-sm relative" style={{ background: INK.plane }}>
                <div
                  className="h-full flex items-center justify-end pr-2 transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: ORDINAL_BLUE[Math.min(i, ORDINAL_BLUE.length - 1)],
                    borderTopRightRadius: 4, borderBottomRightRadius: 4,
                  }}
                >
                  {pct >= 18 && (
                    <span className="text-[11px] font-bold text-white tabular-nums">{format(reached)}</span>
                  )}
                </div>
                {pct < 18 && (
                  <span className="absolute inset-y-0 flex items-center text-[11px] font-bold text-gray-700 tabular-nums"
                        style={{ left: `calc(${pct}% + 6px)` }}>
                    {format(reached)}
                  </span>
                )}
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] tabular-nums" style={{ color: INK.muted }}>
                {s[atKey] != null && <span className="text-gray-700 font-semibold">{s[atKey]} here</span>}
                {dropoff > 0 && <span className="block" style={{ color: DELTA_INK.down }}>−{dropoff} dropped</span>}
              </span>
            </div>
          )
        })}
      </div>
      {footnote && <p className="text-[11px] mt-3" style={{ color: INK.muted }}>{footnote}</p>}
    </div>
  )
}

/* ── Meter ─────────────────────────────────────────────────────────────── */

/** A single ratio against a limit. Track is a lighter step of the fill's ramp. */
export function Meter({ value, max = 100, label, caption, fill = '#2a78d6', track = '#cde2fb' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      {(label || caption) && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          {label && <span className="text-xs font-medium text-gray-700">{label}</span>}
          {caption && <span className="text-xs font-bold text-gray-900 tabular-nums">{caption}</span>}
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: track }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  )
}

/* ── Heatmap ───────────────────────────────────────────────────────────── */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Weekday × week grid of units sold.
 *
 * Sequential blue, one hue, light→dark: this is continuous magnitude and a
 * multi-hue ramp for magnitude is the rainbow anti-pattern. A zero cell paints
 * the plane rather than the palest step, so "nothing happened" and "barely
 * anything happened" do not look the same — `sequentialStep` returns null for
 * zero precisely so this stays a decision and not an accident.
 *
 * Every cell carries a title with the exact date and count, and the card wraps
 * a table twin, so the scale is never the only way to read a value.
 */
export function Heatmap({ columns = [], max = 0, unit = 'units' }) {
  const id = useId()
  if (!columns.length) return <EmptyNote>Not enough history to draw a pattern yet.</EmptyNote>

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-[3px] shrink-0 pr-1 pt-[14px]">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="h-3 text-[9px] leading-3 w-3 text-center" style={{ color: INK.muted }}>
              {i % 2 === 1 ? d : ''}
            </span>
          ))}
        </div>
        {columns.map((col, ci) => (
          <div key={`${id}-${ci}`} className="flex flex-col gap-[3px] shrink-0">
            <span className="h-3 text-[9px] leading-3 whitespace-nowrap" style={{ color: INK.muted }}>
              {ci % 3 === 0 ? col.label : ''}
            </span>
            {col.days.map(day => {
              const step = sequentialStep(day.value, max)
              return (
                <span
                  key={day.iso}
                  className="w-3 h-3 rounded-[2px]"
                  style={{
                    background: day.future ? 'transparent' : step ?? INK.plane,
                    border: day.future ? `1px dashed ${INK.grid}` : 'none',
                  }}
                  title={day.future ? `${day.iso} — upcoming` : `${day.iso}: ${day.value} ${unit}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px]" style={{ color: INK.muted }}>Less</span>
        <span className="w-3 h-3 rounded-[2px]" style={{ background: INK.plane }} />
        {SEQUENTIAL_BLUE.filter((_, i) => i % 3 === 0).map(c => (
          <span key={c} className="w-3 h-3 rounded-[2px]" style={{ background: c }} />
        ))}
        <span className="text-[10px]" style={{ color: INK.muted }}>More</span>
        <span className="text-[10px] ml-1" style={{ color: INK.muted }}>· peak {max} {unit}/day</span>
      </div>
    </div>
  )
}

/* ── Empty & misc ──────────────────────────────────────────────────────── */

export function EmptyNote({ children, icon }) {
  return (
    <div className="py-8 text-center">
      {icon && <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>}
      <p className="text-sm" style={{ color: INK.muted }}>{children}</p>
    </div>
  )
}

/**
 * An honesty note under a chart with almost no data behind it.
 *
 * Sambramo is pre-launch: most of these charts will show two orders and a lot
 * of zeroes for a while. A trend line through three points is not a trend, and
 * saying so under the chart is better than letting the founder read a 200%
 * week-on-week rise off a base of one.
 */
export function ThinDataNote({ n, noun = 'orders', min = 12 }) {
  if (n >= min) return null
  return (
    <p className="text-[11px] mt-3 flex items-start gap-1.5" style={{ color: INK.muted }}>
      <span aria-hidden="true">ℹ️</span>
      <span>
        {n === 0
          ? `No ${noun} yet — this fills in as they arrive.`
          : `Based on ${n} ${noun}. Percentages off a base this small move a lot; read the shape, not the number.`}
      </span>
    </p>
  )
}
