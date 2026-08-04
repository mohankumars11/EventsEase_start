import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { EVENT_LIST } from '../../data/eventServicesData'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ProductImage from '../../components/shop/ProductImage'

export default function ServicesPicker() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EVENT_LIST
    return EVENT_LIST.filter(ev =>
      ev.name.toLowerCase().includes(q) ||
      ev.tagline?.toLowerCase().includes(q) ||
      ev.services.some(s => s.name.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">What do you need help with?</h1>
          <p className="text-gray-500 text-sm">
            Pick your function or festival — we'll show you exactly what's typically needed:
            cooks, priests, pooja items, decorations and more. Add only what you want.
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search celebrations or services…"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No matches for "{query}" — try a different search.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <button
              key={ev.id}
              onClick={() => navigate(`/dashboard/customer/events/${ev.id}`)}
              className={`text-left rounded-2xl border-2 ${ev.borderColor} ${ev.bgColor} overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group`}
            >
              <ProductImage query={`Indian ${ev.name} celebration`} emoji={ev.emoji} className="w-full h-28" />
              <div className="p-5">
                <p className={`font-bold text-sm ${ev.textColor}`}>{ev.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{ev.tagline}</p>
                <p className="text-[11px] text-gray-400 mt-2">{ev.services.length} services · {ev.packages.length} packages</p>
              </div>
            </button>
          ))}
        </div>
        )}
      </div>
    </CustomerLayout>
  )
}
