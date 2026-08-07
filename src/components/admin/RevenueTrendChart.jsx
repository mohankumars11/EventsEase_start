import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatINR } from '../../utils/format'

/**
 * The 30-day shop revenue area chart.
 *
 * Split into its own module purely so `recharts` can be code-split behind it.
 * Imported at the top of AdminDashboard it pulled the whole charting library
 * into that route's chunk, taking it from 41 KB to 417 KB — a 10x jump paid by
 * every operator opening any tab, to draw one graph on one of twelve.
 *
 * AdminDashboard now lazy-loads this, so the library downloads when someone
 * actually opens Revenue and never otherwise.
 */
export default function RevenueTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2a78d6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#2a78d6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} interval={4} />
        <YAxis tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} width={50}
          tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
        <Tooltip formatter={v => formatINR(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" stroke="#2a78d6" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
