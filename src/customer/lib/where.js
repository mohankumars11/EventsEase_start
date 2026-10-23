/**
 * Where the customer is, and whether we serve it.
 *
 * The same two calls the partner app makes on its location step —
 * captureLocation() raises the OS permission prompt and reads a fix,
 * reverseAddress() names it (OSM, never the GeoNames centroids) — so the
 * two apps ask for location the same way.
 *
 * ── Served is a distance, not a city name ───────────────────────────
 * A reverse geocode in Bengaluru comes back as "Bengaluru", "Bangalore",
 * "Bangalore Urban" or a village name on the edge of town, depending on
 * how OSM filed the street. Every Bengaluru pincode sits inside 38 km of
 * the city centre, so the test is the circle; the name is only for show.
 *
 * ── Mysuru is a TESTING bypass ──────────────────────────────────────
 * The customer app launches in Bengaluru only (Mohan, 2026-10-23). The
 * team tests from Mysuru, so Mysuru is let in while MYSURU_TEST_BYPASS
 * is true. Turn it off for the store build.
 */
import { captureLocation, reverseAddress } from '../../lib/partnerLocation'

export const MYSURU_TEST_BYPASS = true

const MARKETS = [
  { id: 'BLR', city: 'Bengaluru', lat: 12.9716, lng: 77.5946, km: 38, live: true },
  { id: 'MYS', city: 'Mysuru', lat: 12.2958, lng: 76.6394, km: 25, live: MYSURU_TEST_BYPASS, test: true },
]

const KEY = 'sbm.cx.where.v1'

export function km(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** The market this point is inside, live or not; null when it is in none. */
export function marketAt(lat, lng) {
  return MARKETS.find(m => km({ lat, lng }, m) <= m.km) ?? null
}

/**
 * Ask the phone. Resolves { ok, reason?, place?, market? } and never
 * rejects — `reason` is 'denied' | 'unavailable' | 'unsupported'.
 */
export async function locate() {
  const res = await captureLocation()
  if (!res.ok) return { ok: false, reason: res.reason }
  const { lat, lng } = res.fix
  const addr = await reverseAddress(lat, lng)
  const market = marketAt(lat, lng)
  const place = {
    lat, lng,
    area: addr?.locality ?? addr?.city ?? market?.city ?? 'Your location',
    city: market?.city ?? addr?.city ?? null,
    pincode: addr?.postcode ?? null,
    address: addr?.line ?? null,
    source: 'gps',
  }
  return { ok: true, place, market }
}

export function savedWhere() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
export function saveWhere(place) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...place, at: Date.now() })) } catch { /* storage off */ }
}
