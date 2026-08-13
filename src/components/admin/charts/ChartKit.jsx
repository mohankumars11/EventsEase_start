import {
  ResponsiveContainer, ComposedChart, BarChart, ScatterChart,
  Area, Line, Bar, Scatter, Cell, ReferenceLine,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend as RcLegend, LabelList,
} from 'recharts'
import { formatINR } from '../../../utils/format'
import {
  INK, AXIS_TICK, GRID_PROPS, TOOLTIP_STYLE, CATEGORICAL,
  compactINR, compactCount, DIVERGING,
} from '../../../config/dataviz'

/**
 * Every chart that needs a real cartesian plot — axes, scales, tooltips.
 *
 * ── Why one lazy module and not one file per chart ───────────────────────
 * `recharts` is ~376 KB. RevenueTrendChart existed as its own file for exactly
 * this reason: imported at the top of AdminDashboard it took that route's
 * chunk from 41 KB to 417 KB, a 10x cost paid by every operator opening any
 * tab in order to draw one graph on one of them.
 *
 * That reasoning still holds, but the answer is now one module rather than
 * five: five lazily-imported files that each `import 'recharts'` would produce
 * five chunks that each pull the same shared vendor chunk, plus five separate
 * Suspense boundaries flashing on one screen. One module, imported lazily by
 * the views that draw, downloads the library once and hands back every chart
 * on the page together.
 *
 * ── Shared conventions ───────────────────────────────────────────────────
 * Grid, axis and tooltip styling come from config/dataviz rather than being
 * restated per chart, so a dozen plots cannot drift into a dozen grid weights.
 * Gridlines are horizontal-only, solid hairlines. Bars are capped at 24px with
 * a 4px rounded data-end. Nothing here draws a second y-axis — two measures at
 * different scales get two charts, never two scales on one plot.
 *
 * ── Animation is off ─────────────────────────────────────────────────────
 * `isAnimationActive={false}` on every mark. The Command Center mounts four of
 * these at once and the window selector re-renders all of them; recharts
 * animates from zero on every re-render, not just the first, so each change of
 * window would replay four plots growing out of the axis. That is motion for
 * its own sake on a screen whose whole job is to be read quickly, and it makes
 * every mark briefly absent after an interaction.
 *
 * (Worth recording for whoever screenshots this next: `ResponsiveContainer`
 * measures its parent, so a headless capture taken with CDP's
 * `captureBeyondViewport` renders every plot EMPTY — the forced full-page
 * relayout collapses the container to zero width mid-measure. The marks are
 * really there; verify with a viewport-sized capture, or by reading the `d`
 * attribute off `.recharts-area-area`. Animation was not the cause.)
 */

/** Applied to every mark. See the note above — this is not a style choice. */
const STILL = { isAnimationActive: false }

/* ── Tooltip ───────────────────────────────────────────────────────────── */

/**
 * One tooltip for every chart, so the hover experience is identical across the
 * dashboard. Series identity is carried by a colour swatch beside the name;
 * the text itself stays in ink tokens, because three of the six categorical
 * hues are illegible as type on white.
 */
