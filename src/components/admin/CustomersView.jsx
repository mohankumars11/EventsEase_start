import { useState, useMemo, lazy, Suspense } from 'react'
import { X, Phone, MessageCircle, Mail, Search } from 'lucide-react'
import { EVENT_STATUSES, STATUS_CSS } from '../../config/sambramo'
import { formatINR, formatDate } from '../../utils/format'
import { INK, STATUS, CATEGORICAL } from '../../config/dataviz'
import { customerStats, acquisitionByMonth, orderLines } from '../../lib/analytics'
import { StatTile, ChartCard, BarRows, Meter, EmptyNote, DataTable, SectionHead } from './viz/Primitives'
import { ChartSkeleton } from './CommandCenter'

const GroupedBars = lazy(() => import('./charts/ChartKit').then(m => ({ default: m.GroupedBars })))

/**
 * Customer 360, with the two questions the old table could not answer.
 *
 * The previous version listed customers sorted by spend, which tells you who
 * your biggest customer is and nothing about whether you have a business. The
 * two additions:
 *
 *   REPEAT RATE. What proportion of people who bought once bought again. On a
 *     shop selling cakes and gifts this is the number that decides whether
 *     acquisition spend is ever recoverable, and it was not computed anywhere.
 *
 *   NEW VS RETURNING, month by month. Whether this month's orders came from
 *     new people or the same people. Two businesses with identical revenue
 *     curves and opposite answers here are not the same business.
 *
 * Repeat is counted on orders PLACED rather than orders paid: a second order
 * sitting unconfirmed on direct UPI is still a customer who came back, whatever
 * the bank has done about it yet.
 */

const SORTS = [
  { id: 'spend',  label: 'Total spend' },
  { id: 'orders', label: 'Orders' },
  { id: 'events', label: 'Celebrations' },
  { id: 'recent', label: 'Most recent' },
  { id: 'name',   label: 'Name' },
]

