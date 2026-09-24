import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Navigation, MapPin, Clock, ShieldCheck, Check, Loader2, Square,
} from 'lucide-react'
import {
  startTracking, watchAndPush, confirmArrival, endTracking, fetchSession,
} from '../../lib/liveTracking'
import {
  PHASE, trackingPhase, statusLine, formatDistance, formatEta, shouldBeWatching,
} from '../../lib/trackingDisplay'
import RouteMap from './RouteMap'
import LocationGate from './LocationGate'
import { supabase } from '../../lib/supabase'

/**
 * On the way.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SCREEN IS THE CONSENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no setting anywhere in this app that turns location on. The
 * only way a partner's position is ever read is that they opened a job
 * they have accepted and tapped Start trip, and the only way it keeps
 * being read is that this screen is showing them it is happening.
 *
 * So the banner is not decoration and it is not a disclaimer. It is
 * driven by `shouldBeWatching(session)` — the same function that decides
 * whether the watch is actually held open — so the sentence on screen
 * and the behaviour underneath it cannot come apart. When the session
 * ends, both stop in the same render.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARRIVING IS SOMETHING A PERSON SAYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The 200 m geofence changes the button from a large secondary control
 * to a large primary one and changes the sentence to "Almost there". It
 * does not mark anybody arrived. A driver stopped at the light outside
 * the gate is inside the fence and is not there yet, and an arrival time
 * written by a GPS fix is one somebody will eventually have to argue
 * with.
 */
