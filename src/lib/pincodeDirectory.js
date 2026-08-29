import { supabase } from './supabase'
import { PINCODES, PINCODE_SOURCE } from '../config/generatedPincodes'

/**
 * Serviceability, from the database rather than from the bundle.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT MOVED, AND WHY IT HAD TO
 * ══════════════════════════════════════════════════════════════════════
 *
 * `config/generatedPincodes.js` is compiled into the JavaScript bundle.
 * It ships inside the APK — you can see it in
 * android/app/src/main/assets/public/assets/. So the answer to "do we
 * serve Whitefield" was a build artefact, and opening an area meant a
 * rebuild, a Play Store submission and a review wait.
 *
 * Migration 085 puts every Indian pincode in `pincodes` with an
 * `is_active` flag. Turning on an area is now a row update.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE ANSWERS, NOT TWO — THIS IS THE IMPORTANT PART
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old `resolvePincode` returned an object or null, so "we have not
 * reached Hubli" and "that is not a pincode" were the same answer. They
 * are not remotely the same thing:
 *
 *   served      dispatch can run
 *   not_served  a real place — capture it, this is the expansion list
 *   unknown     six digits that are not a pincode — it is a typo, and
 *               telling somebody in Jayanagar that their pincode does
 *               not exist is its own kind of insult
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE BOOTSTRAP STAYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * This runs on the critical path of the booking flow, on Indian mobile
 * data, at the moment a customer is deciding whether to trust us. A
 * dropped request must not read as "we do not serve you".
 *
 * So a failed lookup falls back to the committed Bengaluru table. Every
 * one of those 88 pincodes is hand-verified and inside the pilot area,
 * so answering `served` from it is correct — just frozen. What the
 * fallback CANNOT do is distinguish not_served from unknown, and it says
 * so with `degraded: true` rather than guessing, so the UI can soften
 * its wording instead of asserting something it does not know.
 */

const memo = new Map()

/** Shape the bootstrap into the same object the RPC returns. */
function fromBootstrap(pin) {
  const hit = PINCODES[pin]
  if (hit && hit.lat != null) {
    return {
      status: 'served',
      pincode: pin,
      area: hit.area,
      district: hit.district,
      lat: hit.lat,
      lng: hit.lng,
      degraded: true,
    }
  }
  // Not in the offline table. We genuinely cannot tell which of the two
  // "no" answers this is, and saying so is better than picking one.
  return { status: 'not_served', pincode: pin, degraded: true }
}

/**
 * Resolve six digits.
 *
 * Always returns an object — never null. A caller that wants a boolean
 * should ask `isServed`, so that no screen accidentally treats "typo"
 * and "not our city" as the same branch again.
 */
export async function lookupPincode(raw) {
  const pin = String(raw ?? '').replace(/\D/g, '')
  if (pin.length !== 6) return { status: 'incomplete', pincode: pin }

  if (memo.has(pin)) return memo.get(pin)

  let out
  try {
    const { data, error } = await supabase.rpc('lookup_pincode', { p_pincode: pin })
    if (error) throw error
    out = data
  } catch {
    out = fromBootstrap(pin)
  }

  // Only cache a real answer. Caching a degraded one would make a single
  // bad moment on the network stick for the rest of the session.
  if (!out.degraded) memo.set(pin, out)
  return out
}

export const isServed = result => result?.status === 'served'

/* ══════════════════════════════════════════════════════════════════════
   THE SERVED SET, FETCHED ONCE
   ══════════════════════════════════════════════════════════════════════

   Every active pincode, pulled in one query and held for the session.

   This is NOT the bundled table coming back. It is fetched at runtime
   from `pincodes`, so activating an area is still a row update and still
   needs no release — which was the entire point of migration 085. What
   it buys is that serviceability becomes a LOCAL question:

     · the area autocomplete answers with no round trip at all, so the
       list appears as the customer types rather than a beat behind
     · a venue found through OSM can be snapped to its nearest served
       pincode instantly, which is what makes venue search possible
       without a request per result
     · "do we serve this point" survives a dropped connection

   Bengaluru is about 160 rows. The guard below stops this being a
   liability if somebody activates the whole country: past the cap it
   falls back to asking the server per query, which is slower and
   correct. */

const SERVED_CAP = 2500
let servedPromise = null