function SharedTooltip({ active, payload, label, format = formatINR, title }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, background: INK.surface }}>
      <div className="font-semibold mb-1" style={{ color: INK.primary }}>{title ? title(payload[0]) : label}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 whitespace-nowrap">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color ?? p.fill, display: 'inline-block' }} />
          <span style={{ color: INK.secondary }}>{p.name}</span>
          <span style={{ color: INK.primary, fontWeight: 700, marginLeft: 'auto' }}>{format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const legendProps = {
  iconType: 'square',
  iconSize: 9,
  wrapperStyle: { fontSize: 11, color: INK.secondary, paddingTop: 8 },
}

/* ── Demand vs revenue over time ───────────────────────────────────────── */

/**
 * The dashboard's main trend: what customers ordered, and what was paid for.
 *
 * Both series are rupees on ONE axis — this is emphatically not a dual-axis
 * chart, which invents correlations by arbitrarily aligning two scales. They
 * are comparable quantities and the gap between them is the point: it is the
 * direct-UPI confirmation backlog, money a customer has committed that nobody
 * has ticked off against the bank statement yet.
 *
 * Demand is the filled area (the envelope), revenue the line inside it, so the
 * shortfall reads as the space between them rather than as two competing
 * curves.
 */
export function DemandRevenueTrend({ data = [], height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={CATEGORICAL[0]} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CATEGORICAL[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: INK.axis }} tickLine={false}
               interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={compactINR} />
        <Tooltip content={<SharedTooltip />} cursor={{ stroke: INK.axis, strokeWidth: 1 }} />
        <RcLegend {...legendProps} />
        <Area {...STILL} type="monotone" dataKey="demand" name="Ordered" stroke={CATEGORICAL[0]} strokeWidth={2}
              fill="url(#demandFill)" strokeLinecap="round" strokeLinejoin="round" />
        <Line {...STILL} type="monotone" dataKey="revenue" name="Paid" stroke={CATEGORICAL[5]} strokeWidth={2}
              dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: INK.surface }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ── Stacked category revenue by month ─────────────────────────────────── */

/**
 * Part-to-whole over time — which shelves are carrying the shop, month by
 * month.
 *
 * Stacked bars are an *adjacent* form, so the full six-slot categorical order
 * is gate-safe here (worst adjacent CVD ΔE 9.1). The 2px surface gap between
 * segments is drawn by recharts' own stack spacing rather than a stroke:
 * a border around a segment is ink that isn't data.
 */
export function StackedCategoryBars({ data = [], series = [], height = 240, format = compactINR }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: INK.axis }} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={format} />
        <Tooltip content={<SharedTooltip />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
        <RcLegend {...legendProps} />
        {series.map((s, i) => (
          <Bar
            {...STILL}
            key={s.key} dataKey={s.key} name={s.label} stackId="cat"
            fill={s.color} maxBarSize={24}
            // Only the topmost segment gets the rounded data-end; the ones
            // below it meet their neighbour and stay square.
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Two-series grouped columns ────────────────────────────────────────── */

/** New vs returning buyers, or any other two-way monthly split. */
export function GroupedBars({ data = [], series = [], height = 200, format = compactCount }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap="32%">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: INK.axis }} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip content={<SharedTooltip format={format} />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
        <RcLegend {...legendProps} />
        {series.map(s => (
          <Bar {...STILL} key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={20} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Diverging movers ──────────────────────────────────────────────────── */

/**
 * What moved, up and down, against the previous window.
 *
 * Diverging blue↔red around a zero baseline: the polarity IS the data, so it
 * gets the diverging palette rather than a categorical hue, and the zero line
 * is drawn explicitly so the midpoint reads as "nothing changed". Warm/cool
 * poles, never two cool hues — blue↔aqua has no midpoint that reads as zero.
 */
export function MoversChart({ data = [], height = 260 }) {
  /**
   * Placing the "N sold" annotation, which is fiddlier than it looks.
   *
   * A single `<LabelList position="right">` is wrong for a diverging bar: on a
   * bar growing leftwards the right-hand end is the zero baseline, so every
   * negative label printed on top of its own axis tick — "Photo Frame 20" and
   * "3 sold" rendered over each other.
   *
   * Recharts has no per-cell label position, and a custom `content` renderer
   * does not get dependable per-cell geometry for negative bars — that attempt
   * dropped the label inside the fill, muted grey on red, which is worse than
   * the collision it replaced.
   *
   * So the split is done in the DATA: two label lists, each reading a key that
   * is null for the other sign, and recharts skips nulls. Each label lands
   * clear of its own bar and clear of the axis ticks, which is the whole
   * requirement — a label is never allowed to overlap the mark it describes.
   */
  const labelled = data.map(d => ({
    ...d,
    unitsUp:   d.trend >= 0 ? d.units : null,
    unitsDown: d.trend <  0 ? d.units : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* Symmetric side margins: labels now hang off both ends, so the right
          gutter alone is not enough room. */}
      <BarChart data={labelled} layout="vertical" margin={{ top: 4, right: 52, left: 52, bottom: 4 }}>
        <CartesianGrid stroke={INK.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false}
               tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} />
        {/* Wide enough for a truncated product name on ONE line. A wrapped
            category tick detaches the label from its row and reads as noise. */}
        <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false}
               tickLine={false} width={150} interval={0} />
        <Tooltip content={<SharedTooltip format={v => `${v > 0 ? '+' : ''}${v}%`} />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
        <ReferenceLine x={0} stroke={INK.axis} />
        <Bar {...STILL} dataKey="trend" name="Change vs prior window" maxBarSize={18} radius={[0, 4, 4, 0]}>
          {labelled.map(d => (
            <Cell key={d.id} fill={d.trend >= 0 ? DIVERGING.positive : DIVERGING.negative} />
          ))}
          <LabelList dataKey="unitsUp"   position="right" offset={8}
                     formatter={v => `${v} sold`} style={{ fontSize: 10, fill: INK.muted }} />
          <LabelList dataKey="unitsDown" position="left"  offset={8}
                     formatter={v => `${v} sold`} style={{ fontSize: 10, fill: INK.muted }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Product demand quadrant ───────────────────────────────────────────── */

/**
 * Every product placed by how much it sells against how fast it is growing.
 *
 * ── Why one hue and not four ─────────────────────────────────────────────
 * The obvious version of this chart paints the four quadrants in four colours.
 * It is wrong twice over. A scatter is an *all-pairs* form — every mark can sit
 * beside every other — and the categorical order only validates its first
 * THREE slots under all-pairs; a fourth puts yellow next to orange, which fails
 * the floors. And colouring by quadrant double-encodes position: the reader can
 * already see which quadrant a dot is in, because it is in it.
 *
 * So: one hue, dot area carrying revenue, the reference lines doing the
 * dividing, and the handful of dots that matter direct-labelled. The quadrant
 * a product falls in is named in the tooltip and in the table twin beside the
 * chart, never by colour alone.
 */
export function ProductQuadrant({ data = [], medianUnits = 0, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={INK.grid} />
        <XAxis
          type="number" dataKey="units" name="Units sold" tick={AXIS_TICK}
          axisLine={{ stroke: INK.axis }} tickLine={false} allowDecimals={false}
          label={{ value: 'Units sold →', position: 'insideBottomRight', offset: -4, style: { fontSize: 10, fill: INK.muted } }}
        />
        <YAxis
          type="number" dataKey="trend" name="Growth" tick={AXIS_TICK}
          axisLine={false} tickLine={false} width={48}
          tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
          label={{ value: 'Growth ↑', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: INK.muted } }}
        />
        {/* Dot area, not radius — area is what the eye reads as quantity. */}
        <ZAxis type="number" dataKey="revenue" range={[40, 420]} name="Revenue" />
        <Tooltip
          cursor={{ strokeDasharray: '0', stroke: INK.axis }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <div style={{ ...TOOLTIP_STYLE, background: INK.surface, maxWidth: 220 }}>
                <div className="font-semibold" style={{ color: INK.primary }}>{p.emoji} {p.name}</div>
                <div style={{ color: INK.muted, fontSize: 11 }}>{p.category}{p.bucketLabel ? ` · ${p.bucketLabel}` : ''}</div>
                <div style={{ color: INK.secondary, marginTop: 4 }}>
                  {p.units} sold · {formatINR(p.revenue)} · {p.trend > 0 ? '+' : ''}{p.trend}% vs prior
                </div>
              </div>
            )
          }}
        />
        <ReferenceLine y={0} stroke={INK.axis} />
        {medianUnits > 0 && (
          <ReferenceLine x={medianUnits} stroke={INK.axis}
                         label={{ value: 'median', position: 'top', style: { fontSize: 9, fill: INK.muted } }} />
        )}
        <Scatter
          {...STILL}
          data={data} name="Products"
          fill={CATEGORICAL[0]} fillOpacity={0.55}
          // 2px surface ring so overlapping dots stay legible, and so the hit
          // target is bigger than the mark.
          stroke={INK.surface} strokeWidth={2}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
