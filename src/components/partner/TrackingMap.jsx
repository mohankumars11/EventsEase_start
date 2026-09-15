import { useEffect, useState } from 'react'
import { Navigation, MapPin, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * The journey, drawn from the partner's own trail.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THERE ARE NO STREET TILES UNDER THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner driving to a venue does not navigate from a 180px box inside
 * another app. They navigate from Google Maps, which knows about the
 * flyover that closed and has a voice. Embedding a second, worse map and
 * hoping they use it helps nobody, costs a tile-provider dependency and
 * an API key, and adds a library to a bundle already over 700 KB.
 *
 * So this answers the questions the phone in a cradle cannot: how far is
 * left, how much of the journey is done, and is my location still being
 * shared. The button hands the driving to the app that is good at it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE IS REAL EVEN THOUGH THE BACKDROP IS NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The line is this session's own points out of `tracking_location_events`
 * — the real trail, projected and scaled to the box. Not interpolated
 * and not smoothed: a route that doubled back looks like it doubled
 * back. Only the partner and operators can read that table, which is why
 * this component is on the partner's screen and never on the customer's.
 */
export default function TrackingMap({ session, live, className = '' }) {
  const [trail, setTrail] = useState([])

  useEffect(() => {
    let alive = true
    if (!session?.id) return undefined
    /* Re-read when a batch lands rather than on a timer: the trail only
       changes when `live` changes. */
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
  }, [session?.id, live?.stored])

  const done = progressOf(session, live)
  const dest = readPoint(session?.destination)

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[18px] bg-plum-950 p-4">
        <Trail points={trail} />

        {/* The two ends, always legible whatever the trail did. */}
        <div className="relative flex items-center justify-between gap-3">
          <Marker icon={Navigation} label="You" tone="light" />
          <div className="mx-1 h-px min-w-0 flex-1 rounded bg-white/20">
            <div className="h-px rounded bg-saffron-400 transition-all duration-700"
                 style={{ width: `${Math.round(done * 100)}%` }} />
          </div>
          <Marker icon={MapPin} label="Venue" tone="saffron" />
        </div>

        <p className="relative mt-3 text-[11px] font-semibold leading-snug text-white/60">
          {trail.length > 1
            ? `${trail.length} points along your route so far.`
            : 'Waiting for your first location fix.'}
        </p>
      </div>

      {dest && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`}
          target="_blank" rel="noreferrer"
          className="mt-2 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-white text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1]"
        >
          <ExternalLink size={13} /> Open directions in Maps
        </a>
      )}
    </div>
  )
}

/* ── The trail, projected into the box ──────────────────────────────
   Equirectangular with a cos(lat) correction, which is right to well
   under a pixel over a city and needs no projection library. */
function Trail({ points }) {
  if (points.length < 2) return null

  const lat0 = points[0].lat * Math.PI / 180
  const xs = points.map(p => p.lng * Math.cos(lat0))
  const ys = points.map(p => p.lat)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = (maxX - minX) || 1e-6
  const spanY = (maxY - minY) || 1e-6

  const d = points.map((p, i) => {
    const x = 6 + ((xs[i] - minX) / spanX) * 88
    // SVG y grows downward; north should be up.
    const y = 82 - ((ys[i] - minY) / spanY) * 64
    return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
         className="pointer-events-none absolute inset-0 h-full w-full opacity-70">
      <path d={d} fill="none" stroke="rgb(245 194 66)" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Marker({ icon: Icon, label, tone }) {
  return (
    <span className="relative flex shrink-0 flex-col items-center gap-1">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
        tone === 'saffron' ? 'bg-saffron-400 text-plum-950' : 'bg-white text-plum-950'}`}>
        <Icon size={14} />
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/70">{label}</span>
    </span>
  )
}

/**
 * How much of the journey is behind them.
 *
 * Measured against the FIRST distance this session reported, so the bar
 * fills as they travel instead of jumping about with each fix. Before
 * there is a baseline the bar stays near empty rather than guessing —
 * an invented starting position would make it lie on the one screen
 * where a partner is checking whether the app knows where they are.
 */
let baselines = new WeakMap()
function progressOf(session, live) {
  const now = live?.distance_m ?? session?.distance_remaining_m
  if (now == null || !session) return 0

  if (!baselines.has(session)) baselines.set(session, now)
  const start = baselines.get(session)

  if (now <= 200) return 0.97          // inside the fence is effectively there
  if (!start || start <= now) return 0.06
  return Math.max(0.06, Math.min(0.95, 1 - now / start))
}

function readPoint(geo) {
  /* PostGIS geography comes back from PostgREST as GeoJSON. A WKB hex
     string means the server is not emitting GeoJSON, and a half-parsed
     point drawn in the wrong hemisphere is worse than no line — so that
     case returns null and the caller shows nothing. */
  if (!geo) return null
  if (typeof geo === 'object' && Array.isArray(geo.coordinates)) {
    const [lng, lat] = geo.coordinates
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }
  return null
}
