import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { isPilotCity } from '../../utils/cityPilot'
import ComingSoonCity from '../common/ComingSoonCity'

// Vite doesn't resolve Leaflet's default marker icon URLs from its CSS —
// point them at the bundled assets directly, once.
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const DEFAULT_CENTER = [12.9716, 77.5946] // Bengaluru — just a starting viewport, not a guess at the user's location

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('lookup failed')
  return res.json()
}

/**
 * Delivery-address location capture: a Leaflet/OpenStreetMap pin (draggable,
 * click-to-place) plus a "use current location" shortcut, backed by
 * Nominatim reverse geocoding — no API key, no billing account needed.
 *
 * value: { lat, lon, city, pincode, line }
 * onChange(patch) — called with a partial update to merge into the address
 */
export default function DeliveryLocationPicker({ value, onChange }) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const geocodeTimer = useRef(null)

  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [geocoding, setGeocoding] = useState(false)

  function applyReverseGeocode(lat, lon) {
    clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const r = await reverseGeocode(lat, lon)
        const a = r.address ?? {}
        onChange({
          lat, lon,
          city: a.city || a.town || a.village || a.county || value?.city || '',
          pincode: a.postcode || value?.pincode || '',
          line: [a.road, a.suburb].filter(Boolean).join(', ') || r.display_name || value?.line || '',
        })
      } catch {
        // Reverse geocoding is a convenience only — keep the pin and let
        // the customer fill city/pincode/line in by hand.
        onChange({ lat, lon })
      } finally {
        setGeocoding(false)
      }
    }, 400)
  }

  function placeMarker(lat, lon, { recenter = false } = {}) {
    if (!mapRef.current) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon])
    } else {
      markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const { lat: dLat, lng: dLon } = markerRef.current.getLatLng()
        applyReverseGeocode(dLat, dLon)
      })
    }
    if (recenter) mapRef.current.setView([lat, lon], 16)
  }

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return
    const initialCenter = value?.lat && value?.lon ? [value.lat, value.lon] : DEFAULT_CENTER
    const map = L.map(mapElRef.current).setView(initialCenter, value?.lat ? 16 : 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', e => {
      placeMarker(e.latlng.lat, e.latlng.lng)
      applyReverseGeocode(e.latlng.lat, e.latlng.lng)
    })
    mapRef.current = map
    if (value?.lat && value?.lon) placeMarker(value.lat, value.lon)

    // Leaflet sizes itself off its container's dimensions at creation time;
    // if the map mounts inside a not-yet-laid-out flex/grid parent it can
    // measure 0 and render blank until something forces a reflow.
    setTimeout(() => map.invalidateSize(), 0)

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support location access — place the pin manually instead.")
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        placeMarker(latitude, longitude, { recenter: true })
        applyReverseGeocode(latitude, longitude)
        setLocating(false)
      },
      err => {
        setLocating(false)
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied — place the pin on the map manually instead.'
            : 'Could not get your current location — place the pin on the map manually instead.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Tap the map to drop a pin, or drag it to fine-tune.</p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
          {locating ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      {locateError && <p className="text-xs text-red-600">{locateError}</p>}

      <div ref={mapElRef} className="w-full h-56 rounded-xl border border-gray-200 overflow-hidden" />
      {geocoding && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Looking up address…</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <input
          placeholder="City"
          value={value?.city ?? ''}
          onChange={e => onChange({ city: e.target.value })}
          className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          placeholder="Pincode"
          inputMode="numeric"
          value={value?.pincode ?? ''}
          onChange={e => onChange({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {value?.city?.trim() && !isPilotCity(value.city) && (
        <ComingSoonCity city={value.city} source="shop_delivery" />
      )}
    </div>
  )
}
