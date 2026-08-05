import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CustomerLayout from '../../components/customer/CustomerLayout'
import VendorCard from '../../components/customer/VendorCard'

const CITIES = [
  'Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Pune',
  'Ahmedabad','Jaipur','Surat','Lucknow','Nagpur','Coimbatore','Kochi',
  'Visakhapatnam','Indore','Bhopal','Patna','Vadodara','Thiruvananthapuram',
]

const SERVICE_CATS = [
  'Decoration','Catering/Cooks','Photography','Videography','Tent/Pandal',
  'Tables & Seating','Stage & Lighting','DJ/Music','Drum Sets','Return Gifts','Cleanup Crew',
]

const RATING_OPTS = [
  { label: 'Any rating', value: 0 },
  { label: '3+ stars',   value: 3 },
  { label: '4+ stars',   value: 4 },
  { label: '4.5+ stars', value: 4.5 },
]

export default function BrowseVendors() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState({
    serviceCategory: searchParams.get('service') ?? '',
    city:            '',
    area:            '',
    budgetMin:       '',
    budgetMax:       '',
    minRating:       0,
  })
  const [eventLabel, setEventLabel] = useState(searchParams.get('event') ?? '')
  const [vendors, setVendors]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Re-fetch whenever filters change
  useEffect(() => { fetchVendors() }, [filters])

  async function fetchVendors() {
    setLoading(true)
    let q = supabase.from('vendors').select('*, vendor_photos(*)')

    if (filters.city)            q = q.eq('city', filters.city)
    if (filters.area)            q = q.ilike('area', `%${filters.area}%`)
    if (filters.serviceCategory) q = q.eq('category', filters.serviceCategory)
    if (filters.budgetMin)       q = q.gte('price_range_max', Number(filters.budgetMin))
    if (filters.budgetMax)       q = q.lte('price_range_min', Number(filters.budgetMax))
    if (filters.minRating > 0)   q = q.gte('rating_avg', filters.minRating)

    q = q
      .order('is_featured', { ascending: false })
      .order('rating_avg',  { ascending: false })

    const { data } = await q
    setVendors(data ?? [])
    setLoading(false)
  }

  function set(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearAll() {
    setFilters({ serviceCategory: '', city: '', area: '', budgetMin: '', budgetMax: '', minRating: 0 })
    setEventLabel('')
    setSearchParams({})
  }

  const activeCount = [
    filters.city, filters.area, filters.serviceCategory,
    filters.budgetMin, filters.budgetMax, filters.minRating > 0 ? '1' : '',
  ].filter(Boolean).length

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {eventLabel ? `Vendors for ${eventLabel}` : 'Browse Vendors'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {loading ? '…' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="btn-secondary relative flex items-center gap-2"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-crimson-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card p-5 mb-5 border-marigold-200 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800 text-sm">Refine results</span>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Clear all
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Service category</label>
                <select value={filters.serviceCategory} onChange={e => set('serviceCategory', e.target.value)} className="input">
                  <option value="">All categories</option>
                  {SERVICE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City</label>
                <select value={filters.city} onChange={e => set('city', e.target.value)} className="input">
                  <option value="">All cities</option>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Area / locality</label>
                <input
                  value={filters.area}
                  onChange={e => set('area', e.target.value)}
                  className="input"
                  placeholder="e.g. Andheri, Koramangala"
                />
              </div>
              <div>
                <label className="label">Min budget (₹)</label>
                <input
                  type="number" min="0"
                  value={filters.budgetMin}
                  onChange={e => set('budgetMin', e.target.value)}
                  className="input" placeholder="e.g. 5000"
                />
              </div>
              <div>
                <label className="label">Max budget (₹)</label>
                <input
                  type="number" min="0"
                  value={filters.budgetMax}
                  onChange={e => set('budgetMax', e.target.value)}
                  className="input" placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className="label">Minimum rating</label>
                <select value={filters.minRating} onChange={e => set('minRating', Number(e.target.value))} className="input">
                  {RATING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {(eventLabel || activeCount > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {eventLabel && (
              <Chip label={`🎊 ${eventLabel}`} onRemove={() => { setEventLabel(''); setSearchParams({}) }} />
            )}
            {filters.serviceCategory && (
              <Chip label={filters.serviceCategory} onRemove={() => set('serviceCategory', '')} />
            )}
            {filters.city && (
              <Chip label={filters.city} onRemove={() => set('city', '')} />
            )}
            {filters.area && (
              <Chip label={filters.area} onRemove={() => set('area', '')} />
            )}
            {filters.minRating > 0 && (
              <Chip label={`⭐ ${filters.minRating}+`} onRemove={() => set('minRating', 0)} />
            )}
            {(filters.budgetMin || filters.budgetMax) && (
              <Chip
                label={`₹${filters.budgetMin || '0'} – ₹${filters.budgetMax || '∞'}`}
                onRemove={() => { set('budgetMin', ''); set('budgetMax', '') }}
              />
            )}
          </div>
        )}

        {/* Vendor grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-bold text-gray-700 mb-2">No vendors found</h3>
            <p className="text-sm text-gray-400 mb-4">Try changing your filters or searching a different city.</p>
            <button onClick={clearAll} className="btn-primary">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {vendors.map(v => <VendorCard key={v.id} vendor={v} />)}
          </div>
        )}

      </div>
    </CustomerLayout>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-marigold-100 text-marigold-700 rounded-full text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-crimson-600 transition-colors">
        <X size={11} />
      </button>
    </span>
  )
}
