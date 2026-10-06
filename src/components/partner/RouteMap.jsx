import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigation, MapPin, Plus, Minus, Crosshair, ExternalLink } from 'lucide-react'
import {
  TILE, MIN_ZOOM, MAX_ZOOM, project, tilesFor, fitBounds,
  tileUrl, DEFAULT_TILES, DEFAULT_ATTRIBUTION,
} from '../../lib/slippyMap'

/**
 * The real map, with real streets.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES, AND WHY THE OLD ARGUMENT DID NOT SURVIVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `TrackingMap` drew the trail as a line on a plum rectangle, reasoning
 * that a partner in traffic navigates from Google Maps and a second,
 * worse map in a 180px box helps nobody. That was right about
 * NAVIGATION and wrong about everything else a map is for.
 *
 * A partner glancing at a phone in a cradle wants to know whether the
 * dot is on the right road. An abstract line cannot answer that — it has
 * no roads. Nor can it answer "which gate am I at", which is the
 * question at the end of every single journey.
 *
 * So there are streets now. The Maps button stays, because turn-by-turn
 * with a voice is still somebody else's job and always will be.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT FOLLOWS UNTIL YOU TOUCH IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The map recentres on every new fix while the partner has not moved it
 * themselves. The moment they pan — to look ahead at a junction, to find
 * the entrance — following stops, because a map that yanks itself back
 * every fifteen seconds is a map you cannot read. A button brings it
 * back and says what it does.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A TILE THAT DOES NOT ARRIVE IS NOT AN ERROR
 * ══════════════════════════════════════════════════════════════════════
 *
 * Partners drive through places with no signal. A missing tile leaves
 * the ground showing, and the route, the markers and the distance all
 * still work — every one of those is drawn from numbers this device
 * already holds. Nothing retries, nothing spins, and nothing tells a
 * partner their map is broken while they are driving.
 */