export default function LiveTracking({ job, onDone, initialSession = null, initialTrail = null }) {
  /* A caller that already holds the row can pass it, which saves a query
     per job card on a list — and is how the screenshot harness mounts
     this component in each of its states without a database. */
  const [session, setSession] = useState(initialSession)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [live, setLive] = useState(null)      // last answer from push_locations
  const [unavailable, setUnavailable] = useState(false)
  const [denied, setDenied] = useState(false)
  const stopRef = useRef(null)

  const lineId = job?.line_id ?? null

  /* ---- The trail lives here now -----------------------------------
     RouteMap takes points and knows nothing about Supabase, which is
     what lets the screenshot harness -- and a future customer-facing
     map -- use it unchanged. Re-read when a batch lands rather than on
     a timer: the trail only changes when `live` does. */
  const [trail, setTrail] = useState(initialTrail ?? [])

  useEffect(() => {
    if (initialTrail) return undefined
    if (!session?.id) return undefined
    let alive = true
    supabase
      .from('tracking_location_events')
      .select('location, recorded_at')
      .eq('session_id', session.id)
      .order('recorded_at', { ascending: true })
      .limit(300)
      .then(({ data }) => {
        if (!alive) return
        setTrail((data ?? []).map(r => readPoint(r.location)).filter(Boolean))
      })
    return () => { alive = false }
  }, [session?.id, live?.stored, initialTrail])

  /* What the database already thinks, so reopening the app mid-journey
     puts the partner back where they were rather than offering to start
     a second trip. */
  const read = useCallback(async () => {
    const { session: s, unavailable: u, failed } = await fetchSession(lineId)
    setUnavailable(u)
    /* A failed read leaves what was there. See fetchSession. */
    if (!failed) setSession(s)
  }, [lineId])

  useEffect(() => { read() }, [read])

  /* ── The watch follows the session, not a button ──────────────────
     Held open exactly while the session is active and torn down on
     every other transition, including unmount. A watch that outlived
     its screen would be the one thing this design promises cannot
     happen. */
  useEffect(() => {
    if (!session?.id || !shouldBeWatching(session)) return undefined
    const stop = watchAndPush(session.id, {
      onUpdate: res => { setLive(res); if (res.near) read() },
      onError: res => {
        if (res?.reason === 'denied') {
          /* Not an error message any more. LocationGate raises the real
             OS dialog; a sentence telling a partner in a van to go and
             find Settings was a dead end with no button on it. */
          setDenied(true)
        } else if (res?.reason === 'not_active' || res?.reason === 'expired') {
          /* The server closed the session. Re-read so the screen stops
             claiming to be sharing a location it is no longer sending. */
          if (res?.says) setError(res.says)
          read()
        }
      },
    })
    stopRef.current = stop
    return () => { stop(); stopRef.current = null }
  }, [session?.id, session?.status, read])

  async function begin() {
    setBusy(true); setError(null)
    const res = await startTracking(lineId)
    setBusy(false)
    if (!res?.ok) {
      setUnavailable(!!res?.unavailable)
      setError(res?.says ?? 'We could not start the trip.')
      return
    }
    await read()
  }

  async function arrived() {
    setBusy(true)
    await stopRef.current?.()      // flush the last points first
    const res = await confirmArrival(session.id)
    setBusy(false)
    if (!res?.ok) { setError(res?.says ?? 'That did not save.'); return }
    await read()
    onDone?.()
  }

  async function stopSharing(reason) {
    setBusy(true)
    await stopRef.current?.()
    await endTracking(session.id, reason)
    setBusy(false)
    await read()
  }

  const phase = trackingPhase(session)
  const distance = formatDistance(live?.distance_m ?? session?.distance_remaining_m)
  const eta = formatEta(live?.eta_at ?? session?.eta_at)

  if (unavailable) return null   // 127 not applied; the job screen carries on

  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          phase === PHASE.ARRIVED ? 'bg-forest-600 text-white'
          : phase === PHASE.NEAR ? 'bg-saffron-400/20 text-saffron-800'
          : phase === PHASE.ON_THE_WAY ? 'bg-plum-950 text-white'
          : 'bg-ink/[0.05] text-ink-mute'}`}>
          {phase === PHASE.ARRIVED ? <Check size={18} strokeWidth={3} /> : <Navigation size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold leading-tight text-ink">
            {phase === PHASE.IDLE ? 'Getting there'
             : phase === PHASE.ARRIVED ? 'Arrived'
             : phase === PHASE.ENDED ? 'Trip finished'
             : 'On the way'}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
            {statusLine(session)}
          </p>
        </div>
      </div>

      {job?.area_label && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-mute">
          <MapPin size={13} className="shrink-0" /> {job.area_label}
        </p>
      )}

      {/* Raised whenever the watch cannot run, and silent otherwise.
          Offered BEFORE departure too, so a partner learns location is
          off while still standing in the kitchen rather than halfway
          down Hosur Road. */}
      {(denied || phase === PHASE.IDLE) && (
        <LocationGate onGranted={() => setDenied(false)} />
      )}

      {shouldBeWatching(session) && (
        <>
          <RouteMap
            className="mt-3"
            trail={trail}
            me={trail.length ? trail[trail.length - 1] : null}
            destination={readPoint(session?.destination)}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat icon={Navigation} label="Distance left" value={distance ?? 'Working it out'} />
            <Stat icon={Clock} label="Arriving around" value={eta ?? 'Working it out'} />
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-forest-50 px-3 py-2.5 text-[11.5px] leading-snug text-forest-900 ring-1 ring-forest-200">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            <span>
              <strong className="font-extrabold">Your location is being shared</strong> with
              Sambramo and this customer, for this job only. It stops the moment you
              tap {session?.mode === 'trip' ? 'End trip' : 'I have arrived'}, and on its
              own if you forget.
            </span>
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-[14px] bg-rose-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-rose-800">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {phase === PHASE.IDLE && (
          <button
            type="button" onClick={begin} disabled={busy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 text-[15px] font-extrabold text-white disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            Start trip
          </button>
        )}

        {(phase === PHASE.ON_THE_WAY || phase === PHASE.NEAR) && (
          <>
            <button
              type="button" onClick={arrived} disabled={busy}
              className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold disabled:opacity-40 ${
                phase === PHASE.NEAR
                  ? 'bg-forest-600 text-white'
                  : 'bg-white text-ink ring-1 ring-ink/[0.14]'}`}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              I have arrived
            </button>
            <button
              type="button" onClick={() => stopSharing('stopped')} disabled={busy}
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 text-[12.5px] font-extrabold text-ink-mute"
            >
              <Square size={12} /> Stop sharing my location
            </button>
          </>
        )}

        {phase === PHASE.ARRIVED && session?.mode === 'trip' && (
          <button
            type="button" onClick={() => stopSharing('completed')} disabled={busy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-forest-600 text-[15px] font-extrabold text-white disabled:opacity-40"
          >
            <Check size={16} /> End trip
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[16px] bg-ink/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-mute">
        <Icon size={11} /> {label}
      </p>
      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums text-ink">{value}</p>
    </div>
  )
}

/**
 * PostGIS geography, as PostgREST hands it over.
 *
 * A WKB hex string means the server is not emitting GeoJSON, and a
 * half-parsed point drawn in the wrong hemisphere is worse than no
 * point at all — so that case returns null and the map has one fewer
 * thing to draw.
 */
function readPoint(geo) {
  if (!geo) return null
  if (typeof geo === 'object' && Array.isArray(geo.coordinates)) {
    const [lng, lat] = geo.coordinates
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }
  return null
}
