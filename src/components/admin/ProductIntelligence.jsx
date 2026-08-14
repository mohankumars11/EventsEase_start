import { useMemo, useState, lazy, Suspense } from 'react'
import { Search, X, Pencil, Camera, AlertCircle } from 'lucide-react'
import { SHOP_CATEGORIES } from '../../config/shop'
import { formatINR, formatDate } from '../../utils/format'
import { INK, STATUS, CATEGORICAL, ORDINAL_BLUE, shopCategoryColor, compactINR } from '../../config/dataviz'
import {
  orderLines, dailySeries, productDemand, productBuckets, occasionDemand, between,
  addDays, startOfDay, normaliseCity,
} from '../../lib/analytics'
import {
  ChartCard, BarRows, StatTile, Sparkline, SectionHead, EmptyNote,
  DataTable, DeltaBadge, ThinDataNote, Meter,
} from './viz/Primitives'
import { ChartSkeleton } from './CommandCenter'

const ChartKit = {
  ProductQuadrant: lazy(() => import('./charts/ChartKit').then(m => ({ default: m.ProductQuadrant }))),
  MoversChart:     lazy(() => import('./charts/ChartKit').then(m => ({ default: m.MoversChart }))),
  DemandRevenueTrend: lazy(() => import('./charts/ChartKit').then(m => ({ default: m.DemandRevenueTrend }))),
}

/**
 * Every product in the shop, and what it is doing.
 *
 * ── The question this screen answers ─────────────────────────────────────
 * Revenue-by-category told the founder which shelf earned the most. It could
 * not answer any of the questions that follow from that — which of the
 * forty-one cakes carried the shelf, which never sold, which sold well last
 * month and stopped, which get ordered but not paid for. Those are per-product
 * questions and there was no per-product screen.
 *
 * ── The list starts from the catalogue, not the orders ───────────────────
 * That is the whole design. Aggregating `order_items` produces the products
 * that sold; on a pre-launch catalogue of a few hundred items the far more
 * useful list is the complement — everything listed that nobody has ever
 * ordered — and a group-by over order lines can never produce it, because a
 * product with no rows has no rows to group. `productDemand` walks `products`
 * and attaches order lines to it, so an unsold product is a row with zeroes
 * rather than an absence.
 *
 * ── Two numbers per product, deliberately ────────────────────────────────
 * ORDERED and PAID are separate columns everywhere on this screen. Direct UPI
 * has no gateway callback, so a product can be in demand and show no revenue
 * purely because nobody has ticked the payments off against the bank yet. One
 * column would make an admin backlog look like a product failure.
 */

const BUCKETS = [
  { id: 'all',     label: 'Everything',  hint: null },
  { id: 'star',    label: '🚀 Growing',  hint: 'Selling more than the previous window' },
  { id: 'steady',  label: '➡️ Steady',   hint: 'Selling at about the same rate' },
  { id: 'fading',  label: '📉 Slipping', hint: 'Selling less than the previous window' },
  { id: 'dormant', label: '💤 Quiet',    hint: 'Sold before, nothing this window' },
  { id: 'unsold',  label: '🕳️ Unsold',   hint: 'Listed, never ordered' },
]

const SORTS = [
  { id: 'revenue',  label: 'Revenue' },
  { id: 'demand',   label: 'Units ordered' },
  { id: 'trend',    label: 'Fastest growing' },
  { id: 'slipping', label: 'Fastest falling' },
  { id: 'stale',    label: 'Longest since a sale' },
  { id: 'name',     label: 'Name' },
]

