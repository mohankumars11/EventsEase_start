/**
 * The partner's location, asked for once and kept quietly.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS DOES AND DELIBERATELY DOES NOT DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * It asks for FOREGROUND location ("while using the app"), stores what
 * comes back, and gets out of the way. It never renders a map, never
 * shows the partner a coordinate, and never blocks them.
 *
 * ── Why not "allow all the time" ────────────────────────────────────
 * Because that is not a flag this file could set even if it wanted to.
 *
 *   ACCESS_BACKGROUND_LOCATION cannot be requested in the same dialog as
 *   foreground on Android 10+, and from Android 11 there is no dialog at
 *   all -- the OS only permits sending someone to app settings.
 *
 *   Google Play gates it behind the Background Location declaration: a
 *   form, a demo video, and a review. Shipping a request for it without
 *   that approval gets the listing rejected or pulled.
 *
 *   Play also requires a prominent in-app disclosure BEFORE the request,
 *   and expects the feature to be core to the app. Asking on first launch
 *   -- before a partner has signed in, let alone gone online -- is the
 *   specific pattern the policy calls out. The apps this is measured
 *   against ask after the partner goes online, with the reason on screen.
 *
 *   @capacitor/geolocation does not implement it regardless; that needs a
 *   separate background-geolocation plugin.
 *
 * So background location belongs on the "go online" action, later, with
 * the declaration filed. This file covers the part that is legitimate,
 * shippable today, and is what a first launch should be asking for.
 *
 * ── Why it degrades instead of insisting ────────────────────────────
 * A master who taps Deny still has to be able to use the app. Everything
 * here resolves rather than throws, and the caller moves on either way.
 * The city picker already exists for the manual path.
 */

/* The bridge, not isNativePlatform().
 *
 * Same test src/lib/api.js uses, and for the reason its docblock records:
 * isNativePlatform() has answered false inside the real app before now.
 * If window.Capacitor exists at all, this is the packaged app. */
const NATIVE = typeof window !== 'undefined' && !!window.Capacitor

const KEY = 'sb_partner_loc_v1'

/** How stale a fix may be before it is worth asking the device again. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

/** Read the last fix, or null. Never throws: private mode makes this fail. */
export function readSavedLocation() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return typeof v?.lat === 'number' && typeof v?.lng === 'number' ? v : null
  } catch {
    return null
  }
}

function save(fix) {
  try { localStorage.setItem(KEY, JSON.stringify(fix)) } catch { /* private mode */ }
}

/** Has a usable, recent fix already been taken? */
export function hasFreshLocation() {
  const v = readSavedLocation()
  return !!v && Date.now() - (v.at ?? 0) < MAX_AGE_MS
}

/**
 * Whether the browser already knows the answer, WITHOUT prompting.
 *
 * The Permissions API is the only way to distinguish "never asked" from
 * "asked and denied" before showing anything. Where it is missing (older
 * WebViews, Safari) it returns 'unknown' and the caller shows its
 * rationale, which is the safe default: worst case somebody sees an
 * explanation for a permission they already granted.
 */
export async function locationPermissionState() {
  try {
    if (NATIVE) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const p = await Geolocation.checkPermissions()
      if (p?.location === 'granted' || p?.coarseLocation === 'granted') return 'granted'
      if (p?.location === 'denied') return 'denied'
      return 'prompt'
    }
    if (!navigator.permissions?.query) return 'unknown'
    const s = await navigator.permissions.query({ name: 'geolocation' })
    return s.state // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown'
  }
}

/**
 * Ask the device, and store whatever comes back.
 *
 * Resolves `{ ok: true, fix }` or `{ ok: false, reason }`. Never rejects:
 * a rejected promise here would have to be caught at every call site, and
 * the only thing any of them would do with it is carry on anyway.
 *
 * `enableHighAccuracy` is on because the thing this feeds is job dispatch
 * by distance, where a coarse cell-tower fix in the wrong part of
 * Bengaluru is worse than no fix. The 12s timeout is generous on purpose:
 * a GPS cold start indoors genuinely takes that long, and the fallback is
 * only the manual city picker.
 */
