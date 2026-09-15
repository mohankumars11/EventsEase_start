import { supabase } from './supabase'
import { isMissingTable } from './serviceCatalog'

/**
 * Live location for one booking, for as long as it is useful (127).
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CLIENT DECIDES ALMOST NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Who owns the job, which tracking mode applies, where the venue is,
 * when the session expires, how far there is left to go and when it
 * ends are all decided by the four functions in migration 127. This
 * module starts a watch, batches what the phone collects, and posts it.
 *
 * That split is deliberate. A tracking system whose rules live in the
 * app is a tracking system with as many rulesets as there are app
 * versions in the field, and the rule that matters most here — that GPS
 * stops — is the one that must not depend on a client remembering.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ADAPTIVE, BECAUSE A PHONE AT A TRAFFIC LIGHT IS NOT NEWS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Fixes are collected as the device produces them and flushed on an
 * interval that widens when nothing is happening. A van stopped on
 * Hosur Road for six minutes produces one useful fact, not seventy-two,
 * and posting it seventy-two times costs the partner battery and data
 * they are paying for out of the job.
 */

const MIN_FLUSH_MS = 15_000     // moving: often enough for a live map
const MAX_FLUSH_MS = 90_000     // stationary: often enough to prove alive
const MIN_MOVE_M = 25           // below this, the phone has not gone anywhere
const MAX_BATCH = 60            // one flush never carries more than this

const NATIVE = () => typeof window !== 'undefined' && !!window.Capacitor

/**
 * Open a session for a line.
 *
 * Answers `{ ok, session_id, mode, expires_at, resumed }` or
 * `{ ok:false, reason, says }` — `says` is written for the partner and
 * is safe to put on screen as it stands.
 */
export async function startTracking(lineId) {
  const { data, error } = await supabase.rpc('start_tracking', { p_line_id: lineId })
  if (error) {
    return {
      ok: false,
      reason: 'error',
      unavailable: isMissingTable(error),
      says: isMissingTable(error)
        ? 'Live tracking is not switched on for this account yet.'
        : error.message,
    }
  }
  return data
}

/** Post a batch. `points` are `{ lat, lng, accuracy, speed, heading, at }`. */
export async function pushLocations(sessionId, points) {
  if (!sessionId || !points?.length) return { ok: true, stored: 0 }
  const { data, error } = await supabase.rpc('push_locations', {
    p_session_id: sessionId,
    p_points: points,
  })
  if (error) return { ok: false, reason: 'error', says: error.message }
  return data
}

export async function confirmArrival(sessionId) {
  const { data, error } = await supabase.rpc('confirm_arrival', { p_session_id: sessionId })
  if (error) return { ok: false, says: error.message }
  return data
}

export async function endTracking(sessionId, reason = 'stopped') {
  const { data, error } = await supabase.rpc('end_tracking', {
    p_session_id: sessionId, p_reason: reason,
  })
  if (error) return { ok: false, says: error.message }
  return data
}

/** The most recent session for a line, if there is one. */
export async function fetchSession(lineId) {
  if (!lineId) return { session: null, unavailable: false }
  const { data, error } = await supabase
    .from('tracking_sessions')
    .select('id, line_id, mode, status, started_at, arrived_at, ended_at, expires_at, destination, '
          + 'last_seen_at, distance_remaining_m, eta_at, geofence_entered_at, arrival_confirmed_at')
    .eq('line_id', lineId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { session: null, unavailable: isMissingTable(error) }
  return { session: data ?? null, unavailable: false }
}

/**
 * Start following the device and posting to `sessionId`.
 *
 * Returns a `stop()`. Calling it clears the watch and flushes whatever
 * is still buffered — a partner who arrives and taps the button should
 * not lose the last two minutes of the route because the app tidied up
 * before it posted.
 *
 * `onUpdate` receives each server answer, so the screen's ETA and
 * distance come from the same arithmetic the customer's screen reads
 * rather than from a second calculation here that could disagree.
 */
export function watchAndPush(sessionId, { onUpdate, onError } = {}) {
  let buffer = []
  let lastSent = null
  let timer = null
  let watchId = null
  let clearNative = null
  let stopped = false

  const moved = p => {
    if (!lastSent) return true
    /* Equirectangular, which is accurate enough at city scale and does
       not need a library on the hot path. */
    const dx = (p.lng - lastSent.lng) * 111320 * Math.cos(p.lat * Math.PI / 180)
    const dy = (p.lat - lastSent.lat) * 110540
    return Math.hypot(dx, dy) >= MIN_MOVE_M
  }

  const take = coords => {
    if (stopped) return
    const p = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy ?? null,
      speed: coords.speed ?? null,
      heading: coords.heading ?? null,
      at: new Date().toISOString(),
    }
    /* A fix with a 2 km error circle is worse than no fix: it drags the
       map somewhere the partner is not and ruins the ETA. */
    if (p.accuracy != null && p.accuracy > 500) return
    buffer.push(p)
    if (buffer.length > MAX_BATCH) buffer = buffer.slice(-MAX_BATCH)
  }

  function schedule(ms) {
    if (stopped) return
    clearTimeout(timer)
    timer = setTimeout(flush, ms)
  }

  async function flush() {
    if (stopped) return
    const batch = buffer
    buffer = []
    if (!batch.length) { schedule(MAX_FLUSH_MS); return }

    const newest = batch[batch.length - 1]
    const isMoving = moved(newest)
    lastSent = newest

    const res = await pushLocations(sessionId, batch)
    if (res?.ok) onUpdate?.(res)
    else onError?.(res)

    /* Widen when the phone is sitting still, tighten when it is not. */
    schedule(isMoving ? MIN_FLUSH_MS : MAX_FLUSH_MS)
  }

  async function begin() {
    if (NATIVE()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      let state = await Geolocation.checkPermissions()
      if (state.location !== 'granted') {
        state = await Geolocation.requestPermissions({ permissions: ['location'] })
      }
      if (state.location === 'denied') {
        onError?.({ ok: false, reason: 'denied' })
        return
      }
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 20000 },
        pos => { if (pos?.coords) take(pos.coords) })
      clearNative = () => Geolocation.clearWatch({ id })
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => take(pos.coords),
        err => onError?.({ ok: false, reason: err.code === 1 ? 'denied' : 'unavailable' }),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 })
    } else {
      onError?.({ ok: false, reason: 'unsupported' })
      return
    }
    schedule(MIN_FLUSH_MS)
  }

  begin()

  return async function stop() {
    stopped = true
    clearTimeout(timer)
    if (watchId != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
    if (clearNative) { try { await clearNative() } catch { /* already gone */ } }
    /* The last flush, after the watch is off. */
    if (buffer.length) {
      const batch = buffer
      buffer = []
      await pushLocations(sessionId, batch)
    }
  }
}
