/**
 * The one palette every admin chart draws from.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 * The dashboard used to hold its colours inline: `CATEGORY_COLORS` sat at the
 * top of AdminDashboard.jsx, RevenueTrendChart hard-coded `#2a78d6` and the
 * three greys around it, and everything else reached for whatever Tailwind
 * class looked right — `bg-amber-50`, `text-emerald-700`, `bg-purple-100`.
 * With a dozen charts that stops being a style question and becomes a
 * correctness one: a reader who has learnt that blue means Cakes must not find
 * blue meaning "paid" two cards down.
 *
 * So the palette is named by JOB, once, here.
 *
 * ── Provenance ───────────────────────────────────────────────────────────
 * These are the dataviz reference palette's light-mode values, and the
 * categorical order is the validated one — run, not eyeballed:
 *
 *   node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300" \
 *        --mode light --surface "#ffffff"
 *   → lightness band PASS · chroma floor PASS
 *   → CVD separation  PASS (worst adjacent #eda100↔#1baf7a ΔE 9.1 protan)
 *   → normal-vision   PASS (worst adjacent #e87ba4↔#eda100 ΔE 19.6)
 *   → contrast        WARN — aqua 2.82, yellow 2.17, magenta 2.69 vs white
 *
 * The surface is `#ffffff` and not the reference `#fcfcfb` because that is
 * what `.card` actually paints (src/index.css).
 *
 * That contrast WARN is not dismissable — it is an obligation. Every chart
 * using these hues MUST carry visible labels or a table twin, so no value is
 * reachable by colour alone. The chart components in components/admin/viz and
 * components/admin/charts all do; if you add one that does not, it is wrong.
 *
 * ── The rules that come with it ──────────────────────────────────────────
 *  · Categorical slots are assigned in FIXED ORDER and never cycled. A
 *    seventh shop category does not get a generated hue — it folds into
 *    "Other". `categoricalFor()` enforces this.
 *  · Colour follows the entity, never its rank. Sorting a category chart by
 *    revenue must not repaint it, which is why `SHOP_CATEGORY_COLORS` keys off
 *    the category id rather than an array index at render time.
 *  · SEQUENTIAL (magnitude — heatmaps) is one hue, light→dark. Never a rainbow.
 *  · STATUS colours mean good/warning/serious/critical and are never reused as
 *    a series colour. They always ship with a label or an icon beside them.
 *  · Text never wears a series colour. Labels use the INK tokens; identity
 *    comes from a coloured dot or swatch next to the text.
 */

import { SHOP_CATEGORIES } from './shop'

/* ── Categorical: identity ─────────────────────────────────────────────── */

/** Fixed slot order. Index 0 is used first, always. Do not sort this. */
export const CATEGORICAL = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
]

/**
 * Everything past slot 8 is "Other", in grey — never a generated ninth hue,
 * which is indistinguishable from an existing slot under CVD.
 */
export const OTHER = '#898781'

export function categoricalFor(index) {
  return index >= 0 && index < CATEGORICAL.length ? CATEGORICAL[index] : OTHER
}

/**
 * Shop category → hue, pinned by id.
 *
 * Pinned rather than positional so a category with zero sales keeps its colour
 * instead of handing it to whoever sorts above it. Five categories today; the
 * map is built from SHOP_CATEGORIES so adding a sixth needs no edit here.
 */
export const SHOP_CATEGORY_COLORS = Object.fromEntries(
  SHOP_CATEGORIES.map((c, i) => [c.id, categoricalFor(i)]),
)

export function shopCategoryColor(id) {
  return SHOP_CATEGORY_COLORS[id] ?? OTHER
}

/* ── Sequential: magnitude ─────────────────────────────────────────────── */

/**
 * One hue, light→dark, for continuous magnitude — the demand heatmap and the
 * area grid. Step 100 means "near zero" and is allowed to recede toward the
 * card; that is what makes an empty cell read as empty.
 */
export const SEQUENTIAL_BLUE = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef',
  '#6da7ec', '#5598e7', '#3987e5', '#2a78d6',
  '#256abf', '#1c5cab', '#184f95', '#104281',
]

/**
 * Ordinal steps for a DISCRETE ordered scale — funnel stages, tiers.
 *
 * Starts at step 250 rather than 100: on a light surface anything lighter
 * fails 2:1 against the card and the first stage of a funnel would be a ghost.
 * Four steps because four is the length of the order funnel.
 */
export const ORDINAL_BLUE = ['#86b6ef', '#3987e5', '#256abf', '#104281']

/** Pick a sequential step for `value` on a 0..max scale. */
export function sequentialStep(value, max, ramp = SEQUENTIAL_BLUE) {
  if (!max || value <= 0) return null           // null = paint the surface, not a colour
  const t = Math.min(1, value / max)
  // Math.ceil so any non-zero value lands on at least the first visible step:
  // "one order here" must not render identically to "no orders here".
  return ramp[Math.min(ramp.length - 1, Math.ceil(t * ramp.length) - 1)]
}

/* ── Diverging: polarity ───────────────────────────────────────────────── */

/**
 * Growth against a baseline — warm/cool poles that read as opposite, with a
 * neutral grey midpoint so "no change" reads as nothing. Blue↔red, never
 * blue↔aqua (two cool hues have no midpoint that reads as zero).
 */
export const DIVERGING = { negative: '#e34948', neutral: '#f0efec', positive: '#2a78d6' }

/* ── Status: state ─────────────────────────────────────────────────────── */

/**
 * Reserved. These four mean good / warning / serious / critical and are never
 * a series colour. On a white surface `warning` and `serious` are below 3:1 by
 * design — the icon-plus-label pairing is the mitigation, so a status colour
 * never carries meaning on its own.
 */
export const STATUS = {
  good:     '#0ca30c',
  warning:  '#fab219',
  serious:  '#ec835a',
  critical: '#d03b3b',
}

/** Delta text. Green for good news, red for bad — as TEXT, so it needs ink. */
export const DELTA_INK = { up: '#006300', down: '#c0392b', flat: '#52514e' }

/* ── Chrome & ink ──────────────────────────────────────────────────────── */

export const INK = {
  surface:   '#ffffff',   // what .card paints
  plane:     '#f9f9f7',
  primary:   '#0b0b0b',
  secondary: '#52514e',
  muted:     '#898781',   // axis labels, tick text
  grid:      '#e1e0d9',   // hairline, SOLID — never dashed
  axis:      '#c3c2b7',
}

/**
 * Shared recharts props, so twelve charts cannot drift into twelve grid
 * weights. Spread these rather than restating them.
 */
export const AXIS_TICK  = { fontSize: 11, fill: INK.muted }
export const GRID_PROPS = { stroke: INK.grid, vertical: false }
export const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: `1px solid ${INK.grid}`,
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(11,11,11,0.08)',
  padding: '8px 10px',
}

/* ── Number formatting for axes and tiles ──────────────────────────────── */

/**
 * Compact Indian-numbering money for an axis tick or a stat tile.
 *
 * Lakh and crore, not K and M: this dashboard is read in Bengaluru, and
 * "₹12.4L" is the figure the founder would say out loud. `formatINR` in
 * utils/format stays the full-precision form for tables and totals.
 */
export function compactINR(value) {
  const n = Number(value) || 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`
  if (abs >= 1000)     return `${sign}₹${(abs / 1000).toFixed(abs >= 100000 ? 0 : 1)}k`
  return `${sign}₹${Math.round(abs)}`
}

export function compactCount(value) {
  const n = Number(value) || 0
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