export async function captureLocation() {
  /* ── Native goes through the plugin, not through navigator ─────────
     In the Capacitor WebView `navigator.geolocation` only works if the
     bridge is handling onGeolocationPermissionsShowPrompt and the app
     already holds the runtime permission. Without @capacitor/geolocation
     registered it fails silently -- no dialog, no error, no fix -- which
     is the worst of the three. The plugin requests the Android permission
     properly and returns a real error when it is refused.

     It is imported dynamically so the web build never pulls it into the
     bundle, and so a missing plugin degrades to the browser API rather
     than throwing at module load. */
  if (NATIVE) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const perm = await Geolocation.requestPermissions({ permissions: ['location'] })
      if (perm?.location !== 'granted' && perm?.coarseLocation !== 'granted') {
        return { ok: false, reason: 'denied' }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true, timeout: 12000, maximumAge: 60000,
      })
      const fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        at: Date.now(),
      }
      save(fix)
      return { ok: true, fix }
    } catch (err) {
      const msg = String(err?.message ?? '')
      return { ok: false, reason: /denied|permission/i.test(msg) ? 'denied' : 'unavailable' }
    }
  }

  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ ok: false, reason: 'unsupported' })

    let settled = false
    const done = v => { if (!settled) { settled = true; resolve(v) } }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          at: Date.now(),
        }
        save(fix)
        done({ ok: true, fix })
      },
      err => {
        // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
        const reason = err?.code === 1 ? 'denied'
          : err?.code === 3 ? 'timeout'
          : 'unavailable'
        done({ ok: false, reason })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}

/**
 * The fix as an address a person would recognise.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT reverseCity()
 * ══════════════════════════════════════════════════════════════════════
 *
 * pincodeDirectory already reverse-geocodes, and this deliberately does
 * not replace it. That one answers "which city is this" at zoom 10 for
 * the serviceability message, and its own note explains why it stops
 * there: any finer and it starts returning road names instead of cities.
 *
 * A confirmation screen needs the opposite. "Bengaluru" under a marker is
 * not a confirmation of anything -- it is true of half the state. The
 * partner has to recognise their own neighbourhood to know the app got it
 * right, so this asks at zoom 18 and assembles locality, city, state and
 * postcode.
 *
 * Same provider, same usage terms, fired once per partner at the same
 * point in the flow.
 *
 * ── It is allowed to fail ──────────────────────────────────────────
 * Returns null rather than throwing. A geocoder being unreachable must
 * not cost somebody their sign-up: the coordinates are already saved and
 * the confirmation screen says it has the location without naming it.
 */
export async function reverseAddress(lat, lng) {
  try {
    const u = new URL('https://nominatim.openstreetmap.org/reverse')
    u.searchParams.set('lat', String(lat))
    u.searchParams.set('lon', String(lng))
    u.searchParams.set('format', 'jsonv2')
    u.searchParams.set('addressdetails', '1')
    u.searchParams.set('zoom', '18')

    const res = await fetch(u, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const a = (await res.json())?.address ?? {}

    /* Indian addresses land in different keys depending on how OSM has
       classified the place. Take the first that exists at each level
       rather than assuming a shape. */
    const locality = a.neighbourhood || a.suburb || a.village
      || a.town || a.city_district || a.residential || null
    const city = a.city || a.town || a.municipality || a.village
      || a.state_district || a.county || null
    const state = a.state || null
    const postcode = a.postcode || null

    /* Never print the same name twice: a partner in a place OSM knows
       only as one name gets "Mysuru", not "Mysuru, Mysuru". */
    const parts = []
    if (locality) parts.push(locality)
    if (city && city !== locality) parts.push(city)

    const tail = [state, postcode].filter(Boolean).join(' ')
    if (tail) parts.push(tail)

    return parts.length ? { line: parts.join(', '), locality, city, state, postcode } : null
  } catch {
    return null
  }
}

const ADDR_KEY = 'sb_partner_addr_v1'

/** Remember the readable line, so the confirmation screen survives a reload. */
export function saveAddress(addr) {
  try { localStorage.setItem(ADDR_KEY, JSON.stringify(addr)) } catch { /* private mode */ }
}

export function readSavedAddress() {
  try {
    const raw = localStorage.getItem(ADDR_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
