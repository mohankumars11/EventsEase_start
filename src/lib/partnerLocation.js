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
 * Raise the OS permission dialog.
 *
 * ---- This call IS the dialog ---------------------------------------
 * Android has no API for "show the permission prompt". The prompt is a
 * side effect of ASKING for the permission, so a screen that wants to
 * offer a button has to make this call from that button.
 *
 * Separated from `captureLocation` because the two wants differ: that
 * one wants a FIX and asks for permission on the way, this one wants
 * the ANSWER and nothing else. A screen offering "Turn on location"
 * must not block for twelve seconds on a GPS cold start before it can
 * redraw.
 *
 * Returns `{ granted, state }` and never rejects. After two refusals
 * Android stops showing the dialog and returns denied immediately, for
 * ever -- so a caller that kept offering the button would be offering
 * one that does nothing. `state` is what tells them to stop.
 */
export async function requestLocationPermission() {
  try {
    if (NATIVE) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const perm = await Geolocation.requestPermissions({ permissions: ['location'] })
      const granted = perm?.location === 'granted' || perm?.coarseLocation === 'granted'
      return { granted, state: granted ? 'granted' : (perm?.location ?? 'denied') }
    }

    /* On the web there is no request API: the browser raises its own
       prompt the first time a position is asked for, and a refusal is
       permanent for the origin until the user clears it. */
    if (!navigator.geolocation) return { granted: false, state: 'unsupported' }
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        () => resolve({ granted: true, state: 'granted' }),
        err => resolve({ granted: false, state: err?.code === 1 ? 'denied' : 'unavailable' }),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
      )
    })
  } catch {
    return { granted: false, state: 'unavailable' }
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

/* ══════════════════════════════════════════════════════════════════════
   TELLING THE FIVE FAILURES APART
   ══════════════════════════════════════════════════════════════════════

   "We couldn't find you" covers five different problems with five
   different fixes, and a partner given the wrong one taps the same dead
   button forever:

     services_off        the phone's location is off, for everything
     denied              they said no to us, and can be asked again
     permanently_denied  they said no twice, or ticked "don't ask again".
                         Android will not show the dialog any more; only
                         Settings can undo it.
     timeout             no fix yet. Indoors, usually. Retrying works.
     unavailable         the device tried and could not

   ── What can and cannot be known ────────────────────────────────────
   Neither Android nor the web tells an app "this is permanent". What
   CAN be observed is: the permission state was already `denied` before
   we asked, and asking produced no dialog and an immediate refusal.
   That is what `permanently_denied` means here — not a claim from the
   OS, an inference, and the screen it drives offers Settings AND a
   retry so being wrong costs nothing. */
export async function diagnoseLocation() {
  const before = await locationPermissionState()

  const res = await captureLocation()
  if (res.ok) {
    /* Coarse is not a failure — it is a legitimate answer a partner
       chose, and everything this app asks of a position works at a few
       hundred metres. It gets its own state so the screen can OFFER
       precision rather than demand it. */
    const approximate = typeof res.fix.accuracy === 'number' && res.fix.accuracy > 100
    return { state: approximate ? 'approximate' : 'ok', fix: res.fix }
  }

  if (res.reason === 'denied') {
    return { state: before === 'denied' ? 'permanently_denied' : 'denied', fix: null }
  }
  if (res.reason === 'timeout') return { state: 'timeout', fix: null }
  if (res.reason === 'unsupported') return { state: 'unsupported', fix: null }

  /* 'unavailable' from the plugin is the phone saying it could not get a
     position. On Android the commonest cause by far is that location
     services are off device-wide — the permission is granted, and there
     is nothing to grant it to. */
  return { state: NATIVE ? 'services_off' : 'unavailable', fix: null }
}

/**
 * Take the partner to the setting they need to change.
 *
 * Returns false when this device cannot be sent there, and the caller
 * must then SHOW THE STEPS instead. A button labelled "Open Settings"
 * that does nothing is worse than a sentence telling somebody where to
 * tap, because they will press it three times before they read anything.
 *
 * ── Why this is mostly false today ──────────────────────────────────
 * Opening the OS settings page needs a native plugin
 * (@capacitor/app-launcher, or a small custom one for Android's
 * ACTION_APPLICATION_DETAILS_SETTINGS intent). Neither is installed, and
 * adding one means a native rebuild of the APK — so this is written to
 * USE one the moment it exists and to be honest until then, rather than
 * shipping a control that pretends.
 */
/* ── The specifier is a variable, and that is load-bearing ───────────
 *
 * Written first as a plain `await import('@capacitor/app-launcher')`
 * with a .catch, on the assumption that an unresolvable optional import
 * simply rejects at runtime. It does not get that far: Rollup resolves
 * dynamic imports at BUILD time, found no such package, and failed the
 * production build outright —
 *
 *   [vite]: Rollup failed to resolve import "@capacitor/app-launcher"
 *
 * Nothing caught it before the build, because the dev server and
 * esbuild's parse check both tolerate it. Holding the name in a
 * variable behind `@vite-ignore` is the documented way to say "this may
 * not exist; leave it to the runtime", which is exactly the contract
 * this function advertises. */
const APP_LAUNCHER = '@capacitor/app-launcher'

export async function openDeviceSettings(which = 'app') {
  if (!NATIVE) return false
  try {
    const mod = await import(/* @vite-ignore */ APP_LAUNCHER).catch(() => null)
    if (!mod?.AppLauncher) return false
    const url = which === 'location'
      ? 'android.settings.LOCATION_SOURCE_SETTINGS'
      : 'android.settings.APPLICATION_DETAILS_SETTINGS'
    await mod.AppLauncher.openUrl({ url })
    return true
  } catch {
    return false
  }
}

/** The steps, for when the button above cannot be offered. */
export const SETTINGS_STEPS = {
  app: ['Open your phone Settings', 'Apps', 'Sambramo', 'Permissions', 'Location', 'Allow'],
  location: ['Open your phone Settings', 'Location', 'Turn it on'],
}