export default function RouteMap({
  trail = [],
  me = null,
  destination = null,
  className = '',
  height = 260,
  interactive = true,
}) {
  const boxRef = useRef(null)
  const [size, setSize] = useState({ width: 360, height })
  const [view, setView] = useState(null)          // { centre, zoom }
  const [following, setFollowing] = useState(true)

  /* Measured: the box is a percentage of a screen this component does
     not know the width of. */
  useEffect(() => {
    const measure = () => {
      const w = boxRef.current?.clientWidth
      if (w) setSize(s => (s.width === w ? s : { width: w, height }))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [height])

  const anchors = useMemo(() => {
    const out = [...trail]
    if (me) out.push(me)
    if (destination) out.push(destination)
    return out
  }, [trail, me, destination])

  /* The first view frames the whole journey. After that, following
     tracks the partner and leaves the zoom where they left it. */
  useEffect(() => {
    if (!anchors.length) return
    setView(v => {
      if (!v) return fitBounds(anchors, { ...size })
      if (!following || !me) return v
      return { centre: { ...me }, zoom: v.zoom }
    })
  }, [anchors, size.width, size.height, following, me?.lat, me?.lng])

  const tiles = view ? tilesFor({ ...view, ...size }) : []
  const template = readTemplate()

  const at = p => (view && p ? project(p, { ...view, ...size }) : null)
  const mePt = at(me)
  const destPt = at(destination)

  const path = view && trail.length > 1
    ? trail.map((p, i) => {
        const q = project(p, { ...view, ...size })
        return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`
      }).join(' ')
    : null

  /* ── Panning ──────────────────────────────────────────────────────
     Pointer events, so a finger, a stylus and a trackpad are one path.
     The drag is converted through the projection, so the point under
     the finger stays under the finger. */
  const drag = useRef(null)

  const onDown = e => {
    if (!interactive || !view) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: view.centre }
    setFollowing(false)
  }

  const onMove = e => {
    const d = drag.current
    if (!d || d.id !== e.pointerId || !view) return
    const scale = TILE * Math.pow(2, view.zoom)
    const cx = lngX(d.from.lng) - (e.clientX - d.x) / scale
    const cy = latY(d.from.lat) - (e.clientY - d.y) / scale
    setView(v => ({ ...v, centre: { lat: yLat(cy), lng: xLng(cx) } }))
  }

  const onUp = e => { if (drag.current?.id === e.pointerId) drag.current = null }

  const zoomBy = step => setView(v =>
    v ? { ...v, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom + step)) } : v)

  const recentre = () => {
    setFollowing(true)
    if (me) setView(v => ({ centre: { ...me }, zoom: v?.zoom ?? 15 }))
    else if (anchors.length) setView(fitBounds(anchors, { ...size }))
  }

  return (
    <div className={className}>
      <div
        ref={boxRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ height }}
        /* touch-none, or the page scrolls instead of the map and the
           drag does nothing at all on a phone. */
        className="relative w-full touch-none overflow-hidden rounded-[18px] bg-plum-950"
      >
        {tiles.map(t => (
          <img
            key={t.key}
            src={tileUrl(template, t)}
            alt=""
            draggable={false}
            width={TILE}
            height={TILE}
            onError={e => { e.currentTarget.style.visibility = 'hidden' }}
            className="pointer-events-none absolute select-none"
            style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
          />
        ))}

        {path && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {/* Drawn twice: a wide dark stroke underneath so the line
                stays readable over pale streets and dark parkland
                alike. One colour cannot do both. */}
            <path d={path} fill="none" stroke="rgba(20,8,40,0.55)" strokeWidth="7"
                  strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#f5c242" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {destPt && (
          <span
            className="pointer-events-none absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-saffron-400 text-plum-950 shadow-lg ring-2 ring-white"
            style={{ left: destPt.x, top: destPt.y }}
            aria-label="The venue"
          >
            <MapPin size={16} strokeWidth={2.5} />
          </span>
        )}

        {mePt && (
          <span
            className="pointer-events-none absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-plum-600 text-white shadow-lg ring-[3px] ring-white"
            style={{ left: mePt.x, top: mePt.y }}
            aria-label="Where you are"
          >
            <Navigation size={15} strokeWidth={2.5} />
          </span>
        )}

        {interactive && (
          <div className="absolute right-2.5 top-2.5 z-20 flex flex-col gap-1.5">
            <MapButton label="Zoom in" onClick={() => zoomBy(1)}><Plus size={15} /></MapButton>
            <MapButton label="Zoom out" onClick={() => zoomBy(-1)}><Minus size={15} /></MapButton>
            <MapButton
              label={following ? 'Following you' : 'Centre on me'}
              onClick={recentre} active={following}
            >
              <Crosshair size={15} />
            </MapButton>
          </div>
        )}

        {/* Not optional and not a footnote. Somebody pays for these. */}
        <p className="pointer-events-none absolute bottom-0 right-0 z-20 rounded-tl-lg bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-ink">
          {readAttribution()}
        </p>

        {!following && interactive && (
          <p className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-full bg-plum-950/90 px-2.5 py-1 text-[10.5px] font-extrabold text-white">
            Not following — tap the crosshair
          </p>
        )}
      </div>

      {destination && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-plum-700 text-[13px] font-extrabold text-white"
        >
          <ExternalLink size={15} />
          Turn-by-turn in Google Maps
        </a>
      )}
    </div>
  )
}

function MapButton({ label, onClick, active, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 transition ${
        active ? 'bg-plum-700 text-white ring-plum-800' : 'bg-white text-ink ring-black/10'
      }`}
    >
      {children}
    </button>
  )
}

/* Read through a try: `import.meta.env` does not exist in a Node test
   runner, and this module is loaded by one. */
function readTemplate() {
  try { return import.meta.env?.VITE_MAP_TILE_URL || DEFAULT_TILES } catch { return DEFAULT_TILES }
}
function readAttribution() {
  try { return import.meta.env?.VITE_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION } catch { return DEFAULT_ATTRIBUTION }
}

/* Shorthands for the panning maths. Here rather than in slippyMap
   because they are an implementation detail of dragging, not of the
   projection. */
const lngX = lng => (lng + 180) / 360
const latY = lat => {
  const rad = (Math.min(85.05112878, Math.max(-85.05112878, lat)) * Math.PI) / 180
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2
}
const xLng = x => x * 360 - 180
const yLat = y => {
  const n = Math.PI - 2 * Math.PI * y
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