export default function CustomersView({ data }) {
  const { profiles = [], orders = [], events = [], reviews = [] } = data
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('spend')
  const [selected, setSelected] = useState(null)

  const stats = useMemo(() => customerStats(profiles, orders, events), [profiles, orders, events])
  const acquisition = useMemo(() => acquisitionByMonth(orders, 6), [orders])
  const lines = useMemo(() => orderLines(orders), [orders])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? stats.rows.filter(c =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q))
      : stats.rows
    return [...list].sort((a, b) => {
      if (sortBy === 'orders') return b.orderCount - a.orderCount
      if (sortBy === 'events') return b.eventCount - a.eventCount
      if (sortBy === 'name')   return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at)
      return b.totalSpend - a.totalSpend
    })
  }, [stats.rows, search, sortBy])

  const selectedCustomer = selected ? stats.rows.find(c => c.id === selected) : null

  /* Where customers signed up from — the profile's own city field. */
  const byCity = useMemo(() => {
    const map = new Map()
    for (const p of profiles) {
      const key = p.city?.trim() || 'Not given'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([id, value]) => ({ id, label: id, value, color: CATEGORICAL[0] }))
      .sort((a, b) => b.value - a.value)
  }, [profiles])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Signed up" value={stats.totalCustomers} />
        <StatTile label="Have ordered" value={stats.buyers}
                  sub={stats.totalCustomers ? `${Math.round((stats.buyers / stats.totalCustomers) * 100)}% of signups` : null} />
        <StatTile label="Ordered twice or more" value={stats.repeatBuyers}
                  tone={stats.repeatRate >= 20 ? STATUS.good : undefined} sub={`${stats.repeatRate}% repeat rate`} />
        <StatTile label="Average order" value={stats.aov ? formatINR(stats.aov) : '—'} sub="paid orders" />
        <StatTile label="Revenue per buyer" value={stats.revenuePerBuyer ? formatINR(stats.revenuePerBuyer) : '—'}
                  sub="not a lifetime value" />
        <StatTile label="Reviews written" value={reviews.length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="New against returning"
          sub="Orders each month, split by whether it was that customer's first. A bar that is mostly new is growth you have to keep buying; mostly returning is a business."
          table={{
            columns: [
              { key: 'label', label: 'Month' },
              { key: 'new', label: 'First orders' },
              { key: 'returning', label: 'Repeat orders' },
            ],
            rows: acquisition.map(a => ({ ...a, key: a.label })),
          }}
        >
          {acquisition.every(a => !a.new && !a.returning) ? (
            <EmptyNote icon="📈">No orders in the last six months.</EmptyNote>
          ) : (
            <Suspense fallback={<ChartSkeleton height={200} />}>
              <GroupedBars
                data={acquisition}
                series={[
                  { key: 'new',       label: 'First order',  color: CATEGORICAL[0] },
                  { key: 'returning', label: 'Came back',    color: CATEGORICAL[2] },
                ]}
              />
            </Suspense>
          )}
        </ChartCard>

        <ChartCard
          title="Where they signed up from"
          sub="The city on the customer's own profile — which is not always where they order to."
          table={{
            columns: [{ key: 'label', label: 'City' }, { key: 'value', label: 'Customers' }],
            rows: byCity.map(c => ({ ...c, key: c.id })),
          }}
        >
          <div className="space-y-4">
            <Meter
              value={stats.repeatBuyers} max={Math.max(1, stats.buyers)}
              label="Buyers who came back"
              caption={`${stats.repeatRate}%`}
              fill={stats.repeatRate >= 20 ? STATUS.good : STATUS.warning}
            />
            <BarRows rows={byCity.slice(0, 8)} format={v => `${v} customer${v === 1 ? '' : 's'}`}
                     emptyNote="No customers have a city on their profile." />
          </div>
        </ChartCard>
      </div>

      {/* ── The list ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-900">Everyone</h3>
            <p className="text-xs" style={{ color: INK.muted }}>{rows.length} customer{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="Search name, phone, email" className="input text-sm py-2 pl-8 w-56" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm py-2 w-auto pr-8">
              {SORTS.map(s => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyNote icon="👥">No customers found.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Customer', 'City', 'Joined', 'Orders', 'Spend', 'Celebrations', 'Last order'].map((c, i) => (
                    <th key={c} className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c.id)} className="hover:bg-purple-50/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{c.full_name || 'Unnamed'}</span>
                        {c.repeat && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: '#e6f6e6', color: '#006300' }}>
                            REPEAT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{c.phone || c.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {c.orderCount}
                      {c.paidCount !== c.orderCount && (
                        <span className="text-[10px]" style={{ color: INK.muted }}> ({c.paidCount} paid)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{formatINR(c.totalSpend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{c.eventCount}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {c.lastOrder ? `${c.daysSince}d ago` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          orders={orders.filter(o => o.customer_id === selectedCustomer.id)}
          events={events.filter(e => e.customer_id === selectedCustomer.id)}
          reviews={reviews.filter(r => r.customer_id === selectedCustomer.id)}
          lines={lines.filter(l => l.customer_id === selectedCustomer.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function CustomerDetailPanel({ customer, orders, events, reviews, lines, onClose }) {
  /* What this person actually buys — their own top products. */
  const favourites = useMemo(() => {
    const map = new Map()
    for (const l of lines) {
      const key = l.product_name ?? 'Unknown'
      if (!map.has(key)) map.set(key, { id: key, label: key, value: 0, units: 0 })
      const row = map.get(key)
      row.value += Number(l.subtotal) || 0
      row.units += Number(l.qty) || 0
    }
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 6)
  }, [lines])

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-900">{customer.full_name || 'Unnamed customer'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Customer since {formatDate(customer.created_at)}
              {customer.repeat ? ' · has ordered more than once' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Phone size={12} /> {customer.phone}
              </a>
            )}
            {customer.phone && (
              <a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100">
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Mail size={12} /> {customer.email}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Total spend" value={formatINR(customer.totalSpend)} />
            <Mini label="Orders" value={customer.orderCount} sub={`${customer.paidCount} paid`} />
            <Mini label="Celebrations" value={customer.eventCount} />
            <Mini label="Last order" value={customer.lastOrder ? `${customer.daysSince}d ago` : '—'} />
          </div>

          {favourites.length > 0 && (
            <div>
              <SectionHead title="What they buy" />
              <BarRows rows={favourites.map(f => ({ ...f, color: CATEGORICAL[0], note: `${f.units} units` }))}
                       format={formatINR} />
            </div>
          )}

          {orders.length > 0 && (
            <div>
              <SectionHead title="Order history" />
              <DataTable
                columns={[
                  { key: 'when', label: 'When', render: o => formatDate(o.created_at) },
                  { key: 'items', label: 'Items', render: o => (o.order_items ?? []).length },
                  { key: 'status', label: 'Status' },
                  { key: 'payment_status', label: 'Payment' },
                  { key: 'total', label: 'Total', render: o => formatINR(o.total) },
                ]}
                rows={orders.map(o => ({ ...o, key: o.id }))}
              />
            </div>
          )}

          {events.length > 0 && (
            <div>
              <SectionHead title="Celebration bookings" />
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-xs">
                    <span className="font-semibold text-gray-800 capitalize">{e.event_type?.replace(/-/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_CSS[e.status]?.bg ?? 'bg-gray-100'} ${STATUS_CSS[e.status]?.text ?? 'text-gray-600'}`}>
                      {EVENT_STATUSES[e.status]?.label ?? e.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <p className="text-xs text-gray-500">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''} written.
            </p>
          )}

          {orders.length === 0 && events.length === 0 && (
            <EmptyNote icon="🌱">
              Signed up and has never ordered. Worth one message.
            </EmptyNote>
          )}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, sub }) {
  return (
    <div className="text-center p-3 rounded-xl" style={{ background: INK.plane }}>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px]" style={{ color: INK.muted }}>{sub}</div>}
    </div>
  )
}