export async function servedAreas() {
  if (servedPromise) return servedPromise

  servedPromise = (async () => {
    try {
      // RLS on `pincodes` exposes active rows to anyone — see 085. The
      // inactive rest of the country stays behind the RPCs.
      const { data, error } = await supabase
        .from('pincodes')
        .select('pincode, area, district')
        .eq('is_active', true)
        .limit(SERVED_CAP)
      if (error) throw error
      if (!data?.length || data.length >= SERVED_CAP) return null

      // `location` is a geography and PostgREST cannot serialise it, so
      // the coordinates come from the RPC that already returns them.
      const withPoints = await Promise.all(data.map(async row => {
        const hit = await lookupPincode(row.pincode)
        return hit.status === 'served'
          ? { ...row, lat: hit.lat, lng: hit.lng }
          : null
      }))
      const rows = withPoints.filter(Boolean)
      return rows.length ? rows : null
    } catch {
      return null
    }
  })()

  return servedPromise
}

/** Metres between two lat/lng pairs. Haversine, good to a few metres. */
function metresBetween(aLat, aLng, bLat, bLng) {
  const R = 6371000
  const rad = d => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}

/**
 * Autocomplete over served areas — one box that takes a name or digits.
 *
 * Active rows only. Suggesting a place we cannot serve would be the
 * nonsense-option failure: an impossible choice reads as an app that
 * does not know what it sells.
 */
export async function searchAreas(query, limit = 8) {
  const q = String(query ?? '').trim()
  if (q.length < 2) return []

  // Local, when we have the set. No round trip, so the list keeps up
  // with typing.
  const served = await servedAreas()
  if (served) return rank(served, q, limit)

  try {
    const { data, error } = await supabase.rpc('search_areas', { p_query: q, p_limit: limit })
    if (error) throw error
    return data ?? []
  } catch {
    // Offline: search the bootstrap the same two ways the RPC does.
    return rank(
      Object.entries(PINCODES).map(([pincode, v]) => ({ pincode, ...v })),
      q, limit,
    )
  }
}

/** Digits match on prefix, letters on substring; prefix hits rank first. */
function rank(rows, q, limit) {
  const digits = /^\d+$/.test(q)
  const needle = q.toLowerCase()

  const hits = rows.filter(r => r.lat != null && (digits
    ? r.pincode.startsWith(q)
    : String(r.area ?? '').toLowerCase().includes(needle)))

  /* Numbers sort as numbers.
   *
   * Sorting a digit query the way a NAME query is sorted — best prefix,
   * then shortest label — ranked "5600" as NAL, EPIP, Agram, because
   * those are the three shortest area names in the set. To somebody
   * typing a pincode that is indistinguishable from random. The only
   * order that means anything here is numeric. */
  if (digits) {
    return hits.sort((a, b) => a.pincode.localeCompare(b.pincode)).slice(0, limit)
  }

  return hits
    .sort((a, b) => {
      const ap = String(a.area ?? '').toLowerCase().startsWith(needle) ? 0 : 1
      const bp = String(b.area ?? '').toLowerCase().startsWith(needle) ? 0 : 1
      return ap - bp
        || String(a.area ?? '').length - String(b.area ?? '').length
        || a.pincode.localeCompare(b.pincode)
    })
    .slice(0, limit)
}

/* ══════════════════════════════════════════════════════════════════════
   VENUE SEARCH — because nobody knows their pincode, and an event
   happens at a NAMED PLACE
   ══════════════════════════════════════════════════════════════════════

   This is the half a delivery app does not need and an event platform
   cannot do without.

   Swiggy asks where to bring one bag, and the customer is standing at
   the answer. Here the work happens at a kalyana mantapa in three weeks,
   and the thing the customer actually knows is its NAME. Not the
   pincode, not the layout, not the ward — "Sri Krishna Kalyana Mantapa,
   near Rajajinagar metro". Asking them to convert that into six digits
   is asking them to do the platform's job, and it is where a booking
   gets abandoned.

   So the same box also searches real places: halls, mantapas, temples,
   convention centres, hotels, apartment complexes, landmarks.

   ── Serviceability is decided locally, before anything is shown ──────
   Every hit is snapped to the nearest served pincode from the set above.
   Beyond 25 km there is nothing we could dispatch to it, so it never
   reaches the list at all — a venue offered and then refused is worse
   than one never offered.

   ── On the geocoder ─────────────────────────────────────────────────
   Nominatim is donated infrastructure and its usage policy discourages
   autocomplete specifically. So this is deliberately reluctant: four
   characters minimum, a 600 ms debounce at the call site, results
   cached per query, and it only fires when the customer is plainly
   naming a place rather than an area we already know.

   That is honest for a pilot and it will not scale. Before volume, move
   this to an Indian provider with real POI coverage of exactly the
   places this market books — Ola Maps or MapmyIndia both index mantapas
   and community halls far better than OSM does, and both permit storing
   the result. The rest of this module does not change when that happens;
   only `fetchPlaces` does.
*/

const placeMemo = new Map()

