import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, ChevronDown, Sparkles } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import ComingSoonCity from './ComingSoonCity'

// Pilot launch: only these two are real, selectable options — everything
// else routes to the "notify me" flow below instead of a fake city chip.
const CITIES = BRAND.pilotCities

// Free, no-API-key place search. Good enough for current traffic; swap for
// Google Places/Mapbox later if volume and precision demands grow.
async function searchNominatim(query, city) {
  const q = encodeURIComponent(`${query}, ${city}, India`)
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&limit=6&q=${q}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('lookup failed')
  return res.json()
}

/**
 * value: { city, area, label, lat, lon, pincode } | null
 * onChange(location)
 */
export default function LocationAutocomplete({ value, onChange, className = '' }) {
  const [city, setCity] = useState(value?.city ?? '')
  const [query, setQuery] = useState(value?.area ?? '')
  const [pincode, setPincode] = useState(value?.pincode ?? '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [otherCity, setOtherCity] = useState(null) // null = not in this mode; string = what they typed
  const debounceRef = useRef(null)
  const boxRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleQueryChange(q) {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (!city || q.trim().length < 3) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchNominatim(q, city)
        setResults(data)
        setFailed(false)
        setOpen(true)
      } catch {
        setResults([])
        setFailed(true)
      } finally {
        setLoading(false)
      }
    }, 450)
  }

  function pickResult(r) {
    const area = r.address?.suburb || r.address?.neighbourhood || r.address?.village || r.address?.town || r.display_name.split(',')[0]
    const loc = {
      city,
      area,
      label: r.display_name,
      lat: r.lat,
      lon: r.lon,
      pincode: r.address?.postcode || pincode,
    }
    setQuery(area)
    setPincode(loc.pincode || '')
    setOpen(false)
    onChange(loc)
  }

  function handlePincodeChange(p) {
    setPincode(p)
    onChange({ city, area: query, label: query, lat: value?.lat, lon: value?.lon, pincode: p })
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {CITIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { setOtherCity(null); setCity(c); setQuery(''); setResults([]); onChange({ city: c, area: '', label: '', pincode }) }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              otherCity === null && city === c
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            {c}
            {c === 'Mysore' && (
              <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                otherCity === null && city === c ? 'bg-white/25 text-white' : 'bg-saffron-100 text-saffron-700'
              }`}>
                <Sparkles size={9} /> NEW
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setOtherCity(''); setCity(''); setQuery(''); setResults([]) }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            otherCity !== null
              ? 'bg-gray-800 border-gray-800 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          My city isn't listed
        </button>
      </div>

      {otherCity !== null ? (
        <div className="space-y-2.5">
          <input
            value={otherCity}
            onChange={e => setOtherCity(e.target.value)}
            placeholder="Which city?"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
          />
          <ComingSoonCity city={otherCity} source="venue_location" />
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div ref={boxRef} className="relative sm:col-span-2">
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              disabled={!city}
              placeholder={city ? `Search area in ${city} (e.g. Banashankari)` : 'Pick a city first'}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {loading
              ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" />
              : <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            }
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                >
                  <MapPin size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-gray-700 leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {open && failed && (
            <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs text-gray-400">
              Couldn't look up that area — just type it below and we'll use it as-is.
            </div>
          )}
        </div>

        <input
          placeholder="Pincode"
          value={pincode}
          onChange={e => handlePincodeChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
        />
      </div>
      )}
    </div>
  )
}