export default function ProductIntelligence({ data, onNavigate }) {
  const { orders = [], products = [], missing = [] } = data

  const [windowDays, setWindowDays] = useState(30)
  const [category, setCategory] = useState('all')
  const [bucket, setBucket]     = useState('all')
  const [sort, setSort]         = useState('revenue')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  const lines = useMemo(() => orderLines(orders), [orders])
  const rows  = useMemo(() => productDemand(products, lines, { windowDays }), [products, lines, windowDays])
  const buckets = useMemo(() => productBuckets(rows), [rows])
  const occasions = useMemo(() => occasionDemand(lines), [lines])

  const bucketOf = useMemo(() => {
    const map = new Map()
    for (const [id, list] of Object.entries(buckets)) for (const p of list) map.set(p.id, id)
    return map
  }, [buckets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter(p => {
      if (category !== 'all' && p.category !== category) return false
      if (bucket !== 'all' && bucketOf.get(p.id) !== bucket) return false
      if (q && !(p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.occasion?.toLowerCase().includes(q))) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'demand':   return b.demandUnits - a.demandUnits
        case 'trend':    return (b.everSold ? b.trend : -Infinity) - (a.everSold ? a.trend : -Infinity)
        case 'slipping': return (a.everSold ? a.trend : Infinity) - (b.everSold ? b.trend : Infinity)
        // Never-sold products have no "days since"; they sort last rather than
        // first, because "listed and never ordered" is its own bucket and
        // crowding it into the staleness list would bury real regressions.
        case 'stale':    return (b.daysSinceSale ?? -1) - (a.daysSinceSale ?? -1)
        case 'name':     return (a.name ?? '').localeCompare(b.name ?? '')
        default:         return b.revenue - a.revenue || b.demandUnits - a.demandUnits
      }
    })
    return list
  }, [rows, category, bucket, sort, search, bucketOf])

  /* Products that have actually sold, for the charts that need a scale. */
  const sold = useMemo(() => rows.filter(p => p.units > 0 || p.demandUnits > 0), [rows])
  const medianUnits = useMemo(() => {
    if (!sold.length) return 0
    const v = sold.map(p => p.units).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  }, [sold])

  const movers = useMemo(() => {
    const moving = sold.filter(p => p.currUnits > 0 || p.prevUnits > 0)
    const up   = [...moving].sort((a, b) => b.trend - a.trend).slice(0, 6)
    const down = [...moving].sort((a, b) => a.trend - b.trend).filter(p => p.trend < 0).slice(0, 6)
    // De-duplicated: with three moving products, "top 6 up" and "top 6 down"
    // would otherwise both contain all three and the chart would draw each twice.
    const seen = new Set()
    return [...up, ...down]
      .filter(p => !seen.has(p.id) && seen.add(p.id))
      .sort((a, b) => b.trend - a.trend)
      // Truncated to fit the y-axis gutter on ONE line — a wrapped category
      // tick detaches the name from its bar. The full name is in the tooltip
      // and the table twin.
      .map(p => ({ id: p.id, name: p.name.length > 20 ? `${p.name.slice(0, 19)}…` : p.name, trend: p.trend, units: p.demandUnits }))
  }, [sold])

  const quadrantData = useMemo(
    () => sold.map(p => ({
      id: p.id, name: p.name, emoji: p.emoji, category: p.category,
      units: p.units, trend: p.trend, revenue: Math.max(1, p.revenue),
      bucketLabel: BUCKETS.find(b => b.id === bucketOf.get(p.id))?.label,
    })),
    [sold, bucketOf],
  )

  const totals = useMemo(() => ({
    listed:    rows.filter(p => !p.orphan).length,
    active:    rows.filter(p => !p.orphan && p.is_active).length,
    sold:      rows.filter(p => p.everSold).length,
    unsold:    buckets.unsold.length,
    demand:    rows.reduce((s, p) => s + p.demandValue, 0),
    revenue:   rows.reduce((s, p) => s + p.revenue, 0),
    photos:    rows.filter(p => !p.orphan && p.image_source === 'actual').length,
  }), [rows, buckets])

  const selectedRow = selected ? rows.find(p => p.id === selected) : null

  return (
    <div className="space-y-5">
      {missing.includes('products') && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
          <AlertCircle size={18} className="shrink-0" />
          The catalogue could not be read. Everything below is computed from order history alone.
        </div>
      )}

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Listed" value={totals.listed} sub={`${totals.active} on sale`} />
        <StatTile label="Ever ordered" value={totals.sold} sub={`of ${totals.listed}`} />
        <StatTile label="Never ordered" value={totals.unsold}
                  tone={totals.unsold > 0 ? STATUS.serious : undefined} sub="the working list" />
        <StatTile label="Ordered value" value={compactINR(totals.demand)} sub="all time" />
        <StatTile label="Paid" value={compactINR(totals.revenue)} sub="confirmed received" />
        <StatTile label="Real photos" value={totals.photos} sub={`of ${totals.listed}`}
                  onClick={() => onNavigate('catalog')} />
      </div>

      {/* ── One filter row, scoping everything below it ──────────────── */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>All shelves</Chip>
          {SHOP_CATEGORIES.map(c => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}
                  dot={shopCategoryColor(c.id)}>
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BUCKETS.map(b => (
            <Chip key={b.id} active={bucket === b.id} onClick={() => setBucket(b.id)} title={b.hint}>
              {b.label}
              {b.id !== 'all' && <span className="ml-1 opacity-60">{buckets[b.id]?.length ?? 0}</span>}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, shelf or occasion…"
              className="input text-sm py-2 pl-8 w-64"
            />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="input text-sm py-2 w-auto pr-8">
            {SORTS.map(s => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
          </select>
          <div role="group" aria-label="Comparison window" className="flex rounded-xl border border-gray-200 overflow-hidden ml-auto">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setWindowDays(d)} aria-pressed={windowDays === d}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  windowDays === d ? 'bg-plum-600 text-ink' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quadrant + movers ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="Volume against growth"
          sub={`Each dot is a product. Right means it sells; up means it is selling more than the previous ${windowDays} days. Dot size is revenue.`}
          table={{
            columns: [
              { key: 'name', label: 'Product' },
              { key: 'units', label: 'Units paid' },
              { key: 'trend', label: 'Growth', render: r => `${r.trend > 0 ? '+' : ''}${r.trend}%` },
              { key: 'revenue', label: 'Revenue', render: r => formatINR(r.revenue) },
            ],
            rows: quadrantData.map(p => ({ ...p, key: p.id })),
          }}
        >
          {quadrantData.length === 0 ? (
            <EmptyNote icon="🎯">Nothing has been ordered yet, so there is nothing to place.</EmptyNote>
          ) : (
            <>
              <Suspense fallback={<ChartSkeleton height={300} />}>
                <ChartKit.ProductQuadrant data={quadrantData} medianUnits={medianUnits} />
              </Suspense>
              <ThinDataNote n={quadrantData.length} noun="selling products" min={8} />
            </>
          )}
        </ChartCard>

        <ChartCard
          title="What moved"
          sub={`Change in units ordered against the previous ${windowDays} days. Blue is up, red is down.`}
          table={{
            columns: [
              { key: 'name', label: 'Product' },
              { key: 'trend', label: 'Change', render: r => `${r.trend > 0 ? '+' : ''}${r.trend}%` },
              { key: 'units', label: 'Units ordered' },
            ],
            rows: movers.map(m => ({ ...m, key: m.id })),
          }}
        >
          {movers.length === 0 ? (
            <EmptyNote icon="📈">
              Nothing has moved in either direction — that needs sales in two consecutive windows.
            </EmptyNote>
          ) : (
            <Suspense fallback={<ChartSkeleton height={260} />}>
              <ChartKit.MoversChart data={movers} />
            </Suspense>
          )}
        </ChartCard>
      </div>

      {/* ── Occasion demand ──────────────────────────────────────────── */}
      <ChartCard
        title="Which occasions people shop for"
        sub="Products carry an occasion tag (Diwali, Birthday, Independence Day…), snapshotted onto the order line at purchase. This is what the catalogue should be built around next year."
        table={{
          columns: [
            { key: 'label', label: 'Occasion' },
            { key: 'demandUnits', label: 'Units ordered' },
            { key: 'demandValue', label: 'Ordered', render: r => formatINR(r.demandValue) },
            { key: 'revenue', label: 'Paid', render: r => formatINR(r.revenue) },
            { key: 'products', label: 'Distinct items' },
          ],
          rows: occasions.map(o => ({ ...o, key: o.id })),
        }}
      >
        <BarRows
          rows={occasions.slice(0, 10).map((o, i) => ({
            id: o.id, label: o.label, value: o.demandValue,
            // One hue for the whole series: these bars are ranked magnitude,
            // not identity, and a colour per occasion would double-encode the
            // bar length it already shows.
            color: CATEGORICAL[0],
            note: `${o.demandUnits} units · ${o.products} item${o.products === 1 ? '' : 's'}`,
          }))}
          format={formatINR}
          emptyNote="No orders carry an occasion tag yet."
        />
      </ChartCard>

      {/* ── The table ────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-900">All products</h3>
            <p className="text-xs" style={{ color: INK.muted }}>
              {filtered.length} of {rows.length} · click a row for its full history
            </p>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-white text-xs font-semibold hover:bg-plum-700"
          >
            <Pencil size={12} /> Edit the catalogue
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyNote icon="🔍">Nothing matches this filter.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Product', 'Shelf', 'Ordered', 'Paid', 'Revenue', 'Confirmed', `Last ${windowDays}d`, 'Last sale'].map((c, i) => (
                    <th key={c} className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 200).map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Thumb product={p} />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-xs truncate max-w-[220px]">{p.name}</div>
                          <div className="text-[11px]" style={{ color: INK.muted }}>
                            {formatINR(p.price)}
                            {p.occasion ? ` · ${p.occasion}` : ''}
                            {!p.is_active && !p.orphan ? ' · retired' : ''}
                            {p.orphan ? ' · no longer in the catalogue' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
                        <span className="w-2 h-2 rounded-sm" style={{ background: shopCategoryColor(p.category) }} aria-hidden="true" />
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{p.demandUnits || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{p.units || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-gray-900">
                      {p.revenue ? formatINR(p.revenue) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {p.paidRate == null ? <span style={{ color: INK.muted }}>—</span> : (
                        <span className="text-[11px] font-semibold tabular-nums"
                              style={{ color: p.paidRate === 100 ? STATUS.good : p.paidRate >= 50 ? INK.secondary : STATUS.critical }}>
                          {p.paidRate}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {p.everSold
                        ? <DeltaBadge value={p.trend} className="justify-end" />
                        : <span className="text-[11px]" style={{ color: INK.muted }}>never sold</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px]" style={{ color: INK.muted }}>
                      {p.lastSold ? `${p.daysSinceSale}d ago` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="px-4 py-2 text-[11px] border-t border-gray-50" style={{ color: INK.muted }}>
                Showing the first 200. Narrow the filter or search to see the rest.
              </p>
            )}
          </div>
        )}
      </div>

      {selectedRow && (
        <ProductDetail
          product={selectedRow}
          lines={lines.filter(l => l.product_id === selectedRow.id || (selectedRow.orphan && l.product_name === selectedRow.name))}
          windowDays={windowDays}
          onClose={() => setSelected(null)}
          onEdit={() => { setSelected(null); onNavigate('catalog') }}
        />
      )}
    </div>
  )
}

/* ── One product, in full ──────────────────────────────────────────────── */

/**
 * The drill-down. Everything here is derived from that product's own order
 * lines, so it answers "who bought this, when, where, and did they pay" —
 * questions a category chart structurally cannot.
 */
function ProductDetail({ product: p, lines, windowDays, onClose, onEdit }) {
  const series = useMemo(() => dailySeries(lines, Math.max(windowDays, 30)), [lines, windowDays])

  const cities = useMemo(() => {
    const map = new Map()
    for (const l of lines) {
      const city = normaliseCity(l.address?.city) ?? 'Unknown'
      if (!map.has(city)) map.set(city, { id: city, label: city, value: 0, units: 0 })
      const row = map.get(city)
      row.value += Number(l.subtotal) || 0
      row.units += Number(l.qty) || 0
    }
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [lines])

  // What people actually paid per unit, against the catalogue price. A gap
  // means a configured product (a heavier cake, add-ons) rather than a
  // discount — the customiser prices the line, not the shelf.
  const realised = useMemo(() => {
    const units = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
    const value = lines.reduce((s, l) => s + (Number(l.subtotal) || 0), 0)
    return units ? Math.round(value / units) : null
  }, [lines])

  const recent = useMemo(
    () => [...lines].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12),
    [lines],
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Thumb product={p} size={44} />
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: INK.muted }}>
                {p.category}{p.occasion ? ` · ${p.occasion}` : ''} · listed at {formatINR(p.price)}
                {!p.is_active && !p.orphan ? ' · retired' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1 shrink-0"><X size={20} /></button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* ── Identity ────────────────────────────────────────────
              The product's own record: the id you would quote in a
              support conversation, the copy the customer actually reads,
              and its photo state. All three were missing before — the
              analytics knew what this product SOLD and nothing about what
              it IS, which is exactly what you need when it sells nothing. */}
          <IdentityBlock product={p} />
          <LifecycleStrip product={p} />
          {!p.everSold ? (
            <div className="rounded-2xl p-5" style={{ background: INK.plane }}>
              <p className="text-sm font-semibold text-gray-900">Nobody has ordered this yet.</p>
              <p className="text-xs mt-1.5 max-w-prose" style={{ color: INK.secondary }}>
                It has been on the shelf and has never been bought once. Before writing it off,
                the three things that stop a listing selling are, in order: no real photograph,
                a price that does not match the shelf around it, and a name nobody searches for.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plum-600 text-white text-xs font-semibold hover:bg-plum-700">
                  <Camera size={12} /> Photograph or edit it
                </button>
              </div>
              {p.image_source !== 'actual' && (
                <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: STATUS.serious }}>
                  <AlertCircle size={12} /> This one is still showing a representative stock photo.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Units ordered" value={p.demandUnits} />
                <MiniStat label="Units paid for" value={p.units} />
                <MiniStat label="Revenue" value={formatINR(p.revenue)} />
                <MiniStat label="Buyers" value={p.buyers} sub={`${p.orders} order${p.orders === 1 ? '' : 's'}`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Meter
                    value={p.paidRate ?? 0} max={100}
                    label="Payment confirmed"
                    caption={`${p.paidRate ?? 0}%`}
                    fill={(p.paidRate ?? 0) === 100 ? STATUS.good : STATUS.warning}
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: INK.muted }}>
                    Of everything ordered. Below 100% is an admin backlog, not lost interest.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">Average paid per unit</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: INK.primary }}>
                    {realised != null ? formatINR(realised) : '—'}
                  </p>
                  <p className="text-[11px]" style={{ color: INK.muted }}>
                    {realised != null && realised > p.price
                      ? `${formatINR(realised - p.price)} above the listed price — customisations are being added.`
                      : realised != null && realised < p.price
                        ? `${formatINR(p.price - realised)} under the listed price.`
                        : 'Matches the listed price.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">History</p>
                  <p className="text-[11px] mt-1" style={{ color: INK.secondary }}>
                    First sold {formatDate(p.firstSold)}<br />
                    Last sold {formatDate(p.lastSold)} ({p.daysSinceSale} day{p.daysSinceSale === 1 ? '' : 's'} ago)
                  </p>
                  <div className="mt-1.5"><DeltaBadge value={p.trend} period={`vs prior ${windowDays}d`} /></div>
                </div>
              </div>

              <div>
                <SectionHead title="Its own demand curve" sub="Ordered against paid, for this product alone." />
                <Suspense fallback={<ChartSkeleton height={200} />}>
                  <ChartKit.DemandRevenueTrend data={series} height={200} />
                </Suspense>
              </div>

              {cities.length > 0 && (
                <div>
                  <SectionHead title="Where it ships" />
                  <BarRows
                    rows={cities.map(c => ({ ...c, color: CATEGORICAL[0], note: `${c.units} units` }))}
                    format={formatINR}
                  />
                </div>
              )}

              <div>
                <SectionHead title="Recent orders" />
                <DataTable
                  columns={[
                    { key: 'when', label: 'When', render: r => formatDate(r.created_at) },
                    { key: 'qty', label: 'Qty' },
                    { key: 'unit_price', label: 'Unit', render: r => formatINR(r.unit_price) },
                    { key: 'subtotal', label: 'Line', render: r => formatINR(r.subtotal) },
                    { key: 'payment_status', label: 'Payment' },
                  ]}
                  rows={recent.map(l => ({ ...l, key: l.id }))}
                />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:border-plum-300 hover:text-plum-700">
              <Pencil size={12} /> Edit this product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Identity & lifecycle ──────────────────────────────────────────────── */

/**
 * What this product IS, as opposed to what it has done.
 *
 * The id is shown in full and copyable because it is the thing you paste into
 * a query, a support thread or a URL — an id you can see but not copy is an id
 * you retype wrong. The description is here because it is the customer-facing
 * copy, and on a product that has never sold it is one of the three things
 * worth checking (photo, price, words).
 */
function IdentityBlock({ product: p }) {
  const [copied, setCopied] = useState(null)
  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what); setTimeout(() => setCopied(null), 1600)
    } catch { /* clipboard blocked — the value is still on screen to select */ }
  }

  return (
    <div className="rounded-xl p-4 space-y-2.5" style={{ background: INK.plane }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK.muted }}>ID</span>
        <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700 break-all">
          {p.id}
        </code>
        {!p.orphan && (
          <button onClick={() => copy(p.id, 'id')}
                  className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
            {copied === 'id' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK.muted }}>Name</span>
        <span className="text-xs font-semibold text-gray-900">{p.name}</span>
        <button onClick={() => copy(p.name, 'name')}
                className="text-[11px] font-semibold text-plum-700 hover:text-plum-800">
          {copied === 'name' ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide block mb-0.5" style={{ color: INK.muted }}>
          Description — what the customer reads
        </span>
        {p.description ? (
          <p className="text-xs" style={{ color: INK.secondary }}>{p.description}</p>
        ) : (
          <p className="text-xs flex items-center gap-1.5" style={{ color: STATUS.serious }}>
            <AlertCircle size={12} /> No description. A listing with no words is one nobody can search for.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <Field label="Shelf" value={p.category} />
        <Field label="Occasion" value={p.occasion ?? 'None'} />
        <Field label="Listed price" value={formatINR(p.price)} />
        <Field label="On sale" value={p.is_active ? 'Yes' : 'Retired'}
               tone={p.is_active ? undefined : STATUS.serious} />
      </div>
    </div>
  )
}

/**
 * The product's own lifecycle, which is a different thing from the order's.
 *
 * Five states a listing passes through — created, described, photographed for
 * real, first sold, still selling — and this shows which have been reached.
 * Pre-launch most products sit at step two, and seeing that as a strip rather
 * than as a number is what makes it a to-do list.
 */
function LifecycleStrip({ product: p }) {
  const steps = [
    { id: 'listed',   label: 'Listed',        done: true,
      detail: p.listedAt ? formatDate(p.listedAt) : 'in the catalogue' },
    { id: 'described',label: 'Described',     done: Boolean(p.description),
      detail: p.description ? 'has copy' : 'no description yet' },
    { id: 'pictured', label: 'Photographed',  done: Boolean(p.image_url),
      detail: !p.image_url ? 'emoji tile only'
            : p.image_source === 'actual' ? 'real photo' : 'representative stock photo' },
    { id: 'sold',     label: 'First sale',    done: p.everSold,
      detail: p.firstSold ? formatDate(p.firstSold) : 'never ordered' },
    { id: 'selling',  label: 'Still selling', done: p.currUnits > 0,
      detail: p.currUnits > 0 ? `${p.currUnits} this window`
            : p.everSold ? `quiet for ${p.daysSinceSale}d` : '—' },
  ]

  return (
    <div>
      <SectionHead title="Where this listing has got to" />
      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <li key={s.id} className="flex-1 min-w-[104px]">
            {/* An ordered scale, so an ordinal ramp — darkening with depth —
                rather than five categorical hues, which would say these five
                steps are five unrelated things. */}
            <div className="h-1.5 rounded-full mb-1.5"
                 style={{ background: s.done ? ORDINAL_BLUE[Math.min(i, ORDINAL_BLUE.length - 1)] : INK.grid }} />
            <p className={`text-[11px] ${s.done ? 'font-bold text-gray-900' : 'font-medium'}`}
               style={s.done ? undefined : { color: INK.muted }}>
              {s.label}
            </p>
            <p className="text-[10px] leading-snug" style={{ color: INK.muted }}>{s.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Field({ label, value, tone }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK.muted }}>{label}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: tone ?? INK.primary }}>{value}</div>
    </div>
  )
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function Thumb({ product, size = 32 }) {
  return product.image_url ? (
    <img
      src={product.image_url} alt="" loading="lazy"
      className="rounded-lg object-cover shrink-0 bg-gray-50"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="rounded-lg shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, background: INK.plane, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {product.emoji ?? '📦'}
    </span>
  )
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="rounded-xl p-3" style={{ background: INK.plane }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: INK.muted }}>{label}</div>
      <div className="text-lg font-bold mt-0.5" style={{ color: INK.primary }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: INK.muted }}>{sub}</div>}
    </div>
  )
}

function Chip({ active, onClick, children, dot, title }) {
  return (
    <button
      onClick={onClick} title={title} aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? 'bg-plum-700 border-plum-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
      }`}
    >
      {dot && <span className="w-2 h-2 rounded-sm" style={{ background: active ? '#fff' : dot }} aria-hidden="true" />}
      {children}
    </button>
  )
}
