/**
 * Turning a tracking session into the words on the screen.
 *
 * Pure: a session row in, strings and a phase out. No supabase, no
 * browser. The phase machine is the thing worth keeping honest — it
 * decides which button a partner is shown, and showing "Arrived" to
 * somebody still on Hosur Road, or "Start trip" to somebody already at
 * the venue, are both the kind of wrong that makes a person stop
 * trusting the screen.
 */

/** Where this job is, in one word. */
export const PHASE = {
  IDLE: 'idle',             // nothing started
  ON_THE_WAY: 'on_the_way', // moving, not close
  NEAR: 'near',             // inside the geofence, not confirmed
  ARRIVED: 'arrived',       // the partner said so
  ENDED: 'ended',           // finished, cancelled or expired
}

export function trackingPhase(session) {
  if (!session) return PHASE.IDLE
  if (session.status === 'arrived') return PHASE.ARRIVED
  if (session.status !== 'active') return PHASE.ENDED
  if (session.arrival_confirmed_at) return PHASE.ARRIVED
  if (session.geofence_entered_at) return PHASE.NEAR
  return PHASE.ON_THE_WAY
}

/**
 * Metres as somebody would say them.
 *
 * Under a kilometre reads in metres rounded to the nearest ten — "240 m"
 * is useful and "237 m" is false precision on a GPS fix with a ten-metre
 * error circle.
 */
export function formatDistance(m) {
  if (m == null || !Number.isFinite(m)) return null
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toFixed(1)} km`
}

/** A clock time, in the tense a partner reads it. */
export function formatEta(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

/**
 * How long until something, as a span.
 *
 * Returns null once it is in the past rather than a negative span: a
 * countdown that has run out should be replaced by a different sentence,
 * not printed as "-4m".
 */
export function formatCountdown(iso, now = Date.now()) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/**
 * The line under the heading.
 *
 * Written per phase rather than assembled from fragments, because these
 * are the sentences a partner reads while driving and each one has to
 * work on its own.
 */
export function statusLine(session, { mode } = {}) {
  const phase = trackingPhase(session)
  const eta = formatEta(session?.eta_at)
  const left = formatDistance(session?.distance_remaining_m)

  if (phase === PHASE.IDLE) return 'Not started'
  if (phase === PHASE.ARRIVED) {
    return (mode ?? session?.mode) === 'trip'
      ? 'At the pickup'
      : 'You are at the venue. Location sharing has stopped.'
  }
  if (phase === PHASE.ENDED) return 'Finished'
  if (phase === PHASE.NEAR) {
    return left ? `Almost there — ${left} away` : 'Almost there'
  }
  if (eta && left) return `${left} to go · arriving around ${eta}`
  if (eta) return `Arriving around ${eta}`
  return 'On the way'
}

/**
 * Whether GPS should be running right now.
 *
 * One function, used by the screen to decide whether to hold a watch
 * open and by the privacy banner to decide whether to say so — two
 * answers that must never differ, because the banner is the promise and
 * the watch is the behaviour.
 */
export function shouldBeWatching(session) {
  return !!session && session.status === 'active'
}