async function fetchPlaces(q, viewbox) {
  if (placeMemo.has(q)) return placeMemo.get(q)

  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('q', q)
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('addressdetails', '1')
  u.searchParams.set('countrycodes', 'in')
  u.searchParams.set('limit', '8')
  if (viewbox) {
    u.searchParams.set('viewbox', viewbox)
    u.searchParams.set('bounded', '1')
  }

  const res = await fetch(u, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('place lookup failed')
  const rows = await res.json()
  placeMemo.set(q, rows)
  return rows
}

/** A readable name for a place — "Phoenix Marketcity", not the full address. */
function placeName(r) {
  return r.name?.trim() || String(r.display_name ?? '').split(',')[0].trim()
}

/**
 * Named venues and landmarks we can actually serve.
 *
 * Returns [] rather than throwing — a geocoder being unreachable must
 * not take the area search down with it, because the area search is the
 * one that always works.
 */
export async function searchVenues(query, limit = 5) {
  const q = String(query ?? '').trim()
  if (q.length < 4 || /^\d+$/.test(q)) return []

  const served = await servedAreas()
  if (!served?.length) return []

  // Bound the search to where we operate, padded by a quarter degree.
  const lats = served.map(s => s.lat)
  const lngs = served.map(s => s.lng)
  const pad = 0.25
  const viewbox = [
    Math.min(...lngs) - pad, Math.max(...lats) + pad,
    Math.max(...lngs) + pad, Math.min(...lats) - pad,
  ].join(',')

  let rows
  try {
    rows = await fetchPlaces(q, viewbox)
  } catch {
    return []
  }

  const out = []
  const seen = new Set()

  for (const r of rows) {
    const lat = Number(r.lat)
    const lng = Number(r.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    // Snap to the nearest served pincode — locally, no round trip.
    let best = null
    for (const s of served) {
      const d = metresBetween(lat, lng, s.lat, s.lng)
      if (!best || d < best.d) best = { s, d }
    }
    if (!best || best.d > 25000) continue        // nothing we could send

    const name = placeName(r)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)

    out.push({
      kind: 'venue',
      venueName: name,
      // The AREA's centroid is what dispatch measures from, not the
      // venue's own coordinate. Masters are matched to the locality, and
      // migration 068 withholds the exact address until after payment —
      // so carrying the precise point here would be collecting a
      // precision the product deliberately refuses to use.
      pincode: best.s.pincode,
      area: best.s.area,
      district: best.s.district,
      lat: best.s.lat,
      lng: best.s.lng,
      // Shown under the name, so the customer can tell two identically
      // named halls apart.
      context: String(r.display_name ?? '').split(',').slice(1, 3).join(',').trim(),
    })

    if (out.length >= limit) break
  }

  return out
}

/**
 * Turn the phone's GPS into an area, without telling anybody else where
 * the customer is.
 *
 * The obvious implementation calls a reverse-geocoding API. That puts a
 * third party on the critical path of the booking flow, sends a
 * customer's exact position to them, and is rate-limited exactly when a
 * Saturday goes well. We already hold a verified centroid for every
 * served pincode, so the nearest one is the answer and it never leaves
 * our database. See migration 085.
 */
export async function nearestServed(lat, lng) {
  // Local, when the served set is loaded — instant, and it still works
  // if the connection drops between asking for GPS and getting a fix.
  const served = await servedAreas()
  if (served?.length) {
    let best = null
    for (const s of served) {
      const d = metresBetween(lat, lng, s.lat, s.lng)
      if (!best || d < best.distanceM) best = { ...s, distanceM: d }
    }
    // The same 25 km guard the RPC applies, and for the same reason:
    // without it a customer in Chennai resolves to a Bengaluru pincode
    // and dispatch runs against a point they never chose.
    return best && best.distanceM <= 25000
      ? { status: 'served', ...best }
      : { status: 'not_served' }
  }

  try {
    const { data, error } = await supabase.rpc('nearest_served_pincode', {
      p_lat: lat, p_lng: lng,
    })
    if (error) throw error
    return data
  } catch {
    return { status: 'unavailable' }
  }
}

/**
 * Ask the browser where it is.
 *
 * Wrapped rather than called inline because the failure modes need
 * distinct names — a customer who DENIED permission needs different
 * words from one whose phone could not get a fix, and "location
 * unavailable" for both is how an app teaches people to ignore it.
 */
export function currentPosition({ timeout = 8000 } = {}) {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve({ status: 'unsupported' })
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        status: 'ok',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: Math.round(pos.coords.accuracy ?? 0),
      }),
      err => resolve({
        status: err.code === err.PERMISSION_DENIED ? 'denied'
              : err.code === err.TIMEOUT ? 'timeout'
              : 'unavailable',
      }),
      { enableHighAccuracy: false, timeout, maximumAge: 120_000 },
    )
  })
}

/** Whether the directory in use is the live table or the frozen bundle. */
export const bootstrapSource = () => PINCODE_SOURCE
